#include "tank_core.hpp"

#include <algorithm>
#include <cmath>
#include <cstring>

namespace tank {

namespace {

// 颜色定义 (0xRRGGBBAA)
constexpr uint32_t COL_BORDER    = 0x3A4150FFu;
constexpr uint32_t COL_FIELD_BG  = 0x050608FFu;
constexpr uint32_t COL_BRICK     = 0xC85A32FFu;
constexpr uint32_t COL_BRICK_MORT= 0x6E2C18FFu;
constexpr uint32_t COL_STEEL     = 0xBCC6D4FFu;
constexpr uint32_t COL_STEEL_DK  = 0x677282FFu;
constexpr uint32_t COL_WATER_1   = 0x1E65B8FFu;
constexpr uint32_t COL_WATER_2   = 0x3D8CE0FFu;
constexpr uint32_t COL_BUSH_1    = 0x2D7A31FFu;
constexpr uint32_t COL_BUSH_2    = 0x45A849FFu;
constexpr uint32_t COL_ICE_1     = 0x9AD9EAFFu;
constexpr uint32_t COL_ICE_2     = 0xD2F4FFFFu;
constexpr uint32_t COL_GOLD      = 0xF7C948FFu;
constexpr uint32_t COL_PLAYER    = 0xF2B830FFu;
constexpr uint32_t COL_PLAYER_DK = 0xA87614FFu;
constexpr uint32_t COL_WHITE     = 0xF4F7FAFFu;
constexpr uint32_t COL_RED       = 0xE64545FFu;
constexpr uint32_t COL_CYAN      = 0x38D9E6FFu;
constexpr uint32_t COL_GREEN     = 0x52D168FFu;
constexpr uint32_t COL_PURPLE    = 0xB85CE6FFu;
constexpr uint32_t COL_MUTED     = 0x8C96A8FFu;

// 5 个经典关卡 (13x13):
// '.' 空地, '#' 砖墙, '@' 钢墙, '~' 水域, '%' 草丛, '=' 冰面, 'E' 基地(第12行第6列)
const char* STAGE_MAPS[5][13] = {
    // Stage 1: 新手防线
    {
        ".............",
        ".#.#.#.#.#.#.",
        ".#.#.#.#.#.#.",
        ".#.#.#@#.#.#.",
        ".#.#.....#.#.",
        "...#.##..#...",
        "#....##....##",
        ".#.#.##.##.#.",
        ".#.#.....#.#.",
        ".#.#.###.#.#.",
        ".#.#.###.#.#.",
        ".....###.....",
        ".....#E#....."
    },
    // Stage 2: 钢雨桥头
    {
        ".............",
        ".#..@...@..#.",
        ".#..#...#..#.",
        ".#%.#...#.%#.",
        "~~~..###..~~~",
        "~~~..#@#..~~~",
        ".%%..###..%%.",
        ".#.#.....#.#.",
        ".#.#.@.@.#.#.",
        ".#...###...#.",
        ".....###.....",
        ".....###.....",
        ".....#E#....."
    },
    // Stage 3: 森林伏击
    {
        ".............",
        ".%%.#...#.%%.",
        ".%%.#.@.#.%%.",
        ".%%..===..%%.",
        ".#..=====..#.",
        ".#..=%.%=..#.",
        "....==@==....",
        ".%%..===..%%.",
        ".%%.#...#.%%.",
        ".#..#.@.#..#.",
        ".....###.....",
        "....#####....",
        ".....#E#....."
    },
    // Stage 4: 钢铁要塞
    {
        ".............",
        ".@.#.@.@.#.@.",
        ".#.#.....#.#.",
        ".#.@.###.@.#.",
        ".....#@#.....",
        "@@.#.###.#.@@",
        "...#.....#...",
        ".#.#.@.@.#.#.",
        ".#...#.#...#.",
        ".@.#.###.#.@.",
        ".....###.....",
        ".....###.....",
        ".....#E#....."
    },
    // Stage 5: 终极决战
    {
        ".............",
        ".@.%..@..%.@.",
        ".#.%.###.%.#.",
        "~~...#@#...~~",
        "~~.=.###.=.~~",
        ".%.=======.%.",
        ".@.#.@@@.#.@.",
        ".%.#.....#.%.",
        ".#...###...#.",
        ".@.#.#@#.#.@.",
        ".....###.....",
        "....@###@....",
        ".....#E#....."
    }
};

// 5x7 简化位图字库 (ASCII 32..95)
struct Glyph5x7 {
    char ch;
    uint8_t rows[7];
};

const Glyph5x7 FONT_5X7[] = {
    {' ', {0,0,0,0,0,0,0}},
    {'!', {4,4,4,4,4,0,4}},
    {'+', {0,4,4,31,4,4,0}},
    {'-', {0,0,0,31,0,0,0}},
    {'.', {0,0,0,0,0,0,4}},
    {'/', {1,2,2,4,8,8,16}},
    {':', {0,4,4,0,4,4,0}},
    {'0', {14,17,19,21,25,17,14}},
    {'1', {4,12,4,4,4,4,14}},
    {'2', {14,17,1,6,8,16,31}},
    {'3', {30,1,1,14,1,1,30}},
    {'4', {2,6,10,18,31,2,2}},
    {'5', {31,16,30,1,1,17,14}},
    {'6', {6,8,16,30,17,17,14}},
    {'7', {31,1,2,4,8,8,8}},
    {'8', {14,17,17,14,17,17,14}},
    {'9', {14,17,17,15,1,2,12}},
    {'A', {14,17,17,31,17,17,17}},
    {'B', {30,17,17,30,17,17,30}},
    {'C', {14,17,16,16,16,17,14}},
    {'D', {28,18,17,17,17,18,28}},
    {'E', {31,16,16,30,16,16,31}},
    {'F', {31,16,16,30,16,16,16}},
    {'G', {14,17,16,23,17,17,15}},
    {'H', {17,17,17,31,17,17,17}},
    {'I', {14,4,4,4,4,4,14}},
    {'J', {7,2,2,2,2,18,12}},
    {'K', {17,18,20,24,20,18,17}},
    {'L', {16,16,16,16,16,16,31}},
    {'M', {17,27,21,21,17,17,17}},
    {'N', {17,25,21,19,17,17,17}},
    {'O', {14,17,17,17,17,17,14}},
    {'P', {30,17,17,30,16,16,16}},
    {'Q', {14,17,17,17,21,18,13}},
    {'R', {30,17,17,30,20,18,17}},
    {'S', {15,16,16,14,1,1,30}},
    {'T', {31,4,4,4,4,4,4}},
    {'U', {17,17,17,17,17,17,14}},
    {'V', {17,17,17,17,17,10,4}},
    {'W', {17,17,17,21,21,27,17}},
    {'X', {17,17,10,4,10,17,17}},
    {'Y', {17,17,10,4,4,4,4}},
    {'Z', {31,1,2,4,8,16,31}},
    {'*', {0,21,14,31,14,21,0}},
    {'%', {24,25,2,4,8,19,3}}
};

const uint8_t* findGlyph(char c) {
    if (c >= 'a' && c <= 'z') c = static_cast<char>(c - 'a' + 'A');
    for (const auto& g : FONT_5X7) {
        if (g.ch == c) return g.rows;
    }
    return FONT_5X7[0].rows;
}

bool rectOverlap(float ax, float ay, float aw, float ah,
                 float bx, float by, float bw, float bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

} // namespace

TankGame::TankGame() {
    resetAll();
}

uint32_t TankGame::nextRand() {
    uint32_t x = rngState_;
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    rngState_ = x;
    return x;
}

void TankGame::resetAll() {
    phase_ = GamePhase::TITLE;
    stage_ = 1;
    score_ = 0;
    lives_ = 3;
    killsThisStage_ = 0;
    baseAlive_ = true;
    freezeTimer_ = 0.0f;
    shovelTimer_ = 0.0f;
    phaseTimer_ = 0.0f;
    elapsed_ = 0.0f;
    enemies_.clear();
    bullets_.clear();
    particles_.clear();
    powerUp_ = PowerUp{};
    loadStage(1);
    phase_ = GamePhase::TITLE;
}

void TankGame::startNewGame() {
    score_ = 0;
    lives_ = 3;
    player_.tier = 0;
    loadStage(1);
    phase_ = GamePhase::STAGE_INTRO;
    phaseTimer_ = 1.6f;
}

void TankGame::loadStage(int stageNum) {
    stage_ = std::clamp(stageNum, 1, 5);
    const auto& map = STAGE_MAPS[stage_ - 1];
    for (int r = 0; r < GRID_ROWS; ++r) {
        for (int c = 0; c < GRID_COLS; ++c) {
            char ch = map[r][c];
            TileType t = TileType::EMPTY;
            uint8_t mask = 0;
            switch (ch) {
                case '#': t = TileType::BRICK; mask = 0x0F; break;
                case '@': t = TileType::STEEL; break;
                case '~': t = TileType::WATER; break;
                case '%': t = TileType::BUSH;  break;
                case '=': t = TileType::ICE;   break;
                case 'E': t = TileType::BASE;  break;
                default:  t = TileType::EMPTY; break;
            }
            tiles_[r * GRID_COLS + c] = t;
            brickMasks_[r * GRID_COLS + c] = mask;
        }
    }

    // 清理玩家和敌方出生点确保不被堵死
    auto clearCell = [&](int col, int row) {
        tiles_[row * GRID_COLS + col] = TileType::EMPTY;
        brickMasks_[row * GRID_COLS + col] = 0;
    };
    clearCell(4, 12);
    clearCell(0, 0);
    clearCell(6, 0);
    clearCell(12, 0);

    // 基地位置确保为 BASE
    tiles_[12 * GRID_COLS + 6] = TileType::BASE;
    baseAlive_ = true;

    // 初始化玩家坦克
    int savedTier = player_.tier;
    player_ = TankEntity{};
    player_.active = true;
    player_.isPlayer = true;
    player_.x = FIELD_X + 4 * TILE_SIZE + 1.0f;
    player_.y = FIELD_Y + 12 * TILE_SIZE + 1.0f;
    player_.dir = Direction::UP;
    player_.hp = 1;
    player_.maxHp = 1;
    player_.tier = savedTier;
    player_.speed = 64.0f;
    player_.shieldTimer = 2.5f;

    enemies_.clear();
    bullets_.clear();
    particles_.clear();
    powerUp_ = PowerUp{};
    freezeTimer_ = 0.0f;
    shovelTimer_ = 0.0f;
    killsThisStage_ = 0;

    // 配置本关敌方队列 (10 + stage*2 台坦克)
    spawnQueue_.clear();
    int total = 10 + stage_ * 2;
    for (int i = 0; i < total; ++i) {
        if (stage_ >= 3 && i % 5 == 4) {
            spawnQueue_.push_back(EnemyType::HEAVY);
        } else if (stage_ >= 2 && i % 4 == 3) {
            spawnQueue_.push_back(EnemyType::ASSAULT);
        } else if (i % 3 == 1) {
            spawnQueue_.push_back(EnemyType::SCOUT);
        } else {
            spawnQueue_.push_back(EnemyType::STANDARD);
        }
    }
    spawnedCount_ = 0;
    spawnTimer_ = 0.4f;
    nextSpawnSlot_ = 0;
}

TileType TankGame::tileAt(int col, int row) const {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
        return TileType::STEEL;
    }
    return tiles_[row * GRID_COLS + col];
}

uint8_t TankGame::brickMaskAt(int col, int row) const {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return 0;
    return brickMasks_[row * GRID_COLS + col];
}

void TankGame::setBaseWall(TileType t) {
    const int coords[5][2] = {{5, 12}, {5, 11}, {6, 11}, {7, 11}, {7, 12}};
    for (const auto& c : coords) {
        int idx = c[1] * GRID_COLS + c[0];
        tiles_[idx] = t;
        brickMasks_[idx] = (t == TileType::BRICK) ? 0x0F : 0;
    }
}

void TankGame::forceSpawnPowerUp(PowerUpType type, float x, float y) {
    powerUp_.active = true;
    powerUp_.type = type;
    powerUp_.x = x;
    powerUp_.y = y;
    powerUp_.timer = 14.0f;
}

GameSnapshot TankGame::snapshot() const {
    GameSnapshot s;
    s.phase = phase_;
    s.stage = stage_;
    s.totalStages = 5;
    s.score = score_;
    s.highScore = highScore_;
    s.lives = lives_;
    int alive = 0;
    for (const auto& e : enemies_) {
        if (e.active) ++alive;
    }
    s.enemiesAlive = alive;
    s.enemiesRemaining = static_cast<int>(spawnQueue_.size()) - spawnedCount_ + alive;
    s.killsThisStage = killsThisStage_;
    s.baseAlive = baseAlive_;
    s.freezeTimer = freezeTimer_;
    s.shovelTimer = shovelTimer_;
    return s;
}

void TankGame::update(float dt, const InputState& input) {
    dt = std::clamp(dt, 0.0f, 0.05f);
    elapsed_ += dt;
    updateParticles(dt);

    if (phase_ == GamePhase::TITLE) {
        if (input.confirmPressed || input.fire) {
            startNewGame();
        }
        return;
    }

    if (phase_ == GamePhase::STAGE_INTRO) {
        phaseTimer_ -= dt;
        if (phaseTimer_ <= 0.0f) {
            phase_ = GamePhase::PLAYING;
        }
        return;
    }

    if (phase_ == GamePhase::PAUSED) {
        if (input.pausePressed) {
            phase_ = GamePhase::PLAYING;
        }
        return;
    }

    if (phase_ == GamePhase::STAGE_CLEAR) {
        phaseTimer_ -= dt;
        if (phaseTimer_ <= 0.0f) {
            if (stage_ >= 5) {
                phase_ = GamePhase::VICTORY;
            } else {
                loadStage(stage_ + 1);
                phase_ = GamePhase::STAGE_INTRO;
                phaseTimer_ = 1.6f;
            }
        }
        return;
    }

    if (phase_ == GamePhase::GAME_OVER || phase_ == GamePhase::VICTORY) {
        if (input.confirmPressed) {
            startNewGame();
        }
        return;
    }

    // GamePhase::PLAYING
    if (input.pausePressed) {
        phase_ = GamePhase::PAUSED;
        return;
    }

    if (freezeTimer_ > 0.0f) freezeTimer_ = std::max(0.0f, freezeTimer_ - dt);
    if (shovelTimer_ > 0.0f) {
        shovelTimer_ = std::max(0.0f, shovelTimer_ - dt);
        if (shovelTimer_ <= 0.0f) {
            setBaseWall(TileType::BRICK);
        }
    }

    if (powerUp_.active) {
        powerUp_.timer -= dt;
        if (powerUp_.timer <= 0.0f) {
            powerUp_.active = false;
        }
    }

    // 刷怪逻辑 (同时最多 4 台敌方坦克)
    int aliveEnemies = 0;
    for (const auto& e : enemies_) {
        if (e.active) ++aliveEnemies;
    }
    if (spawnedCount_ < static_cast<int>(spawnQueue_.size()) && aliveEnemies < 4) {
        spawnTimer_ -= dt;
        if (spawnTimer_ <= 0.0f) {
            spawnEnemy();
            spawnTimer_ = 2.0f;
        }
    }

    updatePlayer(dt, input);
    updateEnemies(dt);
    updateBullets(dt);

    // 清理已销毁实体
    enemies_.erase(std::remove_if(enemies_.begin(), enemies_.end(),
                                  [](const TankEntity& e) { return !e.active; }),
                   enemies_.end());
    bullets_.erase(std::remove_if(bullets_.begin(), bullets_.end(),
                                  [](const Bullet& b) { return !b.active; }),
                   bullets_.end());

    // 检查胜负条件
    if (!baseAlive_ || lives_ <= 0) {
        phase_ = GamePhase::GAME_OVER;
        if (score_ > highScore_) highScore_ = score_;
        return;
    }

    if (spawnedCount_ >= static_cast<int>(spawnQueue_.size()) && enemies_.empty()) {
        if (score_ > highScore_) highScore_ = score_;
        phase_ = GamePhase::STAGE_CLEAR;
        phaseTimer_ = 2.0f;
    }
}

void TankGame::spawnEnemy() {
    if (spawnedCount_ >= static_cast<int>(spawnQueue_.size())) return;
    const int spawnCols[3] = {0, 6, 12};

    for (int attempt = 0; attempt < 3; ++attempt) {
        int slot = (nextSpawnSlot_ + attempt) % 3;
        float sx = FIELD_X + spawnCols[slot] * TILE_SIZE + 1.0f;
        float sy = FIELD_Y + 1.0f;
        if (!tankCollidesWorld(sx, sy, nullptr)) {
            TankEntity e;
            e.active = true;
            e.isPlayer = false;
            e.enemyType = spawnQueue_[spawnedCount_];
            e.x = sx;
            e.y = sy;
            e.dir = Direction::DOWN;
            e.isBonus = ((spawnedCount_ + 1) % 4 == 0);
            e.aiTurnTimer = 1.2f + static_cast<float>(nextRand() % 12) * 0.15f;
            e.aiFireTimer = 0.6f + static_cast<float>(nextRand() % 10) * 0.12f;

            switch (e.enemyType) {
                case EnemyType::SCOUT:
                    e.hp = e.maxHp = 1;
                    e.speed = 84.0f;
                    break;
                case EnemyType::STANDARD:
                    e.hp = e.maxHp = 1;
                    e.speed = 56.0f;
                    break;
                case EnemyType::HEAVY:
                    e.hp = e.maxHp = 3;
                    e.speed = 42.0f;
                    break;
                case EnemyType::ASSAULT:
                    e.hp = e.maxHp = 2;
                    e.speed = 66.0f;
                    break;
            }
            enemies_.push_back(e);
            ++spawnedCount_;
            nextSpawnSlot_ = (slot + 1) % 3;
            spawnExplosion(sx + 7.0f, sy + 7.0f, COL_WHITE, 6);
            return;
        }
    }
}

bool TankGame::tankCollidesWorld(float x, float y, const TankEntity* self) const {
    const float size = 14.0f;
    if (x < FIELD_X || y < FIELD_Y ||
        x + size > FIELD_X + FIELD_W || y + size > FIELD_Y + FIELD_H) {
        return true;
    }

    int c0 = static_cast<int>((x - FIELD_X) / TILE_SIZE);
    int c1 = static_cast<int>((x + size - 0.01f - FIELD_X) / TILE_SIZE);
    int r0 = static_cast<int>((y - FIELD_Y) / TILE_SIZE);
    int r1 = static_cast<int>((y + size - 0.01f - FIELD_Y) / TILE_SIZE);

    for (int r = r0; r <= r1; ++r) {
        for (int c = c0; c <= c1; ++c) {
            TileType t = tileAt(c, r);
            if (t == TileType::STEEL || t == TileType::WATER || t == TileType::BASE) {
                return true;
            }
            if (t == TileType::BRICK) {
                uint8_t mask = brickMaskAt(c, r);
                for (int q = 0; q < 4; ++q) {
                    if ((mask & (1 << q)) == 0) continue;
                    float qx = FIELD_X + c * TILE_SIZE + (q % 2) * 8.0f;
                    float qy = FIELD_Y + r * TILE_SIZE + (q / 2) * 8.0f;
                    if (rectOverlap(x, y, size, size, qx, qy, 8.0f, 8.0f)) {
                        return true;
                    }
                }
            }
        }
    }

    if (self != &player_ && player_.active) {
        if (rectOverlap(x, y, size, size, player_.x, player_.y, size, size)) {
            return true;
        }
    }
    for (const auto& e : enemies_) {
        if (!e.active || self == &e) continue;
        if (rectOverlap(x, y, size, size, e.x, e.y, size, size)) {
            return true;
        }
    }
    return false;
}

bool TankGame::moveTank(TankEntity& tank, Direction dir, float dist) {
    // 转向时做轻微格子对齐辅助，让过窄通道更顺滑
    if (tank.dir != dir) {
        if (dir == Direction::UP || dir == Direction::DOWN) {
            float rel = tank.x - FIELD_X;
            float snapped = std::round(rel / 8.0f) * 8.0f + 1.0f;
            if (std::abs(snapped - rel) <= 4.5f &&
                !tankCollidesWorld(FIELD_X + snapped, tank.y, &tank)) {
                tank.x = FIELD_X + snapped;
            }
        } else {
            float rel = tank.y - FIELD_Y;
            float snapped = std::round(rel / 8.0f) * 8.0f + 1.0f;
            if (std::abs(snapped - rel) <= 4.5f &&
                !tankCollidesWorld(tank.x, FIELD_Y + snapped, &tank)) {
                tank.y = FIELD_Y + snapped;
            }
        }
        tank.dir = dir;
    }

    // 冰面加速
    int cc = std::clamp(static_cast<int>((tank.x + 7.0f - FIELD_X) / TILE_SIZE), 0, GRID_COLS - 1);
    int rr = std::clamp(static_cast<int>((tank.y + 7.0f - FIELD_Y) / TILE_SIZE), 0, GRID_ROWS - 1);
    if (tileAt(cc, rr) == TileType::ICE) {
        dist *= 1.28f;
    }

    float dx = 0.0f, dy = 0.0f;
    switch (dir) {
        case Direction::UP:    dy = -dist; break;
        case Direction::DOWN:  dy = dist;  break;
        case Direction::LEFT:  dx = -dist; break;
        case Direction::RIGHT: dx = dist;  break;
    }

    if (!tankCollidesWorld(tank.x + dx, tank.y + dy, &tank)) {
        tank.x += dx;
        tank.y += dy;
        tank.animDist += dist;
        return true;
    }
    return false;
}

int TankGame::activeBulletsFor(bool fromPlayer) const {
    int n = 0;
    for (const auto& b : bullets_) {
        if (b.active && b.fromPlayer == fromPlayer) ++n;
    }
    return n;
}

void TankGame::fireBullet(TankEntity& tank) {
    if (tank.fireCooldown > 0.0f) return;

    if (tank.isPlayer) {
        int maxBullets = (tank.tier >= 2) ? 2 : 1;
        if (activeBulletsFor(true) >= maxBullets) return;
        tank.fireCooldown = (tank.tier >= 1) ? 0.18f : 0.30f;
    } else {
        tank.fireCooldown = (tank.enemyType == EnemyType::ASSAULT) ? 0.9f : 1.3f;
    }

    Bullet b;
    b.active = true;
    b.fromPlayer = tank.isPlayer;
    b.armorPiercing = tank.isPlayer && (tank.tier >= 3);
    b.dir = tank.dir;

    if (tank.isPlayer) {
        b.speed = (tank.tier >= 1) ? 215.0f : 175.0f;
    } else {
        b.speed = (tank.enemyType == EnemyType::ASSAULT) ? 185.0f : 145.0f;
    }

    float cx = tank.x + 7.0f;
    float cy = tank.y + 7.0f;
    switch (tank.dir) {
        case Direction::UP:    b.x = cx - 2.0f; b.y = tank.y - 3.0f; break;
        case Direction::DOWN:  b.x = cx - 2.0f; b.y = tank.y + 13.0f; break;
        case Direction::LEFT:  b.x = tank.x - 3.0f; b.y = cy - 2.0f; break;
        case Direction::RIGHT: b.x = tank.x + 13.0f; b.y = cy - 2.0f; break;
    }
    bullets_.push_back(b);
}

void TankGame::updatePlayer(float dt, const InputState& input) {
    if (!player_.active) return;
    if (player_.fireCooldown > 0.0f) player_.fireCooldown = std::max(0.0f, player_.fireCooldown - dt);
    if (player_.shieldTimer > 0.0f) player_.shieldTimer = std::max(0.0f, player_.shieldTimer - dt);

    if (input.up)         moveTank(player_, Direction::UP, player_.speed * dt);
    else if (input.down)  moveTank(player_, Direction::DOWN, player_.speed * dt);
    else if (input.left)  moveTank(player_, Direction::LEFT, player_.speed * dt);
    else if (input.right) moveTank(player_, Direction::RIGHT, player_.speed * dt);

    if (input.fire) {
        fireBullet(player_);
    }

    if (powerUp_.active && rectOverlap(player_.x, player_.y, 14.0f, 14.0f,
                                       powerUp_.x, powerUp_.y, 14.0f, 14.0f)) {
        PowerUpType t = powerUp_.type;
        powerUp_.active = false;
        collectPowerUp(t);
    }
}

void TankGame::collectPowerUp(PowerUpType type) {
    score_ += 500;
    if (score_ > highScore_) highScore_ = score_;
    spawnExplosion(powerUp_.x + 7.0f, powerUp_.y + 7.0f, COL_GOLD, 10);

    switch (type) {
        case PowerUpType::STAR:
            player_.tier = std::min(3, player_.tier + 1);
            break;
        case PowerUpType::SHIELD:
            player_.shieldTimer = 8.0f;
            break;
        case PowerUpType::CLOCK:
            freezeTimer_ = 8.0f;
            break;
        case PowerUpType::SHOVEL:
            shovelTimer_ = 12.0f;
            setBaseWall(TileType::STEEL);
            break;
        case PowerUpType::LIFE:
            lives_ = std::min(9, lives_ + 1);
            break;
        case PowerUpType::BOMB:
            for (auto& e : enemies_) {
                if (!e.active) continue;
                e.active = false;
                ++killsThisStage_;
                score_ += 200;
                spawnExplosion(e.x + 7.0f, e.y + 7.0f, COL_GOLD, 12);
            }
            break;
    }
}

void TankGame::updateEnemies(float dt) {
    if (freezeTimer_ > 0.0f) return;

    for (auto& e : enemies_) {
        if (!e.active) continue;
        if (e.fireCooldown > 0.0f) e.fireCooldown = std::max(0.0f, e.fireCooldown - dt);

        e.aiTurnTimer -= dt;
        e.aiFireTimer -= dt;

        bool moved = moveTank(e, e.dir, e.speed * dt);
        if (!moved || e.aiTurnTimer <= 0.0f) {
            e.aiTurnTimer = 0.8f + static_cast<float>(nextRand() % 14) * 0.15f;
            // 精英与普通 AI 有一定概率朝玩家或基地方向转向
            uint32_t roll = nextRand() % 100;
            if ((e.enemyType == EnemyType::ASSAULT && roll < 65) || roll < 35) {
                float targetX = (nextRand() % 2 == 0) ? player_.x : (FIELD_X + 6 * TILE_SIZE);
                float targetY = (nextRand() % 2 == 0) ? player_.y : (FIELD_Y + 12 * TILE_SIZE);
                float dx = targetX - e.x;
                float dy = targetY - e.y;
                if (std::abs(dx) > std::abs(dy)) {
                    e.dir = (dx > 0) ? Direction::RIGHT : Direction::LEFT;
                } else {
                    e.dir = (dy > 0) ? Direction::DOWN : Direction::UP;
                }
            } else {
                e.dir = static_cast<Direction>(nextRand() % 4);
            }
        }

        if (e.aiFireTimer <= 0.0f) {
            e.aiFireTimer = (e.enemyType == EnemyType::ASSAULT)
                            ? (0.6f + static_cast<float>(nextRand() % 6) * 0.1f)
                            : (1.0f + static_cast<float>(nextRand() % 10) * 0.12f);
            fireBullet(e);
        }
    }
}

void TankGame::updateBullets(float dt) {
    for (size_t i = 0; i < bullets_.size(); ++i) {
        Bullet& b = bullets_[i];
        if (!b.active) continue;

        float step = b.speed * dt;
        switch (b.dir) {
            case Direction::UP:    b.y -= step; break;
            case Direction::DOWN:  b.y += step; break;
            case Direction::LEFT:  b.x -= step; break;
            case Direction::RIGHT: b.x += step; break;
        }

        // 出界判定
        if (b.x < FIELD_X || b.y < FIELD_Y ||
            b.x + 4.0f > FIELD_X + FIELD_W || b.y + 4.0f > FIELD_Y + FIELD_H) {
            b.active = false;
            spawnExplosion(b.x + 2.0f, b.y + 2.0f, COL_WHITE, 4);
            continue;
        }

        // 子弹互相抵消
        bool hitBullet = false;
        for (size_t j = i + 1; j < bullets_.size(); ++j) {
            Bullet& o = bullets_[j];
            if (!o.active || o.fromPlayer == b.fromPlayer) continue;
            if (rectOverlap(b.x, b.y, 4.0f, 4.0f, o.x, o.y, 4.0f, 4.0f)) {
                b.active = false;
                o.active = false;
                spawnExplosion(b.x + 2.0f, b.y + 2.0f, COL_WHITE, 5);
                hitBullet = true;
                break;
            }
        }
        if (hitBullet) continue;

        // 地形碰撞
        int c0 = std::max(0, static_cast<int>((b.x - FIELD_X) / TILE_SIZE));
        int c1 = std::min(GRID_COLS - 1, static_cast<int>((b.x + 3.99f - FIELD_X) / TILE_SIZE));
        int r0 = std::max(0, static_cast<int>((b.y - FIELD_Y) / TILE_SIZE));
        int r1 = std::min(GRID_ROWS - 1, static_cast<int>((b.y + 3.99f - FIELD_Y) / TILE_SIZE));

        bool hitWall = false;
        for (int r = r0; r <= r1; ++r) {
            for (int c = c0; c <= c1; ++c) {
                int idx = r * GRID_COLS + c;
                TileType t = tiles_[idx];
                if (t == TileType::BASE) {
                    if (baseAlive_) {
                        baseAlive_ = false;
                        b.active = false;
                        hitWall = true;
                        spawnExplosion(FIELD_X + c * TILE_SIZE + 8.0f,
                                       FIELD_Y + r * TILE_SIZE + 8.0f, COL_RED, 20);
                    }
                } else if (t == TileType::STEEL) {
                    b.active = false;
                    hitWall = true;
                    if (b.armorPiercing) {
                        tiles_[idx] = TileType::EMPTY;
                        spawnExplosion(b.x + 2.0f, b.y + 2.0f, COL_STEEL, 10);
                    } else {
                        spawnExplosion(b.x + 2.0f, b.y + 2.0f, COL_WHITE, 4);
                    }
                } else if (t == TileType::BRICK) {
                    uint8_t& mask = brickMasks_[idx];
                    uint8_t hitQuads = 0;
                    for (int q = 0; q < 4; ++q) {
                        if ((mask & (1 << q)) == 0) continue;
                        float qx = FIELD_X + c * TILE_SIZE + (q % 2) * 8.0f;
                        float qy = FIELD_Y + r * TILE_SIZE + (q / 2) * 8.0f;
                        if (rectOverlap(b.x, b.y, 4.0f, 4.0f, qx, qy, 8.0f, 8.0f)) {
                            hitQuads |= (1 << q);
                        }
                    }
                    if (hitQuads != 0) {
                        // 水平子弹打掉同一行被命中的砖面，垂直子弹打掉同一列砖面
                        if (b.dir == Direction::UP || b.dir == Direction::DOWN) {
                            if (hitQuads & 0b0011) hitQuads |= 0b0011;
                            if (hitQuads & 0b1100) hitQuads |= 0b1100;
                        } else {
                            if (hitQuads & 0b0101) hitQuads |= 0b0101;
                            if (hitQuads & 0b1010) hitQuads |= 0b1010;
                        }
                        mask = static_cast<uint8_t>(mask & ~hitQuads);
                        if (mask == 0) tiles_[idx] = TileType::EMPTY;
                        b.active = false;
                        hitWall = true;
                        spawnExplosion(b.x + 2.0f, b.y + 2.0f, COL_BRICK, 6);
                    }
                }
            }
        }
        if (hitWall) continue;

        // 坦克命中判定
        if (b.fromPlayer) {
            for (auto& e : enemies_) {
                if (!e.active) continue;
                if (rectOverlap(b.x, b.y, 4.0f, 4.0f, e.x, e.y, 14.0f, 14.0f)) {
                    b.active = false;
                    if (e.isBonus) {
                        e.isBonus = false;
                        PowerUpType pt = static_cast<PowerUpType>(nextRand() % 6);
                        float px = FIELD_X + (1 + nextRand() % (GRID_COLS - 2)) * TILE_SIZE + 1.0f;
                        float py = FIELD_Y + (2 + nextRand() % (GRID_ROWS - 4)) * TILE_SIZE + 1.0f;
                        forceSpawnPowerUp(pt, px, py);
                    }
                    e.hp -= 1;
                    if (e.hp <= 0) {
                        e.active = false;
                        ++killsThisStage_;
                        int pts = 200;
                        switch (e.enemyType) {
                            case EnemyType::SCOUT:    pts = 100; break;
                            case EnemyType::STANDARD: pts = 200; break;
                            case EnemyType::ASSAULT:  pts = 350; break;
                            case EnemyType::HEAVY:    pts = 400; break;
                        }
                        score_ += pts;
                        if (score_ > highScore_) highScore_ = score_;
                        spawnExplosion(e.x + 7.0f, e.y + 7.0f, COL_GOLD, 16);
                    } else {
                        spawnExplosion(b.x + 2.0f, b.y + 2.0f, COL_WHITE, 5);
                    }
                    break;
                }
            }
        } else {
            if (player_.active &&
                rectOverlap(b.x, b.y, 4.0f, 4.0f, player_.x, player_.y, 14.0f, 14.0f)) {
                b.active = false;
                if (player_.shieldTimer <= 0.0f) {
                    spawnExplosion(player_.x + 7.0f, player_.y + 7.0f, COL_RED, 18);
                    --lives_;
                    if (lives_ > 0) {
                        player_.x = FIELD_X + 4 * TILE_SIZE + 1.0f;
                        player_.y = FIELD_Y + 12 * TILE_SIZE + 1.0f;
                        player_.dir = Direction::UP;
                        player_.tier = std::max(0, player_.tier - 1);
                        player_.shieldTimer = 3.0f;
                    } else {
                        player_.active = false;
                    }
                } else {
                    spawnExplosion(b.x + 2.0f, b.y + 2.0f, COL_CYAN, 4);
                }
            }
        }
    }
}

void TankGame::spawnExplosion(float cx, float cy, uint32_t baseColor, int count) {
    for (int i = 0; i < count; ++i) {
        Particle p;
        p.active = true;
        p.x = cx;
        p.y = cy;
        float ang = static_cast<float>(nextRand() % 360) * 3.14159f / 180.0f;
        float spd = 20.0f + static_cast<float>(nextRand() % 70);
        p.vx = std::cos(ang) * spd;
        p.vy = std::sin(ang) * spd;
        p.maxLife = 0.25f + static_cast<float>(nextRand() % 25) * 0.01f;
        p.life = p.maxLife;
        p.color = (i % 3 == 0) ? COL_WHITE : baseColor;
        p.size = (i % 2 == 0) ? 2 : 3;
        particles_.push_back(p);
    }
}

void TankGame::updateParticles(float dt) {
    for (auto& p : particles_) {
        if (!p.active) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        if (p.life <= 0.0f) p.active = false;
    }
    particles_.erase(std::remove_if(particles_.begin(), particles_.end(),
                                    [](const Particle& p) { return !p.active; }),
                     particles_.end());
}

// ==================== 软件像素光栅渲染 ====================
void TankGame::clearScreen(uint32_t rgba) {
    uint8_t r = static_cast<uint8_t>((rgba >> 24) & 0xFF);
    uint8_t g = static_cast<uint8_t>((rgba >> 16) & 0xFF);
    uint8_t b = static_cast<uint8_t>((rgba >> 8) & 0xFF);
    uint8_t a = static_cast<uint8_t>(rgba & 0xFF);
    for (size_t i = 0; i < fb_.size(); i += 4) {
        fb_[i] = r;
        fb_[i + 1] = g;
        fb_[i + 2] = b;
        fb_[i + 3] = a;
    }
}

void TankGame::putPixel(int x, int y, uint32_t rgba) {
    if (x < 0 || x >= SCREEN_W || y < 0 || y >= SCREEN_H) return;
    size_t idx = static_cast<size_t>((y * SCREEN_W + x) * 4);
    fb_[idx]     = static_cast<uint8_t>((rgba >> 24) & 0xFF);
    fb_[idx + 1] = static_cast<uint8_t>((rgba >> 16) & 0xFF);
    fb_[idx + 2] = static_cast<uint8_t>((rgba >> 8) & 0xFF);
    fb_[idx + 3] = static_cast<uint8_t>(rgba & 0xFF);
}

void TankGame::fillRect(int x, int y, int w, int h, uint32_t rgba) {
    int x0 = std::max(0, x);
    int y0 = std::max(0, y);
    int x1 = std::min(SCREEN_W, x + w);
    int y1 = std::min(SCREEN_H, y + h);
    for (int py = y0; py < y1; ++py) {
        for (int px = x0; px < x1; ++px) {
            putPixel(px, py, rgba);
        }
    }
}

void TankGame::drawRectOutline(int x, int y, int w, int h, uint32_t rgba) {
    fillRect(x, y, w, 1, rgba);
    fillRect(x, y + h - 1, w, 1, rgba);
    fillRect(x, y, 1, h, rgba);
    fillRect(x + w - 1, y, 1, h, rgba);
}

void TankGame::drawChar5x7(int x, int y, char c, uint32_t rgba, int scale) {
    const uint8_t* rows = findGlyph(c);
    for (int r = 0; r < 7; ++r) {
        for (int col = 0; col < 5; ++col) {
            if (rows[r] & (1 << (4 - col))) {
                fillRect(x + col * scale, y + r * scale, scale, scale, rgba);
            }
        }
    }
}

void TankGame::drawText(int x, int y, const std::string& text, uint32_t rgba, int scale) {
    int cx = x;
    for (char c : text) {
        drawChar5x7(cx, y, c, rgba, scale);
        cx += 6 * scale;
    }
}

void TankGame::drawTile(int col, int row, bool bushLayer) {
    TileType t = tileAt(col, row);
    if (bushLayer) {
        if (t != TileType::BUSH) return;
        int sx = FIELD_X + col * TILE_SIZE;
        int sy = FIELD_Y + row * TILE_SIZE;
        for (int py = 0; py < 16; py += 2) {
            for (int px = 0; px < 16; px += 2) {
                if (((px + py) % 4) == 0) {
                    fillRect(sx + px, sy + py, 2, 2, ((px * 3 + py) % 5 == 0) ? COL_BUSH_2 : COL_BUSH_1);
                }
            }
        }
        return;
    }

    if (t == TileType::EMPTY || t == TileType::BUSH) return;
    int sx = FIELD_X + col * TILE_SIZE;
    int sy = FIELD_Y + row * TILE_SIZE;

    switch (t) {
        case TileType::BRICK: {
            uint8_t mask = brickMaskAt(col, row);
            for (int q = 0; q < 4; ++q) {
                if ((mask & (1 << q)) == 0) continue;
                int qx = sx + (q % 2) * 8;
                int qy = sy + (q / 2) * 8;
                fillRect(qx, qy, 8, 8, COL_BRICK);
                fillRect(qx, qy + 3, 8, 1, COL_BRICK_MORT);
                fillRect(qx, qy + 7, 8, 1, COL_BRICK_MORT);
                fillRect(qx + 3, qy, 1, 4, COL_BRICK_MORT);
                fillRect(qx + 7, qy + 4, 1, 4, COL_BRICK_MORT);
            }
            break;
        }
        case TileType::STEEL: {
            fillRect(sx, sy, 16, 16, COL_STEEL_DK);
            fillRect(sx + 2, sy + 2, 12, 12, COL_STEEL);
            fillRect(sx + 5, sy + 5, 6, 6, COL_WHITE);
            break;
        }
        case TileType::WATER: {
            bool phase = (static_cast<int>(elapsed_ * 3.0f) % 2) == 0;
            fillRect(sx, sy, 16, 16, COL_WATER_1);
            fillRect(sx + (phase ? 2 : 5), sy + 3, 6, 2, COL_WATER_2);
            fillRect(sx + (phase ? 7 : 3), sy + 10, 6, 2, COL_WATER_2);
            break;
        }
        case TileType::ICE: {
            fillRect(sx, sy, 16, 16, COL_ICE_1);
            fillRect(sx + 2, sy + 2, 4, 1, COL_ICE_2);
            fillRect(sx + 9, sy + 7, 5, 1, COL_ICE_2);
            fillRect(sx + 3, sy + 12, 4, 1, COL_ICE_2);
            break;
        }
        case TileType::BASE: {
            if (baseAlive_) {
                fillRect(sx + 2, sy + 2, 12, 12, COL_STEEL_DK);
                fillRect(sx + 4, sy + 3, 8, 4, COL_GOLD);
                fillRect(sx + 2, sy + 6, 12, 3, COL_WHITE);
                fillRect(sx + 6, sy + 9, 4, 5, COL_GOLD);
                fillRect(sx + 4, sy + 13, 8, 2, COL_RED);
            } else {
                fillRect(sx + 2, sy + 2, 12, 12, 0x3A1A1AFFu);
                fillRect(sx + 3, sy + 10, 10, 4, COL_MUTED);
                drawChar5x7(sx + 5, sy + 4, 'X', COL_RED, 1);
            }
            break;
        }
        default: break;
    }
}

void TankGame::drawTankSprite(const TankEntity& t) {
    if (!t.active) return;
    int x = static_cast<int>(std::round(t.x));
    int y = static_cast<int>(std::round(t.y));

    uint32_t bodyCol = COL_PLAYER;
    uint32_t darkCol = COL_PLAYER_DK;

    if (!t.isPlayer) {
        if (t.isBonus && (static_cast<int>(elapsed_ * 8.0f) % 2 == 0)) {
            bodyCol = COL_RED;
            darkCol = 0x8A1F1FFF;
        } else {
            switch (t.enemyType) {
                case EnemyType::SCOUT:    bodyCol = 0xD8E2ECFFu; darkCol = 0x7A8B9EFFu; break;
                case EnemyType::STANDARD: bodyCol = 0xF08C36FFu; darkCol = 0x994C12FFu; break;
                case EnemyType::ASSAULT:  bodyCol = COL_PURPLE;  darkCol = 0x622485FFu; break;
                case EnemyType::HEAVY:
                    if (t.hp >= 3) { bodyCol = COL_GREEN; darkCol = 0x266B33FFu; }
                    else if (t.hp == 2) { bodyCol = COL_GOLD; darkCol = 0x8C6B14FFu; }
                    else { bodyCol = COL_RED; darkCol = 0x7A1C1CFFu; }
                    break;
            }
        }
    }

    int trackShift = (static_cast<int>(t.animDist / 3.0f) % 2);

    // 履带与车体
    if (t.dir == Direction::UP || t.dir == Direction::DOWN) {
        fillRect(x, y + 1, 3, 12, darkCol);
        fillRect(x + 11, y + 1, 3, 12, darkCol);
        for (int ty = trackShift; ty < 12; ty += 3) {
            fillRect(x, y + 1 + ty, 3, 1, COL_BORDER);
            fillRect(x + 11, y + 1 + ty, 3, 1, COL_BORDER);
        }
        fillRect(x + 3, y + 2, 8, 10, bodyCol);
        fillRect(x + 5, y + 4, 4, 6, darkCol);
        // 炮管
        if (t.dir == Direction::UP) {
            fillRect(x + 6, y - 1, 2, 6, COL_WHITE);
        } else {
            fillRect(x + 6, y + 9, 2, 6, COL_WHITE);
        }
    } else {
        fillRect(x + 1, y, 12, 3, darkCol);
        fillRect(x + 1, y + 11, 12, 3, darkCol);
        for (int tx = trackShift; tx < 12; tx += 3) {
            fillRect(x + 1 + tx, y, 1, 3, COL_BORDER);
            fillRect(x + 1 + tx, y + 11, 1, 3, COL_BORDER);
        }
        fillRect(x + 2, y + 3, 10, 8, bodyCol);
        fillRect(x + 4, y + 5, 6, 4, darkCol);
        if (t.dir == Direction::LEFT) {
            fillRect(x - 1, y + 6, 6, 2, COL_WHITE);
        } else {
            fillRect(x + 9, y + 6, 6, 2, COL_WHITE);
        }
    }

    // 护盾闪烁环
    if (t.isPlayer && t.shieldTimer > 0.0f) {
        uint32_t sCol = (static_cast<int>(elapsed_ * 12.0f) % 2 == 0) ? COL_CYAN : COL_WHITE;
        drawRectOutline(x - 1, y - 1, 16, 16, sCol);
    }
}

void TankGame::drawPowerUpSprite(const PowerUp& p) {
    if (!p.active) return;
    if (p.timer < 3.0f && (static_cast<int>(elapsed_ * 10.0f) % 2 == 0)) return;

    int x = static_cast<int>(p.x);
    int y = static_cast<int>(p.y);
    fillRect(x, y, 14, 14, 0x161D29FFu);
    drawRectOutline(x, y, 14, 14, COL_GOLD);

    char sym = '*';
    uint32_t col = COL_GOLD;
    switch (p.type) {
        case PowerUpType::STAR:   sym = '*'; col = COL_GOLD; break;
        case PowerUpType::SHIELD: sym = 'S'; col = COL_CYAN; break;
        case PowerUpType::BOMB:   sym = 'B'; col = COL_RED; break;
        case PowerUpType::CLOCK:  sym = 'T'; col = COL_WHITE; break;
        case PowerUpType::SHOVEL: sym = 'H'; col = COL_GREEN; break;
        case PowerUpType::LIFE:   sym = '+'; col = COL_GREEN; break;
    }
    drawChar5x7(x + 5, y + 4, sym, col, 1);
}

void TankGame::drawHUD() {
    fillRect(HUD_X, 0, SCREEN_W - HUD_X, SCREEN_H, COL_BORDER);
    fillRect(HUD_X + 4, 8, SCREEN_W - HUD_X - 8, SCREEN_H - 16, 0x141923FFu);

    int x = HUD_X + 10;
    drawText(x, 16, "STAGE", COL_MUTED, 1);
    drawText(x + 48, 16, std::to_string(stage_), COL_GOLD, 1);

    drawText(x, 34, "SCORE", COL_MUTED, 1);
    drawText(x, 46, std::to_string(score_), COL_WHITE, 1);

    drawText(x, 66, "BEST", COL_MUTED, 1);
    drawText(x, 78, std::to_string(highScore_), COL_CYAN, 1);

    drawText(x, 98, "ENEMY", COL_MUTED, 1);
    int rem = snapshot().enemiesRemaining;
    for (int i = 0; i < std::min(rem, 16); ++i) {
        int ix = x + (i % 4) * 16;
        int iy = 110 + (i / 4) * 10;
        fillRect(ix, iy, 10, 7, COL_RED);
        fillRect(ix + 3, iy - 2, 4, 2, COL_WHITE);
    }

    drawText(x, 160, "LIVES", COL_MUTED, 1);
    drawText(x + 44, 160, std::to_string(std::max(0, lives_)), COL_GREEN, 1);

    drawText(x, 178, "TIER", COL_MUTED, 1);
    for (int t = 0; t <= player_.tier; ++t) {
        drawChar5x7(x + t * 10, 190, '*', COL_GOLD, 1);
    }

    if (freezeTimer_ > 0.0f) {
        drawText(x, 210, "FREEZE", COL_CYAN, 1);
    } else if (shovelTimer_ > 0.0f) {
        drawText(x, 210, "FORT", COL_GREEN, 1);
    }
}

void TankGame::render() {
    clearScreen(COL_BORDER);
    fillRect(FIELD_X, FIELD_Y, FIELD_W, FIELD_H, COL_FIELD_BG);

    for (int r = 0; r < GRID_ROWS; ++r) {
        for (int c = 0; c < GRID_COLS; ++c) {
            drawTile(c, r, false);
        }
    }

    drawTankSprite(player_);
    for (const auto& e : enemies_) {
        drawTankSprite(e);
    }

    for (const auto& b : bullets_) {
        if (!b.active) continue;
        fillRect(static_cast<int>(b.x), static_cast<int>(b.y), 4, 4,
                 b.fromPlayer ? (b.armorPiercing ? COL_CYAN : COL_GOLD) : COL_WHITE);
    }

    // 草丛绘制在坦克和子弹上方
    for (int r = 0; r < GRID_ROWS; ++r) {
        for (int c = 0; c < GRID_COLS; ++c) {
            drawTile(c, r, true);
        }
    }

    drawPowerUpSprite(powerUp_);

    for (const auto& p : particles_) {
        if (!p.active) continue;
        fillRect(static_cast<int>(p.x), static_cast<int>(p.y), p.size, p.size, p.color);
    }

    drawHUD();

    // 阶段浮层文字
    if (phase_ == GamePhase::TITLE) {
        fillRect(32, 68, 176, 96, 0x101622E8u);
        drawRectOutline(32, 68, 176, 96, COL_GOLD);
        drawText(48, 84, "TANK BATTLE", COL_GOLD, 2);
        drawText(54, 114, "PRESS FIRE/ENTER", COL_WHITE, 1);
        drawText(60, 134, "WASD + SPACE", COL_CYAN, 1);
    } else if (phase_ == GamePhase::STAGE_INTRO) {
        fillRect(52, 98, 136, 40, 0x101622E8u);
        drawRectOutline(52, 98, 136, 40, COL_GOLD);
        drawText(78, 110, "STAGE " + std::to_string(stage_), COL_GOLD, 2);
    } else if (phase_ == GamePhase::PAUSED) {
        fillRect(62, 100, 116, 36, 0x101622E8u);
        drawRectOutline(62, 100, 116, 36, COL_CYAN);
        drawText(84, 110, "PAUSED", COL_WHITE, 2);
    } else if (phase_ == GamePhase::STAGE_CLEAR) {
        fillRect(42, 96, 156, 42, 0x101622E8u);
        drawRectOutline(42, 96, 156, 42, COL_GREEN);
        drawText(54, 109, "STAGE CLEAR!", COL_GREEN, 2);
    } else if (phase_ == GamePhase::GAME_OVER) {
        fillRect(44, 88, 152, 60, 0x1A0B0EE8u);
        drawRectOutline(44, 88, 152, 60, COL_RED);
        drawText(64, 100, "GAME OVER", COL_RED, 2);
        drawText(58, 128, "PRESS ENTER", COL_WHITE, 1);
    } else if (phase_ == GamePhase::VICTORY) {
        fillRect(38, 84, 164, 68, 0x0C1D14E8u);
        drawRectOutline(38, 84, 164, 68, COL_GOLD);
        drawText(68, 96, "VICTORY!", COL_GOLD, 2);
        drawText(52, 122, "SCORE " + std::to_string(score_), COL_WHITE, 1);
    }
}

} // namespace tank
