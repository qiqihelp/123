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
    maxHp: 50,         // 电击每轮 9 点、激光每道 7 点，一局大约一分多钟
    step: 1 / 120,     // 固定模拟步长

    electric: {
      reach: 86,       // 闪电链半径（从球心算起）
      paralyze: 3,     // 麻痹时长（秒），期间每秒跳一次伤害
      tickDamage: 3,
      tickEvery: 1,
      cooldown: 8,
    },

    laser: {
      interval: 2,     // 两次发射之间的间隔
      warn: 0.55,      // 预警线持续时间
      fire: 0.4,       // 激光持续时间
      width: 20,
      damage: 7,
      chargeMax: 20,
      chargeRate: 1,   // 每秒自然充能
      chargeOnHit: 3,  // 每道激光命中额外充能
      doubleGap: 64,   // 双发同向激光时，两道激光到球心的距离
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
     * 激光球：每隔一段时间发射一道横向或纵向激光。
     * 充能条随时间增长、命中也会增长；满 20 时下一次改为双发
     * （两纵 / 两横 / 一纵一横），并清空充能。
     */
    laser: {
      id: 'laser',
      name: '激光球',
      summary: '定时发射横向 / 纵向激光',
      details: [
        '定时发射横向或纵向激光',
        '充能随时间和命中增加',
        '充能满 20：一次两道激光',
      ],
      init: function (ball, rng) {
        ball.charge = 0;
        // 首发时间错开一点，两个激光球才不会永远同时开火。
        ball.fireTimer = CFG.laser.interval * (0.5 + rng() * 0.5);
        ball.volleys = 0;
      },
      update: function (state, ball, enemy, dt) {
        if (ball.paralyzed) return; // 麻痹时无法充能、无法发射
        const L = CFG.laser;
        ball.charge = Math.min(L.chargeMax, ball.charge + L.chargeRate * dt);
        ball.fireTimer -= dt;
        if (ball.fireTimer > 0) return;
        ball.fireTimer += L.interval;
        ball.volleys += 1;

        if (ball.charge >= L.chargeMax) {
          ball.charge = 0;
          const pattern = ['VV', 'HH', 'VH'][Math.floor(state.rng() * 3)];
          if (pattern === 'VH') {
            spawnBeam(state, ball, 'v', 0, true);
            spawnBeam(state, ball, 'h', 0, true);
          } else {
            const orient = pattern === 'VV' ? 'v' : 'h';
            spawnBeam(state, ball, orient, -L.doubleGap, true);
            spawnBeam(state, ball, orient, L.doubleGap, true);
          }
          state.events.push({ type: 'volley', ball: ball.id, pattern: pattern, double: true });
        } else {
          const orient = state.rng() < 0.5 ? 'v' : 'h';
          spawnBeam(state, ball, orient, 0, false);
          state.events.push({
            type: 'volley', ball: ball.id, pattern: orient.toUpperCase(), double: false,
          });
        }
      },
    },
  };

  const CHARACTER_IDS = Object.keys(CHARACTERS);

  // ---------------------------------------------------------------------
  // 激光
  // ---------------------------------------------------------------------

  function spawnBeam(state, owner, orient, offset, fromDouble) {
    state.beams.push({
      id: state.nextBeamId++,
      owner: owner.id,
      orient: orient,          // 'v' 纵向（一条竖线）| 'h' 横向
      offset: offset,          // 相对球心的偏移；激光始终跟着发射者移动
      phase: 'warn',           // 'warn' 预警 → 'fire' 发射
      timer: CFG.laser.warn,
      pos: beamPos(owner, orient, offset),
      hit: false,
      double: fromDouble,
    });
  }

  function beamPos(owner, orient, offset) {
    const half = CFG.laser.width / 2;
    const centre = (orient === 'v' ? owner.x : owner.y) + offset;
    return clamp(centre, half, CFG.arena - half);
  }

  function updateBeams(state, dt) {
    const L = CFG.laser;
    for (let i = state.beams.length - 1; i >= 0; i--) {
      const beam = state.beams[i];
      const owner = state.balls[beam.owner];
      const enemy = state.balls[1 - beam.owner];
      beam.pos = beamPos(owner, beam.orient, beam.offset);
      beam.timer -= dt;

      if (beam.phase === 'warn') {
        if (beam.timer > 0) continue;
        beam.phase = 'fire';
        beam.timer += L.fire;
        state.events.push({ type: 'beamFire', beam: beam.id, owner: beam.owner });
      }

      if (!beam.hit && enemy.hp > 0) {
        const enemyAxis = beam.orient === 'v' ? enemy.x : enemy.y;
        if (Math.abs(enemyAxis - beam.pos) <= L.width / 2 + enemy.r) {
          beam.hit = true;
          damage(state, enemy, L.damage, 'laser', owner.id);
          owner.charge = Math.min(L.chargeMax, owner.charge + L.chargeOnHit);
          state.events.push({
            type: 'beamHit', beam: beam.id, owner: owner.id, target: enemy.id,
            x: enemy.x, y: enemy.y, orient: beam.orient,
          });
        }
      }

      if (beam.timer <= 0) state.beams.splice(i, 1);
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
      beams: [],
      nextBeamId: 1,
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
    updateBeams(state, dt);

    if (a.hp <= 0 || b.hp <= 0) {
      state.over = true;
      state.winner = a.hp <= 0 && b.hp <= 0 ? -1 : a.hp <= 0 ? 1 : 0;
      state.beams.length = 0;
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
