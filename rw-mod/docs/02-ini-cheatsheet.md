# 02 — INI 速查表（单位 / 炮塔 / 弹丸 / 移动）

> 复制模板时优先改 `templates/units/*/ *.ini`，本表只做速查。
> 所有键名大小写敏感，冒号后空格可选但建议保留。

## 最小可用单位（陆地）

```ini
[core]
name: mymod_tank
displayText: 我的坦克
displayName: 我的坦克
price: 300
maxHp: 400
mass: 100
radius: 12
techLevel: 1
buildSpeed: 0.02

[graphics]
image: my_tank.png
image_wreak: my_tank_dead.png
image_turret: my_tank_turret.png
total_frames: 1
shadow: 0.8

[attack]
canAttack: true
canAttackLand: true
canAttackAir: false
canAttackWater: false
maxAttackRange: 180
shootDelay: 60

[turret_1]
x: 0
y: -4
projectile: 1

[projectile_1]
damage: 25
life: 90
speed: 6
frame: 0

[movement]
movementType: LAND
moveSpeed: 1.2
acceleration: 0.05
maxTurnSpeed: 3
```

## 关键键说明

### [core]
- `name`：唯一 ID（必填）
- `displayText` / `displayName`：显示名
- `price`：价格
- `maxHp`：生命
- `mass` / `radius`：质量/半径
- `techLevel`：1-3
- `buildSpeed`：建造速度
- `description`：单位描述（多行用 `|` 或按版本换行）
- `altNames`：别名（兼容旧存档/引用）

### [graphics]
- `image`：主体贴图（必填）
- `image_wreak`：残骸
- `image_turret`：炮塔贴图
- `total_frames`：雪碧图帧数
- `scale` / `shadow`：缩放/阴影强度
- `turret_x` / `turret_y`：炮塔锚点（部分版本在 `[turret_N]` 内）

### [attack]
- `canAttack`：是否可攻击
- `canAttackLand` / `canAttackAir` / `canAttackWater`：目标旗
- `maxAttackRange`：最大射程（像素）
- `shootDelay`：射击间隔（帧，60 ≈ 1 秒）

### [turret_N]
- `x` / `y`：炮塔位置偏移
- `projectile`：指向 `[projectile_N]`
- `image`：炮塔贴图（若与主体不同）

### [projectile_N]
- `damage`：伤害
- `life`：存活帧数
- `speed`：速度
- `frame`：贴图帧
- `image`：弹丸贴图（可选）

### [movement]
- `movementType`：`NONE / LAND / BUILDING / AIR / WATER / HOVER / OVER_CLIFF / OVER_CLIFF_WATER`
- `moveSpeed`：移速
- `acceleration`：加速度
- `maxTurnSpeed`：转弯速度
- `canMove`：是否可移动（建筑为 false）

### [action_NAME] / [hiddenAction_NAME]
- 主动技能按钮 / 被动隐藏触发
- 常用：`type: spawnUnit / fireProjectile / giveResource` 等（以 Reference 为准）

### [effect_NAME]
- 特效定义：贴图、持续时间、缩放、颜色等

### [resource_NAME] / [global_resource_NAME]
- 自定义资源：`displayName / max / startAmount` 等

## 常见错误速查

| 现象 | 排查 |
|---|---|
| 单位不出现 | `name` 重复、`techLevel`/`builtFrom` 错误、`mod-info.txt` 缺失 |
| 贴图空白/粉块 | `image` 路径错误、PNG 损坏、尺寸异常 |
| 炮塔不转/不开火 | `[turret_N]` 坐标错误、`projectile` 指向不存在 |
| 移动异常 | `movementType` 拼写错误、速度为 0 |
| 崩溃/黑屏 | 重复键（开 `strictLevel: 1` 定位）、`ROOT:\` 路径错误、帧数越界 |

详见 `04-troubleshooting.md`。
