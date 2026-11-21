# 01 — 铁锈战争模组规范（深度调研）

> 来源：官方社区 Modding Reference（Google Sheets）、rustedwarfare.org 中文 Wiki、
> Fandom Custom Units、Steam 社区指南、Reddit r/rustedwarfare 讨论。
> 最后核对：2026-11-21。目标游戏版本：1.15（Steam 最新）。

## 1. 游戏与模组加载机制

- 游戏：Corroding Games《铁锈战争 / Rusted Warfare》，RTS，支持自定义单位/建筑/特效/音效/音乐。
- 模组本质：**文件夹或 ZIP 改后缀为 `.rwmod`**，游戏启动时扫描加载。
- 加载目录（Steam Windows）：
  ```
  <Steam>\steamapps\common\Rusted Warfare\mods\units\<ModName>\
  ```
  `.rwmod` 直接放 `mods\units\` 即可。部分旧教程写 `mods\assets`，以 `mods\units` 为准（新版）。
- 安卓：`Android/data/com.corrodinggames.rts/files/mods/units/`，逻辑相同。
- 内置示例模组：`assets/builtin_mods/mega_builders`（游戏自带，可参考其结构，但**不要改原版 assets**）。
- 原版单位 INI 位置（参考用，不要改）：`assets/units/tanks/tank.ini` 等。

## 2. 模组文件夹结构（标准）

```
MyMod/
├── mod-info.txt              ← 必填：模组元信息
├── mod-thumbnail.png         ← 可选：407×345 左右，模组列表缩略图
├── all-units.template        ← 可选：对所有单位生效的全局模板
├── units/                    ← 单位 INI（核心）
│   └── my_tank/
│       ├── my_tank.ini
│       ├── my_tank.png
│       ├── my_tank_turret.png
│       └── my_tank_dead.png
├── sprites/                  ← 可选：额外贴图（特效/图标等）
├── sounds/                   ← 可选：音效（.ogg）
├── effects/                  ← 可选：特效定义文件
├── maps/                     ← 可选：自定义地图
└── music/                    ← 可选：音乐（需在 mod-info.txt 声明 sourceFolder）
```

> 旧版教程中 `assets/units.index` 路径注册在新版已弱化/改为自动扫描，
> 但为兼容旧版，仍建议保持 `units/<id>/<file>.ini` 的清晰结构，不要把 INI 散落在根目录。

## 3. mod-info.txt

```ini
title: 我的模组
description: 一句话简介（支持多行，用 | 换行视版本而定）
minVersion: 1.15
tags: units, balance
thumbnail: mod-thumbnail.png
# 可选：音乐
# [music]
# sourceFolder: music
# whenUsingUnitsFromThisMod_playExclusively: true
```

字段说明：
- `title`：模组列表显示名
- `description`：简介
- `minVersion`：最低游戏版本，低于此版本不加载（推荐填当前目标版本，如 `1.15`）
- `tags`：逗号分隔标签
- `thumbnail`：缩略图文件名（相对模组根）

## 4. 单位 INI 基础

文件：`units/<unit_id>/<unit>.ini`，格式为 INI 变体：

```ini
[section]
key: value
; 注释用 ; 或 #（视版本，; 更通用）
```

### 4.1 必填键（缺失会导致单位无效/崩溃）

| 位置 | 键 | 说明 |
|---|---|---|
| `[core]` | `name` | 全局唯一 ID，**不要与原版或其它模组重名**，建议加前缀如 `mymod_tank` |
| `[core]` | `maxHp` | 最大生命 |
| `[core]` | `price` | 价格（credits） |
| `[core]` | `mass` | 质量（影响碰撞/运输） |
| `[core]` | `radius` | 碰撞半径 |
| `[graphics]` | `image` | 主体贴图文件名（相对 INI 目录） |
| `[attack]` | `canAttack` + 目标旗 | 至少声明能打什么：`canAttackLand / canAttackAir / canAttackWater` 等 |
| `[movement]` | `movementType` | `NONE / LAND / BUILDING / AIR / WATER / HOVER / OVER_CLIFF / OVER_CLIFF_WATER` |

### 4.2 常用 Section 一览

| Section | 用途 |
|---|---|
| `[core]` | 名称、价格、生命、科技等级 `techLevel: 1-3`、建造速度 `buildSpeed`、描述等 |
| `[graphics]` | 贴图、残骸 `image_wreak`、炮塔 `image_turret`、帧数 `total_frames`、缩放/阴影/动画 |
| `[attack]` | 攻击范围 `maxAttackRange`、射速 `shootDelay`、目标旗 |
| `[turret_N]` | 炮塔坐标、指向的 projectile |
| `[projectile_N]` | 伤害、速度、生命、贴图帧 |
| `[movement]` | 移动类型、速度、加速度、转弯速度 |
| `[ai]` | AI 行为（巡逻、追击等） |
| `[action_NAME]` / `[hiddenAction_NAME]` | 主动/隐藏技能（按钮、被动触发） |
| `[effect_NAME]` | 特效（爆炸、火光、烟雾） |
| `[animation_NAME]` | 动画（开火、展开等） |
| `[resource_NAME]` / `[global_resource_NAME]` | 自定义资源（全局/单位级） |
| `[transport]` / `[factory]` / `[builder]` | 运输/生产/建造相关（按需查表） |

### 4.3 贴图与帧

- 主体：`image: xxx.png`
- 残骸：`image_wreak: xxx_dead.png`
- 炮塔：`image_turret: xxx_turret.png`
- 多帧雪碧图：`total_frames: 4`，projectile 用 `frame: 1` 指定帧
- 炮塔/主体锚点：`turret_x / turret_y`（像素偏移，视贴图尺寸而定）
- 命名建议：`<unit>.png` / `<unit>_turret.png` / `<unit>_dead.png`，与 INI 同目录

### 4.4 路径引用

- 相对路径：以 INI 所在目录为基准，如 `image: my_tank.png`
- 模组根绝对路径：`ROOT:\sounds\shot.ogg`、`ROOT:\sprites\effect.png`
  - 注意反斜杠；校验工具会检查 `ROOT:\` 指向的文件是否存在
- 原版资源引用：不要依赖原版路径做修改，优先复制到模组内

### 4.5 建造与科技

- `techLevel: 1|2|3`：决定出现在哪个科技等级的建造菜单
- `buildSpeed`：建造速度（越大越快）
- `builtFrom` / `canBuild`：在哪个建筑下建造、能造什么；位置冲突（同一槽位重复）会导致菜单异常，校验工具会提示
- 建筑单位用 `movementType: BUILDING`

## 5. all-units.template

对模组内**所有**单位生效，适合：
- 定义全局自定义资源（`global_resource_NAME`）
- 定义通用特效/音效
- 统一数值调整（如全局移速修正）

```ini
[global_resource_energy]
displayName: 能量
max: 100
```

> 注意：`all-units.template` 本身不是单位，不要在里面写 `[core] name`。

## 6. 打包与分发

- `.rwmod` = ZIP 压缩包改后缀，根目录即模组根（含 `mod-info.txt`）
- 打包时**不要**多套一层无意义的父文件夹（除非 zip 内根即模组根）
- 分发渠道：Steam 工坊、Discord、QQ 群、GitHub Release 等
- 命名：`<ModName>.rwmod`，与文件夹名一致便于识别

## 7. 命名与冲突避免

- `[core] name` / `altNames` 全局唯一，建议前缀：`<modshort>_<unit>`
- 避免与原版重名（如 `tank`、`factory`）
- 多模组共存时，`ROOT:\` 引用只指向自身模组根，不跨模组

## 8. 版本差异（1.15）

- 新增 `streamingCost`（流式成本）与 `switchPriceWithStreamingCost`（切换价格逻辑）
- `strictLevel: 1` 可开启严格校验（重复键等会报错），调试期推荐开启
- 旧版 `units.index` 注册逻辑已变化，新模组按自动扫描结构即可

## 9. 参考仓库（GitHub）

- `CLRedfield/RustedWarfare-ModEditor` — 可视化编辑器 + 静态检查 + 打包/部署
- `n9tank/rwTool` — 打包/解包/地图工具
- `xingwangzhe/RustedWarfareModSupport` — VSCode 补全/预览
- `NaomiUGR/Rusted-Warfare-Graphics-Repository` — 社区贴图素材
- `FZZhiQiu/RustedWarfare-TheEndTechnology-mod` — 1.15 多人模组示例

## 10. 官方参考入口

- Modding Reference（Google Sheets，社区标准）：
  `https://docs.google.com/spreadsheets/d/1aeP3pUic0IutZlgGix_cM8xR7LEH44gS4itAxETK954/edit`
- 中文 Wiki 单位编辑：
  `https://rustedwarfare.org/wiki/单位编辑`
- Fandom Custom Units：
  `https://rustedwarfare.fandom.com/wiki/Custom_units`
