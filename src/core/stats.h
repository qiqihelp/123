#pragma once

namespace ek {

// Persistent player state that survives between battles.
struct PlayerStats {
  int hp = 100;
  int max_hp = 100;
  int atk = 12;
  int def = 5;
  int lv = 20;
  int apples = 3;
  int pies = 1;
  int kills = 0;
  int spares = 0;
  int kindness = 0;
};

}  // namespace ek
