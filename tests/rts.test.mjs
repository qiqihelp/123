import test from "node:test";
import assert from "node:assert/strict";
import { unitProfile } from "../rts/briefings.mjs";
import {
  createGame,
  step,
  order,
  stop,
  income,
  enqueue,
  blocked,
  fleet,
  capacity,
  factories,
  enqueueBatch,
  setRally,
  enemyFleet,
  ENEMY_UNIT_LIMIT,
  ENEMY_MAX_WAVE,
  productionFactor,
  relayCount,
  catalog,
  W,
  H,
  crystalIncome,
  uraniumIncome,
  minerals,
  techs,
  researchBlocked,
  startResearch,
  rechargeShield,
  location,
} from "../rts/sim.mjs";

function advance(g, seconds) {
  for (let i = 0; i < Math.round(seconds * 30); i++) step(g, 1 / 30);
}
function choose(g, types) {
  g.selected = new Set(
    g.actors
      .filter((a) => a.team === 1 && types.includes(a.type))
      .map((a) => a.id),
  );
}

test("starts with a mining economy and one selected unit; mining can stop and resume", () => {
  const g = createGame();
  assert.equal(g.selected.size, 1);
  assert.equal(fleet(g), 6);
  assert.equal(income(g), 12);
  advance(g, 3);
  assert.ok(Math.abs(g.ore - 676) < 0.001);
  choose(g, ["miner"]);
  stop(g);
  assert.equal(income(g), 4);
  order(g, g.mines[0].x, g.mines[0].y, "move");
  assert.equal(income(g), 12);
});

test("deployment deducts resources and an expanded generator unlocks heavy tanks", () => {
  const g = createGame();
  assert.match(blocked(g, "heavy"), /16/);
  assert.equal(enqueue(g, "tank"), "");
  assert.equal(g.ore, 460);
  assert.equal(enqueue(g, "generator"), "");
  assert.equal(g.ore, 320);
  advance(g, 6.1);
  assert.equal(fleet(g), 6);
  assert.equal(
    capacity(g),
    20,
    "construction runs without blocking vehicle production",
  );
  advance(g, 1.1);
  assert.equal(fleet(g), 7);
  assert.equal(enqueue(g, "heavy"), "");
  advance(g, 11.1);
  assert.equal(fleet(g), 8);
  assert.equal(g.queue.length, 0);
});

test("ordered units can claim a relay and increase passive income", () => {
  const g = createGame();
  choose(g, ["scout"]);
  const relay = g.relays[0];
  order(g, relay.x, relay.y, "attack");
  advance(g, 12);
  assert.equal(relay.owner, 1);
  assert.equal(relayCount(g), 1);
  assert.equal(income(g), 17);
});

test("enemy waves arrive and leave the idle blue side vulnerable", () => {
  const g = createGame();
  advance(g, 54);
  assert.equal(g.wave, 0);
  advance(g, 2);
  assert.equal(g.wave, 1);
  assert.ok(g.actors.some((a) => a.team === -1 && a.order?.kind === "attack"));
  advance(g, 500);
  assert.equal(g.result, "defeat");
});

test("a reinforced push can win the skirmish without manipulating unit state", () => {
  const g = createGame();
  const combat = ["tank", "scout", "assault", "lightArtillery"];
  const send = (x, y) => {
    choose(g, combat);
    const p = location(x, y);
    order(g, p.x, p.y, "sweep");
  };
  const p = location(416, 330);
  setRally(g, p.x, p.y);
  send(484, 179);
  for (const type of ["factory", "miner", "tank"])
    assert.equal(enqueue(g, type), "");
  const build = new Map([
    [19, "generator"],
    [24, "lightArtillery"],
    [32, "assault"],
    [48, "assault"],
    [56, "lightArtillery"],
    [72, "lightArtillery"],
    [80, "assault"],
  ]);
  for (let i = 0; i < 100 * 30 && !g.result; i++) {
    step(g, 1 / 30);
    if (i === 390) {
      const miner = g.actors
        .filter((a) => a.team === 1 && a.type === "miner")
        .at(-1);
      g.selected = new Set([miner.id]);
      order(g, g.mines[0].x, g.mines[0].y, "move");
    }
    if (build.has(i / 30)) assert.equal(enqueue(g, build.get(i / 30)), "");
    if ([35, 50, 65, 79].includes(i / 30)) send(749, 142);
  }
  assert.equal(g.result, "victory");
  const endedAt = g.time;
  advance(g, 10);
  assert.equal(g.time, endedAt);
});

function rangeScenario(type) {
  const g = createGame();
  g.nextThink = Infinity;
  const blue = g.actors.find((a) => a.team === 1 && a.type === type);
  const [red, wing] = g.actors.filter(
    (a) => a.team === -1 && a.type === "scout",
  );
  g.actors = g.actors.filter(
    (a) => a.type === "hq" || [blue, red, wing].includes(a),
  );
  Object.assign(blue, { x: 480, y: 360 });
  Object.assign(red, { x: 568, y: 360, cd: 100 });
  Object.assign(wing, { x: 590, y: 360, cd: 100 });
  g.selected = new Set([blue.id]);
  return { g, blue, red, wing };
}
test("a moving vehicle keeps its course while firing, and a focus order prioritizes the tapped target", () => {
  const { g, blue, red, wing } = rangeScenario("tank");
  order(g, 500, 510, "move");
  advance(g, 0.3);
  assert.ok(blue.y > 369, "the vehicle still moves");
  assert.ok(red.hp < catalog.scout.hp, "it fires on nearby enemies");
  assert.ok(
    blue.angle > 1 && Math.abs(blue.aim) < 0.25,
    "chassis and aim face independently",
  );
  advance(g, 0.58);
  order(g, wing.x, wing.y, "auto", wing.id);
  advance(g, 0.2);
  assert.ok(wing.hp < catalog.scout.hp, "focus fire overrides nearer targets");
  assert.equal(blue.order.id, wing.id);
});
test("an area order stops to engage and continues toward the sweep point after combat", () => {
  const { g, blue, red, wing } = rangeScenario("tank");
  red.hp = wing.hp = 10;
  order(g, 500, 520, "sweep");
  advance(g, 0.4);
  assert.equal(blue.y, 360);
  assert.equal(blue.order.kind, "attack");
  advance(g, 1.2);
  assert.ok(!g.actors.includes(red) && !g.actors.includes(wing));
  assert.ok(blue.y > 365);
});
test("artillery outranges tanks, reloads slowly, and splashes enemies after impact", () => {
  const { g, blue, red, wing } = rangeScenario("lightArtillery");
  Object.assign(red, { x: 655, y: 360 });
  Object.assign(wing, { x: 674, y: 360 });
  const { lightArtillery: light, heavyArtillery: heavy, tank } = catalog;
  for (const key of ["range", "damage", "rate"])
    assert.ok(heavy[key] > light[key] && light[key] > tank[key]);
  order(g, red.x, red.y, "auto", red.id);
  advance(g, 0.2);
  assert.equal(red.hp, catalog.scout.hp);
  assert.equal(g.shells.length, 1);
  advance(g, 0.5);
  assert.equal(red.hp, catalog.scout.hp - light.damage);
  assert.ok(wing.hp < catalog.scout.hp && wing.hp > red.hp);
  assert.ok(blue.cd > 1.5);
});
test("AI captures a relay and sends wounded armor to its base instead of feeding it into the fight", () => {
  const g = createGame();
  advance(g, 30);
  assert.ok(g.relays.some((r) => r.owner === -1));
  const redHQ = g.actors.find((a) => a.team === -1 && a.type === "hq");
  const tank = g.actors.find((a) => a.team === -1 && a.type === "tank");
  const blue = g.actors.find((a) => a.team === 1 && a.type === "tank");
  Object.assign(tank, { x: 650, y: 365, hp: 50, cd: 0 });
  Object.assign(blue, { x: 540, y: 365, cd: 50 });
  advance(g, 1);
  assert.equal(tank.aiRetreat, true);
  assert.ok(tank.x > 650);
  assert.ok(tank.order.x > redHQ.x - 50);
});

test("missile tanks fire a staggered pair with separate launcher kicks, smoke and impact rings", () => {
  const { g, blue, red, wing } = rangeScenario("tank");
  blue.type = "missileTank";
  Object.assign(red, { x: 622, y: 360 });
  Object.assign(wing, { x: 660, y: 360 });
  order(g, red.x, red.y, "auto", red.id);
  advance(g, 1 / 30);
  assert.equal(g.missiles.length, 2);
  assert.ok(g.missiles[0].age > 0 && g.missiles[1].age < 0);
  assert.equal(blue.salvoLane, -1);
  assert.ok(blue.recoil > 0.19);
  advance(g, 0.13);
  assert.equal(blue.salvoLane, 1);
  assert.ok(blue.recoil > 0.19);
  assert.ok(g.smoke.length > 0);
  red.y += 12; // The missiles follow their target in flight.
  advance(g, 0.85);
  assert.equal(g.missiles.length, 0);
  assert.equal(g.bursts.filter((b) => b.style === "blast").length, 2);
  assert.equal(red.hp, catalog.scout.hp - 2 * catalog.missileTank.damage);
  assert.equal(wing.hp, catalog.scout.hp);
});

test("new buildings share the power budget, repair vehicles and boost income", () => {
  const g = createGame();
  assert.equal(enqueue(g, "repair"), "");
  assert.equal(enqueue(g, "refinery"), "");
  advance(g, 2);
  assert.match(blocked(g, "mortar"), /供电不足/);
  advance(g, 13.2);
  assert.equal(income(g), 18);
  const repair = g.actors.find((a) => a.team === 1 && a.type === "repair");
  const tank = g.actors.find((a) => a.team === 1 && a.type === "tank");
  Object.assign(tank, { hp: 70, x: repair.x + 50, y: repair.y });
  advance(g, 1);
  assert.ok(tank.hp > 81 && tank.repairGlow > 0);
  assert.equal(enqueue(g, "generator"), "");
  advance(g, 6.1);
  assert.equal(enqueue(g, "mortar"), "");
  advance(g, 10.1);
  assert.ok(g.actors.some((a) => a.team === 1 && a.type === "mortar"));
});

test("the expanded map is exactly five times larger and every mineral has a valid deposit", () => {
  const g = createGame();
  assert.equal(W * H, 5 * 1280 * 720);
  assert.ok(g.mines.length >= 20);
  assert.deepEqual(
    new Set(g.mines.map((m) => m.kind)),
    new Set(Object.keys(minerals)),
  );
  assert.ok(g.mines.every((m) => m.x > 0 && m.x < W && m.y > 0 && m.y < H));
  assert.ok(g.relays.length > 2);
  const miner = g.actors.find((a) => a.type === "miner");
  g.selected = new Set([miner.id]);
  for (const [kind, spec] of Object.entries(minerals)) {
    const m = g.mines.find((p) => p.kind === kind);
    Object.assign(miner, { x: m.x, y: m.y });
    order(g, m.x, m.y, "move");
    assert.equal(income(g), 4 + spec.ore);
    assert.equal(crystalIncome(g), spec.crystal);
  }
});

test("mining crystals and building a powered lab unlocks T2 and its two independent research branches", () => {
  const g = createGame();
  assert.match(researchBlocked(g, "t2"), /研究中心/);
  assert.match(blocked(g, "plasmaTank"), /T2/);
  assert.equal(enqueue(g, "lab"), "");
  const miner = g.actors.find((a) => a.type === "miner"),
    m = g.mines[4];
  g.selected = new Set([miner.id]);
  order(g, m.x, m.y, "move");
  advance(g, 19);
  assert.ok(g.crystal >= 24);
  assert.match(researchBlocked(g, "guidance"), /T2/);
  const ore = g.ore,
    crystal = g.crystal;
  assert.equal(startResearch(g, "t2"), "");
  assert.equal(g.ore, ore - techs.t2.cost);
  assert.equal(g.crystal, crystal - techs.t2.crystal);
  advance(g, 15);
  assert.match(blocked(g, "missileT2"), /T2/);
  advance(g, 1.2);
  assert.ok(g.tech.has("t2"));
  advance(g, 22);
  assert.equal(blocked(g, "plasmaTank"), "");
  assert.equal(blocked(g, "missileT2"), "");
  assert.equal(startResearch(g, "plasmaFocus"), "");
  assert.match(researchBlocked(g, "guidance"), /正在研究/);
  advance(g, 12.1);
  assert.ok(g.tech.has("plasmaFocus"));
  assert.equal(startResearch(g, "guidance"), "");
});

test("plasma projectiles inflict shield then hull damage, and hull HP never passively regenerates", () => {
  const { g, blue, red, wing } = rangeScenario("tank");
  blue.type = "plasmaTank";
  Object.assign(red, {
    type: "plasmaTank",
    shield: 32,
    hp: catalog.plasmaTank.hp,
    shieldClock: 0,
  });
  wing.x = 940;
  order(g, red.x, red.y, "auto", red.id);
  advance(g, 0.18);
  assert.equal(red.hp, catalog.plasmaTank.hp);
  assert.equal(g.plasma.length, 1);
  advance(g, 0.18);
  assert.deepEqual(
    g.damageText.map((d) => [d.value, d.shield]),
    [
      [32, true],
      [catalog.plasmaTank.damage - 32, false],
    ],
  );
  assert.equal(red.shield, 0);
  const hp = red.hp;
  g.selected.clear();
  blue.cd = 30;
  advance(g, 0.45);
  assert.equal(red.shield, 4);
  assert.equal(red.hp, hp);
  const actor = { shield: 87, shieldClock: 0, hp: 53 };
  rechargeShield(actor, catalog.plasmaTank, 0.49);
  assert.equal(actor.shield, 87);
  rechargeShield(actor, catalog.plasmaTank, 0.01);
  assert.equal(actor.shield, 91);
  rechargeShield(actor, catalog.plasmaTank, 1);
  assert.equal(actor.shield, 96);
  assert.equal(actor.hp, 53);
});

test("T2 missile tanks fire four rounds and benefit from the optional guidance branch", () => {
  const { g, blue, red, wing } = rangeScenario("tank");
  g.tech.add("guidance");
  blue.type = "missileT2";
  red.x = 692;
  wing.x = 748;
  order(g, red.x, red.y, "auto", red.id);
  advance(g, 0.1);
  assert.equal(g.missiles.length, 4);
  assert.ok(g.missiles.every((m) => m.damage === catalog.missileT2.damage + 8));
});

test("eight finished factories deliver eight five-second orders in one cycle and rally the new units", () => {
  const g = createGame();
  g.nextWave = Infinity;
  g.ore = 6000;
  for (let i = 0; i < 6; i++) assert.equal(enqueue(g, "factory"), "");
  advance(g, 54.1);
  assert.equal(enqueue(g, "factory"), "");
  advance(g, 9.1);
  assert.equal(factories(g).length, 8);
  const rally = location(427, 542);
  assert.ok(setRally(g, rally.x, rally.y));
  const ids = new Set(g.actors.map((a) => a.id));
  const before = fleet(g);
  assert.deepEqual(enqueueBatch(g, "scout"), {
    added: 8,
    requested: 8,
    reason: "",
  });
  advance(g, 4.9);
  assert.equal(fleet(g), before);
  assert.equal(new Set(g.queue.map((j) => j.factory)).size, 8);
  advance(g, 0.1);
  assert.equal(fleet(g), before + 8);
  assert.ok(
    g.actors
      .filter((a) => !ids.has(a.id))
      .every(
        (a) =>
          a.order.kind === "move" &&
          Math.hypot(a.order.x - rally.x, a.order.y - rally.y) < 35,
      ),
  );
  assert.equal(g.queue.length, 0);
});

test("remaining factories resume paid orders from destroyed workshops", () => {
  const g = createGame();
  g.ore = 3000;
  assert.equal(enqueue(g, "factory"), "");
  advance(g, 9.1);
  for (const t of ["tank", "scout"]) assert.equal(enqueue(g, t), "");
  advance(g, 2);
  const [a, b] = factories(g);
  const scout = g.queue.find((j) => j.type === "scout");
  assert.equal(scout.factory, b.id);
  b.hp = 0;
  advance(g, 1);
  assert.equal(scout.factory, null);
  assert.ok(Math.abs(scout.left - 3) < 0.0001);
  advance(g, 4.1);
  assert.equal(scout.factory, a.id);
  advance(g, 3.1);
  assert.equal(g.queue.length, 0);
  assert.equal(fleet(g), 8);
});

test("rapid production works before T2 and shortens factory work by 30%, not construction", () => {
  const g = createGame();
  g.ore = 3000;
  assert.equal(enqueue(g, "lab"), "");
  advance(g, 9.1);
  assert.equal(startResearch(g, "rapidProduction"), "");
  advance(g, 12.1);
  assert.equal(productionFactor(g), 0.7);
  assert.ok(!g.tech.has("t2"));
  assert.equal(enqueue(g, "scout"), "");
  assert.equal(enqueue(g, "generator"), "");
  advance(g, 3.4);
  assert.equal(fleet(g), 6);
  advance(g, 0.1);
  assert.equal(fleet(g), 7);
  advance(g, 2.4);
  assert.equal(capacity(g), 12);
  advance(g, 0.1);
  assert.equal(capacity(g), 20);
});

test("late reinforcements respect per-wave and field caps and leave at least 54 seconds between waves", () => {
  const g = createGame();
  g.nextThink = Infinity;
  g.wave = 8;
  g.red.nextEconomy = Infinity;
  g.red.ore = 4000;
  g.red.crystal = 100;
  g.red.tech.add("t2");
  g.nextWave = 0;
  const before = enemyFleet(g);
  step(g, 1 / 30);
  assert.ok(enemyFleet(g) + g.red.production.length - before <= ENEMY_MAX_WAVE);
  assert.ok(g.nextWave - g.time >= 54);
  assert.equal(
    g.red.production.filter(
      (q) => q.type === "missileT2" || q.type === "plasmaTank",
    ).length,
    1,
  );
  for (let i = 0; i < 240; i++) {
    step(g, 0.5);
    assert.ok(enemyFleet(g) + g.red.production.length <= ENEMY_UNIT_LIMIT);
  }
  assert.ok(g.waveWaiting, "a full army waits instead of spawning more");
});

test("unit dossiers display current stats and completed research bonuses", () => {
  const g = createGame();
  g.tech.add("rapidProduction");
  g.tech.add("guidance");
  const a = { type: "missileT2", team: 1, hp: 221 };
  const profile = unitProfile(g, [a]);
  const stats = Object.fromEntries(profile.stats);
  assert.equal(stats["生命值"], "221 / 245");
  assert.equal(stats["单枚伤害"], 42);
  assert.equal(stats["每轮连发"], "4 枚");
  assert.equal(stats["生产时间"], "10.5 秒");
});

test("structures survive longer and standard weapons deal a quarter less damage", () => {
  assert.equal(catalog.hq.hp, 1783);
  assert.equal(catalog.factory.hp, 868);
  assert.equal(catalog.tank.damage, 18);
  assert.equal(catalog.plasmaTank.damage, 65);
  assert.equal(catalog.heavyArtillery.damage, 84);
});

test("red cannot launch a free wave or advance an order it cannot afford", () => {
  const g = createGame();
  g.actors = g.actors.filter((a) => !(a.team === -1 && a.type === "miner"));
  g.red.ore = 0;
  g.red.nextEconomy = Infinity;
  g.nextThink = Infinity;
  g.nextWave = 0;
  const before = enemyFleet(g);
  advance(g, 20);
  assert.equal(income(g, -1), 0);
  assert.equal(g.red.ore, 0);
  assert.equal(g.wave, 0);
  assert.equal(g.red.production.length, 0);
  assert.equal(enemyFleet(g), before);
  assert.equal(g.waveWaiting, "资金不足");
  g.red.ore = catalog.scout.cost;
  g.nextWave = g.time;
  step(g, 1 / 30);
  assert.equal(g.wave, 1);
  assert.equal(g.red.ore, 0);
  assert.deepEqual(
    g.red.production.map((q) => q.type),
    ["scout"],
  );
  advance(g, 4.9);
  assert.equal(enemyFleet(g), before);
  advance(g, 0.1);
  assert.equal(enemyFleet(g), before + 1);
});

test("red pays for miners, mines uranium and builds a command outpost and extra workshop", () => {
  const g = createGame();
  g.nextWave = Infinity;
  advance(g, 17);
  assert.equal(
    g.actors.filter((a) => a.team === -1 && a.type === "miner").length,
    2,
  );
  assert.ok(uraniumIncome(g, -1) > 0);
  advance(g, 100);
  assert.ok(g.actors.some((a) => a.team === -1 && a.type === "outpost"));
  assert.ok(
    g.actors.filter((a) => a.team === -1 && a.type === "factory").length >= 2,
  );
  assert.ok(g.red.ore > 0 && g.red.uranium > 0);
});

test("red can rebuild its destroyed factory by paying and waiting for construction", () => {
  const g = createGame();
  g.nextWave = Infinity;
  g.red.nextEconomy = 0;
  g.actors = g.actors.filter(
    (a) => !(a.team === -1 && ["miner", "factory"].includes(a.type)),
  );
  g.red.ore = catalog.factory.cost;
  step(g, 1 / 30);
  assert.equal(g.red.ore, 0);
  assert.equal(g.red.construction.type, "factory");
  assert.ok(!g.actors.some((a) => a.team === -1 && a.type === "factory"));
  advance(g, 9.1);
  assert.ok(g.actors.some((a) => a.team === -1 && a.type === "factory"));
});

test("uranium is mined and spent on equipment, with a distinct power upgrade and hull shield", () => {
  const g = createGame();
  g.ore = 2500;
  assert.match(blocked(g, "uraniumPlant"), /铀不足/);
  const m = g.mines.find((m) => m.kind === "uranium");
  const miner = g.actors.find((a) => a.team === 1 && a.type === "miner");
  Object.assign(miner, { x: m.x, y: m.y });
  g.selected = new Set([miner.id]);
  order(g, m.x, m.y, "move");
  assert.equal(uraniumIncome(g), 3);
  advance(g, 6);
  assert.ok(g.uranium >= 18 - 1e-6);
  assert.equal(enqueue(g, "uraniumPlant"), "");
  assert.ok(Math.abs(g.uranium) < 1e-6);
  advance(g, 11.1);
  assert.equal(capacity(g), 28);
  assert.equal(enqueue(g, "uraniumTank"), "");
  advance(g, 13.1);
  const vehicle = g.actors.find(
    (a) => a.team === 1 && a.type === "uraniumTank",
  );
  assert.ok(vehicle);
  assert.equal(vehicle.shield, catalog.uraniumTank.shield);
  assert.equal(enqueue(g, "uraniumRepair"), "");
});
