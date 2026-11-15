/*
 * 小球对战 —— 对战模拟（纯逻辑，不依赖 DOM / canvas）。
 *
 * 浏览器里挂在 window.BallSim 上，Node 里可以直接 require，
 * 所以规则可以脱离画面跑测试（见 tests/sim.test.js）。
 *
 * 新增角色：在 CHARACTERS 里加一项（init / update），
 * 再到 render.js 的 DRAW 表里补上对应的画法即可。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BallSim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CFG = {
    arena: 600,        // 正方形场地边长（逻辑单位）
    ballR: 28,
    speed: 230,        // 小球恒定速率（单位/秒）
    maxHp: 100,
    step: 1 / 120,     // 固定模拟步长

    electric: {
      reach: 86,       // 闪电链半径（从球心算起）
      paralyze: 3,     // 麻痹时长（秒），期间每秒跳一次伤害
      tickDamage: 3,
      tickEvery: 1,
      cooldown: 8,
    },

    laser: {
      interval: 3.4,   // 每隔多久丢一次装置
      arm: 0.7,        // 装置落地后预警多久才发射
      fire: 0.4,       // 十字激光持续时间
      width: 20,
      damage: 4,       // 每个装置的十字激光最多命中一次
      chargeMax: 20,
      chargeRate: 1,   // 每秒自然充能
      chargeOnHit: 2,  // 每个装置命中额外充能
      burstCount: 4,   // 充能满时一次丢出几个装置
      throwTime: 0.3,  // 丢出的装置飞多久落地
      throwMin: 130,   // 丢出的距离范围
      throwMax: 170,
      margin: 30,      // 装置离方框的最小距离
    },
  };

  // ---------------------------------------------------------------------
  // 小工具
  // ---------------------------------------------------------------------

  /** 可复现的随机数（mulberry32）。 */
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  /** 把速度拉回恒定速率，并避免几乎贴着坐标轴来回弹。 */
  function normalizeVelocity(ball) {
    let len = Math.hypot(ball.vx, ball.vy);
    if (len < 1e-6) {
      ball.vx = CFG.speed;
      ball.vy = 0;
      len = CFG.speed;
    }
    let nx = ball.vx / len;
    let ny = ball.vy / len;
    const MIN = 0.22;
    if (Math.abs(nx) < MIN) {
      nx = (nx < 0 ? -1 : 1) * MIN;
      ny = (ny < 0 ? -1 : 1) * Math.sqrt(1 - MIN * MIN);
    } else if (Math.abs(ny) < MIN) {
      ny = (ny < 0 ? -1 : 1) * MIN;
      nx = (nx < 0 ? -1 : 1) * Math.sqrt(1 - MIN * MIN);
    }
    ball.vx = nx * CFG.speed;
    ball.vy = ny * CFG.speed;
  }

  function rotateVelocity(ball, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const vx = ball.vx * c - ball.vy * s;
    const vy = ball.vx * s + ball.vy * c;
    ball.vx = vx;
    ball.vy = vy;
  }

  function damage(state, target, amount, kind, sourceId) {
    if (state.over || target.hp <= 0) return;
    target.hp = Math.max(0, target.hp - amount);
    state.events.push({
      type: 'damage', target: target.id, source: sourceId,
      amount: amount, kind: kind, x: target.x, y: target.y,
    });
  }

  // ---------------------------------------------------------------------
  // 角色
  // ---------------------------------------------------------------------

  const CHARACTERS = {
    /*
     * 电击球：周身环绕闪电链。敌人进入闪电链范围 → 麻痹 3 秒，
     * 期间每秒 -3；麻痹结束后闪电链冷却 8 秒。
     */
    electric: {
      id: 'electric',
      name: '电击球',
      summary: '闪电链麻痹靠近的敌人',
      details: [
        '敌人靠近闪电链：麻痹 3 秒',
        '麻痹期间每秒 -3 血',
        '之后闪电链冷却 8 秒',
      ],
      init: function (ball) {
        ball.chain = { state: 'ready', timer: 0 };
      },
      update: function (state, ball, enemy, dt) {
        const chain = ball.chain;
        if (chain.state === 'cooldown') {
          chain.timer -= dt;
          if (chain.timer <= 0) {
            chain.state = 'ready';
            chain.timer = 0;
            state.events.push({ type: 'chainReady', ball: ball.id });
          }
        }
        // 'discharging' 由受害者身上的电击结束时切到冷却（见 updateShock）。
      },
      // 是否在这一步电到敌人。两边同时判定后再统一结算，镜像对局才公平。
      wantsToShock: function (ball, enemy) {
        if (ball.chain.state !== 'ready' || ball.paralyzed) return false;
        if (enemy.hp <= 0 || enemy.paralyzed) return false;
        const d = Math.hypot(enemy.x - ball.x, enemy.y - ball.y);
        return d <= CFG.electric.reach + enemy.r;
      },
    },

    /*
     * 激光球：每隔一段时间在脚下丢一个激光发射装置，装置随后发射十字激光。
     * 充能条随时间增长、命中也会增长；满 20 时下一次改为向四周丢出 4 个装置，
     * 并清空充能。
     */
    laser: {
      id: 'laser',
      name: '激光球',
      summary: '丢下激光发射装置，发射十字激光',
      details: [
        '定时丢下装置，发射十字激光',
        '充能随时间和命中增加',
        '充能满 20：一次丢出 4 个装置',
      ],
      init: function (ball, rng) {
        ball.charge = 0;
        // 首发时间错开一点，两个激光球才不会永远同时开火。
        ball.fireTimer = CFG.laser.interval * (0.5 + rng() * 0.5);
      },
      update: function (state, ball, enemy, dt) {
        if (ball.paralyzed) return; // 麻痹时无法充能、无法丢装置（已丢出的照常发射）
        const L = CFG.laser;
        ball.charge = Math.min(L.chargeMax, ball.charge + L.chargeRate * dt);
        ball.fireTimer -= dt;
        if (ball.fireTimer > 0) return;
        ball.fireTimer += L.interval;

        if (ball.charge >= L.chargeMax) {
          ball.charge = 0;
          // 四个装置围成一个歪着的方阵（转 12°~24°，随机朝左或朝右歪），
          // 这样它们各占一行一列，八道激光不会挤在同一条线上。
          const tilt = (12 + state.rng() * 12) * Math.PI / 180;
          const base = state.rng() < 0.5 ? tilt : Math.PI / 2 - tilt;
          // 贴着方框时把落点整体往场内挪，免得几个装置被挤到同一条线上。
          const inset = L.margin + L.throwMax * 0.95;
          const cx = clamp(ball.x, inset, CFG.arena - inset);
          const cy = clamp(ball.y, inset, CFG.arena - inset);
          for (let i = 0; i < L.burstCount; i++) {
            const angle = base + (i / L.burstCount) * Math.PI * 2;
            const dist = L.throwMin + state.rng() * (L.throwMax - L.throwMin);
            spawnDevice(state, ball, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, true);
          }
          state.events.push({ type: 'deploy', ball: ball.id, count: L.burstCount, burst: true });
        } else {
          spawnDevice(state, ball, ball.x, ball.y, false);
          state.events.push({ type: 'deploy', ball: ball.id, count: 1, burst: false });
        }
      },
    },
  };

  const CHARACTER_IDS = Object.keys(CHARACTERS);

  // ---------------------------------------------------------------------
  // 激光发射装置
  // ---------------------------------------------------------------------

  function spawnDevice(state, owner, x, y, thrown) {
    const L = CFG.laser;
    state.devices.push({
      id: state.nextDeviceId++,
      owner: owner.id,
      // 落点（夹在方框内）；被丢出的装置先从 fromX/fromY 飞过来。
      x: clamp(x, L.margin, CFG.arena - L.margin),
      y: clamp(y, L.margin, CFG.arena - L.margin),
      fromX: owner.x,
      fromY: owner.y,
      phase: thrown ? 'fly' : 'arm',   // 'fly' 飞行 → 'arm' 预警 → 'fire' 发射十字激光
      timer: thrown ? L.throwTime : L.arm,
      hit: false,
      burst: thrown,
    });
  }

  function updateDevices(state, dt) {
    const L = CFG.laser;
    for (let i = state.devices.length - 1; i >= 0; i--) {
      const device = state.devices[i];
      const owner = state.balls[device.owner];
      const enemy = state.balls[1 - device.owner];
      device.timer -= dt;

      if (device.phase === 'fly') {
        if (device.timer > 0) continue;
        device.phase = 'arm';
        device.timer += L.arm;
        state.events.push({ type: 'deviceLand', device: device.id, owner: device.owner, x: device.x, y: device.y });
      }
      if (device.phase === 'arm') {
        if (device.timer > 0) continue;
        device.phase = 'fire';
        device.timer += L.fire;
        state.events.push({ type: 'deviceFire', device: device.id, owner: device.owner, x: device.x, y: device.y });
      }

      // 十字激光：横竖两道都穿过装置，敌人碰到任意一道就算命中（每个装置只算一次）。
      if (!device.hit && enemy.hp > 0) {
        const reach = L.width / 2 + enemy.r;
        if (Math.abs(enemy.x - device.x) <= reach || Math.abs(enemy.y - device.y) <= reach) {
          device.hit = true;
          damage(state, enemy, L.damage, 'laser', owner.id);
          owner.charge = Math.min(L.chargeMax, owner.charge + L.chargeOnHit);
          state.events.push({
            type: 'deviceHit', device: device.id, owner: owner.id, target: enemy.id,
            x: enemy.x, y: enemy.y,
          });
        }
      }

      if (device.timer <= 0) state.devices.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------------
  // 电击 / 麻痹
  // ---------------------------------------------------------------------

  function applyShock(state, source, target) {
    const E = CFG.electric;
    target.paralyzed = true;
    target.shock = {
      source: source.id,
      ticksLeft: Math.round(E.paralyze / E.tickEvery),
      timer: E.tickEvery,
    };
    source.chain.state = 'discharging';
    source.chain.timer = E.paralyze;
    state.events.push({
      type: 'shock', source: source.id, target: target.id, x: target.x, y: target.y,
    });
  }

  function updateShock(state, ball, dt) {
    const shock = ball.shock;
    if (!shock) return;
    const source = state.balls[shock.source];
    if (source.chain.state === 'discharging') {
      source.chain.timer = Math.max(0, source.chain.timer - dt);
    }
    shock.timer -= dt;
    if (shock.timer > 1e-9) return;

    shock.timer += CFG.electric.tickEvery;
    shock.ticksLeft -= 1;
    damage(state, ball, CFG.electric.tickDamage, 'shock', source.id);

    if (shock.ticksLeft <= 0) {
      // 麻痹与扣血同时结束，闪电链进入冷却。
      ball.shock = null;
      ball.paralyzed = false;
      source.chain.state = 'cooldown';
      source.chain.timer = CFG.electric.cooldown;
      state.events.push({ type: 'shockEnd', source: source.id, target: ball.id });
    }
  }

  // ---------------------------------------------------------------------
  // 运动与碰撞
  // ---------------------------------------------------------------------

  function moveBall(state, ball, dt) {
    if (ball.paralyzed) return;
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    const lo = ball.r;
    const hi = CFG.arena - ball.r;
    let bounced = false;
    if (ball.x < lo) { ball.x = lo + (lo - ball.x); ball.vx = Math.abs(ball.vx); bounced = true; }
    else if (ball.x > hi) { ball.x = hi - (ball.x - hi); ball.vx = -Math.abs(ball.vx); bounced = true; }
    if (ball.y < lo) { ball.y = lo + (lo - ball.y); ball.vy = Math.abs(ball.vy); bounced = true; }
    else if (ball.y > hi) { ball.y = hi - (ball.y - hi); ball.vy = -Math.abs(ball.vy); bounced = true; }

    if (bounced) {
      // 每次撞墙加一点随机偏角，轨迹才不会陷入死循环。
      const signX = ball.vx < 0 ? -1 : 1;
      const signY = ball.vy < 0 ? -1 : 1;
      rotateVelocity(ball, (state.rng() - 0.5) * 0.5);
      ball.vx = signX * Math.abs(ball.vx);
      ball.vy = signY * Math.abs(ball.vy);
      normalizeVelocity(ball);
      state.events.push({ type: 'wall', ball: ball.id, x: ball.x, y: ball.y });
    }
  }

  function collideBalls(state) {
    const a = state.balls[0];
    const b = state.balls[1];
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let dist = Math.hypot(dx, dy);
    const minDist = a.r + b.r;
    if (dist >= minDist) return;
    if (dist < 1e-6) { dx = 1; dy = 0; dist = 1; }
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = minDist - dist;

    const aFixed = a.paralyzed;
    const bFixed = b.paralyzed;
    if (aFixed && bFixed) return;

    if (aFixed || bFixed) {
      // 麻痹的球钉在原地，另一个球从它身上弹开。
      const mover = aFixed ? b : a;
      const sign = aFixed ? 1 : -1;
      mover.x = clamp(mover.x + nx * overlap * sign, mover.r, CFG.arena - mover.r);
      mover.y = clamp(mover.y + ny * overlap * sign, mover.r, CFG.arena - mover.r);
      const vn = mover.vx * nx * sign + mover.vy * ny * sign;
      if (vn < 0) {
        mover.vx -= 2 * vn * nx * sign;
        mover.vy -= 2 * vn * ny * sign;
      }
      normalizeVelocity(mover);
    } else {
      a.x = clamp(a.x - nx * overlap / 2, a.r, CFG.arena - a.r);
      a.y = clamp(a.y - ny * overlap / 2, a.r, CFG.arena - a.r);
      b.x = clamp(b.x + nx * overlap / 2, b.r, CFG.arena - b.r);
      b.y = clamp(b.y + ny * overlap / 2, b.r, CFG.arena - b.r);
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel < 0) {
        // 等质量弹性碰撞：交换法向分量。
        a.vx += rel * nx; a.vy += rel * ny;
        b.vx -= rel * nx; b.vy -= rel * ny;
      }
      normalizeVelocity(a);
      normalizeVelocity(b);
    }
    state.events.push({
      type: 'bump', x: a.x + nx * a.r, y: a.y + ny * a.r,
    });
  }

  // ---------------------------------------------------------------------
  // 对局
  // ---------------------------------------------------------------------

  /**
   * @param {{left?: string, right?: string, seed?: number}} opts
   */
  function createMatch(opts) {
    opts = opts || {};
    const seed = opts.seed == null ? (Date.now() ^ (Math.random() * 0x7fffffff)) >>> 0 : opts.seed;
    const rng = makeRng(seed);
    const types = [opts.left || 'electric', opts.right || 'laser'];
    const state = {
      seed: seed,
      rng: rng,
      time: 0,
      balls: [],
      devices: [],
      nextDeviceId: 1,
      events: [],
      over: false,
      winner: null, // 0 | 1 | -1（同归于尽）
    };

    types.forEach(function (type, i) {
      const def = CHARACTERS[type];
      if (!def) throw new Error('未知角色：' + type);
      // 开局朝向对手一侧的斜向出发。
      const angle = (0.2 + rng() * 0.6) * (rng() < 0.5 ? -1 : 1);
      const dir = i === 0 ? 1 : -1;
      const ball = {
        id: i,
        type: type,
        name: def.name,
        r: CFG.ballR,
        x: CFG.arena * (i === 0 ? 0.24 : 0.76),
        y: CFG.arena * (0.3 + rng() * 0.4),
        vx: Math.cos(angle) * CFG.speed * dir,
        vy: Math.sin(angle) * CFG.speed,
        hp: CFG.maxHp,
        maxHp: CFG.maxHp,
        paralyzed: false,
        shock: null,
      };
      def.init(ball, rng);
      normalizeVelocity(ball);
      state.balls.push(ball);
    });
    return state;
  }

  /** 推进一个固定步长。 */
  function step(state, dt) {
    if (state.over) return;
    dt = dt == null ? CFG.step : dt;
    state.time += dt;
    const a = state.balls[0];
    const b = state.balls[1];

    moveBall(state, a, dt);
    moveBall(state, b, dt);
    collideBalls(state);

    updateShock(state, a, dt);
    updateShock(state, b, dt);

    // 电击：先各自判定，再统一结算。
    const aShocks = a.type === 'electric' && CHARACTERS.electric.wantsToShock(a, b);
    const bShocks = b.type === 'electric' && CHARACTERS.electric.wantsToShock(b, a);
    if (aShocks && bShocks) {
      // 两个电击球同时电到对方：随机一方抢先，否则镜像对局永远同归于尽。
      if (state.rng() < 0.5) applyShock(state, a, b);
      else applyShock(state, b, a);
    } else if (aShocks) {
      applyShock(state, a, b);
    } else if (bShocks) {
      applyShock(state, b, a);
    }

    CHARACTERS[a.type].update(state, a, b, dt);
    CHARACTERS[b.type].update(state, b, a, dt);
    updateDevices(state, dt);

    if (a.hp <= 0 || b.hp <= 0) {
      state.over = true;
      state.winner = a.hp <= 0 && b.hp <= 0 ? -1 : a.hp <= 0 ? 1 : 0;
      state.devices.length = 0;
      state.balls.forEach(function (ball) {
        if (ball.hp <= 0) state.events.push({ type: 'death', ball: ball.id, x: ball.x, y: ball.y });
      });
      state.events.push({ type: 'over', winner: state.winner });
    }
  }

  /** 推进任意时长（内部仍按固定步长走），返回实际走了多少步。 */
  function advance(state, seconds) {
    const steps = Math.round(seconds / CFG.step);
    let done = 0;
    for (; done < steps && !state.over; done++) step(state, CFG.step);
    return done;
  }

  return {
    CFG: CFG,
    CHARACTERS: CHARACTERS,
    CHARACTER_IDS: CHARACTER_IDS,
    createMatch: createMatch,
    step: step,
    advance: advance,
    makeRng: makeRng,
  };
});
