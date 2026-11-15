/*
 * 小球对战 —— 对战模拟（纯逻辑，不依赖 DOM / canvas）。
 *
 * 浏览器里挂在 window.BallSim 上，Node 里可以直接 require，
 * 所以规则可以脱离画面跑测试（见 tests/sim.test.js）。
 *
 * 新增角色：在 CHARACTERS 里加一项（init / update，可选 onCollide），
 * 再到 render.js 的 DRAW 表和 main.js 的 ABILITY_HUD 里补上对应的画法即可。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BallSim = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const CFG = {
    arena: 600,        // 正方形场地边长（逻辑单位）
    ballR: 28,
    speed: 230,        // 小球平时的速率（单位/秒）
    maxHp: 100,
    step: 1 / 120,     // 固定模拟步长

    electric: {
      reach: 86,       // 闪电链半径（从球心算起）
      paralyze: 3,     // 麻痹时长（秒），期间每秒跳一次伤害
      tickDamage: 3,
      tickEvery: 1,
      cooldown: 8,
      zapEvery: 0.1,   // 闪电链就绪时，每隔多久电掉一个靠近的孢子 / 蘑菇
      // 落雷：每隔一段时间预判敌人的位置劈一道雷。
      thunderEvery: 4.5,
      thunderDelay: 0.6,   // 从出现落点到雷劈下来
      thunderRadius: 55,
      thunderDamage: 4,
      thunderScatter: 80,  // 落点的随机偏差
      thunderChain: 120,   // 落雷清理孢子 / 蘑菇的范围
    },

    laser: {
      interval: 2,     // 每隔多久丢一次装置
      arm: 0.7,        // 装置落地后预警多久才发射
      fire: 0.4,       // 十字激光持续时间
      width: 20,
      damage: 6,       // 每个装置的十字激光最多命中一次
      chargeMax: 20,
      chargeRate: 1,   // 每秒自然充能
      chargeOnHit: 2,  // 每个装置命中额外充能
      burstCount: 4,   // 充能满时一次丢出几个装置
      throwTime: 0.3,  // 丢出的装置飞多久落地
      throwMin: 130,   // 丢出的距离范围
      throwMax: 170,
      margin: 30,      // 装置离方框的最小距离
    },

    flame: {
      hitDamage: 5,      // 撞一下
      waveDamage: 2,     // 爆炸波
      waveRadius: 95,    // 爆炸波还会清掉这个范围内的孢子 / 蘑菇
      burnTime: 3,       // 灼烧秒数
      knock: 2,          // 击飞：额外速度倍率（会很快衰减）
      hitCooldown: 0.8,  // 两次撞击伤害之间的最短间隔
      turnRate: 0.1,     // 追着敌人拐弯的角速度（弧度/秒）
      // 大招：烈焰冲拳
      ultEnergy: 20,     // 攒满需要的秒数
      ultWindup: 3,      // 蓄力
      dashSpeed: 950,
      dashMax: 1.5,      // 冲刺最长持续时间（撞不到墙也会停）
      ultDamage: 15,
      ultBurnTime: 5,
      ultWaveRadius: 150,
      ultKnock: 3.2,
    },

    burn: {
      tickDamage: 1,
      tickEvery: 1,
    },

    spore: {
      interval: 5,        // 每隔多久放一次孢子
      count: 5,
      sporeDamage: 1,
      sporeRadius: 6,
      sporeSpeed: 130,    // 孢子初速（会逐渐停下来）
      sporeDrag: 1.3,
      sproutTime: 3,      // 没打中的孢子多久后变成蘑菇幼年体
      growTime: 2,        // 幼年体 → 完全体
      matureTime: 5,      // 完全体多久后分裂成孢子
      burstCount: 10,
      mushroomDamage: 2,
      mushroomHp: 2,
      youngRadius: 9,
      matureRadius: 14,
      maxMushrooms: 16,   // 场上同一方最多这么多蘑菇 / 孢子，多出来的孢子直接枯萎
      maxSpores: 120,
    },

    boostDecay: 3,        // 被击飞后的额外速度每秒衰减的比例
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

  /** 在 [lo, hi] 之间来回反弹后的坐标。 */
  function reflect(v, lo, hi) {
    const span = hi - lo;
    let m = (v - lo) % (2 * span);
    if (m < 0) m += 2 * span;
    return lo + (m > span ? 2 * span - m : m);
  }

  /** 小球现在该有的速率：冲刺 > 被击飞 > 平时。 */
  function ballSpeed(ball) {
    if (ball.dashing) return CFG.flame.dashSpeed;
    return CFG.speed * (1 + ball.boost);
  }

  /** 把速度拉回应有的速率；strict=false 时顺便避免几乎贴着坐标轴来回弹。 */
  function normalizeVelocity(ball, strict) {
    const speed = ballSpeed(ball);
    let len = Math.hypot(ball.vx, ball.vy);
    if (len < 1e-6) {
      ball.vx = speed;
      ball.vy = 0;
      len = speed;
    }
    let nx = ball.vx / len;
    let ny = ball.vy / len;
    if (!strict) {
      const MIN = 0.22;
      if (Math.abs(nx) < MIN) {
        nx = (nx < 0 ? -1 : 1) * MIN;
        ny = (ny < 0 ? -1 : 1) * Math.sqrt(1 - MIN * MIN);
      } else if (Math.abs(ny) < MIN) {
        ny = (ny < 0 ? -1 : 1) * MIN;
        nx = (nx < 0 ? -1 : 1) * Math.sqrt(1 - MIN * MIN);
      }
    }
    ball.vx = nx * speed;
    ball.vy = ny * speed;
  }

  function rotateVelocity(ball, angle) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const vx = ball.vx * c - ball.vy * s;
    const vy = ball.vx * s + ball.vy * c;
    ball.vx = vx;
    ball.vy = vy;
  }

  /** 钉在原地的球：被麻痹，或者正在蓄力。 */
  function isFixed(ball) {
    return ball.paralyzed || ball.rooted;
  }

  /** 预判 t 秒后小球在哪（只算直线和撞墙反弹）。 */
  function predict(ball, t) {
    if (isFixed(ball) || ball.hp <= 0) return { x: ball.x, y: ball.y };
    return {
      x: reflect(ball.x + ball.vx * t, ball.r, CFG.arena - ball.r),
      y: reflect(ball.y + ball.vy * t, ball.r, CFG.arena - ball.r),
    };
  }

  function damage(state, target, amount, kind, sourceId) {
    if (state.over || target.hp <= 0) return;
    target.hp = Math.max(0, target.hp - amount);
    state.events.push({
      type: 'damage', target: target.id, source: sourceId,
      amount: amount, kind: kind, x: target.x, y: target.y,
    });
  }

  /** 击飞：朝远离 (fromX, fromY) 的方向弹出去，速度短暂加快。 */
  function knockBack(ball, fromX, fromY, power) {
    if (isFixed(ball) || ball.dashing || ball.hp <= 0) return;
    let dx = ball.x - fromX;
    let dy = ball.y - fromY;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) { dx = 1; dy = 0; } else { dx /= len; dy /= len; }
    ball.boost = Math.max(ball.boost, power);
    ball.vx = dx;
    ball.vy = dy;
    normalizeVelocity(ball, true);
  }

  // ---------------------------------------------------------------------
  // 灼烧
  // ---------------------------------------------------------------------

  /** 施加灼烧：每秒 -1。已经在烧的话只延长，不叠加。 */
  function applyBurn(state, target, seconds, sourceId) {
    if (target.hp <= 0) return;
    const ticks = Math.round(seconds / CFG.burn.tickEvery);
    if (target.burn) {
      target.burn.ticksLeft = Math.max(target.burn.ticksLeft, ticks);
      target.burn.source = sourceId;
    } else {
      target.burn = { ticksLeft: ticks, timer: CFG.burn.tickEvery, source: sourceId };
    }
    state.events.push({ type: 'burn', target: target.id, source: sourceId, seconds: seconds });
  }

  function updateBurn(state, ball, dt) {
    const burn = ball.burn;
    if (!burn) return;
    burn.timer -= dt;
    if (burn.timer > 1e-9) return;
    burn.timer += CFG.burn.tickEvery;
    burn.ticksLeft -= 1;
    damage(state, ball, CFG.burn.tickDamage, 'burn', burn.source);
    if (burn.ticksLeft <= 0) ball.burn = null;
  }

  // ---------------------------------------------------------------------
  // 孢子 / 蘑菇（会被各种范围攻击清掉）
  // ---------------------------------------------------------------------

  function mushroomRadius(mushroom) {
    return mushroom.stage === 'mature' ? CFG.spore.matureRadius : CFG.spore.youngRadius;
  }

  /**
   * 对 attackerId 的敌方孢子 / 蘑菇造成伤害。
   * inside(x, y, r) 返回这个东西是否在攻击范围内。孢子一碰就没，蘑菇有 2 点血。
   * limit：最多打掉几个（不填就是全部）。返回打中的数量。
   */
  function hitSummons(state, attackerId, amount, inside, limit) {
    let count = 0;
    const max = limit == null ? Infinity : limit;
    for (let i = state.spores.length - 1; i >= 0 && count < max; i--) {
      const spore = state.spores[i];
      if (spore.owner === attackerId || !inside(spore.x, spore.y, CFG.spore.sporeRadius)) continue;
      state.spores.splice(i, 1);
      state.events.push({ type: 'sporeDie', owner: spore.owner, x: spore.x, y: spore.y });
      count++;
    }
    for (let i = state.mushrooms.length - 1; i >= 0 && count < max; i--) {
      const mushroom = state.mushrooms[i];
      if (mushroom.owner === attackerId || !inside(mushroom.x, mushroom.y, mushroomRadius(mushroom))) continue;
      count++;
      mushroom.hp -= amount;
      if (mushroom.hp > 0) continue;
      // 被打死的蘑菇不会放出孢子。
      state.mushrooms.splice(i, 1);
      state.events.push({
        type: 'mushroomDie', owner: mushroom.owner, x: mushroom.x, y: mushroom.y, stage: mushroom.stage,
      });
    }
    return count;
  }

  function inCircle(cx, cy, radius) {
    return function (x, y, r) {
      return Math.hypot(x - cx, y - cy) <= radius + r;
    };
  }

  function countOwned(list, owner) {
    let n = 0;
    for (let i = 0; i < list.length; i++) if (list[i].owner === owner) n++;
    return n;
  }

  /** 从 (x, y) 朝四周放出 count 个孢子。 */
  function releaseSpores(state, owner, x, y, count, startRadius, from) {
    const S = CFG.spore;
    const room = S.maxSpores - countOwned(state.spores, owner);
    const n = Math.max(0, Math.min(count, room));
    const base = state.rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const angle = base + ((i + (state.rng() - 0.5) * 0.6) / count) * Math.PI * 2;
      const speed = S.sporeSpeed * (0.6 + state.rng() * 0.8);
      const margin = S.sporeRadius;
      state.spores.push({
        id: state.nextSummonId++,
        owner: owner,
        x: clamp(x + Math.cos(angle) * startRadius, margin, CFG.arena - margin),
        y: clamp(y + Math.sin(angle) * startRadius, margin, CFG.arena - margin),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        age: 0,
      });
    }
    state.events.push({ type: 'sporeRelease', owner: owner, x: x, y: y, count: n, from: from });
  }

  function updateSpores(state, dt) {
    const S = CFG.spore;
    const lo = S.sporeRadius;
    const hi = CFG.arena - S.sporeRadius;
    const drag = Math.exp(-S.sporeDrag * dt);
    for (let i = state.spores.length - 1; i >= 0; i--) {
      const spore = state.spores[i];
      const enemy = state.balls[1 - spore.owner];
      spore.age += dt;
      spore.x += spore.vx * dt;
      spore.y += spore.vy * dt;
      spore.vx *= drag;
      spore.vy *= drag;
      if (spore.x < lo) { spore.x = lo; spore.vx = Math.abs(spore.vx); }
      else if (spore.x > hi) { spore.x = hi; spore.vx = -Math.abs(spore.vx); }
      if (spore.y < lo) { spore.y = lo; spore.vy = Math.abs(spore.vy); }
      else if (spore.y > hi) { spore.y = hi; spore.vy = -Math.abs(spore.vy); }

      // 打中敌方小球。
      if (enemy.hp > 0 && Math.hypot(enemy.x - spore.x, enemy.y - spore.y) <= enemy.r + S.sporeRadius) {
        state.spores.splice(i, 1);
        if (enemy.dashing) {
          // 冲拳途中的烈焰球直接把孢子烧掉。
          state.events.push({ type: 'sporeDie', owner: spore.owner, x: spore.x, y: spore.y });
        } else {
          damage(state, enemy, S.sporeDamage, 'spore', spore.owner);
        }
        continue;
      }

      // 打中敌方蘑菇（两个孢子球对打时）。
      let spent = false;
      for (let j = state.mushrooms.length - 1; j >= 0; j--) {
        const mushroom = state.mushrooms[j];
        if (mushroom.owner === spore.owner) continue;
        if (Math.hypot(mushroom.x - spore.x, mushroom.y - spore.y) > mushroomRadius(mushroom) + S.sporeRadius) continue;
        mushroom.hp -= S.sporeDamage;
        if (mushroom.hp <= 0) {
          state.mushrooms.splice(j, 1);
          state.events.push({
            type: 'mushroomDie', owner: mushroom.owner, x: mushroom.x, y: mushroom.y, stage: mushroom.stage,
          });
        }
        spent = true;
        break;
      }
      if (spent) {
        state.spores.splice(i, 1);
        state.events.push({ type: 'sporeDie', owner: spore.owner, x: spore.x, y: spore.y });
        continue;
      }

      // 一直没打中：落地长成蘑菇幼年体。
      if (spore.age >= S.sproutTime) {
        state.spores.splice(i, 1);
        if (countOwned(state.mushrooms, spore.owner) >= S.maxMushrooms) {
          state.events.push({ type: 'sporeDie', owner: spore.owner, x: spore.x, y: spore.y });
          continue;
        }
        state.mushrooms.push({
          id: state.nextSummonId++,
          owner: spore.owner,
          x: spore.x,
          y: spore.y,
          hp: S.mushroomHp,
          age: 0,
          stage: 'young', // 'young' 幼年体 → 'mature' 完全体
        });
        state.events.push({ type: 'sprout', owner: spore.owner, x: spore.x, y: spore.y });
      }
    }
  }

  function updateMushrooms(state, dt) {
    const S = CFG.spore;
    for (let i = state.mushrooms.length - 1; i >= 0; i--) {
      const mushroom = state.mushrooms[i];
      const enemy = state.balls[1 - mushroom.owner];
      mushroom.age += dt;
      if (mushroom.stage === 'young' && mushroom.age >= S.growTime) {
        mushroom.stage = 'mature';
        state.events.push({ type: 'mushroomGrow', owner: mushroom.owner, x: mushroom.x, y: mushroom.y });
      }

      // 敌人碰到蘑菇：蘑菇炸掉并造成伤害（冲拳途中的烈焰球只会把它撞碎）。
      const touching = enemy.hp > 0 &&
        Math.hypot(enemy.x - mushroom.x, enemy.y - mushroom.y) <= enemy.r + mushroomRadius(mushroom);
      if (touching) {
        state.mushrooms.splice(i, 1);
        if (enemy.dashing) {
          state.events.push({
            type: 'mushroomDie', owner: mushroom.owner, x: mushroom.x, y: mushroom.y, stage: mushroom.stage,
          });
        } else {
          damage(state, enemy, S.mushroomDamage, 'mushroom', mushroom.owner);
          state.events.push({
            type: 'mushroomPop', owner: mushroom.owner, x: mushroom.x, y: mushroom.y, stage: mushroom.stage,
          });
        }
        continue;
      }

      // 完全体到时间后分裂成一圈孢子。
      if (mushroom.stage === 'mature' && mushroom.age >= S.growTime + S.matureTime) {
        state.mushrooms.splice(i, 1);
        state.events.push({ type: 'mushroomBurst', owner: mushroom.owner, x: mushroom.x, y: mushroom.y });
        releaseSpores(state, mushroom.owner, mushroom.x, mushroom.y, S.burstCount, S.matureRadius * 0.5, 'mushroom');
      }
    }
  }

  // ---------------------------------------------------------------------
  // 角色
  // ---------------------------------------------------------------------

  const CHARACTERS = {
    /*
     * 电击球：周身环绕闪电链。敌人进入闪电链范围 → 麻痹 3 秒，
     * 期间每秒 -3；麻痹结束后闪电链冷却 8 秒。
     * 另外每 3 秒预判敌人的位置劈一道落雷。
     */
    electric: {
      id: 'electric',
      name: '电击球',
      details: [
        '敌人靠近闪电链：麻痹 3 秒，每秒 -3 血',
        '之后闪电链冷却 8 秒',
        '落雷：每 4.5 秒预判敌人位置劈下，-4 血',
      ],
      init: function (ball, rng) {
        ball.chain = { state: 'ready', timer: 0 };
        ball.thunderTimer = CFG.electric.thunderEvery * (0.6 + rng() * 0.4);
        ball.zapTimer = 0;
      },
      update: function (state, ball, enemy, dt) {
        const E = CFG.electric;
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
        if (ball.paralyzed) return;

        // 闪电链就绪时会顺手电掉靠近的孢子 / 蘑菇（不消耗闪电链）。
        ball.zapTimer = Math.max(0, ball.zapTimer - dt);
        if (chain.state === 'ready' && ball.zapTimer <= 0) {
          let zapped = null;
          const hit = hitSummons(state, ball.id, E.tickDamage, function (x, y, r) {
            if (Math.hypot(x - ball.x, y - ball.y) > E.reach + r) return false;
            zapped = { x: x, y: y };
            return true;
          }, 1);
          if (hit) {
            ball.zapTimer = E.zapEvery;
            state.events.push({ type: 'zap', ball: ball.id, x: zapped.x, y: zapped.y });
          }
        }

        // 落雷。
        ball.thunderTimer -= dt;
        if (ball.thunderTimer <= 0 && enemy.hp > 0) {
          ball.thunderTimer += E.thunderEvery;
          const target = predict(enemy, E.thunderDelay);
          const angle = state.rng() * Math.PI * 2;
          const off = isFixed(enemy) ? 0 : state.rng() * E.thunderScatter;
          spawnStrike(state, ball,
            target.x + Math.cos(angle) * off, target.y + Math.sin(angle) * off);
        }
      },
      // 是否在这一步电到敌人。两边同时判定后再统一结算，镜像对局才公平。
      wantsToShock: function (ball, enemy) {
        if (ball.chain.state !== 'ready' || ball.paralyzed) return false;
        if (enemy.hp <= 0 || enemy.paralyzed) return false;
        if (enemy.dashing) return false; // 冲拳途中的烈焰球电不住
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

    /*
     * 烈焰球：靠撞。撞一下 -5，爆炸波把对方击飞并再 -2，外加 3 秒灼烧（每秒 -1）。
     * 大招烈焰冲拳：朝向敌人蓄力 3 秒后猛冲过去，撞到 -15、击飞、5 秒灼烧。
     */
    flame: {
      id: 'flame',
      name: '烈焰球',
      details: [
        '撞击 -5，爆炸波击飞并再 -2',
        '撞击附带 3 秒灼烧（每秒 -1）',
        '烈焰冲拳：蓄力 3 秒后冲撞，-15 并灼烧 5 秒',
      ],
      init: function (ball, rng) {
        ball.hitCd = 0;
        // phase: 'idle' 攒怒气 → 'windup' 蓄力（原地瞄准）→ 'dash' 冲刺
        // 开局怒气随机一点，两个烈焰球才不会永远同时出招。
        ball.ult = { phase: 'idle', energy: rng() * 3, timer: 0, aim: 0 };
      },
      update: function (state, ball, enemy, dt) {
        const F = CFG.flame;
        const ult = ball.ult;
        ball.hitCd = Math.max(0, ball.hitCd - dt);
        if (ball.paralyzed) return; // 麻痹时怒气、蓄力、冲刺全部暂停

        if (ult.phase === 'idle') {
          ult.energy = Math.min(F.ultEnergy, ult.energy + dt);
          // 平时会慢慢朝敌人拐过去；刚撞完的那一下先让自己弹开。
          if (ball.hitCd <= 0 && enemy.hp > 0) steerToward(ball, enemy.x, enemy.y, F.turnRate * dt);
          if (ult.energy >= F.ultEnergy && enemy.hp > 0) {
            ult.phase = 'windup';
            ult.timer = F.ultWindup;
            ult.aim = Math.atan2(enemy.y - ball.y, enemy.x - ball.x);
            ball.rooted = true;
            state.events.push({ type: 'ultWindup', ball: ball.id });
          }
        } else if (ult.phase === 'windup') {
          ult.timer -= dt;
          ult.aim = aimAt(ball, enemy);
          if (ult.timer <= 0) {
            ult.phase = 'dash';
            ult.timer = F.dashMax;
            ball.rooted = false;
            ball.dashing = true;
            ball.boost = 0;
            ball.vx = Math.cos(ult.aim);
            ball.vy = Math.sin(ult.aim);
            normalizeVelocity(ball, true);
            state.events.push({ type: 'ultDash', ball: ball.id, x: ball.x, y: ball.y, angle: ult.aim });
          }
        } else if (ult.phase === 'dash') {
          ult.timer -= dt;
          // 一路上的孢子 / 蘑菇直接撞碎。
          hitSummons(state, ball.id, 99, inCircle(ball.x, ball.y, ball.r));
          if (ult.timer <= 0) endDash(state, ball, false);
        }
      },
      /**
       * 和另一个球撞上时调用。(cx, cy) 是接触点，
       * impact / enemyImpact 是双方各自朝对方撞过去的速度。
       */
      onCollide: function (state, ball, enemy, cx, cy, impact, enemyImpact) {
        const F = CFG.flame;
        if (enemy.hp <= 0) return;
        // 两个烈焰球对撞：谁撞得更猛算谁的，否则每次都是互相抵消。
        if (enemy.type === 'flame' && !enemy.paralyzed && enemyImpact > impact) return;

        if (ball.dashing) {
          // 烈焰冲拳命中。
          endDash(state, ball, true);
          ball.hitCd = F.hitCooldown;
          damage(state, enemy, F.ultDamage, 'punch', ball.id);
          knockBack(enemy, ball.x, ball.y, F.ultKnock);
          applyBurn(state, enemy, F.ultBurnTime, ball.id);
          hitSummons(state, ball.id, 99, inCircle(cx, cy, F.ultWaveRadius));
          state.events.push({
            type: 'flamePunch', ball: ball.id, target: enemy.id, x: cx, y: cy, radius: F.ultWaveRadius,
          });
          return;
        }

        if (ball.hitCd > 0) return;
        ball.hitCd = F.hitCooldown;
        damage(state, enemy, F.hitDamage, 'flame', ball.id);
        damage(state, enemy, F.waveDamage, 'wave', ball.id);
        knockBack(enemy, ball.x, ball.y, F.knock);
        applyBurn(state, enemy, F.burnTime, ball.id);
        hitSummons(state, ball.id, F.waveDamage, inCircle(cx, cy, F.waveRadius));
        state.events.push({
          type: 'flameHit', ball: ball.id, target: enemy.id, x: cx, y: cy, radius: F.waveRadius,
        });
      },
      /** 冲刺途中撞墙时调用。 */
      onWall: function (state, ball) {
        if (ball.dashing) endDash(state, ball, false);
      },
    },

    /*
     * 孢子球：每 5 秒放 5 个孢子，孢子打中 -1。没打中的孢子 3 秒后长成蘑菇幼年体，
     * 再过 2 秒长成完全体，完全体 5 秒后分裂成 10 个孢子。
     * 蘑菇被碰到 -2，自己有 2 点血，被打死的蘑菇不会放孢子。
     */
    spore: {
      id: 'spore',
      name: '孢子球',
      details: [
        '每 5 秒放出 5 个孢子，命中 -1',
        '没打中的孢子会长成蘑菇，碰到 -2',
        '蘑菇成熟 5 秒后分裂成 10 个孢子',
      ],
      init: function (ball, rng) {
        ball.sporeTimer = CFG.spore.interval * (0.7 + rng() * 0.3);
      },
      update: function (state, ball, enemy, dt) {
        if (ball.paralyzed) return;
        ball.sporeTimer -= dt;
        if (ball.sporeTimer > 0) return;
        ball.sporeTimer += CFG.spore.interval;
        releaseSpores(state, ball.id, ball.x, ball.y, CFG.spore.count, ball.r, 'ball');
      },
    },
  };

  const CHARACTER_IDS = Object.keys(CHARACTERS);

  // ---------------------------------------------------------------------
  // 烈焰球的移动 / 冲拳
  // ---------------------------------------------------------------------

  /** 把速度方向朝 (tx, ty) 转最多 maxTurn 弧度。 */
  function steerToward(ball, tx, ty, maxTurn) {
    const want = Math.atan2(ty - ball.y, tx - ball.x);
    const have = Math.atan2(ball.vy, ball.vx);
    let diff = want - have;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    rotateVelocity(ball, clamp(diff, -maxTurn, maxTurn));
  }

  /** 蓄力时瞄准的方向：按冲刺速度预判敌人会跑到哪。 */
  function aimAt(ball, enemy) {
    let target = { x: enemy.x, y: enemy.y };
    for (let i = 0; i < 3; i++) {
      const dist = Math.max(0, Math.hypot(target.x - ball.x, target.y - ball.y) - ball.r - enemy.r);
      target = predict(enemy, dist / CFG.flame.dashSpeed);
    }
    return Math.atan2(target.y - ball.y, target.x - ball.x);
  }

  function endDash(state, ball, hit) {
    ball.dashing = false;
    ball.ult.phase = 'idle';
    ball.ult.energy = 0;
    ball.ult.timer = 0;
    normalizeVelocity(ball, false);
    state.events.push({ type: 'dashEnd', ball: ball.id, x: ball.x, y: ball.y, hit: hit });
  }

  // ---------------------------------------------------------------------
  // 落雷
  // ---------------------------------------------------------------------

  function spawnStrike(state, owner, x, y) {
    const E = CFG.electric;
    const strike = {
      id: state.nextStrikeId++,
      owner: owner.id,
      x: clamp(x, 0, CFG.arena),
      y: clamp(y, 0, CFG.arena),
      timer: E.thunderDelay,
    };
    state.strikes.push(strike);
    state.events.push({ type: 'thunderMark', strike: strike.id, owner: owner.id, x: strike.x, y: strike.y });
  }

  function updateStrikes(state, dt) {
    const E = CFG.electric;
    for (let i = state.strikes.length - 1; i >= 0; i--) {
      const strike = state.strikes[i];
      strike.timer -= dt;
      if (strike.timer > 0) continue;
      state.strikes.splice(i, 1);
      const enemy = state.balls[1 - strike.owner];
      // 雷劈在一个圆里：球有一半以上进了圈才算劈中。
      const hit = enemy.hp > 0 &&
        Math.hypot(enemy.x - strike.x, enemy.y - strike.y) <= E.thunderRadius + enemy.r * 0.5;
      if (hit) damage(state, enemy, E.thunderDamage, 'thunder', strike.owner);
      // 电流会顺着地面窜出去，把更大一圈里的孢子 / 蘑菇一起电掉。
      hitSummons(state, strike.owner, E.thunderDamage, inCircle(strike.x, strike.y, E.thunderChain));
      state.events.push({
        type: 'thunder', strike: strike.id, owner: strike.owner, x: strike.x, y: strike.y, hit: hit,
      });
    }
  }

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
      // 激光扫过的孢子 / 蘑菇也会被烧掉。
      hitSummons(state, device.owner, L.damage, function (x, y, r) {
        return Math.abs(x - device.x) <= L.width / 2 + r || Math.abs(y - device.y) <= L.width / 2 + r;
      });

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
    if (isFixed(ball)) return;
    if (ball.boost > 0) {
      ball.boost *= Math.exp(-CFG.boostDecay * dt);
      if (ball.boost < 0.02) ball.boost = 0;
    }
    normalizeVelocity(ball, true);
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    const lo = ball.r;
    const hi = CFG.arena - ball.r;
    let bounced = false;
    if (ball.x < lo) { ball.x = lo + (lo - ball.x); ball.vx = Math.abs(ball.vx); bounced = true; }
    else if (ball.x > hi) { ball.x = hi - (ball.x - hi); ball.vx = -Math.abs(ball.vx); bounced = true; }
    if (ball.y < lo) { ball.y = lo + (lo - ball.y); ball.vy = Math.abs(ball.vy); bounced = true; }
    else if (ball.y > hi) { ball.y = hi - (ball.y - hi); ball.vy = -Math.abs(ball.vy); bounced = true; }
    if (!bounced) return;
    ball.x = clamp(ball.x, lo, hi);
    ball.y = clamp(ball.y, lo, hi);

    const def = CHARACTERS[ball.type];
    if (def.onWall) def.onWall(state, ball);

    // 每次撞墙加一点随机偏角，轨迹才不会陷入死循环。
    const signX = ball.vx < 0 ? -1 : 1;
    const signY = ball.vy < 0 ? -1 : 1;
    rotateVelocity(ball, (state.rng() - 0.5) * 0.5);
    ball.vx = signX * Math.abs(ball.vx);
    ball.vy = signY * Math.abs(ball.vy);
    normalizeVelocity(ball, false);
    state.events.push({ type: 'wall', ball: ball.id, x: ball.x, y: ball.y });
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

    const aFixed = isFixed(a);
    const bFixed = isFixed(b);
    if (aFixed && bFixed) return;
    // 双方各自朝对方撞过去的速度（钉在原地的算 0）。
    const aImpact = aFixed ? 0 : a.vx * nx + a.vy * ny;
    const bImpact = bFixed ? 0 : -(b.vx * nx + b.vy * ny);

    if (aFixed || bFixed) {
      // 钉在原地的球不动，另一个球从它身上弹开。
      const mover = aFixed ? b : a;
      const sign = aFixed ? 1 : -1;
      mover.x = clamp(mover.x + nx * overlap * sign, mover.r, CFG.arena - mover.r);
      mover.y = clamp(mover.y + ny * overlap * sign, mover.r, CFG.arena - mover.r);
      const vn = mover.vx * nx * sign + mover.vy * ny * sign;
      if (vn < 0) {
        mover.vx -= 2 * vn * nx * sign;
        mover.vy -= 2 * vn * ny * sign;
      }
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
    }

    const cx = a.x + nx * a.r;
    const cy = a.y + ny * a.r;
    state.events.push({ type: 'bump', x: cx, y: cy });

    // 角色自己的撞击效果（烈焰球的撞击 / 冲拳）。
    const aDef = CHARACTERS[a.type];
    const bDef = CHARACTERS[b.type];
    if (aDef.onCollide) aDef.onCollide(state, a, b, cx, cy, aImpact, bImpact);
    if (bDef.onCollide) bDef.onCollide(state, b, a, cx, cy, bImpact, aImpact);

    if (!isFixed(a)) normalizeVelocity(a, false);
    if (!isFixed(b)) normalizeVelocity(b, false);
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
      devices: [],     // 激光发射装置
      strikes: [],     // 还没劈下来的落雷
      spores: [],
      mushrooms: [],
      nextDeviceId: 1,
      nextStrikeId: 1,
      nextSummonId: 1,
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
        paralyzed: false,   // 被电击球麻痹
        shock: null,
        burn: null,         // 被烈焰球点燃
        boost: 0,           // 被击飞后的额外速度倍率
        rooted: false,      // 原地蓄力中
        dashing: false,     // 烈焰冲拳冲刺中
      };
      def.init(ball, rng);
      normalizeVelocity(ball, false);
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
    updateBurn(state, a, dt);
    updateBurn(state, b, dt);

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
    updateStrikes(state, dt);
    updateSpores(state, dt);
    updateMushrooms(state, dt);

    if (a.hp <= 0 || b.hp <= 0) {
      state.over = true;
      state.winner = a.hp <= 0 && b.hp <= 0 ? -1 : a.hp <= 0 ? 1 : 0;
      state.devices.length = 0;
      state.strikes.length = 0;
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
    // 下面几个主要给测试用。
    applyBurn: applyBurn,
    releaseSpores: releaseSpores,
    predict: predict,
  };
});
