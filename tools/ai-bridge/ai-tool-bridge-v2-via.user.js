// ==UserScript==
// @name         🤖 AI Agent Tool Bridge V3 (Via版)
// @namespace    ai-agent-bridge-v3
// @version      3.2
// @description  Via浏览器专用：完整 MCP 适配 + Skill 注入 + 安全护栏 + 纯内联样式面板（兼容严格 CSP / 老 WebView）
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
        let resp = null;
        try {
            resp = await fetch(CONFIG.backendUrl + path, {
                method: options.method || 'GET',
                headers: authHeaders(options.body ? { 'Content-Type': 'application/json' } : {}),
                body: options.body ? JSON.stringify(options.body) : undefined
            });
        } catch (err) {
            const raw = (err && err.message) || String(err);
            throw new Error(
                '连接被浏览器拦截（' + raw + '）。可能：① https 页面→本机 http 被 PNA/CORS 挡（换 Kiwi/Firefox+Tampermonkey，或更新 Android System WebView）' +
                '② 后端没在跑 / 端口不对 ③ 后端在电脑上却填了 127.0.0.1，要改 --host 0.0.0.0 + 电脑 IP；或局域网模式需路由器同网段'
            );
        }
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


    // ==================== UI：纯 DOM + 内联样式（不用 Shadow DOM / <style>，兼容 Via 与严格 CSP）====================
    const C = {
        panelBg: 'rgba(22,24,29,.96)', border: '1px solid rgba(255,255,255,.1)',
        text: '#e8eaed', dim: '#9aa0a6', faint: '#6b7280', accent: '#10a37f', accentSoft: 'rgba(16,163,127,.22)',
        cardBg: 'rgba(255,255,255,.04)', inputBg: 'rgba(0,0,0,.35)'
    };
    const CSS = {
        btn: 'flex:1;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);color:#e8eaed;font-size:12px;border-radius:10px;padding:8px 10px;cursor:pointer',
        btnPrimary: 'flex:1;background:rgba(16,163,127,.2);border:1px solid rgba(16,163,127,.5);color:#5eead4;font-size:12px;border-radius:10px;padding:8px 10px;cursor:pointer',
        btnAccent: 'width:100%;background:#10a37f;border:1px solid #10a37f;color:#fff;font-size:13px;font-weight:600;border-radius:10px;padding:9px 10px;cursor:pointer;margin-top:8px',
        mini: 'background:rgba(255,255,255,.08);border:none;color:#bdc1c6;font-size:10px;padding:3px 8px;border-radius:6px;cursor:pointer;margin-left:6px',
        input: 'width:100%;box-sizing:border-box;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:#e8eaed;font-size:12px;padding:8px 10px;outline:none',
        label: 'display:block;font-size:11px;color:#bdc1c6;margin:8px 2px 4px',
        secTitle: 'font-size:11px;font-weight:700;color:#8ab4f8;letter-spacing:.8px;margin:0 2px 8px;display:flex;align-items:center',
        sec: 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:14px;padding:10px 10px 12px;margin-bottom:10px'
    };

    function el(tag, css, parent, text) {
        const node = document.createElement(tag);
        if (css) node.style.cssText = css;
        if (text !== undefined && text !== null) node.textContent = text;
        if (parent) parent.appendChild(node);
        return node;
    }
    function spacer(parent) { return el('div', 'flex:1', parent); }

    // ---- 组件引用（buildPanel 成功后填充；全部为普通 div/input，无 shadow）----
    const ui = {};
    const skillCache = new Map();
    let panelBuilt = false;
    let panelError = null;

    function showToast(msg, type) {
        // 兜底：面板没起来时用 alert 也能给出反馈
        if (!ui.toastWrap) {
            try { alert(msg); } catch (e) {}
            return;
        }
        const colors = { ok: '#34d399', warn: '#fbbf24', err: '#f87171' };
        const t = el('div',
            'background:rgba(22,24,29,.97);border:1px solid rgba(255,255,255,.13);border-left:3px solid ' + (colors[type] || colors.ok) +
            ';color:#e8eaed;font-size:12px;padding:9px 12px;border-radius:10px;max-width:270px;line-height:1.5;box-shadow:0 8px 24px rgba(0,0,0,.45)',
            ui.toastWrap, msg);
        setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = 'all .3s'; }, 3400);
        setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 3900);
    }

    function timeStr(t) {
        const d = new Date(t);
        const p = n => String(n).padStart(2, '0');
        return p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
    }

    function renderLog() {
        if (!ui.logList) return;
        ui.logCount.textContent = String(execLog.length);
        ui.logList.innerHTML = '';
        if (execLog.length === 0) {
            el('div', 'color:#6b7280;font-size:11px;text-align:center;padding:14px 0', ui.logList, '暂无执行记录');
            return;
        }
        const items = execLog.slice(-50).slice().reverse();
        for (const e of items) {
            const item = el('div', 'background:rgba(0,0,0,.3);border-radius:10px;padding:6px 8px;margin-bottom:6px;border-left:3px solid ' + (e.ok ? '#34d399' : '#f87171'), ui.logList);
            const line1 = el('div', 'display:flex;align-items:center;gap:6px;font-size:10px', item);
            el('span', 'color:#6b7280;font-family:monospace', line1, timeStr(e.t));
            el('span', 'color:#e8eaed;font-weight:600;font-family:monospace', line1, e.tool);
            el('span', e.ok ? 'color:#34d399' : 'color:#f87171', line1, e.ok ? '✓' : '✗');
            if (e.detail) el('div', 'color:#9aa0a6;margin-top:3px;word-break:break-all;font-family:monospace;font-size:10px;line-height:1.4', item, e.detail);
        }
    }

    function updatePageRunsUI() {
        if (ui.pageRuns) ui.pageRuns.textContent = '本页已执行 ' + pageExecCount + ' 次';
    }

    function setHealth(h) {
        if (!ui.dot) return;
        if (h.online) {
            ui.dot.style.background = '#34d399';
            ui.dot.style.boxShadow = '0 0 10px rgba(52,211,153,.7)';
            ui.status.innerHTML = '';
            el('span', 'color:#34d399', ui.status, '✅');
            el('span', null, ui.status, ' 已连接 ');
            const b = el('b', 'color:#e8eaed', ui.status, 'V' + h.version);
            el('span', null, ui.status, ' · 本地 ' + h.localTools + ' 工具 · MCP ' + h.mcpTools + ' · ' + h.latency + 'ms');
        } else {
            ui.dot.style.background = '#f87171';
            ui.dot.style.boxShadow = '0 0 10px rgba(248,113,113,.7)';
            ui.status.textContent = '❌ ' + truncate(h.message || '无法访问后端', 220);
        }
    }

    async function refreshHealth(showToastOnResult) {
        const h = await checkHealth();
        setHealth(h);
        if (showToastOnResult) {
            showToast(h.online ? '✅ 连接成功（V' + h.version + '，' + h.latency + 'ms）' : '❌ 连接失败：' + h.message, h.online ? 'ok' : 'err');
        }
        return h;
    }

    async function refreshSkills(keepSelection) {
        if (!ui.skillSel) return;
        const previous = keepSelection ? ui.skillSel.value : null;
        ui.skillSel.innerHTML = '<option>加载中…</option>';
        const skills = await getSkills();
        skillCache.clear();
        if (skills.length === 0) {
            ui.skillSel.innerHTML = '<option value="">（后端没有 Skill，请先在终端配置）</option>';
            ui.skillPreview.value = '';
            return;
        }
        ui.skillSel.innerHTML = '';
        for (const s of skills) {
            const opt = document.createElement('option');
            opt.value = s.name;
            opt.textContent = s.name + (s.description ? ' — ' + truncate(s.description, 42) : '');
            ui.skillSel.appendChild(opt);
        }
        if (previous && skills.some(s => s.name === previous)) ui.skillSel.value = previous;
        await loadSkillPreview();
    }

    async function loadSkillPreview() {
        if (!ui.skillPreview) return;
        const name = ui.skillSel.value;
        if (!name) { ui.skillPreview.value = ''; return; }
        if (skillCache.has(name)) { ui.skillPreview.value = skillCache.get(name); return; }
        ui.skillPreview.value = '加载中…';
        const content = await getSkill(name);
        if (content) {
            skillCache.set(name, content);
            ui.skillPreview.value = content;
        } else {
            ui.skillPreview.value = '❌ 获取 Skill 内容失败（后端不可达或 Token 错误）';
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
            showToast('找不到输入框，Skill 已复制到剪贴板，请手动粘贴', 'warn');
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
            showToast('✅ Skill [' + label + '] 已注入，点击发送即可', 'ok');
        } else {
            try { await navigator.clipboard.writeText(text); } catch (e) {}
            showToast('注入可能未生效，已复制到剪贴板，请手动粘贴', 'warn');
        }
    }

    // 兼容前面部分对 toast() 的调用
    function toast(msg, type) { showToast(msg, type); }

    function buildToastWrap() {
        if (ui.toastWrap) return;
        ui.toastWrap = el('div', 'position:fixed;z-index:2147483647;bottom:86px;right:22px;display:flex;flex-direction:column;gap:8px', document.body);
        ui.toastWrap.id = 'ab3Toasts';
    }

    function makeToggle(parent, title, sub, checked, onChange) {
        const row = el('div', 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 2px;cursor:pointer;border-bottom:1px dashed rgba(255,255,255,.07)', parent);
        const left = el('span', 'font-size:12px', row, title);
        if (sub) el('small', 'display:block;color:#8a8f98;font-size:10px;margin-top:2px', left, sub);
        const track = el('div', 'width:38px;height:22px;border-radius:11px;position:relative;flex-shrink:0;transition:background .2s;background:' + (checked ? '#10a37f' : 'rgba(255,255,255,.18)'), row);
        const knob = el('div', 'position:absolute;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .2s;left:' + (checked ? '19px' : '3px'), track);
        row.addEventListener('click', () => {
            checked = !checked;
            track.style.background = checked ? '#10a37f' : 'rgba(255,255,255,.18)';
            knob.style.left = checked ? '19px' : '3px';
            onChange(checked);
        });
    }

    function buildPanel() {
        if (panelBuilt) return;
        const small = (window.innerWidth || 480) <= 480;

        const panel = el('div', [
            'position:fixed;z-index:2147483646;display:none;flex-direction:column',
            (small ? 'left:8px;right:8px;bottom:80px' : 'right:78px;bottom:18px;width:min(92vw,350px)'),
            'max-height:84vh;border-radius:18px;overflow:hidden',
            'background:' + C.panelBg,
            C.border,
            'box-shadow:0 18px 50px rgba(0,0,0,.55)',
            'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:' + C.text + ';font-size:12px'
        ].join(';'));
        panel.id = 'ab3Panel';

        // ---- 标题栏 ----
        const head = el('div', 'display:flex;align-items:center;gap:8px;padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,.08);flex-shrink:0', panel);
        el('div', 'font-size:14px;font-weight:700;flex:1;white-space:nowrap', head, '🤖 AI Bridge');
        el('span', 'font-size:10px;color:#8ab4f8;background:rgba(138,180,248,.14);border-radius:6px;padding:2px 6px', head, 'V3.2 · Via');
        ui.dot = el('div', 'width:10px;height:10px;border-radius:50%;background:#fbbc04;box-shadow:0 0 8px rgba(251,188,4,.6);flex-shrink:0', head);
        const closeBtn = el('button', 'background:transparent;border:none;color:#9aa0a6;font-size:16px;cursor:pointer;padding:2px 6px', head, '✕');
        closeBtn.addEventListener('click', () => { panel.style.display = 'none'; });

        // ---- 状态条 ----
        ui.status = el('div', 'padding:8px 14px;font-size:11px;color:#9aa0a6;border-bottom:1px solid rgba(255,255,255,.08);min-height:32px;box-sizing:border-box;display:flex;align-items:center;flex-wrap:wrap;gap:2px;flex-shrink:0', panel, '正在检查后端…');

        // ---- 可滚动内容区 ----
        const body = el('div', 'overflow-y:auto;-webkit-overflow-scrolling:touch;padding:10px 12px;max-height:calc(84vh - 116px)', panel);

        // ===== 区块 1：连接 =====
        const secConn = el('div', CSS.sec, body);
        el('div', CSS.secTitle, secConn, '🔌 连接');
        el('label', CSS.label, secConn, '后端地址');
        ui.backend = el('input', CSS.input, secConn);
        ui.backend.placeholder = 'http://127.0.0.1:8000';
        ui.backend.spellcheck = false; ui.backend.autocapitalize = 'off'; ui.backend.autocomplete = 'off';
        const tokRow = el('div', 'display:flex;align-items:center;justify-content:space-between', secConn);
        el('label', CSS.label + ';margin-bottom:4px', tokRow, 'Token');
        ui.eye = el('button', 'background:rgba(255,255,255,.08);border:none;color:#bdc1c6;font-size:10px;padding:3px 8px;border-radius:6px;cursor:pointer', tokRow, '显示');
        ui.token = el('input', CSS.input, secConn);
        ui.token.type = 'password';
        ui.token.placeholder = '启动后端时终端打印的 Token';
        ui.token.spellcheck = false; ui.token.autocomplete = 'off';
        ui.eye.addEventListener('click', () => {
            const show = ui.token.type === 'password';
            ui.token.type = show ? 'text' : 'password';
            ui.eye.textContent = show ? '隐藏' : '显示';
        });
        const connBtnRow = el('div', 'display:flex;gap:8px;margin-top:10px', secConn);
        ui.testBtn = el('button', CSS.btnPrimary, connBtnRow, '🔌 测试连接');
        ui.saveBtn = el('button', CSS.btn, connBtnRow, '💾 保存设置');

        const applyInputsToConfig = () => {
            const url = ui.backend.value.trim().replace(/\/+$/, '');
            if (url) CONFIG.backendUrl = url;
            CONFIG.token = ui.token.value.trim();
            const n = parseInt(ui.maxRuns.value, 10);
            CONFIG.maxAutoRuns = Math.max(1, Math.min(999, isNaN(n) ? DEFAULT_SETTINGS.maxAutoRuns : n));
            ui.maxRuns.value = String(CONFIG.maxAutoRuns);
        };
        const persistAndRefresh = () => { applyInputsToConfig(); saveSettings(); refreshHealth(false); };

        ui.testBtn.addEventListener('click', () => refreshHealth(true));
        ui.saveBtn.addEventListener('click', () => { persistAndRefresh(); showToast('💾 设置已保存', 'ok'); });
        ui.backend.addEventListener('change', persistAndRefresh);
        ui.token.addEventListener('change', persistAndRefresh);

        // ===== 区块 2：工具执行 =====
        const secExec = el('div', CSS.sec, body);
        el('div', CSS.secTitle, secExec, '🛡️ 工具执行');
        makeToggle(secExec, '自动发送结果给 AI', '关闭后执行结果复制到剪贴板', CONFIG.autoSend, v => {
            CONFIG.autoSend = v; saveSettings(); showToast('自动发送：' + (v ? '开启' : '关闭'), 'ok');
        });
        makeToggle(secExec, '危险操作确认', 'execute_terminal / write_file 执行前弹窗', CONFIG.dangerousConfirm, v => {
            CONFIG.dangerousConfirm = v; saveSettings(); showToast('危险操作确认：' + (v ? '开启' : '关闭'), 'ok');
        });
        makeToggle(secExec, '调试日志', '在浏览器控制台输出详细信息', CONFIG.debug, v => {
            CONFIG.debug = v; saveSettings();
        });
        const maxRow = el('div', 'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 2px 2px', secExec);
        const maxLeft = el('span', 'font-size:12px', maxRow, '单页最大自动执行');
        el('small', 'display:block;color:#8a8f98;font-size:10px;margin-top:2px', maxLeft, '防止 AI 死循环，超限即停');
        ui.maxRuns = el('input', 'width:64px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.12);border-radius:8px;color:#e8eaed;padding:6px 8px;font-size:12px;outline:none;text-align:center', maxRow);
        ui.maxRuns.type = 'number'; ui.maxRuns.min = '1'; ui.maxRuns.max = '999';
        ui.maxRuns.addEventListener('change', () => { applyInputsToConfig(); saveSettings(); showToast('单页最大执行次数：' + CONFIG.maxAutoRuns, 'ok'); });

        // ===== 区块 3：Skill =====
        const secSkill = el('div', CSS.sec, body);
        const skillTitle = el('div', CSS.secTitle, secSkill, '💉 Skill 注入');
        ui.skillRefresh = el('button', CSS.mini, skillTitle, '↻ 刷新');
        ui.skillSel = el('select', CSS.input, secSkill);
        ui.skillPreview = document.createElement('textarea');
        ui.skillPreview.readOnly = true;
        ui.skillPreview.spellcheck = false;
        ui.skillPreview.placeholder = '选择一个 Skill 预览内容…';
        ui.skillPreview.style.cssText = CSS.input + ';height:84px;resize:vertical;font-family:ui-monospace,Menlo,monospace;font-size:10.5px;line-height:1.5;color:#c7cdd5;margin-top:6px';
        secSkill.appendChild(ui.skillPreview);
        ui.injectBtn = el('button', CSS.btnAccent, secSkill, '💉 注入到输入框');
        ui.skillRefresh.addEventListener('click', () => { skillCache.clear(); refreshSkills(true); });
        ui.skillSel.addEventListener('change', loadSkillPreview);
        ui.injectBtn.addEventListener('click', async () => {
            const name = ui.skillSel.value;
            if (!name) { showToast('请先选择一个 Skill', 'warn'); return; }
            let text = skillCache.get(name);
            if (!text) {
                text = await getSkill(name);
                if (text) skillCache.set(name, text);
            }
            if (!text) { showToast('❌ 获取 Skill 内容失败', 'err'); return; }
            await injectTextIntoInput(text, name);
        });

        // ===== 区块 4：执行记录 =====
        const secLog = el('div', CSS.sec + ';margin-bottom:0', body);
        const logTitle = el('div', CSS.secTitle, secLog, '📜 执行记录');
        ui.logCount = el('span', 'background:rgba(138,180,248,.18);color:#8ab4f8;border-radius:8px;font-size:10px;padding:1px 7px;margin-left:6px', logTitle, '0');
        spacer(logTitle);
        ui.logCopy = el('button', CSS.mini + ';margin-left:0', logTitle, '复制');
        ui.logClear = el('button', CSS.mini, logTitle, '清空');
        ui.logList = el('div', 'max-height:150px;overflow-y:auto', secLog);
        ui.logClear.addEventListener('click', () => { execLog = []; persistLog(); renderLog(); showToast('执行记录已清空', 'ok'); });
        ui.logCopy.addEventListener('click', async () => {
            if (execLog.length === 0) { showToast('没有可复制的记录', 'warn'); return; }
            const lines = execLog.map(e =>
                '[' + new Date(e.t).toLocaleString() + '] ' + (e.ok ? '✓' : '✗') + ' ' + e.tool + (e.detail ? ' — ' + e.detail : '')
            );
            try { await navigator.clipboard.writeText(lines.join('\n')); showToast('已复制 ' + lines.length + ' 条记录', 'ok'); }
            catch (e) { showToast('复制失败：' + e.message, 'err'); }
        });

        // ---- 底栏 ----
        const foot = el('div', 'padding:8px 14px;border-top:1px solid rgba(255,255,255,.08);font-size:10px;color:#6b7280;display:flex;gap:6px;justify-content:center;flex-shrink:0', panel);
        ui.pageRuns = el('span', null, foot, '本页已执行 0 次');
        el('span', null, foot, '·');
        el('span', null, foot, 'Token 仅存本机');

        // 回填设置
        ui.panel = panel;
        ui.backend.value = CONFIG.backendUrl;
        ui.token.value = CONFIG.token;
        ui.maxRuns.value = String(CONFIG.maxAutoRuns);

        renderLog();
        updatePageRunsUI();

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') panel.style.display = 'none';
        });

        document.body.appendChild(panel);
        panelBuilt = true;
    }

    // ==================== 兜底菜单（面板在老 WebView 上起不来时使用）====================
    async function injectSkillViaMenu() {
        const skills = await getSkills();
        if (!skills || skills.length === 0) { alert('❌ 后端没有 Skill，请先在终端配置'); return; }
        let menu = '=== 选择要注入的 Skill ===\n\n';
        skills.forEach((s, i) => { menu += '[' + i + '] ' + s.name + '\n      ' + (s.description || '') + '\n\n'; });
        menu += '输入编号 (0-' + (skills.length - 1) + '):';
        const choice = prompt(menu, '0');
        if (choice === null) return;
        const idx = parseInt(choice, 10);
        if (isNaN(idx) || idx < 0 || idx >= skills.length) { alert('❌ 无效选择'); return; }
        const name = skills[idx].name;
        const content = await getSkill(name);
        if (!content) { alert('❌ 获取 Skill 内容失败'); return; }
        await injectTextIntoInput(content, name);
    }

    function openFallbackMenu() {
        const c = CONFIG;
        const choice = prompt(
            '=== AI Bridge 菜单' + (panelError ? '（面板加载失败，已切换简易菜单）\n' + truncate(String(panelError), 150) : '') +
            '\n\n1. 💉 注入 Skill\n' +
            '2. ⚙️ 后端地址（当前：' + c.backendUrl + '）\n' +
            '3. 🔑 Token（当前：' + (c.token ? '已设置' : '未设置') + '）\n' +
            '4. 自动发送：' + (c.autoSend ? '开 → 点我切换' : '关 → 点我切换') + '\n' +
            '5. 危险操作确认：' + (c.dangerousConfirm ? '开 → 点我切换' : '关 → 点我切换') + '\n' +
            '6. 🔌 测试连接\n' +
            '7. 单页最大执行次数（当前 ' + c.maxAutoRuns + '）\n\n' +
            '输入编号：'
        );
        if (choice === null) return;
        if (choice === '1') { injectSkillViaMenu(); return; }
        if (choice === '2') {
            const url = prompt('输入后端地址:', c.backendUrl);
            if (url) { CONFIG.backendUrl = url.trim().replace(/\/+$/, ''); saveSettings(); showToast('✅ 已保存：' + CONFIG.backendUrl, 'ok'); }
            return;
        }
        if (choice === '3') {
            const t = prompt('输入 Token（留空则清除）:', c.token);
            if (t !== null) { CONFIG.token = t.trim(); saveSettings(); showToast('✅ Token 已保存', 'ok'); }
            return;
        }
        if (choice === '4') { CONFIG.autoSend = !CONFIG.autoSend; saveSettings(); showToast('自动发送：' + (CONFIG.autoSend ? '开启' : '关闭'), 'ok'); return; }
        if (choice === '5') { CONFIG.dangerousConfirm = !CONFIG.dangerousConfirm; saveSettings(); showToast('危险操作确认：' + (CONFIG.dangerousConfirm ? '开启' : '关闭'), 'ok'); return; }
        if (choice === '6') {
            refreshHealth(false).then(h => {
                alert(h.online ? '✅ 连接成功！\n版本: V' + h.version + '\n本地工具: ' + h.localTools + ' 个\nMCP 工具: ' + h.mcpTools + ' 个\n延迟: ' + h.latency + 'ms'
                               : '❌ 连接失败\n地址: ' + CONFIG.backendUrl + '\n错误: ' + h.message);
            });
            return;
        }
        if (choice === '7') {
            const n = parseInt(prompt('单页最大自动执行次数：', String(c.maxAutoRuns)), 10);
            if (!isNaN(n) && n >= 1 && n <= 999) { CONFIG.maxAutoRuns = n; saveSettings(); showToast('✅ 已保存：' + n + ' 次', 'ok'); }
            return;
        }
    }

    function onFabTap() {
        if (panelBuilt && ui.panel) {
            const show = ui.panel.style.display === 'none';
            ui.panel.style.display = show ? 'flex' : 'none';
            if (show) { refreshHealth(false); refreshSkills(true); }
        } else {
            openFallbackMenu();
        }
    }

    // ==================== 悬浮按钮（可拖动；点击开关面板，失败则退回简易菜单）====================
    function buildFab() {
        const fab = document.createElement('div');
        fab.id = 'ab3Fab';
        fab.title = 'AI Bridge — 面板';
        fab.textContent = '🤖';
        fab.style.cssText = [
            'position:fixed;right:18px;bottom:18px;width:54px;height:54px;border-radius:50%',
            'background:linear-gradient(135deg,#10a37f 0%,#0d8a6a 100%)',
            'color:#fff;font-size:25px;display:flex;align-items:center;justify-content:center',
            'z-index:2147483646;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:none',
            'box-shadow:0 6px 22px rgba(16,163,127,.45),0 2px 6px rgba(0,0,0,.4)'
        ].join(';');
        document.body.appendChild(fab);

        let dragging = false, moved = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
        let suppressClickUntil = 0;

        // touchend 与合成 click 双发去重：只有触摸 tap 才会设置 suppressClickUntil
        function fireTap() { onFabTap(); }

        function onStart(x, y) {
            dragging = true; moved = false;
            startX = x; startY = y;
            const rect = fab.getBoundingClientRect();
            startLeft = rect.left; startTop = rect.top;
        }
        function onMove(x, y, prevent) {
            if (!dragging) return;
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

        fab.addEventListener('touchstart', e => { if (e.touches.length) onStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
        fab.addEventListener('touchmove', e => { if (e.touches.length) onMove(e.touches[0].clientX, e.touches[0].clientY, () => e.preventDefault()); }, { passive: false });
        fab.addEventListener('touchend', () => {
            const wasMoved = moved;
            dragging = false;
            if (wasMoved) { suppressClickUntil = Date.now() + 350; }
            else fireTap();
        });
        fab.addEventListener('mousedown', e => { onStart(e.clientX, e.clientY); });
        document.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
        document.addEventListener('mouseup', () => {
            if (dragging && moved) suppressClickUntil = Date.now() + 350;
            dragging = false;
        });
        fab.addEventListener('click', () => { if (Date.now() < suppressClickUntil) return; fireTap(); });
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
        refreshHealth(false);
        setInterval(() => refreshHealth(false), 30000);
    }

    function init() {
        // 每一步都独立 try/catch：任何一块失败都不拖死其他功能
        try { buildToastWrap(); } catch (e) { console.error('[🤖 AI Bridge V3] Toast 初始化失败:', e); }
        try { buildFab(); } catch (err) {
            console.error('[🤖 AI Bridge V3] 悬浮按钮创建失败:', err);
            try { alert('AI Bridge：悬浮按钮创建失败：' + (err && err.message ? err.message : err)); } catch (e2) {}
        }
        try {
            buildPanel();
        } catch (err) {
            panelBuilt = false;
            panelError = (err && err.message) ? err.message : String(err);
            console.error('[🤖 AI Bridge V3] 面板加载失败，点🤖将使用简易菜单:', err);
        }
        try { startWatching(); } catch (err) { console.error('[🤖 AI Bridge V3] 监听启动失败:', err); }
        window.__AI_BRIDGE_V3__ = { CONFIG, parseToolCalls, getAdapter, checkHealth, version: '3.2' };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
