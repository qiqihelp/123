'use strict';
/* 像素边境 Pixel Frontier —— 泰拉瑞亚风格沙盒 Demo
 * 纯 Canvas 2D，无依赖。所有方块 / 角色 / 物品贴图都在运行时用代码逐像素生成。 */

// ───────────────────────── 基础 ─────────────────────────
const T = 16, W = 400, H = 140;
const AIR = 0, DIRT = 1, GRASS = 2, STONE = 3, LOG = 4, LEAVES = 5, COPPER = 6, IRON = 7, GOLD = 8,
      SAND = 9, PLANK = 10, TORCH = 11, BEDROCK = 12, COAL = 13, DIAMOND = 14, GLASS = 15, BRICK = 16,
      PLATFORM = 17, BENCH = 18, FURNACE = 19, CHEST = 20, MUSHROOM = 21, FLOWER = 22, CRYSTAL = 23, NT = 24;

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
const SOLID = TILE.map(t => t.solid);
const OPAQUE = TILE.map((t, i) => (t.solid && i !== GLASS) ? 1 : 0);
const EMIT = new Uint8Array(NT); EMIT[TORCH] = 15; EMIT[FURNACE] = 11; EMIT[CRYSTAL] = 9;
const NEEDS_FLOOR = new Uint8Array(NT);
[BENCH, FURNACE, CHEST, MUSHROOM, FLOWER, CRYSTAL].forEach(t => { NEEDS_FLOOR[t] = 1; });

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
        if (Math.abs(c - 0.5) < 0.035 + Math.min(d, 40) * 0.0006) t = AIR;
        if (d > 18 && n3(x / 26, y / 18) > 0.74) t = AIR;
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
    } else if (v < 0.26) tiles[(h - 1) * W + x] = FLOWER;
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
  deco(CHEST, 30, 8); deco(CRYSTAL, 16, 22); deco(MUSHROOM, 50, 6);
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
  bomb:   { n: '炸弹', k: 'throw', d: '投掷后爆炸，炸开一片方块。小心自己！' },
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
};
const ITEM_IDS = Object.keys(ITEMS);
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
  { out: ['pick_gold', 1], cost: { pick_iron: 1, bar_gold: 6 }, st: BENCH },
  { out: ['pick_diamond', 1], cost: { pick_gold: 1, diamond: 5 }, st: BENCH },
  { out: ['sword_copper', 1], cost: { sword_wood: 1, bar_copper: 3 }, st: BENCH },
  { out: ['sword_iron', 1], cost: { sword_copper: 1, bar_iron: 4 }, st: BENCH },
  { out: ['sword_gold', 1], cost: { sword_iron: 1, bar_gold: 5 }, st: BENCH },
  { out: ['sword_diamond', 1], cost: { sword_gold: 1, diamond: 4 }, st: BENCH },
  { out: ['armor_copper', 1], cost: { bar_copper: 8 }, st: BENCH },
  { out: ['armor_iron', 1], cost: { armor_copper: 1, bar_iron: 10 }, st: BENCH },
  { out: ['armor_gold', 1], cost: { armor_iron: 1, bar_gold: 12 }, st: BENCH },
];
const ST_NAME = { [BENCH]: '工作台', [FURNACE]: '熔炉' };

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
  icons = mkCanvas(T * 32, T);
  const ig = icons.getContext('2d');
  let ni = 0;
  const reg = id => { ICON[id] = ni++; return ICON[id]; };
  const ip = (i, x, y, c) => { ig.fillStyle = c; ig.fillRect(i * T + x, y, 1, 1); };
  const ir = (i, x, y, w, h, c) => { ig.fillStyle = c; ig.fillRect(i * T + x, y, w, h); };
  const TIER = { wood: ['#9a6a3a', '#c7965a', '#6a4422'], copper: ['#c8703a', '#ffb07a', '#8a4a20'], iron: ['#9aa0aa', '#e8ecf2', '#6a707a'],
                 gold: ['#e8b82a', '#fff6b0', '#a87a10'], diamond: ['#3ad0e0', '#d0fdff', '#1a8a9a'] };
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
  ['copper', 'iron', 'gold'].forEach(tn => {
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
const input = { l: false, r: false, j: false };
const ptr = { down: false, x: 0, y: 0, id: -1, fresh: false };
const mine = { x: -1, y: -1, p: 0 };
let placeCd = 0, hudDirty = true, hpDirty = true, running = false, saveT = 0;

function give(id, n, wx, wy) {
  inv[id] += n; hudDirty = true;
  const k = ITEMS[id].k;
  if (k !== 'res' && k !== 'armor' && hotbar.indexOf(id) < 0) { const e = hotbar.indexOf(null); if (e >= 0) hotbar[e] = id; }
  if (wx !== undefined) floatText('+' + n + ' ' + ITEMS[id].n, wx, wy, '#fff');
}
function armorDef() { return inv.armor_gold ? 0.5 : inv.armor_iron ? 0.35 : inv.armor_copper ? 0.2 : 0; }
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
      for (let tx = Math.floor(e.x); tx <= x1; tx++) if (getT(tx, ty) === PLATFORM) { e.y = ty - e.h - 0.001; e.onG = true; e.vy = 0; break; }
    }
  }
  e.x = clamp(e.x, 0.01, W - e.w - 0.01);
}

function respawn() {
  player.x = spawnX + 0.1; player.y = spawnY - 0.5; player.vx = player.vy = 0; player.hp = player.maxHp; player.inv = 2;
  while (boxHits(player.x, player.y, player.w, player.h) && player.y > 2) player.y -= 1;
  hpDirty = true;
}

function hurtPlayer(d, fromX) {
  if (player.inv > 0) return;
  d = Math.max(1, Math.round(d * (1 - armorDef())));
  player.hp -= d; player.inv = 0.8; player.lastHurt = 0;
  player.vx = (player.x + player.w / 2 > fromX ? 1 : -1) * 8; player.vy = -8;
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
  if (id === 'mushroom' || id === 'potion') {
    if (player.hp >= player.maxHp) { toast('生命已满', 1200); return false; }
    heal(id === 'potion' ? 60 : 15);
  } else if (id === 'crystal') {
    if (player.maxHp >= 200) { toast('生命上限已达最高', 1500); return false; }
    player.maxHp += 20; heal(20); toast('生命上限 +20！', 1500);
  } else return false;
  inv[id]--; hudDirty = true; return true;
}

function spawnSlime() {
  const night = daylight() < 0.4;
  if (enemies.length >= (night ? 7 : 4)) return;
  const sx = Math.floor(player.x + (Math.random() < 0.5 ? -1 : 1) * (16 + Math.random() * 10));
  if (sx < 2 || sx > W - 3) return;
  let sy = 0; while (sy < H && !isSolid(sx, sy)) sy++;
  if (Math.abs(sy - player.y) > 30) return;
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
  const dmg = it && it.k === 'sword' ? it.dmg : 4;
  const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
  let hit = false;
  for (const e of enemies) {
    const ex = e.x + e.w / 2 - cx, ey = e.y + e.h / 2 - cy;
    if (ex * player.face > -0.6 && Math.abs(ex) < 2.7 && Math.abs(ey) < 2.2) { damageEnemy(e, dmg, player.face); hit = true; }
  }
  sfx(hit ? 220 : 520, 0.06, hit ? 'square' : 'triangle', hit ? 0.1 : 0.04);
}

function chestLoot(tx, ty) {
  const depth = ty - surf[tx], c = rint(5, 15) + Math.floor(depth / 4);
  coins += c; floatText('+' + c + ' 金币', tx + 0.5, ty - 0.6, '#ffd84a');
  give('torch', rint(4, 8));
  const pool = [['arrow', 10, 20], ['potion', 1, 2], ['bomb', 2, 3], ['bar_copper', 3, 5], ['platform', 8, 14]];
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
  tiles[i] = AIR; lightVer++;
  burst(tx + 0.5, ty + 0.5, TILE[t].col, 7);
  if (t === CHEST) chestLoot(tx, ty);
  else if (TILE[t].drop) give(TILE[t].drop, 1, tx + 0.5, ty);
  sfx(SOLID[t] && t !== DIRT && t !== GRASS && t !== SAND ? 180 : 300, 0.07, 'square', 0.07);
  if (t === LOG) { // 整棵树倒下
    let y = ty - 1, n = 0;
    while (y > 0 && tiles[y * W + tx] === LOG) { tiles[y * W + tx] = AIR; burst(tx + 0.5, y + 0.5, TILE[LOG].col, 3); n++; y--; }
    if (n) give('wood', n, tx + 0.5, ty - 1);
    for (let yy = y - 3; yy <= ty; yy++) for (let xx = tx - 3; xx <= tx + 3; xx++) {
      if (getT(xx, yy) === LEAVES) { tiles[yy * W + xx] = AIR; if (Math.random() < 0.4) burst(xx + 0.5, yy + 0.5, TILE[LEAVES].col, 2); }
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
  sfx(400, 0.04, 'square', 0.05);
}

function explode(x, y) {
  const R = 2.7;
  for (let ty = Math.floor(y - R); ty <= y + R; ty++) for (let tx = Math.floor(x - R); tx <= x + R; tx++) {
    if (Math.hypot(tx + 0.5 - x, ty + 0.5 - y) <= R) breakTile(tx, ty);
  }
  for (const e of enemies) if (Math.hypot(e.x + e.w / 2 - x, e.y + e.h / 2 - y) < 4) damageEnemy(e, 60, Math.sign(e.x - x) || 1);
  if (Math.hypot(player.x + player.w / 2 - x, player.y + player.h / 2 - y) < 3.2) hurtPlayer(35, x);
  burst(x, y, '#ffd84a', 16); burst(x, y, '#ff7a1a', 16); burst(x, y, '#55555f', 12);
  shake = 0.35; sfx(70, 0.4, 'sawtooth', 0.2); sfx(110, 0.25, 'square', 0.12);
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

// ───────────────────────── 逻辑更新 ─────────────────────────
function ptrWorld() { return [(ptr.x * dpr / zoom + camX) / T, (ptr.y * dpr / zoom + camY) / T]; }

function update(dt) {
  const p = player;
  dayT = (dayT + dt / DAY_LEN) % 1;
  const dir = (input.r ? 1 : 0) - (input.l ? 1 : 0);
  const target = dir * 7.5, acc = p.onG ? 60 : 35;
  if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt); else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
  if (dir) p.face = dir;
  p.coyote = p.onG ? 0.1 : p.coyote - dt;
  if (input.j && p.coyote > 0) { p.vy = -14.5; p.coyote = 0; sfx(360, 0.05, 'triangle', 0.04); }
  if (!input.j && p.vy < -5) p.vy = -5;
  moveEnt(p, dt, true);
  if (p.onG && Math.abs(p.vx) > 0.5) p.walk += Math.abs(p.vx) * dt * 1.6; else if (p.onG) p.walk = 0;
  p.inv -= dt; p.swing -= dt; p.swingCd -= dt; p.useCd -= dt; placeCd -= dt; p.lastHurt += dt; shake -= dt;
  if (p.lastHurt > 5 && p.hp < p.maxHp) { p.hp = Math.min(p.maxHp, p.hp + 4 * dt); hpDirty = true; }

  // 触摸 / 鼠标交互
  let mining = false;
  if (ptr.down) {
    const [wx, wy] = ptrWorld(), tx = Math.floor(wx), ty = Math.floor(wy);
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (!dir) p.face = wx >= cx ? 1 : -1;
    const inReach = Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) <= 5.5;
    const id = hotbar[sel], it = id ? ITEMS[id] : null, k = it && inv[id] > 0 ? it.k : 'hand';
    if (k === 'pick' || k === 'sword' || k === 'hand' || k === 'res' || k === 'armor') {
      if (p.swingCd <= 0) startSwing(id);
      if (k === 'pick' && inReach) {
        const t = getT(tx, ty);
        if (t !== AIR && t !== BEDROCK && ty >= 0) {
          if (mine.x !== tx || mine.y !== ty) { mine.x = tx; mine.y = ty; mine.p = 0; }
          mine.p += dt * it.pow / TILE[t].hard; mining = true;
          if (Math.random() < dt * 8) parts.push({ x: tx + 0.5, y: ty + 0.5, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4, life: 0.3, col: TILE[t].col });
          if (mine.p >= 1) { breakTile(tx, ty); mine.p = 0; mine.x = -1; }
        }
      }
    } else if (k === 'block') { if (inReach && placeCd <= 0) tryPlace(tx, ty, id); }
    else if (k === 'bow') {
      if (p.useCd <= 0) {
        if (inv.arrow > 0) {
          const a = Math.atan2(wy - cy, wx - cx);
          shots.push({ type: 'arrow', x: cx, y: cy - 0.2, vx: Math.cos(a) * 24, vy: Math.sin(a) * 24 - 2, life: 3, dmg: it.dmg });
          inv.arrow--; hudDirty = true; p.useCd = 0.38; p.swing = 0.15; sfx(700, 0.06, 'triangle', 0.06);
        } else if (ptr.fresh) toast('没有箭矢了（木头 + 石头 可制作）', 1600);
      }
    } else if (k === 'throw') {
      if (p.useCd <= 0) {
        const a = Math.atan2(wy - cy, wx - cx), sp = clamp(Math.hypot(wx - cx, wy - cy) * 2.6, 8, 20);
        shots.push({ type: 'bomb', x: cx, y: cy - 0.3, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, life: 1.6 });
        inv[id]--; hudDirty = true; p.useCd = 0.6; p.swing = 0.2; sfx(300, 0.08, 'triangle', 0.05);
      }
    } else if (k === 'use') { if (ptr.fresh && p.useCd <= 0) { useItem(id); p.useCd = 0.3; } }
    ptr.fresh = false;
  }
  if (!mining) { mine.p = 0; mine.x = -1; }

  // 投射物
  for (const s of shots) {
    s.life -= dt; s.vy += (s.type === 'bomb' ? 30 : 18) * dt;
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
    if (s.type === 'arrow') {
      s.x = nx; s.y = ny;
      if (isSolid(Math.floor(nx), Math.floor(ny))) { s.life = 0; burst(nx, ny, '#c7965a', 3); continue; }
      for (const e of enemies) if (nx > e.x - 0.1 && nx < e.x + e.w + 0.1 && ny > e.y - 0.1 && ny < e.y + e.h + 0.1) {
        damageEnemy(e, s.dmg, Math.sign(s.vx) || 1); s.life = 0; sfx(220, 0.06, 'square', 0.08); break;
      }
    } else {
      if (isSolid(Math.floor(nx), Math.floor(s.y))) s.vx *= -0.4; else s.x = nx;
      if (isSolid(Math.floor(s.x), Math.floor(ny))) { s.vy *= -0.35; s.vx *= 0.7; } else s.y = ny;
      if (s.life <= 0) explode(s.x, s.y);
    }
  }
  shots = shots.filter(s => s.life > 0);

  // 敌人
  spawnT -= dt;
  if (spawnT <= 0) { spawnT = daylight() < 0.4 ? 2.5 : 5; spawnSlime(); }
  for (const e of enemies) {
    e.t -= dt; e.hit -= dt;
    if (e.onG) {
      e.vx *= 0.75;
      if (e.t <= 0) { e.vy = e.big ? -12.5 : -10.5; e.vx = Math.sign(p.x - e.x) * (e.big ? 5 : 4); e.t = 0.9 + Math.random() * 1.2; }
    }
    moveEnt(e, dt, false);
    if (e.x < p.x + p.w && e.x + e.w > p.x && e.y < p.y + p.h && e.y + e.h > p.y) hurtPlayer(e.dmg, e.x + e.w / 2);
    if (e.hp <= 0) {
      const c = e.big ? 5 : 2; coins += c;
      burst(e.x + 0.45, e.y + 0.35, e.col[0], 12); floatText('+' + c + ' 金币', e.x + 0.4, e.y - 0.5, '#ffd84a'); sfx(660, 0.1, 'square', 0.07);
      give('gel', e.big ? 2 : 1, e.x + 0.4, e.y);
    }
  }
  enemies = enemies.filter(e => e.hp > 0 && Math.abs(e.x - p.x) < 60 && e.y < H);

  for (const q of parts) { q.vy += 25 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
  parts = parts.filter(q => q.life > 0);
  for (const q of texts) { q.y -= dt * 1.5; q.life -= dt; }
  texts = texts.filter(q => q.life > 0);

  saveT += dt; if (saveT > 20) { saveT = 0; saveGame(); }
}

// ───────────────────────── 存档 ─────────────────────────
const SAVE_KEY = 'pixel_frontier_save_v2';
function saveGame() {
  if (!running) return;
  try {
    let s = '';
    for (let i = 0; i < tiles.length; i += 8192) s += String.fromCharCode.apply(null, tiles.subarray(i, i + 8192));
    localStorage.setItem(SAVE_KEY, JSON.stringify({ seed: worldSeed, tiles: btoa(s), inv, hotbar, sel, coins, dayT,
      hp: player.hp, maxHp: player.maxHp, x: player.x, y: player.y }));
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
    player.x = +d.x; player.y = +d.y; player.vx = player.vy = 0;
    if (!(player.x > 0 && player.y > -50) || boxHits(player.x, player.y, player.w, player.h)) respawn();
    lightVer++; return true;
  } catch (e) { return false; }
}
function newGame() {
  genWorld((Math.random() * 1e9) | 0); resetInventory();
  player.maxHp = 100; dayT = 0.04; enemies = []; shots = []; respawn(); player.inv = 0;
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
  const key = x0 + ',' + y0 + ',' + x1 + ',' + y1 + ',' + sky + ',' + ptx + ',' + pty + ',' + lightVer;
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
    if (px >= 0 && px < lw && py >= 0 && py < lh && light[py * lw + px] < 8) light[py * lw + px] = 8;
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
  const ar = inv.armor_gold ? ['#e8b82a', '#a87a10'] : inv.armor_iron ? ['#c8c0b8', '#8a8078'] : inv.armor_copper ? ['#c8703a', '#8a4a20'] : ['#2e8b57', '#1f6b40'];
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

  for (const e of enemies) drawSlime(e, z, ox, oy);
  for (const s of shots) {
    const sx = Math.floor(s.x * TS) - ox, sy = Math.floor(s.y * TS) - oy;
    if (s.type === 'arrow') {
      const a = Math.atan2(s.vy, s.vx);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(a);
      ctx.fillStyle = '#8a5a34'; ctx.fillRect(-6 * z, -z / 2, 9 * z, z);
      ctx.fillStyle = '#e0e4ea'; ctx.fillRect(3 * z, -z, 2 * z, 2 * z); ctx.fillStyle = '#fff'; ctx.fillRect(-7 * z, -z, 2 * z, 2 * z);
      ctx.restore();
    } else {
      const blink = s.life < 0.6 && Math.floor(s.life * 12) % 2;
      ctx.drawImage(icons, ICON.bomb * T, 0, T, T, sx - 6 * z, sy - 7 * z, 12 * z, 12 * z);
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
    if (t !== TORCH && t !== FURNACE) continue;
    const fl = (0.10 + Math.sin(now * 9 + x * 3) * 0.03) * (walls[y * W + x] ? 1 : 1 - d * 0.9); // 白天地表不泛光
    ctx.fillStyle = `rgba(255,170,60,${fl})`; ctx.fillRect((x - 2) * TS - ox, (y - 2) * TS - oy, TS * 5, TS * 5);
    ctx.fillRect((x - 1) * TS - ox, (y - 1) * TS - oy, TS * 3, TS * 3);
  }

  if (ptr.down) {
    const [wx, wy] = ptrWorld(), tx = Math.floor(wx), ty = Math.floor(wy);
    const ok = Math.hypot(tx + 0.5 - player.x - player.w / 2, ty + 0.5 - player.y - player.h / 2) <= 5.5;
    ctx.strokeStyle = ok ? 'rgba(255,255,255,.85)' : 'rgba(255,80,80,.7)'; ctx.lineWidth = z;
    ctx.strokeRect(tx * TS - ox + z / 2, ty * TS - oy + z / 2, TS - z, TS - z);
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
let toastTimer = 0, bagOpen = false, bagTab = 'inv', bagSel = null, lastClock = '';

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
function countLabel(id) { const k = ITEMS[id].k; return (k === 'pick' || k === 'sword' || k === 'bow' || k === 'armor') ? '' : inv[id]; }

function refreshHUD() {
  hudDirty = false; hpDirty = true;
  const bar = $('hotbar'); bar.innerHTML = '';
  hotbar.forEach((id, k) => {
    let label = id ? countLabel(id) : '';
    if (id === 'bow') label = inv.arrow;
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
function setTab(t) { bagTab = t; bagSel = null; renderBag(); }
function toggleBag(show) { bagOpen = show; $('bag').classList.toggle('show', show); if (show) renderBag(); else ptr.down = false; }

function renderBag() {
  $('tabInv').className = bagTab === 'inv' ? 'on' : ''; $('tabCraft').className = bagTab === 'craft' ? 'on' : '';
  const sts = [BENCH, FURNACE].filter(nearStation).map(s => ST_NAME[s]);
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
  if (bagTab === 'inv') {
    const own = ITEM_IDS.filter(id => inv[id] > 0);
    if (bagSel === null || !(inv[bagSel] > 0)) bagSel = own[0] || null;
    own.forEach(id => {
      const el = mkSlot(id, countLabel(id), id === bagSel ? ' sel' : '');
      el.addEventListener('click', () => { bagSel = id; renderBag(); });
      grid.appendChild(el);
    });
    if (!bagSel) { line('背包是空的'); return; }
    const it = ITEMS[bagSel], id = bagSel;
    head(id, it.n + (countLabel(id) !== '' ? ' ×' + inv[id] : ''));
    line(it.d);
    if (it.k === 'use') button('使用', () => { useItem(id); refreshHUD(); });
    if (it.k !== 'res' && it.k !== 'armor') {
      const at = hotbar.indexOf(id);
      line(at >= 0 ? '已在快捷栏第 ' + (at + 1) + ' 格' : '未放入快捷栏');
      button('放到快捷栏第 ' + (sel + 1) + ' 格（当前选中）', () => {
        const old = hotbar.indexOf(id); if (old >= 0) hotbar[old] = hotbar[sel];
        hotbar[sel] = id; refreshHUD();
      }, 'alt', at === sel);
    }
  } else {
    if (typeof bagSel !== 'number') bagSel = 0;
    RECIPES.forEach((rc, k) => {
      const el = mkSlot(rc.out[0], rc.out[1] > 1 ? rc.out[1] : '', (k === bagSel ? ' sel' : '') + (canCraft(rc) ? '' : ' dim'));
      el.addEventListener('click', () => { bagSel = k; renderBag(); });
      grid.appendChild(el);
    });
    const rc = RECIPES[bagSel], it = ITEMS[rc.out[0]];
    head(rc.out[0], it.n + (rc.out[1] > 1 ? ' ×' + rc.out[1] : ''));
    line(it.d);
    Object.keys(rc.cost).forEach(k => line(ITEMS[k].n + ' ' + inv[k] + '/' + rc.cost[k], inv[k] >= rc.cost[k] ? 'ok' : 'no'));
    if (rc.st) line('需要靠近：' + ST_NAME[rc.st], nearStation(rc.st) ? 'ok' : 'no');
    button('制作', () => { craft(rc); refreshHUD(); }, '', !canCraft(rc));
  }
}

function bindInput() {
  const hold = (id, key) => {
    const el = $(id);
    const set = v => ev => { ev.preventDefault(); input[key] = v; el.classList.toggle('on', v); if (v && el.setPointerCapture) { try { el.setPointerCapture(ev.pointerId); } catch (e) { /* */ } } };
    el.addEventListener('pointerdown', set(true));
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, set(false)));
  };
  hold('left', 'l'); hold('right', 'r'); hold('jump', 'j');

  canvas.addEventListener('pointerdown', ev => { ev.preventDefault(); const [x, y] = toStage(ev); ptr.down = true; ptr.fresh = true; ptr.id = ev.pointerId; ptr.x = x; ptr.y = y; });
  canvas.addEventListener('pointermove', ev => { if (ev.pointerId === ptr.id) { const [x, y] = toStage(ev); ptr.x = x; ptr.y = y; } });
  const end = ev => { if (ev.pointerId === ptr.id) { ptr.down = false; ptr.id = -1; } };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => canvas.addEventListener(n, end));

  $('bagBtn').addEventListener('click', () => toggleBag(true));
  $('closeBag').addEventListener('click', () => toggleBag(false));
  $('bag').addEventListener('click', ev => { if (ev.target === $('bag')) toggleBag(false); });
  $('tabInv').addEventListener('click', () => setTab('inv'));
  $('tabCraft').addEventListener('click', () => setTab('craft'));

  const km = { KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', Space: 'j', KeyW: 'j', ArrowUp: 'j' };
  window.addEventListener('keydown', ev => {
    if (km[ev.code]) { input[km[ev.code]] = true; ev.preventDefault(); }
    else if (ev.code === 'KeyE' || ev.code === 'Escape') { if (running) toggleBag(ev.code === 'KeyE' && !bagOpen); }
    else if (/^Digit[1-8]$/.test(ev.code)) { sel = +ev.code[5] - 1; hudDirty = true; }
  });
  window.addEventListener('keyup', ev => { if (km[ev.code]) input[km[ev.code]] = false; });
  window.addEventListener('blur', () => { input.l = input.r = input.j = false; ptr.down = false; });
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
  toast(cont ? '欢迎回来！进度每 20 秒自动保存' : '选「镐」点住方块挖掘 · 砍树得木头 · 🎒 背包里可以合成', 4500);
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
    getT, W, H, T, ITEMS, RECIPES, TILE, saveGame, loadGame, renderBag, refreshHUD,
    set: o => { if (o.sel !== undefined) sel = o.sel; if (o.hotbar) hotbar = o.hotbar; if (o.dayT !== undefined) dayT = o.dayT; if (o.running !== undefined) running = o.running; if (o.tab) bagTab = o.tab; },
    state: () => ({ enemies, shots, spawnX, spawnY, hotbar, sel, coins, icons, atlas, ICON }) };
} else {
  boot();
}
