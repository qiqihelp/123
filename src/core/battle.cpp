#include "battle.h"

#include <algorithm>
#include <cmath>

#include "art.h"

namespace ek {
namespace {

constexpr float kMsgX = 14.0f;
constexpr float kMsgY = 190.0f;
constexpr float kMsgW = 276.0f;
constexpr float kMsgH = 72.0f;
constexpr float kMenuX = 300.0f;
constexpr float kMenuY = 190.0f;
constexpr float kMenuW = 164.0f;
constexpr float kMenuH = 72.0f;
constexpr float kArenaX = 36.0f;
constexpr float kArenaY = 28.0f;
constexpr float kArenaW = 408.0f;
constexpr float kArenaH = 122.0f;
constexpr float kFontSize = 10.0f;

const float kMenuPosX[4] = {318.0f, 396.0f, 318.0f, 396.0f};
const float kMenuPosY[4] = {202.0f, 202.0f, 232.0f, 232.0f};
const char* const kMenuLabels[4] = {"FIGHT", "ACT", "ITEM", "MERCY"};

float rand01(unsigned& seed) {
  seed = seed * 1664525u + 1013904223u;
  return static_cast<float>((seed >> 8) & 0xFFFF) / 65535.0f;
}

ActOption make_act(const std::string& label, ActKind kind, const std::string& response,
                    int atk = 0, int def = 0, int pdef = 0, int kindness = 0,
                    bool reveals = false) {
  ActOption a;
  a.label = label;
  a.kind = kind;
  a.response = response;
  a.enemy_atk_delta = atk;
  a.enemy_def_delta = def;
  a.player_def_delta = pdef;
  a.kindness = kindness;
  a.reveals_stats = reveals;
  return a;
}

std::vector<DialogueLine> speaker_lines(const std::string& speaker,
                                         const std::vector<std::string>& texts) {
  std::vector<DialogueLine> lines;
  for (const std::string& raw : texts) {
    std::string t = raw;
    if (t.rfind("* ", 0) == 0) t = t.substr(2);
    lines.push_back(DialogueLine{"*" + speaker, t});
  }
  return lines;
}

}  // namespace

Enemy make_enemy(int index) {
  Enemy e;
  switch (index) {
    case 0: {
      e.name = "SNOWDROP";
      e.max_hp = 30;
      e.hp = 30;
      e.atk = 7;
      e.def = 2;
      e.sprite = art::enemy_snow();
      e.pattern = 0;
      e.intro = {"* Hello there, traveler.", "* I've been waiting for someone to visit.",
                 "* Won't you play with me?"};
      e.idle = {"* The snow keeps falling.", "* Don't fall asleep!",
                "* Catch the snowflakes, quick!"};
      e.hurt = {"* Ow! That stung.", "* Hmph, not bad."};
      e.defeat = {"* ...", "* I guess I lost.", "* Please... don't go down this path..."};
      e.spared = {"* You spared me?", "* Thank you. Truly.", "* I'll wait here a little longer."};
      e.acts = {
          make_act("CHECK", ActKind::Check,
                   "* A frost spirit. It looks harmless... but lonely.", 0, 0, 0, 0, true),
          make_act("PET", ActKind::Special, "* It leans into your hand. * It purrs.", -4, 0, 0, 1),
          make_act("BE NICE", ActKind::BeNice, "* You smile warmly. * It seems happy.", -2, -1, 0, 1),
          make_act("TALK", ActKind::Talk, "* Do you ever feel lonely here?", 0, 0, 2, 0),
      };
      break;
    }
    case 1: {
      e.name = "RUSTY";
      e.max_hp = 45;
      e.hp = 45;
      e.atk = 11;
      e.def = 4;
      e.sprite = art::enemy_rust();
      e.pattern = 1;
      e.intro = {"* BZZT! Unknown lifeform detected.", "* Scanning... scanning...",
                 "* ERROR: friend not found.", "* Please hold still while I recalibrate."};
      e.idle = {"* Targeting system online.", "* Your movement is very predictable.",
                "* I was built to protect, not to play."};
      e.hurt = {"* SYSTEM DAMAGE.", "* Recalculating... recalculating...", "* Why do you hit robots?"};
      e.defeat = {"* Shutting... down.", "* Was I... really a monster?", "* Thanks for listening."};
      e.spared = {"* Friend found.", "* Friend status: ALIVE.", "* Good... goodbye."};
      e.acts = {
          make_act("CHECK", ActKind::Check,
                   "* A rusted service robot. Its core is still glowing.", 0, 0, 0, 0, true),
          make_act("TUNE", ActKind::Special, "* You adjust its dials. * It hums happily.", -5, 2, 0, 1),
          make_act("FLIRT", ActKind::Flirt, "* You wink at the robot. * It malfunctions.", -4, 0, 0, 1),
          make_act("TALK", ActKind::Talk, "* What were you built for?", 0, 0, 2, 0),
      };
      break;
    }
    default: {
      e.name = "THE WARDEN";
      e.max_hp = 70;
      e.hp = 70;
      e.atk = 18;
      e.def = 6;
      e.sprite = art::warden();
      e.pattern = 2;
      e.boss = true;
      e.intro = {"* You finally arrived.", "* I have been guarding this room for a very long time.",
                 "* Do you still think kindness is enough?"};
      e.idle = {"* Show me what you are made of.", "* Do not look away.",
                "* Every path ends here."};
      e.hurt = {"* Hm.", "* That is more than I expected.", "* Perhaps you are different."};
      e.defeat = {"* ...", "* Then maybe... you are right.", "* Take the flower. Please."};
      e.spared = {"* You win. Truly.", "* The room is yours now.", "* Remember me kindly."};
      e.acts = {
          make_act("CHECK", ActKind::Check,
                   "* An ancient guardian. Its eyes have seen every ending.", 0, 0, 0, 0, true),
          make_act("LISTEN", ActKind::Special, "* You listen to the silence. * It softens.", -6, -2, 2, 1),
          make_act("BE NICE", ActKind::BeNice, "* You offer your hand. * It hesitates.", -3, -2, 0, 1),
          make_act("TALK", ActKind::Talk, "* Why do you guard an empty room?", 0, 0, 3, 0),
      };
      break;
    }
  }
  return e;
}

void Battle::start(int enemy_index, PlayerStats& stats) {
  stats_ = &stats;
  enemy_ = make_enemy(enemy_index);
  phase_ = BattlePhase::Intro;
  phase_t_ = 0.0f;
  outcome_ = BattleOutcome::None;
  bullets_.clear();
  dialogue_.set_wrap_width(kMsgW - 20.0f);
  dialogue_.start(speaker_lines(enemy_.name, enemy_.intro));
  menu_index_ = 0;
  sub_index_ = 0;
  sub_menu_ = SubMenu::None;
  soul_x_ = kArenaX + kArenaW * 0.5f;
  soul_y_ = kArenaY + kArenaH * 0.5f;
  invuln_ = 0.0f;
  shake_ = 0.0f;
  flash_ = 0.0f;
  wave_index_ = 0;
  wave_timer_ = 0.0f;
  aim_t_ = 0.0f;
  aim_resolved_ = false;
  last_damage_ = 0;
  idle_counter_ = 0;
  rng_ = 0x9E3779B9u + static_cast<unsigned>(enemy_index) * 7919u;
}

void Battle::update(const InputState& in, float dt) {
  phase_t_ += dt;
  if (shake_ > 0.0f) shake_ = std::max(0.0f, shake_ - dt);
  if (flash_ > 0.0f) flash_ = std::max(0.0f, flash_ - dt);
  if (invuln_ > 0.0f) invuln_ = std::max(0.0f, invuln_ - dt);

  switch (phase_) {
    case BattlePhase::Intro:
      if (dialogue_.active()) {
        dialogue_.update(in, dt);
        if (dialogue_.finished()) phase_ = BattlePhase::Menu;
      }
      break;
    case BattlePhase::Menu:
      update_menu(in, dt);
      break;
    case BattlePhase::ActMenu:
    case BattlePhase::ItemMenu:
    case BattlePhase::MercyMenu:
      update_submenu(in, dt);
      break;
    case BattlePhase::FightAim:
      update_fight_aim(in, dt);
      break;
    case BattlePhase::EnemyTurn:
      update_enemy_turn(in, dt);
      break;
    case BattlePhase::Bullets:
      update_bullets(in, dt);
      break;
    case BattlePhase::SpareAnim:
    case BattlePhase::KillAnim:
      update_anims(in, dt);
      break;
    case BattlePhase::Done:
      break;
  }
}

void Battle::update_menu(const InputState& in, float dt) {
  (void)dt;
  int col = menu_index_ % 2;
  int row = menu_index_ / 2;
  // The menu is a 2x2 grid; the cursor moves to the neighbouring cell and
  // stops at the border.
  if (in.is_pressed(Key::Left)) col = std::max(0, col - 1);
  if (in.is_pressed(Key::Right)) col = std::min(1, col + 1);
  if (in.is_pressed(Key::Up)) row = std::max(0, row - 1);
  if (in.is_pressed(Key::Down)) row = std::min(1, row + 1);
  menu_index_ = row * 2 + col;

  if (!in.is_pressed(Key::Z)) return;

  switch (menu_index_) {
    case 0:  // FIGHT
      phase_ = BattlePhase::FightAim;
      aim_t_ = 0.0f;
      aim_resolved_ = false;
      break;
    case 1:  // ACT
      sub_menu_ = SubMenu::Act;
      sub_index_ = 0;
      phase_ = BattlePhase::ActMenu;
      break;
    case 2:  // ITEM
      sub_menu_ = SubMenu::Item;
      sub_index_ = 0;
      phase_ = BattlePhase::ItemMenu;
      break;
    default:  // MERCY
      sub_menu_ = SubMenu::Mercy;
      sub_index_ = 0;
      phase_ = BattlePhase::MercyMenu;
      break;
  }
}

std::vector<std::string> Battle::current_items() const {
  std::vector<std::string> items;
  items.push_back("APPLE (" + std::to_string(stats_->apples) + ")");
  items.push_back("PIE (" + std::to_string(stats_->pies) + ")");
  return items;
}

std::vector<std::string> Battle::current_mercy() const {
  std::vector<std::string> mercy;
  mercy.push_back("SPARE");
  mercy.push_back("FLEE");
  return mercy;
}

void Battle::update_submenu(const InputState& in, float dt) {
  (void)dt;
  std::vector<std::string> options;
  if (sub_menu_ == SubMenu::Act) {
    for (const ActOption& a : enemy_.acts) options.push_back(a.label);
  } else if (sub_menu_ == SubMenu::Item) {
    options = current_items();
  } else {
    options = current_mercy();
  }

  if (in.is_pressed(Key::Up)) sub_index_ = (sub_index_ - 1 + static_cast<int>(options.size())) %
                                          static_cast<int>(options.size());
  if (in.is_pressed(Key::Down)) sub_index_ = (sub_index_ + 1) % static_cast<int>(options.size());
  if (in.is_pressed(Key::X)) {
    sub_menu_ = SubMenu::None;
    phase_ = BattlePhase::Menu;
    return;
  }
  if (!in.is_pressed(Key::Z)) return;

  if (sub_menu_ == SubMenu::Act) {
    const ActOption& act = enemy_.acts[sub_index_];
    enemy_.atk = std::max(1, enemy_.atk + act.enemy_atk_delta);
    enemy_.def = std::max(0, enemy_.def + act.enemy_def_delta);
    if (act.player_def_delta > 0) {
      stats_->def += act.player_def_delta;
      stats_->kindness += act.kindness;
    } else {
      stats_->kindness += act.kindness;
    }
    std::vector<std::string> response{act.response};
    if (act.reveals_stats) {
      response.push_back("* ATK " + std::to_string(enemy_.atk) + "  DEF " +
                         std::to_string(enemy_.def) + "  HP " + std::to_string(enemy_.hp) + "/" +
                         std::to_string(enemy_.max_hp));
    }
    dialogue_.start(speaker_lines(enemy_.name, response));
    sub_menu_ = SubMenu::None;
    enter_enemy_turn();
    return;
  }

  if (sub_menu_ == SubMenu::Item) {
    if (sub_index_ == 0) {
      if (stats_->apples <= 0 || stats_->hp >= stats_->max_hp) {
        dialogue_.start({{"* YOU", "You don't have an apple, or you're already at full HP."}});
        return;
      }
      stats_->apples -= 1;
      stats_->hp = std::min(stats_->max_hp, stats_->hp + 12);
      dialogue_.start({{"* YOU", "You ate the apple. It was crisp."}});
    } else {
      if (stats_->pies <= 0 || stats_->hp >= stats_->max_hp) {
        dialogue_.start({{"* YOU", "You don't have a pie, or you're already at full HP."}});
        return;
      }
      stats_->pies -= 1;
      stats_->hp = std::min(stats_->max_hp, stats_->hp + 40);
      dialogue_.start({{"* YOU", "You ate the pie. Delicious."}});
    }
    sub_menu_ = SubMenu::None;
    enter_enemy_turn();
    return;
  }

  // MERCY
  if (sub_index_ == 0) {  // SPARE
    if (stats_->kills >= 2) {
      enemy_.atk += 3;
      dialogue_.start(speaker_lines(enemy_.name,
                                    {"* Don't be like me.", "* You have already chosen a path."}));
      sub_menu_ = SubMenu::None;
      enter_enemy_turn();
      return;
    }
    phase_ = BattlePhase::SpareAnim;
    phase_t_ = 0.0f;
    dialogue_.start(speaker_lines(enemy_.name, enemy_.spared));
    return;
  }

  // FLEE
  if (enemy_.boss) {
    dialogue_.start(speaker_lines(enemy_.name, {"* You cannot run from this room."}));
    sub_menu_ = SubMenu::None;
    enter_enemy_turn();
    return;
  }
  end_battle(BattleOutcome::Fled);
}

void Battle::update_fight_aim(const InputState& in, float dt) {
  (void)dt;
  if (aim_resolved_) return;
  aim_t_ += dt;

  const float bar_x = 60.0f;
  const float bar_w = 360.0f;
  float marker = bar_x + aim_t_ * 165.0f;
  if (marker > bar_x + bar_w) {
    aim_resolved_ = true;
    last_damage_ = 0;
    dialogue_.start(speaker_lines(enemy_.name, {"* You missed."}));
    enter_enemy_turn();
    return;
  }

  if (!in.is_pressed(Key::Z)) return;

  float half = clampf(17.0f - static_cast<float>(enemy_.def), 6.0f, 17.0f);
  float center = bar_x + bar_w * 0.5f;
  float dist = std::fabs(marker - center);
  aim_resolved_ = true;
  if (dist <= half) {
    float bonus = std::round((1.0f - dist / half) * 5.0f);
    last_damage_ = stats_->atk + static_cast<int>(bonus);
    enemy_.hp -= last_damage_;
    if (enemy_.hp <= 0) {
      enemy_.hp = 0;
      dialogue_.start(speaker_lines(enemy_.name, enemy_.defeat));
      phase_ = BattlePhase::KillAnim;
      phase_t_ = 0.0f;
      return;
    }
    dialogue_.start(speaker_lines(enemy_.name, enemy_.hurt));
  } else {
    last_damage_ = 0;
    dialogue_.start(speaker_lines(enemy_.name, {"* Your attack went wide."}));
  }
  enter_enemy_turn();
}

void Battle::enter_enemy_turn() {
  attack_pending_ = true;
  phase_ = BattlePhase::EnemyTurn;
  phase_t_ = 0.0f;
}

void Battle::update_enemy_turn(const InputState& in, float dt) {
  if (dialogue_.active()) {
    dialogue_.update(in, dt);
    return;
  }
  if (attack_pending_) {
    attack_pending_ = false;
    std::vector<std::string> attack = enemy_.idle;
    if (attack.empty()) attack.push_back("* ...");
    dialogue_.start(speaker_lines(
        enemy_.name, {attack[static_cast<size_t>(idle_counter_) % attack.size()]}));
    ++idle_counter_;
    return;
  }
  begin_bullets();
}

void Battle::begin_bullets() {
  bullets_.clear();
  wave_index_ = 0;
  wave_timer_ = 0.7f;
  phase_ = BattlePhase::Bullets;
  phase_t_ = 0.0f;
  switch (enemy_.pattern) {
    case 0:
      wave_interval_ = 0.85f;
      wave_total_ = 7;
      break;
    case 1:
      wave_interval_ = 0.9f;
      wave_total_ = 6;
      break;
    default:
      wave_interval_ = 0.72f;
      wave_total_ = 9;
      break;
  }
  soul_x_ = kArenaX + kArenaW * 0.5f;
  soul_y_ = kArenaY + kArenaH * 0.5f;
}

void Battle::spawn_wave() {
  auto add = [&](float x, float y, float vx, float vy, float r, int kind) {
    Bullet b;
    b.x = x;
    b.y = y;
    b.vx = vx;
    b.vy = vy;
    b.r = r;
    b.kind = kind;
    b.spin = rand01(rng_) * 6.28f;
    b.active = true;
    bullets_.push_back(b);
  };

  switch (enemy_.pattern) {
    case 0: {  // Snowfall
      for (int i = 0; i < 3; ++i) {
        float x = kArenaX + 12.0f + rand01(rng_) * (kArenaW - 24.0f);
        float vy = 42.0f + rand01(rng_) * 22.0f;
        float vx = (rand01(rng_) - 0.5f) * 16.0f;
        add(x, kArenaY - 10.0f, vx, vy, 5.0f, 0);
      }
      break;
    }
    case 1: {  // Targeted shots
      float sx = kArenaX + kArenaW * 0.5f;
      float sy = kArenaY - 12.0f;
      float dx = soul_x_ - sx;
      float dy = soul_y_ - sy;
      float len = std::max(1.0f, std::sqrt(dx * dx + dy * dy));
      float speed = 78.0f;
      add(sx, sy, dx / len * speed, dy / len * speed, 5.0f, 0);
      if (wave_index_ % 2 == 1) {
        for (int i = 0; i < 4; ++i) {
          add(kArenaX - 12.0f, soul_y_ + (i - 1.5f) * 11.0f, 92.0f, 0.0f, 5.0f, 0);
        }
      }
      break;
    }
    default: {  // Warden
      if (wave_index_ % 2 == 0) {
        float cx = kArenaX + kArenaW * 0.5f;
        float cy = kArenaY + 8.0f;
        for (int i = 0; i < 12; ++i) {
          float ang = 6.28318f * static_cast<float>(i) / 12.0f + wave_index_ * 0.2f;
          add(cx, cy, std::cos(ang) * 52.0f, std::sin(ang) * 52.0f, 5.0f, 0);
        }
      } else {
        float sx = kArenaX + kArenaW * 0.5f;
        float sy = kArenaY - 12.0f;
        for (int k = -1; k <= 1; k += 2) {
          float dx = soul_x_ - sx;
          float dy = soul_y_ - sy;
          float len = std::max(1.0f, std::sqrt(dx * dx + dy * dy));
          add(sx, sy, (dx / len + static_cast<float>(k) * 0.25f) * 88.0f,
              dy / len * 88.0f, 4.5f, 1);
        }
        for (int i = 0; i < 3; ++i) {
          add(kArenaX - 12.0f, kArenaY + 30.0f + i * 16.0f, 100.0f, 0.0f, 5.0f, 0);
        }
      }
      break;
    }
  }
}

void Battle::damage_player(int amount) {
  stats_->hp -= amount;
  last_damage_ = amount;
  invuln_ = 1.0f;
  shake_ = 0.35f;
  flash_ = 0.18f;
  if (stats_->hp <= 0) {
    stats_->hp = 0;
    end_battle(BattleOutcome::Dead);
  }
}

void Battle::update_bullets(const InputState& in, float dt) {
  float speed = in.is_held(Key::Shift) ? 30.0f : 62.0f;
  float dx = 0.0f, dy = 0.0f;
  if (in.is_held(Key::Left)) dx -= 1.0f;
  if (in.is_held(Key::Right)) dx += 1.0f;
  if (in.is_held(Key::Up)) dy -= 1.0f;
  if (in.is_held(Key::Down)) dy += 1.0f;
  soul_x_ = clampf(soul_x_ + dx * speed * dt, kArenaX + 6.0f, kArenaX + kArenaW - 6.0f);
  soul_y_ = clampf(soul_y_ + dy * speed * dt, kArenaY + 6.0f, kArenaY + kArenaH - 6.0f);

  wave_timer_ -= dt;
  if (wave_timer_ <= 0.0f && wave_index_ < wave_total_) {
    spawn_wave();
    ++wave_index_;
    wave_timer_ = wave_interval_;
  }

  const float soul_r = in.is_held(Key::Shift) ? 3.0f : 5.0f;
  for (Bullet& b : bullets_) {
    if (!b.active) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < kArenaX - 40.0f || b.x > kArenaX + kArenaW + 40.0f ||
        b.y < kArenaY - 40.0f || b.y > kArenaY + kArenaH + 40.0f) {
      b.active = false;
      continue;
    }
    float ddx = b.x - soul_x_;
    float ddy = b.y - soul_y_;
    if (std::sqrt(ddx * ddx + ddy * ddy) < b.r + soul_r) {
      b.active = false;
      if (invuln_ <= 0.0f) {
        int dmg = std::max(1, enemy_.atk - stats_->def);
        damage_player(dmg);
      }
    }
  }

  bullets_.erase(std::remove_if(bullets_.begin(), bullets_.end(),
                                [](const Bullet& b) { return !b.active; }),
                 bullets_.end());

  if (phase_ == BattlePhase::Done) return;

  float total = wave_total_ * wave_interval_ + 1.4f;
  if (phase_t_ >= total) {
    phase_ = BattlePhase::Menu;
    phase_t_ = 0.0f;
  }
}

void Battle::update_anims(const InputState& in, float dt) {
  if (dialogue_.active()) {
    dialogue_.update(in, dt);
    return;
  }
  if (phase_ == BattlePhase::SpareAnim) {
    if (phase_t_ > 0.6f) {
      stats_->spares += 1;
      end_battle(BattleOutcome::Spared);
    }
  } else if (phase_ == BattlePhase::KillAnim) {
    if (phase_t_ > 0.6f) {
      stats_->kills += 1;
      end_battle(BattleOutcome::Killed);
    }
  }
}

void Battle::end_battle(BattleOutcome outcome) {
  outcome_ = outcome;
  phase_ = BattlePhase::Done;
  bullets_.clear();
}

void Battle::draw(Canvas& c) {
  c.clear(palette::Black);
  draw_stage(c);

  if (phase_ == BattlePhase::FightAim) {
    // Attack bar.
    const float bar_x = 60.0f, bar_y = 150.0f, bar_w = 360.0f;
    float half = clampf(17.0f - static_cast<float>(enemy_.def), 6.0f, 17.0f);
    float center = bar_x + bar_w * 0.5f;
    c.fill_rect(bar_x, bar_y, bar_w, 10.0f, palette::DarkGray);
    c.fill_rect(center - half, bar_y, half * 2.0f, 10.0f, palette::Yellow);
    c.draw_frame(bar_x, bar_y, bar_w, 10.0f, 1.0f, palette::White);
    float marker = bar_x + aim_t_ * 165.0f;
    if (marker <= bar_x + bar_w) {
      c.fill_rect(marker - 1.0f, bar_y - 4.0f, 3.0f, 18.0f, palette::White);
    }
    c.text("* Press Z when the marker is over the yellow zone.", 60.0f, 172.0f, kFontSize,
           palette::White);
    c.text("DMG " + std::to_string(stats_->atk), 60.0f, 132.0f, kFontSize, palette::White);
    return;
  }

  if (phase_ == BattlePhase::Bullets) {
    draw_message_box(c);
    draw_soul(c);
    apply_hit_effects(c);
    return;
  }

  draw_message_box(c);
  draw_menu_box(c);
  if (phase_ == BattlePhase::ActMenu || phase_ == BattlePhase::ItemMenu ||
      phase_ == BattlePhase::MercyMenu) {
    draw_submenu(c);
  }
  apply_hit_effects(c);
}

// Screen shake and the red flash that follow a hit.
void Battle::apply_hit_effects(Canvas& c) {
  if (flash_ > 0.0f) {
    const uint8_t alpha = static_cast<uint8_t>(120.0f * flash_ / 0.18f);
    c.fill_rect(0.0f, 0.0f, 480.0f, 270.0f, Color{255, 40, 50, alpha});
  }
  if (shake_ > 0.0f) {
    const float amount = shake_ * 16.0f;
    const int dx = static_cast<int>((rand01(rng_) - 0.5f) * amount);
    const int dy = static_cast<int>((rand01(rng_) - 0.5f) * amount);
    c.scroll(dx, dy);
  }
}

void Battle::draw_stage(Canvas& c) {
  // During the bullet phase the arena takes over the whole stage.
  if (phase_ == BattlePhase::Bullets) return;
  if (!enemy_.sprite.empty()) {
    float scale = 2.0f;
    float x = 240.0f - static_cast<float>(enemy_.sprite.w) * scale * 0.5f;
    float y = 26.0f;
    float bob = std::sin(phase_t_ * 2.0f) * 2.0f;
    c.blit(enemy_.sprite, x, y + bob, scale);

    float bar_w = 96.0f;
    float bar_x = 240.0f - bar_w * 0.5f;
    float bar_y = y + static_cast<float>(enemy_.sprite.h) * scale + 8.0f;
    c.fill_rect(bar_x, bar_y, bar_w, 6.0f, palette::DarkGray);
    float ratio = enemy_.max_hp > 0 ? static_cast<float>(enemy_.hp) / enemy_.max_hp : 0.0f;
    c.fill_rect(bar_x, bar_y, bar_w * ratio, 6.0f, palette::Yellow);
    c.draw_frame(bar_x, bar_y, bar_w, 6.0f, 1.0f, palette::White);
    c.text(enemy_.name, 240.0f, bar_y + 9.0f, kFontSize, palette::White, TextAlign::Center);
  }

  if (phase_ == BattlePhase::KillAnim) {
    float t = clampf(phase_t_ / 1.8f, 0.0f, 1.0f);
    c.blit_solid(enemy_.sprite, 240.0f - static_cast<float>(enemy_.sprite.w), 26.0f, 2.0f,
                 Color{255, 255, 255, static_cast<uint8_t>(255.0f * (1.0f - t))});
  }
}

void Battle::draw_message_box(Canvas& c) {
  c.fill_rect(kMsgX, kMsgY, kMsgW, kMsgH, palette::Black);
  c.draw_frame(kMsgX, kMsgY, kMsgW, kMsgH, 1.0f, palette::White);

  if (phase_ == BattlePhase::Intro || phase_ == BattlePhase::EnemyTurn ||
      phase_ == BattlePhase::SpareAnim || phase_ == BattlePhase::KillAnim) {
    dialogue_.draw(c, Rect{kMsgX, kMsgY, kMsgW, kMsgH}, false);
    return;
  }

  if (phase_ == BattlePhase::ActMenu) {
    const ActOption& act = enemy_.acts[sub_index_];
    c.text("* " + act.label, kMsgX + 8.0f, kMsgY + 10.0f, kFontSize, palette::White);
    c.text(enemy_.name + ": ATK " + std::to_string(enemy_.atk) + " DEF " +
               std::to_string(enemy_.def),
           kMsgX + 8.0f, kMsgY + 26.0f, kFontSize, palette::Gray);
    return;
  }

  draw_player_status(c);
}

void Battle::draw_player_status(Canvas& c) {
  c.text("LV " + std::to_string(stats_->lv) + "   ATK " + std::to_string(stats_->atk) +
             "   DEF " + std::to_string(stats_->def),
         kMsgX + 8.0f, kMsgY + 8.0f, kFontSize, palette::White);

  float bar_x = kMsgX + 8.0f;
  float bar_y = kMsgY + 28.0f;
  float bar_w = 150.0f;
  float ratio = stats_->max_hp > 0 ? static_cast<float>(stats_->hp) / stats_->max_hp : 0.0f;
  c.fill_rect(bar_x, bar_y, bar_w, 10.0f, palette::DarkGray);
  c.fill_rect(bar_x, bar_y, bar_w * ratio, 10.0f, palette::Red);
  c.draw_frame(bar_x, bar_y, bar_w, 10.0f, 1.0f, palette::White);
  c.text("HP " + std::to_string(stats_->hp) + " / " + std::to_string(stats_->max_hp), bar_x,
         bar_y + 14.0f, kFontSize, palette::White);
}

void Battle::draw_menu_box(Canvas& c) {
  c.fill_rect(kMenuX, kMenuY, kMenuW, kMenuH, palette::Black);
  c.draw_frame(kMenuX, kMenuY, kMenuW, kMenuH, 1.0f, palette::White);
  for (int i = 0; i < 4; ++i) {
    Color col = palette::White;
    if (phase_ == BattlePhase::ActMenu || phase_ == BattlePhase::ItemMenu ||
        phase_ == BattlePhase::MercyMenu) {
      col = palette::Gray;
    }
    c.text(kMenuLabels[i], kMenuPosX[i], kMenuPosY[i], kFontSize, col);
  }
  if (phase_ == BattlePhase::Menu) {
    c.blit(art::arrow(), kMenuPosX[menu_index_] - 14.0f, kMenuPosY[menu_index_] - 1.0f, 1.0f);
  }
}

void Battle::draw_submenu(Canvas& c) {
  if (dialogue_.active()) {
    // A message (for example "you have no apples") replaces the list.
    c.fill_rect(kMsgX, kMsgY, kMsgW, kMsgH, palette::Black);
    c.draw_frame(kMsgX, kMsgY, kMsgW, kMsgH, 1.0f, palette::White);
    dialogue_.draw(c, Rect{kMsgX, kMsgY, kMsgW, kMsgH}, false);
    return;
  }

  std::vector<std::string> options;
  if (sub_menu_ == SubMenu::Act) {
    for (const ActOption& a : enemy_.acts) options.push_back(a.label);
  } else if (sub_menu_ == SubMenu::Item) {
    options = current_items();
  } else {
    options = current_mercy();
  }

  c.fill_rect(kMsgX, kMsgY, kMsgW, kMsgH, palette::Black);
  c.draw_frame(kMsgX, kMsgY, kMsgW, kMsgH, 1.0f, palette::White);
  float y = kMsgY + 8.0f;
  for (size_t i = 0; i < options.size(); ++i) {
    c.text(options[i], kMsgX + 26.0f, y, kFontSize, palette::White);
    y += 15.0f;
  }
  c.blit(art::arrow(), kMsgX + 10.0f, kMsgY + 7.0f + static_cast<float>(sub_index_) * 15.0f, 1.0f);
}

void Battle::draw_soul(Canvas& c) {
  c.draw_frame(kArenaX, kArenaY, kArenaW, kArenaH, 1.0f, palette::White);
  for (const Bullet& b : bullets_) {
    if (!b.active) continue;
    // Bullets only exist inside the arena.
    if (b.x < kArenaX - 2.0f || b.x > kArenaX + kArenaW + 2.0f ||
        b.y < kArenaY - 2.0f || b.y > kArenaY + kArenaH + 2.0f) {
      continue;
    }
    if (b.kind == 1) {
      c.blit(art::star(), b.x - 2.5f, b.y - 3.5f, 1.0f);
    } else {
      c.draw_circle(b.x, b.y, b.r, palette::Yellow);
    }
  }
  if (invuln_ <= 0.0f || std::fmod(invuln_, 0.16f) > 0.08f) {
    c.blit(art::heart(), soul_x_ - 8.0f, soul_y_ - 8.0f, 1.0f);
  }
}

}  // namespace ek
