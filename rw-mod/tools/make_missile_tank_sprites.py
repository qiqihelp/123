#!/usr/bin/env python3
"""生成「原版拓展 - 导弹坦克」专属贴图（俯视、透明底、RW 风格）。
用法：python3 rw-mod/tools/make_missile_tank_sprites.py
输出到 rw-mod/mods/原版拓展/导弹坦克/
"""
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent.parent / "mods" / "原版拓展" / "导弹坦克"
OUT.mkdir(parents=True, exist_ok=True)

# 配色：暗色装甲 + 橙色导弹 + 青色灯光，帅气硬朗
TRACK = (22, 24, 28, 255)
TRACK_LINE = (48, 52, 60, 255)
HULL = (43, 52, 64, 255)
HULL_LIGHT = (58, 70, 86, 255)
HULL_DARK = (30, 36, 46, 255)
ACCENT = (255, 140, 40, 255)      # 橙
ACCENT_DARK = (200, 90, 20, 255)
GLOW = (80, 220, 255, 255)        # 青
POD = (36, 42, 52, 255)
POD_LIGHT = (52, 62, 76, 255)
TUBE = (14, 16, 20, 255)
TUBE_RIM = (90, 100, 116, 255)
MISSILE_BODY = (230, 232, 236, 255)
MISSILE_TIP = (255, 120, 30, 255)


def draw_body():
    W, H = 64, 48
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 履带（左右）
    for x0 in (2, 54):
        d.rectangle([x0, 6, x0 + 8, 42], fill=TRACK)
        for y in range(8, 42, 4):
            d.line([x0, y, x0 + 8, y], fill=TRACK_LINE, width=1)
        d.rectangle([x0, 6, x0 + 8, 42], outline=(10, 10, 12, 255), width=1)
    # 车体（前尖后平）
    d.polygon([(14, 8), (50, 8), (54, 16), (54, 40), (10, 40), (10, 16)], fill=HULL)
    d.polygon([(14, 8), (50, 8), (54, 16), (10, 16)], fill=HULL_LIGHT)  # 前装甲
    d.rectangle([10, 38, 54, 40], fill=HULL_DARK)
    # 中线橙条 + 青色灯
    d.rectangle([31, 8, 33, 40], fill=ACCENT_DARK)
    d.rectangle([31, 8, 32, 40], fill=ACCENT)
    d.ellipse([29, 10, 35, 16], fill=GLOW)
    d.ellipse([30, 11, 34, 15], fill=(200, 245, 255, 255))
    # 散热格栅（后部）
    for x in range(16, 48, 4):
        d.line([x, 34, x, 38], fill=HULL_DARK, width=2)
    # 炮塔座（左右双座，炮塔贴图会盖在这里）
    for cx in (20, 44):
        d.ellipse([cx - 7, 12, cx + 7, 26], fill=HULL_DARK)
        d.ellipse([cx - 5, 14, cx + 5, 24], fill=POD)
        d.ellipse([cx - 2, 17, cx + 2, 21], fill=GLOW)
    # 天线 + 细节
    d.line([48, 40, 52, 46], fill=(12, 12, 14, 255), width=1)
    d.ellipse([51, 45, 53, 47], fill=ACCENT)
    d.rectangle([16, 20, 24, 22], fill=ACCENT)
    d.rectangle([40, 20, 48, 22], fill=ACCENT)
    return img


def draw_turret():
    """单侧导弹舱（双炮塔共用，旋转贴图）。"""
    W, H = 30, 30
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = 15, 15
    # 底座
    d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill=HULL_DARK)
    d.ellipse([cx - 9, cy - 9, cx + 9, cy + 9], fill=POD)
    # 舱体（前窄后宽）
    d.polygon([(cx - 6, cy - 10), (cx + 6, cy - 10), (cx + 9, cy + 8), (cx - 9, cy + 8)], fill=POD_LIGHT)
    d.polygon([(cx - 6, cy - 10), (cx + 6, cy - 10), (cx + 7, cy - 6), (cx - 7, cy - 6)], fill=HULL_LIGHT)
    # 4 联导弹管（2x2）
    for dx, dy in [(-5, -6), (1, -6), (-5, 0), (1, 0)]:
        d.rectangle([cx + dx, cy + dy, cx + dx + 5, cy + dy + 5], fill=TUBE, outline=TUBE_RIM, width=1)
        d.ellipse([cx + dx + 1, cy + dy + 1, cx + dx + 4, cy + dy + 4], fill=ACCENT)
    # 橙条 + 青灯
    d.rectangle([cx - 1, cy + 6, cx + 1, cy + 9], fill=ACCENT)
    d.ellipse([cx - 1, cy - 2, cx + 1, cy], fill=GLOW)
    return img


def draw_missile():
    W, H = 16, 16
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # 弹体（朝上）
    d.polygon([(8, 1), (10, 4), (10, 11), (6, 11), (6, 4)], fill=MISSILE_BODY)
    d.polygon([(8, 1), (10, 4), (6, 4)], fill=MISSILE_TIP)
    d.rectangle([6, 7, 10, 9], fill=ACCENT)
    # 尾翼
    d.polygon([(6, 11), (3, 14), (6, 14)], fill=ACCENT_DARK)
    d.polygon([(10, 11), (13, 14), (10, 14)], fill=ACCENT_DARK)
    d.rectangle([6, 11, 10, 13], fill=(120, 126, 136, 255))
    return img


def darken(img, factor=0.45):
    px = img.load()
    w, h = img.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a:
                op[x, y] = (int(r * factor), int(g * factor), int(b * factor), a)
    return out


def main():
    body = draw_body()
    turret = draw_turret()
    missile = draw_missile()
    wreck = darken(body, 0.4)
    body.save(OUT / "missile_tank.png")
    turret.save(OUT / "missile_tank_turret.png")
    wreck.save(OUT / "missile_tank_dead.png")
    missile.save(OUT / "missile.png")
    print(f"已生成贴图 -> {OUT}")
    for f in ["missile_tank.png", "missile_tank_turret.png", "missile_tank_dead.png", "missile.png"]:
        print(f"  - {f} ({(OUT / f).stat().st_size} bytes)")


if __name__ == "__main__":
    main()
