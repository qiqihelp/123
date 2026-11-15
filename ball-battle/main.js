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
  };
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
    match = Sim.createMatch({ left: picks.left, right: picks.right });
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
        value: full ? '已充满 · 双发' : Math.floor(ball.charge) + ' / ' + max,
        ratio: ball.charge / max,
        tone: full ? 'ready' : '',
      };
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
    }

    Render.draw(ctx, canvas.width, match, fx, {
      floats: settings.floats,
      banner: banner,
      reducedMotion: reducedMotion.matches,
    });
  }

  buildPicker();
  applySettings();
  resizeCanvas();
  startMatch();   // 先把双方摆上场，选完角色再真正开打
  openSelect();
  requestAnimationFrame(frame);
})();
