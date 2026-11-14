'use strict';
/* 像素边境 Pixel Frontier —— 泰拉瑞亚风格沙盒 Demo
 * 纯 Canvas 2D，无依赖。所有方块 / 角色 / 物品贴图都在运行时用代码逐像素生成。 */

// ───────────────────────── 基础 ─────────────────────────
const T = 16, W = 400, H = 140;
const AIR = 0, DIRT = 1, GRASS = 2, STONE = 3, LOG = 4, LEAVES = 5, COPPER = 6, IRON = 7, GOLD = 8,
      SAND = 9, PLANK = 10, TORCH = 11, BEDROCK = 12, NT = 13;

// name, solid, 挖掘耗时(秒), 掉落物品, 碎屑颜色
const TILE = [
  { name: '空气',  solid: 0, hard: 0,    drop: null,     col: '#000' },
  { name: '泥土',  solid: 1, hard: 0.28, drop: 'dirt',   col: '#8a5a34' },
  { name: '草地',  solid: 1, hard: 0.28, drop: 'dirt',   col: '#3fb83f' },
  { name: '石头',  solid: 1, hard: 0.65, drop: 'stone',  col: '#787c85' },
  { name: '树干',  solid: 0, hard: 0.40, drop: 'wood',   col: '#7a5028' },
  { name: '树叶',  solid: 0, hard: 0.10, drop: null,     col: '#2c8a38' },
  { name: '铜矿',  solid: 1, hard: 0.90, drop: 'copper', col: '#e08a4a' },
  { name: '铁矿',  solid: 1, hard: 1.10, drop: 'iron',   col: '#d8c8b8' },
  { name: '金矿',  solid: 1, hard: 1.30, drop: 'gold',   col: '#ffd84a' },
  { name: '沙子',  solid: 1, hard: 0.22, drop: 'sand',   col: '#e6d08c' },
  { name: '木板',  solid: 1, hard: 0.30, drop: 'plank',  col: '#b5834a' },
  { name: '火把',  solid: 0, hard: 0.05, drop: 'torch',  col: '#ffb030' },
  { name: '基岩',  solid: 1, hard: 1e9,  drop: null,     col: '#333' },
];
const SOLID = TILE.map(t => t.solid);

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

// 值噪声
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
let spawnX = W / 2, spawnY = 0;

function genWorld(seed) {
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
      // 洞穴：蠕虫状隧道 + 大空洞
      if (d > 3) {
        const c = n2(x / 22, y / 14) * 0.65 + n3(x / 9, y / 8) * 0.35;
        if (Math.abs(c - 0.5) < 0.035 + Math.min(d, 40) * 0.0006) t = AIR;
        if (d > 18 && n3(x / 26, y / 18) > 0.74) t = AIR;
      }
      tiles[i] = t;
    }
    tiles[(H - 1) * W + x] = BEDROCK; tiles[(H - 2) * W + x] = r() < 0.5 ? BEDROCK : tiles[(H - 2) * W + x];
  }
  // 矿脉
  const vein = (ore, count, minD, size) => {
    for (let k = 0; k < count; k++) {
      let x = 2 + Math.floor(r() * (W - 4)), y = surf[x] + minD + Math.floor(r() * (H - surf[x] - minD - 3));
      for (let s = 0; s < size; s++) {
        if (x > 0 && x < W - 1 && y > 0 && y < H - 2 && tiles[y * W + x] === STONE) tiles[y * W + x] = ore;
        x += Math.floor(r() * 3) - 1; y += Math.floor(r() * 3) - 1;
      }
    }
  };
  vein(COPPER, 110, 5, 7); vein(IRON, 75, 18, 6); vein(GOLD, 45, 42, 5);
  // 树
  for (let x = 4; x < W - 4; x++) {
    const h = surf[x];
    if (tiles[h * W + x] !== GRASS || r() > 0.16) continue;
    const th = 4 + Math.floor(r() * 4);
    for (let k = 1; k <= th; k++) tiles[(h - k) * W + x] = LOG;
    const top = h - th;
    for (let dy = -3; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
      if (Math.abs(dx) + Math.abs(dy + 1) > 3) continue;
      const i = (top + dy) * W + x + dx;
      if (tiles[i] === AIR) tiles[i] = LEAVES;
    }
    x += 3;
  }
  // 出生点
  spawnX = W / 2;
  for (let x = W / 2; x < W / 2 + 30; x++) if (tiles[surf[x] * W + x] === GRASS && getT(x, surf[x] - 1) !== LOG) { spawnX = x; break; }
  spawnY = surf[spawnX] - 2;
}

// ───────────────────────── 像素贴图（程序生成）─────────────────────────
let atlas = null, icons = null;
const ICON = { pick: 0, pick2: 1, sword: 2, sword2: 3, wood: 4, copper: 5, iron: 6, gold: 7, armor: 8, coin: 9 };

function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function buildArt() {
  const r = mulberry32(2024);
  atlas = mkCanvas(NT * T, T * 3);
  const g = atlas.getContext('2d');
  const px = (x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
  const pick3 = p => { const v = r(); return v < 0.55 ? p[1] : v < 0.8 ? p[0] : p[2]; };
  const fillN = (ox, oy, p) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(ox + x, oy + y, pick3(p)); };
  const P = {
    dirt: ['#6b4226', '#8a5a34', '#a06c40'], stone: ['#5c5f66', '#787c85', '#8e939c'],
    grass: ['#2f8f2f', '#3fb83f', '#5fd65f'], leaf: ['#1f6b2a', '#2c8a38', '#44a84c'],
    sand: ['#d9c27a', '#e6d08c', '#f0dea0'], bed: ['#1c1c22', '#2e2e36', '#3e3e48'],
    wdirt: ['#33200f', '#3e2715', '#472d19'], wstone: ['#26282d', '#313439', '#393c42'],
  };
  const stoneTile = ox => {
    fillN(ox, 0, P.stone);
    for (let k = 0; k < 4; k++) { // 裂纹
      let x = Math.floor(r() * 12), y = 1 + Math.floor(r() * 14);
      for (let s = 0; s < 4; s++) { px(ox + x + s, y, '#484b52'); if (r() < 0.3) y = clamp(y + 1, 0, 15); }
    }
  };
  const oreTile = (ox, c, hi, dk) => {
    stoneTile(ox);
    [[2, 2], [9, 3], [5, 8], [11, 10], [2, 12]].forEach(([bx, by]) => {
      bx += Math.floor(r() * 2); by += Math.floor(r() * 2);
      px(ox + bx, by, hi); px(ox + bx + 1, by, c); px(ox + bx, by + 1, c); px(ox + bx + 1, by + 1, dk);
      if (r() < 0.6) px(ox + bx + 2, by + 1, c);
      if (r() < 0.6) px(ox + bx - 1, by, c);
    });
  };
  // 泥土
  fillN(DIRT * T, 0, P.dirt);
  for (let k = 0; k < 3; k++) { const x = Math.floor(r() * 14), y = Math.floor(r() * 14); px(DIRT * T + x, y, '#b8956a'); px(DIRT * T + x + 1, y, '#9c7a52'); }
  // 草地
  fillN(GRASS * T, 0, P.dirt);
  for (let x = 0; x < T; x++) {
    const d = 3 + Math.floor(r() * 3);
    for (let y = 0; y < d; y++) px(GRASS * T + x, y, y === 0 ? P.grass[2] : y === d - 1 ? P.grass[0] : pick3(P.grass));
  }
  stoneTile(STONE * T);
  // 树干（两侧透明）
  for (let y = 0; y < T; y++) for (let x = 3; x < 13; x++) {
    const c = x === 3 || x === 12 ? '#4a2e14' : ((x * 3 + (y >> 2)) % 4 === 0 ? '#5a3a1c' : r() < 0.2 ? '#96683a' : '#7a5028');
    px(LOG * T + x, y, c);
  }
  // 树叶
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) if (r() > 0.08) px(LEAVES * T + x, y, pick3(P.leaf));
  for (let k = 0; k < 5; k++) px(LEAVES * T + Math.floor(r() * 16), Math.floor(r() * 16), '#7fd67a');
  oreTile(COPPER * T, '#e08a4a', '#ffc08a', '#a85a28');
  oreTile(IRON * T, '#d8c8b8', '#ffffff', '#9a8a7c');
  oreTile(GOLD * T, '#ffd84a', '#fff6b0', '#c89a1a');
  fillN(SAND * T, 0, P.sand);
  // 木板
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const row = y >> 2, joint = (x + row * 5) % 8 === 0;
    px(PLANK * T + x, y, y % 4 === 3 ? '#7d5529' : joint ? '#8a5f30' : r() < 0.15 ? '#c7965a' : '#b5834a');
  }
  // 火把
  for (let y = 7; y < 16; y++) { px(TORCH * T + 7, y, '#7a5028'); px(TORCH * T + 8, y, '#5a3a1c'); }
  [[7, 6, '#ff7a1a'], [8, 6, '#ff7a1a'], [6, 5, '#ff7a1a'], [7, 5, '#ffd84a'], [8, 5, '#ffd84a'], [9, 5, '#ff7a1a'],
   [7, 4, '#fff6b0'], [8, 4, '#ffd84a'], [6, 4, '#ff7a1a'], [9, 4, '#ff7a1a'], [7, 3, '#ffd84a'], [8, 3, '#ff7a1a'], [7, 2, '#ff7a1a']]
    .forEach(([x, y, c]) => px(TORCH * T + x, y, c));
  fillN(BEDROCK * T, 0, P.bed);
  // 背景墙（第 2 行）
  fillN(1 * T, T, P.wdirt); fillN(2 * T, T, P.wstone);
  for (let k = 0; k < 5; k++) { const x = Math.floor(r() * 12), y = Math.floor(r() * 15); for (let s = 0; s < 4; s++) px(2 * T + x + s, T + y, '#1e2024'); }
  // 挖掘裂纹（第 3 行，4 个阶段）
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

  // 物品图标
  icons = mkCanvas(T * 10, T);
  const ig = icons.getContext('2d');
  const ip = (i, x, y, c) => { ig.fillStyle = c; ig.fillRect(i * T + x, y, 1, 1); };
  const drawPick = (i, c, hi) => {
    for (let k = 0; k < 10; k++) { ip(i, 2 + k, 13 - k, '#7a5028'); ip(i, 3 + k, 13 - k, '#5a3a1c'); }
    [[4, 2], [5, 2], [6, 2], [7, 2], [8, 2], [9, 3], [10, 3], [11, 4], [12, 5], [12, 6], [13, 7], [13, 8], [13, 9], [13, 10], [13, 11]]
      .forEach(([x, y]) => { ip(i, x, y, hi); ip(i, x, y + 1, c); ip(i, x - 1, y + 1, c); });
  };
  const drawSword = (i, c, hi) => {
    for (let k = 0; k < 9; k++) { ip(i, 5 + k, 10 - k, c); ip(i, 6 + k, 10 - k, hi); ip(i, 5 + k, 9 - k, hi); }
    ip(i, 14, 1, hi);
    [[3, 8], [4, 9], [5, 10], [6, 11], [7, 12], [4, 8], [7, 11]].forEach(([x, y]) => ip(i, x, y, '#c89a1a'));
    [[4, 11], [3, 12], [2, 13]].forEach(([x, y]) => { ip(i, x, y, '#7a5028'); ip(i, x + 1, y + 1 > 15 ? 15 : y, '#5a3a1c'); });
    ip(i, 1, 14, '#c89a1a');
  };
  drawPick(ICON.pick, '#787c85', '#b8bcc5'); drawPick(ICON.pick2, '#c8703a', '#ffb07a');
  drawSword(ICON.sword, '#9aa0aa', '#e8ecf2'); drawSword(ICON.sword2, '#e8b82a', '#fff6b0');
  // 木头
  for (let y = 4; y < 12; y++) for (let x = 2; x < 14; x++) ip(ICON.wood, x, y, y === 4 || y === 11 ? '#4a2e14' : (x + y) % 5 === 0 ? '#5a3a1c' : '#7a5028');
  for (let y = 5; y < 11; y++) { ip(ICON.wood, 12, y, '#c7965a'); ip(ICON.wood, 13, y, '#b5834a'); }
  // 矿石块
  const nug = (i, c, hi, dk) => {
    const rows = [[6, 9], [4, 11], [3, 12], [3, 13], [2, 13], [3, 13], [4, 12], [6, 10]];
    rows.forEach(([a, b], k) => { for (let x = a; x <= b; x++) ip(i, x, 4 + k, k < 2 || x < a + 2 ? hi : k > 5 || x > b - 2 ? dk : c); });
  };
  nug(ICON.copper, '#e08a4a', '#ffc08a', '#a85a28'); nug(ICON.iron, '#c8c0b8', '#ffffff', '#8a8078'); nug(ICON.gold, '#ffd84a', '#fff6b0', '#c89a1a');
  // 铁甲
  for (let y = 3; y < 14; y++) for (let x = 3; x < 13; x++) {
    if ((y < 5 && x > 5 && x < 10) || (y > 6 && (x < 5 || x > 10))) continue;
    ip(ICON.armor, x, y, x < 5 || y === 3 ? '#ffffff' : x > 10 || y > 11 ? '#8a8078' : '#c8c0b8');
  }
  // 金币
  for (let y = 4; y < 12; y++) for (let x = 4; x < 12; x++) {
    const d = (x - 7.5) ** 2 + (y - 7.5) ** 2; if (d > 17) continue;
    ip(ICON.coin, x, y, d > 10 ? '#c89a1a' : x < 7 ? '#fff6b0' : '#ffd84a');
  }
}

// ───────────────────────── 物品 / 背包 ─────────────────────────
const ITEMS = {
  pick:   { name: '镐',   tool: 1 },
  sword:  { name: '剑',   tool: 1 },
  dirt:   { name: '泥土', tile: DIRT },
  stone:  { name: '石头', tile: STONE },
  plank:  { name: '木板', tile: PLANK },
  torch:  { name: '火把', tile: TORCH },
  sand:   { name: '沙子', tile: SAND },
  wood:   { name: '木头', icon: ICON.wood },
  copper: { name: '铜矿', icon: ICON.copper },
  iron:   { name: '铁矿', icon: ICON.iron },
  gold:   { name: '金矿', icon: ICON.gold },
};
const HOTBAR = ['pick', 'sword', 'dirt', 'stone', 'plank', 'torch', 'sand'];
const inv = { dirt: 0, stone: 0, plank: 0, torch: 5, sand: 0, wood: 0, copper: 0, iron: 0, gold: 0 };
const up = { pick2: false, sword2: false, armor: false };
let sel = 0, coins = 0;

const RECIPES = [
  { name: '木板 ×4', desc: '基础建材', icon: () => [atlas, PLANK * T], cost: { wood: 1 }, make: () => { inv.plank += 4; } },
  { name: '火把 ×3', desc: '照亮洞穴', icon: () => [atlas, TORCH * T], cost: { wood: 1 }, make: () => { inv.torch += 3; } },
  { name: '铜镐', desc: '挖掘速度 ×2', icon: () => [icons, ICON.pick2 * T], cost: { copper: 8, wood: 4 }, once: 'pick2' },
  { name: '铁甲', desc: '受到伤害减半', icon: () => [icons, ICON.armor * T], cost: { iron: 10 }, once: 'armor' },
  { name: '金剑', desc: '攻击伤害 ×2.5', icon: () => [icons, ICON.sword2 * T], cost: { gold: 6, wood: 2 }, once: 'sword2' },
];

function itemIcon(id) {
  const it = ITEMS[id];
  if (id === 'pick') return [icons, (up.pick2 ? ICON.pick2 : ICON.pick) * T];
  if (id === 'sword') return [icons, (up.sword2 ? ICON.sword2 : ICON.sword) * T];
  if (it.tile !== undefined) return [atlas, it.tile * T];
  return [icons, it.icon * T];
}
function give(id, n, wx, wy) {
  inv[id] += n; hudDirty = true;
  if (wx !== undefined) floatText('+' + n + ' ' + ITEMS[id].name, wx, wy, '#fff');
}

// ───────────────────────── 实体 ─────────────────────────
const player = { x: 0, y: 0, w: 0.75, h: 1.75, vx: 0, vy: 0, onG: false, face: 1, hp: 100, inv: 0, walk: 0, swing: 0, swingCd: 0, coyote: 0, lastHurt: 99 };
let enemies = [], parts = [], texts = [];
let dayT = 0.04, timeAcc = 0, spawnT = 3;
const DAY_LEN = 300;
const input = { l: false, r: false, j: false };
const ptr = { down: false, x: 0, y: 0, id: -1 };
const mine = { x: -1, y: -1, p: 0 };
let placeCd = 0, hudDirty = true, running = false;

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
      else { e.x = dx > 0 ? Math.floor(e.x + e.w) - e.w - 0.001 : Math.floor(e.x) + 1.001; e.vx = 0; e.hitWall = true; }
    }
  }
  e.vy = Math.min(e.vy + 38 * dt, 30);
  e.y += e.vy * dt; e.onG = false;
  if (boxHits(e.x, e.y, e.w, e.h)) {
    if (e.vy > 0) { e.y = Math.floor(e.y + e.h) - e.h - 0.001; e.onG = true; }
    else e.y = Math.floor(e.y) + 1.001;
    e.vy = 0;
  }
  e.x = clamp(e.x, 0.01, W - e.w - 0.01);
}

function respawn() {
  player.x = spawnX + 0.1; player.y = spawnY - 0.5; player.vx = player.vy = 0; player.hp = 100; player.inv = 2;
  while (boxHits(player.x, player.y, player.w, player.h) && player.y > 2) player.y -= 1;
  hudDirty = true;
}

function hurtPlayer(d, fromX) {
  if (player.inv > 0) return;
  if (up.armor) d = Math.ceil(d / 2);
  player.hp -= d; player.inv = 0.8; player.lastHurt = 0;
  player.vx = (player.x + player.w / 2 > fromX ? 1 : -1) * 8; player.vy = -8;
  floatText('-' + d, player.x + 0.4, player.y, '#ff6a6a'); sfx(140, 0.15, 'sawtooth', 0.12);
  hudDirty = true;
  if (player.hp <= 0) {
    toast('你倒下了… 已回到出生点');
    burst(player.x + 0.4, player.y + 0.9, '#d42a3a', 20); respawn();
  }
}

function spawnSlime() {
  const night = daylight() < 0.4;
  if (enemies.length >= (night ? 7 : 4)) return;
  const sx = Math.floor(player.x + (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 9));
  if (sx < 2 || sx > W - 3) return;
  let sy = 0; while (sy < H && !isSolid(sx, sy)) sy++;
  if (Math.abs(sy - player.y) > 30) return;
  const big = night && Math.random() < 0.6;
  enemies.push({ x: sx, y: sy - 1.2, w: 0.9, h: 0.7, vx: 0, vy: 0, onG: false, hp: big ? 40 : 18, max: big ? 40 : 18,
    dmg: big ? 16 : 8, col: big ? ['#c8324a', '#ff7a8a', '#7a1428'] : ['#3fb83f', '#9af08a', '#1f6b2a'], t: Math.random() * 2, hit: 0, big });
}

function startSwing() {
  const id = HOTBAR[sel];
  player.swing = 0.28; player.swingCd = 0.34;
  const dmg = id === 'sword' ? (up.sword2 ? 35 : 14) : 5;
  const cx = player.x + player.w / 2, cy = player.y + player.h / 2;
  let hit = false;
  for (const e of enemies) {
    const ex = e.x + e.w / 2 - cx, ey = e.y + e.h / 2 - cy;
    if (ex * player.face > -0.6 && Math.abs(ex) < 2.7 && Math.abs(ey) < 2.2) {
      e.hp -= dmg; e.hit = 0.15; e.vx = player.face * 7; e.vy = -6; hit = true;
      floatText('' + dmg, e.x + 0.4, e.y, '#ffd84a');
    }
  }
  sfx(hit ? 220 : 520, 0.06, hit ? 'square' : 'triangle', hit ? 0.1 : 0.04);
}

function breakTile(tx, ty) {
  const i = ty * W + tx, t = tiles[i];
  if (t === AIR || t === BEDROCK) return;
  tiles[i] = AIR;
  burst(tx + 0.5, ty + 0.5, TILE[t].col, 7);
  if (TILE[t].drop) give(TILE[t].drop, 1, tx + 0.5, ty);
  sfx(t === STONE || t >= COPPER && t <= GOLD ? 180 : 300, 0.07, 'square', 0.07);
  if (t === LOG) { // 整棵树倒下
    let y = ty - 1, n = 0;
    while (y > 0 && tiles[y * W + tx] === LOG) { tiles[y * W + tx] = AIR; burst(tx + 0.5, y + 0.5, TILE[LOG].col, 3); n++; y--; }
    if (n) give('wood', n, tx + 0.5, ty - 1);
    for (let yy = y - 3; yy <= ty; yy++) for (let xx = tx - 3; xx <= tx + 3; xx++) {
      if (getT(xx, yy) === LEAVES) { tiles[yy * W + xx] = AIR; if (Math.random() < 0.4) burst(xx + 0.5, yy + 0.5, TILE[LEAVES].col, 2); }
    }
  }
  // 上方的火把失去支撑时掉落
  if (getT(tx, ty - 1) === TORCH && !walls[(ty - 1) * W + tx] && getT(tx - 1, ty - 1) === AIR && getT(tx + 1, ty - 1) === AIR) breakTile(tx, ty - 1);
}

function tryPlace(tx, ty, id) {
  if (tx < 0 || tx >= W || ty < 1 || ty >= H - 1) return;
  const i = ty * W + tx, t = ITEMS[id].tile;
  if (tiles[i] !== AIR || inv[id] <= 0) return;
  const support = walls[i] || getT(tx - 1, ty) !== AIR || getT(tx + 1, ty) !== AIR || getT(tx, ty - 1) !== AIR || getT(tx, ty + 1) !== AIR;
  if (!support) return;
  if (SOLID[t]) {
    const hit = e => e.x < tx + 1 && e.x + e.w > tx && e.y < ty + 1 && e.y + e.h > ty;
    if (hit(player) || enemies.some(hit)) return;
  }
  tiles[i] = t; inv[id]--; hudDirty = true; placeCd = 0.13;
  sfx(400, 0.04, 'square', 0.05);
}

function burst(x, y, col, n) {
  for (let k = 0; k < n; k++) parts.push({ x, y, vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 6 - 1, life: 0.4 + Math.random() * 0.4, col });
}
function floatText(text, x, y, col) { texts.push({ text, x, y, col, life: 0.9 }); if (texts.length > 14) texts.shift(); }

function daylight() { return clamp(0.5 + Math.sin(dayT * Math.PI * 2) * 2.5, 0, 1); }

// ───────────────────────── 逻辑更新 ─────────────────────────
function ptrWorld() { return [(ptr.x * dpr / zoom + camX) / T, (ptr.y * dpr / zoom + camY) / T]; }

function update(dt) {
  const p = player;
  dayT = (dayT + dt / DAY_LEN) % 1;
  // 移动
  const dir = (input.r ? 1 : 0) - (input.l ? 1 : 0);
  const target = dir * 7.5, acc = p.onG ? 60 : 35;
  if (p.vx < target) p.vx = Math.min(target, p.vx + acc * dt); else if (p.vx > target) p.vx = Math.max(target, p.vx - acc * dt);
  if (dir) p.face = dir;
  p.coyote = p.onG ? 0.1 : p.coyote - dt;
  if (input.j && p.coyote > 0) { p.vy = -14.5; p.coyote = 0; sfx(360, 0.05, 'triangle', 0.04); }
  if (!input.j && p.vy < -5) p.vy = -5; // 松开跳跃键提前下落
  moveEnt(p, dt, true);
  if (p.onG && Math.abs(p.vx) > 0.5) p.walk += Math.abs(p.vx) * dt * 1.6; else if (p.onG) p.walk = 0;
  p.inv -= dt; p.swing -= dt; p.swingCd -= dt; placeCd -= dt; p.lastHurt += dt;
  if (p.lastHurt > 5 && p.hp < 100) { p.hp = Math.min(100, p.hp + 4 * dt); hudDirty = true; }

  // 触摸 / 鼠标交互
  let mining = false;
  if (ptr.down) {
    const [wx, wy] = ptrWorld(), tx = Math.floor(wx), ty = Math.floor(wy);
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    if (!dir) p.face = wx >= cx ? 1 : -1;
    const inReach = Math.hypot(tx + 0.5 - cx, ty + 0.5 - cy) <= 5.5;
    const id = HOTBAR[sel];
    if (ITEMS[id].tool) {
      if (p.swingCd <= 0) startSwing();
      if (id === 'pick' && inReach) {
        const t = getT(tx, ty);
        if (t !== AIR && t !== BEDROCK && ty >= 0) {
          if (mine.x !== tx || mine.y !== ty) { mine.x = tx; mine.y = ty; mine.p = 0; }
          mine.p += dt * (up.pick2 ? 2 : 1) / TILE[t].hard; mining = true;
          if (Math.random() < dt * 8) parts.push({ x: tx + 0.5, y: ty + 0.5, vx: (Math.random() - 0.5) * 4, vy: -Math.random() * 4, life: 0.3, col: TILE[t].col });
          if (mine.p >= 1) { breakTile(tx, ty); mine.p = 0; mine.x = -1; }
        }
      }
    } else if (inReach && placeCd <= 0) tryPlace(tx, ty, id);
  }
  if (!mining) { mine.p = 0; mine.x = -1; }

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
      const c = e.big ? 5 : 2; coins += c; hudDirty = true;
      burst(e.x + 0.45, e.y + 0.35, e.col[0], 12); floatText('+' + c + ' 金币', e.x + 0.4, e.y, '#ffd84a'); sfx(660, 0.1, 'square', 0.07);
    }
  }
  enemies = enemies.filter(e => e.hp > 0 && Math.abs(e.x - p.x) < 60 && e.y < H);

  for (const q of parts) { q.vy += 25 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt; }
  parts = parts.filter(q => q.life > 0);
  for (const q of texts) { q.y -= dt * 1.5; q.life -= dt; }
  texts = texts.filter(q => q.life > 0);
}

// ───────────────────────── 渲染 ─────────────────────────
let canvas, ctx, cw = 0, ch = 0, dpr = 1, zoom = 3, camX = 0, camY = 0;
let light = new Uint8Array(1), lx0 = 0, ly0 = 0, lw = 0, lh = 0;
let mountains = [], stars = [], clouds = [];

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cw = canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
  ch = canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  zoom = Math.max(2, Math.round(Math.min(cw, ch) / 230));
  ctx.imageSmoothingEnabled = false;
}

function buildBackdrop() {
  const r = mulberry32(5), n = makeNoise(77);
  mountains = [['#5f7fb0', 46, 30, 0], ['#3f6a4a', 30, 20, 50]].map(([col, base, amp, off]) => {
    const c = mkCanvas(256, 96), g = c.getContext('2d'); g.fillStyle = col;
    for (let x = 0; x < 256; x++) {
      const a = x / 256 * Math.PI * 2; // 首尾相接
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
  lx0 = x0; ly0 = y0; lw = x1 - x0 + 1; lh = y1 - y0 + 1;
  if (light.length < lw * lh) light = new Uint8Array(lw * lh);
  for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
    const i = (y + y0) * W + x + x0, t = tiles[i];
    light[y * lw + x] = t === TORCH ? 15 : (!SOLID[t] && !walls[i]) ? sky : 0;
  }
  { // 玩家自带微光，避免在洞里完全看不见
    const px = Math.floor(player.x + player.w / 2) - x0, py = Math.floor(player.y + 0.6) - y0;
    if (px >= 0 && px < lw && py >= 0 && py < lh && light[py * lw + px] < 8) light[py * lw + px] = 8;
  }
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const k = y * lw + x, dec = SOLID[tiles[(y + y0) * W + x + x0]] ? 2 : 1;
      let v = light[k];
      if (x > 0 && light[k - 1] - dec > v) v = light[k - 1] - dec;
      if (y > 0 && light[k - lw] - dec > v) v = light[k - lw] - dec;
      light[k] = v;
    }
    for (let y = lh - 1; y >= 0; y--) for (let x = lw - 1; x >= 0; x--) {
      const k = y * lw + x, dec = SOLID[tiles[(y + y0) * W + x + x0]] ? 2 : 1;
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
  // 太阳 / 月亮
  const a = dayT * Math.PI * 2, R = 7 * z;
  const body = (ang, c1, c2) => {
    const x = Math.round(cw / 2 - Math.cos(ang) * cw * 0.45), y = Math.round(ch * 0.55 - Math.sin(ang) * ch * 0.45);
    ctx.fillStyle = c2; ctx.fillRect(x - R, y - R + z, R * 2, R * 2 - 2 * z); ctx.fillRect(x - R + z, y - R, R * 2 - 2 * z, R * 2);
    ctx.fillStyle = c1; ctx.fillRect(x - R + z, y - R + z, R * 2 - 3 * z, R * 2 - 3 * z);
  };
  body(a, '#fff6b0', '#ffd84a'); body(a + Math.PI, '#f4f6ff', '#b8c0e0');
  // 云
  ctx.fillStyle = mix([70, 78, 120], [255, 255, 255], d);
  for (const c of clouds) {
    const u = Math.round(4 * z * c.s), x = Math.round(((c.x + now * c.v) % 1.3 - 0.15) * cw), y = Math.round(c.y * ch);
    ctx.fillRect(x, y, u * 6, u * 2); ctx.fillRect(x + u, y - u, u * 3, u); ctx.fillRect(x + u * 3, y - u * 2, u * 2, u * 2); ctx.fillRect(x - u, y + u, u * 8, u);
  }
  // 远山视差
  mountains.forEach((m, k) => {
    const par = 0.12 + k * 0.14, s = z * (k ? 1.5 : 2), mw = 256 * s, mh = 96 * s;
    const y = Math.round((44 * T - camY) * z * (0.25 + k * 0.2) + ch * 0.42 - mh + (k ? 60 * z : 30 * z));
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
  // 腿
  R(2, 19, 4, 7 - la, '#34508c'); R(2, 26 - la, 4, 2, '#3a2a1a');
  R(6, 19, 4, 7 - lb, '#2a4070'); R(6, 26 - lb, 4, 2, '#2e2014');
  // 身体
  const shirt = up.armor ? '#c8c0b8' : '#2e8b57', shirtD = up.armor ? '#8a8078' : '#1f6b40';
  R(2, 10, 8, 9, shirt); R(2, 17, 8, 2, shirtD); R(1, 10, 2, 7, shirtD);
  // 头
  R(2, 2, 8, 8, '#f0c090'); R(2, 0, 9, 3, '#5a3418'); R(1, 1, 2, 6, '#5a3418'); R(2, 3, 2, 2, '#5a3418');
  R(7, 5, 2, 2, '#1a1208'); R(8, 5, 1, 1, '#fff'); R(6, 8, 3, 1, '#c08860');
  // 手臂 + 工具
  const id = HOTBAR[sel];
  if (p.swing > 0) {
    const t = 1 - p.swing / 0.28, ang = (-1.9 + t * 2.6) * f;
    ctx.save(); ctx.translate(sx + (f > 0 ? 7 : 5) * z, sy + 12 * z); ctx.rotate(ang);
    ctx.fillStyle = '#f0c090'; ctx.fillRect(-1.5 * z, -8 * z, 3 * z, 8 * z);
    const [img, ix] = itemIcon(id);
    if (f < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, ix, 0, T, T, -3 * z, -22 * z, T * z, T * z);
    ctx.restore();
  } else { R(8, 10, 3, 8, '#f0c090'); R(8, 10, 3, 3, shirt); }
}

function drawSlime(e, z) {
  const sq = clamp(e.vy * 0.03, -0.25, 0.25), wpx = Math.round(14 * (1 - sq)), hpx = Math.round(11 * (1 + sq));
  const bx = Math.floor((e.x + e.w / 2) * T * z) - Math.floor(camX * z) - Math.floor(wpx * z / 2);
  const by = Math.floor((e.y + e.h) * T * z) - Math.floor(camY * z) - hpx * z;
  const c = e.hit > 0 ? ['#fff', '#fff', '#fff'] : e.col;
  ctx.fillStyle = c[2]; ctx.fillRect(bx + 2 * z, by, (wpx - 4) * z, hpx * z); ctx.fillRect(bx, by + 3 * z, wpx * z, (hpx - 3) * z);
  ctx.fillStyle = c[0]; ctx.fillRect(bx + 3 * z, by + z, (wpx - 6) * z, (hpx - 2) * z); ctx.fillRect(bx + z, by + 4 * z, (wpx - 2) * z, (hpx - 5) * z);
  ctx.fillStyle = c[1]; ctx.fillRect(bx + 3 * z, by + 2 * z, 3 * z, 2 * z);
  ctx.fillStyle = '#10200f'; const ex = player.x > e.x ? 1 : 0;
  ctx.fillRect(bx + (4 + ex) * z, by + 5 * z, 2 * z, 2 * z); ctx.fillRect(bx + (wpx - 7 + ex) * z, by + 5 * z, 2 * z, 2 * z);
  if (e.hp < e.max) {
    ctx.fillStyle = '#401018'; ctx.fillRect(bx, by - 4 * z, wpx * z, 2 * z);
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(bx, by - 4 * z, Math.round(wpx * z * e.hp / e.max), 2 * z);
  }
}

function render(now) {
  const z = zoom, TS = T * z, d = daylight();
  const vw = cw / z, vh = ch / z;
  camX = clamp((player.x + player.w / 2) * T - vw / 2, 0, Math.max(0, W * T - vw));
  camY = clamp((player.y + player.h / 2) * T - vh * 0.48, -vh, Math.max(0, H * T - vh));
  const ox = Math.floor(camX * z), oy = Math.floor(camY * z);
  const x0 = Math.max(0, Math.floor(camX / T)), x1 = Math.min(W - 1, Math.floor((camX + vw) / T));
  const y0 = Math.max(0, Math.floor(camY / T)), y1 = Math.min(H - 1, Math.floor((camY + vh) / T));

  drawSky(d, now);
  const M = 10;
  computeLight(x0 - M, y0 - M, x1 + M, y1 + M, Math.round(6 + 9 * d));

  // 墙 + 方块
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x, t = tiles[i], sx = x * TS - ox, sy = y * TS - oy;
    const L = light[(y - ly0) * lw + (x - lx0)];
    if (L === 0) { ctx.fillStyle = '#000'; ctx.fillRect(sx, sy, TS, TS); continue; }
    if (walls[i] && !SOLID[t]) ctx.drawImage(atlas, walls[i] * T, T, T, T, sx, sy, TS, TS);
    if (t !== AIR) ctx.drawImage(atlas, t * T, 0, T, T, sx, sy, TS, TS);
  }
  // 挖掘裂纹
  if (mine.x >= 0 && mine.p > 0) ctx.drawImage(atlas, Math.min(3, Math.floor(mine.p * 4)) * T, 2 * T, T, T, mine.x * TS - ox, mine.y * TS - oy, TS, TS);

  // 实体
  for (const e of enemies) drawSlime(e, z);
  drawPlayer(Math.floor(player.x * TS) - ox - Math.round(2 * z), Math.floor((player.y + player.h) * TS) - oy - 28 * z, z);
  for (const q of parts) { ctx.fillStyle = q.col; ctx.fillRect(Math.floor(q.x * TS) - ox, Math.floor(q.y * TS) - oy, 2 * z, 2 * z); }

  // 光照遮罩
  let lastA = -1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * W + x, t = tiles[i];
    if (t === AIR && !walls[i]) continue;
    const L = light[(y - ly0) * lw + (x - lx0)];
    if (L >= 15 || L === 0) continue;
    if (L !== lastA) { ctx.fillStyle = `rgba(0,0,8,${(1 - L / 15).toFixed(3)})`; lastA = L; }
    ctx.fillRect(x * TS - ox, y * TS - oy, TS, TS);
  }
  // 火把暖光
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (tiles[y * W + x] === TORCH) {
    const fl = 0.10 + Math.sin(now * 9 + x * 3) * 0.03;
    ctx.fillStyle = `rgba(255,170,60,${fl})`; ctx.fillRect((x - 2) * TS - ox, (y - 2) * TS - oy, TS * 5, TS * 5);
    ctx.fillRect((x - 1) * TS - ox, (y - 1) * TS - oy, TS * 3, TS * 3);
  }

  // 选中方块提示框
  if (ptr.down) {
    const [wx, wy] = ptrWorld(), tx = Math.floor(wx), ty = Math.floor(wy);
    const ok = Math.hypot(tx + 0.5 - player.x - player.w / 2, ty + 0.5 - player.y - player.h / 2) <= 5.5;
    ctx.strokeStyle = ok ? 'rgba(255,255,255,.85)' : 'rgba(255,80,80,.7)'; ctx.lineWidth = z;
    ctx.strokeRect(tx * TS - ox + z / 2, ty * TS - oy + z / 2, TS - z, TS - z);
  }
  // 飘字
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

// ───────────────────────── HUD / DOM ─────────────────────────
const $ = id => document.getElementById(id);
let slotEls = [], toastTimer = 0;

function iconCanvas(src) {
  const c = mkCanvas(T, T); const [img, ix] = src;
  c.getContext('2d').drawImage(img, ix, 0, T, T, 0, 0, T, T); return c;
}
function buildHotbar() {
  const bar = $('hotbar'); bar.innerHTML = ''; slotEls = [];
  HOTBAR.forEach((id, k) => {
    const el = document.createElement('div'); el.className = 'slot px';
    el.appendChild(iconCanvas(itemIcon(id)));
    const n = document.createElement('span'); el.appendChild(n);
    el.addEventListener('pointerdown', ev => { ev.preventDefault(); sel = k; hudDirty = true; sfx(700, 0.03, 'square', 0.03); });
    bar.appendChild(el); slotEls.push({ el, n, id });
  });
}
function refreshHUD() {
  hudDirty = false;
  slotEls.forEach((s, k) => {
    const tool = ITEMS[s.id].tool;
    s.el.className = 'slot px' + (k === sel ? ' sel' : '') + (!tool && inv[s.id] <= 0 ? ' empty' : '');
    s.n.textContent = tool ? '' : inv[s.id];
  });
  const hp = Math.max(0, Math.ceil(player.hp));
  $('hpfill').style.width = hp + '%'; $('hptext').textContent = hp;
  $('coins').textContent = '◎' + coins;
  if ($('craft').classList.contains('show')) buildCraft();
}
function toast(msg, ms) {
  const el = $('toast'); el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2600);
}
function buildCraft() {
  const res = $('res'); res.innerHTML = '';
  ['wood', 'copper', 'iron', 'gold'].forEach(id => {
    const d = document.createElement('div'); d.appendChild(iconCanvas(itemIcon(id)));
    d.appendChild(document.createTextNode(ITEMS[id].name + ' ' + inv[id])); res.appendChild(d);
  });
  const box = $('recipes'); box.innerHTML = '';
  RECIPES.forEach(rc => {
    const row = document.createElement('div'); row.className = 'rec';
    row.appendChild(iconCanvas(rc.icon()));
    const d = document.createElement('div'); d.className = 'd';
    const cost = Object.keys(rc.cost).map(k => ITEMS[k].name + '×' + rc.cost[k]).join(' + ');
    d.innerHTML = rc.name + ' <small>' + rc.desc + '</small><br><small>需要: ' + cost + '</small>';
    const b = document.createElement('button');
    const owned = rc.once && up[rc.once], can = Object.keys(rc.cost).every(k => inv[k] >= rc.cost[k]);
    b.textContent = owned ? '已拥有' : '制作'; b.disabled = owned || !can;
    b.addEventListener('click', () => {
      Object.keys(rc.cost).forEach(k => { inv[k] -= rc.cost[k]; });
      if (rc.once) { up[rc.once] = true; buildHotbar(); toast('获得 ' + rc.name + '！'); } else rc.make();
      sfx(880, 0.1, 'square', 0.06); refreshHUD();
    });
    row.appendChild(d); row.appendChild(b); box.appendChild(row);
  });
}

function bindInput() {
  const hold = (id, key) => {
    const el = $(id);
    const set = v => ev => { ev.preventDefault(); input[key] = v; el.classList.toggle('on', v); if (v && el.setPointerCapture) { try { el.setPointerCapture(ev.pointerId); } catch (e) { /* */ } } };
    el.addEventListener('pointerdown', set(true));
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => el.addEventListener(n, set(false)));
  };
  hold('left', 'l'); hold('right', 'r'); hold('jump', 'j');

  canvas.addEventListener('pointerdown', ev => { ev.preventDefault(); ptr.down = true; ptr.id = ev.pointerId; ptr.x = ev.clientX; ptr.y = ev.clientY; });
  canvas.addEventListener('pointermove', ev => { if (ev.pointerId === ptr.id) { ptr.x = ev.clientX; ptr.y = ev.clientY; } });
  const end = ev => { if (ev.pointerId === ptr.id) { ptr.down = false; ptr.id = -1; } };
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => canvas.addEventListener(n, end));

  const toggleCraft = show => { $('craft').classList.toggle('show', show); if (show) buildCraft(); };
  $('bagBtn').addEventListener('click', () => toggleCraft(true));
  $('closeCraft').addEventListener('click', () => toggleCraft(false));
  $('craft').addEventListener('click', ev => { if (ev.target === $('craft')) toggleCraft(false); });

  const km = { KeyA: 'l', ArrowLeft: 'l', KeyD: 'r', ArrowRight: 'r', Space: 'j', KeyW: 'j', ArrowUp: 'j' };
  window.addEventListener('keydown', ev => {
    if (km[ev.code]) { input[km[ev.code]] = true; ev.preventDefault(); }
    else if (ev.code === 'KeyE') toggleCraft(!$('craft').classList.contains('show'));
    else if (/^Digit[1-9]$/.test(ev.code)) { const k = +ev.code[5] - 1; if (k < HOTBAR.length) { sel = k; hudDirty = true; } }
  });
  window.addEventListener('keyup', ev => { if (km[ev.code]) input[km[ev.code]] = false; });
  window.addEventListener('blur', () => { input.l = input.r = input.j = false; ptr.down = false; });
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', () => setTimeout(resize, 200));
  ['contextmenu', 'gesturestart', 'dblclick'].forEach(n => document.addEventListener(n, ev => ev.preventDefault()));
  document.addEventListener('touchmove', ev => { if (!ev.target.closest || !ev.target.closest('#craftBox,#hotbar')) ev.preventDefault(); }, { passive: false });
}

// ───────────────────────── 主循环 ─────────────────────────
let last = 0;
function frame(ms) {
  const now = ms / 1000; let dt = Math.min(0.1, now - last); last = now;
  if (running) {
    timeAcc += dt;
    while (timeAcc >= 1 / 60) { update(1 / 60); timeAcc -= 1 / 60; }
    $('clock').textContent = daylight() > 0.4 ? '☀' : '☾';
  }
  render(now);
  if (hudDirty) refreshHUD();
  requestAnimationFrame(frame);
}

function boot() {
  canvas = $('game'); ctx = canvas.getContext('2d');
  genWorld((Math.random() * 1e9) | 0);
  buildArt(); buildBackdrop(); resize(); respawn(); player.inv = 0;
  buildHotbar(); bindInput();
  $('startBtn').addEventListener('click', () => {
    $('title').style.display = 'none'; running = true;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
    toast('选「镐」点住方块挖掘 · 砍树得木头 · 选方块后点击放置', 4500);
  });
  requestAnimationFrame(frame);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { genWorld, tiles, walls, surf, player, respawn, update, render, boot, input, ptr, inv, breakTile, tryPlace, computeLight, getT, W, H,
    state: () => ({ enemies, spawnX, spawnY, light, lw, lh }) };
} else {
  boot();
}
