export const W = 960,
  H = 576;
export const units = {
  miner: {
    name: "采矿车",
    desc: "资源采集 · 经济",
    cost: 100,
    hp: 100,
    speed: 39,
    size: 12,
    time: 4,
  },
  scout: {
    name: "侦察车",
    desc: "高速机动 · 轻型",
    cost: 120,
    hp: 90,
    speed: 66,
    size: 10,
    range: 95,
    damage: 12,
    rate: 0.55,
    time: 5,
  },
  tank: {
    name: "轻型坦克",
    desc: "前线作战 · 装甲",
    cost: 180,
    hp: 175,
    speed: 43,
    size: 13,
    range: 118,
    damage: 24,
    rate: 0.85,
    time: 7,
  },
  heavy: {
    name: "重型坦克",
    desc: "装甲突击 · 重型",
    cost: 300,
    hp: 325,
    speed: 30,
    size: 16,
    range: 142,
    damage: 49,
    rate: 1.15,
    time: 11,
    power: 16,
  },
};
export const buildings = {
  generator: {
    name: "供电站",
    desc: "电力上限 +8",
    cost: 140,
    hp: 230,
    size: 22,
    time: 6,
  },
  turret: {
    name: "防御塔",
    desc: "自动防守 · 消耗 2 电力",
    cost: 200,
    hp: 280,
    size: 18,
    range: 145,
    damage: 25,
    rate: 0.7,
    time: 8,
  },
  hq: {
    name: "指挥中心",
    hp: 1150,
    size: 31,
    range: 120,
    damage: 16,
    rate: 0.9,
  },
  factory: { name: "战车工厂", hp: 560, size: 25 },
};
export const catalog = { ...units, ...buildings };
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function createGame() {
  const g = {
    ore: 640,
    time: 0,
    nextWave: 55,
    lastWave: 0,
    wave: 0,
    serial: 0,
    actors: [],
    queue: [],
    shots: [],
    bursts: [],
    events: [],
    result: null,
    relays: [
      { x: 484, y: 179, name: "A", owner: 0, progress: 0 },
      { x: 624, y: 385, name: "B", owner: 0, progress: 0 },
    ],
    mines: [
      { x: 167, y: 354 },
      { x: 791, y: 357 },
      { x: 298, y: 162 },
    ],
    selected: new Set(),
  };
  spawn(g, "hq", 1, 237, 446);
  spawn(g, "factory", 1, 169, 474);
  spawn(g, "generator", 1, 248, 505);
  spawn(g, "turret", 1, 316, 444);
  spawn(g, "hq", -1, 756, 135);
  spawn(g, "factory", -1, 830, 121);
  spawn(g, "generator", -1, 813, 183);
  spawn(g, "turret", -1, 704, 173);
  const miner = spawn(g, "miner", 1, 190, 370, -2.15);
  miner.order = { kind: "mine", ...g.mines[0] };
  spawn(g, "scout", 1, 365, 360, -0.65);
  spawn(g, "scout", 1, 383, 400, -0.57);
  g.selected.add(spawn(g, "tank", 1, 316, 377, -0.6).id);
  spawn(g, "tank", 1, 340, 403, -0.68);
  spawn(g, "tank", -1, 662, 212, 2.55);
  spawn(g, "scout", -1, 698, 245, 2.55);
  spawn(g, "scout", -1, 756, 253, 2.55);
  return g;
}
function spawn(g, type, team, x, y, angle = team === 1 ? -0.7 : 2.4) {
  const spec = catalog[type];
  const a = {
    id: ++g.serial,
    type,
    team,
    x,
    y,
    angle,
    hp: spec.hp,
    cd: 0,
    order: null,
  };
  g.actors.push(a);
  return a;
}
export const owns = (g, type) =>
  g.actors.some((a) => a.type === type && a.team === 1 && a.hp > 0);
export const fleet = (g) =>
  g.actors.filter((a) => a.team === 1 && units[a.type] && a.hp > 0).length;
export const generatorCount = (g) =>
  g.actors.filter((a) => a.team === 1 && a.type === "generator" && a.hp > 0)
    .length;
export const capacity = (g) => 4 + 8 * generatorCount(g);
export const load = (g) =>
  6 +
  2 *
    g.actors.filter((a) => a.team === 1 && a.type === "turret" && a.hp > 0)
      .length;
export const mining = (g, a) =>
  a.type === "miner" && a.order?.kind === "mine" && dist(a, a.order) < 32;
export const relayCount = (g) => g.relays.filter((r) => r.owner === 1).length;
export const income = (g) =>
  4 +
  8 * g.actors.filter((a) => a.team === 1 && mining(g, a)).length +
  5 * relayCount(g);
export const selected = (g) =>
  g.actors.filter((a) => g.selected.has(a.id) && a.team === 1 && a.hp > 0);
export function blocked(g, type) {
  const spec = catalog[type];
  if (!spec?.cost) return "该单位不能生产";
  if (g.result) return "战斗已结束";
  if (g.queue.length >= 6) return "生产队列已满";
  if (g.ore + 1e-6 < spec.cost) return "矿石不足";
  if (units[type] && !owns(g, "factory")) return "战车工厂已损毁";
  if (
    units[type] &&
    fleet(g) + g.queue.filter((q) => units[q.type]).length >= 30
  )
    return "部队已达上限";
  if (spec.power && capacity(g) < spec.power)
    return "需要至少 " + spec.power + " 点供电";
  if (
    type === "turret" &&
    load(g) + 2 * (1 + g.queue.filter((q) => q.type === "turret").length) >
      capacity(g)
  )
    return "供电不足，请建造供电站";
  return "";
}
export function enqueue(g, type) {
  const reason = blocked(g, type);
  if (reason) return reason;
  const spec = catalog[type];
  g.ore -= spec.cost;
  g.queue.push({ type, left: spec.time });
  return "";
}
export function order(g, x, y, mode = "auto") {
  if (g.result) return "";
  const group = selected(g).filter((a) => units[a.type]);
  if (!group.length) return "请先选择一支移动部队。";
  const point = { x, y },
    enemy =
      mode !== "move" &&
      g.actors.find(
        (a) => a.team === -1 && dist(a, point) < catalog[a.type].size + 7,
      );
  const deposit = mode !== "attack" && g.mines.find((m) => dist(m, point) < 35);
  const columns = Math.ceil(Math.sqrt(group.length)),
    rows = Math.ceil(group.length / columns);
  group.forEach((a, i) => {
    const pos = {
      x: clamp(
        x +
          ((i % columns) -
            (Math.min(
              columns,
              group.length - Math.floor(i / columns) * columns,
            ) -
              1) /
              2) *
            28,
        12,
        W - 12,
      ),
      y: clamp(y + (Math.floor(i / columns) - (rows - 1) / 2) * 27, 12, H - 12),
    };
    a.order =
      enemy && catalog[a.type].range
        ? { kind: "target", id: enemy.id }
        : deposit && a.type === "miner"
          ? { kind: "mine", ...deposit }
          : { kind: mode === "attack" ? "attack" : "move", ...pos };
  });
  return enemy
    ? "攻击目标已锁定。"
    : deposit && group.some((a) => a.type === "miner")
      ? "采矿车已前往矿床。"
      : mode === "attack"
        ? "部队正在向目标区域推进。"
        : "部队正在向标记位置移动。";
}
export function stop(g) {
  for (const a of selected(g)) a.order = null;
}
function move(a, target, s, dt) {
  const d = dist(a, target);
  if (d < 1) return true;
  const m = Math.min(d, s * dt);
  a.angle = Math.atan2(target.y - a.y, target.x - a.x);
  a.x = clamp(a.x + Math.cos(a.angle) * m, 10, W - 10);
  a.y = clamp(a.y + Math.sin(a.angle) * m, 10, H - 10);
  return d < 3;
}
function nearest(g, a, r) {
  let best = null;
  for (const b of g.actors) {
    if (b.team === a.team || b.hp <= 0) continue;
    const d = dist(a, b) - catalog[b.type].size * 0.55;
    if (d < r) {
      best = b;
      r = d;
    }
  }
  return best;
}
export function step(g, dt) {
  if (g.result) return;
  g.time += dt;
  g.ore = Math.min(99999, g.ore + income(g) * dt);
  const job = g.queue[0];
  if (job) {
    if (units[job.type] && !owns(g, "factory")) {
      g.ore += catalog[job.type].cost;
      g.queue.shift();
      g.events.push("工厂损毁，生产订单已退款。");
    } else if ((job.left -= dt) <= 0) {
      const t = job.type,
        factory = g.actors.find(
          (a) => a.team === 1 && a.type === "factory" && a.hp > 0,
        );
      let deployed = true;
      if (units[t]) {
        const a = spawn(
          g,
          t,
          1,
          factory.x + 43 + (g.serial % 3) * 24,
          factory.y + 16 - (g.serial % 5) * 22,
        );
        a.order = {
          kind: "move",
          x: 284 + (g.serial % 3) * 25,
          y: 461 - (g.serial % 4) * 27,
        };
      } else {
        const positions = [
          [119, 497],
          [293, 515],
          [353, 464],
          [248, 553],
          [137, 425],
          [375, 535],
          [325, 554],
          [100, 458],
        ];
        const pos = positions.find(
          ([x, y]) =>
            !g.actors.some((a) => buildings[a.type] && dist(a, { x, y }) < 37),
        );
        if (pos) spawn(g, t, 1, ...pos);
        else {
          g.ore += catalog[t].cost;
          g.events.push("基地没有空余建造位置，已退款。");
          deployed = false;
        }
      }
      g.queue.shift();
      if (deployed) g.events.push(catalog[t].name + "部署完成。");
    }
  }
  if (g.time >= g.nextWave) {
    g.wave++;
    g.lastWave = g.time;
    g.nextWave = g.time + Math.max(32, 54 - g.wave * 4);
    const base = g.actors.find((a) => a.type === "hq" && a.team === 1);
    if (base)
      for (let i = 0; i < Math.min(9, 2 + g.wave); i++) {
        const a = spawn(
          g,
          i === 0 && g.wave > 2 ? "heavy" : i % 3 === 0 ? "tank" : "scout",
          -1,
          754 + 24 * (i % 5),
          224 + 26 * Math.floor(i / 5),
        );
        a.order = { kind: "attack", x: base.x, y: base.y };
      }
    g.events.push("侦测到第 " + g.wave + " 波敌方增援！");
  }
  const brownout = load(g) > capacity(g);
  for (const a of g.actors) {
    if (a.hp <= 0 || (brownout && a.team === 1 && a.type === "turret"))
      continue;
    const s = catalog[a.type];
    a.cd -= dt;
    let o = a.order;
    let target =
      o?.kind === "target"
        ? g.actors.find((b) => b.id === o.id && b.hp > 0)
        : null;
    if (o?.kind === "target" && !target) {
      a.order = null;
      o = null;
    }
    if (
      s.range &&
      (!target || dist(a, target) - catalog[target.type].size * 0.55 > s.range)
    ) {
      const nearby = o?.kind !== "move" ? nearest(g, a, s.range) : null;
      if (nearby && !target) target = nearby;
    }
    if (
      target &&
      s.range &&
      dist(a, target) - catalog[target.type].size * 0.55 <= s.range
    ) {
      a.angle = Math.atan2(target.y - a.y, target.x - a.x);
      if (a.cd <= 0) {
        a.cd = s.rate;
        target.hp -= s.damage;
        g.shots.push({
          x: a.x,
          y: a.y,
          tx: target.x,
          ty: target.y,
          team: a.team,
          life: 0.18,
        });
        if (target.hp <= 0)
          g.bursts.push({ x: target.x, y: target.y, life: 0.65 });
      }
    } else if (s.speed && o) {
      const destination = target || o;
      if (
        Number.isFinite(destination.x) &&
        !mining(g, a) &&
        move(a, destination, s.speed, dt) &&
        o.kind !== "mine" &&
        o.kind !== "target"
      )
        a.order = null;
    }
  }
  for (let i = 0; i < g.actors.length; i++) {
    const a = g.actors[i];
    if (!units[a.type] || a.hp <= 0) continue;
    for (let j = 0; j < g.actors.length; j++) {
      const b = g.actors[j];
      if (i === j || b.hp <= 0 || (units[b.type] && j < i)) continue;
      const dx = a.x - b.x,
        dy = a.y - b.y,
        d = Math.hypot(dx, dy),
        limit = (catalog[a.type].size + catalog[b.type].size) * 0.83;
      if (d >= limit) continue;
      const push = Math.min(limit - d, dt * 45) * (units[b.type] ? 0.5 : 1),
        ux = d > 0.01 ? dx / d : i % 2 ? 1 : -1,
        uy = d > 0.01 ? dy / d : 0;
      a.x = clamp(a.x + ux * push, 10, W - 10);
      a.y = clamp(a.y + uy * push, 10, H - 10);
      if (units[b.type]) {
        b.x = clamp(b.x - ux * push, 10, W - 10);
        b.y = clamp(b.y - uy * push, 10, H - 10);
      }
    }
  }
  g.actors = g.actors.filter((a) => {
    if (a.hp > 0) return true;
    g.selected.delete(a.id);
    return false;
  });
  for (const r of g.relays) {
    const blue = g.actors.some(
        (a) => a.team === 1 && units[a.type] && dist(a, r) < 49,
      ),
      red = g.actors.some(
        (a) => a.team === -1 && units[a.type] && dist(a, r) < 49,
      );
    if (blue !== red) {
      const goal = blue ? 1 : -1;
      r.progress = clamp(r.progress + (goal * dt) / 4, -1, 1);
      if (r.progress === goal && r.owner !== goal) {
        r.owner = goal;
        g.events.push(
          "中继站 " +
            r.name +
            (blue ? " 已占领，矿石收入 +5。" : " 已被敌方占领。"),
        );
      }
    }
  }
  for (const list of [g.shots, g.bursts]) {
    for (const e of list) e.life -= dt;
    while (list[0]?.life <= 0) list.shift();
  }
  if (!owns(g, "hq")) g.result = "defeat";
  else if (!g.actors.some((a) => a.type === "hq" && a.team === -1))
    g.result = "victory";
}
