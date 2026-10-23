#pragma once

#include <cstdint>
#include <vector>

#include "platform.h"
#include "sprite.h"
#include "types.h"

namespace ek {

// Software framebuffer. Pixels are stored as 0xAABBGGRR so that the raw bytes
// are already in R,G,B,A order and can be handed straight to a canvas
// ImageData object on the web.
class Canvas {
 public:
  Canvas(int w, int h);

  int width() const { return w_; }
  int height() const { return h_; }
  uint32_t* data() { return px_.data(); }
  const uint32_t* data() const { return px_.data(); }

  void clear(Color c);
  void set_px(int x, int y, Color c);
  void fill_rect(float x, float y, float w, float h, Color c);
  void draw_rect(float x, float y, float w, float h, Color c);
  void draw_frame(float x, float y, float w, float h, float thickness, Color c);
  void draw_circle(float cx, float cy, float r, Color c);
  void blit(const Sprite& s, float x, float y, float scale = 1.0f, bool flip_x = false);
  // Draws a sprite whose pixels are replaced by a flat colour (used for
  // flashing / silhouettes).
  void blit_solid(const Sprite& s, float x, float y, float scale, Color c, bool flip_x = false);
  // Shifts the pixel buffer, used for the screen shake on hit.
  void scroll(int dx, int dy);
  // Queues a text run; text is rendered on top of the framebuffer by the
  // platform layer.
  void text(const std::string& s, float x, float y, float size, Color c,
            TextAlign align = TextAlign::Left, bool bold = true);

  const std::vector<TextCmd>& texts() const { return texts_; }

 private:
  int w_, h_;
  std::vector<uint32_t> px_;
  std::vector<TextCmd> texts_;
};

}  // namespace ek
