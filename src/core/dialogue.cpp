#include "dialogue.h"

#include "text.h"

namespace ek {
namespace {

constexpr float kCharsPerSecond = 32.0f;
constexpr float kTextSize = 10.0f;

}  // namespace

void Dialogue::start(std::vector<DialogueLine> lines) {
  lines_ = std::move(lines);
  index_ = 0;
  active_ = true;
  finished_ = false;
  char_timer_ = 0.0f;
  shown_chars_ = 0;
  total_chars_ = 0;
  refresh_wrap();
}

void Dialogue::reset() {
  lines_.clear();
  wrapped_.clear();
  index_ = 0;
  active_ = false;
  finished_ = false;
  char_timer_ = 0.0f;
  shown_chars_ = 0;
  total_chars_ = 0;
}

void Dialogue::refresh_wrap() {
  wrapped_.clear();
  if (index_ >= lines_.size()) return;
  wrapped_ = wrap_text(lines_[index_].text, wrap_width_, kTextSize);
  total_chars_ = 0;
  for (const std::string& line : wrapped_) {
    total_chars_ += static_cast<int>(split_utf8(line).size());
  }
}

void Dialogue::update(const InputState& in, float dt) {
  if (!active_ || lines_.empty()) return;

  if (shown_chars_ < total_chars_) {
    char_timer_ += dt * kCharsPerSecond;
    while (char_timer_ >= 1.0f && shown_chars_ < total_chars_) {
      char_timer_ -= 1.0f;
      ++shown_chars_;
    }
  }

  if (!in.is_pressed(Key::Z)) return;

  if (shown_chars_ < total_chars_) {
    shown_chars_ = total_chars_;
    char_timer_ = 0.0f;
    return;
  }

  ++index_;
  if (index_ >= lines_.size()) {
    active_ = false;
    finished_ = true;
    return;
  }
  shown_chars_ = 0;
  char_timer_ = 0.0f;
  refresh_wrap();
}

void Dialogue::draw(Canvas& c, const Rect& box, bool draw_frame) const {
  if (lines_.empty() || index_ >= lines_.size()) return;

  if (draw_frame) {
    c.fill_rect(box.x, box.y, box.w, box.h, palette::Black);
    c.draw_frame(box.x, box.y, box.w, box.h, 1.0f, palette::White);
  }

  const DialogueLine& line = lines_[index_];
  if (!line.speaker.empty()) {
    c.text(line.speaker, box.x + 8, box.y + 6, kTextSize, palette::Yellow);
  }

  float y = box.y + (line.speaker.empty() ? 10.0f : 24.0f);
  int remaining = shown_chars_;
  for (const std::string& wrapped : wrapped_) {
    if (remaining <= 0) break;
    std::vector<std::string> chars = split_utf8(wrapped);
    int take = std::min<int>(remaining, static_cast<int>(chars.size()));
    std::string visible;
    for (int i = 0; i < take; ++i) visible += chars[i];
    remaining -= take;
    c.text(visible, box.x + 8, y, kTextSize, palette::White);
    y += 14.0f;
  }
}

}  // namespace ek
