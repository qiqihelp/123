# example-tank 模板说明

复制本文件夹到 `mods/<ModName>/units/` 后：

1. 重命名文件夹与 INI（如 `my_tank/` + `my_tank.ini`）
2. 改 `[core] name` 为唯一 ID（如 `mymod_tank`）
3. 放入贴图：`my_tank.png` / `my_tank_turret.png` / `my_tank_dead.png`
4. 按需调整数值（价格/生命/射程/移速）
5. 运行 `python3 rw-mod/tools/validate.py rw-mod/mods/<ModName>`
