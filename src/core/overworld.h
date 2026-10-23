#pragma once

#include "canvas.h"
#include "dialogue.h"
#include "input.h"
#include "stats.h"
#include "types.h"

namespace ek {

enum class OverworldEvent { None, StartBattle };

// The explorable room. The player walks around, talks to the resident of the
// room and eventually triggers the next battle.
class Overworld {
 public:
  void start(int stage, const PlayerStats& stats);
  void update(const InputState& in, float dt);
  void draw(Canvas& c);

  OverworldEvent event() const { return event_; }
  void clear_event() { event_ = OverworldEvent::None; }
  int stage() const { return stage_; }
  Vec2 player_pos() const { return player_; }

 private:
  void draw_room(Canvas& c);
  void draw_npc(Canvas& c);
  bool blocked(float cx, float cy) const;
  void start_dialogue();

  int stage_ = 0;
  PlayerStats stats_{};
  Dialogue dialogue_;
  Vec2 player_{240.0f, 190.0f};
  OverworldEvent event_ = OverworldEvent::None;
  float time_ = 0.0f;
  float bob_ = 0.0f;
};

}  // namespace ek
