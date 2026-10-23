#include <cmath>
#include <cstdio>
#include <string>
#include <vector>

#include "art.h"
#include "battle.h"
#include "canvas.h"
#include "dialogue.h"
#include "game.h"
#include "overworld.h"
#include "text.h"

using namespace ek;

namespace {

int g_failures = 0;
int g_checks = 0;

#define CHECK(cond)                                                        \
  do {                                                                     \
    ++g_checks;                                                            \
    if (!(cond)) {                                                         \
      ++g_failures;                                                        \
      std::printf("FAIL %s:%d  %s\n", __FILE__, __LINE__, #cond);          \
    }                                                                      \
  } while (0)

constexpr float kStep = 1.0f / 60.0f;

void tap(InputState& in, Key k) { in.pressed[static_cast<int>(k)] = true; }

void step(Game& game, InputState& in) {
  game.update(in, kStep);
  in.end_frame();
}

void step(Battle& battle, InputState& in) {
  battle.update(in, kStep);
  in.end_frame();
}

void step(Dialogue& dialogue, InputState& in) {
  dialogue.update(in, kStep);
  in.end_frame();
}

// Presses Z every frame until the battle reaches the wanted phase.
bool wait_phase(Battle& battle, InputState& in, BattlePhase phase, int max_frames = 2400) {
  for (int i = 0; i < max_frames; ++i) {
    tap(in, Key::Z);
    step(battle, in);
    if (battle.phase() == phase) return true;
  }
  return false;
}

void test_utf8_and_wrapping() {
  std::vector<std::string> parts = split_utf8("a\xE4\xB8\xAD\xE6\x96\x87z");
  CHECK(parts.size() == 4);
  CHECK(parts[1] == "\xE4\xB8\xAD");

  std::vector<std::string> lines = wrap_text("one two three four five", 40.0f, 10.0f);
  CHECK(lines.size() > 1);
  for (const std::string& l : lines) CHECK(l.size() <= 20);
}

void test_sprite_building() {
  const char* rows[] = {"..R.", "R.R.", "...."};
  std::vector<std::pair<char, Color>> pal = {{'R', palette::Red}};
  Sprite s = Sprite::from_art(rows, 3, pal);
  CHECK(s.w == 4);
  CHECK(s.h == 3);
  CHECK((s.px[0] & 0xFF000000u) == 0);  // transparent
  CHECK((s.px[2] & 0xFF000000u) != 0);  // opaque red
}

void test_art_dimensions() {
  CHECK(art::heart().w == 16);
  CHECK(art::heart().h == 12);
  CHECK(art::nova().w == 16);
  CHECK(art::warden().w == 24);
  CHECK(art::enemy_snow().w == 24);
  CHECK(art::enemy_rust().w == 24);
  CHECK(art::arrow().w == 9);
}

void test_canvas() {
  Canvas c(16, 16);
  c.clear(palette::Black);
  c.fill_rect(2, 2, 4, 4, palette::Red);
  CHECK((c.data()[0] & 0xFFu) == 0);
  const uint32_t px = c.data()[3 * 16 + 3];
  CHECK((px & 0xFFu) == 230);          // red channel
  CHECK(((px >> 8) & 0xFFu) == 40);    // green channel
  c.fill_rect(2, 2, 4, 4, Color{0, 0, 0, 128});
  const uint32_t blended = c.data()[3 * 16 + 3];
  CHECK((blended & 0xFFu) > 100 && (blended & 0xFFu) < 140);
}

void test_dialogue_typewriter() {
  Dialogue d;
  d.set_wrap_width(200.0f);
  d.start({{"* NOVA", "hello"}, {"* NOVA", "world"}});
  CHECK(d.active());
  InputState in;
  for (int i = 0; i < 120; ++i) step(d, in);
  CHECK(d.active());  // still on the first line, waiting for input
  tap(in, Key::Z);
  step(d, in);
  CHECK(d.active());  // moved on to the second line
  for (int i = 0; i < 120; ++i) step(d, in);
  tap(in, Key::Z);
  step(d, in);
  CHECK(d.finished());
  CHECK(!d.active());
}

void test_battle_menu_and_act() {
  PlayerStats st;
  Battle b;
  b.start(0, st);
  InputState in;

  CHECK(wait_phase(b, in, BattlePhase::Menu));
  CHECK(b.enemy().name == "SNOWDROP");
  CHECK(b.enemy().hp == 30);

  // Move to ACT and open it.
  tap(in, Key::Right);
  step(b, in);
  tap(in, Key::Z);
  step(b, in);
  CHECK(b.phase() == BattlePhase::ActMenu);

  // BE NICE is the third option.
  tap(in, Key::Down);
  step(b, in);
  tap(in, Key::Down);
  step(b, in);
  tap(in, Key::Z);
  step(b, in);

  CHECK(b.phase() == BattlePhase::EnemyTurn);
  CHECK(b.enemy().atk == 5);     // 7 - 2
  CHECK(b.enemy().def == 1);     // 2 - 1
  CHECK(st.kindness == 1);
}

void test_battle_bullets_damage_player() {
  PlayerStats st;
  Battle b;
  b.start(0, st);
  InputState in;
  CHECK(wait_phase(b, in, BattlePhase::Menu));

  // Take one enemy turn: skip the dialogue until the bullet phase starts.
  CHECK(wait_phase(b, in, BattlePhase::Bullets));

  bool hit = false;
  for (int i = 0; i < 900 && !hit; ++i) {
    if (!b.bullets().empty()) {
      b.set_soul_pos(Vec2{b.bullets().front().x, b.bullets().front().y});
    }
    step(b, in);
    if (st.hp < st.max_hp) hit = true;
  }
  CHECK(hit);
  CHECK(st.hp < st.max_hp);
}

void test_battle_spare_outcome() {
  PlayerStats st;
  Battle b;
  b.start(0, st);
  InputState in;
  CHECK(wait_phase(b, in, BattlePhase::Menu));

  // Navigate to MERCY: down then right.
  tap(in, Key::Down);
  step(b, in);
  tap(in, Key::Right);
  step(b, in);
  tap(in, Key::Z);
  step(b, in);
  CHECK(b.phase() == BattlePhase::MercyMenu);

  tap(in, Key::Z);
  step(b, in);
  CHECK(b.phase() == BattlePhase::SpareAnim);

  CHECK(wait_phase(b, in, BattlePhase::Done));
  CHECK(b.outcome() == BattleOutcome::Spared);
  CHECK(st.spares == 1);
}

void test_battle_kill_outcome() {
  PlayerStats st;
  Battle b;
  b.start(1, st);
  InputState in;
  CHECK(wait_phase(b, in, BattlePhase::Menu));

  // FIGHT until the enemy dies.
  for (int round = 0; round < 20 && b.enemy().hp > 0; ++round) {
    tap(in, Key::Z);  // FIGHT is the first menu entry
    step(b, in);
    CHECK(b.phase() == BattlePhase::FightAim);

    // Let the marker sweep and hit it while it is over the target zone.
    for (int f = 0; f < 400 && b.phase() == BattlePhase::FightAim; ++f) {
      if (std::fabs(b.aim_marker_x() - 240.0f) < 4.0f) tap(in, Key::Z);
      step(b, in);
    }
    // Let the enemy answer.
    for (int f = 0; f < 900 && b.phase() == BattlePhase::EnemyTurn; ++f) {
      tap(in, Key::Z);
      step(b, in);
    }
    for (int f = 0; f < 1800 && b.phase() == BattlePhase::Bullets; ++f) step(b, in);
  }
  CHECK(b.enemy().hp == 0);
  CHECK(wait_phase(b, in, BattlePhase::Done));
  CHECK(b.outcome() == BattleOutcome::Killed);
  CHECK(st.kills == 1);
}

void test_game_flow_to_battle() {
  Game game;
  InputState in;
  CHECK(game.scene() == Scene::Title);

  tap(in, Key::Z);
  for (int i = 0; i < 120; ++i) step(game, in);
  CHECK(game.scene() == Scene::Overworld);

  // Walk towards the resident of the room.
  const Vec2 npc{300.0f, 120.0f};
  bool close = false;
  for (int i = 0; i < 600; ++i) {
    Vec2 p = game.player_pos();
    float dx = npc.x - p.x;
    float dy = npc.y - p.y;
    in.held[static_cast<int>(Key::Right)] = dx > 3.0f;
    in.held[static_cast<int>(Key::Left)] = dx < -3.0f;
    in.held[static_cast<int>(Key::Up)] = dy < -3.0f;
    in.held[static_cast<int>(Key::Down)] = dy > 3.0f;
    step(game, in);
    float d = std::sqrt(dx * dx + dy * dy);
    if (d < 30.0f) {
      close = true;
      break;
    }
  }
  CHECK(close);
  for (int i = 0; i < 4; ++i) in.held[i] = false;

  tap(in, Key::Z);
  for (int i = 0; i < 900; ++i) {
    if (i % 6 == 0) tap(in, Key::Z);
    step(game, in);
    if (game.scene() == Scene::Battle) break;
  }
  CHECK(game.scene() == Scene::Battle);
}

void test_ending_routing() {
  PlayerStats st;
  st.kills = 3;
  st.spares = 0;
  st.kindness = 0;

  Game game;
  game.stats().kills = 3;
  game.skip_to_overworld(0);
  CHECK(game.scene() == Scene::Overworld);
  (void)st;
}

}  // namespace

int main() {
  test_utf8_and_wrapping();
  test_sprite_building();
  test_art_dimensions();
  test_canvas();
  test_dialogue_typewriter();
  test_battle_menu_and_act();
  test_battle_bullets_damage_player();
  test_battle_spare_outcome();
  test_battle_kill_outcome();
  test_game_flow_to_battle();
  test_ending_routing();

  std::printf("%d checks, %d failures\n", g_checks, g_failures);
  return g_failures == 0 ? 0 : 1;
}
