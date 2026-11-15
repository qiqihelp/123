/*
 * 小球对战 —— 页面逻辑：主循环、上方的名字/血条、下方的设置、选角色。
 */
(function () {
  'use strict';

  const Sim = window.BallSim;
  const Render = window.BallRender;
  const CFG = Sim.CFG;

  const STORAGE_KEY = 'ball-battle:v1';
  const INTRO_TIME = 1.1;       // 开局“准备 → 开始！”的时长
  const RESULT_DELAY = 0.9;     // 分出胜负后，等爆炸放完再弹结果

  const $ = function (id) { return document.getElementById(id); };
  const canvas = $('arena');
  const ctx = canvas.getContext('2d');
  const appEl = document.querySelector('.app');
  const hudEl = $('hud');
  const resultEl = $('result');
  const selectEl = $('select');
  const selectForm = $('select-form');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---------------------------------------------------------------------
  // 设置（记在 localStorage 里，下次打开还在）
  // ---------------------------------------------------------------------

  const saved = loadSaved();
  const settings = {
    floats: saved.floats !== false,
    hpBars: saved.hpBars !== false,
    hp: clampNum(saved.hp, 10, 5000, Sim.DEFAULTS.maxHp),         // 自定义血量
    arena: clampNum(saved.arena, 400, 3000, Sim.DEFAULTS.arena),  // 自定义地图尺寸
  };

  function clampNum(value, lo, hi, fallback) {
    const n = Math.round(Number(value));
    if (!isFinite(n) || n <= 0) return fallback;
    return Math.max(lo, Math.min(hi, n));
  }
  const picks = {
    left: Sim.CHARACTERS[saved.left] ? saved.left : 'electric',
    right: Sim.CHARACTERS[saved.right] ? saved.right : 'laser',
  };

  function loadSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (err) {
      return {};
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        floats: settings.floats, hpBars: settings.hpBars, left: picks.left, right: picks.right,
        hp: settings.hp, arena: settings.arena,
      }));
    } catch (err) {
      /* 隐私模式下存不了就算了 */
    }
  }

  // ---------------------------------------------------------------------
  // 对局状态
  // ---------------------------------------------------------------------

  let match = null;
  let fx = Render.createFx();
  let intro = 0;          // 开局倒计时剩余
  let overTimer = 0;      // 结束后过了多久
  let resultShown = false;
  let hasStarted = false; // 玩家是否已经点过“开始对战”
  let accumulator = 0;
  let lastFrame = 0;

  function startMatch() {
    match = Sim.createMatch({ left: picks.left, right: picks.right, hp: settings.hp, arena: settings.arena });
    selected = null;
    renderInspect();
    camReset();
    [0, 1].forEach(function (i) {
      const btn = $('cam-' + i);
      btn.textContent = '看' + match.balls[i].name.charAt(0);
      btn.title = '镜头跟着' + sideName(i);
      btn.style.setProperty('--c', Render.themeFor(match, i).main);
    });
    fx = Render.createFx();
    intro = INTRO_TIME;
    overTimer = 0;
    resultShown = false;
    accumulator = 0;
    resultEl.hidden = true;
    setupHud();
    updateHud();
  }

  function isSelecting() {
    return !selectEl.hidden;
  }

  // ---------------------------------------------------------------------
  // 上方：名字 / 血条 / 技能状态
  // ---------------------------------------------------------------------

  const hud = [0, 1].map(function (i) {
    const root = $('fighter-' + i);
    const refs = { root: root, cache: {} };
    root.querySelectorAll('[data-el]').forEach(function (el) {
      refs[el.dataset.el] = el;
    });
    refs.ability = root.querySelector('.ability');
    return refs;
  });

  // 每个角色在上方显示的技能状态。
  const ABILITY_HUD = {
    electric: function (ball) {
      const chain = ball.chain;
      if (chain.state === 'ready') return { label: '闪电链', value: '就绪', ratio: 1, tone: 'ready' };
      if (chain.state === 'discharging') {
        return { label: '闪电链', value: '放电中', ratio: chain.timer / CFG.electric.paralyze, tone: 'ready' };
      }
      return {
        label: '闪电链',
        value: '冷却 ' + chain.timer.toFixed(1) + 's',
        ratio: 1 - chain.timer / CFG.electric.cooldown,
        tone: '',
      };
    },
    laser: function (ball) {
      const max = CFG.laser.chargeMax;
      const full = ball.charge >= max;
      return {
        label: '充能',
        value: full ? '已充满 · 4 个装置' : Math.floor(ball.charge) + ' / ' + max,
        ratio: ball.charge / max,
        tone: full ? 'ready' : '',
      };
    },
    flame: function (ball) {
      const F = CFG.flame;
      const ult = ball.ult;
      if (ult.phase === 'windup') {
        return { label: '烈焰冲拳', value: '蓄力 ' + ult.timer.toFixed(1) + 's', ratio: 1 - ult.timer / F.ultWindup, tone: 'ready' };
      }
      if (ult.phase === 'dash') return { label: '烈焰冲拳', value: '冲！', ratio: 1, tone: 'ready' };
      return { label: '怒气', value: Math.floor(ult.energy) + ' / ' + F.ultEnergy, ratio: ult.energy / F.ultEnergy, tone: '' };
    },
    spore: function (ball) {
      const S = CFG.spore;
      let n = 0;
      for (let i = 0; i < match.mushrooms.length; i++) if (match.mushrooms[i].owner === ball.id) n++;
      return { label: '蘑菇 ' + n, value: '孢子 ' + Math.max(0, ball.sporeTimer).toFixed(1) + 's', ratio: 1 - ball.sporeTimer / S.interval, tone: n >= S.maxMushrooms ? 'ready' : '' };
    },
    tech: function (ball) {
      const names = CFG.tech.resourceNames;
      const g = ball.grid;
      const label = Object.keys(ball.res).map(function (k) {
        return (k === 'fuel' ? '浓铀' : names[k]) + ball.res[k];
      }).join(' ');
      if (g.tripped) return { label: label, value: '⚠ 电力不足·停工', ratio: g.ratio / 2, tone: '' };
      const pct = Math.round(Math.min(9.99, g.ratio) * 100);
      const bonus = g.bonus > 0 ? '（+' + Math.round(g.bonus * 100) + '%）' : '';
      return { label: label, value: '供电 ' + pct + '%' + bonus, ratio: g.ratio / 2, tone: g.bonus > 0 ? 'ready' : '' };
    },
  };

  /** 只在值真的变了的时候才碰 DOM。 */
  function put(refs, key, value, apply) {
    if (refs.cache[key] === value) return;
    refs.cache[key] = value;
    apply(value);
  }

  function setupHud() {
    match.balls.forEach(function (ball, i) {
      const refs = hud[i];
      refs.cache = {};
      refs.name.textContent = ball.name;
      refs.root.style.setProperty('--c', Render.themeFor(match, i).main);
      refs.hpBar.setAttribute('aria-valuemax', ball.maxHp);
      // 重开时血条直接回满，不要播放残影动画。
      refs.hpGhost.style.transition = 'none';
      refs.hpGhost.style.setProperty('--v', 1);
      void refs.hpGhost.offsetWidth;
      refs.hpGhost.style.transition = '';
    });
  }

  function updateHud() {
    if (!match) return;
    match.balls.forEach(function (ball, i) {
      const refs = hud[i];
      const hp = Math.ceil(ball.hp);
      put(refs, 'hp', hp, function (v) {
        const ratio = v / ball.maxHp;
        refs.hpNum.textContent = v;
        refs.hpBar.setAttribute('aria-valuenow', v);
        refs.hpBar.dataset.level = ratio <= 0.25 ? 'low' : ratio <= 0.5 ? 'mid' : 'ok';
        refs.hpFill.style.setProperty('--v', ratio);
        refs.hpGhost.style.setProperty('--v', ratio);
      });

      const status = ABILITY_HUD[ball.type](ball);
      put(refs, 'label', status.label, function (v) { refs.abilityLabel.textContent = v; });
      put(refs, 'value', status.value, function (v) { refs.abilityValue.textContent = v; });
      put(refs, 'tone', status.tone, function (v) { refs.ability.dataset.tone = v; });
      put(refs, 'ratio', Math.round(Math.max(0, Math.min(1, status.ratio)) * 200) / 200, function (v) {
        refs.abilityFill.style.setProperty('--v', v);
      });
    });
  }

  // ---------------------------------------------------------------------
  // 结果
  // ---------------------------------------------------------------------

  function sideName(i) {
    const mirror = match.balls[0].type === match.balls[1].type;
    return (mirror ? (i === 0 ? '左方' : '右方') : '') + match.balls[i].name;
  }

  function showResult() {
    resultShown = true;
    const seconds = Math.round(match.time);
    if (match.winner === -1) {
      $('result-title').textContent = '同归于尽';
      $('result-sub').textContent = '用时 ' + seconds + ' 秒';
      resultEl.style.removeProperty('--c');
    } else {
      const winner = match.balls[match.winner];
      $('result-title').textContent = sideName(match.winner) + ' 获胜！';
      $('result-sub').textContent = '用时 ' + seconds + ' 秒 · 剩余 ' + Math.ceil(winner.hp) + ' 血';
      resultEl.style.setProperty('--c', Render.themeFor(match, match.winner).main);
    }
    resultEl.hidden = false;
  }

  // ---------------------------------------------------------------------
  // 选角色
  // ---------------------------------------------------------------------

  function buildPicker() {
    selectForm.querySelectorAll('.picker__side').forEach(function (side) {
      const name = 'pick-' + side.dataset.side;
      const box = side.querySelector('[data-el="options"]');
      Sim.CHARACTER_IDS.forEach(function (id) {
        const def = Sim.CHARACTERS[id];
        const label = document.createElement('label');
        label.className = 'pick';

        const input = document.createElement('input');
        input.type = 'radio';
        input.name = name;
        input.value = id;

        const card = document.createElement('span');
        card.className = 'pick__card';
        card.style.setProperty('--c', Render.THEMES[id][0].main);

        const ball = document.createElement('span');
        ball.className = 'pick__ball';
        ball.setAttribute('aria-hidden', 'true');

        const title = document.createElement('span');
        title.className = 'pick__name';
        title.textContent = def.name;

        const details = document.createElement('ul');
        details.className = 'pick__details';
        def.details.forEach(function (line) {
          const li = document.createElement('li');
          li.textContent = line;
          details.appendChild(li);
        });

        card.append(ball, title, details);
        label.append(input, card);
        box.appendChild(label);
      });
    });
  }

  function openSelect() {
    ['left', 'right'].forEach(function (side) {
      selectForm.querySelectorAll('input[name="pick-' + side + '"]').forEach(function (input) {
        input.checked = input.value === picks[side];
      });
    });
    $('opt-maxhp').value = settings.hp;
    $('opt-arena').value = settings.arena;
    // 已经有一局在打时，可以不改角色直接回去接着看。
    $('select-cancel').hidden = !hasStarted || match.over;
    selectEl.hidden = false;
    appEl.inert = true; // 弹窗打开时，后面的按钮不接收焦点
    $('select-start').focus();
  }

  function closeSelect() {
    selectEl.hidden = true;
    appEl.inert = false;
    lastFrame = 0; // 暂停期间的时间不算进对局
  }

  selectForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const data = new FormData(selectForm);
    picks.left = data.get('pick-left') || picks.left;
    picks.right = data.get('pick-right') || picks.right;
    settings.hp = clampNum($('opt-maxhp').value, 10, 5000, Sim.DEFAULTS.maxHp);
    settings.arena = clampNum($('opt-arena').value, 400, 3000, Sim.DEFAULTS.arena);
    save();
    hasStarted = true;
    closeSelect();
    startMatch();
  });

  $('select-cancel').addEventListener('click', closeSelect);

  // ---------------------------------------------------------------------
  // 下方：设置
  // ---------------------------------------------------------------------

  const optFloats = $('opt-floats');
  const optHp = $('opt-hp');

  function applySettings() {
    optFloats.checked = settings.floats;
    optHp.checked = settings.hpBars;
    hudEl.classList.toggle('hud--no-hp', !settings.hpBars);
    if (!settings.floats) fx.floats.length = 0;
  }

  optFloats.addEventListener('change', function () {
    settings.floats = optFloats.checked;
    applySettings();
    save();
  });

  optHp.addEventListener('change', function () {
    settings.hpBars = optHp.checked;
    applySettings();
    save();
  });

  $('btn-restart').addEventListener('click', startMatch);
  $('btn-reselect').addEventListener('click', openSelect);
  $('result-again').addEventListener('click', startMatch);
  $('result-reselect').addEventListener('click', openSelect);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && isSelecting() && !$('select-cancel').hidden) closeSelect();
  });

  // ---------------------------------------------------------------------
  // 摄像机：拖动平移、滚轮 / 按钮缩放、归正、跟着某个球
  // ---------------------------------------------------------------------

  const cam = { x: CFG.arena / 2, y: CFG.arena / 2, view: CFG.arena + Render.FRAME * 2, follow: null };

  function fullView() {
    return CFG.arena + Render.FRAME * 2;
  }

  function camClamp() {
    cam.view = Math.max(Math.min(240, fullView()), Math.min(fullView(), cam.view));
    const half = cam.view / 2;
    const lo = -Render.FRAME + half;
    const hi = CFG.arena + Render.FRAME - half;
    cam.x = lo >= hi ? CFG.arena / 2 : Math.max(lo, Math.min(hi, cam.x));
    cam.y = lo >= hi ? CFG.arena / 2 : Math.max(lo, Math.min(hi, cam.y));
  }

  function camUi() {
    $('cam-0').setAttribute('aria-pressed', cam.follow === 0);
    $('cam-1').setAttribute('aria-pressed', cam.follow === 1);
    const full = cam.view >= fullView() - 0.5;
    $('cam-reset').disabled = full && cam.follow == null;
    $('cam-out').disabled = full;
    $('cam-in').disabled = cam.view <= 240.5;
    canvas.classList.toggle('is-pannable', !full);
  }

  /** 归正：回到能看见整张地图的视角。 */
  function camReset() {
    cam.follow = null;
    cam.view = fullView();
    cam.x = cam.y = CFG.arena / 2;
    camUi();
  }

  function camZoom(factor, anchor) {
    const before = cam.view;
    cam.view *= factor;
    camClamp();
    if (anchor) {
      // 以鼠标所在的位置为中心缩放。
      const k = cam.view / before;
      cam.x = anchor.x + (cam.x - anchor.x) * k;
      cam.y = anchor.y + (cam.y - anchor.y) * k;
      camClamp();
    }
    camUi();
  }

  function camFollow(i) {
    cam.follow = cam.follow === i ? null : i;
    // 正看着全图时，顺便拉近一点，不然等于没动。
    if (cam.follow != null && cam.view >= fullView() - 0.5) cam.view = Math.min(600, fullView() * 0.75);
    camClamp();
    camUi();
  }

  function toWorld(event) {
    const rect = canvas.getBoundingClientRect();
    const k = cam.view / rect.width;
    return {
      x: cam.x - cam.view / 2 + (event.clientX - rect.left) * k,
      y: cam.y - cam.view / 2 + (event.clientY - rect.top) * k,
      k: k,
    };
  }

  let drag = null;
  canvas.addEventListener('pointerdown', function (event) {
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
    if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    drag.x = event.clientX;
    drag.y = event.clientY;
    if (cam.view >= fullView() - 0.5) return; // 全图时没什么可拖的
    const k = cam.view / canvas.getBoundingClientRect().width;
    cam.follow = null;
    cam.x -= dx * k;
    cam.y -= dy * k;
    camClamp();
    camUi();
  });
  canvas.addEventListener('pointerup', function (event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved) pick(event);
    drag = null;
  });
  canvas.addEventListener('pointercancel', function () { drag = null; });
  canvas.addEventListener('wheel', function (event) {
    event.preventDefault();
    cam.follow = null;
    camZoom(event.deltaY > 0 ? 1.15 : 1 / 1.15, toWorld(event));
  }, { passive: false });

  $('cam-reset').addEventListener('click', camReset);
  $('cam-0').addEventListener('click', function () { camFollow(0); });
  $('cam-1').addEventListener('click', function () { camFollow(1); });
  $('cam-in').addEventListener('click', function () { camZoom(1 / 1.3); });
  $('cam-out').addEventListener('click', function () { camZoom(1.3); });

  // ---------------------------------------------------------------------
  // 点设备 / 矿物看详情
  // ---------------------------------------------------------------------

  let selected = null;
  let inspectCache = '';
  const inspectEl = $('inspect');

  const STATUS_TEXT = {
    building: '施工中',
    working: '运转中',
    lowpower: '电压不足，降速运转',
    nopower: '停工：电力不足',
    nofuel: '停工：缺燃料',
    idle: '待机',
  };
  const ORE_USE = {
    iron: '几乎所有设备的骨架',
    copper: '发电机、炮塔、线圈这些电气设备',
    silicon: '太阳能板、蓄电池、护盾、离心机',
    coal: '火力发电厂的燃料',
    uranium: '送进离心机提纯成浓缩铀，供核反应堆和核弹使用',
  };
  const DRONE_TEXT = { idle: '待命', go: '赶路中', mine: '采矿中', 'return': '运矿回去', work: '维修中' };

  function pick(event) {
    if (!match) return;
    const p = toWorld(event);
    const tol = 14 * p.k;
    let best = null;
    let bestD = Infinity;
    match.buildings.forEach(function (b) {
      const d = Math.hypot(b.x - p.x, b.y - p.y) - b.r;
      if (d <= tol && d < bestD) { bestD = d; best = b; }
    });
    match.ores.forEach(function (o) {
      const d = Math.hypot(o.x - p.x, o.y - p.y) - CFG.tech.oreRadius;
      if (d <= tol && d < bestD) { bestD = d; best = o; }
    });
    selected = best;
    renderInspect();
  }

  function round1(v) {
    return Math.round(v * 10) / 10;
  }

  function resText(res, skipZero) {
    const names = CFG.tech.resourceNames;
    const parts = [];
    Object.keys(res).forEach(function (k) {
      if (skipZero && !res[k]) return;
      parts.push(names[k] + ' ' + res[k]);
    });
    return parts.join(' · ') || '无';
  }

  function inspectInfo(obj) {
    const T = CFG.tech;
    if (obj.amount != null) {
      // 矿物
      if (match.ores.indexOf(obj) < 0) return null;
      return {
        title: T.ores[obj.type].name, color: Render.ORE_COLORS[obj.type], status: '还没被采走', tone: '',
        rows: [['储量', obj.amount + ' 份'], ['用途', ORE_USE[obj.type]]], desc: '',
      };
    }
    if (obj.dead) return null;
    const b = obj;
    const spec = T.buildings[b.kind];
    const ball = match.balls[b.owner];
    const g = ball.grid;
    const res = ball.res;
    const rate = g.eff * (1 + g.bonus);
    const rows = [];
    let status = STATUS_TEXT[b.status] || b.status;
    if (b.status === 'building') status += ' ' + Math.round((1 - b.build / T.buildTime) * 100) + '%';
    if (b.status === 'lowpower') status += '（' + Math.round(g.eff * 100) + '%）';
    if (b.status === 'nofuel') status += b.kind === 'coal' ? '（煤）' : '（浓缩铀）';
    const tone = b.status === 'working' ? 'ok' : (b.status === 'nopower' || b.status === 'nofuel') ? 'bad' : 'warn';

    rows.push(['所属', sideName(b.owner)]);
    rows.push(['血量', Math.ceil(b.hp) + ' / ' + b.maxHp]);
    if (spec.supply) rows.push(['发电', round1(b.out) + ' / ' + spec.supply + ' kW']);
    if (spec.demand) rows.push(['耗电', spec.demand + ' kW（实际拿到 ' + round1(spec.demand * g.eff) + '）']);
    if (b.kind !== 'core' && b.active) {
      const f = round1(b.flow);
      rows.push(['线路', f > 0 ? '向核心回送 ' + f + ' kW' : f < 0 ? '从电网取电 ' + (-f) + ' kW' : '没有电流']);
    }

    switch (b.kind) {
      case 'core':
        rows.push(['库存', resText(res)]);
        rows.push(['汇入电力', round1(b.flow) + ' kW']);
        break;
      case 'coal':
        rows.push(['燃料', '这份煤还能烧 ' + Math.max(0, b.fuelTime).toFixed(1) + ' 秒 · 库存煤 ' + res.coal]);
        break;
      case 'plant':
        rows.push(['燃料', '这份浓缩铀还能烧 ' + Math.max(0, b.fuelTime).toFixed(1) + ' 秒 · 库存 ' + res.fuel]);
        break;
      case 'battery':
        rows.push(['电量', round1(b.stored) + ' / ' + T.batteryCapacity + ' kW·秒']);
        rows.push(['充放电', b.out > 0.05 ? '放电 ' + round1(b.out) + ' kW' : b.out < -0.05 ? '充电 ' + round1(-b.out) + ' kW' : '无']);
        break;
      case 'turret':
      case 'tesla': {
        const tesla = b.kind === 'tesla';
        const base = tesla ? T.teslaDamage : T.turretDamage;
        const every = tesla ? T.teslaEvery : T.turretEvery;
        rows.push(['伤害', round1(base * (1 + g.bonus)) + (g.bonus > 0 ? '（基础 ' + base + '）' : '')]);
        rows.push(['攻击间隔', rate > 0 ? (every / rate).toFixed(2) + ' 秒' + (rate !== 1 ? '（基础 ' + every + '）' : '') : '停火']);
        rows.push(['射程', String(tesla ? T.teslaRange : T.turretRange)]);
        break;
      }
      case 'silo':
        rows.push(['充能', Math.floor((b.charge / T.nukeTime) * 100) + '%（满电需 ' + T.nukeTime + ' 秒）']);
        rows.push(['浓缩铀库存', res.fuel + '（每枚核弹用 1）']);
        rows.push(['核弹', '伤害 ' + T.nukeDamage + ' · 半径 ' + T.nukeRadius]);
        break;
      case 'centrifuge':
        rows.push(['进度', b.progress > 0 ? Math.floor((b.progress / T.centrifugeTime) * 100) + '%' : '等铀矿']);
        rows.push(['库存', '铀矿 ' + res.uranium + ' · 浓缩铀 ' + res.fuel]);
        break;
      case 'conveyor':
        rows.push(['带上的矿', b.items.length + ' 份']);
        break;
      case 'miner':
      case 'repair': {
        let drone = null;
        match.drones.forEach(function (d) { if (d.home === b) drone = d; });
        rows.push(['机器人', drone ? (g.eff > 0 ? DRONE_TEXT[drone.state] : '没电趴窝') : '还没出动']);
        break;
      }
      case 'shield':
        rows.push(['护盾', round1(ball.shield) + ' / ' + T.shieldMax]);
        rows.push(['回充', round1(T.shieldRegen * rate) + ' / 秒']);
        break;
      default:
        break;
    }
    rows.push(['电网', '发电 ' + g.supply + ' / 耗电 ' + g.demand + ' kW · 供电率 ' +
      Math.round(Math.min(9.99, g.ratio) * 100) + '%' + (g.tripped ? ' · 已跳闸' : g.bonus > 0 ? ' · 加成 +' + Math.round(g.bonus * 100) + '%' : '')]);
    rows.push(['造价', resText(spec.cost, true)]);
    return { title: spec.name, color: Render.themeFor(match, b.owner).main, status: status, tone: tone, rows: rows, desc: spec.desc };
  }

  function renderInspect() {
    const info = selected && match ? inspectInfo(selected) : null;
    if (!info) {
      selected = null;
      if (!inspectEl.hidden) inspectEl.hidden = true;
      inspectCache = '';
      return;
    }
    const key = JSON.stringify(info);
    if (key === inspectCache) return;
    inspectCache = key;
    inspectEl.hidden = false;
    inspectEl.style.setProperty('--c', info.color);
    $('inspect-title').textContent = info.title;
    const statusEl = $('inspect-status');
    statusEl.textContent = info.status;
    statusEl.dataset.tone = info.tone;
    const rowsEl = $('inspect-rows');
    rowsEl.textContent = '';
    info.rows.forEach(function (row) {
      const dt = document.createElement('dt');
      dt.textContent = row[0];
      const dd = document.createElement('dd');
      dd.textContent = row[1];
      rowsEl.append(dt, dd);
    });
    $('inspect-desc').textContent = info.desc;
  }

  $('inspect-close').addEventListener('click', function () {
    selected = null;
    renderInspect();
  });

  // ---------------------------------------------------------------------
  // 画布尺寸
  // ---------------------------------------------------------------------

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = Math.max(1, Math.round(canvas.clientWidth * dpr));
    if (canvas.width !== size || canvas.height !== size) {
      canvas.width = size;
      canvas.height = size;
    }
  }

  if ('ResizeObserver' in window) new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener('resize', resizeCanvas);

  // ---------------------------------------------------------------------
  // 主循环
  // ---------------------------------------------------------------------

  function frame(now) {
    requestAnimationFrame(frame);
    // 切到后台再回来时 dt 会很大，夹住它，免得一口气模拟好几秒。
    const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
    lastFrame = now;

    let banner = '';
    if (match && !isSelecting()) {
      if (intro > 0) {
        intro -= dt;
        banner = intro > INTRO_TIME * 0.4 ? '准备' : '开始！';
      } else if (!match.over) {
        accumulator += dt;
        while (accumulator >= CFG.step && !match.over) {
          Sim.step(match, CFG.step);
          Render.handleEvents(fx, match, match.events, settings);
          match.events.length = 0;
          accumulator -= CFG.step;
        }
      } else if (!resultShown) {
        overTimer += dt;
        if (overTimer >= RESULT_DELAY) showResult();
      }
      Render.updateFx(fx, match, dt);
      updateHud();
      renderInspect();
    }
    if (match && cam.follow != null) {
      const who = match.balls[cam.follow];
      cam.x = who.x;
      cam.y = who.y;
      camClamp();
    }

    Render.draw(ctx, canvas.width, match, fx, {
      floats: settings.floats,
      banner: banner,
      reducedMotion: reducedMotion.matches,
      camera: cam,
      selected: selected,
    });
  }

  buildPicker();
  applySettings();
  resizeCanvas();
  startMatch();   // 先把双方摆上场，选完角色再真正开打
  openSelect();
  requestAnimationFrame(frame);
})();
