'use strict';

/**
 * 星核工厂 — 与界面无关的模拟层。
 * 开采、传送带、路由器、炮塔供弹、波次与寻路都在这里。
 */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.StarworksSim = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DX = [1, 0, -1, 0];
  const DY = [0, 1, 0, -1];
  const DIR_NAME = ['右', '下', '左', '上'];

  const MAP_W = 16;
  const MAP_H = 20;
  const CORE_HP = 980;
  const BELT_SPEED = 2.2;
  const MIN_GAP = 0.36;
  const LAUNCH_WAVE = 5;
  const LAUNCH_COST = { copper: 180, lead: 80, coal: 40, titanium: 24, graphite: 16 };
  const ITEM_KEYS = ['copper', 'lead', 'coal', 'titanium', 'graphite'];
  const LANES = [3, 7, 12];

  const BUILDINGS = {
    drill: {
      name: '机械钻', cat: 'prod', cost: { copper: 12 },
      solid: true, hp: 170, power: 0, unlockWave: 0,
      desc: '挖脚下的矿，从箭头方向送出',
    },
    tidrill: {
      name: '钛钻', cat: 'prod', cost: { copper: 18, titanium: 12 },
      solid: true, hp: 230, power: 40, unlockWave: 4,
      desc: '挖得更快，没电就停',
    },
    press: {
      name: '石墨压机', cat: 'prod', cost: { copper: 20, lead: 12 },
      solid: true, hp: 190, power: 18, unlockWave: 3,
      desc: '2 煤压成 1 石墨，需要电力',
    },
    belt: {
      name: '传送带', cat: 'logi', cost: { copper: 1 },
      solid: false, hp: 60, power: 0, unlockWave: 0,
      desc: '拖动可连续铺设',
    },
    router: {
      name: '路由器', cat: 'logi', cost: { copper: 3 },
      solid: false, hp: 100, power: 0, unlockWave: 0,
      desc: '把物品轮流分到各个出口',
    },
    junction: {
      name: '交叉器', cat: 'logi', cost: { copper: 4 },
      solid: false, hp: 100, power: 0, unlockWave: 1,
      desc: '两条带子十字穿过，互不干扰',
    },
    cwall: {
      name: '铜墙', cat: 'def', cost: { copper: 6 },
      solid: true, hp: 320, power: 0, unlockWave: 0,
      desc: '挡住地面敌人',
    },
    lwall: {
      name: '铅墙', cat: 'def', cost: { lead: 8 },
      solid: true, hp: 580, power: 0, unlockWave: 2,
      desc: '更厚的墙',
    },
    duo: {
      name: '双管炮', cat: 'def', cost: { copper: 35 },
      solid: true, hp: 240, power: 0, unlockWave: 0,
      desc: '吃铜，对地也对空',
      turret: { range: 6.6, dmg: 14, reload: 0.3, ammo: 'copper', ammoMax: 30, air: 1, ground: 1 },
    },
    scatter: {
      name: '散射炮', cat: 'def', cost: { copper: 22, lead: 18 },
      solid: true, hp: 220, power: 0, unlockWave: 2,
      desc: '吃铅，专克飞行单位',
      turret: { range: 5.8, dmg: 5, reload: 0.14, ammo: 'lead', ammoMax: 36, air: 2.2, ground: 0.35, pellets: 3, spread: 0.4 },
    },
    salvo: {
      name: '齐射炮', cat: 'def', cost: { copper: 42, lead: 20, graphite: 12 },
      solid: true, hp: 300, power: 24, unlockWave: 4,
      desc: '吃石墨，小范围溅射，需要电力',
      turret: { range: 7.5, dmg: 30, reload: 0.68, ammo: 'graphite', ammoMax: 18, air: 1, ground: 1, splash: 0.95 },
    },
    repair: {
      name: '修复器', cat: 'def', cost: { copper: 26, lead: 16 },
      solid: true, hp: 180, power: 16, unlockWave: 5,
      desc: '修复附近建筑和星核，需要电力',
    },
    generator: {
      name: '燃煤机', cat: 'power', cost: { copper: 24, lead: 10 },
      solid: true, hp: 200, power: 0, unlockWave: 3, supply: 100,
      desc: '烧煤，给全图供电',
    },
  };

  const ENEMIES = {
    crawler: { name: '爬虫', hp: 36, speed: 1.0, dmg: 8, cd: 0.55, flying: false, radius: 0.28 },
    rusher: { name: '疾行', hp: 22, speed: 1.78, dmg: 6, cd: 0.4, flying: false, radius: 0.22 },
    armored: { name: '甲壳', hp: 128, speed: 0.56, dmg: 16, cd: 0.7, flying: false, radius: 0.36 },
    wasp: { name: '飞螳', hp: 30, speed: 1.25, dmg: 9, cd: 0.48, flying: true, radius: 0.24 },
    boss: { name: '巨螯', hp: 680, speed: 0.38, dmg: 24, cd: 0.52, flying: false, radius: 0.55, boss: true },
  };

  const WAVE_DEFS = [
    { name: '侦察爬虫', hint: '只走中间', groups: [{ type: 'crawler', n: 5, lane: 1, every: 1.2 }] },
    {
      name: '三路试探', hint: '左右也会来', groups: [
        { type: 'crawler', n: 4, lane: 1, every: 1.0 },
        { type: 'crawler', n: 3, lane: 0, every: 1.3 },
        { type: 'crawler', n: 3, lane: 2, every: 1.3 },
      ],
    },
    {
      name: '空中单位', hint: '散射炮克制飞螳', groups: [
        { type: 'crawler', n: 4, lane: 1, every: 0.95 },
        { type: 'wasp', n: 4, lane: 1, every: 1.35 },
        { type: 'wasp', n: 2, lane: 2, every: 1.6 },
      ],
    },
    {
      name: '甲壳推进', hint: '厚血，用墙拖时间', groups: [
        { type: 'armored', n: 3, lane: 1, every: 1.65 },
        { type: 'rusher', n: 5, lane: 0, every: 0.72 },
        { type: 'crawler', n: 4, lane: 2, every: 0.9 },
      ],
    },
    {
      name: '混合风暴', hint: '三路一起压', groups: [
        { type: 'wasp', n: 5, lane: 0, every: 0.8 },
        { type: 'armored', n: 3, lane: 1, every: 1.45 },
        { type: 'rusher', n: 6, lane: 2, every: 0.62 },
        { type: 'crawler', n: 4, lane: 1, every: 0.75 },
      ],
    },
    {
      name: '巨螯来袭', hint: '首领', boss: true, groups: [
        { type: 'boss', n: 1, lane: 1, every: 1 },
        { type: 'crawler', n: 6, lane: 0, every: 0.65 },
        { type: 'wasp', n: 4, lane: 2, every: 0.95 },
        { type: 'rusher', n: 4, lane: 1, every: 0.85 },
      ],
    },
  ];

  const ROTATABLE = { drill: 1, tidrill: 1, belt: 1, press: 1 };
  const ORE_OK = { belt: 1, router: 1, junction: 1, drill: 1, tidrill: 1 };
  const ORE_AMOUNT = { copper: 520, lead: 420, coal: 380, titanium: 300 };

  function opposite(d) { return (d + 2) & 3; }

  function hash(x, y) {
    let n = (x * 374761393 + y * 668265263) | 0;
    n = (n ^ (n >>> 13)) | 0;
    n = Math.imul(n, 1274126177);
    return (n ^ (n >>> 16)) >>> 0;
  }

  function rng(state) {
    state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
    return state.seed / 4294967296;
  }

  function emit(state, e) {
    state.events.push(e);
    if (state.events.length > 500) state.events.splice(0, state.events.length - 300);
  }

  function blankGrid(w, h) {
    const g = new Array(h);
    for (let y = 0; y < h; y++) g[y] = new Array(w).fill(null);
    return g;
  }

  function inBounds(state, x, y) {
    return x >= 0 && y >= 0 && x < state.w && y < state.h;
  }

  function isCoreTile(state, x, y) {
    const c = state.core;
    return x >= c.x && x < c.x + 2 && y >= c.y && y < c.y + 2;
  }

  function buildingAt(state, x, y) {
    if (!inBounds(state, x, y)) return null;
    return state.grid[y][x];
  }

  function blockedTile(state, x, y) {
    if (!inBounds(state, x, y)) return true;
    const tile = state.tiles[y][x];
    if (tile.kind === 'rock') return true;
    if (isCoreTile(state, x, y)) return true;
    const b = state.grid[y][x];
    if (b && BUILDINGS[b.type].solid) return true;
    return false;
  }

  function walkable(state, x, y) {
    return inBounds(state, x, y) && !blockedTile(state, x, y);
  }

  function canAfford(state, cost) {
    for (const k in cost) if ((state.inv[k] || 0) < cost[k]) return false;
    return true;
  }

  function pay(state, cost) {
    for (const k in cost) state.inv[k] -= cost[k];
  }

  function refund(state, cost) {
    for (const k in cost) state.inv[k] = (state.inv[k] || 0) + cost[k];
  }

  function makeBuilding(state, type, x, y, dir) {
    const def = BUILDINGS[type];
    return {
      id: state.nextId++,
      type, x, y,
      dir: (dir == null ? 1 : dir) & 3,
      hp: def.hp,
      maxHp: def.hp,
      items: [],
      buffer: [],
      ammo: 0,
      progress: 0,
      burn: 0,
      fuel: 0,
      input: 0,
      outBuf: [],
      craft: 0,
      rr: 0,
      cd: 0,
      reload: 0.2,
      angle: ((dir == null ? 1 : dir) & 3) * Math.PI / 2,
      targetId: 0,
      stalled: false,
      empty: false,
      unpowered: false,
    };
  }

  function defaultDir(state, x, y) {
    const cx = state.core.x + 1;
    const cy = state.core.y + 1;
    const dx = cx - (x + 0.5);
    const dy = cy - (y + 0.5);
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 0 : 2;
    return dy > 0 ? 1 : 3;
  }

  function paintOre(tiles, x, y, ore) {
    const t = tiles[y] && tiles[y][x];
    if (!t || t.kind !== 'ground') return;
    t.ore = ore;
    t.oreLeft = ORE_AMOUNT[ore];
  }

  function generateTiles() {
    const tiles = [];
    const spawns = { 3: 1, 7: 1, 12: 1 };
    for (let y = 0; y < MAP_H; y++) {
      const row = [];
      for (let x = 0; x < MAP_W; x++) {
        let kind = 'ground';
        if (y <= 1) kind = (y === 0 && spawns[x]) ? 'spawn' : 'hazard';
        else if (x === 0 || x === MAP_W - 1) kind = 'rock';
        row.push({
          kind,
          ore: null,
          oreLeft: 0,
          variant: hash(x, y) & 3,
          deco: (y === 11 && kind === 'ground') ? 'river' : null,
        });
      }
      tiles.push(row);
    }
    const rocks = [];
    for (let y = 2; y <= 5; y++) rocks.push([5, y], [10, y]);
    rocks.push([5, 8], [10, 8], [3, 17], [4, 18]);
    for (const [x, y] of rocks) {
      if (tiles[y][x].kind === 'ground') tiles[y][x].kind = 'rock';
    }
    const veins = [
      ['copper', [[1, 12], [2, 12], [1, 13], [2, 13], [1, 14], [2, 14]]],
      ['copper', [[12, 12], [13, 12], [14, 12], [12, 13], [13, 13], [14, 13]]],
      ['lead', [[1, 9], [2, 9], [1, 10], [2, 10], [13, 9], [14, 9], [13, 10], [14, 10]]],
      ['coal', [[1, 6], [2, 6], [1, 7], [2, 7], [13, 6], [14, 6], [13, 7], [14, 7]]],
      ['titanium', [[12, 17], [13, 17], [14, 17], [13, 18], [14, 18]]],
    ];
    for (const [ore, cells] of veins) {
      for (const [x, y] of cells) paintOre(tiles, x, y, ore);
    }
    return tiles;
  }

  function emptyInv() {
    return { copper: 0, lead: 0, coal: 0, titanium: 0, graphite: 0 };
  }

  function createState(opts) {
    opts = opts || {};
    const state = {
      v: 1,
      w: MAP_W,
      h: MAP_H,
      tiles: generateTiles(),
      buildings: [],
      grid: blankGrid(MAP_W, MAP_H),
      core: { x: 7, y: 16, hp: CORE_HP, maxHp: CORE_HP },
      inv: emptyInv(),
      produced: emptyInv(),
      waveIndex: 0,
      waveActive: false,
      waveName: '',
      waveHint: '',
      waveScale: 1,
      prepTime: opts.bare ? 8 : 40,
      spawnTimer: 0,
      spawnQueue: [],
      enemies: [],
      projectiles: [],
      flow: null,
      flowDist: null,
      flowDirty: true,
      unlocked: {},
      launchUnlocked: false,
      speed: 1,
      paused: false,
      over: false,
      time: 0,
      seed: opts.seed || 0x51a7c0de,
      nextId: 1,
      events: [],
      power: { supply: 0, demand: 0, ratio: 1 },
      stats: {
        kills: 0,
        placed: 0,
        delivered: 0,
        crafted: 0,
        mined: emptyInv(),
      },
      tutorialStep: 0,
      sector: '锈河 7-C',
    };
    state.inv.copper = opts.bare ? 0 : 110;
    for (const id of Object.keys(BUILDINGS)) {
      state.unlocked[id] = BUILDINGS[id].unlockWave <= 0;
    }
    if (!opts.bare) addStarter(state);
    rebuildGrid(state);
    recomputeFlow(state);
    return state;
  }

  function addStarter(state) {
    const drill = makeBuilding(state, 'drill', 2, 13, 0);
    state.buildings.push(drill);
    const belts = [
      [3, 13, 0], [4, 13, 0], [5, 13, 0], [6, 13, 0],
      [7, 13, 1], [7, 14, 1], [7, 15, 1],
    ];
    belts.forEach(([x, y, dir], i) => {
      const b = makeBuilding(state, 'belt', x, y, dir);
      if (i === 1) b.items.push({ type: 'copper', t: 0.25, fresh: false });
      if (i === 4) b.items.push({ type: 'copper', t: 0.62, fresh: false });
      state.buildings.push(b);
    });
  }

  function rebuildGrid(state) {
    for (let y = 0; y < state.h; y++) {
      for (let x = 0; x < state.w; x++) state.grid[y][x] = null;
    }
    for (const b of state.buildings) {
      if (inBounds(state, b.x, b.y)) state.grid[b.y][b.x] = b;
    }
  }

  function recomputeFlow(state) {
    const w = state.w;
    const h = state.h;
    const dist = new Int16Array(w * h);
    dist.fill(-1);
    const flow = new Int8Array(w * h);
    flow.fill(-1);
    const q = [];
    const core = state.core;
    for (let y = core.y - 1; y <= core.y + 2; y++) {
      for (let x = core.x - 1; x <= core.x + 2; x++) {
        if (!walkable(state, x, y)) continue;
        const sharesEdge =
          (x >= core.x && x < core.x + 2 && (y === core.y - 1 || y === core.y + 2)) ||
          (y >= core.y && y < core.y + 2 && (x === core.x - 1 || x === core.x + 2));
        if (!sharesEdge) continue;
        const i = y * w + x;
        dist[i] = 0;
        flow[i] = -2;
        q.push(x, y);
      }
    }
    for (let qi = 0; qi < q.length; qi += 2) {
      const x = q[qi];
      const y = q[qi + 1];
      const cd = dist[y * w + x];
      for (let d = 0; d < 4; d++) {
        const nx = x + DX[d];
        const ny = y + DY[d];
        if (!walkable(state, nx, ny)) continue;
        const ni = ny * w + nx;
        if (dist[ni] !== -1) continue;
        dist[ni] = cd + 1;
        flow[ni] = opposite(d);
        q.push(nx, ny);
      }
    }
    state.flow = flow;
    state.flowDist = dist;
    state.flowDirty = false;
  }

  function place(state, type, x, y, dir) {
    if (state.over) return { ok: false, reason: 'over' };
    const def = BUILDINGS[type];
    if (!def) return { ok: false, reason: 'type' };
    if (!state.unlocked[type]) return { ok: false, reason: 'locked', wave: def.unlockWave };
    if (!inBounds(state, x, y)) return { ok: false, reason: 'bounds' };
    const tile = state.tiles[y][x];
    if (tile.kind === 'rock' || tile.kind === 'hazard' || tile.kind === 'spawn') {
      return { ok: false, reason: 'blocked' };
    }
    if (isCoreTile(state, x, y)) return { ok: false, reason: 'blocked' };
    if (state.grid[y][x]) return { ok: false, reason: 'occupied' };
    if (tile.ore && !ORE_OK[type]) return { ok: false, reason: 'ore' };
    if ((type === 'drill' || type === 'tidrill') && !tile.ore) return { ok: false, reason: 'need-ore' };
    if (!canAfford(state, def.cost)) return { ok: false, reason: 'cost' };
    pay(state, def.cost);
    const useDir = dir == null ? defaultDir(state, x, y) : (dir & 3);
    const b = makeBuilding(state, type, x, y, useDir);
    state.buildings.push(b);
    state.grid[y][x] = b;
    if (def.solid) state.flowDirty = true;
    state.stats.placed++;
    emit(state, { type: 'place', x, y, building: type });
    return { ok: true, building: b };
  }

  function demolish(state, x, y) {
    if (!inBounds(state, x, y)) return { ok: false, reason: 'bounds' };
    if (isCoreTile(state, x, y)) return { ok: false, reason: 'core' };
    const b = state.grid[y][x];
    if (!b) return { ok: false, reason: 'empty' };
    const def = BUILDINGS[b.type];
    refund(state, def.cost);
    state.buildings = state.buildings.filter((o) => o !== b);
    state.grid[y][x] = null;
    if (def.solid) state.flowDirty = true;
    emit(state, { type: 'demolish', x, y, building: b.type, refund: def.cost });
    return { ok: true, refund: def.cost };
  }

  function rotateBuilding(state, x, y) {
    if (!inBounds(state, x, y)) return { ok: false, reason: 'bounds' };
    const b = state.grid[y][x];
    if (!b) return { ok: false, reason: 'empty' };
    if (!ROTATABLE[b.type]) return { ok: false, reason: 'fixed' };
    b.dir = (b.dir + 1) & 3;
    b.angle = b.dir * Math.PI / 2;
    emit(state, { type: 'rotate', x, y, dir: b.dir });
    return { ok: true, dir: b.dir };
  }

  function loadTurret(state, x, y, n) {
    if (!inBounds(state, x, y)) return { ok: false, reason: 'bounds' };
    const b = state.grid[y][x];
    const tdef = b && BUILDINGS[b.type].turret;
    if (!tdef) return { ok: false, reason: 'empty' };
    const space = tdef.ammoMax - b.ammo;
    const have = state.inv[tdef.ammo] || 0;
    const move = Math.min(n || 10, space, have);
    if (move <= 0) return { ok: false, reason: have <= 0 ? 'cost' : 'full', ammo: tdef.ammo };
    state.inv[tdef.ammo] -= move;
    b.ammo += move;
    emit(state, { type: 'load', x, y, n: move, ammo: tdef.ammo });
    return { ok: true, moved: move, ammo: tdef.ammo };
  }

  function acceptItem(state, x, y, itemType, fromDir) {
    if (!inBounds(state, x, y)) return false;
    if (isCoreTile(state, x, y)) {
      if (state.inv[itemType] == null) return false;
      state.inv[itemType]++;
      state.produced[itemType]++;
      state.stats.delivered++;
      emit(state, { type: 'deliver', item: itemType, x, y });
      return true;
    }
    const b = state.grid[y][x];
    if (!b) return false;
    if (b.type === 'belt') {
      if (fromDir === opposite(b.dir)) return false;
      if (b.items.length >= 4) return false;
      if (b.items.some((it) => !it.dead && it.t < MIN_GAP)) return false;
      b.items.push({ type: itemType, t: 0, fresh: true });
      return true;
    }
    if (b.type === 'router') {
      if (b.buffer.length >= 6) return false;
      b.buffer.push(itemType);
      return true;
    }
    if (b.type === 'junction') {
      if (b.items.some((it) => !it.dead && it.dir === fromDir && it.t < MIN_GAP)) return false;
      if (b.items.length >= 8) return false;
      b.items.push({ type: itemType, t: 0, dir: fromDir, fresh: true });
      return true;
    }
    const tdef = BUILDINGS[b.type].turret;
    if (tdef) {
      if (itemType !== tdef.ammo) return false;
      if (b.ammo >= tdef.ammoMax) return false;
      b.ammo++;
      return true;
    }
    if (b.type === 'press' && itemType === 'coal') {
      if (b.input >= 8) return false;
      b.input++;
      return true;
    }
    if (b.type === 'generator' && itemType === 'coal') {
      if (b.fuel >= 12) return false;
      b.fuel++;
      return true;
    }
    return false;
  }

  function tryOutput(state, b, itemType) {
    return acceptItem(state, b.x + DX[b.dir], b.y + DY[b.dir], itemType, b.dir);
  }

  function spaceItems(items) {
    const live = items.filter((it) => !it.dead);
    live.sort((a, b) => b.t - a.t);
    let limit = 99;
    for (const it of live) {
      if (it.t > limit) it.t = limit;
      limit = it.t - MIN_GAP;
    }
  }

  function updateLogistics(state, dt) {
    const movers = [];
    for (const b of state.buildings) {
      if (b.type === 'belt' || b.type === 'junction') movers.push(b);
    }
    for (const b of movers) {
      for (const it of b.items) {
        if (it.fresh || it.dead) continue;
        it.t += BELT_SPEED * dt;
      }
      if (b.type === 'belt') spaceItems(b.items);
      else {
        for (let d = 0; d < 4; d++) spaceItems(b.items.filter((it) => it.dir === d));
      }
    }
    for (const b of movers) {
      if (b.type === 'belt') exitBelt(state, b);
      else {
        for (let d = 0; d < 4; d++) exitJunction(state, b, d);
      }
    }
    for (const b of state.buildings) {
      if (b.type !== 'router') continue;
      b.cd = (b.cd || 0) - dt;
      if (b.cd > 0 || !b.buffer.length) continue;
      const itemType = b.buffer[0];
      for (let i = 0; i < 4; i++) {
        const d = (b.rr + i) & 3;
        if (acceptItem(state, b.x + DX[d], b.y + DY[d], itemType, d)) {
          b.buffer.shift();
          b.rr = (d + 1) & 3;
          b.cd = 0.06;
          break;
        }
      }
    }
    for (const b of movers) {
      for (const it of b.items) it.fresh = false;
      if (b.items.some((it) => it.dead)) b.items = b.items.filter((it) => !it.dead);
    }
  }

  function exitBelt(state, b) {
    if (!b.items.length) return;
    let front = null;
    for (const it of b.items) {
      if (it.dead) continue;
      if (!front || it.t > front.t) front = it;
    }
    if (!front || front.fresh || front.t < 1) return;
    if (acceptItem(state, b.x + DX[b.dir], b.y + DY[b.dir], front.type, b.dir)) {
      front.dead = true;
    } else {
      front.t = 1;
      spaceItems(b.items);
    }
  }

  function exitJunction(state, b, dir) {
    let front = null;
    for (const it of b.items) {
      if (it.dead || it.dir !== dir) continue;
      if (!front || it.t > front.t) front = it;
    }
    if (!front || front.fresh || front.t < 1) return;
    if (acceptItem(state, b.x + DX[dir], b.y + DY[dir], front.type, dir)) front.dead = true;
    else front.t = 1;
  }

  function updateProduction(state, dt) {
    const ratio = state.power.ratio;
    for (const b of state.buildings) {
      b.stalled = false;
      b.empty = false;
      b.unpowered = false;
      if (b.type === 'drill' || b.type === 'tidrill') updateDrill(state, b, dt, ratio);
      else if (b.type === 'press') updatePress(state, b, dt, ratio);
      else if (b.type === 'generator') updateGenerator(state, b, dt);
    }
  }

  function updateDrill(state, b, dt, ratio) {
    const tile = state.tiles[b.y][b.x];
    if (!tile.ore || tile.oreLeft <= 0) {
      b.empty = true;
      b.stalled = true;
      return;
    }
    let rate = b.type === 'tidrill' ? 2.15 : 0.92;
    if (b.type === 'tidrill') {
      if (ratio <= 0) {
        b.unpowered = true;
        b.stalled = true;
        return;
      }
      rate *= ratio;
    }
    b.progress += rate * dt;
    if (b.progress < 1) return;
    const ore = tile.ore;
    if (!tryOutput(state, b, ore)) {
      b.progress = 1;
      b.stalled = true;
      return;
    }
    b.progress -= 1;
    tile.oreLeft--;
    state.stats.mined[ore]++;
    if (tile.oreLeft <= 0) {
      tile.ore = null;
      tile.oreLeft = 0;
      tile.deco = 'pit';
      emit(state, { type: 'depleted', x: b.x, y: b.y });
    }
  }

  function updatePress(state, b, dt, ratio) {
    if (b.outBuf.length && tryOutput(state, b, b.outBuf[0])) b.outBuf.shift();
    if (BUILDINGS.press.power && ratio <= 0) {
      b.unpowered = true;
      if (b.input > 0 || b.craft > 0) b.stalled = true;
      return;
    }
    const mul = BUILDINGS.press.power ? ratio : 1;
    if (b.craft > 0) {
      b.craft -= dt * mul;
      if (b.craft <= 0) {
        b.craft = 0;
        if (b.outBuf.length < 4) {
          b.outBuf.push('graphite');
          state.stats.crafted++;
        }
      }
    } else if (b.input >= 2 && b.outBuf.length < 4) {
      b.input -= 2;
      b.craft = 1.45;
    }
    if (b.outBuf.length >= 4) b.stalled = true;
  }

  function updateGenerator(state, b, dt) {
    const need = state.power.demand > 0;
    if (b.burn <= 0 && b.fuel > 0 && need) {
      b.fuel--;
      b.burn = 3.4;
    }
    if (need && b.burn > 0) b.burn -= dt;
    if (b.burn < 0) b.burn = 0;
    b.stalled = need && b.burn <= 0 && b.fuel <= 0;
  }

  function computePower(state) {
    let supply = 0;
    let demand = 0;
    for (const b of state.buildings) {
      const def = BUILDINGS[b.type];
      if (def.power) demand += def.power;
      if (b.type === 'generator' && b.burn > 0) supply += def.supply;
    }
    state.power = {
      supply,
      demand,
      ratio: demand <= 0 ? 1 : Math.min(1, supply / demand),
    };
  }

  function updateTurrets(state, dt) {
    const ratio = state.power.ratio;
    for (const b of state.buildings) {
      const tdef = BUILDINGS[b.type].turret;
      if (!tdef) continue;
      if (BUILDINGS[b.type].power) {
        if (ratio <= 0) {
          b.unpowered = true;
          b.stalled = true;
          continue;
        }
        b.reload -= dt * ratio;
      } else {
        b.reload -= dt;
      }
      if (b.reload < 0) b.reload = 0;
      const target = acquireTarget(state, b, tdef);
      if (!target) continue;
      const ang = Math.atan2(target.y - (b.y + 0.5), target.x - (b.x + 0.5));
      b.angle = ang;
      if (b.reload <= 0 && b.ammo > 0) {
        fire(state, b, tdef, target);
        b.ammo--;
        b.reload = tdef.reload;
      } else if (b.ammo <= 0) {
        b.stalled = true;
      }
    }
  }

  function acquireTarget(state, b, tdef) {
    const cx = b.x + 0.5;
    const cy = b.y + 0.5;
    if (b.targetId) {
      const stuck = state.enemies.find((e) => e.id === b.targetId && e.hp > 0);
      if (stuck && canShoot(tdef, stuck)) {
        const d = Math.hypot(stuck.x - cx, stuck.y - cy);
        if (d <= tdef.range + 0.25) return stuck;
      }
    }
    let best = null;
    let bestD = tdef.range;
    for (const e of state.enemies) {
      if (e.hp <= 0 || !canShoot(tdef, e)) continue;
      const d = Math.hypot(e.x - cx, e.y - cy);
      if (d <= bestD) {
        bestD = d;
        best = e;
      }
    }
    b.targetId = best ? best.id : 0;
    return best;
  }

  function canShoot(tdef, e) {
    if (e.flying) return tdef.air > 0;
    return tdef.ground > 0;
  }

  function fire(state, b, tdef, target) {
    const pellets = tdef.pellets || 1;
    const spread = tdef.spread || 0;
    const cx = b.x + 0.5;
    const cy = b.y + 0.5;
    const lead = 0.28;
    const tx = target.x + (target.vx || 0) * lead;
    const ty = target.y + (target.vy || 0) * lead;
    const base = Math.atan2(ty - cy, tx - cx);
    const speed = 10;
    for (let i = 0; i < pellets; i++) {
      const ang = base + (i - (pellets - 1) / 2) * spread;
      state.projectiles.push({
        x: cx + Math.cos(ang) * 0.35,
        y: cy + Math.sin(ang) * 0.35,
        vx: Math.cos(ang) * speed,
        vy: Math.sin(ang) * speed,
        dmg: tdef.dmg,
        splash: tdef.splash || 0,
        air: tdef.air,
        ground: tdef.ground,
        life: 1.05,
      });
    }
    if (state.projectiles.length > 90) state.projectiles.splice(0, state.projectiles.length - 90);
    emit(state, { type: 'shoot', x: cx, y: cy, building: b.type });
  }

  function hitEnemy(state, e, dmg) {
    if (e.hp <= 0 || dmg <= 0) return;
    e.hp -= dmg;
    e.flash = 0.08;
    if (e.hp <= 0) {
      e.hp = 0;
      e.dead = true;
      state.stats.kills++;
      emit(state, { type: 'kill', x: e.x, y: e.y, enemy: e.type, boss: !!ENEMIES[e.type].boss });
    }
  }

  function updateProjectiles(state, dt) {
    for (const p of state.projectiles) {
      p.life -= dt;
      if (p.life <= 0) {
        p.dead = true;
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      for (const e of state.enemies) {
        if (e.hp <= 0) continue;
        if (e.flying && p.air <= 0) continue;
        if (!e.flying && p.ground <= 0) continue;
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d > (e.radius || 0.28) + 0.12) continue;
        const mul = e.flying ? p.air : p.ground;
        hitEnemy(state, e, p.dmg * mul);
        if (p.splash) {
          for (const o of state.enemies) {
            if (o === e || o.hp <= 0) continue;
            const dd = Math.hypot(o.x - p.x, o.y - p.y);
            if (dd <= p.splash) hitEnemy(state, o, p.dmg * 0.5 * (o.flying ? p.air : p.ground));
          }
        }
        emit(state, { type: 'hit', x: p.x, y: p.y });
        p.dead = true;
        break;
      }
    }
    if (state.projectiles.some((p) => p.dead)) {
      state.projectiles = state.projectiles.filter((p) => !p.dead);
    }
  }

  function distToCore(state, e) {
    const x0 = state.core.x;
    const y0 = state.core.y;
    const x1 = x0 + 2;
    const y1 = y0 + 2;
    const cx = Math.max(x0, Math.min(e.x, x1));
    const cy = Math.max(y0, Math.min(e.y, y1));
    return Math.hypot(e.x - cx, e.y - cy);
  }

  function damageCore(state, dmg) {
    if (state.over) return;
    state.core.hp = Math.max(0, state.core.hp - dmg);
    emit(state, { type: 'coreHit', dmg, hp: state.core.hp });
    if (state.core.hp <= 0) {
      state.over = 'dead';
      emit(state, { type: 'gameover' });
    }
  }

  function damageBuilding(state, b, dmg) {
    b.hp -= dmg;
    emit(state, { type: 'hurt', x: b.x, y: b.y, building: b.type });
    if (b.hp <= 0) {
      state.buildings = state.buildings.filter((o) => o !== b);
      if (state.grid[b.y] && state.grid[b.y][b.x] === b) state.grid[b.y][b.x] = null;
      state.flowDirty = true;
      emit(state, { type: 'destroyed', x: b.x, y: b.y, building: b.type });
    }
  }

  function attackBuilding(state, e, b) {
    damageBuilding(state, b, e.dmg);
    e.cd = e.atkCd;
  }

  function moveEnemy(state, e, vx, vy, dt) {
    e.vx = vx;
    e.vy = vy;
    let moved = false;
    const nx = e.x + vx * dt;
    if (!blockedTile(state, Math.floor(nx), Math.floor(e.y))) {
      e.x = nx;
      moved = true;
    }
    const ny = e.y + vy * dt;
    if (!blockedTile(state, Math.floor(e.x), Math.floor(ny))) {
      e.y = ny;
      moved = true;
    }
    return moved;
  }

  function updateEnemies(state, dt) {
    const ccx = state.core.x + 1;
    const ccy = state.core.y + 1;
    for (const e of state.enemies) {
      if (e.hp <= 0) continue;
      e.flash = Math.max(0, (e.flash || 0) - dt);
      e.cd -= dt;
      if (e.flying) {
        const dx = ccx - e.x;
        const dy = ccy - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        const moved = moveEnemy(state, e, (dx / dist) * e.speed, (dy / dist) * e.speed, dt);
        if (distToCore(state, e) < 0.55 && e.cd <= 0) {
          damageCore(state, e.dmg);
          e.cd = e.atkCd;
        }
        if (!moved && distToCore(state, e) < 1.2 && e.cd <= 0) {
          damageCore(state, e.dmg);
          e.cd = e.atkCd;
        }
        continue;
      }
      if (distToCore(state, e) < 0.62) {
        e.vx = 0;
        e.vy = 0;
        if (e.cd <= 0) {
          damageCore(state, e.dmg);
          e.cd = e.atkCd;
        }
        continue;
      }
      const tx = Math.floor(e.x);
      const ty = Math.floor(e.y);
      let dir = -1;
      if (inBounds(state, tx, ty)) dir = state.flow[ty * state.w + tx];
      let vx = 0;
      let vy = 0;
      if (dir === -2 || dir < 0) {
        const dx = ccx - e.x;
        const dy = ccy - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        vx = (dx / dist) * e.speed;
        vy = (dy / dist) * e.speed;
      } else {
        const nx = tx + DX[dir] + 0.5;
        const ny = ty + DY[dir] + 0.5;
        const dx = nx - e.x;
        const dy = ny - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        vx = (dx / dist) * e.speed;
        vy = (dy / dist) * e.speed;
      }
      moveEnemy(state, e, vx, vy, dt);
      if (e.cd <= 0) {
        const ahead = blockedAhead(state, e, vx, vy);
        if (ahead) {
          if (isCoreTile(state, ahead[0], ahead[1])) {
            damageCore(state, e.dmg);
            e.cd = e.atkCd;
          } else {
            const blocker = buildingAt(state, ahead[0], ahead[1]);
            if (blocker && BUILDINGS[blocker.type].solid) attackBuilding(state, e, blocker);
          }
        }
      }
    }
    separate(state);
    if (state.enemies.some((e) => e.hp <= 0 || e.dead)) {
      state.enemies = state.enemies.filter((e) => e.hp > 0 && !e.dead);
    }
  }

  function blockedAhead(state, e, vx, vy) {
  const tx = Math.floor(e.x);
  const ty = Math.floor(e.y);
  let nx = tx;
  let ny = ty;
  if (Math.abs(vy) >= Math.abs(vx)) ny = ty + (vy >= 0 ? 1 : -1);
  else nx = tx + (vx >= 0 ? 1 : -1);
  if (!inBounds(state, nx, ny) || !blockedTile(state, nx, ny)) return null;
  const dist = Math.hypot((nx + 0.5) - e.x, (ny + 0.5) - e.y);
  if (dist > 1.15) return null;
  return [nx, ny];
}

function nearestSolid(state, e) {
    let best = null;
    let bestD = 1.15;
    for (const b of state.buildings) {
      if (!BUILDINGS[b.type].solid) continue;
      const d = Math.hypot(b.x + 0.5 - e.x, b.y + 0.5 - e.y);
      if (d < bestD) {
        bestD = d;
        best = b;
      }
    }
    return best;
  }

  function separate(state) {
    const list = state.enemies.filter((e) => !e.flying && e.hp > 0);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d = Math.hypot(dx, dy);
        const min = (a.radius + b.radius) * 0.8;
        if (d >= min) continue;
        if (d < 0.0001) {
          dx = 0.02;
          dy = 0;
          d = 0.02;
        }
        const push = (min - d) * 0.45;
        const ux = dx / d;
        const uy = dy / d;
        nudge(state, a, -ux * push, -uy * push);
        nudge(state, b, ux * push, uy * push);
      }
    }
  }

  function nudge(state, e, dx, dy) {
    const nx = e.x + dx;
    const ny = e.y + dy;
    if (!blockedTile(state, Math.floor(nx), Math.floor(e.y))) e.x = nx;
    if (!blockedTile(state, Math.floor(e.x), Math.floor(ny))) e.y = ny;
  }

  function updateRepair(state, dt) {
    if (state.power.ratio <= 0) return;
    for (const b of state.buildings) {
      if (b.type !== 'repair') continue;
      const amount = 16 * state.power.ratio * dt;
      const cx = b.x + 0.5;
      const cy = b.y + 0.5;
      for (const o of state.buildings) {
        if (o === b || o.hp >= o.maxHp) continue;
        if (Math.hypot(o.x + 0.5 - cx, o.y + 0.5 - cy) <= 3.15) {
          o.hp = Math.min(o.maxHp, o.hp + amount);
        }
      }
      if (Math.hypot(state.core.x + 1 - cx, state.core.y + 1 - cy) <= 3.8) {
        state.core.hp = Math.min(state.core.maxHp, state.core.hp + amount * 0.4);
      }
    }
  }

  function waveDef(index) {
    if (index < WAVE_DEFS.length) return WAVE_DEFS[index];
    const extra = index - (WAVE_DEFS.length - 1);
    return {
      name: '增援 ' + (index + 1),
      hint: '一波比一波厚',
      scale: 1 + (extra - 1) * 0.16,
      groups: [
        { type: 'crawler', n: 6 + extra, lane: 0, every: 0.58 },
        { type: 'armored', n: 2 + Math.floor(extra / 2), lane: 1, every: 1.25 },
        { type: 'wasp', n: 3 + Math.floor(extra / 2), lane: 2, every: 0.8 },
        { type: 'rusher', n: 4 + extra, lane: extra % 2, every: 0.66 },
        extra % 3 === 0 ? { type: 'boss', n: 1, lane: 1, every: 1 } : null,
      ].filter(Boolean),
    };
  }

  function startWave(state) {
    const def = waveDef(state.waveIndex);
    state.waveActive = true;
    state.waveName = def.name;
    state.waveHint = def.hint || '';
    state.waveScale = def.scale || 1;
    state.spawnTimer = 0;
    state.spawnQueue = [];
    for (const g of def.groups) {
      let t = 0.3 + g.lane * 0.22;
      for (let i = 0; i < g.n; i++) {
        state.spawnQueue.push({ type: g.type, lane: g.lane, delay: t, scale: state.waveScale });
        t += g.every;
      }
    }
    state.spawnQueue.sort((a, b) => a.delay - b.delay);
    emit(state, { type: 'waveStart', name: def.name, index: state.waveIndex, hint: def.hint || '' });
  }

  function spawnEnemy(state, spec) {
    const def = ENEMIES[spec.type];
    if (!def) return;
    const lane = LANES[spec.lane] != null ? LANES[spec.lane] : 7;
    const scale = spec.scale || 1;
    const hp = Math.max(1, Math.round(def.hp * (spec.type === 'boss' ? scale : scale) * (0.94 + rng(state) * 0.12)));
    state.enemies.push({
      id: state.nextId++,
      type: spec.type,
      x: lane + 0.5 + (rng(state) - 0.5) * 0.3,
      y: 0.42,
      hp,
      maxHp: hp,
      speed: def.speed,
      dmg: def.dmg,
      atkCd: def.cd,
      cd: 0.25,
      flying: !!def.flying,
      radius: def.radius,
      vx: 0,
      vy: 0,
      flash: 0,
    });
    if (state.enemies.length > 80) state.enemies.splice(0, state.enemies.length - 80);
  }

  function unlockFor(state) {
    const newly = [];
    for (const id of Object.keys(BUILDINGS)) {
      if (!state.unlocked[id] && state.waveIndex >= BUILDINGS[id].unlockWave) {
        state.unlocked[id] = true;
        newly.push(id);
      }
    }
    if (state.waveIndex >= LAUNCH_WAVE) state.launchUnlocked = true;
    if (newly.length) emit(state, { type: 'unlock', ids: newly });
  }

  function updateWave(state, dt) {
    if (state.over) return;
    if (!state.waveActive) {
      state.prepTime -= dt;
      if (state.prepTime <= 0) {
        state.prepTime = 0;
        startWave(state);
      }
      return;
    }
    state.spawnTimer += dt;
    let guard = 0;
    while (state.spawnQueue.length && state.spawnQueue[0].delay <= state.spawnTimer && guard++ < 8) {
      spawnEnemy(state, state.spawnQueue.shift());
    }
    if (!state.spawnQueue.length && state.enemies.length === 0 && state.spawnTimer > 0.4) {
      state.waveIndex++;
      state.waveActive = false;
      state.prepTime = state.waveIndex === 1 ? 26 : 20;
      const bonusCu = 10 + state.waveIndex * 4;
      const bonusPb = state.waveIndex >= 2 ? 6 : 0;
      state.inv.copper += bonusCu;
      state.inv.lead += bonusPb;
      unlockFor(state);
      emit(state, { type: 'waveClear', wave: state.waveIndex, copper: bonusCu, lead: bonusPb });
    }
  }

  function update(state, dt) {
    if (!state || state.paused || state.over) return;
    const scaled = Math.max(0, Math.min(0.05, dt)) * (state.speed || 1);
    if (scaled <= 0) return;
    state.time += scaled;
    if (state.flowDirty || !state.flow) recomputeFlow(state);
    rebuildGrid(state);
    computePower(state);
    updateProduction(state, scaled);
    updateLogistics(state, scaled);
    updateTurrets(state, scaled);
    updateProjectiles(state, scaled);
    updateEnemies(state, scaled);
    updateRepair(state, scaled);
    updateWave(state, scaled);
  }

  function callWave(state) {
    if (state.over) return { ok: false, reason: 'over' };
    if (state.waveActive) return { ok: false, reason: 'active' };
    const early = state.prepTime > 3;
    if (early) {
      state.inv.copper += 20;
      emit(state, { type: 'bonus', copper: 20 });
    }
    startWave(state);
    state.prepTime = 0;
    return { ok: true, early };
  }

  function launchStatus(state) {
    const missing = {};
    let ready = !state.over && state.waveIndex >= LAUNCH_WAVE;
    if (state.waveIndex < LAUNCH_WAVE) ready = false;
    for (const k of Object.keys(LAUNCH_COST)) {
      const have = state.inv[k] || 0;
      if (have < LAUNCH_COST[k]) {
        missing[k] = LAUNCH_COST[k] - have;
        ready = false;
      }
    }
    return { ready, missing, cost: LAUNCH_COST, needWave: LAUNCH_WAVE, wave: state.waveIndex };
  }

  function launch(state) {
    if (state.over) return { ok: false, reason: 'over' };
    const status = launchStatus(state);
    if (state.waveIndex < LAUNCH_WAVE) return { ok: false, reason: 'early', status };
    if (!status.ready) return { ok: false, reason: 'cost', status };
    pay(state, LAUNCH_COST);
    state.over = 'launch';
    emit(state, { type: 'launch' });
    return { ok: true };
  }

  function setSpeed(state, mult) {
    state.speed = mult >= 2 ? 2 : 1;
  }

  function nextWaveInfo(state) {
    const def = waveDef(state.waveIndex);
    const groups = {};
    for (const g of def.groups) groups[g.type] = (groups[g.type] || 0) + g.n;
    return {
      index: state.waveIndex,
      active: !!state.waveActive,
      name: state.waveActive ? state.waveName : def.name,
      hint: state.waveActive ? state.waveHint : (def.hint || ''),
      prep: state.prepTime,
      groups,
      remaining: state.waveActive ? state.enemies.length + state.spawnQueue.length : 0,
    };
  }

  function serialize(state) {
    return JSON.stringify({
      v: 1,
      time: state.time,
      tiles: state.tiles,
      buildings: state.buildings,
      core: state.core,
      inv: state.inv,
      produced: state.produced,
      waveIndex: state.waveIndex,
      waveActive: state.waveActive,
      waveName: state.waveName,
      waveHint: state.waveHint,
      waveScale: state.waveScale,
      prepTime: state.prepTime,
      spawnTimer: state.spawnTimer,
      spawnQueue: state.spawnQueue,
      enemies: state.enemies,
      projectiles: state.projectiles,
      unlocked: state.unlocked,
      launchUnlocked: state.launchUnlocked,
      speed: state.speed,
      stats: state.stats,
      tutorialStep: state.tutorialStep,
      nextId: state.nextId,
      seed: state.seed,
      over: state.over,
    });
  }

  function hydrate(raw) {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!data || data.v !== 1 || !data.tiles || !data.core) throw new Error('bad save');
    const state = createState({ bare: true });
    const keep = ['w', 'h', 'grid', 'events', 'flow', 'flowDist', 'flowDirty', 'paused', 'power', 'sector'];
    for (const k of Object.keys(data)) {
      if (keep.indexOf(k) === -1) state[k] = data[k];
    }
    state.paused = false;
    state.events = [];
    state.power = state.power || { supply: 0, demand: 0, ratio: 1 };
    state.grid = blankGrid(state.w, state.h);
    for (const b of state.buildings) {
      b.items = b.items || [];
      b.buffer = b.buffer || [];
      b.outBuf = b.outBuf || [];
      for (const it of b.items) it.fresh = false;
    }
    state.enemies = state.enemies || [];
    state.projectiles = state.projectiles || [];
    state.spawnQueue = state.spawnQueue || [];
    rebuildGrid(state);
    recomputeFlow(state);
    return state;
  }

  function debugMap(state) {
    const rows = [];
    for (let y = 0; y < state.h; y++) {
      let row = '';
      for (let x = 0; x < state.w; x++) {
        if (isCoreTile(state, x, y)) {
          row += 'C';
          continue;
        }
        const b = state.grid[y][x];
        if (b) {
          if (b.type === 'belt') row += '>v<^'[b.dir];
          else if (b.type === 'drill') row += 'D';
          else if (b.type === 'router') row += 'R';
          else if (b.type === 'duo') row += 'T';
          else if (b.type === 'cwall') row += '#';
          else row += 'B';
          continue;
        }
        const t = state.tiles[y][x];
        if (t.kind === 'rock') row += '#';
        else if (t.kind === 'hazard' || t.kind === 'spawn') row += t.kind === 'spawn' ? 'S' : 'x';
        else if (t.ore === 'copper') row += 'c';
        else if (t.ore === 'lead') row += 'l';
        else if (t.ore === 'coal') row += 'k';
        else if (t.ore === 'titanium') row += 't';
        else if (t.deco === 'river') row += '~';
        else row += '.';
      }
      rows.push(row);
    }
    return rows.join('\n');
  }

  return {
    createState,
    update,
    place,
    demolish,
    rotateBuilding,
    loadTurret,
    callWave,
    launch,
    launchStatus,
    setSpeed,
    nextWaveInfo,
    serialize,
    hydrate,
    debugMap,
    BUILDINGS,
    ENEMIES,
    LAUNCH_COST,
    LAUNCH_WAVE,
    ITEM_KEYS,
    DX,
    DY,
    DIR_NAME,
    MAP_W,
    MAP_H,
    CORE_HP,
  };
});
