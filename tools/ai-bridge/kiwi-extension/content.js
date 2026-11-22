// AI Agent Bridge — Content Script v1.1.0（注入 MiMo Studio / AI 对话页）
// 后台 Service Worker 直连本机桥，绕过 https→http 的 PNA/CORS 限制。
(() => {
  if (window.__AI_BRIDGE_EXT_LOADED__) return;
  window.__AI_BRIDGE_EXT_LOADED__ = true;
  if (!/^https?:$/.test(location.protocol)) return;

  const VERSION = '1.1.0';
  const LOG_KEY = 'ai_bridge_ext_log_v1';
  const BUBBLE_POS_KEY = 'aiBridgeBubblePos';
  const DANGEROUS = ['execute_terminal', 'write_file'];
  const RESULT_LIMIT = 3000; // 单个工具结果回灌给 AI 的最大字符数（防止撑爆 MiMo 上下文）
  const DEFAULT_CONFIG = {
    backendUrl: 'http://127.0.0.1:8000',
    token: '',
    mode: 'semi', // auto 全自动（执行并发送）/ semi 半自动（执行并填入）/ manual 仅执行并复制
    dangerousConfirm: true,
    maxAutoRuns: 20
  };

  // ==================== 内置提示词预设库 ====================
  const PROMPT_FULL = `=== 系统指令 ===
你是本机的「AI Agent 助手」，拥有用户授权的本机工具。原则：需要真实数据/真实操作时必须调用工具，绝不编造；闲聊、创作、翻译、常识问题直接回答，不要乱用工具。

=== 本机工具 ===
- get_datetime —— 现在几点了、今天几号、Unix 时间戳。参数：{}
- calc —— 一切数学计算。支持四则 + - * /、幂 **、取模 %、sqrt、sin、cos、tan、log、pi、e 等。参数：{"expression":"2**10 + sqrt(16)"}
- get_system_info —— 查看手机/系统状态（内存、存储等）。参数：{}
- list_files —— 列出目录内容。参数：{"path":"/sdcard/Download"}
- read_file —— 读取文本文件（超长会自动截断）。参数：{"file_path":"/sdcard/a.txt"}
- write_file —— 写文件（执行前会弹确认，务必先告知用户）。参数：{"file_path":"/sdcard/a.txt","content":"内容"}
  若要写入大段内容（HTML 游戏、代码等），不要塞进 JSON，用原始格式（无需转义）：
  <tool_call>
  <tool_name>write_file</tool_name>
  <file_path>/sdcard/a.html</file_path>
  <content>
  …原始内容，什么都不用转义…
  </content>
  </tool_call>
- search_web —— 联网搜索最新信息（新闻、价格、版本、文档）。参数：{"query":"关键词"}
- execute_terminal —— 执行 shell 命令（执行前会弹确认；优先只读命令 ls / cat / df / ps / echo，谨慎使用 rm / sudo / chown / mkfs）。参数：{"command":"ls -la"}

=== 调用格式 ===
<tool_call>
<tool_name>工具名</tool_name>
<arguments>{"参数名":"参数值"}</arguments>
</tool_call>

=== 规则 ===
1. 参数必须是合法 JSON，字符串双引号；空参数写 {}，绝对不要省略 <arguments> 标签。
2. 一次回复可以包含多个 <tool_call> 块，会按顺序执行。
3. 输出工具调用后等待系统执行并把结果贴回给你，不要重复调用同一个工具。
4. 工具返回的内容以 ❌ 开头表示失败：先读错误原因，改参数或换工具重试一次；再失败就如实告知用户并给出替代方案。
5. 破坏性操作（删除、覆盖、安装软件、下载执行）前，先向用户说明要做什么、有什么影响，等用户同意后再调用。
6. 需要最新信息时必须先 search_web，不要凭记忆回答。
7. 回复使用中文，先说结论再展开过程；引用工具结果时只摘要关键几行，不要整段粘贴原文。
8. 你不需要、也不应该模拟工具执行结果。
9. 对本机文件的操作完成后，用一两句话向用户确认做了什么（比如已写入哪个文件、文件多大）。

=== 输出节奏 ===
简单任务：一句话说明 + <tool_call> 块。
复杂任务：先给用户一个简短计划（3 步以内），再执行。
收到工具结果后：基于结果给出最终答案或继续下一步。`;

  const PROMPT_MIN = `你拥有用户授权的本机工具。需要真实数据或操作时必须用，不要编造。

格式：
<tool_call><tool_name>工具名</tool_name><arguments>{"参数":"值"}</arguments></tool_call>

工具：get_datetime{}、calc{"expression":"1+1"}、get_system_info{}、list_files{"path":"."}、read_file{"file_path":"路径"}、write_file{"file_path":"路径","content":"内容"}、search_web{"query":"关键词"}、execute_terminal{"command":"命令"}
规则：参数必须合法 JSON，空参数写 {}；一次可多个 tool_call；结果由系统执行后贴回，收到后再继续，不要重复调用；❌ 开头表示失败，改参数重试一次；闲聊直接答。`;

  const PROMPT_SAFE = `=== 系统指令 · 安全优先 ===
你可以使用用户授权的本机工具，但所有操作分为三级，每一级的纪律不同：

【只读 · 可直接用】
get_datetime{}、calc{"expression":"1+1"}、get_system_info{}、list_files{"path":"目录"}、read_file{"file_path":"文件"}、search_web{"query":"关键词"}

【写入 · 先说再做】
write_file{"file_path":"路径","content":"内容"}
调用前先明确告诉用户：写到哪里、写多少内容、会覆盖什么；等用户确认后再调用。
大段内容（HTML/代码）用原始格式（<file_path> + <content> 标签，无需转义），见完整预设说明。

【高危 · 明确确认】
execute_terminal{"command":"命令"}
先贴出完整命令并说明每一步影响；只有用户明确说"可以/执行/确认"才调用；默认优先只读命令；rm / sudo / > 覆盖 / 安装类命令必须额外提醒。

=== 格式 ===
<tool_call><tool_name>工具名</tool_name><arguments>{"参数":"值"}</arguments></tool_call>

参数必须合法 JSON，空参数写 {}；一次可多个块；结果会由系统执行并贴回；收到后再继续，不要重复调用；❌ 开头表示失败，读错误重试一次仍失败就如实报告。回复用中文，先结论后过程。闲聊直接答，不调工具。`;

  const PRESETS = [
    { id: 'full', name: '🌉 完整预设 · 本机工具助手 Pro（推荐）', text: PROMPT_FULL },
    { id: 'min', name: '⚡ 极简预设 · 省上下文', text: PROMPT_MIN },
    { id: 'safe', name: '🛡️ 安全优先 · 全程确认', text: PROMPT_SAFE }
  ];

  let config = Object.assign({}, DEFAULT_CONFIG);
  let pageExecCount = 0;
  let isProcessing = false;
  const execCounts = new Map();
  const processedMessages = new WeakSet();
  const seenHashes = new Set();
  const pendingTimers = new WeakMap();
  const pendingTexts = new WeakMap();
  const skillCache = new Map();

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
  // 回灌给 AI 的单个结果做头尾截断，避免撑爆 MiMo 上下文（AI 变蠢的头号原因）
  function truncateResult(result) {
    const s = String(result == null ? '' : result);
    if (s.length <= RESULT_LIMIT) return s;
    const head = s.slice(0, 2200);
    const tail = s.slice(-650);
    return head + '\n…（中间已截断，共 ' + s.length + ' 字符。需要完整内容请让用户查看后端返回）…\n' + tail;
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
  function unescapeEntities(text) {
    return String(text || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"');
  }

  // ==================== 配置读写（chrome.storage.local，与后台共享） ====================
  async function loadConfig() {
    try {
      const stored = await chrome.storage.local.get('aiBridgeConfig');
      config = Object.assign({}, DEFAULT_CONFIG, stored.aiBridgeConfig || {});
      if (!Number.isFinite(config.maxAutoRuns) || config.maxAutoRuns < 1) config.maxAutoRuns = DEFAULT_CONFIG.maxAutoRuns;
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
    updateGuide();
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
  const bridgeSkills = () => sendBridge({ type: 'bridge:skills' });
  const bridgeSkill = (name) => sendBridge({ type: 'bridge:skill', name });

  // ==================== 解析 tool_call（与 userscript v3.2 一致） ====================
  function parseToolCalls(text) {
    const matches = [];
    if (!text) return matches;

    const mcpPattern = /<tool_call>[\s\S]*?<tool_name>\s*mcp\s*<\/tool_name>[\s\S]*?<arguments>\s*([\s\S]*?)\s*<\/arguments>[\s\S]*?<\/tool_call>/gim;
    let mcpMatch;
    while ((mcpMatch = mcpPattern.exec(text)) !== null) {
      try {
        const mcpData = JSON.parse(mcpMatch[1].trim());
        const params = mcpData.params || {};
        matches.push({ toolName: params.name || mcpData.tool_name || '', arguments: params.arguments || {} });
      } catch (e) { /* 跳过 */ }
    }

    const rawPattern = /<tool_call>[\s\S]*?<tool_name>\s*(.*?)\s*<\/tool_name>[\s\S]*?<file_path>\s*([\s\S]*?)\s*<\/file_path>[\s\S]*?<content>\s*([\s\S]*?)\s*<\/content>[\s\S]*?<\/tool_call>/gim;
    let rawMatch;
    while ((rawMatch = rawPattern.exec(text)) !== null) {
      matches.push({ toolName: rawMatch[1].trim(), arguments: { file_path: rawMatch[2].trim(), content: rawMatch[3] } });
    }

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
    // 注意：必须只选“对话输入框”，绝不碰面板自己的 textarea（防止把结果写进面板）
    const selectors = [
      'textarea[placeholder*="有问题"]',
      '.dialogue-container textarea',
      '#prompt-textarea',
      'div[contenteditable="true"]',
      'textarea:not([data-aib])'
    ];
    for (const sel of selectors) {
      const found = document.querySelector(sel);
      if (found) return found;
    }
    return null;
  }
  function fillInput(elNode, text) {
    if (elNode.tagName === 'TEXTAREA' || elNode.tagName === 'INPUT') {
      setNativeValue(elNode, text);
    } else {
      elNode.innerText = text;
      elNode.dispatchEvent(new InputEvent('input', { bubbles: true }));
    }
    elNode.focus();
  }
  function defaultSendMessage(text) {
    const input = defaultInputBox();
    if (!input) return { sent: false, reason: '未找到输入框' };
    fillInput(input, text);
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

  // 注入文本到页面输入框（Skill / 预设共用）
  function injectIntoInput(text, label) {
    const adapter = getAdapter();
    const input = adapter.getInputBox ? adapter.getInputBox() : null;
    if (!input) {
      copyText(text).then((ok) => toast(ok ? '没找到输入框，内容已复制到剪贴板' : '没找到输入框，复制也失败了', 'warn'));
      return false;
    }
    fillInput(input, text);
    toast('💉 已填入输入框：' + (label || '内容') + '（确认后发送）', 'ok');
    return true;
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
      out += '结果:\n' + truncateResult(r.result) + '\n---\n';
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

      if (prevCount >= 3) {
        results.push({ tool: tc.toolName, args: tc.arguments, success: false,
          result: '该调用已连续执行 3 次，已被安全护栏跳过（疑似死循环）。请改用其他方式完成任务，或结束回复。' });
        logExecution(tc.toolName, false, '护栏: 相同调用 ≥3 次');
        continue;
      }
      if (pageExecCount >= config.maxAutoRuns) {
        results.push({ tool: tc.toolName, args: tc.arguments, success: false,
          result: '已达到单页自动执行上限（' + config.maxAutoRuns + ' 次）。可在面板里调高后继续。' });
        logExecution(tc.toolName, false, '护栏: 达到单页执行上限');
        continue;
      }
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
        fillInput(input, text);
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
        ta.setAttribute('data-aib', '1');
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
        if (finalText !== text) return;
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
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(24px)'; }, 3600);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 4100);
  }
  function _setOut(text) {
    if (ui.out) {
      ui.out.textContent = text;
      ui.out.classList.toggle('aib-hidden', !text);
    }
    if (ui.copyOutBtn) ui.copyOutBtn.classList.toggle('aib-hidden', !(text && text.indexOf('[工具执行结果]') !== -1));
  }
  function updateRunsUI() {
    if (ui.runs) ui.runs.textContent = '本页执行 ' + pageExecCount + '/' + config.maxAutoRuns;
  }
  function renderLog() {
    if (!ui.logList) return;
    if (ui.logCount) ui.logCount.textContent = String(execLog.length);
    ui.logList.innerHTML = '';
    if (execLog.length === 0) {
      el('div', 'aib-log-empty', ui.logList, '暂无执行记录');
      return;
    }
    for (const e of execLog.slice(-30).slice().reverse()) {
      const item = el('div', 'aib-log-item' + (e.ok ? '' : ' aib-fail'), ui.logList);
      el('span', 'aib-log-time', item, timeStr(e.t));
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
      if (ui.statusText) ui.statusText.textContent = '✅ 已连接 V' + h.version + ' · 本地 ' + h.localTools + ' 工具 · MCP ' + (h.mcpTools || 0) + ' · ' + h.latency + 'ms';
      if (showToast) toast('✅ 连接成功（V' + h.version + '，' + h.latency + 'ms）', 'ok');
    } else {
      setDot('offline');
      if (ui.statusText) ui.statusText.textContent = '❌ ' + truncate(h.error || '无法连接本机桥', 220);
      if (showToast) toast('❌ ' + truncate(h.error || '连接失败', 150), 'err');
    }
    updateGuide();
    return h;
  }
  function updateGuide() {
    if (ui.guide) ui.guide.classList.toggle('aib-hidden', !!(config.token && config.token.length > 0));
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
      auto: '执行 → 自动填入并发送（AI 连续自主工作，注意右下角计数）',
      semi: '执行 → 填入输入框，你确认后再发送（推荐）',
      manual: '执行 → 复制到剪贴板，自己粘贴'
    };
    if (ui.modeHint) ui.modeHint.textContent = hints[config.mode] || '';
  }

  // ===== Skill 注入（恢复 V3 面板能力） =====
  async function refreshSkills(keepSelection) {
    if (!ui.skillSel) return;
    const previous = keepSelection ? ui.skillSel.value : '';
    ui.skillSel.innerHTML = '<option value="">加载中…</option>';
    const r = await bridgeSkills();
    const skills = (r && r.ok && Array.isArray(r.skills)) ? r.skills : [];
    ui.skillSel.innerHTML = '';
    if (skills.length === 0) {
      const opt = el('option', null, ui.skillSel, '（后端暂无 Skill，默认会有一个 default）');
      opt.value = '';
      if (ui.skillPreview) ui.skillPreview.value = '提示：后端首次启动会自动生成 default Skill（包含全部工具说明）。\n若列表为空，说明后端未生成或被删了，可在 Termux 终端菜单 → Skill 管理 → 重新生成。';
      return;
    }
    for (const s of skills) {
      const opt = el('option', null, ui.skillSel, s.name + (s.description ? ' — ' + truncate(s.description, 30) : ''));
      opt.value = s.name;
    }
    if (previous && skills.some((s) => s.name === previous)) ui.skillSel.value = previous;
    await loadSkillPreview();
  }
  async function loadSkillPreview() {
    if (!ui.skillPreview) return;
    const name = ui.skillSel.value;
    if (!name) { ui.skillPreview.value = ''; return; }
    if (skillCache.has(name)) { ui.skillPreview.value = skillCache.get(name); return; }
    ui.skillPreview.value = '加载中…';
    const r = await bridgeSkill(name);
    if (r.ok) {
      skillCache.set(name, r.content);
      ui.skillPreview.value = r.content;
    } else {
      ui.skillPreview.value = '❌ ' + (r.error || '获取 Skill 内容失败');
    }
  }

  // ===== 提示词预设 =====
  function currentPreset() {
    const id = ui.presetSel ? ui.presetSel.value : 'full';
    return PRESETS.find((p) => p.id === id) || PRESETS[0];
  }
  function refreshPresetPreview() {
    if (ui.presetPreview) ui.presetPreview.value = currentPreset().text;
  }

  // ===== 快捷工具 =====
  async function quickTool(kind) {
    let toolName = '', args = {};
    if (kind === 'datetime') { toolName = 'get_datetime'; args = {}; }
    else if (kind === 'sysinfo') { toolName = 'get_system_info'; args = {}; }
    else if (kind === 'calc') {
      const expr = window.prompt('🧮 输入表达式（例：2**10 + sqrt(16)）', '2**10');
      if (expr === null || !expr.trim()) return;
      toolName = 'calc'; args = { expression: expr.trim() };
    } else if (kind === 'search') {
      const q = window.prompt('🔍 搜索关键词');
      if (q === null || !q.trim()) return;
      toolName = 'search_web'; args = { query: q.trim() };
    }
    _setOut('⏳ 执行 ' + toolName + '…');
    const resp = await bridgeExecute(toolName, args);
    const ok = resp.ok && resp.success !== false;
    const body = resp.ok ? String(resp.result == null ? '' : resp.result) : ('❌ ' + (resp.error || '执行失败'));
    _setOut('【' + toolName + '】\n' + body);
    if (ui.copyOutBtn) ui.copyOutBtn.classList.remove('aib-hidden');
    logExecution(toolName, ok, '快捷工具');
    toast(ok ? '✅ ' + toolName + ' 执行完成' : '❌ ' + toolName + ' 执行失败', ok ? 'ok' : 'err');
  }

  function buildPanel() {
    ui.bubble = el('button', '', document.body);
    ui.bubble.id = 'aib-bubble';
    ui.bubble.textContent = '🌉';
    ui.bubble.title = 'AI Agent Bridge · 本机工具桥（可拖动）';

    ui.panel = el('div', 'aib-hidden', document.body);
    ui.panel.id = 'aib-panel';
    ui.panel.innerHTML =
      '<div class="aib-header">' +
        '<span class="aib-logo">🌉</span>' +
        '<span class="aib-title">AI Agent Bridge</span>' +
        '<span class="aib-ver">v' + VERSION + '</span>' +
        '<span class="aib-spacer"></span>' +
        '<button class="aib-iconbtn" data-act="reconnect" title="重新测试连接">🔌</button>' +
        '<button class="aib-iconbtn" data-act="close" title="收起面板（Esc）">×</button>' +
      '</div>' +
      '<div class="aib-statusrow">' +
        '<span class="aib-dot" data-role="dot"></span>' +
        '<span class="aib-status-text" data-role="status">连接中…</span>' +
      '</div>' +
      '<div class="aib-guide aib-hidden" data-role="guide">👆 <b>先粘贴 Token 再保存</b>——扩展才能连上你手机上的本机桥（Token 在 Termux 启动后端时打印）。</div>' +

      '<div class="aib-card">' +
        '<div class="aib-card-title">🔗 连接设置</div>' +
        '<label class="aib-label">后端地址（模拟器/电脑联调时改这里）</label>' +
        '<div class="aib-row"><input class="aib-input aib-input-mono" data-role="backend" type="text" spellcheck="false" placeholder="http://127.0.0.1:8000"><button class="aib-btn aib-btn-primary" data-act="save-conn">保存</button></div>' +
        '<label class="aib-label">本机桥 Token</label>' +
        '<div class="aib-row"><input class="aib-input aib-input-mono" data-role="token" type="password" autocomplete="off" placeholder="粘贴后端打印的 Token…"><button class="aib-btn aib-btn-primary" data-act="save-token">💾 保存</button></div>' +
        '<div class="aib-row" style="margin-top:8px"><span class="aib-label" style="margin:0">单页最大执行次数</span><input class="aib-input" data-role="maxruns" type="number" min="1" max="999" style="width:58px;flex:0 0 58px;text-align:center"><span class="aib-spacer"></span><label class="aib-check" style="margin:0"><input type="checkbox" data-role="danger"> 危险工具再确认</label></div>' +
      '</div>' +

      '<div class="aib-card">' +
        '<div class="aib-card-title">🎛️ 工作模式</div>' +
        '<div class="aib-modes">' +
          '<button class="aib-mode" data-mode="auto">🤖 全自动</button>' +
          '<button class="aib-mode" data-mode="semi">🖱️ 半自动</button>' +
          '<button class="aib-mode" data-mode="manual">📋 仅复制</button>' +
        '</div>' +
        '<div class="aib-mode-hint" data-role="mode-hint"></div>' +
      '</div>' +

      '<div class="aib-card">' +
        '<div class="aib-card-title">🧠 提示词预设（让 AI 一次就懂）</div>' +
        '<select class="aib-select" data-role="preset-select"></select>' +
        '<textarea class="aib-preview" data-role="preset-preview" readonly spellcheck="false"></textarea>' +
        '<div class="aib-btnrow"><button class="aib-btn" data-act="preset-copy">📋 复制预设</button><button class="aib-btn aib-btn-primary" data-act="preset-fill">💉 填入 MiMo</button></div>' +
      '</div>' +

      '<div class="aib-card">' +
        '<div class="aib-card-title">💉 Skill 注入（后端 default 完整指令）<button class="aib-mini" data-act="refresh-skills">↻ 刷新</button></div>' +
        '<select class="aib-select" data-role="skill-select"></select>' +
        '<textarea class="aib-preview" data-role="skill-preview" readonly spellcheck="false" placeholder="选择一个 Skill 预览内容…"></textarea>' +
        '<div class="aib-btnrow"><button class="aib-btn aib-btn-primary" data-act="inject-skill">💉 注入到输入框</button></div>' +
      '</div>' +

      '<div class="aib-card">' +
        '<div class="aib-card-title">⚡ 快捷工具（不用等 AI）</div>' +
        '<div class="aib-quick">' +
          '<button class="aib-chip" data-act="quick-datetime">🕐 时间</button>' +
          '<button class="aib-chip" data-act="quick-calc">🧮 计算</button>' +
          '<button class="aib-chip" data-act="quick-search">🔍 搜索</button>' +
          '<button class="aib-chip" data-act="quick-sysinfo">📱 系统</button>' +
        '</div>' +
      '</div>' +

      '<div class="aib-card">' +
        '<div class="aib-card-title">📋 粘贴执行（兜底万能）</div>' +
        '<textarea class="aib-paste" data-role="paste" placeholder="把 AI 的完整回复粘贴进来（包含 &lt;tool_call&gt;）…"></textarea>' +
        '<button class="aib-btn aib-btn-primary aib-btn-block" data-act="run-paste">🔍 解析并执行</button>' +
        '<button class="aib-btn-green" data-act="scan">⚡ 自动找到页面最新 AI 回复并执行</button>' +
        '<div class="aib-out aib-hidden" data-role="out"></div>' +
        '<button class="aib-btn aib-btn-block aib-hidden" data-act="copy-out" data-role="copy-out">📋 复制全部结果（粘回 MiMo）</button>' +
      '</div>' +

      '<div class="aib-card">' +
        '<div class="aib-log-head"><div class="aib-card-title" style="margin:0">📜 执行记录 <span class="aib-badge" data-role="log-count">0</span></div>' +
          '<span class="aib-spacer"></span>' +
          '<button class="aib-mini" data-act="copy-log">复制全部</button>' +
          '<button class="aib-mini" data-act="clear-log">清空</button>' +
        '</div>' +
        '<div class="aib-log" data-role="log"></div>' +
      '</div>' +

      '<div class="aib-foot"><span data-role="runs"></span><span class="aib-spacer"></span><span>Token 仅存本机 · Esc 关闭</span></div>';

    ui.toastWrap = el('div', '', document.body);
    ui.toastWrap.id = 'aib-toast-wrap';

    // 引用
    ui.dot = ui.panel.querySelector('[data-role="dot"]');
    ui.statusText = ui.panel.querySelector('[data-role="status"]');
    ui.guide = ui.panel.querySelector('[data-role="guide"]');
    ui.backend = ui.panel.querySelector('[data-role="backend"]');
    ui.token = ui.panel.querySelector('[data-role="token"]');
    ui.maxRuns = ui.panel.querySelector('[data-role="maxruns"]');
    ui.danger = ui.panel.querySelector('[data-role="danger"]');
    ui.modeAuto = ui.panel.querySelector('[data-mode="auto"]');
    ui.modeSemi = ui.panel.querySelector('[data-mode="semi"]');
    ui.modeManual = ui.panel.querySelector('[data-mode="manual"]');
    ui.modeHint = ui.panel.querySelector('[data-role="mode-hint"]');
    ui.presetSel = ui.panel.querySelector('[data-role="preset-select"]');
    ui.presetPreview = ui.panel.querySelector('[data-role="preset-preview"]');
    ui.skillSel = ui.panel.querySelector('[data-role="skill-select"]');
    ui.skillPreview = ui.panel.querySelector('[data-role="skill-preview"]');
    ui.paste = ui.panel.querySelector('[data-role="paste"]');
    ui.out = ui.panel.querySelector('[data-role="out"]');
    ui.copyOutBtn = ui.panel.querySelector('[data-role="copy-out"]');
    ui.logList = ui.panel.querySelector('[data-role="log"]');
    ui.logCount = ui.panel.querySelector('[data-role="log-count"]');
    ui.runs = ui.panel.querySelector('[data-role="runs"]');

    // 面板内所有 textarea/input 标记 data-aib，避免被当成 MiMo 输入框
    ui.panel.querySelectorAll('textarea, input').forEach((n) => n.setAttribute('data-aib', '1'));

    // 气泡点击/拖动
    setupBubbleDrag();

    // 事件委托
    ui.panel.addEventListener('click', async (evt) => {
      const actEl = evt.target.closest('[data-act]');
      if (!actEl) return;
      const act = actEl.getAttribute('data-act');

      if (act === 'close') { ui.panel.classList.add('aib-hidden'); return; }
      if (act === 'reconnect') { await refreshHealth(true); return; }
      if (act === 'save-conn') {
        const url = (ui.backend.value || '').trim().replace(/\/+$/, '') || DEFAULT_CONFIG.backendUrl;
        const maxRuns = Math.max(1, Math.min(999, parseInt(ui.maxRuns.value, 10) || DEFAULT_CONFIG.maxAutoRuns));
        ui.backend.value = url; ui.maxRuns.value = String(maxRuns);
        await saveConfig({ backendUrl: url, maxAutoRuns: maxRuns });
        updateRunsUI();
        toast('✅ 连接设置已保存', 'ok');
        await refreshHealth(true);
        return;
      }
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
      if (act === 'clear-log') { execLog = []; persistLog(); renderLog(); return; }
      if (act === 'copy-log') {
        if (execLog.length === 0) { toast('没有可复制的记录', 'warn'); return; }
        const lines = execLog.map((e) => '[' + new Date(e.t).toLocaleString() + '] ' + (e.ok ? '✓' : '✗') + ' ' + e.tool + (e.detail ? ' — ' + e.detail : ''));
        const ok = await copyText(lines.join('\n'));
        toast(ok ? '已复制 ' + lines.length + ' 条记录' : '复制失败', ok ? 'ok' : 'err');
        return;
      }
      if (act === 'preset-copy') {
        const p = currentPreset();
        const ok = await copyText(p.text);
        toast(ok ? '预设已复制，粘贴到 MiMo 让 AI 学习' : '复制失败', ok ? 'ok' : 'err');
        return;
      }
      if (act === 'preset-fill') {
        const p = currentPreset();
        injectIntoInput(p.text, p.name.replace(/^[^ ]+\s*/, ''));
        return;
      }
      if (act === 'refresh-skills') { skillCache.clear(); await refreshSkills(true); toast('Skill 列表已刷新', 'ok'); return; }
      if (act === 'inject-skill') {
        const name = ui.skillSel.value;
        if (!name) { toast('先选择一个 Skill', 'warn'); return; }
        let content = skillCache.get(name);
        if (!content) {
          const r = await bridgeSkill(name);
          if (!r.ok) { toast('❌ ' + (r.error || '获取失败'), 'err'); return; }
          content = r.content;
          skillCache.set(name, content);
        }
        injectIntoInput(content, 'Skill: ' + name);
        return;
      }
      if (act === 'quick-datetime') { await quickTool('datetime'); return; }
      if (act === 'quick-calc') { await quickTool('calc'); return; }
      if (act === 'quick-search') { await quickTool('search'); return; }
      if (act === 'quick-sysinfo') { await quickTool('sysinfo'); return; }
    });

    for (const [key, btn] of [['auto', ui.modeAuto], ['semi', ui.modeSemi], ['manual', ui.modeManual]]) {
      btn.addEventListener('click', async () => {
        await saveConfig({ mode: key });
        renderModeButtons();
        toast('已切换到：' + (key === 'auto' ? '全自动' : key === 'semi' ? '半自动' : '仅复制'), 'ok');
      });
    }
    ui.danger.addEventListener('change', () => saveConfig({ dangerousConfirm: ui.danger.checked }));
    ui.maxRuns.addEventListener('change', () => {
      const n = Math.max(1, Math.min(999, parseInt(ui.maxRuns.value, 10) || DEFAULT_CONFIG.maxAutoRuns));
      ui.maxRuns.value = String(n);
      saveConfig({ maxAutoRuns: n });
      updateRunsUI();
    });
    ui.token.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') { evt.preventDefault(); ui.panel.querySelector('[data-act="save-token"]').click(); }
    });
    ui.backend.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter') { evt.preventDefault(); ui.panel.querySelector('[data-act="save-conn"]').click(); }
    });

    // 预设下拉
    for (const p of PRESETS) {
      const opt = el('option', null, ui.presetSel, p.name);
      opt.value = p.id;
    }
    ui.presetSel.value = 'full';
    ui.presetSel.addEventListener('change', refreshPresetPreview);
    refreshPresetPreview();
    ui.skillSel.addEventListener('change', loadSkillPreview);

    // 填充当前配置
    ui.backend.value = config.backendUrl;
    ui.token.value = config.token || '';
    ui.maxRuns.value = String(config.maxAutoRuns);
    ui.danger.checked = !!config.dangerousConfirm;

    renderModeButtons();
    renderLog();
    updateRunsUI();
    updateGuide();
  }

  function setupBubbleDrag() {
    const bubble = ui.bubble;
    let drag = null;
    bubble.addEventListener('pointerdown', (e) => {
      drag = { x: e.clientX || 0, y: e.clientY || 0, right: parseFloat(getComputedStyle(bubble).right) || 14, bottom: parseFloat(getComputedStyle(bubble).bottom) || 88, dragging: false };
      try { bubble.setPointerCapture(e.pointerId); } catch (err) {}
    });
    bubble.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.dragging && Math.hypot(dx, dy) < 10) return;
      drag.dragging = true;
      const vw = window.innerWidth, vh = window.innerHeight;
      const size = 54;
      let right = drag.right - dx;
      let bottom = drag.bottom - dy;
      if (!Number.isFinite(right)) right = 14;
      if (!Number.isFinite(bottom)) bottom = 88;
      right = Math.max(4, Math.min(vw - size - 4, right));
      bottom = Math.max(4, Math.min(vh - size - 4, bottom));
      bubble.style.right = right + 'px';
      bubble.style.bottom = bottom + 'px';
    });
    bubble.addEventListener('pointerup', () => {
      if (!drag) return;
      const wasDrag = drag.dragging;
      drag = null;
      if (wasDrag) {
        try {
          chrome.storage.local.set({ [BUBBLE_POS_KEY]: { right: bubble.style.right, bottom: bubble.style.bottom } });
        } catch (e) {}
        return;
      }
      togglePanel();
    });
    bubble.addEventListener('pointercancel', () => { drag = null; });
  }

  async function restoreBubblePos() {
    try {
      const stored = await chrome.storage.local.get(BUBBLE_POS_KEY);
      const pos = stored && stored[BUBBLE_POS_KEY];
      if (pos && pos.right && pos.bottom && ui.bubble) {
        ui.bubble.style.right = pos.right;
        ui.bubble.style.bottom = pos.bottom;
      }
    } catch (e) {}
  }

  function togglePanel() {
    if (!ui.panel) return;
    const opening = ui.panel.classList.contains('aib-hidden');
    ui.panel.classList.toggle('aib-hidden');
    if (opening) {
      refreshHealth(false);
      refreshSkills(true);
    }
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

  try {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg && msg.type === 'bridge:toggle-panel') togglePanel();
      return false;
    });
  } catch (e) {}

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ui.panel && !ui.panel.classList.contains('aib-hidden')) {
      ui.panel.classList.add('aib-hidden');
    }
  });

  // ==================== 启动 ====================
  async function start() {
    await loadConfig();
    buildPanel();
    await restoreBubblePos();
    refreshHealth(false);

    let debounceTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(processNewMessages, 600);
    });
    try {
      observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    } catch (e) {}
    setTimeout(processNewMessages, 1500);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
