#pragma once

#include <string>
#include <vector>

#include "canvas.h"
#include "dialogue.h"
#include "input.h"
#include "sprite.h"
#include "stats.h"
#include "types.h"

namespace ek {

enum class ActKind { Check, Flirt, BeNice, Talk, Special };

struct ActOption {
  std::string label;
  ActKind kind = ActKind::Check;
  std::string response;
  int enemy_atk_delta = 0;
  int enemy_def_delta = 0;
  int player_def_delta = 0;
  int kindness = 0;
  bool reveals_stats = false;
};

struct Enemy {
  std::string name;
  int max_hp = 30;
  int hp = 30;
  int atk = 7;
  int def = 3;
  Sprite sprite;
  std::vector<std::string> intro;
  std::vector<std::string> idle;
  std::vector<std::string> hurt;
  std::vector<std::string> defeat;
  std::vector<std::string> spared;
  std::vector<ActOption> acts;
  int pattern = 0;
  bool boss = false;
};

enum class BattlePhase {
  Intro,
  Menu,
  ActMenu,
  ItemMenu,
  MercyMenu,
  FightAim,
  EnemyTurn,
  Bullets,
  SpareAnim,
  KillAnim,
  Done
};

enum class BattleOutcome { None, Spared, Killed, Fled, Dead };

struct Bullet {
  float x = 0, y = 0;
  float vx = 0, vy = 0;
  float r = 4.0f;
  float spin = 0.0f;
  bool active = false;
  int kind = 0;  // 0 = orb, 1 = star
};

// The Undertale-style battle: a menu-driven fight with a bullet-hell phase
// where the player controls their soul.
class Battle {
 public:
  void start(int enemy_index, PlayerStats& stats);
  void update(const InputState& in, float dt);
  void draw(Canvas& c);

  BattleOutcome outcome() const { return outcome_; }
  bool finished() const { return phase_ == BattlePhase::Done; }
  const Enemy& enemy() const { return enemy_; }
  BattlePhase phase() const { return phase_; }
  const std::vector<Bullet>& bullets() const { return bullets_; }
  Vec2 soul_pos() const { return {soul_x_, soul_y_}; }
  void set_soul_pos(Vec2 p) {
    soul_x_ = p.x;
    soul_y_ = p.y;
  }
  // Position of the attack marker and the size of the hit zone, used by tests.
  float aim_marker_x() const { return 60.0f + aim_t_ * 165.0f; }
  float aim_zone_half() const { return clampf(17.0f - static_cast<float>(enemy_.def), 6.0f, 17.0f); }

 private:
  enum class SubMenu { None, Act, Item, Mercy };

  void update_menu(const InputState& in, float dt);
  void update_submenu(const InputState& in, float dt);
  void update_fight_aim(const InputState& in, float dt);
  void update_enemy_turn(const InputState& in, float dt);
  void update_bullets(const InputState& in, float dt);
  void update_anims(const InputState& in, float dt);
  void begin_bullets();
  void enter_enemy_turn();

  void spawn_wave();
  void damage_player(int amount);
  void end_battle(BattleOutcome outcome);

  void draw_stage(Canvas& c);
  void draw_message_box(Canvas& c);
  void draw_menu_box(Canvas& c);
  void draw_submenu(Canvas& c);
  void draw_soul(Canvas& c);
  void draw_player_status(Canvas& c);
  void apply_hit_effects(Canvas& c);

  std::vector<std::string> current_items() const;
  std::vector<std::string> current_mercy() const;

  Enemy enemy_;
  PlayerStats* stats_ = nullptr;
  Dialogue dialogue_;
  BattlePhase phase_ = BattlePhase::Intro;
  BattleOutcome outcome_ = BattleOutcome::None;
  float phase_t_ = 0.0f;

  int menu_index_ = 0;
  int sub_index_ = 0;
  SubMenu sub_menu_ = SubMenu::None;

  std::vector<Bullet> bullets_;
  float soul_x_ = 240.0f, soul_y_ = 96.0f;
  float invuln_ = 0.0f;
  float shake_ = 0.0f;
  float flash_ = 0.0f;
  int wave_index_ = 0;
  float wave_timer_ = 0.0f;
  float wave_interval_ = 0.9f;
  int wave_total_ = 6;
  float aim_t_ = 0.0f;
  bool aim_resolved_ = false;
  bool attack_pending_ = false;
  int last_damage_ = 0;
  unsigned rng_ = 12345u;
  int idle_counter_ = 0;
};

Enemy make_enemy(int index);

}  // namespace ek
