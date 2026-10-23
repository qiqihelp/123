#include "text.h"

#include "platform.h"

namespace ek {

std::vector<std::string> split_utf8(const std::string& s) {
  std::vector<std::string> out;
  size_t i = 0;
  while (i < s.size()) {
    unsigned char c = static_cast<unsigned char>(s[i]);
    size_t len = 1;
    if ((c & 0x80u) == 0x00u) {
      len = 1;
    } else if ((c & 0xE0u) == 0xC0u) {
      len = 2;
    } else if ((c & 0xF0u) == 0xE0u) {
      len = 3;
    } else if ((c & 0xF8u) == 0xF0u) {
      len = 4;
    }
    if (i + len > s.size()) len = 1;
    out.push_back(s.substr(i, len));
    i += len;
  }
  return out;
}

std::vector<std::string> wrap_text(const std::string& s, float max_width, float size) {
  std::vector<std::string> lines;
  std::vector<std::string> chars = split_utf8(s);

  std::string current;
  float width = 0.0f;
  for (const std::string& ch : chars) {
    if (ch == "\n") {
      lines.push_back(current);
      current.clear();
      width = 0.0f;
      continue;
    }
    float w = platform::text_width(ch, size);
    if (width + w > max_width && !current.empty()) {
      lines.push_back(current);
      current.clear();
      width = 0.0f;
    }
    current += ch;
    width += w;
  }
  lines.push_back(current);
  return lines;
}

}  // namespace ek
