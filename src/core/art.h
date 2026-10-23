#pragma once

#include "sprite.h"

namespace ek {
namespace art {

// Shared character -> colour mapping used by every sprite in the game.
const std::vector<std::pair<char, Color>>& palette();

const Sprite& heart();       // player soul / battle heart
const Sprite& nova();        // skeleton NPC
const Sprite& cinder();      // robot NPC
const Sprite& warden();      // boss NPC + boss enemy
const Sprite& enemy_snow();  // enemy 1
const Sprite& enemy_rust();  // enemy 2
const Sprite& tv();
const Sprite& plant();
const Sprite& door();
const Sprite& arrow();
const Sprite& star();

}  // namespace art
}  // namespace ek
