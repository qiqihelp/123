import test from "node:test";
import assert from "node:assert/strict";
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
  relayCount,
  catalog,
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
  advance(g, 7.1);
  assert.equal(fleet(g), 7);
  assert.equal(capacity(g), 12);
  advance(g, 6.1);
  assert.equal(capacity(g), 20);
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
  const combat = ["tank", "scout", "heavyArtillery", "lightArtillery"];
  const send = (x, y) => {
    choose(g, combat);
    const p = location(x, y);
    order(g, p.x, p.y, "sweep");
  };
  send(484, 179);
  for (const type of ["tank", "tank", "generator"])
    assert.equal(enqueue(g, type), "");
  advance(g, 24 + 1 / 30);
  assert.equal(enqueue(g, "heavyArtillery"), "");
  advance(g, 6);
  send(735, 175);
  advance(g, 6);
  assert.equal(enqueue(g, "lightArtillery"), "");
  advance(g, 12);
  assert.equal(enqueue(g, "lightArtillery"), "");
  advance(g, 2);
  send(735, 175);
  advance(g, 24);
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
