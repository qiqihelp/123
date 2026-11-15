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
    flame: [
      { main: '#ff8a2a', light: '#ffe2b8', dark: '#b23a00', ink: '#ffffff', arc: '#fff3d6' },
      { main: '#ff5fa2', light: '#ffd9ea', dark: '#a3175a', ink: '#ffffff', arc: '#ffffff' },
    ],
    spore: [
      { main: '#7ddc5a', light: '#e1fbd2', dark: '#2f7d1c', ink: '#0d2a05', arc: '#ffffff' },
      { main: '#3fd6b0', light: '#d3fbf0', dark: '#0f7a62', ink: '#00271f', arc: '#ffffff' },
    ],
    tech: [
      { main: '#4d9bff', light: '#d6e8ff', dark: '#1b4fa8', ink: '#ffffff', arc: '#ffffff' },
      { main: '#c9d3e6', light: '#ffffff', dark: '#66728c', ink: '#10203a', arc: '#ffffff' },
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
      bolts: [],
      zaps: [],
      beams: [],
      flash: 0,
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
          const heavy = e.kind === 'laser' || e.kind === 'thunder' || e.kind === 'punch' || e.kind === 'nuke' || e.kind === 'tesla';
          const light = e.kind === 'burn' || e.kind === 'spore' || e.kind === 'wire';
          burst(fx, target.x, target.y, color, heavy ? 14 : light ? 3 : 7, 190, 0.45, 3);
          fx.shake = Math.max(fx.shake, heavy ? 7 : light ? 1.5 : 3.5);
          if (opts.floats) {
            const size = e.kind === 'nuke' ? 36 : e.kind === 'punch' ? 30 : heavy ? 24 : light ? 17 : 22;
            floatText(fx, target.x + rand(-12, 12), target.y - target.r - 10, '-' + Math.round(e.amount * 10) / 10, color, size);
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
        case 'deploy': {
          if (!e.burst) break;
          const ball = match.balls[e.ball];
          const color = themeFor(match, e.ball).main;
          fx.rings.push({ x: ball.x, y: ball.y, r0: ball.r, r1: 120, age: 0, life: 0.4, color: color, width: 3 });
          if (opts.floats) floatText(fx, ball.x, ball.y - ball.r - 14, '激光阵！', color, 20);
          break;
        }
        case 'deviceLand':
          burst(fx, e.x, e.y, themeFor(match, e.owner).main, 6, 110, 0.3, 2.2);
          break;
        case 'deviceFire':
          burst(fx, e.x, e.y, '#ffffff', 8, 200, 0.3, 2.4);
          fx.shake = Math.max(fx.shake, 3);
          break;
        case 'oreSpawn':
          fx.rings.push({ x: e.x, y: e.y, r0: 4, r1: 26, age: 0, life: 0.4, color: oreColor(e.ore), width: 2 });
          break;
        case 'mine': {
          const color = oreColor(e.ore);
          burst(fx, e.x, e.y, color, 10, 170, 0.4, 2.6);
          if (opts.floats && !e.drone) floatText(fx, e.x, e.y - 16, '+' + e.amount + ' ' + CFG.tech.resourceNames[e.ore], color, 17);
          break;
        }
        case 'deliver': {
          const color = oreColor(e.ore);
          burst(fx, e.x, e.y, color, 4, 90, 0.3, 2);
          if (opts.floats) floatText(fx, e.x + rand(-14, 14), e.y - 20, '+' + e.amount + ' ' + CFG.tech.resourceNames[e.ore], color, 15);
          break;
        }
        case 'refine':
          fx.rings.push({ x: e.x, y: e.y, r0: 6, r1: 34, age: 0, life: 0.4, color: '#d6ff3f', width: 3 });
          if (opts.floats) floatText(fx, e.x, e.y - 20, '+1 浓缩铀', '#d6ff3f', 16);
          break;
        case 'shieldHit':
          fx.rings.push({ x: e.x, y: e.y, r0: CFG.ballR + 6, r1: CFG.ballR + 22, age: 0, life: 0.25, color: '#7fd8ff', width: 4, follow: e.target });
          break;
        case 'teslaFire':
          fx.beams.push({ x: e.x, y: e.y, tx: e.tx, ty: e.ty, color: '#c9a6ff', age: 0, life: 0.2, path: bolt(e.x, e.y, e.tx, e.ty, 12, 7) });
          break;
        case 'gridTrip':
          floatText(fx, e.x, e.y - 30, '电力不足！全部停工', '#ff5a5a', 20);
          fx.rings.push({ x: e.x, y: e.y, r0: 10, r1: 80, age: 0, life: 0.5, color: '#ff5a5a', width: 4 });
          break;
        case 'gridRestore':
          floatText(fx, e.x, e.y - 30, '恢复供电', '#3ddc84', 18);
          break;
        case 'coreLost':
          floatText(fx, e.x, e.y - 30, '核心被毁！库存减半', '#ff5a5a', 20);
          fx.shake = Math.max(fx.shake, 12);
          break;
        case 'buildStart':
          burst(fx, e.x, e.y, themeFor(match, e.owner).light, 6, 90, 0.35, 2.2);
          break;
        case 'buildDone': {
          const big = e.kind === 'plant' || e.kind === 'silo';
          fx.rings.push({ x: e.x, y: e.y, r0: 8, r1: big ? 70 : 44, age: 0, life: 0.45, color: themeFor(match, e.owner).main, width: big ? 5 : 3 });
          break;
        }
        case 'buildingHit':
          burst(fx, e.x, e.y, '#dfe6f5', 3, 110, 0.25, 2);
          break;
        case 'buildingDie': {
          const color = themeFor(match, e.owner).main;
          fx.rings.push({ x: e.x, y: e.y, r0: 8, r1: 60, age: 0, life: 0.4, color: color, width: 4 });
          burst(fx, e.x, e.y, color, 16, 220, 0.5, 3.2);
          burst(fx, e.x, e.y, '#8a93a8', 8, 140, 0.6, 3);
          fx.shake = Math.max(fx.shake, 6);
          break;
        }
        case 'turretFire':
          fx.beams.push({ x: e.x, y: e.y, tx: e.tx, ty: e.ty, color: themeFor(match, e.owner).main, small: !!e.small, age: 0, life: 0.14 });
          break;
        case 'wireZap':
          burst(fx, e.x, e.y, themeFor(match, e.owner).arc, 6, 180, 0.25, 2.2);
          break;
        case 'nukeLaunch':
          burst(fx, e.x, e.y, '#ffd23f', 18, 240, 0.5, 3.4);
          fx.rings.push({ x: e.x, y: e.y, r0: 10, r1: 60, age: 0, life: 0.4, color: '#ffd23f', width: 4 });
          fx.shake = Math.max(fx.shake, 6);
          break;
        case 'nuke': {
          fx.flash = 0.55;
          fx.rings.push({ x: e.x, y: e.y, r0: 20, r1: e.radius, age: 0, life: 0.7, color: '#fff1b8', width: 16 });
          fx.rings.push({ x: e.x, y: e.y, r0: 10, r1: e.radius * 1.5, age: 0, life: 1.0, color: '#ff8a2a', width: 8 });
          fx.rings.push({ x: e.x, y: e.y, r0: 6, r1: e.radius * 0.7, age: 0, life: 0.5, color: '#ffffff', width: 10 });
          burst(fx, e.x, e.y, '#ffd23f', 40, 460, 0.9, 5);
          burst(fx, e.x, e.y, '#ff6a2a', 30, 300, 1.1, 6);
          burst(fx, e.x, e.y, '#6b7388', 20, 160, 1.3, 7);
          fx.shake = Math.max(fx.shake, 26);
          break;
        }
        case 'burn':
          break;
        case 'zap':
          fx.zaps.push({ ball: e.ball, x: e.x, y: e.y, age: 0, life: 0.14 });
          break;
        case 'thunder': {
          const color = themeFor(match, e.owner).main;
          fx.bolts.push({ x: e.x, y: e.y, color: color, age: 0, life: 0.28, path: bolt(e.x + rand(-40, 40), -10, e.x, e.y, 16, 9) });
          fx.rings.push({ x: e.x, y: e.y, r0: 10, r1: CFG.electric.thunderRadius + 14, age: 0, life: 0.35, color: color, width: 5 });
          burst(fx, e.x, e.y, color, 10, 220, 0.4, 3);
          fx.shake = Math.max(fx.shake, e.hit ? 8 : 3);
          break;
        }
        case 'flameHit':
        case 'flamePunch': {
          const color = themeFor(match, e.ball).main;
          const big = e.type === 'flamePunch';
          fx.rings.push({ x: e.x, y: e.y, r0: 12, r1: e.radius, age: 0, life: big ? 0.5 : 0.35, color: color, width: big ? 10 : 6 });
          fx.rings.push({ x: e.x, y: e.y, r0: 6, r1: e.radius * 0.6, age: 0, life: big ? 0.4 : 0.28, color: '#fff3d6', width: big ? 5 : 3 });
          burst(fx, e.x, e.y, color, big ? 34 : 14, big ? 380 : 240, big ? 0.7 : 0.45, big ? 4.5 : 3.2);
          fx.shake = Math.max(fx.shake, big ? 16 : 6);
          break;
        }
        case 'ultWindup': {
          const ball = match.balls[e.ball];
          fx.rings.push({ x: ball.x, y: ball.y, r0: 90, r1: ball.r, age: 0, life: 0.5, color: themeFor(match, e.ball).main, width: 3, follow: e.ball });
          break;
        }
        case 'ultDash':
          burst(fx, e.x, e.y, themeFor(match, e.ball).main, 16, 260, 0.45, 3.5);
          fx.shake = Math.max(fx.shake, 5);
          break;
        case 'dashEnd':
          if (!e.hit) burst(fx, e.x, e.y, themeFor(match, e.ball).main, 10, 200, 0.4, 3);
          break;
        case 'sporeRelease':
          fx.rings.push({ x: e.x, y: e.y, r0: 8, r1: 40, age: 0, life: 0.3, color: themeFor(match, e.owner).main, width: 3 });
          break;
        case 'sprout':
        case 'mushroomGrow':
          burst(fx, e.x, e.y, themeFor(match, e.owner).light, 3, 60, 0.3, 2);
          break;
        case 'mushroomPop':
        case 'mushroomBurst':
        case 'mushroomDie':
          burst(fx, e.x, e.y, themeFor(match, e.owner).main, 7, 130, 0.35, 2.6);
          break;
        case 'sporeDie':
          burst(fx, e.x, e.y, themeFor(match, e.owner).main, 2, 60, 0.25, 1.8);
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
    for (let i = fx.bolts.length - 1; i >= 0; i--) {
      fx.bolts[i].age += dt;
      if (fx.bolts[i].age >= fx.bolts[i].life) fx.bolts.splice(i, 1);
    }
    fx.flash = Math.max(0, fx.flash - dt);
    for (let i = fx.beams.length - 1; i >= 0; i--) {
      fx.beams[i].age += dt;
      if (fx.beams[i].age >= fx.beams[i].life) fx.beams.splice(i, 1);
    }
    for (let i = fx.zaps.length - 1; i >= 0; i--) {
      fx.zaps[i].age += dt;
      if (fx.zaps[i].age >= fx.zaps[i].life) fx.zaps.splice(i, 1);
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
    flame: {
      /** 灼热光晕；蓄力时画瞄准线和收拢的火圈。 */
      under: function (ctx, match, fx, ball, theme) {
        const ult = ball.ult;
        const pulse = 0.5 + 0.5 * Math.sin(fx.time * 9);
        const glowR = ball.r + 16 + pulse * 5 + (ult.phase === 'idle' ? 0 : 16);
        const aura = ctx.createRadialGradient(ball.x, ball.y, ball.r * 0.6, ball.x, ball.y, glowR);
        aura.addColorStop(0, hexA(theme.main, 0.45));
        aura.addColorStop(1, hexA(theme.main, 0));
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, glowR, 0, TAU);
        ctx.fill();

        if (ult.phase === 'windup') {
          const t = 1 - ult.timer / CFG.flame.ultWindup; // 0 → 1
          const len = CFG.arena * 1.5;
          ctx.save();
          ctx.translate(ball.x, ball.y);
          ctx.rotate(ult.aim);
          ctx.fillStyle = hexA(theme.main, 0.1 + 0.22 * t);
          ctx.fillRect(0, -ball.r, len, ball.r * 2);
          ctx.strokeStyle = hexA(theme.arc, 0.35 + 0.5 * t);
          ctx.lineWidth = 2;
          ctx.setLineDash([14, 10]);
          ctx.lineDashOffset = -fx.time * 120;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(len, 0);
          ctx.stroke();
          ctx.restore();

          ctx.save();
          ctx.strokeStyle = hexA(theme.main, 0.9);
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.r + 6 + (1 - t) * 44, 0, TAU);
          ctx.stroke();
          ctx.restore();
        } else if (ult.phase === 'idle') {
          // 怒气圈。
          const ratio = Math.min(1, ult.energy / CFG.flame.ultEnergy);
          ctx.save();
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.strokeStyle = hexA(theme.main, 0.18);
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.r + 8, 0, TAU);
          ctx.stroke();
          if (ratio > 0) {
            ctx.strokeStyle = theme.main;
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
            ctx.stroke();
          }
          ctx.restore();
        }
      },
      over: function () {},
      body: function (ctx, ball, theme) {
        // 一簇火苗。
        const r = ball.r;
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.fillStyle = hexA(theme.light, 0.5);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.82);
        ctx.bezierCurveTo(r * 0.62, -r * 0.2, r * 0.6, r * 0.55, 0, r * 0.7);
        ctx.bezierCurveTo(-r * 0.6, r * 0.55, -r * 0.5, -r * 0.05, -r * 0.2, -r * 0.3);
        ctx.bezierCurveTo(-r * 0.1, -r * 0.1, -r * 0.05, -r * 0.5, 0, -r * 0.82);
        ctx.fill();
        ctx.restore();
      },
    },
    spore: {
      /** 下一波孢子的进度圈。 */
      under: function (ctx, match, fx, ball, theme) {
        const ratio = Math.max(0, Math.min(1, 1 - ball.sporeTimer / CFG.spore.interval));
        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = hexA(theme.main, 0.18);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r + 8, 0, TAU);
        ctx.stroke();
        if (ratio > 0) {
          ctx.strokeStyle = theme.main;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
          ctx.stroke();
        }
        ctx.restore();
      },
      over: function () {},
      body: function (ctx, ball, theme) {
        // 菌盖上的斑点。
        const r = ball.r;
        const spots = [[-0.45, -0.4, 0.2], [0.42, -0.35, 0.16], [0.55, 0.3, 0.14], [-0.5, 0.35, 0.17], [0, -0.68, 0.11], [0.05, 0.66, 0.12]];
        ctx.fillStyle = hexA(theme.light, 0.7);
        for (let i = 0; i < spots.length; i++) {
          ctx.beginPath();
          ctx.arc(ball.x + spots[i][0] * r, ball.y + spots[i][1] * r, spots[i][2] * r, 0, TAU);
          ctx.fill();
        }
      },
    },
    tech: {
      /** 电量圈 + 施工位置的标记。 */
      under: function (ctx, match, fx, ball, theme) {
        const ratio = Math.max(0, Math.min(1, ball.grid.ratio / 2)); // 供电率，满圈 = 200%
        ctx.save();
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.strokeStyle = hexA(theme.main, 0.18);
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r + 8, 0, TAU);
        ctx.stroke();
        if (ratio > 0) {
          ctx.strokeStyle = theme.main;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.r + 8, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
          ctx.stroke();
        }
        if (ball.shield > 0.5) {
          const k = ball.shield / CFG.tech.shieldMax;
          ctx.fillStyle = 'rgba(127, 216, 255, ' + (0.06 + 0.1 * k) + ')';
          ctx.strokeStyle = 'rgba(127, 216, 255, ' + (0.35 + 0.5 * k) + ')';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(ball.x, ball.y, ball.r + 15, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
        if (ball.site) {
          ctx.strokeStyle = hexA(theme.light, 0.7);
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.lineDashOffset = -fx.time * 30;
          ctx.strokeRect(ball.site.x - 15, ball.site.y - 15, 30, 30);
          ctx.strokeStyle = hexA(theme.light, 0.22);
          ctx.beginPath();
          ctx.moveTo(ball.x, ball.y);
          ctx.lineTo(ball.site.x, ball.site.y);
          ctx.stroke();
        }
        ctx.restore();
      },
      over: function () {},
      body: function (ctx, ball, theme) {
        // 齿轮。
        const r = ball.r;
        ctx.save();
        ctx.translate(ball.x, ball.y);
        ctx.fillStyle = hexA(theme.light, 0.55);
        for (let i = 0; i < 8; i++) {
          ctx.rotate(TAU / 8);
          ctx.fillRect(-r * 0.11, -r * 0.86, r * 0.22, r * 0.24);
        }
        ctx.strokeStyle = hexA(theme.light, 0.6);
        ctx.lineWidth = r * 0.12;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.62, 0, TAU);
        ctx.stroke();
        ctx.restore();
      },
    },
  };

  // ---------------------------------------------------------------------
  // 科技球的东西：矿物、电线、设备、核弹
  // ---------------------------------------------------------------------

  const ORE_COLOR = '#8fe9ff';
  const ORE_COLORS = { iron: '#c3ccda', copper: '#ff9d5c', silicon: '#8fe9ff', coal: '#6b7388', uranium: '#9dff6a', fuel: '#d6ff3f' };

  function oreColor(type) {
    return ORE_COLORS[type] || ORE_COLOR;
  }

  function drawOres(ctx, match, fx) {
    for (let i = 0; i < match.ores.length; i++) {
      const o = match.ores[i];
      const r = CFG.tech.oreRadius;
      const color = oreColor(o.type);
      const glint = 0.5 + 0.5 * Math.sin(fx.time * 3 + o.id);
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.fillStyle = hexA(color, (o.type === 'uranium' ? 0.22 : 0.1) + 0.08 * glint);
      ctx.beginPath();
      ctx.arc(0, 0, r + 8, 0, TAU);
      ctx.fill();
      // 整块矿石
      ctx.fillStyle = hexA(color, 0.55);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, -r * 0.1); ctx.lineTo(r * 0.45, r); ctx.lineTo(-r * 0.45, r); ctx.lineTo(-r * 0.8, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // 亮面
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.8, -r * 0.1); ctx.lineTo(0, r * 0.15); ctx.lineTo(-r * 0.8, -r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = hexA('#ffffff', 0.4 + 0.5 * glint);
      ctx.beginPath();
      ctx.arc(-r * 0.25, -r * 0.4, 2, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawWires(ctx, match, fx) {
    for (let i = 0; i < match.wires.length; i++) {
      const w = match.wires[i];
      const theme = themeFor(match, w.owner);
      const grid = match.balls[w.owner].grid;
      ctx.save();
      ctx.lineCap = 'round';
      if (!w.live) {
        // 没通电：施工中是灰色虚线，跳闸是红色虚线。
        const tripped = grid && grid.tripped && w.a.active && w.b.active;
        ctx.strokeStyle = tripped
          ? 'rgba(255, 90, 90, ' + (0.35 + 0.35 * (Math.sin(fx.time * 8) > 0 ? 1 : 0)) + ')'
          : 'rgba(160, 172, 196, 0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(w.a.x, w.a.y);
        ctx.lineTo(w.b.x, w.b.y);
        ctx.stroke();
      } else {
        ctx.strokeStyle = hexA(theme.main, 0.28);
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(w.a.x, w.a.y);
        ctx.lineTo(w.b.x, w.b.y);
        ctx.stroke();
        ctx.strokeStyle = theme.main;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        // 电流的方向：发电的支路往核心回送，用电的支路从电网取电。
        const flow = w.b.flow || 0;
        if (Math.abs(flow) > 0.05) {
          const from = flow > 0 ? w.b : w.a;
          const to = flow > 0 ? w.a : w.b;
          const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
          const n = Math.max(1, Math.round(len / 70));
          const speed = 50 + Math.min(220, Math.abs(flow) * 9);
          ctx.fillStyle = flow > 0 ? '#fff3b0' : '#ffffff';
          const size = 2.2 + Math.min(2.5, Math.abs(flow) / 12);
          for (let k = 0; k < n; k++) {
            const t = ((fx.time * speed) / len + k / n) % 1;
            ctx.beginPath();
            ctx.arc(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, size, 0, TAU);
            ctx.fill();
          }
        }
      }
      ctx.restore();
    }
  }

  /** 传送带：从传送带设备一路铺到核心，上面滚着矿。 */
  function drawBelts(ctx, match, fx) {
    for (let i = 0; i < match.buildings.length; i++) {
      const b = match.buildings[i];
      if (b.kind !== 'conveyor') continue;
      let core = null;
      for (let j = 0; j < match.buildings.length; j++) {
        const c = match.buildings[j];
        if (c.owner === b.owner && c.kind === 'core') { core = c; break; }
      }
      if (!core) continue;
      const running = b.active && b.status !== 'nopower';
      ctx.save();
      ctx.globalAlpha = b.active ? 1 : 0.45;
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#2a3145';
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(core.x, core.y);
      ctx.stroke();
      ctx.strokeStyle = '#4a556f';
      ctx.lineWidth = 10;
      ctx.setLineDash([8, 8]);
      ctx.lineDashOffset = running ? -fx.time * 60 : 0;
      ctx.stroke();
      ctx.setLineDash([]);
      for (let j = 0; j < b.items.length; j++) {
        const item = b.items[j];
        const x = b.x + (core.x - b.x) * item.t;
        const y = b.y + (core.y - b.y) * item.t;
        ctx.fillStyle = oreColor(item.type);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(x - 4.5, y - 4.5, 9, 9);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function iconText(ctx, text, r, color) {
    ctx.font = '800 ' + Math.round(r * 1.05) + 'px ' + FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 1);
  }

  /** 各种设备的图标（原点在设备中心）。 */
  function drawBuildingIcon(ctx, match, fx, b, theme) {
    const T = CFG.tech;
    const r = b.r;
    const on = b.active && (b.status === 'working' || b.status === 'lowpower');
    switch (b.kind) {
      case 'core': {
        const pulse = 0.5 + 0.5 * Math.sin(fx.time * 3);
        ctx.fillStyle = theme.main;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = k * (TAU / 6) + Math.PI / 6;
          ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78);
        }
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = hexA('#ffffff', 0.6 + 0.4 * pulse);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.3, 0, TAU);
        ctx.fill();
        break;
      }
      case 'generator':
        ctx.fillStyle = theme.main;
        ctx.beginPath();
        ctx.moveTo(r * 0.15, -r * 0.7); ctx.lineTo(-r * 0.45, r * 0.1); ctx.lineTo(-r * 0.05, r * 0.1);
        ctx.lineTo(-r * 0.2, r * 0.7); ctx.lineTo(r * 0.45, -r * 0.15); ctx.lineTo(r * 0.05, -r * 0.15);
        ctx.closePath();
        ctx.fill();
        break;
      case 'solar':
        ctx.fillStyle = '#2f6fd6';
        ctx.fillRect(-r * 0.75, -r * 0.75, r * 1.5, r * 1.5);
        ctx.strokeStyle = '#bfe0ff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.75); ctx.lineTo(0, r * 0.75);
        ctx.moveTo(-r * 0.75, 0); ctx.lineTo(r * 0.75, 0);
        ctx.moveTo(-r * 0.75, -r * 0.75); ctx.lineTo(r * 0.75, r * 0.75);
        ctx.stroke();
        break;
      case 'coal':
        // 厂房 + 烟囱，开工时冒烟
        ctx.fillStyle = '#8a93a8';
        ctx.fillRect(-r * 0.7, -r * 0.05, r * 1.4, r * 0.75);
        ctx.fillRect(r * 0.15, -r * 0.75, r * 0.38, r * 0.8);
        ctx.fillStyle = on ? '#ff9d5c' : '#3a4156';
        ctx.fillRect(-r * 0.5, r * 0.2, r * 0.35, r * 0.3);
        if (on) {
          for (let k = 0; k < 3; k++) {
            const t = (fx.time * 0.8 + k / 3) % 1;
            ctx.fillStyle = 'rgba(200, 205, 215, ' + 0.5 * (1 - t) + ')';
            ctx.beginPath();
            ctx.arc(r * 0.34 + t * 8, -r * 0.8 - t * 16, 3 + t * 5, 0, TAU);
            ctx.fill();
          }
        }
        break;
      case 'plant': {
        ctx.fillStyle = on ? '#ffd23f' : '#8a7a3a';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.82, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        for (let k = 0; k < 3; k++) {
          const a = -Math.PI / 2 + k * (TAU / 3);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, r * 0.7, a - 0.5, a + 0.5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.fillStyle = on ? '#ffd23f' : '#8a7a3a';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.22, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.12, 0, TAU);
        ctx.fill();
        break;
      }
      case 'battery': {
        const level = Math.max(0, Math.min(1, b.stored / T.batteryCapacity));
        ctx.strokeStyle = '#dfe6f5';
        ctx.lineWidth = 1.6;
        ctx.strokeRect(-r * 0.45, -r * 0.6, r * 0.9, r * 1.25);
        ctx.fillStyle = '#dfe6f5';
        ctx.fillRect(-r * 0.2, -r * 0.78, r * 0.4, r * 0.18);
        ctx.fillStyle = level > 0.3 ? '#3ddc84' : '#ff5a5a';
        ctx.fillRect(-r * 0.36, r * 0.56 - r * 1.07 * level, r * 0.72, r * 1.07 * level);
        break;
      }
      case 'miner':
        iconText(ctx, '矿', r, theme.light);
        break;
      case 'repair':
        ctx.fillStyle = '#3ddc84';
        ctx.fillRect(-r * 0.16, -r * 0.6, r * 0.32, r * 1.2);
        ctx.fillRect(-r * 0.6, -r * 0.16, r * 1.2, r * 0.32);
        break;
      case 'conveyor':
        ctx.strokeStyle = theme.light;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        for (let k = -1; k <= 1; k++) {
          ctx.beginPath();
          ctx.moveTo(k * r * 0.42 - r * 0.15, -r * 0.42);
          ctx.lineTo(k * r * 0.42 + r * 0.2, 0);
          ctx.lineTo(k * r * 0.42 - r * 0.15, r * 0.42);
          ctx.stroke();
        }
        break;
      case 'centrifuge': {
        const spin = b.progress > 0 && on ? fx.time * 9 : 0;
        ctx.strokeStyle = '#9dff6a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.68, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = '#9dff6a';
        for (let k = 0; k < 3; k++) {
          const a = spin + k * (TAU / 3);
          ctx.beginPath();
          ctx.arc(Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, r * 0.17, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'turret':
        ctx.save();
        ctx.rotate(b.aim);
        ctx.fillStyle = theme.light;
        ctx.fillRect(0, -3, r + 6, 6);
        ctx.fillStyle = theme.main;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.55, 0, TAU);
        ctx.fill();
        ctx.restore();
        break;
      case 'tesla': {
        ctx.strokeStyle = '#c9a6ff';
        ctx.lineWidth = 2;
        for (let k = 1; k <= 3; k++) {
          ctx.beginPath();
          ctx.arc(0, 0, r * 0.25 * k, 0, TAU);
          ctx.stroke();
        }
        ctx.fillStyle = on && Math.sin(fx.time * 20) > 0 ? '#ffffff' : '#c9a6ff';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.2, 0, TAU);
        ctx.fill();
        break;
      }
      case 'shield':
        ctx.strokeStyle = '#7fd8ff';
        ctx.fillStyle = hexA('#7fd8ff', on ? 0.35 : 0.1);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.7);
        ctx.lineTo(r * 0.6, -r * 0.4);
        ctx.lineTo(r * 0.5, r * 0.25);
        ctx.lineTo(0, r * 0.72);
        ctx.lineTo(-r * 0.5, r * 0.25);
        ctx.lineTo(-r * 0.6, -r * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      case 'silo': {
        // 井口 + 弹头，外圈是充能进度
        const ratio = Math.min(1, b.charge / T.nukeTime);
        ctx.fillStyle = '#0b0f1a';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, 0, TAU);
        ctx.fill();
        ctx.fillStyle = ratio >= 0.85 && Math.sin(fx.time * 16) > 0 ? '#ffffff' : '#ff4d4d';
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.36, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.72, -Math.PI / 2, -Math.PI / 2 + TAU * ratio);
        ctx.stroke();
        break;
      }
      default:
        break;
    }
  }

  function drawBuildings(ctx, match, fx, selected) {
    const T = CFG.tech;
    const blink = Math.sin(fx.time * 8) > 0;
    for (let i = 0; i < match.buildings.length; i++) {
      const b = match.buildings[i];
      const theme = themeFor(match, b.owner);
      const r = b.r;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.globalAlpha = b.active ? 1 : 0.55;

      if (b.kind === 'plant' && b.status === 'working') {
        const pulse = 0.5 + 0.5 * Math.sin(fx.time * 4);
        ctx.fillStyle = hexA('#9dff6a', 0.12 + 0.1 * pulse);
        ctx.beginPath();
        ctx.arc(0, 0, r + 12 + pulse * 4, 0, TAU);
        ctx.fill();
      }
      // 底座：停工的设备边框变红。
      const stopped = b.active && (b.status === 'nopower' || b.status === 'nofuel');
      ctx.fillStyle = '#1a2236';
      ctx.strokeStyle = stopped ? (blink ? '#ff5a5a' : '#7a2a2a') : theme.main;
      ctx.lineWidth = 2.5;
      roundRect(ctx, -r, -r, r * 2, r * 2, 6);
      ctx.fill();
      ctx.stroke();
      if (stopped) ctx.globalAlpha = 0.5;
      drawBuildingIcon(ctx, match, fx, b, theme);
      ctx.restore();

      // 状态角标：没电 = 红色闪电，缺燃料 = 橙色感叹号，电压不足 = 黄点。
      if (b.active && b.status !== 'working' && b.status !== 'idle') {
        const bx = b.x + r - 2;
        const by = b.y - r + 2;
        ctx.fillStyle = b.status === 'nopower' ? '#ff4d4d' : b.status === 'nofuel' ? '#ff9d2a' : '#ffd23f';
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, TAU);
        ctx.fill();
        ctx.font = '800 10px ' + FONT;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#10131c';
        ctx.fillText(b.status === 'nopower' ? '⚡' : b.status === 'nofuel' ? '!' : '↓', bx, by + 0.5);
      }

      // 施工进度 / 血条
      if (!b.active) {
        ctx.strokeStyle = hexA(theme.light, 0.9);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - b.build / T.buildTime));
        ctx.stroke();
      }
      if (b.hp < b.maxHp) {
        const w = r * 2;
        ctx.fillStyle = 'rgba(6, 8, 14, 0.8)';
        ctx.fillRect(b.x - w / 2, b.y + r + 4, w, 4);
        ctx.fillStyle = b.hp / b.maxHp > 0.4 ? '#3ddc84' : '#ff5a5a';
        ctx.fillRect(b.x - w / 2, b.y + r + 4, w * Math.max(0, b.hp / b.maxHp), 4);
      }

      if (selected === b) {
        ctx.save();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -fx.time * 24;
        ctx.strokeRect(b.x - r - 6, b.y - r - 6, r * 2 + 12, r * 2 + 12);
        const range = b.kind === 'turret' ? T.turretRange : b.kind === 'tesla' ? T.teslaRange : 0;
        if (range) {
          ctx.strokeStyle = hexA(theme.main, 0.6);
          ctx.fillStyle = hexA(theme.main, 0.06);
          ctx.beginPath();
          ctx.arc(b.x, b.y, range, 0, TAU);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  /** 采矿 / 维修机器人。 */
  function drawDrones(ctx, match, fx) {
    for (let i = 0; i < match.drones.length; i++) {
      const d = match.drones[i];
      const theme = themeFor(match, d.owner);
      const repair = d.kind === 'repair';
      ctx.save();
      if (repair && d.state === 'work' && d.target) {
        ctx.strokeStyle = 'rgba(61, 220, 132, ' + (0.5 + 0.4 * Math.sin(fx.time * 20)) + ')';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.target.x, d.target.y);
        ctx.stroke();
      }
      if (!repair && d.state === 'mine' && d.target) {
        ctx.strokeStyle = hexA(oreColor(d.target.type), 0.5 + 0.4 * Math.sin(fx.time * 26));
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(d.target.x, d.target.y, CFG.tech.oreRadius + 5, 0, TAU);
        ctx.stroke();
      }
      ctx.translate(d.x, d.y);
      // 四个旋翼
      const spin = fx.time * 14 + d.id;
      ctx.fillStyle = 'rgba(223, 230, 245, 0.45)';
      for (let k = 0; k < 4; k++) {
        const a = Math.PI / 4 + k * (Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 4.5, 1.6, spin + k, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = repair ? '#3ddc84' : theme.main;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, 5.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      if (d.carry) {
        ctx.fillStyle = oreColor(d.carry.type);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-4, 5, 8, 8);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /** 飞行中的核弹：落点警告圈 + 弹头。 */
  function drawNukes(ctx, match, fx) {
    const T = CFG.tech;
    for (let i = 0; i < match.nukes.length; i++) {
      const n = match.nukes[i];
      const t = Math.max(0, Math.min(1, 1 - n.timer / T.nukeDelay));
      const blink = Math.sin(fx.time * (10 + t * 30)) > 0;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 60, 60, ' + (0.08 + 0.16 * t) + ')';
      ctx.beginPath();
      ctx.arc(n.x, n.y, T.nukeRadius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = blink ? '#ffd23f' : '#ff4d4d';
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 9]);
      ctx.lineDashOffset = -fx.time * 60;
      ctx.beginPath();
      ctx.arc(n.x, n.y, T.nukeRadius, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(n.x, n.y, T.nukeRadius * (1 - t), 0, TAU);
      ctx.moveTo(n.x - 14, n.y); ctx.lineTo(n.x + 14, n.y);
      ctx.moveTo(n.x, n.y - 14); ctx.lineTo(n.x, n.y + 14);
      ctx.stroke();

      // 弹头：沿抛物线飞过去，越高越大。
      const height = Math.sin(t * Math.PI);
      const mx = n.sx + (n.x - n.sx) * t;
      const my = n.sy + (n.y - n.sy) * t - height * 70;
      const size = 7 + height * 7;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.beginPath();
      ctx.ellipse(n.sx + (n.x - n.sx) * t, n.sy + (n.y - n.sy) * t, size, size * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath();
      ctx.arc(mx, my, size + 4 + Math.sin(fx.time * 40) * 2, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#f4f6fb';
      ctx.beginPath();
      ctx.arc(mx, my, size, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      ctx.arc(mx, my, size * 0.45, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /** 炮塔的电磁炮弹道。 */
  function drawBeams(ctx, fx) {
    if (!fx.beams.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 0; i < fx.beams.length; i++) {
      const b = fx.beams[i];
      const a = 1 - b.age / b.life;
      ctx.strokeStyle = hexA(b.color, 0.8 * a);
      ctx.lineWidth = b.small ? 3 : 6;
      ctx.beginPath();
      if (b.path) {
        ctx.moveTo(b.path[0][0], b.path[0][1]);
        for (let k = 1; k < b.path.length; k++) ctx.lineTo(b.path[k][0], b.path[k][1]);
      } else {
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.tx, b.ty);
      }
      ctx.stroke();
      ctx.strokeStyle = hexA('#ffffff', a);
      ctx.lineWidth = b.small ? 1 : 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------------
  // 场上的东西：落雷、孢子、蘑菇、灼烧
  // ---------------------------------------------------------------------

  /** 落雷预警圈：越接近劈下来越亮。 */
  function drawStrikes(ctx, match, fx) {
    const E = CFG.electric;
    for (let i = 0; i < match.strikes.length; i++) {
      const s = match.strikes[i];
      const theme = themeFor(match, s.owner);
      const t = 1 - s.timer / E.thunderDelay;
      ctx.fillStyle = hexA(theme.main, 0.08 + 0.2 * t);
      ctx.beginPath();
      ctx.arc(s.x, s.y, E.thunderRadius, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = hexA(theme.main, 0.5 + 0.5 * t);
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.arc(s.x, s.y, E.thunderRadius, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = hexA(theme.arc, 0.9);
      ctx.beginPath();
      ctx.arc(s.x, s.y, E.thunderRadius * (1 - t), 0, TAU);
      ctx.stroke();
    }
  }

  function drawMushrooms(ctx, match) {
    const S = CFG.spore;
    for (let i = 0; i < match.mushrooms.length; i++) {
      const m = match.mushrooms[i];
      const theme = themeFor(match, m.owner);
      const mature = m.stage === 'mature';
      const r = mature ? S.matureRadius : S.youngRadius;
      // 菌柄
      ctx.fillStyle = hexA(theme.light, 0.95);
      ctx.beginPath();
      ctx.rect(m.x - r * 0.3, m.y - r * 0.1, r * 0.6, r * 0.95);
      ctx.fill();
      // 菌盖
      ctx.fillStyle = mature ? theme.main : hexA(theme.main, 0.75);
      ctx.beginPath();
      ctx.arc(m.x, m.y, r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = theme.dark;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (mature) {
        ctx.fillStyle = hexA(theme.light, 0.9);
        ctx.beginPath();
        ctx.arc(m.x - r * 0.4, m.y - r * 0.45, r * 0.17, 0, TAU);
        ctx.arc(m.x + r * 0.35, m.y - r * 0.5, r * 0.14, 0, TAU);
        ctx.fill();
        // 快要分裂时鼓起来的圈。
        const t = Math.min(1, m.age / S.matureTime);
        ctx.strokeStyle = hexA(theme.main, 0.25 + 0.6 * t);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(m.x, m.y, r + 4, -Math.PI / 2, -Math.PI / 2 + TAU * t);
        ctx.stroke();
      }
      if (m.hp < S.mushroomHp) {
        ctx.strokeStyle = 'rgba(10, 12, 20, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.x - r * 0.2, m.y - r * 0.9);
        ctx.lineTo(m.x + r * 0.1, m.y - r * 0.45);
        ctx.lineTo(m.x - r * 0.1, m.y - r * 0.1);
        ctx.stroke();
      }
    }
  }

  function drawSpores(ctx, match) {
    const S = CFG.spore;
    for (let i = 0; i < match.spores.length; i++) {
      const s = match.spores[i];
      const theme = themeFor(match, s.owner);
      ctx.fillStyle = hexA(theme.main, 0.28);
      ctx.beginPath();
      ctx.arc(s.x, s.y, S.sporeRadius + 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = theme.light;
      ctx.beginPath();
      ctx.arc(s.x, s.y, S.sporeRadius * 0.75, 0, TAU);
      ctx.fill();
    }
  }

  /** 灼烧中的球：身上窜火苗。 */
  function drawBurn(ctx, fx, ball) {
    if (!ball.burn) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const a = i * 1.047 + fx.time * 2.2;
      const flick = 0.5 + 0.5 * Math.sin(fx.time * 17 + i * 2.1);
      const d = ball.r + 1 + flick * 5;
      ctx.fillStyle = i % 2 ? 'rgba(255, 138, 42, 0.75)' : 'rgba(255, 214, 102, 0.75)';
      ctx.beginPath();
      ctx.arc(ball.x + Math.cos(a) * d, ball.y + Math.sin(a) * d - flick * 5, 3 + flick * 3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /** 落雷的闪电、电孢子的电弧。 */
  function drawBolts(ctx, match, fx) {
    if (!fx.bolts.length && !fx.zaps.length) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (let i = 0; i < fx.bolts.length; i++) {
      const b = fx.bolts[i];
      const a = 1 - b.age / b.life;
      ctx.strokeStyle = hexA(b.color, 0.7 * a);
      ctx.lineWidth = 12;
      strokePaths(ctx, [b.path], 0, 0);
      ctx.strokeStyle = hexA('#ffffff', a);
      ctx.lineWidth = 4;
      strokePaths(ctx, [b.path], 0, 0);
    }
    for (let i = 0; i < fx.zaps.length; i++) {
      const z = fx.zaps[i];
      const from = match.balls[z.ball];
      const a = 1 - z.age / z.life;
      const path = bolt(from.x, from.y, z.x, z.y, 7, 5);
      ctx.strokeStyle = hexA(themeFor(match, z.ball).main, 0.8 * a);
      ctx.lineWidth = 5;
      strokePaths(ctx, [path], 0, 0);
      ctx.strokeStyle = hexA('#ffffff', a);
      ctx.lineWidth = 1.5;
      strokePaths(ctx, [path], 0, 0);
    }
    ctx.restore();
  }

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
    for (let p = 60; p < A; p += 60) {
      ctx.moveTo(p, 0); ctx.lineTo(p, A);
      ctx.moveTo(0, p); ctx.lineTo(A, p);
    }
    ctx.stroke();
  }

  /** 装置当前画在哪：飞行中的装置沿一条缓出的线飞向落点。 */
  function devicePos(device) {
    if (device.phase !== 'fly') return { x: device.x, y: device.y, lift: 0 };
    const t = 1 - Math.max(0, device.timer) / CFG.laser.throwTime; // 0 → 1
    const ease = 1 - Math.pow(1 - t, 2);
    return {
      x: device.fromX + (device.x - device.fromX) * ease,
      y: device.fromY + (device.y - device.fromY) * ease,
      lift: Math.sin(t * Math.PI), // 抛物线的“高度”，用来放大一点
    };
  }

  /** 两条穿过 (x, y) 的带子：一横一竖。 */
  function fillCross(ctx, x, y, width) {
    const A = CFG.arena;
    ctx.fillRect(x - width / 2, 0, width, A);
    ctx.fillRect(0, y - width / 2, A, width);
  }

  /** 十字激光：phase='arm' 画预警线，phase='fire' 画激光本体。 */
  function drawCrosses(ctx, match, fx, phase) {
    const L = CFG.laser;
    const A = CFG.arena;
    for (let i = 0; i < match.devices.length; i++) {
      const device = match.devices[i];
      if (device.phase !== phase) continue;
      const theme = themeFor(match, device.owner);

      ctx.save();
      if (phase === 'arm') {
        const t = 1 - device.timer / L.arm; // 0 → 1
        ctx.fillStyle = hexA(theme.main, 0.04 + 0.1 * t);
        fillCross(ctx, device.x, device.y, L.width);
        ctx.strokeStyle = hexA(theme.main, 0.35 + 0.5 * t);
        ctx.lineWidth = 1.5 + t * 1.5;
        ctx.setLineDash([12, 8]);
        ctx.lineDashOffset = -fx.time * 160;
        ctx.beginPath();
        ctx.moveTo(device.x, 0); ctx.lineTo(device.x, A);
        ctx.moveTo(0, device.y); ctx.lineTo(A, device.y);
        ctx.stroke();
      } else {
        const t = 1 - device.timer / L.fire; // 0 → 1
        const grow = t < 0.12 ? t / 0.12 : 1;
        const fade = t > 0.65 ? 1 - ((t - 0.65) / 0.35) * 0.55 : 1;
        const w = L.width * grow * fade;
        const layers = [
          [w * 3, hexA(theme.main, 0.14 * fade)],
          [w * 1.7, hexA(theme.main, 0.38 * fade)],
          [w, theme.main],
          [w * 0.45, '#ffffff'],
        ];
        for (let k = 0; k < layers.length; k++) {
          ctx.fillStyle = layers[k][1];
          fillCross(ctx, device.x, device.y, layers[k][0]);
        }
      }
      ctx.restore();
    }
  }

  /** 激光发射装置本体：一个菱形小盒子，四个方向各有一个发射口。 */
  function drawDevices(ctx, match, fx) {
    const L = CFG.laser;
    for (let i = 0; i < match.devices.length; i++) {
      const device = match.devices[i];
      const theme = themeFor(match, device.owner);
      const pos = devicePos(device);
      const size = 10 * (1 + pos.lift * 0.5);

      ctx.save();
      if (device.phase === 'fly') {
        // 飞行轨迹。
        ctx.strokeStyle = hexA(theme.main, 0.35);
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 6]);
        ctx.beginPath();
        ctx.moveTo(device.fromX, device.fromY);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (device.phase === 'arm') {
        // 蓄力：一个圆环收拢到装置上，收到底就发射。
        const t = 1 - device.timer / L.arm;
        ctx.strokeStyle = hexA(theme.main, 0.25 + 0.6 * t);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 34 - 22 * t, 0, TAU);
        ctx.stroke();
      } else {
        const glow = ctx.createRadialGradient(pos.x, pos.y, 2, pos.x, pos.y, 34);
        glow.addColorStop(0, 'rgba(255,255,255,0.95)');
        glow.addColorStop(0.4, hexA(theme.main, 0.6));
        glow.addColorStop(1, hexA(theme.main, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 34, 0, TAU);
        ctx.fill();
      }

      ctx.translate(pos.x, pos.y);
      // 四个发射口。
      ctx.fillStyle = theme.light;
      ctx.fillRect(-2.5, -size - 4, 5, 6);
      ctx.fillRect(-2.5, size - 2, 5, 6);
      ctx.fillRect(-size - 4, -2.5, 6, 5);
      ctx.fillRect(size - 2, -2.5, 6, 5);
      // 菱形外壳。
      ctx.rotate(Math.PI / 4);
      const half = size * 0.78;
      ctx.fillStyle = '#141a29';
      ctx.strokeStyle = theme.main;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.rect(-half, -half, half * 2, half * 2);
      ctx.fill();
      ctx.stroke();
      // 核心：蓄力时闪烁，发射时全亮。
      const pulse = device.phase === 'fire' ? 1 : 0.55 + 0.45 * Math.sin(fx.time * 26);
      ctx.fillStyle = device.phase === 'fly' ? theme.main : hexA('#ffffff', 0.5 + 0.5 * pulse);
      ctx.beginPath();
      ctx.arc(0, 0, half * 0.42, 0, TAU);
      ctx.fill();
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
    const A = 600; // 调用前已经把画布换算成 600×600
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
    const cam = opts.camera;
    const view = cam ? cam.view : A + FRAME * 2;
    const scale = sizePx / view;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#05070c';
    ctx.fillRect(0, 0, sizePx, sizePx);
    ctx.setTransform(scale, 0, 0, scale,
      sizePx / 2 - (cam ? cam.x : A / 2) * scale, sizePx / 2 - (cam ? cam.y : A / 2) * scale);
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
      drawCrosses(ctx, match, fx, 'arm');
      match.balls.forEach(function (ball, i) {
        if (!fx.dead[i]) drawTrail(ctx, fx, ball, themes[i]);
      });
      match.balls.forEach(function (ball, i) {
        if (!fx.dead[i]) DRAW[ball.type].under(ctx, match, fx, ball, themes[i]);
      });
      drawBelts(ctx, match, fx);
      drawOres(ctx, match, fx);
      drawWires(ctx, match, fx);
      drawStrikes(ctx, match, fx);
      drawMushrooms(ctx, match);
      drawBuildings(ctx, match, fx, opts.selected);
      if (opts.selected && opts.selected.amount != null && match.ores.indexOf(opts.selected) >= 0) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(opts.selected.x, opts.selected.y, CFG.tech.oreRadius + 9, 0, TAU);
        ctx.stroke();
      }
      drawCrosses(ctx, match, fx, 'fire');
      drawDevices(ctx, match, fx);
      drawSpores(ctx, match);
      match.balls.forEach(function (ball, i) {
        if (!fx.dead[i]) drawBall(ctx, match, fx, ball, themes[i], opts);
      });
      match.balls.forEach(function (ball, i) {
        if (!fx.dead[i]) drawBurn(ctx, fx, ball);
      });
      drawBolts(ctx, match, fx);
      drawBeams(ctx, fx);
      drawDrones(ctx, match, fx);
      drawNukes(ctx, match, fx);
      match.balls.forEach(function (ball, i) {
        if (!fx.dead[i]) DRAW[ball.type].over(ctx, match, fx, ball, themes[i]);
      });
      drawEffects(ctx, match, fx, opts);
      if (fx.flash > 0) {
        // 核爆的闪光。
        ctx.fillStyle = 'rgba(255, 248, 220, ' + Math.min(0.75, fx.flash * 1.6) * (opts.reducedMotion ? 0.3 : 1) + ')';
        ctx.fillRect(-20, -20, A + 40, A + 40);
      }
      ctx.restore();
    }

    // 正方形方框。
    ctx.strokeStyle = '#dfe6f5';
    ctx.lineWidth = FRAME;
    ctx.strokeRect(-FRAME / 2, -FRAME / 2, A + FRAME, A + FRAME);

    if (opts.banner) {
      ctx.setTransform(sizePx / 600, 0, 0, sizePx / 600, 0, 0);
      drawBanner(ctx, opts.banner);
    }
  }

  return {
    THEMES: THEMES,
    FRAME: FRAME,
    ORE_COLORS: ORE_COLORS,
    themeFor: themeFor,
    createFx: createFx,
    handleEvents: handleEvents,
    updateFx: updateFx,
    draw: draw,
  };
});
