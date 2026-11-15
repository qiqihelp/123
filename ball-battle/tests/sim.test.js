// 运行：node --test ball-battle/tests/sim.test.js
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Sim = require('../sim.js');

const { CFG } = Sim;
const DT = CFG.step;
const near = (a, b, eps) => Math.abs(a - b) <= (eps == null ? DT * 1.5 : eps);

/** 走一步并把这一步产生的事件带着时间戳收集起来。 */
function stepAndCollect(match, log) {
  Sim.step(match);
  for (const e of match.events) log.push(Object.assign({ time: match.time }, e));
  match.events.length = 0;
}

/** 把 target 摆到 anchor 旁边（朝场地中心一侧），距离为 dist。 */
function placeBeside(anchor, target, dist) {
  const dir = anchor.x < CFG.arena / 2 ? 1 : -1;
  target.x = anchor.x + dir * dist;
  target.y = anchor.y;
}

test('电击：麻痹 3 秒，每秒 -3，共 9 点', () => {
  const m = Sim.createMatch({ left: 'electric', right: 'laser', seed: 1 });
  const [zap, victim] = m.balls;
  zap.x = 200; zap.y = 300;
  placeBeside(zap, victim, CFG.electric.reach + victim.r - 10); // 刚好在闪电链范围内
  const log = [];

  stepAndCollect(m, log);
  assert.equal(victim.paralyzed, true);
  assert.equal(zap.chain.state, 'discharging');
  assert.equal(victim.hp, CFG.maxHp, '电击瞬间不扣血');

  while (m.time < 3.5) stepAndCollect(m, log);

  const ticks = log.filter((e) => e.type === 'damage' && e.kind === 'shock');
  assert.equal(ticks.length, 3);
  ticks.forEach((tick, i) => {
    assert.equal(tick.amount, 3);
    assert.ok(near(tick.time, DT + (i + 1)), `第 ${i + 1} 跳应在 ${i + 1}s，实际 ${tick.time}`);
  });

  const end = log.find((e) => e.type === 'shockEnd');
  assert.ok(end && near(end.time, DT + 3), '麻痹在 3s 结束');
  assert.equal(victim.paralyzed, false);
  assert.equal(log.filter((e) => e.type === 'shock').length, 1);
  // 没有激光命中的话，受害者只掉了 9 点。
  const laserDamage = log.filter((e) => e.kind === 'laser' && e.target === 1).length;
  assert.equal(laserDamage, 0);
  assert.equal(victim.hp, CFG.maxHp - 9);
});

test('电击：麻痹期间受害者完全不动、也不充能', () => {
  const m = Sim.createMatch({ left: 'electric', right: 'laser', seed: 2 });
  const [zap, victim] = m.balls;
  zap.x = 200; zap.y = 300;
  placeBeside(zap, victim, 80);
  Sim.step(m);
  const snap = { x: victim.x, y: victim.y, charge: victim.charge, fireTimer: victim.fireTimer };
  Sim.advance(m, 2.9);
  assert.equal(victim.paralyzed, true);
  assert.deepEqual(
    { x: victim.x, y: victim.y, charge: victim.charge, fireTimer: victim.fireTimer },
    snap
  );
});

test('电击：结束后闪电链冷却 8 秒，冷却中不会再次触发', () => {
  const m = Sim.createMatch({ left: 'electric', right: 'laser', seed: 3 });
  const [zap, victim] = m.balls;
  const log = [];
  // 每一步都把敌人摆到闪电链范围内，逼它一有机会就触发。
  while (m.time < 30 && !m.over) {
    if (!victim.paralyzed) placeBeside(zap, victim, 70);
    stepAndCollect(m, log);
  }
  const shocks = log.filter((e) => e.type === 'shock').map((e) => e.time);
  const ends = log.filter((e) => e.type === 'shockEnd').map((e) => e.time);
  const readies = log.filter((e) => e.type === 'chainReady').map((e) => e.time);

  assert.ok(shocks.length >= 3);
  assert.ok(near(ends[0] - shocks[0], 3), '麻痹持续 3s');
  assert.ok(near(readies[0] - ends[0], 8), '冷却 8s');
  // 敌人一直贴在旁边，所以两次电击之间正好是 3 + 8 = 11s。
  for (let i = 1; i < shocks.length; i++) {
    assert.ok(near(shocks[i] - shocks[i - 1], 11, DT * 3), `第 ${i + 1} 次电击间隔应为 11s`);
  }
});

test('电击：范围外不触发', () => {
  const m = Sim.createMatch({ left: 'electric', right: 'laser', seed: 4 });
  const [zap, victim] = m.balls;
  zap.x = 100; zap.y = 100; zap.vx = 0; zap.vy = 0;
  victim.x = 100 + CFG.electric.reach + victim.r + 5; victim.y = 100;
  victim.paralyzed = true; // 固定住，方便只测范围判定
  const log = [];
  zap.vx = -CFG.speed; // 远离对手
  stepAndCollect(m, log);
  assert.equal(log.filter((e) => e.type === 'shock').length, 0);
});

test('激光：充能每秒 +1，封顶 20', () => {
  const m = Sim.createMatch({ left: 'laser', right: 'laser', seed: 5 });
  const [a, b] = m.balls;
  // 不让任何一方开火，只看自然充能。
  a.fireTimer = b.fireTimer = 1e9;
  Sim.advance(m, 5);
  assert.ok(near(a.charge, 5, 0.02), `5s 后充能应约为 5，实际 ${a.charge}`);
  Sim.advance(m, 30);
  assert.equal(a.charge, CFG.laser.chargeMax);
});

test('激光：平时单发，充能满 20 时双发并清空充能', () => {
  const patterns = new Set();
  for (let seed = 1; seed <= 12; seed++) {
    const m = Sim.createMatch({ left: 'laser', right: 'laser', seed: seed * 101 });
    const shooter = m.balls[0];
    m.balls[1].fireTimer = 1e9; // 对手不开火
    const log = [];
    let beamsBefore = 0;
    while (m.time < 60 && !m.over) {
      const chargeBefore = shooter.charge;
      beamsBefore = m.nextBeamId;
      stepAndCollect(m, log);
      const volley = log.length && log.findLast((e) => e.type === 'volley' && e.time === m.time);
      if (!volley) continue;
      const spawned = m.nextBeamId - beamsBefore;
      const full = chargeBefore + CFG.laser.chargeRate * DT >= CFG.laser.chargeMax;
      assert.equal(volley.double, full, '是否双发只取决于充能是否已满');
      assert.equal(spawned, full ? 2 : 1);
      const fresh = m.beams.filter((beam) => beam.id >= beamsBefore);
      const orients = fresh.map((beam) => beam.orient).sort().join('');
      if (full) {
        patterns.add(volley.pattern);
        assert.ok(['VV', 'HH', 'VH'].includes(volley.pattern));
        assert.equal(orients, { VV: 'vv', HH: 'hh', VH: 'hv' }[volley.pattern]);
        assert.ok(shooter.charge < 1, '双发后充能清空');
      } else {
        assert.ok(orients === 'v' || orients === 'h');
      }
    }
    assert.ok(log.some((e) => e.type === 'volley' && e.double), '60s 内至少双发一次');
  }
  assert.deepEqual([...patterns].sort(), ['HH', 'VH', 'VV'], '三种双发组合都会出现');
});

test('激光：两次发射间隔固定，预警结束后才造成伤害', () => {
  const m = Sim.createMatch({ left: 'laser', right: 'laser', seed: 7 });
  const [shooter, target] = m.balls;
  target.fireTimer = 1e9;
  const log = [];
  while (m.time < 12) {
    // 让目标始终和发射者同一列、隔开一段距离：纵向激光必中，横向必不中。
    target.x = shooter.x;
    target.y = shooter.y < CFG.arena / 2 ? shooter.y + 220 : shooter.y - 220;
    target.vx = shooter.vx; target.vy = shooter.vy;
    stepAndCollect(m, log);
  }
  const volleys = log.filter((e) => e.type === 'volley');
  for (let i = 1; i < volleys.length; i++) {
    assert.ok(near(volleys[i].time - volleys[i - 1].time, CFG.laser.interval));
  }
  const vertical = volleys.filter((v) => v.pattern === 'V');
  const hits = log.filter((e) => e.type === 'beamHit');
  assert.ok(vertical.length > 0 && volleys.length > vertical.length, '横纵都出现过');
  assert.equal(hits.length, vertical.length, '每道纵向激光只命中一次，横向不中');
  hits.forEach((hit, i) => {
    assert.equal(hit.orient, 'v');
    assert.ok(near(hit.time - vertical[i].time, CFG.laser.warn), '预警期间不造成伤害');
  });
  const dmg = log.filter((e) => e.type === 'damage');
  assert.equal(dmg.length, hits.length);
  dmg.forEach((d) => assert.equal(d.amount, CFG.laser.damage));
});

test('激光：命中会额外累积充能', () => {
  const m = Sim.createMatch({ left: 'laser', right: 'laser', seed: 7 });
  const [shooter, target] = m.balls;
  target.fireTimer = 1e9;
  const log = [];
  let before = 0;
  while (!log.some((e) => e.type === 'beamHit')) {
    target.x = shooter.x;
    target.y = shooter.y < CFG.arena / 2 ? shooter.y + 220 : shooter.y - 220;
    target.vx = shooter.vx; target.vy = shooter.vy;
    before = shooter.charge;
    stepAndCollect(m, log);
  }
  const gained = shooter.charge - before;
  assert.ok(near(gained, CFG.laser.chargeOnHit + CFG.laser.chargeRate * DT, 1e-6));
});

test('对局：一定会分出胜负，结束后不再推进', () => {
  for (const [left, right] of [['electric', 'laser'], ['laser', 'electric'], ['laser', 'laser'], ['electric', 'electric']]) {
    const m = Sim.createMatch({ left, right, seed: 42 });
    Sim.advance(m, 600);
    assert.equal(m.over, true, `${left} vs ${right} 应在 10 分钟内结束`);
    if (m.winner !== -1) {
      assert.ok(m.balls[m.winner].hp > 0);
      assert.equal(m.balls[1 - m.winner].hp, 0);
    }
    const t = m.time;
    Sim.step(m);
    assert.equal(m.time, t);
  }
});

test('对局：两个电击球不会永远同归于尽', () => {
  let decided = 0;
  for (let seed = 1; seed <= 10; seed++) {
    const m = Sim.createMatch({ left: 'electric', right: 'electric', seed });
    Sim.advance(m, 600);
    if (m.winner === 0 || m.winner === 1) decided++;
  }
  assert.ok(decided >= 8);
});

test('对局：同一个种子结果完全一致，小球始终在场地内', () => {
  const run = () => {
    const m = Sim.createMatch({ left: 'electric', right: 'laser', seed: 2024 });
    while (!m.over) {
      Sim.step(m);
      m.events.length = 0;
      for (const ball of m.balls) {
        assert.ok(ball.x >= ball.r - 1e-6 && ball.x <= CFG.arena - ball.r + 1e-6);
        assert.ok(ball.y >= ball.r - 1e-6 && ball.y <= CFG.arena - ball.r + 1e-6);
        assert.ok(near(Math.hypot(ball.vx, ball.vy), CFG.speed, 1e-6));
      }
    }
    return { time: m.time, winner: m.winner, hp: m.balls.map((ball) => ball.hp) };
  };
  assert.deepEqual(run(), run());
});
