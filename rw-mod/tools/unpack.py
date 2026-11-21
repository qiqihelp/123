#!/usr/bin/env python3
"""
解包 .rwmod / zip 素材包（纯标准库）

用法：
    python3 rw-mod/tools/unpack.py <archive.rwmod|zip> [-o out_dir]

默认输出：./<archive_stem>_unpacked/
解包后用 validate.py 校验，再归入 mods/<ModName>/
"""
import sys
import zipfile
from pathlib import Path


def unpack(archive: Path, out: Path):
    archive = archive.resolve()
    if not archive.is_file():
        print(f"ERROR: 文件不存在: {archive}")
        return 1
    if zipfile.is_zipfile(archive):
        out.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(archive, "r") as zf:
            zf.extractall(out)
            names = zf.namelist()
        print(f"已解包 {len(names)} 个条目 -> {out}")
        for n in names[:50]:
            print(f"  - {n}")
        if len(names) > 50:
            print(f"  ... 另有 {len(names) - 50} 个")
        print(f"\n下一步：python3 rw-mod/tools/validate.py {out}")
        return 0
    print(f"ERROR: 不是有效的 zip/.rwmod: {archive}")
    return 1


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    archive = Path(args[0])
    out = None
    if "-o" in args:
        idx = args.index("-o")
        if idx + 1 < len(args):
            out = Path(args[idx + 1])
    if out is None:
        stem = archive.stem
        out = Path(f"{stem}_unpacked")
    sys.exit(unpack(archive, out))


if __name__ == "__main__":
    main()
