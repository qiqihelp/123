// Renders a handful of game states to PPM files so that the pixel art and the
// layout can be inspected without a browser. Built as `echofall_snapshot`.
#include <cstdio>
#include <string>

#include "battle.h"
#include "canvas.h"
#include "game.h"
#include "input.h"

using namespace ek;

namespace {

void write_ppm(const std::string& path, const Canvas& c) {
  FILE* f = std::fopen(path.c_str(), "wb");
  if (f == nullptr) {
    std::printf("cannot open %s\n", path.c_str());
    return;
  }
  std::fprintf(f, "P6\n%d %d\n255\n", c.width(), c.height());
  for (int y = 0; y < c.height(); ++y) {
    for (int x = 0; x < c.width(); ++x) {
      const uint32_t p = c.data()[static_cast<size_t>(y) * c.width() + x];
      const unsigned char rgb[3] = {static_cast<unsigned char>(p & 0xFFu),
                                   static_cast<unsigned char>((p >> 8) & 0xFFu),
                                   static_cast<unsigned char>((p >> 16) & 0xFFu)};
      std::fwrite(rgb, 1, 3, f);
    }
  }
  std::fclose(f);
  std::printf("wrote %s\n", path.c_str());
}

void advance(Game& game, InputState& in, int frames) {
  for (int i = 0; i < frames; ++i) {
    game.update(in, 1.0f / 60.0f);
    in.end_frame();
  }
}

}  // namespace

int main() {
  Canvas canvas(480, 270);
  InputState in;

  {
    Game game;
    advance(game, in, 30);
    game.draw(canvas);
    write_ppm("shot_title.ppm", canvas);
  }

  {
    Game game;
    game.skip_to_overworld(0);
    advance(game, in, 30);
    game.draw(canvas);
    write_ppm("shot_room.ppm", canvas);
  }

  {
    PlayerStats stats;
    Battle battle;
    battle.start(0, stats);
    for (int i = 0; i < 600; ++i) {
      in.pressed[static_cast<int>(Key::Z)] = true;
      battle.update(in, 1.0f / 60.0f);
      in.end_frame();
      if (battle.phase() == BattlePhase::Menu) break;
    }
    battle.draw(canvas);
    write_ppm("shot_battle_menu.ppm", canvas);
  }

  {
    PlayerStats stats;
    Battle battle;
    battle.start(1, stats);
    for (int i = 0; i < 600; ++i) {
      in.pressed[static_cast<int>(Key::Z)] = true;
      battle.update(in, 1.0f / 60.0f);
      in.end_frame();
      if (battle.phase() == BattlePhase::Menu) break;
    }
    // Open the ACT list.
    in.pressed[static_cast<int>(Key::Right)] = true;
    battle.update(in, 1.0f / 60.0f);
    in.end_frame();
    in.pressed[static_cast<int>(Key::Z)] = true;
    battle.update(in, 1.0f / 60.0f);
    in.end_frame();
    battle.draw(canvas);
    write_ppm("shot_battle_act.ppm", canvas);
  }

  {
    PlayerStats stats;
    Battle battle;
    battle.start(2, stats);
    for (int i = 0; i < 900; ++i) {
      in.pressed[static_cast<int>(Key::Z)] = true;
      battle.update(in, 1.0f / 60.0f);
      in.end_frame();
      if (battle.phase() == BattlePhase::Bullets) break;
    }
    for (int i = 0; i < 90; ++i) {
      battle.update(in, 1.0f / 60.0f);
      in.end_frame();
    }
    battle.draw(canvas);
    write_ppm("shot_battle_bullets.ppm", canvas);
  }

  return 0;
}
