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

test('激光：平时丢 1 个装置，充能满 20 时丢出 4 个并清空充能', () => {
  const L = CFG.laser;
  let bursts = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const m = Sim.createMatch({ left: 'laser', right: 'laser', seed: seed * 101 });
    const shooter = m.balls[0];
    m.balls[1].fireTimer = 1e9; // 对手不丢装置
    const log = [];
    while (m.time < 60 && !m.over) {
      const chargeBefore = shooter.charge;
      const firstNewId = m.nextDeviceId;
      stepAndCollect(m, log);
      const deploy = log.findLast((e) => e.type === 'deploy' && e.time === m.time);
      if (!deploy) continue;

      const fresh = m.devices.filter((device) => device.id >= firstNewId);
      const full = chargeBefore + L.chargeRate * DT >= L.chargeMax;
      assert.equal(deploy.burst, full, '是否丢 4 个只取决于充能是否已满');
      assert.equal(fresh.length, full ? 4 : 1);
      for (const device of fresh) {
        assert.ok(device.x >= L.margin && device.x <= CFG.arena - L.margin, '装置落在方框内');
        assert.ok(device.y >= L.margin && device.y <= CFG.arena - L.margin, '装置落在方框内');
      }
      if (full) {
        bursts++;
        assert.ok(shooter.charge < 1, '丢出 4 个后充能清空');
        assert.ok(fresh.every((device) => device.phase === 'fly'), '丢出的装置先飞一段');
        const spots = new Set(fresh.map((device) => Math.round(device.x) + ',' + Math.round(device.y)));
        assert.ok(spots.size >= 3, '4 个装置散开落在不同位置');
      } else {
        // 平时就丢在脚下，落地即开始预警。
        assert.equal(fresh[0].phase, 'arm');
        assert.ok(Math.hypot(fresh[0].x - shooter.x, fresh[0].y - shooter.y) <= L.margin * 1.5);
      }
    }
    assert.ok(log.some((e) => e.type === 'deploy' && e.burst), '60s 内至少充满一次');
  }
  assert.ok(bursts >= 8);
});

test('激光：两次丢装置的间隔固定', () => {
  const m = Sim.createMatch({ left: 'laser', right: 'laser', seed: 7 });
  m.balls[1].fireTimer = 1e9;
  const log = [];
  while (m.time < 20 && !m.over) stepAndCollect(m, log);
  const deploys = log.filter((e) => e.type === 'deploy');
  assert.ok(deploys.length >= 5);
  for (let i = 1; i < deploys.length; i++) {
    assert.ok(near(deploys[i].time - deploys[i - 1].time, CFG.laser.interval));
  }
});

test('激光：装置预警后发射十字激光，横竖都能命中，每个装置只算一次', () => {
  const L = CFG.laser;
  const reach = L.width / 2 + CFG.ballR;
  let aligned = 0;
  let missed = 0;
  let viaRow = 0;
  let viaColumn = 0;

  for (let seed = 1; seed <= 6; seed++) {
    const m = Sim.createMatch({ left: 'laser', right: 'laser', seed: seed * 13 });
    const target = m.balls[1];
    // 把目标钉在一个固定位置，命中与否就只取决于装置和它是否同行 / 同列。
    target.paralyzed = true;
    target.x = 470; target.y = 110;
    const log = [];
    const devices = new Map();
    while (m.time < 40 && !m.over) {
      stepAndCollect(m, log);
      for (const device of m.devices) {
        if (!devices.has(device.id)) devices.set(device.id, { x: device.x, y: device.y, burst: device.burst, born: m.time });
      }
    }
    const hits = log.filter((e) => e.type === 'deviceHit');
    const fired = new Set(log.filter((e) => e.type === 'deviceFire').map((e) => e.device));

    for (const [id, device] of devices) {
      if (!fired.has(id)) continue; // 对局结束时还没来得及发射的装置
      const sameColumn = Math.abs(target.x - device.x) <= reach;
      const sameRow = Math.abs(target.y - device.y) <= reach;
      const mine = hits.filter((hit) => hit.device === id);
      if (sameColumn || sameRow) {
        aligned++;
        if (sameColumn) viaColumn++;
        if (sameRow) viaRow++;
        assert.equal(mine.length, 1, '同行或同列：命中且只命中一次');
        const delay = (device.burst ? L.throwTime : 0) + L.arm;
        assert.ok(near(mine[0].time - device.born, delay, DT * 3), '预警结束的瞬间才造成伤害');
      } else {
        missed++;
        assert.equal(mine.length, 0, '不同行也不同列：打不中');
      }
    }
    const dmg = log.filter((e) => e.type === 'damage');
    assert.equal(dmg.length, hits.length);
    dmg.forEach((d) => assert.equal(d.amount, L.damage));
  }
  assert.ok(aligned > 0 && missed > 0, '命中和落空的情况都测到了');
  assert.ok(viaRow > 0 && viaColumn > 0, '横向和纵向的激光都命中过');
});

test('激光：命中会额外累积充能', () => {
  const m = Sim.createMatch({ left: 'laser', right: 'laser', seed: 7 });
  const [shooter, target] = m.balls;
  target.fireTimer = 1e9;
  shooter.x = 200; shooter.y = 200;
  shooter.fireTimer = DT / 2; // 下一步就丢装置
  const log = [];
  stepAndCollect(m, log);
  const device = m.devices[0];
  // 把目标钉在装置的正下方：纵向那道激光必中。
  target.paralyzed = true;
  target.x = device.x;
  target.y = 500;

  let before = 0;
  while (!log.some((e) => e.type === 'deviceHit')) {
    before = shooter.charge;
    stepAndCollect(m, log);
  }
  assert.ok(before < 2, '这时充能还远没到上限');
  const gained = shooter.charge - before;
  assert.ok(near(gained, CFG.laser.chargeOnHit + CFG.laser.chargeRate * DT, 1e-6));
  assert.equal(target.hp, CFG.maxHp - CFG.laser.damage);
});

test('激光：被麻痹时不丢新装置，但已丢出的装置照常发射', () => {
  const m = Sim.createMatch({ left: 'electric', right: 'laser', seed: 11 });
  const [zap, laser] = m.balls;
  zap.x = 100; zap.y = 100;
  laser.x = 500; laser.y = 500;
  laser.fireTimer = DT / 2; // 下一步就丢装置
  const log = [];
  stepAndCollect(m, log);
  assert.equal(m.devices.length, 1);
  placeBeside(zap, laser, 80); // 紧接着被电到
  stepAndCollect(m, log);
  assert.equal(laser.paralyzed, true);
  while (laser.paralyzed) stepAndCollect(m, log);
  assert.equal(log.filter((e) => e.type === 'deploy').length, 1, '麻痹的 3 秒里没有丢新装置');
  assert.equal(log.filter((e) => e.type === 'deviceFire').length, 1, '之前丢下的装置照常发射');
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

test('科技球：开局有矿，会采矿、造设备、连电网、产电', () => {
  const m = Sim.createMatch({ left: 'tech', right: 'laser', seed: 5 });
  assert.equal(m.ores.length, Sim.CFG.tech.oreStart);
  const tech = m.balls[0];
  m.balls[1].hp = 1e9; // 只看发育，不让对局提前结束
  tech.hp = 1e9;
  Sim.advance(m, 30);
  const own = m.buildings.filter((b) => b.owner === 0);
  assert.ok(own.length >= 2, '30 秒内至少造出两个设备');
  assert.ok(own.some((b) => b.kind === 'generator'));
  assert.equal(m.wires.filter((w) => w.owner === 0).length, own.length - 1, '电线把所有设备连成一张网');
  assert.ok(tech.income > 0, '发电机在产电');
});

test('科技球：设备血厚，打掉后电网会重连', () => {
  const m = Sim.createMatch({ left: 'tech', right: 'electric', seed: 9 });
  const a = Sim.placeBuilding(m, 0, 'generator', 100, 100);
  const b = Sim.placeBuilding(m, 0, 'turret', 200, 100);
  Sim.placeBuilding(m, 0, 'generator', 300, 100);
  assert.equal(m.wires.length, 2);
  Sim.hurtBuilding(m, b, 5);
  assert.equal(m.buildings.length, 3, '一下打不掉');
  Sim.hurtBuilding(m, b, 999);
  Sim.hurtBuilding(m, b, 999);
  assert.equal(m.buildings.length, 2);
  assert.equal(m.wires.length, 1);
  assert.ok(a.hp === a.maxHp);
});

test('科技球：发射井充满电就发射核弹，炸中 -30', () => {
  const T = Sim.CFG.tech;
  const m = Sim.createMatch({ left: 'tech', right: 'spore', seed: 3 });
  const tech = m.balls[0];
  const enemy = m.balls[1];
  enemy.paralyzed = true; // 站着不动，核弹一定炸中
  enemy.shock = null;
  m.ores.length = 0;
  const plant = Sim.placeBuilding(m, 0, 'plant', 80, 80);
  const silo = Sim.placeBuilding(m, 0, 'silo', 80, 200);
  plant.active = silo.active = true;
  tech.power = T.powerMax;
  let launched = false;
  let nukeDamage = 0;
  for (let i = 0; i < 120 * 20 && !m.over; i++) {
    enemy.paralyzed = true;
    Sim.step(m);
    for (const e of m.events) {
      if (e.type === 'nukeLaunch') launched = true;
      if (e.type === 'damage' && e.kind === 'nuke') nukeDamage += e.amount;
    }
    m.events.length = 0;
    if (nukeDamage) break;
  }
  assert.ok(launched);
  assert.equal(nukeDamage, T.nukeDamage);
});
