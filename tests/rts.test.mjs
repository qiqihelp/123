import test from "node:test";
import assert from "node:assert/strict";
import { unitProfile } from "../rts/briefings.mjs";
import {
  createGame,
  step,
  order,
  stop,
  income,
  enqueue as submit,
  placementBlocked,
  units,
  buildings,
  movementSpeed,
  repairRate,
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

// Existing scenarios choose test sites explicitly; live construction has no default site.
function enqueue(g, type) {
  if (!buildings[type]) return submit(g, type);
  const sites = [
    [119, 497],
    [293, 515],
    [353, 464],
    [248, 553],
    [137, 425],
    [375, 535],
    [325, 554],
    [100, 458],
    [176, 530],
    [210, 390],
    [418, 478],
    [126, 542],
    [199, 544],
    [357, 512],
    [431, 520],
    [254, 568],
    [61, 517],
    [97, 590],
    [173, 591],
    [243, 616],
    [326, 611],
    [385, 594],
  ];
  for (let x = 960; x < 1480; x += 81)
    for (let y = 980; y < 1320; y += 81)
      sites.push([(x - 850) * 0.75, (y - 320) * 0.8]);
  const point = sites
    .map(([x, y]) => location(x, y))
    .find((p) => !placementBlocked(g, type, p));
  return submit(g, type, point);
}

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
  assert.ok(g.red.production.some((q) => q.wave === 1));
  advance(g, 12);
  assert.ok(g.actors.some((a) => a.team === -1 && a.aiWave === 1));
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
  assert.ok(g.red.production.some((q) => units[q.type].tech === "t2"));
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

test("building placement reserves exact coordinates; invalid attempts do not charge resources", () => {
  const g = createGame();
  g.ore = 3000;
  const ore = g.ore;
  const hq = g.actors.find((a) => a.team === 1 && a.type === "hq");
  assert.match(submit(g, "factory"), /选择建造位置/);
  assert.match(submit(g, "factory", { x: 2, y: H - 30 }), /边界/);
  assert.match(submit(g, "factory", g.mines[0]), /矿脉/);
  assert.match(submit(g, "factory", g.relays[0]), /中继站/);
  assert.match(submit(g, "factory", hq), /建筑重叠/);
  assert.equal(g.ore, ore);
  assert.equal(g.construction.length, 0);
  const a = { x: 996, y: 1150 },
    b = { x: 1090, y: 1190 };
  assert.equal(submit(g, "factory", a), "");
  assert.equal(g.ore, ore - buildings.factory.cost);
  assert.match(submit(g, "generator", a), /施工占地/);
  assert.equal(submit(g, "generator", b), "");
  a.x = 100; // mutating the caller's point cannot move a reservation
  advance(g, 8.9);
  assert.equal(factories(g).length, 1);
  advance(g, 0.1);
  assert.ok(factories(g).some((f) => f.x === 996 && f.y === 1150));
  advance(g, 6);
  assert.ok(
    g.actors.some((f) => f.type === "generator" && f.x === b.x && f.y === b.y),
  );
});

test("ten T2 vehicles and one T3 mech unlock at their own research tier", () => {
  const g = createGame();
  Object.assign(g, { ore: 20000, crystal: 600, uranium: 100 });
  const t2 = Object.keys(units).filter((key) => units[key].tech === "t2");
  const t3 = Object.keys(units).filter((key) => units[key].tech === "t3");
  assert.equal(t2.length, 10);
  assert.deepEqual(t3, ["titan"]);
  assert.ok(t2.every((k) => /T2/.test(submit(g, k))));
  assert.match(submit(g, "titan"), /T3/);
  assert.equal(enqueue(g, "lab"), "");
  advance(g, 9);
  assert.match(startResearch(g, "t3"), /T2/);
  assert.equal(startResearch(g, "t2"), "");
  advance(g, 16.1);
  for (const k of t2) assert.equal(submit(g, k), "");
  g.uranium = 0;
  assert.match(startResearch(g, "t3"), /铀不足/);
  g.uranium = 100;
  assert.equal(startResearch(g, "t3"), "");
  assert.equal(g.uranium, 72);
  advance(g, 23.9);
  assert.match(submit(g, "titan"), /T3/);
  advance(g, 0.2);
  assert.equal(submit(g, "titan"), "");
  assert.equal(g.uranium, 38);
});

test("losing a research center refunds all T3 research resources, including uranium", () => {
  const g = createGame();
  Object.assign(g, { ore: 5000, crystal: 100, uranium: 40 });
  assert.equal(enqueue(g, "lab"), "");
  advance(g, 9);
  g.tech.add("t2");
  assert.equal(startResearch(g, "t3"), "");
  const balances = [g.ore, g.crystal, g.uranium];
  g.actors.find((a) => a.team === 1 && a.type === "lab").hp = 0;
  step(g, 0);
  assert.deepEqual(
    [g.ore, g.crystal, g.uranium],
    balances.map((v, i) => v + [650, 60, 28][i]),
  );
  assert.equal(g.research, null);
  assert.ok(!g.tech.has("t3"));
});

test("economy, armor and support upgrades affect the simulation, not just displayed stats", () => {
  const g = createGame();
  g.tech.add("extraction");
  assert.equal(income(g), 14);
  g.tech.add("logistics");
  assert.equal(movementSpeed(g, { team: 1, type: "miner" }), 39);
  assert.ok(
    Math.abs(movementSpeed(g, { team: 1, type: "tank" }) - 43 * 1.12) < 1e-9,
  );
  g.tech.add("repairBoost");
  assert.equal(repairRate(g, { team: 1, type: "fieldMedic" }), 11 * 1.3);
  g.tech.add("armorPlating");
  g.nextThink = Infinity;
  const target = g.actors.find((a) => a.team === 1 && a.type === "tank"),
    foe = g.actors.find((a) => a.team === -1 && a.type === "tank");
  Object.assign(target, { x: 300, y: 300, type: "vanguard", hp: 395, cd: 100 });
  Object.assign(foe, { x: 375, y: 300, type: "disruptor", cd: 0 });
  step(g, 1 / 30);
  assert.equal(
    target.hp,
    395 - Math.round(catalog.disruptor.damage * 0.8 * 0.9),
  );
  assert.ok(target.slowTime > 1.4);
  const gun = g.actors.find((a) => a.team === -1 && a.type === "scout");
  Object.assign(gun, { x: 500, y: 300, type: "railgun", cd: 0 });
  const hp = target.hp;
  step(g, 1 / 30);
  assert.equal(target.hp, hp - catalog.railgun.damage);
  const medic = g.actors.find((a) => a.team === 1 && a.type === "scout");
  Object.assign(medic, { x: 300, y: 343, type: "fieldMedic", hp: 130 });
  target.shield = 0;
  const before = target.hp;
  step(g, 0.1);
  assert.ok(Math.abs(target.hp - before - 1.43) < 1e-8);
  assert.equal(medic.hp, 130);
});

test("red buys a shield counter and chooses a less defended attack route", () => {
  const make = (shields) => {
    const g = createGame();
    g.wave = 4;
    g.nextWave = 0;
    g.nextThink = Infinity;
    g.red.nextEconomy = Infinity;
    Object.assign(g.red, { ore: 3000, crystal: 120 });
    g.red.tech.add("t2");
    const p = location(600, 412);
    for (const a of g.actors.filter((a) => a.team === 1 && a.type === "tank"))
      Object.assign(a, p, shields ? { type: "uraniumTank", shield: 144 } : {});
    step(g, 1 / 30);
    return { g, p };
  };
  const { g, p } = make(true),
    plain = make(false).g;
  assert.equal(g.red.production[0].type, "disruptor");
  assert.notEqual(plain.red.production[0].type, "disruptor");
  assert.notDeepEqual(g.red.production[0].rally, p);
  assert.ok(g.red.ore < 3000 && g.red.crystal < 120);
  assert.ok(g.red.production.some((q) => q.type === "fieldMedic"));
});

test("T3 shells damage and slow enemies in their impact area without slowing allies", () => {
  const g = createGame();
  g.nextThink = Infinity;
  const titan = g.actors.find((a) => a.team === 1 && a.type === "tank");
  const [first, second] = g.actors.filter(
    (a) => a.team === -1 && a.type === "scout",
  );
  const ally = g.actors.find((a) => a.team === 1 && a.type === "scout");
  Object.assign(titan, { type: "titan", x: 300, y: 300, cd: 0 });
  Object.assign(first, { x: 520, y: 300, hp: 200, cd: 100 });
  Object.assign(second, { x: 540, y: 340, hp: 200, cd: 100 });
  Object.assign(ally, { x: 530, y: 270, cd: 100 });
  step(g, 1 / 30);
  assert.equal(g.shells.length, 1);
  advance(g, 0.8);
  assert.ok(first.hp < second.hp && second.hp < 200);
  assert.ok(first.slowTime > 2 && second.slowTime > 2);
  assert.equal(ally.slowTime, 0);
  advance(g, 2.5);
  assert.equal(first.slowTime, 0);
});

test("a factory placed on the far edge deploys units inside the map and holds them locally", () => {
  const g = createGame();
  g.ore = 1000;
  assert.equal(submit(g, "factory", { x: W - 25, y: H - 25 }), "");
  advance(g, 9);
  factories(g)[0].hp = 0;
  assert.equal(submit(g, "scout"), "");
  const ids = new Set(g.actors.map((a) => a.id));
  advance(g, 5);
  const scout = g.actors.find((a) => a.team === 1 && !ids.has(a.id));
  assert.ok(
    scout.x < W && scout.y < H && scout.x > W - 150 && scout.y > H - 150,
  );
  assert.equal(scout.order, null);
});
