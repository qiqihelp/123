# 04 — 排错手册

## 工具先行

```bash
python3 rw-mod/tools/validate.py rw-mod/mods/<ModName> --strict
```

校验会报告：缺失文件、重复 `name`、缺失必填键、坏 `ROOT:\` 路径、重复键等。
先修校验 ERROR，再进游戏。

## 常见问题

### 1. 模组不加载 / 单位不出现
- 检查 `mod-info.txt` 是否在模组根、编码为 UTF-8（无 BOM 更稳）
- 检查 `[core] name` 是否与原版/其它模组重名
- 检查 `minVersion` 是否高于当前游戏版本
- 检查文件夹是否放对：`mods/units/<ModName>/mod-info.txt`
- `.rwmod` 解包后根目录是否直接是 `mod-info.txt`（不要多套一层）

### 2. 贴图不显示 / 粉块 / 错位
- `image` 路径大小写、扩展名是否与实际文件一致
- PNG 是否损坏、尺寸是否为 0
- `total_frames` 与实际帧数是否一致，`frame` 是否越界
- 炮塔锚点 `x/y` 是否超出贴图范围

### 3. 炮塔不开火 / 弹丸无伤害
- `[turret_N] projectile` 是否指向存在的 `[projectile_N]`
- `[attack] canAttack` 与目标旗是否开启
- `shootDelay` 是否过大、`maxAttackRange` 是否过小
- `damage` 是否为 0

### 4. 移动/建造异常
- `movementType` 拼写（全大写）
- 建筑用 `BUILDING` 且 `canMove: false`
- `builtFrom` / `canBuild` 槽位冲突（同一位置重复）
- `techLevel` 超出 1-3

### 5. 崩溃 / 黑屏 / 无法进游戏
- 开 `strictLevel: 1` 定位重复键
- 检查所有 `ROOT:\` 引用文件是否存在
- 检查 `all-units.template` 是否误写了 `[core] name`
- 逐个禁用单位 INI 二分定位

### 6. 多人不同步
- 双方 `.rwmod` 必须完全一致（重新打包后同步分发）
- 不要在联机时热改 INI

## 二分定位法

1. 只保留 `mod-info.txt`，确认模组能加载
2. 逐个加入单位 INI + 贴图，每次校验 + 进游戏验证
3. 出问题的单位单独拎出来，优先检查其引用文件

## 仍未解决？

- 对照官方 Modding Reference 逐键核对
- 参考 `assets/builtin_mods/mega_builders` 的写法
- 在 GitHub 参考仓库（ModEditor / rwTool）中搜索同类问题
