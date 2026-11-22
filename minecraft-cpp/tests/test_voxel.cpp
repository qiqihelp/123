#include "voxel_core.hpp"

#include <cassert>
#include <cstdio>
#include <iostream>

using namespace voxel;

int main() {
    VoxelWorld world(20261121u);

    // 1. 基岩不可破坏
    assert(world.getBlock(10, 0, 10) == BLK_BEDROCK);
    assert(!world.setBlock(10, 0, 10, BLK_AIR));
    assert(world.getBlock(10, 0, 10) == BLK_BEDROCK);

    // 2. 出生点附近安全站立 & 物理重力碰撞
    PlayerState p;
    world.findSafeSpawn(p.x, p.y, p.z);
    for (int i = 0; i < 60; ++i) {
        world.stepPhysics(p, 1.0f / 60.0f, 0.0f, 0.0f, false, false, false);
    }
    assert(p.onGround);

    // 3. 飞行模式上升
    float yBefore = p.y;
    p.flying = true;
    for (int i = 0; i < 20; ++i) {
        world.stepPhysics(p, 1.0f / 60.0f, 0.0f, 0.0f, true, false, false);
    }
    assert(p.y > yBefore + 1.0f);

    // 4. DDA 射线检测与方块放置/破坏
    assert(world.setBlock(20, 20, 20, BLK_STONE));
    RayHit hit = world.raycast(20.5f, 23.5f, 20.5f, 0.0f, -1.0f, 0.0f, 6.0f);
    assert(hit.hit);
    assert(hit.bx == 20 && hit.by == 20 && hit.bz == 20);
    assert(hit.ny == 1);
    assert(hit.block == BLK_STONE);

    // 5. TNT 爆炸破坏
    assert(world.setBlock(20, 21, 20, BLK_BRICK));
    assert(world.setBlock(21, 20, 20, BLK_TNT));
    auto destroyed = world.detonateTNT(21, 20, 20, 3.0f);
    assert(!destroyed.empty());
    assert(world.getBlock(20, 20, 20) == BLK_AIR);
    assert(world.getBlock(20, 21, 20) == BLK_AIR);

    // 6. 二进制存档与读档一致性
    const char* tmpPath = "/tmp/test_voxel_world.bin";
    assert(world.saveToFile(tmpPath));
    VoxelWorld loaded(1u);
    assert(loaded.loadFromFile(tmpPath));
    assert(loaded.seed() == world.seed());
    assert(loaded.getBlock(20, 20, 20) == BLK_AIR);
    assert(loaded.getBlock(10, 0, 10) == BLK_BEDROCK);
    std::remove(tmpPath);

    std::cout << "All C++17 VoxelWorld engine assertions passed!" << std::endl;
    return 0;
}
