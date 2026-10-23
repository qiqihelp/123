#include "sprite.h"

#include <cstring>

namespace ek {
namespace {

uint32_t pack(Color c) {
  return static_cast<uint32_t>(c.r) | (static_cast<uint32_t>(c.g) << 8) |
         (static_cast<uint32_t>(c.b) << 16) | (static_cast<uint32_t>(c.a) << 24);
}

}  // namespace

Sprite Sprite::from_art(const char* const* rows, int row_count,
                        const std::vector<std::pair<char, Color>>& palette) {
  Sprite s;
  if (row_count <= 0 || rows == nullptr) return s;

  int w = 0;
  for (int y = 0; y < row_count; ++y) {
    int len = static_cast<int>(std::strlen(rows[y]));
    if (len > w) w = len;
  }
  s.w = w;
  s.h = row_count;
  s.px.assign(static_cast<size_t>(w) * row_count, 0);

  for (int y = 0; y < row_count; ++y) {
    const char* row = rows[y];
    int len = static_cast<int>(std::strlen(row));
    for (int x = 0; x < len && x < w; ++x) {
      char ch = row[x];
      if (ch == '.' || ch == ' ') continue;
      for (const auto& entry : palette) {
        if (entry.first == ch) {
          s.px[static_cast<size_t>(y) * w + x] = pack(entry.second);
          break;
        }
      }
    }
  }
  return s;
}

}  // namespace ek
