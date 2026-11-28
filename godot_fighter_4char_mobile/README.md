# Fourfold Arena（四角色横版格斗原型）

Godot 4.8 / 纯 GDScript / Mobile Compatibility 渲染路径。项目无外部素材依赖，解压后以本目录中的 `project.godot` 导入即可运行。

## 打开与运行

1. 安装 **Godot 4.8 Standard**（无需 .NET 版本）。
2. 将 ZIP 解压，在 Godot Project Manager 中选择 **Import**，指向解压目录内的 `project.godot`，然后运行（F6/F5）。
3. 渲染器配置为 **Compatibility（OpenGL）**，项目采用 `canvas_items` 拉伸与 `expand` 画布比例；没有纹理资源需要压缩。

## 玩法 / 操作

选择角色卡片后按 **PICK P2** 切换第二名角色；再次按下可返回 P1。默认对手为简单 AI；点击 AI 开关可改为本地双人。进入战斗：

- P1 键盘：`A / D` 移动，`W` 或 `Space` 跳跃，`J` 普攻，`K` 技能 1，`L` 技能 2，`I` 奥义，`S` 防御。
- P2 键盘：方向键移动/跳跃，数字小键盘 `1 / 2 / 3 / 0` 对应普攻 / 技能 1 / 技能 2 / 奥义，`↓` 防御。
- 手机/平板横屏：左下虚拟摇杆移动、摇杆上推跳跃；右下 `HIT / S1 / S2 / ULT` 按钮。触摸使用独立 screen-touch index 跟踪，可用不同手指同时移动和攻击。双人模式提供镜像触控区域；使用同屏时双方设备/手指会共享画面。
- PC 的鼠标仅用于角色选择菜单；战斗输入走键盘或触摸路由。

## 角色技能

| 角色 | 普攻 | 技能 1 | 技能 2 | 奥义 |
| --- | --- | --- | --- | --- |
| 五条悟 | 快速体术 | 苍：短距突进/拉扯命中 | 赫：红色远程冲击波 | 茈：穿透式紫色重击弹 |
| 史蒂夫 | 近距离挥击 | 放置限时可碰撞方块 | 挖除附近方块 / 投射物 | 多段方块雨 |
| Sans | 短距骨击 | 三发骨头弹幕 | 预警后发射加斯特光束 | 蓝魂眩晕控制 + 多方向骨头与光束 |
| 佐助 | 草薙剑斩 | 千鸟突进（短暂无敌） | 持续灼烧的天照区域 | 须佐能乎强化、护体并大范围斩击 |

生命归零或 99 秒结束后显示胜负，可 rematch 或回到角色选择。角色与技能效果采用几何占位绘制，重点是状态切换、碰撞、伤害与操作链路，不含原作美术/音频。

## Android APK 导出

1. 在 Godot Editor 打开 **Editor → Manage Export Templates**，安装与当前 Godot 4.8 完全匹配的 export templates。
2. 安装 Android SDK / JDK（使用 Godot 4.8 文档建议版本），打开 **Editor → Editor Settings → Export → Android**，配置 SDK 路径。
3. 打开 **Project → Export**，选择已包含的 Android preset。当前预设启用 `arm64-v8a` 与 `armeabi-v7a`，全屏沉浸显示，并声明 VIBRATE 权限；本原型未调用震动 API。首次导出如提示签名配置，请用自己的测试/发布 keystore 设置签名；正式上架请自行维护发布密钥及应用包名。
4. 导出 APK 并安装到横屏 Android 设备测试。不要把开发 keystore 或发布凭据放入项目 ZIP。

项目默认方向为横屏，但 UI 监听 viewport `size_changed`，并通过 `DisplayServer.get_display_safe_area()` 计算顶部/底部避让；折叠屏或窗口尺寸变化会重新排版。iOS 可在 Godot 4.8 的 iOS export preset 中设置签名/Bundle ID，再由 Xcode 完成设备签名；仓库仅附 Android 预设。

## 项目结构

```text
project.godot
export_presets.cfg
scenes/main.tscn
scenes/fighter.tscn
scripts/main.gd          # 舞台、碰撞攻击框、临时方块、技能效果及比赛流程
scripts/fighter.gd       # CharacterBody2D + 整数状态机
scripts/projectile.gd    # 投射物、光束、黑炎与方块雨
scripts/input_router.gd  # 键盘与多点触控输入抽象
scripts/hud.gd           # 角色选择、血条、安全区与触屏控件
```

### 原型边界

当前舞台使用简易脚本绘制，普通命中通过 `PhysicsDirectSpaceState2D.intersect_shape()` 查询受击角色；骨头/光束/黑炎为轻量级脚本投射物。AI 为靠近后随机使用招式的轻量逻辑，未加入联网、音效、动画资源或复杂对象池。场上方块雨限制为 8 个投射物，适用于移动端原型。
