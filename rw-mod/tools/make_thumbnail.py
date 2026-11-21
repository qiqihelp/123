#!/usr/bin/env python3
"""生成「原版拓展」模组缩略图 mod-thumbnail.png（320x180，无文字，纯绘制）。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "mods" / "原版拓展" / "mod-thumbnail.png"
W, H = 320, 180

img = Image.new("RGBA", (W, H), (10, 12, 18, 255))
d = ImageDraw.Draw(img)

# 背景：对角渐变 + 速度线条（帅气）
for i in range(H):
    t = i / H
    r = int(16 + 34 * t)
    g = int(18 + 22 * t)
    b = int(30 + 10 * t)
    d.line([(0, i), (W, i)], fill=(r, g, b, 255))
for i in range(-H, W, 18):
    d.line([(i, H), (i + H, 0)], fill=(24, 28, 40, 255), width=6)

# 远景火光
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow)
gd.ellipse([W - 120, -40, W + 60, 80], fill=(255, 140, 40, 90))
gd.ellipse([-60, H - 80, 90, H + 60], fill=(80, 200, 255, 60))
glow = glow.filter(ImageFilter.GaussianBlur(18))
img = Image.alpha_composite(img, glow)
d = ImageDraw.Draw(img)

# 地面阴影
d.ellipse([60, 128, 260, 152], fill=(0, 0, 0, 110))

# 放大绘制坦克（俯视，横向摆放）
sx, sy, scale = 160, 105, 2.6
def px(x, y):
    return (sx + (x - 32) * scale, sy + (y - 24) * scale)
def poly(points, fill, outline=None):
    d.polygon([px(x, y) for x, y in points], fill=fill, outline=outline)

TRACK = (22, 24, 28, 255); TRACK_LINE = (48, 52, 60, 255)
HULL = (43, 52, 64, 255); HULL_LIGHT = (58, 70, 86, 255); HULL_DARK = (30, 36, 46, 255)
ACCENT = (255, 140, 40, 255); ACCENT_DARK = (200, 90, 20, 255); GLOW = (80, 220, 255, 255)
POD = (36, 42, 52, 255); POD_LIGHT = (52, 62, 76, 255)
TUBE = (14, 16, 20, 255); TUBE_RIM = (90, 100, 116, 255)

# 履带
for x0 in (2, 54):
    poly([(x0, 6), (x0 + 8, 6), (x0 + 8, 42), (x0, 42)], TRACK)
    for y in range(8, 42, 4):
        x_a, y_a = px(x0, y); x_b, y_b = px(x0 + 8, y)
        d.line([x_a, y_a, x_b, y_b], fill=TRACK_LINE, width=1)
# 车体前尖
poly([(14, 8), (50, 8), (54, 16), (54, 40), (10, 40), (10, 16)], HULL)
poly([(14, 8), (50, 8), (54, 16), (10, 16)], HULL_LIGHT)
poly([(10, 38), (54, 38), (54, 40), (10, 40)], HULL_DARK)
# 中线橙条 + 青灯
poly([(31, 8), (33, 8), (33, 40), (31, 40)], ACCENT)
cx, cy = px(32, 13)
r = 6 * scale / 2.6
d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GLOW)
# 双导弹舱（俯视放大）
for ccx in (20, 44):
    cx, cy = px(ccx, 19); r = 11 * scale
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=HULL_DARK)
    r2 = 9 * scale
    d.ellipse([cx - r2, cy - r2, cx + r2, cy + r2], fill=POD)
    poly([(ccx - 6, 9), (ccx + 6, 9), (ccx + 9, 27), (ccx - 9, 27)], POD_LIGHT)
    for dx, dy in [(-5, 13), (1, 13), (-5, 19), (1, 19)]:
        p0 = px(ccx + dx, dy); p1 = px(ccx + dx + 5, dy + 5)
        d.rectangle([p0, p1], fill=TUBE, outline=TUBE_RIM, width=1)
        icx, icy = px(ccx + dx + 2.5, dy + 2.5)
        d.ellipse([icx - 2.4, icy - 2.4, icx + 2.4, icy + 2.4], fill=ACCENT)

# 导弹尾迹（帅气！）
for i in range(3):
    y = 40 + i * 8
    alpha = 200 - i * 70
    d.arc([200 + i * 14, y - 30, 320 + i * 14, y + 10], 200, 320, fill=(255, 200, 120, alpha), width=2)

img.save(OUT)
print(f"缩略图已生成 -> {OUT}")
