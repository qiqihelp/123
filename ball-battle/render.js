/*
 * 小球对战 —— 画面。
 *
 * 只依赖一个 2D canvas 上下文：把 sim.js 的对局状态画出来，
 * 并把对局事件变成粒子、飘字、震屏等一次性特效。
 * 所有坐标都用场地的逻辑单位（CFG.arena），由 draw() 统一缩放。
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./sim.js'));
  else root.BallRender = factory(root.BallSim);
})(typeof self !== 'undefined' ? self : this, function (Sim) {
  'use strict';

  const CFG = Sim.CFG;
  const TAU = Math.PI * 2;
  const FRAME = 5; // 方框粗细（逻辑单位）
  const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC","Noto Sans SC",system-ui,sans-serif';

  // 每个角色两套配色：第二套给镜像对局里的右方用。
  const THEMES = {
    electric: [
      { main: '#ffd23f', light: '#fff6c9', dark: '#a87400', ink: '#2a1e00', arc: '#fffdf0' },
      { main: '#5ee6ff', light: '#e2fbff', dark: '#0d7f99', ink: '#00262e', arc: '#ffffff' },
    ],
    laser: [
      { main: '#ff4d6d', light: '#ffd3db', dark: '#a3122e', ink: '#ffffff', arc: '#ffffff' },
      { main: '#b07cff', light: '#ecdfff', dark: '#5a2bb0', ink: '#ffffff', arc: '#ffffff' },
    ],
  };

  function themeFor(match, ballId) {
    const ball = match.balls[ballId];
    const mirror = match.balls[0].type === match.balls[1].type;
    return THEMES[ball.type][mirror && ballId === 1 ? 1 : 0];
  }

  function rand(lo, hi) {
    return lo + Math.random() * (hi - lo);
  }

  // ---------------------------------------------------------------------
  // 特效状态
  // ---------------------------------------------------------------------

  function createFx() {
    return {
      time: 0,
      particles: [],
      floats: [],
      rings: [],
      shake: 0,
      trails: [[], []],
      trailTimer: 0,
      hitFlash: [0, 0],
      dead: [false, false],
      // 闪电每隔几十毫秒重新生成一次，才有“跳动”的感觉。
      arcs: [null, null],
      arcTimer: 0,
    };
  }

  function burst(fx, x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const v = speed * rand(0.35, 1);
      fx.particles.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        age: 0, life: life * rand(0.6, 1), color: color, size: size * rand(0.6, 1.2),
      });
    }
  }

  function floatText(fx, x, y, text, color, size) {
    fx.floats.push({
      x: clampText(x + rand(-14, 14)), y: Math.max(26, y), text: text, color: color,
      size: size || 22, age: 0, life: 0.95,
    });
  }

  function clampText(x) {
    return Math.min(CFG.arena - 34, Math.max(34, x));
  }

  /**
   * 把一批对局事件变成特效。
   * @param {{floats: boolean}} opts floats=false 时不生成飘字
   */
  function handleEvents(fx, match, events, opts) {
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      switch (e.type) {
        case 'damage': {
          const target = match.balls[e.target];
          const color = themeFor(match, e.source).main;
          fx.hitFlash[e.target] = 0.18;
          burst(fx, target.x, target.y, color, e.kind === 'laser' ? 14 : 7, 190, 0.45, 3);
          fx.shake = Math.max(fx.shake, e.kind === 'laser' ? 7 : 3.5);
          if (opts.floats) {
            floatText(fx, target.x, target.y - target.r - 10, '-' + e.amount, color, e.kind === 'laser' ? 26 : 22);
          }
          break;
        }
        case 'shock': {
          const color = themeFor(match, e.source).main;
          burst(fx, e.x, e.y, color, 18, 240, 0.5, 3);
          fx.rings.push({ x: e.x, y: e.y, r0: 20, r1: 64, age: 0, life: 0.35, color: color, width: 3 });
          fx.shake = Math.max(fx.shake, 5);
          if (opts.floats) floatText(fx, e.x, e.y - CFG.ballR - 30, '麻痹！', color, 18);
          break;
        }
        case 'chainReady': {
          const ball = match.balls[e.ball];
          fx.rings.push({
            x: ball.x, y: ball.y, r0: ball.r, r1: CFG.electric.reach, age: 0, life: 0.3,
            color: themeFor(match, e.ball).main, width: 2, follow: e.ball,
          });
          break;
        }
        case 'volley': {
          if (e.double && opts.floats) {
            const ball = match.balls[e.ball];
            floatText(fx, ball.x, ball.y - ball.r - 14, '双重激光！', themeFor(match, e.ball).main, 18);
          }
          break;
        }
        case 'beamFire':
          fx.shake = Math.max(fx.shake, 2.5);
          break;
        case 'wall': {
          burst(fx, e.x, e.y, themeFor(match, e.ball).main, 4, 90, 0.3, 2.2);
          break;
        }
        case 'bump':
          burst(fx, e.x, e.y, '#ffffff', 8, 150, 0.3, 2.4);
          break;
        case 'death': {
          const theme = themeFor(match, e.ball);
          fx.dead[e.ball] = true;
          burst(fx, e.x, e.y, theme.main, 46, 330, 1.1, 5);
          burst(fx, e.x, e.y, theme.light, 22, 220, 0.9, 3.5);
          fx.rings.push({ x: e.x, y: e.y, r0: 10, r1: 150, age: 0, life: 0.6, color: theme.main, width: 5 });
          fx.shake = Math.max(fx.shake, 14);
          break;
        }
        default:
          break;
      }
    }
  }

  function updateFx(fx, match, dt) {
    fx.time += dt;
    fx.shake = Math.max(0, fx.shake - dt * 34);
    for (let i = 0; i < 2; i++) fx.hitFlash[i] = Math.max(0, fx.hitFlash[i] - dt);

    for (let i = fx.particles.length - 1; i >= 0; i--) {
      const p = fx.particles[i];
      p.age += dt;
      if (p.age >= p.life) { fx.particles.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 2.6 * dt;
      p.vy *= 1 - 2.6 * dt;
    }
    for (let i = fx.floats.length - 1; i >= 0; i--) {
      const f = fx.floats[i];
      f.age += dt;
      if (f.age >= f.life) fx.floats.splice(i, 1);
    }
    for (let i = fx.rings.length - 1; i >= 0; i--) {
      const r = fx.rings[i];
      r.age += dt;
      if (r.age >= r.life) fx.rings.splice(i, 1);
    }

    if (!match) return;

    fx.trailTimer -= dt;
    if (fx.trailTimer <= 0) {
      fx.trailTimer = 0.022;
      match.balls.forEach(function (ball, i) {
        const trail = fx.trails[i];
        if (fx.dead[i] || ball.paralyzed) { if (trail.length) trail.shift(); return; }
        trail.push({ x: ball.x, y: ball.y });
        if (trail.length > 9) trail.shift();
      });
    }

    fx.arcTimer -= dt;
    if (fx.arcTimer <= 0) {
      fx.arcTimer = 0.07;
      match.balls.forEach(function (ball, i) {
        fx.arcs[i] = ball.type === 'electric' ? makeChainArcs(ball) : null;
      });
    }
  }

  // ---------------------------------------------------------------------
  // 闪电
  // ---------------------------------------------------------------------

  /** 两点之间的一条折线闪电（返回点数组）。 */
  function bolt(x1, y1, x2, y2, jitter, segments) {
    const pts = [[x1, y1]];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      const off = rand(-jitter, jitter);
      pts.push([x1 + dx * t + nx * off, y1 + dy * t + ny * off]);
    }
    pts.push([x2, y2]);
    return pts;
  }

  /** 环绕电击球的一圈闪电链（相对球心的坐标）。 */
  function makeChainArcs(ball) {
    const reach = CFG.electric.reach;
    const count = 8;
    const spin = Math.random() * TAU;
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const a = spin + (i / count) * TAU + rand(-0.16, 0.16);
      const r = reach * rand(0.8, 1);
      nodes.push([Math.cos(a) * r, Math.sin(a) * r, a]);
    }
    const links = [];
    for (let i = 0; i < count; i++) {
      // 偶尔断开一节，看起来更像跳动的电弧而不是一个圆环。
      if (Math.random() < 0.18) continue;
      const a = nodes[i];
      const b = nodes[(i + 1) % count];
      links.push(bolt(a[0], a[1], b[0], b[1], 10, 5));
    }
    const spokes = [];
    for (let i = 0; i < count; i++) {
      if (Math.random() < 0.45) continue;
      const n = nodes[i];
      const a = n[2] + rand(-0.3, 0.3);
      spokes.push(bolt(Math.cos(a) * (ball.r + 1), Math.sin(a) * (ball.r + 1), n[0], n[1], 8, 5));
    }
    return { nodes: nodes, links: links, spokes: spokes };
  }

  function strokePaths(ctx, paths, ox, oy) {
    ctx.beginPath();
    for (let i = 0; i < paths.length; i++) {
      const pts = paths[i];
      ctx.moveTo(ox + pts[0][0], oy + pts[0][1]);
      for (let j = 1; j < pts.length; j++) ctx.lineTo(ox + pts[j][0], oy + pts[j][1]);
    }
    ctx.stroke();
  }

  /** 先叠一层粗的光晕，再画一层细的亮芯。 */
  function strokeGlow(ctx, paths, ox, oy, glow, core, width) {
    const alpha = ctx.globalAlpha;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 3;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = glow;
    ctx.globalAlpha = alpha * 0.22;
    ctx.lineWidth = width * 5;
    strokePaths(ctx, paths, ox, oy);
    ctx.globalAlpha = alpha * 0.5;
    ctx.lineWidth = width * 2.4;
    strokePaths(ctx, paths, ox, oy);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = core;
    ctx.lineWidth = width;
    strokePaths(ctx, paths, ox, oy);
  }

  // ---------------------------------------------------------------------
  // 各角色的画法
  // ---------------------------------------------------------------------

  const DRAW = {
    electric: {
      /** 画在小球下面：闪电链 / 冷却圈。 */
      under: function (ctx, match, fx, ball, theme) {
        const chain = ball.chain;
        const reach = CFG.electric.reach;

        if (chain.state === 'ready') {
          const dim = ball.paralyzed ? 0.35 : 1;
          const aura = ctx.createRadialGradient(ball.x, ball.y, ball.r, ball.x, ball.y, reach);
          aura.addColorStop(0, hexA(theme.main, 0.2 * dim));
          aura.addColorStop(1, hexA(theme.main, 0));
          ctx.fillStyle = aura;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, reach, 0, TAU);
          ctx.fill();

          const arcs = fx.arcs[ball.id] || (fx.arcs[ball.id] = makeChainArcs(ball));
          {
            ctx.save();
            ctx.globalAlpha = dim;
            strokeGlow(ctx, arcs.links, ball.x, ball.y, theme.main, theme.arc, 1.8);
            ctx.globalAlpha = 0.8 * dim;
            strokeGlow(ctx, arcs.spokes, ball.x, ball.y, theme.main, theme.light, 1.3);
            ctx.globalAlpha = dim;
            ctx.fillStyle = theme.light;
            for (let i = 0; i < arcs.nodes.length; i++) {
              ctx.beginPath();
              ctx.arc(ball.x + arcs.nodes[i][0], ball.y + arcs.nodes[i][1], 2.4, 0, TAU);
              ctx.fill();
            }
            ctx.restore();
          }
        } else if (chain.state === 'cooldown') {
          // 冷却：只剩一圈虚线，沿着虚线转回来的亮弧就是冷却进度。
          const progress = 1 - chain.timer / CFG.electric.cooldown;
          ctx.save();
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 9]);
          ctx.strokeStyle = hexA(theme.main, 0.22);
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, reach, 0, TAU);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';
          ctx.strokeStyle = hexA(theme.main, 0.6);
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, reach, -Math.PI / 2, -Math.PI / 2 + TAU * progress);
          ctx.stroke();
          ctx.restore();
        }
      },
      /** 画在小球上面：正在放电时连向受害者的电弧。 */
      over: function (ctx, match, fx, ball, theme) {
        if (ball.chain.state !== 'discharging') return;
        const victim = match.balls[1 - ball.id];
        if (!victim.paralyzed || fx.dead[victim.id]) return;
        const segments = Math.max(4, Math.round(Math.hypot(victim.x - ball.x, victim.y - ball.y) / 24));
        const paths = [
          bolt(ball.x, ball.y, victim.x, victim.y, 13, segments),
          bolt(ball.x, ball.y, victim.x, victim.y, 20, Math.max(3, segments - 2)),
        ];
        // 缠在受害者身上的小电弧。
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * TAU;
          const b = a + rand(0.7, 1.5);
          const r = victim.r + 5;
          paths.push(bolt(
            victim.x + Math.cos(a) * r, victim.y + Math.sin(a) * r,
            victim.x + Math.cos(b) * r, victim.y + Math.sin(b) * r, 6, 4
          ));
        }
        ctx.save();
        ctx.globalAlpha = 0.75 + Math.random() * 0.25;
        strokeGlow(ctx, paths, 0, 0, theme.main, theme.arc, 2);
        ctx.restore();
      },
      body: function (ctx, ball, theme) {
        // 一道小闪电标记。
        const s = ball.r / 28;
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = theme.dark;
        ctx.beginPath();
        ctx.moveTo(4 * s, -24 * s);
        ctx.lineTo(-12 * s, 3 * s);
        ctx.lineTo(-1 * s, 3 * s);
        ctx.lineTo(-5 * s, 24 * s);
        ctx.lineTo(12 * s, -5 * s);
        ctx.lineTo(1 * s, -5 * s);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      },
    },

    laser: {
      under: function (ctx, match, fx, ball, theme) {
        // 充能环：从正上方顺时针填满。
        const L = CFG.laser;
        const ratio = ball.charge / L.chargeMax;
        const r = ball.r + 8;
        const full = ratio >= 1;
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = hexA(theme.main, 0.18);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, r, 0, TAU);
        ctx.stroke();
        if (ratio > 0) {
          ctx.lineCap = 'round';
          if (full) {
            const pulse = 0.5 + 0.5 * Math.sin(fx.time * 14);
            ctx.strokeStyle = hexA(theme.main, 0.35);
            ctx.lineWidth = 10 + pulse * 6;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, r, 0, TAU);
            ctx.stroke();
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#ffffff';
          } else {
            ctx.strokeStyle = theme.main;
          }
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, r, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
          ctx.stroke();
        }
        ctx.restore();
      },
      over: function () {},
      body: function (ctx, ball, theme) {
        // 镜片 + 四个方向的发射口。
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.strokeStyle = hexA(theme.light, 0.55);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, ball.r * 0.68, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = hexA(theme.light, 0.85);
        const w = 5;
        const h = 6;
        const d = ball.r - h + 1;
        ctx.fillRect(-w / 2, -d - h / 2, w, h);
        ctx.fillRect(-w / 2, d - h / 2, w, h);
        ctx.fillRect(-d - h / 2, -w / 2, h, w);
        ctx.fillRect(d - h / 2, -w / 2, h, w);
        ctx.restore();
      },
    },
  };

  function hexA(hex, alpha) {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
  }

  // ---------------------------------------------------------------------
  // 画面
  // ---------------------------------------------------------------------

  function drawArena(ctx) {
    const A = CFG.arena;
    ctx.fillStyle = '#0c101a';
    ctx.fillRect(0, 0, A, A);
    ctx.strokeStyle = '#141a29';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 10; i++) {
      const p = (A / 10) * i;
      ctx.moveTo(p, 0); ctx.lineTo(p, A);
      ctx.moveTo(0, p); ctx.lineTo(A, p);
    }
    ctx.stroke();
  }

  function drawBeams(ctx, match, fx, phase) {
    const L = CFG.laser;
    const A = CFG.arena;
    for (let i = 0; i < match.beams.length; i++) {
      const beam = match.beams[i];
      if (beam.phase !== phase) continue;
      const theme = themeFor(match, beam.owner);
      const vertical = beam.orient === 'v';

      ctx.save();
      if (phase === 'warn') {
        const t = 1 - beam.timer / L.warn; // 0 → 1
        ctx.fillStyle = hexA(theme.main, 0.05 + 0.1 * t);
        if (vertical) ctx.fillRect(beam.pos - L.width / 2, 0, L.width, A);
        else ctx.fillRect(0, beam.pos - L.width / 2, A, L.width);
        ctx.strokeStyle = hexA(theme.main, 0.35 + 0.5 * t);
        ctx.lineWidth = 1.5 + t * 1.5;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -fx.time * 160;
        ctx.beginPath();
        if (vertical) { ctx.moveTo(beam.pos, 0); ctx.lineTo(beam.pos, A); }
        else { ctx.moveTo(0, beam.pos); ctx.lineTo(A, beam.pos); }
        ctx.stroke();
      } else {
        const t = 1 - beam.timer / L.fire; // 0 → 1
        const grow = t < 0.12 ? t / 0.12 : 1;
        const fade = t > 0.65 ? 1 - ((t - 0.65) / 0.35) * 0.55 : 1;
        const w = L.width * grow * fade;
        const layers = [
          [w * 3, hexA(theme.main, 0.16 * fade)],
          [w * 1.7, hexA(theme.main, 0.4 * fade)],
          [w, theme.main],
          [w * 0.45, '#ffffff'],
        ];
        for (let k = 0; k < layers.length; k++) {
          const lw = layers[k][0];
          ctx.fillStyle = layers[k][1];
          if (vertical) ctx.fillRect(beam.pos - lw / 2, 0, lw, A);
          else ctx.fillRect(0, beam.pos - lw / 2, A, lw);
        }
      }
      ctx.restore();
    }
  }

  function drawTrail(ctx, fx, ball, theme) {
    const trail = fx.trails[ball.id];
    for (let i = 0; i < trail.length; i++) {
      const t = (i + 1) / (trail.length + 1);
      ctx.fillStyle = hexA(theme.main, 0.1 * t);
      ctx.beginPath();
      ctx.arc(trail[i].x, trail[i].y, ball.r * (0.55 + 0.4 * t), 0, TAU);
      ctx.fill();
    }
  }

  function drawBall(ctx, match, fx, ball, theme, opts) {
    let x = ball.x;
    let y = ball.y;
    if (ball.paralyzed && !opts.reducedMotion) {
      x += rand(-1.6, 1.6);
      y += rand(-1.6, 1.6);
    }
    const shown = { x: x, y: y, r: ball.r };

    const body = ctx.createRadialGradient(x - ball.r * 0.35, y - ball.r * 0.4, ball.r * 0.1, x, y, ball.r);
    body.addColorStop(0, theme.light);
    body.addColorStop(0.45, theme.main);
    body.addColorStop(1, theme.dark);
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(x, y, ball.r, 0, TAU);
    ctx.fill();

    DRAW[ball.type].body(ctx, shown, theme);

    ctx.lineWidth = 2;
    ctx.strokeStyle = hexA('#ffffff', 0.75);
    ctx.beginPath();
    ctx.arc(x, y, ball.r - 1, 0, TAU);
    ctx.stroke();

    if (ball.paralyzed) {
      ctx.fillStyle = 'rgba(20, 28, 48, 0.38)';
      ctx.beginPath();
      ctx.arc(x, y, ball.r, 0, TAU);
      ctx.fill();
    }
    if (fx.hitFlash[ball.id] > 0) {
      ctx.fillStyle = hexA('#ffffff', Math.min(1, fx.hitFlash[ball.id] / 0.18) * 0.8);
      ctx.beginPath();
      ctx.arc(x, y, ball.r, 0, TAU);
      ctx.fill();
    }

    // 球心的血量数字。
    ctx.font = '800 ' + Math.round(ball.r * 0.78) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    ctx.strokeStyle = theme.ink === '#ffffff' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.6)';
    const hp = String(Math.ceil(ball.hp));
    ctx.strokeText(hp, x, y + 1);
    ctx.fillStyle = theme.ink;
    ctx.fillText(hp, x, y + 1);
  }

  function drawEffects(ctx, match, fx, opts) {
    for (let i = 0; i < fx.rings.length; i++) {
      const r = fx.rings[i];
      const t = r.age / r.life;
      let x = r.x;
      let y = r.y;
      if (r.follow != null && match) { x = match.balls[r.follow].x; y = match.balls[r.follow].y; }
      ctx.strokeStyle = hexA(r.color, 1 - t);
      ctx.lineWidth = r.width * (1 - t * 0.6);
      ctx.beginPath();
      ctx.arc(x, y, r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - t, 2)), 0, TAU);
      ctx.stroke();
    }

    for (let i = 0; i < fx.particles.length; i++) {
      const p = fx.particles[i];
      const t = 1 - p.age / p.life;
      ctx.globalAlpha = t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * t), 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (!opts.floats) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (let i = 0; i < fx.floats.length; i++) {
      const f = fx.floats[i];
      const t = f.age / f.life;
      const rise = 46 * (1 - Math.pow(1 - t, 2));
      const pop = t < 0.12 ? 0.7 + (t / 0.12) * 0.45 : 1.15 - Math.min(1, (t - 0.12) / 0.15) * 0.15;
      ctx.globalAlpha = t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1;
      ctx.font = '800 ' + Math.round(f.size * pop) + 'px ' + FONT;
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(6, 8, 14, 0.9)';
      ctx.strokeText(f.text, f.x, f.y - rise);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - rise);
    }
    ctx.globalAlpha = 1;
  }

  function drawBanner(ctx, text) {
    const A = CFG.arena;
    ctx.save();
    ctx.fillStyle = 'rgba(6, 8, 14, 0.45)';
    ctx.fillRect(0, 0, A, A);
    ctx.font = '800 64px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(6, 8, 14, 0.9)';
    ctx.strokeText(text, A / 2, A / 2);
    ctx.fillStyle = '#f4f6fb';
    ctx.fillText(text, A / 2, A / 2);
    ctx.restore();
  }

  /**
   * 画一帧。
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} sizePx   canvas 的像素边长
   * @param {object|null} match
   * @param {object} fx
   * @param {{floats?: boolean, banner?: string, reducedMotion?: boolean}} opts
   */
  function draw(ctx, sizePx, match, fx, opts) {
    opts = opts || {};
    const A = CFG.arena;
    // 方框画在场地外侧一圈，不占用小球能到达的区域。
    const scale = sizePx / (A + FRAME * 2);
    ctx.setTransform(scale, 0, 0, scale, FRAME * scale, FRAME * scale);
    ctx.globalAlpha = 1;
    drawArena(ctx);

    if (match) {
      ctx.save();
      // 方框不参与震动，所以先裁到场地内再平移。
      ctx.beginPath();
      ctx.rect(0, 0, A, A);
      ctx.clip();
      if (fx.shake > 0 && !opts.reducedMotion) {
        ctx.translate(rand(-1, 1) * fx.shake * 0.5, rand(-1, 1) * fx.shake * 0.5);
      }

      const themes = [themeFor(match, 0), themeFor(match, 1)];
      drawBeams(ctx, match, fx, 'warn');
      match.balls.forEach(function (ball, i) {
        if (!fx.dead[i]) drawTrail(ctx, fx, ball, themes[i]);
      });
      match.balls.forEach(function (ball, i) {
        if (!fx.dead[i]) DRAW[ball.type].under(ctx, match, fx, ball, themes[i]);
      });
      drawBeams(ctx, match, fx, 'fire');
      match.balls.forEach(function (ball, i) {
        if (!fx.dead[i]) drawBall(ctx, match, fx, ball, themes[i], opts);
      });
      match.balls.forEach(function (ball, i) {
        if (!fx.dead[i]) DRAW[ball.type].over(ctx, match, fx, ball, themes[i]);
      });
      drawEffects(ctx, match, fx, opts);
      ctx.restore();
    }

    if (opts.banner) drawBanner(ctx, opts.banner);

    // 正方形方框。
    ctx.strokeStyle = '#dfe6f5';
    ctx.lineWidth = FRAME;
    ctx.strokeRect(-FRAME / 2, -FRAME / 2, A + FRAME, A + FRAME);
  }

  return {
    THEMES: THEMES,
    themeFor: themeFor,
    createFx: createFx,
    handleEvents: handleEvents,
    updateFx: updateFx,
    draw: draw,
  };
});
