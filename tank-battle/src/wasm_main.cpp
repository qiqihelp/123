#include "tank_core.hpp"

#include <emscripten.h>
#include <emscripten/html5.h>

namespace {

tank::TankGame g_game;
tank::InputState g_input;
double g_lastTime = 0.0;
bool g_prevPause = false;
bool g_prevConfirm = false;

EM_JS(void, js_blit_rgba, (const uint8_t* ptr, int w, int h), {
    if (!window._tankCtx) {
        const canvas = document.getElementById('tankCanvas');
        if (!canvas) return;
        canvas.width = w;
        canvas.height = h;
        window._tankCtx = canvas.getContext('2d');
        window._tankImg = window._tankCtx.createImageData(w, h);
    }
    const len = w * h * 4;
    const src = HEAPU8.subarray(ptr, ptr + len);
    window._tankImg.data.set(src);
    window._tankCtx.putImageData(window._tankImg, 0, 0);
});

void mainLoop() {
    double now = emscripten_get_now() * 0.001;
    float dt = (g_lastTime > 0.0) ? static_cast<float>(now - g_lastTime) : (1.0f / 60.0f);
    g_lastTime = now;

    tank::InputState frameInput = g_input;
    frameInput.pausePressed = g_input.pausePressed && !g_prevPause;
    frameInput.confirmPressed = g_input.confirmPressed && !g_prevConfirm;
    g_prevPause = g_input.pausePressed;
    g_prevConfirm = g_input.confirmPressed;

    g_game.update(dt, frameInput);
    g_game.render();
    js_blit_rgba(g_game.framebufferRGBA(), g_game.width(), g_game.height());
}

} // namespace

extern "C" {

EMSCRIPTEN_KEEPALIVE
void tank_set_input(int up, int down, int left, int right, int fire, int pauseKey, int confirmKey) {
    g_input.up = up != 0;
    g_input.down = down != 0;
    g_input.left = left != 0;
    g_input.right = right != 0;
    g_input.fire = fire != 0;
    g_input.pausePressed = pauseKey != 0;
    g_input.confirmPressed = confirmKey != 0;
}

EMSCRIPTEN_KEEPALIVE
void tank_start_new_game() {
    g_game.startNewGame();
}

EMSCRIPTEN_KEEPALIVE
int tank_get_score() {
    return g_game.snapshot().score;
}

} // extern "C"

int main() {
    g_game.resetAll();
    g_lastTime = emscripten_get_now() * 0.001;
    emscripten_set_main_loop(mainLoop, 60, 1);
    return 0;
}
