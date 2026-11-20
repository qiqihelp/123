import { catalog, units, weaponDamage, productionFactor } from "./sim.mjs";

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
  turret: "自动对射程内敌军开火。适合守护基地与矿车，不需要手动指定目标。",
  mortar: "远程溅射防御。适合应对集群敌军，但装填较慢，最好和普通防御塔配合。",
  repair:
    "持续修复半径内受损的友方车辆。把受伤部队撤到维修站附近即可，不需要手动下令维修。",
  refinery: "在供电正常时额外产出矿石，不需要采矿车驻守。",
  generator: "提高基地供电上限。供电不足时，耗电建筑暂停运作，研究也会暂停。",
  lab: "可研究快速生产、T2 科技及其分支。研究队列与兵工厂、基地施工相互独立。",
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
  if (spec.speed) add("移动速度", spec.speed + " / 秒");
  if (spec.range) {
    add("射程", spec.range);
    add(spec.missiles ? "单枚伤害" : "单发伤害", weaponDamage(g, a));
    add("开火间隔", spec.rate + " 秒");
  }
  if (spec.missiles) add("每轮连发", spec.missiles + " 枚");
  if (spec.splash) add("溅射半径", spec.splash);
  if (spec.structureBonus) add("对建筑伤害", `×${spec.structureBonus}`);
  if (spec.heal) add("维修能力", `${spec.heal} / 秒 · 半径 ${spec.radius}`);
  if (spec.income) add("矿石收入", `+${spec.income} / 秒`);
  if (spec.powerDraw) add("耗电", spec.powerDraw);
  if (a.type === "generator") add("供电上限", "+8");
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
  if (a.type === "miner") add("晶能采集", "每秒 0–4（依矿种）");
  if (spec.cost)
    add(
      "造价",
      `${spec.cost} 矿石${spec.crystal ? ` + ${spec.crystal} 晶能` : ""}`,
    );
  if (spec.time)
    add(
      units[a.type] ? "生产时间" : "施工时间",
      `${Number((spec.time * (units[a.type] ? productionFactor(g) : 1)).toFixed(2))} 秒`,
    );
  if (spec.tech) add("科技需求", "T2");
  if (spec.power) add("电力需求", spec.power + " 点上限");
  return { name: spec.name, note: notes[a.type], stats };
}
