#!/usr/bin/env python3
"""
将模组文件夹打包为 .rwmod（ZIP 改后缀，纯标准库）

用法：
    python3 rw-mod/tools/pack.py <mod_dir> [-o output.rwmod]

默认输出：<mod_dir>.rwmod（与文件夹同级）
打包后根目录即模组根（含 mod-info.txt），可直接放入游戏 mods/units/
"""
import sys
import zipfile
from pathlib import Path

IGNORE_DIRS = {"__pycache__", ".git", ".venv", "venv"}
IGNORE_SUFFIXES = {".pyc", ".pyo"}


def pack(mod_dir: Path, out: Path):
    mod_dir = mod_dir.resolve()
    if not mod_dir.is_dir():
        print(f"ERROR: 目录不存在: {mod_dir}")
        return 1
    if not (mod_dir / "mod-info.txt").is_file():
        print("WARNING: 未找到 mod-info.txt，确认这是模组根目录")
    out.parent.mkdir(parents=True, exist_ok=True)
    count = 0
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in sorted(mod_dir.rglob("*")):
            if p.is_dir():
                continue
            if any(part in IGNORE_DIRS for part in p.parts):
                continue
            if p.suffix in IGNORE_SUFFIXES:
                continue
            # 跳过自身输出文件（若输出在模组内）
            if p.resolve() == out.resolve():
                continue
            zf.write(p, p.relative_to(mod_dir))
            count += 1
    print(f"已打包 {count} 个文件 -> {out}")
    print(f"安装：将 {out} 复制到游戏 mods/units/ 即可")
    return 0


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    mod_dir = Path(args[0])
    out = None
    if "-o" in args:
        idx = args.index("-o")
        if idx + 1 < len(args):
            out = Path(args[idx + 1])
    if out is None:
        out = mod_dir.with_suffix(".rwmod") if mod_dir.suffix else Path(str(mod_dir) + ".rwmod")
        # with_suffix 会把 "MyMod" -> "MyMod.rwmod"，无后缀时手动加
        if mod_dir.suffix == "":
            out = Path(str(mod_dir) + ".rwmod")
    sys.exit(pack(mod_dir, out))


if __name__ == "__main__":
    main()
