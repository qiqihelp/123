#pragma once

#include <string>
#include <vector>

namespace ek {

// Splits a UTF-8 string into individual code points (each element keeps its
// original UTF-8 bytes so that multi-byte characters survive round-trips).
std::vector<std::string> split_utf8(const std::string& s);

// Greedy word wrap. Explicit '\n' always starts a new line.
std::vector<std::string> wrap_text(const std::string& s, float max_width, float size);

}  // namespace ek
