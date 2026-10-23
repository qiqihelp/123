# ECHOFALL · 回声之谷

一款用 **C++17** 编写、编译成 **WebAssembly** 的《传说之下》(Undertale) 风格 RPG 小游戏。
整个项目只有几十 KB 代码，运行在浏览器里，不需要安装任何东西。

> 纯 C++ 代码 + 自研软件光栅器 + Emscripten，没有任何游戏引擎依赖。

## ✨ 特色

| | |
|---|---|
| 🖥️ 可探索房间 | 走动、对话、触发事件，红心就是你的角色 |
| ⚔️ 回合制战斗 | `FIGHT / ACT / ITEM / MERCY` 四键菜单，打击有命中判定条 |
| 💥 弹幕闪避 | 战斗中有 Undertale 式弹幕环节，方向键操控红心，Shift 精准移动 |
| ❤️ 多结局 | 全部放过 / 全部杀死 / 中立路线，结局由你的选择决定 |
| 🧪 92 项断言 | 核心逻辑可在无图形环境下完整跑通（含一次完整通关） |

## 🎮 操作

| 按键 | 作用 |
|---|---|
| `↑ ↓ ← →` | 移动 / 闪避 / 选择菜单 |
| `Z` / `Enter` / `空格` | 确认、推进对话、攻击 |
| `X` / `Esc` | 返回上一级菜单 |
| `Shift` | 精准移动（判定框变小，移动变慢） |

## 🚀 在线试玩

游戏由 GitHub Actions 自动编译并部署到 GitHub Pages：

```
https://<你的用户名>.github.io/123/
```

> 首次部署前，需要在仓库 **Settings → Pages → Build and deployment → Source** 中选择
> **GitHub Actions**。工作流已包含部署步骤，即使 Pages 未启用，构建产物也会以
> `echofall-web` artifact 的形式保留在 Actions 运行记录里。

## 🛠️ 本地构建

### Web（浏览器）版本

```bash
# 安装 Emscripten
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk && ./emsdk install 4.0.13 && ./emsdk activate 4.0.13
source emsdk_env.sh

# 编译
emcmake cmake -S . -B build-web -DECHOFALL_BUILD_WEB=ON -DCMAKE_BUILD_TYPE=Release
cmake --build build-web -j
```

产物在 `build-web/`：`index.html` + `echofall.js` + `echofall.wasm`。
本地预览：

```bash
cd build-web && python3 -m http.server 8000
# 打开 http://localhost:8000
```

### 原生（无图形）版本：跑测试

```bash
cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build -j
ctest --test-dir build --output-on-failure
```

## 📁 项目结构

```
src/
  core/            # 与平台无关的游戏逻辑（可在本地用 g++ 编译）
    types.h        #   基础类型与调色板
    input.h        #   输入状态
    canvas.h/.cpp  #   软件光栅器（像素缓冲、矩形、圆形、精灵混合）
    sprite.h/.cpp  #   从 ASCII art 生成像素精灵
    art.h/.cpp     #   全部像素美术资源
    font/text      #   UTF-8 处理与文本折行
    dialogue.h/.cpp#   打字机对话系统
    battle.h/.cpp  #   战斗系统：菜单 / 打击判定 / 弹幕 / 结局判定
    overworld.h/.cpp # 可探索房间
    game.h/.cpp    #   场景状态机、标题页、结局
  web/             # Emscripten 前端：canvas 上传、输入、文字渲染
  native/          # 无图形环境下的平台实现（供测试使用）
tests/             # 单元测试与流程测试
.github/workflows/ # GitHub Actions：编译 + 部署 Pages
```

## 🧩 实现要点

* **自研光栅器**：`Canvas` 维护一块 RGBA 帧缓冲（字节序为 `R,G,B,A`），
  直接 `putImageData` 给浏览器 canvas，因此像素艺术是硬边的、不会被插值糊掉。
* **文字层**：文字交给浏览器的排版引擎绘制（中英文都能正常显示），
  C++ 只负责排版坐标与折行，帧缓冲上传后再叠加文字层。
* **弹幕**：子弹与红心都是圆形碰撞，精准模式下判定框半径从 5px 缩到 3px。
* **结局路由**：`spares / kills / kindness` 三个计数决定最终结局文本。

## 📄 License

MIT
