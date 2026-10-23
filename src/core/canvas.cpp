#include "canvas.h"

#include <cmath>

namespace ek {
namespace {

uint32_t pack(Color c) {
  return static_cast<uint32_t>(c.r) | (static_cast<uint32_t>(c.g) << 8) |
         (static_cast<uint32_t>(c.b) << 16) | (static_cast<uint32_t>(c.a) << 24);
}

}  // namespace

Canvas::Canvas(int w, int h) : w_(w), h_(h) {
  px_.assign(static_cast<size_t>(w) * h, 0);
}

void Canvas::clear(Color c) {
  uint32_t v = pack(c);
  for (auto& p : px_) p = v;
  texts_.clear();
}

void Canvas::text(const std::string& s, float x, float y, float size, Color c,
                  TextAlign align, bool bold) {
  TextCmd cmd;
  cmd.s = s;
  cmd.x = x;
  cmd.y = y;
  cmd.size = size;
  cmd.color = c;
  cmd.align = align;
  cmd.bold = bold;
  texts_.push_back(std::move(cmd));
}

void Canvas::set_px(int x, int y, Color c) {
  if (x < 0 || y < 0 || x >= w_ || y >= h_) return;
  px_[static_cast<size_t>(y) * w_ + x] = pack(c);
}

void Canvas::fill_rect(float x, float y, float w, float h, Color c) {
  int x0 = static_cast<int>(std::floor(x));
  int y0 = static_cast<int>(std::floor(y));
  int x1 = static_cast<int>(std::ceil(x + w));
  int y1 = static_cast<int>(std::ceil(y + h));
  const uint32_t v = pack(c);
  const bool opaque = c.a >= 255;
  for (int py = y0; py < y1; ++py) {
    if (py < 0 || py >= h_) continue;
    for (int px = x0; px < x1; ++px) {
      if (px < 0 || px >= w_) continue;
      uint32_t& dst = px_[static_cast<size_t>(py) * w_ + px];
      if (opaque) {
        dst = v;
      } else {
        uint32_t a = static_cast<uint32_t>(c.a);
        uint32_t sr = v & 0xFFu, sg = (v >> 8) & 0xFFu, sb = (v >> 16) & 0xFFu;
        uint32_t dr = dst & 0xFFu, dg = (dst >> 8) & 0xFFu, db = (dst >> 16) & 0xFFu;
        uint32_t r = (sr * a + dr * (255u - a)) / 255u;
        uint32_t g = (sg * a + dg * (255u - a)) / 255u;
        uint32_t b = (sb * a + db * (255u - a)) / 255u;
        dst = r | (g << 8) | (b << 16) | 0xFF000000u;
      }
    }
  }
}

void Canvas::draw_rect(float x, float y, float w, float h, Color c) {
  fill_rect(x, y, w, 1, c);
  fill_rect(x, y + h - 1, w, 1, c);
  fill_rect(x, y, 1, h, c);
  fill_rect(x + w - 1, y, 1, h, c);
}

void Canvas::draw_frame(float x, float y, float w, float h, float thickness, Color c) {
  fill_rect(x, y, w, thickness, c);
  fill_rect(x, y + h - thickness, w, thickness, c);
  fill_rect(x, y, thickness, h, c);
  fill_rect(x + w - thickness, y, thickness, h, c);
}

void Canvas::draw_circle(float cx, float cy, float r, Color c) {
  uint32_t v = pack(c);
  int r2 = static_cast<int>(std::ceil(r));
  for (int dy = -r2; dy <= r2; ++dy) {
    for (int dx = -r2; dx <= r2; ++dx) {
      float d = std::sqrt(static_cast<float>(dx * dx + dy * dy));
      if (d <= r) {
        int px = static_cast<int>(cx) + dx;
        int py = static_cast<int>(cy) + dy;
        if (px < 0 || py < 0 || px >= w_ || py >= h_) continue;
        px_[static_cast<size_t>(py) * w_ + px] = v;
      }
    }
  }
}

void Canvas::blit(const Sprite& s, float x, float y, float scale, bool flip_x) {
  if (s.empty()) return;
  int sx = static_cast<int>(std::floor(x));
  int sy = static_cast<int>(std::floor(y));
  int step = static_cast<int>(scale) > 0 ? static_cast<int>(scale) : 1;
  for (int py = 0; py < s.h; ++py) {
    for (int px = 0; px < s.w; ++px) {
      uint32_t v = s.px[static_cast<size_t>(py) * s.w + px];
      if ((v & 0xFF000000u) == 0) continue;
      int dx = flip_x ? (s.w - 1 - px) : px;
      for (int oy = 0; oy < step; ++oy) {
        for (int ox = 0; ox < step; ++ox) {
          int tx = sx + dx * step + ox;
          int ty = sy + py * step + oy;
          if (tx < 0 || ty < 0 || tx >= w_ || ty >= h_) continue;
          px_[static_cast<size_t>(ty) * w_ + tx] = v;
        }
      }
    }
  }
}

void Canvas::blit_solid(const Sprite& s, float x, float y, float scale, Color c, bool flip_x) {
  if (s.empty()) return;
  int sx = static_cast<int>(std::floor(x));
  int sy = static_cast<int>(std::floor(y));
  int step = static_cast<int>(scale) > 0 ? static_cast<int>(scale) : 1;
  uint32_t v = pack(c);
  for (int py = 0; py < s.h; ++py) {
    for (int px = 0; px < s.w; ++px) {
      uint32_t src = s.px[static_cast<size_t>(py) * s.w + px];
      if ((src & 0xFF000000u) == 0) continue;
      int dx = flip_x ? (s.w - 1 - px) : px;
      for (int oy = 0; oy < step; ++oy) {
        for (int ox = 0; ox < step; ++ox) {
          int tx = sx + dx * step + ox;
          int ty = sy + py * step + oy;
          if (tx < 0 || ty < 0 || tx >= w_ || ty >= h_) continue;
          px_[static_cast<size_t>(ty) * w_ + tx] = v;
        }
      }
    }
  }
}

}  // namespace ek
