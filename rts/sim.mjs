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
  uraniumTank: {
    name: "铀能重坦",
    desc: "重型护盾 · 掩护前线",
    cost: 390,
    uranium: 24,
    hp: 335,
    shield: 144,
    speed: 32,
    size: 19,
    range: 147,
    damage: 58,
    rate: 1.25,
    time: 13,
  },
  vanguard: {
    name: "壁垒守卫",
    desc: "T2 · 重甲吸收火力",
    cost: 430,
    crystal: 14,
    hp: 395,
    speed: 27,
    size: 19,
    range: 124,
    damage: 40,
    rate: 1,
    time: 12,
    tech: "t2",
    armor: 0.8,
  },
  interceptor: {
    name: "游隼截击车",
    desc: "T2 · 高速追击",
    cost: 285,
    crystal: 9,
    hp: 142,
    speed: 78,
    size: 11,
    range: 122,
    damage: 23,
    rate: 0.46,
    time: 7,
    tech: "t2",
  },
  railgun: {
    name: "长矛轨道炮",
    desc: "T2 · 远程反重甲",
    cost: 490,
    crystal: 19,
    hp: 180,
    speed: 29,
    size: 16,
    range: 252,
    damage: 103,
    rate: 3.15,
    time: 14,
    tech: "t2",
    pierce: true,
  },
  disruptor: {
    name: "扰流战车",
    desc: "T2 · 破盾减速",
    cost: 345,
    crystal: 12,
    hp: 188,
    speed: 46,
    size: 14,
    range: 147,
    damage: 28,
    rate: 1.1,
    time: 9,
    tech: "t2",
    shieldBonus: 2,
    slow: 1.5,
  },
  fieldMedic: {
    name: "随军维修车",
    desc: "T2 · 移动范围维修",
    cost: 315,
    crystal: 12,
    hp: 190,
    speed: 43,
    size: 14,
    time: 9,
    tech: "t2",
    heal: 11,
    radius: 79,
  },
  siegeBreaker: {
    name: "破城攻坚炮",
    desc: "T2 · 对建筑伤害 ×2",
    cost: 570,
    crystal: 22,
    hp: 251,
    speed: 24,
    size: 19,
    range: 232,
    damage: 106,
    rate: 3.6,
    time: 16,
    tech: "t2",
    structureBonus: 2,
  },
  clusterLauncher: {
    name: "蜂巢发射车",
    desc: "T2 · 三发大范围溅射",
    cost: 515,
    crystal: 21,
    hp: 172,
    speed: 32,
    size: 17,
    range: 194,
    damage: 32,
    rate: 4.2,
    time: 13,
    tech: "t2",
    missiles: 3,
    flight: 0.69,
    splash: 47,
  },
  ionSkirmisher: {
    name: "离子突击车",
    desc: "T2 · 机动等离子速射",
    cost: 390,
    crystal: 15,
    hp: 141,
    shield: 52,
    speed: 56,
    size: 13,
    range: 138,
    damage: 33,
    rate: 0.63,
    time: 10,
    tech: "t2",
    plasma: true,
    flight: 0.24,
  },
  titan: {
    name: "天穹攻城机甲",
    desc: "T3 · 重型护盾与广域迟滞",
    cost: 980,
    crystal: 52,
    uranium: 34,
    hp: 610,
    shield: 220,
    speed: 23,
    size: 26,
    range: 284,
    damage: 158,
    rate: 4.8,
    time: 24,
    tech: "t3",
    armor: 0.88,
    splash: 64,
    flight: 0.76,
    slow: 2.5,
  },
};
export const buildings = {
  generator: {
    name: "供电站",
    desc: "电力上限 +8",
    cost: 140,
    hp: 230,
    powerSupply: 8,
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
    desc: "解锁 T2、T3 及分支科技",
    cost: 245,
    hp: 310,
    size: 25,
    time: 9,
    powerDraw: 3,
  },
  uraniumPlant: {
    name: "铀能电站",
    desc: "电力上限 +16",
    cost: 290,
    uranium: 18,
    hp: 350,
    size: 26,
    time: 11,
    powerSupply: 16,
  },
  uraniumRepair: {
    name: "铀能维修站",
    desc: "广域维修 · 21 点/秒",
    cost: 270,
    uranium: 22,
    hp: 360,
    size: 25,
    time: 10,
    powerDraw: 3,
    heal: 21,
    radius: 112,
  },
  outpost: {
    name: "前线指挥站",
    desc: "自动防守 · 矿石 +3/秒",
    cost: 260,
    hp: 540,
    size: 24,
    time: 11,
    income: 3,
    range: 118,
    damage: 15,
    rate: 1.05,
  },
  hq: {
    name: "指挥中心",
    hp: 1150,
    size: 31,
    range: 120,
    damage: 16,
    rate: 0.9,
  },
  factory: {
    name: "兵工厂",
    desc: "独立生产 · 每厂一个工位",
    cost: 235,
    time: 9,
    hp: 560,
    size: 25,
  },
};
// Apply the skirmish balance to the source of truth used by combat and unit dossiers.
export const BUILDING_HP_FACTOR = 1.55;
export const BASE_DAMAGE_FACTOR = 0.75;
for (const spec of Object.values(buildings))
  spec.hp = Math.round(spec.hp * BUILDING_HP_FACTOR);
for (const spec of [...Object.values(units), ...Object.values(buildings)])
  if (spec.damage) spec.damage = Math.round(spec.damage * BASE_DAMAGE_FACTOR);
export const UNIT_LIMIT = 60;
export const ENEMY_UNIT_LIMIT = 11;
export const ENEMY_MAX_WAVE = 6;
export const techs = {
  rapidProduction: {
    name: "快速生产",
    desc: "所有兵工厂生产耗时减少 30%，正在生产的订单也生效；不影响建筑施工。",
    short: "全厂耗时减少 30%",
    cost: 240,
    crystal: 0,
    time: 12,
  },
  t2: {
    name: "T2 科技",
    desc: "解锁十种 T2 单位",
    short: "解锁十种 T2 单位",
    cost: 300,
    crystal: 24,
    time: 16,
  },
  plasmaFocus: {
    name: "等离子聚焦",
    desc: "等离子坦克单发伤害 +18；不影响离子突击车。",
    short: "等离子伤害 +18",
    cost: 225,
    crystal: 22,
    time: 12,
    requires: "t2",
  },
  guidance: {
    name: "制导升级",
    desc: "所有导弹单位单枚伤害 +8",
    short: "导弹单发伤害 +8",
    cost: 210,
    crystal: 18,
    time: 12,
    requires: "t2",
  },
  extraction: {
    name: "高效开采",
    desc: "所有矿车的矿石、晶能和铀采集效率提高 25%，不影响被动收入。",
    short: "矿车采集 +25%",
    cost: 205,
    crystal: 0,
    time: 11,
  },
  armorPlating: {
    name: "复合装甲",
    desc: "所有车辆受到的车体伤害降低 10%；不影响护盾。轨道炮可穿透减伤。",
    short: "车辆车体伤害 −10%",
    cost: 345,
    crystal: 23,
    time: 14,
    requires: "t2",
  },
  logistics: {
    name: "机动底盘",
    desc: "战斗车辆移动速度提高 12%，采矿车不受影响。",
    short: "战斗车辆速度 +12%",
    cost: 270,
    crystal: 18,
    time: 12,
    requires: "t2",
  },
  repairBoost: {
    name: "精密维修",
    desc: "维修车和维修设施的维修速度提高 30%；不影响护盾恢复。",
    short: "全体维修效率 +30%",
    cost: 280,
    crystal: 15,
    time: 13,
    requires: "t2",
  },
  t3: {
    name: "T3 科技",
    desc: "完成 T2 后可研究；解锁天穹攻城机甲。",
    short: "解锁天穹攻城机甲",
    cost: 650,
    crystal: 60,
    uranium: 28,
    time: 24,
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
  uranium: {
    name: "铀矿",
    label: "URANIUM",
    ore: 3,
    crystal: 0,
    uranium: 3,
    color: "#bee485",
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
    uranium: 0,
    red: {
      ore: 430,
      crystal: 0,
      uranium: 0,
      tech: new Set(),
      production: [],
      construction: null,
      research: null,
      nextEconomy: 7,
    },
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
    construction: [],
    rally: null,
    waveWaiting: false,
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
      localMine(318, 526, "uranium"),
      localMine(908, 218, "uranium"),
      mine(512, 271, "uranium"),
      mine(910, 1100, "uranium"),
      mine(2040, 1138, "uranium"),
      mine(2685, 500, "uranium"),
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
  miner.order = mineOrder(g.mines[0]);
  spawn(g, "scout", 1, ...field(365, 360), -0.65);
  spawn(g, "scout", 1, ...field(383, 400), -0.57);
  g.selected.add(spawn(g, "tank", 1, ...field(316, 377), -0.6).id);
  spawn(g, "tank", 1, ...field(340, 403), -0.68);
  spawn(g, "lightArtillery", 1, ...field(377, 436), -0.62);
  spawn(g, "tank", -1, ...field(662, 212), 2.55);
  spawn(g, "lightArtillery", -1, ...field(806, 229), 2.55);
  spawn(g, "scout", -1, ...field(698, 245), 2.55);
  spawn(g, "scout", -1, ...field(756, 253), 2.55);
  const redMiner = spawn(g, "miner", -1, ...field(803, 352));
  redMiner.order = mineOrder(g.mines[1]);
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
export const factories = (g) =>
  g.actors.filter((a) => a.team === 1 && a.type === "factory" && a.hp > 0);
export const enemyFleet = (g) =>
  g.actors.filter((a) => a.team === -1 && units[a.type] && a.hp > 0).length;
export const productionFactor = (g) =>
  g.tech.has("rapidProduction") ? 0.7 : 1;
const teamTech = (g, team) => (team === 1 ? g.tech : g.red.tech);
export const movementSpeed = (g, a) =>
  (catalog[a.type].speed || 0) *
  (a.type !== "miner" && teamTech(g, a.team).has("logistics") ? 1.12 : 1);
export const repairRate = (g, a) =>
  (catalog[a.type].heal || 0) *
  (teamTech(g, a.team).has("repairBoost") ? 1.3 : 1);
const byTeam = (g, team, type) =>
  g.actors.filter(
    (a) => a.team === team && a.hp > 0 && (!type || a.type === type),
  );
export const capacity = (g, team = 1) =>
  4 +
  g.actors.reduce(
    (sum, a) =>
      sum +
      (a.team === team && a.hp > 0 ? catalog[a.type].powerSupply || 0 : 0),
    0,
  );
export const load = (g, team = 1) =>
  6 +
  g.actors.reduce(
    (sum, a) =>
      sum + (a.team === team && a.hp > 0 ? catalog[a.type].powerDraw || 0 : 0),
    0,
  );
const mineOrder = (m) => ({ ...m, kindOfMine: m.kind || "ore", kind: "mine" });
export const mining = (g, a) =>
  a.type === "miner" && a.order?.kind === "mine" && dist(a, a.order) < 32;
export const relayCount = (g, team = 1) =>
  g.relays.filter((r) => r.owner === team).length;
const mined = (g, key, team) =>
  g.actors.reduce(
    (sum, a) =>
      sum +
      (a.team === team && a.hp > 0 && mining(g, a)
        ? (minerals[a.order.kindOfMine || "ore"][key] || 0) *
          (teamTech(g, team).has("extraction") ? 1.25 : 1)
        : 0),
    0,
  );
export const income = (g, team = 1) =>
  (team === 1 ? 4 : 0) +
  mined(g, "ore", team) +
  5 * relayCount(g, team) +
  (load(g, team) <= capacity(g, team)
    ? g.actors.reduce(
        (sum, a) =>
          sum + (a.team === team && a.hp > 0 ? catalog[a.type].income || 0 : 0),
        0,
      )
    : 0);
export const crystalIncome = (g, team = 1) => mined(g, "crystal", team);
export const uraniumIncome = (g, team = 1) => mined(g, "uranium", team);
const affordable = (wallet, s) =>
  wallet.ore + 1e-6 >= (s.cost || 0) &&
  wallet.crystal + 1e-6 >= (s.crystal || 0) &&
  wallet.uranium + 1e-6 >= (s.uranium || 0);
function transfer(wallet, s, sign) {
  wallet.ore += sign * (s.cost || 0);
  wallet.crystal += sign * (s.crystal || 0);
  wallet.uranium += sign * (s.uranium || 0);
}
export function researchBlocked(g, key) {
  const spec = techs[key];
  if (!spec || g.result) return "战斗已结束";
  if (g.tech.has(key)) return "已完成";
  if (!owns(g, "lab")) return "请先建造研究中心";
  if (load(g) > capacity(g)) return "研究中心供电不足";
  if (spec.requires && !g.tech.has(spec.requires))
    return `需要先完成 ${spec.requires.toUpperCase()} 科技`;
  if (g.research) return "已有项目正在研究";
  if (g.ore + 1e-6 < spec.cost) return "矿石不足";
  if (g.crystal + 1e-6 < spec.crystal) return "晶能不足，请开采晶能矿";
  if (spec.uranium && g.uranium + 1e-6 < spec.uranium)
    return "铀不足，请开采铀矿";
  return "";
}
export function startResearch(g, key) {
  const reason = researchBlocked(g, key);
  if (reason) return reason;
  const s = techs[key];
  transfer(g, s, -1);
  g.research = { key, left: s.time };
  return "";
}
export const selected = (g) =>
  g.actors.filter((a) => g.selected.has(a.id) && a.team === 1 && a.hp > 0);
export function blocked(g, type) {
  const spec = catalog[type];
  if (!spec?.cost) return "该单位不能生产";
  if (g.result) return "战斗已结束";
  if (buildings[type] && g.construction.length >= 6) return "施工队列已满";
  if (spec.tech && !g.tech.has(spec.tech))
    return `需要先完成 ${spec.tech.toUpperCase()} 科技`;
  if (g.ore + 1e-6 < spec.cost) return "矿石不足";
  if (spec.crystal && g.crystal + 1e-6 < spec.crystal)
    return "晶能不足，请开采晶能矿";
  if (spec.uranium && g.uranium + 1e-6 < spec.uranium)
    return "铀不足，请开采铀矿";
  if (units[type] && !owns(g, "factory")) return "请先建造兵工厂";
  if (units[type] && fleet(g) + g.queue.length >= UNIT_LIMIT)
    return "部队已达上限";
  if (spec.power && capacity(g) < spec.power)
    return "需要至少 " + spec.power + " 点供电";
  if (
    spec.powerDraw &&
    load(g) +
      spec.powerDraw +
      g.construction.reduce(
        (total, q) => total + (catalog[q.type].powerDraw || 0),
        0,
      ) >
      capacity(g)
  )
    return "供电不足，请建造供电站";
  return "";
}
// Construction coordinates stay fixed from order to completion. Ground textures are decorative.
function siteBlocked(g, type, point, ignore) {
  const size = buildings[type].size;
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y))
    return "请在战场上选择建造位置";
  if (
    point.x < size ||
    point.y < size ||
    point.x > W - size ||
    point.y > H - size
  )
    return "超出战场边界";
  if (g.mines.some((m) => dist(m, point) < size + 27)) return "不能覆盖矿脉";
  if (g.relays.some((r) => dist(r, point) < size + 35)) return "不能覆盖中继站";
  const overlaps = (a) => dist(a, point) < catalog[a.type].size + size + 3;
  if (g.actors.some((a) => a.hp > 0 && buildings[a.type] && overlaps(a)))
    return "与已有建筑重叠";
  if (
    [...g.construction, g.red.construction].some(
      (a) => a && a !== ignore && overlaps(a),
    )
  )
    return "与施工占地重叠";
  return "";
}
export function placementBlocked(g, type, point) {
  return (
    blocked(g, type) ||
    (!buildings[type] ? "请选择建筑" : siteBlocked(g, type, point))
  );
}
export function enqueue(g, type, point) {
  const reason = buildings[type]
    ? placementBlocked(g, type, point)
    : blocked(g, type);
  if (reason) return reason;
  const spec = catalog[type];
  transfer(g, spec, -1);
  if (units[type]) g.queue.push({ type, left: spec.time });
  else g.construction.push({ type, left: spec.time, x: point.x, y: point.y });
  return "";
}
export function enqueueBatch(g, type) {
  const requested = factories(g).length;
  if (!units[type] || !requested)
    return {
      added: 0,
      requested,
      reason: blocked(g, type) || "只能批量生产单位",
    };
  let added = 0;
  for (; added < requested; added++) {
    const reason = enqueue(g, type);
    if (reason) return { added, requested, reason };
  }
  return { added, requested, reason: "" };
}
export function setRally(g, x, y) {
  if (g.result || !owns(g, "factory")) return false;
  g.rally = { x: clamp(x, 12, W - 12), y: clamp(y, 12, H - 12) };
  return true;
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
          ? mineOrder(deposit)
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
function strike(g, target, damage, effects = {}) {
  if (target.hp <= 0) return;
  const shieldBonus = effects.shieldBonus || 1;
  const absorbed = Math.min(target.shield || 0, damage * shieldBonus);
  if (absorbed) {
    target.shield -= absorbed;
    target.shieldFlash = 0.18;
    floatDamage(g, target, absorbed, true);
  }
  const armor =
    !units[target.type] || effects.pierce
      ? 1
      : (catalog[target.type].armor || 1) *
        (teamTech(g, target.team).has("armorPlating") ? 0.9 : 1);
  const hull = Math.min(
    target.hp,
    Math.round((damage - absorbed / shieldBonus) * armor),
  );
  if (effects.slow && units[target.type])
    target.slowTime = Math.max(target.slowTime || 0, effects.slow);
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
      strike(g, b, Math.ceil(p.damage * (1 - (0.6 * d) / p.radius)), p);
  }
}
export function weaponDamage(g, a) {
  const s = catalog[a.type];
  return (
    (s.damage || 0) +
    (s.missiles && teamTech(g, a.team).has("guidance")
      ? 8
      : a.type === "plasmaTank" && teamTech(g, a.team).has("plasmaFocus")
        ? 18
        : 0)
  );
}
function fire(g, a, b, s) {
  a.cd = s.rate;
  const damage = weaponDamage(g, a);
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
      damage,
      radius: s.splash,
      slow: s.slow,
    });
  } else {
    strike(
      g,
      b,
      Math.round(damage * (buildings[b.type] ? s.structureBonus || 1 : 1)),
      s,
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
    (a) => a.team === -1 && units[a.type]?.range && a.hp > 0,
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
  const enemies = byTeam(g, 1).filter(
    (a) => units[a.type]?.range || units[a.type]?.heal,
  );
  const support = byTeam(g, -1, "fieldMedic");
  const exposedMiner = byTeam(g, -1, "miner").find((m) =>
    enemies.some((b) => units[b.type].range && dist(m, b) < 145),
  );
  const escorts = exposedMiner
    ? defenders
        .filter((a) => !a.aiWave && !catalog[a.type].splash)
        .sort((a, b) => dist(a, exposedMiner) - dist(b, exposedMiner))
        .slice(0, 2)
    : [];
  // A wave gathers at its route entry until its factory orders arrive, with a time limit.
  const currentWave = g.wave;
  const staging =
    g.time - g.lastWave < 27 &&
    g.red.production.some((q) => q.wave === currentWave);
  const danger = (p) =>
    enemies.reduce((sum, b) => sum + Math.max(0, 1 - dist(p, b) / 260), 0);
  for (const a of support) {
    const ally = defenders
      .filter((b) => !b.aiRetreat)
      .sort(
        (b, c) =>
          (1 - c.hp / catalog[c.type].hp) * 125 -
          dist(a, c) * 0.3 -
          ((1 - b.hp / catalog[b.type].hp) * 125 - dist(a, b) * 0.3),
      )[0];
    if (ally) {
      const n = Math.hypot(redHQ.x - ally.x, redHQ.y - ally.y) || 1;
      a.order = {
        kind: "move",
        x: ally.x + (48 * (redHQ.x - ally.x)) / n,
        y: ally.y + (48 * (redHQ.y - ally.y)) / n,
      };
    }
  }
  for (const a of defenders) {
    const s = catalog[a.type];
    const local = enemyFor(g, a, s.range + 38);
    const specialized = enemies
      .filter((b) => rangeTo(a, b) <= s.range)
      .sort((b, c) => {
        const score = (v) =>
          (1 - v.hp / catalog[v.type].hp) * 100 +
          (s.shieldBonus && v.shield ? 105 : 0) +
          (s.pierce && catalog[v.type].armor ? 90 : 0) +
          (catalog[v.type].heal ? 60 : 0) -
          dist(a, v) * 0.17;
        return score(c) - score(b);
      })[0];
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
    if ((s.splash || s.pierce) && local && dist(a, local) < s.range * 0.63) {
      const d = dist(a, local) || 1;
      a.order = {
        kind: "move",
        x: clamp(a.x + ((a.x - local.x) / d) * 85, 14, W - 14),
        y: clamp(a.y + ((a.y - local.y) / d) * 85, 14, H - 14),
      };
    } else if (intruder) {
      a.order = { kind: "target", id: (specialized || local || intruder).id };
    } else if (escorts.includes(a)) {
      a.order = {
        kind: "attack",
        x: exposedMiner.x - 20,
        y: exposedMiner.y + 22,
      };
    } else if (s.tech && specialized) {
      a.order = { kind: "target", id: specialized.id };
    } else if (a.aiWave) {
      if (a.aiWave === currentWave && staging && !a.aiPassedLane) {
        a.order = {
          kind: "attack",
          x: a.aiLane.x + 30 + (a.id % 3) * 20,
          y: a.aiLane.y + ((a.id % 4) - 1.5) * 24,
        };
        continue;
      }
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
    } else if (relay && g.time > 12 && s.speed >= 60 && a.id % 2 === 0) {
      const target = g.relays
        .filter((r) => r.owner !== -1)
        .sort(
          (b, c) =>
            dist(a, b) +
            danger(b) * 175 -
            (b.owner === 1 ? 50 : 0) -
            (dist(a, c) + danger(c) * 175 - (c.owner === 1 ? 50 : 0)),
        )[0];
      a.order = { kind: "attack", ...target };
    } else {
      a.order = null;
    }
  }
}
function advanceConstruction(g, dt) {
  const job = g.construction[0];
  if (!job || (job.left -= dt) > 1e-8) return;
  const { type, x, y } = g.construction.shift();
  if (!siteBlocked(g, type, job)) {
    spawn(g, type, 1, x, y);
    g.events.push(catalog[type].name + "施工完成。");
  } else {
    transfer(g, catalog[type], 1);
    g.events.push("建造位置被占用，已退回资源。");
  }
}
function finishUnit(g, job, factory) {
  const originalFactory = dist(factory, location(169, 474)) < 1;
  const entrance = {
    x: factory.x + 43 + (g.serial % 3) * 24,
    y: factory.y + 16 - (g.serial % 5) * 22,
  };
  const size = catalog[job.type].size;
  const inBounds = (p) =>
    p.x >= size && p.y >= size && p.x <= W - size && p.y <= H - size;
  // Hand-placed factories can hug the map edge or face neighboring buildings.
  if (!originalFactory || !inBounds(entrance)) {
    let exit;
    for (const radius of [catalog[factory.type].size + size + 4, 70, 96]) {
      for (let i = 0; i < 12 && !exit; i++) {
        const angle = (((i + g.serial) % 12) * Math.PI) / 6;
        const p = {
          x: factory.x + Math.cos(angle) * radius,
          y: factory.y + Math.sin(angle) * radius,
        };
        if (
          inBounds(p) &&
          !g.actors.some(
            (a) => a.hp > 0 && dist(a, p) < catalog[a.type].size + size * 0.8,
          )
        )
          exit = p;
      }
      if (exit) break;
    }
    if (exit) Object.assign(entrance, exit);
  }
  entrance.x = clamp(entrance.x, size, W - size);
  entrance.y = clamp(entrance.y, size, H - size);
  const a = spawn(g, job.type, 1, entrance.x, entrance.y);
  const point = g.rally
    ? {
        x: clamp(g.rally.x + ((a.id % 4) - 1.5) * 17, 12, W - 12),
        y: clamp(g.rally.y + ((a.id % 3) - 1) * 18, 12, H - 12),
      }
    : originalFactory
      ? location(284 + (g.serial % 3) * 25, 461 - (g.serial % 4) * 27)
      : null;
  if (point) a.order = { kind: "move", ...point };
}
function advanceProduction(g, dt) {
  if (!g.queue.length) return;
  const available = factories(g);
  if (!available.length) {
    for (const job of g.queue) {
      transfer(g, catalog[job.type], 1);
    }
    g.queue.length = 0;
    g.events.push("所有兵工厂损毁，生产订单已退款。");
    return;
  }
  const alive = new Map(available.map((a) => [a.id, a]));
  const occupied = new Set();
  for (const job of g.queue) {
    if (alive.has(job.factory)) occupied.add(job.factory);
    else job.factory = null;
  }
  const idle = available.filter((a) => !occupied.has(a.id));
  let cursor = 0;
  for (const job of g.queue)
    if (job.factory == null && cursor < idle.length)
      job.factory = idle[cursor++].id;
  const work = dt / productionFactor(g),
    complete = new Map();
  g.queue = g.queue.filter((job) => {
    if (!job.factory || (job.left -= work) > 1e-8) return true;
    finishUnit(g, job, alive.get(job.factory));
    complete.set(job.type, (complete.get(job.type) || 0) + 1);
    return false;
  });
  if (complete.size)
    g.events.push(
      [...complete]
        .map(
          ([type, count]) =>
            catalog[type].name + (count > 1 ? " ×" + count : ""),
        )
        .join("、") + "已部署。",
    );
}
const redSites = [
  [885, 135],
  [820, 67],
  [930, 104],
  [873, 73],
  [793, 54],
  [932, 178],
  [870, 183],
  [950, 245],
  [975, 155],
  [773, 60],
  [870, 268],
].map(([x, y]) => location(x, y));
const outpostSites = [
  [682, 298],
  [654, 270],
  [753, 307],
  [902, 283],
  [865, 314],
].map(([x, y]) => location(x, y));
const redEligible = (g, s) =>
  affordable(g.red, s) &&
  (!s.tech || g.red.tech.has(s.tech)) &&
  (!s.power || capacity(g, -1) >= s.power);
function redBuild(g, type) {
  const r = g.red,
    s = buildings[type];
  if (
    r.construction ||
    !redEligible(g, s) ||
    (s.powerDraw && load(g, -1) + s.powerDraw > capacity(g, -1))
  )
    return false;
  const candidates = type === "outpost" ? outpostSites : redSites;
  const at = candidates.find(
    (p) =>
      !siteBlocked(g, type, p) &&
      !byTeam(g, 1).some((a) => dist(a, p) < (type === "outpost" ? 105 : 62)),
  );
  if (!at) return false;
  transfer(r, s, -1);
  r.construction = { type, left: s.time, ...at };
  return true;
}
function redOrder(g, type, wave = 0) {
  const r = g.red,
    s = units[type];
  if (
    enemyFleet(g) + r.production.length >= ENEMY_UNIT_LIMIT ||
    !byTeam(g, -1, "factory").length ||
    !redEligible(g, s)
  )
    return false;
  transfer(r, s, -1);
  r.production.push({ type, left: s.time, wave });
  return true;
}
function advanceEnemyIndustry(g, dt) {
  const r = g.red;
  r.ore = Math.min(99999, r.ore + income(g, -1) * dt);
  r.crystal = Math.min(99999, r.crystal + crystalIncome(g, -1) * dt);
  r.uranium = Math.min(99999, r.uranium + uraniumIncome(g, -1) * dt);
  const job = r.construction;
  if (job && (job.left -= dt) <= 1e-8) {
    if (!siteBlocked(g, job.type, job, job)) {
      spawn(g, job.type, -1, job.x, job.y);
      if (job.type === "outpost" || job.type === "factory")
        g.events.push("侦测到红方" + catalog[job.type].name + "建成。");
    } else transfer(r, catalog[job.type], 1);
    r.construction = null;
  }
  if (r.research) {
    if (!byTeam(g, -1, "lab").length) {
      transfer(r, techs[r.research.key], 1);
      r.research = null;
    } else if (load(g, -1) <= capacity(g, -1) && (r.research.left -= dt) <= 0) {
      const finished = r.research.key;
      r.tech.add(finished);
      r.research = null;
      g.events.push("红方完成" + techs[finished].name + "。");
    }
  }
  const available = byTeam(g, -1, "factory");
  const alive = new Map(available.map((f) => [f.id, f]));
  if (!r.production.length) return;
  if (!available.length) {
    for (const q of r.production) transfer(r, units[q.type], 1);
    r.production.length = 0;
    return;
  }
  const working = new Set();
  for (const q of r.production) {
    if (!alive.has(q.factory)) q.factory = null;
    else working.add(q.factory);
  }
  const idle = available.filter((f) => !working.has(f.id));
  let cursor = 0;
  for (const q of r.production)
    if (!q.factory && cursor < idle.length) q.factory = idle[cursor++].id;
  r.production = r.production.filter((q) => {
    if (!q.factory || (q.left -= dt) > 1e-8) return true;
    const f = alive.get(q.factory),
      lane = g.serial % 3;
    const a = spawn(
      g,
      q.type,
      -1,
      f.x - 62 + lane * 25,
      f.y + 64 + (g.serial % 2) * 26,
    );
    if (q.wave) {
      a.aiWave = q.wave;
      a.aiLane = q.rally || aiLanes[(q.wave + (lane % 2)) % aiLanes.length];
    }
    return false;
  });
}
function manageEnemyBase(g) {
  const r = g.red;
  if (g.time < r.nextEconomy) return;
  r.nextEconomy = g.time + 4;
  const hq = byTeam(g, -1, "hq")[0];
  if (!hq) return;
  const blue = byTeam(g, 1).filter(
    (a) => units[a.type]?.range || buildings[a.type]?.range,
  );
  const miners = byTeam(g, -1, "miner");
  const safe = (m) => !blue.some((a) => dist(a, m) < 135);
  const used = new Set();
  for (let i = 0; i < miners.length; i++) {
    const a = miners[i];
    if (blue.some((u) => dist(u, a) < 112)) {
      a.order = { kind: "move", x: hq.x + 55, y: hq.y - 44 };
      continue;
    }
    const role =
      i === 0
        ? "ore"
        : i === 1 && g.time < 95
          ? "uranium"
          : i === 1 && miners.length > 2
            ? "uranium"
            : "crystal";
    const nearby = g.mines.filter((m) => dist(m, hq) < 760 && safe(m));
    const score = (m) =>
      dist(m, a) +
      dist(m, hq) * 0.22 +
      (used.has(m) ? 260 : 0) -
      (minerals[m.kind][role] || 0) * (role === "ore" ? 12 : 100);
    nearby.sort((u, v) => score(u) - score(v));
    const target = nearby[0];
    if (target) {
      used.add(target);
      a.order = mineOrder(target);
    }
  }
  const workshop = byTeam(g, -1, "factory").length;
  const minerOrders = r.production.filter((q) => q.type === "miner").length;
  if (!workshop && r.construction?.type !== "factory") {
    redBuild(g, "factory");
    return;
  }
  if (
    miners.length + minerOrders < (g.time > 124 ? 3 : 2) &&
    redOrder(g, "miner")
  )
    return;
  if (r.construction) return;
  if (load(g, -1) > capacity(g, -1)) {
    redBuild(g, "generator");
    return;
  }
  if (g.time > 64 && !byTeam(g, -1, "outpost").length && redBuild(g, "outpost"))
    return;
  if (g.time > 98 && workshop < 2 && r.ore >= 420 && redBuild(g, "factory"))
    return;
  if (
    g.time > 115 &&
    r.ore >= 365 &&
    !byTeam(g, -1, "lab").length &&
    redBuild(g, "lab")
  )
    return;
  if (
    byTeam(g, -1, "lab").length &&
    !r.tech.has("t2") &&
    !r.research &&
    affordable(r, techs.t2)
  ) {
    transfer(r, techs.t2, -1);
    r.research = { key: "t2", left: techs.t2.time };
    return;
  }
  if (
    r.tech.has("t2") &&
    !r.research &&
    byTeam(g, -1, "lab").length &&
    load(g, -1) <= capacity(g, -1)
  ) {
    const priority =
      g.time > 215 ? ["t3", "armorPlating", "repairBoost"] : ["extraction"];
    const upgrade = priority.find(
      (key) =>
        !r.tech.has(key) &&
        affordable(r, techs[key]) &&
        r.ore - techs[key].cost >= 280,
    );
    if (upgrade) {
      transfer(r, techs[upgrade], -1);
      r.research = { key: upgrade, left: techs[upgrade].time };
      return;
    }
  }
  if (
    g.time > 140 &&
    r.ore >= 460 &&
    !byTeam(g, -1, "uraniumPlant").length &&
    redBuild(g, "uraniumPlant")
  )
    return;
  if (
    g.time > 170 &&
    r.ore >= 480 &&
    !byTeam(g, -1, "uraniumRepair").length &&
    redBuild(g, "uraniumRepair")
  )
    return;
  if (g.time > 85 && r.ore >= 420 && byTeam(g, -1, "turret").length < 2)
    redBuild(g, "turret");
}
function reinforce(g) {
  if (g.time < g.nextWave) return;
  const r = g.red;
  const room = ENEMY_UNIT_LIMIT - enemyFleet(g) - r.production.length;
  const wave = g.wave + 1;
  const enemies = byTeam(g, 1),
    arms = enemies.filter((a) => units[a.type]?.range);
  const shields = arms.filter((a) => catalog[a.type].shield).length;
  const armor = arms.filter(
    (a) => catalog[a.type].armor || catalog[a.type].hp >= 300,
  ).length;
  const defenses = enemies.filter(
    (a) => buildings[a.type]?.range && a.type !== "hq",
  ).length;
  const clustered = arms.some(
    (a) => arms.filter((b) => dist(a, b) < 68).length >= 4,
  );
  const counter =
    shields >= 2
      ? "disruptor"
      : armor >= 2
        ? "railgun"
        : defenses >= 2
          ? "siegeBreaker"
          : clustered
            ? "clusterLauncher"
            : wave % 2
              ? "missileT2"
              : "plasmaTank";
  const support =
    byTeam(g, -1, "fieldMedic").length ||
    r.production.some((q) => q.type === "fieldMedic")
      ? "vanguard"
      : "fieldMedic";
  const roster =
    wave < 3
      ? ["tank", "scout", "lightArtillery", "tank"]
      : r.tech.has("t2")
        ? [
            ...(r.tech.has("t3") &&
            !byTeam(g, -1, "titan").length &&
            !r.production.some((q) => q.type === "titan")
              ? ["titan"]
              : []),
            counter,
            support,
            "vanguard",
            "interceptor",
            "ionSkirmisher",
            "tank",
            "scout",
            "lightArtillery",
          ]
        : [
            wave >= 4 ? "uraniumTank" : "tank",
            "tank",
            "scout",
            "lightArtillery",
            "missileTank",
            "heavy",
          ];
  const route =
    wave < 3
      ? null
      : [...aiLanes].sort((a, b) => {
          const risk = (p) =>
            enemies.reduce(
              (v, e) =>
                v +
                (catalog[e.type].range || 0) *
                  Math.max(0, 1 - dist(p, e) / 280),
              0,
            );
          return risk(a) - risk(b);
        })[0];
  const n = Math.min(ENEMY_MAX_WAVE, room, 2 + wave, roster.length);
  let paid = 0;
  for (const type of roster) {
    if (paid >= n) break;
    if (redOrder(g, type, wave)) {
      r.production.at(-1).rally = route;
      paid++;
    }
  }
  g.lastWave = g.time;
  if (!paid) {
    g.waveWaiting =
      room <= 0
        ? "整编中"
        : !byTeam(g, -1, "factory").length
          ? "等待工厂"
          : "资金不足";
    g.nextWave = g.time + 16;
    return;
  }
  g.waveWaiting = false;
  g.wave = wave;
  g.nextWave = g.time + Math.max(54, 66 - (g.wave - 1) * 3);
  g.events.push("红方第 " + g.wave + " 波已出资生产 " + paid + " 台增援。");
}
export function step(g, dt) {
  if (g.result) return;
  g.time += dt;
  g.ore = Math.min(99999, g.ore + income(g) * dt);
  g.crystal = Math.min(99999, g.crystal + crystalIncome(g) * dt);
  g.uranium = Math.min(99999, g.uranium + uraniumIncome(g) * dt);
  if (g.research) {
    const r = g.research,
      spec = techs[r.key];
    if (!owns(g, "lab")) {
      transfer(g, spec, 1);
      g.research = null;
      g.events.push("研究中心损毁，研究资源已退回。");
    } else if (load(g) <= capacity(g) && (r.left -= dt) <= 0) {
      g.tech.add(r.key);
      g.research = null;
      g.events.push(spec.name + "已完成。");
    }
  }
  advanceConstruction(g, dt);
  advanceProduction(g, dt);
  advanceEnemyIndustry(g, dt);
  manageEnemyBase(g);
  reinforce(g);
  enemyAI(g, dt);
  const blueBrownout = load(g) > capacity(g),
    redBrownout = load(g, -1) > capacity(g, -1);
  for (const a of g.actors) {
    a.recoil = Math.max(0, a.recoil - dt);
    a.hitFlash = Math.max(0, a.hitFlash - dt);
    a.repairGlow = Math.max(0, a.repairGlow - dt);
    a.shieldFlash = Math.max(0, a.shieldFlash - dt);
    const s = catalog[a.type];
    if (
      a.hp <= 0 ||
      (s.powerDraw && (a.team === 1 ? blueBrownout : redBrownout))
    )
      continue;
    rechargeShield(a, s, dt);
    a.slowTime = Math.max(0, (a.slowTime || 0) - dt);
    const speed = movementSpeed(g, a) * (a.slowTime ? 0.65 : 1);
    if (s.heal) {
      for (const ally of g.actors)
        if (
          ally !== a &&
          ally.team === a.team &&
          units[ally.type] &&
          ally.hp > 0 &&
          ally.hp < catalog[ally.type].hp &&
          dist(a, ally) <= s.radius
        ) {
          ally.hp = Math.min(
            catalog[ally.type].hp,
            ally.hp + repairRate(g, a) * dt,
          );
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
    if (speed && o && !mining(g, a)) {
      if (o.kind === "target") {
        if (rangeTo(a, focus) > s.range) move(a, focus, speed, dt);
      } else if (o.kind !== "attack" || !foe) {
        if (o.kind === "attack" && o.center && s.range) {
          o.atArea ||= move(a, o, speed, dt);
          if (o.atArea) {
            const nearby = enemyFor(g, a, s.range + 150, o.center);
            if (nearby) move(a, nearby, speed, dt);
            else a.order = null;
          }
        } else if (move(a, o, speed, dt) && o.kind !== "mine") a.order = null;
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
