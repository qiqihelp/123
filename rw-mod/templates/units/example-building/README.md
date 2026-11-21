# example-building 模板说明

复制本文件夹到 `mods/<ModName>/units/` 后：

1. 重命名文件夹与 INI
2. 改 `[core] name` 为唯一 ID
3. 放入贴图：`<unit>.png` / `<unit>_dead.png`
4. 建筑保持 `movementType: BUILDING` + `canMove: false`
5. 如需生产/建造功能，参考官方 Reference 的 `[factory]` / `[builder]` / `builtFrom` / `canBuild`
