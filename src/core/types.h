#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <string>

namespace ek {

struct Vec2 {
  float x = 0, y = 0;
};

inline Vec2 operator+(Vec2 a, Vec2 b) { return {a.x + b.x, a.y + b.y}; }
inline Vec2 operator-(Vec2 a, Vec2 b) { return {a.x - b.x, a.y - b.y}; }
inline Vec2 operator*(Vec2 a, float s) { return {a.x * s, a.y * s}; }

struct Rect {
  float x = 0, y = 0, w = 0, h = 0;

  bool contains(Vec2 p) const {
    return p.x >= x && p.x <= x + w && p.y >= y && p.y <= y + h;
  }
  bool overlaps(const Rect& o) const {
    return x < o.x + o.w && x + w > o.x && y < o.y + o.h && y + h > o.y;
  }
  Rect inset(float d) const { return {x + d, y + d, w - 2 * d, h - 2 * d}; }
  Vec2 center() const { return {x + w * 0.5f, y + h * 0.5f}; }
};

struct Color {
  uint8_t r = 255, g = 255, b = 255, a = 255;

  constexpr Color() = default;
  constexpr Color(uint8_t rr, uint8_t gg, uint8_t bb, uint8_t aa = 255)
      : r(rr), g(gg), b(bb), a(aa) {}
};

namespace palette {
constexpr Color Black{0, 0, 0, 255};
constexpr Color White{255, 255, 255, 255};
constexpr Color Bone{240, 240, 230, 255};
constexpr Color Gray{128, 128, 128, 255};
constexpr Color DarkGray{58, 58, 66, 255};
constexpr Color Red{230, 40, 55, 255};
constexpr Color DarkRed{150, 20, 30, 255};
constexpr Color Pink{255, 120, 180, 255};
constexpr Color Blue{60, 110, 210, 255};
constexpr Color DarkBlue{30, 55, 120, 255};
constexpr Color Cyan{120, 220, 245, 255};
constexpr Color Green{70, 200, 120, 255};
constexpr Color DarkGreen{30, 110, 70, 255};
constexpr Color Yellow{255, 225, 90, 255};
constexpr Color Orange{240, 150, 60, 255};
constexpr Color Purple{150, 90, 230, 255};
constexpr Color Brown{140, 96, 60, 255};
constexpr Color Wood{196, 148, 96, 255};
constexpr Color WoodDark{150, 106, 64, 255};
constexpr Color Floor{46, 33, 27, 255};
constexpr Color FloorDark{36, 25, 20, 255};
constexpr Color Rug{120, 50, 70, 255};
constexpr Color RugDark{92, 36, 54, 255};
}  // namespace palette

inline float clampf(float v, float lo, float hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}
inline float lerpf(float a, float b, float t) { return a + (b - a) * t; }

}  // namespace ek
