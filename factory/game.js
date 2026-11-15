'use strict';

(function () {
  const sim = window.StarworksSim;
  if (!sim) {
    document.body.textContent = '游戏没有加载完成。';
    return;
  }

  const ITEM_NAME = { copper: '铜', lead: '铅', coal: '煤', titanium: '钛', graphite: '石墨' };
  const ITEM_COLOR = {
    copper: '#e39a3c',
    lead: '#9eb4c4',
    coal: '#8a93a3',
    titanium: '#7ee0dc',
    graphite: '#c2b8a4',
  };
  const CATS = [
    { id: 'prod', name: '开采' },
    { id: 'logi', name: '物流' },
    { id: 'def', name: '防御' },
    { id: 'power', name: '电力' },
  ];
  const REASONS = {
    blocked: '这里不能建造',
    occupied: '已经有东西了',
    ore: '矿上只能放钻机和传送带',
    'need-ore': '钻机要盖在矿上',
    cost: '资源不够',
    locked: '还没解锁',
    core: '星核不能拆',
    empty: '这里是空的',
    bounds: '出界了',
    over: '这局已经结束',
    fixed: '这个不能转',
    full: '弹药已经满了',
    active: '这波还没打完',
  };
  const SAVE_KEY = 'starworks-save-v1';
  const SET_KEY = 'starworks-settings-v1';
  const COACH = [
    '铜正送回底部星核。右侧＋可放大，单指拖动地图。敌人从上方来。',
    '选「机械钻」，点右侧橙色铜矿，再放一台。',
    '选「双管炮」，放在发亮的空地上。黄圈是射程。',
    '拖一条传送带，把铜送进炮塔。也可以点炮塔手动装填。',
    '点「出击」迎战。倒计时结束前出击，奖励 20 铜。',
  ];

  const $ = (id) => document.getElementById(id);
  const canvas = $('view');
  const titleCanvas = $('title-canvas');
  const stage = $('stage');
  let viewCtx = canvas.getContext('2d');
  let titleCtx = titleCanvas.getContext('2d');

  let mode = 'title';
  let state = null;
  let zoom = 3;
  let userZoomed = false;
  let cam = { x: 8, y: 11.2 };
  let viewW = 1;
  let viewH = 1;
  let dpr = 1;
  let tool = 'hand';
  let cat = 'prod';
  let placeDir = null;
  let lastBeltDir = 0;
  let selected = null;
  let hover = null;
  let showPath = true;
  let soundOn = true;
  let vibrateOn = false;
  let shake = 0;
  let acc = 0;
  let lastTs = 0;
  let saveAcc = 0;
  let launchAt = 0;
  let bannerUntil = 0;
  let toastUntil = 0;
  let toastText = '';
  let lastToast = '';
  let lastToastAt = 0;
  let userPanned = false;
  let minimapRect = null;
  let audioCtx = null;
  let lastShoot = 0;
  const pointers = new Map();
  let gesture = null;
  let pinchBase = 0;
  let edge = { x: 0, y: 0 };
  let particles = [];
  let floaters = [];
  let flashes = [];
  const deliverBatch = { copper: 0, lead: 0, coal: 0, titanium: 0, graphite: 0 };
  let deliverAcc = 0;
  const sprites = {};

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function inMap(x, y) { return state && x >= 0 && y >= 0 && x < state.w && y < state.h; }
  function isCore(x, y) {
    const c = state.core;
    return x >= c.x && x < c.x + 2 && y >= c.y && y < c.y + 2;
  }

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(SET_KEY) || '{}');
      if (typeof s.sound === 'boolean') soundOn = s.sound;
      if (typeof s.vibrate === 'boolean') vibrateOn = s.vibrate;
      if (typeof s.path === 'boolean') showPath = s.path;
    } catch (err) { /* ignore */ }
  }
  function saveSettings() {
    try {
      localStorage.setItem(SET_KEY, JSON.stringify({ sound: soundOn, vibrate: vibrateOn, path: showPath }));
    } catch (err) { /* ignore */ }
  }
  function hasSave() {
    try { return !!localStorage.getItem(SAVE_KEY); } catch (err) { return false; }
  }
  function saveGame() {
    if (!state || mode !== 'play') return;
    try {
      if (state.over) localStorage.removeItem(SAVE_KEY);
      else localStorage.setItem(SAVE_KEY, sim.serialize(state));
    } catch (err) { /* ignore */ }
  }

  function audio() {
    if (!soundOn) return null;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!audioCtx) audioCtx = new AC();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
  }
  let lastSfx = 0;
  function tone(freq, dur, type, gain) {
    const ctx = audio();
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'square';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.6), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  function sfx(kind) {
    const now = performance.now();
    if ((kind === 'place' || kind === 'demo') && now - lastSfx < 70) return;
    lastSfx = now;
    if (kind === 'place') tone(540, 0.05, 'square', 0.03);
    else if (kind === 'demo') tone(180, 0.07, 'sawtooth', 0.03);
    else if (kind === 'deny') tone(120, 0.08, 'square', 0.04);
    else if (kind === 'shoot') tone(880, 0.03, 'square', 0.015);
    else if (kind === 'wave') { tone(440, 0.12, 'square', 0.04); setTimeout(() => tone(660, 0.14, 'square', 0.04), 90); }
    else if (kind === 'clear') tone(520, 0.1, 'triangle', 0.04);
    else if (kind === 'hurt') tone(90, 0.16, 'sawtooth', 0.05);
    else if (kind === 'unlock') tone(700, 0.12, 'triangle', 0.04);
    else if (kind === 'launch') { tone(330, 0.2, 'triangle', 0.05); setTimeout(() => tone(520, 0.24, 'triangle', 0.05), 140); }
    else if (kind === 'lose') tone(80, 0.35, 'sawtooth', 0.05);
  }
  function buzz(ms) {
    if (vibrateOn && navigator.vibrate) navigator.vibrate(ms);
  }

  function toast(msg) {
    const now = performance.now();
    if (msg === lastToast && now - lastToastAt < 900) return;
    lastToast = msg;
    lastToastAt = now;
    toastText = msg;
    toastUntil = now + 1600;
    const el = $('toast');
    el.hidden = false;
    el.textContent = msg;
  }
  function banner(msg) {
    const el = $('banner');
    el.hidden = false;
    el.textContent = msg;
    bannerUntil = performance.now() + 1700;
  }

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  function paint(w, h, fn) {
    const c = makeCanvas(w, h);
    fn(c.getContext('2d'), w, h);
    return c;
  }

  function initSprites() {
    sprites.ground = [0, 1, 2, 3].map((v) => paint(16, 16, (g) => drawGround(g, v, null)));
    sprites.river = paint(16, 16, (g) => drawGround(g, 1, 'river'));
    sprites.pit = paint(16, 16, (g) => drawPit(g));
    sprites.ore = {};
    ['copper', 'lead', 'coal', 'titanium'].forEach((k) => {
      sprites.ore[k] = paint(16, 16, (g) => drawOre(g, k));
    });
    sprites.rock = paint(16, 16, drawRock);
    sprites.hazard = [0, 1].map((f) => paint(16, 16, (g) => drawHazard(g, f)));
    sprites.spawn = paint(16, 16, drawSpawn);
    sprites.belt = [0, 1, 2, 3].map((dir) => [0, 1, 2, 3].map((frame) => paint(16, 16, (g) => drawBelt(g, dir, frame))));
    sprites.router = paint(16, 16, drawRouter);
    sprites.junction = paint(16, 16, drawJunction);
    sprites.drill = [0, 1, 2, 3].map((f) => paint(16, 16, (g) => drawDrill(g, f)));
    sprites.arrow = [0, 1, 2, 3].map((d) => paint(16, 16, (g) => drawArrow(g, d)));
    sprites.buildings = {
      tidrill: paint(16, 16, (g) => drawDrill(g, 0, true)),
      press: paint(16, 16, drawPress),
      generator: paint(16, 16, (g) => drawGen(g, false)),
      generatorOn: paint(16, 16, (g) => drawGen(g, true)),
      cwall: paint(16, 16, (g) => drawWall(g, '#a86a28', '#e39a3c')),
      lwall: paint(16, 16, (g) => drawWall(g, '#4e6878', '#b7c9d4')),
      duo: paint(16, 16, (g) => drawTurretBase(g, '#e39a3c')),
      scatter: paint(16, 16, (g) => drawTurretBase(g, '#8eacbe')),
      salvo: paint(16, 16, (g) => drawTurretBase(g, '#c2b8a4', true)),
      repair: paint(16, 16, drawRepair),
    };
    sprites.core = [0, 1].map((f) => paint(32, 32, (g) => paintCore(g, f)));
  }

  function drawGround(g, variant, deco) {
    const bases = ['#3c4632', '#445038', '#36422e', '#323a2c'];
    g.fillStyle = deco === 'river' ? '#2a332c' : bases[variant % 4];
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = deco === 'river' ? '#3e4c46' : '#516048';
    const spots = [[[2, 3], [8, 11], [13, 5]], [[4, 8], [11, 2], [7, 14]], [[1, 12], [9, 6], [14, 10]], [[6, 2], [12, 12], [3, 7]]];
    spots[variant % 4].forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.fillRect(0, 15, 16, 1);
    g.fillRect(15, 0, 1, 16);
    if (deco === 'river') {
      g.fillStyle = '#6a5434';
      g.fillRect(0, 7, 16, 1);
      g.fillStyle = '#c4a06a';
      g.fillRect(0, 8, 16, 1);
      g.fillStyle = '#2a2418';
      g.fillRect(0, 9, 16, 1);
    }
  }
  function drawPit(g) {
    drawGround(g, 0, null);
    g.fillStyle = '#1a1814';
    g.fillRect(4, 4, 8, 8);
    g.fillStyle = '#2e2a24';
    g.fillRect(5, 5, 5, 4);
  }
  function drawOre(g, kind) {
    drawGround(g, kind === 'copper' ? 0 : 2, null);
    const pal = {
      copper: ['#7a4a1c', '#e39a3c', '#ffc857'],
      lead: ['#3d5564', '#8eacbe', '#e7f2f8'],
      coal: ['#121418', '#3a3e46', '#9aa3b2'],
      titanium: ['#1d555c', '#7ee0dc', '#f4fffe'],
    }[kind];
    g.fillStyle = '#1c1814';
    g.fillRect(3, 4, 10, 9);
    g.fillStyle = pal[0];
    g.fillRect(4, 5, 8, 7);
    g.fillStyle = pal[1];
    g.fillRect(5, 6, 6, 5);
    g.fillStyle = pal[2];
    g.fillRect(6, 7, 2, 2);
    if (kind === 'lead') g.fillRect(9, 8, 2, 2);
    if (kind === 'titanium') {
      g.fillStyle = pal[2];
      g.fillRect(8, 6, 1, 1);
      g.fillRect(7, 7, 3, 1);
      g.fillRect(8, 8, 1, 1);
    }
  }
  function drawRock(g) {
    g.fillStyle = '#3a342c';
    g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#6a5e50';
    g.fillRect(1, 1, 14, 10);
    g.fillStyle = '#8a7b68';
    g.fillRect(2, 2, 8, 4);
    g.fillStyle = '#2a241c';
    g.fillRect(4, 8, 8, 2);
    g.fillRect(2, 11, 10, 1);
  }
  function drawHazard(g, frame) {
    g.fillStyle = '#2a1614';
    g.fillRect(0, 0, 16, 16);
    for (let i = -16; i < 32; i += 8) {
      g.fillStyle = (Math.floor(i / 8) + frame) % 2 === 0 ? '#6a3030' : '#3a2020';
      g.beginPath();
      g.moveTo(i, 16);
      g.lineTo(i + 8, 0);
      g.lineTo(i + 12, 0);
      g.lineTo(i + 4, 16);
      g.fill();
    }
  }
  function drawSpawn(g) {
    drawHazard(g, 0);
    g.fillStyle = '#ffb0a0';
    g.fillRect(6, 3, 4, 2);
    g.fillRect(7, 5, 2, 4);
    g.fillRect(5, 8, 6, 2);
  }
  function drawBelt(g, dir, frame) {
    const horizontal = dir % 2 === 0;
    g.fillStyle = '#6e675c';
    if (horizontal) g.fillRect(0, 3, 16, 10);
    else g.fillRect(3, 0, 10, 16);
    g.fillStyle = '#cbbba4';
    if (horizontal) g.fillRect(0, 3, 16, 2);
    else g.fillRect(3, 0, 2, 16);
    g.fillStyle = '#241f1a';
    if (horizontal) g.fillRect(0, 6, 16, 5);
    else g.fillRect(6, 0, 5, 16);
    g.fillStyle = '#ffe08a';
    const p = 1 + frame * 4;
    if (dir === 0) {
      g.fillRect(p, 7, 4, 2);
      g.fillRect(p + 3, 6, 2, 1);
      g.fillRect(p + 3, 9, 2, 1);
    } else if (dir === 2) {
      g.fillRect(11 - p, 7, 4, 2);
      g.fillRect(10 - p, 6, 2, 1);
      g.fillRect(10 - p, 9, 2, 1);
    } else if (dir === 1) {
      g.fillRect(7, p, 2, 4);
      g.fillRect(6, p + 3, 1, 2);
      g.fillRect(9, p + 3, 1, 2);
    } else {
      g.fillRect(7, 11 - p, 2, 4);
      g.fillRect(6, 10 - p, 1, 2);
      g.fillRect(9, 10 - p, 1, 2);
    }
  }
  function drawRouter(g) {
    g.fillStyle = '#1c1814';
    g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#8a8174';
    g.fillRect(3, 3, 10, 10);
    g.fillStyle = '#2a261f';
    g.fillRect(6, 0, 4, 16);
    g.fillRect(0, 6, 16, 4);
    g.fillStyle = '#e3a045';
    g.fillRect(6, 6, 4, 4);
    g.fillStyle = '#ffe08a';
    g.fillRect(7, 7, 2, 2);
  }
  function drawJunction(g) {
    g.fillStyle = '#241f1a';
    g.fillRect(0, 6, 16, 4);
    g.fillRect(6, 0, 4, 16);
    g.fillStyle = '#6e675c';
    g.fillRect(0, 5, 16, 1);
    g.fillRect(0, 10, 16, 1);
    g.fillRect(5, 0, 1, 16);
    g.fillRect(10, 0, 1, 16);
    g.fillStyle = '#cbbba4';
    g.fillRect(6, 6, 4, 4);
  }
  function drawDrill(g, frame, titanium) {
    g.fillStyle = '#1c1814';
    g.fillRect(2, 2, 12, 12);
    g.fillStyle = titanium ? '#245e66' : '#5c564c';
    g.fillRect(3, 3, 10, 10);
    g.fillStyle = titanium ? '#7ee0dc' : '#cbbba4';
    g.fillRect(4, 4, 8, 2);
    g.fillStyle = '#1c1814';
    g.fillRect(5, 6, 6, 6);
    g.fillStyle = titanium ? '#d8fffd' : '#e39a3c';
    if (frame % 2 === 0) {
      g.fillRect(7, 6, 2, 6);
      g.fillRect(5, 8, 6, 2);
    } else {
      g.fillRect(6, 7, 4, 4);
      g.fillStyle = '#1c1814';
      g.fillRect(7, 8, 2, 2);
    }
  }
  function drawArrow(g, dir) {
    g.fillStyle = '#ffe08a';
    if (dir === 0) { g.fillRect(12, 6, 2, 4); g.fillRect(14, 7, 2, 2); }
    else if (dir === 1) { g.fillRect(6, 12, 4, 2); g.fillRect(7, 14, 2, 2); }
    else if (dir === 2) { g.fillRect(2, 6, 2, 4); g.fillRect(0, 7, 2, 2); }
    else { g.fillRect(6, 2, 4, 2); g.fillRect(7, 0, 2, 2); }
  }
  function drawWall(g, dark, light) {
    g.fillStyle = '#1c1814';
    g.fillRect(1, 1, 14, 14);
    g.fillStyle = dark;
    g.fillRect(2, 2, 12, 12);
    g.fillStyle = light;
    g.fillRect(3, 3, 5, 4);
    g.fillRect(9, 8, 4, 4);
    g.fillStyle = '#1c1814';
    g.fillRect(2, 7, 12, 1);
    g.fillRect(8, 2, 1, 5);
    g.fillRect(6, 8, 1, 6);
  }
  function drawTurretBase(g, accent, heavy) {
    g.fillStyle = '#1c1814';
    g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#5c564c';
    g.fillRect(3, 3, 10, 10);
    g.fillStyle = '#8a8174';
    g.fillRect(4, 4, 8, 3);
    g.fillStyle = accent;
    g.fillRect(5, 8, 6, 3);
    if (heavy) g.fillRect(4, 11, 8, 1);
    g.fillStyle = '#1c1814';
    g.fillRect(7, 6, 2, 2);
  }
  function drawPress(g) {
    g.fillStyle = '#1c1814';
    g.fillRect(1, 2, 14, 12);
    g.fillStyle = '#5c564c';
    g.fillRect(2, 3, 12, 10);
    g.fillStyle = '#c2b8a4';
    g.fillRect(4, 5, 8, 6);
    g.fillStyle = '#1c1814';
    g.fillRect(6, 4, 4, 8);
    g.fillStyle = '#efe7d6';
    g.fillRect(7, 6, 2, 3);
  }
  function drawGen(g, on) {
    g.fillStyle = '#1c1814';
    g.fillRect(2, 3, 12, 11);
    g.fillStyle = '#5c564c';
    g.fillRect(3, 4, 10, 9);
    g.fillStyle = '#8a8174';
    g.fillRect(5, 1, 3, 4);
    g.fillStyle = on ? '#ffc857' : '#2a241c';
    g.fillRect(6, 0, 1, 2);
    g.fillStyle = on ? '#e39a3c' : '#3a342c';
    g.fillRect(4, 8, 8, 4);
  }
  function drawRepair(g) {
    g.fillStyle = '#1c1814';
    g.fillRect(2, 2, 12, 12);
    g.fillStyle = '#3d5344';
    g.fillRect(3, 3, 10, 10);
    g.fillStyle = '#8fce6a';
    g.fillRect(7, 4, 2, 8);
    g.fillRect(4, 7, 8, 2);
  }
  function paintCore(g, frame) {
    g.fillStyle = '#1c1814';
    g.fillRect(1, 1, 30, 30);
    g.fillStyle = '#4a453c';
    g.fillRect(3, 3, 26, 26);
    g.fillStyle = '#8a8174';
    g.fillRect(5, 5, 22, 6);
    g.fillStyle = '#2a2010';
    g.fillRect(9, 9, 14, 14);
    g.fillStyle = frame ? '#ffc857' : '#e39a3c';
    g.fillRect(11, 11, 10, 10);
    g.fillStyle = '#fff4d0';
    g.fillRect(14, 14, 4, 4);
    g.fillStyle = '#efe7d6';
    [[5, 5], [25, 5], [5, 25], [25, 25]].forEach(([x, y]) => g.fillRect(x, y, 2, 2));
    g.fillStyle = '#e3a045';
    g.fillRect(1, 1, 6, 2);
    g.fillRect(1, 1, 2, 6);
    g.fillRect(25, 1, 6, 2);
    g.fillRect(29, 1, 2, 6);
  }

  function tilePx() { return 16 * zoom; }
  function tileOrigin(tx, ty) {
    const s = tilePx();
    return [Math.round((tx - cam.x) * s + viewW / 2), Math.round((ty - cam.y) * s + viewH / 2), s];
  }
  function screenToTile(sx, sy) {
    const s = tilePx();
    return { x: Math.floor((sx - viewW / 2) / s + cam.x), y: Math.floor((sy - viewH / 2) / s + cam.y) };
  }
  function pickZoom() {
    // Phones stay at 2× so the whole sector width is readable. Pinch or ＋ to zoom in.
    if (viewW / 48 >= 12 && viewH / 48 >= 9) return 3;
    return 2;
  }
  function clampCam() {
    if (!state) return;
    const s = tilePx();
    const halfW = viewW / 2 / s;
    const halfH = viewH / 2 / s;
    cam.x = halfW * 2 >= state.w ? state.w / 2 : clamp(cam.x, halfW - 0.8, state.w - halfW + 0.8);
    cam.y = halfH * 2 >= state.h ? state.h / 2 : clamp(cam.y, halfH - 0.8, state.h - halfH + 0.8);
  }
  function resize() {
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    const next = Math.min(2, Math.max(1, Math.round(window.devicePixelRatio || 1)));
    if (w === viewW && h === viewH && next === dpr && canvas.width) return;
    viewW = w;
    viewH = h;
    dpr = next;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    viewCtx = canvas.getContext('2d');
    if (!userZoomed) zoom = pickZoom();
    clampCam();
  }
  function zoomBy(delta, cx, cy) {
    const px = cx == null ? viewW / 2 : cx;
    const py = cy == null ? viewH / 2 : cy;
    const s0 = tilePx();
    const wx = cam.x + (px - viewW / 2) / s0;
    const wy = cam.y + (py - viewH / 2) / s0;
    const next = clamp(zoom + delta, 2, 4);
    if (next === zoom) return;
    zoom = next;
    userZoomed = true;
    const s1 = tilePx();
    cam.x = wx - (px - viewW / 2) / s1;
    cam.y = wy - (py - viewH / 2) / s1;
    clampCam();
  }
  function focusCore() {
    cam.x = state.core.x + 1;
    cam.y = state.core.y + 0.2;
    clampCam();
  }

  function costText(cost) {
    return Object.keys(cost).map((k) => cost[k] + ITEM_NAME[k]).join(' ');
  }
  function canPay(cost) {
    return Object.keys(cost).every((k) => (state.inv[k] || 0) >= cost[k]);
  }
  function ghostDir(type, x, y) {
    if (placeDir != null) return placeDir & 3;
    if (type === 'belt') return lastBeltDir;
    const cx = state.core.x + 1;
    const cy = state.core.y + 1;
    const dx = cx - (x + 0.5);
    const dy = cy - (y + 0.5);
    if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 0 : 2;
    return dy > 0 ? 1 : 3;
  }
  function placeError(type, x, y) {
    if (!inMap(x, y)) return 'bounds';
    const tile = state.tiles[y][x];
    const def = sim.BUILDINGS[type];
    if (!def) return 'type';
    if (!state.unlocked[type]) return 'locked';
    if (tile.kind !== 'ground') return 'blocked';
    if (isCore(x, y)) return 'blocked';
    if (state.grid[y][x]) return 'occupied';
    const oreOk = type === 'belt' || type === 'router' || type === 'junction' || type === 'drill' || type === 'tidrill';
    if (tile.ore && !oreOk) return 'ore';
    if ((type === 'drill' || type === 'tidrill') && !tile.ore) return 'need-ore';
    if (!canPay(def.cost)) return 'cost';
    return null;
  }

  function renderDock() {
    const cats = $('cats');
    cats.innerHTML = '';
    CATS.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cat' + (c.id === cat ? ' on' : '');
      b.textContent = c.name;
      b.addEventListener('click', () => { cat = c.id; renderDock(); });
      cats.appendChild(b);
    });
    const tools = $('tools');
    tools.innerHTML = '';
    Object.keys(sim.BUILDINGS).forEach((id) => {
      const def = sim.BUILDINGS[id];
      if (def.cat !== cat) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tool';
      b.dataset.type = id;
      const icon = document.createElement('canvas');
      icon.width = 16;
      icon.height = 16;
      const ig = icon.getContext('2d');
      ig.imageSmoothingEnabled = false;
      const sp = id === 'belt' ? sprites.belt[0][0] : (sprites.buildings[id] || sprites.drill[0]);
      ig.drawImage(sp, 0, 0);
      const name = document.createElement('span');
      name.className = 'tname';
      name.textContent = def.name;
      const cost = document.createElement('span');
      cost.className = 'cost';
      cost.dataset.costFor = id;
      b.appendChild(icon);
      b.appendChild(name);
      b.appendChild(cost);
      b.addEventListener('click', () => onToolClick(id));
      tools.appendChild(b);
    });
    syncToolClasses();
  }
  function onToolClick(id) {
    audio();
    if (!state.unlocked[id]) {
      toast('守住第 ' + sim.BUILDINGS[id].unlockWave + ' 波后解锁');
      sfx('deny');
      return;
    }
    if (tool === id) setTool('hand');
    else setTool(id);
  }
  function setTool(next) {
    tool = next;
    if (next !== 'hand') {
      selected = null;
      hideInspect();
    }
    syncToolClasses();
    updateSelInfo();
  }
  function syncToolClasses() {
    $('tool-hand').classList.toggle('on', tool === 'hand');
    $('tool-demo').classList.toggle('on', tool === 'demo');
    $('btn-path').classList.toggle('on', showPath);
    document.querySelectorAll('.tool').forEach((btn) => {
      const id = btn.dataset.type;
      const def = sim.BUILDINGS[id];
      const on = tool === id;
      const locked = state && !state.unlocked[id];
      btn.classList.toggle('on', on);
      btn.classList.toggle('lock', !!locked);
      const cost = btn.querySelector('.cost');
      if (cost) cost.textContent = locked ? def.unlockWave + '波后' : costText(def.cost);
      const pulse = state && (
        (state.tutorialStep === 1 && id === 'drill') ||
        (state.tutorialStep === 2 && id === 'duo') ||
        (state.tutorialStep === 3 && id === 'belt')
      );
      btn.classList.toggle('pulse', !!pulse && !on);
    });
    if (state) {
      $('btn-wave').classList.toggle('pulse', state.tutorialStep === 4 && !state.waveActive);
    }
  }
  function updateSelInfo() {
    const name = $('sel-name');
    const desc = $('sel-desc');
    if (tool === 'hand') {
      name.textContent = '拖动地图';
      desc.textContent = '单指拖动，双指或＋－缩放。点建筑可以查看。';
    } else if (tool === 'demo') {
      name.textContent = '拆除';
      desc.textContent = '点一下或划过建筑，材料全额退回。';
    } else {
      const def = sim.BUILDINGS[tool];
      name.textContent = def ? def.name : '建造';
      desc.textContent = def ? def.desc : '';
    }
  }

  function buildResources() {
    $('resources').innerHTML = sim.ITEM_KEYS.map((k) => (
      '<span class="res" id="res-' + k + '"><i class="swatch ' + k + '"></i><b>0</b></span>'
    )).join('') + '<span class="res" id="res-power"><i class="swatch power"></i><b>—</b></span>';
  }

  function syncUI() {
    if (!state) return;
    sim.ITEM_KEYS.forEach((k) => {
      const el = $('res-' + k);
      if (!el) return;
      el.querySelector('b').textContent = state.inv[k] || 0;
    });
    const p = state.power || { supply: 0, demand: 0, ratio: 1 };
    const pel = $('res-power');
    const pb = pel.querySelector('b');
    pb.textContent = p.demand > 0 ? p.supply + '/' + p.demand : (p.supply ? String(p.supply) : '—');
    pel.classList.toggle('low', p.demand > 0 && p.ratio < 1);
    const ratio = state.core.hp / state.core.maxHp;
    const bar = $('core-hp');
    bar.style.width = Math.max(0, ratio * 100) + '%';
    bar.classList.toggle('low', ratio < 0.35);
    $('core-hp-track').classList.toggle('low', ratio < 0.35);
    stage.classList.toggle('danger', ratio < 0.35 && !state.over);
    const info = sim.nextWaveInfo(state);
    if (info.active) {
      $('wave-label').textContent = '第 ' + (info.index + 1) + ' 波 · 剩余 ' + info.remaining;
      $('wave-sub').textContent = info.name + (info.hint ? ' · ' + info.hint : '');
      $('btn-wave').textContent = '交战中';
      $('btn-wave').disabled = true;
    } else {
      $('wave-label').textContent = '准备 ' + Math.ceil(Math.max(0, info.prep)) + 's';
      const bits = Object.keys(info.groups).map((k) => sim.ENEMIES[k].name + '×' + info.groups[k]);
      $('wave-sub').textContent = '第 ' + (info.index + 1) + ' 波 · ' + info.name + ' · ' + bits.join(' ');
      $('btn-wave').disabled = false;
      $('btn-wave').textContent = '出击';
    }
    const launch = sim.launchStatus(state);
    $('btn-launch').classList.toggle('ready', launch.ready);
    $('btn-speed').textContent = state.speed >= 2 ? '2×' : '1×';
    $('btn-sound').textContent = soundOn ? '声' : '静';
    $('btn-sound').classList.toggle('on', soundOn);
    document.querySelectorAll('.tool').forEach((btn) => {
      const id = btn.dataset.type;
      if (!id || !state.unlocked[id]) return;
      btn.classList.toggle('cant', !canPay(sim.BUILDINGS[id].cost));
    });
    syncInspectNumbers();
    if (performance.now() > toastUntil) $('toast').hidden = true;
    if (performance.now() > bannerUntil) $('banner').hidden = true;
  }

  function setTutorial(n) {
    state.tutorialStep = n;
    const cats = { 1: 'prod', 2: 'def', 3: 'logi' };
    if (cats[n] && cat !== cats[n]) {
      cat = cats[n];
      renderDock();
    } else syncToolClasses();
    updateCoach();
  }
  function turretFed() {
    return state.buildings.some((b) => {
      if (!sim.BUILDINGS[b.type].turret) return false;
      if (b.ammo > 0) return true;
      return state.buildings.some((o) => o.type === 'belt' && o.x + sim.DX[o.dir] === b.x && o.y + sim.DY[o.dir] === b.y);
    });
  }
  function advanceTutorial() {
    if (!state || state.tutorialStep >= 5) return;
    const n = state.buildings.filter((b) => b.type === 'drill' || b.type === 'tidrill').length;
    if (state.tutorialStep === 1 && n >= 2) setTutorial(2);
    else if (state.tutorialStep === 2 && state.buildings.some((b) => sim.BUILDINGS[b.type].turret)) setTutorial(3);
    else if (state.tutorialStep === 3 && turretFed()) setTutorial(4);
    else if (state.tutorialStep === 4 && (state.waveActive || state.waveIndex > 0)) {
      setTutorial(5);
      toast('教学完成。守住星核。');
    }
  }
  function updateCoach() {
    const el = $('coach');
    if (!state || state.tutorialStep >= 5 || mode !== 'play') {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    $('coach-text').textContent = COACH[state.tutorialStep] || '';
    $('coach-btn').textContent = state.tutorialStep === 0 ? '知道了' : '跳过';
  }

  function hideInspect() {
    $('inspect').hidden = true;
    $('inspect').innerHTML = '';
  }
  function showInspect() {
    if (!selected) return hideInspect();
    const box = $('inspect');
    box.hidden = false;
    if (selected.core || isCore(selected.x, selected.y)) {
      selected.core = true;
      box.innerHTML = '<div class="inspect-top"><strong>星核</strong><span id="inspect-ammo">核心</span><button id="inspect-x" type="button">×</button></div><div class="hp"><div id="inspect-hp"></div></div><p class="inspect-note">把矿送进来，就能拿去建造。星核被打爆这局就结束。</p>';
    } else if (selected.ore) {
      const tile = state.tiles[selected.y][selected.x];
      box.innerHTML = '<div class="inspect-top"><strong>' + ITEM_NAME[tile.ore] + '矿</strong><span>剩余 ' + tile.oreLeft + '</span><button id="inspect-x" type="button">×</button></div><p class="inspect-note">把钻机盖在矿上，再用传送带送走。</p>';
    } else {
      const b = state.grid[selected.y][selected.x];
      if (!b) return hideInspect();
      const def = sim.BUILDINGS[b.type];
      const tdef = def.turret;
      let extra = '';
      if (tdef) extra = '<span id="inspect-ammo">弹药 ' + b.ammo + '/' + tdef.ammoMax + '</span>';
      else if (b.type === 'generator') extra = '<span id="inspect-ammo">煤 ' + b.fuel + '</span>';
      else if (b.type === 'press') extra = '<span id="inspect-ammo">煤 ' + b.input + ' · 石墨 ' + b.outBuf.length + '</span>';
      else extra = '<span id="inspect-ammo"></span>';
      const note = b.unpowered ? '缺电' : b.empty ? '矿挖完了' : b.stalled ? '堵住了' : def.desc;
      const actions = [];
      if (tdef) actions.push('<button type="button" data-act="load">装填</button>');
      if (def && (b.type === 'belt' || b.type === 'drill' || b.type === 'tidrill' || b.type === 'press')) {
        actions.push('<button type="button" data-act="rot">旋转</button>');
      }
      actions.push('<button type="button" data-act="demo">拆除</button>');
      box.innerHTML = '<div class="inspect-top"><strong>' + def.name + '</strong>' + extra + '<button id="inspect-x" type="button">×</button></div><div class="hp"><div id="inspect-hp"></div></div><p class="inspect-note">' + note + '</p><div class="inspect-actions">' + actions.join('') + '</div>';
    }
    $('inspect-x').addEventListener('click', () => { selected = null; hideInspect(); });
    box.querySelectorAll('[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => inspectAct(btn.dataset.act));
    });
    syncInspectNumbers();
  }
  function syncInspectNumbers() {
    if (!selected || $('inspect').hidden) return;
    const hp = $('inspect-hp');
    if (selected.core) {
      if (hp) hp.style.width = (state.core.hp / state.core.maxHp * 100) + '%';
      return;
    }
    const b = state.grid[selected.y] && state.grid[selected.y][selected.x];
    if (!b) return;
    if (hp) hp.style.width = Math.max(0, b.hp / b.maxHp * 100) + '%';
    const ammo = $('inspect-ammo');
    const tdef = sim.BUILDINGS[b.type].turret;
    if (ammo && tdef) ammo.textContent = '弹药 ' + b.ammo + '/' + tdef.ammoMax;
  }
  function inspectAct(act) {
    audio();
    if (!selected) return;
    if (act === 'load') {
      const res = sim.loadTurret(state, selected.x, selected.y, 10);
      if (!res.ok) toast(res.reason === 'full' ? '弹药已经满了' : '核心里没有对应的矿');
      else { toast('装填了 ' + res.moved + ITEM_NAME[res.ammo]); sfx('place'); }
      showInspect();
      return;
    }
    if (act === 'rot') {
      const res = sim.rotateBuilding(state, selected.x, selected.y);
      if (!res.ok) toast(REASONS[res.reason] || '不能转');
      else sfx('place');
      return;
    }
    if (act === 'demo') {
      const res = sim.demolish(state, selected.x, selected.y);
      if (res.ok) {
        sfx('demo');
        selected = null;
        hideInspect();
      } else toast(REASONS[res.reason] || '不能拆');
    }
  }

  function doRotate() {
    audio();
    if (tool === 'hand' && selected && !selected.core && !selected.ore) {
      const res = sim.rotateBuilding(state, selected.x, selected.y);
      if (!res.ok) toast(REASONS[res.reason] || '不能转');
      else sfx('place');
      return;
    }
    const sample = hover && inMap(hover.x, hover.y) ? hover : { x: 8, y: 8 };
    const cur = placeDir == null ? ghostDir(tool === 'hand' ? 'belt' : tool, sample.x, sample.y) : placeDir;
    placeDir = (cur + 1) & 3;
    lastBeltDir = placeDir;
    toast('方向：' + sim.DIR_NAME[placeDir]);
  }

  function burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random());
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.35, color, size: 2 + (Math.random() > 0.7 ? 1 : 0) });
    }
    if (particles.length > 140) particles.splice(0, particles.length - 140);
  }
  function floatText(x, y, text, color) {
    floaters.push({ x, y, text, color, life: 0.9 });
    if (floaters.length > 24) floaters.shift();
  }

  function handleEvents(events) {
    for (const e of events) {
      if (e.type === 'place') {
        sfx('place');
        buzz(8);
        burst(e.x + 0.5, e.y + 0.5, '#cbbba4', 4, 0.8);
      } else if (e.type === 'demolish') {
        burst(e.x + 0.5, e.y + 0.5, '#8a8174', 5, 1);
      } else if (e.type === 'shoot') {
        flashes.push({ x: e.x, y: e.y, life: 0.05 });
        if (performance.now() - lastShoot > 80) {
          lastShoot = performance.now();
          sfx('shoot');
        }
      } else if (e.type === 'kill') {
        burst(e.x, e.y, e.boss ? '#ffc857' : '#d84b3a', e.boss ? 18 : 6, 1.6);
        if (e.boss) banner('巨螯被击破');
      } else if (e.type === 'destroyed') {
        burst(e.x + 0.5, e.y + 0.5, '#d84b3a', 8, 1.4);
        sfx('hurt');
        if (selected && selected.x === e.x && selected.y === e.y) {
          selected = null;
          hideInspect();
        }
      } else if (e.type === 'coreHit') {
        shake = Math.min(9, shake + 3.5);
        sfx('hurt');
        buzz(18);
      } else if (e.type === 'deliver') {
        deliverBatch[e.item] = (deliverBatch[e.item] || 0) + 1;
      } else if (e.type === 'waveStart') {
        banner('第 ' + (e.index + 1) + ' 波 · ' + e.name);
        sfx('wave');
        buzz(20);
        const turrets = state.buildings.filter((b) => sim.BUILDINGS[b.type].turret);
        if (!turrets.length) toast('还没有炮塔，敌人会直接打星核。');
        else if (!turrets.some((b) => b.ammo > 0)) toast('炮塔还没弹药。传送带送铜，或点炮塔装填。');
      } else if (e.type === 'waveClear') {
        banner('守住了 · +' + e.copper + '铜');
        sfx('clear');
      } else if (e.type === 'bonus') {
        toast('提前出击 +' + e.copper + '铜');
      } else if (e.type === 'unlock') {
        toast('解锁：' + e.ids.map((id) => sim.BUILDINGS[id].name).join('、'));
        sfx('unlock');
        renderDock();
      } else if (e.type === 'depleted') {
        toast('这格矿挖完了');
      } else if (e.type === 'gameover') {
        sfx('lose');
        shake = 10;
        saveGame();
        setTimeout(openEnd, 350);
      } else if (e.type === 'launch') {
        sfx('launch');
        launchAt = performance.now();
        burst(state.core.x + 1, state.core.y + 1, '#ffc857', 28, 2.2);
        saveGame();
        setTimeout(openEnd, 1100);
      }
    }
  }

  function callWave() {
    audio();
    if (!state || state.over) return;
    const res = sim.callWave(state);
    if (!res.ok) toast(REASONS[res.reason] || '现在不能出击');
  }

  function showModal(html) {
    $('modal').hidden = false;
    $('modal-card').innerHTML = html;
    const cancel = $('m-cancel');
    if (cancel) cancel.addEventListener('click', hideModal);
  }
  function hideModal() {
    $('modal').hidden = true;
    $('modal-card').innerHTML = '';
    if (state) state.paused = false;
  }
  function openHelp() {
    audio();
    showModal(
      '<div class="help"><h2>怎么玩</h2>' +
      '<h3>目标</h3><p>守住底部星核。挖矿、用传送带送回核心，再拿去造墙和炮。凑齐材料后可以发射撤离。</p>' +
      '<h3>建造</h3><p>点底部设备，再点地图。传送带和墙可以按住拖动连续铺。旋转决定钻机和压机往哪边输出。拆掉会全额退还。</p>' +
      '<h3>供弹</h3><p>炮塔没有弹药不会开火。双管炮吃铜，散射炮吃铅，齐射炮吃石墨。传送带对着炮塔送，或点炮塔手动装填。</p>' +
      '<h3>守波</h3><p>用墙把地面敌人挤进炮塔射程。飞螳会越过墙，散射炮更克制它们。点路径可以看到敌人的走向。</p>' +
      '<h3>操作</h3><p>单指拖动地图，双指或右侧＋－缩放。桌面可用方向键移动，空格出击，R 旋转。</p>' +
      '<div class="legend"><span><i class="swatch copper"></i>铜</span><span><i class="swatch lead"></i>铅</span><span><i class="swatch coal"></i>煤</span><span><i class="swatch titanium"></i>钛</span><span><i class="swatch graphite"></i>石墨</span></div>' +
      '<div class="modal-actions"><button id="m-cancel" class="btn primary" type="button">知道了</button></div></div>'
    );
  }
  function openPause() {
    if (mode !== 'play' || !state || state.over) return;
    state.paused = true;
    audio();
    showModal(
      '<h2>暂停</h2><p>' + state.sector + ' · 已守住 ' + state.waveIndex + ' 波</p>' +
      '<div class="modal-actions">' +
      '<button id="m-resume" class="btn primary" type="button">继续建造</button>' +
      '<button id="m-help" class="btn" type="button">怎么玩</button>' +
      '<button id="m-sound" class="btn" type="button">声音：' + (soundOn ? '开' : '关') + '</button>' +
      '<button id="m-vib" class="btn" type="button">震动：' + (vibrateOn ? '开' : '关') + '</button>' +
      '<button id="m-restart" class="btn" type="button">重新开始</button>' +
      '<button id="m-title" class="btn ghost" type="button">回标题</button>' +
      '</div>'
    );
    $('m-resume').addEventListener('click', hideModal);
    $('m-help').addEventListener('click', openHelp);
    $('m-sound').addEventListener('click', () => { soundOn = !soundOn; saveSettings(); openPause(); });
    $('m-vib').addEventListener('click', () => { vibrateOn = !vibrateOn; saveSettings(); openPause(); });
    $('m-restart').addEventListener('click', () => { hideModal(); begin(sim.createState()); });
    $('m-title').addEventListener('click', () => { saveGame(); hideModal(); showTitle(); });
  }
  function openLaunch() {
    audio();
    const st = sim.launchStatus(state);
    const rows = sim.ITEM_KEYS.map((k) => {
      const need = st.cost[k];
      const have = state.inv[k] || 0;
      return '<li class="' + (have >= need ? 'ok' : 'no') + '"><i class="swatch ' + k + '"></i>' + ITEM_NAME[k] + ' ' + have + '/' + need + '</li>';
    }).join('');
    const waveOk = state.waveIndex >= sim.LAUNCH_WAVE;
    showModal(
      '<h2>发射撤离</h2><p>凑齐材料，把星核送回轨道。至少守住 ' + sim.LAUNCH_WAVE + ' 波。</p>' +
      '<ul class="check">' + rows + '<li class="' + (waveOk ? 'ok' : 'no') + '">波次 ' + state.waveIndex + '/' + sim.LAUNCH_WAVE + '</li></ul>' +
      '<div class="modal-actions"><button id="m-cancel" class="btn ghost" type="button">返回</button><button id="m-go" class="btn primary" type="button"' + (st.ready ? '' : ' disabled') + '>发射</button></div>'
    );
    const go = $('m-go');
    if (go) go.addEventListener('click', () => {
      const res = sim.launch(state);
      hideModal();
      if (!res.ok) toast('还不能发射');
      else handleEvents(state.events.splice(0));
    });
  }
  function openEnd() {
    if (!$('modal').hidden && $('m-restart')) return;
    const won = state.over === 'launch';
    const mined = sim.ITEM_KEYS.reduce((n, k) => n + (state.stats.mined[k] || 0), 0);
    const t = Math.floor(state.time);
    const clock = Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    showModal(
      '<h2>' + (won ? '星核已发射' : '星核被摧毁') + '</h2>' +
      '<p>' + (won ? '锈河扇区的材料送上了轨道。' : '防线断了。可以再铺一条更稳的供弹线。') + '</p>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + state.waveIndex + '</b><span>守住波次</span></div>' +
      '<div class="stat"><b>' + state.stats.kills + '</b><span>击破敌人</span></div>' +
      '<div class="stat"><b>' + mined + '</b><span>挖出的矿</span></div>' +
      '<div class="stat"><b>' + clock + '</b><span>用时</span></div>' +
      '</div>' +
      '<div class="modal-actions"><button id="m-restart" class="btn primary" type="button">再来一局</button><button id="m-title" class="btn ghost" type="button">回标题</button></div>'
    );
    $('m-restart').addEventListener('click', () => { hideModal(); begin(sim.createState()); });
    $('m-title').addEventListener('click', () => { hideModal(); showTitle(); });
  }
  function confirmNew() {
    showModal(
      '<h2>已有驻守进度</h2><p>新的一局会覆盖当前存档。</p>' +
      '<div class="modal-actions"><button id="m-continue" class="btn primary" type="button">继续驻守</button><button id="m-new" class="btn" type="button">新的扇区</button><button id="m-cancel" class="btn ghost" type="button">返回</button></div>'
    );
    $('m-continue').addEventListener('click', () => { hideModal(); continueGame(); });
    $('m-new').addEventListener('click', () => { hideModal(); begin(sim.createState()); });
  }

  function begin(next) {
    state = next;
    mode = 'play';
    userZoomed = false;
    tool = 'hand';
    cat = 'prod';
    placeDir = null;
    selected = null;
    hover = null;
    acc = 0;
    particles = [];
    floaters = [];
    flashes = [];
    shake = 0;
    $('title-screen').hidden = true;
    $('game').hidden = false;
    $('modal').hidden = true;
    hideInspect();
    userZoomed = false;
    resize();
    zoom = pickZoom();
    const visW = viewW / tilePx();
    const visH = viewH / tilePx();
    cam.x = visW >= state.w ? state.w / 2 : 6.2;
    cam.y = visH >= state.h ? state.h / 2 : 12.6;
    clampCam();
    renderDock();
    updateCoach();
    updateSelInfo();
    syncUI();
    audio();
  }
  function showTitle() {
    mode = 'title';
    $('game').hidden = true;
    $('title-screen').hidden = false;
    $('btn-continue').hidden = !hasSave();
  }
  function continueGame() {
    try {
      begin(sim.hydrate(localStorage.getItem(SAVE_KEY)));
    } catch (err) {
      try { localStorage.removeItem(SAVE_KEY); } catch (e2) { /* ignore */ }
      begin(sim.createState());
    }
  }

  function localPos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hitMinimap(px, py) {
    const m = minimapRect;
    return !!m && px >= m.x && py >= m.y && px < m.x + m.w && py < m.y + m.h;
  }
  function jumpMinimap(px, py) {
    cam.x = (px - minimapRect.x) / minimapRect.s;
    cam.y = (py - minimapRect.y) / minimapRect.s;
    clampCam();
  }
  function drawableTool() {
    return tool === 'belt' || tool === 'cwall' || tool === 'lwall' || tool === 'demo';
  }
  function onDown(e) {
    if (mode !== 'play' || !state || state.over) return;
    canvas.setPointerCapture(e.pointerId);
    const p = localPos(e);
    pointers.set(e.pointerId, { x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false });
    hover = screenToTile(p.x, p.y);
    if (pointers.size === 1) {
      gesture = { id: e.pointerId, mode: 'pending', start: hover, last: hover, placedIds: new Set(), drew: false };
      if (hitMinimap(p.x, p.y)) {
        gesture.mode = 'minimap';
        jumpMinimap(p.x, p.y);
      }
    } else if (pointers.size >= 2) {
      gesture = { mode: 'pinch' };
      const pts = [...pointers.values()];
      pinchBase = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
    e.preventDefault();
  }
  function onMove(e) {
    const p = localPos(e);
    if (mode === 'play' && state) hover = screenToTile(p.x, p.y);
    const rec = pointers.get(e.pointerId);
    if (!rec) return;
    const dx = p.x - rec.x;
    const dy = p.y - rec.y;
    rec.x = p.x;
    rec.y = p.y;
    if (Math.hypot(p.x - rec.sx, p.y - rec.sy) > 10) rec.moved = true;
    hover = screenToTile(p.x, p.y);
    if (pointers.size >= 2) {
      const pts = [...pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const midX = (pts[0].x + pts[1].x) / 2;
      const midY = (pts[0].y + pts[1].y) / 2;
      if (pinchBase && dist / pinchBase > 1.18) { zoomBy(1, midX, midY); pinchBase = dist; }
      else if (pinchBase && dist / pinchBase < 0.84) { zoomBy(-1, midX, midY); pinchBase = dist; }
      pan(dx, dy);
      userPanned = true;
      return;
    }
    if (!gesture || gesture.id !== e.pointerId) return;
    if (gesture.mode === 'minimap') { jumpMinimap(p.x, p.y); return; }
    if (rec.moved && gesture.mode === 'pending') {
      gesture.mode = drawableTool() ? 'draw' : 'pan';
    }
    if (gesture.mode === 'pan') {
      pan(dx, dy);
      userPanned = true;
      edge.x = 0;
      edge.y = 0;
    } else if (gesture.mode === 'draw') {
      if (!gesture.drew) {
        gesture.drew = true;
        if (tool === 'demo') demolishAt(gesture.start, false);
        else beginStroke(gesture.start, hover);
      } else if (hover.x !== gesture.last.x || hover.y !== gesture.last.y) {
        if (tool === 'demo') demolishAlong(gesture.last, hover);
        else placeAlong(gesture.last, hover);
      }
      const m = 32;
      edge.x = p.x < m ? -1 : p.x > viewW - m ? 1 : 0;
      edge.y = p.y < m ? -1 : p.y > viewH - m ? 1 : 0;
    }
  }
  function onUp(e) {
    const rec = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (gesture && gesture.id === e.pointerId) {
      if (gesture.mode === 'pending' && rec && !rec.moved) handleTap(gesture.start);
      gesture = null;
      edge.x = 0;
      edge.y = 0;
    }
    if (pointers.size < 2) pinchBase = 0;
    if (pointers.size === 0) hover = null;
  }
  function pan(dx, dy) {
    const s = tilePx();
    cam.x -= dx / s;
    cam.y -= dy / s;
    clampCam();
  }
  function handleTap(tile) {
    audio();
    if (!inMap(tile.x, tile.y)) return;
    if (tool === 'hand') { selectAt(tile); return; }
    if (tool === 'demo') { demolishAt(tile, true); return; }
    tapPlace(tile);
  }
  function selectAt(tile) {
    if (isCore(tile.x, tile.y)) {
      selected = { x: state.core.x, y: state.core.y, core: true };
      showInspect();
      return;
    }
    const b = state.grid[tile.y][tile.x];
    if (b) {
      selected = { x: b.x, y: b.y };
      showInspect();
      return;
    }
    const t = state.tiles[tile.y][tile.x];
    if (t && t.ore) {
      selected = { x: tile.x, y: tile.y, ore: true };
      showInspect();
      return;
    }
    selected = null;
    hideInspect();
  }
  function tapPlace(tile) {
    let dir = placeDir;
    if (dir == null && tool === 'belt') dir = lastBeltDir;
    const res = sim.place(state, tool, tile.x, tile.y, dir);
    if (!res.ok) {
      toast(REASONS[res.reason] || '不能建在这里');
      sfx('deny');
      return;
    }
    if (tool === 'belt') lastBeltDir = res.building.dir;
    handleEvents(state.events.splice(0));
  }
  function demolishAt(tile, announce) {
    if (!inMap(tile.x, tile.y)) return;
    if (isCore(tile.x, tile.y)) {
      if (announce) toast('星核不能拆');
      return;
    }
    const res = sim.demolish(state, tile.x, tile.y);
    if (res.ok) {
      if (selected && selected.x === tile.x && selected.y === tile.y) {
        selected = null;
        hideInspect();
      }
      handleEvents(state.events.splice(0));
    }
  }
  function stepToward(a, b) {
    if (a.x !== b.x) return { x: a.x + Math.sign(b.x - a.x), y: a.y };
    if (a.y !== b.y) return { x: a.x, y: a.y + Math.sign(b.y - a.y) };
    return { x: a.x, y: a.y };
  }
  function dirBetween(a, b) {
    if (b.x > a.x) return 0;
    if (b.y > a.y) return 1;
    if (b.x < a.x) return 2;
    return 3;
  }
  function beginStroke(start, current) {
    if (!inMap(start.x, start.y)) return;
    const next = (current.x !== start.x || current.y !== start.y) ? stepToward(start, current) : null;
    const dir = next ? dirBetween(start, next) : (placeDir != null ? placeDir : lastBeltDir);
    tryPlaceOwned(start, dir);
    gesture.last = { x: start.x, y: start.y };
    if (next) placeAlong(start, current);
  }
  function tryPlaceOwned(cell, dir) {
    if (!inMap(cell.x, cell.y)) return false;
    const existing = state.grid[cell.y][cell.x];
    if (existing && existing.type === tool && gesture.placedIds.has(existing.id)) {
      existing.dir = dir;
      lastBeltDir = dir;
      return true;
    }
    if (existing) return false;
    const res = sim.place(state, tool, cell.x, cell.y, dir);
    if (!res.ok) {
      if (res.reason === 'cost') toast('资源不够');
      return false;
    }
    gesture.placedIds.add(res.building.id);
    lastBeltDir = res.building.dir;
    placeDir = res.building.dir;
    handleEvents(state.events.splice(0));
    return true;
  }
  function placeAlong(from, to) {
    let x = from.x;
    let y = from.y;
    let guard = 0;
    while ((x !== to.x || y !== to.y) && guard++ < 40) {
      const prev = { x, y };
      if (x !== to.x) x += Math.sign(to.x - x);
      else y += Math.sign(to.y - y);
      const dir = dirBetween(prev, { x, y });
      const pb = inMap(prev.x, prev.y) ? state.grid[prev.y][prev.x] : null;
      if (pb && pb.type === 'belt' && gesture.placedIds.has(pb.id)) pb.dir = dir;
      if (!tryPlaceOwned({ x, y }, dir)) {
        gesture.last = prev;
        return;
      }
      gesture.last = { x, y };
    }
  }
  function demolishAlong(from, to) {
    let x = from.x;
    let y = from.y;
    let guard = 0;
    while ((x !== to.x || y !== to.y) && guard++ < 40) {
      if (x !== to.x) x += Math.sign(to.x - x);
      else y += Math.sign(to.y - y);
      demolishAt({ x, y }, false);
      gesture.last = { x, y };
    }
  }

  function suggestedTiles() {
    if (!state || state.tutorialStep >= 5) return [];
    if (state.tutorialStep === 1) return [[12, 12], [13, 12], [14, 12], [12, 13], [13, 13], [14, 13]];
    if (state.tutorialStep === 2) return [[7, 8], [8, 8], [9, 8]];
    if (state.tutorialStep === 3) {
      const duo = state.buildings.find((b) => b.type === 'duo');
      return duo ? [[duo.x, duo.y]] : [[8, 8]];
    }
    return [];
  }

  function render() {
    resize();
    const ctx = viewCtx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#0c0e0a';
    ctx.fillRect(0, 0, viewW, viewH);
    const mag = shake > 0.4 ? shake : 0;
    const shx = mag ? Math.round((Math.random() - 0.5) * mag * 2) : 0;
    const shy = mag ? Math.round((Math.random() - 0.5) * mag * 2) : 0;
    ctx.translate(shx, shy);
    drawWorld(ctx);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMinimap(ctx);
    if (shake > 0) shake *= 0.86;
  }

  function drawWorld(ctx) {
    const s = tilePx();
    const x0 = Math.floor(cam.x - viewW / 2 / s) - 1;
    const x1 = Math.ceil(cam.x + viewW / 2 / s) + 1;
    const y0 = Math.floor(cam.y - viewH / 2 / s) - 1;
    const y1 = Math.ceil(cam.y + viewH / 2 / s) + 1;
    const haz = Math.floor(state.time * 2) % 2;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!inMap(x, y)) continue;
        const [sx, sy] = tileOrigin(x, y);
        const tile = state.tiles[y][x];
        let sp = sprites.ground[tile.variant];
        if (tile.kind === 'rock') sp = sprites.rock;
        else if (tile.kind === 'spawn') sp = sprites.spawn;
        else if (tile.kind === 'hazard') sp = sprites.hazard[haz];
        else if (tile.ore) sp = sprites.ore[tile.ore];
        else if (tile.deco === 'pit') sp = sprites.pit;
        else if (tile.deco === 'river') sp = sprites.river;
        ctx.drawImage(sp, sx, sy, s, s);
      }
    }
    const [mx, my] = tileOrigin(0, 0);
    ctx.strokeStyle = '#6a542c';
    ctx.lineWidth = 2;
    ctx.strokeRect(mx - 1, my - 1, state.w * s + 2, state.h * s + 2);
    ctx.font = '700 ' + Math.max(10, Math.round(s * 0.42)) + 'px "PingFang SC","Noto Sans SC",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb0a0';
    const [sx0, sy0] = tileOrigin(7, 0);
    ctx.fillText('敌袭', sx0 + s / 2, sy0 + s * 0.72);
    if (showPath && state.flow) drawFlow(ctx, x0, x1, y0, y1);
    if (tool !== 'hand' && tool !== 'demo') drawGrid(ctx, x0, x1, y0, y1);
    const rise = state.over === 'launch' ? Math.min(2.4, (performance.now() - launchAt) / 700) : 0;
    drawCore(ctx, rise);
    for (const b of state.buildings) drawBuilding(ctx, b);
    drawItems(ctx);
    drawGhost(ctx);
    for (const t of suggestedTiles()) {
      const [sx, sy] = tileOrigin(t[0], t[1]);
      ctx.fillStyle = 'rgba(255, 208, 90, ' + (0.18 + 0.16 * Math.sin(state.time * 5)) + ')';
      ctx.fillRect(sx, sy, s, s);
    }
    for (const e of state.enemies) drawEnemy(ctx, e);
    drawProjectiles(ctx);
    drawFx(ctx);
    if (selected) drawSelect(ctx);
  }

  function drawGrid(ctx, x0, x1, y0, y1) {
    const s = tilePx();
    ctx.fillStyle = 'rgba(239,231,214,0.05)';
    for (let x = x0; x <= x1; x++) {
      const [sx] = tileOrigin(x, 0);
      ctx.fillRect(sx, 0, 1, viewH);
    }
    for (let y = y0; y <= y1; y++) {
      const [, sy] = tileOrigin(0, y);
      ctx.fillRect(0, sy, viewW, 1);
    }
    void s;
  }
  function drawFlow(ctx, x0, x1, y0, y1) {
    const s = tilePx();
    const u = s / 16;
    ctx.fillStyle = 'rgba(215, 196, 154, 0.28)';
    for (let y = Math.max(0, y0); y <= Math.min(state.h - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(state.w - 1, x1); x++) {
        if (state.grid[y][x]) continue;
        const dir = state.flow[y * state.w + x];
        if (dir < 0) continue;
        const [sx, sy] = tileOrigin(x, y);
        const cx = sx + 8 * u;
        const cy = sy + 8 * u;
        if (dir === 0) ctx.fillRect(cx + 2 * u, cy - u, 3 * u, 2 * u);
        else if (dir === 1) ctx.fillRect(cx - u, cy + 2 * u, 2 * u, 3 * u);
        else if (dir === 2) ctx.fillRect(cx - 5 * u, cy - u, 3 * u, 2 * u);
        else ctx.fillRect(cx - u, cy - 5 * u, 2 * u, 3 * u);
      }
    }
  }
  function drawCore(ctx, rise) {
    const s = tilePx();
    const [sx, sy] = tileOrigin(state.core.x, state.core.y);
    const frame = Math.floor(state.time * 2) % 2;
    ctx.drawImage(sprites.core[frame], sx, Math.round(sy - rise * s), s * 2, s * 2);
    const ratio = state.core.hp / state.core.maxHp;
    const w = s * 2 - 8;
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(sx + 4, sy - 6, w, 3);
    ctx.fillStyle = ratio < 0.35 ? '#d84b3a' : '#e3a045';
    ctx.fillRect(sx + 4, sy - 6, Math.max(1, Math.round(w * ratio)), 3);
  }
  function drawBuilding(ctx, b) {
    const [sx, sy, s] = tileOrigin(b.x, b.y);
    const frame = Math.floor(state.time * (b.stalled ? 2 : 8) + b.id) % 4;
    if (b.type === 'belt') ctx.drawImage(sprites.belt[b.dir][frame], sx, sy, s, s);
    else if (b.type === 'router') ctx.drawImage(sprites.router, sx, sy, s, s);
    else if (b.type === 'junction') ctx.drawImage(sprites.junction, sx, sy, s, s);
    else if (b.type === 'drill') ctx.drawImage(sprites.drill[frame], sx, sy, s, s);
    else if (b.type === 'tidrill') ctx.drawImage(sprites.buildings.tidrill, sx, sy, s, s);
    else if (b.type === 'generator') ctx.drawImage(b.burn > 0 ? sprites.buildings.generatorOn : sprites.buildings.generator, sx, sy, s, s);
    else if (sprites.buildings[b.type]) ctx.drawImage(sprites.buildings[b.type], sx, sy, s, s);
    if (b.type === 'drill' || b.type === 'tidrill' || b.type === 'press') {
      ctx.drawImage(sprites.arrow[b.dir], sx, sy, s, s);
    }
    const tdef = sim.BUILDINGS[b.type].turret;
    if (tdef) drawBarrel(ctx, sx + s / 2, sy + s / 2, b.angle || 0, s * 0.42, b.type);
    if (tdef) {
      const p = b.ammo / tdef.ammoMax;
      ctx.fillStyle = '#1a120c';
      ctx.fillRect(sx + 2, sy + s - 3, s - 4, 2);
      ctx.fillStyle = p > 0 ? ITEM_COLOR[tdef.ammo] : '#d84b3a';
      ctx.fillRect(sx + 2, sy + s - 3, Math.max(0, Math.round((s - 4) * p)), 2);
    }
    if (b.type === 'press' && b.craft > 0) {
      ctx.fillStyle = '#c2b8a4';
      ctx.fillRect(sx + 2, sy + s - 3, Math.round((s - 4) * (1 - b.craft / 1.45)), 2);
    }
    if (b.hp < b.maxHp) {
      ctx.fillStyle = '#1a120c';
      ctx.fillRect(sx + 2, sy - 3, s - 4, 2);
      ctx.fillStyle = b.hp / b.maxHp < 0.35 ? '#d84b3a' : '#8fce6a';
      ctx.fillRect(sx + 2, sy - 3, Math.max(1, Math.round((s - 4) * b.hp / b.maxHp)), 2);
    }
    if (b.empty || b.unpowered || b.stalled) {
      ctx.fillStyle = b.unpowered ? '#7ee0dc' : '#d84b3a';
      ctx.fillRect(sx + s - 5, sy + 2, 3, 3);
    }
  }
  function drawBarrel(ctx, cx, cy, angle, len, type) {
    const dirs = 8;
    const q = Math.round(angle / (Math.PI * 2 / dirs));
    const a = q * Math.PI * 2 / dirs;
    const color = type === 'scatter' ? '#d5e4ee' : type === 'salvo' ? '#efe7d6' : '#ffd48a';
    ctx.fillStyle = '#1c1814';
    const u = Math.max(2, tilePx() / 10);
    for (let i = 1; i <= 4; i++) {
      const x = Math.round(cx + Math.cos(a) * len * (i / 4));
      const y = Math.round(cy + Math.sin(a) * len * (i / 4));
      ctx.fillStyle = i === 4 ? color : '#3a342c';
      ctx.fillRect(x - u / 2, y - u / 2, u, u);
    }
  }
  function drawItems(ctx) {
    const s = tilePx();
    const u = s / 16;
    for (const b of state.buildings) {
      if (!b.items || !b.items.length) continue;
      const [sx, sy] = tileOrigin(b.x, b.y);
      for (const it of b.items) {
        if (it.dead) continue;
        const p = clamp(it.t, 0, 1);
        let ix;
        let iy;
        const dir = b.type === 'junction' ? it.dir : b.dir;
        ix = 8 - sim.DX[dir] * 6 + sim.DX[dir] * 12 * p;
        iy = 8 - sim.DY[dir] * 6 + sim.DY[dir] * 12 * p;
        const px = Math.round(sx + (ix - 1.5) * u);
        const py = Math.round(sy + (iy - 1.5) * u);
        ctx.fillStyle = '#1a140c';
        ctx.fillRect(px - 1, py - 1, 5 * u, 5 * u);
        ctx.fillStyle = ITEM_COLOR[it.type] || '#fff';
        ctx.fillRect(px, py, 3 * u, 3 * u);
      }
      if (b.type === 'router' && b.buffer.length) {
        ctx.fillStyle = ITEM_COLOR[b.buffer[0]] || '#fff';
        ctx.fillRect(sx + 6 * u, sy + 6 * u, 4 * u, 4 * u);
      }
    }
  }
  function drawGhost(ctx) {
    if (!hover || !inMap(hover.x, hover.y)) return;
    if (tool === 'hand' || tool === 'demo') return;
    const [sx, sy, s] = tileOrigin(hover.x, hover.y);
    const err = placeError(tool, hover.x, hover.y);
    ctx.save();
    ctx.globalAlpha = 0.62;
    const fake = { type: tool, x: hover.x, y: hover.y, dir: ghostDir(tool, hover.x, hover.y), id: 0, hp: 1, maxHp: 1, ammo: 0, items: [], burn: 0, craft: 0, stalled: false, angle: 0 };
    if (tool === 'belt') ctx.drawImage(sprites.belt[fake.dir][0], sx, sy, s, s);
    else if (sprites.buildings[tool]) ctx.drawImage(sprites.buildings[tool], sx, sy, s, s);
    else if (tool === 'drill' || tool === 'tidrill') ctx.drawImage(sprites.drill[0], sx, sy, s, s);
    else if (tool === 'router') ctx.drawImage(sprites.router, sx, sy, s, s);
    else if (tool === 'junction') ctx.drawImage(sprites.junction, sx, sy, s, s);
    ctx.restore();
    ctx.fillStyle = err ? 'rgba(216,75,58,0.28)' : 'rgba(143,206,106,0.22)';
    ctx.fillRect(sx, sy, s, s);
    if (tool === 'drill' || tool === 'tidrill' || tool === 'press' || tool === 'belt') {
      ctx.drawImage(sprites.arrow[fake.dir], sx, sy, s, s);
    }
    const tdef = sim.BUILDINGS[tool] && sim.BUILDINGS[tool].turret;
    if (tdef || tool === 'repair') {
      const range = tdef ? tdef.range : 3.15;
      ctx.beginPath();
      ctx.arc(sx + s / 2, sy + s / 2, range * s, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(227,160,69,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  function drawSelect(ctx) {
    let x = selected.x;
    let y = selected.y;
    let w = 1;
    let h = 1;
    if (selected.core) { w = 2; h = 2; }
    const [sx, sy, s] = tileOrigin(x, y);
    ctx.strokeStyle = '#ffe08a';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, s * w - 2, s * h - 2);
    const b = !selected.core && state.grid[y] && state.grid[y][x];
    const tdef = b && sim.BUILDINGS[b.type].turret;
    if (tdef) {
      ctx.beginPath();
      ctx.arc(sx + s / 2, sy + s / 2, tdef.range * s, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(227,160,69,0.45)';
      ctx.stroke();
    }
  }
  function drawEnemy(ctx, e) {
    const s = tilePx();
    const [ox, oy] = tileOrigin(0, 0);
    const cx = Math.round(ox + e.x * s);
    const cy = Math.round(oy + e.y * s + Math.sin(state.time * (e.type === 'rusher' ? 16 : 8) + e.id) * (s / 16));
    const u = Math.max(1, s / 16);
    const r = Math.max(3, e.radius * s);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(cx - r, cy + r * 0.4, r * 2, u * 2);
    let body = '#d84b3a';
    if (e.type === 'rusher') body = '#e07a32';
    else if (e.type === 'armored') body = '#8d7b88';
    else if (e.type === 'wasp') body = '#c456d0';
    else if (e.type === 'boss') body = '#8d2a2a';
    if (e.flash > 0) body = '#fff4d0';
    ctx.fillStyle = '#1c1814';
    ctx.fillRect(cx - r - u, cy - r * 0.7 - u, r * 2 + u * 2, r * 1.4 + u * 2);
    ctx.fillStyle = body;
    ctx.fillRect(cx - r, cy - r * 0.7, r * 2, r * 1.4);
    ctx.fillStyle = '#1c1814';
    ctx.fillRect(cx - u, cy - u, u * 2, u * 2);
    if (!e.flying) {
      const leg = Math.sin(state.time * 10 + e.id) > 0 ? u : -u;
      ctx.fillStyle = '#1c1814';
      ctx.fillRect(cx - r - u, cy + leg, u * 2, u);
      ctx.fillRect(cx + r - u, cy - leg, u * 2, u);
    } else {
      ctx.fillStyle = 'rgba(255,220,255,0.8)';
      const wing = 2 + Math.sin(state.time * 20 + e.id) * 2;
      ctx.fillRect(cx - r - wing, cy - u, wing, u * 2);
      ctx.fillRect(cx + r, cy - u, wing, u * 2);
    }
    if (e.type === 'boss' || e.hp < e.maxHp) {
      const w = Math.max(10, r * 2);
      ctx.fillStyle = '#1a120c';
      ctx.fillRect(cx - w / 2, cy - r - 5, w, 3);
      ctx.fillStyle = '#d84b3a';
      ctx.fillRect(cx - w / 2, cy - r - 5, Math.max(1, w * e.hp / e.maxHp), 3);
    }
  }
  function drawProjectiles(ctx) {
    const s = tilePx();
    const [ox, oy] = tileOrigin(0, 0);
    const u = Math.max(2, s / 12);
    for (const p of state.projectiles) {
      const x = Math.round(ox + p.x * s);
      const y = Math.round(oy + p.y * s);
      ctx.fillStyle = '#fff4d0';
      ctx.fillRect(x - u / 2, y - u / 2, u, u);
      ctx.fillStyle = 'rgba(255,196,80,0.7)';
      ctx.fillRect(x - p.vx * 0.02 * s, y - p.vy * 0.02 * s, u, u);
    }
    for (const f of flashes) {
      const x = Math.round(ox + f.x * s);
      const y = Math.round(oy + f.y * s);
      ctx.fillStyle = '#fff4d0';
      ctx.fillRect(x - u, y - u, u * 2, u * 2);
    }
  }
  function drawFx(ctx) {
    const s = tilePx();
    const [ox, oy] = tileOrigin(0, 0);
    for (const p of particles) {
      const x = Math.round(ox + p.x * s);
      const y = Math.round(oy + p.y * s);
      ctx.globalAlpha = Math.max(0, p.life / 0.6);
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, p.size, p.size);
      ctx.globalAlpha = 1;
    }
    ctx.font = '700 12px "PingFang SC","Noto Sans SC",sans-serif';
    ctx.textAlign = 'center';
    for (const f of floaters) {
      const x = Math.round(ox + f.x * s);
      const y = Math.round(oy + f.y * s - (1 - f.life) * 16);
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = '#1a1208';
      ctx.fillText(f.text, x + 1, y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
      ctx.globalAlpha = 1;
    }
  }
  function drawMinimap(ctx) {
    const sc = viewW < 380 ? 3 : 4;
    const mw = state.w * sc;
    const mh = state.h * sc;
    const x = viewW - mw - 8;
    const y = 8;
    minimapRect = { x, y, w: mw, h: mh, s: sc };
    ctx.fillStyle = 'rgba(12,14,10,0.86)';
    ctx.fillRect(x - 3, y - 3, mw + 6, mh + 6);
    ctx.strokeStyle = '#6a542c';
    ctx.strokeRect(x - 3, y - 3, mw + 6, mh + 6);
    for (let ty = 0; ty < state.h; ty++) {
      for (let tx = 0; tx < state.w; tx++) {
        const tile = state.tiles[ty][tx];
        let color = '#3c4632';
        if (tile.kind === 'rock') color = '#6a5e50';
        else if (tile.kind === 'hazard' || tile.kind === 'spawn') color = '#6a3030';
        else if (tile.ore) color = ITEM_COLOR[tile.ore];
        else if (tile.deco === 'river') color = '#6a5434';
        ctx.fillStyle = color;
        ctx.fillRect(x + tx * sc, y + ty * sc, sc, sc);
      }
    }
    ctx.fillStyle = '#ffc857';
    ctx.fillRect(x + state.core.x * sc, y + state.core.y * sc, sc * 2, sc * 2);
    ctx.fillStyle = '#efe7d6';
    for (const b of state.buildings) {
      if (b.type === 'belt') continue;
      ctx.fillRect(x + b.x * sc, y + b.y * sc, sc, sc);
    }
    ctx.fillStyle = '#d84b3a';
    for (const e of state.enemies) ctx.fillRect(x + e.x * sc, y + e.y * sc, sc, sc);
    const s = tilePx();
    const vx = (cam.x - viewW / 2 / s) * sc;
    const vy = (cam.y - viewH / 2 / s) * sc;
    ctx.strokeStyle = '#ffe08a';
    ctx.strokeRect(x + vx, y + vy, viewW / s * sc, viewH / s * sc);
  }

  function drawTitle(ts) {
    const ctx = titleCtx;
    const w = titleCanvas.width;
    const h = titleCanvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#1a2016';
    ctx.fillRect(0, 0, w, h);
    const t = ts / 1000;
    const s = 16;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 13; x++) {
        const sp = y === 5 ? sprites.river : sprites.ground[(x + y) & 3];
        ctx.drawImage(sp, x * s, y * s, s, s);
      }
    }
    ctx.drawImage(sprites.ore.copper, s, 3 * s);
    ctx.drawImage(sprites.ore.lead, 11 * s, 2 * s);
    ctx.drawImage(sprites.drill[Math.floor(t * 8) % 4], s, 3 * s);
    ctx.drawImage(sprites.arrow[0], s, 3 * s);
    for (let i = 2; i <= 5; i++) ctx.drawImage(sprites.belt[0][Math.floor(t * 6) % 4], i * s, 3 * s);
    ctx.drawImage(sprites.belt[1][Math.floor(t * 6) % 4], 5 * s, 4 * s);
    ctx.drawImage(sprites.core[Math.floor(t * 2) % 2], 6 * s, 4 * s);
    ctx.drawImage(sprites.buildings.cwall, 8 * s, 2 * s);
    ctx.drawImage(sprites.buildings.duo, 9 * s, 2 * s);
    const crawlerX = 10 * s + 8 + Math.sin(t * 1.4) * 10;
    ctx.fillStyle = '#d84b3a';
    ctx.fillRect(crawlerX, 1 * s + 4, 8, 6);
    ctx.fillStyle = '#1c1814';
    ctx.fillRect(crawlerX + 2, 1 * s + 6, 2, 2);
    const p = (t * 0.7) % 1;
    ctx.fillStyle = '#e39a3c';
    ctx.fillRect(2 * s + p * s * 3, 3 * s + 6, 4, 4);
    if (Math.floor(t * 2) % 2 === 0) {
      ctx.fillStyle = '#fff4d0';
      ctx.fillRect(9 * s + 10, 1 * s + 6, 3, 3);
    }
  }

  function updateFx(dt) {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
    for (const f of floaters) f.life -= dt;
    floaters = floaters.filter((f) => f.life > 0);
    for (const f of flashes) f.life -= dt;
    flashes = flashes.filter((f) => f.life > 0);
    if (!state) return;
    deliverAcc += dt;
    if (deliverAcc >= 0.45) {
      deliverAcc = 0;
      const parts = [];
      sim.ITEM_KEYS.forEach((k) => {
        if (deliverBatch[k]) {
          parts.push('+' + deliverBatch[k] + ITEM_NAME[k]);
          deliverBatch[k] = 0;
        }
      });
      if (parts.length) floatText(state.core.x + 1, state.core.y, parts.join(' '), '#ffe7a8');
    }
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, lastTs ? (ts - lastTs) / 1000 : 0);
    lastTs = ts;
    if (mode === 'title') {
      drawTitle(ts);
      return;
    }
    if (!state) return;
    if (gesture && gesture.mode === 'draw' && (edge.x || edge.y)) {
      cam.x += edge.x * dt * 7;
      cam.y += edge.y * dt * 7;
      clampCam();
    }
    if (!state.paused && !state.over) {
      acc += dt;
      let guard = 0;
      while (acc >= 1 / 30 && guard++ < 3) {
        sim.update(state, 1 / 30);
        acc -= 1 / 30;
      }
      handleEvents(state.events.splice(0));
      advanceTutorial();
      saveAcc += dt;
      if (saveAcc > 2) {
        saveAcc = 0;
        saveGame();
      }
    }
    updateFx(dt);
    render();
    syncUI();
  }

  function bind() {
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    $('btn-start').addEventListener('click', () => { audio(); hasSave() ? confirmNew() : begin(sim.createState()); });
    $('btn-continue').addEventListener('click', () => { audio(); continueGame(); });
    $('btn-help').addEventListener('click', openHelp);
    $('coach-btn').addEventListener('click', () => {
      if (!state) return;
      if (state.tutorialStep === 0) setTutorial(1);
      else setTutorial(5);
    });
    $('tool-hand').addEventListener('click', () => setTool('hand'));
    $('tool-demo').addEventListener('click', () => setTool('demo'));
    $('tool-rot').addEventListener('click', doRotate);
    $('btn-path').addEventListener('click', () => {
      showPath = !showPath;
      saveSettings();
      syncToolClasses();
      toast(showPath ? '已显示敌人路径' : '已隐藏路径');
    });
    $('btn-wave').addEventListener('click', callWave);
    $('btn-launch').addEventListener('click', openLaunch);
    $('btn-pause').addEventListener('click', openPause);
    $('btn-focus').addEventListener('click', focusCore);
    $('btn-speed').addEventListener('click', () => {
      if (!state) return;
      sim.setSpeed(state, state.speed >= 2 ? 1 : 2);
      toast(state.speed >= 2 ? '两倍速' : '正常速度');
    });
    $('btn-sound').addEventListener('click', () => {
      soundOn = !soundOn;
      saveSettings();
      if (soundOn) { audio(); sfx('place'); }
      syncUI();
    });
    $('zoom-in').addEventListener('click', () => zoomBy(1));
    $('zoom-out').addEventListener('click', () => zoomBy(-1));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!$('modal').hidden) hideModal();
        else openPause();
        return;
      }
      if (mode !== 'play' || !state || !$('modal').hidden) return;
      const step = e.shiftKey ? 0.35 : 0.8;
      if (e.key === 'ArrowLeft' || e.key === 'a') cam.x -= step;
      else if (e.key === 'ArrowRight' || e.key === 'd') cam.x += step;
      else if (e.key === 'ArrowUp' || e.key === 'w') cam.y -= step;
      else if (e.key === 'ArrowDown' || e.key === 's') cam.y += step;
      else if (e.key === ' ') { e.preventDefault(); callWave(); }
      else if (e.key === 'r' || e.key === 'R') doRotate();
      else if (e.key === 'q') setTool('hand');
      else if (e.key === 'x') setTool('demo');
      else if (e.key === 'f') focusCore();
      else if (e.key === '+' || e.key === '=') zoomBy(1);
      else if (e.key === '-' || e.key === '_') zoomBy(-1);
      else return;
      clampCam();
    });
    window.addEventListener('resize', () => { if (mode === 'play') resize(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) saveGame(); });
    window.addEventListener('pagehide', saveGame);
    window.addEventListener('error', (err) => {
      const box = document.createElement('pre');
      box.textContent = '出错了：' + (err.message || err);
      box.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:80;background:#3a1410;color:#fff;padding:8px;white-space:pre-wrap;font-size:12px';
      document.body.appendChild(box);
    });
  }

  loadSettings();
  initSprites();
  buildResources();
  bind();
  showTitle();
  requestAnimationFrame(frame);
})();
