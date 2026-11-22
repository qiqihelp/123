// AI Agent Bridge — Background Service Worker
// 扩展后台直连本机桥（127.0.0.1），不受页面 https→http 的 PNA/CORS 限制，这是相对 userscript 的关键优势。

const DEFAULT_CONFIG = {
  backendUrl: 'http://127.0.0.1:8000',
  token: '',
  mode: 'semi',          // auto 全自动（执行+填入+发送） / semi 半自动（执行+填入） / manual 仅执行+复制
  dangerousConfirm: true,
  maxAutoRuns: 20
};

async function getConfig() {
  const stored = await chrome.storage.local.get('aiBridgeConfig');
  return Object.assign({}, DEFAULT_CONFIG, stored.aiBridgeConfig || {});
}

async function bridgeFetch(path, options = {}) {
  const cfg = await getConfig();
  const base = String(cfg.backendUrl || DEFAULT_CONFIG.backendUrl).replace(/\/+$/, '');
  const headers = Object.assign({}, options.headers || {});
  if (cfg.token) headers['X-Bridge-Token'] = cfg.token;
  if (options.body) headers['Content-Type'] = 'application/json';

  let resp;
  try {
    resp = await fetch(base + path, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });
  } catch (err) {
    const raw = (err && err.message) || String(err);
    throw new Error(
      '连接不上本机桥（' + raw + '）。请确认：① 手机上的后端在跑（Termux 里 python bridge_server_v2.py --server）② 端口是 8000 ③ Token 已在面板保存'
    );
  }
  let data = null;
  try { data = await resp.json(); } catch (e) { /* 非 JSON 时保留 null */ }

  if (resp.status === 401) {
    throw new Error('Token 错误或未保存（401）。去面板填入启动后端时终端打印的那串 Token，点💾保存。');
  }
  if (!resp.ok) {
    throw new Error((data && (data.error || data.message)) || ('后端返回 HTTP ' + resp.status));
  }
  return data;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      if (!msg || typeof msg !== 'object') throw new Error('消息格式错误');

      if (msg.type === 'bridge:health') {
        const started = Date.now();
        const d = await bridgeFetch('/');
        sendResponse({
          ok: true,
          version: d.version || '?',
          localTools: (d.local_tools || []).length,
          mcpTools: d.mcp_tools_count || 0,
          mcpServers: d.mcp_servers_configured || 0,
          latency: Date.now() - started
        });
        return;
      }

      if (msg.type === 'bridge:execute') {
        const d = await bridgeFetch('/execute', {
          method: 'POST',
          body: { tool_name: msg.toolName, arguments: msg.arguments || {} }
        });
        sendResponse({
          ok: true,
          success: d.success !== false,
          result: d.result !== undefined ? d.result : '',
          tool: d.tool || msg.toolName
        });
        return;
      }

      if (msg.type === 'bridge:tools') {
        const d = await bridgeFetch('/tools');
        sendResponse({ ok: true, data: d });
        return;
      }

      if (msg.type === 'bridge:skills') {
        const d = await bridgeFetch('/skills');
        sendResponse({ ok: true, skills: (d && d.skills) || [] });
        return;
      }

      if (msg.type === 'bridge:skill') {
        const name = String(msg.name || '');
        const d = await bridgeFetch('/skill?name=' + encodeURIComponent(name));
        if (d && typeof d.skill === 'string') {
          sendResponse({ ok: true, content: d.skill });
        } else {
          sendResponse({ ok: false, error: (d && d.error) || 'Skill 内容为空' });
        }
        return;
      }

      sendResponse({ ok: false, error: '未知消息类型: ' + String(msg.type) });
    } catch (e) {
      sendResponse({ ok: false, error: (e && e.message) || String(e) });
    }
  })();
  return true; // 异步 sendResponse
});

// 点工具栏图标 ↔ 开关面板
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || tab.id === undefined) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'bridge:toggle-panel' });
  } catch (e) {
    // 页面没注入 content script（如 chrome:// 页面）：忽略
  }
});
