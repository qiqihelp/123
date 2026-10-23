#pragma once

#include <cstdint>
#include <vector>

#include "platform.h"

namespace ek {
namespace web {

// Prepares the visible canvas and the offscreen buffer used to upload frames.
void init_canvas(int width, int height, int scale);

// Uploads a frame and draws the queued text on top of it.
void present(const uint32_t* pixels, const std::vector<TextCmd>& cmds);

}  // namespace web
}  // namespace ek
