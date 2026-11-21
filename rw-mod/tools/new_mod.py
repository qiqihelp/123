#!/usr/bin/env python3
"""
一键脚手架新模组（纯标准库）

用法：
    python3 rw-mod/tools/new_mod.py <ModName> [--title "标题"] [--description "简介"] [--with-example]

生成 rw-mod/mods/<ModName>/，含 mod-info.txt + all-units.template + units/ 空目录
--with-example 时额外复制 example-tank 模板
"""
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve()
RW_MOD = HERE.parent.parent
TEMPLATES = RW_MOD / "templates"
MODS = RW_MOD / "mods"


def scaffold(name: str, title: str = "", description: str = "", with_example: bool = False):
    if not name or "/" in name or "\\" in name:
        print("ERROR: ModName 不能为空且不能含路径分隔符")
        return 1
    dest = MODS / name
    if dest.exists():
        print(f"ERROR: 已存在: {dest}")
        return 1
    dest.mkdir(parents=True)
    (dest / "units").mkdir()
    (dest / "sprites").mkdir()
    (dest / "sounds").mkdir()

    title = title or name
    description = description or "一句话简介你的模组"
    info = (
        f"title: {title}\n"
        f"description: {description}\n"
        "minVersion: 1.15\n"
        "tags: units\n"
        "thumbnail: mod-thumbnail.png\n"
    )
    (dest / "mod-info.txt").write_text(info, encoding="utf-8")

    tmpl = TEMPLATES / "all-units.template"
    if tmpl.is_file():
        shutil.copy2(tmpl, dest / "all-units.template")

    if with_example:
        src = TEMPLATES / "units" / "example-tank"
        if src.is_dir():
            shutil.copytree(src, dest / "units" / "example-tank")
            print("已复制 example-tank 模板到 units/example-tank/")

    print(f"已创建模组骨架: {dest}")
    print("下一步：")
    print(f"  1. 编辑 {dest / 'mod-info.txt'}")
    print(f"  2. 在 units/ 下添加单位 INI + 贴图（可复制 templates/units/ 下模板）")
    print(f"  3. python3 rw-mod/tools/validate.py {dest}")
    print(f"  4. python3 rw-mod/tools/pack.py {dest}")
    return 0


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    name = args[0]
    title = ""
    description = ""
    with_example = "--with-example" in args
    if "--title" in args:
        i = args.index("--title")
        if i + 1 < len(args):
            title = args[i + 1]
    if "--description" in args:
        i = args.index("--description")
        if i + 1 < len(args):
            description = args[i + 1]
    sys.exit(scaffold(name, title, description, with_example))


if __name__ == "__main__":
    main()
