#pragma once

#include <cstdint>
#include <string>
#include <utility>
#include <vector>

#include "types.h"

namespace ek {

// A small pixel-art sprite. Sprites are built from ASCII art plus a palette
// that maps a character to a colour; '.' is always transparent.
struct Sprite {
  int w = 0;
  int h = 0;
  std::vector<uint32_t> px;

  bool empty() const { return w <= 0 || h <= 0; }

  static Sprite from_art(const char* const* rows, int row_count,
                         const std::vector<std::pair<char, Color>>& palette);
};

}  // namespace ek
