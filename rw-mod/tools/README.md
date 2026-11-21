# 工具说明

全部为 Python 3.8+ 标准库脚本，无需 `pip install`。

| 脚本 | 用途 | 示例 |
|---|---|---|
| `validate.py` | 静态校验模组 | `python3 rw-mod/tools/validate.py rw-mod/mods/MyMod --strict` |
| `pack.py` | 打包为 `.rwmod` | `python3 rw-mod/tools/pack.py rw-mod/mods/MyMod` |
| `unpack.py` | 解包 `.rwmod`/zip | `python3 rw-mod/tools/unpack.py pack.rwmod -o /tmp/out` |
| `new_mod.py` | 新建模组骨架 | `python3 rw-mod/tools/new_mod.py MyMod --with-example` |

校验退出码：`0` 通过，`1` 有 ERROR。`--strict` 下重复键也算 ERROR。
