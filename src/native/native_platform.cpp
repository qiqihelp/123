#include "platform.h"

#include "text.h"

namespace ek {
namespace platform {
namespace {

bool is_wide(const std::string& ch) {
  return !ch.empty() && (static_cast<unsigned char>(ch[0]) & 0xE0u) == 0xE0u;
}

}  // namespace

// Headless build: text is measured with an approximation so that dialogue
// wrapping still behaves sensibly, but nothing is rendered.
float text_width(const std::string& utf8, float size) {
  float width = 0.0f;
  for (const std::string& ch : split_utf8(utf8)) {
    width += is_wide(ch) ? size : size * 0.55f;
  }
  return width;
}

void draw_texts(const std::vector<TextCmd>& cmds) {
  (void)cmds;
}

}  // namespace platform
}  // namespace ek
