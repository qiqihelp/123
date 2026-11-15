'use strict';

const assert = require('assert');
const sim = require('./sim.js');

let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('ok  ' + name);
  } catch (err) {
    failed++;
    console.error('FAIL ' + name);
    console.error(err && err.stack ? err.stack : err);
  }
}

function run(state, seconds) {
  const step = 1 / 30;
  const n = Math.round(seconds / step);
  for (let i = 0; i < n; i++) sim.update(state, step);
}

test('starter line delivers copper', () => {
  const s = sim.createState();
  const before = s.inv.copper;
  console.log(sim.debugMap(s));
  run(s, 6);
  assert.ok(s.inv.copper > before, 'copper ' + before + ' -> ' + s.inv.copper);
  assert.ok(s.stats.mined.copper > 0, 'mined ' + s.stats.mined.copper);
});

test('drill jams without output', () => {
  const s = sim.createState({ bare: true });
  s.inv.copper = 50;
  const tile = s.tiles[13][2];
  assert.strictEqual(tile.ore, 'copper');
  const placed = sim.place(s, 'drill', 2, 13, 0);
  assert.ok(placed.ok, placed.reason);
  const left = s.tiles[13][2].oreLeft;
  run(s, 3);
  assert.strictEqual(s.tiles[13][2].oreLeft, left);
  assert.strictEqual(placed.building.stalled, true);
});

test('router splits to core and a side belt', () => {
  const s = sim.createState({ bare: true });
  s.inv.copper = 80;
  assert.ok(sim.place(s, 'drill', 2, 13, 0).ok);
  assert.ok(sim.place(s, 'belt', 3, 13, 0).ok);
  assert.ok(sim.place(s, 'router', 4, 13).ok);
  assert.ok(sim.place(s, 'belt', 5, 13, 0).ok);
  assert.ok(sim.place(s, 'belt', 4, 14, 1).ok);
  run(s, 8);
  const side = s.grid[14][4];
  const right = s.grid[13][5];
  const sideN = side.items.length;
  const rightN = right.items.length;
  assert.ok(sideN + rightN > 0, 'no items left the router');
});

test('belt feeds turret ammo', () => {
  const s = sim.createState({ bare: true });
  s.inv.copper = 80;
  assert.ok(sim.place(s, 'drill', 2, 13, 0).ok);
  assert.ok(sim.place(s, 'belt', 3, 13, 0).ok);
  const duo = sim.place(s, 'duo', 4, 13, 0);
  assert.ok(duo.ok, duo.reason);
  run(s, 6);
  assert.ok(duo.building.ammo > 0, 'ammo ' + duo.building.ammo);
});

test('enemies walk toward the core', () => {
  const s = sim.createState({ bare: true });
  s.prepTime = 999;
  const called = sim.callWave(s);
  assert.ok(called.ok);
  run(s, 3);
  assert.ok(s.enemies.length > 0);
  assert.ok(s.enemies[0].y > 1.4, 'y=' + s.enemies[0].y);
});

test('sealed wall is attacked and core holds', () => {
  const s = sim.createState({ bare: true });
  s.inv.copper = 999;
  s.prepTime = 999;
  for (let x = 1; x < 15; x++) sim.place(s, 'cwall', x, 3, 0);
  sim.callWave(s);
  run(s, 8);
  const walls = s.buildings.filter((b) => b.type === 'cwall');
  assert.ok(walls.some((w) => w.hp < w.maxHp), 'walls undamaged');
  assert.strictEqual(s.core.hp, s.core.maxHp);
});

test('one duo holds wave 1', () => {
  const s = sim.createState({ bare: true });
  s.inv.copper = 200;
  s.prepTime = 999;
  const duo = sim.place(s, 'duo', 7, 8, 0);
  assert.ok(duo.ok, duo.reason);
  duo.building.ammo = 80;
  sim.callWave(s);
  run(s, 18);
  assert.notStrictEqual(s.over, 'dead');
  assert.strictEqual(s.core.hp, s.core.maxHp);
  assert.strictEqual(s.enemies.length, 0);
  assert.strictEqual(s.waveIndex, 1);
});

test('no defense leaks', () => {
  const s = sim.createState({ bare: true });
  s.prepTime = 999;
  sim.callWave(s);
  run(s, 40);
  assert.ok(s.core.hp < s.core.maxHp, 'hp ' + s.core.hp);
});

test('refund and locked building', () => {
  const s = sim.createState({ bare: true });
  s.inv.copper = 12;
  const placed = sim.place(s, 'drill', 2, 13, 1);
  assert.ok(placed.ok);
  assert.strictEqual(s.inv.copper, 0);
  const again = sim.place(s, 'drill', 1, 13, 1);
  assert.strictEqual(again.reason, 'cost');
  const demo = sim.demolish(s, 2, 13);
  assert.ok(demo.ok);
  assert.strictEqual(s.inv.copper, 12);
  const locked = sim.place(s, 'scatter', 8, 8, 0);
  assert.strictEqual(locked.reason, 'locked');
});

test('graphite press needs coal and power', () => {
  const s = sim.createState({ bare: true });
  s.waveIndex = 3;
  s.unlocked.press = true;
  s.unlocked.generator = true;
  s.inv.copper = 100;
  s.inv.lead = 40;
  const press = sim.place(s, 'press', 8, 10, 1);
  const gen = sim.place(s, 'generator', 9, 10, 0);
  assert.ok(press.ok && gen.ok);
  press.building.input = 4;
  gen.building.fuel = 4;
  run(s, 5);
  assert.ok(s.stats.crafted > 0, 'crafted ' + s.stats.crafted);
});

test('save roundtrip', () => {
  const s = sim.createState();
  run(s, 2);
  sim.place(s, 'cwall', 8, 8, 0);
  const raw = sim.serialize(s);
  const back = sim.hydrate(raw);
  assert.strictEqual(back.inv.copper, s.inv.copper);
  assert.ok(back.buildings.some((b) => b.type === 'cwall' && b.x === 8 && b.y === 8));
  assert.strictEqual(back.core.x, 7);
});

test('launch requires waves and resources', () => {
  const s = sim.createState({ bare: true });
  assert.strictEqual(sim.launch(s).reason, 'early');
  s.waveIndex = 5;
  s.launchUnlocked = true;
  Object.assign(s.inv, { copper: 180, lead: 80, coal: 40, titanium: 24, graphite: 16 });
  const res = sim.launch(s);
  assert.ok(res.ok, JSON.stringify(res));
  assert.strictEqual(s.over, 'launch');
  assert.strictEqual(s.inv.copper, 0);
});

test('junction crosses two lanes', () => {
  const s = sim.createState({ bare: true });
  s.inv.copper = 40;
  s.unlocked.junction = true;
  assert.ok(sim.place(s, 'junction', 6, 12).ok);
  assert.ok(sim.place(s, 'belt', 5, 12, 0).ok);
  assert.ok(sim.place(s, 'belt', 7, 12, 0).ok);
  assert.ok(sim.place(s, 'belt', 6, 11, 1).ok);
  assert.ok(sim.place(s, 'belt', 6, 13, 1).ok);
  s.grid[12][5].items.push({ type: 'copper', t: 0.8, fresh: false });
  s.grid[11][6].items.push({ type: 'lead', t: 0.8, fresh: false });
  run(s, 2);
  const right = s.grid[12][7];
  const down = s.grid[13][6];
  const types = []
    .concat(right.items.map((it) => it.type))
    .concat(down.items.map((it) => it.type));
  assert.ok(types.indexOf('copper') >= 0 || types.indexOf('lead') >= 0, 'junction did not pass items: ' + types.join(','));
});

if (failed) {
  console.error(failed + ' failed');
  process.exit(1);
}
console.log('all passed');
