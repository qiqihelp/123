# 铁锈战争 Rusted Warfare — 模组开发环境

> 独立工作区，与仓库根目录的 ECHOFALL 游戏代码完全隔离。
> 本目录是后续所有铁锈战争模组开发、素材包接收、校验与打包的唯一入口。

## 目录结构

```
rw-mod/
├── README.md                  ← 本文件：总览与快速上手
├── docs/                      ← 深度调研笔记（模组规范 / INI 速查 / 版本兼容 / 排错）
│   ├── 01-modding-reference.md
│   ├── 02-ini-cheatsheet.md
│   ├── 03-version-compatibility.md
│   ├── 04-troubleshooting.md
│   └── 05-asset-intake.md
├── templates/                 ← 可直接复制的新模组骨架
│   ├── mod-info.txt
│   ├── all-units.template
│   └── units/
│       ├── example-tank/      ← 陆地单位模板
│       ├── example-building/  ← 建筑模板
│       └── example-air/       ← 空中单位模板
├── tools/                     ← 纯 Python 标准库工具（无需 pip 安装）
│   ├── validate.py            ← 静态校验：缺失图片/音效、重复 name、必填键、ROOT 路径
│   ├── pack.py                ← 将模组文件夹打包为 .rwmod（ZIP 改后缀）
│   ├── unpack.py              ← 解包 .rwmod / zip 素材包
│   └── new_mod.py             ← 一键脚手架新模组
├── intake/                    ← 素材包投放区（你后续丢素材包到这里）
├── mods/                      ← 正在开发的模组（每个子文件夹 = 一个模组）
└── examples/                  ← 完整示例模组（可直接安装测试）
```

## 快速上手（3 分钟）

### 1. 新建一个模组

```bash
python3 rw-mod/tools/new_mod.py MyAwesomeMod --title "我的模组" --description "一句话简介"
# 生成 rw-mod/mods/MyAwesomeMod/
```

### 2. 校验

```bash
python3 rw-mod/tools/validate.py rw-mod/mods/MyAwesomeMod
# 严格模式（重复键、未知键等也报错）：
python3 rw-mod/tools/validate.py rw-mod/mods/MyAwesomeMod --strict
```

### 3. 打包为 .rwmod（可分发 / 放入游戏 mods/units/）

```bash
python3 rw-mod/tools/pack.py rw-mod/mods/MyAwesomeMod
# 输出 rw-mod/mods/MyAwesomeMod.rwmod
```

### 4. 安装到游戏（Windows Steam 版）

把文件夹或 `.rwmod` 复制到：

```
<Steam>\steamapps\common\Rusted Warfare\mods\units\<ModName>\
```

或直接把 `.rwmod` 丢进 `mods\units\` 即可，游戏启动时自动加载。
> 安卓版路径不同（`Android/data/com.corrodinggames.rts/files/mods/units/`），
> 逻辑相同：文件夹直接放进去或放 `.rwmod`。

## 素材包投放约定

你后续丢素材包时，直接放到 `rw-mod/intake/` 即可，命名建议：

```
rw-mod/intake/
├── pack-001-坦克贴图.zip
├── pack-002-音效.rwmod
└── pack-003-单位ini.zip
```

收到后我会：解包 → 校验引用 → 归入 `mods/<ModName>/` 对应目录
（`units/` 放 INI，`sprites/` 放贴图，`sounds/` 放音效，`effects/` 放特效）→ 再次校验 → 打包。

详见 `docs/05-asset-intake.md`。

## 核心规范速记（详见 docs/）

| 概念 | 说明 |
|---|---|
| 模组根 | 含 `mod-info.txt` 的文件夹即一个模组；`.rwmod` = ZIP 改后缀 |
| 单位 INI | `units/<unit_id>/<unit>.ini`，`[core] name` 全局唯一 |
| 全局模板 | `all-units.template` 对所有单位生效（自定义资源/特效常用） |
| 路径引用 | `ROOT:\sounds\xxx.ogg` 表示模组根；相对路径以 INI 所在目录为基准 |
| 必填键 | `name / maxHp / price / mass / radius / image / canAttack + 目标旗 / movementType` |
| 版本 | 目标版本在 `mod-info.txt` 的 `minVersion` 声明；1.15 新增 `streamingCost` 等 |

## 工具依赖

- Python 3.8+（仅标准库，无需 `pip install`）
- 无需安装游戏即可做静态校验；最终效果需在游戏内验证

## 与主仓库的关系

本目录不参与 `CMakeLists.txt` 构建，不影响 ECHOFALL 的 CI。
`rw-mod/mods/*.rwmod`、`__pycache__/` 等产物已在 `rw-mod/.gitignore` 中忽略，
源码（INI / 模板 / 工具）正常入库。
