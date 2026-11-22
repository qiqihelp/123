// AI Agent Bridge — Content Script（注入 MiMo Studio / AI 对话页）
// 设计：后台 Service Worker 直连本机桥，绕过 https→http 的 PNA/CORS 限制。
(() => {
  if (window.__AI_BRIDGE_EXT_LOADED__) return;
  window.__AI_BRIDGE_EXT_LOADED__ = true;
  if (!/^https?:$/.test(location.protocol)) return;

  const VERSION = '1.0.0';
  const LOG_KEY = 'ai_bridge_ext_log_v1';
  const DANGEROUS = ['execute_terminal', 'write_file'];
  const DEFAULT_CONFIG = {
    backendUrl: 'http://127.0.0.1:8000',
    token: '',
    mode: 'semi', // auto 全自动（执行并发送）/ semi 半自动（执行并填入）/ manual 仅执行并复制
    dangerousConfirm: true,
    maxAutoRuns: 20
  };

  let config = Object.assign({}, DEFAULT_CONFIG);
  let pageExecCount = 0;
  let isProcessing = false;
  const execCounts = new Map();
  const processedMessages = new WeakSet();
  const seenHashes = new Set();
  const pendingTimers = new WeakMap();
  const pendingTexts = new WeakMap();

  // ==================== 小工具 ====================
  function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    return String(hash);
  }
  function truncate(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n) + '…' : s;
  }
  function el(tag, className, parent, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    if (parent) parent.appendChild(node);
    return node;
  }
  function timeStr(t) {
    const d = new Date(t);
    const p = (n) => String(n).padStart(2, '0');
    return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function escapeHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ==================== 配置读写（chrome.storage.local，与后台共享） ====================
  async function loadConfig() {
    try {
      const stored = await chrome.storage.local.get('aiBridgeConfig');
      config = Object.assign({}, DEFAULT_CONFIG, stored.aiBridgeConfig || {});
    } catch (e) {
      config = Object.assign({}, DEFAULT_CONFIG);
    }
    return config;
  }
  async function saveConfig(patch) {
    config = Object.assign({}, config, patch);
    try {
      await chrome.storage.local.set({ aiBridgeConfig: config });
    } catch (e) {
      toast('配置保存失败：' + ((e && e.message) || e), 'err');
    }
    return config;
  }

  // ==================== 与后台 Service Worker 通信 ====================
  function sendBridge(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (resp) => {
          if (chrome.runtime.lastError) {
            resolve({ ok: false, error: chrome.runtime.lastError.message || '扩展后台无响应' });
            return;
          }
          resolve(resp || { ok: false, error: '扩展后台无响应' });
        });
      } catch (e) {
        resolve({ ok: false, error: (e && e.message) || String(e) });
      }
    });
  }
  const bridgeHealth = () => sendBridge({ type: 'bridge:health' });
  const bridgeExecute = (toolName, args) => sendBridge({ type: 'bridge:execute', toolName, arguments: args });

  // ==================== 解析 tool_call（与 userscript v3.2 一致） ====================
  function parseToolCalls(text) {
    const matches = [];
    if (!text) return matches;

    // MCP 标准格式：<tool_name>mcp</tool_name> → 拆出真实工具名
    const mcpPattern = /<tool_call>[\s\S]*?<tool_name>\s*mcp\s*<\/tool_name>[\s\S]*?<arguments>\s*([\s\S]*?)\s*<\/arguments>[\s\S]*?<\/tool_call>/gim;
    let mcpMatch;
    while ((mcpMatch = mcpPattern.exec(text)) !== null) {
      try {
        const mcpData = JSON.parse(mcpMatch[1].trim());
        const params = mcpData.params || {};
        matches.push({
          toolName: params.name || mcpData.tool_name || '',
          arguments: params.arguments || {}
        });
      } catch (e) { /* 跳过无法解析的块 */ }
    }

    // write_file 专用原始格式
    const rawPattern = /<tool_call>[\s\S]*?<tool_name>\s*(.*?)\s*<\/tool_name>[\s\S]*?<file_path>\s*([\s\S]*?)\s*<\/file_path>[\s\S]*?<content>\s*([\s\S]*?)\s*<\/content>[\s\S]*?<\/tool_call>/gim;
    let rawMatch;
    while ((rawMatch = rawPattern.exec(text)) !== null) {
      matches.push({
        toolName: rawMatch[1].trim(),
        arguments: { file_path: rawMatch[2].trim(), content: rawMatch[3] }
      });
    }

    // 兼容少写 <arguments> 标签：</tool_name>{json}</tool_call>
    text = text.replace(/<\/tool_name>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g, '</tool_name>\n<arguments>$1</arguments>\n</tool_call>');

    const pattern = /<tool_call>[\s\S]*?<tool_name>\s*(.*?)\s*<\/tool_name>[\s\S]*?<arguments>\s*([\s\S]*?)\s*<\/arguments>[\s\S]*?<\/tool_call>/gim;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const toolName = match[1].trim();
      if (toolName.toLowerCase() === 'mcp') continue;
      const argsText = match[2].trim();
      let args = {};
      try {
        args = JSON.parse(argsText);
      } catch (e) {
        try {
          args = JSON.parse(argsText.replace(/[\x00-\x1f]+/g, ' '));
        } catch (e1) {
          try {
            args = JSON.parse(argsText.replace(/'/g, '"'));
          } catch (e2) {
            args = { _raw: argsText, _error: 'JSON解析失败' };
          }
        }
      }
      matches.push({ toolName, arguments: args });
    }

    // 有 tool_name 但没有 <arguments> 的块：按空参数处理
    const allBlocks = text.match(/<tool_call>[\s\S]*?<\/tool_call>/gi) || [];
    const mcpTest = /<tool_name>\s*mcp\s*<\/tool_name>/i;
    const rawTest = /<file_path>[\s\S]*?<\/file_path>[\s\S]*?<content>/i;
    const argTest = /<arguments>/i;
    for (const blk of allBlocks) {
      if (mcpTest.test(blk) || rawTest.test(blk) || argTest.test(blk)) continue;
      const nameMatch = blk.match(/<tool_name>\s*([\s\S]*?)\s*<\/tool_name>/i);
      if (!nameMatch) continue;
      matches.push({ toolName: nameMatch[1].trim(), arguments: {} });
    }
    return matches;
  }

  function isDangerous(toolName) {
    return DANGEROUS.includes(String(toolName).toLowerCase());
  }
  function toolCallKey(tc) {
    let argStr = '';
    try { argStr = JSON.stringify(tc.arguments); } catch (e) { argStr = String(tc.arguments); }
    return djb2(tc.toolName + ':' + argStr);
  }

  // ==================== 站点适配器 ====================
  function nativeSetterFor(elNode) {
    const proto = elNode.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
      : elNode.tagName === 'INPUT' ? window.HTMLInputElement.prototype : null;
    if (!proto) return null;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    return desc && desc.set ? desc.set : null;
  }
  function setNativeValue(elNode, value) {
    const setter = nativeSetterFor(elNode);
    if (setter) setter.call(elNode, value); else elNode.value = value;
    elNode.dispatchEvent(new Event('input', { bubbles: true }));
    elNode.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function unescapeEntities(text) {
    return String(text || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  }
  function defaultGetText(elNode) {
    let text = elNode.innerText || elNode.textContent || '';
    const html = elNode.innerHTML || '';
    if (!text.includes('<tool_call>') && html.includes('tool_call')) {
      const ms = html.match(/&lt;tool_call&gt;[\s\S]*?&lt;\/tool_call&gt;/gi);
      if (ms) text = ms.join('\n');
    }
    return unescapeEntities(text);
  }
  function defaultInputBox() {
    const selectors = [
      'textarea[placeholder*="有问题"]',
      '.dialogue-container textarea',
      '#prompt-textarea',
      'div[contenteditable="true"]',
      'textarea'
    ];
    for (const sel of selectors) {
      const found = document.querySelector(sel);
      if (found) return found;
    }
    return null;
  }
  function defaultSendMessage(text) {
    const input = defaultInputBox();
    if (!input) return { sent: false, reason: '未找到输入框' };
    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      setNativeValue(input, text);
    } else {
      input.innerText = text;
      input.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    input.focus();
    setTimeout(() => {
      const sendSelectors = [
        '.dialogue-container .flex.flex-shrink-0.items-center.gap-3 > button:last-of-type',
        '.dialogue-container button.rounded-full:last-of-type',
        'button[aria-label*="发送"]',
        'button[type="submit"]'
      ];
      for (const sel of sendSelectors) {
        const btn = document.querySelector(sel);
        if (btn && !btn.disabled) { btn.click(); return; }
      }
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
    }, 250);
    return { sent: true };
  }

  function getAdapter() {
    const host = location.hostname;
    if (host.includes('xiaomimimo.com') || host.includes('mimo.mi.com')) {
      return {
        name: '小米 Mimo AI Studio',
        getMessages: () => Array.from(document.querySelectorAll('#message-list .group.flex-row .markdown-prose, #message-list .markdown-prose')),
        getText: defaultGetText,
        getInputBox: defaultInputBox,
        sendMessage: defaultSendMessage
      };
    }
    // 通用兜底：任何含有 tool_call 的块级元素都当 AI 消息
    return {
      name: '通用页面',
      getMessages: () => {
        const set = new Set();
        document.querySelectorAll('.markdown-prose, .markdown, .prose, article, [data-message-author-role="assistant"]').forEach((n) => set.add(n));
        return Array.from(set);
      },
      getText: defaultGetText,
      getInputBox: defaultInputBox,
      sendMessage: defaultSendMessage
    };
  }

  // ==================== 执行日志（localStorage 持久化） ====================
  let execLog = [];
  try { execLog = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch (e) { execLog = []; }
  function persistLog() {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(execLog.slice(-50))); } catch (e) {}
  }
  function logExecution(tool, ok, detail) {
    execLog.push({ t: Date.now(), tool: String(tool), ok: !!ok, detail: truncate(detail || '', 160) });
    if (execLog.length > 50) execLog = execLog.slice(-50);
    persistLog();
    renderLog();
  }

  // ==================== 执行核心 ====================
  function buildResultText(results) {
    let out = '[工具执行结果]\n\n';
    for (const r of results) {
      out += '工具: ' + r.tool + '\n';
      let argsStr = '';
      try { argsStr = JSON.stringify(r.args); } catch (e) { argsStr = String(r.args); }
      out += '参数: ' + argsStr + '\n';
      out += '结果:\n' + r.result + '\n---\n';
    }
    out += '\n请基于以上结果继续回复。';
    return out;
  }

  async function runToolCalls(toolCalls) {
    _setOut('⏳ 正在执行 ' + toolCalls.length + ' 个工具调用…');
    const results = [];
    for (const tc of toolCalls) {
      const key = toolCallKey(tc);
      const prevCount = execCounts.get(key) || 0;

      // 护栏1：相同调用 ≥3 次，疑似死循环
      if (prevCount >= 3) {
        results.push({ tool: tc.toolName, args: tc.arguments, success: false,
          result: '该调用已连续执行 3 次，已被安全护栏跳过（疑似死循环）。请改用其他方式完成任务，或结束回复。' });
        logExecution(tc.toolName, false, '护栏: 相同调用 ≥3 次');
        continue;
      }
      // 护栏2：单页执行上限
      if (pageExecCount >= config.maxAutoRuns) {
        results.push({ tool: tc.toolName, args: tc.arguments, success: false,
          result: '已达到单页自动执行上限（' + config.maxAutoRuns + ' 次）。可在面板里调高后继续。' });
        logExecution(tc.toolName, false, '护栏: 达到单页执行上限');
        continue;
      }
      // 护栏3：危险工具二次确认
      if (config.dangerousConfirm && isDangerous(tc.toolName)) {
        let preview = '';
        try { preview = JSON.stringify(tc.arguments, null, 2); } catch (e) { preview = String(tc.arguments); }
        const allowed = window.confirm('⚠️ 危险操作确认\n\n工具: ' + tc.toolName + '\n参数:\n' + truncate(preview, 400) + '\n\n允许执行？');
        if (!allowed) {
          results.push({ tool: tc.toolName, args: tc.arguments, success: false, result: '用户拒绝了执行该操作。' });
          logExecution(tc.toolName, false, '用户拒绝执行');
          continue;
        }
      }

      const resp = await bridgeExecute(tc.toolName, tc.arguments);
      const success = resp.ok && resp.success !== false;
      const result = resp.ok ? resp.result : ('执行失败：' + (resp.error || '未知错误'));
      execCounts.set(key, prevCount + 1);
      pageExecCount++;
      updateRunsUI();
      results.push({ tool: tc.toolName, args: tc.arguments, result, success });
      logExecution(tc.toolName, success, JSON.stringify(tc.arguments || {}));
    }
    return results;
  }

  async function deliverResults(results) {
    const text = buildResultText(results);
    _setOut(text);
    const okCount = results.filter((r) => r.success).length;

    if (config.mode === 'auto') {
      const adapter = getAdapter();
      const sent = adapter.sendMessage(text);
      if (sent && sent.sent !== false) {
        toast('✅ 执行完成（' + okCount + '/' + results.length + ' 成功），结果已自动发送给 AI', 'ok');
      } else {
        await copyText(text);
        toast('自动发送失败，结果已复制到剪贴板，请手动粘贴', 'warn');
      }
    } else if (config.mode === 'semi') {
      const adapter = getAdapter();
      const input = adapter.getInputBox ? adapter.getInputBox() : null;
      if (input) {
        // 只填入，不发送
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') setNativeValue(input, text);
        else { input.innerText = text; input.dispatchEvent(new InputEvent('input', { bubbles: true })); }
        input.focus();
        toast('✅ 执行完成（' + okCount + '/' + results.length + ' 成功），结果已填入输入框，确认后发送', 'ok');
      } else {
        await copyText(text);
        toast('没找到输入框，结果已复制到剪贴板', 'warn');
      }
    } else {
      await copyText(text);
      toast('✅ 执行完成（' + okCount + '/' + results.length + ' 成功），结果已复制到剪贴板', 'ok');
    }
    return text;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
        document.body.appendChild(ta);
        ta.focus(); ta.select();
        document.execCommand('copy');
        ta.remove();
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  // ==================== 自动监听（AI 输出稳定后再执行） ====================
  async function processNewMessages() {
    if (isProcessing) return;
    const adapter = getAdapter();
    let messages = [];
    try { messages = adapter.getMessages(); } catch (e) { return; }
    if (!messages || messages.length === 0) return;

    for (const msgEl of messages.slice(-3)) {
      if (processedMessages.has(msgEl)) continue;
      let text = '';
      try { text = adapter.getText(msgEl); } catch (e) { continue; }
      if (!text || text.indexOf('<tool_call>') === -1 || text.indexOf('</tool_call>') === -1) continue;

      const hash = djb2(text);
      if (seenHashes.has(hash)) continue;

      if (pendingTimers.has(msgEl)) {
        if (pendingTexts.get(msgEl) === text) continue;
        clearTimeout(pendingTimers.get(msgEl));
      }
      pendingTexts.set(msgEl, text);
      const timer = setTimeout(async () => {
        pendingTimers.delete(msgEl);
        pendingTexts.delete(msgEl);
        let finalText = '';
        try { finalText = adapter.getText(msgEl); } catch (e) { return; }
        if (finalText !== text) return; // 还在输出，等下一轮
        rememberHash(djb2(finalText));
        processedMessages.add(msgEl);
        const toolCalls = parseToolCalls(finalText);
        if (toolCalls.length === 0) return;
        isProcessing = true;
        try {
          const results = await runToolCalls(toolCalls);
          await deliverResults(results);
        } finally {
          isProcessing = false;
        }
      }, 1500);
      pendingTimers.set(msgEl, timer);
    }
  }
  function rememberHash(h) {
    seenHashes.add(h);
    if (seenHashes.size > 100) seenHashes.delete(seenHashes.values().next().value);
  }

  // ==================== 面板 UI ====================
  const ui = {};
  function toast(msg, type) {
    if (!ui.toastWrap) { try { console.log('[AI Bridge]', msg); } catch (e) {} return; }
    const t = el('div', 'aib-toast' + (type === 'warn' ? ' aib-warn' : type === 'err' ? ' aib-err' : ''), ui.toastWrap, msg);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; }, 3600);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 4100);
  }
  function _setOut(text) {
    if (ui.out) ui.out.textContent = text;
    if (ui.copyOutBtn) ui.copyOutBtn.classList.toggle('aib-hidden', !text || text.indexOf('[工具执行结果]') === -1);
  }
  function updateRunsUI() {
    if (ui.runs) ui.runs.textContent = '本页已执行 ' + pageExecCount + ' / ' + config.maxAutoRuns + ' 次';
  }
  function renderLog() {
    if (!ui.logList) return;
    ui.logList.innerHTML = '';
    if (execLog.length === 0) {
      el('div', 'aib-log-empty', ui.logList, '暂无执行记录');
      return;
    }
    for (const e of execLog.slice(-30).slice().reverse()) {
      const item = el('div', 'aib-log-item' + (e.ok ? '' : ' aib-fail'), ui.logList);
      el('span', null, item, timeStr(e.t));
      el('span', 'aib-log-tool', item, e.tool);
      el('span', 'aib-log-detail', item, e.detail || '');
    }
  }
  async function refreshHealth(showToast) {
    setDot('pending');
    if (ui.statusText) ui.statusText.textContent = '连接中…';
    const h = await bridgeHealth();
    if (h.ok) {
      setDot('online');
      if (ui.statusText) ui.statusText.innerHTML = '';
      if (ui.statusText) ui.statusText.textContent = '✅ 已连接 V' + h.version + ' · 本地 ' + h.localTools + ' 工具 · MCP ' + (h.mcpTools || 0) + ' · ' + h.latency + 'ms';
      if (showToast) toast('✅ 连接成功（V' + h.version + '，' + h.latency + 'ms）', 'ok');
    } else {
      setDot('offline');
      if (ui.statusText) ui.statusText.textContent = '❌ ' + truncate(h.error || '无法连接本机桥', 220);
      if (showToast) toast('❌ 连接失败：' + truncate(h.error || '', 150), 'err');
    }
    return h;
  }
  function setDot(state) {
    if (!ui.dot) return;
    ui.dot.classList.remove('aib-online', 'aib-offline');
    if (state === 'online') ui.dot.classList.add('aib-online');
    else if (state === 'offline') ui.dot.classList.add('aib-offline');
  }
  function renderModeButtons() {
    if (!ui.modeAuto) return;
    const map = { auto: ui.modeAuto, semi: ui.modeSemi, manual: ui.modeManual };
    for (const key of Object.keys(map)) map[key].classList.toggle('aib-mode-on', config.mode === key);
    const hints = {
      auto: '执行 → 自动填入输入框 → 自动发送（AI 会连续自主工作，注意上限）',
      semi: '执行 → 填入输入框，不自动发送（推荐）',
      manual: '执行 → 复制到剪贴板，自己粘贴'
    };
    if (ui.modeHint) ui.modeHint.textContent = hints[config.mode] || '';
  }

  function buildPanel() {
    // 浮动按钮
    ui.bubble = el('button', '', document.body);
    ui.bubble.id = 'aib-bubble';
    ui.bubble.textContent = '🌉';
    ui.bubble.title = 'AI Agent Bridge — 本机工具桥';

    // 面板
    ui.panel = el('div', 'aib-hidden', document.body);
    ui.panel.id = 'aib-panel';
    ui.panel.innerHTML =
      '<div class="aib-header">' +
        '<span class="aib-title">🌉 AI Agent Bridge</span>' +
        '<span class="aib-ver">V' + VERSION + '</span>' +
        '<span class="aib-spacer"></span>' +
        '<button class="aib-iconbtn" data-act="reconnect" title="重新测试连接">🔌</button>' +
        '<button class="aib-iconbtn" data-act="close" title="收起面板">×</button>' +
      '</div>' +
      '<div class="aib-statusrow">' +
        '<span class="aib-dot" data-role="dot"></span>' +
        '<span class="aib-status-text" data-role="status">连接中…</span>' +
      '</div>' +
      '<label class="aib-label">本机桥 Token（后端启动时终端打印）</label>' +
      '<div class="aib-row">' +
        '<input class="aib-input" data-role="token" type="password" placeholder="粘贴 Token…" autocomplete="off">' +
        '<button class="aib-btn aib-btn-primary" data-act="save-token">💾 保存</button>' +
      '</div>' +
      '<label class="aib-label">工作模式</label>' +
      '<div class="aib-modes">' +
        '<button class="aib-mode" data-mode="auto">🤖 全自动</button>' +
        '<button class="aib-mode" data-mode="semi">🖱️ 半自动</button>' +
        '<button class="aib-mode" data-mode="manual">📋 仅复制</button>' +
      '</div>' +
      '<div class="aib-mode-hint" data-role="mode-hint"></div>' +
      '<label class="aib-check"><input type="checkbox" data-role="danger"> 危险工具（终端/写文件）执行前再问我一次</label>' +
      '<button class="aib-btn-green" data-act="scan">⚡ 执行页面最新一条 AI 回复里的工具调用</button>' +
      '<label class="aib-label">或者：把 AI 的完整回复粘贴进来</label>' +
      '<textarea class="aib-paste" data-role="paste" placeholder="粘贴包含 &lt;tool_call&gt; 的 AI 回复…"></textarea>' +
      '<button class="aib-btn aib-btn-primary aib-btn-block" data-act="run-paste">🔍 解析并执行</button>' +
      '<div class="aib-out aib-hidden" data-role="out"></div>' +
      '<button class="aib-btn aib-btn-block aib-hidden" data-act="copy-out" data-role="copy-out">📋 复制全部结果（粘回 MiMo）</button>' +
      '<label class="aib-label">执行记录（最近 30 条，保存在本机）</label>' +
      '<div class="aib-log" data-role="log"></div>' +
      '<div class="aib-foot"><span data-role="runs"></span><span class="aib-spacer"></span>' +
        '<button class="aib-link" data-act="clear-log">清空记录</button>' +
      '</div>';

    // toast 容器
    ui.toastWrap = el('div', '', document.body);
    ui.toastWrap.id = 'aib-toast-wrap';

    // 取引用
    ui.dot = ui.panel.querySelector('[data-role="dot"]');
    ui.statusText = ui.panel.querySelector('[data-role="status"]');
    ui.token = ui.panel.querySelector('[data-role="token"]');
    ui.modeAuto = ui.panel.querySelector('[data-mode="auto"]');
    ui.modeSemi = ui.panel.querySelector('[data-mode="semi"]');
    ui.modeManual = ui.panel.querySelector('[data-mode="manual"]');
    ui.modeHint = ui.panel.querySelector('[data-role="mode-hint"]');
    ui.danger = ui.panel.querySelector('[data-role="danger"]');
    ui.paste = ui.panel.querySelector('[data-role="paste"]');
    ui.out = ui.panel.querySelector('[data-role="out"]');
    ui.copyOutBtn = ui.panel.querySelector('[data-role="copy-out"]');
    ui.logList = ui.panel.querySelector('[data-role="log"]');
    ui.runs = ui.panel.querySelector('[data-role="runs"]');

    // 事件绑定
    ui.bubble.addEventListener('click', togglePanel);

    ui.panel.addEventListener('click', async (evt) => {
      const actEl = evt.target.closest('[data-act]');
      if (!actEl) return;
      const act = actEl.getAttribute('data-act');

      if (act === 'close') { ui.panel.classList.add('aib-hidden'); return; }
      if (act === 'reconnect') { await refreshHealth(true); return; }
      if (act === 'save-token') {
        const token = ui.token.value.trim();
        await saveConfig({ token });
        toast(token ? 'Token 已保存，正在测试连接…' : 'Token 已清空', 'ok');
        await refreshHealth(true);
        return;
      }
      if (act === 'scan') { await scanLatestReply(); return; }
      if (act === 'run-paste') { await runPastedText(); return; }
      if (act === 'copy-out') {
        const ok = await copyText(ui.out.textContent || '');
        toast(ok ? '已复制到剪贴板，去粘贴给 AI 吧' : '复制失败，请手动选中文本复制', ok ? 'ok' : 'err');
        return;
      }
      if (act === 'clear-log') {
        execLog = [];
        persistLog();
        renderLog();
        return;
      }
    });

    for (const [key, btn] of [['auto', ui.modeAuto], ['semi', ui.modeSemi], ['manual', ui.modeManual]]) {
      btn.addEventListener('click', async () => {
        await saveConfig({ mode: key });
        renderModeButtons();
        toast('已切换到：' + (key === 'auto' ? '全自动' : key === 'semi' ? '半自动' : '仅复制'), 'ok');
      });
    }
    ui.danger.addEventListener('change', () => saveConfig({ dangerousConfirm: ui.danger.checked }));
    ui.token.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') { evt.preventDefault(); ui.panel.querySelector('[data-act="save-token"]').click(); }
    });

    // 初始化内容
    ui.token.value = config.token || '';
    ui.danger.checked = !!config.dangerousConfirm;
    renderModeButtons();
    renderLog();
    updateRunsUI();
  }

  function togglePanel() {
    if (!ui.panel) return;
    ui.panel.classList.toggle('aib-hidden');
    if (!ui.panel.classList.contains('aib-hidden')) refreshHealth(false);
  }

  async function scanLatestReply() {
    const adapter = getAdapter();
    let messages = [];
    try { messages = adapter.getMessages(); } catch (e) {}
    let target = null;
    for (let i = messages.length - 1; i >= 0; i--) {
      let text = '';
      try { text = adapter.getText(messages[i]); } catch (e) { continue; }
      if (text && text.indexOf('<tool_call>') !== -1) { target = text; break; }
    }
    if (!target) {
      toast('没有在页面上找到包含 <tool_call> 的 AI 回复。试试把回复粘贴到下方文本框。', 'warn');
      return;
    }
    const toolCalls = parseToolCalls(target);
    if (toolCalls.length === 0) { toast('找到了内容，但没解析出工具调用', 'warn'); return; }
    isProcessing = true;
    try {
      const results = await runToolCalls(toolCalls);
      await deliverResults(results);
    } finally {
      isProcessing = false;
    }
  }

  async function runPastedText() {
    const text = (ui.paste.value || '').trim();
    if (!text) { toast('先粘贴 AI 的回复', 'warn'); return; }
    const toolCalls = parseToolCalls(text);
    if (toolCalls.length === 0) { toast('没解析到 <tool_call>，请确认粘贴的是完整 AI 回复', 'warn'); return; }
    isProcessing = true;
    try {
      const results = await runToolCalls(toolCalls);
      await deliverResults(results);
    } finally {
      isProcessing = false;
    }
  }

  // 接收工具栏图标点击 → 开关面板
  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'bridge:toggle-panel') togglePanel();
      return false;
    });
  } catch (e) {}

  // ==================== 启动 ====================
  async function start() {
    await loadConfig();
    buildPanel();
    refreshHealth(false);

    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(processNewMessages, 600);
    });
    try {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
    // 进入页面时也扫一眼（比如 AI 先回复完页面才刷新）
    setTimeout(processNewMessages, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
