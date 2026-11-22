#pragma once

#include <array>
#include <cstdint>
#include <string>
#include <vector>

namespace voxel {

inline constexpr int WORLD_X = 64;
inline constexpr int WORLD_Y = 40;
inline constexpr int WORLD_Z = 64;
inline constexpr int WORLD_VOL = WORLD_X * WORLD_Y * WORLD_Z;
inline constexpr int SEA_LEVEL = 12;

enum BlockId : uint8_t {
    BLK_AIR        = 0,
    BLK_GRASS      = 1,
    BLK_DIRT       = 2,
    BLK_STONE      = 3,
    BLK_COBBLE     = 4,
    BLK_LOG        = 5,
    BLK_LEAVES     = 6,
    BLK_PLANKS     = 7,
    BLK_SAND       = 8,
    BLK_WATER      = 9,
    BLK_GLASS      = 10,
    BLK_BRICK      = 11,
    BLK_GLOWSTONE  = 12,
    BLK_TNT        = 13,
    BLK_DIAMOND    = 14,
    BLK_GOLD       = 15,
    BLK_BEDROCK    = 16
};

struct RayHit {
    bool hit = false;
    int bx = 0, by = 0, bz = 0; // 命中的方块坐标
    int nx = 0, ny = 0, nz = 0; // 命中面法线（用于放置新方块）
    BlockId block = BLK_AIR;
};

struct PlayerState {
    float x = 32.5f;
    float y = 22.0f;
    float z = 32.5f;
    float vx = 0.0f;
    float vy = 0.0f;
    float vz = 0.0f;
    float yaw = 0.0f;
    float pitch = 0.0f;
    bool onGround = false;
    bool flying = false;
};

struct BlockPos {
    int x, y, z;
};

class VoxelWorld {
public:
    explicit VoxelWorld(uint32_t seed = 20261121u);

    void generate(uint32_t seed);
    uint32_t seed() const { return seed_; }

    bool inBounds(int x, int y, int z) const;
    BlockId getBlock(int x, int y, int z) const;
    bool setBlock(int x, int y, int z, BlockId id);

    // Amanatides & Woo 3D DDA 射线检测
    RayHit raycast(float ox, float oy, float oz,
                   float dx, float dy, float dz,
                   float maxDist = 6.5f) const;

    // 玩家 AABB 物理与碰撞
    void stepPhysics(PlayerState& p, float dt,
                     float moveForward, float moveRight,
                     bool jump, bool sprint, bool descend) const;

    // TNT 爆炸破坏（返回被炸毁的方块列表）
    std::vector<BlockPos> detonateTNT(int cx, int cy, int cz, float radius = 3.5f);

    int surfaceHeight(int x, int z) const;
    void findSafeSpawn(float& outX, float& outY, float& outZ) const;

    const uint8_t* rawData() const { return blocks_.data(); }
    size_t rawSize() const { return blocks_.size(); }

    bool saveToFile(const std::string& path) const;
    bool loadFromFile(const std::string& path);

private:
    uint32_t seed_ = 20261121u;
    std::array<uint8_t, WORLD_VOL> blocks_{};

    static int index(int x, int y, int z) {
        return (y * WORLD_Z + z) * WORLD_X + x;
    }

    float hash2D(int x, int z) const;
    float noise2D(float x, float z) const;
    float fbm2D(float x, float z, int octaves = 4) const;
    float hash3D(int x, int y, int z) const;
    float noise3D(float x, float y, float z) const;
    void placeTree(int tx, int baseY, int tz);
    bool isSolidForPhysics(int x, int y, int z) const;
    bool playerCollides(float px, float py, float pz) const;
};

} // namespace voxel
