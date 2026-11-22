#pragma once

#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace tank {

inline constexpr int SCREEN_W = 320;
inline constexpr int SCREEN_H = 240;
inline constexpr int FIELD_X = 16;
inline constexpr int FIELD_Y = 16;
inline constexpr int TILE_SIZE = 16;
inline constexpr int GRID_COLS = 13;
inline constexpr int GRID_ROWS = 13;
inline constexpr int FIELD_W = GRID_COLS * TILE_SIZE; // 208
inline constexpr int FIELD_H = GRID_ROWS * TILE_SIZE; // 208
inline constexpr int HUD_X = FIELD_X + FIELD_W;       // 224

enum class Direction : uint8_t {
    UP = 0,
    RIGHT = 1,
    DOWN = 2,
    LEFT = 3
};

enum class TileType : uint8_t {
    EMPTY = 0,
    BRICK = 1,
    STEEL = 2,
    WATER = 3,
    BUSH  = 4,
    ICE   = 5,
    BASE  = 6
};

enum class EnemyType : uint8_t {
    SCOUT = 0,
    STANDARD = 1,
    HEAVY = 2,
    ASSAULT = 3
};

enum class PowerUpType : uint8_t {
    STAR = 0,   // 火力升级
    SHIELD = 1, // 无敌护盾
    BOMB = 2,   // 全屏炸毁当前敌军
    CLOCK = 3,  // 冻结敌军
    SHOVEL = 4, // 基地钢墙加固
    LIFE = 5    // 额外生命 +1
};

enum class GamePhase : uint8_t {
    TITLE = 0,
    STAGE_INTRO = 1,
    PLAYING = 2,
    PAUSED = 3,
    STAGE_CLEAR = 4,
    GAME_OVER = 5,
    VICTORY = 6
};

struct InputState {
    bool up = false;
    bool down = false;
    bool left = false;
    bool right = false;
    bool fire = false;
    bool pausePressed = false;
    bool confirmPressed = false;
};

struct TankEntity {
    bool active = false;
    bool isPlayer = false;
    EnemyType enemyType = EnemyType::STANDARD;
    float x = 0.0f;
    float y = 0.0f;
    Direction dir = Direction::UP;
    int hp = 1;
    int maxHp = 1;
    int tier = 0;          // 玩家火力等级 0..3
    float speed = 60.0f;
    float fireCooldown = 0.0f;
    float shieldTimer = 0.0f;
    float aiTurnTimer = 0.0f;
    float aiFireTimer = 0.0f;
    float animDist = 0.0f;
    bool isBonus = false;
};

struct Bullet {
    bool active = false;
    bool fromPlayer = false;
    bool armorPiercing = false;
    float x = 0.0f;
    float y = 0.0f;
    Direction dir = Direction::UP;
    float speed = 175.0f;
};

struct PowerUp {
    bool active = false;
    PowerUpType type = PowerUpType::STAR;
    float x = 0.0f;
    float y = 0.0f;
    float timer = 14.0f;
};

struct Particle {
    bool active = false;
    float x = 0.0f;
    float y = 0.0f;
    float vx = 0.0f;
    float vy = 0.0f;
    float life = 0.0f;
    float maxLife = 0.4f;
    uint32_t color = 0xFFFFFFFFu;
    int size = 2;
};

struct GameSnapshot {
    GamePhase phase = GamePhase::TITLE;
    int stage = 1;
    int totalStages = 5;
    int score = 0;
    int highScore = 0;
    int lives = 3;
    int enemiesRemaining = 0;
    int enemiesAlive = 0;
    int killsThisStage = 0;
    bool baseAlive = true;
    float freezeTimer = 0.0f;
    float shovelTimer = 0.0f;
};

class TankGame {
public:
    TankGame();

    void resetAll();
    void startNewGame();
    void loadStage(int stageNum);
    void update(float dt, const InputState& input);
    void render();

    const uint8_t* framebufferRGBA() const { return fb_.data(); }
    int width() const { return SCREEN_W; }
    int height() const { return SCREEN_H; }

    GameSnapshot snapshot() const;
    const TankEntity& player() const { return player_; }
    const std::vector<TankEntity>& enemies() const { return enemies_; }
    const std::vector<Bullet>& bullets() const { return bullets_; }
    const PowerUp& powerUp() const { return powerUp_; }
    TileType tileAt(int col, int row) const;
    uint8_t brickMaskAt(int col, int row) const;

    void setHighScore(int hs) { if (hs > highScore_) highScore_ = hs; }
    int highScore() const { return highScore_; }

    // 测试/调试辅助
    void forceSpawnPowerUp(PowerUpType type, float x, float y);
    void setEnemyFreeze(float seconds) { freezeTimer_ = seconds; }

private:
    std::array<uint8_t, SCREEN_W * SCREEN_H * 4> fb_{};

    std::array<TileType, GRID_COLS * GRID_ROWS> tiles_{};
    std::array<uint8_t, GRID_COLS * GRID_ROWS> brickMasks_{};

    TankEntity player_{};
    std::vector<TankEntity> enemies_;
    std::vector<Bullet> bullets_;
    std::vector<Particle> particles_;
    PowerUp powerUp_{};

    GamePhase phase_ = GamePhase::TITLE;
    int stage_ = 1;
    int score_ = 0;
    int highScore_ = 0;
    int lives_ = 3;
    int killsThisStage_ = 0;
    bool baseAlive_ = true;

    std::vector<EnemyType> spawnQueue_;
    int spawnedCount_ = 0;
    float spawnTimer_ = 0.0f;
    int nextSpawnSlot_ = 0;

    float phaseTimer_ = 0.0f;
    float freezeTimer_ = 0.0f;
    float shovelTimer_ = 0.0f;
    float elapsed_ = 0.0f;
    uint32_t rngState_ = 0x13572468u;

    uint32_t nextRand();
    void setBaseWall(TileType t);
    void spawnEnemy();
    void updatePlayer(float dt, const InputState& input);
    void updateEnemies(float dt);
    void updateBullets(float dt);
    void updateParticles(float dt);
    bool moveTank(TankEntity& tank, Direction dir, float dist);
    bool tankCollidesWorld(float x, float y, const TankEntity* self) const;
    void fireBullet(TankEntity& tank);
    void spawnExplosion(float cx, float cy, uint32_t baseColor, int count);
    void collectPowerUp(PowerUpType type);
    int activeBulletsFor(bool fromPlayer) const;

    // 像素光栅绘制
    void clearScreen(uint32_t rgba);
    void putPixel(int x, int y, uint32_t rgba);
    void fillRect(int x, int y, int w, int h, uint32_t rgba);
    void drawRectOutline(int x, int y, int w, int h, uint32_t rgba);
    void drawChar5x7(int x, int y, char c, uint32_t rgba, int scale = 1);
    void drawText(int x, int y, const std::string& text, uint32_t rgba, int scale = 1);
    void drawTile(int col, int row, bool bushLayer);
    void drawTankSprite(const TankEntity& t);
    void drawPowerUpSprite(const PowerUp& p);
    void drawHUD();
};

} // namespace tank
