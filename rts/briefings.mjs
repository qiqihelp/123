import {
  catalog,
  units,
  weaponDamage,
  productionFactor,
  movementSpeed,
  repairRate,
} from "./sim.mjs";

const notes = {
  miner:
    "在矿床附近持续采集。右键矿床或触屏点按矿床即可派遣。矿石用于建造，晶能用于高级科技与 T2 单位。采矿车没有武器，远离敌军。",
  scout:
    "用高速度抢占中继站、观察敌军动向，或绕过慢速部队。装甲较薄，不适合充当前排。",
  tank: "造价适中、攻防均衡。适合量产并护卫采矿车，也能在移动中向敌军开火。",
  heavy: "依靠高生命值吸收火力，为轻型部队和后排火炮争取时间。移动速度较慢。",
  raider:
    "四处机动并用短射击间隔持续输出。擅长绕侧和追击，不适合承受重炮集中攻击。",
  assault: "重装攻坚单位。对防御塔、兵工厂和指挥中心等建筑造成 50% 额外伤害。",
  lightArtillery:
    "在坦克后方提供远程炮火。炮弹在目标落点爆炸，越靠近中心伤害越高；目标移动可能躲开炮击。",
  heavyArtillery:
    "拥有很长射程及较大爆炸范围。装填慢且速度较低，最好由坦克在前方掩护。",
  missileTank:
    "每轮连续发射两枚追踪导弹。导弹会跟随目标，并在命中时伤及附近敌军。",
  missileT2: "每轮连续发射四枚追踪导弹，射程比基础型号更远。装填间隔也更长。",
  plasmaTank:
    "发射高伤害等离子弹。护盾优先承受伤害，每 0.5 秒恢复 4 点；车体损伤不会自行恢复，可到维修站修理。",
  vanguard:
    "以厚重装甲承受火力。适合保护维修车和远程部队，但无法抵消轨道炮的穿透伤害。",
  interceptor: "速度快、开火间隔短，擅长追击受伤敌军或抢占中继站，护甲较薄。",
  railgun: "发射超远程穿甲弹，忽略车体减伤，但护盾依旧优先吸收伤害。",
  disruptor: "攻击对护盾造成双倍伤害，并让被命中的车辆暂时减速。",
  fieldMedic:
    "移动维修平台，可修复附近的友方车辆，但不能自我维修，也没有武器。",
  siegeBreaker: "大型直射攻坚炮，对建筑伤害翻倍；移速和装填都较慢。",
  clusterLauncher: "连射三枚溅射范围较大的追踪导弹，适合攻击扎堆的敌军。",
  ionSkirmisher: "在移动中快速发射等离子弹，有一层较薄的自充护盾。",
  titan:
    "T3 重装机甲。重甲和护盾用于承受火力，远程震荡炮能伤害并减速爆炸范围内的敌车。",
  uraniumTank:
    "消耗铀生产的重型护盾战车，可承受集中火力，适合掩护后排。护盾会自行恢复，车体受损需要维修。",
  uraniumPlant: "消耗铀建造的高容量电站，为基地提供额外的电力，不持续消耗铀。",
  uraniumRepair: "以铀建造的广域维修设施，持续修复作用范围内的友方车辆。",
  outpost:
    "扩建基地用的前线指挥站，可自动防守并增加矿石收入。并非主指挥中心，不能代替主基地的胜负判定。",
  turret: "自动对射程内敌军开火。适合守护基地与矿车，不需要手动指定目标。",
  mortar: "远程溅射防御。适合应对集群敌军，但装填较慢，最好和普通防御塔配合。",
  repair:
    "持续修复半径内受损的友方车辆。把受伤部队撤到维修站附近即可，不需要手动下令维修。",
  refinery: "在供电正常时额外产出矿石，不需要采矿车驻守。",
  generator: "提高基地供电上限。供电不足时，耗电建筑暂停运作，研究也会暂停。",
  lab: "可研究快速生产、T2、T3 科技及各项升级。研究队列与兵工厂、基地施工相互独立。",
  factory:
    "每座兵工厂同时生产一台车。多座工厂会自动分配队列并行生产。设定集结点后，所有工厂的新单位会自动前往那里。",
  hq: "负责基地施工并自动射击来袭敌军。失去指挥中心就会战败。建筑施工与兵工厂生产彼此独立。",
};

export function unitProfile(g, group) {
  const a = group[0],
    spec = catalog[a.type];
  const stats = [];
  const add = (label, value) => stats.push([label, value]);
  const sum = (key) =>
    Math.ceil(group.reduce((total, u) => total + (u[key] || 0), 0));
  add(
    group.length > 1 ? "编队生命值" : "生命值",
    `${sum("hp")} / ${spec.hp * group.length}`,
  );
  if (spec.shield) {
    add(
      group.length > 1 ? "编队护盾" : "护盾",
      `${sum("shield")} / ${spec.shield * group.length}`,
    );
    add("护盾恢复", "每 0.5 秒 +4 / 台");
  }
  if (spec.speed)
    add("移动速度", Number(movementSpeed(g, a).toFixed(2)) + " / 秒");
  if (spec.range) {
    add("射程", spec.range);
    add(spec.missiles ? "单枚伤害" : "单发伤害", weaponDamage(g, a));
    add("开火间隔", spec.rate + " 秒");
  }
  if (spec.missiles) add("每轮连发", spec.missiles + " 枚");
  if (spec.splash) add("溅射半径", spec.splash);
  if (spec.structureBonus) add("对建筑伤害", `×${spec.structureBonus}`);
  if (spec.heal)
    add(
      "维修能力",
      `${Number(repairRate(g, a).toFixed(2))} / 秒 · 半径 ${spec.radius}`,
    );
  const tech = a.team === 1 ? g.tech : g.red.tech;
  const armor =
    (spec.armor || 1) * (units[a.type] && tech.has("armorPlating") ? 0.9 : 1);
  if (armor < 1) add("车体减伤", Math.round((1 - armor) * 100) + "%");
  if (spec.pierce) add("穿甲", "忽略车体减伤");
  if (spec.shieldBonus) add("对护盾伤害", "×" + spec.shieldBonus);
  if (spec.slow) add("迟滞效果", `移动速度 −35% · ${spec.slow} 秒`);
  if (spec.income) add("矿石收入", `+${spec.income} / 秒`);
  if (spec.powerDraw) add("耗电", spec.powerDraw);
  if (spec.powerSupply) add("供电上限", "+" + spec.powerSupply);
  if (a.type === "factory") {
    add("并行工位", "1 / 座");
    const job = g.queue.find((j) => j.factory === a.id);
    add(
      "当前生产",
      job
        ? `${catalog[job.type].name} · ${Math.ceil(job.left * productionFactor(g))} 秒`
        : "空闲",
    );
  }
  if (a.type === "miner") add("矿石采集", "每秒 2–14（依矿种）");
  if (a.type === "miner")
    add("铀采集", "铀矿每秒 +" + (tech.has("extraction") ? 3.75 : 3));
  if (a.type === "miner" && tech.has("extraction")) add("开采加成", "+25%");
  if (a.type === "miner") add("晶能采集", "每秒 0–4（依矿种）");
  if (spec.cost)
    add(
      "造价",
      `${spec.cost} 矿石${spec.crystal ? ` + ${spec.crystal} 晶能` : ""}${spec.uranium ? ` + ${spec.uranium} 铀` : ""}`,
    );
  if (spec.time)
    add(
      units[a.type] ? "生产时间" : "施工时间",
      `${Number((spec.time * (units[a.type] ? productionFactor(g) : 1)).toFixed(2))} 秒`,
    );
  if (spec.tech) add("科技需求", spec.tech.toUpperCase());
  if (spec.power) add("电力需求", spec.power + " 点上限");
  return { name: spec.name, note: notes[a.type], stats };
}
