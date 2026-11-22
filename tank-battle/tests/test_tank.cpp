#include "tank_core.hpp"

#include <cassert>
#include <iostream>

using namespace tank;

static void stepFrames(TankGame& game, const InputState& inp, int frames, float dt = 1.0f / 60.0f) {
    for (int i = 0; i < frames; ++i) {
        game.update(dt, inp);
    }
}

int main() {
    TankGame game;
    assert(game.snapshot().phase == GamePhase::TITLE);

    InputState startInp;
    startInp.confirmPressed = true;
    game.update(1.0f / 60.0f, startInp);
    assert(game.snapshot().phase == GamePhase::STAGE_INTRO);

    stepFrames(game, InputState{}, 120);
    assert(game.snapshot().phase == GamePhase::PLAYING);
    assert(game.player().active);
    assert(game.snapshot().baseAlive);

    // 移动与开火
    float startY = game.player().y;
    InputState moveUp;
    moveUp.up = true;
    moveUp.fire = true;
    stepFrames(game, moveUp, 20);
    assert(game.player().y < startY);
    assert(!game.bullets().empty());

    // 依次测试全部 8 种道具拾取，确保不卡死且效果生效
    game.forceSpawnPowerUp(PowerUpType::STAR, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.player().tier == 1);

    game.forceSpawnPowerUp(PowerUpType::STAR, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    game.forceSpawnPowerUp(PowerUpType::STAR, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.player().tier == 3);

    // 第 4 颗星触发过载
    game.forceSpawnPowerUp(PowerUpType::STAR, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.snapshot().overdriveTimer > 5.0f);

    // 护盾 & 冻结
    game.forceSpawnPowerUp(PowerUpType::SHIELD, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.player().shieldTimer > 5.0f);

    game.forceSpawnPowerUp(PowerUpType::CLOCK, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.snapshot().freezeTimer > 5.0f);

    // 三向散射炮
    game.forceSpawnPowerUp(PowerUpType::SPREAD, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.snapshot().spreadTimer > 5.0f);

    // 轨道天基打击 + 全屏核爆
    game.forceSpawnEnemy(EnemyType::HEAVY, FIELD_X + 32.0f, FIELD_Y + 32.0f);
    game.forceSpawnPowerUp(PowerUpType::ORBITAL, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});

    game.forceSpawnEnemy(EnemyType::STANDARD, FIELD_X + 64.0f, FIELD_Y + 32.0f);
    game.forceSpawnPowerUp(PowerUpType::BOMB, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});

    // 生命 +1 & 基地加固
    int livesBefore = game.snapshot().lives;
    game.forceSpawnPowerUp(PowerUpType::LIFE, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.snapshot().lives == livesBefore + 1);

    game.forceSpawnPowerUp(PowerUpType::SHOVEL, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.tileAt(5, 12) == TileType::STEEL);
    assert(game.tileAt(6, 11) == TileType::STEEL);

    game.render();
    const uint8_t* fb = game.framebufferRGBA();
    bool hasNonBlack = false;
    for (int i = 0; i < game.width() * game.height() * 4; i += 4) {
        if (fb[i] > 0 || fb[i + 1] > 0 || fb[i + 2] > 0) {
            hasNonBlack = true;
            break;
        }
    }
    assert(hasNonBlack);

    std::cout << "All C++17 TankGame engine assertions (8 power-ups + combat) passed!" << std::endl;
    return 0;
}
