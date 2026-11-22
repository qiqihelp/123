# 经典坦克大战 · C++17 Tank Battle (图形网页版)

一款使用 **C++17** 编写核心引擎与软件光栅器的经典坦克射击大战游戏，同时支持 **浏览器实时图形游玩（键盘 + 手机触屏虚拟手柄）**、**Emscripten WebAssembly 构建** 以及 **Termux 本地一键启动**。

## ✨ 游戏特色

- **5 个经典关卡**：砖墙（4 象限局部击毁）、钢墙（3星火力可击穿）、水域、隐蔽草丛、加速冰面、金鹰基地保护
- **4 种敌军坦克 AI**：轻型侦察（高速）、标准装甲、重型重甲（3血变色）、突击精英（高弹速智能寻路）
- **6 种强化道具**：击毁红闪奖励坦克掉落 `★`火力升级、`S`无敌护盾、`B`全屏轰炸、`T`冻结敌军、`H`基地钢墙加固、`+`生命+1
- **双端操控 + 复古音效**：支持桌面 `WASD`/方向键 + 空格，以及手机端多点触控虚拟方向键与开火按钮，内置 WebAudio 复古电子音效与 C++ 服务端战绩排行榜

## 📁 目录结构

```text
tank-battle/
  src/
    tank_core.hpp / .cpp   # C++17 核心游戏引擎 + 320x240 RGBA 像素光栅器
    server_main.cpp        # 零依赖 C++17 HTTP 服务端（静态页面 + 排行榜 API）
    wasm_main.cpp          # Emscripten WebAssembly 浏览器入口
  tests/
    test_tank.cpp          # C++17 核心引擎单元测试
  web/
    index.html             # 图形网页前端（含像素渲染、触屏手柄、WebAudio 音效）
  run_server.sh            # Termux / Linux 一键编译测试并启动服务
```

## 🚀 在 Termux / Linux 上启动

```bash
cd tank-battle
chmod +x run_server.sh
./run_server.sh
```

启动后在手机浏览器访问 `http://127.0.0.1:8080` 即可游玩。

## 🧩 Emscripten WebAssembly 构建（可选）

```bash
em++ -std=c++17 -O3 tank-battle/src/tank_core.cpp tank-battle/src/wasm_main.cpp \
  -I tank-battle/src -sALLOW_MEMORY_GROWTH=1 -o tank-wasm.js
```
