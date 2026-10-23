#pragma once

#include <string>
#include <vector>

#include "types.h"

namespace ek {

enum class TextAlign { Left, Center, Right };

// A queued text run. The web build renders these on top of the uploaded
// framebuffer with the browser's own text engine (crisp glyphs, CJK support);
// the native build only keeps them for layout measurement.
struct TextCmd {
  std::string s;
  float x = 0;
  float y = 0;
  float size = 12;
  Color color{255, 255, 255, 255};
  TextAlign align = TextAlign::Left;
  bool bold = true;
};

namespace platform {

// Measures a UTF-8 string in logical pixels.
float text_width(const std::string& utf8, float size);

// Draws queued text runs over the current frame.
void draw_texts(const std::vector<TextCmd>& cmds);

}  // namespace platform
}  // namespace ek
