#include "art.h"

namespace ek {
namespace art {

const std::vector<std::pair<char, Color>>& palette() {
  static const std::vector<std::pair<char, Color>> p = {
      {'K', palette::Black},
      {'W', palette::White},
      {'S', palette::Bone},
      {'G', palette::Gray},
      {'D', palette::DarkGray},
      {'R', palette::Red},
      {'r', palette::DarkRed},
      {'P', palette::Pink},
      {'B', palette::Blue},
      {'b', palette::DarkBlue},
      {'C', palette::Cyan},
      {'N', palette::Green},
      {'n', palette::DarkGreen},
      {'Y', palette::Yellow},
      {'O', palette::Orange},
      {'U', palette::Purple},
      {'u', Color{70, 40, 120, 255}},
      {'M', palette::Wood},
      {'m', palette::WoodDark},
      {'T', palette::Rug},
      {'t', palette::RugDark},
      {'F', palette::Floor},
      {'f', palette::FloorDark},
  };
  return p;
}

namespace {

const char* const kHeartArt[] = {
    ".....RRRRRR.....",
    "...RRRRRRRRRR...",
    "..RRRRRRRRRRRR..",
    ".RRRRRWWRRRRRRR.",
    "RRRRRWWRRRRRRRRR",
    "RRRRRWWRRRRRRRRR",
    "RRRRRWWRRRRRRRRR",
    "RRRRRWWRRRRRRRRR",
    ".RRRRRWWRRRRRRR.",
    "..RRRRRRRRRRRR..",
    "...RRRRRRRRRR...",
    ".....RRRRRR.....",
};

const char* const kNovaArt[] = {
    "....KKKKKKKK....",
    "..KKWWWWWWWWKK..",
    ".KWWWWWWWWWWWWK.",
    ".KWKKWWWWWWKKWK.",
    ".KWKKWWWWWWKKWK.",
    ".KWWWWWWWWWWWWK.",
    ".KWKKWWKKKKKKWK.",
    ".KWWWWWWWWWWWWK.",
    "..KWWWWWWWWWWK..",
    "...KKWWWWWWKK...",
    "..BBBBBBBBBBBB..",
    ".BBBBBBBBBBBBBB.",
    ".BBBBBBBBBBBBBB.",
    ".BBBBBBBBBBBBBB.",
    ".bBBBBBBBBBBBBb.",
    ".bBBBBBBBBBBBBb.",
    "..bbbbbbbbbbbb..",
    "..KKKKKKKKKKKK..",
    "..KK......KKKK..",
    "..KK......KKKK..",
};

const char* const kCinderArt[] = {
    "...GGGGGGGGGG...",
    "..GGGGGGGGGGGG..",
    "..GGGGGGGGGGGG..",
    "..GGKKGGGGKKGG..",
    "..GGKKGGGGKKGG..",
    "..GGGGGGGGGGGG..",
    "..GGKKKKKKKKGG..",
    "..GGGGGGGGGGGG..",
    "..OOOOOOOOOOOO..",
    ".OOOOOOOOOOOOOO.",
    ".OOOOOOOOOOOOOO.",
    ".OOOOOOOOOOOOOO.",
    ".OOOOOOOOOOOOOO.",
    ".OOOOOOOOOOOOOO.",
    "..OOOOOOOOOOOO..",
    "..GGGGGGGGGGGG..",
    "..GG..GGGG..GG..",
    "..GG..GGGG..GG..",
    "..GG..GGGG..GG..",
    "..GG........GG..",
};

const char* const kWardenArt[] = {
    ".........KKKKKK.........",
    ".......KKUUUUUUKK.......",
    ".....KKUUUUUUUUUUKK.....",
    "....KUUUUUUUUUUUUUUK....",
    "...KUUUWWWWWWWWWWUUUK...",
    "...KUUWWYYYYYYYYWWUUK...",
    "...KUUWWYKYYKYWWUUUK....",
    "...KUUWWYKYYKYWWUUUK....",
    "...KUUWWYYYYYYYYWWUUK...",
    "...KUUUWWWWWWWWWWUUUK...",
    "....KUUUUUUUUUUUUUUK....",
    "....KuuUUUUUUUUUUuuK....",
    ".....KuuuuuuuuuuuK......",
    ".....KKKKKKKKKKKKK......",
    "...KKKKK......KKKKK.....",
    "..KuuuK........KuuuK....",
    "..KuuuK........KuuuK....",
    "..KuuuK........KuuuK....",
    "...KKK..........KKK.....",
    "........................",
    "........................",
};

const char* const kEnemySnowArt[] = {
    "........CCCCCCCC........",
    "......CCCCCCCCCCCC......",
    "....CCCCCCCCCCCCCCCC....",
    "...CCCCCCCCCCCCCCCCCC...",
    "..CCCCCCCCCCCCCCCCCCCC..",
    ".CCCCCCCCCCCCCCCCCCCCCC.",
    ".CCCCKKCCCCCCCCCCKKCCCC.",
    ".CCCCKKCCCCCCCCCCKKCCCC.",
    ".CCCCCCCCCCCCCCCCCCCCCC.",
    ".CCCCCCCCKKKKKKCCCCCCCC.",
    ".CCCCCCCCCCCCCCCCCCCCCC.",
    ".CCCCCCCCCCCCCCCCCCCCCC.",
    ".CCCCCCCCCCCCCCCCCCCCCC.",
    ".CCCCCCCCCCCCCCCCCCCCCC.",
    "..CCCCCCCCCCCCCCCCCCCC..",
    "..CCCCCCCCCCCCCCCCCCCC..",
    "...CCCCCCCCCCCCCCCCCC...",
    "....CCCCCCCCCCCCCCCC....",
    ".....CCCCCCCCCCCCCC.....",
    "......CCCCCCCCCCCC......",
};

const char* const kEnemyRustArt[] = {
    "....MMMMMMMMMMMMMMMM....",
    "..MMMMMMMMMMMMMMMMMMMM..",
    ".MMMMMMMMMMMMMMMMMMMMMM.",
    ".MMKKMMMMMMKKMMMMMMMMMM.",
    ".MMKKMMMMMMKKMMMMMMMMMM.",
    ".MMMMMMMMMMMMMMMMMMMMMM.",
    ".MMMMMMMMMMMMMMMMMMMMMM.",
    ".MMKKKKKKKKKKKKKKKKMMMM.",
    ".MMMMMMMMMMMMMMMMMMMMMM.",
    ".MMMMMMMMMMMMMMMMMMMMMM.",
    ".OOOOOOOOOOOOOOOOOOOOOO.",
    ".OOOOOOOOOOOOOOOOOOOOOO.",
    ".OOOOOOOOOOOOOOOOOOOOOO.",
    ".OOOOOOOOOOOOOOOOOOOOOO.",
    ".OOOOOOOOOOOOOOOOOOOOOO.",
    "..OOOOOOOOOOOOOOOOOOOO..",
    "..OOOOOOOOOOOOOOOOOOOO..",
    "..MMMMMMMMMMMMMMMMMMMM..",
    "..MM....MMMMMM....MMMM..",
    "..MM....MMMMMM....MMMM..",
    "..MM..............MMMM..",
};

const char* const kTvArt[] = {
    "KKKKKKKKKKKKKKKKKKKK",
    "KWWWWWWWWWWWWWWWWWWK",
    "KWWWWWWWWWWWWWWWWWWK",
    "KBBBBBBBBBBBBBBBBBBK",
    "KBCCCCCCCCCCCCCCCCBK",
    "KBCCBBBBBBBBBBBCCCBK",
    "KBCCBBBBBBBBBBBCCCBK",
    "KBCCBBBBBBBBBBBCCCBK",
    "KBCCCCCCCCCCCCCCCCBK",
    "KBBBBBBBBBBBBBBBBBBK",
    "KKKKKKKKKKKKKKKKKKKK",
    "..MMMMMMMMMMMMMMMM..",
    "...MMMMMMMMMMMMMM...",
    "....MMMMMMMMMMMM....",
    ".....MMMMMMMMMM.....",
    "......MMMMMMMM......",
};

const char* const kPlantArt[] = {
    "...NNNNNN...",
    "..NNNNNNNN..",
    "..NNN..NNN..",
    "...NNNNNN...",
    "....NNNN....",
    "...NNNNNN...",
    "..NNN.NNNN..",
    "...NNNNNN...",
    "....NNNN....",
    "....NNNN....",
    "...OOOOOO...",
    "..OOOOOOOO..",
    "..OOOOOOOO..",
    "..OOOOOOOO..",
    "..OOOOOOOO..",
    "...OOOOOO...",
};

const char* const kDoorArt[] = {    "MMMMMMMMMMMMMMMMMM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmCmmmmmmmmmmmM",
    "MmmmmCmmmmmmmmmmmM",
    "MmmmmCmmmmmmmmmmmM",
    "MmmmmCmmmmmmmmmmmM",
    "MmmmmCmmmmmmmmmmmM",
    "MmmmmCmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmYYmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MmmmmmmmmmmmmmmmmM",
    "MMMMMMMMMMMMMMMMMM",
};

const char* const kArrowArt[] = {
    "...K.....",
    "..KKK....",
    ".KKKKK...",
    "KKKKKKK..",
    "KKKKKKKKK",
    "KKKKKKK..",
    ".KKKKK...",
    "..KKK....",
    "...K.....",
};

const char* const kStarArt[] = {
    "..R..",
    "..R..",
    ".R.R.",
    "RRRRR",
    ".R.R.",
    "..R..",
    "..R..",
};

}  // namespace

const Sprite& heart() {
  static const Sprite s = Sprite::from_art(kHeartArt, 12, palette());
  return s;
}

const Sprite& nova() {
  static const Sprite s = Sprite::from_art(kNovaArt, 20, palette());
  return s;
}

const Sprite& cinder() {
  static const Sprite s = Sprite::from_art(kCinderArt, 20, palette());
  return s;
}

const Sprite& warden() {
  static const Sprite s = Sprite::from_art(kWardenArt, 21, palette());
  return s;
}

const Sprite& enemy_snow() {
  static const Sprite s = Sprite::from_art(kEnemySnowArt, 20, palette());
  return s;
}

const Sprite& enemy_rust() {
  static const Sprite s = Sprite::from_art(kEnemyRustArt, 21, palette());
  return s;
}

const Sprite& tv() {
  static const Sprite s = Sprite::from_art(kTvArt, 16, palette());
  return s;
}

const Sprite& plant() {
  static const Sprite s = Sprite::from_art(kPlantArt, 16, palette());
  return s;
}

const Sprite& door() {
  static const Sprite s = Sprite::from_art(kDoorArt, 28, palette());
  return s;
}

const Sprite& arrow() {
  static const Sprite s = Sprite::from_art(kArrowArt, 9, palette());
  return s;
}

const Sprite& star() {
  static const Sprite s = Sprite::from_art(kStarArt, 7, palette());
  return s;
}

}  // namespace art
}  // namespace ek
