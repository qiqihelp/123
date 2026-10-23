#pragma once

namespace ek {

enum class Key {
  Left = 0,
  Right,
  Up,
  Down,
  Z,
  X,
  Shift,
  Count
};

inline constexpr int kKeyCount = static_cast<int>(Key::Count);

struct InputState {
  bool held[kKeyCount] = {false};
  bool pressed[kKeyCount] = {false};

  bool is_held(Key k) const { return held[static_cast<int>(k)]; }
  bool is_pressed(Key k) const { return pressed[static_cast<int>(k)]; }

  void end_frame() {
    for (int i = 0; i < kKeyCount; ++i) pressed[i] = false;
  }
};

}  // namespace ek
