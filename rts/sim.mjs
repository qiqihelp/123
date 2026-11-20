export const W = 3200,
  H = 1440;
export const CORE_X = 850,
  CORE_Y = 320;
export const START_VIEW = { x: 1390, y: 702, z: 2.55 };
export const field = (x, y) => [
  CORE_X + Math.round((x * 1280) / 960),
  CORE_Y + Math.round((y * 720) / 576),
];
export const location = (x, y) => {
  const [px, py] = field(x, y);
  return { x: px, y: py };
};
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
  lightArtillery: {
    name: "轻型火炮",
    desc: "远程炮击 · 小范围",
    cost: 240,
    hp: 125,
    speed: 35,
    size: 15,
    range: 205,
    damage: 66,
    rate: 2.55,
    splash: 28,
    flight: 0.48,
    time: 9,
  },
  heavyArtillery: {
    name: "重型火炮",
    desc: "超远射程 · 大范围",
    cost: 430,
    hp: 215,
    speed: 24,
    size: 19,
    range: 265,
    damage: 112,
    rate: 4.1,
    splash: 46,
    flight: 0.68,
    time: 14,
    power: 20,
  },
  missileTank: {
    name: "导弹坦克",
    desc: "双发导弹 · 自动追踪",
    cost: 320,
    hp: 180,
    speed: 41,
    size: 16,
    range: 183,
    damage: 38,
    rate: 2.4,
    time: 10,
    missiles: 2,
    flight: 0.72,
    splash: 24,
  },
  raider: {
    name: "疾风坦克",
    desc: "快速射击 · 侧翼突袭",
    cost: 155,
    hp: 121,
    speed: 63,
    size: 12,
    range: 107,
    damage: 14,
    rate: 0.4,
    time: 5,
  },
  assault: {
    name: "攻坚坦克",
    desc: "破甲重炮 · 克制建筑",
    cost: 335,
    hp: 285,
    speed: 33,
    size: 17,
    range: 156,
    damage: 54,
    rate: 1.55,
    time: 10,
    structureBonus: 1.5,
  },
  plasmaTank: {
    name: "等离子坦克",
    desc: "T2 · 自修护盾",
    cost: 465,
    crystal: 16,
    hp: 240,
    shield: 96,
    speed: 39,
    size: 17,
    range: 172,
    damage: 86,
    rate: 1.75,
    time: 13,
    plasma: true,
    flight: 0.29,
    tech: "t2",
  },
  missileT2: {
    name: "导弹坦克 T2",
    desc: "T2 · 四发齐射",
    cost: 530,
    crystal: 20,
    hp: 245,
    speed: 37,
    size: 18,
    range: 231,
    damage: 45,
    rate: 3.4,
    time: 15,
    missiles: 4,
    flight: 0.77,
    splash: 29,
    tech: "t2",
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
    powerDraw: 2,
    range: 145,
    damage: 25,
    rate: 0.7,
    time: 8,
  },

  repair: {
    name: "维修站",
    desc: "修复近处友方车辆",
    cost: 160,
    hp: 290,
    size: 23,
    time: 7,
    powerDraw: 2,
    heal: 12,
    radius: 85,
  },
  refinery: {
    name: "精炼厂",
    desc: "持续产出矿石 +6",
    cost: 220,
    hp: 305,
    size: 24,
    time: 8,
    powerDraw: 2,
    income: 6,
  },
  mortar: {
    name: "迫击炮塔",
    desc: "远程轰炸 · 范围防御",
    cost: 280,
    hp: 260,
    size: 20,
    time: 10,
    powerDraw: 3,
    range: 208,
    damage: 65,
    rate: 2.55,
    splash: 34,
    flight: 0.53,
  },
  lab: {
    name: "研究中心",
    desc: "解锁 T2 及分支科技",
    cost: 245,
    hp: 310,
    size: 25,
    time: 9,
    powerDraw: 3,
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
export const techs = {
  t2: {
    name: "T2 科技",
    desc: "解锁等离子坦克与 T2 导弹坦克",
    short: "解锁两种 T2 坦克",
    cost: 300,
    crystal: 24,
    time: 16,
  },
  plasmaFocus: {
    name: "等离子聚焦",
    desc: "等离子单发伤害 +18",
    short: "等离子伤害 +18",
    cost: 225,
    crystal: 22,
    time: 12,
    requires: "t2",
  },
  guidance: {
    name: "制导升级",
    desc: "两款导弹坦克单枚伤害 +8",
    short: "导弹单发伤害 +8",
    cost: 210,
    crystal: 18,
    time: 12,
    requires: "t2",
  },
};
export const minerals = {
  ore: { name: "普通矿", label: "ORE", ore: 8, crystal: 0, color: "#71b7c9" },
  rich: {
    name: "高纯矿",
    label: "RICH",
    ore: 14,
    crystal: 0,
    color: "#e3bd68",
  },
  crystal: {
    name: "晶能矿",
    label: "CRYSTAL",
    ore: 4,
    crystal: 2,
    color: "#ad9bea",
  },
  prism: {
    name: "富晶矿",
    label: "PRISM",
    ore: 2,
    crystal: 4,
    color: "#e993cb",
  },
};
const mine = (x, y, kind = "ore") => ({ x, y, kind });
const localMine = (x, y, kind) => ({ ...location(x, y), kind: kind || "ore" });
export const catalog = { ...units, ...buildings };
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function createGame() {
  const g = {
    ore: 640,
    crystal: 0,
    tech: new Set(),
    research: null,
    time: 0,
    nextWave: 55,
    lastWave: 0,
    wave: 0,
    nextThink: 0,
    serial: 0,
    actors: [],
    queue: [],
    shots: [],
    shells: [],
    plasma: [],
    damageText: [],
    missiles: [],
    smoke: [],
    bursts: [],
    events: [],
    result: null,
    relays: [
      { ...location(484, 179), name: "A", owner: 0, progress: 0 },
      { ...location(624, 385), name: "B", owner: 0, progress: 0 },
      { x: 470, y: 665, name: "C", owner: 0, progress: 0 },
      { x: 1560, y: 188, name: "D", owner: 0, progress: 0 },
      { x: 2580, y: 1010, name: "E", owner: 0, progress: 0 },
    ],
    mines: [
      localMine(167, 354),
      localMine(791, 357),
      localMine(298, 162),
      localMine(485, 483),
      localMine(284, 329, "crystal"),
      localMine(530, 89, "rich"),
      localMine(872, 232, "crystal"),
      mine(260, 435, "ore"),
      mine(410, 820, "crystal"),
      mine(587, 494, "rich"),
      mine(625, 1127, "prism"),
      mine(940, 1215, "ore"),
      mine(1128, 185, "rich"),
      mine(1735, 226, "prism"),
      mine(2086, 198, "ore"),
      mine(2460, 333, "rich"),
      mine(2825, 390, "crystal"),
      mine(2375, 725, "ore"),
      mine(2885, 775, "rich"),
      mine(2720, 1125, "prism"),
      mine(2235, 1200, "crystal"),
      mine(1765, 1250, "ore"),
      mine(1330, 1190, "rich"),
    ],
    selected: new Set(),
  };
  spawn(g, "hq", 1, ...field(237, 446));
  spawn(g, "factory", 1, ...field(169, 474));
  spawn(g, "generator", 1, ...field(248, 505));
  spawn(g, "turret", 1, ...field(316, 444));
  spawn(g, "hq", -1, ...field(756, 135));
  spawn(g, "factory", -1, ...field(830, 121));
  spawn(g, "generator", -1, ...field(813, 183));
  spawn(g, "turret", -1, ...field(704, 173));
  const miner = spawn(g, "miner", 1, ...field(186, 367), -2.15);
  miner.order = { ...g.mines[0], kindOfMine: g.mines[0].kind, kind: "mine" };
  spawn(g, "scout", 1, ...field(365, 360), -0.65);
  spawn(g, "scout", 1, ...field(383, 400), -0.57);
  g.selected.add(spawn(g, "tank", 1, ...field(316, 377), -0.6).id);
  spawn(g, "tank", 1, ...field(340, 403), -0.68);
  spawn(g, "lightArtillery", 1, ...field(377, 436), -0.62);
  spawn(g, "tank", -1, ...field(662, 212), 2.55);
  spawn(g, "lightArtillery", -1, ...field(806, 229), 2.55);
  spawn(g, "scout", -1, ...field(698, 245), 2.55);
  spawn(g, "scout", -1, ...field(756, 253), 2.55);
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
    aim: angle,
    recoil: 0,
    hitFlash: 0,
    repairGlow: 0,
    hp: spec.hp,
    shield: spec.shield || 0,
    shieldClock: 0,
    shieldFlash: 0,
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
  g.actors.reduce(
    (sum, a) =>
      sum + (a.team === 1 && a.hp > 0 ? catalog[a.type].powerDraw || 0 : 0),
    0,
  );
export const mining = (g, a) =>
  a.type === "miner" && a.order?.kind === "mine" && dist(a, a.order) < 32;
export const relayCount = (g) => g.relays.filter((r) => r.owner === 1).length;
export const income = (g) =>
  4 +
  g.actors.reduce(
    (sum, a) =>
      sum +
      (a.team === 1 && a.hp > 0 && mining(g, a)
        ? minerals[a.order.kindOfMine || "ore"].ore
        : 0),
    0,
  ) +
  5 * relayCount(g) +
  (load(g) <= capacity(g)
    ? g.actors.reduce(
        (sum, a) =>
          sum + (a.team === 1 && a.hp > 0 ? catalog[a.type].income || 0 : 0),
        0,
      )
    : 0);
export const crystalIncome = (g) =>
  g.actors.reduce(
    (sum, a) =>
      sum +
      (a.team === 1 && a.hp > 0 && mining(g, a)
        ? minerals[a.order.kindOfMine || "ore"].crystal
        : 0),
    0,
  );
export function researchBlocked(g, key) {
  const spec = techs[key];
  if (!spec || g.result) return "战斗已结束";
  if (g.tech.has(key)) return "已完成";
  if (!owns(g, "lab")) return "请先建造研究中心";
  if (load(g) > capacity(g)) return "研究中心供电不足";
  if (spec.requires && !g.tech.has(spec.requires)) return "需要先完成 T2 科技";
  if (g.research) return "已有项目正在研究";
  if (g.ore + 1e-6 < spec.cost) return "矿石不足";
  if (g.crystal + 1e-6 < spec.crystal) return "晶能不足，请开采晶能矿";
  return "";
}
export function startResearch(g, key) {
  const reason = researchBlocked(g, key);
  if (reason) return reason;
  const s = techs[key];
  g.ore -= s.cost;
  g.crystal -= s.crystal;
  g.research = { key, left: s.time };
  return "";
}
export const selected = (g) =>
  g.actors.filter((a) => g.selected.has(a.id) && a.team === 1 && a.hp > 0);
export function blocked(g, type) {
  const spec = catalog[type];
  if (!spec?.cost) return "该单位不能生产";
  if (g.result) return "战斗已结束";
  if (g.queue.length >= 6) return "生产队列已满";
  if (spec.tech && !g.tech.has(spec.tech)) return "需要先完成 T2 科技";
  if (g.ore + 1e-6 < spec.cost) return "矿石不足";
  if (spec.crystal && g.crystal + 1e-6 < spec.crystal)
    return "晶能不足，请开采晶能矿";
  if (units[type] && !owns(g, "factory")) return "战车工厂已损毁";
  if (
    units[type] &&
    fleet(g) + g.queue.filter((q) => units[q.type]).length >= 30
  )
    return "部队已达上限";
  if (spec.power && capacity(g) < spec.power)
    return "需要至少 " + spec.power + " 点供电";
  if (
    spec.powerDraw &&
    load(g) +
      spec.powerDraw +
      g.queue.reduce(
        (total, q) => total + (catalog[q.type].powerDraw || 0),
        0,
      ) >
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
  g.crystal -= spec.crystal || 0;
  g.queue.push({ type, left: spec.time });
  return "";
}
export function order(g, x, y, mode = "auto", targetId) {
  if (g.result) return "";
  const group = selected(g).filter((a) => units[a.type]);
  if (!group.length) return "请先选择一支移动部队。";
  const point = { x, y };
  const enemy =
    (mode === "auto" || mode === "attack") &&
    g.actors
      .filter(
        (a) =>
          a.team === -1 &&
          a.hp > 0 &&
          (targetId != null
            ? a.id === targetId
            : dist(a, point) < catalog[a.type].size + 7),
      )
      .sort((a, b) => dist(a, point) - dist(b, point))[0];
  const attack = mode === "attack" || mode === "sweep";
  const deposit = !attack && g.mines.find((m) => dist(m, point) < 35);
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
          ? { ...deposit, kindOfMine: deposit.kind || "ore", kind: "mine" }
          : attack
            ? { kind: "attack", ...pos, center: point }
            : { kind: "move", ...pos };
  });
  return enemy
    ? "集火目标已锁定。"
    : deposit && group.some((a) => a.type === "miner")
      ? "采矿车已前往" + minerals[deposit.kind || "ore"].name + "。"
      : attack
        ? "进攻指令：清扫目标区域。"
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
const rangeTo = (a, b) => dist(a, b) - catalog[b.type].size * 0.55;
function enemyFor(g, a, range, center = null) {
  let best = null,
    bestScore = Infinity;
  for (const b of g.actors) {
    if (
      b.team === a.team ||
      b.hp <= 0 ||
      rangeTo(a, b) > range ||
      (center && dist(center, b) > 138)
    )
      continue;
    const score =
      a.team === -1
        ? dist(a, b) * 0.35 +
          b.hp * 0.13 -
          (catalog[b.type].splash ? 28 : 0) -
          (units[b.type] ? 13 : 0)
        : rangeTo(a, b);
    if (score < bestScore) {
      best = b;
      bestScore = score;
    }
  }
  return best;
}
function blast(g, x, y, radius, style) {
  const total = style === "spark" ? 0.32 : style === "debris" ? 0.75 : 0.63;
  g.bursts.push({ x, y, radius, style, life: total, total });
}
function floatDamage(g, target, value, shield) {
  if (value <= 0) return;
  if (g.damageText.length >= 140) g.damageText.shift();
  g.damageText.push({
    x: target.x + (shield ? -10 : 5),
    y: target.y - catalog[target.type].size - 13,
    life: 0.84,
    total: 0.84,
    value: Math.round(value),
    shield,
  });
}
function strike(g, target, damage) {
  if (target.hp <= 0) return;
  const absorbed = Math.min(target.shield || 0, damage);
  if (absorbed) {
    target.shield -= absorbed;
    target.shieldFlash = 0.18;
    floatDamage(g, target, absorbed, true);
  }
  const hull = Math.min(target.hp, damage - absorbed);
  if (hull) {
    target.hp -= hull;
    target.hitFlash = 0.12;
    floatDamage(g, target, hull, false);
  }
  if (target.hp <= 0)
    blast(
      g,
      target.x,
      target.y,
      Math.max(28, catalog[target.type].size * 1.5),
      "debris",
    );
}
export function rechargeShield(a, s, dt) {
  if (!s.shield || a.shield >= s.shield) {
    a.shieldClock = 0;
    return;
  }
  a.shieldClock += dt;
  while (a.shieldClock + 1e-8 >= 0.5 && a.shield < s.shield) {
    a.shieldClock = Math.max(0, a.shieldClock - 0.5);
    a.shield = Math.min(s.shield, a.shield + 4);
  }
}
function explode(g, x, y, p) {
  blast(g, x, y, p.radius, "blast");
  for (const b of g.actors) {
    if (b.hp <= 0 || b.team === p.team) continue;
    const d = dist(b, { x, y });
    if (d < p.radius)
      strike(g, b, Math.ceil(p.damage * (1 - (0.6 * d) / p.radius)));
  }
}
function fire(g, a, b, s) {
  a.cd = s.rate;
  const damage =
    s.damage +
    (a.team === 1 && s.missiles && g.tech.has("guidance")
      ? 8
      : a.team === 1 && s.plasma && g.tech.has("plasmaFocus")
        ? 18
        : 0);
  a.recoil = 0.24;
  const fx = Math.cos(a.aim),
    fy = Math.sin(a.aim),
    barrel = s.missiles ? 13 : s.splash ? 19 : 13;
  const sx = a.x + fx * barrel,
    sy = a.y + fy * barrel;
  if (s.missiles) {
    a.salvoLane = -1;
    for (let i = 0; i < s.missiles; i++) {
      const lane = i % 2 === 0 ? -1 : 1,
        x = sx - fy * lane * 6,
        y = sy + fx * lane * 6;
      g.missiles.push({
        x,
        y,
        ox: x,
        oy: y,
        tx: b.x,
        ty: b.y,
        id: b.id,
        source: a.id,
        team: a.team,
        age: -i * 0.12,
        total: s.flight + i * 0.04,
        damage,
        radius: s.splash,
        lane,
        delayed: i > 0,
      });
    }
  } else if (s.plasma) {
    g.plasma.push({
      x: sx,
      y: sy,
      tx: b.x,
      ty: b.y,
      id: b.id,
      team: a.team,
      damage,
      total: s.flight,
      life: s.flight,
    });
  } else if (s.splash) {
    g.shells.push({
      x: sx,
      y: sy,
      tx: b.x,
      ty: b.y,
      team: a.team,
      life: s.flight,
      total: s.flight,
      damage: s.damage,
      radius: s.splash,
    });
  } else {
    strike(
      g,
      b,
      Math.round(damage * (buildings[b.type] ? s.structureBonus || 1 : 1)),
    );
    blast(g, b.x, b.y, s.damage > 30 ? 21 : 15, "spark");
    g.shots.push({ x: sx, y: sy, tx: b.x, ty: b.y, team: a.team, life: 0.14 });
  }
}
function updateMissiles(g, dt) {
  for (const m of g.missiles) {
    const previous = m.age;
    m.age += dt;
    if (m.age <= 0) continue;
    if (m.delayed && previous <= 0) {
      const launcher = g.actors.find((a) => a.id === m.source && a.hp > 0);
      if (launcher) {
        launcher.recoil = 0.24;
        launcher.salvoLane = m.lane;
      }
    }
    const target = g.actors.find((a) => a.id === m.id && a.hp > 0);
    if (target) {
      m.tx = target.x;
      m.ty = target.y;
    }
    const t = Math.min(1, m.age / m.total),
      dx = m.tx - m.ox,
      dy = m.ty - m.oy,
      d = Math.hypot(dx, dy) || 1;
    const curve = Math.sin(Math.PI * t) * m.lane * 22;
    const nx = m.ox + dx * t - (dy / d) * curve,
      ny = m.oy + dy * t + (dx / d) * curve;
    m.angle = Math.atan2(ny - m.y, nx - m.x);
    if (Math.floor(m.age / 0.045) !== Math.floor(previous / 0.045)) {
      g.smoke.push({ x: m.x, y: m.y, life: 0.56, total: 0.56, lane: m.lane });
    }
    m.x = nx;
    m.y = ny;
    if (t === 1) explode(g, m.x, m.y, m);
  }
  g.missiles = g.missiles.filter((m) => m.age < m.total);
}
function updatePlasma(g, dt) {
  for (const p of g.plasma) {
    p.life -= dt;
    const target = g.actors.find((a) => a.id === p.id && a.hp > 0);
    if (target) {
      p.tx = target.x;
      p.ty = target.y;
    }
    if (p.life <= 0) {
      if (target) strike(g, target, p.damage);
      blast(g, p.tx, p.ty, 27, "plasma");
    }
  }
  g.plasma = g.plasma.filter((p) => p.life > 0);
}
const aiLanes = [location(600, 412), location(478, 203), location(702, 301)];
function enemyAI(g, dt) {
  const redHQ = g.actors.find(
    (a) => a.team === -1 && a.type === "hq" && a.hp > 0,
  );
  const blueHQ = g.actors.find(
    (a) => a.team === 1 && a.type === "hq" && a.hp > 0,
  );
  if (!redHQ || !blueHQ) return;
  // Bring wounded vehicles back to the base; the AI can't heal under fire.
  for (const a of g.actors)
    if (
      a.team === -1 &&
      units[a.type] &&
      a.aiRetreat &&
      dist(a, redHQ) < 92 &&
      !enemyFor(g, a, 125)
    ) {
      a.hp = Math.min(catalog[a.type].hp, a.hp + dt * 10);
    }
  if (g.time < g.nextThink) return;
  g.nextThink = g.time + 0.6;
  const defenders = g.actors.filter(
    (a) => a.team === -1 && units[a.type] && a.hp > 0,
  );
  const intruder = g.actors
    .filter(
      (a) => a.team === 1 && units[a.type] && a.hp > 0 && dist(a, redHQ) < 224,
    )
    .sort((a, b) => dist(a, redHQ) - dist(b, redHQ))[0];
  const relay = g.relays
    .filter((r) => r.owner !== -1)
    .sort(
      (a, b) =>
        Number(b.owner === 1) - Number(a.owner === 1) ||
        dist(a, redHQ) - dist(b, redHQ),
    )[0];
  const raid = g.actors.find(
    (a) =>
      a.team === 1 && a.type === "miner" && a.hp > 0 && dist(a, blueHQ) > 90,
  );
  for (const a of defenders) {
    const s = catalog[a.type];
    const local = enemyFor(g, a, s.range + 38);
    if (a.hp < s.hp * 0.33 && local && dist(a, redHQ) > 110) a.aiRetreat = true;
    if (a.aiRetreat && a.hp < s.hp * 0.72) {
      a.order = {
        kind: "move",
        x: redHQ.x - 46 + (a.id % 4) * 27,
        y: redHQ.y + 55,
      };
      continue;
    }
    a.aiRetreat = false;
    // Artillery backs up instead of driving into close combat; other units screen it.
    if (s.splash && local && dist(a, local) < s.range * 0.63) {
      const d = dist(a, local) || 1;
      a.order = {
        kind: "move",
        x: clamp(a.x + ((a.x - local.x) / d) * 85, 14, W - 14),
        y: clamp(a.y + ((a.y - local.y) / d) * 85, 14, H - 14),
      };
    } else if (intruder) {
      a.order = { kind: "target", id: (local || intruder).id };
    } else if (a.aiWave) {
      if (dist(a, a.aiLane) < 110 || dist(a, blueHQ) < 230)
        a.aiPassedLane = true;
      const goal = a.aiPassedLane
        ? a.type === "scout" && raid
          ? raid
          : blueHQ
        : a.aiLane;
      a.order = {
        kind: "attack",
        x: goal.x + ((a.id % 3) - 1) * 25,
        y: goal.y + ((a.id % 4) - 1.5) * 24,
      };
    } else if (relay && g.time > 12 && a.type === "scout" && a.id % 2 === 0) {
      a.order = { kind: "attack", ...relay };
    } else {
      a.order = null;
    }
  }
}
export function step(g, dt) {
  if (g.result) return;
  g.time += dt;
  g.ore = Math.min(99999, g.ore + income(g) * dt);
  g.crystal = Math.min(99999, g.crystal + crystalIncome(g) * dt);
  if (g.research) {
    const r = g.research,
      spec = techs[r.key];
    if (!owns(g, "lab")) {
      g.ore += spec.cost;
      g.crystal += spec.crystal;
      g.research = null;
      g.events.push("研究中心损毁，研究资源已退回。");
    } else if (load(g) <= capacity(g) && (r.left -= dt) <= 0) {
      g.tech.add(r.key);
      g.research = null;
      g.events.push(spec.name + "已完成。");
    }
  }
  const job = g.queue[0];
  if (job) {
    if (units[job.type] && !owns(g, "factory")) {
      g.ore += catalog[job.type].cost;
      g.crystal += catalog[job.type].crystal || 0;
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
          ...location(284 + (g.serial % 3) * 25, 461 - (g.serial % 4) * 27),
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
          [176, 530],
          [210, 390],
          [418, 478],
          [126, 542],
          [199, 544],
          [357, 512],
          [431, 520],
          [254, 568],
        ].map(([x, y]) => field(x, y));
        const pos = positions.find(
          ([x, y]) =>
            !g.actors.some(
              (a) =>
                buildings[a.type] &&
                dist(a, { x, y }) <
                  (catalog[a.type].size + catalog[t].size) * 0.86,
            ),
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
    const roster = [
      "tank",
      "scout",
      "lightArtillery",
      "tank",
      "heavy",
      "missileTank",
      "heavyArtillery",
      g.wave >= 7 ? "missileT2" : "assault",
      g.wave >= 8 ? "plasmaTank" : "raider",
    ];
    const factory = g.actors.find(
      (a) => a.team === -1 && a.type === "factory" && a.hp > 0,
    );
    if (factory) {
      for (let i = 0; i < Math.min(roster.length, 2 + g.wave); i++) {
        const a = spawn(
          g,
          roster[i],
          -1,
          factory.x - 58 + (i % 3) * 28,
          factory.y + 90 + Math.floor(i / 3) * 31,
        );
        a.aiWave = true;
        a.aiLane = aiLanes[(g.wave + (i % 2)) % aiLanes.length];
      }
      g.events.push("侦测到第 " + g.wave + " 波敌方增援！");
    }
  }
  enemyAI(g, dt);
  const brownout = load(g) > capacity(g);
  for (const a of g.actors) {
    a.recoil = Math.max(0, a.recoil - dt);
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    a.repairGlow = Math.max(0, a.repairGlow - dt);
    a.shieldFlash = Math.max(0, a.shieldFlash - dt);
    const s = catalog[a.type];
    if (a.hp <= 0 || (brownout && a.team === 1 && s.powerDraw)) continue;
    rechargeShield(a, s, dt);
    if (s.heal) {
      for (const ally of g.actors)
        if (
          ally.team === a.team &&
          units[ally.type] &&
          ally.hp > 0 &&
          ally.hp < catalog[ally.type].hp &&
          dist(a, ally) <= s.radius
        ) {
          ally.hp = Math.min(catalog[ally.type].hp, ally.hp + s.heal * dt);
          ally.repairGlow = 0.2;
        }
    }
    a.cd -= dt;
    let o = a.order;
    const focus =
      o?.kind === "target"
        ? g.actors.find((b) => b.id === o.id && b.hp > 0)
        : null;
    if (o?.kind === "target" && !focus) o = a.order = null;
    const foe = !s.range
      ? null
      : focus && rangeTo(a, focus) <= s.range
        ? focus
        : enemyFor(g, a, s.range);
    if (foe) {
      a.aim = Math.atan2(foe.y - a.y, foe.x - a.x);
      if (a.cd <= 0) fire(g, a, foe, s);
    }
    if (s.speed && o && !mining(g, a)) {
      if (o.kind === "target") {
        if (rangeTo(a, focus) > s.range) move(a, focus, s.speed, dt);
      } else if (o.kind !== "attack" || !foe) {
        if (o.kind === "attack" && o.center && s.range) {
          o.atArea ||= move(a, o, s.speed, dt);
          if (o.atArea) {
            const nearby = enemyFor(g, a, s.range + 150, o.center);
            if (nearby) move(a, nearby, s.speed, dt);
            else a.order = null;
          }
        } else if (move(a, o, s.speed, dt) && o.kind !== "mine") a.order = null;
      }
    }
    if (!foe) a.aim = a.angle;
  }
  for (const shell of g.shells) {
    shell.life -= dt;
    if (shell.life > 0) continue;
    explode(g, shell.tx, shell.ty, shell);
  }
  g.shells = g.shells.filter((shell) => shell.life > 0);
  updateMissiles(g, dt);
  updatePlasma(g, dt);
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
  for (const list of [g.shots, g.bursts, g.smoke, g.damageText]) {
    for (const e of list) e.life -= dt;
    for (let i = list.length - 1; i >= 0; i--)
      if (list[i].life <= 0) list.splice(i, 1);
  }
  if (!owns(g, "hq")) g.result = "defeat";
  else if (!g.actors.some((a) => a.type === "hq" && a.team === -1))
    g.result = "victory";
}
