'use strict';

(() => {
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  if (typeof ctx.roundRect !== 'function') {
    ctx.roundRect = function(x, y, w, h, radius) {
      const r = Math.min(radius || 0, w / 2, h / 2);
      this.moveTo(x + r, y); this.arcTo(x + w, y, x + w, y + h, r);
      this.arcTo(x + w, y + h, x, y + h, r); this.arcTo(x, y + h, x, y, r);
      this.arcTo(x, y, x + w, y, r); this.closePath();
    };
  }

  const W = canvas.width, H = canvas.height;
  const HORIZON = 326, GROUND = 492, DEPTH_SPAN = GROUND - HORIZON;
  const MAX_POP = 20, PLAYER_SPAWN = 190, PLAYER_BASE_LINE = 178;
  const ENEMY_BASE_LINE = 1095, MINE_X = 338, DEFENSE_LINE = 455;
  const PLAYER_BASE_MAX = 180, SAVE_KEY = 'ruins_campaign_v2';
  const UNIT_ORDER = ['miner', 'sword', 'archer', 'spear', 'shield', 'shadow', 'mage', 'giant', 'rider'];
  const UNIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const UNLOCK_ORDER = ['sword', 'archer', 'spear', 'shield', 'shadow', 'mage', 'giant', 'rider'];
  const UNIT_TYPES = {
    hero:   { name:'青岚', short:'青岚', icon:'⚔', hp:290, damage:34, range:78, cooldown:.43, speed:175, scale:1.13, attackDuration:.34, armor:.78, weapon:'sword' },
    miner:  { name:'采金矿工', short:'矿工', icon:'⌁', cost:75, hp:65, damage:7, range:38, cooldown:1.2, speed:43, scale:.83, attackDuration:.34, role:'miner', description:'往返金矿，为军团带回黄金。' },
    sword:  { name:'轻剑士', short:'剑士', icon:'⚔', cost:105, hp:112, damage:19, range:43, cooldown:1.08, speed:59, scale:.95, attackDuration:.38, description:'训练迅速，擅长近身突击。' },
    archer: { name:'巡林弓手', short:'弓手', icon:'➶', cost:160, hp:68, damage:16, range:232, cooldown:1.38, speed:44, scale:.9, attackDuration:.42, ranged:true, description:'远距离射击，优先压制敌方后排。' },
    spear:  { name:'磐石枪卫', short:'枪卫', icon:'╱', cost:215, hp:178, damage:29, range:66, cooldown:1.45, speed:37, scale:1.02, attackDuration:.45, description:'长枪与重甲，适合稳住战线。' },
    shield: { name:'城垛盾卫', short:'盾卫', icon:'▰', cost:235, hp:245, damage:17, range:42, cooldown:1.3, speed:32, scale:1.04, attackDuration:.44, armor:.48, description:'高耐久盾牌兵，能替队友承伤。' },
    shadow: { name:'影刃刺客', short:'影刃', icon:'✦', cost:260, hp:92, damage:42, range:48, cooldown:.72, speed:91, scale:.91, attackDuration:.3, description:'高速切入后排，造成猛烈斩击。' },
    mage:   { name:'星火法师', short:'法师', icon:'✧', cost:315, hp:78, damage:34, range:225, cooldown:1.85, speed:35, scale:.94, attackDuration:.6, ranged:true, magic:true, description:'发射奥术球，对周围敌人造成溅射。' },
    giant:  { name:'遗迹巨人', short:'巨人', icon:'◆', cost:390, hp:470, damage:76, range:81, cooldown:2.2, speed:23, scale:1.45, attackDuration:.62, description:'步伐沉重，重击能震撼整条战线。' },
    rider:  { name:'雷霆骑士', short:'骑士', icon:'♞', cost:355, hp:185, damage:52, range:58, cooldown:.9, speed:82, scale:1.15, attackDuration:.37, description:'高速冲锋，快速穿越战场。' }
  };

  const LEVELS = [
    { name:'风蚀峡谷', tag:'新兵试炼', startGold:185, enemyHp:105, firstWave:10, gap:18, waves:[['sword'],['sword','sword']], unlock:'sword', goal:'熟悉移动与挥剑，击退峡谷守军。' },
    { name:'赤砂驿站', tag:'弓手来袭', startGold:230, enemyHp:130, firstWave:13, gap:22, waves:[['sword','sword'],['sword','archer']], unlock:'archer', goal:'招募轻剑士，迎战第一次远程伏击。' },
    { name:'断桥要塞', tag:'长枪防线', startGold:255, enemyHp:155, firstWave:14, gap:23, waves:[['sword','archer'],['sword','sword','spear']], unlock:'spear', goal:'突破断桥，练习前排与远程兵种配合。' },
    { name:'古树哨所', tag:'盾阵围城', startGold:285, enemyHp:180, firstWave:15, gap:24, waves:[['sword','sword','archer'],['spear','sword','archer']], unlock:'shield', goal:'顶住敌方冲击，在盾阵掩护下反攻。' },
    { name:'影月回廊', tag:'暗影突袭', startGold:310, enemyHp:205, firstWave:16, gap:25, waves:[['sword','archer','archer'],['spear','shadow','sword']], unlock:'shadow', goal:'小心高速刺客，利用前后纵深绕开夹击。' },
    { name:'封印高塔', tag:'奥术风暴', startGold:340, enemyHp:230, firstWave:17, gap:27, waves:[['sword','spear','archer'],['mage','shadow','spear']], unlock:'mage', goal:'敌方开始使用范围魔法，别让弓手聚在一起。' },
    { name:'熔岩巨门', tag:'巨人觉醒', startGold:375, enemyHp:255, firstWave:18, gap:28, waves:[['sword','archer','spear'],['giant','spear','shadow']], unlock:'giant', goal:'拦住巨人冲锋，击碎熔岩门后的雕像。' },
    { name:'赤曜王座', tag:'最终决战', startGold:430, enemyHp:300, firstWave:18, gap:29, waves:[['sword','archer','spear'],['mage','shadow','spear'],['giant','rider','archer']], unlock:'rider', goal:'击败赤曜军团统领，完成八关战役。' }
  ];
  const $ = id => document.getElementById(id);
  const ui = {
    gold:$('goldValue'), population:$('populationValue'), populationBar:$('populationBar'), wave:$('waveValue'),
    time:$('timeValue'), status:$('statusText'), pill:$('statePill'), command:$('commandBtn'), commandLabel:$('commandLabel'),
    hornLabel:$('hornLabel'), hornCooldown:$('hornCooldown'), friendText:$('friendlyBaseText'), enemyText:$('enemyBaseText'),
    friendBar:$('friendlyBaseBar'), enemyBar:$('enemyBaseBar'), missionStatus:$('missionStatus'), mission:$('missionDescription'),
    weapon:$('weaponUpgradeBtn'), weaponCost:$('weaponUpgradeCost'), weaponText:$('weaponUpgradeText'),
    mine:$('mineUpgradeBtn'), mineCost:$('mineUpgradeCost'), mineText:$('mineUpgradeText'),
    toast:$('toast'), recruit:$('recruitList'), heroBar:$('heroHealthBar'), heroHp:$('heroHpText'),
    heroState:$('heroStateText'), campaignMini:$('campaignMini'), campaignGrid:$('campaignGrid')
  };

  function loadSave() {
    const fresh = { maxLevel:0, completed:[], unlockedUnits:['miner'] };
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!data || typeof data !== 'object') return fresh;
      const maxLevel = Math.max(0, Math.min(LEVELS.length - 1, Number(data.maxLevel) || 0));
      return {
        maxLevel,
        completed:Array.isArray(data.completed) ? data.completed.filter(n => Number.isInteger(n) && n >= 0 && n < LEVELS.length) : [],
        unlockedUnits:Array.isArray(data.unlockedUnits) ? Array.from(new Set(['miner', ...data.unlockedUnits.filter(key => UNIT_TYPES[key] && key !== 'hero')])) : ['miner']
      };
    } catch (_) { return fresh; }
  }
  let save = loadSave();
  let mode = 'menu', levelIndex = 0, selectedLevel = save.maxLevel, level = LEVELS[0];
  let commandMode = 'defend', timeScale = 1, soundOn = true, audioContext = null;
  let gameTime = 0, gold = 185, friendlyBase = PLAYER_BASE_MAX, enemyBase = 105;
  let units = [], hero = null, projectiles = [], particles = [], floaters = [];
  let nextId = 1, kills = 0, waveIndex = 0, waveNumber = 0, nextWaveAt = 10, spawnQueue = [], spawnTimer = 0;
  let weaponLevel = 0, mineLevel = 0, moraleUntil = 0, hornReadyAt = 0, heroRespawnAt = 0;
  let selectedUnitId = null, toastTimer = 0, hudTimer = 0, shake = 0, lastFrame = 0, visualTime = 0;
  let attackHeld = false;
  const heldKeys = new Set();

  const scenery = Array.from({length:58}, (_, i) => ({
    x:24 + Math.random() * 1230, depth:.24 + Math.random() * .74,
    height:3 + Math.random() * 9, lean:(Math.random() - .5) * 8,
    color:i % 3 === 0 ? '#697452' : i % 3 === 1 ? '#777452' : '#586d4d'
  }));
  const cloudSeeds = [{x:155,y:94,s:.8},{x:475,y:143,s:.57},{x:815,y:79,s:.68},{x:1070,y:160,s:.54}];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);
  const depthY = depth => HORIZON + clamp(depth, .04, 1) * DEPTH_SPAN;
  const viewScale = unit => unit.scale * (.68 + clamp(unit.depth, .04, 1) * .5);
  const unitHeadY = unit => depthY(unit.depth) - 65 * viewScale(unit);
  const groundDistance = (a, b) => Math.hypot(b.x - a.x, (b.depth - a.depth) * DEPTH_SPAN);
  const formatTime = value => {
    const t = Math.max(0, Math.floor(value));
    return String(Math.floor(t / 60)).padStart(2,'0') + ':' + String(t % 60).padStart(2,'0');
  };
  const living = side => units.filter(unit => !unit.dead && (!side || unit.side === side));
  const population = () => living('ally').length;
  function storeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (_) {} }
  function showToast(text, duration = 2.6) {
    ui.toast.textContent = text;
    ui.toast.classList.add('visible');
    toastTimer = duration;
  }
  function hideOverlays() { ['welcomeOverlay','helpOverlay','pauseOverlay','endOverlay'].forEach(id => { $(id).hidden = true; }); }
  function playTone(freq, duration, type = 'sine', volume = .035, delay = 0) {
    if (!soundOn) return;
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const osc = audioContext.createOscillator(), gain = audioContext.createGain();
      const start = audioContext.currentTime + delay;
      osc.type = type; osc.frequency.setValueAtTime(freq, start); gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      osc.connect(gain); gain.connect(audioContext.destination); osc.start(start); osc.stop(start + duration);
    } catch (_) { /* Sound is optional. */ }
  }
  function sound(name) {
    if (name === 'swing') { playTone(230,.06,'triangle',.025); playTone(135,.09,'square',.014,.04); }
    else if (name === 'recruit') { playTone(490,.09,'triangle',.04); playTone(740,.11,'triangle',.032,.07); }
    else if (name === 'upgrade') { playTone(390,.14,'sine',.04); playTone(590,.19,'sine',.045,.1); }
    else if (name === 'wave') { playTone(185,.24,'triangle',.045); playTone(245,.27,'triangle',.04,.2); }
    else if (name === 'horn') { playTone(250,.5,'sawtooth',.03); playTone(340,.48,'sawtooth',.028,.16); }
    else if (name === 'hit') { playTone(118,.05,'square',.012); }
    else if (name === 'win') { playTone(523,.2,'triangle',.05); playTone(659,.22,'triangle',.05,.16); playTone(784,.35,'triangle',.05,.32); }
    else if (name === 'lose') { playTone(240,.35,'triangle',.045); playTone(170,.5,'triangle',.04,.2); }
  }

  function createUnit(type, side, x, options = {}) {
    const spec = UNIT_TYPES[type];
    const id = nextId++;
    const enemyScale = side === 'enemy' ? 1 + Math.min(.45, levelIndex * .055 + Math.max(0, waveNumber - 1) * .025) : 1;
    const depthLanes = [.36,.54,.73,.86,.45,.64,.79,.31,.59,.91,.49,.7];
    const formationSlot = side === 'ally' && type !== 'miner' && type !== 'hero'
      ? living('ally').filter(unit => unit.type !== 'miner' && unit.type !== 'hero').length
      : 0;
    const depth = options.depth ?? (type === 'miner' ? .67 : depthLanes[(id - 1) % depthLanes.length] + rand(-.025,.025));
    const hpScale = enemyScale;
    return {
      id,type,side,x,depth:clamp(depth,.1,.98),formationSlot,
      hp:spec.hp * hpScale,maxHp:spec.hp * hpScale,
      damage:spec.damage * (side === 'enemy' ? 1 + levelIndex * .035 : 1),
      speed:spec.speed,range:spec.range,cooldown:spec.cooldown,
      scale:spec.scale * (side === 'enemy' && type === 'giant' ? 1 + levelIndex * .01 : 1),
      attackTimer:rand(.15,.55),attackAnim:0,attackDuration:spec.attackDuration || .4,pendingAttack:null,
      phase:rand(0,Math.PI*2),hitFlash:0,dead:false,manual:type === 'hero' && side === 'ally',
      facing:side === 'ally' ? 1 : -1,mineState:'outbound',mineTimer:2.1,cargo:0,spawnWave:waveNumber
    };
  }

  function startGame(requestedLevel = selectedLevel) {
    levelIndex = clamp(requestedLevel,0,LEVELS.length - 1);
    selectedLevel = levelIndex;
    level = LEVELS[levelIndex];
    mode = 'playing'; commandMode = 'defend'; timeScale = 1;
    $('speedBtn').textContent = '▶ 1×';
    gameTime = 0; gold = level.startGold;
    friendlyBase = PLAYER_BASE_MAX; enemyBase = level.enemyHp;
    units = []; projectiles = []; particles = []; floaters = []; nextId = 1; kills = 0;
    waveIndex = 0; waveNumber = 0; nextWaveAt = level.firstWave; spawnQueue = []; spawnTimer = 0;
    weaponLevel = 0; mineLevel = 0; moraleUntil = 0; hornReadyAt = 0; heroRespawnAt = 0;
    selectedUnitId = null; shake = 0; hideOverlays();
    hero = createUnit('hero','ally',PLAYER_SPAWN + 52,{depth:.7});
    units.push(hero);
    const minerA = createUnit('miner','ally',PLAYER_SPAWN,{depth:.62});
    const minerB = createUnit('miner','ally',PLAYER_SPAWN + 26,{depth:.7});
    units.push(minerA,minerB);
    $('levelTitle').textContent = level.name;
    $('levelEyebrow').textContent = '战役第 ' + String(levelIndex + 1).padStart(2,'0') + ' 关 / ' + level.tag;
    ui.mission.textContent = level.goal;
    sound('recruit');
    showToast('青岚已上阵。WASD / 方向键移动，J 或空格挥剑。',4);
    updateHUD(true);
  }

  function renderCampaignGrid() {
    ui.campaignGrid.innerHTML = '';
    $('campaignProgress').textContent = '已解锁 ' + (save.maxLevel + 1) + ' / ' + LEVELS.length;
    LEVELS.forEach((entry,index) => {
      const open = index <= save.maxLevel;
      const done = save.completed.includes(index);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'level-card' + (index === selectedLevel ? ' selected' : '') + (done ? ' cleared' : '');
      button.disabled = !open;
      button.innerHTML = '<strong>' + (open ? '第 ' + String(index + 1).padStart(2,'0') + ' 关' : '🔒 未解锁') + '</strong>' +
        '<small>' + entry.name + '</small>' + (done ? '<span class="level-check">✓</span>' : '');
      button.addEventListener('click', () => {
        if (!open) return;
        selectedLevel = index;
        renderCampaignGrid();
        $('selectedLevelNote').textContent = entry.tag + ' · 胜利后解锁「' + UNIT_TYPES[entry.unlock].name + '」';
        $('playBtn').innerHTML = '<span>开始第 ' + (index + 1) + ' 关</span><b>→</b>';
        $('briefingPlayBtn').querySelector('span').textContent = '开始第 ' + (index + 1) + ' 关';
      });
      ui.campaignGrid.appendChild(button);
    });
    const selected = LEVELS[selectedLevel];
    $('selectedLevelNote').textContent = selected.tag + ' · 胜利后解锁「' + UNIT_TYPES[selected.unlock].name + '」';
    $('playBtn').innerHTML = '<span>' + (selectedLevel === 0 ? '开始第一关' : '开始第 ' + (selectedLevel + 1) + ' 关') + '</span><b>→</b>';
    $('briefingPlayBtn').querySelector('span').textContent = '开始第 ' + (selectedLevel + 1) + ' 关';
  }

  function renderRecruitList() {
    ui.recruit.innerHTML = '';
    UNIT_ORDER.forEach((type,index) => {
      const spec = UNIT_TYPES[type];
      const unlocked = save.unlockedUnits.includes(type);
      const required = UNLOCK_ORDER.indexOf(type) + 1;
      const button = document.createElement('button');
      button.type = 'button'; button.dataset.recruit = type;
      button.className = 'recruit-card' + (!unlocked ? ' is-locked' : '');
      button.title = unlocked ? spec.description + '（快捷键 ' + UNIT_KEYS[index] + '）' : '通关第 ' + required + ' 关解锁';
      const subtitle = unlocked ? spec.description : '通关第 ' + required + ' 关解锁';
      button.innerHTML = '<span class="unit-token" data-kind="' + type + '">' + (unlocked ? spec.icon : '🔒') + '</span>' +
        '<span class="unit-copy"><strong>' + spec.name + '</strong><small>' + subtitle + '</small></span>' +
        '<span class="unit-price">' + (unlocked ? '◈ ' + spec.cost : '锁定') + '<small>' + (unlocked ? '键 ' + UNIT_KEYS[index] : '—') + '</small></span>';
      button.disabled = !unlocked;
      button.addEventListener('click', () => recruit(type));
      ui.recruit.appendChild(button);
    });
    $('rosterProgress').textContent = String(save.unlockedUnits.length).padStart(2,'0') + '/09';
  }

  function recruit(type) {
    if (mode !== 'playing') return;
    const spec = UNIT_TYPES[type];
    if (!save.unlockedUnits.includes(type)) { showToast('该角色尚未解锁，继续推进战役吧。'); return; }
    if (population() >= MAX_POP) { showToast('军团已满员，无法继续征募。'); return; }
    if (gold < spec.cost) { showToast('黄金不足：征募「' + spec.short + '」需要 ◈ ' + spec.cost + '。',2); return; }
    gold -= spec.cost;
    units.push(createUnit(type,'ally',PLAYER_SPAWN + rand(-12,30)));
    sound('recruit'); showToast('「' + spec.name + '」已加入军团。',1.9); updateHUD(true);
  }

  function upgradeWeapon() {
    if (mode !== 'playing') return;
    const costs=[220,360]; if (weaponLevel>=costs.length) return;
    if (gold<costs[weaponLevel]) { showToast('黄金不足，无法精炼武器。'); return; }
    gold-=costs[weaponLevel]; weaponLevel++; sound('upgrade');
    showToast('军械升级完成：全军攻击力提升 ' + weaponLevel*18 + '%。'); updateHUD(true);
  }
  function upgradeMine() {
    if (mode !== 'playing') return;
    const costs=[180,300]; if (mineLevel>=costs.length) return;
    if (gold<costs[mineLevel]) { showToast('黄金不足，无法改良矿镐。'); return; }
    gold-=costs[mineLevel]; mineLevel++; sound('upgrade');
    showToast('矿镐改良完成：每次交金额外提升 ' + mineLevel*25 + '%。'); updateHUD(true);
  }
  function toggleCommand() {
    if (mode !== 'playing') return;
    commandMode = commandMode === 'defend' ? 'attack' : 'defend'; sound('horn');
    showToast(commandMode === 'attack' ? '全军突进！青岚也可亲自越过前线。' : '全军回防，在防守阵线附近列阵。',2.6);
    updateHUD(true);
  }
  function useHorn() {
    if (mode !== 'playing') return;
    if (gameTime < hornReadyAt) { showToast('冲锋号角还在冷却中。',1.5); return; }
    moraleUntil=gameTime+8; hornReadyAt=gameTime+38; sound('horn');
    showToast('号角响彻战场！军团速度与攻击力提升 8 秒。',2.6); updateHUD(true);
  }
  function toggleSpeed() {
    if (mode !== 'playing') return;
    timeScale = timeScale === 1 ? 2 : 1;
    $('speedBtn').textContent = timeScale === 1 ? '▶ 1×' : '▶ 2×';
    showToast(timeScale === 2 ? '战场速度提升至 2×。' : '战场速度恢复至 1×。',1.3);
  }
  function togglePause() {
    if (mode === 'playing') { mode='paused'; $('pauseOverlay').hidden=false; heldKeys.clear(); attackHeld=false; updateHUD(true); }
    else if (mode === 'paused') { mode='playing'; $('pauseOverlay').hidden=true; updateHUD(true); }
  }
  function returnToMap() {
    mode='menu'; heldKeys.clear(); attackHeld=false; hideOverlays(); $('welcomeOverlay').hidden=false;
    renderCampaignGrid(); updateHUD(true);
  }

  function createWave() {
    if (waveIndex >= level.waves.length) return;
    const plan = level.waves[waveIndex];
    waveIndex++; waveNumber=waveIndex; spawnQueue=plan.slice(); spawnTimer=.28;
    nextWaveAt=gameTime+level.gap;
    sound('wave'); showToast('第 ' + waveNumber + ' 波来袭！' + (waveNumber === level.waves.length ? '敌方主力现身。' : '敌军正向要塞推进。'),3);
    updateHUD(true);
  }
  function spawnEnemy(type) {
    const depthLanes=[.4,.57,.74,.86,.48,.66,.8,.34];
    const enemy=createUnit(type,'enemy',W-158+rand(-14,12),{depth:depthLanes[(nextId-1)%depthLanes.length]+rand(-.02,.02)});
    units.push(enemy); addParticle(enemy.x,depthY(enemy.depth)-4,'#d67869',5,45);
  }

  function addFloater(x,y,text,color='#fff1d1') { floaters.push({x,y,text,color,life:1.05,maxLife:1.05}); }
  function addParticle(x,y,color,count=8,power=90) {
    for (let i=0;i<count;i++) {
      const a=Math.random()*Math.PI*2,s=rand(power*.25,power);
      particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-15,life:rand(.25,.62),maxLife:.62,size:rand(2,5),color});
    }
  }
  function scaledDamage(attacker) {
    const boost=attacker.side==='ally' ? 1+weaponLevel*.18 : 1;
    const morale=attacker.side==='ally' && gameTime<moraleUntil ? 1.2 : 1;
    return attacker.damage*boost*morale;
  }
  function damageUnit(target,damage,attacker) {
    if (!target || target.dead) return;
    const spec=UNIT_TYPES[target.type];
    const actual=damage*(spec.armor || 1);
    target.hp-=actual; target.hitFlash=.14; sound('hit');
    if (target.hp<=0) {
      target.hp=0; target.dead=true;
      addParticle(target.x,unitHeadY(target)+24*viewScale(target),target.side==='enemy'?'#e67a69':'#85b9ec',target.type==='giant'?16:9,115);
      if (target.side==='enemy') {
        kills++; const bounty=target.type==='giant'?22:target.type==='spear'||target.type==='shield'?13:9;
        gold+=bounty; addFloater(target.x,unitHeadY(target)-5,'+'+bounty+' ◈','#f4cf86');
      }
      if (target===hero) { heroRespawnAt=gameTime+4.2; addFloater(target.x,unitHeadY(target)-18,'青岚倒下！','#ffc29b'); showToast('青岚暂时倒下，数秒后会重新加入战场。',2.4); }
      if (selectedUnitId===target.id) selectedUnitId=null;
    } else if (Math.random()<.3) addFloater(target.x,unitHeadY(target),'−'+Math.max(1,Math.round(actual)),'#f2e4d5');
    if (target.type==='giant' && attacker && attacker.type==='hero') target.x=clamp(target.x+attacker.facing*7,130,W-150);
  }
  function enemyBaseExposed() {
    return waveIndex >= level.waves.length && spawnQueue.length === 0 && living('enemy').length === 0;
  }
  function damageBase(side,damage) {
    if (side==='enemy') {
      if (!enemyBaseExposed()) return;
      enemyBase=Math.max(0,enemyBase-damage); addFloater(1142,GROUND-156,'−'+Math.ceil(damage),'#ffcc8c'); shake=Math.max(shake,2.5);
      if (enemyBase<=0) finishGame(true);
    } else {
      friendlyBase=Math.max(0,friendlyBase-damage); addFloater(139,GROUND-160,'−'+Math.ceil(damage),'#ff9c8d'); shake=Math.max(shake,4);
      if (friendlyBase<=0) finishGame(false);
    }
  }

  function queueAttack(unit,target,options={}) {
    const spec=UNIT_TYPES[unit.type];
    const duration=spec.attackDuration || .4;
    unit.attackTimer=spec.cooldown; unit.attackAnim=duration; unit.attackDuration=duration;
    unit.pendingAttack={target,baseSide:options.baseSide || null,damage:scaledDamage(unit),delay:spec.ranged?.28:.12,magic:!!spec.magic,ranged:!!spec.ranged};
    if (unit.type==='hero') sound('swing');
  }
  function resolveAttack(unit) {
    const pending=unit.pendingAttack; if (!pending) return;
    unit.pendingAttack=null;
    if (pending.baseSide) {
      damageBase(pending.baseSide,pending.damage*.78);
      addParticle(unit.x+unit.facing*30,depthY(unit.depth)-42*viewScale(unit),'#f3cf84',5,70);
      return;
    }
    if (pending.ranged) {
      const target=pending.target;
      if (!target || target.dead) return;
      const scale=viewScale(unit);
      projectiles.push({x:unit.x+unit.facing*16*scale,y:depthY(unit.depth)-45*scale,target,tx:target.x,ty:unitHeadY(target)+18*viewScale(target),side:unit.side,damage:pending.damage,speed:pending.magic?300:440,life:2.4,magic:pending.magic,dead:false});
      addParticle(unit.x+unit.facing*18*scale,depthY(unit.depth)-45*scale,pending.magic?'#b8a5fb':'#e9d5a3',3,32);
      return;
    }
    if (pending.target && !pending.target.dead) {
      damageUnit(pending.target,pending.damage,unit);
      const dx=pending.target.x-unit.x;
      pending.target.x=clamp(pending.target.x+Math.sign(dx||unit.facing)*(unit.type==='giant'?8:2),130,W-150);
      addParticle((unit.x+pending.target.x)/2,depthY((unit.depth+pending.target.depth)/2)-25,'#f0d091',4,60);
    }
  }
  function updatePending(unit,dt) {
    unit.attackAnim=Math.max(0,unit.attackAnim-dt);
    if (unit.pendingAttack) {
      unit.pendingAttack.delay-=dt;
      if (unit.pendingAttack.delay<=0) resolveAttack(unit);
    }
  }

  function nearestEnemy(unit,range) {
    let best=null,bestDistance=Infinity;
    for (const other of units) {
      if (other.dead || other.side===unit.side) continue;
      const d=groundDistance(unit,other);
      if (d<=range && d<bestDistance) { best=other; bestDistance=d; }
    }
    return best;
  }
  function moveToward(unit,target,dt) {
    const dx=target.x-unit.x, dz=(target.depth-unit.depth)*DEPTH_SPAN;
    const distance=Math.hypot(dx,dz)||1;
    const morale=unit.side==='ally' && gameTime<moraleUntil?1.35:1;
    const step=unit.speed*morale*dt;
    unit.x=clamp(unit.x+dx/distance*step,130,W-150);
    unit.depth=clamp(unit.depth+(dz/distance*step)/DEPTH_SPAN,.1,.98);
    if (Math.abs(dx)>2) unit.facing=dx>0?1:-1;
  }
  function moveToPosition(unit,x,depth,dt) {
    const target={x,depth};
    if (groundDistance(unit,target)>11) moveToward(unit,target,dt);
  }
  function updateMiner(unit,dt) {
    unit.attackTimer-=dt;
    updatePending(unit,dt);
    if (unit.pendingAttack) return;
    const threat=nearestEnemy(unit,58);
    if (threat) {
      unit.facing=threat.x>=unit.x?1:-1;
      if (groundDistance(unit,threat)<=unit.range) { if (unit.attackTimer<=0&&!unit.pendingAttack) queueAttack(unit,threat); }
      else moveToward(unit,threat,dt);
      return;
    }
    const mineDepth=.67;
    if (unit.mineState==='outbound') {
      const target={x:MINE_X,depth:mineDepth}; moveToPosition(unit,target.x,target.depth,dt);
      if (groundDistance(unit,target)<8) { unit.mineState='mining'; unit.mineTimer=2.05; }
    } else if (unit.mineState==='mining') {
      unit.mineTimer-=dt;
      if (unit.mineTimer<=0) { unit.cargo=Math.round(42*(1+mineLevel*.25)); unit.mineState='returning'; addParticle(MINE_X,depthY(mineDepth)-15,'#f4c56f',5,45); }
    } else {
      const target={x:PLAYER_SPAWN,depth:.64}; moveToPosition(unit,target.x,target.depth,dt);
      if (groundDistance(unit,target)<9) {
        gold+=unit.cargo; addFloater(PLAYER_SPAWN+18,depthY(unit.depth)-65,'+'+unit.cargo+' ◈','#f6d083');
        unit.cargo=0; unit.mineState='outbound';
      }
    }
    unit.facing=unit.mineState==='returning'?-1:1;
  }

  function updateManualHero(unit,dt) {
    unit.attackTimer-=dt;
    const left=heldKeys.has('KeyA')||heldKeys.has('ArrowLeft');
    const right=heldKeys.has('KeyD')||heldKeys.has('ArrowRight');
    const up=heldKeys.has('KeyW')||heldKeys.has('ArrowUp');
    const down=heldKeys.has('KeyS')||heldKeys.has('ArrowDown');
    let dx=(right?1:0)-(left?1:0), dz=(down?1:0)-(up?1:0);
    const moving=dx!==0||dz!==0;
    if (moving) {
      const length=Math.hypot(dx,dz); dx/=length; dz/=length;
      const speed=unit.speed*(gameTime<moraleUntil?1.25:1);
      unit.x=clamp(unit.x+dx*speed*dt,130,W-142);
      unit.depth=clamp(unit.depth+dz*speed*dt/DEPTH_SPAN,.12,.98);
      if (dx) unit.facing=dx>0?1:-1;
      unit.phase+=dt*10;
    } else unit.phase+=dt*2.1;
    updatePending(unit,dt);
    if (attackHeld && unit.attackTimer<=0 && !unit.pendingAttack) performHeroAttack(unit);
  }
  function performHeroAttack(unit) {
    const spec=UNIT_TYPES.hero;
    let target=null,best=Infinity;
    for (const enemy of units) {
      if (enemy.dead||enemy.side!=='enemy') continue;
      const dx=enemy.x-unit.x;
      if (dx*unit.facing < -22) continue;
      const d=groundDistance(unit,enemy);
      if (d<=spec.range && d<best) { target=enemy; best=d; }
    }
    if (target) {
      queueAttack(unit,target);
      addParticle(unit.x+unit.facing*34,depthY(unit.depth)-38*viewScale(unit),'#f4dc9f',4,48);
      return;
    }
    const baseGap=Math.abs(ENEMY_BASE_LINE-unit.x);
    if (unit.facing>0 && baseGap<spec.range+16 && Math.abs(unit.depth-.91)<.34) queueAttack(unit,null,{baseSide:'enemy'});
    else {
      unit.attackTimer=spec.cooldown*.42; unit.attackAnim=.24; unit.attackDuration=.34;
      addParticle(unit.x+unit.facing*43,depthY(unit.depth)-35*viewScale(unit),'#f3d49a',5,74);
    }
  }

  function updateCombatUnit(unit,dt) {
    unit.attackTimer-=dt; updatePending(unit,dt);
    if (unit.pendingAttack) return;
    const acquire=unit.side==='ally'?(commandMode==='attack'?390:265):285;
    const target=nearestEnemy(unit,Math.max(acquire,unit.range+55));
    if (target) {
      const d=groundDistance(unit,target);
      if (Math.abs(target.x-unit.x)>2) unit.facing=target.x>unit.x?1:-1;
      if (d<=unit.range) {
        if (unit.attackTimer<=0) queueAttack(unit,target);
      } else moveToward(unit,target,dt);
      return;
    }
    if (unit.side==='ally') {
      if (commandMode==='attack') {
        const base={x:ENEMY_BASE_LINE,depth:.91};
        if (groundDistance(unit,base)>unit.range+16) moveToward(unit,base,dt);
        else if (unit.attackTimer<=0) { unit.facing=1; queueAttack(unit,null,{baseSide:'enemy'}); }
      } else {
        const x=Math.max(PLAYER_SPAWN+35,DEFENSE_LINE-Math.min(unit.formationSlot,8)*23);
        const depth=.38+(unit.formationSlot%5)*.12;
        moveToPosition(unit,x,depth,dt);
      }
    } else {
      const base={x:PLAYER_BASE_LINE,depth:.84};
      if (groundDistance(unit,base)>unit.range+12) moveToward(unit,base,dt);
      else if (unit.attackTimer<=0) { unit.facing=-1; queueAttack(unit,null,{baseSide:'ally'}); }
    }
  }

  function damageMagicSplash(target,damage,side) {
    damageUnit(target,damage,{side,type:'mage'});
    for (const other of units) {
      if (other.dead||other.side===side||other===target) continue;
      if (groundDistance(target,other)<68) damageUnit(other,damage*.48,{side,type:'mage'});
    }
    addParticle(target.x,unitHeadY(target),'#bcaaff',13,100);
  }
  function updateProjectiles(dt) {
    for (const p of projectiles) {
      if (p.dead) continue;
      p.life-=dt;
      if (p.life<=0) { p.dead=true; continue; }
      if (p.target&&!p.target.dead) { p.tx=p.target.x; p.ty=unitHeadY(p.target)+18*viewScale(p.target); }
      else p.target=null;
      const dx=p.tx-p.x,dy=p.ty-p.y,d=Math.hypot(dx,dy)||1,step=p.speed*dt;
      if (d<=step+9) {
        if (p.target&&!p.target.dead) {
          if (p.magic) damageMagicSplash(p.target,p.damage,p.side);
          else damageUnit(p.target,p.damage,{side:p.side,type:'archer'});
        }
        addParticle(p.tx,p.ty,p.magic?'#bcaaff':p.side==='ally'?'#f0d59a':'#e38a78',p.magic?8:4,62);
        p.dead=true;
      } else { p.x+=dx/d*step; p.y+=dy/d*step; }
    }
    projectiles=projectiles.filter(p=>!p.dead);
  }

  function updateWaves(dt) {
    if (spawnQueue.length===0 && waveIndex<level.waves.length && gameTime>=nextWaveAt) createWave();
    if (spawnQueue.length>0) {
      spawnTimer-=dt;
      if (spawnTimer<=0) { spawnEnemy(spawnQueue.shift()); spawnTimer=1.25; }
    }
  }
  function updateEffects(dt) {
    for (const p of particles) { p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=155*dt;p.vx*=Math.max(0,1-dt*1.7); }
    particles=particles.filter(p=>p.life>0);
    for (const f of floaters) { f.life-=dt;f.y-=27*dt; }
    floaters=floaters.filter(f=>f.life>0);
    shake=Math.max(0,shake-dt*12);
  }
  function maybeRespawnHero() {
    if (hero&&!hero.dead) return;
    if (!heroRespawnAt || gameTime<heroRespawnAt) return;
    hero=createUnit('hero','ally',PLAYER_SPAWN+48,{depth:.72});
    hero.hp=hero.maxHp*.7; units.push(hero); heroRespawnAt=0;
    showToast('青岚重新加入战场！');
  }
  function update(dt) {
    gameTime+=dt;
    updateWaves(dt);
    maybeRespawnHero();
    for (const unit of units) {
      if (unit.dead) continue;
      unit.hitFlash=Math.max(0,unit.hitFlash-dt);
      if (unit.manual) updateManualHero(unit,dt);
      else if (unit.type==='miner'&&unit.side==='ally') { unit.phase+=dt*(unit.mineState==='mining'?2.2:5); updateMiner(unit,dt); }
      else { unit.phase+=dt*(unit.type==='giant'?3.4:5.4); updateCombatUnit(unit,dt); }
    }
    updateProjectiles(dt);
    units=units.filter(unit=>!unit.dead);
    updateEffects(dt);
    if (toastTimer>0) { toastTimer-=dt; if (toastTimer<=0) ui.toast.classList.remove('visible'); }
    hudTimer-=dt; if (hudTimer<=0) { hudTimer=.15;updateHUD(); }
  }

  function finishGame(victory) {
    if (mode!=='playing') return;
    mode=victory?'won':'lost'; heldKeys.clear(); attackHeld=false;
    $('endOverlay').hidden=false;
    const panel=document.querySelector('.end-panel'); panel.classList.toggle('is-defeat',!victory);
    const unlockType=level.unlock;
    let newlyUnlocked=false;
    if (victory) {
      if (!save.completed.includes(levelIndex)) save.completed.push(levelIndex);
      if (!save.unlockedUnits.includes(unlockType)) { save.unlockedUnits.push(unlockType); newlyUnlocked=true; }
      save.maxLevel=Math.max(save.maxLevel,Math.min(LEVELS.length-1,levelIndex+1));
      selectedLevel=Math.min(LEVELS.length-1,levelIndex+1);
      storeSave();
    }
    $('endEmblem').textContent=victory?'✦':'×';
    $('endEyebrow').textContent=victory?'战报 / 关卡完成':'战报 / 要塞失守';
    $('endTitle').textContent=victory?'这一关，打赢了。':'青岚要塞失守。';
    $('endDescription').textContent=victory
      ? (levelIndex===LEVELS.length-1?'赤曜王座已被攻破，八关战役圆满结束。':'军团已肃清战场。下一关正在地图上解锁。')
      : '敌军摧毁了要塞。调整兵种、亲自操控青岚，再挑战一次。';
    $('endKills').textContent=kills; $('endTime').textContent=formatTime(gameTime);
    $('unlockReward').hidden=!victory;
    if (victory) {
      $('unlockIcon').textContent=UNIT_TYPES[unlockType].icon;
      $('unlockName').textContent=(newlyUnlocked?'解锁：':'已获得：')+UNIT_TYPES[unlockType].name;
    }
    $('endNextBtn').hidden=!victory||levelIndex>=LEVELS.length-1;
    sound(victory?'win':'lose');
    renderRecruitList(); renderCampaignGrid(); updateHUD(true);
  }

  function updateHUD(force=false) {
    if (!force&&mode==='menu') return;
    ui.gold.textContent=Math.floor(gold).toLocaleString('zh-CN');
    const pop=population(); ui.population.innerHTML=pop+' <small>/ '+MAX_POP+'</small>';
    ui.populationBar.style.width=Math.min(100,pop/MAX_POP*100)+'%';
    ui.time.textContent=formatTime(gameTime);
    ui.friendText.textContent=Math.ceil(friendlyBase/PLAYER_BASE_MAX*100)+'%';
    ui.enemyText.textContent=Math.ceil(enemyBase/level.enemyHp*100)+'%';
    ui.friendBar.style.width=clamp(friendlyBase/PLAYER_BASE_MAX*100,0,100)+'%';
    ui.enemyBar.style.width=clamp(enemyBase/level.enemyHp*100,0,100)+'%';
    ui.heroBar.style.width=hero&&!hero.dead?clamp(hero.hp/hero.maxHp*100,0,100)+'%':'0%';
    ui.heroHp.textContent=hero&&!hero.dead?Math.ceil(hero.hp/hero.maxHp*100)+'%':'倒下';
    ui.heroState.textContent=hero&&!hero.dead?'WASD 移动 · J / 空格攻击':'短暂休整 · 即将复归';
    ui.wave.textContent=waveNumber===0?'首波 '+Math.ceil(Math.max(0,nextWaveAt-gameTime))+' 秒':
      '第 '+waveNumber+' 波'+(spawnQueue.length?' · 来袭':waveIndex>=level.waves.length?' · 最终战':' · '+Math.ceil(Math.max(0,nextWaveAt-gameTime))+' 秒');
    ui.commandLabel.textContent=commandMode==='defend'?'坚守阵线':'全军突进';
    ui.command.classList.toggle('is-attack',commandMode==='attack');
    if (gameTime<hornReadyAt) { ui.hornLabel.textContent=gameTime<moraleUntil?'号角激励中':'冲锋号角';ui.hornCooldown.textContent=Math.ceil(hornReadyAt-gameTime)+'s';$('hornBtn').disabled=true; }
    else {ui.hornLabel.textContent='冲锋号角';ui.hornCooldown.textContent='就绪';$('hornBtn').disabled=mode!=='playing';}
    const weaponCosts=[220,360];
    ui.weaponCost.textContent=weaponLevel>=2?'已满级':'◈ '+weaponCosts[weaponLevel];
    ui.weaponText.textContent=weaponLevel>=2?'全军伤害 +36%':'伤害 +'+((weaponLevel+1)*18)+'% · '+(weaponLevel+1)+'/2';
    ui.weapon.disabled=mode!=='playing'||weaponLevel>=2||gold<weaponCosts[weaponLevel];
    const mineCosts=[180,300];
    ui.mineCost.textContent=mineLevel>=2?'已满级':'◈ '+mineCosts[mineLevel];
    ui.mineText.textContent=mineLevel>=2?'每次交金 +50%':'每次交金 +'+((mineLevel+1)*25)+'% · '+(mineLevel+1)+'/2';
    ui.mine.disabled=mode!=='playing'||mineLevel>=2||gold<mineCosts[mineLevel];
    for (const card of ui.recruit.querySelectorAll('[data-recruit]')) {
      const type=card.dataset.recruit,unlocked=save.unlockedUnits.includes(type);
      card.disabled=mode!=='playing'||!unlocked||gold<UNIT_TYPES[type].cost||pop>=MAX_POP;
    }
    ui.campaignMini.textContent=save.completed.length+' / '+LEVELS.length+' 关';
    if (mode==='playing') {
      ui.pill.textContent=commandMode==='attack'?'军令 · 全军突进':'军令 · 坚守阵线';
      ui.status.textContent=gameTime<moraleUntil?'号角激励中！抓住时机向敌方雕像发起攻击。':!enemyBaseExposed()?'先击退全部敌军、打破雕像护盾，再发起最后一击。':level.goal;
      ui.missionStatus.textContent='进行中';ui.missionStatus.style.color='';
    } else if (mode==='paused') {ui.pill.textContent='战场已暂停';ui.status.textContent='青岚已停下脚步，战场暂停中。';ui.missionStatus.textContent='已暂停';}
    else if (mode==='won') {ui.pill.textContent='关卡完成';ui.status.textContent='新角色已加入军团，战役地图已更新。';ui.missionStatus.textContent='已胜利';ui.missionStatus.style.color='#f0c47b';}
    else if (mode==='lost') {ui.pill.textContent='要塞失守';ui.status.textContent='要塞失守，整补军团后重新挑战。';ui.missionStatus.textContent='失守';ui.missionStatus.style.color='#f28e81';}
    else ui.pill.textContent='等待指挥';
  }

  function drawCloud(x,y,s) {
    ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.fillStyle='rgba(255,244,220,.37)';ctx.beginPath();
    ctx.ellipse(0,8,47,12,0,0,Math.PI*2);ctx.ellipse(-24,1,20,15,0,0,Math.PI*2);ctx.ellipse(0,-4,24,19,0,0,Math.PI*2);ctx.ellipse(25,2,21,13,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function polygon(points,color) {
    ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0],points[i][1]);ctx.closePath();ctx.fill();
  }
  function drawBackground() {
    const sky=ctx.createLinearGradient(0,0,0,HORIZON+50);sky.addColorStop(0,'#738e97');sky.addColorStop(.55,'#c6a988');sky.addColorStop(1,'#e0b97e');ctx.fillStyle=sky;ctx.fillRect(0,0,W,HORIZON+20);
    const glow=ctx.createRadialGradient(895,116,15,895,116,116);glow.addColorStop(0,'rgba(255,220,154,.72)');glow.addColorStop(1,'rgba(255,218,152,0)');ctx.fillStyle=glow;ctx.fillRect(760,0,270,270);
    ctx.beginPath();ctx.arc(895,116,37,0,Math.PI*2);ctx.fillStyle='#f3d19a';ctx.fill();cloudSeeds.forEach(c=>drawCloud(c.x,c.y,c.s));
    polygon([[0,346],[107,259],[216,340],[331,235],[455,350],[570,275],[710,353],[837,246],[972,350],[1084,277],[1280,354],[1280,510],[0,510]],'#71807c');
    polygon([[0,370],[133,310],[262,380],[389,291],[528,390],[670,318],[789,387],[947,303],[1087,390],[1205,321],[1280,366],[1280,515],[0,515]],'#697768');
    polygon([[0,HORIZON+36],[1280,HORIZON+36],[1280,H],[0,H]],'#6b6b50');
    const ground=ctx.createLinearGradient(0,HORIZON,0,H);ground.addColorStop(0,'#828164');ground.addColorStop(.25,'#747152');ground.addColorStop(.65,'#555541');ground.addColorStop(1,'#373d37');ctx.fillStyle=ground;ctx.fillRect(0,HORIZON,W,H-HORIZON);
    // The ground plane converges at the horizon and expands toward the camera.
    polygon([[603,HORIZON+3],[677,HORIZON+3],[1040,H],[240,H]],'rgba(202,171,123,.16)');
    ctx.strokeStyle='rgba(235,211,164,.17)';ctx.lineWidth=1.2;
    for(const d of [.18,.34,.53,.75,.94]) {const y=depthY(d);ctx.globalAlpha=.18+d*.24;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    ctx.globalAlpha=1;
    ctx.strokeStyle='rgba(222,198,154,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(598,HORIZON);ctx.lineTo(40,H);ctx.moveTo(682,HORIZON);ctx.lineTo(1240,H);ctx.stroke();
    const grass=ctx.createLinearGradient(0,HORIZON,0,HORIZON+42);grass.addColorStop(0,'#82876a');grass.addColorStop(1,'rgba(99,112,75,0)');ctx.fillStyle=grass;ctx.fillRect(0,HORIZON,W,45);
    ctx.fillStyle='rgba(205,166,111,.11)';polygon([[0,depthY(.74)],[W,depthY(.74)],[W,depthY(.98)],[0,depthY(.98)]],'rgba(207,171,119,.08)');
    for(const s of scenery){const y=depthY(s.depth),scale=.5+s.depth*.65;ctx.strokeStyle=s.color;ctx.globalAlpha=.42+s.depth*.35;ctx.lineWidth=1+scale*.5;ctx.beginPath();ctx.moveTo(s.x,y);ctx.lineTo(s.x+s.lean*scale,y-s.height*scale);ctx.stroke();}
    ctx.globalAlpha=1;
    const stones=[[240,.93,11],[507,.97,18],[692,.86,12],[985,.95,17],[1058,.84,10],[748,.4,8],[550,.56,9]];
    for(const[x,d,r]of stones){const y=depthY(d);ctx.fillStyle='rgba(33,39,36,.3)';ctx.beginPath();ctx.ellipse(x,y,r,r*.42,-.08,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(185,167,132,.2)';ctx.beginPath();ctx.ellipse(x-3,y-2,r*.5,r*.22,-.15,0,Math.PI*2);ctx.fill();}
    for(const[x,d]of[[402,.76],[773,.91],[919,.78],[588,.73]]){const y=depthY(d);ctx.strokeStyle='rgba(35,48,36,.72)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(x,y+8);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#d9ae75';ctx.beginPath();ctx.arc(x,y-1,2,0,Math.PI*2);ctx.fill();}
  }
  function drawFlag(x,y,color,direction=1) {
    ctx.strokeStyle='#463f35';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-55);ctx.stroke();ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-54);ctx.lineTo(x+direction*39,y-43);ctx.lineTo(x,y-31);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,238,202,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x+3,y-52);ctx.lineTo(x+direction*27,y-44);ctx.stroke();
  }
  function drawFortress(side) {
    const friendly=side==='ally',x=friendly?26:W-145,wall=friendly?'#677c80':'#725654',stone=friendly?'#819195':'#8a6760',shadow=friendly?'#455b60':'#594344',banner=friendly?'#6ba9b9':'#d07463';
    const hp=friendly?friendlyBase:enemyBase,max=friendly?PLAYER_BASE_MAX:level.enemyHp;
    ctx.save();ctx.fillStyle='rgba(27,31,31,.25)';ctx.beginPath();ctx.ellipse(x+62,GROUND+2,77,11,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=wall;ctx.fillRect(x+13,GROUND-97,95,100);ctx.fillStyle=stone;ctx.fillRect(x+3,GROUND-112,29,115);ctx.fillRect(x+91,GROUND-107,27,110);ctx.fillRect(x+34,GROUND-132,55,135);
    ctx.fillStyle=shadow;ctx.fillRect(x+13,GROUND-15,95,18);ctx.fillRect(x+3,GROUND-112,29,9);ctx.fillRect(x+91,GROUND-107,27,9);ctx.fillRect(x+34,GROUND-144,55,10);
    for(let i=0;i<3;i++){ctx.fillStyle=stone;ctx.fillRect(x+4+i*10,GROUND-123,7,11);ctx.fillRect(x+92+i*9,GROUND-117,7,11);}
    for(let i=0;i<4;i++){ctx.fillStyle=stone;ctx.fillRect(x+36+i*14,GROUND-144,9,13);}
    ctx.fillStyle='rgba(35,39,39,.38)';ctx.fillRect(x+19,GROUND-77,11,19);ctx.fillRect(x+91,GROUND-75,10,18);ctx.fillStyle='#353c3a';ctx.beginPath();ctx.roundRect(x+52,GROUND-48,23,51,11);ctx.fill();
    ctx.fillStyle='rgba(236,215,164,.44)';ctx.beginPath();ctx.arc(x+64,GROUND-104,11,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(x+64,GROUND-104,5,0,Math.PI*2);ctx.fillStyle=banner;ctx.fill();
    ctx.strokeStyle='rgba(35,42,42,.2)';ctx.lineWidth=1.5;for(let row=0;row<4;row++){const y=GROUND-90+row*21;ctx.beginPath();ctx.moveTo(x+15,y);ctx.lineTo(x+105,y);ctx.stroke();ctx.beginPath();ctx.moveTo(x+48,GROUND-119+row*24);ctx.lineTo(x+79,GROUND-119+row*24);ctx.stroke();}
    drawFlag(x+62,GROUND-142,banner,friendly?1:-1);
    ctx.fillStyle='rgba(22,29,32,.62)';ctx.beginPath();ctx.roundRect(x+9,GROUND+12,107,21,7);ctx.fill();ctx.font='700 9px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=friendly?'#d7e5df':'#f0d3c8';ctx.fillText(friendly?'青岚要塞':'赤曜雕像',x+62,GROUND+22);
    const bx=x+17,by=GROUND-158;ctx.fillStyle='rgba(19,26,30,.68)';ctx.beginPath();ctx.roundRect(bx,by,90,7,4);ctx.fill();ctx.fillStyle=friendly?'#68c2c5':'#e77768';ctx.beginPath();ctx.roundRect(bx,by,90*clamp(hp/max,0,1),7,4);ctx.fill();
    if(!friendly&&!enemyBaseExposed()){ctx.save();const shield=ctx.createRadialGradient(x+64,GROUND-83,9,x+64,GROUND-83,58);shield.addColorStop(0,'rgba(149,181,255,.04)');shield.addColorStop(.78,'rgba(146,174,255,.12)');shield.addColorStop(1,'rgba(149,181,255,0)');ctx.fillStyle=shield;ctx.beginPath();ctx.arc(x+64,GROUND-83,58,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(179,203,255,.52)';ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();ctx.ellipse(x+64,GROUND-83,45,61,0,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.restore();}
    ctx.restore();
  }
  function drawMine() {
    const x=MINE_X,y=GROUND;ctx.save();ctx.fillStyle='rgba(26,32,30,.34)';ctx.beginPath();ctx.ellipse(x,y+4,54,11,0,0,Math.PI*2);ctx.fill();
    const rocks=[[-34,-4,22,19,'#67675b'],[-16,-17,23,25,'#77786a'],[8,-8,25,18,'#605f54'],[29,-2,19,15,'#777467'],[1,-29,18,19,'#77766a']];
    for(const[dx,dy,rx,ry,color]of rocks){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x+dx,y+dy,rx,ry,dx*.012,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(29,35,34,.33)';ctx.lineWidth=1.5;ctx.stroke();}
    ctx.fillStyle='#d8b168';ctx.beginPath();ctx.moveTo(x-12,y-34);ctx.lineTo(x-7,y-52);ctx.lineTo(x+1,y-37);ctx.lineTo(x+8,y-58);ctx.lineTo(x+15,y-33);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,236,181,.65)';ctx.beginPath();ctx.moveTo(x-7,y-49);ctx.lineTo(x-3,y-41);ctx.lineTo(x+1,y-51);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(35,39,35,.66)';ctx.beginPath();ctx.roundRect(x-37,y+15,74,17,6);ctx.fill();
    ctx.font='700 8px system-ui,sans-serif';ctx.fillStyle='#e0c993';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('金脉矿点',x,y+23);ctx.restore();
  }
  function drawBattleLine() {
    ctx.save();const x=DEFENSE_LINE;ctx.strokeStyle='rgba(255,223,157,.56)';ctx.lineWidth=1.4;ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(x,HORIZON+10);ctx.lineTo(x,H);ctx.stroke();ctx.setLineDash([]);
    ctx.fillStyle='rgba(45,46,39,.68)';ctx.beginPath();ctx.roundRect(x-34,HORIZON+13,68,17,5);ctx.fill();ctx.font='700 8px system-ui,sans-serif';ctx.fillStyle='#f1d6a3';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(commandMode==='attack'?'推进军令':'坚守阵线',x,HORIZON+21);ctx.restore();
  }

  function drawUnit(unit) {
    const spec=UNIT_TYPES[unit.type],x=unit.x,floor=depthY(unit.depth),scale=viewScale(unit),bob=Math.sin(unit.phase)*(unit.type==='giant'?1.2:2),facing=unit.facing||1,ally=unit.side==='ally';
    const armor=ally?'#77a8c9':'#c27366',cloth=ally?'#d3bd8d':'#a98a77',dark='#272d2d',weaponType=spec.weapon||unit.type;
    const selected=selectedUnitId===unit.id||unit.manual;
    ctx.save();ctx.fillStyle='rgba(22,27,26,'+(0.12+unit.depth*.2)+')';ctx.beginPath();ctx.ellipse(x,floor+3,18*scale,5*scale,0,0,Math.PI*2);ctx.fill();
    if(selected){ctx.strokeStyle=unit.manual?'rgba(255,220,134,.9)':'rgba(223,231,230,.7)';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(x,floor+3,23*scale,7*scale,0,0,Math.PI*2);ctx.stroke();}
    ctx.translate(x,floor+bob);ctx.scale(facing*scale,scale);ctx.lineCap='round';ctx.lineJoin='round';
    const stride=Math.sin(unit.phase)*(unit.type==='giant'?3:5);
    ctx.strokeStyle=dark;ctx.lineWidth=unit.type==='giant'?6:4;ctx.beginPath();ctx.moveTo(-3,-22);ctx.lineTo(-5+stride,-10);ctx.lineTo(-10+stride,-1);ctx.moveTo(2,-22);ctx.lineTo(5-stride,-11);ctx.lineTo(10-stride,-1);ctx.stroke();
    // Chest/helmet are shaded to make the depth-scaled stick figures read as little 3D units.
    ctx.fillStyle=ally?'#e3c89d':'#d5ad91';ctx.beginPath();ctx.arc(0,-52,unit.type==='giant'?12:9,0,Math.PI*2);ctx.fill();ctx.strokeStyle=dark;ctx.lineWidth=2.5;ctx.stroke();
    ctx.strokeStyle=dark;ctx.lineWidth=unit.type==='giant'?8:6;ctx.beginPath();ctx.moveTo(0,-42);ctx.lineTo(0,-23);ctx.stroke();
    ctx.strokeStyle=armor;ctx.lineWidth=unit.type==='giant'?7:5.5;ctx.beginPath();ctx.moveTo(-4,-39);ctx.lineTo(4,-28);ctx.stroke();
    ctx.fillStyle=unit.manual?'#e3b866':ally?'#5d8da9':'#a8534c';ctx.beginPath();ctx.arc(0,-54,unit.type==='giant'?12:9,Math.PI,Math.PI*2);ctx.fill();
    ctx.strokeStyle=dark;ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(3,-52);ctx.lineTo(6,-52);ctx.stroke();
    const swing=unit.attackAnim>0?Math.sin((1-unit.attackAnim/(unit.attackDuration||.4))*Math.PI):0;
    const handX=14+16*swing,handY=-38-8*swing;
    ctx.strokeStyle=dark;ctx.lineWidth=unit.type==='giant'?5.5:4;ctx.beginPath();ctx.moveTo(1,-38);ctx.lineTo(8,-31);ctx.lineTo(handX,handY);ctx.stroke();
    ctx.strokeStyle=cloth;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,-37);ctx.lineTo(-7,-28);ctx.stroke();
    if(weaponType==='sword'||weaponType==='shadow'||weaponType==='rider'){
      const bladeX=20+25*swing,bladeY=-48+13*swing;
      ctx.strokeStyle='#373b39';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(handX+6,handY-11);ctx.stroke();
      ctx.strokeStyle=unit.type==='shadow'?'#b7c2dc':'#e1dfd2';ctx.lineWidth=2.3;ctx.beginPath();ctx.moveTo(handX+6,handY-11);ctx.lineTo(bladeX+12,bladeY-20);ctx.stroke();
      ctx.strokeStyle='#b08c58';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(handX+3,handY-8);ctx.lineTo(handX+11,handY-4);ctx.stroke();
    } else if(weaponType==='archer'){
      ctx.strokeStyle='#72573d';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(16,-36);ctx.quadraticCurveTo(33,-51,18,-66);ctx.stroke();ctx.strokeStyle='rgba(237,218,184,.86)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(18,-66);ctx.lineTo(18,-36);ctx.stroke();ctx.strokeStyle='#423c35';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(13,-50);ctx.lineTo(33,-50);ctx.lineTo(29,-53);ctx.moveTo(33,-50);ctx.lineTo(29,-47);ctx.stroke();
    } else if(weaponType==='spear'){
      ctx.strokeStyle='#735b3e';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(30+12*swing,-69-8*swing);ctx.stroke();ctx.fillStyle='#d5d1c4';ctx.beginPath();ctx.moveTo(29+12*swing,-70-8*swing);ctx.lineTo(36+12*swing,-81-8*swing);ctx.lineTo(34+12*swing,-66-8*swing);ctx.closePath();ctx.fill();
    } else if(weaponType==='shield'){
      ctx.strokeStyle='#72593c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(23,-48);ctx.stroke();ctx.fillStyle=armor;ctx.beginPath();ctx.moveTo(19,-57);ctx.lineTo(35,-52);ctx.lineTo(34,-32);ctx.lineTo(23,-28);ctx.lineTo(16,-39);ctx.closePath();ctx.fill();ctx.strokeStyle=dark;ctx.lineWidth=1.8;ctx.stroke();
    } else if(weaponType==='mage'){
      ctx.strokeStyle='#594a72';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(28,-69);ctx.stroke();ctx.fillStyle='#c5aafa';ctx.shadowColor='#c5aafa';ctx.shadowBlur=8;ctx.beginPath();ctx.arc(29,-73,5,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    } else if(weaponType==='giant'){
      ctx.strokeStyle=dark;ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(24,-50);ctx.stroke();ctx.strokeStyle='#5e4539';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(24,-50);ctx.lineTo(31,-65);ctx.stroke();ctx.fillStyle='#907254';ctx.beginPath();ctx.roundRect(25,-76,15,14,3);ctx.fill();ctx.strokeStyle='#443c33';ctx.lineWidth=1.5;ctx.stroke();ctx.fillStyle=armor;ctx.beginPath();ctx.moveTo(-9,-43);ctx.lineTo(8,-43);ctx.lineTo(12,-24);ctx.lineTo(-10,-24);ctx.closePath();ctx.fill();
    } else if(weaponType==='miner'){
      ctx.strokeStyle='#72593c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(handX,handY);ctx.lineTo(24,-51);ctx.stroke();ctx.strokeStyle='#d8d2c4';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(20,-54);ctx.lineTo(31,-49);ctx.stroke();ctx.fillStyle='#c39753';ctx.beginPath();ctx.moveTo(-7,-40);ctx.lineTo(6,-40);ctx.lineTo(10,-23);ctx.lineTo(-8,-23);ctx.closePath();ctx.fill();
      if(unit.cargo>0){ctx.fillStyle='#edc36f';ctx.beginPath();ctx.arc(-8,-52,4,0,Math.PI*2);ctx.fill();}
    }
    if(unit.type==='shield'){ctx.fillStyle=armor;ctx.beginPath();ctx.arc(-4,-39,4,0,Math.PI*2);ctx.fill();ctx.strokeStyle=dark;ctx.lineWidth=1;ctx.stroke();}
    if(unit.type==='hero'){ctx.strokeStyle='#e4c071';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(-7,-40);ctx.lineTo(0,-29);ctx.lineTo(8,-40);ctx.stroke();}
    ctx.restore();

    if(unit.attackAnim>0&&weaponType!=='archer'&&weaponType!=='mage'&&weaponType!=='miner'){
      const p=1-unit.attackAnim/(unit.attackDuration||.4),alpha=Math.sin(p*Math.PI);
      ctx.save();ctx.globalAlpha=clamp(alpha*.85,0,.85);ctx.strokeStyle=unit.manual?'#fff0b7':ally?'#e5ca88':'#f1a18e';ctx.lineWidth=2.5*scale;ctx.beginPath();
      if(facing>0){ctx.moveTo(x+9*scale,floor-55*scale);ctx.quadraticCurveTo(x+57*scale,floor-65*scale,x+46*scale,floor-22*scale);}
      else{ctx.moveTo(x-9*scale,floor-55*scale);ctx.quadraticCurveTo(x-57*scale,floor-65*scale,x-46*scale,floor-22*scale);}
      ctx.stroke();ctx.restore();
    }
    const barW=unit.type==='giant'?46*scale:31*scale,barY=floor-77*scale;
    ctx.fillStyle='rgba(25,30,29,.74)';ctx.beginPath();ctx.roundRect(x-barW/2,barY,barW,4*scale,2);ctx.fill();ctx.fillStyle=ally?'#88d1c6':'#ed8b79';ctx.beginPath();ctx.roundRect(x-barW/2,barY,barW*clamp(unit.hp/unit.maxHp,0,1),4*scale,2);ctx.fill();
    if(unit.hitFlash>0){ctx.fillStyle='rgba(255,247,230,'+(unit.hitFlash/.14*.5)+')';ctx.beginPath();ctx.arc(x,floor-48*scale,20*scale,0,Math.PI*2);ctx.fill();}
    if(unit.manual){ctx.font='800 '+(8*scale)+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff0bd';ctx.fillText('青岚',x,floor-95*scale);}
    if(unit.type==='miner'&&unit.mineState==='mining'){ctx.fillStyle='rgba(40,39,32,.58)';ctx.beginPath();ctx.roundRect(x-17*scale,floor-95*scale,34*scale,14*scale,5);ctx.fill();ctx.font='700 '+(8*scale)+'px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f2d28c';ctx.fillText('采矿',x,floor-88*scale);}
  }
  function drawProjectile(p) {
    const tx=p.target&&!p.target.dead?p.target.x:p.tx,ty=p.target&&!p.target.dead?unitHeadY(p.target)+18*viewScale(p.target):p.ty,angle=Math.atan2(ty-p.y,tx-p.x);
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);
    if(p.magic){ctx.fillStyle='#c4aafa';ctx.shadowColor='#bcaaff';ctx.shadowBlur=10;ctx.beginPath();ctx.arc(0,0,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
    else{ctx.strokeStyle=p.side==='ally'?'#483f34':'#70433e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(8,0);ctx.stroke();ctx.fillStyle=p.side==='ally'?'#e9cf91':'#e38a78';ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(3,-3);ctx.lineTo(3,3);ctx.closePath();ctx.fill();}
    ctx.restore();
  }
  function drawEffects() {
    for(const p of particles){ctx.globalAlpha=clamp(p.life/p.maxLife,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    for(const f of floaters){ctx.globalAlpha=clamp(f.life/f.maxLife,0,1);ctx.font='800 11px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=3;ctx.strokeStyle='rgba(29,32,31,.68)';ctx.strokeText(f.text,f.x,f.y);ctx.fillStyle=f.color;ctx.fillText(f.text,f.x,f.y);}ctx.globalAlpha=1;
  }
  function render() {
    ctx.save();if(shake>.1)ctx.translate(rand(-shake,shake),rand(-shake*.55,shake*.55));
    drawBackground();drawMine();drawFortress('ally');drawFortress('enemy');drawBattleLine();
    if(gameTime<moraleUntil&&mode==='playing'){ctx.save();ctx.globalAlpha=.75+Math.sin(visualTime*10)*.16;ctx.fillStyle='rgba(40,34,51,.72)';ctx.beginPath();ctx.roundRect(W/2-90,30,180,27,9);ctx.fill();ctx.font='800 10px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#e7c8ff';ctx.fillText('✧ 号角激励 · 全军奋战 ✧',W/2,43);ctx.restore();}
    const sorted=units.slice().sort((a,b)=>a.depth-b.depth||a.x-b.x);for(const unit of sorted)drawUnit(unit);for(const p of projectiles)drawProjectile(p);drawEffects();
    if(mode==='playing'&&waveNumber===0&&gameTime<7){ctx.save();ctx.globalAlpha=clamp((7-gameTime)/5,0,.7);ctx.fillStyle='rgba(31,39,40,.64)';ctx.beginPath();ctx.roundRect(W/2-105,24,210,25,8);ctx.fill();ctx.font='700 9px system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#f4e5c4';ctx.fillText('青岚已上阵 · 敌军尚未抵达',W/2,36.5);ctx.restore();}
    ctx.restore();
  }

  function updateHUDCampaignOnly() { renderCampaignGrid(); renderRecruitList(); }
  function frame(timestamp) {
    requestAnimationFrame(frame);
    const dt=Math.min(.05,Math.max(0,(timestamp-(lastFrame||timestamp))/1000));lastFrame=timestamp;visualTime+=dt;
    if(mode==='playing')update(dt*timeScale);
    render();
  }

  // Mouse/touch battlefield inspection is separate from the movement controls.
  canvas.addEventListener('click',event=>{
    if(mode!=='playing')return;
    const rect=canvas.getBoundingClientRect(),x=(event.clientX-rect.left)*W/rect.width,y=(event.clientY-rect.top)*H/rect.height;
    let found=null,best=Infinity;
    for(const unit of units){if(unit.dead||unit.side!=='ally')continue;const dx=unit.x-x,dy=depthY(unit.depth)-42*viewScale(unit)-y,d=dx*dx+dy*dy;if(d<2200&&d<best){best=d;found=unit;}}
    selectedUnitId=found?found.id:null;
    if(found){const spec=UNIT_TYPES[found.type];showToast(spec.name+' · 生命 '+Math.ceil(found.hp)+'/'+Math.ceil(found.maxHp)+(found.manual?' · 你正在操控':' · 点击兵种卡可继续征募'),2);}
  });
  document.querySelectorAll('[data-move]').forEach(button=>{
    const map={up:'KeyW',down:'KeyS',left:'KeyA',right:'KeyD'},key=map[button.dataset.move];
    button.addEventListener('pointerdown',event=>{event.preventDefault();heldKeys.add(key);button.setPointerCapture?.(event.pointerId);});
    const release=event=>{event.preventDefault();heldKeys.delete(key);};
    button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
  });
  const touchAttack=$('touchAttack');
  touchAttack.addEventListener('pointerdown',event=>{event.preventDefault();attackHeld=true;touchAttack.setPointerCapture?.(event.pointerId);});
  const releaseAttack=event=>{event.preventDefault();attackHeld=false;};
  touchAttack.addEventListener('pointerup',releaseAttack);touchAttack.addEventListener('pointercancel',releaseAttack);touchAttack.addEventListener('lostpointercapture',releaseAttack);

  $('playBtn').addEventListener('click',()=>startGame(selectedLevel));
  $('briefingPlayBtn').addEventListener('click',()=>startGame(selectedLevel));
  $('helpBtn').addEventListener('click',()=>{$('welcomeOverlay').hidden=true;$('helpOverlay').hidden=false;});
  $('briefingBackBtn').addEventListener('click',()=>{$('helpOverlay').hidden=true;$('welcomeOverlay').hidden=false;renderCampaignGrid();});
  document.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>{$(button.dataset.close).hidden=true;}));
  $('commandBtn').addEventListener('click',toggleCommand);$('hornBtn').addEventListener('click',useHorn);$('speedBtn').addEventListener('click',toggleSpeed);$('pauseBtn').addEventListener('click',togglePause);$('resumeBtn').addEventListener('click',togglePause);
  $('restartBtn').addEventListener('click',()=>startGame(levelIndex));$('pauseRestartBtn').addEventListener('click',()=>startGame(levelIndex));$('endRestartBtn').addEventListener('click',()=>startGame(levelIndex));
  $('endNextBtn').addEventListener('click',()=>startGame(Math.min(LEVELS.length-1,levelIndex+1)));
  $('endHomeBtn').addEventListener('click',returnToMap);$('homeBtn').addEventListener('click',returnToMap);
  $('weaponUpgradeBtn').addEventListener('click',upgradeWeapon);$('mineUpgradeBtn').addEventListener('click',upgradeMine);
  $('soundBtn').addEventListener('click',()=>{soundOn=!soundOn;$('soundBtn').textContent=soundOn?'🔊':'🔇';$('soundBtn').setAttribute('aria-label',soundOn?'关闭音效':'开启音效');if(soundOn)sound('recruit');});
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey)return;
    const key=event.key.toLowerCase();
    if(mode==='playing'){
      if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){heldKeys.add(event.code);event.preventDefault();return;}
      if(key==='j'||event.code==='Space'){attackHeld=true;event.preventDefault();return;}
      const index=UNIT_KEYS.indexOf(event.key);if(index>=0){recruit(UNIT_ORDER[index]);return;}
      if(key==='c'){toggleCommand();return;}if(key==='h'){useHorn();return;}if(key==='f'){toggleSpeed();return;}
      if(key==='p'||key==='escape'){togglePause();return;}
    } else if(mode==='paused'&&(key==='p'||key==='escape'))togglePause();
    else if(mode==='menu'&&key==='enter')startGame(selectedLevel);
  });
  document.addEventListener('keyup',event=>{
    heldKeys.delete(event.code);
    if(event.code==='Space'||event.key.toLowerCase()==='j')attackHeld=false;
  });
  window.addEventListener?.('blur',()=>{heldKeys.clear();attackHeld=false;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')togglePause();});

  function initialize() {
    renderCampaignGrid();renderRecruitList();
    $('levelTitle').textContent=LEVELS[selectedLevel].name;
    $('levelEyebrow').textContent='战役第 '+String(selectedLevel+1).padStart(2,'0')+' 关 / '+LEVELS[selectedLevel].tag;
    level=LEVELS[selectedLevel];enemyBase=level.enemyHp;gold=level.startGold;
    hero=createUnit('hero','ally',PLAYER_SPAWN+52,{depth:.7});units.push(hero);
    units.push(createUnit('miner','ally',PLAYER_SPAWN,{depth:.62}),createUnit('miner','ally',PLAYER_SPAWN+26,{depth:.7}));
    ui.mission.textContent=level.goal;updateHUD(true);requestAnimationFrame(frame);
  }
  initialize();
})();
