# 🌉 AI Agent Bridge — Kiwi 浏览器插件包

**这是 userscript 的"正式版"升级**：一个标准的 Chrome Manifest V3 扩展，装在 Kiwi Browser 里用。

和 userscript 的本质区别：**扩展的后台进程直连你手机上的本机桥（`127.0.0.1:8000`）**，
不走页面的 `fetch`，因此 **https 的 MiMo 页面 → http 本机桥 这条路在 Kiwi 里也能打通** ——
不需要 Tampermonkey，也不受页面 CORS / Private Network Access 限制。

## 功能一览

- 🌉 MiMo Studio 页面右下角悬浮按钮，点开控制面板
- 🔑 Token 保存（本机持久化）+ 一键测试连接（显示版本 / 工具数 / 延迟）
- ⚡ **自动模式**：AI 输出 `<tool_call>` 且内容稳定 1.5 秒后，自动解析 → 执行 → 填入输入框 → 自动发送
- 🖱️ **半自动（默认）**：自动执行，但只把结果填入输入框，你确认后再发送
- 📋 **仅复制**：执行后把 `[工具执行结果]…请基于以上结果继续回复。` 复制到剪贴板
- 🔍 **手动模式**：把 AI 的完整回复粘贴进来，一键解析执行（任何时候都能用的兜底）
- 🛡️ 安全护栏：`execute_terminal` / `write_file` 执行前二次确认；相同调用连续 3 次自动跳过；单页执行次数上限
- 📜 执行历史（最近 30 条，保存在本机），可一键清空
- 📍 同时支持：MCP 拆包格式、`write_file` 原始格式、缺 `<arguments>` 容错、JSON 控制字符/单引号容错

## 前置条件

手机上后端必须在跑（跟之前一样）：

```bash
python bridge_server_v2.py --server
```

启动后终端会打印 Token，先记下来。

## 安装步骤（Kiwi Browser）

1. 下载插件包（zip）：<https://github.com/qiqihelp/123/raw/arena/878d9052-123/tools/ai-bridge/AI-Agent-Bridge-Kiwi-v1.0.0.zip>
2. 用手机的**文件管理器**找到下载的 zip → **解压**到一个文件夹（比如 `Download/AI-Agent-Bridge/`）
3. Kiwi 地址栏输入 **`kiwi://extensions`**（或菜单 ⋮ → 扩展程序）
4. 打开右上角 **「开发者模式」**
5. 点 **「加载已解压的扩展程序」** → 选中刚解压的文件夹（里面直接有 `manifest.json`）
6. 完成！打开 MiMo Studio，页面右下角出现 🌉 按钮

> 如果 Kiwi 拒绝加载，检查解压出来是不是"双层文件夹"（`AI-Agent-Bridge-Kiwi-v1.0.0/AI-Agent-Bridge-Kiwi-v1.0.0/manifest.json`），
> 选**直接包含 `manifest.json` 的那一层**。

## 首次使用

1. 打开 <https://aistudio.xiaomimimo.com/apps/s/p0KDrz7a6e3> （你的 MiMo Studio）
2. 点右下角 🌉 → 在「本机桥 Token」框粘贴 Token → 点 **💾 保存**
3. 状态行应显示 **✅ 已连接 V3.0 · 本地 8 工具 · xx ms**
4. 模式选 **🖱️ 半自动**（推荐）

之后只要 AI 回复里出现工具调用，扩展会自动执行并把结果填进输入框；
你瞄一眼命令没问题，点发送即可。想全托管就切 🤖 全自动。

## 注入提示词（让 AI 知道它能用工具）

跟 userscript 场景完全一样，把这段注入给 MiMo（详见主 README「注入提示词」一节）：

```text
你可以使用如下本机工具（通过 <tool_call> 调用）：
execute_terminal / get_system_info / get_datetime / calc / list_files / read_file / write_file / search_web
调用格式：
<tool_call>
<tool_name>工具名</tool_name>
<arguments>{"参数名":"参数值"}</arguments>
</tool_call>
```

## 常见问题

**Q: 页面没有出现 🌉 按钮？**
Kiwi 菜单里确认扩展已启用（`kiwi://extensions` 里开关是绿的），然后刷新 MiMo 页面。

**Q: 点保存后显示 ❌ 连接不上本机桥？**
① Termux 里后端没在跑 → `python bridge_server_v2.py --server`；
② 端口不是 8000 → 后端 `-p 端口`，扩展里 `chrome.storage` 的 `backendUrl` 默认 8000，
   改后端端口后需要同步（目前请保持 8000）；
③ Token 填错 → 后端重启会换 Token 吗？——不会（Token 存在 `~/.ai_bridge/token`），但后端重启日志里会再打印一次。

**Q: 全自动模式 AI 一直调工具停不下来？**
护栏会兜底：单页累计 20 次（可在执行记录里看计数）/ 相同调用 3 次自动跳过。
想手动喊停，就切回 🖱️ 半自动。

**Q: 工具执行了但 MiMo 页面没反应？**
点 ⚡「执行页面最新一条…」按钮手动跑一次；或切到手动模式把 AI 回复粘贴进「或者：把 AI 的完整回复粘贴进来」再点解析并执行。

## 更新方式

1. 下载新版 zip → 解压覆盖旧文件夹
2. `kiwi://extensions` → 该扩展卡片上点 **⟳ 重新加载**
3. MiMo 页面里刷新即可

## 权限说明

- `storage`：保存 Token、模式、执行历史（都在本机，不上传任何服务器）
- `activeTab`：点击工具栏图标时开关面板
- `host_permissions: http://127.0.0.1/*`、`http://localhost/*`：仅允许后台连接**本机**桥（任意端口），不访问任何外网服务器
- 内容脚本仅运行在 `*.xiaomimimo.com` / `*.mimo.mi.com` 页面
