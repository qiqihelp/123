#include "overworld.h"

#include <cmath>

#include "art.h"

namespace ek {
namespace {

constexpr float kRoomX = 16.0f;
constexpr float kRoomY = 16.0f;
constexpr float kRoomW = 448.0f;
constexpr float kRoomH = 238.0f;
constexpr float kSpeed = 62.0f;

// Furniture the player cannot walk through.
struct Blocker {
  float x, y, w, h;
};

const Blocker kBlockers[] = {
    {38.0f, 96.0f, 22.0f, 18.0f},    // tv
    {412.0f, 168.0f, 14.0f, 20.0f},  // plant
    {396.0f, 16.0f, 20.0f, 30.0f},   // door
};

Vec2 npc_pos(int stage) {
  switch (stage) {
    case 0:
      return {300.0f, 120.0f};
    case 1:
      return {250.0f, 110.0f};
    default:
      return {300.0f, 118.0f};
  }
}

const Sprite& npc_sprite(int stage) {
  switch (stage) {
    case 0:
      return art::nova();
    case 1:
      return art::cinder();
    default:
      return art::warden();
  }
}

const char* npc_name(int stage) {
  switch (stage) {
    case 0:
      return "* NOVA";
    case 1:
      return "* CINDER";
    default:
      return "* THE WARDEN";
  }
}

std::vector<DialogueLine> stage_dialogue(int stage) {
  switch (stage) {
    case 0:
      return {
          {"* NOVA", "Hey! You finally woke up."},
          {"* NOVA", "This room has been quiet for a very long time."},
          {"* NOVA", "There is a friend waiting beyond the door."},
          {"* NOVA", "Would you like to meet them?"},
      };
    case 1:
      return {
          {"* CINDER", "Oh. A visitor. My sensors were asleep."},
          {"* CINDER", "I was built to guard this room, but the door was locked from outside."},
          {"* CINDER", "There is one more in the next room. It is not like the others."},
          {"* CINDER", "Be careful with it."},
      };
    default:
      return {
          {"* THE WARDEN", "So. You are the one who walked through every room."},
          {"* THE WARDEN", "Every monster here was somebody's friend once."},
          {"* THE WARDEN", "Tell me, traveler... what will you do with me?"},
      };
  }
}

}  // namespace

void Overworld::start(int stage, const PlayerStats& stats) {
  stage_ = stage;
  stats_ = stats;
  player_ = Vec2{240.0f, 190.0f};
  event_ = OverworldEvent::None;
  time_ = 0.0f;
  bob_ = 0.0f;
  dialogue_.reset();
  dialogue_.set_wrap_width(kRoomW - 40.0f);
}

bool Overworld::blocked(float cx, float cy) const {
  const float half = 7.0f;
  if (cx - half < kRoomX || cx + half > kRoomX + kRoomW) return true;
  if (cy - half < kRoomY || cy + half > kRoomY + kRoomH) return true;
  for (const Blocker& b : kBlockers) {
    if (cx + half > b.x && cx - half < b.x + b.w && cy + half > b.y && cy - half < b.y + b.h) {
      return true;
    }
  }
  return false;
}

void Overworld::start_dialogue() {
  std::vector<DialogueLine> lines;
  // The residents notice how the player treats the others.
  if (stats_.kills >= 2) {
    lines.push_back({npc_name(stage_), "You killed them. Both of them."});
    lines.push_back({npc_name(stage_), "Please... don't do that."});
  } else if (stats_.kills == 1) {
    lines.push_back({npc_name(stage_), "You smell like blood."});
  }
  for (const DialogueLine& line : stage_dialogue(stage_)) lines.push_back(line);
  dialogue_.start(lines);
}

void Overworld::update(const InputState& in, float dt) {
  time_ += dt;

  if (dialogue_.active()) {
    dialogue_.update(in, dt);
    if (dialogue_.finished()) {
      event_ = OverworldEvent::StartBattle;
      dialogue_.reset();
    }
    return;
  }

  float dx = 0.0f, dy = 0.0f;
  if (in.is_held(Key::Left)) dx -= 1.0f;
  if (in.is_held(Key::Right)) dx += 1.0f;
  if (in.is_held(Key::Up)) dy -= 1.0f;
  if (in.is_held(Key::Down)) dy += 1.0f;
  if (dx != 0.0f || dy != 0.0f) {
    float len = std::sqrt(dx * dx + dy * dy);
    float nx = player_.x + dx / len * kSpeed * dt;
    float ny = player_.y + dy / len * kSpeed * dt;
    if (!blocked(nx, player_.y)) player_.x = nx;
    if (!blocked(player_.x, ny)) player_.y = ny;
    bob_ += dt * 9.0f;
  }

  Vec2 npc = npc_pos(stage_);
  float dist = std::sqrt((npc.x - player_.x) * (npc.x - player_.x) +
                          (npc.y - player_.y) * (npc.y - player_.y));
  if (dist < 36.0f && in.is_pressed(Key::Z)) {
    start_dialogue();
  }
}

void Overworld::draw(Canvas& c) {
  c.clear(palette::Black);
  draw_room(c);

  // Player.
  float bob = std::sin(bob_) * 1.5f;
  c.blit(art::heart(), player_.x - 8.0f, player_.y - 8.0f + bob, 1.0f);

  draw_npc(c);

  // Hint.
  Vec2 npc = npc_pos(stage_);
  float dist = std::sqrt((npc.x - player_.x) * (npc.x - player_.x) +
                          (npc.y - player_.y) * (npc.y - player_.y));
  if (dist < 36.0f && !dialogue_.active()) {
    c.text("Z: talk", player_.x - 16.0f, player_.y + 12.0f, 9.0f, palette::Yellow);
  }

  if (dialogue_.active()) {
    dialogue_.draw(c, Rect{24.0f, 196.0f, kRoomW - 16.0f, 58.0f});
  }
}

void Overworld::draw_room(Canvas& c) {
  // Floor: horizontal planks with short seams.
  c.fill_rect(kRoomX, kRoomY, kRoomW, kRoomH, palette::Floor);
  for (float y = kRoomY + 14.0f; y < kRoomY + kRoomH; y += 14.0f) {
    c.fill_rect(kRoomX, y, kRoomW, 1.0f, palette::FloorDark);
  }
  for (float x = kRoomX + 30.0f; x < kRoomX + kRoomW; x += 96.0f) {
    c.fill_rect(x, kRoomY, 1.0f, kRoomH, palette::FloorDark);
  }

  // Rug.
  c.fill_rect(196.0f, 112.0f, 120.0f, 78.0f, palette::Rug);
  c.draw_frame(196.0f, 112.0f, 120.0f, 78.0f, 3.0f, palette::RugDark);
  c.draw_frame(204.0f, 120.0f, 104.0f, 62.0f, 1.0f, palette::RugDark);

  // Wall band.
  c.fill_rect(0.0f, 0.0f, 480.0f, kRoomY, palette::DarkGray);
  c.fill_rect(0.0f, 0.0f, kRoomX, 270.0f, palette::DarkGray);
  c.fill_rect(480.0f - kRoomX, 0.0f, kRoomX, 270.0f, palette::DarkGray);
  c.fill_rect(0.0f, 270.0f - kRoomY, 480.0f, kRoomY, palette::DarkGray);
  c.fill_rect(kRoomX - 2.0f, kRoomY - 2.0f, kRoomW + 4.0f, 2.0f, palette::WoodDark);
  c.fill_rect(kRoomX - 2.0f, kRoomY + kRoomH, kRoomW + 4.0f, 2.0f, palette::WoodDark);
  c.fill_rect(kRoomX - 2.0f, kRoomY - 2.0f, 2.0f, kRoomH + 4.0f, palette::WoodDark);
  c.fill_rect(kRoomX + kRoomW, kRoomY - 2.0f, 2.0f, kRoomH + 4.0f, palette::WoodDark);

  // Furniture.
  c.blit(art::tv(), 38.0f, 96.0f, 1.0f);
  c.blit(art::plant(), 412.0f, 168.0f, 1.0f);
  c.blit(art::door(), 396.0f, 16.0f, 1.0f);

  // Window with a night sky behind it.
  const float wx = 92.0f, wy = 16.0f, ww = 48.0f, wh = 34.0f;
  c.fill_rect(wx, wy, ww, wh, palette::WoodDark);
  c.fill_rect(wx + 2.0f, wy + 2.0f, ww - 4.0f, wh - 4.0f, Color{22, 30, 66, 255});
  c.fill_rect(wx + 2.0f, wy + 2.0f, ww - 4.0f, 12.0f, Color{38, 48, 96, 255});
  c.fill_rect(wx + ww * 0.5f - 1.0f, wy + 2.0f, 2.0f, wh - 4.0f, palette::WoodDark);
  c.fill_rect(wx + 2.0f, wy + wh * 0.5f - 1.0f, ww - 4.0f, 2.0f, palette::WoodDark);
  c.fill_rect(wx + 9.0f, wy + 8.0f, 2.0f, 2.0f, Color{220, 230, 255, 255});
  c.fill_rect(wx + 30.0f, wy + 5.0f, 2.0f, 2.0f, Color{220, 230, 255, 255});
}

void Overworld::draw_npc(Canvas& c) {
  Vec2 npc = npc_pos(stage_);
  const Sprite& s = npc_sprite(stage_);
  float bob = std::sin(time_ * 1.8f) * 2.0f;
  c.blit(s, npc.x - static_cast<float>(s.w) * 0.5f, npc.y - static_cast<float>(s.h) * 0.5f + bob,
         1.0f);
  c.text(npc_name(stage_), npc.x, npc.y + static_cast<float>(s.h) * 0.5f + 4.0f, 9.0f,
         palette::White, TextAlign::Center);
}

}  // namespace ek
