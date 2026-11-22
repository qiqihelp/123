// ==UserScript==
// @name         🤖 AI Agent Tool Bridge V3 (Via版)
// @namespace    ai-agent-bridge-v3
// @version      3.0
// @description  Via浏览器专用：完整 MCP 适配 + Skill 选择注入 + 安全护栏 + 侧边栏面板
// @author       You
// @match        https://chatgpt.com/*
// @match        https://chat.openai.com/*
// @match        https://claude.ai/*
// @match        https://kimi.moonshot.cn/*
// @match        https://aistudio.xiaomimimo.com/*
// @match        https://aistudio.xiaomimimo.com
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 设置（持久化到 localStorage）====================
    const SETTINGS_KEY = 'ai_bridge_settings_v3';
    const LOG_KEY = 'ai_bridge_exec_log_v3';
    const DEFAULT_SETTINGS = {
        backendUrl: 'http://127.0.0.1:8000',
        token: '',
        autoSend: true,
        dangerousConfirm: true,   // 危险工具（execute_terminal / write_file）执行前 confirm()
        maxAutoRuns: 30,          // 单页最大自动执行次数，防止 AI 死循环刷爆本机
        debug: false
    };

    function loadSettings() {
        try {
            const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
            const merged = Object.assign({}, DEFAULT_SETTINGS, saved);
            merged.backendUrl = String(merged.backendUrl || DEFAULT_SETTINGS.backendUrl).replace(/\/+$/, '');
            return merged;
        } catch (e) {
            return Object.assign({}, DEFAULT_SETTINGS);
        }
    }
    function saveSettings() {
        try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(CONFIG)); } catch (e) {}
    }
    const CONFIG = loadSettings();

    const log = (...args) => CONFIG.debug && console.log('[🤖 AI Bridge V3]', ...args);
    const error = (...args) => console.error('[🤖 AI Bridge V3]', ...args);

    // ==================== 小工具 ====================
    function djb2(str) {
        let h = 5381;
        for (let i = 0; i < str.length; i++) {
            h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
        }
        return h.toString(36);
    }
    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
    function truncate(s, n) {
        s = String(s);
        return s.length > n ? s.slice(0, n) + '…' : s;
    }
    function nowTime() {
        const d = new Date();
        const p = n => String(n).padStart(2, '0');
        return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }

    // ==================== 后端 API（带 Token）====================
    function authHeaders(extra) {
        const h = Object.assign({}, extra || {});
        if (CONFIG.token) h['X-Bridge-Token'] = CONFIG.token;
        return h;
    }
    async function api(path, options) {
        options = options || {};
        const resp = await fetch(CONFIG.backendUrl + path, {
            method: options.method || 'GET',
            headers: authHeaders(options.body ? { 'Content-Type': 'application/json' } : {}),
            body: options.body ? JSON.stringify(options.body) : undefined
        });
        let data = null;
        try { data = await resp.json(); } catch (e) {}
        if (!resp.ok) {
            const msg = (data && (data.error || data.message)) || ('HTTP ' + resp.status);
            if (resp.status === 401) throw new Error('Token 错误或缺失（401），请在面板中填入启动后端时终端打印的 Token');
            throw new Error(msg);
        }
        return data;
    }
    async function callBackend(toolName, args) {
        log('调用后端:', toolName, args);
        try {
            return await api('/execute', { method: 'POST', body: { tool_name: toolName, arguments: args } });
        } catch (err) {
            throw new Error('请求失败（' + CONFIG.backendUrl + '）: ' + err.message);
        }
    }
    async function getSkills() {
        try {
            const data = await api('/skills');
            return (data && data.skills) || [];
        } catch (e) {
            error('获取 Skill 列表失败:', e);
            return [];
        }
    }
    async function getSkill(name) {
        try {
            const data = await api('/skill?name=' + encodeURIComponent(name));
            return (data && data.skill) || null;
        } catch (e) {
            error('获取 Skill 失败:', e);
            return null;
        }
    }
    async function checkHealth() {
        const started = Date.now();
        try {
            const d = await api('/');
            return {
                online: true,
                version: d.version || '?',
                localTools: (d.local_tools || []).length,
                mcpTools: d.mcp_tools_count || 0,
                mcpServers: d.mcp_servers_configured || 0,
                latency: Date.now() - started
            };
        } catch (e) {
            return { online: false, message: e.message };
        }
    }

    // ==================== 解析工具调用（与 V1/V2 兼容 + 容错增强）====================
    function parseToolCalls(text) {
        const matches = [];

        // MCP 标准格式：<tool_name>mcp</tool_name> → 拆出真实工具名
        const mcpPattern = /<tool_call>[\s\S]*?<tool_name>\s*mcp\s*<\/tool_name>[\s\S]*?<arguments>\s*([\s\S]*?)\s*<\/arguments>[\s\S]*?<\/tool_call>/gim;
        let mcpMatch;
        while ((mcpMatch = mcpPattern.exec(text)) !== null) {
            try {
                const mcpData = JSON.parse(mcpMatch[1].trim());
                const params = mcpData.params || {};
                matches.push({
                    toolName: params.name || mcpData.tool_name || '',
                    arguments: params.arguments || {},
                    fullMatch: mcpMatch[0]
                });
            } catch (e) { /* 解析失败跳过 */ }
        }

        // write_file 专用原始格式（避免 JSON 转义灾难）
        const rawPattern = /<tool_call>[\s\S]*?<tool_name>\s*(.*?)\s*<\/tool_name>[\s\S]*?<file_path>\s*([\s\S]*?)\s*<\/file_path>[\s\S]*?<content>\s*([\s\S]*?)\s*<\/content>[\s\S]*?<\/tool_call>/gim;
        let rawMatch;
        while ((rawMatch = rawPattern.exec(text)) !== null) {
            matches.push({
                toolName: rawMatch[1].trim(),
                arguments: { file_path: rawMatch[2].trim(), content: rawMatch[3] },
                fullMatch: rawMatch[0]
            });
        }

        // 兼容 </tool_name>{json}</tool_call> 少写 arguments 标签的格式
        text = text.replace(/<\/tool_name>\s*(\{[\s\S]*?\})\s*<\/tool_call>/g, '</tool_name>\n<arguments>$1</arguments>\n</tool_call>');
        const pattern = /<tool_call>[\s\S]*?<tool_name>\s*(.*?)\s*<\/tool_name>[\s\S]*?<arguments>\s*([\s\S]*?)\s*<\/arguments>[\s\S]*?<\/tool_call>/gim;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const toolName = match[1].trim();
            if (toolName.toLowerCase() === 'mcp') continue;
            let argsText = match[2].trim();
            let args = {};
            try {
                args = JSON.parse(argsText);
            } catch (e) {
                // 容错：字面换行是 JSON 解析失败的最常见原因，先把控制字符压掉再试
                try {
                    args = JSON.parse(argsText.replace(/[\x00-\x1f]+/g, ' '));
                } catch (e1) {
                    try {
                        argsText = argsText.replace(/'/g, '"');
                        args = JSON.parse(argsText);
                    } catch (e2) {
                        args = { _raw: argsText, _error: 'JSON解析失败' };
                    }
                }
            }
            matches.push({ toolName, arguments: args, fullMatch: match[0] });
        }

        // 容错：有 tool_name 但完全没有 <arguments> 的块，按空参数处理（以前会静默丢弃）
        const allBlocks = text.match(/<tool_call>[\s\S]*?<\/tool_call>/gi) || [];
        const mcpTest = /<tool_name>\s*mcp\s*<\/tool_name>/i;
        const rawTest = /<file_path>[\s\S]*?<\/file_path>[\s\S]*?<content>/i;
        const argTest = /<arguments>/i;
        for (const blk of allBlocks) {
            if (mcpTest.test(blk) || rawTest.test(blk) || argTest.test(blk)) continue;
            const nameMatch = blk.match(/<tool_name>\s*([\s\S]*?)\s*<\/tool_name>/i);
            if (!nameMatch) continue;
            matches.push({ toolName: nameMatch[1].trim(), arguments: {}, fullMatch: blk });
        }
        return matches;
    }

    const DANGEROUS_TOOLS = ['execute_terminal', 'write_file'];
    function isDangerous(toolName) {
        return DANGEROUS_TOOLS.includes(String(toolName).toLowerCase());
    }
    function toolCallKey(tc) {
        let argStr = '';
        try { argStr = JSON.stringify(tc.arguments); } catch (e) { argStr = String(tc.arguments); }
        return djb2(tc.toolName + ':' + argStr);
    }

    // ==================== 网页适配器 ====================
    function nativeSetterFor(el) {
        const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype
            : el.tagName === 'INPUT' ? window.HTMLInputElement.prototype
            : null;
        if (!proto) return null;
        const desc = Object.getOwnPropertyDescriptor(proto, 'value');
        return desc && desc.set ? desc.set : null;
    }
    function setNativeValue(el, value) {
        const setter = nativeSetterFor(el);
        if (setter) setter.call(el, value); else el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const ADAPTERS = {
        chatgpt: {
            name: 'ChatGPT',
            detect: () => location.hostname.includes('chatgpt') || location.hostname.includes('openai'),
            getMessages: () => {
                const selectors = [
                    'article[data-testid^="conversation-turn-"]',
                    'div[data-testid^="conversation-turn-"]',
                    '[data-message-author-role="assistant"]'
                ];
                for (const sel of selectors) {
                    const els = document.querySelectorAll(sel);
                    if (els.length > 0) return Array.from(els);
                }
                return [];
            },
            getText: (el) => {
                const textSelectors = ['.markdown', '.prose', '[class*="markdown"]', '[class*="prose"]'];
                for (const sel of textSelectors) {
                    const textEl = el.querySelector(sel);
                    if (textEl) return textEl.innerText || textEl.textContent;
                }
                return el.innerText || el.textContent;
            },
            getInputBox: () => {
                const selectors = ['textarea#prompt-textarea', 'div[contenteditable="true"]', '[data-testid="text-input"]'];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) return el;
                }
                return null;
            },
            sendMessage: (text) => {
                const input = ADAPTERS.chatgpt.getInputBox();
                if (!input) { toast('找不到输入框，请手动粘贴结果', 'warn'); return false; }
                if (input.tagName === 'TEXTAREA') {
                    setNativeValue(input, text);
                    setTimeout(() => {
                        input.dispatchEvent(new KeyboardEvent('keydown', {
                            key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true, cancelable: true
                        }));
                    }, 100);
                } else {
                    input.innerText = text;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    setTimeout(() => {
                        const sendBtn = document.querySelector('[data-testid="send-button"], button[aria-label*="send" i]');
                        if (sendBtn && !sendBtn.disabled) sendBtn.click();
                    }, 100);
                }
                return true;
            }
        },
        claude: {
            name: 'Claude',
            detect: () => location.hostname.includes('claude.ai'),
            getMessages: () => Array.from(document.querySelectorAll('[class*="font-claude-message"]')),
            getText: (el) => el.innerText || el.textContent,
            getInputBox: () => document.querySelector('div[contenteditable="true"]') || document.querySelector('textarea'),
            sendMessage: (text) => {
                const input = ADAPTERS.claude.getInputBox();
                if (!input) return false;
                if (input.tagName === 'TEXTAREA') setNativeValue(input, text);
                else { input.innerText = text; input.dispatchEvent(new Event('input', { bubbles: true })); }
                setTimeout(() => {
                    const btn = document.querySelector('button[type="submit"]');
                    if (btn) btn.click();
                }, 100);
                return true;
            }
        },
        kimi: {
            name: 'Kimi',
            detect: () => location.hostname.includes('kimi.moonshot'),
            getMessages: () => Array.from(document.querySelectorAll('.chat-item, [class*="message"]')),
            getText: (el) => el.innerText || el.textContent,
            getInputBox: () => document.querySelector('textarea, [contenteditable="true"]'),
            sendMessage: (text) => {
                const input = ADAPTERS.kimi.getInputBox();
                if (!input) return false;
                if (input.tagName === 'TEXTAREA') setNativeValue(input, text);
                else { input.value = text; input.dispatchEvent(new Event('input', { bubbles: true })); }
                setTimeout(() => {
                    const btn = document.querySelector('button[type="submit"]');
                    if (btn) btn.click();
                }, 100);
                return true;
            }
        },
        xiaomimimo: {
            name: 'XiaomiMimo AI Studio',
            detect: () => location.hostname.includes('xiaomimimo.com'),
            getMessages: () => {
                const els = document.querySelectorAll('#message-list .group.flex-row .markdown-prose');
                return Array.from(els);
            },
            getText: (el) => {
                let text = el.innerText || el.textContent || '';
                const html = el.innerHTML || '';
                if (!text.includes('<tool_call>') && html.includes('tool_call')) {
                    const matches = html.match(/&lt;tool_call&gt;[\s\S]*?&lt;\/tool_call&gt;/gi);
                    if (matches) text = matches.join('\n');
                }
                text = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
                return text;
            },
            getInputBox: () => {
                const selectors = [
                    'textarea[placeholder="有问题，尽管问，Shift + Enter 换行"]',
                    '.dialogue-container textarea',
                    'textarea'
                ];
                for (const sel of selectors) {
                    const el = document.querySelector(sel);
                    if (el) return el;
                }
                return null;
            },
            sendMessage: (text) => {
                const input = ADAPTERS.xiaomimimo.getInputBox();
                if (!input) { toast('找不到输入框，请手动粘贴结果', 'warn'); return false; }
                if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                    setNativeValue(input, text);
                } else {
                    input.innerText = text;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                }
                input.focus();
                setTimeout(() => {
                    const btnSelectors = [
                        '.dialogue-container .flex.flex-shrink-0.items-center.gap-3 > button:last-of-type',
                        '.dialogue-container .rounded-full.bg-black\\/90',
                        '.dialogue-container button.rounded-full:last-of-type'
                    ];
                    for (const sel of btnSelectors) {
                        const btn = document.querySelector(sel);
                        if (btn && !btn.disabled) { btn.click(); return; }
                    }
                    input.dispatchEvent(new KeyboardEvent('keydown', {
                        key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
                    }));
                }, 200);
                return true;
            }
        }
    };

    function getAdapter() {
        for (const key in ADAPTERS) {
            if (ADAPTERS[key].detect()) return ADAPTERS[key];
        }
        // 自定义适配器（localStorage: ai_bridge_custom_adapters）
        try {
            const customs = JSON.parse(localStorage.getItem('ai_bridge_custom_adapters') || '[]');
            for (const ca of customs) {
                if (ca.urlKeyword && location.href.includes(ca.urlKeyword)) {
                    return {
                        name: ca.name || 'Custom',
                        detect: () => true,
                        getMessages: () => Array.from(document.querySelectorAll(ca.aiSelector || 'body')),
                        getText: (el) => (el.innerText || el.textContent || '')
                            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'),
                        getInputBox: () => {
                            const sels = [ca.inputSelector, 'textarea', 'div[contenteditable="true"]'];
                            for (const s of sels) {
                                if (!s) continue;
                                const el = document.querySelector(s);
                                if (el) return el;
                            }
                            return null;
                        },
                        sendMessage: (text) => {
                            const input = document.querySelector(ca.inputSelector || 'textarea');
                            if (!input) { toast('找不到输入框', 'warn'); return false; }
                            if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
                                setNativeValue(input, text);
                            } else {
                                input.innerText = text;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                            input.focus();
                            setTimeout(() => {
                                if (ca.sendSelector) {
                                    const btn = document.querySelector(ca.sendSelector);
                                    if (btn && !btn.disabled) { btn.click(); return; }
                                }
                                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
                            }, 200);
                            return true;
                        }
                    };
                }
            }
        } catch (e) {}
        return null;
    }

    // ==================== 执行日志（localStorage 持久化，面板可见）====================
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

    // ==================== 核心逻辑 ====================
    const processedMessages = new WeakSet();
    const seenHashes = new Set();     // 文本去重：解决 React 重渲染后 WeakSet 失效导致的重复执行
    const SEEN_CAP = 100;
    const execCounts = new Map();     // toolCallKey → 次数，超过 3 次强制跳过
    let isProcessing = false;
    let pageExecCount = 0;            // 本页累计自动执行次数
    const pendingTimers = new WeakMap();
    const pendingTexts = new WeakMap();

    function rememberHash(h) {
        seenHashes.add(h);
        if (seenHashes.size > SEEN_CAP) {
            seenHashes.delete(seenHashes.values().next().value);
        }
    }

    async function processNewMessages() {
        if (isProcessing) return;
        const adapter = getAdapter();
        if (!adapter) return;
        const messages = adapter.getMessages();
        if (messages.length === 0) return;
        const recentMessages = messages.slice(-3);
        for (const msgEl of recentMessages) {
            if (processedMessages.has(msgEl)) continue;
            const text = adapter.getText(msgEl);
            if (!text || !text.includes('<tool_call>')) continue;
            if (!text.includes('</tool_call>')) continue;
            const hash = djb2(text);
            if (seenHashes.has(hash)) continue;
            const currentText = text;
            if (pendingTimers.has(msgEl)) {
                const lastText = pendingTexts.get(msgEl);
                if (lastText === currentText) continue;
                clearTimeout(pendingTimers.get(msgEl));
            }
            pendingTexts.set(msgEl, currentText);
            const timer = setTimeout(async () => {
                pendingTimers.delete(msgEl);
                pendingTexts.delete(msgEl);
                const finalText = adapter.getText(msgEl);
                if (finalText !== currentText) { log('AI 输出又变了，跳过'); return; }
                rememberHash(djb2(finalText));
                processedMessages.add(msgEl);
                await executeTools(adapter, msgEl, finalText);
            }, 1500);
            pendingTimers.set(msgEl, timer);
        }
    }

    async function executeTools(adapter, msgEl, text) {
        const toolCalls = parseToolCalls(text);
        if (toolCalls.length === 0) return;
        log('发现 ' + toolCalls.length + ' 个工具调用');
        isProcessing = true;
        try {
            const results = [];
            for (const tc of toolCalls) {
                const key = toolCallKey(tc);
                const prevCount = execCounts.get(key) || 0;

                // 护栏1：相同调用 ≥3 次，疑似死循环，跳过
                if (prevCount >= 3) {
                    results.push({ tool: tc.toolName, args: tc.arguments,
                        result: '该调用已连续执行 3 次，已被安全护栏跳过（疑似死循环）。请改用其他方式完成任务，或结束回复。',
                        success: false });
                    logExecution(tc.toolName, false, '护栏:相同调用≥3次，已跳过');
                    continue;
                }
                // 护栏2：单页总执行次数上限
                if (pageExecCount >= CONFIG.maxAutoRuns) {
                    results.push({ tool: tc.toolName, args: tc.arguments,
                        result: '已达到单页自动执行上限（' + CONFIG.maxAutoRuns + ' 次）。用户可在面板调高上限后继续。',
                        success: false });
                    logExecution(tc.toolName, false, '护栏:达到单页执行上限');
                    continue;
                }
                // 护栏3：危险工具（execute_terminal / write_file）执行前确认
                if (CONFIG.dangerousConfirm && isDangerous(tc.toolName)) {
                    let preview = '';
                    try { preview = JSON.stringify(tc.arguments, null, 2); } catch (e) { preview = String(tc.arguments); }
                    const allowed = window.confirm(
                        '⚠️ 危险操作确认\n\n工具: ' + tc.toolName + '\n参数:\n' + truncate(preview, 400) +
                        '\n\n允许执行？（取消则告知 AI 用户拒绝）'
                    );
                    if (!allowed) {
                        results.push({ tool: tc.toolName, args: tc.arguments,
                            result: '用户拒绝了执行该操作。', success: false });
                        logExecution(tc.toolName, false, '用户拒绝执行');
                        continue;
                    }
                }

                let result, success;
                try {
                    const resp = await callBackend(tc.toolName, tc.arguments);
                    result = resp.result;
                    success = resp.success !== false;
                } catch (err) {
                    error('工具调用失败:', err);
                    result = err.message;
                    success = false;
                }
                execCounts.set(key, prevCount + 1);
                pageExecCount++;
                updatePageRunsUI();
                results.push({ tool: tc.toolName, args: tc.arguments, result, success });
                logExecution(tc.toolName, success, JSON.stringify(tc.arguments));
            }

            let resultText = '[工具执行结果]\n\n';
            for (const r of results) {
                resultText += '工具: ' + r.tool + '\n';
                resultText += '参数: ' + JSON.stringify(r.args) + '\n';
                resultText += '结果:\n' + r.result + '\n---\n';
            }
            resultText += '\n请基于以上结果继续回复。';

            if (CONFIG.autoSend) {
                const sent = adapter.sendMessage(resultText);
                if (!sent) {
                    try { await navigator.clipboard.writeText(resultText); } catch (e) {}
                    toast('自动发送失败，结果已复制到剪贴板', 'warn');
                }
            } else {
                try { await navigator.clipboard.writeText(resultText); } catch (e) {}
                toast('工具执行完成，结果已复制到剪贴板', 'ok');
            }
        } finally {
            isProcessing = false;
        }
    }

    // ==================== UI：Shadow DOM 面板 + Toast + 悬浮按钮 ====================
    const PANEL_CSS = `
:host{all:initial}
*{box-sizing:border-box;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.panel{position:fixed;right:78px;bottom:18px;width:min(92vw,350px);max-height:84vh;display:flex;flex-direction:column;background:rgba(22,24,29,.93);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.09);border-radius:18px;box-shadow:0 18px 50px rgba(0,0,0,.55),0 0 0 1px rgba(0,0,0,.35);color:#e8eaed;z-index:2147483646;overflow:hidden;animation:pop .18s ease-out}
@keyframes pop{from{opacity:0;transform:translateY(10px) scale(.96)}to{opacity:1;transform:none}}
.head{display:flex;align-items:center;gap:8px;padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,.07)}
.title{font-size:14px;font-weight:700;letter-spacing:.3px;flex:1}
.ver{font-weight:500;font-size:10px;color:#8ab4f8;background:rgba(138,180,248,.12);border-radius:6px;padding:2px 6px;margin-left:6px}
.dot{width:10px;height:10px;border-radius:50%;background:#fbbc04;box-shadow:0 0 8px rgba(251,188,4,.6);transition:background .3s;flex-shrink:0}
.dot.ok{background:#34d399;box-shadow:0 0 10px rgba(52,211,153,.7)}
.dot.err{background:#f87171;box-shadow:0 0 10px rgba(248,113,113,.7)}
.iconbtn{background:transparent;border:none;color:#9aa0a6;font-size:15px;cursor:pointer;padding:4px 8px;border-radius:8px}
.iconbtn:hover{background:rgba(255,255,255,.08);color:#fff}
.status{padding:8px 14px;font-size:11px;color:#9aa0a6;border-bottom:1px solid rgba(255,255,255,.07);min-height:34px;display:flex;align-items:center;gap:6px;line-height:1.4}
.status b{color:#e8eaed;font-weight:600}
.body{overflow-y:auto;padding:10px 12px 12px;scrollbar-width:thin}
.body::-webkit-scrollbar{width:5px}
.body::-webkit-scrollbar-thumb{background:rgba(255,255,255,.15);border-radius:3px}
.sec{background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.05);border-radius:14px;padding:10px 10px 12px;margin-bottom:10px}
.sec-title{font-size:11px;font-weight:700;color:#8ab4f8;letter-spacing:.8px;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.sec-actions{margin-left:auto;display:flex;gap:4px}
.label{display:block;font-size:11px;color:#bdc1c6;margin:8px 2px 4px}
.input{width:100%;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#e8eaed;font-size:12px;padding:8px 10px;outline:none;transition:border .2s, box-shadow .2s}
.input:focus{border-color:#10a37f;box-shadow:0 0 0 3px rgba(16,163,127,.15)}
select.input{appearance:none;-webkit-appearance:none}
.preview{width:100%;height:90px;resize:vertical;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);border-radius:10px;color:#c7cdd5;font-size:10.5px;line-height:1.5;padding:8px 10px;margin-top:6px;outline:none;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.preview:focus{border-color:#10a37f}
.row{display:flex;gap:8px;margin-top:10px}
.btn{flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#e8eaed;font-size:12px;border-radius:10px;padding:8px 10px;cursor:pointer;transition:all .15s}
.btn:hover{background:rgba(255,255,255,.12);transform:translateY(-1px)}
.btn:active{transform:translateY(0) scale(.98)}
.btn.primary{background:rgba(16,163,127,.18);border-color:rgba(16,163,127,.45);color:#5eead4}
.btn.primary:hover{background:rgba(16,163,127,.3)}
.btn.accent{background:#10a37f;border-color:#10a37f;color:#fff;font-weight:600}
.btn.accent:hover{background:#0d8a6a}
.btn.block{width:100%;margin-top:8px}
.mini{background:rgba(255,255,255,.07);border:none;color:#bdc1c6;font-size:10px;padding:3px 8px;border-radius:6px;cursor:pointer;margin-left:6px}
.mini:hover{background:rgba(255,255,255,.14);color:#fff}
.toggle-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 2px;border-bottom:1px dashed rgba(255,255,255,.06);cursor:pointer;font-size:12px}
.toggle-row:last-child{border-bottom:none}
.toggle-row small{display:block;color:#8a8f98;font-size:10px;margin-top:2px}
.switch{appearance:none;-webkit-appearance:none;width:38px;height:22px;border-radius:11px;background:rgba(255,255,255,.15);position:relative;cursor:pointer;transition:background .2s;outline:none;flex-shrink:0;margin:0}
.switch::after{content:'';position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .2s}
.switch:checked{background:#10a37f}
.switch:checked::after{transform:translateX(16px)}
.field-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 2px;border-bottom:1px dashed rgba(255,255,255,.06);font-size:12px}
.field-row small{color:#8a8f98;font-size:10px;display:block;margin-top:2px}
.numinput{width:66px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);border-radius:8px;color:#e8eaed;padding:6px 8px;font-size:12px;outline:none;text-align:center}
.numinput:focus{border-color:#10a37f}
.badge{background:rgba(138,180,248,.15);color:#8ab4f8;border-radius:8px;font-size:10px;padding:1px 7px}
.log{max-height:150px;overflow-y:auto;display:flex;flex-direction:column;gap:6px}
.log-empty{color:#6b7280;font-size:11px;text-align:center;padding:14px 0}
.log-item{background:rgba(0,0,0,.3);border-radius:10px;padding:6px 8px;font-size:10px;border-left:3px solid #34d399}
.log-item.fail{border-left-color:#f87171}
.log-line1{display:flex;align-items:center;gap:6px}
.log-t{color:#6b7280;font-family:ui-monospace,monospace}
.log-tool{color:#e8eaed;font-weight:600;font-family:ui-monospace,monospace}
.log-ic.ok{color:#34d399}.log-ic.fail{color:#f87171}
.log-d{color:#9aa0a6;margin-top:3px;word-break:break-all;font-family:ui-monospace,monospace;line-height:1.4}
.foot{padding:8px 14px;border-top:1px solid rgba(255,255,255,.07);font-size:10px;color:#6b7280;display:flex;gap:6px;justify-content:center}
.toasts{position:fixed;bottom:86px;right:22px;display:flex;flex-direction:column;gap:8px;z-index:2147483647;pointer-events:none}
.toast{background:rgba(22,24,29,.96);border:1px solid rgba(255,255,255,.12);border-left:3px solid #34d399;color:#e8eaed;font-size:12px;padding:9px 12px;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.4);animation:slidein .25s ease-out;max-width:280px;line-height:1.45}
.toast.warn{border-left-color:#fbbf24}
.toast.err{border-left-color:#f87171}
@keyframes slidein{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}
@media (max-width:480px){.panel{right:8px;left:8px;width:auto;bottom:80px}.toasts{right:10px;left:10px}.toast{max-width:none}}
`;

    const PANEL_HTML = `
<div class="panel" id="ab3Panel" role="dialog" aria-label="AI Bridge 面板">
  <div class="head">
    <div class="title">🤖 AI Bridge<span class="ver">V3.0 · Via</span></div>
    <span class="dot" id="ab3Dot" title="后端状态"></span>
    <button class="iconbtn" id="ab3Close" aria-label="关闭">✕</button>
  </div>
  <div class="status" id="ab3Status">正在检查后端…</div>
  <div class="body">
    <div class="sec">
      <div class="sec-title">🔌 连接</div>
      <label class="label" for="ab3Backend">后端地址</label>
      <input class="input" id="ab3Backend" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="http://127.0.0.1:8000">
      <label class="label" for="ab3Token">Token<button class="mini" id="ab3Eye" type="button">显示</button></label>
      <input class="input" id="ab3Token" type="password" placeholder="启动后端时终端打印的 Token" spellcheck="false" autocomplete="off">
      <div class="row">
        <button class="btn primary" id="ab3Test" type="button">🔌 测试连接</button>
        <button class="btn" id="ab3Save" type="button">💾 保存设置</button>
      </div>
    </div>
    <div class="sec">
      <div class="sec-title">🛡️ 工具执行</div>
      <label class="toggle-row"><span>自动发送结果给 AI<small>关闭后执行结果复制到剪贴板</small></span><input type="checkbox" class="switch" id="ab3AutoSend"></label>
      <label class="toggle-row"><span>危险操作确认<small>execute_terminal / write_file 执行前弹窗</small></span><input type="checkbox" class="switch" id="ab3Danger"></label>
      <div class="field-row"><span>单页最大自动执行<small>防止 AI 死循环，超限即停</small></span><input type="number" class="numinput" id="ab3MaxRuns" min="1" max="999"></div>
      <label class="toggle-row"><span>调试日志<small>在浏览器控制台输出详细信息</small></span><input type="checkbox" class="switch" id="ab3Debug"></label>
    </div>
    <div class="sec">
      <div class="sec-title">💉 Skill 注入<button class="mini" id="ab3SkillRefresh" type="button">↻ 刷新</button></div>
      <select class="input" id="ab3SkillSel"></select>
      <textarea class="preview" id="ab3SkillPreview" readonly spellcheck="false" placeholder="选择一个 Skill 预览内容…"></textarea>
      <button class="btn accent block" id="ab3Inject" type="button">💉 注入到输入框</button>
    </div>
    <div class="sec">
      <div class="sec-title">📜 执行记录 <span class="badge" id="ab3LogCount">0</span><span class="sec-actions"><button class="mini" id="ab3LogCopy" type="button">复制</button><button class="mini" id="ab3LogClear" type="button">清空</button></span></div>
      <div class="log" id="ab3LogList"></div>
    </div>
  </div>
  <div class="foot"><span id="ab3PageRuns">本页已执行 0 次</span><span>·</span><span>Token 仅存本机</span></div>
</div>
<div class="toasts" id="ab3Toasts"></div>
`;

    let panelHost = null;
    let els = null;
    const skillCache = new Map();

    function toast(msg, type) {
        if (!els || !els.toasts) { console.log('[AI Bridge]', msg); return; }
        const div = document.createElement('div');
        div.className = 'toast' + (type ? ' ' + type : '');
        div.textContent = msg;
        els.toasts.appendChild(div);
        setTimeout(() => { div.style.opacity = '0'; div.style.transform = 'translateX(24px)'; }, 3400);
        setTimeout(() => div.remove(), 3900);
    }

    function timeStr(t) {
        const d = new Date(t);
        const p = n => String(n).padStart(2, '0');
        return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }

    function renderLog() {
        if (!els) return;
        els.logCount.textContent = String(execLog.length);
        if (execLog.length === 0) {
            els.logList.innerHTML = '<div class="log-empty">暂无执行记录</div>';
            return;
        }
        els.logList.innerHTML = execLog.slice().reverse().map(e => (
            '<div class="log-item' + (e.ok ? '' : ' fail') + '">' +
                '<div class="log-line1"><span class="log-t">' + timeStr(e.t) + '</span>' +
                '<span class="log-tool">' + escapeHtml(e.tool) + '</span>' +
                '<span class="log-ic ' + (e.ok ? 'ok' : 'fail') + '">' + (e.ok ? '✓' : '✗') + '</span></div>' +
                (e.detail ? '<div class="log-d">' + escapeHtml(e.detail) + '</div>' : '') +
            '</div>'
        )).join('');
    }

    function updatePageRunsUI() {
        if (els && els.pageRuns) els.pageRuns.textContent = '本页已执行 ' + pageExecCount + ' 次';
    }

    function setHealth(h) {
        if (!els) return;
        if (h.online) {
            els.dot.className = 'dot ok';
            els.status.innerHTML = '✅ 已连接 <b>V' + escapeHtml(String(h.version)) + '</b> · 本地 <b>' + h.localTools +
                '</b> 工具 · MCP <b>' + h.mcpTools + '</b> 工具 · 服务器 ' + h.mcpServers + ' 个 · ' + h.latency + 'ms';
        } else {
            els.dot.className = 'dot err';
            els.status.innerHTML = '❌ 未连接 · ' + escapeHtml(truncate(h.message || '无法访问后端', 90));
        }
    }

    async function refreshHealth(showToast) {
        const h = await checkHealth();
        setHealth(h);
        if (showToast) toast(h.online ? '✅ 连接成功（V' + h.version + '，' + h.latency + 'ms）' : '❌ 连接失败：' + h.message, h.online ? 'ok' : 'err');
        return h;
    }

    async function refreshSkills(keepSelection) {
        if (!els) return;
        const previous = keepSelection ? els.skillSel.value : null;
        els.skillSel.innerHTML = '<option>加载中…</option>';
        const skills = await getSkills();
        skillCache.clear();
        if (skills.length === 0) {
            els.skillSel.innerHTML = '<option value="">（后端没有 Skill，请先在终端配置）</option>';
            els.skillPreview.value = '';
            return;
        }
        els.skillSel.innerHTML = skills.map(s =>
            '<option value="' + escapeHtml(s.name) + '">' + escapeHtml(s.name) +
            (s.description ? ' — ' + escapeHtml(truncate(s.description, 42)) : '') + '</option>'
        ).join('');
        if (previous && skills.some(s => s.name === previous)) els.skillSel.value = previous;
        await loadSkillPreview();
    }

    async function loadSkillPreview() {
        if (!els) return;
        const name = els.skillSel.value;
        if (!name) { els.skillPreview.value = ''; return; }
        if (skillCache.has(name)) { els.skillPreview.value = skillCache.get(name); return; }
        els.skillPreview.value = '加载中…';
        const content = await getSkill(name);
        if (content) {
            skillCache.set(name, content);
            els.skillPreview.value = content;
        } else {
            els.skillPreview.value = '❌ 获取 Skill 内容失败（后端不可达或 Token 错误）';
        }
    }

    async function injectTextIntoInput(text, label) {
        const adapter = getAdapter();
        let input = adapter && adapter.getInputBox ? adapter.getInputBox() : null;
        if (!input) {
            input = document.querySelector('textarea') ||
                    document.querySelector('div[contenteditable="true"]') ||
                    document.querySelector('input[type="text"]');
        }
        if (!input) {
            try { await navigator.clipboard.writeText(text); } catch (e) {}
            toast('找不到输入框，Skill 已复制到剪贴板，请手动粘贴', 'warn');
            return;
        }
        if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
            setNativeValue(input, text);
        } else {
            input.innerText = text;
            input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        input.focus();
        const currentValue = input.value || input.innerText || '';
        if (currentValue.includes(text.slice(0, 24))) {
            toast('✅ Skill [' + label + '] 已注入，点击发送即可', 'ok');
        } else {
            try { await navigator.clipboard.writeText(text); } catch (e) {}
            toast('注入可能未生效，已复制到剪贴板，请手动粘贴', 'warn');
        }
    }

    function buildPanel() {
        if (panelHost) return;
        panelHost = document.createElement('div');
        panelHost.id = 'ab3-panel-host';
        panelHost.style.display = 'none';
        const shadow = panelHost.attachShadow({ mode: 'open' });
        shadow.innerHTML = '<style>' + PANEL_CSS + '</style>' + PANEL_HTML;
        document.body.appendChild(panelHost);

        const $ = id => shadow.getElementById(id);
        els = {
            panel: $('ab3Panel'),
            close: $('ab3Close'),
            dot: $('ab3Dot'),
            status: $('ab3Status'),
            backend: $('ab3Backend'),
            token: $('ab3Token'),
            eye: $('ab3Eye'),
            test: $('ab3Test'),
            save: $('ab3Save'),
            autoSend: $('ab3AutoSend'),
            danger: $('ab3Danger'),
            maxRuns: $('ab3MaxRuns'),
            debug: $('ab3Debug'),
            skillSel: $('ab3SkillSel'),
            skillRefresh: $('ab3SkillRefresh'),
            skillPreview: $('ab3SkillPreview'),
            inject: $('ab3Inject'),
            logList: $('ab3LogList'),
            logCount: $('ab3LogCount'),
            logClear: $('ab3LogClear'),
            logCopy: $('ab3LogCopy'),
            pageRuns: $('ab3PageRuns'),
            toasts: $('ab3Toasts')
        };

        // 回填设置
        els.backend.value = CONFIG.backendUrl;
        els.token.value = CONFIG.token;
        els.autoSend.checked = !!CONFIG.autoSend;
        els.danger.checked = !!CONFIG.dangerousConfirm;
        els.maxRuns.value = String(CONFIG.maxAutoRuns);
        els.debug.checked = !!CONFIG.debug;

        // 事件
        els.close.addEventListener('click', () => { panelHost.style.display = 'none'; });

        els.eye.addEventListener('click', () => {
            const show = els.token.type === 'password';
            els.token.type = show ? 'text' : 'password';
            els.eye.textContent = show ? '隐藏' : '显示';
        });

        els.test.addEventListener('click', () => refreshHealth(true));

        const applyInputsToConfig = () => {
            const url = els.backend.value.trim().replace(/\/+$/, '');
            if (url) CONFIG.backendUrl = url;
            CONFIG.token = els.token.value.trim();
            const maxRuns = parseInt(els.maxRuns.value, 10);
            CONFIG.maxAutoRuns = Math.max(1, Math.min(999, isNaN(maxRuns) ? DEFAULT_SETTINGS.maxAutoRuns : maxRuns));
            els.maxRuns.value = String(CONFIG.maxAutoRuns);
        };
        const persistAndRefresh = () => { applyInputsToConfig(); saveSettings(); refreshHealth(false); };

        els.save.addEventListener('click', () => {
            persistAndRefresh();
            toast('💾 设置已保存', 'ok');
        });
        els.backend.addEventListener('change', persistAndRefresh);
        els.token.addEventListener('change', persistAndRefresh);
        els.autoSend.addEventListener('change', () => { CONFIG.autoSend = els.autoSend.checked; saveSettings(); toast('自动发送：' + (CONFIG.autoSend ? '开启' : '关闭'), 'ok'); });
        els.danger.addEventListener('change', () => { CONFIG.dangerousConfirm = els.danger.checked; saveSettings(); toast('危险操作确认：' + (CONFIG.dangerousConfirm ? '开启' : '关闭'), 'ok'); });
        els.debug.addEventListener('change', () => { CONFIG.debug = els.debug.checked; saveSettings(); });
        els.maxRuns.addEventListener('change', () => { applyInputsToConfig(); saveSettings(); toast('单页最大执行次数：' + CONFIG.maxAutoRuns, 'ok'); });

        els.skillRefresh.addEventListener('click', () => { skillCache.clear(); refreshSkills(true); });
        els.skillSel.addEventListener('change', loadSkillPreview);
        els.inject.addEventListener('click', async () => {
            const name = els.skillSel.value;
            if (!name) { toast('请先选择一个 Skill', 'warn'); return; }
            let text = skillCache.get(name);
            if (!text) {
                text = await getSkill(name);
                if (text) skillCache.set(name, text);
            }
            if (!text) { toast('❌ 获取 Skill 内容失败', 'err'); return; }
            await injectTextIntoInput(text, name);
        });

        els.logClear.addEventListener('click', () => { execLog = []; persistLog(); renderLog(); toast('执行记录已清空', 'ok'); });
        els.logCopy.addEventListener('click', async () => {
            if (execLog.length === 0) { toast('没有可复制的记录', 'warn'); return; }
            const lines = execLog.map(e =>
                '[' + new Date(e.t).toLocaleString() + '] ' + (e.ok ? '✓' : '✗') + ' ' + e.tool + (e.detail ? ' — ' + e.detail : '')
            );
            try { await navigator.clipboard.writeText(lines.join('\n')); toast('已复制 ' + lines.length + ' 条记录', 'ok'); }
            catch (e) { toast('复制失败：' + e.message, 'err'); }
        });

        renderLog();
        updatePageRunsUI();

        // Esc 关闭面板
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && panelHost.style.display !== 'none') panelHost.style.display = 'none';
        });
    }

    function togglePanel(force) {
        buildPanel();
        const show = force !== undefined ? force : panelHost.style.display === 'none';
        panelHost.style.display = show ? 'block' : 'none';
        if (show) {
            refreshHealth(false);
            refreshSkills(true);
        }
    }

    // ==================== 悬浮按钮（可拖动，点击开关面板）====================
    function buildFab() {
        const fab = document.createElement('div');
        fab.id = 'ab3Fab';
        fab.title = 'AI Bridge V3 面板';
        fab.textContent = '🤖';
        fab.style.cssText = [
            'position:fixed;right:18px;bottom:18px;width:54px;height:54px;border-radius:50%',
            'background:linear-gradient(135deg,#10a37f 0%,#0d8a6a 100%)',
            'color:#fff;font-size:25px;display:flex;align-items:center;justify-content:center',
            'z-index:2147483646;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none',
            'box-shadow:0 6px 22px rgba(16,163,127,.45),0 2px 6px rgba(0,0,0,.4)',
            'transition:transform .15s'
        ].join(';');
        document.body.appendChild(fab);

        let isDragging = false, moved = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
        const rectOf = () => fab.getBoundingClientRect();

        function onStart(x, y) {
            isDragging = true; moved = false;
            startX = x; startY = y;
            const rect = rectOf();
            startLeft = rect.left; startTop = rect.top;
            fab.style.transition = 'none';
        }
        function onMove(x, y, prevent) {
            if (!isDragging) return;
            const dx = x - startX, dy = y - startY;
            if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
            if (moved) {
                if (prevent) prevent();
                fab.style.left = (startLeft + dx) + 'px';
                fab.style.top = (startTop + dy) + 'px';
                fab.style.right = 'auto';
                fab.style.bottom = 'auto';
            }
        }
        function onEnd() {
            if (!isDragging) return;
            isDragging = false;
            fab.style.transition = 'transform .15s';
            if (!moved) togglePanel();
        }

        fab.addEventListener('touchstart', e => { if (e.touches.length) onStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
        fab.addEventListener('touchmove', e => { if (e.touches.length) onMove(e.touches[0].clientX, e.touches[0].clientY, () => e.preventDefault()); }, { passive: false });
        fab.addEventListener('touchend', onEnd);
        fab.addEventListener('mousedown', e => { onStart(e.clientX, e.clientY); e.preventDefault(); });
        document.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
        document.addEventListener('mouseup', onEnd);
        fab.addEventListener('mouseenter', () => { fab.style.transform = 'scale(1.12)'; });
        fab.addEventListener('mouseleave', () => { fab.style.transform = ''; });
    }

    // ==================== 启动 ====================
    function startWatching() {
        const adapter = getAdapter();
        console.log('[🤖 AI Bridge V3] 已激活: ' + (adapter ? adapter.name : '未知网页（面板仍可用）'));
        console.log('[🤖 AI Bridge V3] 后端: ' + CONFIG.backendUrl + ' · 认证: ' + (CONFIG.token ? 'Token' : '无'));

        if (adapter) {
            const observer = new MutationObserver(() => { setTimeout(processNewMessages, 500); });
            observer.observe(document.body, { childList: true, subtree: true });
            setInterval(processNewMessages, 2500);
        }
        // 后端健康检查：启动时 + 每 30 秒
        refreshHealth(false);
        setInterval(() => refreshHealth(false), 30000);
    }

    function init() {
        buildPanel();
        buildFab();
        startWatching();
        // 调试句柄
        window.__AI_BRIDGE_V3__ = { CONFIG, parseToolCalls, getAdapter, checkHealth };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
