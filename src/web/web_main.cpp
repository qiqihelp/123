#include <emscripten/emscripten.h>

#include "canvas.h"
#include "game.h"
#include "input.h"
#include "web_platform.h"

namespace {

constexpr int kWidth = 480;
constexpr int kHeight = 270;
constexpr int kScale = 2;
constexpr float kMaxStep = 0.1f;

ek::Game g_game(kWidth, kHeight);
ek::Canvas g_canvas(kWidth, kHeight);
ek::InputState g_input;

}  // namespace

extern "C" {

EM_JS(void, ek_js_bind_input, (), {
  window.__ekDown = 0;
  window.__ekPressed = 0;
  const map = {
    ArrowLeft: 1, ArrowRight: 2, ArrowUp: 4, ArrowDown: 8,
    KeyZ: 16, Enter: 16, Space: 16, NumpadEnter: 16,
    KeyX: 32, Escape: 32, Backspace: 32,
    ShiftLeft: 64, ShiftRight: 64
  };
  const apply = (code, down) => {
    const bit = map[code];
    if (!bit) return;
    if (down) {
      if (!(window.__ekDown & bit)) window.__ekPressed |= bit;
      window.__ekDown |= bit;
    } else {
      window.__ekDown &= ~bit;
    }
  };
  window.addEventListener('keydown', (e) => {
    apply(e.code, 1);
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].indexOf(e.code) >= 0) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => apply(e.code, 0));
  window.addEventListener('blur', () => {
    window.__ekDown = 0;
  });
  const canvas = document.getElementById('game');
  if (canvas) {
    canvas.setAttribute('tabindex', '0');
    canvas.focus();
  }
});

EM_JS(int, ek_js_held, (), { return window.__ekDown | 0; });

EM_JS(int, ek_js_pressed, (), { return window.__ekPressed | 0; });

EM_JS(void, ek_js_clear_pressed, (), { window.__ekPressed = 0; });

}  // extern "C"

namespace {

void poll_input() {
  const int held = ek_js_held();
  const int pressed = ek_js_pressed();
  ek_js_clear_pressed();
  for (int i = 0; i < ek::kKeyCount; ++i) {
    g_input.held[i] = ((held >> i) & 1) != 0;
    g_input.pressed[i] = ((pressed >> i) & 1) != 0;
  }
}

void frame() {
  // Use the real elapsed time instead of a fixed step so that the game keeps
  // the right speed even when the browser throttles requestAnimationFrame
  // (background tabs, low power mode, ...).
  static double last = emscripten_get_now();
  const double now = emscripten_get_now();
  float dt = static_cast<float>((now - last) / 1000.0);
  last = now;
  if (dt < 0.0f) dt = 0.0f;
  if (dt > kMaxStep) dt = kMaxStep;

  poll_input();
  g_game.update(g_input, dt);
  g_game.draw(g_canvas);
  ek::web::present(g_canvas.data(), g_canvas.texts());
}

}  // namespace

int main() {
  ek::web::init_canvas(kWidth, kHeight, kScale);
  ek_js_bind_input();
  emscripten_set_main_loop(frame, 0, 0);
  return 0;
}
