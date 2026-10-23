#include "game.h"

#include <cmath>

#include "art.h"
#include "platform.h"

namespace ek {
namespace {

constexpr float kFadeLength = 0.45f;

}  // namespace

Game::Game(int w, int h) : w_(w), h_(h) {
  hearts_.clear();
  for (int i = 0; i < 9; ++i) {
    FallingHeart h;
    h.x = 20.0f + static_cast<float>((i * 53) % 440);
    h.y = -20.0f - static_cast<float>(i) * 28.0f;
    h.speed = 16.0f + static_cast<float>((i * 17) % 26);
    hearts_.push_back(h);
  }
  reset_run();
}

void Game::reset_run() {
  stats_ = PlayerStats{};
  stage_ = 0;
  overworld_.start(0, stats_);
}

void Game::update(const InputState& in, float dt) {
  time_ += dt;

  if (has_pending_) {
    // Freeze the current scene while the screen fades out.
    fade_ += dt / (kFadeLength * 0.5f);
    if (fade_ >= 1.0f) {
      fade_ = 1.0f;
      scene_ = pending_;
      has_pending_ = false;
      fading_in_ = true;
    }
    return;
  }

  if (fading_in_) {
    fade_ -= dt / 0.3f;
    if (fade_ <= 0.0f) {
      fade_ = 0.0f;
      fading_in_ = false;
    }
  }

  switch (scene_) {
    case Scene::Title:
      update_title(in, dt);
      break;
    case Scene::Overworld:
      update_overworld(in, dt);
      break;
    case Scene::Battle:
      update_battle(in, dt);
      break;
    case Scene::Ending:
      update_ending(in, dt);
      break;
    case Scene::GameOver:
      update_game_over(in, dt);
      break;
  }
}

void Game::update_title(const InputState& in, float dt) {
  (void)dt;
  for (FallingHeart& h : hearts_) {
    h.y += h.speed * dt;
    if (h.y > static_cast<float>(h_) + 20.0f) {
      h.y = -20.0f;
      h.x = 20.0f + std::fmod(h.x * 7.0f + 53.0f, 440.0f);
    }
  }
  if (in.is_pressed(Key::Z)) {
    reset_run();
    pending_ = Scene::Overworld;
    has_pending_ = true;
    fade_ = 0.0f;
  }
}

void Game::update_overworld(const InputState& in, float dt) {
  overworld_.update(in, dt);
  if (overworld_.event() == OverworldEvent::StartBattle) {
    overworld_.clear_event();
    start_battle();
  }
}

void Game::start_battle() {
  battle_.start(stage_, stats_);
  pending_ = Scene::Battle;
  has_pending_ = true;
  fade_ = 0.0f;
}

void Game::update_battle(const InputState& in, float dt) {
  battle_.update(in, dt);
  if (!battle_.finished()) return;
  finish_battle();
}

void Game::finish_battle() {
  BattleOutcome outcome = battle_.outcome();
  if (outcome == BattleOutcome::Dead) {
    pending_ = Scene::GameOver;
    has_pending_ = true;
    fade_ = 0.0f;
    return;
  }

  ++stage_;
  if (stage_ >= 3) {
    build_ending();
    pending_ = Scene::Ending;
  } else {
    overworld_.start(stage_, stats_);
    pending_ = Scene::Overworld;
  }
  has_pending_ = true;
  fade_ = 0.0f;
}

void Game::update_ending(const InputState& in, float dt) {
  ending_scroll_ += dt * 12.0f;
  if (in.is_pressed(Key::Z)) {
    reset_run();
    pending_ = Scene::Title;
    has_pending_ = true;
    fade_ = 0.0f;
  }
}

void Game::update_game_over(const InputState& in, float dt) {
  (void)dt;
  if (!in.is_pressed(Key::Z)) return;
  stats_.hp = stats_.max_hp;
  overworld_.start(stage_, stats_);
  pending_ = Scene::Overworld;
  has_pending_ = true;
  fade_ = 0.0f;
}

void Game::build_ending() {
  ending_title_.clear();
  ending_lines_.clear();
  ending_scroll_ = 0.0f;

  if (stats_.kills >= 3) {
    ending_title_.push_back("GENOCIDE ENDING");
    ending_lines_ = {
        "You cleared the room of every living thing.",
        "The flowers keep growing anyway. That is what they do.",
        "Somewhere a friend is still waiting by the door.",
        "",
        "Nobody has to be alone in this world... but you made sure of it.",
    };
  } else if (stats_.spares >= 3 && stats_.kindness >= 3) {
    ending_title_.push_back("TRUE PACIFIST ENDING");
    ending_lines_ = {
        "You did not raise your weapon once.",
        "The room is quiet now, but it is a warm kind of quiet.",
        "",
        "Everyone is still here. Everyone is still someone's friend.",
        "The sun will rise again, and so will they.",
    };
  } else if (stats_.spares >= 3) {
    ending_title_.push_back("PACIFIST ENDING");
    ending_lines_ = {
        "You let them live. That is more than most people manage.",
        "The room is empty of monsters, and full of people.",
        "",
        "There is still something you could have said.",
    };
  } else {
    ending_title_.push_back("NEUTRAL ENDING");
    ending_lines_ = {
        "You walked out of the room with your heart intact.",
        "So did they. Nobody learned anything.",
        "",
        "The flower outside the door is still blooming.",
    };
  }
}

void Game::draw(Canvas& c) {
  switch (scene_) {
    case Scene::Title:
      draw_title(c);
      break;
    case Scene::Overworld:
      overworld_.draw(c);
      break;
    case Scene::Battle:
      battle_.draw(c);
      break;
    case Scene::Ending:
      draw_ending(c);
      break;
    case Scene::GameOver:
      draw_game_over(c);
      break;
  }
  draw_transition(c);
}

void Game::draw_transition(Canvas& c) {
  if (fade_ <= 0.0f) return;
  uint8_t alpha = static_cast<uint8_t>(255.0f * fade_);
  c.fill_rect(0.0f, 0.0f, static_cast<float>(w_), static_cast<float>(h_),
              Color{0, 0, 0, alpha});
}

void Game::draw_title(Canvas& c) {
  c.clear(palette::Black);

  for (const FallingHeart& h : hearts_) {
    c.blit(art::heart(), h.x, h.y, 1.0f);
  }

  float cx = static_cast<float>(w_) * 0.5f;
  c.text("ECHOFALL", cx + 3.0f, 58.0f, 46.0f, palette::DarkRed, TextAlign::Center);
  c.text("ECHOFALL", cx, 55.0f, 46.0f, palette::White, TextAlign::Center);
  c.text("a story told in bullets and choices", cx, 112.0f, 11.0f, palette::Yellow,
         TextAlign::Center);

  c.blit(art::heart(), cx - 8.0f, 140.0f + std::sin(time_ * 3.0f) * 3.0f, 1.0f);

  if (std::fmod(time_, 1.0f) < 0.6f) {
    c.text("PRESS Z TO BEGIN", cx, 190.0f, 13.0f, palette::White, TextAlign::Center);
  }
  c.text("arrows to move  -  Z to confirm  -  shift to focus", cx, 228.0f, 9.0f,
         palette::Gray, TextAlign::Center);
  c.text("written in C++17  -  compiled to WebAssembly", cx, 244.0f, 9.0f, palette::DarkGray,
         TextAlign::Center);
}

void Game::draw_ending(Canvas& c) {
  c.clear(palette::Black);
  float cx = static_cast<float>(w_) * 0.5f;

  if (!ending_title_.empty()) {
    c.text(ending_title_[0], cx, 40.0f, 24.0f, palette::Yellow, TextAlign::Center);
  }

  float y = 100.0f;
  for (size_t i = 0; i < ending_lines_.size(); ++i) {
    float appear = std::min(1.0f, std::max(0.0f, ending_scroll_ - static_cast<float>(i) * 0.55f));
    if (appear <= 0.0f) break;
    uint8_t alpha = static_cast<uint8_t>(255.0f * appear);
    c.text(ending_lines_[i], cx, y, 11.0f, Color{230, 230, 240, alpha}, TextAlign::Center);
    y += 20.0f;
  }

  c.text("KILLS " + std::to_string(stats_.kills) + "   SPARED " +
             std::to_string(stats_.spares) + "   KINDNESS " + std::to_string(stats_.kindness),
         cx, 232.0f, 9.0f, palette::Gray, TextAlign::Center);
  if (std::fmod(time_, 1.0f) < 0.6f) {
    c.text("PRESS Z TO RETURN TO TITLE", cx, 248.0f, 10.0f, palette::White, TextAlign::Center);
  }
}

void Game::draw_game_over(Canvas& c) {
  c.clear(palette::Black);
  float cx = static_cast<float>(w_) * 0.5f;
  c.text("GAME OVER", cx, 100.0f, 32.0f, palette::Red, TextAlign::Center);
  c.text("Your soul shattered.", cx, 150.0f, 12.0f, palette::White, TextAlign::Center);
  if (std::fmod(time_, 1.0f) < 0.6f) {
    c.text("PRESS Z TO CONTINUE", cx, 190.0f, 12.0f, palette::Gray, TextAlign::Center);
  }
}

void Game::skip_to_battle(int enemy_index) {
  stage_ = enemy_index;
  battle_.start(enemy_index, stats_);
  scene_ = Scene::Battle;
  has_pending_ = false;
}

void Game::skip_to_overworld(int stage) {
  stage_ = stage;
  overworld_.start(stage, stats_);
  scene_ = Scene::Overworld;
  has_pending_ = false;
}

}  // namespace ek
