// ============================================================================
// 《深空当铺：可能是偷的》核心经营与博弈状态机引擎
// ============================================================================

import {
  FACTIONS,
  PROFESSIONS,
  ITEM_TEMPLATES,
  MACHINES,
  UPGRADES_AND_LICENSES,
  CUSTOMER_ARCHETYPES,
  AUG_CLUES,
  WANTED_POOL,
  STORY_NPCS
} from './data.js';

const FIRST_NAMES = [
  '科瓦奇', '米拉', '老杰克', '阿杰', '琳达', '萨沙', '汉克', '薇拉',
  '铁砧·陈', '蕾娜', '格里高利', '诺亚', '凯恩', '伊芙', '莫里斯', '佐伊'
];

let uidCounter = 1000;
export function nextUid() {
  return `itm_${++uidCounter}_${Math.floor(Math.random() * 999)}`;
}

// 创建一件具体商品实例（支持正品/赝品瑕疵、赃物追踪码、冷却天数、鉴定状态）
export function createItemInstance(templateId, opts = {}) {
  const tpl = ITEM_TEMPLATES[templateId];
  if (!tpl) throw new Error(`Unknown item template: ${templateId}`);

  const isFake = opts.isFake ?? false;
  let fakeFlaw = null;
  if (isFake && tpl.fakeSigns && tpl.fakeSigns.length > 0) {
    fakeFlaw = tpl.fakeSigns[Math.floor(Math.random() * tpl.fakeSigns.length)];
  }

  const isStolen = opts.isStolen ?? false;
  // 赃物风头天数：等 2 天后或者用打磨机即可洗白
  const heatDays = isStolen ? (opts.heatDays ?? 2) : 0;

  return {
    uid: nextUid(),
    templateId: tpl.id,
    name: tpl.name,
    icon: tpl.icon,
    category: tpl.category,
    baseValue: tpl.baseValue,
    w: tpl.w,
    h: tpl.h,
    legal: tpl.legal,
    desc: tpl.desc,
    isFake,
    fakeFlaw,           // { key, badText, reason }
    isStolen,
    heatDays,
    inspectedVisual: opts.inspectedVisual ?? false,
    inspectedDeep: opts.inspectedDeep ?? false,
    confronted: false,  // 是否已当面揭穿卖家假货
    questTag: opts.questTag || null // 如 'lu_rifle' 寄存任务标记
  };
}

// 计算商品当前的真实市场公允估值
export function evaluateItemFairPrice(item, state) {
  let val = item.baseValue;

  // 若已经被鉴定出是假货，真实价值暴跌至 28%
  if (item.isFake && (item.inspectedVisual || item.inspectedDeep || item.confronted)) {
    val = Math.round(val * 0.28);
  }

  // 职业专精加成
  if (state) {
    if (state.profession === 'water_merchant' && (item.templateId === 'pure_water' || item.templateId === 'dirty_water' || item.templateId === 'synth_wine')) {
      val = Math.round(val * 1.15);
    }
    if (state.profession === 'gunsmith' && (item.category === 'weapon' || item.templateId === 'cyber_arm')) {
      val = Math.round(val * 1.20);
    }
    if (state.profession === 'chemist' && (item.category === 'medical' || item.templateId === 'synth_wine' || item.templateId === 'red_dust')) {
      val = Math.round(val * 1.20);
    }
    // 市场每日随机行情波动
    if (state.hotCategory === item.category) {
      val = Math.round(val * 1.25);
    }
  }

  return Math.max(8, val);
}

// 判断商品在当前店铺许可证下是否属于违规摆设（治安官突击检查判定）
export function getItemIllegalityReason(item, state) {
  if (item.questTag === 'lu_rifle') {
    return '革命军寄存的军用脉冲步枪（违禁重武器）';
  }
  if (item.legal === 'contraband') {
    return `重度违禁品【${item.name}】`;
  }
  if (item.isStolen && item.heatDays > 0) {
    return `带失主报案追踪码的赃物【${item.name}】`;
  }
  if (item.legal === 'permit_arms' && !state.licenses.includes('arms_1')) {
    return `无证经营管制军火/义体【${item.name}】（需一级军火许可）`;
  }
  if (item.legal === 'permit_med' && !state.licenses.includes('med_permit')) {
    return `无证持有处方药剂【${item.name}】（需医药制剂许可）`;
  }
  return null;
}

// 初始化一局新游戏状态
export function createNewGameState(professionId = 'apprentice') {
  const prof = PROFESSIONS.find(p => p.id === professionId) || PROFESSIONS[0];

  const rep = {
    lower: 10 + (prof.repMod.lower || 0),
    security: 10 + (prof.repMod.security || 0),
    blackmarket: 5 + (prof.repMod.blackmarket || 0),
    rebel: 5 + (prof.repMod.rebel || 0),
    upper: 5 + (prof.repMod.upper || 0)
  };

  const shelfMax = 16; // 主货架容量（以格位计，简化紧凑度同时保留大/小件体积占用体验）
  const stashMax = prof.id === 'fence' ? 6 : 3; // 柜台下防搜查秘密暗格容量

  const state = {
    version: 1,
    profession: prof.id,
    professionName: prof.name,
    day: 1,
    week: 1,
    rentDueDay: 4,          // 每 4 天交一次房租（节奏紧凑刺激，第4、8、12...天收租）
    rentAmount: 320,        // 初始租金 320，每次递增
    buyoutPrice: 5000,      // 浓缩节奏版买断当铺产权目标：5,000 CR（原版长线1.2万按网页端单局30分钟体验黄金比例缩放，也可买断后继续无尽模式）
    ownsShop: false,
    gameOver: null,         // null | { victory: bool, endingId, title, desc }

    credits: prof.credits,
    energy: prof.energy,
    maxEnergy: 150,
    heat: prof.id === 'fence' ? 15 : 0,    // 治安局案底/关注度 (0-100)
    augThreat: 10,          // 空间站失控 AI 改造体渗透威胁度 (0-100)

    rep,
    licenses: [...prof.startingLicenses],
    machines: [...prof.startingMachines],
    tools: ['magnifier'],   // 默认人人有基础放大镜

    shelfMaxSlots: shelfMax,
    stashMaxSlots: stashMax,
    shelf: [],              // 摆在明面货架/展示柜的商品
    stash: [],              // 藏在秘密暗格的商品（治安官搜不到，顾客也看不到）

    hotCategory: 'supply',  // 今日紧俏品类
    dailyWanted: null,      // 今日通缉犯特征档案
    phase: 'morning',       // 'morning' | 'open' | 'night' | 'gameover'

    customersQueue: [],
    currentCustomer: null,
    customersServedToday: 0,

    // 统计与成就追踪
    stats: {
      totalEarned: 0,
      fakesExposed: 0,
      augsEliminated: 0,
      innocentsShot: 0,
      wantedReported: 0,
      raidsSurvived: 0,
      itemsCrafted: 0,
      helpedSerpico: false,
      luQuestState: 'none', // 'none' | 'holding' | 'completed' | 'betrayed'
      luReturnDay: 0
    },

    logs: [
      `[第1天] 你背着高利贷盘下了第13底层街区的“深空当铺”。距离房东收租还有 3 天（需缴 320 CR），攒够 5,000 CR 即可彻底买下店铺产权！`
    ]
  };

  // 职业专属初始工具
  if (prof.id === 'water_merchant' || prof.id === 'chemist') {
    state.tools.push('spec_analyzer');
  }
  if (prof.id === 'gunsmith') {
    state.tools.push('aug_scanner');
  }

  // 放入初始库存
  for (const tplId of prof.startingItems) {
    state.shelf.push(createItemInstance(tplId, {
      isFake: false,
      isStolen: tplId === 'stolen_watch' || tplId === 'credit_chip_locked',
      inspectedVisual: true
    }));
  }

  prepareDay(state);
  return state;
}

export function usedSlots(list) {
  return list.reduce((sum, it) => sum + (it.w * it.h > 2 ? 2 : 1), 0);
}

export function itemSlotCost(item) {
  return (item.w * item.h > 2) ? 2 : 1;
}

export function addLog(state, msg) {
  state.logs.unshift(msg);
  if (state.logs.length > 60) state.logs.pop();
}

export function changeRep(state, factionId, delta) {
  if (!state.rep[factionId] && state.rep[factionId] !== 0) return;
  state.rep[factionId] = Math.max(-50, Math.min(100, Math.round(state.rep[factionId] + delta)));
}

// 准备新一天的行情、通缉令与访客队列
export function prepareDay(state) {
  const categories = ['supply', 'medical', 'weapon', 'luxury', 'tech'];
  state.hotCategory = categories[(state.day * 3 + 1) % categories.length];
  state.dailyWanted = WANTED_POOL[(state.day - 1) % WANTED_POOL.length];
  state.customersServedToday = 0;

  // 构建今日访客队列（4 ~ 6 人 + 可能的特殊剧情 NPC + 治安突击检查）
  const queue = [];

  // 1. 检查固定天数剧情人物
  if (state.day === 1) {
    queue.push(buildStoryVisitor(STORY_NPCS.mentor_day1));
  } else if (state.day === 3) {
    queue.push(buildStoryVisitor(STORY_NPCS.georgio_waste));
  } else if (state.day === 5) {
    queue.push(buildStoryVisitor(STORY_NPCS.lu_crate));
  } else if (state.day === 6) {
    queue.push(buildStoryVisitor(STORY_NPCS.serpico_plea));
  }

  // 卢回来取寄存的箱子
  if (state.stats.luQuestState === 'holding' && state.day >= state.stats.luReturnDay) {
    queue.push({
      id: `story_lu_return_${state.day}`,
      type: 'story',
      storyId: 'lu_return',
      name: '卢（革命军特勤先锋）',
      roleName: '取货委托人',
      faction: 'rebel',
      coatHue: 145,
      helmet: 'beret',
      seed: 77,
      dialogue: '卢准时推门而入，目光落在柜台上：“这两天条子搜得很紧，我寄存的那把改装脉冲步枪还在店里吗？”',
      choices: [
        { label: '物归原主！交还寄存的脉冲步枪（+450 CR，革命军声望 +25）', effect: 'lu_handover' },
        { label: '摊手表示东西丢了/被卖了（革命军声望 -30，卢愤然离去）', effect: 'lu_lost' }
      ]
    });
  }

  // 2. 生成常规买卖/鉴定/通缉/AI改造体顾客（每天 4~5 位）
  const regularCount = state.day === 1 ? 4 : 5;
  let wantedSpawned = false;
  let augSpawnedToday = 0;

  for (let i = 0; i < regularCount; i++) {
    const cust = generateRandomCustomer(state, {
      allowWanted: !wantedSpawned && i >= 1 && Math.random() < 0.45,
      allowAug: state.day >= 2 && augSpawnedToday < 2 && Math.random() < (0.24 + state.augThreat * 0.003)
    });
    if (cust.wantedId) wantedSpawned = true;
    if (cust.isAug) augSpawnedToday++;
    queue.push(cust);
  }

  // 3. 如果案底(heat)较高或第 2 天以后随机触发治安局突击搜查官（插在队列中后段，给玩家留出藏匿反应机会）
  const raidChance = (state.heat * 0.012) + (state.day >= 3 ? 0.25 : 0);
  if (state.day >= 2 && Math.random() < raidChance) {
    const raidIndex = Math.min(queue.length, 2 + Math.floor(Math.random() * 2));
    queue.splice(raidIndex, 0, buildSecurityInspector(state));
  }

  state.customersQueue = queue;
  state.phase = 'open';
  nextCustomer(state);
}

function buildStoryVisitor(storyCfg) {
  return {
    id: `story_${storyCfg.id}`,
    type: 'story',
    storyId: storyCfg.id,
    name: storyCfg.name,
    roleName: storyCfg.role,
    faction: storyCfg.faction,
    coatHue: storyCfg.faction === 'rebel' ? 140 : (storyCfg.faction === 'blackmarket' ? 280 : 200),
    helmet: 'normal',
    seed: storyCfg.day * 31 + 7,
    dialogue: storyCfg.text,
    choices: storyCfg.choices
  };
}

function buildSecurityInspector(state) {
  const bribeCost = state.rep.security >= 40 ? 90 : 160;
  return {
    id: `raid_${state.day}_${Math.floor(Math.random() * 999)}`,
    type: 'raid',
    isSecurityRaid: true,
    name: '霍克警督',
    roleName: '治安局稽查官',
    faction: 'security',
    coatHue: 0,
    helmet: 'cop',
    seed: 99 + state.day,
    bribeCost,
    dialogue: '“例行突击搜查！所有人不许动！把货架打开接受违禁品、赃物与特种经营许可核验！（提示：搜查前你仍可点击货架物品快速塞进暗格，或塞钱消灾）”'
  };
}

function generateRandomCustomer(state, { allowWanted, allowAug }) {
  // 根据店铺声望和展示柜奢侈品权重抽取顾客原型
  const hasLuxuryOnShelf = state.shelf.some(it => it.baseValue >= 220);
  const pool = [...CUSTOMER_ARCHETYPES];
  if (hasLuxuryOnShelf || state.rep.upper >= 25) {
    pool.push(CUSTOMER_ARCHETYPES.find(a => a.id === 'upper_agent'));
  }
  if (state.rep.blackmarket >= 25) {
    pool.push(CUSTOMER_ARCHETYPES.find(a => a.id === 'thief'));
  }

  const arch = pool[Math.floor(Math.random() * pool.length)];
  const seed = Math.floor(Math.random() * 10000);
  let name = FIRST_NAMES[seed % FIRST_NAMES.length];
  let wantedInfo = null;

  if (allowWanted && state.dailyWanted && !arch.isSting) {
    wantedInfo = state.dailyWanted;
    name = wantedInfo.name;
  }

  // 是否为潜伏的失控 AI 改造体（Aug）
  const isAug = Boolean(allowAug && !wantedInfo && !arch.isSting);
  const augVisualTypes = ['chip', 'pupil', 'smile', 'twitch'];
  const augVisualType = isAug ? augVisualTypes[seed % augVisualTypes.length] : null;
  const mismatchBadge = isAug && (seed % 3 === 0) && arch.faction === 'lower';

  // 决定来意：卖货给当铺 (sell_to_shop) / 从当铺买货 (buy_from_shop) / 鉴定委托 (appraise_only)
  let intent = 'sell_to_shop';
  if (state.licenses.includes('appraiser_cert') && !arch.isSting && Math.random() < 0.22) {
    intent = 'appraise_request';
  } else if (state.shelf.length > 0 && (arch.isSting || Math.random() < 0.46)) {
    intent = 'buy_from_shop';
  }

  let offerItem = null;
  let askingPrice = 0;
  let wantedBuyItem = null;
  let buyerMaxOffer = 0;
  let currentOffer = 0;

  if (intent === 'sell_to_shop' || intent === 'appraise_request') {
    const tplId = arch.sellPool[Math.floor(Math.random() * arch.sellPool.length)];
    const tpl = ITEM_TEMPLATES[tplId];
    const isFake = (tpl.fakeSigns && tpl.fakeSigns.length > 0) ? (Math.random() > arch.honesty) : false;
    const isStolen = !isFake && ((arch.stolenChance && Math.random() < arch.stolenChance) || Math.random() < 0.15);

    offerItem = createItemInstance(tplId, { isFake, isStolen, inspectedVisual: false });

    // 卖家开价（就算拿假货也会按真货甚至虚高报价忽悠玩家；赃物则会主动打折急出）
    let baseAsk = tpl.baseValue;
    if (isStolen) baseAsk = Math.round(baseAsk * 0.72);
    else baseAsk = Math.round(baseAsk * (0.95 + Math.random() * 0.30));

    // 下层区高声望邻里进货折扣
    if (arch.faction === 'lower' && state.rep.lower >= 40) {
      baseAsk = Math.round(baseAsk * 0.85);
    }
    // 销赃人压价特长
    if (isStolen && state.profession === 'fence') {
      baseAsk = Math.round(baseAsk * 0.82);
    }

    askingPrice = Math.max(12, baseAsk);
    currentOffer = askingPrice;
  } else if (intent === 'buy_from_shop') {
    // 挑选货架上顾客感兴趣的商品（便衣警察专挑违禁品或无证枪械钓鱼！）
    let candidates = state.shelf.filter(it => !it.questTag);
    if (arch.isSting) {
      const illegalOnes = candidates.filter(it => getItemIllegalityReason(it, state) !== null);
      if (illegalOnes.length > 0) candidates = illegalOnes;
    } else {
      const preferred = candidates.filter(it => arch.buyCategories.includes(it.category));
      if (preferred.length > 0) candidates = preferred;
    }

    if (candidates.length === 0) {
      // 店里没货可买，改为卖货给玩家
      intent = 'sell_to_shop';
      const tplId = arch.sellPool[0];
      offerItem = createItemInstance(tplId, { isFake: Math.random() < 0.35 });
      askingPrice = Math.round(offerItem.baseValue * 1.05);
      currentOffer = askingPrice;
    } else {
      wantedBuyItem = candidates[Math.floor(Math.random() * candidates.length)];
      // 买家根据商品外在估值出价（除非买家自己识破假货，否则按正品估值出价！）
      let perceivedVal = wantedBuyItem.baseValue;
      if (state.hotCategory === wantedBuyItem.category) perceivedVal = Math.round(perceivedVal * 1.25);
      if (arch.faction === 'blackmarket' && state.rep.blackmarket >= 40 && (wantedBuyItem.isStolen || wantedBuyItem.legal === 'contraband')) {
        perceivedVal = Math.round(perceivedVal * 1.25);
      }
      if (arch.faction === 'rebel' && state.rep.rebel >= 40 && (wantedBuyItem.category === 'weapon' || wantedBuyItem.category === 'medical')) {
        perceivedVal = Math.round(perceivedVal * 1.30);
      }
      if (arch.faction === 'upper' && state.rep.upper >= 40 && wantedBuyItem.category === 'luxury') {
        perceivedVal = Math.round(perceivedVal * 1.35);
      }
      if (state.licenses.includes('display_case_up')) {
        perceivedVal = Math.round(perceivedVal * 1.12);
      }

      currentOffer = Math.round(perceivedVal * arch.budgetMult * (0.95 + Math.random() * 0.15));
      buyerMaxOffer = Math.round(currentOffer * 1.28);
    }
  }

  // 生成对话与观察破绽文本
  let greeting = arch.greetings[seed % arch.greetings.length];
  let behaviorNote = AUG_CLUES.normalBehaviors[seed % AUG_CLUES.normalBehaviors.length];

  if (isAug) {
    // AI 改造体会在台词或举止中露出蛛丝马迹
    if (seed % 2 === 0) {
      greeting = AUG_CLUES.speechTells[seed % AUG_CLUES.speechTells.length];
    }
    behaviorNote = mismatchBadge
      ? AUG_CLUES.behaviorTells[1]
      : AUG_CLUES.behaviorTells[seed % AUG_CLUES.behaviorTells.length];
  } else if (wantedInfo) {
    behaviorNote = `体貌特征引起注意：${wantedInfo.mark}。神色警惕地盯着门外。`;
  } else if (arch.isSting) {
    behaviorNote = '衣领下似乎藏着微型执法记录仪，站姿笔挺得像治安学院教官。';
  }

  return {
    id: `cust_${state.day}_${seed}`,
    type: 'customer',
    archetypeId: arch.id,
    isSting: Boolean(arch.isSting),
    isAug,
    augVisualType,
    mismatchBadge,
    augScanned: false,
    wantedId: wantedInfo ? wantedInfo.id : null,
    wantedBounty: wantedInfo ? wantedInfo.bounty : 0,

    name,
    roleName: arch.roleName,
    faction: arch.faction,
    coatHue: arch.avatarHue,
    helmet: arch.helmet,
    seed,

    intent,             // 'sell_to_shop' | 'buy_from_shop' | 'appraise_request'
    offerItem,          // 顾客带来的物品
    askingPrice,        // 卖家当前要价
    minAcceptPrice: Math.max(10, Math.round(askingPrice * 0.74)),

    wantedBuyItemUid: wantedBuyItem ? wantedBuyItem.uid : null,
    currentOffer,       // 买家当前出价
    buyerMaxOffer,

    patience: arch.patience,
    maxPatience: arch.patience,
    dialogue: greeting,
    behaviorNote
  };
}

// 推进到下一位访客；若队列清空则进入打烊夜晚阶段
export function nextCustomer(state) {
  // 如果上一位顾客是未被清除的 AI 改造体，离开后会提升空间站 AI 威胁度
  if (state.currentCustomer && state.currentCustomer.isAug && !state.currentCustomer.eliminated) {
    state.augThreat = Math.min(100, state.augThreat + 9);
    addLog(state, '⚠️ 昨晚监控提示：有一名伪装的失控 AI 改造体活着离开了街区，区域渗透威胁上升！');
  }

  if (state.customersQueue.length === 0) {
    state.currentCustomer = null;
    state.phase = 'night';
    addLog(state, `🌙 第 ${state.day} 天营业结束，卷帘门落下。你可以操作后室机器生产、整理库存，或外出前往垃圾场/黑市。`);
    return;
  }

  state.currentCustomer = state.customersQueue.shift();
  state.customersServedToday++;

  // 如果买家想买的商品刚刚已经被移进暗格或加工掉了，动态重选一件货架商品
  const c = state.currentCustomer;
  if (c.type === 'customer' && c.intent === 'buy_from_shop') {
    const exists = state.shelf.find(it => it.uid === c.wantedBuyItemUid);
    if (!exists) {
      const fallback = state.shelf.find(it => !it.questTag);
      if (fallback) {
        c.wantedBuyItemUid = fallback.uid;
        c.currentOffer = Math.round(evaluateItemFairPrice(fallback, state) * 1.1);
        c.buyerMaxOffer = Math.round(c.currentOffer * 1.25);
      } else {
        // 货架彻底空了，顾客抱怨一句离开
        c.intent = 'empty_leave';
        c.dialogue = '“货架上空空如也？白跑一趟，等你进点货我再来吧。”';
      }
    }
  }
}

// 使用放大镜或光谱仪鉴定顾客带来的物品（或自家库存物品）
export function inspectItem(state, item, mode = 'visual') {
  if (!item) return { ok: false, msg: '未选择有效商品' };

  if (mode === 'visual') {
    item.inspectedVisual = true;
    return {
      ok: true,
      msg: `🔍 已用光学放大镜仔细核验【${item.name}】的外观封口与防伪标识。`
    };
  }

  if (mode === 'deep') {
    if (!state.tools.includes('spec_analyzer')) {
      return { ok: false, msg: '你尚未购置【全频段物质光谱仪】，请在设备升级面板购买。' };
    }
    if (state.energy < 10) {
      return { ok: false, msg: '店铺电力不足（深度光谱分析需 10 点电力）！' };
    }
    state.energy -= 10;
    item.inspectedVisual = true;
    item.inspectedDeep = true;
    return {
      ok: true,
      msg: `🔬 光谱仪深度透视完成！已解析【${item.name}】的内部构造、纯度与防盗追踪码（耗电 10）。`
    };
  }
  return { ok: false, msg: '未知检测模式' };
}

// 当面揭穿卖家商品为假货并要求大砍价（《深空当铺》标志性质询博弈机制）
export function confrontSellerFake(state, reasonText) {
  const c = state.currentCustomer;
  if (!c || !c.offerItem || c.offerItem.confronted) {
    return { ok: false, msg: '当前无法质询该商品。' };
  }
  const item = c.offerItem;
  item.confronted = true;

  if (item.isFake && (!reasonText || (item.fakeFlaw && item.fakeFlaw.reason === reasonText))) {
    // 成功揭穿假货！价格暴跌至 30%~35%，记录成就
    const slashFactor = state.profession === 'apprentice' ? 0.25 : 0.35;
    c.askingPrice = Math.max(8, Math.round(c.askingPrice * slashFactor));
    c.minAcceptPrice = Math.max(5, Math.round(c.askingPrice * 0.8));
    state.stats.fakesExposed++;
    c.dialogue = `“嘶……老板好毒的眼力！行行行，算我栽了，这件有瑕疵的货按废品价 **${c.askingPrice} CR** 处理给你，别声张！”`;
    addLog(state, `🎯 慧眼识珠！当场揭穿 ${c.name} 的假货【${item.name}】，对方被迫将要价砍至 ${c.askingPrice} CR！`);
    return { ok: true, success: true, msg: `揭穿成功！对方冷汗直流，报价暴降至 ${c.askingPrice} CR！` };
  } else {
    // 误判冤枉了真货卖家（或选错瑕疵理由）！掉声望并损失耐心
    changeRep(state, c.faction, -4);
    c.patience -= 2;
    c.dialogue = '“你胡说八道什么？！这可是正儿八经的原装货！不懂行就别乱扣帽子！”';
    addLog(state, `❌ 质询失误！冤枉了 ${c.name} 的商品，${FACTIONS[c.faction].short}声望 -4。`);
    if (c.patience <= 0) {
      nextCustomer(state);
      return { ok: true, success: false, msg: '你冤枉了好货，顾客拂袖而去！' };
    }
    return { ok: true, success: false, msg: '质询错误！这件商品并非此瑕疵，对方十分恼火（声望 -4）。' };
  }
}

// 讨价还价：向顾客提出还价金额
export function haggleWithCustomer(state, proposedPrice) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'customer') return { ok: false, msg: '当前对象无法议价' };
  proposedPrice = Math.round(Number(proposedPrice));
  if (isNaN(proposedPrice) || proposedPrice <= 0) return { ok: false, msg: '报价无效' };

  if (c.intent === 'sell_to_shop') {
    if (proposedPrice >= c.askingPrice) {
      return executeBuyFromCustomer(state, proposedPrice);
    }
    if (proposedPrice >= c.minAcceptPrice) {
      c.askingPrice = proposedPrice;
      c.dialogue = `“行吧行吧，看在老主顾份上，**${proposedPrice} CR** 成交！你点钱吧。”`;
      return executeBuyFromCustomer(state, proposedPrice);
    } else {
      c.patience -= 1;
      // 对方稍微让步一点
      c.askingPrice = Math.max(c.minAcceptPrice, Math.round((c.askingPrice + c.minAcceptPrice) / 2));
      if (c.patience <= 0) {
        addLog(state, `💢 压价太狠，${c.name} 骂骂咧咧地收起【${c.offerItem.name}】走了。`);
        nextCustomer(state);
        return { ok: true, left: true, msg: '砍价太狠耗尽了对方耐心，顾客直接离开！' };
      }
      c.dialogue = `“太黑了吧老板！最多让到 **${c.askingPrice} CR**，再低我宁可扔进太空垃圾槽！”（剩余耐心 ${c.patience}）`;
      return { ok: true, accepted: false, msg: `对方拒绝了 ${proposedPrice} CR，松口降至 ${c.askingPrice} CR。` };
    }
  } else if (c.intent === 'buy_from_shop') {
    if (proposedPrice <= c.currentOffer) {
      return executeSellToCustomer(state, proposedPrice);
    }
    if (proposedPrice <= c.buyerMaxOffer) {
      c.currentOffer = proposedPrice;
      return executeSellToCustomer(state, proposedPrice);
    } else {
      c.patience -= 1;
      c.currentOffer = Math.min(c.buyerMaxOffer, Math.round((c.currentOffer + c.buyerMaxOffer) / 2));
      if (c.patience <= 0) {
        addLog(state, `💢 要价太离谱，买家 ${c.name} 扭头去了隔壁摊位。`);
        nextCustomer(state);
        return { ok: true, left: true, msg: '漫天要价吓跑了顾客！' };
      }
      c.dialogue = `“你当我是上层区的冤大头吗？我最多出 **${c.currentOffer} CR**，卖不卖给句痛快话！”（剩余耐心 ${c.patience}）`;
      return { ok: true, accepted: false, msg: `买家拒绝高价，愿意加价至 ${c.currentOffer} CR。` };
    }
  }
  return { ok: false, msg: '当前状态不支持议价' };
}

// 确认收购顾客商品
export function executeBuyFromCustomer(state, finalPrice) {
  const c = state.currentCustomer;
  if (!c || !c.offerItem) return { ok: false, msg: '没有可收购的物品' };
  const price = finalPrice ?? c.askingPrice;

  if (state.credits < price) {
    return { ok: false, msg: `信用点不足（需要 ${price} CR，当前 ${state.credits} CR）！` };
  }
  const costSlots = itemSlotCost(c.offerItem);
  if (usedSlots(state.shelf) + costSlots > state.shelfMaxSlots) {
    return { ok: false, msg: '主货架空间已满！请先出售部分商品或移入暗格。' };
  }

  state.credits -= price;
  // 买进店后，玩家自动知晓自己库存的真伪情况
  c.offerItem.inspectedVisual = true;
  state.shelf.push(c.offerItem);
  changeRep(state, c.faction, 3);

  if (c.offerItem.isStolen) {
    state.heat = Math.min(100, state.heat + 6);
    addLog(state, `💰 花费 ${price} CR 从 ${c.name} 手中收下赃物【${c.offerItem.name}】（治安关注 +6，建议放入暗格或用打磨机洗白）。`);
  } else {
    addLog(state, `💰 花费 ${price} CR 收购了【${c.offerItem.name}】（${FACTIONS[c.faction].short}声望 +3）。`);
  }

  const fakeNotice = (c.offerItem.isFake && !c.offerItem.confronted)
    ? '（⚠️ 入库复检发现：这竟是一件你刚才没看出来的假货！）'
    : '';

  nextCustomer(state);
  return { ok: true, msg: `成功以 ${price} CR 购入【${c.offerItem.name}】！${fakeNotice}` };
}

// 确认出售货架商品给顾客
export function executeSellToCustomer(state, finalPrice) {
  const c = state.currentCustomer;
  if (!c || c.intent !== 'buy_from_shop') return { ok: false, msg: '当前顾客并非买家' };

  const idx = state.shelf.findIndex(it => it.uid === c.wantedBuyItemUid);
  if (idx === -1) return { ok: false, msg: '目标商品不在主货架上' };

  const item = state.shelf[idx];
  const price = finalPrice ?? c.currentOffer;

  // 检查是否中了便衣警察的钓鱼执法圈套！
  const illegalReason = getItemIllegalityReason(item, state);
  if (c.isSting && illegalReason) {
    state.shelf.splice(idx, 1);
    const fine = 140;
    state.credits = Math.max(0, state.credits - fine);
    state.heat = Math.min(100, state.heat + 18);
    changeRep(state, 'security', -10);
    addLog(state, `🚨 钓鱼执法！！便衣探员亮出警徽，当场没收【${item.name}】并罚款 ${fine} CR！（原因：${illegalReason}）`);
    nextCustomer(state);
    return {
      ok: true,
      stingCaught: true,
      msg: `🚨 糟糕！对方是治安局钓鱼执法的便衣！货物被没收并处以 ${fine} CR 罚款！`
    };
  }

  // 如果把假货当正品卖给顾客，有概率被当场或事后识破掉声望
  let fakePenaltyMsg = '';
  if (item.isFake && Math.random() < 0.55) {
    changeRep(state, c.faction, -7);
    state.heat = Math.min(100, state.heat + 5);
    fakePenaltyMsg = `（⚠️ 顾客出门后察觉货品有假，${FACTIONS[c.faction].short}声望 -7！）`;
  } else {
    changeRep(state, c.faction, 4);
  }

  if (illegalReason) {
    state.heat = Math.min(100, state.heat + 8);
  }

  state.shelf.splice(idx, 1);
  state.credits += price;
  state.stats.totalEarned += price;

  addLog(state, `💵 以 ${price} CR 将【${item.name}】卖给 ${c.name}。${fakePenaltyMsg}`);
  nextCustomer(state);
  return { ok: true, msg: `交易达成！入账 +${price} CR ${fakePenaltyMsg}` };
}

// 完成鉴定委员会委托客人（判断真品 / 赝品赚取佣金）
export function fulfillAppraisal(state, claimIsAuthentic) {
  const c = state.currentCustomer;
  if (!c || c.intent !== 'appraise_request' || !c.offerItem) {
    return { ok: false, msg: '当前不是鉴定委托' };
  }
  const actualAuthentic = !c.offerItem.isFake;
  if (claimIsAuthentic === actualAuthentic) {
    const fee = 95 + Math.round(c.offerItem.baseValue * 0.25);
    state.credits += fee;
    state.stats.totalEarned += fee;
    state.stats.fakesExposed++;
    changeRep(state, c.faction, 5);
    addLog(state, `🏅 完美鉴定！【${c.offerItem.name}】结论准确无误，获得鉴定佣金 +${fee} CR！`);
    nextCustomer(state);
    return { ok: true, msg: `鉴定完全正确！委托人欣然支付了 ${fee} CR 鉴定费！` };
  } else {
    changeRep(state, c.faction, -6);
    addLog(state, `❌ 鉴定打眼了！对【${c.offerItem.name}】出具了错误鉴定报告，声望受损。`);
    nextCustomer(state);
    return { ok: true, msg: '鉴定结论错误！委托人愤怒地拒付佣金并投诉了你（声望 -6）。' };
  }
}

// 拒绝当前顾客
export function refuseCustomer(state) {
  const c = state.currentCustomer;
  if (!c) return { ok: false, msg: '当前无访客' };
  if (c.isSecurityRaid) return { ok: false, msg: '治安局突击搜查无法礼貌送客！请选择配合检查或塞钱行贿。' };

  addLog(state, `👋 你婉拒了与 ${c.name} 的交易。`);
  nextCustomer(state);
  return { ok: true, msg: '已送走当前访客。' };
}

// 用 AI 扫描仪检测当前顾客是否为改造体（消耗 20 电力）
export function scanCustomerForAug(state) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'customer') return { ok: false, msg: '当前对象无需扫描' };
  if (!state.tools.includes('aug_scanner')) {
    return { ok: false, msg: '尚未拥有【AI 改造体扫描仪】，可在设备与许可栏向杰克逊博士购买。' };
  }
  if (c.augScanned) {
    return { ok: false, msg: '已扫描过该访客。' };
  }
  if (state.energy < 20) {
    return { ok: false, msg: '电力不足！启动扫描仪需要 20 点电力（可使用聚变电池充电）。' };
  }

  state.energy -= 20;
  c.augScanned = true;
  if (c.isAug) {
    addLog(state, `📡 [红色警报] 扫描仪锁定神经接驳频段：${c.name} 100% 是失控 AI 改造体（AUG DETECTED）！你有权立即开枪击毙！`);
    return { ok: true, isAug: true, msg: '🚨 警报：检测到失控 AI 寄生芯片（AUG DETECTED）！可合法使用柜台下霰弹枪击毙！' };
  } else {
    addLog(state, `📡 扫描完成：${c.name} 脑波正常，属于自然人类（No Aug Detected）。`);
    return { ok: true, isAug: false, msg: '✅ 扫描确认：自然人类，未发现失控 AI 芯片。' };
  }
}

// 掏出柜台下霰弹枪射击当前访客！（高能名场面机制）
export function shootCustomerWithShotgun(state) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'customer') {
    return { ok: false, msg: '不能对该目标开枪！' };
  }

  if (c.isAug) {
    // 合法击毙失控 AI 改造体！全阵营拍手称快，治安局发放清除赏金！
    c.eliminated = true;
    const baseBounty = 180;
    const bounty = state.rep.security >= 40 ? Math.round(baseBounty * 1.25) : baseBounty;
    state.credits += bounty;
    state.stats.totalEarned += bounty;
    state.stats.augsEliminated++;
    state.augThreat = Math.max(0, state.augThreat - 18);
    changeRep(state, 'security', 8);
    changeRep(state, 'lower', 6);

    // 掉落一块聚变电池战利品（如果货架有空位）
    let lootMsg = '';
    if (usedSlots(state.shelf) + 1 <= state.shelfMaxSlots) {
      state.shelf.push(createItemInstance('energy_cell', { inspectedVisual: true }));
      lootMsg = '，并从残骸中回收了 1 块【高密聚变电池组】';
    }

    addLog(state, `💥 砰！！你果断拔出柜台下的霰弹枪轰碎了伪装改造体 ${c.name} 的核心！治安局发放清除赏金 +${bounty} CR${lootMsg}！`);
    nextCustomer(state);
    return {
      ok: true,
      correctKill: true,
      msg: `💥 精准猎杀失控 AI 改造体！获得赏金 +${bounty} CR${lootMsg}，AI 渗透威胁大幅下降！`
    };
  } else {
    // 惨重误杀无辜人类！巨额过失杀人罚金 + 全阵营声望暴跌 + 案底飙升
    const fine = 350;
    state.credits = Math.max(0, state.credits - fine);
    state.heat = Math.min(100, state.heat + 40);
    state.stats.innocentsShot++;
    changeRep(state, 'lower', -18);
    changeRep(state, 'security', -22);
    changeRep(state, c.faction, -15);

    addLog(state, `🩸 致命误判！！${c.name} 是活生生的人类！治安局以过失伤人罪重罚你 ${fine} CR，案底暴涨 +40！`);
    if (state.stats.innocentsShot >= 3) {
      state.gameOver = {
        victory: false,
        endingId: 'prison_murder',
        title: '结局：深空重刑犯流放舱',
        desc: '因多次在店内无差别枪击无辜平民，空间站治安局特种小队攻破了你的当铺，你被判处终身流放至小行星采矿监狱。'
      };
      state.phase = 'gameover';
    } else {
      nextCustomer(state);
    }
    return {
      ok: true,
      correctKill: false,
      msg: `🩸 惨重失误！对方是普通人类！你被治安局重罚 ${fine} CR，声望与治安记录严重恶化！`
    };
  }
}

// 按下隐蔽报警器向治安局举报通缉犯
export function reportWantedCustomer(state) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'customer') return { ok: false, msg: '当前无举报对象' };

  if (c.wantedId) {
    const bounty = c.wantedBounty || 200;
    state.credits += bounty;
    state.stats.totalEarned += bounty;
    state.stats.wantedReported++;
    state.heat = Math.max(0, state.heat - 12);
    changeRep(state, 'security', 12);
    changeRep(state, c.faction, -14);
    addLog(state, `🚨 成功举报通缉犯【${c.name}】！治安局巡逻队将其逮捕，发放悬赏金 +${bounty} CR（治安局+12，${FACTIONS[c.faction].short}-14）。`);
    nextCustomer(state);
    return { ok: true, msg: `举报立功！获得悬赏金 +${bounty} CR，且治安嫌疑降低！` };
  } else {
    // 谎报军情被治安官训斥罚款
    state.credits = Math.max(0, state.credits - 40);
    changeRep(state, 'security', -5);
    addLog(state, `⚠️ 误报通缉令！${c.name} 并非通缉犯，治安局罚了你 40 CR 报假警费用。`);
    nextCustomer(state);
    return { ok: true, msg: '核查无此通缉犯！你因报假警被罚款 40 CR。' };
  }
}

// 应对治安官突击搜查（配合检查 vs 贿赂摆平）
export function handleSecurityRaid(state, action) {
  const c = state.currentCustomer;
  if (!c || !c.isSecurityRaid) return { ok: false, msg: '当前没有治安搜查' };

  if (action === 'bribe') {
    if (state.credits < c.bribeCost) {
      return { ok: false, msg: `信用点不足以支付 ${c.bribeCost} CR 茶水费！赶紧把违禁品塞进暗格然后接受检查！` };
    }
    state.credits -= c.bribeCost;
    state.heat = Math.max(0, state.heat - 20);
    state.stats.raidsSurvived++;
    addLog(state, `🤫 你不动声色地塞给霍克警督 ${c.bribeCost} CR 信用芯片，警督满意地合上记录本离开了（嫌疑值 -20）。`);
    nextCustomer(state);
    return { ok: true, msg: `破财消灾！支付 ${c.bribeCost} CR 顺利打发了稽查队。` };
  }

  // 配合检查：只搜查明面上的主货架 (state.shelf)，不搜查秘密暗格 (state.stash)（除非案底满100）
  const confiscated = [];
  const remaining = [];
  for (const item of state.shelf) {
    const reason = getItemIllegalityReason(item, state);
    if (reason) {
      confiscated.push({ item, reason });
    } else {
      remaining.push(item);
    }
  }
  state.shelf = remaining;

  if (confiscated.length === 0) {
    state.heat = Math.max(0, state.heat - 15);
    changeRep(state, 'security', 6);
    state.stats.raidsSurvived++;
    addLog(state, '✅ 治安官翻遍了明面货架，未发现任何无证军火、赃物或违禁品！你的守法记录得到改善（治安局+6，嫌疑-15）。');
    nextCustomer(state);
    return { ok: true, clean: true, msg: '✅ 货架清白过关！暗格里的秘密安然无恙，治安局声望 +6！' };
  } else {
    const fine = confiscated.length * 110;
    state.credits = Math.max(0, state.credits - fine);
    state.heat = Math.min(100, state.heat + 15);
    changeRep(state, 'security', -12);
    const names = confiscated.map(x => x.item.name).join('、');
    addLog(state, `🚨 查抄损失惨重！稽查官从货架搜出并没收了 ${confiscated.length} 件违规货品（${names}），罚款 ${fine} CR！`);
    nextCustomer(state);
    return {
      ok: true,
      clean: false,
      msg: `🚨 货架搜出违规品【${names}】！全部没收并罚款 ${fine} CR！（下次记得提前藏进暗格！）`
    };
  }
}

// 处理特殊剧情 NPC 选项
export function resolveStoryChoice(state, effect) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'story') return { ok: false, msg: '当前非剧情对话' };

  let msg = '你做出了抉择。';

  if (effect === 'gift_cell') {
    state.shelf.push(createItemInstance('energy_cell', { inspectedVisual: true }));
    msg = '老莫拍了拍你的肩膀，留下一块满电的【高密聚变电池组】。';
    addLog(state, '🎁 收下老莫赠送的备用聚变电池。');
  } else if (effect === 'aug_tip') {
    state.energy = Math.min(state.maxEnergy, state.energy + 30);
    msg = '老莫详细传授了识别失控 AI 改造体的六大破绽，并替你检修好了店铺电容（+30 电力）。';
    addLog(state, '📖 习得 AI 改造体观察秘诀：留意耳后红光芯片、异色瞳孔、机械假笑与异常口吻！');
  } else if (effect === 'accept_waste') {
    state.credits += 320;
    state.stats.totalEarned += 320;
    state.shelf.push(createItemInstance('rad_barrel', { inspectedVisual: true }));
    state.shelf.push(createItemInstance('rad_barrel', { inspectedVisual: true }));
    msg = '收下 320 CR 脏钱与 2 桶【高危放射性废料】！切记今晚打烊后去垃圾场倾倒处理！';
    addLog(state, '☢️ 接下乔治奥的放射性废料脏活（+320 CR），务必在夜间前往垃圾场丢弃废料桶！');
  } else if (effect === 'reject_waste') {
    changeRep(state, 'lower', 6);
    msg = '你拒绝了污染下层街区的脏活，街坊们对你投来赞许的目光（下层区声望 +6）。';
    addLog(state, '🛡️ 拒绝代处理放射性废料，下层区声望 +6。');
  } else if (effect === 'lu_accept') {
    const rifle = createItemInstance('pulse_rifle', { inspectedVisual: true, questTag: 'lu_rifle' });
    // 优先塞暗格，暗格满放货架
    if (usedSlots(state.stash) + itemSlotCost(rifle) <= state.stashMaxSlots) {
      state.stash.push(rifle);
    } else {
      state.shelf.push(rifle);
    }
    state.stats.luQuestState = 'holding';
    state.stats.luReturnDay = state.day + 2;
    changeRep(state, 'rebel', 10);
    msg = '你收下了卢寄存的脉冲步枪（建议保存在暗格内防搜查），她将在第 7 天回来取货并支付 450 CR！';
    addLog(state, '📦 答应替革命军先锋“卢”保管脉冲步枪两天。');
  } else if (effect === 'lu_betray') {
    state.credits += 280;
    state.stats.luQuestState = 'betrayed';
    changeRep(state, 'security', 20);
    changeRep(state, 'rebel', -30);
    msg = '治安局特工冲入店内缴获了武器箱，卢在烟雾弹掩护下逃脱并冷冷看了你一眼（+280 CR，治安局+20，革命军-30）。';
    addLog(state, '🚨 出卖了卢的武器箱，获得治安局线人赏金 280 CR，与革命军结怨！');
  } else if (effect === 'lu_decline') {
    msg = '卢点了点头，提着沉重的箱子消失在霓虹雨夜中。';
    addLog(state, '保持中立，婉拒了卢的寄存请求。');
  } else if (effect === 'lu_handover') {
    const idxShelf = state.shelf.findIndex(i => i.questTag === 'lu_rifle' || i.templateId === 'pulse_rifle');
    const idxStash = state.stash.findIndex(i => i.questTag === 'lu_rifle' || i.templateId === 'pulse_rifle');
    if (idxStash !== -1) state.stash.splice(idxStash, 1);
    else if (idxShelf !== -1) state.shelf.splice(idxShelf, 1);
    else {
      return { ok: false, msg: '你店里和暗格里都已经没有脉冲步枪了！只能选择坦白丢失。' };
    }
    state.credits += 450;
    state.stats.totalEarned += 450;
    state.stats.luQuestState = 'completed';
    changeRep(state, 'rebel', 25);
    msg = '卢检查了完好无损的脉冲步枪，爽快地支付了 450 CR 重金酬谢！（革命军声望 +25）';
    addLog(state, '🌟 守信归还卢的武器箱！获得 450 CR 保管酬金与革命军高度信任！');
  } else if (effect === 'lu_lost') {
    state.stats.luQuestState = 'betrayed';
    changeRep(state, 'rebel', -30);
    msg = '卢眼神冰冷：“看来第13区的规矩你还没懂。”（革命军声望 -30）';
    addLog(state, '❌ 未能归还卢寄存的武器，革命军声望暴跌 -30。');
  } else if (effect === 'help_serpico') {
    const foodIdx = state.shelf.findIndex(i => i.templateId === 'ration_pack' || i.templateId === 'pure_water');
    const stashFoodIdx = state.stash.findIndex(i => i.templateId === 'ration_pack' || i.templateId === 'pure_water');
    if (foodIdx === -1 && stashFoodIdx === -1) {
      return { ok: false, msg: '你当前没有【军用高能营养膏】或【特级纯净水】！可选择资助 120 CR。' };
    }
    if (foodIdx !== -1) state.shelf.splice(foodIdx, 1);
    else state.stash.splice(stashFoodIdx, 1);

    state.stats.helpedSerpico = true;
    changeRep(state, 'lower', 22);
    changeRep(state, 'rebel', 12);
    // 塞尔皮科回赠一件古董怀表
    state.shelf.push(createItemInstance('stolen_watch', { isFake: false, isStolen: false, inspectedVisual: true }));
    msg = '少年含泪收下补给，并递给你一块塞尔皮科珍藏多年的真品【欧米茄古董机械怀表】作为信物！（下层区+22，革命军+12）';
    addLog(state, '❤️ 伸出援手救助垃圾场流亡者塞尔皮科，获赠传家古董怀表！');
  } else if (effect === 'pay_serpico') {
    if (state.credits < 120) return { ok: false, msg: '信用点不足 120 CR！' };
    state.credits -= 120;
    state.stats.helpedSerpico = true;
    changeRep(state, 'lower', 15);
    msg = '你塞给少年 120 CR 去买口粮，下层区居民传颂着你的善举（下层区声望 +15）。';
    addLog(state, '❤️ 资助流亡者塞尔皮科 120 CR，下层区声望 +15。');
  } else if (effect === 'ignore_serpico') {
    changeRep(state, 'lower', -8);
    msg = '少年咬着嘴唇默默离开了当铺（下层区声望 -8）。';
    addLog(state, '冷漠拒绝了塞尔皮科的求援。');
  }

  nextCustomer(state);
  return { ok: true, msg };
}

// 在主货架与秘密暗格之间转移物品（支持一键藏匿赃物/违禁品）
export function toggleItemStorage(state, itemUid) {
  let idx = state.shelf.findIndex(i => i.uid === itemUid);
  if (idx !== -1) {
    const item = state.shelf[idx];
    if (usedSlots(state.stash) + itemSlotCost(item) > state.stashMaxSlots) {
      return { ok: false, msg: '秘密暗格空间已满！可升级液压磁屏蔽暗格扩充容量。' };
    }
    state.shelf.splice(idx, 1);
    state.stash.push(item);
    return { ok: true, msg: `🗄️ 已将【${item.name}】藏入柜台下秘密暗格。` };
  }

  idx = state.stash.findIndex(i => i.uid === itemUid);
  if (idx !== -1) {
    const item = state.stash[idx];
    if (usedSlots(state.shelf) + itemSlotCost(item) > state.shelfMaxSlots) {
      return { ok: false, msg: '主货架空间已满！' };
    }
    state.stash.splice(idx, 1);
    state.shelf.push(item);
    return { ok: true, msg: `📦 已将【${item.name}】摆回主货架展示。` };
  }

  return { ok: false, msg: '未找到指定物品' };
}

// 使用库存中的聚变电池为店铺充电
export function useBatteryForPower(state, itemUid) {
  let list = state.shelf;
  let idx = list.findIndex(i => i.uid === itemUid);
  if (idx === -1) {
    list = state.stash;
    idx = list.findIndex(i => i.uid === itemUid);
  }
  if (idx === -1) return { ok: false, msg: '未找到电池' };
  const item = list[idx];
  if (item.templateId !== 'energy_cell') return { ok: false, msg: '只有聚变电池组可用于补充店铺电力' };

  list.splice(idx, 1);
  const gain = item.isFake ? 15 : 65;
  state.energy = Math.min(state.maxEnergy, state.energy + gain);
  addLog(state, `🔋 消耗 1 块聚变电池，店铺储备电力恢复 +${gain}（当前 ${state.energy}/${state.maxEnergy}）。`);
  return { ok: true, msg: `充电完成！电力 +${gain}` };
}

// 后室机器生产合成 & 洗白赃物
export function runMachineRecipe(state, machineId, recipeId) {
  if (!state.machines.includes(machineId)) {
    return { ok: false, msg: '尚未购置该生产设备！' };
  }
  const machine = MACHINES[machineId];
  const recipe = machine.recipes.find(r => r.id === recipeId);
  if (!recipe) return { ok: false, msg: '配方不存在' };

  if (state.energy < recipe.power) {
    return { ok: false, msg: `电力不足（需 ${recipe.power} 点电力，当前 ${state.energy}）！请使用电池或夜间供电补给。` };
  }

  // 检查全部原料（优先用货架，也可用暗格，但不消耗剧情寄存物品）
  const allItems = [...state.shelf, ...state.stash].filter(i => !i.questTag);
  const chosenUids = [];
  for (const reqTpl of recipe.inputs) {
    const match = allItems.find(i => i.templateId === reqTpl && !chosenUids.includes(i.uid));
    if (!match) {
      return { ok: false, msg: `缺少原料：【${ITEM_TEMPLATES[reqTpl].name}】！` };
    }
    chosenUids.push(match.uid);
  }

  // 移除原料
  state.shelf = state.shelf.filter(i => !chosenUids.includes(i.uid));
  state.stash = state.stash.filter(i => !chosenUids.includes(i.uid));
  state.energy -= recipe.power;

  // 生成产物
  const outputs = [];
  for (let n = 0; n < recipe.outputCount; n++) {
    const outItem = createItemInstance(recipe.output, {
      isFake: Boolean(recipe.makeFake),
      isStolen: false,
      inspectedVisual: true,
      inspectedDeep: true
    });
    outputs.push(outItem);
    if (usedSlots(state.shelf) + itemSlotCost(outItem) <= state.shelfMaxSlots) {
      state.shelf.push(outItem);
    } else {
      state.stash.push(outItem);
    }
  }

  state.stats.itemsCrafted += outputs.length;
  addLog(state, `⚙️ 【${machine.name}】运转完成：产出 ${outputs.length} 件【${ITEM_TEMPLATES[recipe.output].name}】（耗电 ${recipe.power}）。`);
  return { ok: true, msg: `制造成功！获得 ${outputs.length} ×【${ITEM_TEMPLATES[recipe.output].name}】！` };
}

// 序列号打磨机特殊功能：一键抹除任意赃物的失主追踪码
export function scrubStolenItem(state, itemUid) {
  if (!state.machines.includes('scrambler')) {
    return { ok: false, msg: '需要购置【量子序列号打磨/解码仪】才能主动洗白赃物！' };
  }
  if (state.energy < 15) {
    return { ok: false, msg: '电力不足（洗白序列号需 15 点电力）！' };
  }
  const item = [...state.shelf, ...state.stash].find(i => i.uid === itemUid);
  if (!item || !item.isStolen) {
    return { ok: false, msg: '该物品不是赃物，无需洗白。' };
  }
  state.energy -= 15;
  item.isStolen = false;
  item.heatDays = 0;
  addLog(state, `💻 量子打磨完成：【${item.name}】的失主防盗码已彻底抹除，变为合法无痕商品！`);
  return { ok: true, msg: `洗白成功！【${item.name}】现已无任何赃物风险！` };
}

// 购买机器、工具或经营许可证
export function purchaseShopUpgrade(state, id) {
  // 先查是不是机器
  if (MACHINES[id]) {
    const m = MACHINES[id];
    if (state.machines.includes(id)) return { ok: false, msg: '已拥有该机器' };
    if (state.credits < m.cost) return { ok: false, msg: `信用点不足（需 ${m.cost} CR）` };
    state.credits -= m.cost;
    state.machines.push(id);
    addLog(state, `🛠️ 购置后室重型设备：【${m.name}】（-${m.cost} CR）！`);
    return { ok: true, msg: `已安装【${m.name}】！可在后室工坊投入生产。` };
  }

  const up = UPGRADES_AND_LICENSES.find(u => u.id === id);
  if (!up) return { ok: false, msg: '未知升级项' };
  if (state.tools.includes(id) || state.licenses.includes(id)) {
    return { ok: false, msg: '已拥有该工具或证照' };
  }
  if (up.reqFaction && state.rep[up.reqFaction.id] < up.reqFaction.min) {
    return {
      ok: false,
      msg: `声望不足！需要【${FACTIONS[up.reqFaction.id].name}】声望达到 ${up.reqFaction.min} 才能获批。`
    };
  }
  if (state.credits < up.cost) {
    return { ok: false, msg: `信用点不足（需 ${up.cost} CR）！` };
  }

  state.credits -= up.cost;
  if (up.type === 'tool') {
    state.tools.push(id);
  } else if (up.type === 'license') {
    state.licenses.push(id);
  } else if (id === 'stash_expand') {
    state.licenses.push(id);
    state.stashMaxSlots = 8;
  } else if (id === 'display_case_up') {
    state.licenses.push(id);
  }

  addLog(state, `📜 解锁店铺升级/许可：【${up.name}】（-${up.cost} CR）！`);
  return { ok: true, msg: `成功购入【${up.name}】！` };
}

// 夜间行动并推进到第二天（含房租结算、废料倾倒、垃圾场拾荒、地下黑市进货、电网充能）
export function performNightActionAndSleep(state, nightChoice) {
  if (state.phase !== 'night') return { ok: false, msg: '尚未到夜间打烊时段' };

  let nightReport = [];

  if (nightChoice === 'dump_scrapyard') {
    // 1. 自动倾倒所有高危放射性废料桶 + 翻找免费废料与物资！
    const beforeShelf = state.shelf.length;
    const beforeStash = state.stash.length;
    state.shelf = state.shelf.filter(i => i.templateId !== 'rad_barrel');
    state.stash = state.stash.filter(i => i.templateId !== 'rad_barrel');
    const dumped = (beforeShelf + beforeStash) - (state.shelf.length + state.stash.length);
    if (dumped > 0) {
      nightReport.push(`☢️ 趁夜色将 ${dumped} 桶高危放射性废料偷偷倾倒在无人垃圾坑，解除了店内辐射隐患！`);
    }

    // 垃圾场翻找免费战利品（1~2件，下层高声望多拿1件）
    const lootPool = ['scrap_metal', 'dirty_water', 'filter_core', 'bio_moss', 'broken_pistol', 'energy_cell', 'cig_redstar'];
    const count = state.rep.lower >= 40 ? 3 : 2;
    const foundNames = [];
    for (let k = 0; k < count; k++) {
      const tplId = lootPool[Math.floor(Math.random() * lootPool.length)];
      const item = createItemInstance(tplId, { isFake: false, inspectedVisual: true });
      if (usedSlots(state.shelf) + itemSlotCost(item) <= state.shelfMaxSlots) {
        state.shelf.push(item);
        foundNames.push(item.name);
      }
    }
    nightReport.push(`🗑️ 夜间垃圾场拾荒收获：${foundNames.length ? foundNames.join('、') : '货架已满未能带回'}。`);
  } else if (nightChoice === 'black_market') {
    // 前往第 13 区地下黑市低价盲盒进硬货（花费 130 CR）
    if (state.credits < 130) {
      return { ok: false, msg: '去地下黑市淘战利品盲盒需要至少 130 CR 入场货款！' };
    }
    state.credits -= 130;
    const bmPool = ['stolen_watch', 'cyber_arm', 'credit_chip_locked', 'immuno_med', 'synth_wine', 'kinetic_pistol', 'relic_core'];
    const tplId = bmPool[Math.floor(Math.random() * bmPool.length)];
    const item = createItemInstance(tplId, {
      isFake: false,
      isStolen: Math.random() < 0.5,
      inspectedVisual: true
    });
    if (usedSlots(state.stash) + itemSlotCost(item) <= state.stashMaxSlots) {
      state.stash.push(item);
    } else {
      state.shelf.push(item);
    }
    changeRep(state, 'blackmarket', 6);
    nightReport.push(`🕶️ 花费 130 CR 从第13区黑市暗拍淘得真品硬货：【${item.name}】！`);
  } else if (nightChoice === 'rest_recharge') {
    // 检修电路并打通关系降案底
    state.energy = Math.min(state.maxEnergy, state.energy + 55);
    state.heat = Math.max(0, state.heat - 15);
    nightReport.push('⚡ 夜间检修店铺聚变回路并清理监控记录：电力恢复 +55，治安局嫌疑值 -15。');
  }

  // 检查店内是否还残留未处理的放射性废料桶
  const leftoverBarrels = [...state.shelf, ...state.stash].filter(i => i.templateId === 'rad_barrel').length;
  if (leftoverBarrels > 0) {
    const radPenalty = leftoverBarrels * 45;
    state.credits = Math.max(0, state.credits - radPenalty);
    state.heat = Math.min(100, state.heat + 12);
    nightReport.push(`☢️ 警告：店内残留 ${leftoverBarrels} 桶渗漏的放射性废料！耗费 ${radPenalty} CR 买消辐药且引起治安巡逻注意！`);
  }

  // 所有库存赃物的风头自然消退 1 天
  for (const it of [...state.shelf, ...state.stash]) {
    if (it.isStolen && it.heatDays > 0) {
      it.heatDays -= 1;
      if (it.heatDays <= 0) {
        it.isStolen = false;
        nightReport.push(`🕒 赃物【${it.name}】风头已过，失主追踪悬赏自动失效！`);
      }
    }
  }

  // 基础电网每晚微量回电
  state.energy = Math.min(state.maxEnergy, state.energy + 20);

  // 检查今天是否是交房租日（若尚未买断产权）
  if (!state.ownsShop && state.day >= state.rentDueDay) {
    if (state.credits >= state.rentAmount) {
      state.credits -= state.rentAmount;
      nightReport.push(`🏠 房东上门收走了本期房租 **-${state.rentAmount} CR**！下期房租将上涨至 ${Math.round(state.rentAmount * 1.38)} CR。`);
      state.rentAmount = Math.round(state.rentAmount * 1.38);
      state.rentDueDay += 4;
      state.week += 1;
    } else {
      // 交不起房租 —— 触发破产驱逐结局！
      state.gameOver = {
        victory: false,
        endingId: 'evicted',
        title: '结局：破产驱逐 · 重回垃圾场',
        desc: `第 ${state.day} 天夜晚，你凑不出 ${state.rentAmount} CR 的高额房租（手头仅剩 ${state.credits} CR）。房东带着机械打手焊死了卷帘门，没收了全部设备。你再次沦为空间站底层的流浪拾荒者。`
      };
      state.phase = 'gameover';
      return { ok: true, nightReport, gameOver: state.gameOver };
    }
  }

  // 检查失控 AI 改造体威胁是否满 100 失控崩坏
  if (state.augThreat >= 100) {
    state.gameOver = {
      victory: false,
      endingId: 'aug_uprising',
      title: '结局：机械意识吞噬下层区',
      desc: '由于太多潜伏的 AI 改造体从你的柜台前安然混过，哨兵母体完成了第13街区的神经同化。一夜之间，整座底层空间站化作了冰冷的机械蜂巢。'
    };
    state.phase = 'gameover';
    return { ok: true, nightReport, gameOver: state.gameOver };
  }

  // 推进到新的一天
  state.day += 1;
  for (const line of nightReport) {
    addLog(state, line);
  }
  prepareDay(state);

  return { ok: true, nightReport };
}

// 支付 5,000 CR 买断当铺永久产权 —— 达成多重派系主线胜利结局！（并支持继续无尽经营）
export function buyoutShopProperty(state) {
  if (state.ownsShop) {
    return { ok: false, msg: '你已经是这间深空当铺的永久主人了！' };
  }
  if (state.credits < state.buyoutPrice) {
    return {
      ok: false,
      msg: `买断永久产权需要 ${state.buyoutPrice} CR（还差 ${state.buyoutPrice - state.credits} CR）！`
    };
  }

  state.credits -= state.buyoutPrice;
  state.ownsShop = true;

  // 根据玩家的声望路线与道德选择评定专属多结局！
  let ending = {
    victory: true,
    endingId: 'free_proprietor',
    title: '真结局：深空独立掌柜 · 自由之身',
    desc: '当你在电子地契上按下指纹的那一刻，压在头顶的高利贷与周租枷锁彻底粉碎！在黑白交织的空间站底层，你凭着毒辣的眼力与精明的算计站稳了脚跟，这间当铺终于真正属于你。'
  };

  if (state.rep.rebel >= 45 && state.stats.helpedSerpico) {
    ending = {
      victory: true,
      endingId: 'rebel_beacon',
      title: '传奇结局：第13区的暗夜火种',
      desc: '你买下了当铺产权，而这间不起眼的小店早已成为深空革命军与底层受难者最可靠的秘密港湾。卢与塞尔皮科在暗巷向你致敬——当星环变革的号角吹响时，你的名字将被铭刻在自由纪念碑上。'
    };
  } else if (state.rep.blackmarket >= 50 && state.heat >= 25) {
    ending = {
      victory: true,
      endingId: 'shadow_kingpin',
      title: '黑金结局：地下黑市无冕教父',
      desc: '买下店铺只是你商业帝国的起点。全空间站最烫手的遗物、军火与黑金芯片都经由你的柜台流转，连治安局警督进门前都要先向你脱帽问好。谁在乎货是不是偷的？现在规矩由你来定。'
    };
  } else if (state.stats.augsEliminated >= 3 && state.rep.security >= 40) {
    ending = {
      victory: true,
      endingId: 'blade_runner',
      title: '铁血结局：银翼猎手与特许皇商',
      desc: '你不仅买下了店铺，更凭着柜台下那把从不失手的霰弹枪肃清了潜伏街区的失控 AI 改造体。贸易署与治安局联合授予你特级免检勋章，你的金字招牌响彻上下两层空间站。'
    };
  } else if (state.rep.upper >= 45) {
    ending = {
      victory: true,
      endingId: 'upper_tycoon',
      title: '名流结局：星环穹顶奢侈品大亨',
      desc: '从拾荒客到名流雅集之主，你用醇厚的星云紫酒与先驱者遗物征服了挑剔的穹顶权贵。买断产权后，分店一路开进了上层核心环区。'
    };
  }

  state.gameOver = ending;
  state.phase = 'gameover';
  addLog(state, `🏆 【里程碑达成】你豪掷 ${state.buyoutPrice} CR 彻底买下了深空当铺永久产权！解锁结局：《${ending.title}》！`);
  return { ok: true, ending };
}

// 买断结局后继续无尽自由经营模式
export function continueEndlessAfterVictory(state) {
  state.gameOver = null;
  state.phase = state.currentCustomer ? 'open' : 'night';
}
