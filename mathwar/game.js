'use strict';
/* ============================================================
   《数学之战》 Math Battle
   阳光 = 积分。子弹把僵尸数字向 0 推进，归零死亡。
   ============================================================ */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
if (!ctx.roundRect){ CanvasRenderingContext2D.prototype.roundRect = function(x,y,w,h,r){ r=Math.min(r,w/2,h/2); this.moveTo(x+r,y); this.arcTo(x+w,y,x+w,y+h,r); this.arcTo(x+w,y+h,x,y+h,r); this.arcTo(x,y+h,x,y,r); this.arcTo(x,y,x+w,y,r); this.closePath(); }; }
const COLS = 6, CELL_W = 110, CELL_H = 84, GX = 95;
let GY = 46;
const W = 960, H = 540;

/* ---------------- 植物图鉴 ---------------- */
const PLANTS = {
  pea:      { name:'豌豆射手', num:'1',   cost:50,  cd:5,  hp:30,  shoot:1.0, bullet:{kind:'toward',power:1,label:'1'},  color:'#3fbf4f', desc:'每秒发射 1 枚「1」，把僵尸数字向 0 推进 1。' },
  sun:      { name:'阳光向日葵', num:'+25', cost:50,  cd:4,  hp:30,  sunEvery:3,  sunAmt:25, color:'#f5b301', desc:'每 3 秒生产 25 阳光（第 2 关解锁）。' },
  mine1:    { name:'×1 地雷',  num:'×1',  cost:40,  cd:8,  hp:999, arm:15, mine:'set1', edgeOnly:true, color:'#444', desc:'必须种在草地第一行或最后一行。准备 15 秒后变成「×1」：僵尸踩中时数字被强制变成 1，之后一发子弹就能送它归零（第 3 关解锁）。' },
  plus:     { name:'加法射手', num:'+2',  cost:75,  cd:5,  hp:30,  shoot:1.2, bullet:{kind:'add',power:2,label:'+2'}, color:'#3a86ff', desc:'发射「+2」：对负数僵尸推进 2，对正数僵尸反而 +2 加血！（第 4 关）' },
  minus:    { name:'减法射手', num:'-2',  cost:75,  cd:5,  hp:30,  shoot:1.2, bullet:{kind:'sub',power:2,label:'-2'}, color:'#9b5de5', desc:'发射「-2」：对正数僵尸推进 2，对负数僵尸反而 -2 加血！（第 4 关）' },
  ice:      { name:'寒冰射手', num:'❄1',  cost:100, cd:5,  hp:30,  shoot:0.9, bullet:{kind:'toward',power:1,label:'1',slow:2.5}, color:'#4cc9f0', desc:'发射「1」并让僵尸减速 50%（2.5 秒）。（第 5 关）' },
  wall:     { name:'括号墙',   num:'()',  cost:50,  cd:10, hp:250, color:'#b08968', desc:'高血量肉盾，挡住僵尸啃食。（第 5 关）' },
  repeater: { name:'双发射手', num:'1×2', cost:100, cd:5,  hp:30,  shoot:1.0, shots:2, bullet:{kind:'toward',power:1,label:'1'}, color:'#2a9d3f', desc:'每秒连发 2 枚「1」，火力是豌豆射手的两倍。（第 6 关）' },
  double:   { name:'乘2射手',  num:'2',   cost:125, cd:5,  hp:30,  shoot:0.8, bullet:{kind:'toward',power:2,label:'2'}, color:'#ff8c42', desc:'每 0.8 秒发射「2」，一次向 0 推进 2。（第 6 关）' },
  mineHalf: { name:'÷2 地雷',  num:'÷2',  cost:75,  cd:8,  hp:999, arm:10, mine:'half', edgeOnly:true, color:'#555', desc:'必须种在第一行或最后一行（草地边缘）。准备 10 秒后引爆，僵尸数字减半（向 0，±1 直接归零）。（第 7 关）' },
  mushroom: { name:'阳光菇',   num:'+50', cost:100, cd:5,  hp:30,  sunEvery:4,  sunAmt:50, color:'#c97b4a', desc:'每 4 秒生产 50 阳光，比向日葵更高效。（第 7 关）' },
  laser:    { name:'等号激光', num:'=3',  cost:200, cd:5,  hp:30,  shoot:1.8, bullet:{kind:'toward',power:3,label:'3',pierce:true}, color:'#ef476f', desc:'发射穿透「3」：沿整行贯穿所有僵尸，每只都向 0 推进 3。（第 8 关）' },
  random:   { name:'随机射手', num:'?',   cost:100, cd:5,  hp:30,  shoot:0.8, bullet:{kind:'random',label:'?'}, color:'#ffd166', desc:'每 0.8 秒随机发射 1~3，向 0 推进。（第 8 关）' },
  zero:     { name:'×0 炮',    num:'×0',  cost:250, cd:5,  hp:30,  shoot:5.0, bullet:{kind:'zero',label:'×0'}, color:'#222', desc:'每 5 秒发射「×0」，命中直接归零击杀——无视数字多大。（第 9 关）' },
};
const PLANT_ORDER = ['pea','sun','mine1','plus','minus','ice','wall','repeater','double','mineHalf','mushroom','laser','random','zero'];

/* ---------------- 僵尸类型 ---------------- */
const ZTYPES = {
  normal:{ name:'普通僵尸', speed:14, scale:1 },
  fast:  { name:'快速僵尸', speed:26, scale:1 },
  bucket:{ name:'铁桶僵尸', speed:11, scale:1.15 },
  shield:{ name:'护盾僵尸', speed:14, scale:1, shield:true },
  fly:   { name:'飞行僵尸', speed:16, scale:1, fly:true },
  revive:{ name:'复活僵尸', speed:14, scale:1, revive:true },
  giant: { name:'巨型僵尸', speed:10, scale:1.35 },
  boss:  { name:'数学教授', speed:9,  scale:1.55 },
};

/* ---------------- 10 关配置 ---------------- */
const LEVELS = [
  { name:'教学关 · 只有一行路', rows:1, startSun:50, passiveEvery:0.2, passiveAmt:1, lives:3,
    plants:['pea'], total:8, spawnEvery:8.5, first:14, valMin:1, valMax:5, sign:'neg', types:['normal'],
    par:70, tip:'教学关：阳光每 0.2 秒自动 +1。种下「豌豆射手（1）」，它每秒发射一枚「1」；僵尸的数字是 -1~-5，每被打中一次就 +1，归零死亡！' },
  { name:'阳光花园', rows:2, startSun:75, passiveEvery:1, passiveAmt:1, lives:5,
    plants:['pea','sun'], total:12, spawnEvery:7.5, first:16, valMin:1, valMax:6, sign:'neg', types:['normal'],
    par:95, tip:'新角色：阳光向日葵（每 3 秒 +25）。被动阳光变慢了，先种向日葵攒积分，再铺豌豆射手！' },
  { name:'地雷阵地', rows:3, startSun:100, passiveEvery:0.35, passiveAmt:1, lives:5,
    plants:['pea','sun','mine1'], total:15, spawnEvery:7.0, first:16, valMin:1, valMax:5, sign:'mix', types:['normal'],
    par:110, tip:'新角色：×1 地雷（准备 15 秒，只能种在草地第一行或最后一行）。现在有正数僵尸了：不管正负，子弹都让数字向 0 靠近 1。地雷踩中后数字强制变成 1，之后一发「1」就能归零！' },
  { name:'正负之间', rows:3, startSun:100, passiveEvery:0.35, passiveAmt:1, lives:5,
    plants:['pea','sun','mine1','plus','minus'], total:16, spawnEvery:6.5, first:16, valMin:1, valMax:8, sign:'mix', types:['normal','normal','bucket'],
    par:110, tip:'新角色：加法射手（+2）专打负数、减法射手（-2）专打正数——用错了反而给僵尸加血！铁桶僵尸数字更大。' },
  { name:'寒冰防线', rows:4, startSun:125, passiveEvery:0.35, passiveAmt:1, lives:5,
    plants:['pea','sun','mine1','plus','minus','ice','wall'], total:18, spawnEvery:6.0, first:16, valMin:1, valMax:8, sign:'mix', types:['normal','fast','bucket'],
    par:115, tip:'新角色：寒冰射手（命中减速 50%%）+ 括号墙（250 点血肉盾）。快速僵尸冲得很快，用冰冻和墙拖住它！' },
  { name:'火力全开', rows:4, startSun:150, passiveEvery:0.35, passiveAmt:1, lives:5,
    plants:['pea','sun','mine1','plus','minus','ice','wall','repeater','double'], total:20, spawnEvery:5.6, first:16, valMin:1, valMax:10, sign:'mix', types:['normal','fast','bucket','shield'],
    par:120, tip:'新角色：双发射手（一次 2 枚「1」）+ 乘2射手（一次推进 2）。护盾僵尸能挡下第一发子弹！' },
  { name:'巨兽来袭', rows:5, startSun:175, passiveEvery:0.35, passiveAmt:1, lives:5,
    plants:['pea','sun','mine1','plus','minus','ice','wall','repeater','double','mineHalf','mushroom'], total:22, spawnEvery:5.2, first:16, valMin:1, valMax:12, sign:'mix', types:['normal','fast','bucket','shield','giant'],
    par:125, tip:'新角色：÷2 地雷（边缘可用，把数字减半，±1 直接归零）+ 阳光菇（每 4 秒 +50）。巨型僵尸数字高达 ±12，地雷最克它！' },
  { name:'天空防线', rows:5, startSun:200, passiveEvery:0.35, passiveAmt:1, lives:5,
    plants:['pea','sun','mine1','plus','minus','ice','wall','repeater','double','mineHalf','mushroom','laser','random'], total:24, spawnEvery:4.8, first:16, valMin:1, valMax:12, sign:'mix', types:['normal','fast','bucket','shield','giant','fly'],
    par:130, tip:'新角色：等号激光（穿透「3」，整行穿透）+ 随机射手（1~3）。飞行僵尸无视墙和地雷，只能用子弹打下来！' },
  { name:'不死之军', rows:5, startSun:200, passiveEvery:0.35, passiveAmt:1, lives:5,
    plants:['pea','sun','mine1','plus','minus','ice','wall','repeater','double','mineHalf','mushroom','laser','random','zero'], total:28, spawnEvery:4.4, first:16, valMin:1, valMax:12, sign:'mix', types:['normal','fast','bucket','shield','giant','fly','revive'],
    par:140, tip:'新角色：×0 炮（命中直接归零秒杀）。复活僵尸死一次会以 ±3 复活一次——用 ×0 炮或地雷收尾！' },
  { name:'最终决战 · 数学教授', rows:5, startSun:250, passiveEvery:0.3, passiveAmt:1, lives:5,
    plants:PLANT_ORDER.slice(), total:30, spawnEvery:4.0, first:16, valMin:1, valMax:15, sign:'mix', types:['normal','normal','fast','fast','bucket','shield','giant','fly','revive'],
    par:160, tip:'最终关：全员出战！数学教授（±30）压轴登场，×1 / ÷2 地雷 + ×0 炮就是为他准备的。' },
];

/* ---------------- 工具 ---------------- */
const $ = id => document.getElementById(id);
const rand = (a,b) => a + Math.random()*(b-a);
const randInt = (a,b) => Math.floor(rand(a,b+1));
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
function makeVal(cfg){
  const m = randInt(cfg.valMin, cfg.valMax);
  if (cfg.sign === 'neg') return -m;
  if (cfg.sign === 'pos') return m;
  return Math.random() < 0.5 ? -m : m;
}
function fmtVal(v){ return v > 0 ? '+' + v : '' + v; }

/* ---------------- 音效 ---------------- */
let audioCtx = null, soundOn = true, lastShootSnd = 0;
function beep(freq, dur, type, vol){
  if (!soundOn) return;
  try{
    if (!audioCtx) audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || 'square'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.06, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }catch(e){}
}
const sPlant = () => beep(520, .12, 'triangle', .08);
const sShoot = () => { const n = performance.now(); if (n - lastShootSnd > 90){ lastShootSnd = n; beep(880, .06, 'square', .03); } };
const sHit   = () => beep(300, .07, 'square', .05);
const sBoom  = () => { beep(90, .4, 'sawtooth', .12); beep(60, .5, 'sine', .12); };
const sSun   = () => beep(1200, .08, 'sine', .04);
const sWin   = () => { beep(523,.15,'triangle',.09); setTimeout(()=>beep(659,.15,'triangle',.09),130); setTimeout(()=>beep(784,.3,'triangle',.09),260); };
const sLose  = () => { beep(300,.3,'sawtooth',.08); setTimeout(()=>beep(200,.5,'sawtooth',.08),200); };

/* ---------------- 存档 ---------------- */
const SAVE_KEY = 'mathwar_save_v1';
function loadSave(){
  try{ return JSON.parse(localStorage.getItem(SAVE_KEY)) || {}; }catch(e){ return {}; }
}
function saveData(d){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(d)); }catch(e){} }
let save = loadSave();
if (!save.unlocked) save.unlocked = 1;
if (!save.cleared) save.cleared = [];
if (!save.stars) save.stars = {};

/* ---------------- 游戏状态 ---------------- */
let mode = 'menu'; // menu | playing | paused | won | lost
let levelIdx = 0, cfg = LEVELS[0];
let sun = 50, lives = 3, time = 0, speedMul = 1;
let grid = Array.from({length: LEVELS[0].rows}, () => Array(COLS).fill(null));
let zombies = [], bullets = [], orbs = [], particles = [], floaters = [];
let spawnQueue = [], spawnTimer = 0, spawned = 0, killed = 0;
let passiveT = 0, cardCd = {}, selected = null, shovelMode = false;
let mouse = { x:-1, y:-1 }, shake = 0, firstSpawnDelay = 5, hudT = 0;

function cellCenter(row, col){ return { x: GX + col*CELL_W + CELL_W/2, y: GY + row*CELL_H + CELL_H/2 }; }
function cellFromXY(x, y){
  const col = Math.floor((x - GX) / CELL_W), row = Math.floor((y - GY) / CELL_H);
  if (row < 0 || row >= cfg.rows || col < 0 || col >= COLS) return null;
  return { row, col };
}

function initLevel(idx){
  levelIdx = idx; cfg = LEVELS[idx];
  GY = Math.max(24, Math.floor((H - cfg.rows*CELL_H)/2) - 8);
  sun = cfg.startSun; lives = cfg.lives; time = 0; speedMul = 1;
  grid = Array.from({length: cfg.rows}, () => Array(COLS).fill(null));
  zombies = []; bullets = []; orbs = []; particles = []; floaters = [];
  spawned = 0; killed = 0; passiveT = cfg.passiveEvery; cardCd = {};
  selected = null; shovelMode = false; spawnTimer = cfg.first || firstSpawnDelay; shake = 0;
  spawnQueue = [];
  for (let i = 0; i < cfg.total; i++){
    let type = cfg.types[randInt(0, cfg.types.length-1)];
    let val = makeVal(cfg);
    if (idx === 9 && i === cfg.total - 1){ type = 'boss'; val = Math.random()<0.5 ? -30 : 30; }
    if (idx === 9 && i === cfg.total - 2){ type = 'giant'; val = Math.random()<0.5 ? -18 : 18; }
    spawnQueue.push({ row: randInt(0, cfg.rows-1), val, type });
  }
  $('levelName').textContent = '第 ' + (idx+1) + ' 关 · ' + cfg.name;
  $('btnSpeed').textContent = '▶ 1×';
  buildCards();
  updateHUD();
  setHint(cfg.tip + '  ｜ 目标：生命不减 + ' + cfg.par + ' 秒内通关 = ★★★');
  mode = 'playing';
  hideAllOverlays();
}

function buildCards(){
  const box = $('cards'); box.innerHTML = '';
  cfg.plants.forEach((key, i) => {
    const p = PLANTS[key];
    const b = document.createElement('button');
    b.className = 'card'; b.dataset.key = key;
    const KEYLABEL = ['1','2','3','4','5','6','7','8','9','0','Q','W','E','R'];
    b.innerHTML = '<span class="ckey">' + KEYLABEL[i] + '</span>' +
      '<span class="cnum" style="color:' + p.color + '">' + p.num + '</span>' +
      '<span class="cname">' + p.name + '</span>' +
      '<span class="ccost">☀ ' + p.cost + '</span>' +
      '<span class="cdov" style="display:none"></span>';
    b.title = p.desc + '（快捷键 ' + KEYLABEL[i] + '）';
    b.addEventListener('click', () => selectCard(key));
    box.appendChild(b);
  });
  refreshCards();
}
function refreshCards(){
  document.querySelectorAll('#cards .card').forEach(el => {
    const key = el.dataset.key, p = PLANTS[key];
    const cd = cardCd[key] || 0;
    el.classList.toggle('selected', selected === key);
    el.classList.toggle('cant', sun < p.cost || cd > 0);
    const dov = el.querySelector('.cdov');
    if (cd > 0){ dov.style.display = 'flex'; dov.textContent = Math.ceil(cd); }
    else dov.style.display = 'none';
  });
  $('btnShovel').classList.toggle('on', shovelMode);
}
function selectCard(key){
  if (mode !== 'playing') return;
  if (selected === key){ selected = null; setHint('已取消选择。'); }
  else{
    selected = key; shovelMode = false;
    const p = PLANTS[key];
    setHint('已选择「' + p.name + '（' + p.num + '）」：' + p.desc + ' 点击草坪种植，右键/Esc 取消。');
  }
  refreshCards();
}
function setHint(t){ $('hintbar').textContent = t; }
function updateHUD(){
  $('sunVal').textContent = Math.floor(sun);
  $('livesVal').textContent = lives;
  const total = cfg.total;
  $('progressBar').style.width = (total ? (killed/total*100) : 0) + '%';
  $('progressText').textContent = killed + '/' + total;
}

/* ---------------- 种植 / 铲子 ---------------- */
function tryPlant(row, col){
  if (!selected) return;
  const p = PLANTS[selected];
  if (p.edgeOnly && row !== 0 && row !== cfg.rows - 1){
    setHint('地雷只能种在草地边缘（第一行 / 最后一行）。'); beep(200,.12,'square',.06); return;
  }
  if (grid[row][col]){ setHint('这格已经有植物了！'); return; }
  if ((cardCd[selected]||0) > 0){ setHint('卡片冷却中…'); return; }
  if (sun < p.cost){ setHint('阳光不足！需要 ☀' + p.cost + '。'); beep(200,.12,'square',.06); return; }
  sun -= p.cost; cardCd[selected] = p.cd;
  const plant = { type:selected, row, col, hp:p.hp, maxHp:p.hp,
    shootT: rand(0.1,0.4), sunT: (p.sunEvery ? p.sunEvery*0.3 : 0), armT: p.arm || 0, armed:false, flash:0 };
  grid[row][col] = plant;
  sPlant();
  const c = cellCenter(row, col);
  burst(c.x, c.y, '#7be382', 10);
  setHint('种下「' + p.name + '」！继续防守。');
  refreshCards(); updateHUD();
}
function tryShovel(row, col){
  const pl = grid[row][col];
  if (!pl){ setHint('这格没有植物。'); return; }
  grid[row][col] = null;
  const c = cellCenter(row, col);
  burst(c.x, c.y, '#c9b86a', 10);
  setHint('已铲掉「' + PLANTS[pl.type].name + '」。');
  beep(400,.1,'triangle',.06);
}

/* ---------------- 子弹伤害 ---------------- */
function applyBullet(z, b){
  if (z.shield){
    z.shield = false;
    addFloater(z.x, z.y - 46, '护盾破!', '#7ec8ff');
    burst(z.x, z.y - 10, '#7ec8ff', 8);
    sHit(); return;
  }
  const old = z.val;
  if (b.kind === 'toward'){
    if (Math.abs(old) <= b.power) z.val = 0;
    else z.val = old - Math.sign(old) * b.power;
  } else if (b.kind === 'add'){
    const nv = old + b.power;
    z.val = (old < 0 && nv >= 0) ? 0 : nv;
  } else if (b.kind === 'sub'){
    const nv = old - b.power;
    z.val = (old > 0 && nv <= 0) ? 0 : nv;
  } else if (b.kind === 'zero'){
    z.val = 0;
  }
  if (b.slow) z.slowUntil = time + b.slow;
  addFloater(z.x, z.y - 46, fmtVal(old) + '→' + fmtVal(z.val), z.val === 0 ? '#ffd93d' : '#fff');
  burst(z.x, z.y - 10, '#fff', 5);
  sHit();
  if (z.val === 0) killZombie(z);
}
function killZombie(z){
  if (z.dead) return;
  if (z.revive && !z.revived){
    z.revived = true;
    z.val = Math.random() < 0.5 ? -3 : 3;
    z.slowUntil = time + 1;
    addFloater(z.x, z.y - 60, '复活!', '#7be382');
    burst(z.x, z.y, '#7be382', 16);
    return;
  }
  z.dead = true; killed++;
  burst(z.x, z.y, z.val === 0 ? '#c9b86a' : '#999', 14);
  addFloater(z.x, z.y - 60, '归零!', '#ffd93d');
  updateHUD();
}

/* ---------------- 更新 ---------------- */
function update(dt){
  time += dt;
  // 被动阳光
  passiveT -= dt;
  if (passiveT <= 0){
    passiveT = cfg.passiveEvery;
    sun += cfg.passiveAmt;
    addFloater(70, 26, '+' + cfg.passiveAmt, '#ffe066');
    if (cfg.passiveEvery <= 0.2) sSun();
    updateHUD(); refreshCards();
  }
  // 卡片冷却
  for (const k in cardCd) if (cardCd[k] > 0) cardCd[k] = Math.max(0, cardCd[k] - dt);
  hudT -= dt;
  if (hudT <= 0){ hudT = 0.15; refreshCards(); updateHUD(); }

  // 刷怪
  if (spawned < cfg.total){
    spawnTimer -= dt;
    if (spawnTimer <= 0){
      const burstN = (spawned > cfg.total*0.8 && Math.random() < 0.5) ? 2 : 1;
      for (let i = 0; i < burstN && spawned < cfg.total; i++){
        const s = spawnQueue[spawned++];
        const t = ZTYPES[s.type];
        zombies.push({ x: W - 60 + rand(0,30), y: GY + s.row*CELL_H + CELL_H/2, row:s.row,
          val:s.val, type:s.type, speed:t.speed*rand(0.9,1.1), scale:t.scale,
          shield:!!t.shield, fly:!!t.fly, revive:!!t.revive, revived:false,
          slowUntil:0, dead:false, wob:rand(0,6) });
      }
      const base = cfg.spawnEvery;
      spawnTimer = base * rand(0.75, 1.25) * (spawned > cfg.total*0.8 ? 0.6 : 1);
    }
  }

  // 植物
  for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < COLS; c++){
    const pl = grid[r][c]; if (!pl) continue;
    const p = PLANTS[pl.type];
    if (pl.flash > 0) pl.flash -= dt;
    if (p.shoot){
      pl.shootT -= dt;
      const pc = cellCenter(r, c);
      const hasTarget = zombies.some(z => !z.dead && z.row === r && z.x > pc.x - 10);
      if (pl.shootT <= 0 && hasTarget){
        pl.shootT = p.shoot;
        const shots = p.shots || 1;
        for (let i = 0; i < shots; i++){
          let b = Object.assign({}, p.bullet);
          if (b.kind === 'random'){ b.kind = 'toward'; b.power = randInt(1,3); b.label = '' + b.power; }
          bullets.push({ x: pc.x + 26 + i*14, y: pc.y - 8, row:r, kind:b.kind, power:b.power||1, label:b.label||'1', slow:b.slow||0, pierce:!!b.pierce, hit:[], speed: b.pierce ? 420 : 280 });
        }
        sShoot();
      }
    }
    if (p.sunEvery){
      pl.sunT -= dt;
      if (pl.sunT <= 0){
        pl.sunT = p.sunEvery;
        const pc = cellCenter(r, c);
        orbs.push({ x:pc.x, y:pc.y - 20, t:0, dur:0.9, amt:p.sunAmt });
        beep(1400,.07,'sine',.03);
      }
    }
    if (p.arm && !pl.armed){
      pl.armT -= dt;
      if (pl.armT <= 0){ pl.armed = true; addFloater(cellCenter(r,c).x, cellCenter(r,c).y - 30, p.num + ' 就绪!', '#ffd93d'); beep(1000,.15,'triangle',.07); }
    }
  }

  // 子弹
  for (const b of bullets){
    b.x += b.speed * dt;
    for (const z of zombies){
      if (z.dead || z.row !== b.row) continue;
      if (b.pierce && b.hit.indexOf(z) >= 0) continue;
      const half = 26 * z.scale;
      if (b.x >= z.x - half && b.x <= z.x + half){
        if (b.pierce) b.hit.push(z); else b.dead = true;
        applyBullet(z, b);
        if (!b.pierce) break;
      }
    }
  }
  bullets = bullets.filter(b => !b.dead && b.x < W + 40);
  zombies = zombies.filter(z => !z.dead);

  // 僵尸
  for (const z of zombies){
    z.wob += dt * 6;
    const slowed = time < z.slowUntil;
    const spd = z.speed * (slowed ? 0.5 : 1);
    const col = Math.floor((z.x - GX) / CELL_W);
    let eating = false;
    if (col >= 0 && col < COLS){
      const pl = grid[z.row][col];
      if (pl){
        const p = PLANTS[pl.type];
        if (p.mine && pl.armed && !z.fly){
          // 地雷引爆
          grid[z.row][col] = null;
          const pc = cellCenter(z.row, col);
          burst(pc.x, pc.y, '#ffb703', 26);
          shake = 8; sBoom();
          if (p.mine === 'set1'){
            z.val = 1;
            addFloater(z.x, z.y - 60, '×1! 数字 → +1', '#ffd93d');
          } else {
            z.val = Math.trunc(z.val / 2);
            addFloater(z.x, z.y - 60, '÷2! → ' + fmtVal(z.val), '#ffd93d');
            if (z.val === 0) killZombie(z);
          }
        } else if (!p.mine && !z.fly){
          eating = true;
          pl.hp -= 10 * dt; pl.flash = 0.15;
          if (pl.hp <= 0){
            grid[z.row][col] = null;
            burst(pc0(z.row,col).x, pc0(z.row,col).y, '#c9b86a', 10);
            addFloater(pc0(z.row,col).x, pc0(z.row,col).y - 30, '被吃掉!', '#ff6b6b');
          }
        }
      }
    }
    if (!eating && !z.dead) z.x -= spd * dt;
    if (z.x < GX - 18){
      z.dead = true; lives--;
      shake = 10; sLose();
      addFloater(GX + 10, z.y - 40, '僵尸进屋! -1❤', '#ff6b6b');
      flashRed(); updateHUD();
      if (lives <= 0){ gameOver(false); return; }
    }
  }
  zombies = zombies.filter(z => !z.dead);

  // 阳光球
  for (const o of orbs){
    o.t += dt / o.dur;
    o.x += (50 - o.x) * Math.min(1, dt*4);
    o.y += (18 - o.y) * Math.min(1, dt*4);
    if (o.t >= 1){ o.dead = true; sun += o.amt; addFloater(70, 30, '+' + o.amt, '#ffe066'); sSun(); updateHUD(); refreshCards(); }
  }
  orbs = orbs.filter(o => !o.dead);

  // 粒子 / 飘字
  for (const pt of particles){ pt.life -= dt; pt.x += pt.vx*dt; pt.y += pt.vy*dt; pt.vy += 300*dt; }
  particles = particles.filter(p => p.life > 0);
  for (const f of floaters){ f.life -= dt; f.y -= 34*dt; }
  floaters = floaters.filter(f => f.life > 0);
  if (shake > 0) shake = Math.max(0, shake - dt*30);

  // 胜负
  if (spawned >= cfg.total && zombies.length === 0) gameOver(true);
  // 防止僵尸堆积过多（性能 / 视觉）
  if (zombies.length > 22){
    const sorted = zombies.slice().sort((a, b) => b.x - a.x);
    for (let i = 22; i < sorted.length; i++) sorted[i].x = Math.max(GX, sorted[i].x - CELL_W * 0.55);
  }
}
function pc0(r,c){ return cellCenter(r,c); }
function burst(x, y, color, n){
  for (let i = 0; i < n; i++){
    const a = rand(0, Math.PI*2), s = rand(40, 180);
    particles.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s - 60, life:rand(0.3,0.7), color, size:rand(2,5) });
  }
}
function addFloater(x, y, text, color){ floaters.push({ x, y, text, color:color||'#fff', life:1.1 }); }
function flashRed(){ const f = $('flash'); f.style.opacity = 1; setTimeout(()=> f.style.opacity = 0, 180); }

function gameOver(win){
  mode = win ? 'won' : 'lost';
  if (win){
    sWin();
    const stars = [true, lives >= cfg.lives, time <= (cfg.par || 999)];
    if (!save.cleared.includes(levelIdx)) save.cleared.push(levelIdx);
    save.stars[levelIdx] = Math.max(save.stars[levelIdx] || 0, stars.filter(Boolean).length);
    save.unlocked = Math.max(save.unlocked, Math.min(10, levelIdx + 2));
    saveData(save);
    $('endTitle').textContent = '🎉 第 ' + (levelIdx+1) + ' 关通关！';
    $('endStars').textContent = stars.map(x => x ? '⭐' : '☆').join(' ');
    $('endText').textContent = '剩余生命 ❤️ ' + lives + '/' + cfg.lives + ' · 用时 ' + Math.floor(time) + ' 秒 · 击杀 ' + killed + ' 只僵尸';
    $('endGoals').innerHTML = '本关目标：① 通关 ' + (stars[1] ? '✅' : '❌ 生命不减') +
      ' · ② ' + (stars[2] ? '✅' : '❌') + ' ' + (cfg.par||'') + ' 秒内通关';
    $('endUnlock').textContent = levelIdx < 9 ? '🔓 已解锁第 ' + (levelIdx+2) + ' 关！' : '👑 你已通关全部 10 关，成为数学之王！';
    $('btnNext').style.display = levelIdx < 9 ? '' : 'none';
  } else {
    sLose();
    $('endTitle').textContent = '💀 僵尸进屋了…';
    $('endStars').textContent = '';
    $('endText').textContent = '第 ' + (levelIdx+1) + ' 关失败。调整阵容再试一次吧！';
    $('endGoals').textContent = '';
    $('endUnlock').textContent = '';
    $('btnNext').style.display = 'none';
  }
  $('endOverlay').classList.remove('hidden');
}

/* ---------------- 绘制 ---------------- */
function render(){
  ctx.save();
  if (shake > 0) ctx.translate(rand(-shake,shake), rand(-shake,shake));
  // 草坪
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#8ed65e'); g.addColorStop(1,'#5aa83c');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < COLS; c++){
    if ((r+c)%2===0){ ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(GX+c*CELL_W, GY+r*CELL_H, CELL_W, CELL_H); }
  }
  // 房子
  ctx.fillStyle = '#a9743f'; ctx.fillRect(0, GY, GX, cfg.rows*CELL_H);
  ctx.font = '44px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🏠', GX/2, GY + cfg.rows*CELL_H/2);
  // 路
  ctx.fillStyle = '#8a8f96'; ctx.fillRect(GX+COLS*CELL_W, 0, W-(GX+COLS*CELL_W), H);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  for (let y = 10; y < H; y += 40) ctx.fillRect(GX+COLS*CELL_W+24, y, 4, 22);
  // 网格线
  ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 2;
  for (let c = 0; c <= COLS; c++){ ctx.beginPath(); ctx.moveTo(GX+c*CELL_W, GY); ctx.lineTo(GX+c*CELL_W, GY+cfg.rows*CELL_H); ctx.stroke(); }
  for (let r = 0; r <= cfg.rows; r++){ ctx.beginPath(); ctx.moveTo(GX, GY+r*CELL_H); ctx.lineTo(GX+COLS*CELL_W, GY+r*CELL_H); ctx.stroke(); }

  // 地雷可放行提示
  if (mode === 'playing' && selected && PLANTS[selected].edgeOnly){
    for (let r = 0; r < cfg.rows; r++){
      if (r !== 0 && r !== cfg.rows - 1) continue;
      ctx.fillStyle = 'rgba(255,215,64,.16)';
      ctx.fillRect(GX, GY + r*CELL_H, COLS*CELL_W, CELL_H);
      ctx.strokeStyle = 'rgba(255,215,64,.65)'; ctx.lineWidth = 3;
      ctx.strokeRect(GX+2, GY + r*CELL_H + 2, COLS*CELL_W-4, CELL_H-4);
    }
    ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('地雷只可种在草地边缘（高亮行）', GX + 6, GY - 12);
  }
  // 种植预览
  if (mode === 'playing' && selected){
    const cell = cellFromXY(mouse.x, mouse.y);
    if (cell){
      const ok = !grid[cell.row][cell.col] && sun >= PLANTS[selected].cost;
      ctx.fillStyle = ok ? 'rgba(255,255,120,.35)' : 'rgba(255,60,60,.35)';
      ctx.fillRect(GX+cell.col*CELL_W+3, GY+cell.row*CELL_H+3, CELL_W-6, CELL_H-6);
      ctx.globalAlpha = 0.55;
      drawPlantShape(selected, cellCenter(cell.row, cell.col), 0, false);
      ctx.globalAlpha = 1;
    }
  }
  if (mode === 'playing' && shovelMode){
    const cell = cellFromXY(mouse.x, mouse.y);
    if (cell){ ctx.strokeStyle = '#ffd93d'; ctx.lineWidth = 4; ctx.strokeRect(GX+cell.col*CELL_W+4, GY+cell.row*CELL_H+4, CELL_W-8, CELL_H-8); }
  }

  // 植物
  for (let r = 0; r < cfg.rows; r++) for (let c = 0; c < COLS; c++){
    const pl = grid[r][c]; if (!pl) continue;
    drawPlantShape(pl.type, cellCenter(r,c), pl, true);
    if (pl.maxHp > 40 && pl.hp < pl.maxHp){
      const pc = cellCenter(r,c);
      ctx.fillStyle = '#000'; ctx.fillRect(pc.x-24, pc.y+30, 48, 7);
      ctx.fillStyle = '#7be382'; ctx.fillRect(pc.x-23, pc.y+31, 46*(pl.hp/pl.maxHp), 5);
    }
  }
  // 僵尸
  for (const z of zombies) drawZombie(z);
  // 子弹
  for (const b of bullets){
    ctx.beginPath(); ctx.arc(b.x, b.y, b.kind==='zero'?11:9, 0, Math.PI*2);
    ctx.fillStyle = b.kind==='zero' ? '#222' : '#fff'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = b.kind==='zero' ? '#ffd93d' : '#2f6b1f'; ctx.stroke();
    ctx.fillStyle = b.kind==='zero' ? '#ffd93d' : '#1d2f10';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x, b.y+0.5);
  }
  // 阳光球
  for (const o of orbs){
    ctx.beginPath(); ctx.arc(o.x, o.y, 13, 0, Math.PI*2);
    ctx.fillStyle = '#ffe066'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#e8a81a'; ctx.stroke();
    ctx.font = '13px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('☀', o.x, o.y);
  }
  // 粒子
  for (const p of particles){
    ctx.globalAlpha = clamp(p.life*2, 0, 1);
    ctx.fillStyle = p.color; ctx.fillRect(p.x-p.size/2, p.y-p.size/2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  // 飘字
  for (const f of floaters){
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
  // 开局倒计时提示
  if (mode === 'playing' && spawned === 0 && time < (cfg.first || firstSpawnDelay)){
    ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.55)';
    const t = '僵尸即将来袭… 先种下植物！';
    ctx.strokeText(t, W/2, GY + cfg.rows*CELL_H + 34);
    ctx.fillStyle = '#fff'; ctx.fillText(t, W/2, GY + cfg.rows*CELL_H + 34);
  }
  ctx.restore();
}

function drawPlantShape(type, c, pl, real){
  const p = PLANTS[type];
  const x = c.x, y = c.y;
  const flash = real && pl && pl.flash > 0;
  // 盆
  ctx.fillStyle = '#8a5a2b';
  ctx.beginPath(); ctx.moveTo(x-18, y+22); ctx.lineTo(x+18, y+22); ctx.lineTo(x+13, y+34); ctx.lineTo(x-13, y+34); ctx.closePath(); ctx.fill();
  if (p.mine){
    // 地雷
    ctx.beginPath(); ctx.arc(x, y+2, 20, 0, Math.PI*2);
    ctx.fillStyle = real && pl && pl.armed ? '#222' : '#555'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = real && pl && pl.armed ? '#ff4757' : '#999'; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (real && pl && !pl.armed) ctx.fillText(Math.ceil(pl.armT) + '', x, y+2);
    else ctx.fillText(p.num, x, y+2);
    if (real && pl && pl.armed){
      ctx.beginPath(); ctx.arc(x, y+2, 24 + Math.sin(time*6)*3, 0, Math.PI*2);
      ctx.strokeStyle = 'rgba(255,71,87,.5)'; ctx.lineWidth = 2; ctx.stroke();
    }
    return;
  }
  if (type === 'wall'){
    ctx.fillStyle = '#b08968'; ctx.fillRect(x-24, y-18, 48, 44);
    ctx.strokeStyle = '#7a5a3a'; ctx.lineWidth = 2; ctx.strokeRect(x-24, y-18, 48, 44);
    ctx.beginPath(); ctx.moveTo(x-24, y-4); ctx.lineTo(x+24, y-4); ctx.moveTo(x-24, y+10); ctx.lineTo(x+24, y+10); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('()', x, y+4);
    return;
  }
  if (type === 'sun' || type === 'mushroom'){
    if (type === 'sun'){
      for (let i = 0; i < 8; i++){
        const a = i/8*Math.PI*2 + Math.sin(time*2)*0.05;
        ctx.fillStyle = '#f5b301';
        ctx.beginPath(); ctx.ellipse(x + Math.cos(a)*16, y - 8 + Math.sin(a)*16, 9, 5, a, 0, Math.PI*2); ctx.fill();
      }
      ctx.beginPath(); ctx.arc(x, y-8, 13, 0, Math.PI*2); ctx.fillStyle = '#ff8c42'; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(x, y-6, 18, Math.PI, 0); ctx.fillStyle = '#c97b4a'; ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x-7, y-14, 3, 0, Math.PI*2); ctx.arc(x+6, y-17, 2.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#7a5b00'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.num, x, y-8);
    return;
  }
  // 射手系
  ctx.strokeStyle = '#2f6b1f'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x, y+22); ctx.quadraticCurveTo(x+4, y+2, x, y-6); ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y-12, 16, 0, Math.PI*2);
  ctx.fillStyle = flash ? '#ff6b6b' : p.color; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = '#1d2f10'; ctx.stroke();
  // 嘴炮
  ctx.fillStyle = '#1d2f10'; ctx.fillRect(x+12, y-16, 12, 8);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(p.num, x, y-12);
}

function drawZombie(z){
  const s = z.scale, x = z.x, y = z.y;
  const slowed = time < z.slowUntil;
  const bob = Math.sin(z.wob) * 3 * s;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.scale(s, s);
  if (z.fly){
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.beginPath(); ctx.ellipse(-16, -30, 14, 6, -0.5, 0, Math.PI*2); ctx.ellipse(16, -30, 14, 6, 0.5, 0, Math.PI*2); ctx.fill();
  }
  // 身体
  ctx.fillStyle = z.type==='boss' ? '#5a3a8a' : z.type==='giant' ? '#7a4a2a' : '#4a6a8a';
  ctx.fillRect(-14, -8, 28, 30);
  // 头
  ctx.beginPath(); ctx.arc(0, -22, 13, 0, Math.PI*2); ctx.fillStyle = '#b8d8a8'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#3a5a2a'; ctx.stroke();
  // 眼睛
  ctx.fillStyle = '#111'; ctx.fillRect(-8, -26, 4, 4); ctx.fillRect(4, -26, 4, 4);
  // 手臂
  ctx.strokeStyle = '#b8d8a8'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(-12, 0); ctx.lineTo(-24, 6); ctx.moveTo(12, 0); ctx.lineTo(24, 6); ctx.stroke();
  // 腿
  ctx.strokeStyle = '#333'; ctx.lineWidth = 6;
  const step = Math.sin(z.wob) * 6;
  ctx.beginPath(); ctx.moveTo(-6, 22); ctx.lineTo(-6 + step, 34); ctx.moveTo(6, 22); ctx.lineTo(6 - step, 34); ctx.stroke();
  if (z.type === 'bucket'){ ctx.fillStyle = '#c0c0c0'; ctx.fillRect(-14, -38, 28, 16); ctx.strokeStyle = '#666'; ctx.strokeRect(-14, -38, 28, 16); }
  if (z.type === 'boss'){
    ctx.fillStyle = '#ffd93d'; ctx.font = '18px serif'; ctx.textAlign = 'center';
    ctx.fillText('👑', 0, -42);
  }
  if (z.shield){
    ctx.beginPath(); ctx.arc(0, -6, 30, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(126,200,255,.28)'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = '#7ec8ff'; ctx.stroke();
  }
  if (slowed){
    ctx.fillStyle = 'rgba(76,201,240,.25)'; ctx.fillRect(-16, -38, 32, 74);
  }
  ctx.restore();
  // 数字徽章
  const bx = x, by = y - 52*s + bob;
  const txt = fmtVal(z.val);
  ctx.font = 'bold 15px sans-serif';
  const tw = ctx.measureText(txt).width + 14;
  ctx.beginPath();
  const rr = 8;
  ctx.roundRect(bx - tw/2, by - 13, tw, 24, rr);
  ctx.fillStyle = z.val < 0 ? '#d33' : '#36c'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(txt, bx, by);
  if (z.revive && !z.revived){
    ctx.font = '13px serif'; ctx.fillText('✚', bx + tw/2 + 8, by);
  }
}

/* ---------------- 主循环 ---------------- */
let lastT = 0;
function loop(t){
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  if (mode === 'playing') update(dt * speedMul);
  render();
}
requestAnimationFrame(loop);

/* ---------------- 输入 ---------------- */
function canvasPos(e){
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width), y: (e.clientY - r.top) * (H / r.height) };
}
canvas.addEventListener('mousemove', e => { const p = canvasPos(e); mouse.x = p.x; mouse.y = p.y; });
canvas.addEventListener('click', e => {
  if (mode !== 'playing') return;
  const p = canvasPos(e);
  const cell = cellFromXY(p.x, p.y);
  if (!cell) return;
  if (shovelMode) tryShovel(cell.row, cell.col);
  else if (selected) tryPlant(cell.row, cell.col);
  else {
    const pl = grid[cell.row][cell.col];
    if (pl) setHint('「' + PLANTS[pl.type].name + '」：' + PLANTS[pl.type].desc);
    else setHint('先点击上方卡片选植物，再点击草坪种植。');
  }
});
canvas.addEventListener('contextmenu', e => { e.preventDefault(); selected = null; shovelMode = false; refreshCards(); setHint('已取消选择。'); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){
    if (mode === 'playing'){ selected = null; shovelMode = false; refreshCards(); }
    else if (mode === 'paused') togglePause(false);
  }
  if (mode !== 'playing' && mode !== 'paused') return;
  const KEYMAP = ['1','2','3','4','5','6','7','8','9','0','q','w','e','r'];
  const ki = KEYMAP.indexOf(e.key.toLowerCase());
  if (ki >= 0){
    if (cfg.plants[ki]) selectCard(cfg.plants[ki]);
  } else if (e.key === 'p' || e.key === 'P' || e.key === ' '){ e.preventDefault(); togglePause(); }
  else if (e.key === 's' || e.key === 'S'){ shovelMode = !shovelMode; selected = null; refreshCards(); setHint(shovelMode ? '铲子模式：点击植物移除它。' : '已退出铲子模式。'); }
  else if (e.key === 'f' || e.key === 'F') toggleSpeed();
});

/* ---------------- UI 按钮 ---------------- */
function hideAllOverlays(){
  ['menuOverlay','levelOverlay','helpOverlay','pauseOverlay','endOverlay'].forEach(id => $(id).classList.add('hidden'));
}
function togglePause(force){
  if (mode === 'playing' || force === true){
    mode = 'paused'; $('pauseOverlay').classList.remove('hidden');
  } else if (mode === 'paused'){
    mode = 'playing'; $('pauseOverlay').classList.add('hidden');
  }
}
function toggleSpeed(){
  speedMul = speedMul === 1 ? 2 : 1;
  $('btnSpeed').textContent = '▶ ' + speedMul + '×';
}
$('btnPause').addEventListener('click', () => togglePause());
$('btnResume').addEventListener('click', () => togglePause());
$('btnSpeed').addEventListener('click', toggleSpeed);
$('btnSound').addEventListener('click', () => { soundOn = !soundOn; $('btnSound').textContent = soundOn ? '🔊' : '🔇'; beep(900,.08,'sine',.05); });
$('btnRestart').addEventListener('click', () => initLevel(levelIdx));
$('btnPauseRestart').addEventListener('click', () => initLevel(levelIdx));
$('btnMenu').addEventListener('click', toMenu);
$('btnPauseMenu').addEventListener('click', toMenu);
$('btnEndMenu').addEventListener('click', toMenu);
$('btnRetry').addEventListener('click', () => initLevel(levelIdx));
$('btnNext').addEventListener('click', () => { if (levelIdx < 9) initLevel(levelIdx + 1); });
$('btnShovel').addEventListener('click', () => { shovelMode = !shovelMode; selected = null; refreshCards(); setHint(shovelMode ? '铲子模式：点击植物移除它。' : '已退出铲子模式。'); });
$('btnStart').addEventListener('click', () => { buildLevelGrid(); $('menuOverlay').classList.add('hidden'); $('levelOverlay').classList.remove('hidden'); });
$('btnHelp').addEventListener('click', () => { $('menuOverlay').classList.add('hidden'); $('helpOverlay').classList.remove('hidden'); });
$('btnHelpBack').addEventListener('click', () => { $('helpOverlay').classList.add('hidden'); $('menuOverlay').classList.remove('hidden'); });
$('btnLevelBack').addEventListener('click', () => { $('levelOverlay').classList.add('hidden'); $('menuOverlay').classList.remove('hidden'); });
function toMenu(){
  mode = 'menu'; hideAllOverlays(); $('menuOverlay').classList.remove('hidden');
}
function buildLevelGrid(){
  const g = $('levelGrid'); g.innerHTML = '';
  LEVELS.forEach((lv, i) => {
    const locked = (i + 1) > save.unlocked;
    const st = save.stars[i] || 0;
    const b = document.createElement('button');
    b.className = 'lvl' + (locked ? ' locked' : '') + (st ? ' done' : '');
    const starTxt = st ? ' ' + '⭐'.repeat(st) : (save.cleared.includes(i) ? ' ⭐' : '');
    b.innerHTML = (locked ? '🔒 ' : '') + '第 ' + (i+1) + ' 关' + starTxt +
      '<small>' + lv.name + '</small><small class="goal">' + (locked ? '' : (lv.par ? lv.par + ' 秒内 ★★★' : '')) + '</small>';
    b.disabled = locked;
    b.addEventListener('click', () => initLevel(i));
    g.appendChild(b);
  });
}

/* ---------------- 帮助页 ---------------- */
function buildHelp(){
  let h = '<h3>🎯 核心规则</h3><p>阳光 = 积分。点击卡片选植物，再点击草坪种植。僵尸从右边走过来，走到房子就扣 1 点生命（❤️ 归零即失败）。<br>' +
    '僵尸头顶的数字就是它的血量：<b>子弹让数字向 0 靠近</b>——负数僵尸被打中数字 +1，正数僵尸被打中数字 -1，归零（0）立刻死亡。<br>' +
    '加法子弹（+2）只克负数、减法子弹（-2）只克正数——用错了会给僵尸加血！</p>' +
    '<h3>🌱 植物图鉴</h3><table><tr><th>植物</th><th>数字</th><th>费用</th><th>冷却</th><th>说明</th></tr>';
  PLANT_ORDER.forEach(k => {
    const p = PLANTS[k];
    h += '<tr><td>' + p.name + '</td><td><b>' + p.num + '</b></td><td>☀' + p.cost + '</td><td>' + p.cd + 's</td><td>' + p.desc + '</td></tr>';
  });
  h += '</table><h3>🧟 僵尸图鉴</h3><table><tr><th>僵尸</th><th>特点</th></tr>' +
    '<tr><td>普通僵尸</td><td>标准速度，数字 ±1~±12 不等</td></tr>' +
    '<tr><td>快速僵尸</td><td>速度约 2 倍，需要冰冻或墙拖住</td></tr>' +
    '<tr><td>铁桶僵尸</td><td>数字更大、速度略慢</td></tr>' +
    '<tr><td>护盾僵尸</td><td>能挡下第一发子弹（护盾会碎）</td></tr>' +
    '<tr><td>飞行僵尸</td><td>无视墙和地雷，只能用子弹打</td></tr>' +
    '<tr><td>复活僵尸</td><td>归零后以 ±3 复活一次</td></tr>' +
    '<tr><td>巨型僵尸</td><td>数字 ±12~±18，体型大、慢，地雷最克它</td></tr>' +
    '<tr><td>数学教授（BOSS）</td><td>终关压轴，数字 ±30，×0 炮 / 地雷是正解</td></tr></table>' +
    '<h3>🗺 10 关一览</h3><table><tr><th>关</th><th>名称</th><th>行数</th><th>新解锁</th><th>★★★ 目标</th></tr>';
  const unlocks = ['豌豆射手','阳光向日葵','×1 地雷','加/减法射手','寒冰射手、括号墙','双发/乘2射手','÷2 地雷、阳光菇','等号激光、随机射手','×0 炮','全员 + 数学教授'];
  LEVELS.forEach((lv, i) => {
    h += '<tr><td>第 ' + (i+1) + ' 关</td><td>' + lv.name + '</td><td>' + lv.rows + '</td><td>' + unlocks[i] + '</td><td>不减生命 · ' + lv.par + ' 秒内</td></tr>';
  });
  h += '</table><h3>⌨ 操作</h3><p>鼠标点击种植 · 数字键 1-9 / 0 / Q W E R 选卡 · S 铲子 · P 暂停 · F 变速（2×）· 右键/Esc 取消选择。</p>' +
    '<h3>💡 小技巧</h3><p>① 地雷只能种在草地第一行 / 最后一行，选卡后画布上会高亮可放的行。<br>' +
    '② 经济优先：先铺向日葵 / 阳光菇，再补射手，最后才升级高级植物。<br>' +
    '③ 除第一关外，被动阳光都很慢，只靠自动加阳光一定会输。<br>' +
    '④ 飞行僵尸和护盾僵尸不能只靠地雷，记得留子弹火力。</p>';
  $('helpBody').innerHTML = h;
}
buildHelp();
updateHUD();
