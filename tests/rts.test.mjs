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
  assert.equal(fleet(g), 5);
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
  assert.equal(fleet(g), 6);
  assert.equal(capacity(g), 12);
  advance(g, 6.1);
  assert.equal(capacity(g), 20);
  assert.equal(enqueue(g, "heavy"), "");
  advance(g, 11.1);
  assert.equal(fleet(g), 7);
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
  choose(g, ["tank", "scout"]);
  order(g, 484, 179, "attack");
  for (const type of ["tank", "tank", "generator"])
    assert.equal(enqueue(g, type), "");
  advance(g, 28.1);
  assert.equal(enqueue(g, "heavy"), "");
  advance(g, 1.9);
  choose(g, ["tank", "scout", "heavy"]);
  order(g, 735, 175, "attack");
  advance(g, 28);
  assert.equal(g.result, "victory");
  const endedAt = g.time;
  advance(g, 10);
  assert.equal(g.time, endedAt);
});
