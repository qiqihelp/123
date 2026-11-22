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

    // 1. 按确认键进入 Stage 1 并度过开场字幕
    InputState startInp;
    startInp.confirmPressed = true;
    game.update(1.0f / 60.0f, startInp);
    assert(game.snapshot().phase == GamePhase::STAGE_INTRO);

    stepFrames(game, InputState{}, 120); // 2 秒后进入 PLAYING
    assert(game.snapshot().phase == GamePhase::PLAYING);
    assert(game.player().active);
    assert(game.snapshot().baseAlive);

    // 2. 玩家移动与开火
    float startY = game.player().y;
    InputState moveUp;
    moveUp.up = true;
    moveUp.fire = true;
    stepFrames(game, moveUp, 20);
    assert(game.player().y < startY);
    assert(!game.bullets().empty());

    // 3. 强化道具：STAR 升到 Tier 3 可以击穿钢墙
    game.forceSpawnPowerUp(PowerUpType::STAR, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.player().tier == 1);

    game.forceSpawnPowerUp(PowerUpType::STAR, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    game.forceSpawnPowerUp(PowerUpType::STAR, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.player().tier == 3);

    // 4. SHOVEL 加固基地外围为钢墙，LIFE +1
    int livesBefore = game.snapshot().lives;
    game.forceSpawnPowerUp(PowerUpType::LIFE, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.snapshot().lives == livesBefore + 1);

    game.forceSpawnPowerUp(PowerUpType::SHOVEL, game.player().x, game.player().y);
    game.update(1.0f / 60.0f, InputState{});
    assert(game.tileAt(5, 12) == TileType::STEEL);
    assert(game.tileAt(6, 11) == TileType::STEEL);

    // 5. 砖墙局部破坏检查（Stage 1 第 9 行第 3 列是砖墙）
    assert(game.tileAt(3, 9) == TileType::BRICK);
    assert(game.brickMaskAt(3, 9) == 0x0F);

    // 6. 暂停与恢复
    InputState pauseInp;
    pauseInp.pausePressed = true;
    game.update(1.0f / 60.0f, pauseInp);
    assert(game.snapshot().phase == GamePhase::PAUSED);
    game.update(1.0f / 60.0f, pauseInp);
    assert(game.snapshot().phase == GamePhase::PLAYING);

    // 7. 渲染缓冲验证
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

    std::cout << "All C++17 TankGame engine assertions passed!" << std::endl;
    return 0;
}
