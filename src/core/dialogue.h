#pragma once

#include <string>
#include <vector>

#include "canvas.h"
#include "input.h"
#include "types.h"

namespace ek {

struct DialogueLine {
  std::string speaker;
  std::string text;
};

// A typewriter-style dialogue box: text appears character by character and
// Z/Enter advances (or skips the animation) to the next line.
class Dialogue {
 public:
  void start(std::vector<DialogueLine> lines);
  void update(const InputState& in, float dt);
  void draw(Canvas& c, const Rect& box, bool draw_frame = true) const;

  // Usable text width used when wrapping lines.
  void set_wrap_width(float w) { wrap_width_ = w; }

  bool active() const { return active_; }
  bool finished() const { return finished_; }
  void reset();

 private:
  void refresh_wrap();

  std::vector<DialogueLine> lines_;
  std::vector<std::string> wrapped_;
  float wrap_width_ = 240.0f;
  size_t index_ = 0;
  bool active_ = false;
  bool finished_ = false;
  float char_timer_ = 0.0f;
  int shown_chars_ = 0;
  int total_chars_ = 0;
};

}  // namespace ek
