#include "web_platform.h"

#include <emscripten/emscripten.h>

// The font stack is resolved by the browser; CJK glyphs fall back to whatever
// system font is available.
extern "C" {

EM_JS(void, ek_js_init, (int width, int height, int scale), {
  const canvas = document.getElementById('game');
  if (!canvas) {
    console.error('ECHOFALL: #game canvas not found');
    return;
  }
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const off = document.createElement('canvas');
  off.width = width;
  off.height = height;
  const octx = off.getContext('2d');
  window.__ek = { ctx: ctx, off: off, octx: octx, w: width, h: height, scale: scale };
  window.__ekFont =
      '"Courier New", "Noto Sans Mono CJK SC", "Microsoft YaHei", "PingFang SC", ' +
      '"WenQuanYi Micro Hei", monospace';
});

EM_JS(void, ek_js_present, (const unsigned int* pixels), {
  const e = window.__ek;
  if (!e) return;
  const img = e.octx.createImageData(e.w, e.h);
  img.data.set(HEAPU8.subarray(pixels, pixels + e.w * e.h * 4));
  e.octx.putImageData(img, 0, 0);
  e.ctx.imageSmoothingEnabled = false;
  e.ctx.clearRect(0, 0, e.w * e.scale, e.h * e.scale);
  e.ctx.drawImage(e.off, 0, 0, e.w * e.scale, e.h * e.scale);
});

EM_JS(float, ek_js_measure, (const char* text, float size), {
  const e = window.__ek;
  if (!e) return 0;
  e.ctx.font = 'bold ' + (size * e.scale) + 'px ' + window.__ekFont;
  return e.ctx.measureText(UTF8ToString(text)).width / e.scale;
});

EM_JS(void, ek_js_text, (const char* text, float x, float y, float size, int r, int g, int b,
                         int align, int bold), {
  const e = window.__ek;
  if (!e) return;
  const ctx = e.ctx;
  ctx.save();
  ctx.font = (bold ? 'bold ' : '') + (size * e.scale) + 'px ' + window.__ekFont;
  ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
  ctx.textBaseline = 'top';
  const s = UTF8ToString(text);
  const w = ctx.measureText(s).width;
  let px = x * e.scale;
  if (align === 1) px -= w * 0.5;
  else if (align === 2) px -= w;
  ctx.fillText(s, px, y * e.scale);
  ctx.restore();
});

}  // extern "C"

namespace ek {
namespace web {

void init_canvas(int width, int height, int scale) {
  ek_js_init(width, height, scale);
}

void present(const uint32_t* pixels, const std::vector<TextCmd>& cmds) {
  ek_js_present(pixels);
  for (const TextCmd& cmd : cmds) {
    int align = 0;
    if (cmd.align == TextAlign::Center) align = 1;
    else if (cmd.align == TextAlign::Right) align = 2;
    ek_js_text(cmd.s.c_str(), cmd.x, cmd.y, cmd.size, cmd.color.r, cmd.color.g, cmd.color.b,
               align, cmd.bold ? 1 : 0);
  }
}

}  // namespace web

namespace platform {

float text_width(const std::string& utf8, float size) {
  return ek_js_measure(utf8.c_str(), size);
}

void draw_texts(const std::vector<TextCmd>& cmds) {
  (void)cmds;  // Text is rendered by web::present together with the frame.
}

}  // namespace platform
}  // namespace ek
