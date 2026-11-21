#!/usr/bin/env python3
"""
铁锈战争模组静态校验工具（纯标准库）

用法：
    python3 rw-mod/tools/validate.py <mod_dir> [--strict]

检查项：
    - mod-info.txt 存在且含 title / minVersion
    - 每个单位 INI 含必填键（name/maxHp/price/mass/radius/image/canAttack+movementType）
    - [core] name 全局唯一（与原版常见名冲突提示）
    - image / image_wreak / image_turret 等引用文件存在
    - ROOT:\\ 路径指向文件存在
    - [turret_N] projectile 指向存在的 [projectile_N]
    - 重复键（--strict 下为 ERROR，否则 WARNING）
    - builtFrom/canBuild 槽位重复提示（WARNING）
退出码：0 = 通过（无 ERROR），1 = 有 ERROR
"""
import re
import sys
from pathlib import Path

VANILLA_NAMES = {
    "tank", "factory", "builder", "air_factory", "sea_factory",
    "laser_defense", "missile_launcher", "artillery", "helicopter",
    "gunship", "bomber", "submarine", "battleship", "hover_tank",
}

REQUIRED_CORE = ["name", "maxHp", "price", "mass", "radius"]
REQUIRED_GRAPHICS = ["image"]
REQUIRED_MOVEMENT = ["movementType"]
IMAGE_KEYS = ["image", "image_wreak", "image_turret", "image_dead"]
MOVEMENT_TYPES = {"NONE", "LAND", "BUILDING", "AIR", "WATER", "HOVER", "OVER_CLIFF", "OVER_CLIFF_WATER"}


def parse_ini(path: Path):
    """简易 INI 解析：返回 {section: {key: value}} 与重复键列表。"""
    sections = {}
    current = None
    duplicates = []
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception as e:
        return None, [f"无法读取: {e}"]
    for lineno, raw in enumerate(text.splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith(";") or line.startswith("#"):
            continue
        m = re.match(r"^\[(.+)\]\s*$", line)
        if m:
            current = m.group(1).strip()
            sections.setdefault(current, {})
            continue
        if ":" in line and current is not None:
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip()
            if key in sections[current]:
                duplicates.append(f"{path.name}:{lineno} 重复键 [{current}] {key}")
            sections[current][key] = val
    return sections, duplicates


def check_root_ref(mod_root: Path, ref: str):
    """ROOT:\\xxx -> mod_root/xxx"""
    # 统一反斜杠
    rel = ref.replace("ROOT:", "").replace("ROOT:\\", "").lstrip("\\/")
    rel = rel.replace("\\", "/")
    return mod_root / rel


def validate_mod(mod_dir: Path, strict: bool = False):
    errors = []
    warnings = []
    mod_dir = mod_dir.resolve()
    if not mod_dir.is_dir():
        print(f"ERROR: 模组目录不存在: {mod_dir}")
        return 1

    # mod-info.txt
    info_path = mod_dir / "mod-info.txt"
    if not info_path.is_file():
        errors.append("缺少 mod-info.txt（模组根必须有此文件）")
    else:
        info, dups = parse_ini(info_path) if False else (None, [])
        # mod-info.txt 是无 section 的 key: value
        text = info_path.read_text(encoding="utf-8", errors="replace")
        keys = {}
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith(";") or line.startswith("#"):
                continue
            if ":" in line:
                k, _, v = line.partition(":")
                keys[k.strip()] = v.strip()
        if "title" not in keys:
            errors.append("mod-info.txt 缺少 title")
        if "minVersion" not in keys:
            warnings.append("mod-info.txt 缺少 minVersion（建议填如 1.15）")

    # 收集单位 INI
    ini_files = sorted(mod_dir.rglob("*.ini"))
    if not ini_files:
        warnings.append("未找到任何 *.ini 单位文件（检查 units/ 目录）")

    seen_names = {}
    build_slots = {}  # (builtFrom, position) -> unit

    for ini_path in ini_files:
        sections, dups = parse_ini(ini_path)
        if sections is None:
            errors.extend(dups)
            continue
        rel = ini_path.relative_to(mod_dir)
        for d in dups:
            (errors if strict else warnings).append(f"{rel}: {d}")

        # 必填检查
        core = sections.get("core", {})
        graphics = sections.get("graphics", {})
        attack = sections.get("attack", {})
        movement = sections.get("movement", {})

        for k in REQUIRED_CORE:
            if k not in core:
                errors.append(f"{rel}: [core] 缺少必填键 {k}")
        for k in REQUIRED_GRAPHICS:
            if k not in graphics:
                errors.append(f"{rel}: [graphics] 缺少必填键 {k}")
        for k in REQUIRED_MOVEMENT:
            if k not in movement:
                errors.append(f"{rel}: [movement] 缺少必填键 {k}")

        # canAttack + 目标旗
        if "canAttack" not in attack:
            errors.append(f"{rel}: [attack] 缺少 canAttack")
        else:
            flags = [attack.get(f, "") for f in ("canAttackLand", "canAttackAir", "canAttackWater")]
            if attack.get("canAttack", "").lower() == "true" and not any(f.lower() == "true" for f in flags):
                warnings.append(f"{rel}: canAttack=true 但未开启任何目标旗（Land/Air/Water）")

        # movementType 合法性
        mt = movement.get("movementType", "")
        if mt and mt not in MOVEMENT_TYPES:
            errors.append(f"{rel}: movementType 非法: {mt}（应为 {sorted(MOVEMENT_TYPES)} 之一）")

        # name 唯一性
        name = core.get("name", "")
        if name:
            if name in VANILLA_NAMES:
                warnings.append(f"{rel}: name '{name}' 与原版常见单位重名，可能冲突")
            if name in seen_names:
                errors.append(f"{rel}: [core] name 重复: '{name}'（已在 {seen_names[name]} 定义）")
            else:
                seen_names[name] = str(rel)

        # 图片引用存在性（相对 INI 目录）
        for sec_name, sec in sections.items():
            for key in IMAGE_KEYS:
                if key in sec:
                    img = sec[key].strip()
                    if not img or img.startswith("ROOT:"):
                        continue
                    # 去掉可能的引号
                    img = img.strip('"').strip("'")
                    p = (ini_path.parent / img.replace("\\", "/"))
                    if not p.is_file():
                        errors.append(f"{rel}: [{sec_name}] {key} 引用缺失: {img}")

        # ROOT:\ 引用存在性（全文件扫描）
        text = ini_path.read_text(encoding="utf-8", errors="replace")
        for m in re.finditer(r"ROOT:[^\s\"']+", text):
            ref = m.group(0).strip().rstrip(",;")
            target = check_root_ref(mod_dir, ref)
            if not target.is_file():
                errors.append(f"{rel}: ROOT 引用缺失: {ref} -> {target.relative_to(mod_dir) if target.is_relative_to(mod_dir) else target}")

        # turret -> projectile 指向
        turret_secs = [s for s in sections if re.match(r"^turret_\d+$", s)]
        proj_secs = {s for s in sections if re.match(r"^projectile_\d+$", s)}
        for t in turret_secs:
            proj = sections[t].get("projectile", "")
            if proj:
                expected = f"projectile_{proj}"
                if expected not in proj_secs:
                    errors.append(f"{rel}: [{t}] projectile={proj} 指向不存在的 [{expected}]")

        # builtFrom/canBuild 槽位重复（简单提示）
        built_from = core.get("builtFrom", "")
        pos = core.get("position", core.get("buildPosition", ""))
        if built_from and pos:
            key = (built_from, pos)
            if key in build_slots:
                warnings.append(f"{rel}: builtFrom/canBuild 槽位可能冲突: {built_from} @ {pos}（与 {build_slots[key]} 重复）")
            else:
                build_slots[key] = str(rel)

    # all-units.template 存在性提示（不报错）
    if not (mod_dir / "all-units.template").is_file():
        warnings.append("未找到 all-units.template（可选；需要全局资源/特效时建议添加）")

    # 输出
    print(f"校验目录: {mod_dir}")
    print(f"单位 INI: {len(ini_files)} 个，唯一 name: {len(seen_names)} 个")
    if warnings:
        print(f"\nWARNING ({len(warnings)}):")
        for w in warnings:
            print(f"  - {w}")
    if errors:
        print(f"\nERROR ({len(errors)}):")
        for e in errors:
            print(f"  - {e}")
        print("\n结果: 未通过，请修复 ERROR 后重试")
        return 1
    print("\n结果: 通过 ✓")
    return 0


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    strict = "--strict" in sys.argv
    if not args:
        print(__doc__)
        sys.exit(2)
    sys.exit(validate_mod(Path(args[0]), strict=strict))


if __name__ == "__main__":
    main()
