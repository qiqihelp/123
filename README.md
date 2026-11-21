# ECHOFALL · 回声之谷 & 深空当铺：可能是偷的

## 🛸 新增：《深空当铺：可能是偷的》(Deepspace Pawnshop: Probably Stolen) 网页版

在 `game/` 目录下包含一款致敬《深空当铺：可能是偷的》(Probably Stolen) 的赛博朋克反乌托邦当铺模拟经营游戏，纯原生 ES Modules + HTML5 Canvas + Web Audio 编写，零外部依赖即可在浏览器畅玩：

- **六大开局职业（含隐藏剧本）**：底层学徒、净水商人、地下枪械匠、合成化学家、暗巷销赃人、深空驯鼠人（“我们有老鼠！”隐藏产肉流）
- **55+ 原版风味道具与五类密封物资箱**：后勤、医疗、工程、治安、罚没物证柜五大盲盒箱 + 对应部门钥匙卡/指挥官万能卡；袋装肋明治、等离子燃料匣、“永恒”焕活精华液、自充电零点能电池、5连刮刮乐与“液体好运”
- **暗区突围式「套包扩容箱」与「走私者免检伪装箱」**：腰包(占1扩4)、行军包(占2扩8)、军用包(占2扩12)与带铅屏蔽防搜查的走私者伪装箱(占2扩9)，点击即可展开独立内部子仓库
- **电话大宗批发商 & 单名顾客多物品交易**：内置五大专线批发供货商（杰克逊博士、GP矿业考尔森、红魔鬼酒厂、上层药剂师戴尔、索耶地下交易所）随时整箱低价拿货；15+ 种顾客原型单次携带或求购 2~4 件货品，支持勾选挑货与整单议价
- **强制横屏 & 沉浸全屏视口**：100vw × 100dvh 全屏工作台 + 竖屏设备自动 90° 横屏适配 + 原生全屏横屏锁定按钮

### 本地运行与测试

```bash
# 运行核心引擎 39 项自动化断言测试
node tests/test_pawnshop.mjs

# 启动本地预览服务器
python3 -m http.server 8080 --bind 0.0.0.0 --directory game
```

---

## ECHOFALL · 回声之谷

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


## 🚀 v3.0 疯狂扩张里程碑 (续)
- **PAGS (Pawnshop Augmentation Guide System) 升级**：
  - **AI 改造体扫描系统**：新增 `scanCustomerForAug` 逻辑优化，支持 `vigilant`（警觉）特性与 `neural_core`（神经核心模块）减耗。
  - **改造体猎手结局**：击杀 3 个以上改造体且治安声望 ≥ 40 触发。
  - **AI 威胁系统**：难度与特性（AI威胁/哨兵紊乱症）影响赏金与扫描概率。
  - **图鉴扩充**：在“掌柜手册”标签页新增 PAGS 专区（显示 AI 改造体类型、扫描成功率、赏金倍率）。

## 🛠️ 技术细节 (续)
- **PAGS 逻辑**：在 `game/js/engine.js` 中完善了 `scanCustomerForAug`、`shootCustomerWithShotgun` 与 `getModuleEffects`（神经核心模块加成）。
- **PAGS 视图**：在 `game/js/main.js` 中更新了“掌柜手册”标签页的渲染逻辑，展示 PAGS 统计数据（猎杀数、赏金、威胁度）。
