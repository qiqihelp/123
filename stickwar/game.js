'use strict';

(() => {
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  if (typeof ctx.roundRect !== 'function') {
    ctx.roundRect = function(x, y, width, height, radius) {
      const r = Math.min(radius || 0, width / 2, height / 2);
      this.moveTo(x + r, y);
      this.arcTo(x + width, y, x + width, y + height, r);
      this.arcTo(x + width, y + height, x, y + height, r);
      this.arcTo(x, y + height, x, y, r);
      this.arcTo(x, y, x + width, y, r);
      this.closePath();
    };
  }
  const W = canvas.width;
  const H = canvas.height;
  const GROUND = 492;
  const MAX_POP = 20;
  const PLAYER_BASE_LINE = 178;
  const ENEMY_BASE_LINE = 1095;
  const PLAYER_SPAWN = 190;
  const MINE_X = 338;
  const DEFENSE_LINE = 455;
  const PLAYER_BASE_MAX = 180;
  const ENEMY_BASE_MAX = 220;
  const UNIT_ORDER = ['miner', 'sword', 'archer', 'spear', 'giant'];
  const UNIT_KEYS = ['1', '2', '3', '4', '5'];
  const UNIT_TYPES = {
    miner: {
      name: '采金矿工', short: '矿工', icon: '⌁', cost: 75, hp: 64, damage: 7,
      range: 37, cooldown: 1.25, speed: 42, scale: .83,
      description: '往返金矿，持续为军团带回黄金。'
    },
    sword: {
      name: '轻剑士', short: '剑士', icon: '⚔', cost: 105, hp: 112, damage: 18,
      range: 43, cooldown: 1.12, speed: 57, scale: .96,
      description: '训练迅速、近战可靠的前线士兵。'
    },
    archer: {
      name: '巡林弓手', short: '弓手', icon: '➶', cost: 160, hp: 66, damage: 14,
      range: 235, cooldown: 1.48, speed: 43, scale: .91, ranged: true,
      description: '在安全距离外射出箭矢，压制敌方。'
    },
    spear: {
      name: '磐石枪卫', short: '枪卫', icon: '╱', cost: 215, hp: 188, damage: 27,
      range: 61, cooldown: 1.55, speed: 36, scale: 1.03,
      description: '身披重甲，耐打并能击退敌人。'
    },
    giant: {
      name: '遗迹巨人', short: '巨人', icon: '◆', cost: 390, hp: 475, damage: 72,
      range: 78, cooldown: 2.35, speed: 22, scale: 1.47,
      description: '行动缓慢，但能承受重击并摧毁防线。'
    }
  };
  const WAVE_PLANS = [
    ['sword', 'sword', 'archer'],
    ['sword', 'sword', 'sword', 'archer'],
    ['sword', 'sword', 'archer', 'archer', 'spear'],
    ['sword', 'sword', 'sword', 'archer', 'archer', 'spear', 'spear', 'giant'],
    ['sword', 'sword', 'sword', 'archer', 'archer', 'spear', 'spear', 'giant', 'archer'],
    ['sword', 'sword', 'sword', 'sword', 'archer', 'archer', 'spear', 'spear', 'giant', 'giant']
  ];

  const $ = id => document.getElementById(id);
  const ui = {
    gold: $('goldValue'), population: $('populationValue'), populationBar: $('populationBar'),
    wave: $('waveValue'), time: $('timeValue'), status: $('statusText'), statePill: $('statePill'),
    command: $('commandBtn'), commandLabel: $('commandLabel'), hornLabel: $('hornLabel'),
    hornCooldown: $('hornCooldown'), friendlyBaseText: $('friendlyBaseText'), enemyBaseText: $('enemyBaseText'),
    friendlyBaseBar: $('friendlyBaseBar'), enemyBaseBar: $('enemyBaseBar'), missionStatus: $('missionStatus'),
    weaponUpgrade: $('weaponUpgradeBtn'), weaponUpgradeCost: $('weaponUpgradeCost'), weaponUpgradeText: $('weaponUpgradeText'),
    mineUpgrade: $('mineUpgradeBtn'), mineUpgradeCost: $('mineUpgradeCost'), mineUpgradeText: $('mineUpgradeText'),
    toast: $('toast'), recruitList: $('recruitList')
  };

  let mode = 'menu';
  let commandMode = 'defend';
  let timeScale = 1;
  let soundOn = true;
  let audioContext = null;
  let gameTime = 0;
  let gold = 260;
  let friendlyBase = PLAYER_BASE_MAX;
  let enemyBase = ENEMY_BASE_MAX;
  let units = [];
  let projectiles = [];
  let particles = [];
  let floaters = [];
  let nextUnitId = 1;
  let kills = 0;
  let wave = 0;
  let nextWaveAt = 18;
  let spawnQueue = [];
  let spawnTimer = 0;
  let weaponLevel = 0;
  let mineLevel = 0;
  let moraleUntil = 0;
  let hornReadyAt = 0;
  let toastTimer = 0;
  let hudTimer = 0;
  let shake = 0;
  let selectedUnitId = null;
  let lastFrame = 0;
  let visualTime = 0;

  const scenery = Array.from({length: 56}, (_, i) => ({
    x: 32 + Math.random() * 1215,
    y: GROUND + 18 + Math.random() * 113,
    h: 4 + Math.random() * 10,
    lean: (Math.random() - .5) * 10,
    color: i % 3 === 0 ? '#64724e' : i % 3 === 1 ? '#7d7951' : '#5b704d'
  }));
  const cloudSeeds = [
    {x: 155, y: 94, scale: .8}, {x: 475, y: 143, scale: .57},
    {x: 815, y: 79, scale: .68}, {x: 1070, y: 160, scale: .54}
  ];

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
  function rand(min, max) { return min + Math.random() * (max - min); }
  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }
  function aliveUnits(side) { return units.filter(unit => !unit.dead && (!side || unit.side === side)); }
  function population() { return aliveUnits('ally').length; }
  function showToast(message, duration = 2.7) {
    ui.toast.textContent = message;
    ui.toast.classList.add('visible');
    toastTimer = duration;
  }
  function hideOverlays() {
    ['welcomeOverlay', 'helpOverlay', 'pauseOverlay', 'endOverlay'].forEach(id => { $(id).hidden = true; });
  }

  function playTone(frequency, duration, waveType = 'sine', volume = .035, delay = 0) {
    if (!soundOn) return;
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startAt = audioContext.currentTime + delay;
      oscillator.type = waveType;
      oscillator.frequency.setValueAtTime(frequency, startAt);
      gain.gain.setValueAtTime(volume, startAt);
      gain.gain.exponentialRampToValueAtTime(.001, startAt + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + duration);
    } catch (_) { /* Audio is an optional flourish; gameplay never depends on it. */ }
  }
  function sound(name) {
    if (name === 'recruit') { playTone(490, .09, 'triangle', .045); playTone(740, .11, 'triangle', .035, .07); }
    else if (name === 'upgrade') { playTone(390, .14, 'sine', .04); playTone(590, .19, 'sine', .045, .1); }
    else if (name === 'wave') { playTone(185, .24, 'triangle', .045); playTone(245, .27, 'triangle', .04, .2); }
    else if (name === 'horn') { playTone(250, .5, 'sawtooth', .035); playTone(340, .48, 'sawtooth', .03, .16); }
    else if (name === 'hit') { playTone(125, .055, 'square', .014); }
    else if (name === 'win') { playTone(523, .2, 'triangle', .05); playTone(659, .22, 'triangle', .05, .16); playTone(784, .35, 'triangle', .05, .32); }
    else if (name === 'lose') { playTone(240, .35, 'triangle', .045); playTone(170, .5, 'triangle', .04, .2); }
  }

  function makeUnit(type, side, x, spawnWave = 0) {
    const spec = UNIT_TYPES[type];
    const enemyScale = side === 'enemy' ? 1 + Math.min(.42, Math.max(0, spawnWave - 1) * .055) : 1;
    const id = nextUnitId++;
    const depthLanes = [-17, 17, -8, 8, 0, -23, 23, -3, 3, -13, 13];
    const formationSlot = type === 'miner' ? 0 : units.filter(unit => !unit.dead && unit.side === side && unit.type !== 'miner').length;
    const depth = type === 'miner' ? rand(-5, 12) : depthLanes[(id - 1) % depthLanes.length] + rand(-2, 2);
    const unit = {
      id, type, side, x, depth, formationSlot,
      hp: spec.hp * enemyScale, maxHp: spec.hp * enemyScale,
      damage: spec.damage * (side === 'enemy' ? 1 + Math.min(.28, Math.max(0, spawnWave - 1) * .035) : 1),
      speed: spec.speed, range: spec.range, cooldown: spec.cooldown,
      scale: spec.scale * (side === 'enemy' && type === 'giant' ? 1 + Math.min(.08, Math.max(0, spawnWave - 3) * .025) : 1),
      attackTimer: rand(.25, .9), phase: rand(0, Math.PI * 2), hitFlash: 0,
      dead: false, mineState: 'outbound', mineTimer: 2.15, cargo: 0,
      spawnWave, side
    };
    return unit;
  }

  function startGame() {
    hideOverlays();
    mode = 'playing';
    commandMode = 'defend';
    timeScale = 1;
    $('speedBtn').textContent = '▶ 1×';
    gameTime = 0;
    gold = 260;
    friendlyBase = PLAYER_BASE_MAX;
    enemyBase = ENEMY_BASE_MAX;
    units = [];
    projectiles = [];
    particles = [];
    floaters = [];
    nextUnitId = 1;
    kills = 0;
    wave = 0;
    nextWaveAt = 18;
    spawnQueue = [];
    spawnTimer = 0;
    weaponLevel = 0;
    mineLevel = 0;
    moraleUntil = 0;
    hornReadyAt = 0;
    selectedUnitId = null;
    shake = 0;
    units.push(makeUnit('miner', 'ally', PLAYER_SPAWN));
    units.push(makeUnit('miner', 'ally', PLAYER_SPAWN + 28));
    units[0].mineState = 'outbound';
    units[1].mineState = 'outbound';
    sound('recruit');
    showToast('战旗已升起。先部署军队，第一波敌军即将抵达。', 3.7);
    updateHUD(true);
  }

  function recruit(type) {
    if (mode !== 'playing') return;
    const spec = UNIT_TYPES[type];
    if (!spec) return;
    if (population() >= MAX_POP) {
      showToast('军团已满员，无法继续征募。');
      return;
    }
    if (gold < spec.cost) {
      showToast('黄金不足：征募「' + spec.short + '」需要 ◈ ' + spec.cost + '。', 2.1);
      return;
    }
    gold -= spec.cost;
    const x = PLAYER_SPAWN + rand(-10, 26);
    units.push(makeUnit(type, 'ally', x));
    sound('recruit');
    showToast('「' + spec.name + '」已加入军团。', 1.9);
    updateHUD(true);
  }

  function upgradeWeapon() {
    if (mode !== 'playing') return;
    const costs = [220, 360];
    if (weaponLevel >= costs.length) return;
    const cost = costs[weaponLevel];
    if (gold < cost) { showToast('黄金不足，无法精炼武器。', 2); return; }
    gold -= cost;
    weaponLevel++;
    sound('upgrade');
    showToast('军械升级完成：全军攻击力提升 ' + (weaponLevel * 18) + '%。');
    updateHUD(true);
  }
  function upgradeMine() {
    if (mode !== 'playing') return;
    const costs = [180, 300];
    if (mineLevel >= costs.length) return;
    const cost = costs[mineLevel];
    if (gold < cost) { showToast('黄金不足，无法改良矿镐。', 2); return; }
    gold -= cost;
    mineLevel++;
    sound('upgrade');
    showToast('矿镐改良完成：每次交金额外提升 ' + (mineLevel * 25) + '%。');
    updateHUD(true);
  }

  function toggleCommand() {
    if (mode !== 'playing') return;
    commandMode = commandMode === 'defend' ? 'attack' : 'defend';
    sound('horn');
    showToast(commandMode === 'attack' ? '全军推进！越过防守线，直取赤曜遗迹。' : '全军回防！在防守阵线附近稳住战局。', 2.8);
    updateHUD(true);
  }
  function useHorn() {
    if (mode !== 'playing') return;
    if (gameTime < hornReadyAt) {
      showToast('冲锋号角还在冷却中。', 1.6);
      return;
    }
    moraleUntil = gameTime + 8;
    hornReadyAt = gameTime + 38;
    sound('horn');
    showToast('号角响彻战场！全军速度与攻击力提升 8 秒。', 2.8);
    updateHUD(true);
  }
  function toggleSpeed() {
    if (mode !== 'playing') return;
    timeScale = timeScale === 1 ? 2 : 1;
    $('speedBtn').textContent = timeScale === 1 ? '▶ 1×' : '▶ 2×';
    showToast(timeScale === 2 ? '战场速度已提升至 2×。' : '战场速度恢复至 1×。', 1.4);
  }
  function togglePause() {
    if (mode === 'playing') {
      mode = 'paused';
      $('pauseOverlay').hidden = false;
      updateHUD(true);
    } else if (mode === 'paused') {
      mode = 'playing';
      $('pauseOverlay').hidden = true;
      updateHUD(true);
    }
  }

  function spawnWave() {
    wave++;
    const plan = WAVE_PLANS[Math.min(wave - 1, WAVE_PLANS.length - 1)].slice();
    if (wave > WAVE_PLANS.length) {
      const extra = wave - WAVE_PLANS.length;
      if (extra % 2 === 0) plan.push('giant');
      plan.push('spear');
      if (extra % 3 === 0) plan.push('archer');
    }
    spawnQueue = plan;
    spawnTimer = .35;
    nextWaveAt = gameTime + Math.max(34, 48 - wave * 2.4);
    sound('wave');
    showToast('第 ' + wave + ' 波敌军来袭！侦察兵发现敌方战旗。', 3.2);
    updateHUD(true);
  }
  function spawnEnemy(type) {
    const x = W - 165 + rand(-13, 10);
    const enemy = makeUnit(type, 'enemy', x, wave);
    enemy.x = x;
    units.push(enemy);
    addParticle(x, GROUND - 5, '#d67869', 5, 42);
  }

  function floatingText(x, y, text, color = '#fff2d3') {
    floaters.push({x, y, text, color, life: 1.05, maxLife: 1.05});
  }
  function addParticle(x, y, color, count = 8, power = 95) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(power * .25, power);
      particles.push({x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 20, life: rand(.24, .65), maxLife: .65, size: rand(2, 5), color});
    }
  }

  function damageUnit(target, damage, attacker) {
    if (!target || target.dead) return;
    target.hp -= damage;
    target.hitFlash = .13;
    sound('hit');
    if (target.hp <= 0) {
      target.hp = 0;
      target.dead = true;
      addParticle(target.x, GROUND - target.depth - 32 * target.scale, target.side === 'enemy' ? '#e67a69' : '#85b9ec', target.type === 'giant' ? 15 : 9, 115);
      if (target.side === 'enemy') {
        kills++;
        const bounty = target.type === 'giant' ? 20 : target.type === 'spear' ? 12 : 8;
        gold += bounty;
        floatingText(target.x, GROUND - 68 * target.scale - target.depth, '+' + bounty + ' ◈', '#f4cf86');
      }
      if (selectedUnitId === target.id) selectedUnitId = null;
    } else if (Math.random() < .28) {
      floatingText(target.x, GROUND - 66 * target.scale - target.depth, '−' + Math.max(1, Math.round(damage)), '#f2e4d5');
    }
  }

  function damageBase(side, damage, attacker) {
    if (side === 'enemy') {
      enemyBase = Math.max(0, enemyBase - damage);
      floatingText(1140, GROUND - 155, '−' + Math.ceil(damage), '#ffcc8c');
      shake = Math.max(shake, 2.5);
      if (enemyBase <= 0) finishGame(true);
    } else {
      friendlyBase = Math.max(0, friendlyBase - damage);
      floatingText(139, GROUND - 160, '−' + Math.ceil(damage), '#ff9c8d');
      shake = Math.max(shake, 4);
      if (friendlyBase <= 0) finishGame(false);
    }
  }

  function fireArrow(unit, target) {
    const side = unit.side;
    const damageMultiplier = side === 'ally' ? 1 + weaponLevel * .18 : 1;
    const moraleMultiplier = side === 'ally' && gameTime < moraleUntil ? 1.2 : 1;
    projectiles.push({
      x: unit.x + (side === 'ally' ? 15 : -15),
      y: GROUND - unit.depth - 42 * unit.scale,
      target,
      tx: target.x,
      ty: GROUND - target.depth - 35 * target.scale,
      side,
      damage: unit.damage * damageMultiplier * moraleMultiplier,
      speed: 430,
      life: 2.3,
      dead: false
    });
    addParticle(unit.x + (side === 'ally' ? 17 : -17), GROUND - unit.depth - 42 * unit.scale, side === 'ally' ? '#d7bd82' : '#e78c7e', 2, 27);
  }

  function nearestEnemy(unit, acquireDistance) {
    let chosen = null;
    let best = Infinity;
    for (const other of units) {
      if (other.dead || other.side === unit.side) continue;
      const gap = Math.abs(other.x - unit.x);
      if (gap <= acquireDistance && gap < best) { best = gap; chosen = other; }
    }
    return chosen;
  }

  function attackTarget(unit, target, dt) {
    const spec = UNIT_TYPES[unit.type];
    const gap = Math.abs(target.x - unit.x);
    const effectiveRange = unit.range + (target.type === 'giant' ? 12 : 0);
    if (gap <= effectiveRange) {
      if (unit.attackTimer <= 0) {
        unit.attackTimer = unit.cooldown;
        const morale = unit.side === 'ally' && gameTime < moraleUntil ? 1.2 : 1;
        const weaponBoost = unit.side === 'ally' ? 1 + weaponLevel * .18 : 1;
        const damage = unit.damage * morale * weaponBoost;
        if (spec.ranged) fireArrow(unit, target);
        else {
          damageUnit(target, damage, unit);
          const direction = unit.side === 'ally' ? 1 : -1;
          target.x = clamp(target.x + direction * (unit.type === 'giant' ? 7 : 2), 145, W - 155);
          addParticle((unit.x + target.x) / 2, GROUND - 34, unit.side === 'ally' ? '#d7c287' : '#df8673', 3, 52);
        }
      }
      return true;
    }
    const direction = unit.side === 'ally' ? 1 : -1;
    unit.x += direction * unit.speed * (unit.side === 'ally' && gameTime < moraleUntil ? 1.35 : 1) * dt;
    return false;
  }

  function updateMiner(unit, dt) {
    const threat = nearestEnemy(unit, 58);
    if (threat) {
      attackTarget(unit, threat, dt);
      return;
    }
    const speed = unit.speed * (gameTime < moraleUntil ? 1.2 : 1);
    if (unit.mineState === 'outbound') {
      unit.x = Math.min(MINE_X, unit.x + speed * dt);
      if (unit.x >= MINE_X) { unit.mineState = 'mining'; unit.mineTimer = 2.05; }
    } else if (unit.mineState === 'mining') {
      unit.mineTimer -= dt;
      if (unit.mineTimer <= 0) {
        unit.cargo = Math.round(42 * (1 + mineLevel * .25));
        unit.mineState = 'returning';
        addParticle(MINE_X, GROUND - 20, '#f4c56f', 5, 45);
      }
    } else if (unit.mineState === 'returning') {
      unit.x = Math.max(PLAYER_SPAWN - 4, unit.x - speed * dt);
      if (unit.x <= PLAYER_SPAWN) {
        gold += unit.cargo;
        floatingText(PLAYER_SPAWN + 18, GROUND - 67 - unit.depth, '+' + unit.cargo + ' ◈', '#f6d083');
        unit.cargo = 0;
        unit.mineState = 'outbound';
      }
    }
  }

  function updateUnit(unit, dt) {
    if (unit.dead) return;
    unit.phase += dt * (unit.type === 'giant' ? 3.3 : 5.3);
    unit.attackTimer -= dt;
    unit.hitFlash = Math.max(0, unit.hitFlash - dt);
    if (unit.type === 'miner' && unit.side === 'ally') {
      updateMiner(unit, dt);
      return;
    }

    const side = unit.side;
    const acquire = side === 'ally'
      ? (commandMode === 'attack' ? 390 : 250)
      : 280;
    const target = nearestEnemy(unit, Math.max(acquire, unit.range + 50));
    if (target) {
      attackTarget(unit, target, dt);
      return;
    }

    if (side === 'ally') {
      if (commandMode === 'attack') {
        if (unit.x < ENEMY_BASE_LINE) {
          unit.x = Math.min(ENEMY_BASE_LINE, unit.x + unit.speed * (gameTime < moraleUntil ? 1.35 : 1) * dt);
        } else if (unit.attackTimer <= 0) {
          unit.attackTimer = unit.cooldown;
          const morale = gameTime < moraleUntil ? 1.2 : 1;
          damageBase('enemy', unit.damage * (1 + weaponLevel * .18) * morale, unit);
          addParticle(ENEMY_BASE_LINE + rand(-6, 8), GROUND - 90, '#f4c576', 4, 65);
        }
      } else {
        const desiredLine = Math.max(PLAYER_SPAWN + 42, DEFENSE_LINE - Math.min(unit.formationSlot, 8) * 25);
        const delta = desiredLine - unit.x;
        if (Math.abs(delta) > 12) unit.x += Math.sign(delta) * Math.min(Math.abs(delta), unit.speed * dt);
      }
    } else {
      if (unit.x > PLAYER_BASE_LINE) {
        unit.x = Math.max(PLAYER_BASE_LINE, unit.x - unit.speed * dt);
      } else if (unit.attackTimer <= 0) {
        unit.attackTimer = unit.cooldown;
        damageBase('ally', unit.damage, unit);
        addParticle(PLAYER_BASE_LINE, GROUND - 92, '#e58d78', 4, 60);
      }
    }
  }

  function updateProjectiles(dt) {
    for (const projectile of projectiles) {
      if (projectile.dead) continue;
      projectile.life -= dt;
      if (projectile.life <= 0) { projectile.dead = true; continue; }
      const target = projectile.target;
      if (target && !target.dead) {
        projectile.tx = target.x;
        projectile.ty = GROUND - target.depth - 35 * target.scale;
      } else {
        projectile.target = null;
      }
      let dx = projectile.tx - projectile.x;
      let dy = projectile.ty - projectile.y;
      const distance = Math.hypot(dx, dy) || 1;
      const travel = projectile.speed * dt;
      if (distance <= travel + 10) {
        if (projectile.target && !projectile.target.dead) damageUnit(projectile.target, projectile.damage, {side: projectile.side});
        addParticle(projectile.tx, projectile.ty, projectile.side === 'ally' ? '#f2d391' : '#f39b8e', 4, 55);
        projectile.dead = true;
      } else {
        projectile.x += dx / distance * travel;
        projectile.y += dy / distance * travel;
      }
    }
    projectiles = projectiles.filter(projectile => !projectile.dead);
  }

  function updateEffects(dt) {
    for (const particle of particles) {
      particle.life -= dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 155 * dt;
      particle.vx *= Math.max(0, 1 - dt * 1.7);
    }
    particles = particles.filter(particle => particle.life > 0);
    for (const floater of floaters) { floater.life -= dt; floater.y -= 27 * dt; }
    floaters = floaters.filter(floater => floater.life > 0);
    shake = Math.max(0, shake - dt * 12);
  }

  function update(dt) {
    gameTime += dt;
    if (spawnQueue.length === 0 && gameTime >= nextWaveAt) spawnWave();
    if (spawnQueue.length > 0) {
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnEnemy(spawnQueue.shift());
        spawnTimer = 1.45;
      }
    }

    for (const unit of units) updateUnit(unit, dt);
    updateProjectiles(dt);
    units = units.filter(unit => !unit.dead);
    updateEffects(dt);

    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) ui.toast.classList.remove('visible');
    }
    hudTimer -= dt;
    if (hudTimer <= 0) {
      hudTimer = .16;
      updateHUD();
    }
  }

  function endBattle(victory) {
    if (mode !== 'playing') return;
    mode = victory ? 'won' : 'lost';
    $('endOverlay').hidden = false;
    const panel = document.querySelector('.end-panel');
    panel.classList.toggle('is-defeat', !victory);
    $('endEmblem').textContent = victory ? '✦' : '×';
    $('endEyebrow').textContent = victory ? '战报 / 遗迹已收复' : '战报 / 要塞失守';
    $('endTitle').textContent = victory ? '日落遗迹，重归自由。' : '旗帜倒下了。';
    $('endDescription').textContent = victory
      ? '你守住了家园，也击碎了赤曜军团的统治。边境将记住这场胜利。'
      : '敌军突破防线并摧毁了你的要塞。整补军团，再来一次。';
    $('endKills').textContent = kills;
    $('endTime').textContent = formatTime(gameTime);
    sound(victory ? 'win' : 'lose');
    updateHUD(true);
  }
  function finishGame(victory) { endBattle(victory); }

  function updateHUD(force = false) {
    if (!force && mode === 'menu') return;
    ui.gold.textContent = Math.floor(gold).toLocaleString('zh-CN');
    const pop = population();
    ui.population.innerHTML = pop + ' <small>/ ' + MAX_POP + '</small>';
    ui.populationBar.style.width = Math.min(100, pop / MAX_POP * 100) + '%';
    ui.time.textContent = formatTime(gameTime);
    ui.friendlyBaseText.textContent = Math.ceil(friendlyBase / PLAYER_BASE_MAX * 100) + '%';
    ui.enemyBaseText.textContent = Math.ceil(enemyBase / ENEMY_BASE_MAX * 100) + '%';
    ui.friendlyBaseBar.style.width = clamp(friendlyBase / PLAYER_BASE_MAX * 100, 0, 100) + '%';
    ui.enemyBaseBar.style.width = clamp(enemyBase / ENEMY_BASE_MAX * 100, 0, 100) + '%';

    if (wave === 0) ui.wave.textContent = '首波 ' + Math.ceil(Math.max(0, nextWaveAt - gameTime)) + ' 秒';
    else if (spawnQueue.length > 0) ui.wave.textContent = '第 ' + wave + ' 波 · 来袭';
    else ui.wave.textContent = '第 ' + wave + ' 波 · ' + Math.ceil(Math.max(0, nextWaveAt - gameTime)) + ' 秒';

    ui.commandLabel.textContent = commandMode === 'defend' ? '坚守阵线' : '全军突进';
    ui.command.classList.toggle('is-attack', commandMode === 'attack');
    if (gameTime < hornReadyAt) {
      ui.hornLabel.textContent = gameTime < moraleUntil ? '号角激励中' : '冲锋号角';
      ui.hornCooldown.textContent = Math.ceil(hornReadyAt - gameTime) + 's';
      $('hornBtn').disabled = true;
    } else {
      ui.hornLabel.textContent = '冲锋号角';
      ui.hornCooldown.textContent = '就绪';
      $('hornBtn').disabled = mode !== 'playing';
    }
    ui.friendlyBaseText.style.color = friendlyBase < PLAYER_BASE_MAX * .35 ? '#f28e81' : '';
    ui.enemyBaseText.style.color = enemyBase < ENEMY_BASE_MAX * .35 ? '#f28e81' : '';

    const weaponCosts = [220, 360];
    if (weaponLevel >= weaponCosts.length) {
      ui.weaponUpgradeCost.textContent = '已满级';
      ui.weaponUpgradeText.textContent = '全军攻击力 +' + weaponLevel * 18 + '%';
      ui.weaponUpgrade.disabled = true;
    } else {
      const cost = weaponCosts[weaponLevel];
      ui.weaponUpgradeCost.textContent = '◈ ' + cost;
      ui.weaponUpgradeText.textContent = '伤害 +' + ((weaponLevel + 1) * 18) + '% · ' + (weaponLevel + 1) + '/2';
      ui.weaponUpgrade.disabled = mode !== 'playing' || gold < cost;
    }
    const mineCosts = [180, 300];
    if (mineLevel >= mineCosts.length) {
      ui.mineUpgradeCost.textContent = '已满级';
      ui.mineUpgradeText.textContent = '每次交金 +' + mineLevel * 25 + '%';
      ui.mineUpgrade.disabled = true;
    } else {
      const cost = mineCosts[mineLevel];
      ui.mineUpgradeCost.textContent = '◈ ' + cost;
      ui.mineUpgradeText.textContent = '每次交金 +' + ((mineLevel + 1) * 25) + '% · ' + (mineLevel + 1) + '/2';
      ui.mineUpgrade.disabled = mode !== 'playing' || gold < cost;
    }

    for (const card of ui.recruitList.querySelectorAll('[data-recruit]')) {
      const type = card.dataset.recruit;
      const affordable = gold >= UNIT_TYPES[type].cost;
      card.disabled = mode !== 'playing' || !affordable || pop >= MAX_POP;
      card.classList.toggle('is-short', !affordable && mode === 'playing');
    }

    if (mode === 'playing') {
      ui.statePill.textContent = commandMode === 'attack' ? '军令 · 全军突进' : '军令 · 坚守阵线';
      ui.status.textContent = commandMode === 'attack'
        ? '全军正向赤曜遗迹推进。保护弓手，让前线不要断裂。'
        : '守住防线，扩充军团；准备就绪后切换突进。';
      ui.missionStatus.textContent = '进行中';
      ui.missionStatus.style.color = '';
    } else if (mode === 'paused') {
      ui.statePill.textContent = '战场已暂停';
      ui.status.textContent = '整军暂停中。';
      ui.missionStatus.textContent = '已暂停';
    } else if (mode === 'won') {
      ui.statePill.textContent = '任务完成';
      ui.status.textContent = '赤曜遗迹已被摧毁，任务完成。';
      ui.missionStatus.textContent = '已收复';
      ui.missionStatus.style.color = '#f0c47b';
    } else if (mode === 'lost') {
      ui.statePill.textContent = '要塞失守';
      ui.status.textContent = '要塞失守，重新部署军团再来一次。';
      ui.missionStatus.textContent = '失守';
      ui.missionStatus.style.color = '#f28e81';
    } else {
      ui.statePill.textContent = '等待指挥';
    }
  }

  function drawCloud(x, y, scale) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(255,244,220,.37)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 47, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(-24, 1, 20, 15, 0, 0, Math.PI * 2);
    ctx.ellipse(0, -4, 24, 19, 0, 0, Math.PI * 2);
    ctx.ellipse(25, 2, 21, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  function polygon(points, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.closePath();
    ctx.fill();
  }
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND + 50);
    sky.addColorStop(0, '#839da1');
    sky.addColorStop(.52, '#d0b493');
    sky.addColorStop(1, '#e1b778');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.globalAlpha = .78;
    const sunGlow = ctx.createRadialGradient(895, 116, 15, 895, 116, 116);
    sunGlow.addColorStop(0, 'rgba(255,220,154,.7)');
    sunGlow.addColorStop(1, 'rgba(255,218,152,0)');
    ctx.fillStyle = sunGlow;
    ctx.fillRect(760, 0, 270, 270);
    ctx.beginPath(); ctx.arc(895, 116, 37, 0, Math.PI * 2); ctx.fillStyle = '#f3d19a'; ctx.fill();
    ctx.restore();

    cloudSeeds.forEach(cloud => drawCloud(cloud.x, cloud.y, cloud.scale));
    polygon([[0, 356], [107, 259], [216, 340], [331, 235], [455, 354], [570, 275], [710, 355], [837, 246], [972, 350], [1084, 277], [1280, 354], [1280, 502], [0, 502]], '#71807c');
    polygon([[0, 386], [133, 310], [262, 385], [389, 291], [528, 394], [670, 318], [789, 390], [947, 303], [1087, 392], [1205, 321], [1280, 369], [1280, 510], [0, 510]], '#697768');
    polygon([[0, 422], [153, 365], [290, 424], [435, 355], [584, 438], [735, 365], [905, 425], [1048, 356], [1190, 425], [1280, 390], [1280, 511], [0, 511]], '#7f8468');

    const ground = ctx.createLinearGradient(0, GROUND - 12, 0, H);
    ground.addColorStop(0, '#858261');
    ground.addColorStop(.12, '#67694f');
    ground.addColorStop(.14, '#4b5944');
    ground.addColorStop(.48, '#514f3c');
    ground.addColorStop(1, '#343b34');
    ctx.fillStyle = ground;
    ctx.fillRect(0, GROUND - 12, W, H - GROUND + 12);

    ctx.fillStyle = '#798566';
    ctx.fillRect(0, GROUND - 8, W, 11);
    ctx.fillStyle = 'rgba(227,208,160,.28)';
    ctx.fillRect(0, GROUND + 3, W, 2);

    // Worn road through the middle of the battlefield.
    const road = ctx.createLinearGradient(0, GROUND + 16, 0, H);
    road.addColorStop(0, 'rgba(196,161,112,.22)');
    road.addColorStop(1, 'rgba(203,171,124,.04)');
    ctx.fillStyle = road;
    ctx.fillRect(148, GROUND + 12, W - 296, 76);
    ctx.strokeStyle = 'rgba(232,207,157,.1)';
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 25]);
    ctx.beginPath(); ctx.moveTo(172, GROUND + 36); ctx.lineTo(W - 172, GROUND + 36); ctx.stroke();
    ctx.setLineDash([]);

    for (const detail of scenery) {
      ctx.strokeStyle = detail.color;
      ctx.globalAlpha = .8;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(detail.x, detail.y);
      ctx.lineTo(detail.x + detail.lean, detail.y - detail.h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Distant stone fragments and a few warm wildflowers.
    const rocks = [[240, 527, 11, 6], [507, 558, 18, 7], [692, 536, 12, 6], [985, 554, 17, 8], [1058, 525, 10, 6]];
    for (const [x, y, rx, ry] of rocks) {
      ctx.fillStyle = 'rgba(33,39,36,.32)';
      ctx.beginPath(); ctx.ellipse(x, y, rx, ry, -.08, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(185,167,132,.22)';
      ctx.beginPath(); ctx.ellipse(x - 3, y - 2, rx * .55, ry * .5, -.15, 0, Math.PI * 2); ctx.fill();
    }
    for (const [x, y] of [[402, 521], [773, 544], [919, 526], [588, 517]]) {
      ctx.strokeStyle = 'rgba(35,48,36,.72)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#d9ae75'; ctx.beginPath(); ctx.arc(x, y - 1, 2.2, 0, Math.PI * 2); ctx.fill();
    }
  }

  function drawFlag(x, y, color, direction = 1) {
    ctx.strokeStyle = '#463f35';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 55); ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - 54);
    ctx.lineTo(x + direction * 39, y - 43);
    ctx.lineTo(x, y - 31);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,238,202,.5)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x + 3, y - 52); ctx.lineTo(x + direction * 27, y - 44); ctx.stroke();
  }

  function drawFortress(side) {
    const friendly = side === 'ally';
    const x = friendly ? 26 : W - 145;
    const wall = friendly ? '#677c80' : '#725654';
    const stone = friendly ? '#819195' : '#8a6760';
    const shadow = friendly ? '#455b60' : '#594344';
    const banner = friendly ? '#6ba9b9' : '#d07463';
    const baseHp = friendly ? friendlyBase : enemyBase;
    const maxHp = friendly ? PLAYER_BASE_MAX : ENEMY_BASE_MAX;

    ctx.save();
    // Foundation and keep.
    ctx.fillStyle = 'rgba(27,31,31,.25)';
    ctx.beginPath(); ctx.ellipse(x + 62, GROUND + 2, 77, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = wall;
    ctx.fillRect(x + 13, GROUND - 97, 95, 100);
    ctx.fillStyle = stone;
    ctx.fillRect(x + 3, GROUND - 112, 29, 115);
    ctx.fillRect(x + 91, GROUND - 107, 27, 110);
    ctx.fillRect(x + 34, GROUND - 132, 55, 135);
    ctx.fillStyle = shadow;
    ctx.fillRect(x + 13, GROUND - 15, 95, 18);
    ctx.fillRect(x + 3, GROUND - 112, 29, 9);
    ctx.fillRect(x + 91, GROUND - 107, 27, 9);
    ctx.fillRect(x + 34, GROUND - 132, 55, 10);

    // Battlements.
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = stone;
      ctx.fillRect(x + 4 + i * 10, GROUND - 123, 7, 11);
      ctx.fillRect(x + 92 + i * 9, GROUND - 117, 7, 11);
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = stone;
      ctx.fillRect(x + 36 + i * 14, GROUND - 144, 9, 13);
    }
    ctx.fillStyle = 'rgba(35,39,39,.38)';
    ctx.fillRect(x + 19, GROUND - 77, 11, 19);
    ctx.fillRect(x + 91, GROUND - 75, 10, 18);
    ctx.fillStyle = '#353c3a';
    ctx.beginPath(); ctx.roundRect(x + 52, GROUND - 48, 23, 51, 11, 11); ctx.fill();
    ctx.fillStyle = 'rgba(236,215,164,.44)';
    ctx.beginPath(); ctx.arc(x + 64, GROUND - 104, 11, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 64, GROUND - 104, 5, 0, Math.PI * 2); ctx.fillStyle = banner; ctx.fill();

    // Stone lines.
    ctx.strokeStyle = 'rgba(35,42,42,.2)'; ctx.lineWidth = 1.5;
    for (let row = 0; row < 4; row++) {
      const y = GROUND - 90 + row * 21;
      ctx.beginPath(); ctx.moveTo(x + 15, y); ctx.lineTo(x + 105, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x + 48, GROUND - 119 + row * 24); ctx.lineTo(x + 79, GROUND - 119 + row * 24); ctx.stroke();
    }
    drawFlag(x + 62, GROUND - 142, banner, friendly ? 1 : -1);

    // Base nameplate and health status.
    ctx.fillStyle = 'rgba(22,29,32,.62)';
    ctx.beginPath(); ctx.roundRect(x + 9, GROUND + 12, 107, 21, 7); ctx.fill();
    ctx.font = '700 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = friendly ? '#d7e5df' : '#f0d3c8';
    ctx.fillText(friendly ? '青岚要塞' : '赤曜遗迹', x + 62, GROUND + 22);

    const barX = x + 17;
    const barY = GROUND - 158;
    ctx.fillStyle = 'rgba(19,26,30,.68)';
    ctx.beginPath(); ctx.roundRect(barX, barY, 90, 7, 4); ctx.fill();
    ctx.fillStyle = friendly ? '#68c2c5' : '#e77768';
    ctx.beginPath(); ctx.roundRect(barX, barY, 90 * clamp(baseHp / maxHp, 0, 1), 7, 4); ctx.fill();
    ctx.restore();
  }

  function drawMine() {
    const x = MINE_X;
    ctx.save();
    ctx.fillStyle = 'rgba(26,32,30,.34)';
    ctx.beginPath(); ctx.ellipse(x, GROUND + 4, 54, 11, 0, 0, Math.PI * 2); ctx.fill();
    const rocks = [
      [-34, -4, 22, 19, '#67675b'], [-16, -17, 23, 25, '#77786a'],
      [8, -8, 25, 18, '#605f54'], [29, -2, 19, 15, '#777467'],
      [1, -29, 18, 19, '#77766a']
    ];
    for (const [dx, dy, rx, ry, color] of rocks) {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(x + dx, GROUND + dy, rx, ry, dx * .012, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(29,35,34,.33)'; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.fillStyle = '#d8b168';
    ctx.beginPath(); ctx.moveTo(x - 12, GROUND - 34); ctx.lineTo(x - 7, GROUND - 52); ctx.lineTo(x + 1, GROUND - 37); ctx.lineTo(x + 8, GROUND - 58); ctx.lineTo(x + 15, GROUND - 33); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,236,181,.65)';
    ctx.beginPath(); ctx.moveTo(x - 7, GROUND - 49); ctx.lineTo(x - 3, GROUND - 41); ctx.lineTo(x + 1, GROUND - 51); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(35,39,35,.66)';
    ctx.beginPath(); ctx.roundRect(x - 37, GROUND + 15, 74, 17, 6); ctx.fill();
    ctx.font = '700 8px system-ui, sans-serif'; ctx.fillStyle = '#e0c993'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('金脉矿点', x, GROUND + 23);
    ctx.restore();
  }

  function drawBattleLine() {
    ctx.save();
    const x = DEFENSE_LINE;
    ctx.strokeStyle = 'rgba(255,223,157,.63)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([5, 7]);
    ctx.beginPath(); ctx.moveTo(x, GROUND - 113); ctx.lineTo(x, GROUND + 8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(45,46,39,.63)';
    ctx.beginPath(); ctx.roundRect(x - 34, GROUND - 132, 68, 17, 5); ctx.fill();
    ctx.font = '700 8px system-ui, sans-serif'; ctx.fillStyle = '#f1d6a3'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(commandMode === 'attack' ? '推进军令' : '坚守阵线', x, GROUND - 124);
    ctx.restore();
  }

  function drawUnit(unit) {
    const spec = UNIT_TYPES[unit.type];
    const x = unit.x;
    const floor = GROUND - unit.depth;
    const bob = Math.sin(unit.phase) * (unit.type === 'giant' ? 1.2 : 2.1);
    const facing = unit.side === 'ally' ? 1 : -1;
    const allied = unit.side === 'ally';
    const armor = allied ? '#77a8c9' : '#c27366';
    const cloth = allied ? '#d3bd8d' : '#a98a77';
    const dark = '#272d2d';
    const selected = selectedUnitId === unit.id;

    ctx.save();
    ctx.fillStyle = 'rgba(22,27,26,.27)';
    ctx.beginPath(); ctx.ellipse(x, floor + 3, 18 * unit.scale, 5 * unit.scale, 0, 0, Math.PI * 2); ctx.fill();
    if (selected) {
      ctx.strokeStyle = 'rgba(255,225,161,.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, floor + 3, 24 * unit.scale, 8 * unit.scale, 0, 0, Math.PI * 2); ctx.stroke();
    }

    ctx.translate(x, floor + bob);
    ctx.scale(facing * unit.scale, unit.scale);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Back leg and arm.
    const stride = Math.sin(unit.phase) * (unit.type === 'giant' ? 3 : 5);
    ctx.strokeStyle = dark; ctx.lineWidth = unit.type === 'giant' ? 6 : 4;
    ctx.beginPath();
    ctx.moveTo(-3, -22); ctx.lineTo(-5 + stride, -10); ctx.lineTo(-10 + stride, -1);
    ctx.moveTo(2, -22); ctx.lineTo(5 - stride, -11); ctx.lineTo(10 - stride, -1);
    ctx.stroke();

    // Head and torso.
    ctx.fillStyle = allied ? '#e3c89d' : '#d5ad91';
    ctx.beginPath(); ctx.arc(0, -52, unit.type === 'giant' ? 12 : 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.strokeStyle = dark; ctx.lineWidth = unit.type === 'giant' ? 8 : 6;
    ctx.beginPath(); ctx.moveTo(0, -42); ctx.lineTo(0, -23); ctx.stroke();
    ctx.strokeStyle = armor; ctx.lineWidth = unit.type === 'giant' ? 7 : 5.5;
    ctx.beginPath(); ctx.moveTo(-4, -39); ctx.lineTo(4, -28); ctx.stroke();

    // Headband/helmet and face mark.
    ctx.fillStyle = allied ? '#5d8da9' : '#a8534c';
    ctx.beginPath(); ctx.arc(0, -54, unit.type === 'giant' ? 12 : 9, Math.PI, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(3, -52); ctx.lineTo(6, -52); ctx.stroke();

    // Front arm and weapon silhouette.
    ctx.strokeStyle = dark; ctx.lineWidth = unit.type === 'giant' ? 5.5 : 4;
    ctx.beginPath(); ctx.moveTo(1, -38); ctx.lineTo(8, -31); ctx.lineTo(14, -38); ctx.stroke();
    ctx.strokeStyle = cloth; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-4, -37); ctx.lineTo(-7, -28); ctx.stroke();

    if (unit.type === 'sword') {
      ctx.strokeStyle = '#373b39'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(14, -37); ctx.lineTo(20, -48); ctx.stroke();
      ctx.strokeStyle = '#d9d6c8'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(20, -48); ctx.lineTo(33, -68); ctx.stroke();
      ctx.strokeStyle = '#b08c58'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(17, -45); ctx.lineTo(25, -41); ctx.stroke();
    } else if (unit.type === 'archer') {
      ctx.strokeStyle = '#72573d'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(16, -36); ctx.quadraticCurveTo(33, -51, 18, -66); ctx.stroke();
      ctx.strokeStyle = 'rgba(237,218,184,.86)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(18, -66); ctx.lineTo(18, -36); ctx.stroke();
      ctx.strokeStyle = '#423c35'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(13, -50); ctx.lineTo(33, -50); ctx.lineTo(29, -53); ctx.moveTo(33, -50); ctx.lineTo(29, -47); ctx.stroke();
    } else if (unit.type === 'spear') {
      ctx.strokeStyle = '#735b3e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(14, -35); ctx.lineTo(30, -69); ctx.stroke();
      ctx.fillStyle = '#d5d1c4';
      ctx.beginPath(); ctx.moveTo(29, -70); ctx.lineTo(36, -81); ctx.lineTo(34, -66); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = armor; ctx.beginPath(); ctx.ellipse(0, -31, 8, 8, -.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 1.4; ctx.stroke();
    } else if (unit.type === 'giant') {
      ctx.strokeStyle = dark; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(13, -39); ctx.lineTo(22, -48); ctx.stroke();
      ctx.strokeStyle = '#5e4539'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(22, -48); ctx.lineTo(31, -65); ctx.stroke();
      ctx.fillStyle = '#907254'; ctx.beginPath(); ctx.roundRect(25, -76, 15, 14, 3); ctx.fill();
      ctx.strokeStyle = '#443c33'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = armor; ctx.beginPath(); ctx.moveTo(-9, -43); ctx.lineTo(8, -43); ctx.lineTo(12, -24); ctx.lineTo(-10, -24); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.stroke();
    } else if (unit.type === 'miner') {
      ctx.strokeStyle = '#72593c'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(14, -36); ctx.lineTo(24, -51); ctx.stroke();
      ctx.strokeStyle = '#d8d2c4'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(20, -54); ctx.lineTo(31, -49); ctx.stroke();
      ctx.fillStyle = '#c39753'; ctx.beginPath(); ctx.moveTo(-7, -40); ctx.lineTo(6, -40); ctx.lineTo(10, -23); ctx.lineTo(-8, -23); ctx.closePath(); ctx.fill();
      if (unit.cargo > 0) {
        ctx.fillStyle = '#edc36f'; ctx.beginPath(); ctx.arc(-8, -52, 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    // A small shoulder guard gives the two armies a readable silhouette.
    if (unit.type !== 'miner' && unit.type !== 'archer') {
      ctx.fillStyle = allied ? '#93b8c9' : '#d18b78';
      ctx.beginPath(); ctx.arc(-4, -39, unit.type === 'giant' ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.restore();

    // Health ribbon.
    const barW = unit.type === 'giant' ? 46 : 31;
    const barY = floor - 77 * unit.scale;
    ctx.fillStyle = 'rgba(25,30,29,.74)';
    ctx.beginPath(); ctx.roundRect(x - barW / 2, barY, barW, 4, 2); ctx.fill();
    ctx.fillStyle = unit.side === 'ally' ? '#88d1c6' : '#ed8b79';
    ctx.beginPath(); ctx.roundRect(x - barW / 2, barY, barW * clamp(unit.hp / unit.maxHp, 0, 1), 4, 2); ctx.fill();
    if (unit.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,247,230,' + (unit.hitFlash / .13 * .5) + ')';
      ctx.beginPath(); ctx.arc(x, floor - 48 * unit.scale, 20 * unit.scale, 0, Math.PI * 2); ctx.fill();
    }
    if (unit.type === 'miner' && unit.side === 'ally' && unit.mineState === 'mining') {
      ctx.fillStyle = 'rgba(40,39,32,.55)'; ctx.beginPath(); ctx.roundRect(x - 17, floor - 95, 34, 14, 5); ctx.fill();
      ctx.font = '700 8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#f2d28c'; ctx.fillText('采矿中', x, floor - 88);
    }
  }

  function drawProjectile(projectile) {
    const targetX = projectile.target && !projectile.target.dead ? projectile.target.x : projectile.tx;
    const targetY = projectile.target && !projectile.target.dead ? GROUND - projectile.target.depth - 35 * projectile.target.scale : projectile.ty;
    const angle = Math.atan2(targetY - projectile.y, targetX - projectile.x);
    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(angle);
    ctx.strokeStyle = projectile.side === 'ally' ? '#483f34' : '#70433e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(8, 0); ctx.stroke();
    ctx.fillStyle = projectile.side === 'ally' ? '#e9cf91' : '#e38a78';
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(3, -3); ctx.lineTo(3, 3); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawEffects() {
    for (const particle of particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const floater of floaters) {
      ctx.globalAlpha = clamp(floater.life / floater.maxLife, 0, 1);
      ctx.font = '800 11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(29,32,31,.68)';
      ctx.strokeText(floater.text, floater.x, floater.y);
      ctx.fillStyle = floater.color; ctx.fillText(floater.text, floater.x, floater.y);
    }
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.save();
    if (shake > .1) ctx.translate(rand(-shake, shake), rand(-shake * .55, shake * .55));
    drawBackground();
    drawMine();
    drawFortress('ally');
    drawFortress('enemy');
    drawBattleLine();

    // A drifting banner above the field makes the current tactic visible even at a glance.
    if (gameTime < moraleUntil && mode === 'playing') {
      ctx.save();
      ctx.globalAlpha = .75 + Math.sin(visualTime * 10) * .16;
      ctx.fillStyle = 'rgba(40,34,51,.72)'; ctx.beginPath(); ctx.roundRect(W / 2 - 90, 31, 180, 27, 9); ctx.fill();
      ctx.font = '800 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e7c8ff'; ctx.fillText('✧ 号角激励 · 全军奋战 ✧', W / 2, 44);
      ctx.restore();
    }

    const sortedUnits = units.slice().sort((a, b) => a.depth - b.depth || a.x - b.x);
    for (const unit of sortedUnits) drawUnit(unit);
    for (const projectile of projectiles) drawProjectile(projectile);
    drawEffects();

    // Subtle start-of-battle countdown over the sky.
    if (mode === 'playing' && wave === 0 && gameTime < 8) {
      ctx.save(); ctx.globalAlpha = clamp((8 - gameTime) / 5, 0, .68);
      ctx.fillStyle = 'rgba(31,39,40,.64)'; ctx.beginPath(); ctx.roundRect(W / 2 - 105, 23, 210, 25, 8); ctx.fill();
      ctx.font = '700 9px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f4e5c4'; ctx.fillText('矿工已出发 · 整军待命', W / 2, 35.5); ctx.restore();
    }
    ctx.restore();
  }

  function renderRecruitList() {
    ui.recruitList.innerHTML = '';
    UNIT_ORDER.forEach((type, index) => {
      const spec = UNIT_TYPES[type];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'recruit-card';
      button.dataset.recruit = type;
      button.title = spec.description + '（快捷键 ' + UNIT_KEYS[index] + '）';
      button.innerHTML = '<span class="unit-token" data-kind="' + type + '">' + spec.icon + '</span>' +
        '<span class="unit-copy"><strong>' + spec.name + '</strong><small>' + spec.description + '</small></span>' +
        '<span class="unit-price">◈ ' + spec.cost + '<small>键 ' + UNIT_KEYS[index] + '</small></span>';
      button.addEventListener('click', () => recruit(type));
      ui.recruitList.appendChild(button);
    });
  }

  function animationFrame(timestamp) {
    requestAnimationFrame(animationFrame);
    const rawDt = Math.min(.05, Math.max(0, (timestamp - (lastFrame || timestamp)) / 1000));
    lastFrame = timestamp;
    visualTime += rawDt;
    if (mode === 'playing') update(rawDt * timeScale);
    render();
  }

  // Click a soldier to inspect it; the battlefield remains a readable, non-blocking play space.
  canvas.addEventListener('click', event => {
    if (mode !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * W / rect.width;
    const y = (event.clientY - rect.top) * H / rect.height;
    let found = null;
    let best = Infinity;
    for (const unit of units) {
      if (unit.dead || unit.side !== 'ally') continue;
      const dx = unit.x - x;
      const dy = (GROUND - unit.depth - 38 * unit.scale) - y;
      const distance = dx * dx + dy * dy;
      if (distance < 1900 && distance < best) { best = distance; found = unit; }
    }
    selectedUnitId = found ? found.id : null;
    if (found) {
      const spec = UNIT_TYPES[found.type];
      showToast(spec.name + ' · 生命 ' + Math.ceil(found.hp) + '/' + Math.ceil(found.maxHp) + (found.type === 'miner' ? ' · ' + (found.mineState === 'mining' ? '正在采矿' : '往返矿点') : ''), 2.1);
    }
  });

  $('playBtn').addEventListener('click', startGame);
  $('briefingPlayBtn').addEventListener('click', startGame);
  $('helpBtn').addEventListener('click', () => { $('welcomeOverlay').hidden = true; $('helpOverlay').hidden = false; });
  $('briefingBackBtn').addEventListener('click', () => { $('helpOverlay').hidden = true; $('welcomeOverlay').hidden = false; });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => { $(button.dataset.close).hidden = true; }));
  $('commandBtn').addEventListener('click', toggleCommand);
  $('hornBtn').addEventListener('click', useHorn);
  $('speedBtn').addEventListener('click', toggleSpeed);
  $('pauseBtn').addEventListener('click', togglePause);
  $('resumeBtn').addEventListener('click', togglePause);
  $('restartBtn').addEventListener('click', startGame);
  $('pauseRestartBtn').addEventListener('click', startGame);
  $('endRestartBtn').addEventListener('click', startGame);
  $('weaponUpgradeBtn').addEventListener('click', upgradeWeapon);
  $('mineUpgradeBtn').addEventListener('click', upgradeMine);
  $('soundBtn').addEventListener('click', () => {
    soundOn = !soundOn;
    $('soundBtn').textContent = soundOn ? '🔊' : '🔇';
    $('soundBtn').setAttribute('aria-label', soundOn ? '关闭音效' : '开启音效');
    if (soundOn) sound('recruit');
  });
  $('homeBtn').addEventListener('click', () => {
    mode = 'menu';
    hideOverlays();
    $('welcomeOverlay').hidden = false;
    updateHUD(true);
  });
  $('endHomeBtn').addEventListener('click', () => {
    mode = 'menu';
    hideOverlays();
    $('welcomeOverlay').hidden = false;
    updateHUD(true);
  });

  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    if (mode === 'playing') {
      const index = UNIT_KEYS.indexOf(event.key);
      if (index >= 0) { recruit(UNIT_ORDER[index]); return; }
      if (key === 'a') { toggleCommand(); return; }
      if (key === 'h') { useHorn(); return; }
      if (key === 'f') { toggleSpeed(); return; }
      if (key === 'p' || event.code === 'Space' || key === 'escape') {
        if (event.code === 'Space') event.preventDefault();
        togglePause();
      }
    } else if (mode === 'paused' && (key === 'p' || event.code === 'Space' || key === 'escape')) {
      if (event.code === 'Space') event.preventDefault();
      togglePause();
    } else if (mode === 'menu' && key === 'enter') {
      startGame();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && mode === 'playing') togglePause();
  });

  renderRecruitList();
  // Seed two miners in the background behind the opening screen.
  units.push(makeUnit('miner', 'ally', PLAYER_SPAWN));
  units.push(makeUnit('miner', 'ally', PLAYER_SPAWN + 28));
  updateHUD(true);
  requestAnimationFrame(animationFrame);
})();
