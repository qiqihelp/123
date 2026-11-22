#include "voxel_core.hpp"

#include <algorithm>
#include <cmath>
#include <fstream>

namespace voxel {

VoxelWorld::VoxelWorld(uint32_t seed) {
    generate(seed);
}

bool VoxelWorld::inBounds(int x, int y, int z) const {
    return x >= 0 && x < WORLD_X && y >= 0 && y < WORLD_Y && z >= 0 && z < WORLD_Z;
}

BlockId VoxelWorld::getBlock(int x, int y, int z) const {
    if (!inBounds(x, y, z)) return BLK_AIR;
    return static_cast<BlockId>(blocks_[index(x, y, z)]);
}

bool VoxelWorld::setBlock(int x, int y, int z, BlockId id) {
    if (!inBounds(x, y, z)) return false;
    if (y == 0 && id == BLK_AIR) return false; // 基岩不可破坏
    blocks_[index(x, y, z)] = static_cast<uint8_t>(id);
    return true;
}

float VoxelWorld::hash2D(int x, int z) const {
    uint32_t h = static_cast<uint32_t>(x * 374761393 + z * 668265263) ^ (seed_ * 1274126177u);
    h = (h ^ (h >> 13)) * 1274126177u;
    h ^= (h >> 16);
    return static_cast<float>(h & 0xFFFFu) / 65535.0f;
}

float VoxelWorld::hash3D(int x, int y, int z) const {
    uint32_t h = static_cast<uint32_t>(x * 374761393 + y * 2147483647 + z * 668265263) ^ (seed_ * 2246822519u);
    h = (h ^ (h >> 13)) * 3266489917u;
    h ^= (h >> 16);
    return static_cast<float>(h & 0xFFFFu) / 65535.0f;
}

float VoxelWorld::noise2D(float x, float z) const {
    int xi = static_cast<int>(std::floor(x));
    int zi = static_cast<int>(std::floor(z));
    float xf = x - static_cast<float>(xi);
    float zf = z - static_cast<float>(zi);

    auto smooth = [](float t) { return t * t * (3.0f - 2.0f * t); };
    float u = smooth(xf);
    float v = smooth(zf);

    float a = hash2D(xi, zi);
    float b = hash2D(xi + 1, zi);
    float c = hash2D(xi, zi + 1);
    float d = hash2D(xi + 1, zi + 1);

    float x1 = a + (b - a) * u;
    float x2 = c + (d - c) * u;
    return x1 + (x2 - x1) * v;
}

float VoxelWorld::fbm2D(float x, float z, int octaves) const {
    float sum = 0.0f;
    float amp = 0.5f;
    float freq = 1.0f;
    float norm = 0.0f;
    for (int i = 0; i < octaves; ++i) {
        sum += noise2D(x * freq, z * freq) * amp;
        norm += amp;
        amp *= 0.5f;
        freq *= 2.05f;
    }
    return sum / norm;
}

void VoxelWorld::placeTree(int tx, int baseY, int tz) {
    if (tx < 3 || tx >= WORLD_X - 3 || tz < 3 || tz >= WORLD_Z - 3) return;
    if (baseY + 7 >= WORLD_Y) return;

    int trunkH = 4 + static_cast<int>(hash2D(tx * 7, tz * 11) * 2.0f);
    for (int dy = 0; dy < trunkH; ++dy) {
        setBlock(tx, baseY + dy, tz, BLK_LOG);
    }

    int topY = baseY + trunkH;
    for (int dy = -2; dy <= 1; ++dy) {
        int rad = (dy == 1) ? 1 : 2;
        for (int dx = -rad; dx <= rad; ++dx) {
            for (int dz = -rad; dz <= rad; ++dz) {
                if (std::abs(dx) == 2 && std::abs(dz) == 2 && (dy == -2 || dy == 0)) continue;
                int lx = tx + dx, ly = topY + dy, lz = tz + dz;
                if (getBlock(lx, ly, lz) == BLK_AIR) {
                    setBlock(lx, ly, lz, BLK_LEAVES);
                }
            }
        }
    }
}

void VoxelWorld::generate(uint32_t seed) {
    seed_ = seed;
    blocks_.fill(BLK_AIR);

    for (int z = 0; z < WORLD_Z; ++z) {
        for (int x = 0; x < WORLD_X; ++x) {
            float n = fbm2D(static_cast<float>(x) * 0.042f, static_cast<float>(z) * 0.042f, 4);
            float ridge = fbm2D(static_cast<float>(x) * 0.09f + 41.0f, static_cast<float>(z) * 0.09f - 19.0f, 2);
            int h = static_cast<int>(std::round(8.0f + n * 16.0f + (ridge - 0.5f) * 5.0f));
            h = std::clamp(h, 4, WORLD_Y - 10);

            setBlock(x, 0, z, BLK_BEDROCK);
            for (int y = 1; y <= h; ++y) {
                if (y == h) {
                    setBlock(x, y, z, (h <= SEA_LEVEL + 1) ? BLK_SAND : BLK_GRASS);
                } else if (y >= h - 3) {
                    setBlock(x, y, z, (h <= SEA_LEVEL + 1) ? BLK_SAND : BLK_DIRT);
                } else {
                    float ore = hash3D(x, y, z);
                    if (y <= 6 && ore > 0.965f) {
                        setBlock(x, y, z, BLK_DIAMOND);
                    } else if (y <= 11 && ore > 0.945f) {
                        setBlock(x, y, z, BLK_GOLD);
                    } else {
                        setBlock(x, y, z, BLK_STONE);
                    }
                }
            }

            // 海平面以下填充水
            if (h < SEA_LEVEL) {
                for (int y = h + 1; y <= SEA_LEVEL; ++y) {
                    setBlock(x, y, z, BLK_WATER);
                }
            }
        }
    }

    // 种植橡树森林
    for (int z = 4; z < WORLD_Z - 4; z += 4) {
        for (int x = 4; x < WORLD_X - 4; x += 4) {
            // 避开出生点正中央小区域
            if (std::abs(x - 32) <= 4 && std::abs(z - 32) <= 4) continue;
            float r = hash2D(x * 13 + 3, z * 17 + 9);
            if (r > 0.62f) {
                int jx = x + static_cast<int>((hash2D(x + 1, z) - 0.5f) * 2.5f);
                int jz = z + static_cast<int>((hash2D(x, z + 1) - 0.5f) * 2.5f);
                int sy = surfaceHeight(jx, jz);
                if (sy > SEA_LEVEL + 1 && getBlock(jx, sy, jz) == BLK_GRASS) {
                    placeTree(jx, sy + 1, jz);
                }
            }
        }
    }

    // 在出生点附近建造一个温馨的起始石砖观景台 + 萤石灯柱
    int baseY = surfaceHeight(32, 32);
    if (baseY <= SEA_LEVEL) baseY = SEA_LEVEL + 1;
    for (int dz = -2; dz <= 2; ++dz) {
        for (int dx = -2; dx <= 2; ++dx) {
            setBlock(32 + dx, baseY, 32 + dz, (std::abs(dx) == 2 || std::abs(dz) == 2) ? BLK_COBBLE : BLK_PLANKS);
            for (int cy = 1; cy <= 4; ++cy) {
                setBlock(32 + dx, baseY + cy, 32 + dz, BLK_AIR);
            }
        }
    }
    setBlock(30, baseY + 1, 30, BLK_LOG);
    setBlock(30, baseY + 2, 30, BLK_GLOWSTONE);
    setBlock(34, baseY + 1, 30, BLK_LOG);
    setBlock(34, baseY + 2, 30, BLK_GLOWSTONE);
    setBlock(34, baseY + 1, 34, BLK_TNT);
}

int VoxelWorld::surfaceHeight(int x, int z) const {
    x = std::clamp(x, 0, WORLD_X - 1);
    z = std::clamp(z, 0, WORLD_Z - 1);
    for (int y = WORLD_Y - 1; y >= 0; --y) {
        BlockId b = getBlock(x, y, z);
        if (b != BLK_AIR && b != BLK_WATER && b != BLK_LEAVES) {
            return y;
        }
    }
    return 1;
}

void VoxelWorld::findSafeSpawn(float& outX, float& outY, float& outZ) const {
    int sy = surfaceHeight(32, 32);
    outX = 32.5f;
    outY = static_cast<float>(sy) + 1.1f;
    outZ = 32.5f;
}

RayHit VoxelWorld::raycast(float ox, float oy, float oz,
                           float dx, float dy, float dz,
                           float maxDist) const {
    RayHit res;
    float len = std::sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-6f) return res;
    dx /= len; dy /= len; dz /= len;

    int x = static_cast<int>(std::floor(ox));
    int y = static_cast<int>(std::floor(oy));
    int z = static_cast<int>(std::floor(oz));

    int stepX = (dx > 0.0f) ? 1 : -1;
    int stepY = (dy > 0.0f) ? 1 : -1;
    int stepZ = (dz > 0.0f) ? 1 : -1;

    auto initTMax = [](float origin, float dir, int cell) -> float {
        if (std::abs(dir) < 1e-6f) return 1e30f;
        float boundary = static_cast<float>(cell + (dir > 0.0f ? 1 : 0));
        return (boundary - origin) / dir;
    };

    float tMaxX = initTMax(ox, dx, x);
    float tMaxY = initTMax(oy, dy, y);
    float tMaxZ = initTMax(oz, dz, z);

    float tDeltaX = (std::abs(dx) < 1e-6f) ? 1e30f : std::abs(1.0f / dx);
    float tDeltaY = (std::abs(dy) < 1e-6f) ? 1e30f : std::abs(1.0f / dy);
    float tDeltaZ = (std::abs(dz) < 1e-6f) ? 1e30f : std::abs(1.0f / dz);

    float dist = 0.0f;
    int nx = 0, ny = 0, nz = 0;

    while (dist <= maxDist) {
        if (inBounds(x, y, z)) {
            BlockId b = getBlock(x, y, z);
            if (b != BLK_AIR && b != BLK_WATER) {
                res.hit = true;
                res.bx = x; res.by = y; res.bz = z;
                res.nx = nx; res.ny = ny; res.nz = nz;
                res.block = b;
                return res;
            }
        }
        if (tMaxX < tMaxY) {
            if (tMaxX < tMaxZ) {
                dist = tMaxX;
                tMaxX += tDeltaX;
                x += stepX;
                nx = -stepX; ny = 0; nz = 0;
            } else {
                dist = tMaxZ;
                tMaxZ += tDeltaZ;
                z += stepZ;
                nx = 0; ny = 0; nz = -stepZ;
            }
        } else {
            if (tMaxY < tMaxZ) {
                dist = tMaxY;
                tMaxY += tDeltaY;
                y += stepY;
                nx = 0; ny = -stepY; nz = 0;
            } else {
                dist = tMaxZ;
                tMaxZ += tDeltaZ;
                z += stepZ;
                nx = 0; ny = 0; nz = -stepZ;
            }
        }
    }
    return res;
}

bool VoxelWorld::isSolidForPhysics(int x, int y, int z) const {
    if (!inBounds(x, y, z)) {
        return (x < 0 || x >= WORLD_X || z < 0 || z >= WORLD_Z || y < 0);
    }
    BlockId b = getBlock(x, y, z);
    return b != BLK_AIR && b != BLK_WATER;
}

bool VoxelWorld::playerCollides(float px, float py, float pz) const {
    const float halfW = 0.30f;
    const float height = 1.72f;
    int x0 = static_cast<int>(std::floor(px - halfW));
    int x1 = static_cast<int>(std::floor(px + halfW));
    int y0 = static_cast<int>(std::floor(py));
    int y1 = static_cast<int>(std::floor(py + height));
    int z0 = static_cast<int>(std::floor(pz - halfW));
    int z1 = static_cast<int>(std::floor(pz + halfW));

    for (int y = y0; y <= y1; ++y) {
        for (int z = z0; z <= z1; ++z) {
            for (int x = x0; x <= x1; ++x) {
                if (isSolidForPhysics(x, y, z)) return true;
            }
        }
    }
    return false;
}

void VoxelWorld::stepPhysics(PlayerState& p, float dt,
                             float moveForward, float moveRight,
                             bool jump, bool sprint, bool descend) const {
    dt = std::clamp(dt, 0.0f, 0.05f);
    float sinY = std::sin(p.yaw);
    float cosY = std::cos(p.yaw);

    float wishX = moveForward * (-sinY) + moveRight * cosY;
    float wishZ = moveForward * (-cosY) + moveRight * (-sinY);
    float wLen = std::sqrt(wishX * wishX + wishZ * wishZ);
    if (wLen > 1.0f) {
        wishX /= wLen;
        wishZ /= wLen;
    }

    float baseSpeed = p.flying ? (sprint ? 14.0f : 8.5f) : (sprint ? 7.2f : 4.6f);
    p.vx = wishX * baseSpeed;
    p.vz = wishZ * baseSpeed;

    BlockId feetBlock = getBlock(static_cast<int>(std::floor(p.x)),
                                 static_cast<int>(std::floor(p.y + 0.2f)),
                                 static_cast<int>(std::floor(p.z)));
    bool inWater = (feetBlock == BLK_WATER);

    if (p.flying) {
        p.vy = 0.0f;
        if (jump) p.vy += baseSpeed * 0.85f;
        if (descend) p.vy -= baseSpeed * 0.85f;
    } else if (inWater) {
        p.vy -= 9.5f * dt;
        if (jump) p.vy = 4.2f;
        p.vy = std::clamp(p.vy, -3.5f, 4.5f);
    } else {
        p.vy -= 22.0f * dt;
        if (jump && p.onGround) {
            p.vy = 7.8f;
            p.onGround = false;
        }
        p.vy = std::max(p.vy, -28.0f);
    }

    // 分轴碰撞解析
    if (!playerCollides(p.x + p.vx * dt, p.y, p.z)) {
        p.x += p.vx * dt;
    }
    if (!playerCollides(p.x, p.y, p.z + p.vz * dt)) {
        p.z += p.vz * dt;
    }

    float nextY = p.y + p.vy * dt;
    if (!playerCollides(p.x, nextY, p.z)) {
        p.y = nextY;
        p.onGround = false;
    } else {
        if (p.vy < 0.0f) p.onGround = true;
        p.vy = 0.0f;
    }
}

std::vector<BlockPos> VoxelWorld::detonateTNT(int cx, int cy, int cz, float radius) {
    std::vector<BlockPos> destroyed;
    int rCeil = static_cast<int>(std::ceil(radius));
    float rSq = radius * radius;
    setBlock(cx, cy, cz, BLK_AIR);
    destroyed.push_back({cx, cy, cz});

    for (int dy = -rCeil; dy <= rCeil; ++dy) {
        for (int dz = -rCeil; dz <= rCeil; ++dz) {
            for (int dx = -rCeil; dx <= rCeil; ++dx) {
                float dSq = static_cast<float>(dx * dx + dy * dy + dz * dz);
                if (dSq > rSq) continue;
                int x = cx + dx, y = cy + dy, z = cz + dz;
                if (!inBounds(x, y, z) || y == 0) continue;
                BlockId b = getBlock(x, y, z);
                if (b != BLK_AIR && b != BLK_BEDROCK) {
                    setBlock(x, y, z, BLK_AIR);
                    destroyed.push_back({x, y, z});
                }
            }
        }
    }
    return destroyed;
}

bool VoxelWorld::saveToFile(const std::string& path) const {
    std::ofstream ofs(path, std::ios::binary | std::ios::trunc);
    if (!ofs) return false;
    ofs.write(reinterpret_cast<const char*>(&seed_), sizeof(seed_));
    ofs.write(reinterpret_cast<const char*>(blocks_.data()), static_cast<std::streamsize>(blocks_.size()));
    return ofs.good();
}

bool VoxelWorld::loadFromFile(const std::string& path) {
    std::ifstream ifs(path, std::ios::binary);
    if (!ifs) return false;
    uint32_t loadedSeed = 0;
    ifs.read(reinterpret_cast<char*>(&loadedSeed), sizeof(loadedSeed));
    ifs.read(reinterpret_cast<char*>(blocks_.data()), static_cast<std::streamsize>(blocks_.size()));
    if (!ifs.good()) return false;
    seed_ = loadedSeed;
    return true;
}

} // namespace voxel
