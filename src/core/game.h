#pragma once

#include <string>
#include <vector>

#include "battle.h"
#include "canvas.h"
#include "input.h"
#include "overworld.h"
#include "stats.h"
#include "types.h"

namespace ek {

enum class Scene { Title, Overworld, Battle, Ending, GameOver };

// Top level game state machine: title screen, overworld, battles, endings.
class Game {
 public:
  Game(int w = 480, int h = 270);

  void update(const InputState& in, float dt);
  void draw(Canvas& c);

  Scene scene() const { return scene_; }
  int stage() const { return stage_; }
  PlayerStats& stats() { return stats_; }
  const PlayerStats& stats() const { return stats_; }
  Vec2 player_pos() const { return overworld_.player_pos(); }
  const std::vector<std::string>& ending_title() const { return ending_title_; }
  Battle& battle() { return battle_; }
  const Battle& battle() const { return battle_; }

  // Test helpers.
  void skip_to_battle(int enemy_index);
  void skip_to_overworld(int stage);
  void skip_to_ending();

 private:
  void update_title(const InputState& in, float dt);
  void update_overworld(const InputState& in, float dt);
  void update_battle(const InputState& in, float dt);
  void update_ending(const InputState& in, float dt);
  void update_game_over(const InputState& in, float dt);

  void draw_title(Canvas& c);
  void draw_ending(Canvas& c);
  void draw_game_over(Canvas& c);
  void draw_transition(Canvas& c);

  void start_battle();
  void finish_battle();
  void reset_run();
  void build_ending();

  int w_ = 480;
  int h_ = 270;
  Scene scene_ = Scene::Title;
  Scene pending_ = Scene::Title;
  bool has_pending_ = false;
  bool fading_in_ = false;
  float fade_ = 0.0f;
  float time_ = 0.0f;

  PlayerStats stats_{};
  Overworld overworld_;
  Battle battle_;
  int stage_ = 0;

  std::vector<std::string> ending_title_;
  std::vector<std::string> ending_lines_;
  float ending_scroll_ = 0.0f;

  struct FallingHeart {
    float x, y, speed;
  };
  std::vector<FallingHeart> hearts_;
};

}  // namespace ek
