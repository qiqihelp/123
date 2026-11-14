'use strict';
/* 像素边境 Pixel Frontier —— 泰拉瑞亚风格沙盒 Demo
 * 纯 Canvas 2D，无依赖。所有方块 / 角色 / 物品贴图都在运行时用代码逐像素生成。 */

// ───────────────────────── 基础 ─────────────────────────
const T = 16, W = 400, H = 140;
const AIR = 0, DIRT = 1, GRASS = 2, STONE = 3, LOG = 4, LEAVES = 5, COPPER = 6, IRON = 7, GOLD = 8,
      SAND = 9, PLANK = 10, TORCH = 11, BEDROCK = 12, COAL = 13, DIAMOND = 14, GLASS = 15, BRICK = 16,
      PLATFORM = 17, BENCH = 18, FURNACE = 19, CHEST = 20, MUSHROOM = 21, FLOWER = 22, CRYSTAL = 23,
      SILVER = 24, RUBY = 25, EMERALD = 26, OBSIDIAN = 27, BRICK_CU = 28, BRICK_AU = 29, BRICK_RED = 30, BRICK_MUD = 31,
      SANDSTONE = 32, BRICK_OBS = 33, GLASS_R = 34, GLASS_B = 35, GLASS_G = 36, THATCH = 37, CLOUD = 38, GEMBLOCK = 39,
      TORCH_B = 40, LANTERN = 41, CAMPFIRE = 42, CANDLE = 43, CHANDELIER = 44, CHAIR = 45, TABLE = 46, BOOKSHELF = 47,
      BED = 48, ANVIL = 49, SAPLING = 50, ROPE = 51, FLOWER_B = 52, FLOWER_Y = 53, BANNER = 54, POT = 55, PAINTING = 56,
      STATUE = 57, GLOWSHROOM = 58,
      URANIUM = 59, DRONE_MINE = 60, DRONE_ORE = 61, DRONE_GUARD = 62, DRONE_TRANS = 63, SOLAR = 64, COALGEN = 65, BATTERY = 66,
      REACTOR = 67, CENTRIFUGE = 68, RTG = 69, NT = 70;

// solid, 挖掘耗时(秒), 掉落物品, 碎屑颜色
const TILE = [
  { solid: 0, hard: 0,    drop: null,       col: '#000' },     // 空气
  { solid: 1, hard: 0.28, drop: 'dirt',     col: '#8a5a34' },  // 泥土
  { solid: 1, hard: 0.28, drop: 'dirt',     col: '#3fb83f' },  // 草地
  { solid: 1, hard: 0.65, drop: 'stone',    col: '#787c85' },  // 石头
  { solid: 0, hard: 0.40, drop: 'wood',     col: '#7a5028' },  // 树干
  { solid: 0, hard: 0.10, drop: null,       col: '#2c8a38' },  // 树叶
  { solid: 1, hard: 0.90, drop: 'copper',   col: '#e08a4a' },
  { solid: 1, hard: 1.10, drop: 'iron',     col: '#d8c8b8' },
  { solid: 1, hard: 1.30, drop: 'gold',     col: '#ffd84a' },
  { solid: 1, hard: 0.22, drop: 'sand',     col: '#e6d08c' },
  { solid: 1, hard: 0.30, drop: 'plank',    col: '#b5834a' },
  { solid: 0, hard: 0.05, drop: 'torch',    col: '#ffb030' },
  { solid: 1, hard: 1e9,  drop: null,       col: '#333' },     // 基岩
  { solid: 1, hard: 0.75, drop: 'coal',     col: '#2a2a30' },
  { solid: 1, hard: 2.20, drop: 'diamond',  col: '#3ad0e0' },
  { solid: 1, hard: 0.20, drop: 'glass',    col: '#bfe6ff' },
  { solid: 1, hard: 0.70, drop: 'brick',    col: '#8a8d96' },
  { solid: 0, hard: 0.15, drop: 'platform', col: '#b5834a' },
  { solid: 0, hard: 0.30, drop: 'bench',    col: '#b5834a' },
  { solid: 0, hard: 0.50, drop: 'furnace',  col: '#787c85' },
  { solid: 0, hard: 0.30, drop: null,       col: '#a06c40' },  // 宝箱（掉落战利品）
  { solid: 0, hard: 0.05, drop: 'mushroom', col: '#d42a3a' },
  { solid: 0, hard: 0.05, drop: 'flower',   col: '#ff8ab0' },
  { solid: 0, hard: 0.60, drop: 'crystal',  col: '#ff5a8a' },
];
// 新增方块（id 24 起，顺序与上面的常量一致）
[[1, 1.2, 'silver', '#e8ecf2'], [1, 2.6, 'ruby', '#e03a4a'], [1, 2.0, 'emerald', '#3ad07a'], [1, 2.4, 'obsidian', '#2a1e3c'],
 [1, 0.7, 'brick_copper', '#c8703a'], [1, 0.7, 'brick_gold', '#e8b82a'], [1, 0.7, 'brick_red', '#b8483a'], [1, 0.4, 'brick_mud', '#8a5a34'],
 [1, 0.5, 'sandstone', '#e6d08c'], [1, 1.2, 'brick_obsidian', '#3a2a52'], [1, 0.2, 'glass_red', '#ff8a8a'], [1, 0.2, 'glass_blue', '#8ab8ff'],
 [1, 0.2, 'glass_green', '#8aff9a'], [1, 0.2, 'thatch', '#d8b450'], [1, 0.15, 'cloud_block', '#f4f8ff'], [1, 1.0, 'gemblock', '#3ad0e0'],
 [0, 0.05, 'torch_blue', '#7ad0ff'], [0, 0.2, 'lantern', '#ffd84a'], [0, 0.3, 'campfire', '#ff7a1a'], [0, 0.05, 'candle', '#f0e6d0'],
 [0, 0.3, 'chandelier', '#c89a1a'], [0, 0.3, 'chair', '#b5834a'], [0, 0.3, 'table', '#b5834a'], [0, 0.3, 'bookshelf', '#7d5529'],
 [0, 0.3, 'bed', '#d42a3a'], [0, 0.6, 'anvil', '#5c5f66'], [0, 0.05, 'acorn', '#3fb83f'], [0, 0.08, 'rope', '#c7965a'],
 [0, 0.05, 'flower_blue', '#6aa0ff'], [0, 0.05, 'flower_yellow', '#ffd84a'], [0, 0.2, 'banner', '#d42a3a'], [0, 0.2, 'pot', '#b8622e'],
 [0, 0.2, 'painting', '#c89a1a'], [0, 0.6, 'statue', '#9a9da6'], [0, 0.05, 'glowshroom', '#3ad0e0'],
 // 科技：铀矿 + 机器（id 59 起）
 [1, 2.0, 'uranium', '#5fff5f'], [0, 1.0, 'drone_mine', '#ffd84a'], [0, 1.0, 'drone_ore', '#3ad0e0'], [0, 1.0, 'drone_guard', '#ff5a5a'],
 [0, 1.0, 'drone_trans', '#5fd65f'], [0, 1.0, 'solar', '#1a3a8a'], [0, 1.0, 'coalgen', '#5a4a3a'], [0, 1.0, 'battery', '#2a2e38'],
 [0, 1.0, 'reactor', '#6a707a'], [0, 1.0, 'centrifuge', '#8a8d96'], [0, 1.0, 'rtg', '#4a3a6a'],
].forEach(([solid, hard, drop, col]) => TILE.push({ solid, hard, drop, col }));
const SOLID = TILE.map(t => t.solid);
const OPAQUE = TILE.map((t, i) => (t.solid && i !== GLASS && !(i >= GLASS_R && i <= GLASS_G)) ? 1 : 0);
const EMIT = new Uint8Array(NT); EMIT[TORCH] = 15; EMIT[FURNACE] = 11; EMIT[CRYSTAL] = 9;
EMIT[TORCH_B] = 14; EMIT[LANTERN] = 15; EMIT[CAMPFIRE] = 14; EMIT[CANDLE] = 11; EMIT[CHANDELIER] = 15; EMIT[GEMBLOCK] = 8; EMIT[GLOWSHROOM] = 7;
const GLOW = {}; // 泛光颜色
[TORCH, FURNACE, CAMPFIRE, LANTERN, CANDLE, CHANDELIER].forEach(t => { GLOW[t] = '255,170,60'; });
GLOW[TORCH_B] = '80,160,255'; GLOW[GLOWSHROOM] = '60,220,230';
EMIT[URANIUM] = 5; EMIT[REACTOR] = 10; EMIT[RTG] = 6; GLOW[REACTOR] = '90,255,90'; GLOW[URANIUM] = '90,255,90';
const NEEDS_FLOOR = new Uint8Array(NT);
[BENCH, FURNACE, CHEST, MUSHROOM, FLOWER, CRYSTAL, CAMPFIRE, CANDLE, CHAIR, TABLE, BOOKSHELF, BED, ANVIL, SAPLING, FLOWER_B, FLOWER_Y, POT, STATUE, GLOWSHROOM,
 DRONE_MINE, DRONE_ORE, DRONE_GUARD, DRONE_TRANS, SOLAR, COALGEN, BATTERY, REACTOR, CENTRIFUGE, RTG].forEach(t => { NEEDS_FLOOR[t] = 1; });

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

function makeNoise(seed) {
  const h = (x, y) => {
    let n = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed, 1442695041);
    n = Math.imul(n ^ n >>> 13, 1274126177);
    return ((n ^ n >>> 16) >>> 0) / 4294967296;
  };
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = s(x - xi), yf = s(y - yi);
    return lerp(lerp(h(xi, yi), h(xi + 1, yi), xf), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), xf), yf);
  };
}

// ───────────────────────── 世界 ─────────────────────────
const tiles = new Uint8Array(W * H), walls = new Uint8Array(W * H);
const surf = new Int16Array(W);
const getT = (x, y) => (x < 0 || x >= W || y >= H) ? BEDROCK : y < 0 ? AIR : tiles[y * W + x];
const isSolid = (x, y) => SOLID[getT(x, y)] === 1;
let spawnX = W / 2, spawnY = 0, worldSeed = 1, lightVer = 0;

function genWorld(seed) {
  worldSeed = seed;
  const r = mulberry32(seed), n1 = makeNoise(seed), n2 = makeNoise(seed + 7), n3 = makeNoise(seed + 13);
  tiles.fill(AIR); walls.fill(0);
  for (let x = 0; x < W; x++) {
    surf[x] = Math.round(38 + (n1(x / 48, 0) - 0.5) * 22 + (n1(x / 14, 5) - 0.5) * 7 + (n1(x / 5, 9) - 0.5) * 2);
    const h = surf[x], dirtD = 4 + Math.floor(n1(x / 9, 20) * 4);
    const sandy = n1(x / 30, 40) > 0.72;
    for (let y = h; y < H; y++) {
      const i = y * W + x, d = y - h;
      let t;
      if (d === 0) t = sandy ? SAND : GRASS;
      else if (d < dirtD) t = sandy && d < 4 ? SAND : DIRT;
      else t = n2(x / 7, y / 7) > 0.74 ? DIRT : STONE;
      if (d > 0) walls[i] = d < dirtD + 1 ? 1 : 2;
      if (d > 3) { // 洞穴：蠕虫状隧道 + 大空洞
        const c = n2(x / 22, y / 14) * 0.65 + n3(x / 9, y / 8) * 0.35;
        if (Math.abs(c - 0.5) < 0.024 + Math.min(d, 40) * 0.0003) t = AIR; // 洞穴收窄了
        if (d > 18 && n3(x / 26, y / 18) > 0.81) t = AIR;
      }
      tiles[i] = t;
    }
    tiles[(H - 1) * W + x] = BEDROCK;
    if (r() < 0.5) tiles[(H - 2) * W + x] = BEDROCK;
  }
  const vein = (ore, count, minD, size) => {
    for (let k = 0; k < count; k++) {
      let x = 2 + Math.floor(r() * (W - 4));
      const top = surf[x] + minD; if (top > H - 5) continue;
      let y = top + Math.floor(r() * (H - top - 3));
      for (let s = 0; s < size; s++) {
        if (x > 0 && x < W - 1 && y > 0 && y < H - 2 && tiles[y * W + x] === STONE) tiles[y * W + x] = ore;
        x += Math.floor(r() * 3) - 1; y += Math.floor(r() * 3) - 1;
      }
    }
  };
  vein(COAL, 120, 3, 8); vein(COPPER, 110, 5, 7); vein(IRON, 80, 18, 6); vein(GOLD, 50, 42, 5); vein(DIAMOND, 26, 66, 4);
  vein(URANIUM, 24, 62, 5); vein(SILVER, 60, 30, 6); vein(EMERALD, 26, 52, 4); vein(RUBY, 20, 78, 4); vein(OBSIDIAN, 30, 84, 12);
  // 树、花、蘑菇
  for (let x = 4; x < W - 4; x++) {
    const h = surf[x];
    if (tiles[h * W + x] !== GRASS) continue;
    const v = r();
    if (v < 0.16) {
      const th = 4 + Math.floor(r() * 4);
      for (let k = 1; k <= th; k++) tiles[(h - k) * W + x] = LOG;
      const top = h - th;
      for (let dy = -3; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.abs(dx) + Math.abs(dy + 1) > 3) continue;
        const i = (top + dy) * W + x + dx;
        if (tiles[i] === AIR) tiles[i] = LEAVES;
      }
      x += 3;
    } else if (v < 0.26) tiles[(h - 1) * W + x] = v < 0.20 ? FLOWER : v < 0.23 ? FLOWER_B : FLOWER_Y;
    else if (v < 0.30) tiles[(h - 1) * W + x] = MUSHROOM;
  }
  // 洞穴里的宝箱、生命水晶、蘑菇
  const deco = (t, count, minD) => {
    for (let k = 0, tries = 0; k < count && tries < count * 60; tries++) {
      const x = 3 + Math.floor(r() * (W - 6)), y = surf[x] + minD + Math.floor(r() * Math.max(1, H - surf[x] - minD - 4));
      if (y >= H - 3) continue;
      const i = y * W + x;
      if (tiles[i] === AIR && walls[i] && SOLID[tiles[i + W]] && tiles[i + W] !== BEDROCK) { tiles[i] = t; k++; }
    }
  };
  deco(CHEST, 30, 8); deco(CRYSTAL, 16, 22); deco(MUSHROOM, 50, 6); deco(GLOWSHROOM, 40, 36);
  // 出生点
  spawnX = W / 2;
  for (let x = W / 2; x < W / 2 + 30; x++) if (tiles[surf[x] * W + x] === GRASS && getT(x, surf[x] - 1) !== LOG) { spawnX = x; break; }
  spawnY = surf[spawnX] - 2;
  lightVer++;
}

// ───────────────────────── 物品定义 ─────────────────────────
// k: pick 镐 / sword 剑 / bow 弓 / block 方块 / use 消耗品 / throw 投掷 / armor 护甲 / res 材料
const ITEMS = {
  pick_wood:    { n: '木镐',   k: 'pick', pow: 1.0, d: '挖掘方块的基础工具' },
  pick_copper:  { n: '铜镐',   k: 'pick', pow: 1.6, d: '挖掘速度 ×1.6' },
  pick_iron:    { n: '铁镐',   k: 'pick', pow: 2.3, d: '挖掘速度 ×2.3' },
  pick_gold:    { n: '金镐',   k: 'pick', pow: 3.1, d: '挖掘速度 ×3.1' },
  pick_diamond: { n: '钻石镐', k: 'pick', pow: 4.5, d: '挖掘速度 ×4.5' },
  sword_wood:    { n: '木剑',   k: 'sword', dmg: 10, d: '伤害 10' },
  sword_copper:  { n: '铜剑',   k: 'sword', dmg: 16, d: '伤害 16' },
  sword_iron:    { n: '铁剑',   k: 'sword', dmg: 24, d: '伤害 24' },
  sword_gold:    { n: '金剑',   k: 'sword', dmg: 34, d: '伤害 34' },
  sword_diamond: { n: '钻石剑', k: 'sword', dmg: 50, d: '伤害 50' },
  bow:    { n: '木弓', k: 'bow', dmg: 14, d: '点住画面朝该方向射箭，消耗箭矢' },
  arrow:  { n: '箭矢', k: 'res', d: '木弓的弹药' },
  bomb:   { n: '炸弹', k: 'throw', th: { bomb: { R: 2.7, fuse: 1.6 } }, d: '投掷后爆炸，炸开一片方块。小心自己！' },
  armor_copper: { n: '铜甲', k: 'armor', def: 0.20, d: '受到伤害 -20%（拥有即生效）' },
  armor_iron:   { n: '铁甲', k: 'armor', def: 0.35, d: '受到伤害 -35%（拥有即生效）' },
  armor_gold:   { n: '金甲', k: 'armor', def: 0.50, d: '受到伤害 -50%（拥有即生效）' },
  torch:    { n: '火把',   k: 'block', tile: TORCH,    d: '照亮黑暗的洞穴' },
  dirt:     { n: '泥土',   k: 'block', tile: DIRT,     d: '随处可见的方块' },
  stone:    { n: '石头',   k: 'block', tile: STONE,    d: '坚硬的方块' },
  sand:     { n: '沙子',   k: 'block', tile: SAND,     d: '可在熔炉烧成玻璃' },
  plank:    { n: '木板',   k: 'block', tile: PLANK,    d: '基础建材' },
  brick:    { n: '石砖',   k: 'block', tile: BRICK,    d: '结实又好看的建材' },
  glass:    { n: '玻璃',   k: 'block', tile: GLASS,    d: '透光的方块' },
  platform: { n: '木平台', k: 'block', tile: PLATFORM, d: '可从下方跳上去的平台' },
  bench:    { n: '工作台', k: 'block', tile: BENCH,    d: '靠近它可以合成更多物品' },
  furnace:  { n: '熔炉',   k: 'block', tile: FURNACE,  d: '靠近它可以冶炼矿石' },
  flower:   { n: '花',     k: 'block', tile: FLOWER,   d: '装饰用' },
  mushroom: { n: '蘑菇',     k: 'use', tile: MUSHROOM, d: '食用恢复 15 生命' },
  potion:   { n: '治疗药水', k: 'use', d: '恢复 60 生命' },
  crystal:  { n: '生命水晶', k: 'use', tile: CRYSTAL,  d: '生命上限 +20（最高 200）' },
  wood:    { n: '木头', k: 'res', d: '砍树获得' },
  coal:    { n: '煤',   k: 'res', d: '制作火把和炸弹' },
  gel:     { n: '凝胶', k: 'res', d: '史莱姆掉落' },
  copper:  { n: '铜矿', k: 'res', d: '在熔炉冶炼成铜锭' },
  iron:    { n: '铁矿', k: 'res', d: '在熔炉冶炼成铁锭' },
  gold:    { n: '金矿', k: 'res', d: '在熔炉冶炼成金锭' },
  diamond: { n: '钻石', k: 'res', d: '深层的稀有宝石' },
  bar_copper: { n: '铜锭', k: 'res', d: '制作铜制装备' },
  bar_iron:   { n: '铁锭', k: 'res', d: '制作铁制装备' },
  bar_gold:   { n: '金锭', k: 'res', d: '制作金制装备' },
  // ── 新增 80 种 ──
  silver:     { n: '银矿', k: 'res', d: '在熔炉冶炼成银锭' },
  bar_silver: { n: '银锭', k: 'res', d: '制作银制装备' },
  ruby:       { n: '红玉', k: 'res', d: '最深处的稀有宝石' },
  emerald:    { n: '翡翠', k: 'res', d: '稀有宝石，可制作雷电法杖' },
  bone:       { n: '骨头', k: 'res', d: '僵尸掉落' },
  cloth:      { n: '布料', k: 'res', d: '僵尸掉落，可做床和旗帜' },
  wing:       { n: '蝙蝠翼', k: 'res', d: '洞穴蝙蝠掉落' },
  bottle:     { n: '玻璃瓶', k: 'res', d: '酿造药水的容器' },
  pick_silver: { n: '银镐',   k: 'pick', pow: 2.7, d: '挖掘速度 ×2.7' },
  pick_ruby:   { n: '红玉镐', k: 'pick', pow: 6.0, d: '挖掘速度 ×6' },
  sword_silver: { n: '银剑',   k: 'sword', dmg: 29, d: '伤害 29' },
  sword_ruby:   { n: '红玉剑', k: 'sword', dmg: 66, d: '伤害 66' },
  sword_bone:   { n: '骨剑',   k: 'sword', dmg: 20, d: '伤害 20' },
  spear_iron:   { n: '铁矛',   k: 'sword', dmg: 20, reach: 4.2, d: '伤害 20，攻击距离更远' },
  spear_gold:   { n: '金矛',   k: 'sword', dmg: 31, reach: 4.6, d: '伤害 31，攻击距离更远' },
  armor_silver:  { n: '银甲',   k: 'armor', def: 0.42, c: ['#e8ecf2', '#a8b0c0'], d: '受到伤害 -42%' },
  armor_diamond: { n: '钻石甲', k: 'armor', def: 0.58, c: ['#3ad0e0', '#1a8a9a'], d: '受到伤害 -58%' },
  armor_ruby:    { n: '红玉甲', k: 'armor', def: 0.66, c: ['#e03a4a', '#8a1424'], d: '受到伤害 -66%' },
  bow_iron:   { n: '铁弓', k: 'bow', dmg: 22, d: '伤害 22，射速更快' },
  bow_gold:   { n: '金弓', k: 'bow', dmg: 32, d: '伤害 32，射速更快' },
  arrow_fire: { n: '火焰箭', k: 'res', d: '伤害 +10，优先使用' },
  arrow_bone: { n: '骨箭',   k: 'res', d: '伤害 +5' },
  staff_fire: { n: '火焰法杖', k: 'staff', dmg: 26, cd: 0.42, col: '#ff7a1a', d: '发射火球，无需弹药' },
  staff_ice:  { n: '冰霜法杖', k: 'staff', dmg: 18, cd: 0.22, col: '#7ad0ff', d: '快速连射冰锥' },
  staff_bolt: { n: '雷电法杖', k: 'staff', dmg: 44, cd: 0.6, col: '#f0f060', pierce: 1, d: '闪电可贯穿多个敌人' },
  knife:       { n: '飞刀',     k: 'throw', th: { dmg: 13, sp: 22, g: 14, cd: 0.25 }, d: '投掷武器，伤害 13' },
  shuriken:    { n: '手里剑',   k: 'throw', th: { dmg: 18, sp: 26, g: 6, cd: 0.2, pierce: 1 }, d: '可贯穿敌人，伤害 18' },
  javelin:     { n: '标枪',     k: 'throw', th: { dmg: 30, sp: 24, g: 16, cd: 0.5 }, d: '沉重的投掷武器，伤害 30' },
  boomerang:   { n: '回旋镖',   k: 'throw', th: { dmg: 16, sp: 20, g: 0, cd: 0.8, pierce: 1, keep: 1, back: 0.4, life: 0.8 }, d: '飞出去还会回来，不消耗' },
  bomb_sticky: { n: '粘性炸弹', k: 'throw', th: { bomb: { R: 2.7, fuse: 1.8, sticky: 1 } }, d: '碰到方块就粘住再爆炸' },
  dynamite:    { n: '炸药',     k: 'throw', th: { bomb: { R: 4.6, fuse: 2.4 } }, d: '超大范围爆破，快跑！' },
  firework:    { n: '烟花',     k: 'throw', th: { dmg: 0, sp: 18, g: 0, cd: 0.4, life: 0.6, fx: 'firework' }, d: '砰！纯属好看' },
  apple:         { n: '苹果',       k: 'use', heal: 10, d: '砍树偶尔掉落，恢复 10 生命' },
  pie:           { n: '苹果派',     k: 'use', heal: 70, d: '香喷喷，恢复 70 生命' },
  soup:          { n: '蘑菇汤',     k: 'use', heal: 40, d: '恢复 40 生命' },
  potion_big:    { n: '强效治疗药水', k: 'use', heal: 120, d: '恢复 120 生命' },
  potion_speed:  { n: '迅捷药水',   k: 'use', buff: 'speed', dur: 90, d: '移动速度 +30%，持续 90 秒' },
  potion_iron:   { n: '铁皮药水',   k: 'use', buff: 'iron', dur: 120, d: '额外减伤 15%，持续 120 秒' },
  potion_miner:  { n: '挖矿药水',   k: 'use', buff: 'miner', dur: 120, d: '挖掘速度 +50%，持续 120 秒' },
  potion_shine:  { n: '光芒药水',   k: 'use', buff: 'shine', dur: 180, d: '身体发出强光，持续 180 秒' },
  potion_regen:  { n: '再生药水',   k: 'use', buff: 'regen', dur: 90, d: '持续恢复生命 90 秒' },
  potion_jump:   { n: '跳跃药水',   k: 'use', buff: 'jump', dur: 90, d: '跳得更高，持续 90 秒' },
  mirror:        { n: '魔镜',       k: 'use', d: '瞬间传送回出生点，可重复使用' },
  cloud:  { n: '云朵瓶',     k: 'acc', d: '饰品：可以在空中二段跳' },
  boots:  { n: '疾风靴',     k: 'acc', d: '饰品：移动速度 +20%' },
  helmet: { n: '矿工头盔',   k: 'acc', d: '饰品：自带更亮的照明' },
  band:   { n: '再生手环',   k: 'acc', d: '饰品：缓慢恢复生命' },
  shield: { n: '黑曜石盾',   k: 'acc', d: '饰品：受伤不再被击退' },
  obsidian:       { n: '黑曜石',   k: 'block', tile: OBSIDIAN,  d: '深处的坚硬岩石' },
  brick_copper:   { n: '铜砖',     k: 'block', tile: BRICK_CU,  d: '闪亮的铜色建材' },
  brick_gold:     { n: '金砖',     k: 'block', tile: BRICK_AU,  d: '土豪专用建材' },
  brick_red:      { n: '红砖',     k: 'block', tile: BRICK_RED, d: '经典红砖' },
  brick_mud:      { n: '泥砖',     k: 'block', tile: BRICK_MUD, d: '泥土压成的砖' },
  sandstone:      { n: '砂岩砖',   k: 'block', tile: SANDSTONE, d: '沙子压成的砖' },
  brick_obsidian: { n: '黑曜石砖', k: 'block', tile: BRICK_OBS, d: '神秘的深色建材' },
  glass_red:      { n: '红玻璃',   k: 'block', tile: GLASS_R,   d: '透光的彩色玻璃' },
  glass_blue:     { n: '蓝玻璃',   k: 'block', tile: GLASS_B,   d: '透光的彩色玻璃' },
  glass_green:    { n: '绿玻璃',   k: 'block', tile: GLASS_G,   d: '透光的彩色玻璃' },
  thatch:         { n: '茅草',     k: 'block', tile: THATCH,    d: '适合做屋顶' },
  cloud_block:    { n: '云块',     k: 'block', tile: CLOUD,     d: '软绵绵的云' },
  gemblock:       { n: '钻石块',   k: 'block', tile: GEMBLOCK,  d: '会微微发光的奢华方块' },
  torch_blue:     { n: '蓝火把',   k: 'block', tile: TORCH_B,   d: '发出蓝色的光' },
  lantern:        { n: '灯笼',     k: 'block', tile: LANTERN,   d: '明亮的照明' },
  campfire:       { n: '篝火',     k: 'block', tile: CAMPFIRE,  d: '靠近时恢复生命，还能煮汤' },
  candle:         { n: '蜡烛',     k: 'block', tile: CANDLE,    d: '温馨的小光源' },
  chandelier:     { n: '吊灯',     k: 'block', tile: CHANDELIER, d: '华丽的照明' },
  chair:          { n: '椅子',     k: 'block', tile: CHAIR,     d: '家具' },
  table:          { n: '桌子',     k: 'block', tile: TABLE,     d: '家具' },
  bookshelf:      { n: '书架',     k: 'block', tile: BOOKSHELF, d: '家具' },
  bed:            { n: '床',       k: 'block', tile: BED,       d: '放下后把出生点设在这里' },
  anvil:          { n: '铁砧',     k: 'block', tile: ANVIL,     d: '靠近它可以打造高级装备' },
  acorn:          { n: '橡果',     k: 'block', tile: SAPLING,   d: '种在地上会长成大树' },
  rope:           { n: '绳子',     k: 'block', tile: ROPE,      d: '可以攀爬，下矿必备' },
  flower_blue:    { n: '蓝花',     k: 'block', tile: FLOWER_B,  d: '药水材料' },
  flower_yellow:  { n: '黄花',     k: 'block', tile: FLOWER_Y,  d: '药水材料' },
  banner:         { n: '旗帜',     k: 'block', tile: BANNER,    d: '装饰' },
  pot:            { n: '盆栽',     k: 'block', tile: POT,       d: '装饰' },
  painting:       { n: '画',       k: 'block', tile: PAINTING,  d: '装饰' },
  statue:         { n: '雕像',     k: 'block', tile: STATUE,    d: '装饰' },
  glowshroom:     { n: '发光蘑菇', k: 'block', tile: GLOWSHROOM, d: '深层洞穴里发光的蘑菇，药水材料' },
  // ── 科技 / 电力 / 核能 ──
  uranium:     { n: '铀矿',   k: 'res', d: '深层的放射性矿石，放进离心机提炼燃料棒' },
  fuel_rod:    { n: '铀燃料棒', k: 'res', d: '核反应堆的燃料，一根可烧 10 分钟' },
  plutonium:   { n: '钚',     k: 'res', d: '反应堆烧完燃料棒的产物，可做钚电池和核弹' },
  mod_range:   { n: '范围模块', k: 'res', d: '装进采矿/探矿无人机基座：框选上限 +4 格（最多 2 个，到 16×16）' },
  mod_speed:   { n: '速度模块', k: 'res', d: '装进采矿/探矿无人机基座：采矿和飞行更快（最多 3 个）' },
  drone_mine:  { n: '采矿无人机', k: 'block', tile: DRONE_MINE,  d: '放下后点一下基座：框选区域，它会把里面的方块全部采走' },
  drone_ore:   { n: '探矿无人机', k: 'block', tile: DRONE_ORE,   d: '只采框选区域里的矿石，不破坏其他方块' },
  drone_guard: { n: '护卫无人机', k: 'block', tile: DRONE_GUARD, d: '自动射击 12 格内的敌人' },
  drone_trans: { n: '运输无人机', k: 'block', tile: DRONE_TRANS, d: '把你直接送回地表；通道被堵时会联络附近的采矿无人机开路' },
  solar:       { n: '太阳能板', k: 'block', tile: SOLAR,   d: '白天露天时发电 1.5/秒，给 12 格内的机器无线供电' },
  coalgen:     { n: '火力发电机', k: 'block', tile: COALGEN, d: '烧煤发电 5/秒，地下也能用' },
  battery:     { n: '蓄电池',   k: 'block', tile: BATTERY, d: '储存 600 电量，没电时给附近机器放电' },
  centrifuge:  { n: '离心机',   k: 'block', tile: CENTRIFUGE, d: '耗电把 4 个铀矿提炼成 1 根燃料棒' },
  reactor:     { n: '核反应堆', k: 'block', tile: REACTOR, d: '烧燃料棒发电 30/秒，烧完产出钚' },
  rtg:         { n: '钚电池',   k: 'block', tile: RTG,     d: '永久发电 3/秒，不需要燃料' },
  nuke:        { n: '核弹',     k: 'throw', th: { bomb: { R: 9, fuse: 4 } }, d: '超大范围毁灭性爆炸。扔完赶紧跑！！' },
  pick_laser:  { n: '激光钻',   k: 'pick', pow: 9, d: '高科技：挖掘速度 ×9' },
  jetpack:     { n: '喷气背包', k: 'acc', d: '饰品：空中按住跳跃可以飞行约 2.5 秒，落地充能' },
};
// 商店：[物品, 数量, 价格]
const SHOP = [['torch', 10, 5], ['rope', 10, 12], ['arrow', 20, 10], ['potion', 1, 15], ['bomb', 3, 25],
  ['solar', 1, 60], ['coalgen', 1, 90], ['battery', 1, 120], ['drone_mine', 1, 150], ['drone_ore', 1, 240], ['drone_guard', 1, 200], ['drone_trans', 1, 220],
  ['mod_range', 1, 150], ['mod_speed', 1, 150], ['centrifuge', 1, 350], ['reactor', 1, 700], ['jetpack', 1, 900], ['pick_laser', 1, 1200]];
// 可卖出的物品单价
const SELL = { coal: 1, gel: 1, bone: 2, cloth: 2, wing: 3, copper: 2, iron: 3, silver: 5, gold: 8, bar_copper: 7, bar_iron: 10, bar_silver: 16, bar_gold: 25,
  emerald: 30, diamond: 40, ruby: 60, uranium: 25, fuel_rod: 110, plutonium: 150, obsidian: 3, crystal: 30, glowshroom: 2, apple: 1, mushroom: 1 };
const ARC = { armor_copper: ['#c8703a', '#8a4a20'], armor_iron: ['#c8c0b8', '#8a8078'], armor_gold: ['#e8b82a', '#a87a10'] };
const PASSIVE = k => k === 'res' || k === 'armor' || k === 'acc';
const buffs = { speed: 0, iron: 0, miner: 0, shine: 0, regen: 0, jump: 0 };
const BUFF_NAME = { speed: '迅捷', iron: '铁皮', miner: '挖矿', shine: '光芒', regen: '再生', jump: '跳跃' };
const ITEM_IDS = Object.keys(ITEMS);
const ARMOR_IDS = ITEM_IDS.filter(id => ITEMS[id].k === 'armor').sort((a, b) => ITEMS[b].def - ITEMS[a].def);
const HOTBAR_N = 8;
const inv = {};
let hotbar = [], sel = 0, coins = 0;

function resetInventory() {
  ITEM_IDS.forEach(id => { inv[id] = 0; });
  inv.pick_wood = 1; inv.sword_wood = 1; inv.torch = 8;
  hotbar = ['pick_wood', 'sword_wood', 'torch', null, null, null, null, null];
  sel = 0; coins = 0;
}
resetInventory();

// out: [id, 数量]；cost；st: 需要靠近的设施
const RECIPES = [
  { out: ['plank', 4], cost: { wood: 1 } },
  { out: ['torch', 4], cost: { wood: 1, coal: 1 } },
  { out: ['torch', 3], cost: { wood: 1, gel: 1 } },
  { out: ['platform', 2], cost: { plank: 1 } },
  { out: ['bench', 1], cost: { wood: 10 } },
  { out: ['arrow', 8], cost: { wood: 1, stone: 1 } },
  { out: ['potion', 1], cost: { mushroom: 2, gel: 2 } },
  { out: ['furnace', 1], cost: { stone: 20, torch: 3 }, st: BENCH },
  { out: ['brick', 2], cost: { stone: 2 }, st: BENCH },
  { out: ['bow', 1], cost: { wood: 8, gel: 3 }, st: BENCH },
  { out: ['bomb', 2], cost: { gel: 3, coal: 2 }, st: BENCH },
  { out: ['glass', 1], cost: { sand: 2 }, st: FURNACE },
  { out: ['bar_copper', 1], cost: { copper: 3 }, st: FURNACE },
  { out: ['bar_iron', 1], cost: { iron: 3 }, st: FURNACE },
  { out: ['bar_gold', 1], cost: { gold: 3 }, st: FURNACE },
  { out: ['pick_copper', 1], cost: { pick_wood: 1, bar_copper: 4 }, st: BENCH },
  { out: ['pick_iron', 1], cost: { pick_copper: 1, bar_iron: 5 }, st: BENCH },
  { out: ['pick_gold', 1], cost: { pick_silver: 1, bar_gold: 6 }, st: BENCH },
  { out: ['pick_diamond', 1], cost: { pick_gold: 1, diamond: 5 }, st: BENCH },
  { out: ['sword_copper', 1], cost: { sword_wood: 1, bar_copper: 3 }, st: BENCH },
  { out: ['sword_iron', 1], cost: { sword_copper: 1, bar_iron: 4 }, st: BENCH },
  { out: ['sword_gold', 1], cost: { sword_silver: 1, bar_gold: 5 }, st: BENCH },
  { out: ['sword_diamond', 1], cost: { sword_gold: 1, diamond: 4 }, st: BENCH },
  { out: ['armor_copper', 1], cost: { bar_copper: 8 }, st: BENCH },
  { out: ['armor_iron', 1], cost: { armor_copper: 1, bar_iron: 10 }, st: BENCH },
  { out: ['armor_gold', 1], cost: { armor_silver: 1, bar_gold: 12 }, st: BENCH },
  // ── 新增 ──
  { out: ['rope', 5], cost: { wood: 1, gel: 1 } },
  { out: ['campfire', 1], cost: { wood: 8, torch: 2 } },
  { out: ['candle', 2], cost: { gel: 2 } },
  { out: ['arrow_fire', 8], cost: { arrow: 8, torch: 1 } },
  { out: ['arrow_bone', 8], cost: { bone: 1, wood: 1 } },
  { out: ['bomb_sticky', 2], cost: { bomb: 2, gel: 2 } },
  { out: ['torch_blue', 3], cost: { torch: 3, flower_blue: 1 } },
  { out: ['thatch', 4], cost: { wood: 1, sand: 1 } },
  { out: ['soup', 1], cost: { mushroom: 3 }, st: CAMPFIRE },
  { out: ['pie', 1], cost: { apple: 3 }, st: CAMPFIRE },
  { out: ['potion_big', 1], cost: { potion: 2, glowshroom: 1 } },
  { out: ['potion_speed', 1], cost: { bottle: 1, flower_blue: 1, gel: 1 } },
  { out: ['potion_iron', 1], cost: { bottle: 1, iron: 2, flower_yellow: 1 } },
  { out: ['potion_miner', 1], cost: { bottle: 1, coal: 2, flower_yellow: 1 } },
  { out: ['potion_shine', 1], cost: { bottle: 1, glowshroom: 2 } },
  { out: ['potion_regen', 1], cost: { bottle: 1, mushroom: 1, flower: 1 } },
  { out: ['potion_jump', 1], cost: { bottle: 1, wing: 1, flower_blue: 1 } },
  { out: ['anvil', 1], cost: { bar_iron: 5 }, st: BENCH },
  { out: ['knife', 5], cost: { stone: 2, wood: 1 }, st: BENCH },
  { out: ['javelin', 4], cost: { wood: 2, bar_copper: 1 }, st: BENCH },
  { out: ['boomerang', 1], cost: { wood: 6, bar_copper: 1 }, st: BENCH },
  { out: ['dynamite', 1], cost: { bomb: 2, coal: 2, cloth: 1 }, st: BENCH },
  { out: ['firework', 3], cost: { coal: 1, plank: 1, flower: 1 }, st: BENCH },
  { out: ['sword_bone', 1], cost: { bone: 8 }, st: BENCH },
  { out: ['boots', 1], cost: { cloth: 6, wing: 2 }, st: BENCH },
  { out: ['cloud', 1], cost: { bottle: 1, wing: 4 }, st: BENCH },
  { out: ['lantern', 1], cost: { bar_iron: 1, torch: 1 }, st: BENCH },
  { out: ['chair', 1], cost: { plank: 4 }, st: BENCH },
  { out: ['table', 1], cost: { plank: 6 }, st: BENCH },
  { out: ['bookshelf', 1], cost: { plank: 8, cloth: 1 }, st: BENCH },
  { out: ['bed', 1], cost: { plank: 6, cloth: 4 }, st: BENCH },
  { out: ['banner', 1], cost: { cloth: 2, flower: 1 }, st: BENCH },
  { out: ['painting', 1], cost: { plank: 4, cloth: 1, flower_blue: 1 }, st: BENCH },
  { out: ['brick_mud', 2], cost: { dirt: 2 }, st: BENCH },
  { out: ['sandstone', 2], cost: { sand: 2 }, st: BENCH },
  { out: ['brick_copper', 4], cost: { bar_copper: 1, stone: 4 }, st: BENCH },
  { out: ['brick_gold', 4], cost: { bar_gold: 1, stone: 4 }, st: BENCH },
  { out: ['brick_obsidian', 2], cost: { obsidian: 2 }, st: BENCH },
  { out: ['cloud_block', 4], cost: { wing: 1, glass: 1 }, st: BENCH },
  { out: ['bar_silver', 1], cost: { silver: 3 }, st: FURNACE },
  { out: ['bottle', 2], cost: { glass: 1 }, st: FURNACE },
  { out: ['brick_red', 2], cost: { dirt: 2 }, st: FURNACE },
  { out: ['pot', 1], cost: { dirt: 3, flower: 1 }, st: FURNACE },
  { out: ['glass_red', 2], cost: { glass: 2, flower: 1 }, st: FURNACE },
  { out: ['glass_blue', 2], cost: { glass: 2, flower_blue: 1 }, st: FURNACE },
  { out: ['glass_green', 2], cost: { glass: 2, acorn: 1 }, st: FURNACE },
  { out: ['pick_silver', 1], cost: { pick_iron: 1, bar_silver: 5 }, st: ANVIL },
  { out: ['sword_silver', 1], cost: { sword_iron: 1, bar_silver: 4 }, st: ANVIL },
  { out: ['armor_silver', 1], cost: { armor_iron: 1, bar_silver: 10 }, st: ANVIL },
  { out: ['armor_diamond', 1], cost: { armor_gold: 1, diamond: 8 }, st: ANVIL },
  { out: ['pick_ruby', 1], cost: { pick_diamond: 1, ruby: 5 }, st: ANVIL },
  { out: ['sword_ruby', 1], cost: { sword_diamond: 1, ruby: 4 }, st: ANVIL },
  { out: ['armor_ruby', 1], cost: { armor_diamond: 1, ruby: 8 }, st: ANVIL },
  { out: ['spear_iron', 1], cost: { wood: 4, bar_iron: 3 }, st: ANVIL },
  { out: ['spear_gold', 1], cost: { spear_iron: 1, bar_gold: 4 }, st: ANVIL },
  { out: ['bow_iron', 1], cost: { bow: 1, bar_iron: 6 }, st: ANVIL },
  { out: ['bow_gold', 1], cost: { bow_iron: 1, bar_gold: 6 }, st: ANVIL },
  { out: ['shuriken', 8], cost: { bar_iron: 1 }, st: ANVIL },
  { out: ['staff_fire', 1], cost: { wood: 6, ruby: 2, coal: 5 }, st: ANVIL },
  { out: ['staff_ice', 1], cost: { wood: 6, diamond: 2 }, st: ANVIL },
  { out: ['staff_bolt', 1], cost: { bar_gold: 4, emerald: 3 }, st: ANVIL },
  { out: ['mirror', 1], cost: { glass: 3, bar_silver: 4, diamond: 1 }, st: ANVIL },
  { out: ['helmet', 1], cost: { bar_copper: 6, torch: 5 }, st: ANVIL },
  { out: ['band', 1], cost: { bar_gold: 3, crystal: 1 }, st: ANVIL },
  { out: ['shield', 1], cost: { obsidian: 12, bar_iron: 5 }, st: ANVIL },
  { out: ['statue', 1], cost: { stone: 15 }, st: ANVIL },
  { out: ['chandelier', 1], cost: { bar_gold: 2, candle: 3 }, st: ANVIL },
  { out: ['gemblock', 1], cost: { diamond: 2, glass: 2 }, st: ANVIL },
  { out: ['rtg', 1], cost: { plutonium: 2, bar_iron: 10 }, st: ANVIL },
  { out: ['nuke', 1], cost: { plutonium: 3, dynamite: 2 }, st: ANVIL },
];
const ST_NAME = { [BENCH]: '工作台', [FURNACE]: '熔炉', [ANVIL]: '铁砧', [CAMPFIRE]: '篝火' };

// ───────────────────────── 像素贴图（程序生成）─────────────────────────
let atlas = null, icons = null;
const ICON = {}; // 物品 id → 图标列

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function buildArt() {
  const r = mulberry32(2024);
  atlas = mkCanvas(NT * T, T * 3);
  const g = atlas.getContext('2d');
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const rect = (t, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(t * T + x, y, w, h); };
  const pick3 = p => { const v = r(); return v < 0.55 ? p[1] : v < 0.8 ? p[0] : p[2]; };
  const fillN = (ox, oy, p) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(ox + x, oy + y, pick3(p)); };
  const P = {
    dirt: ['#6b4226', '#8a5a34', '#a06c40'], stone: ['#5c5f66', '#787c85', '#8e939c'],
    grass: ['#2f8f2f', '#3fb83f', '#5fd65f'], leaf: ['#1f6b2a', '#2c8a38', '#44a84c'],
    sand: ['#d9c27a', '#e6d08c', '#f0dea0'], bed: ['#1c1c22', '#2e2e36', '#3e3e48'],
    wdirt: ['#33200f', '#3e2715', '#472d19'], wstone: ['#26282d', '#313439', '#393c42'],
    brick: ['#7c7f88', '#8a8d96', '#989ba4'],
  };
  const stoneTile = ox => {
    fillN(ox, 0, P.stone);
    for (let k = 0; k < 4; k++) {
      let x = Math.floor(r() * 12), y = 1 + Math.floor(r() * 14);
      for (let s = 0; s < 4; s++) { px(ox + x + s, y, '#484b52'); if (r() < 0.3) y = clamp(y + 1, 0, 15); }
    }
  };
  const oreTile = (t, c, hi, dk) => {
    const ox = t * T; stoneTile(ox);
    [[2, 2], [9, 3], [5, 8], [11, 10], [2, 12]].forEach(([bx, by]) => {
      bx += Math.floor(r() * 2); by += Math.floor(r() * 2);
      px(ox + bx, by, hi); px(ox + bx + 1, by, c); px(ox + bx, by + 1, c); px(ox + bx + 1, by + 1, dk);
      if (r() < 0.6) px(ox + bx + 2, by + 1, c);
      if (r() < 0.6) px(ox + bx - 1, by, c);
    });
  };
  fillN(DIRT * T, 0, P.dirt);
  for (let k = 0; k < 3; k++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 14); px(DIRT * T + x, y, '#b8956a'); px(DIRT * T + x + 1, y, '#9c7a52'); }
  fillN(GRASS * T, 0, P.dirt);
  for (let x = 0; x < T; x++) {
    const d = 3 + Math.floor(r() * 3);
    for (let y = 0; y < d; y++) px(GRASS * T + x, y, y === 0 ? P.grass[2] : y === d - 1 ? P.grass[0] : pick3(P.grass));
  }
  stoneTile(STONE * T);
  for (let y = 0; y < T; y++) for (let x = 3; x < 13; x++) {
    const c = x === 3 || x === 12 ? '#4a2e14' : ((x * 3 + (y >> 2)) % 4 === 0 ? '#5a3a1c' : r() < 0.2 ? '#96683a' : '#7a5028');
    px(LOG * T + x, y, c);
  }
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (r() > 0.08) px(LEAVES * T + x, y, pick3(P.leaf));
  for (let k = 0; k < 5; k++) px(LEAVES * T + Math.floor(r() * 16), Math.floor(r() * 16), '#7fd67a');
  oreTile(COPPER, '#e08a4a', '#ffc08a', '#a85a28');
  oreTile(IRON, '#d8c8b8', '#ffffff', '#9a8a7c');
  oreTile(GOLD, '#ffd84a', '#fff6b0', '#c89a1a');
  oreTile(COAL, '#24242a', '#4a4a55', '#0c0c10');
  oreTile(DIAMOND, '#3ad0e0', '#e0fdff', '#1a8a9a');
  fillN(SAND * T, 0, P.sand);
  const plankPx = (ox, x, y) => {
    const row = y >> 2, joint = (x + row * 5) % 8 === 0;
    px(ox + x, y, y % 4 === 3 ? '#7d5529' : joint ? '#8a5f30' : r() < 0.15 ? '#c7965a' : '#b5834a');
  };
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) plankPx(PLANK * T, x, y);
  // 火把
  for (let y = 7; y < 16; y++) { px(TORCH * T + 7, y, '#7a5028'); px(TORCH * T + 8, y, '#5a3a1c'); }
  [[7, 6, '#ff7a1a'], [8, 6, '#ff7a1a'], [6, 5, '#ff7a1a'], [7, 5, '#ffd84a'], [8, 5, '#ffd84a'], [9, 5, '#ff7a1a'],
   [7, 4, '#fff6b0'], [8, 4, '#ffd84a'], [6, 4, '#ff7a1a'], [9, 4, '#ff7a1a'], [7, 3, '#ffd84a'], [8, 3, '#ff7a1a'], [7, 2, '#ff7a1a']]
    .forEach(([x, y, c]) => px(TORCH * T + x, y, c));
  fillN(BEDROCK * T, 0, P.bed);
  // 玻璃
  rect(GLASS, 0, 0, 16, 16, 'rgba(190,230,255,.22)');
  rect(GLASS, 0, 0, 16, 1, '#d8f2ff'); rect(GLASS, 0, 15, 16, 1, '#8ab8d8'); rect(GLASS, 0, 0, 1, 16, '#d8f2ff'); rect(GLASS, 15, 0, 1, 16, '#8ab8d8');
  [[3, 6], [4, 5], [5, 4], [6, 3], [5, 8], [6, 7], [7, 6]].forEach(([x, y]) => px(GLASS * T + x, y, 'rgba(255,255,255,.8)'));
  // 石砖
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const row = y >> 2, joint = (x + (row % 2) * 4) % 8 === 7;
    px(BRICK * T + x, y, y % 4 === 3 || joint ? '#4c4e55' : y % 4 === 0 ? '#a2a5ae' : pick3(P.brick));
  }
  // 木平台
  for (let y = 0; y < 5; y++) for (let x = 0; x < T; x++) px(PLATFORM * T + x, y, y === 0 ? '#c7965a' : y === 4 ? '#5a3a1c' : x % 8 === 0 ? '#8a5f30' : '#b5834a');
  // 工作台
  rect(BENCH, 0, 5, 16, 1, '#d8a868'); rect(BENCH, 0, 6, 16, 2, '#b5834a'); rect(BENCH, 0, 8, 16, 1, '#7d5529');
  rect(BENCH, 2, 9, 2, 7, '#8a5f30'); rect(BENCH, 12, 9, 2, 7, '#8a5f30'); rect(BENCH, 4, 12, 8, 1, '#7d5529');
  rect(BENCH, 5, 3, 4, 2, '#9aa0aa'); rect(BENCH, 9, 4, 3, 1, '#7a5028');
  // 熔炉
  rect(FURNACE, 1, 2, 14, 14, '#6a6d76'); rect(FURNACE, 1, 2, 14, 1, '#9a9da6'); rect(FURNACE, 1, 2, 1, 14, '#8a8d96'); rect(FURNACE, 14, 2, 1, 14, '#484b52');
  rect(FURNACE, 1, 6, 14, 1, '#484b52'); rect(FURNACE, 7, 2, 1, 4, '#484b52');
  rect(FURNACE, 4, 8, 8, 7, '#1a0c04'); rect(FURNACE, 5, 11, 6, 4, '#ff7a1a'); rect(FURNACE, 6, 12, 4, 3, '#ffd84a'); rect(FURNACE, 7, 10, 2, 2, '#ff7a1a');
  // 宝箱
  rect(CHEST, 2, 6, 12, 10, '#4a2e14'); rect(CHEST, 3, 7, 10, 3, '#b07a46'); rect(CHEST, 3, 11, 10, 4, '#8a5a34');
  rect(CHEST, 3, 7, 10, 1, '#d09a5a'); rect(CHEST, 2, 10, 12, 1, '#c89a1a'); rect(CHEST, 7, 9, 2, 3, '#ffd84a'); rect(CHEST, 7, 10, 2, 1, '#fff6b0');
  // 蘑菇
  rect(MUSHROOM, 7, 12, 2, 4, '#f0e6d0'); rect(MUSHROOM, 5, 10, 6, 2, '#d42a3a'); rect(MUSHROOM, 6, 9, 4, 1, '#e8505a'); rect(MUSHROOM, 4, 11, 8, 1, '#a81a2a');
  px(MUSHROOM * T + 6, 10, '#fff'); px(MUSHROOM * T + 9, 10, '#fff');
  // 花
  rect(FLOWER, 7, 9, 1, 7, '#2f8f2f'); rect(FLOWER, 5, 12, 2, 1, '#3fb83f'); rect(FLOWER, 8, 13, 2, 1, '#3fb83f');
  rect(FLOWER, 6, 5, 3, 1, '#ff8ab0'); rect(FLOWER, 6, 9, 3, 1, '#ff8ab0'); rect(FLOWER, 5, 6, 1, 3, '#ff8ab0'); rect(FLOWER, 9, 6, 1, 3, '#ff8ab0');
  rect(FLOWER, 6, 6, 3, 3, '#ffd0e0'); rect(FLOWER, 7, 7, 1, 1, '#ffd84a');
  // 生命水晶
  ['.XX..XX.', 'XHXXXXXX', 'XHXXXXXX', 'XXXXXXXD', '.XXXXXD.', '..XXXD..', '...XD...'].forEach((row, y) => {
    for (let x = 0; x < 8; x++) if (row[x] !== '.') px(CRYSTAL * T + 4 + x, 8 + y, row[x] === 'H' ? '#ffd0e0' : row[x] === 'D' ? '#b8285a' : '#ff5a8a');
  });
  // 背景墙（第 2 行）
  fillN(1 * T, T, P.wdirt); fillN(2 * T, T, P.wstone);
  for (let k = 0; k < 5; k++) { const x = Math.floor(r() * 12), y = Math.floor(r() * 15); for (let s = 0; s < 4; s++) px(2 * T + x + s, T + y, '#1e2024'); }
  // 挖掘裂纹（第 3 行）
  for (let st = 0; st < 4; st++) {
    const rr = mulberry32(99);
    for (let k = 0; k < (st + 1) * 3; k++) {
      let x = 8, y = 8; const dx = rr() < 0.5 ? -1 : 1, dy = rr() < 0.5 ? -1 : 1;
      for (let s = 0; s < 3 + st * 2; s++) {
        px(st * T + clamp(x, 0, 15), 2 * T + clamp(y, 0, 15), 'rgba(0,0,0,.6)');
        if (rr() < 0.6) x += dx; else y += dy;
      }
    }
  }

  // ── 物品图标 ──
  icons = mkCanvas(T * 100, T);
  const ig = icons.getContext('2d');
  let ni = 0;
  const reg = id => { ICON[id] = ni++; return ICON[id]; };
  const ip = (i, x, y, c) => { ig.fillStyle = c; ig.fillRect(i * T + x, y, 1, 1); };
  const ir = (i, x, y, w, h, c) => { ig.fillStyle = c; ig.fillRect(i * T + x, y, w, h); };
  const TIER = { wood: ['#9a6a3a', '#c7965a', '#6a4422'], copper: ['#c8703a', '#ffb07a', '#8a4a20'], iron: ['#9aa0aa', '#e8ecf2', '#6a707a'],
                 gold: ['#e8b82a', '#fff6b0', '#a87a10'], diamond: ['#3ad0e0', '#d0fdff', '#1a8a9a'],
                 silver: ['#c8d0e0', '#ffffff', '#8890a8'], ruby: ['#e03a4a', '#ffb0b8', '#8a1424'], bone: ['#e8e0d0', '#ffffff', '#b8b0a0'] };
  Object.keys(TIER).forEach(tn => {
    const [c, hi] = TIER[tn];
    let i = reg('pick_' + tn);
    for (let k = 0; k < 10; k++) { ip(i, 2 + k, 13 - k, '#7a5028'); ip(i, 3 + k, 13 - k, '#5a3a1c'); }
    [[4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 3], [10, 3], [11, 4], [12, 5], [12, 6], [13, 7], [13, 8], [13, 9], [13, 10], [13, 11]]
      .forEach(([x, y]) => { ip(i, x, y, hi); ip(i, x, y + 1, c); ip(i, x - 1, y + 1, c); });
    i = reg('sword_' + tn);
    for (let k = 0; k < 9; k++) { ip(i, 5 + k, 10 - k, c); ip(i, 6 + k, 10 - k, hi); ip(i, 5 + k, 9 - k, hi); }
    ip(i, 14, 1, hi);
    [[3, 8], [4, 9], [5, 10], [6, 11], [7, 12], [4, 8], [7, 11]].forEach(([x, y]) => ip(i, x, y, '#c89a1a'));
    [[4, 11], [3, 12], [2, 13]].forEach(([x, y]) => { ip(i, x, y, '#7a5028'); ip(i, x + 1, y, '#5a3a1c'); });
    ip(i, 1, 14, '#c89a1a');
  });
  ['copper', 'iron', 'gold', 'silver', 'diamond', 'ruby'].forEach(tn => {
    const [c, hi, dk] = TIER[tn];
    let i = reg('armor_' + tn);
    for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) {
      if ((y < 5 && x > 5 && x < 10) || (y > 6 && (x < 5 || x > 10))) continue;
      ip(i, x, y, x < 5 || y === 3 ? hi : x > 10 || y > 11 ? dk : c);
    }
    i = reg('bar_' + tn);
    ir(i, 4, 6, 9, 1, hi); ir(i, 3, 7, 11, 3, c); ir(i, 2, 10, 13, 2, dk); ir(i, 4, 7, 3, 1, hi);
  });
  const nug = (id, c, hi, dk) => {
    const i = reg(id), rows = [[6, 9], [4, 11], [3, 12], [3, 13], [2, 13], [3, 13], [4, 12], [6, 10]];
    rows.forEach(([a, b], k) => { for (let x = a; x <= b; x++) ip(i, x, 4 + k, k < 2 || x < a + 2 ? hi : k > 5 || x > b - 2 ? dk : c); });
  };
  nug('copper', '#e08a4a', '#ffc08a', '#a85a28'); nug('iron', '#c8c0b8', '#ffffff', '#8a8078'); nug('gold', '#ffd84a', '#fff6b0', '#c89a1a');
  nug('coal', '#2a2a32', '#55555f', '#0c0c10'); nug('gel', '#4aa0ff', '#b0dcff', '#2060c0');
  { // 钻石
    const i = reg('diamond');
    ['..XXXXXX..', '.XHHXXXXD.', 'XHHXXXXXDD', '.XHXXXXDD.', '..XXXXDD..', '...XXDD...', '....XD....'].forEach((row, y) => {
      for (let x = 0; x < 10; x++) if (row[x] !== '.') ip(i, 3 + x, 4 + y, row[x] === 'H' ? '#e0fdff' : row[x] === 'D' ? '#1a8a9a' : '#3ad0e0');
    });
  }
  { // 木头
    const i = reg('wood');
    for (let y = 4; y < 12; y++) for (let x = 2; x < 14; x++) ip(i, x, y, y === 4 || y === 11 ? '#4a2e14' : (x + y) % 5 === 0 ? '#5a3a1c' : '#7a5028');
    ir(i, 12, 5, 1, 6, '#c7965a'); ir(i, 13, 5, 1, 6, '#b5834a');
  }
  { // 弓
    const i = reg('bow');
    [[5, 2], [6, 2], [7, 3], [8, 3], [9, 4], [10, 5], [10, 6], [11, 7], [11, 8], [10, 9], [10, 10], [9, 11], [8, 12], [7, 12], [6, 13], [5, 13]]
      .forEach(([x, y]) => { ip(i, x, y, '#8a5a34'); ip(i, x + 1, y, '#5a3a1c'); });
    ir(i, 5, 3, 1, 10, '#e8e8e8');
  }
  { // 箭
    const i = reg('arrow');
    for (let k = 0; k < 9; k++) ip(i, 3 + k, 12 - k, '#8a5a34');
    [[12, 3], [13, 2], [12, 2], [13, 3], [11, 3], [12, 4]].forEach(([x, y]) => ip(i, x, y, '#c8ccd4'));
    [[2, 13], [2, 12], [3, 13], [1, 13], [2, 14]].forEach(([x, y]) => ip(i, x, y, '#f0f0f0'));
  }
  { // 炸弹
    const i = reg('bomb');
    for (let y = 5; y < 15; y++) for (let x = 3; x < 13; x++) {
      const d = (x - 7.5) ** 2 + (y - 9.5) ** 2; if (d > 22) continue;
      ip(i, x, y, d > 14 ? '#0c0c10' : (x < 7 && y < 9) ? '#5a5a66' : '#2a2a32');
    }
    ip(i, 9, 4, '#8a5a34'); ip(i, 10, 3, '#8a5a34'); ip(i, 11, 2, '#ffd84a'); ip(i, 12, 1, '#ff7a1a'); ip(i, 11, 1, '#ff7a1a');
  }
  { // 药水
    const i = reg('potion');
    ir(i, 7, 2, 2, 1, '#8a5a34'); ir(i, 7, 3, 2, 3, '#d8f2ff');
    for (let y = 6; y < 14; y++) for (let x = 4; x < 12; x++) {
      const d = (x - 7.5) ** 2 + (y - 9.5) ** 2; if (d > 17) continue;
      ip(i, x, y, d > 11 ? '#d8f2ff' : y < 8 ? '#ffb0b8' : '#e03a4a');
    }
  }
  { // 金币
    const i = reg('coin');
    for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) {
      const d = (x - 7.5) ** 2 + (y - 7.5) ** 2; if (d > 17) continue;
      ip(i, x, y, d > 10 ? '#c89a1a' : x < 7 ? '#fff6b0' : '#ffd84a');
    }
  }

  // ════════ 新增方块贴图 ════════
  oreTile(SILVER, '#e8ecf2', '#ffffff', '#98a0b8'); oreTile(RUBY, '#e03a4a', '#ffb0b8', '#8a1424'); oreTile(EMERALD, '#3ad07a', '#c0ffd8', '#1a8a4a');
  fillN(OBSIDIAN * T, 0, ['#1c1428', '#2a1e3c', '#3a2a52']);
  for (let k = 0; k < 6; k++) px(OBSIDIAN * T + Math.floor(r() * 16), Math.floor(r() * 16), '#6a5a9a');
  const brickT = (t, pal, mortar) => {
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const row = y >> 2, joint = (x + (row % 2) * 4) % 8 === 7;
      px(t * T + x, y, y % 4 === 3 || joint ? mortar : y % 4 === 0 ? pal[2] : pick3(pal));
    }
  };
  brickT(BRICK_CU, ['#b8622e', '#c8703a', '#e89a5a'], '#6a3414'); brickT(BRICK_AU, ['#d8a820', '#e8b82a', '#fff08a'], '#8a6410');
  brickT(BRICK_RED, ['#a83a2a', '#b8483a', '#d06a5a'], '#e0d0c0'); brickT(BRICK_MUD, P.dirt, '#4a2e14');
  brickT(SANDSTONE, P.sand, '#b8a060'); brickT(BRICK_OBS, ['#2a1e3c', '#3a2a52', '#5a4a7a'], '#120c1c');
  const glassT = (t, rgb, hi, dk) => {
    rect(t, 0, 0, 16, 16, 'rgba(' + rgb + ',.38)');
    rect(t, 0, 0, 16, 1, hi); rect(t, 0, 0, 1, 16, hi); rect(t, 0, 15, 16, 1, dk); rect(t, 15, 0, 1, 16, dk);
    [[3, 6], [4, 5], [5, 4], [6, 3]].forEach(([x, y]) => px(t * T + x, y, 'rgba(255,255,255,.8)'));
  };
  glassT(GLASS_R, '255,90,90', '#ffb0b0', '#b84a4a'); glassT(GLASS_B, '90,150,255', '#b0d0ff', '#4a6ab8'); glassT(GLASS_G, '90,230,120', '#b0ffc0', '#4aa85a');
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(THATCH * T + x, y, y % 4 === 3 ? '#a07a28' : ['#c8a040', '#d8b450', '#e8c860', '#b89038'][(x + (y >> 2) * 3 + (r() < 0.2 ? 1 : 0)) % 4]);
  fillN(CLOUD * T, 0, ['#dce6f8', '#f4f8ff', '#ffffff']);
  fillN(GEMBLOCK * T, 0, ['#2ab8c8', '#3ad0e0', '#8af0f8']);
  rect(GEMBLOCK, 0, 0, 16, 1, '#c0fbff'); rect(GEMBLOCK, 0, 0, 1, 16, '#c0fbff'); rect(GEMBLOCK, 0, 15, 16, 1, '#1a8a9a'); rect(GEMBLOCK, 15, 0, 1, 16, '#1a8a9a');
  [[4, 4], [5, 3], [10, 9], [11, 8]].forEach(([x, y]) => px(GEMBLOCK * T + x, y, '#fff'));
  // 蓝火把
  rect(TORCH_B, 7, 7, 1, 9, '#7a5028'); rect(TORCH_B, 8, 7, 1, 9, '#5a3a1c');
  rect(TORCH_B, 6, 4, 4, 3, '#2a7aff'); rect(TORCH_B, 7, 2, 2, 2, '#2a7aff'); rect(TORCH_B, 7, 4, 2, 2, '#7ad0ff'); rect(TORCH_B, 7, 4, 1, 1, '#e0f8ff');
  // 灯笼 / 篝火 / 蜡烛 / 吊灯
  rect(LANTERN, 7, 0, 2, 3, '#5c5f66'); rect(LANTERN, 4, 3, 8, 10, '#3a3a44'); rect(LANTERN, 5, 5, 6, 6, '#ffb030'); rect(LANTERN, 6, 6, 4, 4, '#ffd84a'); rect(LANTERN, 7, 7, 2, 2, '#fff6b0'); rect(LANTERN, 5, 13, 6, 1, '#5c5f66');
  rect(CAMPFIRE, 2, 13, 12, 3, '#5a3a1c'); rect(CAMPFIRE, 3, 12, 10, 1, '#7a5028'); rect(CAMPFIRE, 2, 14, 12, 1, '#3a2414');
  rect(CAMPFIRE, 5, 8, 6, 4, '#ff7a1a'); rect(CAMPFIRE, 6, 5, 4, 4, '#ff7a1a'); rect(CAMPFIRE, 7, 3, 2, 2, '#ff7a1a'); rect(CAMPFIRE, 6, 9, 4, 3, '#ffd84a'); rect(CAMPFIRE, 7, 7, 2, 3, '#ffd84a'); rect(CAMPFIRE, 7, 10, 2, 2, '#fff6b0');
  rect(CANDLE, 7, 10, 2, 6, '#f0e6d0'); rect(CANDLE, 6, 15, 4, 1, '#c89a1a'); rect(CANDLE, 7, 7, 2, 3, '#ffd84a'); rect(CANDLE, 7, 6, 1, 1, '#ff7a1a');
  rect(CHANDELIER, 7, 0, 2, 5, '#8a6410'); rect(CHANDELIER, 2, 6, 12, 1, '#c89a1a'); rect(CHANDELIER, 2, 5, 1, 2, '#c89a1a'); rect(CHANDELIER, 13, 5, 1, 2, '#c89a1a'); rect(CHANDELIER, 7, 5, 2, 4, '#e8b82a');
  [1, 6, 12].forEach(x => { rect(CHANDELIER, x, 7 + (x === 6 ? 2 : 0), 3, 3, '#f0e6d0'); rect(CHANDELIER, x + 1, 5 + (x === 6 ? 2 : 0) - 1, 1, 2, '#ffd84a'); });
  // 家具
  rect(CHAIR, 4, 3, 2, 13, '#8a5f30'); rect(CHAIR, 4, 3, 2, 1, '#c7965a'); rect(CHAIR, 4, 10, 9, 2, '#b5834a'); rect(CHAIR, 11, 12, 2, 4, '#8a5f30');
  rect(TABLE, 0, 7, 16, 2, '#b5834a'); rect(TABLE, 0, 7, 16, 1, '#d8a868'); rect(TABLE, 2, 9, 2, 7, '#8a5f30'); rect(TABLE, 12, 9, 2, 7, '#8a5f30');
  rect(BOOKSHELF, 1, 0, 14, 16, '#7d5529'); rect(BOOKSHELF, 1, 0, 14, 1, '#b5834a');
  [1, 6, 11].forEach(y => { rect(BOOKSHELF, 2, y, 12, 4, '#2a1a0c'); for (let x = 2; x < 14; x++) if (r() > 0.12) rect(BOOKSHELF, x, y + (r() < 0.3 ? 1 : 0), 1, 4, ['#d42a3a', '#34508c', '#2f8f2f', '#e8b82a', '#9a5ad0'][Math.floor(r() * 5)]); rect(BOOKSHELF, 1, y + 4, 14, 1, '#b5834a'); });
  rect(BED, 0, 6, 2, 10, '#7d5529'); rect(BED, 14, 9, 2, 7, '#7d5529'); rect(BED, 2, 12, 12, 2, '#8a5f30'); rect(BED, 2, 9, 12, 3, '#d42a3a'); rect(BED, 2, 9, 12, 1, '#f06a7a'); rect(BED, 2, 8, 4, 2, '#f4f6ff');
  rect(ANVIL, 2, 7, 13, 3, '#5c5f66'); rect(ANVIL, 2, 7, 13, 1, '#a8abb4'); rect(ANVIL, 0, 8, 2, 1, '#787c85'); rect(ANVIL, 6, 10, 5, 3, '#484b52'); rect(ANVIL, 4, 13, 9, 3, '#5c5f66'); rect(ANVIL, 4, 13, 9, 1, '#787c85');
  rect(SAPLING, 7, 10, 2, 6, '#7a5028'); rect(SAPLING, 5, 6, 6, 4, '#3fb83f'); rect(SAPLING, 6, 5, 4, 1, '#5fd65f'); rect(SAPLING, 4, 8, 1, 2, '#2f8f2f'); rect(SAPLING, 11, 7, 1, 2, '#2f8f2f');
  for (let y = 0; y < T; y++) { px(ROPE * T + 7, y, y % 2 ? '#c7965a' : '#8a5f30'); px(ROPE * T + 8, y, y % 2 ? '#8a5f30' : '#c7965a'); }
  const flowerT = (t, a, b) => {
    rect(t, 7, 9, 1, 7, '#2f8f2f'); rect(t, 5, 12, 2, 1, '#3fb83f'); rect(t, 8, 13, 2, 1, '#3fb83f');
    rect(t, 6, 5, 3, 1, a); rect(t, 6, 9, 3, 1, a); rect(t, 5, 6, 1, 3, a); rect(t, 9, 6, 1, 3, a); rect(t, 6, 6, 3, 3, b); rect(t, 7, 7, 1, 1, '#fff');
  };
  flowerT(FLOWER_B, '#3a6ae0', '#8ab0ff'); flowerT(FLOWER_Y, '#e8a810', '#ffe04a');
  rect(BANNER, 3, 0, 10, 1, '#7d5529'); rect(BANNER, 4, 1, 8, 11, '#d42a3a'); rect(BANNER, 4, 12, 3, 2, '#d42a3a'); rect(BANNER, 9, 12, 3, 2, '#d42a3a'); rect(BANNER, 4, 1, 1, 13, '#f06a7a'); rect(BANNER, 7, 4, 2, 5, '#ffd84a'); rect(BANNER, 6, 5, 4, 2, '#ffd84a');
  rect(POT, 5, 11, 6, 5, '#b8622e'); rect(POT, 4, 10, 8, 1, '#e08a4a'); rect(POT, 5, 15, 6, 1, '#8a4a20'); rect(POT, 7, 5, 2, 5, '#2f8f2f'); rect(POT, 5, 6, 2, 2, '#3fb83f'); rect(POT, 9, 4, 2, 2, '#3fb83f'); rect(POT, 7, 3, 2, 2, '#5fd65f');
  rect(PAINTING, 2, 3, 12, 10, '#c89a1a'); rect(PAINTING, 3, 4, 10, 8, '#7ac0ff'); rect(PAINTING, 3, 9, 10, 3, '#3fb83f'); rect(PAINTING, 5, 8, 3, 1, '#3fb83f'); rect(PAINTING, 10, 5, 2, 2, '#ffd84a'); rect(PAINTING, 2, 3, 12, 1, '#ffe88a');
  rect(STATUE, 4, 13, 8, 3, '#787c85'); rect(STATUE, 6, 6, 4, 7, '#9a9da6'); rect(STATUE, 6, 2, 4, 4, '#a8abb4'); rect(STATUE, 4, 7, 2, 4, '#8e939c'); rect(STATUE, 10, 7, 2, 4, '#8e939c'); rect(STATUE, 6, 2, 1, 11, '#c0c3cc');
  rect(GLOWSHROOM, 7, 12, 2, 4, '#d0f8ff'); rect(GLOWSHROOM, 5, 10, 6, 2, '#3ad0e0'); rect(GLOWSHROOM, 6, 9, 4, 1, '#8af0f8'); rect(GLOWSHROOM, 4, 11, 8, 1, '#1a8a9a'); px(GLOWSHROOM * T + 6, 10, '#fff'); px(GLOWSHROOM * T + 9, 10, '#fff');

  // ════════ 新增物品图标 ════════
  const PAL = { k: '#1a1208', w: '#f4f6ff', g: '#9aa0aa', d: '#5c5f66', b: '#8a5a34', B: '#5a3a1c', l: '#c7965a', y: '#ffd84a', Y: '#c89a1a', o: '#ff7a1a',
                r: '#d42a3a', R: '#8a1424', G: '#3fb83f', n: '#1f6b2a', c: '#3ad0e0', C: '#1a8a9a', p: '#ff8ab0', u: '#4aa0ff', U: '#2060c0', v: '#4a3a5a', V: '#2e2438', e: '#e8e0d0', E: '#b8b0a0' };
  const spr = (id, rows) => {
    const i = reg(id), w = rows.reduce((m, q) => Math.max(m, q.length), 0), x0 = (16 - w) >> 1, y0 = (16 - rows.length) >> 1;
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) if (PAL[row[x]]) ip(i, x0 + x, y0 + y, PAL[row[x]]); });
  };
  const gem = (id, c, hi, dk) => {
    const i = reg(id);
    ['..XXXXXX..', '.XHHXXXXD.', 'XHHXXXXXDD', '.XHXXXXDD.', '..XXXXDD..', '...XXDD...', '....XD....'].forEach((row, y) => {
      for (let x = 0; x < 10; x++) if (row[x] !== '.') ip(i, 3 + x, 4 + y, row[x] === 'H' ? hi : row[x] === 'D' ? dk : c);
    });
  };
  const flask = (id, liq, hi, cork) => {
    const i = reg(id);
    ir(i, 7, 2, 2, 1, cork || '#8a5a34'); ir(i, 7, 3, 2, 3, '#d8f2ff');
    for (let y = 6; y < 14; y++) for (let x = 4; x < 12; x++) {
      const d = (x - 7.5) ** 2 + (y - 9.5) ** 2; if (d > 17) continue;
      ip(i, x, y, d > 11 ? '#d8f2ff' : y < 8 ? hi : liq);
    }
  };
  const shaft = (id, c, tip, fletch, thick) => {
    const i = reg(id);
    for (let k = 0; k < 10; k++) { ip(i, 2 + k, 13 - k, c); if (thick) ip(i, 3 + k, 13 - k, '#5a3a1c'); }
    [[12, 3], [13, 2], [12, 2], [13, 3], [11, 3], [12, 4], [14, 1]].forEach(([x, y]) => ip(i, x, y, tip));
    if (fletch) [[2, 13], [2, 12], [3, 13], [1, 13], [2, 14]].forEach(([x, y]) => ip(i, x, y, fletch));
  };
  const bowI = (id, c, dk) => {
    const i = reg(id);
    [[5, 2], [6, 2], [7, 3], [8, 3], [9, 4], [10, 5], [10, 6], [11, 7], [11, 8], [10, 9], [10, 10], [9, 11], [8, 12], [7, 12], [6, 13], [5, 13]]
      .forEach(([x, y]) => { ip(i, x, y, c); ip(i, x + 1, y, dk); });
    ir(i, 5, 3, 1, 10, '#e8e8e8');
  };
  const staffI = (id, orb, hi) => {
    const i = reg(id);
    for (let k = 0; k < 9; k++) { ip(i, 2 + k, 13 - k, '#8a5a34'); ip(i, 3 + k, 13 - k, '#5a3a1c'); }
    ir(i, 10, 2, 4, 4, orb); ir(i, 11, 1, 2, 6, orb); ir(i, 9, 3, 6, 2, orb); ir(i, 11, 3, 1, 1, hi); ir(i, 10, 2, 1, 1, hi);
  };
  const bombI = (id, c, hi, dk) => {
    const i = reg(id);
    for (let y = 5; y < 15; y++) for (let x = 3; x < 13; x++) {
      const d = (x - 7.5) ** 2 + (y - 9.5) ** 2; if (d > 22) continue;
      ip(i, x, y, d > 14 ? dk : (x < 7 && y < 9) ? hi : c);
    }
    ip(i, 9, 4, '#8a5a34'); ip(i, 10, 3, '#8a5a34'); ip(i, 11, 2, '#ffd84a'); ip(i, 12, 1, '#ff7a1a');
  };
  nug('silver', '#d8dce8', '#ffffff', '#8890a8');
  gem('ruby', '#e03a4a', '#ffc0c8', '#8a1424'); gem('emerald', '#3ad07a', '#c0ffd8', '#1a8a4a');
  flask('bottle', 'rgba(190,230,255,.35)', 'rgba(255,255,255,.6)'); flask('potion_big', '#b8143a', '#ff8aa0', '#ffd84a');
  flask('potion_speed', '#4aa0ff', '#b0dcff'); flask('potion_iron', '#9aa0aa', '#e8ecf2'); flask('potion_miner', '#e8a810', '#fff08a');
  flask('potion_shine', '#f0f060', '#ffffd0'); flask('potion_regen', '#ff8ab0', '#ffd0e0'); flask('potion_jump', '#3fb83f', '#b0ffb0');
  flask('cloud', '#f4f8ff', '#ffffff', '#4aa0ff');
  shaft('arrow_fire', '#8a5a34', '#ff7a1a', '#ffd84a'); shaft('arrow_bone', '#e8e0d0', '#ffffff', '#b8b0a0');
  shaft('javelin', '#c7965a', '#c8ccd4', null, 1); shaft('spear_iron', '#8a5a34', '#e8ecf2', null, 1); shaft('spear_gold', '#8a5a34', '#ffd84a', null, 1);
  bowI('bow_iron', '#9aa0aa', '#6a707a'); bowI('bow_gold', '#e8b82a', '#a87a10');
  staffI('staff_fire', '#ff7a1a', '#fff6b0'); staffI('staff_ice', '#7ad0ff', '#ffffff'); staffI('staff_bolt', '#f0f060', '#ffffff');
  bombI('bomb_sticky', '#2f8f2f', '#9af08a', '#1f6b2a');
  { const i = reg('dynamite'); ir(i, 5, 5, 6, 9, '#d42a3a'); ir(i, 5, 5, 2, 9, '#f06a7a'); ir(i, 5, 8, 6, 1, '#e8e0d0'); ir(i, 5, 11, 6, 1, '#e8e0d0'); ir(i, 7, 3, 1, 2, '#8a5a34'); ir(i, 8, 2, 1, 1, '#ffd84a'); ir(i, 9, 1, 1, 1, '#ff7a1a'); }
  { const i = reg('firework'); ir(i, 6, 5, 4, 7, '#4aa0ff'); ir(i, 6, 7, 4, 1, '#ffd84a'); ir(i, 6, 10, 4, 1, '#ffd84a'); ir(i, 7, 3, 2, 2, '#d42a3a'); ir(i, 6, 4, 4, 1, '#d42a3a'); ir(i, 8, 12, 1, 3, '#8a5a34'); }
  spr('knife', ['.......gw', '......gw.', '.....gw..', '....gw...', '..Ygd....', '..bY.....', '.b.......']);
  spr('shuriken', ['....g....', '....gg...', 'g..gwg...', 'gggwwwggg', '...gwg..g', '...gg....', '....g....']);
  spr('boomerang', ['BBBBBBB.', 'BlllllB.', '.BBBBlB.', '....BlB.', '....BlB.', '....BlB.', '.....BB.']);
  spr('apple', ['....B...', '...nB...', '.rrrrrr.', 'rrwrrrrr', 'rrwrrrrr', 'rrrrrrrR', '.rrrrrR.', '..rrRR..']);
  spr('pie', ['..w...w..', '.lllllll.', 'lYlYlYlYl', 'BlllllllB', '.BBBBBBB.']);
  spr('soup', ['..w..w....', '.w..w.....', 'BBBBBBBBBB', 'BooooooooB', '.BllllllB.', '..BllllB..', '...BBBB...']);
  spr('mirror', ['..YYYY..', '.YcwccY.', '.YwcccY.', '.YccccY.', '.YccccY.', '..YYYY..', '...bb...', '...bb...', '...bb...']);
  spr('boots', ['.BBB.....', '.Bll..ww.', '.Bll.www.', '.Blll.w..', '.BllllB..', '.BBBBBBB.']);
  spr('helmet', ['..YYYY..', '.YyyyyY.', 'YyywwyyY', 'YyywwyyY', 'YY....YY']);
  spr('band', ['...pp...', '..YYYY..', '.Y....Y.', 'Y......Y', 'Y......Y', '.Y....Y.', '..YYYY..']);
  spr('shield', ['VVVVVVVV', 'VvvvvvvV', 'VvuuvvvV', 'VvuuvvvV', '.VvvvvV.', '..VvvV..', '...VV...']);
  spr('bone', ['ee.....', 'eee....', '.eeE...', '..eeE..', '...eeE.', '....eee', '.....ee']);
  spr('cloth', ['eeeeeeee', 'ewweeeeE', 'eeeewweE', 'eeeeeeeE', 'EeeeeeeE', 'EEEEEEEE']);
  spr('wing', ['....vvv', '..vvvvv', '.vvvvvV', 'vvvvVV.', 'vv.V...', 'v......']);

  // ════════ 科技贴图 ════════
  oreTile(URANIUM, '#5fff5f', '#d0ffd0', '#1f8f1f');
  const baseT = (t, col) => {
    rect(t, 1, 11, 14, 5, '#3a3e48'); rect(t, 1, 11, 14, 1, '#787c85'); rect(t, 3, 9, 10, 2, '#5c5f66'); rect(t, 6, 7, 4, 2, '#484b52');
    rect(t, 2, 13, 2, 1, col); rect(t, 12, 13, 2, 1, col); rect(t, 6, 13, 4, 1, col); rect(t, 7, 8, 2, 1, col);
  };
  baseT(DRONE_MINE, '#ffd84a'); baseT(DRONE_ORE, '#3ad0e0'); baseT(DRONE_GUARD, '#ff5a5a'); baseT(DRONE_TRANS, '#5fd65f');
  rect(SOLAR, 7, 11, 2, 5, '#5c5f66'); rect(SOLAR, 5, 15, 6, 1, '#484b52'); rect(SOLAR, 1, 6, 14, 5, '#1a3a8a'); rect(SOLAR, 1, 6, 14, 1, '#6a9aff'); rect(SOLAR, 1, 8, 14, 1, '#2a5ac0'); rect(SOLAR, 5, 6, 1, 5, '#4a6ad0'); rect(SOLAR, 10, 6, 1, 5, '#4a6ad0');
  rect(COALGEN, 2, 6, 12, 10, '#5a4a3a'); rect(COALGEN, 2, 6, 12, 1, '#8a7a6a'); rect(COALGEN, 10, 1, 3, 5, '#3a3a44'); rect(COALGEN, 10, 1, 3, 1, '#5c5f66'); rect(COALGEN, 4, 10, 5, 4, '#1a0c04'); rect(COALGEN, 5, 11, 3, 3, '#ff7a1a'); rect(COALGEN, 6, 12, 1, 2, '#ffd84a'); rect(COALGEN, 11, 9, 1, 3, '#ffd84a');
  rect(BATTERY, 3, 5, 10, 11, '#2a2e38'); rect(BATTERY, 3, 5, 10, 1, '#787c85'); rect(BATTERY, 6, 3, 4, 2, '#9aa0aa'); rect(BATTERY, 5, 7, 6, 2, '#5fd65f'); rect(BATTERY, 5, 10, 6, 2, '#5fd65f'); rect(BATTERY, 5, 13, 6, 2, '#3fb83f');
  rect(REACTOR, 1, 2, 14, 14, '#6a707a'); rect(REACTOR, 1, 2, 14, 1, '#a8abb4'); rect(REACTOR, 1, 2, 1, 14, '#8e939c'); rect(REACTOR, 5, 5, 6, 8, '#0c2a0c'); rect(REACTOR, 6, 6, 4, 6, '#5fff5f'); rect(REACTOR, 7, 7, 2, 4, '#d0ffd0');
  for (let x = 1; x < 15; x++) px(REACTOR * T + x, 15, x % 4 < 2 ? '#ffd84a' : '#1a1208');
  rect(CENTRIFUGE, 4, 3, 8, 13, '#8a8d96'); rect(CENTRIFUGE, 4, 3, 2, 13, '#c0c3cc'); rect(CENTRIFUGE, 3, 15, 10, 1, '#484b52'); rect(CENTRIFUGE, 4, 6, 8, 1, '#484b52'); rect(CENTRIFUGE, 4, 11, 8, 1, '#484b52'); rect(CENTRIFUGE, 8, 8, 2, 2, '#5fff5f'); rect(CENTRIFUGE, 5, 2, 6, 1, '#5c5f66');
  rect(RTG, 5, 4, 6, 12, '#4a3a6a'); rect(RTG, 5, 4, 6, 1, '#7a6a9a'); rect(RTG, 2, 6, 12, 1, '#2e2438'); rect(RTG, 2, 9, 12, 1, '#2e2438'); rect(RTG, 2, 12, 12, 1, '#2e2438'); rect(RTG, 7, 5, 2, 10, '#c07aff');
  nug('uranium', '#5fff5f', '#d0ffd0', '#1f8f1f'); nug('plutonium', '#c07aff', '#f0d0ff', '#6a2aa8');
  bombI('nuke', '#e8b82a', '#fff6b0', '#8a6410'); { const i = ICON.nuke; ir(i, 6, 8, 4, 1, '#1a1208'); ir(i, 7, 10, 2, 2, '#1a1208'); ir(i, 5, 11, 1, 1, '#1a1208'); ir(i, 10, 11, 1, 1, '#1a1208'); }
  spr('fuel_rod', ['.dddd.', '.gGGd.', '.gGGd.', '.gGGd.', '.gGGd.', '.gGGd.', '.gGGd.', '.dddd.']);
  spr('mod_range', ['dddddddd', 'dnnnnnnd', 'dnyGGynd', 'dnGyyGnd', 'dnGyyGnd', 'dnyGGynd', 'dnnnnnnd', 'dddddddd']);
  spr('mod_speed', ['dddddddd', 'dRRRRRRd', 'dRoRoRRd', 'dRRoRoRd', 'dRRoRoRd', 'dRoRoRRd', 'dRRRRRRd', 'dddddddd']);
  spr('pick_laser', ['.........c', 'ggggggddcw', 'gdddddgd.c', 'ggg..dd...', 'gg........', 'gg........']);
  spr('jetpack', ['.gg.gg.', 'gwdgwdg', 'gddgddg', 'gddgddg', 'gddgddg', '.dd.dd.', '.o...o.', '.y...y.']);
}

function itemIcon(id) {
  if (ICON[id] !== undefined) return [icons, ICON[id] * T];
  return [atlas, ITEMS[id].tile * T];
}

// ───────────────────────── 实体 / 状态 ─────────────────────────
const player = { x: 0, y: 0, w: 0.75, h: 1.75, vx: 0, vy: 0, onG: false, face: 1, hp: 100, maxHp: 100, inv: 0, walk: 0, swing: 0, swingCd: 0, coyote: 0, lastHurt: 99, useCd: 0 };
let enemies = [], parts = [], texts = [], shots = [];
let dayT = 0.04, timeAcc = 0, spawnT = 3, shake = 0;
const DAY_LEN = 300;
const input = { l: false, r: false, j: false, d: false, mx: 0, ju: false, jd: false, act: false, actFresh: false };
let tickT = 0, nearFire = false;
const ptr = { down: false, x: 0, y: 0, id: -1, fresh: false };
const mine = { x: -1, y: -1, p: 0 };
let placeCd = 0, hudDirty = true, hpDirty = true, running = false, saveT = 0;

function give(id, n, wx, wy) {
  inv[id] += n; hudDirty = true;
  const k = ITEMS[id].k;
  if (!PASSIVE(k) && hotbar.indexOf(id) < 0) { const e = hotbar.indexOf(null); if (e >= 0) hotbar[e] = id; }
  if (wx !== undefined) floatText('+' + n + ' ' + ITEMS[id].n, wx, wy, '#fff');
}
function bestArmor() { for (const id of ARMOR_IDS) if (inv[id] > 0) return id; return null; }
function armorDef() { const a = bestArmor(); return Math.min(0.8, (a ? ITEMS[a].def : 0) + (buffs.iron > 0 ? 0.15 : 0)); }
function nearStation(t) {
  const cx = Math.floor(player.x + player.w / 2), cy = Math.floor(player.y + player.h / 2);
  for (let y = cy - 4; y <= cy + 4; y++) for (let x = cx - 5; x <= cx + 5; x++) if (getT(x, y) === t) return true;
  return false;
}

function boxHits(x, y, w, h) {
  const x0 = Math.floor(x), x1 = Math.floor(x + w - 1e-6), y0 = Math.floor(y), y1 = Math.floor(y + h - 1e-6);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (isSolid(tx, ty)) return true;
  return false;
}
function moveEnt(e, dt, step) {
  const dx = e.vx * dt;
  if (dx) {
    e.x += dx;
    if (boxHits(e.x, e.y, e.w, e.h)) {
      if (step && e.onG && !boxHits(e.x, e.y - 1.02, e.w, e.h)) { e.y -= 1.02; }
      else { e.x = dx > 0 ? Math.floor(e.x + e.w) - e.w - 0.001 : Math.floor(e.x) + 1.001; e.vx = 0; }
    }
  }
  e.vy = Math.min(e.vy + 38 * dt, 30);
  const dy = e.vy * dt;
  e.y += dy; e.onG = false;
  if (boxHits(e.x, e.y, e.w, e.h)) {
    if (e.vy > 0) { e.y = Math.floor(e.y + e.h) - e.h - 0.001; e.onG = true; }
    else e.y = Math.floor(e.y) + 1.001;
    e.vy = 0;
  } else if (dy > 0) { // 木平台：只在下落且脚原本在平台上方时站住
    const feet = e.y + e.h, ty = Math.floor(feet);
    if (feet - dy <= ty + 0.002) {
      const x1 = Math.floor(e.x + e.w - 1e-6);
      if (!e.drop) for (let tx = Math.floor(e.x); tx <= x1; tx++) if (getT(tx, ty) === PLATFORM) { e.y = ty - e.h - 0.001; e.onG = true; e.vy = 0; break; }
    }
  }
  e.x = clamp(e.x, 0.01, W - e.w - 0.01);
}

function respawn(keepHp) {
  player.x = spawnX + 0.1; player.y = spawnY - 0.5; player.vx = player.vy = 0; player.inv = 2;
  if (!keepHp) player.hp = player.maxHp;
  while (boxHits(player.x, player.y, player.w, player.h) && player.y > 2) player.y -= 1;
  hpDirty = true;
}

function hurtPlayer(d, fromX) {
  if (player.inv > 0) return;
  d = Math.max(1, Math.round(d * (1 - armorDef())));
  player.hp -= d; player.inv = 0.8; player.lastHurt = 0;
  if (!(inv.shield > 0)) { player.vx = (player.x + player.w / 2 > fromX ? 1 : -1) * 8; player.vy = -8; }
  try { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(30); } catch (e) { /* */ }
  floatText('-' + d, player.x + 0.4, player.y, '#ff6a6a'); sfx(140, 0.15, 'sawtooth', 0.12);
  hpDirty = true;
  if (player.hp <= 0) {
    toast('你倒下了… 已回到出生点');
    burst(player.x + 0.4, player.y + 0.9, '#d42a3a', 20); respawn();
  }
}
function heal(n) {
  player.hp = Math.min(player.maxHp, player.hp + n); hpDirty = true;
  floatText('+' + n + ' 生命', player.x + 0.4, player.y, '#7dff7d'); sfx(660, 0.12, 'triangle', 0.07);
}
function useItem(id) {
  if (inv[id] <= 0) return false;
  const it = ITEMS[id];
  if (id === 'mushroom' || id === 'potion' || it.heal) {
    if (player.hp >= player.maxHp) { toast('生命已满', 1200); return false; }
    heal(it.heal || (id === 'potion' ? 60 : 15));
  } else if (it.buff) {
    buffs[it.buff] = it.dur; tickT = 1; toast(BUFF_NAME[it.buff] + '效果生效（' + it.dur + ' 秒）', 1500); sfx(520, 0.15, 'triangle', 0.07);
  } else if (id === 'mirror') {
    burst(player.x + 0.4, player.y + 0.9, '#3ad0e0', 16); respawn(true); player.inv = 0.5;
    burst(player.x + 0.4, player.y + 0.9, '#3ad0e0', 16); sfx(880, 0.25, 'sine', 0.08); toast('回到了出生点', 1200); return true;
  } else if (id === 'crystal') {
    if (player.maxHp >= 200) { toast('生命上限已达最高', 1500); return false; }
    player.maxHp += 20; heal(20); toast('生命上限 +20！', 1500);
  } else return false;
  inv[id]--; hudDirty = true; return true;
}

function spawnSlime() {
  const night = daylight() < 0.4;
  if (enemies.length >= (night ? 7 : 4)) return;
  if (player.y > surf[clamp(Math.floor(player.x), 0, W - 1)] + 8) { // 地下：洞穴蝙蝠
    for (let k = 0; k < 12; k++) {
      const bx = Math.floor(player.x + (Math.random() - 0.5) * 40), by = Math.floor(player.y + (Math.random() - 0.5) * 18);
      if (Math.abs(bx - player.x) > 10 && bx > 1 && bx < W - 2 && by > 0 && by < H - 2 && getT(bx, by) === AIR && walls[by * W + bx]) {
        enemies.push({ type: 'bat', x: bx + 0.1, y: by + 0.2, w: 0.8, h: 0.5, vx: 0, vy: 0, onG: false, hp: 14, max: 14, dmg: 10, t: 0, hit: 0, coin: 3, drops: [['wing', 0.6]] });
        return;
      }
    }
    return;
  }
  const sx = Math.floor(player.x + (Math.random() < 0.5 ? -1 : 1) * (16 + Math.random() * 10));
  if (sx < 2 || sx > W - 3) return;
  let sy = 0; while (sy < H && !isSolid(sx, sy)) sy++;
  if (Math.abs(sy - player.y) > 30) return;
  if (night && Math.random() < 0.4) { // 夜晚：僵尸
    enemies.push({ type: 'zombie', x: sx + 0.1, y: sy - 1.8, w: 0.75, h: 1.75, vx: 0, vy: 0, onG: false, hp: 45, max: 45, dmg: 18, t: 0, hit: 0, coin: 6, drops: [['cloth', 0.7], ['bone', 0.6]] });
    return;
  }
  const big = night && Math.random() < 0.6;
  enemies.push({ x: sx, y: sy - 1.2, w: 0.9, h: 0.7, vx: 0, vy: 0, onG: false, hp: big ? 40 : 18, max: big ? 40 : 18,
    dmg: big ? 16 : 8, col: big ? ['#c8324a', '#ff7a8a', '#7a1428'] : ['#3fb83f', '#9af08a', '#1f6b2a'], t: Math.random() * 2, hit: 0, big });
}
function damageEnemy(e, dmg, dir) {
  e.hp -= dmg; e.hit = 0.15; e.vx = dir * 7; e.vy = -6;
  floatText('' + dmg, e.x + 0.4, e.y, '#ffd84a');
}

function startSwing(id) {
  const it = id ? ITEMS[id] : null;
  player.swing = 0.28; player.swingCd = 0.34;
  const dmg = it && it.k === 'sword' ? it.dmg : 4, reach = (it && it.reach) || 2.7;
  const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
  let hit = false;
  for (const e of enemies) {
    const ex = e.x + e.w / 2 - cx, ey = e.y + e.h / 2 - cy;
    if (ex * player.face > -0.6 && Math.abs(ex) < reach && Math.abs(ey) < 2.2) { damageEnemy(e, dmg, player.face); hit = true; }
  }
  sfx(hit ? 220 : 520, 0.06, hit ? 'square' : 'triangle', hit ? 0.1 : 0.04);
}

function chestLoot(tx, ty) {
  const depth = ty - surf[tx], c = rint(5, 15) + Math.floor(depth / 4);
  coins += c; floatText('+' + c + ' 金币', tx + 0.5, ty - 0.6, '#ffd84a');
  give('torch', rint(4, 8));
  const pool = [['arrow', 10, 20], ['potion', 1, 2], ['bomb', 2, 3], ['bar_copper', 3, 5], ['platform', 8, 14], ['rope', 8, 15], ['knife', 8, 14],
    ['potion_speed', 1, 2], ['potion_miner', 1, 2], ['potion_shine', 1, 2], ['arrow_fire', 8, 14], ['bottle', 2, 4]];
  if (depth > 28) pool.push(['bar_silver', 3, 5], ['potion_iron', 1, 2], ['shuriken', 8, 14], ['dynamite', 1, 2]);
  if (depth > 50) pool.push(['potion_big', 1, 2], ['emerald', 1, 2]);
  if (depth > 74) pool.push(['ruby', 1, 2]);
  if (Math.random() < 0.3) { // 稀有饰品
    const acc = ['cloud', 'boots', 'helmet', 'band', 'shield', 'boomerang', 'mirror'].filter(a => !inv[a]);
    if (acc.length) { const a = acc[rint(0, acc.length - 1)]; give(a, 1); toast('宝箱里有稀有物品：' + ITEMS[a].n + '！', 3000); sfx(1040, 0.3, 'square', 0.08); return; }
  }
  if (depth > 28) pool.push(['bar_iron', 3, 5]);
  if (depth > 50) pool.push(['bar_gold', 2, 4]);
  if (depth > 64) pool.push(['diamond', 1, 2]);
  const got = ['火把'];
  for (let k = 0; k < 2; k++) { const [id, a, b] = pool[rint(0, pool.length - 1)]; give(id, rint(a, b)); got.push(ITEMS[id].n); }
  toast('打开宝箱：' + got.join('、') + '、金币', 2200); sfx(880, 0.15, 'square', 0.07);
}

function breakTile(tx, ty) {
  if (tx < 0 || tx >= W || ty < 0 || ty >= H) return;
  const i = ty * W + tx, t = tiles[i];
  if (t === AIR || t === BEDROCK) return;
  if (machines[i]) removeMachine(i);
  tiles[i] = AIR; lightVer++;
  burst(tx + 0.5, ty + 0.5, TILE[t].col, 7);
  if (t === CHEST) chestLoot(tx, ty);
  else if (TILE[t].drop) give(TILE[t].drop, 1, tx + 0.5, ty);
  if (!quietBreak) sfx(SOLID[t] && t !== DIRT && t !== GRASS && t !== SAND ? 180 : 300, 0.07, 'square', 0.07);
  if (t === LOG) { // 整棵树倒下
    let y = ty - 1, n = 0;
    while (y > 0 && tiles[y * W + tx] === LOG) { tiles[y * W + tx] = AIR; burst(tx + 0.5, y + 0.5, TILE[LOG].col, 3); n++; y--; }
    if (n) give('wood', n, tx + 0.5, ty - 1);
    let nl = 0;
    for (let yy = y - 3; yy <= ty; yy++) for (let xx = tx - 3; xx <= tx + 3; xx++) {
      if (getT(xx, yy) === LEAVES) { tiles[yy * W + xx] = AIR; nl++; if (Math.random() < 0.4) burst(xx + 0.5, yy + 0.5, TILE[LEAVES].col, 2); }
    }
    if (nl) { // 树叶掉落橡果和苹果
      const ac = Math.round(nl * 0.1 * (0.4 + Math.random())), ap = Math.round(nl * 0.07 * (0.3 + Math.random()));
      if (ac) give('acorn', ac, tx + 0.5, ty - 2); if (ap) give('apple', ap, tx + 0.5, ty - 3);
    }
  }
  // 上方失去支撑的物件掉落
  const a = getT(tx, ty - 1);
  if (NEEDS_FLOOR[a]) breakTile(tx, ty - 1);
  else if (a === TORCH && !walls[(ty - 1) * W + tx] && getT(tx - 1, ty - 1) === AIR && getT(tx + 1, ty - 1) === AIR) breakTile(tx, ty - 1);
}

function tryPlace(tx, ty, id) {
  if (tx < 0 || tx >= W || ty < 1 || ty >= H - 1) return;
  const i = ty * W + tx, t = ITEMS[id].tile;
  if (tiles[i] !== AIR || inv[id] <= 0) return;
  if (NEEDS_FLOOR[t]) { const b = getT(tx, ty + 1); if (!SOLID[b] && b !== PLATFORM) return; }
  else if (!(walls[i] || getT(tx - 1, ty) !== AIR || getT(tx + 1, ty) !== AIR || getT(tx, ty - 1) !== AIR || getT(tx, ty + 1) !== AIR)) return;
  if (SOLID[t]) {
    const hit = e => e.x < tx + 1 && e.x + e.w > tx && e.y < ty + 1 && e.y + e.h > ty;
    if (hit(player) || enemies.some(hit)) return;
  }
  tiles[i] = t; inv[id]--; hudDirty = true; placeCd = 0.13; lightVer++;
  if (MACH[t]) machines[i] = newMachine(t, i);
  if (t === BED) { spawnX = tx; spawnY = ty - 1; toast('出生点已设在床边', 1500); }
  sfx(400, 0.04, 'square', 0.05);
}

function explode(x, y, R) {
  R = R || 2.7;
  quietBreak = true;
  for (let ty = Math.floor(y - R); ty <= y + R; ty++) for (let tx = Math.floor(x - R); tx <= x + R; tx++) {
    if (Math.hypot(tx + 0.5 - x, ty + 0.5 - y) <= R) breakTile(tx, ty);
  }
  quietBreak = false;
  for (const e of enemies) if (Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) < R + 1.3) damageEnemy(e, 60, Math.sign(e.x - x) || 1);
  if (Math.hypot(player.x + player.w / 2 - x, player.y + player.h / 2 - y) < R + 0.5) hurtPlayer(R > 6 ? 150 : 35, x);
  burst(x, y, '#ffd84a', 16); burst(x, y, '#ff7a1a', 16); burst(x, y, '#55555f', 12);
  shake = R > 6 ? 1 : 0.35; sfx(70, R > 6 ? 1.2 : 0.4, 'sawtooth', 0.2); sfx(110, 0.25, 'square', 0.12);
}

function burst(x, y, col, n) {
  if (parts.length > 300) return;
  for (let k = 0; k < n; k++) parts.push({ x, y, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 6 - 1, life: 0.4 + Math.random() * 0.4, col });
}
function floatText(text, x, y, col) {
  for (const q of texts) if (Math.abs(q.x - x) < 1.5 && Math.abs(q.y - y) < 0.5) y -= 0.5; // 避免重叠
  texts.push({ text, x, y, col, life: 0.9 }); if (texts.length > 16) texts.shift();
}
function daylight() { return clamp(0.5 + Math.sin(dayT * Math.PI * 2) * 2.5, 0, 1); }

function growTree(x, y) {
  const th = 4 + Math.floor(Math.random() * 4);
  for (let k = 0; k < th; k++) { const t = getT(x, y - k); if (k && t !== AIR && t !== LEAVES) return; }
  for (let k = 0; k < th; k++) tiles[(y - k) * W + x] = LOG;
  const top = y - th + 1;
  for (let dy = -3; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (Math.abs(dx) + Math.abs(dy + 1) > 3) continue;
    const xx = x + dx, yy = top + dy;
    if (xx > 0 && xx < W && yy > 0 && tiles[yy * W + xx] === AIR) tiles[yy * W + xx] = LEAVES;
  }
  lightVer++;
}
// 每秒一次的慢速逻辑：增益倒计时显示、篝火检测、树苗生长
function slowTick() {
  nearFire = nearStation(CAMPFIRE);
  const act = Object.keys(buffs).filter(b => buffs[b] > 0).map(b => BUFF_NAME[b] + Math.ceil(buffs[b]) + 's');
  if (nearFire) act.push('篝火');
  $('buffs').textContent = act.join(' ');
  const px = Math.floor(player.x);
  for (let y = 2; y < H - 2; y++) for (let x = Math.max(1, px - 45); x < Math.min(W - 1, px + 45); x++) {
    if (tiles[y * W + x] === SAPLING && Math.random() < 0.035) growTree(x, y);
  }
}
// 「动作键」的智能瞄准：自动选择面前的方块 / 最近的敌人
function autoTarget(k) {
  const p = player, cx = p.x + p.w / 2, f = p.face, cxT = Math.floor(cx);
  const head = Math.floor(p.y + 0.3), feet = Math.floor(p.y + p.h - 0.3);
  if (k === 'pick') {
    const c = [];
    if (input.d || input.jd) c.push([cxT, feet + 1], [Math.floor(p.x), feet + 1], [Math.floor(p.x + p.w), feet + 1]);
    else if (input.ju) c.push([cxT, head - 1], [Math.floor(p.x), head - 1], [Math.floor(p.x + p.w), head - 1]);
    for (let d = 1; d <= 2; d++) c.push([cxT + f * d, head], [cxT + f * d, feet]);
    c.push([cxT + f, feet + 1], [cxT + f, head - 1]);
    for (const [x, y] of c) { const t = getT(x, y); if (t !== AIR && t !== BEDROCK && y >= 0) return [x + 0.5, y + 0.5]; }
  } else if (k === 'block') {
    const c = (input.d || input.jd) ? [[cxT, feet + 1]] : [[cxT + f, feet + 1], [cxT + f * 2, feet + 1], [cxT + f, feet], [cxT + f, head]];
    for (const [x, y] of c) if (getT(x, y) === AIR) return [x + 0.5, y + 0.5];
  } else if (k === 'bow' || k === 'staff' || k === 'throw') {
    let best = null, bd = 15;
    for (const e of enemies) { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < bd) { bd = d; best = e; } }
    if (best) return [best.x + best.w / 2, best.y + best.h / 2 - (k === 'staff' ? 0 : bd * 0.06)];
    return [cx + f * 8, p.y + 0.2];
  }
  return [cx + f * 2, p.y + 0.8];
}

// ───────────────────────── 逻辑更新 ─────────────────────────
function ptrWorld() { return [(ptr.x * dpr / zoom + camX) / T, (ptr.y * dpr / zoom + camY) / T]; }

function update(dt) {
  const p = player;
  dayT = (dayT + dt / DAY_LEN) % 1;
  const dir = input.mx ? input.mx : (input.r ? 1 : 0) - (input.l ? 1 : 0);
  const jump = input.j || input.ju, down = input.d || input.jd;
  for (const b in buffs) if (buffs[b] > 0) buffs[b] -= dt;
  tickT += dt; if (tickT >= 1) { tickT = 0; slowTick(); }
  powT += dt; if (powT >= 0.5) { powT = 0; powerTick(0.5); }
  droneUpdate(dt);
  const target = dir * 7.5 * (buffs.speed > 0 ? 1.3 : 1) * (inv.boots > 0 ? 1.2 : 1), acc = p.onG ? 60 : 35;
  if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt); else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
  if (dir) p.face = dir > 0 ? 1 : -1;
  p.coyote = p.onG ? 0.1 : p.coyote - dt;
  if (p.onG) p.dj = false;
  if (jump && p.coyote > 0) { p.vy = buffs.jump > 0 ? -17.5 : -14.5; p.coyote = 0; sfx(360, 0.05, 'triangle', 0.04); }
  else if (jump && !p.jPrev && !p.onG && inv.cloud > 0 && !p.dj) { // 云朵瓶：二段跳
    p.vy = -13; p.dj = true; burst(p.x + 0.4, p.y + p.h, '#f4f8ff', 8); sfx(480, 0.06, 'triangle', 0.05);
  }
  p.jPrev = jump;
  if (p.onG) p.jet = 2.5;
  if (inv.jetpack > 0 && jump && !p.onG && p.vy > -3 && p.jet > 0) { // 喷气背包
    p.vy = Math.max(p.vy - 75 * dt, -8.5); p.jet -= dt;
    if (Math.random() < 0.6) parts.push({ x: p.x + 0.2 + Math.random() * 0.3, y: p.y + 1.3, vx: (Math.random() - 0.5) * 2, vy: 5 + Math.random() * 3, life: 0.3, col: Math.random() < 0.5 ? '#ff7a1a' : '#ffd84a' });
  }
  if (!jump && p.vy < -5) p.vy = -5;
  if (getT(Math.floor(p.x + p.w / 2), Math.floor(p.y + p.h / 2)) === ROPE) { p.vy = jump ? -7 : down ? 6 : -38 * dt; p.dj = false; } // 爬绳
  if (lift) { // 运输无人机吊着玩家直线上升
    lift.t += dt; p.vx = 0; p.x = lift.x; p.vy = -12; p.inv = 0.9; p.dj = false;
    if (p.y + p.h < lift.land.y - 0.3) { p.x = lift.land.x + 0.125; p.y = lift.land.y - p.h - 0.02; p.vy = 0; lift = null; toast('已送达地表', 1500); sfx(660, 0.15, 'triangle', 0.07); }
    else if (lift.t > 40) lift = null;
  }
  p.drop = down;
  moveEnt(p, dt, true);
  if (p.onG && Math.abs(p.vx) > 0.5) p.walk += Math.abs(p.vx) * dt * 1.6; else if (p.onG) p.walk = 0;
  p.inv -= dt; p.swing -= dt; p.swingCd -= dt; p.useCd -= dt; placeCd -= dt; p.lastHurt += dt; shake -= dt;
  const regen = (p.lastHurt > 5 ? 4 : 0) + (buffs.regen > 0 ? 3 : 0) + (inv.band > 0 ? 1.5 : 0) + (nearFire ? 2 : 0);
  if (regen && p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + regen * dt); hpDirty = true; }

  // 触摸 / 鼠标交互
  let mining = false;
  const id = hotbar[sel], it = id ? ITEMS[id] : null, k = it && inv[id] > 0 ? it.k : 'hand';
  const auto = !ptr.down && input.act, ranged = k === 'bow' || k === 'staff' || k === 'throw';
  if (selMode) handleSelect();
  const aim = selMode || selDrag || lift ? null : ptr.down ? ptrWorld() : auto ? autoTarget(k) : null, fresh = ptr.fresh || input.actFresh;
  if (aim) {
    const [wx, wy] = aim, tx = Math.floor(wx), ty = Math.floor(wy);
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (!dir && (!auto || ranged)) p.face = wx >= cx ? 1 : -1;
    const inReach = Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) <= 5.5;
    if (k === 'pick' || k === 'sword' || k === 'hand' || PASSIVE(k)) {
      if (p.swingCd <= 0) startSwing(id);
      if (k === 'pick' && inReach) {
        const t = getT(tx, ty);
        if (t !== AIR && t !== BEDROCK && ty >= 0) {
          if (mine.x !== tx || mine.y !== ty) { mine.x = tx; mine.y = ty; mine.p = 0; }
          mine.p += dt * it.pow * (buffs.miner > 0 ? 1.5 : 1) / TILE[t].hard; mining = true;
          if (Math.random() < dt * 8) parts.push({ x: tx + 0.5, y: ty + 0.5, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4, life: 0.3, col: TILE[t].col });
          if (mine.p >= 1) { breakTile(tx, ty); mine.p = 0; mine.x = -1; }
        }
      }
    } else if (k === 'block') { if (inReach && placeCd <= 0) tryPlace(tx, ty, id); }
    else if (k === 'bow') {
      if (p.useCd <= 0) {
        const am = inv.arrow_fire > 0 ? 'arrow_fire' : inv.arrow_bone > 0 ? 'arrow_bone' : inv.arrow > 0 ? 'arrow' : null;
        if (am) {
          const a = Math.atan2(wy - cy, wx - cx);
          shots.push({ draw: 'arrow', x: cx, y: cy - 0.2, vx: Math.cos(a) * 24, vy: Math.sin(a) * 24 - 2, g: 18, life: 3,
            dmg: it.dmg + (am === 'arrow_fire' ? 10 : am === 'arrow_bone' ? 5 : 0), fire: am === 'arrow_fire' });
          inv[am]--; hudDirty = true; p.useCd = id === 'bow' ? 0.38 : 0.28; p.swing = 0.15; sfx(700, 0.06, 'triangle', 0.06);
        } else if (fresh) toast('没有箭矢了（木头 + 石头 可制作）', 1600);
      }
    } else if (k === 'staff') {
      if (p.useCd <= 0) {
        const a = Math.atan2(wy - cy, wx - cx);
        shots.push({ draw: 'bolt', x: cx, y: cy - 0.2, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, g: 0, life: 1.1, dmg: it.dmg, col: it.col, pierce: it.pierce, fire: true });
        p.useCd = it.cd; p.swing = 0.15; sfx(900, 0.08, 'sine', 0.06);
      }
    } else if (k === 'throw') {
      if (p.useCd <= 0) {
        const th = it.th, a = Math.atan2(wy - cy, wx - cx);
        if (th.bomb) {
          const sp = clamp(Math.hypot(wx - cx, wy - cy) * 2.6, 8, 20);
          shots.push({ draw: 'icon', icon: id, bomb: th.bomb, x: cx, y: cy - 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, g: 30, life: th.bomb.fuse });
          p.useCd = 0.6;
        } else {
          shots.push({ draw: 'icon', icon: id, x: cx, y: cy - 0.2, vx: Math.cos(a) * th.sp, vy: Math.sin(a) * th.sp - (th.g ? 2 : 0), g: th.g, life: th.life || 2.5,
            dmg: th.dmg, pierce: th.pierce, back: th.back, fx: th.fx });
          p.useCd = th.cd;
        }
        if (!th.keep) { inv[id]--; hudDirty = true; }
        p.swing = 0.2; sfx(300, 0.08, 'triangle', 0.05);
      }
    } else if (k === 'use') { if (fresh && p.useCd <= 0) { useItem(id); p.useCd = 0.3; } }
    ptr.fresh = false; input.actFresh = false;
  }
  if (!mining) { mine.p = 0; mine.x = -1; }

  // 投射物
  for (const s of shots) {
    s.life -= dt; s.vy += s.g * dt;
    if (s.back && !s.rev && s.life < s.back) { s.vx = -s.vx; s.vy = -s.vy; s.rev = true; s.last = null; }
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
    if (!s.bomb) {
      s.x = nx; s.y = ny;
      if (s.fire && Math.random() < 0.5) parts.push({ x: nx, y: ny, vx: (Math.random() - 0.5) * 2, vy: -Math.random() * 2, life: 0.25, col: s.col || '#ff7a1a' });
      if (isSolid(Math.floor(nx), Math.floor(ny))) { s.life = 0; burst(nx, ny, s.col || '#c7965a', 3); }
      else if (s.dmg) for (const e of enemies) if (e.hp > 0 && e !== s.last && nx > e.x - 0.15 && nx < e.x + e.w + 0.15 && ny > e.y - 0.15 && ny < e.y + e.h + 0.15) {
        damageEnemy(e, s.dmg, Math.sign(s.vx) || 1); sfx(220, 0.06, 'square', 0.08);
        if (s.pierce) s.last = e; else { s.life = 0; break; }
      }
      if (s.life <= 0 && s.fx === 'firework') {
        ['#ff5a5a', '#ffd84a', '#5fd65f', '#4aa0ff', '#ff8ab0'].forEach(c => burst(s.x, s.y, c, 10)); sfx(1200, 0.25, 'square', 0.06); sfx(90, 0.2, 'sawtooth', 0.1);
      }
    } else {
      if (!s.stuck) {
        let hit = false;
        if (isSolid(Math.floor(nx), Math.floor(s.y))) { s.vx *= -0.4; hit = true; } else s.x = nx;
        if (isSolid(Math.floor(s.x), Math.floor(ny))) { s.vy *= -0.35; s.vx *= 0.7; hit = true; } else s.y = ny;
        if (hit && s.bomb.sticky) { s.stuck = true; s.vx = s.vy = s.g = 0; }
      } else s.vy = 0;
      if (s.life <= 0) explode(s.x, s.y, s.bomb.R);
    }
  }
  shots = shots.filter(s => s.life > 0);

  // 敌人
  spawnT -= dt;
  if (spawnT <= 0) { spawnT = daylight() < 0.4 ? 2.5 : 5; spawnSlime(); }
  for (const e of enemies) {
    e.t -= dt; e.hit -= dt;
    if (e.type === 'bat') {
      if (e.hit <= 0) { e.vx = clamp(e.vx + Math.sign(p.x - e.x) * 18 * dt, -5, 5); e.vy = clamp(e.vy + Math.sign(p.y + 0.5 - e.y) * 18 * dt, -4, 4); }
      if (!boxHits(e.x + e.vx * dt, e.y, e.w, e.h)) e.x += e.vx * dt; else e.vx = -e.vx * 0.5;
      if (!boxHits(e.x, e.y + e.vy * dt, e.w, e.h)) e.y += e.vy * dt; else e.vy = -e.vy * 0.5;
    } else if (e.type === 'zombie') {
      if (e.hit <= 0 && e.onG) e.vx = Math.sign(p.x - e.x) * 2.8;
      const lx = e.x; moveEnt(e, dt, true);
      if (e.onG && e.hit <= 0 && Math.abs(e.x - lx) < 0.004 && Math.abs(p.x - e.x) > 0.6) e.vy = -11.5; // 被挡住就跳
    } else {
      if (e.onG) {
        e.vx *= 0.75;
        if (e.t <= 0) { e.vy = e.big ? -12.5 : -10.5; e.vx = Math.sign(p.x - e.x) * (e.big ? 5 : 4); e.t = 0.9 + Math.random() * 1.2; }
      }
      moveEnt(e, dt, false);
    }
    if (e.x < p.x + p.w && e.x + e.w > p.x && e.y < p.y + p.h && e.y + e.h > p.y) hurtPlayer(e.dmg, e.x + e.w / 2);
    if (e.hp <= 0) {
      const c = e.coin || (e.big ? 5 : 2); coins += c;
      burst(e.x + 0.45, e.y + 0.35, e.col ? e.col[0] : '#6a5a7a', 12); floatText('+' + c + ' 金币', e.x + 0.4, e.y - 0.5, '#ffd84a'); sfx(660, 0.1, 'square', 0.07);
      if (e.drops) { for (const [did, ch] of e.drops) if (Math.random() < ch) give(did, 1, e.x + 0.4, e.y); }
      else give('gel', e.big ? 2 : 1, e.x + 0.4, e.y);
    }
  }
  enemies = enemies.filter(e => e.hp > 0 && Math.abs(e.x - p.x) < 60 && e.y < H);

  for (const q of parts) { q.vy += 25 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
  parts = parts.filter(q => q.life > 0);
  for (const q of texts) { q.y -= dt * 1.5; q.life -= dt; }
  texts = texts.filter(q => q.life > 0);

  saveT += dt; if (saveT > 20) { saveT = 0; saveGame(); }
}

// ───────────────────────── 电力 / 机器 / 无人机 ─────────────────────────
const MACH = {};
MACH[DRONE_MINE]  = { n: '采矿无人机基座', cap: 200, drone: 'mine',  col: '#ffd84a' };
MACH[DRONE_ORE]   = { n: '探矿无人机基座', cap: 200, drone: 'ore',   col: '#3ad0e0' };
MACH[DRONE_GUARD] = { n: '护卫无人机基座', cap: 150, drone: 'guard', col: '#ff5a5a' };
MACH[DRONE_TRANS] = { n: '运输无人机停机坪', cap: 150, drone: 'trans', col: '#5fd65f' };
MACH[SOLAR]      = { n: '太阳能板', gen: 1.5 };
MACH[COALGEN]    = { n: '火力发电机', gen: 5 };
MACH[REACTOR]    = { n: '核反应堆', gen: 30 };
MACH[RTG]        = { n: '钚电池', gen: 3 };
MACH[BATTERY]    = { n: '蓄电池', cap: 600, bat: 1 };
MACH[CENTRIFUGE] = { n: '离心机', cap: 100 };
const ORE_SET = new Uint8Array(NT);
[COPPER, IRON, GOLD, COAL, DIAMOND, SILVER, RUBY, EMERALD, URANIUM].forEach(t => { ORE_SET[t] = 1; });
const POWER_R = 12; // 无线供电范围
let machines = {}, selMode = null, selDrag = null, lift = null, machOpen = -1, powT = 0, quietBreak = false;

function newMachine(t, i) {
  const m = { t, e: 0, i, x: i % W, y: (i / W) | 0 };
  if (MACH[t].drone) { m.e = 40; m.r = 0; m.s = 0; m.on = MACH[t].drone === 'guard'; }
  return m;
}
function removeMachine(i) {
  const m = machines[i]; if (!m) return;
  if (m.r) give('mod_range', m.r); if (m.s) give('mod_speed', m.s);
  if (m.pu) give('plutonium', m.pu); if (m.rod) give('fuel_rod', m.rod); if (m.rods) give('fuel_rod', m.rods); if (m.u) give('uranium', m.u);
  delete machines[i];
  if (machOpen === i) closeMach();
  if (selMode && selMode.i === i) { selMode = null; selDrag = null; }
  if (lift && lift.i === i) lift = null;
}
function skyOpen(m) {
  if (walls[m.i]) return false;
  for (let y = m.y - 1; y >= 0; y--) if (OPAQUE[getT(m.x, y)]) return false;
  return true;
}
// 每 0.5 秒结算一次电力
function powerTick(dt) {
  const list = Object.keys(machines).map(k => machines[k]);
  if (!list.length) return;
  const near = (a, b) => Math.abs(a.x - b.x) <= POWER_R && Math.abs(a.y - b.y) <= POWER_R;
  const cons = list.filter(m => MACH[m.t].cap && !MACH[m.t].bat), bats = list.filter(m => MACH[m.t].bat);
  const feed = (src, amount, toBat) => {
    let left = amount;
    for (const c of cons) { if (left <= 0) break; if (!near(src, c)) continue; const g = Math.min(left, MACH[c.t].cap - c.e); if (g > 0) { c.e += g; left -= g; } }
    if (toBat) for (const c of bats) { if (left <= 0) break; if (!near(src, c)) continue; const g = Math.min(left, MACH[c.t].cap - c.e); if (g > 0) { c.e += g; left -= g; } }
    return amount - left;
  };
  for (const m of list) {
    if (m.e < 0) m.e = 0;
    const def = MACH[m.t];
    if (m.t === SOLAR) { m.out = def.gen * daylight() * (skyOpen(m) ? 1 : 0); feed(m, m.out * dt, true); }
    else if (m.t === RTG) { m.out = def.gen; feed(m, def.gen * dt, true); }
    else if (m.t === COALGEN) {
      m.out = 0;
      if (m.fuel > 0) { const used = feed(m, def.gen * dt, true); if (used > 0) { m.fuel -= dt; m.out = used / dt; } }
    } else if (m.t === REACTOR) {
      m.out = 0;
      if (!(m.fuel > 0) && m.rods > 0) { m.rods--; m.fuel = 600; }
      if (m.fuel > 0) {
        m.out = feed(m, def.gen * dt, true) / dt; m.fuel -= dt;
        if (m.fuel <= 0) { m.pu = (m.pu || 0) + 1; toast('核反应堆烧完了一根燃料棒，产出 1 钚', 2500); }
      }
    } else if (m.t === CENTRIFUGE) {
      if (m.u >= 4 && m.e >= 2 * dt) { m.e -= 2 * dt; m.p = (m.p || 0) + dt; if (m.p >= 20) { m.p = 0; m.u -= 4; m.rod = (m.rod || 0) + 1; toast('离心机提炼出 1 根铀燃料棒', 2500); } }
    }
  }
  for (const b of bats) if (b.e > 0) b.e -= feed(b, Math.min(b.e, 10 * dt), false);
  if (machOpen >= 0) renderMach();
}

function flyTo(m, x, y, sp, dt) {
  const dx = x - m.dx, dy = y - m.dy, d = Math.hypot(dx, dy);
  if (d <= sp * dt) { m.dx = x; m.dy = y; return true; }
  m.dx += dx / d * sp * dt; m.dy += dy / d * sp * dt;
  return d < 1.6;
}
function droneCan(m, x, y) {
  const t = getT(x, y);
  if (t === AIR || t === BEDROCK || MACH[t] || MACH[getT(x, y - 1)]) return false;
  if (m.job) return SOLID[t] === 1;
  return m.t === DRONE_ORE ? ORE_SET[t] === 1 : SOLID[t] === 1;
}
function nextTarget(m, a) {
  for (let y = a.y0; y <= a.y1; y++) for (let x = a.x0; x <= a.x1; x++) if (droneCan(m, x, y)) return { x, y };
  return null;
}
function droneUpdate(dt) {
  for (const k in machines) {
    const m = machines[k], def = MACH[m.t];
    if (!def.drone) continue;
    const hx = m.x + 0.5, hy = m.y - 0.7;
    if (m.dx === undefined) { m.dx = hx; m.dy = hy; }
    m.lz = false;
    if (def.drone === 'mine' || def.drone === 'ore') {
      const job = m.job || (m.on ? m.area : null);
      if (job && m.e > 0.5) {
        if (!m.tg || !droneCan(m, m.tg.x, m.tg.y)) {
          m.tg = nextTarget(m, job); m.p = 0;
          if (!m.tg) {
            if (m.job) { m.job = null; toast('通道已打通！到停机坪点「送我回地表」', 3500); sfx(880, 0.2, 'square', 0.07); }
            else { m.on = false; toast(def.n.replace('基座', '') + '：框选区域已采完', 2500); sfx(660, 0.2, 'square', 0.06); }
          }
        }
        if (m.tg) {
          if (flyTo(m, m.tg.x + 0.5, m.tg.y + 0.5, 10 + 3 * m.s, dt)) {
            m.lz = true; m.e -= 1.2 * dt;
            m.p += dt * 2.5 * (1 + 0.7 * m.s) / TILE[getT(m.tg.x, m.tg.y)].hard;
            if (m.p >= 1) { quietBreak = Math.abs(m.tg.x - player.x) > 22 || Math.abs(m.tg.y - player.y) > 14; breakTile(m.tg.x, m.tg.y); quietBreak = false; m.tg = null; }
          }
          continue;
        }
      }
      flyTo(m, hx, hy, 8, dt);
    } else if (def.drone === 'guard') {
      let best = null, bd = 12;
      if (m.on && m.e >= 2) for (const e of enemies) { const d = Math.hypot(e.x - m.x, e.y - m.y); if (d < bd) { bd = d; best = e; } }
      if (best) {
        flyTo(m, best.x + (m.x > best.x ? 3 : -3), best.y - 2.5, 9, dt);
        m.cd = (m.cd || 0) - dt;
        if (m.cd <= 0) {
          const a = Math.atan2(best.y + best.h / 2 - m.dy, best.x + best.w / 2 - m.dx);
          shots.push({ draw: 'bolt', x: m.dx, y: m.dy, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26, g: 0, life: 1, dmg: 22, col: '#ff5a5a', fire: true });
          m.cd = 0.5; m.e -= 2; m.lz = false; sfx(1000, 0.05, 'sine', 0.04);
        }
      } else flyTo(m, hx, hy, 8, dt);
    } else { // 运输
      if (lift && lift.i === m.i) { m.dx = player.x + player.w / 2; m.dy = player.y - 0.5; }
      else flyTo(m, hx, hy, 10, dt);
    }
  }
}
function requestLift(m) {
  const p = player;
  if (Math.abs(p.x - m.x) > 3.5 || Math.abs(p.y - m.y) > 4) return toast('请站到停机坪旁边再出发');
  if (m.e < 30) return toast('电量不足（起飞需要 30）');
  let top = -1;
  for (let y = m.y - 1; y >= 0; y--) if (isSolid(m.x, y)) top = y;
  if (top >= 0) { // 通道被堵：联络采矿无人机
    const bases = Object.keys(machines).map(k => machines[k]).filter(b => b.t === DRONE_MINE && Math.hypot(b.x - m.x, b.y - m.y) <= 40)
      .sort((a, b) => Math.hypot(a.x - m.x, a.y - m.y) - Math.hypot(b.x - m.x, b.y - m.y));
    if (!bases.length) return toast('头顶被堵住了，附近 40 格内没有采矿无人机可以联络', 3500);
    const b = bases.find(q => q.e > 5) || bases[0];
    b.job = { x0: m.x, x1: m.x, y0: top, y1: m.y - 1 }; b.tg = null;
    closeMach();
    return toast('已联络采矿无人机开辟直上通道（约 ' + (m.y - top) + ' 格），打通后通知你', 4000);
  }
  let land = null;
  for (const dx of [1, -1, 2, -2]) {
    const gx = m.x + dx; if (gx < 1 || gx >= W - 1) continue;
    let gy = 0; while (gy < H && !isSolid(gx, gy)) gy++;
    if (gy < m.y - 2) { land = { x: gx, y: gy }; break; }
  }
  if (!land) return toast('上方没有可以降落的地面（你已经在地表了？）', 3000);
  m.e -= 30; lift = { i: m.i, x: m.x + 0.125, land, t: 0 }; closeMach(); toast('运输无人机起飞！', 1500); sfx(500, 0.3, 'triangle', 0.07);
}
function handleSelect() {
  const m = machines[selMode.i];
  if (!m) { selMode = null; selDrag = null; return; }
  if (ptr.down) {
    const [wx, wy] = ptrWorld(), tx = clamp(Math.floor(wx), 1, W - 2), ty = clamp(Math.floor(wy), 1, H - 2), N = 8 + 4 * m.r;
    if (!selDrag) selDrag = { sx: tx, sy: ty, ex: tx, ey: ty };
    selDrag.ex = clamp(tx, selDrag.sx - N + 1, selDrag.sx + N - 1); selDrag.ey = clamp(ty, selDrag.sy - N + 1, selDrag.sy + N - 1);
  } else if (selDrag) {
    const a = { x0: Math.min(selDrag.sx, selDrag.ex), x1: Math.max(selDrag.sx, selDrag.ex), y0: Math.min(selDrag.sy, selDrag.ey), y1: Math.max(selDrag.sy, selDrag.ey) };
    if (Math.abs((a.x0 + a.x1) / 2 - m.x) > 30 || Math.abs((a.y0 + a.y1) / 2 - m.y) > 30) toast('离基座太远了（要在 30 格以内）', 2500);
    else { m.area = a; m.on = true; m.tg = null; toast('已框选 ' + (a.x1 - a.x0 + 1) + '×' + (a.y1 - a.y0 + 1) + ' 区域，无人机出发！', 2500); sfx(880, 0.1, 'square', 0.06); }
    selDrag = null; selMode = null;
  }
}
function drawMachines(z, ox, oy, now) {
  const TS = T * z;
  for (const k in machines) {
    const m = machines[k], def = MACH[m.t], bx = m.x * TS - ox, by = m.y * TS - oy;
    if (bx < -40 * TS || bx > cw + 40 * TS || by < -40 * TS || by > ch + 40 * TS) continue;
    if (def.cap) { // 电量条
      ctx.fillStyle = '#10141c'; ctx.fillRect(bx + 2 * z, by - 3 * z, 12 * z, 2 * z);
      ctx.fillStyle = m.e > def.cap * 0.2 ? '#5fd65f' : '#ff5a5a'; ctx.fillRect(bx + 2 * z, by - 3 * z, Math.round(12 * z * clamp(m.e / def.cap, 0, 1)), 2 * z);
    }
    if (!def.drone || m.dx === undefined) continue;
    const ar = m.job || (m.on && m.area);
    if (ar && (def.drone === 'mine' || def.drone === 'ore')) {
      ctx.strokeStyle = def.col; ctx.globalAlpha = 0.55; ctx.lineWidth = z;
      ctx.strokeRect(ar.x0 * TS - ox + z / 2, ar.y0 * TS - oy + z / 2, (ar.x1 - ar.x0 + 1) * TS - z, (ar.y1 - ar.y0 + 1) * TS - z); ctx.globalAlpha = 1;
    }
    const dx = Math.floor(m.dx * TS) - ox, dy = Math.floor((m.dy + Math.sin(now * 4 + m.x) * 0.08) * TS) - oy;
    if (m.lz && m.tg) {
      ctx.strokeStyle = def.col; ctx.lineWidth = z; ctx.beginPath(); ctx.moveTo(dx, dy + 2 * z);
      ctx.lineTo((m.tg.x + 0.5) * TS - ox, (m.tg.y + 0.5) * TS - oy); ctx.stroke();
    }
    const rot = Math.floor(now * 20) % 2;
    ctx.fillStyle = '#3a3e48'; ctx.fillRect(dx - 5 * z, dy - 2 * z, 10 * z, 4 * z);
    ctx.fillStyle = '#9aa0aa'; ctx.fillRect(dx - 5 * z, dy - 2 * z, 10 * z, z);
    ctx.fillStyle = def.col; ctx.fillRect(dx - z, dy, 2 * z, 2 * z);
    ctx.fillStyle = '#5c5f66'; ctx.fillRect(dx - 6 * z, dy - 3 * z, z, z); ctx.fillRect(dx + 5 * z, dy - 3 * z, z, z);
    ctx.fillStyle = '#e8ecf2'; ctx.fillRect(dx - (rot ? 8 : 7) * z, dy - 4 * z, (rot ? 5 : 3) * z, z); ctx.fillRect(dx + (rot ? 3 : 4) * z, dy - 4 * z, (rot ? 5 : 3) * z, z);
  }
  if (selMode) {
    if (selDrag) {
      const x0 = Math.min(selDrag.sx, selDrag.ex), x1 = Math.max(selDrag.sx, selDrag.ex), y0 = Math.min(selDrag.sy, selDrag.ey), y1 = Math.max(selDrag.sy, selDrag.ey);
      ctx.fillStyle = 'rgba(255,225,74,.22)'; ctx.fillRect(x0 * TS - ox, y0 * TS - oy, (x1 - x0 + 1) * TS, (y1 - y0 + 1) * TS);
      ctx.strokeStyle = '#ffe14a'; ctx.lineWidth = z; ctx.strokeRect(x0 * TS - ox, y0 * TS - oy, (x1 - x0 + 1) * TS, (y1 - y0 + 1) * TS);
      ctx.font = `bold ${7 * z}px "Courier New",monospace`; ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
      ctx.fillText((x1 - x0 + 1) + '×' + (y1 - y0 + 1), (x0 + x1 + 1) / 2 * TS - ox, y0 * TS - oy - 3 * z);
    }
  }
}
// ── 机器面板 ──
function openMach(i) { machOpen = i; ptr.down = false; $('mach').classList.add('show'); renderMach(); sfx(700, 0.04, 'square', 0.04); }
function closeMach() { machOpen = -1; $('mach').classList.remove('show'); }
function renderMach() {
  const m = machines[machOpen]; if (!m) { closeMach(); return; }
  const def = MACH[m.t], box = $('machBox'); box.innerHTML = '';
  const add = (tag, txt, cls) => { const el = document.createElement(tag); el.textContent = txt; if (cls) el.className = cls; box.appendChild(el); return el; };
  const btn = (txt, fn, dis, cls) => { const b = add('button', txt, cls); b.disabled = !!dis; b.addEventListener('click', () => { fn(); if (machOpen >= 0) renderMach(); refreshHUD(); }); };
  add('h3', def.n);
  if (def.cap) add('div', '电量 ' + Math.floor(m.e) + ' / ' + def.cap, m.e > def.cap * 0.2 ? 'ok' : 'no');
  if (def.gen) add('div', '当前发电 ' + (m.out || 0).toFixed(1) + ' / 秒（上限 ' + def.gen + '）', m.out > 0 ? 'ok' : 'no');
  if (def.gen || def.bat) add('small', '自动给 ' + POWER_R + ' 格内的机器无线供电');
  else add('small', '需要 ' + POWER_R + ' 格内有发电设备或蓄电池');
  if (def.drone === 'mine' || def.drone === 'ore') {
    const N = 8 + 4 * m.r;
    add('div', '状态：' + (m.job ? '正在开辟运输通道' : m.on && m.area ? (m.e > 0.5 ? '作业中' : '没电了，等待充电') : '待机'));
    add('small', (m.area ? '区域 ' + (m.area.x1 - m.area.x0 + 1) + '×' + (m.area.y1 - m.area.y0 + 1) + ' · ' : '') + '框选上限 ' + N + '×' + N + ' · 范围模块 ' + m.r + '/2 · 速度模块 ' + m.s + '/3');
    btn('▣ 框选开采区域', () => { selMode = { i: m.i }; selDrag = null; closeMach(); toast('在画面上拖动手指框选（最大 ' + N + '×' + N + '）', 3500); });
    if (m.area) btn(m.on ? '⏸ 暂停' : '▶ 继续', () => { m.on = !m.on; }, false, 'alt');
    btn('安装范围模块（背包有 ' + inv.mod_range + '）', () => { inv.mod_range--; m.r++; }, inv.mod_range < 1 || m.r >= 2, 'alt');
    btn('安装速度模块（背包有 ' + inv.mod_speed + '）', () => { inv.mod_speed--; m.s++; }, inv.mod_speed < 1 || m.s >= 3, 'alt');
    add('small', def.drone === 'ore' ? '只采矿石，采到的东西直接传送进背包' : '采到的东西直接传送进背包');
  } else if (def.drone === 'guard') {
    add('small', '自动射击 12 格内的敌人，每发耗电 2');
    btn(m.on ? '⏸ 关闭' : '▶ 开启', () => { m.on = !m.on; }, false, 'alt');
  } else if (def.drone === 'trans') {
    add('small', '站在旁边点出发：沿正上方直线把你送回地表（耗电 30）。头顶有方块时，会联络 40 格内的采矿无人机开路。');
    btn('🚁 送我回地表', () => requestLift(m), !!lift);
  } else if (m.t === COALGEN) {
    add('div', '燃料还能烧 ' + Math.ceil(m.fuel || 0) + ' 秒', m.fuel > 0 ? 'ok' : 'no');
    btn('加 1 个煤（+20 秒，背包有 ' + inv.coal + '）', () => { inv.coal--; m.fuel = (m.fuel || 0) + 20; }, inv.coal < 1);
    btn('加 10 个煤', () => { inv.coal -= 10; m.fuel = (m.fuel || 0) + 200; }, inv.coal < 10, 'alt');
  } else if (m.t === REACTOR) {
    add('div', '当前燃料棒剩余 ' + Math.ceil(Math.max(0, m.fuel || 0)) + ' 秒 · 待用 ' + (m.rods || 0) + ' 根', m.fuel > 0 ? 'ok' : 'no');
    btn('装入燃料棒（背包有 ' + inv.fuel_rod + '）', () => { inv.fuel_rod--; m.rods = (m.rods || 0) + 1; }, inv.fuel_rod < 1);
    btn('取出钚 ×' + (m.pu || 0), () => { give('plutonium', m.pu); m.pu = 0; }, !(m.pu > 0), 'alt');
  } else if (m.t === CENTRIFUGE) {
    add('div', '铀矿 ' + (m.u || 0) + ' 个 · 进度 ' + Math.floor((m.p || 0) / 20 * 100) + '%', m.u >= 4 ? 'ok' : 'no');
    add('small', '每 4 个铀矿提炼 1 根燃料棒，需 20 秒、耗电 40');
    btn('放入 4 个铀矿（背包有 ' + inv.uranium + '）', () => { inv.uranium -= 4; m.u = (m.u || 0) + 4; }, inv.uranium < 4);
    btn('取出燃料棒 ×' + (m.rod || 0), () => { give('fuel_rod', m.rod); m.rod = 0; }, !(m.rod > 0), 'alt');
  } else if (m.t === SOLAR) {
    add('small', skyOpen(m) ? (daylight() > 0.1 ? '阳光充足' : '现在是晚上，不发电') : '被遮挡了：必须放在露天、头顶没有方块的地方', skyOpen(m) ? 'ok' : 'no');
  }
  btn('拆除回收', () => { breakTile(m.x, m.y); }, false, 'red');
  btn('关闭', closeMach, false, 'alt');
}

// ───────────────────────── 存档 ─────────────────────────
const SAVE_KEY = 'pixel_frontier_save_v2';
function saveGame() {
  if (!running) return;
  try {
    let s = '';
    for (let i = 0; i < tiles.length; i += 8192) s += String.fromCharCode.apply(null, tiles.subarray(i, i + 8192));
    localStorage.setItem(SAVE_KEY, JSON.stringify({ seed: worldSeed, tiles: btoa(s), inv, hotbar, sel, coins, dayT,
      hp: player.hp, maxHp: player.maxHp, x: player.x, y: player.y, spawnX, spawnY, buffs, machines }));
  } catch (e) { /* 存储不可用时忽略 */ }
}
function hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
function loadGame() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    const s = atob(d.tiles); if (s.length !== tiles.length) return false;
    genWorld(d.seed);
    for (let i = 0; i < s.length; i++) tiles[i] = s.charCodeAt(i) < NT ? s.charCodeAt(i) : AIR;
    resetInventory();
    ITEM_IDS.forEach(id => { inv[id] = d.inv[id] | 0; });
    hotbar = d.hotbar.slice(0, HOTBAR_N).map(id => ITEMS[id] ? id : null); while (hotbar.length < HOTBAR_N) hotbar.push(null);
    sel = clamp(d.sel | 0, 0, HOTBAR_N - 1); coins = d.coins | 0; dayT = +d.dayT || 0.04;
    player.maxHp = clamp(d.maxHp | 0, 100, 200); player.hp = clamp(+d.hp || 100, 1, player.maxHp);
    if (d.spawnX > 0 && d.spawnY > 0) { spawnX = d.spawnX | 0; spawnY = d.spawnY | 0; }
    for (const b in buffs) buffs[b] = (d.buffs && +d.buffs[b]) || 0;
    player.x = +d.x; player.y = +d.y; player.vx = player.vy = 0;
    if (!(player.x > 0 && player.y > -50) || boxHits(player.x, player.y, player.w, player.h)) respawn();
    machines = {}; selMode = null; selDrag = null; lift = null;
    if (d.machines) for (const k in d.machines) {
      const m = d.machines[k], i = +k;
      if (tiles[i] === m.t && MACH[m.t]) { m.i = i; m.x = i % W; m.y = (i / W) | 0; m.tg = null; machines[i] = m; }
    }
    lightVer++; return true;
  } catch (e) { return false; }
}
function newGame() {
  genWorld((Math.random() * 1e9) | 0); resetInventory();
  player.maxHp = 100; dayT = 0.04; enemies = []; shots = []; respawn(); player.inv = 0;
  for (const b in buffs) buffs[b] = 0;
  machines = {}; selMode = null; selDrag = null; lift = null;
}

// ───────────────────────── 渲染 ─────────────────────────
let canvas, ctx, stage, cw = 0, ch = 0, dpr = 1, zoom = 3, camX = 0, camY = 0, rotated = false;
let light = new Uint8Array(1), lx0 = 0, ly0 = 0, lw = 0, lh = 0, lightKey = '';
let mountains = [], stars = [], clouds = [];

function resize() {
  const iw = window.innerWidth, ih = window.innerHeight;
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  rotated = coarse && ih > iw; // 竖屏手机：整个舞台旋转 90°，强制横屏
  const sw = rotated ? ih : iw, sh = rotated ? iw : ih;
  stage.style.width = sw + 'px'; stage.style.height = sh + 'px';
  stage.classList.toggle('rot', rotated);
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = canvas.width = Math.max(1, Math.floor(sw * dpr));
  ch = canvas.height = Math.max(1, Math.floor(sh * dpr));
  zoom = Math.max(2, Math.round(Math.min(cw, ch) / 230));
  ctx.imageSmoothingEnabled = false; lightKey = '';
}
function toStage(ev) { return rotated ? [ev.clientY, window.innerWidth - ev.clientX] : [ev.clientX, ev.clientY]; }

function buildBackdrop() {
  const r = mulberry32(5), n = makeNoise(77);
  mountains = [['#5f7fb0', 46, 30, 0], ['#3f6a4a', 30, 20, 50]].map(([col, base, amp, off]) => {
    const c = mkCanvas(256, 96), g = c.getContext('2d'); g.fillStyle = col;
    for (let x = 0; x < 256; x++) {
      const a = x / 256 * Math.PI * 2;
      const h = Math.round(base + (n(Math.cos(a) * 2.2 + off, Math.sin(a) * 2.2) - 0.5) * amp * 2 + (n(Math.cos(a) * 8 + off, Math.sin(a) * 8) - 0.5) * 8);
      g.fillRect(x, 96 - h, 1, h);
    }
    return c;
  });
  stars = []; for (let k = 0; k < 70; k++) stars.push([r(), r() * 0.7, r() < 0.2 ? 2 : 1]);
  clouds = []; for (let k = 0; k < 6; k++) clouds.push({ x: r(), y: 0.05 + r() * 0.3, s: 0.6 + r() * 0.8, v: 0.003 + r() * 0.004 });
}

function computeLight(x0, y0, x1, y1, sky) {
  x0 = clamp(x0, 0, W - 1); x1 = clamp(x1, 0, W - 1); y0 = clamp(y0, 0, H - 1); y1 = clamp(y1, 0, H - 1);
  const ptx = Math.floor(player.x + player.w / 2), pty = Math.floor(player.y + 0.6);
  const pl = buffs.shine > 0 ? 14 : inv.helmet > 0 ? 12 : 8;
  const key = x0 + ',' + y0 + ',' + x1 + ',' + y1 + ',' + sky + ',' + ptx + ',' + pty + ',' + lightVer + ',' + pl;
  if (key === lightKey) return; // 没变化就不重算
  lightKey = key;
  lx0 = x0; ly0 = y0; lw = x1 - x0 + 1; lh = y1 - y0 + 1;
  if (light.length < lw * lh) light = new Uint8Array(lw * lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = (y + y0) * W + x + x0, t = tiles[i];
    light[y * lw + x] = EMIT[t] ? EMIT[t] : (!OPAQUE[t] && !walls[i]) ? sky : 0;
  }
  { // 玩家自带微光
    const px = ptx - x0, py = pty - y0;
    if (px >= 0 && px < lw && py >= 0 && py < lh && light[py * lw + px] < pl) light[py * lw + px] = pl;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const k = y * lw + x, dec = OPAQUE[tiles[(y + y0) * W + x + x0]] ? 2 : 1;
      let v = light[k];
      if (x > 0 && light[k - 1] - dec > v) v = light[k - 1] - dec;
      if (y > 0 && light[k - lw] - dec > v) v = light[k - lw] - dec;
      light[k] = v;
    }
    for (let y = lh - 1; y >= 0; y--) for (let x = lw - 1; x >= 0; x--) {
      const k = y * lw + x, dec = OPAQUE[tiles[(y + y0) * W + x + x0]] ? 2 : 1;
      let v = light[k];
      if (x < lw - 1 && light[k + 1] - dec > v) v = light[k + 1] - dec;
      if (y < lh - 1 && light[k + lw] - dec > v) v = light[k + lw] - dec;
      light[k] = v;
    }
  }
}

function mix(c1, c2, t) { return `rgb(${lerp(c1[0], c2[0], t) | 0},${lerp(c1[1], c2[1], t) | 0},${lerp(c1[2], c2[2], t) | 0})`; }

function drawSky(d, now) {
  const dusk = 1 - Math.abs(d * 2 - 1);
  const g = ctx.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, mix([8, 12, 40], [70, 160, 250], d));
  g.addColorStop(1, mix(d < 0.5 ? [30, 36, 84] : [190, 228, 255], [255, 150, 90], dusk * 0.8));
  ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
  const z = zoom;
  if (d < 0.9) { ctx.fillStyle = '#fff'; ctx.globalAlpha = (1 - d) * 0.9; for (const s of stars) ctx.fillRect((s[0] * cw | 0), (s[1] * ch | 0), s[2] * z, s[2] * z); ctx.globalAlpha = 1; }
  const a = dayT * Math.PI * 2, R = 7 * z;
  const body = (ang, c1, c2) => {
    const x = Math.round(cw / 2 - Math.cos(ang) * cw * 0.45), y = Math.round(ch * 0.6 - Math.sin(ang) * ch * 0.5);
    ctx.fillStyle = c2; ctx.fillRect(x - R, y - R + z, R * 2, R * 2 - 2 * z); ctx.fillRect(x - R + z, y - R, R * 2 - 2 * z, R * 2);
    ctx.fillStyle = c1; ctx.fillRect(x - R + z, y - R + z, R * 2 - 3 * z, R * 2 - 3 * z);
  };
  body(a, '#fff6b0', '#ffd84a'); body(a + Math.PI, '#f4f6ff', '#b8c0e0');
  ctx.fillStyle = mix([70, 78, 120], [255, 255, 255], d);
  for (const c of clouds) {
    const u = Math.round(4 * z * c.s), x = Math.round(((c.x + now * c.v) % 1.3 - 0.15) * cw), y = Math.round(c.y * ch);
    ctx.fillRect(x, y, u * 6, u * 2); ctx.fillRect(x + u, y - u, u * 3, u); ctx.fillRect(x + u * 3, y - u * 2, u * 2, u * 2); ctx.fillRect(x - u, y + u, u * 8, u);
  }
  mountains.forEach((m, k) => {
    const par = 0.12 + k * 0.14, s = z * (k ? 1.5 : 2), mw = 256 * s, mh = 96 * s;
    const y = Math.round((40 * T - camY) * z * (0.25 + k * 0.2) + ch * 0.5 - mh + (k ? 46 * z : 22 * z));
    let x = -((camX * z * par) % mw); if (x > 0) x -= mw;
    for (; x < cw; x += mw) ctx.drawImage(m, 0, 0, 256, 96, Math.round(x), y, Math.ceil(mw), mh);
    ctx.fillStyle = k ? '#3f6a4a' : '#5f7fb0'; ctx.fillRect(0, y + mh - 1, cw, ch);
  });
  ctx.fillStyle = `rgba(6,8,30,${(1 - d) * 0.6})`; ctx.fillRect(0, Math.round(ch * 0.2), cw, ch);
}

function drawPlayer(sx, sy, z) {
  const p = player, f = p.face;
  if (p.inv > 0 && p.inv < 0.8 && Math.floor(p.inv * 20) % 2) return;
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(sx + (f > 0 ? x : 12 - x - w) * z, sy + y * z, w * z, h * z); };
  const ph = p.walk % 2, air = !p.onG;
  const la = air ? 2 : ph < 1 ? Math.round(Math.sin(ph * Math.PI) * 3) : 0;
  const lb = air ? 0 : ph >= 1 ? Math.round(Math.sin((ph - 1) * Math.PI) * 3) : 0;
  R(2, 19, 4, 7 - la, '#34508c'); R(2, 26 - la, 4, 2, '#3a2a1a');
  R(6, 19, 4, 7 - lb, '#2a4070'); R(6, 26 - lb, 4, 2, '#2e2014');
  const ba = bestArmor(), ar = ba ? (ITEMS[ba].c || ARC[ba]) : ['#2e8b57', '#1f6b40'];
  R(2, 10, 8, 9, ar[0]); R(2, 17, 8, 2, ar[1]); R(1, 10, 2, 7, ar[1]);
  R(2, 2, 8, 8, '#f0c090'); R(2, 0, 9, 3, '#5a3418'); R(1, 1, 2, 6, '#5a3418'); R(2, 3, 2, 2, '#5a3418');
  R(7, 5, 2, 2, '#1a1208'); R(8, 5, 1, 1, '#fff'); R(6, 8, 3, 1, '#c08860');
  const id = hotbar[sel];
  if (p.swing > 0) {
    const t = 1 - clamp(p.swing / 0.28, 0, 1), ang = (-1.9 + t * 2.6) * f;
    ctx.save(); ctx.translate(sx + (f > 0 ? 7 : 5) * z, sy + 12 * z); ctx.rotate(ang);
    ctx.fillStyle = '#f0c090'; ctx.fillRect(-1.5 * z, -8 * z, 3 * z, 8 * z);
    if (id && inv[id] > 0) {
      const [img, ix] = itemIcon(id);
      if (f < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, ix, 0, T, T, -3 * z, -22 * z, T * z, T * z);
    }
    ctx.restore();
  } else {
    R(8, 10, 3, 8, '#f0c090'); R(8, 10, 3, 3, ar[0]);
    if (id && inv[id] > 0 && ITEMS[id].k !== 'pick' && ITEMS[id].k !== 'sword') { // 手持物品
      const [img, ix] = itemIcon(id);
      ctx.drawImage(img, ix, 0, T, T, sx + (f > 0 ? 8 : -4) * z, sy + 12 * z, 8 * z, 8 * z);
    }
  }
}

function drawSlime(e, z, ox, oy) {
  const sq = clamp(e.vy * 0.03, -0.25, 0.25), wpx = Math.round(14 * (1 - sq)), hpx = Math.round(11 * (1 + sq));
  const bx = Math.floor((e.x + e.w / 2) * T * z) - ox - Math.floor(wpx * z / 2);
  const by = Math.floor((e.y + e.h) * T * z) - oy - hpx * z;
  const c = e.hit > 0 ? ['#fff', '#fff', '#fff'] : e.col;
  ctx.fillStyle = c[2]; ctx.fillRect(bx + 2 * z, by, (wpx - 4) * z, hpx * z); ctx.fillRect(bx, by + 3 * z, wpx * z, (hpx - 3) * z);
  ctx.fillStyle = c[0]; ctx.fillRect(bx + 3 * z, by + z, (wpx - 6) * z, (hpx - 2) * z); ctx.fillRect(bx + z, by + 4 * z, (wpx - 2) * z, (hpx - 5) * z);
  ctx.fillStyle = c[1]; ctx.fillRect(bx + 3 * z, by + 2 * z, 3 * z, 2 * z);
  ctx.fillStyle = '#10200f'; const ex = player.x > e.x ? 1 : 0;
  ctx.fillRect(bx + (4 + ex) * z, by + 5 * z, 2 * z, 2 * z); ctx.fillRect(bx + (wpx - 7 + ex) * z, by + 5 * z, 2 * z, 2 * z);
  if (e.hp < e.max) {
    ctx.fillStyle = '#401018'; ctx.fillRect(bx, by - 4 * z, wpx * z, 2 * z);
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(bx, by - 4 * z, Math.round(wpx * z * Math.max(0, e.hp) / e.max), 2 * z);
  }
}

function drawMob(e, z, ox, oy) {
  const TS = T * z, sx = Math.floor(e.x * TS) - ox, sy = Math.floor(e.y * TS) - oy, hit = e.hit > 0;
  const R = (x, y, w, h, c) => { ctx.fillStyle = hit ? '#fff' : c; ctx.fillRect(sx + x * z, sy + y * z, w * z, h * z); };
  let bw = 12;
  if (e.type === 'bat') {
    e.fl = (e.fl || 0) + 1; const up = Math.floor(e.fl / 5) % 2;
    R(0, up ? 0 : 3, 5, 3, '#2e2438'); R(8, up ? 0 : 3, 5, 3, '#2e2438'); R(4, 2, 5, 5, '#4a3a5a'); R(5, 1, 1, 1, '#4a3a5a'); R(7, 1, 1, 1, '#4a3a5a');
    R(5, 3, 1, 1, '#ff5a5a'); R(7, 3, 1, 1, '#ff5a5a'); bw = 13;
  } else {
    const f = player.x > e.x ? 1 : -1, st = Math.floor(e.x * 2) % 2;
    R(2, 19, 4, 9 - st, '#3a3a5a'); R(6, 19, 4, 8 + st, '#2e2e4a'); R(2, 10, 8, 9, '#5a4a7a'); R(2, 17, 8, 2, '#3e3258');
    R(2, 2, 8, 8, '#6a9a5a'); R(2, 0, 8, 3, '#2a3a2a'); R(f > 0 ? 7 : 3, 5, 2, 2, '#c81e1e'); R(4, 8, 4, 1, '#3a5a2a');
    R(f > 0 ? 8 : -2, 11, 6, 3, '#6a9a5a');
  }
  if (e.hp < e.max) {
    ctx.fillStyle = '#401018'; ctx.fillRect(sx, sy - 4 * z, bw * z, 2 * z);
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(sx, sy - 4 * z, Math.round(bw * z * Math.max(0, e.hp) / e.max), 2 * z);
  }
}

function render(now) {
  const z = zoom, TS = T * z, d = daylight();
  const vw = cw / z, vh = ch / z;
  camX = clamp((player.x + player.w / 2) * T - vw / 2, 0, Math.max(0, W * T - vw));
  camY = clamp((player.y + player.h / 2) * T - vh * 0.5, -vh, Math.max(0, H * T - vh));
  if (shake > 0) { camX += (Math.random() - 0.5) * shake * 20; camY += (Math.random() - 0.5) * shake * 20; }
  const ox = Math.floor(camX * z), oy = Math.floor(camY * z);
  const x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(W - 1, Math.floor((camX + vw) / T));
  const y0 = Math.max(0, Math.floor(camY / T)), y1 = Math.min(H - 1, Math.floor((camY + vh) / T));

  if (y0 < 70) drawSky(d, now); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, cw, ch); }
  computeLight(x0 - 10, y0 - 10, x1 + 10, y1 + 10, Math.round(6 + 9 * d));

  for (let y = y0; y <= y1; y++) {
    const sy = y * TS - oy; let li = (y - ly0) * lw + (x0 - lx0), i = y * W + x0;
    for (let x = x0; x <= x1; x++, li++, i++) {
      const t = tiles[i], w = walls[i];
      if (t === AIR && !w) continue;
      const sx = x * TS - ox;
      if (light[li] === 0) { ctx.fillStyle = '#000'; ctx.fillRect(sx, sy, TS, TS); continue; }
      if (w && !OPAQUE[t]) ctx.drawImage(atlas, w * T, T, T, T, sx, sy, TS, TS);
      if (t !== AIR) ctx.drawImage(atlas, t * T, 0, T, T, sx, sy, TS, TS);
    }
  }
  if (mine.x >= 0 && mine.p > 0) ctx.drawImage(atlas, Math.min(3, Math.floor(mine.p * 4)) * T, 2 * T, T, T, mine.x * TS - ox, mine.y * TS - oy, TS, TS);

  for (const e of enemies) (e.type ? drawMob : drawSlime)(e, z, ox, oy);
  for (const s of shots) {
    const sx = Math.floor(s.x * TS) - ox, sy = Math.floor(s.y * TS) - oy;
    if (s.draw === 'arrow') {
      const a = Math.atan2(s.vy, s.vx);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
      ctx.fillStyle = '#8a5a34'; ctx.fillRect(-6 * z, -z / 2, 9 * z, z);
      ctx.fillStyle = '#e0e4ea'; ctx.fillRect(3 * z, -z, 2 * z, 2 * z); ctx.fillStyle = '#fff'; ctx.fillRect(-7 * z, -z, 2 * z, 2 * z);
      ctx.restore();
    } else if (s.draw === 'bolt') {
      ctx.fillStyle = s.col; ctx.fillRect(sx - 2 * z, sy - 2 * z, 4 * z, 4 * z);
      ctx.fillStyle = '#fff'; ctx.fillRect(sx - z, sy - z, 2 * z, 2 * z);
    } else if (!s.bomb) {
      const [img, ix] = itemIcon(s.icon);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(s.g || s.back ? now * 22 * (s.vx < 0 ? -1 : 1) : Math.atan2(s.vy, s.vx) + Math.PI / 4);
      ctx.drawImage(img, ix, 0, T, T, -6 * z, -6 * z, 12 * z, 12 * z); ctx.restore();
    } else {
      const blink = s.life < 0.6 && Math.floor(s.life * 12) % 2, [img, ix] = itemIcon(s.icon);
      ctx.drawImage(img, ix, 0, T, T, sx - 6 * z, sy - 7 * z, 12 * z, 12 * z);
      if (blink) { ctx.fillStyle = 'rgba(255,80,40,.6)'; ctx.fillRect(sx - 4 * z, sy - 3 * z, 8 * z, 7 * z); }
    }
  }
  drawPlayer(Math.floor(player.x * TS) - ox - Math.round(2 * z), Math.floor((player.y + player.h) * TS) - oy - 28 * z, z);
  for (const q of parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.floor(q.x * TS) - ox, Math.floor(q.y * TS) - oy, 2 * z, 2 * z); }

  // 光照遮罩
  let lastA = -1;
  for (let y = y0; y <= y1; y++) {
    let li = (y - ly0) * lw + (x0 - lx0), i = y * W + x0;
    for (let x = x0; x <= x1; x++, li++, i++) {
      const L = light[li];
      if (L >= 15 || L === 0 || (tiles[i] === AIR && !walls[i])) continue;
      if (L !== lastA) { ctx.fillStyle = `rgba(0,0,8,${(1 - L / 15).toFixed(3)})`; lastA = L; }
      ctx.fillRect(x * TS - ox, y * TS - oy, TS, TS);
    }
  }
  // 火把 / 熔炉暖光
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = tiles[y * W + x];
    const gl = GLOW[t]; if (!gl) continue;
    const fl = (0.10 + Math.sin(now * 9 + x * 3) * 0.03) * (walls[y * W + x] ? 1 : 1 - d * 0.9); // 白天地表不泛光
    ctx.fillStyle = `rgba(${gl},${fl})`; ctx.fillRect((x - 2) * TS - ox, (y - 2) * TS - oy, TS * 5, TS * 5);
    ctx.fillRect((x - 1) * TS - ox, (y - 1) * TS - oy, TS * 3, TS * 3);
  }

  drawMachines(z, ox, oy, now);
  if (ptr.down && !selMode) {
    const [wx, wy] = ptrWorld(), tx = Math.floor(wx), ty = Math.floor(wy);
    const ok = Math.hypot(tx + 0.5 - player.x - player.w / 2, ty + 0.5 - player.y - player.h / 2) <= 5.5;
    ctx.strokeStyle = ok ? 'rgba(255,255,255,.85)' : 'rgba(255,80,80,.7)'; ctx.lineWidth = z;
    ctx.strokeRect(tx * TS - ox + z / 2, ty * TS - oy + z / 2, TS - z, TS - z);
  } else if (mine.x >= 0) { // 动作键自动选中的方块
    ctx.strokeStyle = 'rgba(255,225,74,.9)'; ctx.lineWidth = z;
    ctx.strokeRect(mine.x * TS - ox + z / 2, mine.y * TS - oy + z / 2, TS - z, TS - z);
  }
  ctx.font = `bold ${7 * z}px "Courier New",monospace`; ctx.textAlign = 'center';
  for (const q of texts) {
    const sx = Math.floor(q.x * TS) - ox, sy = Math.floor(q.y * TS) - oy;
    ctx.globalAlpha = Math.min(1, q.life * 2.5);
    ctx.fillStyle = '#000'; ctx.fillText(q.text, sx + z, sy + z); ctx.fillStyle = q.col; ctx.fillText(q.text, sx, sy);
  }
  ctx.globalAlpha = 1;
}

// ───────────────────────── 音效 ─────────────────────────
let actx = null;
function sfx(freq, dur, type, vol) {
  if (!actx) return;
  try {
    const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime;
    o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(actx.destination); o.start(t); o.stop(t + dur);
  } catch (e) { /* 忽略 */ }
}

// ───────────────────────── HUD / 背包界面 ─────────────────────────
const $ = id => document.getElementById(id);
let toastTimer = 0, bagOpen = false, bagTab = 'inv', bagSel = null, lastClock = '', bagPage = 0;
const PAGE = 32;

function iconCanvas(id) {
  const c = mkCanvas(T, T); const [img, ix] = itemIcon(id);
  c.getContext('2d').drawImage(img, ix, 0, T, T, 0, 0, T, T); return c;
}
function mkSlot(id, count, cls) {
  const el = document.createElement('div'); el.className = 'slot px' + (cls || '');
  if (id) el.appendChild(iconCanvas(id));
  if (count !== '' && count !== undefined) { const n = document.createElement('span'); n.textContent = count; el.appendChild(n); }
  return el;
}
function countLabel(id) { const k = ITEMS[id].k; return (k === 'pick' || k === 'sword' || k === 'bow' || k === 'staff' || k === 'armor' || k === 'acc' || inv[id] === 1) ? '' : inv[id]; }

function refreshHUD() {
  hudDirty = false; hpDirty = true;
  const bar = $('hotbar'); bar.innerHTML = '';
  hotbar.forEach((id, k) => {
    let label = id ? countLabel(id) : '';
    if (id && ITEMS[id].k === 'bow') label = inv.arrow + inv.arrow_fire + inv.arrow_bone;
    const el = mkSlot(id, label, (k === sel ? ' sel' : '') + (id && inv[id] <= 0 ? ' empty' : ''));
    el.addEventListener('pointerdown', ev => { ev.preventDefault(); ev.stopPropagation(); sel = k; hudDirty = true; sfx(700, 0.03, 'square', 0.03); });
    bar.appendChild(el);
  });
  $('coins').textContent = '◎' + coins;
  if (bagOpen) renderBag();
}
function refreshHP() {
  hpDirty = false;
  const hp = Math.max(0, Math.ceil(player.hp));
  $('hpfill').style.width = (hp / player.maxHp * 100) + '%'; $('hptext').textContent = hp + '/' + player.maxHp;
}
function toast(msg, ms) {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2600);
}
function canCraft(rc) { return Object.keys(rc.cost).every(k => inv[k] >= rc.cost[k]) && (!rc.st || nearStation(rc.st)); }
function craft(rc) {
  if (!canCraft(rc)) return;
  const [oid, n] = rc.out;
  Object.keys(rc.cost).forEach(k => {
    inv[k] -= rc.cost[k];
    if (inv[k] <= 0 && ITEMS[k].k === ITEMS[oid].k && ITEMS[k].k !== 'block' && ITEMS[k].k !== 'res') { // 升级：快捷栏里的旧装备换成新的
      const h = hotbar.indexOf(k); if (h >= 0 && hotbar.indexOf(oid) < 0) hotbar[h] = oid;
    }
  });
  give(oid, n); sfx(880, 0.1, 'square', 0.06);
}
function setTab(t) { bagTab = t; bagSel = null; bagPage = 0; renderBag(); }
function toggleBag(show) { bagOpen = show; $('bag').classList.toggle('show', show); if (show) renderBag(); else ptr.down = false; }

function renderBag() {
  $('tabInv').className = bagTab === 'inv' ? 'on' : ''; $('tabCraft').className = bagTab === 'craft' ? 'on' : ''; $('tabShop').className = bagTab === 'shop' ? 'on' : '';
  const sts = [BENCH, FURNACE, ANVIL, CAMPFIRE].filter(nearStation).map(s => ST_NAME[s]);
  $('stations').textContent = sts.length ? '附近: ' + sts.join(' ') : '';
  const grid = $('grid'), det = $('detail'); grid.innerHTML = ''; det.innerHTML = '';
  const head = (id, title) => {
    const h = document.createElement('div'); h.className = 'hd'; h.appendChild(iconCanvas(id));
    h.appendChild(document.createTextNode(title)); det.appendChild(h);
  };
  const line = (txt, cls) => { const s = document.createElement('small'); s.textContent = txt; if (cls) s.className = cls; det.appendChild(s); };
  const button = (txt, fn, cls, dis) => {
    const b = document.createElement('button'); b.textContent = txt; if (cls) b.className = cls; b.disabled = !!dis;
    b.addEventListener('click', fn); det.appendChild(b);
  };
  const pager = total => { // 翻页条
    const pages = Math.max(1, Math.ceil(total / PAGE)); bagPage = clamp(bagPage, 0, pages - 1);
    const bar = $('pager'); bar.innerHTML = '';
    const mk = (txt, d) => { const b = document.createElement('button'); b.textContent = txt; b.disabled = bagPage + d < 0 || bagPage + d >= pages;
      b.addEventListener('click', () => { bagPage += d; renderBag(); }); bar.appendChild(b); };
    mk('◀', -1); bar.appendChild(document.createTextNode(' ' + (bagPage + 1) + ' / ' + pages + ' 页（共 ' + total + '）')); mk('▶', 1);
  };
  if (bagTab === 'inv') {
    const own = ITEM_IDS.filter(id => inv[id] > 0);
    if (bagSel === null || !(inv[bagSel] > 0)) bagSel = own[0] || null;
    pager(own.length);
    own.slice(bagPage * PAGE, bagPage * PAGE + PAGE).forEach(id => {
      const el = mkSlot(id, countLabel(id), id === bagSel ? ' sel' : '');
      el.addEventListener('click', () => { bagSel = id; renderBag(); });
      grid.appendChild(el);
    });
    if (!bagSel) { line('背包是空的'); return; }
    const it = ITEMS[bagSel], id = bagSel;
    head(id, it.n + (countLabel(id) !== '' ? ' ×' + inv[id] : ''));
    line(it.d);
    if (SELL[id]) {
      button('卖出 1 个（+' + SELL[id] + '◎）', () => { inv[id]--; coins += SELL[id]; sfx(990, 0.05, 'square', 0.05); refreshHUD(); }, 'alt');
      if (inv[id] > 1) button('全部卖出（+' + SELL[id] * inv[id] + '◎）', () => { coins += SELL[id] * inv[id]; inv[id] = 0; sfx(990, 0.1, 'square', 0.05); refreshHUD(); }, 'alt');
    }
    if (it.k === 'use') button('使用', () => { useItem(id); refreshHUD(); });
    if (it.k === 'acc' || it.k === 'armor') line('拥有即自动生效', 'ok');
    if (!PASSIVE(it.k)) {
      const at = hotbar.indexOf(id);
      line(at >= 0 ? '已在快捷栏第 ' + (at + 1) + ' 格' : '未放入快捷栏');
      button('放到快捷栏第 ' + (sel + 1) + ' 格（当前选中）', () => {
        const old = hotbar.indexOf(id); if (old >= 0) hotbar[old] = hotbar[sel];
        hotbar[sel] = id; refreshHUD();
      }, 'alt', at === sel);
    }
  } else if (bagTab === 'craft') {
    if (typeof bagSel !== 'number') bagSel = 0;
    const can = RECIPES.map(canCraft); // 能做的排在前面
    const order = RECIPES.map((_, k) => k).sort((a, b) => (can[b] - can[a]) || a - b);
    pager(order.length);
    order.slice(bagPage * PAGE, bagPage * PAGE + PAGE).forEach(k => {
      const rc = RECIPES[k];
      const el = mkSlot(rc.out[0], rc.out[1] > 1 ? rc.out[1] : '', (k === bagSel ? ' sel' : '') + (can[k] ? '' : ' dim'));
      el.addEventListener('click', () => { bagSel = k; renderBag(); });
      grid.appendChild(el);
    });
    const rc = RECIPES[bagSel], it = ITEMS[rc.out[0]];
    head(rc.out[0], it.n + (rc.out[1] > 1 ? ' ×' + rc.out[1] : ''));
    line(it.d); line('已拥有 ' + inv[rc.out[0]]);
    Object.keys(rc.cost).forEach(k => line(ITEMS[k].n + ' ' + inv[k] + '/' + rc.cost[k], inv[k] >= rc.cost[k] ? 'ok' : 'no'));
    if (rc.st) line('需要靠近：' + ST_NAME[rc.st], nearStation(rc.st) ? 'ok' : 'no');
    button('制作', () => { craft(rc); refreshHUD(); }, '', !canCraft(rc));
  } else { // 商店
    if (typeof bagSel !== 'number' || bagSel >= SHOP.length) bagSel = 5;
    pager(SHOP.length);
    SHOP.slice(bagPage * PAGE, bagPage * PAGE + PAGE).forEach((g, k0) => {
      const k = k0 + bagPage * PAGE;
      const el = mkSlot(g[0], g[1] > 1 ? g[1] : '', (k === bagSel ? ' sel' : '') + (coins >= g[2] ? '' : ' dim'));
      el.addEventListener('click', () => { bagSel = k; renderBag(); });
      grid.appendChild(el);
    });
    const g = SHOP[bagSel], it = ITEMS[g[0]];
    head(g[0], it.n + (g[1] > 1 ? ' ×' + g[1] : ''));
    line(it.d); line('已拥有 ' + inv[g[0]]);
    line('价格 ' + g[2] + '◎ · 你有 ' + coins + '◎', coins >= g[2] ? 'ok' : 'no');
    button('购买', () => { if (coins < g[2]) return; coins -= g[2]; give(g[0], g[1]); sfx(990, 0.08, 'square', 0.06); refreshHUD(); }, '', coins < g[2]);
    line('金币来源：打怪、开宝箱，或在「背包」页卖出矿石和宝石');
  }
}

function bindInput() {
  const hold = (id, key) => {
    const el = $(id);
    const set = v => ev => { ev.preventDefault(); input[key] = v; el.classList.toggle('on', v); if (v && el.setPointerCapture) { try { el.setPointerCapture(ev.pointerId); } catch (e) { /* */ } } };
    el.addEventListener('pointerdown', set(true));
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, set(false)));
  };
  hold('jump', 'j'); hold('act', 'act');
  $('act').addEventListener('pointerdown', () => { input.actFresh = true; });
  { // 虚拟摇杆：左右移动，上推跳跃 / 爬绳，下拉穿过平台 / 向下挖
    const joy = $('joy'), knob = $('knob'); let jid = -1, c = [0, 0];
    const R = 52;
    const mv = ev => {
      const [x, y] = toStage(ev); let dx = x - c[0], dy = y - c[1];
      const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
      knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      const nx = dx / R, ny = dy / R;
      input.mx = Math.abs(nx) < 0.22 ? 0 : Math.sign(nx) * Math.min(1, (Math.abs(nx) - 0.22) / 0.5 + 0.3);
      input.ju = ny < -0.55; input.jd = ny > 0.6;
    };
    const up = ev => { if (ev.pointerId !== jid) return; jid = -1; input.mx = 0; input.ju = input.jd = false; knob.style.transform = ''; joy.classList.remove('on'); };
    joy.addEventListener('pointerdown', ev => {
      ev.preventDefault(); jid = ev.pointerId; joy.classList.add('on');
      const b = joy.getBoundingClientRect(); c = toStage({ clientX: b.left + b.width / 2, clientY: b.top + b.height / 2 });
      try { joy.setPointerCapture(jid); } catch (e) { /* */ }
      mv(ev);
    });
    joy.addEventListener('pointermove', ev => { if (ev.pointerId === jid) mv(ev); });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => joy.addEventListener(n, up));
  }

  canvas.addEventListener('pointerdown', ev => { ev.preventDefault(); const [x, y] = toStage(ev); ptr.down = true; ptr.fresh = true; ptr.id = ev.pointerId; ptr.x = x; ptr.y = y; ptr.t0 = Date.now(); });
  canvas.addEventListener('pointermove', ev => { if (ev.pointerId === ptr.id) { const [x, y] = toStage(ev); ptr.x = x; ptr.y = y; } });
  const end = ev => {
    if (ev.pointerId !== ptr.id) return;
    ptr.down = false; ptr.id = -1;
    if (ev.type === 'pointerup' && running && !selMode && !selDrag && Date.now() - ptr.t0 < 350) { // 轻点机器：打开面板
      const [wx, wy] = ptrWorld(), i = Math.floor(wy) * W + Math.floor(wx);
      if (machines[i] && Math.hypot(wx - player.x, wy - player.y) < 8) openMach(i);
    }
  };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => canvas.addEventListener(n, end));

  $('bagBtn').addEventListener('click', () => toggleBag(true));
  $('closeBag').addEventListener('click', () => toggleBag(false));
  $('bag').addEventListener('click', ev => { if (ev.target === $('bag')) toggleBag(false); });
  $('tabInv').addEventListener('click', () => setTab('inv'));
  $('tabCraft').addEventListener('click', () => setTab('craft'));
  $('tabShop').addEventListener('click', () => setTab('shop'));
  $('mach').addEventListener('click', ev => { if (ev.target === $('mach')) closeMach(); });

  const km = { KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', Space: 'j', KeyW: 'j', ArrowUp: 'j', KeyS: 'd', ArrowDown: 'd', KeyF: 'act' };
  window.addEventListener('keydown', ev => {
    if (km[ev.code]) { if (ev.code === 'KeyF' && !ev.repeat) input.actFresh = true; input[km[ev.code]] = true; ev.preventDefault(); }
    else if (ev.code === 'KeyE' || ev.code === 'Escape') { if (running) toggleBag(ev.code === 'KeyE' && !bagOpen); }
    else if (/^Digit[1-8]$/.test(ev.code)) { sel = +ev.code[5] - 1; hudDirty = true; }
  });
  window.addEventListener('keyup', ev => { if (km[ev.code]) input[km[ev.code]] = false; });
  window.addEventListener('blur', () => { input.l = input.r = input.j = input.d = input.act = input.ju = input.jd = false; input.mx = 0; ptr.down = false; });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 250));
  window.addEventListener('pagehide', saveGame);
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
  ['contextmenu', 'gesturestart', 'dblclick'].forEach(n => document.addEventListener(n, ev => ev.preventDefault()));
  document.addEventListener('touchmove', ev => { if (rotated || !ev.target.closest || !ev.target.closest('#bagBox')) ev.preventDefault(); }, { passive: false });
}

// ───────────────────────── 主循环 ─────────────────────────
let last = 0;
function frame(ms) {
  const now = ms / 1000, dt = Math.min(0.1, now - last); last = now;
  if (running && !bagOpen) {
    timeAcc += dt;
    while (timeAcc >= 1 / 60) { update(1 / 60); timeAcc -= 1 / 60; }
    const c = daylight() > 0.4 ? '☀' : '☾';
    if (c !== lastClock) { lastClock = c; $('clock').textContent = c; }
  }
  render(now);
  if (hudDirty) refreshHUD();
  if (hpDirty) refreshHP();
  requestAnimationFrame(frame);
}

function startGame(cont) {
  if (!cont || !loadGame()) newGame();
  $('title').style.display = 'none'; running = true; hudDirty = true;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  // 尝试全屏 + 锁定横屏（安卓浏览器支持；不支持时由 CSS 旋转兜底）
  try {
    const el = document.documentElement, rq = el.requestFullscreen || el.webkitRequestFullscreen;
    if (rq && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
      Promise.resolve(rq.call(el)).then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
        .catch(() => {}).then(() => setTimeout(resize, 300));
    }
  } catch (e) { /* */ }
  toast(cont ? '欢迎回来！进度每 20 秒自动保存' : '摇杆移动 · 按住 ⚒ 自动挖面前的方块 · 也可以直接点方块 · 🎒 背包里合成', 4500);
}

function boot() {
  canvas = $('game'); stage = $('stage'); ctx = canvas.getContext('2d');
  genWorld((Math.random() * 1e9) | 0);
  buildArt(); buildBackdrop(); resize(); respawn(); player.inv = 0;
  bindInput(); refreshHUD();
  if (hasSave()) { $('contBtn').style.display = ''; $('newBtn').className = 'alt'; }
  $('contBtn').addEventListener('click', () => startGame(true));
  $('newBtn').addEventListener('click', () => startGame(false));
  requestAnimationFrame(frame);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { genWorld, newGame, tiles, walls, surf, player, respawn, update, render, boot, input, ptr, inv, breakTile, tryPlace, explode, craft, useItem, give,
    getT, W, H, T, ITEMS, RECIPES, TILE, buffs, SHOP, SELL, MACH, powerTick, droneUpdate, requestLift, handleSelect, openMach, renderMach, mach: () => machines, lift: () => lift, selStart: i => { selMode = { i }; selDrag = null; }, addCoins: n => { coins += n; }, autoTarget, growTree, slowTick, saveGame, loadGame, renderBag, refreshHUD,
    set: o => { if (o.sel !== undefined) sel = o.sel; if (o.hotbar) hotbar = o.hotbar; if (o.dayT !== undefined) dayT = o.dayT; if (o.running !== undefined) running = o.running; if (o.tab) bagTab = o.tab; },
    state: () => ({ enemies, shots, spawnX, spawnY, hotbar, sel, coins, icons, atlas, ICON }) };
} else {
  boot();
}
