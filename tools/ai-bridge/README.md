# 🌉 AI Agent Bridge V3 — Via 浏览器 + 本机后端

让网页版 AI（ChatGPT / Claude / Kimi / 小米 Mimo……）直接调用你手机/电脑上的工具：
读写文件、执行终端命令、真实网络搜索、任意 MCP 服务器工具 —— 全部在本机完成，零依赖。

```
AI 网页  ──(DOM 里的 <tool_call>)──►  userscript  ──(HTTP + Token)──►  bridge_server_v2.py
                                                                       ├─ 本地工具（shell/文件/搜索/计算…）
                                                                       └─ MCP 服务器（stdio / Streamable HTTP）
```

> ⚠️ **安全声明**：这是一个"给 AI 手机权限"的工具。V3 默认开启 Token 认证 + 仅监听 127.0.0.1，
> 但你开启自动执行后，AI 输出的内容会被真实执行。看清楚再按「允许」。
> 这是给**自己**用的，不要暴露给其他人，更不要部署到公网服务器。

---

## 🚀 快速开始

### 1. 启动后端（手机上的 Termux / 任何有 Python 3.7+ 的机器）

```bash
python bridge_server_v2.py            # 进入终端配置菜单
python bridge_server_v2.py --server   # 直接启动服务器
python bridge_server_v2.py -p 8080    # 指定端口
```

首次启动会：
- 生成随机 Token 到 `~/.ai_bridge/token`（权限 600），并**打印在终端**
- 默认只监听 `127.0.0.1`（局域网收听需显式 `--host 0.0.0.0`，务必配合 Token）

### 2. 安装 userscript（Via 浏览器）

Via → 设置 → 脚本管理 → 添加 `ai-tool-bridge-v2-via.user.js`。

### 3. 在 AI 网页配置

打开 ChatGPT 等页面 → 点右下角绿色 🤖 悬浮球 →
- **后端地址**：默认 `http://127.0.0.1:8000`
- **Token**：粘贴启动后端时终端打印的那串（以后不用再输，保存在本机）
- 点 **🔌 测试连接** → 状态灯变绿 → 完成

### 4. 注入提示词（让 AI 知道怎么用工具）

面板 → **Skill 注入** → 选择 `default` → 预览 → **💉 注入到输入框** → 发送。
（第一次用、以及每次拉取/更新 MCP 工具后，都重新注入一次。）

---

## ✨ V3 相对 V2 的变化

### 🔴 安全（全修）
| 问题 | V3 修法 |
|---|---|
| `0.0.0.0` + 无认证 + CORS `*` ＝ 局域网 RCE | 默认 `127.0.0.1`；全部接口要求 `X-Bridge-Token`；OPTIONS 预检放行该头；带 `Access-Control-Allow-Private-Network: true`（Chrome PNA） |
| 危险工具无确认，AI 幻觉/提示注入直接执行 shell | 面板「危险操作确认」开关（默认开）：`execute_terminal`/`write_file` 执行前弹窗，取消则把「用户拒绝」回灌给 AI |
| AI 死循环刷爆本机 | 护栏①：同一调用 ≥3 次自动跳过；护栏②：单页最大自动执行次数（默认 30，面板可调） |
| Token 明文配置文件散落 | 自动生成 128 位随机 Token，文件权限 600，终端启动时打印；可在菜单 [4] 查看/重置（重置后旧 Token 立即失效） |
| 配置写文件非原子（崩溃即坏档） | 全部原子写入（tmp + rename），损坏时明确警告而不是静默用默认值 |

### 🟡 MCP 传输（全修）
| 问题 | V3 修法 |
|---|---|
| stdio 子进程 stderr 管道写满 → 握手死锁 | stderr 追加写入 `~/.ai_bridge/logs/<服务器名>.log`，永不死锁，出问题能看日志 |
| `cmd.split()` 切碎带空格参数 | `shlex.split()` 正规分词；支持 `env` / `cwd` 配置 |
| HTTP MCP 只会 `Accept: application/json`，碰到 SSE 就静默返回空 | 完整 Streamable HTTP：initialize 握手、`Mcp-Session-Id` 管理、SSE 响应解析、202 通知处理、405/404 给出明确提示 |
| 每次工具调用都重启 MCP 进程（`npx` 慢如龟） | 长连接池：stdio 进程跨调用复用，断线自动重连 + 调用失败自动重试一次 |
| 缓存工具同名冲突静默丢弃 | 自动改限定名 `服务器名__工具名`，Skill 里注明；执行按 alias 解析，本地工具优先级不变 |
| 死代码 `generate_full_skill()` 从未被调用 → MCP 工具从未进入提示词 | 接上线：缓存工具后自动询问"是否重新生成 default Skill"；Skill 菜单新增 [5]；`POST /skills/regenerate` 接口 |
| 删除服务器后缓存工具变成僵尸 | 删除时断开连接池；缓存可整体清空（MCP 菜单 [6]）；调用时报错信息明确指明是哪台服务器的问题 |

### 🟢 体验 & 新功能
后端：
- 🆕 `search_web` 从假实现改为**真实搜索**（DuckDuckGo，返回标题+链接+摘要）
- 🆕 `calc` 安全计算器（ast 白名单求值：四则/幂/取模/开方/三角函数，零代码注入风险）
- 🆕 `get_datetime`（本地时间/时区/Unix 时间戳）
- 🆕 `read_file` 支持 `encoding=base64` 读二进制；`write_file` base64 按**原始字节**写盘且自动创建父目录
- 🆕 `unescape_ai_content` 只在"整篇没有真实换行"或"字面 `\n` 明显占多数"时才还原，不再破坏代码文件里合法的 `\\n`
- 🆕 本地工具参数错误返回"该工具参数有：xxx"而非干巴巴的 TypeError
- 🆕 工具结果以 ❌ 开头自动标记失败（JSON-RPC `isError` / REST `success:false`），AI 能感知成败
- 🆕 `GET /health`；`POST /mcp` 支持 `initialize`/`ping`/`tools/list`（JSON-RPC 客户端可以直接接）
- 🆕 `DELETE /skills?name=`；配置目录 `~/.ai_bridge/logs/`；`ThreadingHTTPServer` 不再被 30s 工具调用卡住

前端（userscript）：
- 🆕 **侧边栏面板**（Shadow DOM，不怕网站 CSS 污染）：连接状态灯 + 延迟、后端地址/Token 保存、自动发送/危险确认/调试开关、单页执行上限、Skill 下拉选择 + 内容预览 + 一键注入、**执行记录**（最近 50 条 ✓/✗ 历史，可复制可清空）
- 🆕 执行记录跨会话保留（localStorage），出问题能回溯 AI 到底执行了什么
- 🆕 「本页已执行 N 次」计数器；相同工具调用防抖；消息去重改为 **内容哈希**（React 重渲染不再导致重复执行）
- 🆕 Token 请求头、401 明确提示「去面板填 Token」；后端地址/开关全部持久化（刷新不丢）
- 🆕 悬浮球区分「点击=开关面板」和「拖动=移动」，不会误触；Esc 关闭面板
- 🆕 解析器增强：缺 `<arguments>` 的 tool_call 按空参数执行（不再静默丢弃）、JSON 内含字面换行自动修复后重试、MCP `mcp` 拆包不变
- 🐛 修复 `INPUT` 元素套用 `HTMLTextAreaElement.prototype` value setter 导致的 `Illegal invocation`
- 🐛 修复 JSON-RPC 响应里用户拒绝/重复调用/超次数时的正确回灌（AI 能看到"用户拒绝了"并收手）

---

## 🛠️ 终端菜单速览

```
[1] 🔌 MCP 服务器配置
      [1] 添加 HTTP 服务器（Streamable HTTP，JSON 或 SSE）
      [2] 添加 Stdio 服务器（npx/uvx/本地命令都行）
      [3] 删除服务器    [4] 测试连接+拉取工具
      [5] 批量拉取所有服务器工具（完成后自动询问是否重建 default Skill）
      [6] 清空工具缓存
[2] 📝 Skill 管理（创建/编辑/删除/查看/用 MCP 缓存重新生成 default）
[3] 🚀 启动桥接服务器（启动横幅会打印 Token 和绑定地址）
[4] 🔑 查看 / 重置 Token
```

配置文件都在 `~/.ai_bridge/`：`token`、`mcp_config.json`、`cached_tools.json`、`skills.json`、`settings.json`、`logs/`。
`settings.json` 可设 `{"cors_origin": "https://chatgpt.com"}` 把 CORS 收紧到指定网站（默认 `*`）。

## 📦 本地工具清单

| 工具 | 用途 |
|---|---|
| `execute_terminal` | 执行 shell 命令（受危险确认保护） |
| `read_file` / `write_file` | 读写文件（`encoding=base64` 处理二进制） |
| `list_files` | 列目录 |
| `search_web` | **真·网络搜索**（DuckDuckGo，需能访问 duckduckgo.com） |
| `calc` | 安全数学计算 |
| `get_system_info` / `get_datetime` | 系统信息 / 时间 |

## ❓ 常见问题

**Q: ChatGPT 页面提示 401？**
A: 面板里 Token 没填或填错。Linux/Termux 跑 `cat ~/.ai_bridge/token` 复制进去。

**Q: Chrome 里一直显示"未连接"？**
A: V3 已带 `Access-Control-Allow-Private-Network: true`。如果还不行，确认后端确实启动了（`curl -H "X-Bridge-Token: $(cat ~/.ai_bridge/token)" http://127.0.0.1:8000/`），且地址是 `127.0.0.1` 不是局域网 IP。

**Q: `npx` 启动的 MCP 服务器拉取不到工具？**
A: 看 `~/.ai_bridge/logs/<服务器名>.log`。常见原因：`npx` 不在 PATH、包需要先下载。V3 的 stderr 走文件不再死锁，日志里一目了然。

**Q: 旧版 SSE 的 MCP 服务器（`/sse` + `/messages` 双端点）能用吗？**
A: 不能。V3 支持 stdio 和 Streamable HTTP（2024-11-05 协议）。旧 SSE 服务器请用 stdio 方式启动，或等社区适配器。调用失败时错误信息会明确说明。

**Q: 想彻底关闭认证？**
A: `--no-auth` 或 `BRIDGE_NO_AUTH=1`。仅限纯本机调试，开了之后同机任何程序都能执行命令。

**Q: AI 不停重复同一个调用？**
A: 护栏会自动在第 3 次跳过并告诉 AI。看面板「执行记录」就知道它到底想干嘛。

## 已知限制

- userscript 依赖各 AI 网站的 DOM 结构，网站大改版可能需要更新选择器（可在面板里用「自定义适配器」绕过）
- `search_web` 依赖 DuckDuckGo 页面结构，变更时会返回明确的解析失败提示
- AI 网站 + localhost 的混合内容策略随浏览器演进，遇到拦截时优先试 Chrome/Via 最新版
