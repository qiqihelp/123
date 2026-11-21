// ============================================================================
// 《深空当铺：可能是偷的》2.0 核心经营引擎
// 支持：套包扩容箱（占小格扩出大空间+伪装免检）、五类密封箱+钥匙卡开箱、
// 刮刮乐与液体好运、单名顾客多物品整单/勾选交易、电话批发供货商大宗采购
// ============================================================================

import {
  FACTIONS,
  PROFESSIONS,
  ITEM_TEMPLATES,
  CRATE_LOOT_TABLES,
  WHOLESALE_MERCHANTS,
  MACHINES,
  UPGRADES_AND_LICENSES,
  CUSTOMER_ARCHETYPES,
  AUG_CLUES,
  WANTED_POOL,
  STORY_NPCS,
  DIFFICULTIES,
  PERKS_POSITIVE,
  PERKS_NEGATIVE,
  PERKS_NEUTRAL,
  NEWSPAPER_EVENTS
} from './data.js'


export function getModuleEffects(state) {
  const fx = {
    efficiency: 0, performance: 0, quality: 0, eco: 0, overclock: 0,
    refinement: 0, alarm_tx: 0, streamlining: 0, blast: 0, junk: 0,
    chem: 0, neural: 0, corrupted: 0, ruined: 0, blank: 0,
    hydro_speed: 0, hydro_yield: 0, hydro_quality: 0, hydro_auto: 0, hydro_light: 0, hydro_water: 0, hydro_temp: 0
  };
  if (!state.modules) return fx;
  for (const mid of state.modules) {
    const tpl = ITEM_TEMPLATES[mid];
    if (!tpl || !tpl.isModule) continue;
    const mt = tpl.moduleType;
    if (fx[mt] !== undefined) fx[mt] += 1;
  }
  return fx;
}
;

const FIRST_NAMES = [
  '科瓦奇', '米拉', '老杰克', '阿杰', '琳达', '萨沙', '汉克', '薇拉',
  '铁砧·陈', '蕾娜', '格里高利', '诺亚', '凯恩', '伊芙', '莫里斯', '佐伊',
  '霍夫曼', '卡佳', '小马可', '巴顿', '艾达', '老宋', '拉斐尔', '塔莉娅'
];

let uidCounter = 2000;
export function nextUid() {
  return `itm_${++uidCounter}_${Math.floor(Math.random() * 9999)}`;
}

// 创建商品或扩容容器实例
export function createItemInstance(templateId, opts = {}) {
  const tpl = ITEM_TEMPLATES[templateId];
  if (!tpl) throw new Error(`Unknown item template: ${templateId}`);

  const isFake = Boolean(opts.isFake && tpl.fakeSigns && tpl.fakeSigns.length > 0);
  let fakeFlaw = null;
  if (isFake) {
    fakeFlaw = tpl.fakeSigns[Math.floor(Math.random() * tpl.fakeSigns.length)];
  }

  const isStolen = Boolean(opts.isStolen && !tpl.isContainer);
  const heatDays = isStolen ? (opts.heatDays ?? 2) : 0;

  return {
    uid: nextUid(),
    templateId: tpl.id,
    name: tpl.name,
    icon: tpl.icon,
    category: tpl.category,
    baseValue: tpl.baseValue,
    slots: tpl.slots || 1,
    legal: tpl.legal,
    desc: tpl.desc,

    // 套包扩容箱专属字段（如暗区突围套包：外占 1~2 格，内含 4~12 格 items[]）
    isContainer: Boolean(tpl.isContainer),
    containerCap: tpl.containerCap || 0,
    shielded: Boolean(tpl.shielded), // true = 走私者免检伪装箱，治安官搜不到内部违禁品！
    contents: tpl.isContainer ? [] : undefined,

    // 密封物资箱专属字段
    isSealedCrate: Boolean(tpl.isSealedCrate),
    requiredKey: tpl.requiredKey || null,

    // 消耗品能力
    isUsable: tpl.isUsable || null,

    isFake,
    fakeFlaw,
    isStolen,
    heatDays,
    inspectedVisual: Boolean(opts.inspectedVisual),
    inspectedDeep: Boolean(opts.inspectedDeep),
    confronted: false,
    questTag: opts.questTag || null
  };
}

// ============================================================================
// 套包扩容箱 & 货架 / 暗格 空间计算与自动收纳助手
// ============================================================================
export function itemSlotCost(item) {
  return item.slots || 1;
}

export function usedSlots(list) {
  return list.reduce((sum, it) => sum + itemSlotCost(it), 0);
}

export function containerUsedSlots(containerItem) {
  if (!containerItem || !containerItem.isContainer || !Array.isArray(containerItem.contents)) return 0;
  return usedSlots(containerItem.contents);
}

// 获取玩家拥有的全部物品扁平列表（含主货架、固定暗格、以及所有扩容箱内部的物品）
export function getAllOwnedItemsWithLoc(state) {
  const res = [];
  for (const it of state.shelf) {
    res.push({ item: it, zone: 'shelf', parentContainer: null, shieldedFromRaid: false });
    if (it.isContainer && Array.isArray(it.contents)) {
      for (const sub of it.contents) {
        res.push({
          item: sub,
          zone: 'container',
          parentContainer: it,
          shieldedFromRaid: Boolean(it.shielded)
        });
      }
    }
  }
  for (const it of state.stash) {
    res.push({ item: it, zone: 'stash', parentContainer: null, shieldedFromRaid: true });
    if (it.isContainer && Array.isArray(it.contents)) {
      for (const sub of it.contents) {
        res.push({
          item: sub,
          zone: 'container',
          parentContainer: it,
          shieldedFromRaid: true
        });
      }
    }
  }
  return res;
}

// 获取顾客在店面可挑选购买的商品列表（主货架上的非空容器普通商品 + 非屏蔽扩容箱内的商品也可通过摆上货架出售；为直观起见：主货架商品 + 非免检公开展示扩容箱内的商品均可被顾客看中，免检箱与暗格绝对私密！）
export function getShopSellableItems(state) {
  const sellable = [];
  for (const it of state.shelf) {
    if (it.questTag) continue;
    // 若是装有东西的扩容箱，不直接把整个箱子连货卖掉，防止误卖玩家套包；空扩容箱可以卖
    if (it.isContainer) {
      if (it.contents.length === 0) {
        sellable.push(it);
      } else if (!it.shielded) {
        // 普通公开储物箱里的非剧情商品也可供顾客选购！走私者伪装箱则完全隐藏！
        for (const sub of it.contents) {
          if (!sub.questTag) sellable.push(sub);
        }
      }
    } else {
      sellable.push(it);
    }
  }
  return sellable;
}

// 从任意位置（货架 / 暗格 / 任意扩容箱内部）精准移除指定 uid 物品
export function removeOwnedItemByUid(state, uid) {
  let idx = state.shelf.findIndex(i => i.uid === uid);
  if (idx !== -1) return state.shelf.splice(idx, 1)[0];

  idx = state.stash.findIndex(i => i.uid === uid);
  if (idx !== -1) return state.stash.splice(idx, 1)[0];

  for (const rootList of [state.shelf, state.stash]) {
    for (const c of rootList) {
      if (c.isContainer && Array.isArray(c.contents)) {
        const subIdx = c.contents.findIndex(s => s.uid === uid);
        if (subIdx !== -1) return c.contents.splice(subIdx, 1)[0];
      }
    }
  }
  return null;
}

// 智能放入一件新获得的物品：
// 1) 若是违禁品/赃物，优先尝试塞进「免检走私者伪装箱」或「秘密暗格」（贴心防暴雷，若满了再放普通扩容箱或主货架）
// 2) 若是普通商品，优先放主货架，主货架满了自动塞进还有空位的扩容箱套包里！
// 注意：原版规则——容器不能套娃塞进另一个容器（防止无限死循环套娃），容器只能放在货架或暗格顶层！
export function smartStoreItem(state, item, preferHidden = false) {
  const cost = itemSlotCost(item);
  const isHot = preferHidden || item.isStolen || getItemIllegalityReason(item, state) !== null;

  if (!item.isContainer && isHot) {
    // 优先找免检伪装箱
    for (const c of [...state.shelf, ...state.stash]) {
      if (c.isContainer && c.shielded && containerUsedSlots(c) + cost <= c.containerCap) {
        c.contents.push(item);
        return { ok: true, where: c.name };
      }
    }
    // 其次找固定秘密暗格
    if (usedSlots(state.stash) + cost <= state.stashMaxSlots) {
      state.stash.push(item);
      return { ok: true, where: '秘密暗格' };
    }
  }

  // 尝试放入主货架
  if (usedSlots(state.shelf) + cost <= state.shelfMaxSlots) {
    state.shelf.push(item);
    return { ok: true, where: '主货架' };
  }

  // 若不是容器本身，尝试自动塞入任意未满的扩容箱套包！
  if (!item.isContainer) {
    for (const c of [...state.shelf, ...state.stash]) {
      if (c.isContainer && containerUsedSlots(c) + cost <= c.containerCap) {
        c.contents.push(item);
        return { ok: true, where: c.name };
      }
    }
  }

  // 最后尝试固定暗格剩余空间
  if (usedSlots(state.stash) + cost <= state.stashMaxSlots) {
    state.stash.push(item);
    return { ok: true, where: '秘密暗格' };
  }

  return { ok: false, where: null };
}

// 计算当前玩家剩余总可用格数（主货架 + 暗格 + 所有扩容箱内部空位）
export function getTotalFreeCapacity(state, forContainerItem = false) {
  let free = (state.shelfMaxSlots - usedSlots(state.shelf)) + (state.stashMaxSlots - usedSlots(state.stash));
  if (!forContainerItem) {
    for (const c of [...state.shelf, ...state.stash]) {
      if (c.isContainer) {
        free += Math.max(0, c.containerCap - containerUsedSlots(c));
      }
    }
  }
  return free;
}

// 将物品移动到指定目标位置：'shelf' | 'stash' | containerUid
export function moveItemToTarget(state, itemUid, target) {
  const all = getAllOwnedItemsWithLoc(state);
  const found = all.find(x => x.item.uid === itemUid);
  if (!found) return { ok: false, msg: '未找到该物品' };

  const item = found.item;
  const cost = itemSlotCost(item);

  if (target === 'shelf') {
    if (found.zone === 'shelf') return { ok: false, msg: '该物品已经在主货架上了' };
    if (usedSlots(state.shelf) + cost > state.shelfMaxSlots) {
      return { ok: false, msg: '主货架顶层格位已满！可先把物品装进扩容箱包。' };
    }
    removeOwnedItemByUid(state, itemUid);
    state.shelf.push(item);
    return { ok: true, msg: `📦 已将【${item.name}】移至主货架。` };
  }

  if (target === 'stash') {
    if (found.zone === 'stash') return { ok: false, msg: '该物品已经在秘密暗格里了' };
    if (usedSlots(state.stash) + cost > state.stashMaxSlots) {
      return { ok: false, msg: '固定秘密暗格已满！推荐向杰克逊博士购买【走私者伪装箱】扩容免检空间！' };
    }
    removeOwnedItemByUid(state, itemUid);
    state.stash.push(item);
    return { ok: true, msg: `🗄️ 已将【${item.name}】藏入柜台下秘密暗格。` };
  }

  // 目标是一个具体的扩容箱 containerUid
  const targetEntry = all.find(x => x.item.uid === target && x.item.isContainer);
  if (!targetEntry) return { ok: false, msg: '目标扩容箱不存在' };
  const box = targetEntry.item;

  if (item.isContainer) {
    return { ok: false, msg: '扩容箱不能套娃塞进另一个扩容箱内（原版防无限套包规则）！' };
  }
  if (found.parentContainer && found.parentContainer.uid === box.uid) {
    return { ok: false, msg: '该物品已经在这个扩容箱里了' };
  }
  if (containerUsedSlots(box) + cost > box.containerCap) {
    return { ok: false, msg: `【${box.name}】内部空间已满（${containerUsedSlots(box)}/${box.containerCap} 格）！` };
  }

  removeOwnedItemByUid(state, itemUid);
  box.contents.push(item);
  return {
    ok: true,
    msg: `🎒 已将【${item.name}】装入【${box.name}】${box.shielded ? '（免检伪装保护生效！）' : ''}！`
  };
}

// 一键将所有暴露在外的违禁品与赃物快速塞进免检伪装箱与秘密暗格！（应对突击检查神技）
export function quickHideAllIllegal(state) {
  let movedCount = 0;
  const candidates = [];

  for (const it of [...state.shelf]) {
    if (!it.isContainer && getItemIllegalityReason(it, state)) {
      candidates.push(it);
    } else if (it.isContainer && !it.shielded) {
      for (const sub of [...it.contents]) {
        if (getItemIllegalityReason(sub, state)) candidates.push(sub);
      }
    }
  }

  for (const badItem of candidates) {
    const cost = itemSlotCost(badItem);
    // 先试免检伪装箱
    let placed = false;
    for (const c of [...state.shelf, ...state.stash]) {
      if (c.isContainer && c.shielded && containerUsedSlots(c) + cost <= c.containerCap) {
        removeOwnedItemByUid(state, badItem.uid);
        c.contents.push(badItem);
        movedCount++;
        placed = true;
        break;
      }
    }
    if (!placed && usedSlots(state.stash) + cost <= state.stashMaxSlots) {
      removeOwnedItemByUid(state, badItem.uid);
      state.stash.push(badItem);
      movedCount++;
    }
  }

  if (movedCount === 0) {
    return { ok: false, msg: '没有需要藏匿的暴露违禁品，或免检暗仓空间已满！' };
  }
  addLog(state, `🕵️ 手疾眼快！一键将 ${movedCount} 件敏感违禁品/赃物塞进了免检暗仓！`);
  return { ok: true, msg: `🕵️ 成功将 ${movedCount} 件违规货品藏入免检安全仓！` };
}

// ============================================================================
// 估值与合法性核验
// ============================================================================
export function evaluateItemFairPrice(item, state) {
  let val = item.baseValue;
  if (item.isFake && (item.inspectedVisual || item.inspectedDeep || item.confronted)) {
    val = Math.round(val * 0.25);
  }
  if (state) {
    if (state.profession === 'water_merchant' && ['pure_water', 'dirty_water', 'spring_water', 'red_imp_beer', 'synth_wine'].includes(item.templateId)) {
      val = Math.round(val * 1.20);
    }
    if (state.profession === 'gunsmith' && (item.category === 'weapon' || item.templateId === 'plasma_cartridge' || item.templateId === 'cyber_arm')) {
      val = Math.round(val * 1.20);
    }
    if (state.profession === 'chemist' && (item.category === 'medical' || ['synth_wine', 'nudka_vodka', 'perfume_sync', 'dream_dust'].includes(item.templateId))) {
      val = Math.round(val * 1.20);
    }
    if (state.profession === 'rat_rancher' && ['raw_meat', 'rib_sandwich', 'morsel_food', 'cheese_block', 'ice_cream'].includes(item.templateId)) {
      val = Math.round(val * 1.25);
    }
    if (state.hotCategory === item.category) {
      val = Math.round(val * 1.25);
    }
    if (state.newspaper && state.newspaper.category === item.category) {
      val = Math.round(val * (state.newspaper.mult || 1));
    }
    if (state.machines && state.machines.includes('fridge')) {
      const tpl = ITEM_TEMPLATES[item.templateId];
      if (tpl && tpl.frozen) val = Math.round(val * 1.25);
      else if (tpl && tpl.chillable) val = Math.round(val * 1.20);
    }
    if (state.profession === 'hydro_farmer' && (item.isSeed || ['nutrifruit','bloomberry','dream_cap','fillerweed'].includes(item.templateId))) {
      val = Math.round(val * 1.20);
    }
    if (state.profession === 'aquaculturist' && (item.isFish || ['caviar','caviar_tin','sturgeon_roe'].includes(item.templateId))) {
      val = Math.round(val * 1.25);
    }
    const modFx = getModuleEffects(state);
    if (modFx.quality > 0) val = Math.round(val * (1 + modFx.quality * 0.10));
    if (modFx.hydro_quality > 0 && item.isSeed) val = Math.round(val * 1.15);
  }
  return Math.max(5, val);
}

export function getItemIllegalityReason(item, state) {
  if (item.questTag === 'lu_rifle') return '革命军寄存的脉冲步枪（重度违禁）';
  if (item.legal === 'contraband') return `违禁品【${item.name}】`;
  if (item.isStolen && item.heatDays > 0) return `带报案追踪码的赃物【${item.name}】`;
  if (item.legal === 'permit_arms' && !state.licenses.includes('arms_1')) {
    return `无证军火/受控装备【${item.name}】（缺一级军火许可）`;
  }
  if (item.legal === 'permit_med' && !state.licenses.includes('med_permit')) {
    return `无证处方药械【${item.name}】（缺医药许可）`;
  }
  return null;
}

// ============================================================================
// 五类密封物资箱刷钥匙卡开箱 & 刮刮乐兑奖 & 液体好运饮用！
// ============================================================================
export function openSealedCrate(state, crateUid) {
  const all = getAllOwnedItemsWithLoc(state);
  const entry = all.find(x => x.item.uid === crateUid);
  if (!entry || !entry.item.isSealedCrate) {
    return { ok: false, msg: '该物品不是密封物资箱' };
  }
  const crate = entry.item;

  // 寻找匹配的部门一次性钥匙卡，或指挥官万能最高权限卡（优先消耗对应部门卡，没有再用万能卡）
  const matchingCardEntry = all.find(x => x.item.templateId === crate.requiredKey)
    || all.find(x => x.item.templateId === 'keycard_command');

  if (!matchingCardEntry) {
    const reqTpl = ITEM_TEMPLATES[crate.requiredKey];
    return {
      ok: false,
      msg: `🔒 缺少门禁卡！开启【${crate.name}】需要【${reqTpl ? reqTpl.name : '对应钥匙卡'}】或【指挥官万能卡】（可在索耶黑市批发部购买，或从小偷手中收购）。`
    };
  }

  // 消耗钥匙卡与原密封箱
  const usedCard = matchingCardEntry.item;
  removeOwnedItemByUid(state, usedCard.uid);
  removeOwnedItemByUid(state, crate.uid);

  // 如果买到的是被掏空塞石头的假箱子！
  if (crate.isFake) {
    const emptyShell = createItemInstance('empty_crate', { inspectedVisual: true });
    smartStoreItem(state, emptyShell);
    addLog(state, `😱 刷开【${crate.name}】傻眼了：这竟是个底部被撬过塞满烂石头的假箱子！只剩一个空铁壳！`);
    return { ok: true, isFakeCrate: true, lootNames: [], msg: '😱 惨遭调包！这是个没鉴定出来的假密封箱，里面全是破石头！' };
  }

  // 真箱子！按原版掉落表 + 当前幸运值加成狂爆战利品！
  const table = CRATE_LOOT_TABLES[crate.templateId] || CRATE_LOOT_TABLES.crate_service;
  const luckBonus = Math.min(0.42, (state.luck || 0) * 0.0045);
  const spawned = [];

  for (const gId of table.guaranteed) {
    spawned.push(createItemInstance(gId, { inspectedVisual: true }));
  }
  for (const roll of table.rolls) {
    if (Math.random() < (roll.chance + luckBonus)) {
      spawned.push(createItemInstance(roll.id, { inspectedVisual: true }));
    }
  }
  // 留下一只拆开的空箱壳（价值15 CR，也可2合1拆钛合金）
  const shell = createItemInstance('empty_crate', { inspectedVisual: true });

  const storedNames = [];
  let totalWorth = 0;
  for (const loot of spawned) {
    totalWorth += loot.baseValue;
    const put = smartStoreItem(state, loot);
    if (put.ok) {
      storedNames.push(`${loot.icon}${loot.name}`);
    }
  }
  smartStoreItem(state, shell);

  state.stats.cratesOpened = (state.stats.cratesOpened || 0) + 1;
  addLog(state, `🎁 用【${usedCard.name}】刷开【${crate.name}】大爆特爆（总估值 ~${totalWorth} CR）：${storedNames.join('、')}！`);
  return {
    ok: true,
    lootNames: storedNames,
    totalWorth,
    msg: `🎁 开箱成功（估值 ${totalWorth} CR）！获得：${storedNames.join('、')}`
  };
}

// 使用消耗品：刮刮乐彩票 / 5连刮刮乐 / 液体好运药水 / 聚变电池充电
export function useConsumableItem(state, itemUid) {
  const all = getAllOwnedItemsWithLoc(state);
  const entry = all.find(x => x.item.uid === itemUid);
  if (!entry) return { ok: false, msg: '未找到该物品' };
  const item = entry.item;

  if (item.isUsable === 'charge_power') {
    removeOwnedItemByUid(state, item.uid);
    const gain = item.isFake ? 12 : 65;
    state.energy = Math.min(state.maxEnergy, state.energy + gain);
    addLog(state, `🔋 使用【${item.name}】补充店铺电力 +${gain}⚡。`);
    return { ok: true, msg: `⚡ 充电完成！电力 +${gain}` };
  }

  if (item.isUsable === 'drink_luck') {
    removeOwnedItemByUid(state, item.uid);
    state.luck = Math.min(100, (state.luck || 0) + 75);
    state.luckBuffDays = 3;
    addLog(state, `🍀 咕咚喝下【液体好运】！未来 3 天幸运值暴涨至 ${state.luck}！快去刮彩票和开物资箱吧！`);
    return { ok: true, msg: `🍀 欧气爆发！当前幸运值飙升至 ${state.luck}（持续3天）！` };
  }

  if (item.isUsable === 'scratcher' || item.isUsable === 'scratcher_pack') {
    removeOwnedItemByUid(state, item.uid);
    if (item.isFake) {
      addLog(state, '💢 刮开涂层发现印着“已兑奖作废”——这是张被人针孔偷看过的假彩票！');
      return { ok: true, prize: 0, msg: '💢 被坑了！这是一张重涂银漆的废票（0 CR）！' };
    }

    const count = item.isUsable === 'scratcher_pack' ? 5 : 1;
    let totalPrize = 0;
    let hitJackpot = false;
    const luck = state.luck || 0;

    for (let i = 0; i < count; i++) {
      const r = Math.random() * 100 + luck * 0.42;
      if (r >= 98) {
        // 刮出 3 个营养果头奖！（380 ~ 550 CR）
        const jp = 380 + Math.floor(Math.random() * 170);
        totalPrize += jp;
        hitJackpot = true;
        state.stats.jackpotsWon = (state.stats.jackpotsWon || 0) + 1;
      } else if (r >= 78) {
        totalPrize += 65 + Math.floor(Math.random() * 55);
      } else if (r >= 48) {
        totalPrize += 18 + Math.floor(Math.random() * 22);
      }
    }

    state.credits += totalPrize;
    state.stats.totalEarned += totalPrize;
    const msg = hitJackpot
      ? `🎰 【头奖奇迹：3个营养果！！】刮开 ${count} 张彩票狂揽 **+${totalPrize} CR** 巨款！！`
      : (totalPrize > 0
        ? `🎟️ 刮开 ${count} 张彩票，中得奖金 **+${totalPrize} CR**！`
        : `🎟️ 刮开 ${count} 张彩票：谢谢惠顾，差一点就凑齐图案了（0 CR）。`);

    addLog(state, msg);
    return { ok: true, prize: totalPrize, hitJackpot, msg };
  }

  if (item.isUsable === 'turbo') {
    removeOwnedItemByUid(state, item.uid);
    state.energy = Math.min(state.maxEnergy, state.energy + 40);
    addLog(state, '🚀 涡轮增压器启动！电力 +40⚡');
    return { ok: true, msg: '🚀 涡轮增压！电力 +40⚡' };
  }
  if (item.isUsable === 'module_bay') {
    if (state.moduleMaxSlots >= 8) return { ok: false, msg: '模块槽已满（8槽上限）' };
    removeOwnedItemByUid(state, item.uid);
    state.moduleMaxSlots += 2;
    addLog(state, '🔧 模块槽上限 +2！');
    return { ok: true, msg: '🔧 模块槽上限 +2！' };
  }
  if (item.isUsable === 'extract_basic' || item.isUsable === 'extract_adv') {
    const adv = item.isUsable === 'extract_adv';
    removeOwnedItemByUid(state, item.uid);
    const pool = adv ? ['mod_overclock','mod_refinement','mod_chem_equip','mod_neural_core','mod_streamlining'] : ['mod_efficiency','mod_performance','mod_quality','mod_eco','mod_alarm_tx'];
    const got = pool[Math.floor(Math.random() * pool.length)];
    smartStoreItem(state, createItemInstance(got, { inspectedVisual: true }));
    addLog(state, `🧲 提取器产出【${ITEM_TEMPLATES[got].name}】！`);
    return { ok: true, msg: `🧲 提取成功：${ITEM_TEMPLATES[got].name}！` };
  }
  // 机器模块：点击装入模块槽
  if (item.isModule) {
    if (!state.modules) state.modules = [];
    if (state.modules.length >= (state.moduleMaxSlots || 4)) return { ok: false, msg: '模块槽已满！用【模块舱扩容套件】扩容。' };
    removeOwnedItemByUid(state, item.uid);
    state.modules.push(item.templateId);
    state.stats.modulesInstalled = (state.stats.modulesInstalled || 0) + 1;
    addLog(state, `⚙️ 装入模块【${item.name}】！`);
    return { ok: true, msg: `⚙️ 已装入【${item.name}】（${state.modules.length}/${state.moduleMaxSlots} 槽）！` };
  }
  return { ok: false, msg: '该物品不可直接使用' };
}

// ============================================================================
// 批发供货商电话终端采购系统（支持整箱大宗批发进货！）
// ============================================================================
export function unlockWholesaleMerchant(state, merchantId) {
  const m = WHOLESALE_MERCHANTS.find(x => x.id === merchantId);
  if (!m) return { ok: false, msg: '未知供货商' };
  if (state.unlockedMerchants.includes(merchantId)) {
    return { ok: false, msg: '该供货商专线已开通' };
  }

  // 黑市声望≥25 可免费开通索耶交易所
  const freeByRep = (merchantId === 'sawyer_exchange' && state.rep.blackmarket >= 25);
  const cost = freeByRep ? 0 : (m.unlockCost || 150);

  if (state.credits < cost) {
    return { ok: false, msg: `信用点不足（购买该专线电话需 ${cost} CR）！` };
  }
  state.credits -= cost;
  state.unlockedMerchants.push(merchantId);
  addLog(state, `☎️ 成功接通批发商专线【${m.code} - ${m.name}】！现在可以随时向其大宗订货了！`);
  return { ok: true, msg: `☎️ 已解锁【${m.name}】批发直供权限！` };
}

export function buyFromWholesaleMerchant(state, merchantId, tplId) {
  const m = WHOLESALE_MERCHANTS.find(x => x.id === merchantId);
  if (!m) return { ok: false, msg: '未知供货商' };
  if (!state.unlockedMerchants.includes(merchantId)) {
    return { ok: false, msg: '请先拨号解锁该批发商联络权限！' };
  }

  const offer = m.catalog.find(c => c.tplId === tplId);
  if (!offer) return { ok: false, msg: '该批发商无此商品' };

  const stockKey = `${merchantId}:${tplId}`;
  const left = state.merchantDailyStock[stockKey] ?? offer.stockPerDay;
  if (left <= 0) {
    return { ok: false, msg: '该批次货物今日已售罄，明早补给船到港后自动补货！' };
  }

  if (state.credits < offer.price) {
    return { ok: false, msg: `信用点不足（整批采购需 ${offer.price} CR）！` };
  }

  const tpl = ITEM_TEMPLATES[tplId];
  const singleSlots = tpl.slots || 1;
  const totalSlotsNeeded = singleSlots * offer.packQty;
  const freeCap = getTotalFreeCapacity(state, Boolean(tpl.isContainer));
  if (freeCap < totalSlotsNeeded) {
    return {
      ok: false,
      msg: `仓库剩余空间不足（这批货共需 ${totalSlotsNeeded} 格，当前可用仅 ${freeCap} 格）！快向杰克逊博士买个【扩容背包/储物箱】吧！`
    };
  }

  state.credits -= offer.price;
  state.merchantDailyStock[stockKey] = left - 1;

  const whereSet = new Set();
  for (let i = 0; i < offer.packQty; i++) {
    const inst = createItemInstance(tplId, { isFake: false, isStolen: false, inspectedVisual: true });
    const put = smartStoreItem(state, inst);
    if (put.where) whereSet.add(put.where);
  }

  const locStr = Array.from(whereSet).join('/');
  addLog(state, `🚚 批发进货：从【${m.name}】花 ${offer.price} CR 购入 ${offer.packQty} ×【${tpl.name}】（已存入：${locStr}）。`);
  return {
    ok: true,
    msg: `🚚 进货送达！获得 ${offer.packQty} ×【${tpl.name}】（存入 ${locStr}）！`
  };
}

// ============================================================================
// 游戏主状态初始化与每日多物品顾客生成
// ============================================================================
export function createNewGameState(professionId = 'apprentice', opts = {}) {
  const prof = PROFESSIONS.find(p => p.id === professionId) || PROFESSIONS[0];

  const rep = {
    lower: 10 + (prof.repMod.lower || 0),
    security: 10 + (prof.repMod.security || 0),
    blackmarket: 5 + (prof.repMod.blackmarket || 0),
    rebel: 5 + (prof.repMod.rebel || 0),
    upper: 5 + (prof.repMod.upper || 0)
  };
  if (opts.perkPositive === 'diplomatic' || opts.perkNeutral === 'diplomatic') { for (const k of Object.keys(rep)) rep[k] += 10; }
  if (opts.perkPositive === 'model_citizen') rep.security += 15;

  const unlockedMerchants = WHOLESALE_MERCHANTS
    .filter(m => m.unlockedByDefault)
    .map(m => m.id);
  if (prof.id === 'chemist' && !unlockedMerchants.includes('dale_pharma')) {
    unlockedMerchants.push('dale_pharma');
  }
  if (prof.id === 'fence' && !unlockedMerchants.includes('sawyer_exchange')) {
    unlockedMerchants.push('sawyer_exchange');
  }
  if (opts.perkPositive === 'sawyers_crew' && !unlockedMerchants.includes('sawyer_exchange')) {
    unlockedMerchants.push('sawyer_exchange');
  }
  if (opts.perkPositive === 'vending_machine' && !prof.startingMachines.includes('vending')) {
    prof = { ...prof, startingMachines: [...prof.startingMachines, 'vending'] };
  }

  const diff = DIFFICULTIES.find(d => d.id === opts.difficulty) || DIFFICULTIES[1];
  const perks = {
    positive: opts.perkPositive || null,
    negative: opts.perkNegative || null,
    neutral: opts.perkNeutral || null
  };
  const hasPerk = (id) => perks.positive === id || perks.negative === id || perks.neutral === id;
  let startCredits = Math.round(prof.credits * diff.creditsMult);
  let startLuck = prof.luck || 8;
  let startHeat = prof.id === 'fence' ? 12 : 0;
  let startAug = Math.round(10 * diff.augMult);
  let maxEnergy = 160;
  if (hasPerk('lucky')) startLuck += 25;
  if (hasPerk('unlucky')) startLuck = Math.max(0, startLuck - 20);
  if (hasPerk('convict')) startHeat += 25;
  if (hasPerk('sentinel_disorder')) startAug += 20;
  if (hasPerk('addictions')) maxEnergy -= 30;
  if (hasPerk('makeshift_reactor')) maxEnergy += 40;
  if (hasPerk('blackmail')) startCredits = Math.max(0, startCredits - 200);
  if (hasPerk('aug_menace')) startAug += 15;
  let buyoutPrice = Math.round(6000 * diff.buyoutMult);
  if (hasPerk('prime_real_estate')) buyoutPrice = Math.round(buyoutPrice * 0.8);
  let rentAmount = Math.round(350 * diff.rentMult);
  if (hasPerk('bad_lease')) rentAmount = Math.round(rentAmount * 1.3);

  const state = {
    version: 3,
    profession: prof.id,
    professionName: prof.name,
    difficulty: diff.id,
    difficultyName: diff.name,
    perks,
    day: 1,
    week: 1,
    rentDueDay: 4,
    rentAmount,
    buyoutPrice,
    ownsShop: false,
    gameOver: null,

    credits: startCredits,
    energy: prof.energy,
    maxEnergy,
    luck: startLuck,
    luckBuffDays: 0,
    heat: startHeat,
    augThreat: startAug,
    modules: [],
    moduleMaxSlots: 4,
    newspaper: null,

    rep,
    licenses: [...prof.startingLicenses],
    machines: [...prof.startingMachines],
    tools: ['magnifier'],
    unlockedMerchants,
    merchantDailyStock: {},

    shelfMaxSlots: opts.perkNegative === 'minimalist' ? 8 : 12,
    stashMaxSlots: prof.id === 'fence' ? 6 : 4,
    shelf: [],
    stash: [],

    hotCategory: 'supply',
    dailyWanted: null,
    phase: 'open',

    customersQueue: [],
    currentCustomer: null,
    customersServedToday: 0,

    stats: {
      totalEarned: 0,
      fakesExposed: 0,
      augsEliminated: 0,
      innocentsShot: 0,
      wantedReported: 0,
      raidsSurvived: 0,
      itemsCrafted: 0,
      cratesOpened: 0,
      jackpotsWon: 0,
      helpedSerpico: false,
      metOdinFriendly: false,
      luQuestState: 'none',
      luReturnDay: 0,
      hydroHarvested: 0,
      aquaHarvested: 0,
      modulesInstalled: 0,
      vendingEarned: 0,
      uniqueItemsSeen: 0
    },

    logs: [
      `[第1天] 你接手了第13底层街区的当铺！已配备套包扩容容器与批发商加密电话终端。距离首次交租剩 3 天（350 CR），攒够 6,000 CR 买下永久地契！`
    ]
  };

  if (prof.id === 'water_merchant' || prof.id === 'chemist') {
    state.tools.push('spec_analyzer');
  }
  if (prof.id === 'gunsmith') {
    state.tools.push('aug_scanner');
  }

  // 先装入扩容箱容器，再智能放入其余初始道具
  const containersFirst = prof.startingItems.filter(id => ITEM_TEMPLATES[id]?.isContainer);
  const others = prof.startingItems.filter(id => !ITEM_TEMPLATES[id]?.isContainer);

  for (const cid of containersFirst) {
    state.shelf.push(createItemInstance(cid, { inspectedVisual: true }));
  }
  for (const tplId of others) {
    const inst = createItemInstance(tplId, {
      isFake: false,
      isStolen: tplId === 'stolen_watch',
      inspectedVisual: true
    });
    smartStoreItem(state, inst);
  }

  prepareDay(state);
  return state;
}

export function addLog(state, msg) {
  state.logs.unshift(msg);
  if (state.logs.length > 80) state.logs.pop();
}

export function changeRep(state, factionId, delta) {
  if (state.rep[factionId] === undefined) return;
  if (delta > 0 && state.perks && state.perks.negative === 'ascetic') delta = Math.round(delta * 0.7);
  state.rep[factionId] = Math.max(-50, Math.min(100, Math.round(state.rep[factionId] + delta)));
}

// 刷新每日批发库存、通缉令与更丰富的顾客长队列（每天 6~8 位不同访客！）
export function prepareDay(state) {
  const categories = ['supply', 'medical', 'weapon', 'luxury', 'tech'];
  state.hotCategory = categories[(state.day * 2 + 1) % categories.length];
  state.dailyWanted = WANTED_POOL[(state.day - 1) % WANTED_POOL.length];
  state.newspaper = NEWSPAPER_EVENTS[(state.day * 3 + 1) % NEWSPAPER_EVENTS.length];
  addLog(state, state.newspaper.headline + '（' + state.newspaper.desc + '）');
  state.customersServedToday = 0;

  // 重置所有批发供货商今日限购库存
  state.merchantDailyStock = {};
  for (const m of WHOLESALE_MERCHANTS) {
    for (const c of m.catalog) {
      state.merchantDailyStock[`${m.id}:${c.tplId}`] = c.stockPerDay;
    }
  }

  const queue = [];

  // 1. 剧情角色固定登场
  if (state.day === 1) queue.push(buildStoryVisitor(STORY_NPCS.mentor_day1));
  if (state.day === 3) queue.push(buildStoryVisitor(STORY_NPCS.georgio_waste));
  if (state.day === 4) queue.push(buildStoryVisitor(STORY_NPCS.corrupt_cop_trap));
  if (state.day === 5) queue.push(buildStoryVisitor(STORY_NPCS.lu_crate));
  if (state.day === 6) queue.push(buildStoryVisitor(STORY_NPCS.serpico_plea));
  if (state.day === 7) queue.push(buildStoryVisitor(STORY_NPCS.eleanor_seed));
  if (state.day === 8) queue.push(buildStoryVisitor(STORY_NPCS.ren_addiction));
  if (state.day === 9) queue.push(buildStoryVisitor(STORY_NPCS.sawyer_deal));
  if (state.day === 10) queue.push(buildStoryVisitor(STORY_NPCS.georgio_return));

  if (state.stats.luQuestState === 'holding' && state.day >= state.stats.luReturnDay) {
    queue.push({
      id: `story_lu_return_${state.day}`,
      type: 'story',
      storyId: 'lu_return',
      name: '卢（革命军特工）',
      roleName: '取货委托人',
      faction: 'rebel',
      coatHue: 145,
      helmet: 'beret',
      seed: 77,
      dialogue: '卢闪身进店：“这两天辛苦了！我寄存的那把改装脉冲步枪还完好吗？500 CR 酬金和指挥官万能钥匙卡我都带来了！”',
      choices: [
        { label: '交还脉冲步枪（+500 CR + 1张【指挥官万能钥匙卡】，革命军+25）', effect: 'lu_handover' },
        { label: '摊手坦白弄丢了（革命军-30）', effect: 'lu_lost' }
      ]
    });
  }

  // 2. 交租日当天必来一位「收破烂的黑市奸商」帮玩家批量清仓废品凑房租！（还原原版交租前奸商机制）
  const regularCount = (state.day === 1 ? 6 : 7) + (state.machines.includes('mirage') ? 2 : 0);
  let wantedSpawned = false;
  let augSpawnedToday = 0;

  for (let i = 0; i < regularCount; i++) {
    let forcedArch = null;
    if (!state.ownsShop && state.day === state.rentDueDay && i === regularCount - 1) {
      forcedArch = CUSTOMER_ARCHETYPES.find(a => a.id === 'shady_liquidator');
    }

    const cust = generateRandomCustomer(state, {
      forcedArch,
      allowWanted: !wantedSpawned && i >= 2 && Math.random() < 0.50,
      allowAug: state.day >= 2 && augSpawnedToday < 2 && Math.random() < (0.22 + state.augThreat * 0.003)
    });
    if (cust.wantedId) wantedSpawned = true;
    if (cust.isAug) augSpawnedToday++;
    queue.push(cust);
  }

  // 3. 治安部突击盘查官
  let raidChance = (state.heat * 0.012) + (state.day >= 2 ? 0.24 : 0);
  if (state.machines.includes('alarm_sys')) raidChance *= 0.6;
  if (state.perks && state.perks.positive === 'model_citizen') raidChance *= 0.8;
  if (state.day >= 2 && Math.random() < raidChance) {
    const raidIdx = Math.min(queue.length, 3 + Math.floor(Math.random() * 3));
    queue.splice(raidIdx, 0, buildSecurityInspector(state));
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
    helmet: storyCfg.faction === 'security' ? 'collar' : 'normal',
    seed: storyCfg.day * 31 + 7,
    dialogue: storyCfg.text,
    choices: storyCfg.choices
  };
}

function buildSecurityInspector(state) {
  const bribeCost = state.rep.security >= 40 ? 85 : 165;
  return {
    id: `raid_${state.day}_${Math.floor(Math.random() * 999)}`,
    type: 'raid',
    isSecurityRaid: true,
    name: '伦警官 & 治安盘查队',
    roleName: '治安部突击稽查',
    faction: 'security',
    coatHue: 0,
    helmet: 'cop',
    seed: 99 + state.day,
    bribeCost,
    dialogue: '“治安部突击盘查！所有明面货架与非屏蔽箱包一律开箱核验！（提示：趁现在点击右侧【一键藏匿违禁品】塞进走私者伪装箱或暗格还来得及！）”'
  };
}

// 生成携带多件商品或求购多件商品的顾客！
function generateRandomCustomer(state, { forcedArch, allowWanted, allowAug }) {
  const sellableNow = getShopSellableItems(state);
  const hasCratesOrCards = sellableNow.some(it => it.isSealedCrate || it.templateId.startsWith('keycard_'));
  const hasLuxury = sellableNow.some(it => it.baseValue >= 180);

  let arch = forcedArch;
  if (!arch) {
    const pool = CUSTOMER_ARCHETYPES.filter(a => a.id !== 'case_enjoyer' && a.id !== 'shady_liquidator');
    if (hasCratesOrCards) {
      pool.push(CUSTOMER_ARCHETYPES.find(a => a.id === 'case_enjoyer'));
      pool.push(CUSTOMER_ARCHETYPES.find(a => a.id === 'case_enjoyer'));
    }
    if (hasLuxury || state.rep.upper >= 25) {
      pool.push(CUSTOMER_ARCHETYPES.find(a => a.id === 'upper_chef'));
      pool.push(CUSTOMER_ARCHETYPES.find(a => a.id === 'upper_hedonist'));
    }
    if (state.rep.blackmarket >= 25) {
      pool.push(CUSTOMER_ARCHETYPES.find(a => a.id === 'thief_master'));
    }
    arch = pool[Math.floor(Math.random() * pool.length)];
  }

  const seed = Math.floor(Math.random() * 100000);
  let name = FIRST_NAMES[seed % FIRST_NAMES.length];
  let wantedInfo = null;

  if (allowWanted && state.dailyWanted && !arch.isSting) {
    wantedInfo = state.dailyWanted;
    name = wantedInfo.name;
  }

  const isAug = Boolean(allowAug && !wantedInfo && !arch.isSting);
  const augVisualTypes = ['chip', 'pupil', 'smile', 'twitch'];
  const augVisualType = isAug ? augVisualTypes[seed % augVisualTypes.length] : null;
  const mismatchBadge = isAug && (seed % 3 === 0) && arch.faction === 'lower';

  // 决定来意：奥丁作为通缉犯来访时专门高价收购多件军火/违禁品/物资箱！
  let intent = arch.forceIntent || null;
  if (wantedInfo && wantedInfo.isOdin && sellableNow.length > 0) {
    intent = 'buy_from_shop';
  } else if (!intent) {
    if (state.licenses.includes('appraiser_cert') && !arch.isSting && Math.random() < 0.16) {
      intent = 'appraise_request';
    } else if (sellableNow.length > 0 && Math.random() < 0.52) {
      intent = 'buy_from_shop';
    } else {
      intent = 'sell_to_shop';
    }
  }

  // 若选了 buy_from_shop 但店里无货可买，回退为常见拾荒卖家
  if (intent === 'buy_from_shop' && sellableNow.length === 0) {
    intent = 'sell_to_shop';
  }

  const displayBonusQty = state.licenses.includes('display_case_up') ? 1 : 0;
  const minQ = arch.minQty || 1;
  const maxQ = (arch.maxQty || 2) + displayBonusQty;
  const targetQty = Math.min(4, minQ + Math.floor(Math.random() * (maxQ - minQ + 1)));

  // 多物品列表结构：
  // 卖家带来的货品数组: offerEntries: [{ item, askPrice, selected: true }]
  // 买家想买你店里的商品数组: buyEntries: [{ itemUid, unitOffer, selected: true }]
  const offerEntries = [];
  const buyEntries = [];

  if (intent === 'appraise_request') {
    const appraisePool = ['rib_sandwich', 'plasma_cartridge', 'stolen_watch', 'immuno_med', 'cig_hemingway', 'perfume_sync'];
    const tplId = appraisePool[seed % appraisePool.length];
    const item = createItemInstance(tplId, { isFake: Math.random() < 0.5 });
    offerEntries.push({ item, askPrice: item.baseValue, selected: true });
  } else if (intent === 'sell_to_shop') {
    const sPool = (arch.sellPool && arch.sellPool.length > 0)
      ? arch.sellPool
      : ['scrap_metal', 'cig_hemingway', 'rib_sandwich', 'dirty_water'];

    // 小偷优先保障箱子先上柜台（还原工坊热门体验：箱子不被杂货挤掉！）
    const orderedPool = [...sPool];
    for (let k = 0; k < targetQty; k++) {
      let tplId = orderedPool[Math.floor(Math.random() * orderedPool.length)];
      if (arch.id === 'thief_master' && k === 0 && (state.rep.blackmarket >= 25 || Math.random() < 0.55)) {
        const crates = ['crate_service', 'crate_medical', 'crate_engineering', 'crate_security', 'crate_evidence'];
        tplId = crates[Math.floor(Math.random() * crates.length)];
      }

      const tpl = ITEM_TEMPLATES[tplId];
      const isFake = (tpl.fakeSigns && tpl.fakeSigns.length > 0) ? (Math.random() > arch.honesty) : false;
      const isStolen = !isFake && !tpl.isContainer && ((arch.stolenChance && Math.random() < arch.stolenChance) || Math.random() < 0.14);
      const item = createItemInstance(tplId, { isFake, isStolen, inspectedVisual: false });

      let ask = tpl.baseValue;
      // 整批卖家折扣 & 赃物五指折扣
      if (isStolen) ask = Math.round(ask * 0.74);
      else if (targetQty >= 3) ask = Math.round(ask * (0.86 + Math.random() * 0.18));
      else ask = Math.round(ask * (0.94 + Math.random() * 0.24));

      if (arch.faction === 'lower' && state.rep.lower >= 40) ask = Math.round(ask * 0.85);
      if (isStolen && state.profession === 'fence') ask = Math.round(ask * 0.82);

      offerEntries.push({
        item,
        askPrice: Math.max(8, ask),
        selected: true
      });
    }
  } else if (intent === 'buy_from_shop') {
    refreshCustomerBuyEntries(state, arch, wantedInfo, sellableNow, targetQty, buyEntries);
  }

  // 计算议价系数与底线
  let haggleMult = 1.0; // 对选中的商品整体议价乘数

  let greeting = arch.greetings[seed % arch.greetings.length];
  let behaviorNote = AUG_CLUES.normalBehaviors[seed % AUG_CLUES.normalBehaviors.length];

  if (wantedInfo && wantedInfo.isOdin) {
    greeting = '“我是奥丁·哈拉尔德森。只要你不按柜台底下那个治安部报警器，你手里的武器、弹药、门禁卡、密封物资箱和违禁品我全按高价打包买走！”';
    behaviorNote = `体貌特征：${wantedInfo.mark}。正平静地把一叠不记名信用芯片放在桌上。`;
  } else if (isAug) {
    if (seed % 2 === 0) greeting = AUG_CLUES.speechTells[seed % AUG_CLUES.speechTells.length];
    behaviorNote = mismatchBadge
      ? AUG_CLUES.behaviorTells[1]
      : AUG_CLUES.behaviorTells[seed % AUG_CLUES.behaviorTells.length];
  } else if (wantedInfo) {
    behaviorNote = `⚠️ 通缉特征吻合：${wantedInfo.mark}！`;
  } else if (arch.isSting) {
    behaviorNote = '站姿像军校教官一样笔直，眼神不断往你的柜台角落瞟。';
  }

  return {
    id: `cust_${state.day}_${seed}`,
    type: 'customer',
    archetypeId: arch.id,
    isSting: Boolean(arch.isSting),
    isBulkLiquidator: Boolean(arch.isBulkLiquidator),
    isAug,
    augVisualType,
    mismatchBadge,
    augScanned: false,
    wantedId: wantedInfo ? wantedInfo.id : null,
    wantedBounty: wantedInfo ? wantedInfo.bounty : 0,
    isOdin: Boolean(wantedInfo && wantedInfo.isOdin),

    name,
    roleName: wantedInfo && wantedInfo.isOdin ? '革命军传奇买手 (通缉犯)' : arch.roleName,
    faction: wantedInfo ? wantedInfo.faction : arch.faction,
    coatHue: wantedInfo && wantedInfo.isOdin ? 140 : arch.avatarHue,
    helmet: wantedInfo && wantedInfo.isOdin ? 'beret' : arch.helmet,
    seed,

    intent,
    targetQty,
    offerEntries,
    buyEntries,
    haggleMult,
    minSellMult: state.perks && state.perks.positive === 'intimidating' ? 0.62 : 0.74,
    maxBuyMult: state.perks && state.perks.positive === 'intimidating' ? 1.45 : 1.28,

    patience: arch.patience + (state.machines.includes('cassette_player') ? 1 : 0) + (getModuleEffects(state).streamlining > 0 ? 1 : 0),
    maxPatience: arch.patience + (state.machines.includes('cassette_player') ? 1 : 0) + (getModuleEffects(state).streamlining > 0 ? 1 : 0),
    dialogue: greeting,
    behaviorNote
  };
}

function refreshCustomerBuyEntries(state, arch, wantedInfo, sellableNow, targetQty, buyEntriesOut) {
  buyEntriesOut.length = 0;
  let pool = [...sellableNow];

  if (wantedInfo && wantedInfo.isOdin) {
    const odinLikes = pool.filter(it =>
      it.category === 'weapon' || it.category === 'contraband' || it.isSealedCrate || it.templateId.startsWith('keycard_')
    );
    if (odinLikes.length > 0) pool = odinLikes;
  } else if (arch && arch.isSting) {
    const illegalOnes = pool.filter(it => getItemIllegalityReason(it, state) !== null);
    if (illegalOnes.length > 0) pool = illegalOnes;
  } else if (arch && !arch.isBulkLiquidator) {
    const exactMatch = (arch.preferredTplIds && arch.preferredTplIds.length > 0)
      ? pool.filter(it => arch.preferredTplIds.includes(it.templateId))
      : [];
    const catMatch = (arch.buyCategories && arch.buyCategories.length > 0)
      ? pool.filter(it => arch.buyCategories.includes(it.category))
      : [];
    if (exactMatch.length > 0) {
      // 优先挑最匹配的商品，不够再补同类
      const rest = catMatch.filter(x => !exactMatch.includes(x));
      pool = [...exactMatch, ...rest];
    } else if (catMatch.length > 0) {
      pool = catMatch;
    }
  }

  // 打乱抽取最多 targetQty 件不同库存实例
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(targetQty, shuffled.length));

  const diffObj = DIFFICULTIES.find(d => d.id === state.difficulty) || DIFFICULTIES[1];
  const budgetMult = ((wantedInfo && wantedInfo.isOdin) ? 1.48 : (arch ? arch.budgetMult : 1.1)) * diffObj.budgetMult;
  const faction = wantedInfo ? wantedInfo.faction : (arch ? arch.faction : 'lower');

  for (const item of picked) {
    let perceived = evaluateItemFairPrice(item, state);
    // 若顾客没看穿假货，按真品基准估价给钱
    if (item.isFake) perceived = item.baseValue;

    if (faction === 'blackmarket' && state.rep.blackmarket >= 40 && (item.isStolen || item.legal === 'contraband')) {
      perceived = Math.round(perceived * 1.20);
    }
    if (faction === 'rebel' && state.rep.rebel >= 40 && (item.category === 'weapon' || item.category === 'medical' || item.isSealedCrate)) {
      perceived = Math.round(perceived * 1.30);
    }
    if (faction === 'upper' && state.rep.upper >= 40 && item.category === 'luxury') {
      perceived = Math.round(perceived * 1.35);
    }
    if (state.licenses.includes('display_case_up')) {
      perceived = Math.round(perceived * 1.12);
    }

    const unitOffer = Math.max(8, Math.round(perceived * budgetMult * (0.96 + Math.random() * 0.12)));
    buyEntriesOut.push({
      itemUid: item.uid,
      unitOffer,
      selected: true
    });
  }
}

// 获取当前顾客被勾选商品的合计报价
export function getCustomerSelectedTotal(customer) {
  if (!customer || customer.type !== 'customer') return 0;
  if (customer.intent === 'sell_to_shop') {
    const raw = customer.offerEntries
      .filter(e => e.selected)
      .reduce((s, e) => s + e.askPrice, 0);
    return Math.max(5, Math.round(raw * (customer.haggleMult || 1)));
  }
  if (customer.intent === 'buy_from_shop') {
    const raw = customer.buyEntries
      .filter(e => e.selected)
      .reduce((s, e) => s + e.unitOffer, 0);
    return Math.max(5, Math.round(raw * (customer.haggleMult || 1)));
  }
  return 0;
}

// 切换单件或多件商品在本次交易中的勾选状态（顾客带3件货，你可以只挑其中2件真货买！）
export function toggleDealEntrySelection(customer, index) {
  if (!customer) return;
  const arr = customer.intent === 'sell_to_shop' ? customer.offerEntries : customer.buyEntries;
  if (arr && arr[index]) {
    arr[index].selected = !arr[index].selected;
  }
}

export function nextCustomer(state) {
  if (state.currentCustomer && state.currentCustomer.isAug && !state.currentCustomer.eliminated) {
    state.augThreat = Math.min(100, state.augThreat + 8);
    addLog(state, '⚠️ 警报：刚才离开柜台的访客疑似潜伏的失控 AI 改造体，底层街区渗透威胁上升！');
  }

  if (state.customersQueue.length === 0) {
    state.currentCustomer = null;
    state.phase = 'night';
    addLog(state, `🌙 第 ${state.day} 天打烊！现在可以打开扩容箱整理物资、刷钥匙卡开箱、操作机器，或拨打批发商电话备货！`);
    return;
  }

  state.currentCustomer = state.customersQueue.shift();
  state.customersServedToday++;

  // 动态同步买家求购列表（防止之前顾客买走了同一件商品）
  const c = state.currentCustomer;
  if (c.type === 'customer' && c.intent === 'buy_from_shop') {
    const sellable = getShopSellableItems(state);
    const validIds = new Set(sellable.map(x => x.uid));
    c.buyEntries = c.buyEntries.filter(e => validIds.has(e.itemUid));

    if (c.buyEntries.length === 0) {
      if (sellable.length > 0) {
        const arch = CUSTOMER_ARCHETYPES.find(a => a.id === c.archetypeId);
        refreshCustomerBuyEntries(state, arch, c.isOdin ? { isOdin: true, faction: 'rebel' } : null, sellable, c.targetQty || 2, c.buyEntries);
      }
      if (c.buyEntries.length === 0) {
        c.intent = 'empty_leave';
        c.dialogue = '“咦，货架上没看到适合我的存货（藏在免检箱或暗格里的东西我不清楚），下次再来吧！”';
      }
    }
  }
}

// 鉴定顾客带来的第 idx 件商品（或全部）
export function inspectItem(state, item, mode = 'visual') {
  if (!item) return { ok: false, msg: '未选择有效商品' };

  if (mode === 'visual') {
    item.inspectedVisual = true;
    return { ok: true, msg: `🔍 放大镜已检验【${item.name}】的外观封签与印刷细节。` };
  }
  if (mode === 'deep') {
    if (!state.tools.includes('spec_analyzer')) {
      return { ok: false, msg: '尚未购买【全频段物质光谱仪】（可在证照&设备栏解锁）！' };
    }
    if (state.energy < 10) {
      return { ok: false, msg: '电力不足（光谱深度透视需 10⚡）！' };
    }
    state.energy -= 10;
    item.inspectedVisual = true;
    item.inspectedDeep = true;
    return { ok: true, msg: `🔬 光谱仪已透视【${item.name}】的深层成分与防盗码（-10⚡）。` };
  }
  return { ok: false, msg: '未知鉴定模式' };
}

// 一键用放大镜免费快检柜台上卖家带来的所有商品！
export function inspectAllSellerItems(state) {
  const c = state.currentCustomer;
  if (!c || !c.offerEntries || c.offerEntries.length === 0) {
    return { ok: false, msg: '柜台上没有待检商品' };
  }
  c.offerEntries.forEach(e => { e.item.inspectedVisual = true; });
  return { ok: true, msg: `🔍 已用放大镜快速扫视了柜台上全部 ${c.offerEntries.length} 件货品的外观！` };
}

// 针对卖家带来的第 entryIdx 件商品当面指出造假瑕疵大砍价！
export function confrontSellerFake(state, entryIdx, reasonText) {
  const c = state.currentCustomer;
  if (!c || !c.offerEntries || !c.offerEntries[entryIdx]) {
    return { ok: false, msg: '找不到目标商品' };
  }
  const entry = c.offerEntries[entryIdx];
  const item = entry.item;
  if (item.confronted) return { ok: false, msg: '该商品已经质询过了' };
  item.confronted = true;

  if (item.isFake && (!reasonText || (item.fakeFlaw && item.fakeFlaw.reason === reasonText))) {
    const slashFactor = state.profession === 'apprentice' ? 0.24 : 0.32;
    entry.askPrice = Math.max(5, Math.round(entry.askPrice * slashFactor));
    state.stats.fakesExposed++;
    c.dialogue = `“嘶……连【${item.name}】这么隐蔽的毛病都被掌柜看穿了？！行行行，这件算你废品价 **${entry.askPrice} CR**！”`;
    addLog(state, `🎯 铁证如山！揭穿 ${c.name} 的假货【${item.name}】，单价暴砍至 ${entry.askPrice} CR！`);
    return { ok: true, success: true, msg: `🎯 揭穿成功！【${item.name}】单价暴降至 ${entry.askPrice} CR！` };
  } else {
    changeRep(state, c.faction, -4);
    c.patience -= 1;
    c.dialogue = `“喂！我这件【${item.name}】可是真金白银的正品，别鸡蛋里挑骨头！”`;
    addLog(state, `❌ 质询打眼了！冤枉了 ${c.name} 的真货，${FACTIONS[c.faction].short}声望 -4。`);
    if (c.patience <= 0) {
      nextCustomer(state);
      return { ok: true, success: false, msg: '顾客被你冤枉得火冒三丈，收起全部货物摔门而去！' };
    }
    return { ok: true, success: false, msg: '质询失误！该商品并无此瑕疵（声望 -4，耐心 -1）。' };
  }
}

// 整单议价博弈（对当前所有勾选商品的总价进行砍价或加价）
export function haggleWithCustomer(state, proposedTotal) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'customer') return { ok: false, msg: '当前无法议价' };
  proposedTotal = Math.round(Number(proposedTotal));
  if (isNaN(proposedTotal) || proposedTotal <= 0) return { ok: false, msg: '报价无效' };

  if (c.intent === 'sell_to_shop') {
    const selected = c.offerEntries.filter(e => e.selected);
    if (selected.length === 0) return { ok: false, msg: '请至少勾选 1 件要收购的物品！' };
    const baseSum = selected.reduce((s, e) => s + e.askPrice, 0);
    const minTotal = Math.max(5, Math.round(baseSum * c.minSellMult));
    const curTotal = getCustomerSelectedTotal(c);

    if (proposedTotal >= curTotal) {
      return executeBuyFromCustomer(state, proposedTotal);
    }
    if (proposedTotal >= minTotal) {
      c.haggleMult = proposedTotal / baseSum;
      return executeBuyFromCustomer(state, proposedTotal);
    } else {
      c.patience -= 1;
      c.haggleMult = Math.max(c.minSellMult, ((c.haggleMult || 1) + c.minSellMult) / 2);
      const nextAsk = getCustomerSelectedTotal(c);
      if (c.patience <= 0) {
        addLog(state, `💢 砍价太狠，${c.name} 收起货袋扭头走了。`);
        nextCustomer(state);
        return { ok: true, left: true, msg: '砍价超出底线，顾客耐心耗尽离开！' };
      }
      c.dialogue = `“这几件打包最少也要 **${nextAsk} CR**，再低真没法卖了！”（剩余耐心 ${c.patience}）`;
      return { ok: true, accepted: false, msg: `对方拒绝 ${proposedTotal} CR，松口让步至总价 ${nextAsk} CR。` };
    }
  } else if (c.intent === 'buy_from_shop') {
    const selected = c.buyEntries.filter(e => e.selected);
    if (selected.length === 0) return { ok: false, msg: '请至少勾选 1 件要出售给顾客的物品！' };
    const baseSum = selected.reduce((s, e) => s + e.unitOffer, 0);
    const maxTotal = Math.round(baseSum * c.maxBuyMult);
    const curTotal = getCustomerSelectedTotal(c);

    if (proposedTotal <= curTotal) {
      return executeSellToCustomer(state, proposedTotal);
    }
    if (proposedTotal <= maxTotal) {
      c.haggleMult = proposedTotal / baseSum;
      return executeSellToCustomer(state, proposedTotal);
    } else {
      c.patience -= 1;
      c.haggleMult = Math.min(c.maxBuyMult, ((c.haggleMult || 1) + c.maxBuyMult) / 2);
      const nextOffer = getCustomerSelectedTotal(c);
      if (c.patience <= 0) {
        addLog(state, `💢 漫天要价把买家 ${c.name} 吓跑了。`);
        nextCustomer(state);
        return { ok: true, left: true, msg: '加价太狠，买家拂袖而去！' };
      }
      c.dialogue = `“老板别宰熟客啊，这几件我最多总共出 **${nextOffer} CR**！”（剩余耐心 ${c.patience}）`;
      return { ok: true, accepted: false, msg: `买家拒绝高价，愿意加价至总计 ${nextOffer} CR。` };
    }
  }
  return { ok: false, msg: '当前不支持议价' };
}

// 批量收购顾客被勾选的 1~N 件商品（自动存入货架或扩容箱套包！）
export function executeBuyFromCustomer(state, overrideTotal) {
  const c = state.currentCustomer;
  if (!c || c.intent !== 'sell_to_shop') return { ok: false, msg: '没有可收购商品' };

  const selected = c.offerEntries.filter(e => e.selected);
  if (selected.length === 0) return { ok: false, msg: '请至少勾选 1 件想要买下的物品！' };

  const totalPrice = overrideTotal ?? getCustomerSelectedTotal(c);
  if (state.credits < totalPrice) {
    return { ok: false, msg: `信用点不足（需 ${totalPrice} CR，当前 ${state.credits} CR）！你可以取消勾选部分商品单独买。` };
  }

  // 检查剩余总格数（含扩容箱套包空间）
  let containerSlotsReq = 0;
  let normalSlotsReq = 0;
  for (const e of selected) {
    if (e.item.isContainer) containerSlotsReq += itemSlotCost(e.item);
    else normalSlotsReq += itemSlotCost(e.item);
  }
  if (getTotalFreeCapacity(state, true) < containerSlotsReq || getTotalFreeCapacity(state, false) < (containerSlotsReq + normalSlotsReq)) {
    return {
      ok: false,
      msg: '仓库与扩容箱总空间不足！建议先去右侧【电话批发】找杰克逊博士买个扩容背包/储物箱，或取消勾选部分商品。'
    };
  }

  state.credits -= totalPrice;
  let hiddenFakeCount = 0;
  let stolenCount = 0;

  for (const e of selected) {
    if (e.item.isFake && !e.item.confronted) hiddenFakeCount++;
    if (e.item.isStolen) stolenCount++;
    e.item.inspectedVisual = true;
    smartStoreItem(state, e.item);
  }

  changeRep(state, c.faction, 2 + selected.length);
  if (stolenCount > 0) {
    state.heat = Math.min(100, state.heat + stolenCount * 5);
  }

  const names = selected.map(e => e.item.name).join('、');
  const fakeWarn = hiddenFakeCount > 0 ? `（⚠️ 入库复检发现其中有 ${hiddenFakeCount} 件没看出来的假货！）` : '';
  addLog(state, `💰 花费 ${totalPrice} CR 从 ${c.name} 购入 ${selected.length} 件货品：【${names}】。${fakeWarn}`);

  nextCustomer(state);
  return { ok: true, msg: `成交！花费 ${totalPrice} CR 收入 ${selected.length} 件商品！${fakeWarn}` };
}

// 批量出售玩家勾选的 1~N 件商品给顾客
export function executeSellToCustomer(state, overrideTotal) {
  const c = state.currentCustomer;
  if (!c || c.intent !== 'buy_from_shop') return { ok: false, msg: '当前顾客并非买家' };

  const selected = c.buyEntries.filter(e => e.selected);
  if (selected.length === 0) return { ok: false, msg: '请至少勾选 1 件要卖出的商品！' };

  const sellableMap = new Map(getShopSellableItems(state).map(i => [i.uid, i]));
  const itemsToSell = [];
  for (const e of selected) {
    const it = sellableMap.get(e.itemUid);
    if (it) itemsToSell.push(it);
  }
  if (itemsToSell.length === 0) return { ok: false, msg: '所选商品已被移走' };

  const totalPrice = overrideTotal ?? getCustomerSelectedTotal(c);

  // 检查是否中了便衣警察钓鱼执法！
  const illegalSold = itemsToSell.filter(it => getItemIllegalityReason(it, state) !== null);
  if (c.isSting && illegalSold.length > 0) {
    for (const bad of illegalSold) removeOwnedItemByUid(state, bad.uid);
    const fine = 150 * illegalSold.length;
    state.credits = Math.max(0, state.credits - fine);
    state.heat = Math.min(100, state.heat + 20);
    changeRep(state, 'security', -12);
    addLog(state, `🚨 钓鱼执法！！便衣探员亮出证件，当场没收 ${illegalSold.length} 件违规品并重罚 ${fine} CR！`);
    nextCustomer(state);
    return {
      ok: true,
      stingCaught: true,
      msg: `🚨 中计了！对方是钓鱼执法的便衣！违规货被没收并罚款 ${fine} CR！`
    };
  }

  // 正常成交！若对方是奥丁，提升革命军与黑市关系
  let fakeCaught = 0;
  for (const it of itemsToSell) {
    removeOwnedItemByUid(state, it.uid);
    if (it.isFake && !c.isBulkLiquidator && Math.random() < 0.55) {
      fakeCaught++;
    }
  }

  state.credits += totalPrice;
  state.stats.totalEarned += totalPrice;

  if (c.isOdin) {
    state.stats.metOdinFriendly = true;
    changeRep(state, 'rebel', 10);
    changeRep(state, 'blackmarket', 8);
    if (!state.unlockedMerchants.includes('sawyer_exchange')) {
      state.unlockedMerchants.push('sawyer_exchange');
      addLog(state, '🟢 奥丁临走前留下绿色加密名片：免费为你开通了【索耶的地下黑市交易所】批发专线！');
    }
  }

  let penaltyNote = '';
  if (fakeCaught > 0) {
    const repLoss = c.faction === 'blackmarket' ? -8 * fakeCaught : -5 * fakeCaught;
    changeRep(state, c.faction, repLoss);
    penaltyNote = `（⚠️ 顾客验出 ${fakeCaught} 件假货，${FACTIONS[c.faction].short}声望 ${repLoss}！）`;
  } else {
    changeRep(state, c.faction, 3 + itemsToSell.length);
  }

  if (illegalSold.length > 0 && !c.isOdin) {
    state.heat = Math.min(100, state.heat + illegalSold.length * 6);
  }

  const names = itemsToSell.map(i => i.name).join('、');
  addLog(state, `💵 批量售出 ${itemsToSell.length} 件商品【${names}】，入账 **+${totalPrice} CR**！${penaltyNote}`);
  nextCustomer(state);
  return { ok: true, msg: `💵 交易完成！售出 ${itemsToSell.length} 件货品，收款 +${totalPrice} CR！${penaltyNote}` };
}

// 鉴定委托结算
export function fulfillAppraisal(state, claimIsAuthentic) {
  const c = state.currentCustomer;
  const item = c?.offerEntries?.[0]?.item;
  if (!c || c.intent !== 'appraise_request' || !item) {
    return { ok: false, msg: '当前不是鉴定委托' };
  }
  const actualAuthentic = !item.isFake;
  if (claimIsAuthentic === actualAuthentic) {
    const fee = 105 + Math.round(item.baseValue * 0.28);
    state.credits += fee;
    state.stats.totalEarned += fee;
    state.stats.fakesExposed++;
    changeRep(state, c.faction, 6);
    addLog(state, `🏅 精准鉴伪！【${item.name}】鉴定报告无懈可击，赚取佣金 +${fee} CR！`);
    nextCustomer(state);
    return { ok: true, msg: `🏅 鉴定准确无误！进账佣金 +${fee} CR！` };
  } else {
    changeRep(state, c.faction, -6);
    addLog(state, `❌ 鉴定走眼了！对【${item.name}】出具了错误结论（声望 -6）。`);
    nextCustomer(state);
    return { ok: true, msg: '❌ 鉴定结论错误，客户拒付佣金并差评（声望 -6）！' };
  }
}

export function refuseCustomer(state) {
  const c = state.currentCustomer;
  if (!c) return { ok: false, msg: '当前无访客' };
  if (c.isSecurityRaid) return { ok: false, msg: '治安部盘查无法直接赶走！请配合检查或塞钱。' };
  addLog(state, `👋 送走了访客 ${c.name}。`);
  nextCustomer(state);
  return { ok: true, msg: '已送走当前顾客。' };
}

// AI 改造体扫描 & 霰弹枪 & 通缉举报
export function scanCustomerForAug(state) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'customer') return { ok: false, msg: '当前对象无需扫描' };
  if (!state.tools.includes('aug_scanner')) {
    return { ok: false, msg: '尚未购买【AI 改造体扫描仪】（可在证照&设备栏购买）！' };
  }
  if (c.augScanned) return { ok: false, msg: '已扫描过该访客' };
  const scanCost = (state.perks && state.perks.positive === 'vigilant') || getModuleEffects(state).neural > 0 ? 10 : 20;
  if (state.energy < scanCost) return { ok: false, msg: `电力不足（需 ${scanCost}⚡）！可在库存点击聚变电池充电。` };

  state.energy -= scanCost;
  c.augScanned = true;
  if (c.isAug) {
    addLog(state, `📡 [AUG DETECTED] 扫描确认：${c.name} 是被失控 AI 寄生的改造体！立即拔霰弹枪轰击领赏！`);
    return { ok: true, isAug: true, msg: '🚨 警报：100% 确认为失控 AI 改造体！可合法开枪击毙！' };
  } else {
    addLog(state, `📡 扫描通过：${c.name} 为正常人类。`);
    return { ok: true, isAug: false, msg: '✅ 扫描确认：正常自然人类（切勿开枪）。' };
  }
}

export function shootCustomerWithShotgun(state) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'customer') return { ok: false, msg: '不能对该目标开枪' };

  if (c.isAug) {
    c.eliminated = true;
    let bounty = state.rep.security >= 40 ? 240 : 190;
    if (state.perks && state.perks.neutral === 'aug_menace') bounty = Math.round(bounty * 1.5);
    state.credits += bounty;
    state.stats.totalEarned += bounty;
    state.stats.augsEliminated++;
    state.augThreat = Math.max(0, state.augThreat - 20);
    changeRep(state, 'security', 8);
    changeRep(state, 'lower', 6);

    const cell = createItemInstance('energy_cell', { inspectedVisual: true });
    smartStoreItem(state, cell);

    addLog(state, `💥 轰！！霰弹枪当场击碎失控 AI 改造体 ${c.name}！获治安赏金 +${bounty} CR 与 1 块聚变电池！`);
    nextCustomer(state);
    return { ok: true, correctKill: true, msg: `💥 精准猎杀改造体！赏金 +${bounty} CR + 聚变电池！` };
  } else {
    const fine = 360;
    state.credits = Math.max(0, state.credits - fine);
    state.heat = Math.min(100, state.heat + 40);
    state.stats.innocentsShot++;
    changeRep(state, 'lower', -18);
    changeRep(state, 'security', -22);
    addLog(state, `🩸 惨重误杀！！${c.name} 是真人类！被重罚 ${fine} CR，治安嫌疑暴涨！`);
    if (state.stats.innocentsShot >= 3) {
      state.gameOver = {
        victory: false,
        endingId: 'prison_murder',
        title: '结局：深空重刑犯流放舱',
        desc: '因多次在店内枪击无辜平民，治安部特警队封死当铺将你押往小行星苦役矿场。'
      };
      state.phase = 'gameover';
    } else {
      nextCustomer(state);
    }
    return { ok: true, correctKill: false, msg: `🩸 误杀真人类！重罚 ${fine} CR！` };
  }
}

export function reportWantedCustomer(state) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'customer') return { ok: false, msg: '当前无举报对象' };

  if (c.wantedId) {
    const bounty = c.wantedBounty || 250;
    state.credits += bounty;
    state.stats.totalEarned += bounty;
    state.stats.wantedReported++;
    state.heat = Math.max(0, state.heat - 15);
    changeRep(state, 'security', 12);
    changeRep(state, c.faction, -14);
    addLog(state, `🚨 举报抓获通缉犯【${c.name}】！领取治安部悬赏金 +${bounty} CR！`);
    nextCustomer(state);
    return { ok: true, msg: `🚨 抓捕成功！悬赏金 +${bounty} CR 到账！` };
  } else {
    state.credits = Math.max(0, state.credits - 45);
    changeRep(state, 'security', -5);
    addLog(state, `⚠️ 谎报通缉令被训斥罚款 -45 CR。`);
    nextCustomer(state);
    return { ok: true, msg: '对方并非通缉犯！报假警被罚 45 CR。' };
  }
}

// 应对治安官突击搜查（仅搜查未受屏蔽的区域：明面主货架 + 普通非免检背包！免检走私箱与固定暗格完全安全！高幸运值甚至有概率让警官走神漏检！）
export function handleSecurityRaid(state, action) {
  const c = state.currentCustomer;
  if (!c || !c.isSecurityRaid) return { ok: false, msg: '当前无盘查' };

  if (action === 'bribe') {
    if (state.credits < c.bribeCost) {
      return { ok: false, msg: `现金不足 ${c.bribeCost} CR！赶紧点右侧【一键藏匿违禁品】塞进免检箱再配合检查！` };
    }
    state.credits -= c.bribeCost;
    state.heat = Math.max(0, state.heat - 22);
    state.stats.raidsSurvived++;
    addLog(state, `🤫 塞了 ${c.bribeCost} CR 茶水费，盘查队心照不宣地收队离开（嫌疑 -22）。`);
    nextCustomer(state);
    return { ok: true, clean: true, msg: `🤫 破财消灾！支付 ${c.bribeCost} CR 摆平盘查。` };
  }

  // 若喝了液体好运（luck >= 60），50% 概率警官打哈欠直接免检放行！（致敬原版液体好运彩蛋！）
  if ((state.luck || 0) >= 60 && Math.random() < 0.55) {
    state.heat = Math.max(0, state.heat - 15);
    state.stats.raidsSurvived++;
    addLog(state, '🍀 【液体好运显灵！】伦警官刚进门接了个紧急通讯，随手签了“合格”便匆匆离开了！');
    nextCustomer(state);
    return { ok: true, clean: true, msg: '🍀 好运显灵！盘查官临时有急事免检放行！' };
  }

  const all = getAllOwnedItemsWithLoc(state);
  const exposedIllegal = all.filter(entry => !entry.shieldedFromRaid && getItemIllegalityReason(entry.item, state) !== null);

  if (exposedIllegal.length === 0) {
    state.heat = Math.max(0, state.heat - 15);
    changeRep(state, 'security', 6);
    state.stats.raidsSurvived++;
    addLog(state, '✅ 盘查过关！明面货架干净合规，走私者伪装箱与暗格内的秘密毫发无损！');
    nextCustomer(state);
    return { ok: true, clean: true, msg: '✅ 完美过关！免检伪装箱与暗格成功瞒天过海（治安+6）！' };
  } else {
    for (const bad of exposedIllegal) {
      removeOwnedItemByUid(state, bad.item.uid);
    }
    const fine = exposedIllegal.length * 105;
    state.credits = Math.max(0, state.credits - fine);
    state.heat = Math.min(100, state.heat + 14);
    changeRep(state, 'security', -12);
    const names = exposedIllegal.map(x => x.item.name).join('、');
    addLog(state, `🚨 查抄损失！从非屏蔽区搜出 ${exposedIllegal.length} 件违规品【${names}】没收并罚 ${fine} CR！`);
    nextCustomer(state);
    return { ok: true, clean: false, msg: `🚨 搜出违规品【${names}】被没收并罚 ${fine} CR！（记得用免检走私箱！）` };
  }
}

// 特殊剧情抉择
export function resolveStoryChoice(state, effect) {
  const c = state.currentCustomer;
  if (!c || c.type !== 'story') return { ok: false, msg: '当前非剧情对话' };
  let msg = '已做出抉择。';

  if (effect === 'gift_smuggler_mini') {
    smartStoreItem(state, createItemInstance('mini_smuggler_bay', { inspectedVisual: true }));
    msg = '获得【迷你走私者伪装箱(占1扩5·免检)】！把违禁品装进去永远不怕条子盘查！';
    addLog(state, '🎁 导师赠礼：获得【迷你走私者伪装箱(占1扩5·免检)】！');
  } else if (effect === 'gift_luck_pack') {
    smartStoreItem(state, createItemInstance('scratcher_pack', { inspectedVisual: true }));
    smartStoreItem(state, createItemInstance('liquid_luck', { inspectedVisual: true }));
    msg = '获得【液体好运】+【5连刮刮乐彩票】！先喝药水再刮奖试试冲击头奖吧！';
    addLog(state, '🎁 导师赠礼：获得【液体好运】与【一叠5张刮刮乐彩票】！');
  } else if (effect === 'accept_waste') {
    state.credits += 360;
    state.stats.totalEarned += 360;
    smartStoreItem(state, createItemInstance('liquid_luck', { inspectedVisual: true }));
    smartStoreItem(state, createItemInstance('rad_barrel', { inspectedVisual: true }), true);
    smartStoreItem(state, createItemInstance('rad_barrel', { inspectedVisual: true }), true);
    msg = '收下 360 CR +【液体好运】+ 2桶放射性废料！记得今晚去垃圾场倾倒废料桶！';
    addLog(state, '☢️ 接下乔治奥脏活（+360 CR + 液体好运），务必夜间去垃圾场倒掉废料桶！');
  } else if (effect === 'buy_georgio_locker') {
    if (state.credits < 120) return { ok: false, msg: '现金不足 120 CR！' };
    state.credits -= 120;
    smartStoreItem(state, createItemInstance('crate_evidence', { inspectedVisual: true }), true);
    smartStoreItem(state, createItemInstance('keycard_security', { inspectedVisual: true }), true);
    msg = '花 120 CR 购得【治安部罚没物证柜】+【治安部钥匙卡】！快去库存里刷卡开箱！';
    addLog(state, '🔐 从乔治奥处拿下治安部物证柜与配套钥匙卡！');
  } else if (effect === 'reject_waste') {
    changeRep(state, 'lower', 6);
    msg = '婉拒脏活，下层街坊好感提升（+6）。';
  } else if (effect === 'report_dirty_cop') {
    state.credits += 200;
    state.stats.totalEarned += 200;
    changeRep(state, 'security', 15);
    msg = '督察当场拿下腐败巡官！你因协助反腐获得 +200 CR 奖金与治安部声望 +15！';
    addLog(state, '⚖️ 识破腐败巡官栽赃圈套，反手举报获赏 +200 CR！');
  } else if (effect === 'keep_trap_loot') {
    smartStoreItem(state, createItemInstance('dream_dust', { inspectedVisual: true }), true);
    state.heat = Math.min(100, state.heat + 10);
    msg = '你把价值 360 CR 的【梦魇尘】偷偷吞下塞进了暗仓！收益最大化！';
    addLog(state, '🕵️ 黑吃黑收下栽赃的【梦魇尘】（已优先藏入暗仓）！');
  } else if (effect === 'refuse_trap') {
    msg = '巡官讨了个没趣，灰溜溜地走了。';
  } else if (effect === 'lu_accept') {
    const rifle = createItemInstance('pulse_rifle', { inspectedVisual: true, questTag: 'lu_rifle' });
    smartStoreItem(state, rifle, true);
    state.stats.luQuestState = 'holding';
    state.stats.luReturnDay = state.day + 2;
    changeRep(state, 'rebel', 12);
    msg = '已将卢的脉冲步枪存入安全仓位，第 7 天她将带 500 CR 与万能钥匙卡来取！';
    addLog(state, '📦 替革命军先锋卢保管脉冲步枪。');
  } else if (effect === 'lu_betray') {
    state.credits += 300;
    state.stats.luQuestState = 'betrayed';
    changeRep(state, 'security', 20);
    changeRep(state, 'rebel', -35);
    msg = '出卖卢换取了 300 CR 线人费（治安+20，革命军-35）。';
  } else if (effect === 'lu_decline') {
    msg = '婉拒了寄存委托。';
  } else if (effect === 'lu_handover') {
    const all = getAllOwnedItemsWithLoc(state);
    const found = all.find(x => x.item.questTag === 'lu_rifle' || x.item.templateId === 'pulse_rifle');
    if (!found) return { ok: false, msg: '你店里已经没有脉冲步枪了！' };
    removeOwnedItemByUid(state, found.item.uid);
    state.credits += 500;
    state.stats.totalEarned += 500;
    state.stats.luQuestState = 'completed';
    smartStoreItem(state, createItemInstance('keycard_command', { inspectedVisual: true }), true);
    changeRep(state, 'rebel', 25);
    msg = '物归原主！获得 500 CR 重赏 + 1张【指挥官万能最高权限卡】！';
    addLog(state, '🌟 守信归还卢的重武器，获赠 500 CR 与【指挥官万能钥匙卡】！');
  } else if (effect === 'lu_lost') {
    state.stats.luQuestState = 'betrayed';
    changeRep(state, 'rebel', -30);
    msg = '卢失望离去（革命军 -30）。';
  } else if (effect === 'help_serpico') {
    const all = getAllOwnedItemsWithLoc(state);
    const food = all.find(x => ['morsel_food', 'rib_sandwich', 'pure_water', 'cheese_block', 'raw_meat'].includes(x.item.templateId));
    if (!food) return { ok: false, msg: '库存中暂无食品或净水，可选择资助 120 CR！' };
    removeOwnedItemByUid(state, food.item.uid);
    state.stats.helpedSerpico = true;
    changeRep(state, 'lower', 25);
    changeRep(state, 'rebel', 12);
    smartStoreItem(state, createItemInstance('stolen_watch', { isFake: false, isStolen: false, inspectedVisual: true }));
    msg = '救助塞尔皮科成功！获赠真品【古地球陀飞轮金怀表(265 CR)】（下层+25）！';
    addLog(state, '❤️ 救助流亡者塞尔皮科，获赠传家真品金怀表！');
  } else if (effect === 'pay_serpico') {
    if (state.credits < 120) return { ok: false, msg: '信用点不足 120 CR！' };
    state.credits -= 120;
    state.luck = Math.min(100, (state.luck || 0) + 10);
    state.stats.helpedSerpico = true;
    changeRep(state, 'lower', 18);
    msg = '资助塞尔皮科 120 CR，下层声望 +18，永久幸运值 +10！';
  } else if (effect === 'ignore_serpico') {
    changeRep(state, 'lower', -10);
    msg = '冷漠送走了信使（下层 -10）。';
  }

  nextCustomer(state);
  return { ok: true, msg };
}

// ============================================================================
// 后室机器生产合成（自动搜寻货架、暗格及所有扩容箱内的原料！）
// ============================================================================
export function runMachineRecipe(state, machineId, recipeId) {
  if (!state.machines.includes(machineId)) return { ok: false, msg: '尚未安装该机器' };
  const machine = MACHINES[machineId];
  const recipe = machine.recipes.find(r => r.id === recipeId);
  if (!recipe) return { ok: false, msg: '未知配方' };

  const modFx = getModuleEffects(state);
  let powerCost = recipe.power;
  if (modFx.efficiency > 0) powerCost = Math.max(1, Math.round(powerCost * (1 - modFx.efficiency * 0.12)));
  if (modFx.chem > 0 && machineId === 'chem_finisher') powerCost = Math.max(1, Math.round(powerCost * 0.8));
  if (modFx.hydro_light > 0 && machineId === 'hydroponics') powerCost = Math.max(1, Math.round(powerCost * 0.85));
  if (state.perks && state.perks.positive === 'experienced_chemist') powerCost = Math.max(1, Math.round(powerCost * 0.85));
  if (state.energy < powerCost) {
    return { ok: false, msg: `电力不足（需 ${powerCost}⚡，当前 ${state.energy}⚡）！` };
  }

  const all = getAllOwnedItemsWithLoc(state)
    .map(x => x.item)
    .filter(i => !i.questTag && !i.isContainer);

  let effectiveInputs = [...recipe.inputs];
  if (modFx.refinement > 0 && effectiveInputs.length > 1) effectiveInputs = effectiveInputs.slice(0, -1);
  if (modFx.hydro_water > 0 && machineId === 'hydroponics' && effectiveInputs.length > 1) effectiveInputs = effectiveInputs.slice(0, -1);
  const chosenUids = [];
  for (const reqTpl of effectiveInputs) {
    const match = all.find(i => i.templateId === reqTpl && !chosenUids.includes(i.uid));
    if (!match) {
      return { ok: false, msg: `缺少原料：【${ITEM_TEMPLATES[reqTpl].name}】（可去电话批发商整批采购）！` };
    }
    chosenUids.push(match.uid);
  }

  for (const uid of chosenUids) removeOwnedItemByUid(state, uid);
  state.energy -= powerCost;

  let outCount = recipe.outputCount;
  if (modFx.overclock > 0 && Math.random() < 0.25 * modFx.overclock) outCount += 1;
  if (modFx.chem > 0 && machineId === 'chem_finisher') outCount += 1;
  if (modFx.hydro_yield > 0 && machineId === 'hydroponics') outCount += 1;
  if (modFx.junk > 0 && machineId === 'furnace') outCount += 1;
  if (modFx.blast > 0 && machineId === 'furnace' && recipe.id === 'smelt_junk') outCount += 1;
  for (let n = 0; n < outCount; n++) {
    const out = createItemInstance(recipe.output, {
      isFake: Boolean(recipe.makeFake),
      inspectedVisual: true,
      inspectedDeep: true
    });
    smartStoreItem(state, out);
  }
  if (machineId === 'hydroponics') state.stats.hydroHarvested = (state.stats.hydroHarvested || 0) + outCount;
  if (machineId === 'aquaculture') state.stats.aquaHarvested = (state.stats.aquaHarvested || 0) + outCount;

  state.stats.itemsCrafted += outCount;
  addLog(state, `⚙️ 【${machine.name}】合成完成：产出 ${recipe.outputCount} ×【${ITEM_TEMPLATES[recipe.output].name}】。`);
  return { ok: true, msg: `⚙️ 制造成功！获得 ${outCount} ×【${ITEM_TEMPLATES[recipe.output].name}】！` };
}

// 序列号打磨机洗白赃物
export function scrubStolenItem(state, itemUid) {
  if (!state.machines.includes('scrambler')) {
    return { ok: false, msg: '需要购置【量子序列号打磨 & 制卡仪】才能洗白赃物！' };
  }
  if (state.energy < 14) return { ok: false, msg: '电力不足（需 14⚡）！' };
  const entry = getAllOwnedItemsWithLoc(state).find(x => x.item.uid === itemUid);
  if (!entry || !entry.item.isStolen) return { ok: false, msg: '该物品无需洗白' };

  state.energy -= 14;
  entry.item.isStolen = false;
  entry.item.heatDays = 0;
  addLog(state, `💻 已彻底抹除【${entry.item.name}】的失主防盗追踪码！`);
  return { ok: true, msg: `💻 洗白完成！【${entry.item.name}】已变为合法无痕商品！` };
}

// 购置设备、工具、许可证与货架扩建
export function purchaseShopUpgrade(state, id) {
  if (MACHINES[id]) {
    const m = MACHINES[id];
    if (state.machines.includes(id)) return { ok: false, msg: '已拥有该设备' };
    if (state.credits < m.cost) return { ok: false, msg: `信用点不足（需 ${m.cost} CR）` };
    state.credits -= m.cost;
    state.machines.push(id);
    if (id === 'powerbloc') state.maxEnergy += 60;
    if (id === 'micro_reactor') state.maxEnergy += 120;
    if (id === 'storage_coordinator') state.shelfMaxSlots += 6;
    addLog(state, `🏭 后室新增生产设备：【${m.name}】（-${m.cost} CR）！`);
    return { ok: true, msg: `🏭 已安装【${m.name}】！` };
  }

  const up = UPGRADES_AND_LICENSES.find(u => u.id === id);
  if (!up) return { ok: false, msg: '未知升级项' };
  if (state.tools.includes(id) || state.licenses.includes(id)) return { ok: false, msg: '已解锁该项' };
  if (state.credits < up.cost) return { ok: false, msg: `信用点不足（需 ${up.cost} CR）` };

  state.credits -= up.cost;
  if (up.type === 'tool') state.tools.push(id);
  else {
    state.licenses.push(id);
    if (id === 'shelf_expand_1') state.shelfMaxSlots += 8;
    if (id === 'stash_expand') state.stashMaxSlots += 6;
  }
  // 被动机器即时生效
  if (id === 'powerbloc') state.maxEnergy += 60;
  if (id === 'micro_reactor') state.maxEnergy += 120;
  if (id === 'storage_coordinator') state.shelfMaxSlots += 6;

  addLog(state, `📜 解锁升级：【${up.name}】（-${up.cost} CR）！`);
  return { ok: true, msg: `📜 成功解锁【${up.name}】！` };
}

// 夜间结算与推进天数
export function performNightActionAndSleep(state, nightChoice) {
  if (state.phase !== 'night') return { ok: false, msg: '尚未到夜晚时段' };
  const nightReport = [];

  if (nightChoice === 'dump_scrapyard') {
    // 清除所有放射性废料桶（包含在容器或暗格内的）
    const all = getAllOwnedItemsWithLoc(state);
    let dumped = 0;
    for (const x of all) {
      if (x.item.templateId === 'rad_barrel') {
        removeOwnedItemByUid(state, x.item.uid);
        dumped++;
      }
    }
    if (dumped > 0) {
      nightReport.push(`☢️ 已在垃圾场深坑安全倾倒了 ${dumped} 桶高危放射性废料！`);
    }

    const lootPool = [
      'scrap_metal', 'dirty_water', 'filter_core', 'bio_moss', 'electronic_parts',
      'broken_pistol', 'morsel_food', 'scratcher_ticket', 'crate_service', 'keycard_service'
    ];
    let count = state.rep.lower >= 40 ? 4 : 3;
    if (state.perks && state.perks.positive === 'proficient_scavenger') count += 2;
    const names = [];
    for (let k = 0; k < count; k++) {
      const tplId = lootPool[Math.floor(Math.random() * lootPool.length)];
      const inst = createItemInstance(tplId, { inspectedVisual: true });
      if (smartStoreItem(state, inst).ok) names.push(inst.name);
    }
    nightReport.push(`🗑️ 垃圾场翻找带回：${names.length ? names.join('、') : '背包已满未装下'}。`);
  } else if (nightChoice === 'underground_crate') {
    if (state.credits < 160) return { ok: false, msg: '前往地下暗巷买盲盒套组需 160 CR！' };
    state.credits -= 160;
    const pairs = [
      ['crate_service', 'keycard_service'],
      ['crate_medical', 'keycard_medical'],
      ['crate_engineering', 'keycard_engineering'],
      ['crate_security', 'keycard_security'],
      ['crate_evidence', 'keycard_security']
    ];
    const [cId, kId] = pairs[Math.floor(Math.random() * pairs.length)];
    const cItem = createItemInstance(cId, { inspectedVisual: true });
    const kItem = createItemInstance(kId, { inspectedVisual: true });
    smartStoreItem(state, cItem, true);
    smartStoreItem(state, kItem, true);
    changeRep(state, 'blackmarket', 8);
    nightReport.push(`🎁 地下交易所暗拍大赚：获得【${cItem.name}】+ 配套【${kItem.name}】！明天可直接刷卡开箱！`);
  } else if (nightChoice === 'rest_recharge') {
    state.energy = Math.min(state.maxEnergy, state.energy + 65);
    state.heat = Math.max(0, state.heat - 18);
    nightReport.push('⚡ 留店检修电容并抹除巡查监控：电力 +65⚡，治安嫌疑 -18%。');
  }

  // v3.0 被动机器夜间结算
  const modFxNight = getModuleEffects(state);
  if (state.machines.includes('vending')) {
    const sellable = getShopSellableItems(state).filter(i => !i.isContainer);
    if (sellable.length > 0) {
      const n = Math.min(3, sellable.length);
      let earn = 0;
      for (let i = 0; i < n; i++) {
        const it = sellable[Math.floor(Math.random() * sellable.length)];
        if (it) { earn += Math.round(it.baseValue * 0.7); removeOwnedItemByUid(state, it.uid); }
      }
      if (earn > 0) { state.credits += earn; state.stats.totalEarned += earn; state.stats.vendingEarned = (state.stats.vendingEarned || 0) + earn; nightReport.push(`🏪 自动售货机夜间被动销售 +${earn} CR！`); }
    }
  }
  if (state.machines.includes('recharger')) { state.energy = Math.min(state.maxEnergy, state.energy + 30); nightReport.push('🔌 充电站夜间回电 +30⚡'); }
  if (state.machines.includes('micro_reactor')) { state.energy = Math.min(state.maxEnergy, state.energy + 40); nightReport.push('☢️ 微型核反应堆夜间回电 +40⚡'); }
  if (state.machines.includes('mouse_trap') && Math.random() < 0.6) {
    smartStoreItem(state, createItemInstance('raw_meat_small', { inspectedVisual: true }));
    nightReport.push('🐭 捕鼠陷阱夜间捕获小动物，产出小型生肉！');
  }
  if (modFxNight.hydro_auto > 0 && state.machines.includes('hydroponics')) {
    smartStoreItem(state, createItemInstance('nutrifruit', { inspectedVisual: true }));
    nightReport.push('🤖 水培自动模块夜间产出营养果！');
  }
  if (modFxNight.eco > 0) { state.energy = Math.min(state.maxEnergy, state.energy + 10 * modFxNight.eco); }
  if (state.perks && state.perks.positive === 'short_sleeper') { state.energy = Math.min(state.maxEnergy, state.energy + 20); }
  if (state.perks && state.perks.neutral === 'makeshift_reactor') { state.energy = Math.min(state.maxEnergy, state.energy + 10); }

  // 检查自充电零点能电池被动回电！
  const allAfter = getAllOwnedItemsWithLoc(state);
  const selfCells = allAfter.filter(x => x.item.templateId === 'self_charging_cell').length;
  if (selfCells > 0) {
    const autoGain = selfCells * 35;
    state.energy = Math.min(state.maxEnergy, state.energy + autoGain);
    nightReport.push(`⚡ ${selfCells} 枚【自充电零点能电池】夜间自动回充 +${autoGain}⚡！`);
  }

  // 检查残留放射性废料桶惩罚
  const barrelsLeft = allAfter.filter(x => x.item.templateId === 'rad_barrel').length;
  if (barrelsLeft > 0) {
    const pen = barrelsLeft * 50;
    state.credits = Math.max(0, state.credits - pen);
    state.heat = Math.min(100, state.heat + 12);
    nightReport.push(`☢️ 店内残留 ${barrelsLeft} 桶放射性废料渗漏！扣除 ${pen} CR 消辐费！`);
  }

  // 赃物热度冷却 & 液体好运持续天数递减
  for (const x of allAfter) {
    if (x.item.isStolen && x.item.heatDays > 0) {
      x.item.heatDays -= 1;
      if (x.item.heatDays <= 0) x.item.isStolen = false;
    }
  }
  if (state.luckBuffDays > 0) {
    state.luckBuffDays -= 1;
    if (state.luckBuffDays === 0) {
      state.luck = Math.max(8, state.luck - 75);
      nightReport.push('🍀 液体好运药效已消退，幸运值恢复常态。');
    }
  }

  state.energy = Math.min(state.maxEnergy, state.energy + 22);

  // 交房租结算
  if (!state.ownsShop && state.day >= state.rentDueDay) {
    if (state.credits >= state.rentAmount) {
      state.credits -= state.rentAmount;
      nightReport.push(`🏠 房东收走本期房租 **-${state.rentAmount} CR**！下期房租涨至 ${Math.round(state.rentAmount * 1.35)} CR。`);
      state.rentAmount = Math.round(state.rentAmount * 1.35);
      state.rentDueDay += 4;
      state.week += 1;
    } else {
      state.gameOver = {
        victory: false,
        endingId: 'evicted',
        title: '结局：破产违约 · 扫地出门',
        desc: `第 ${state.day} 天夜晚，你无力支付 ${state.rentAmount} CR 房租。房东焊死了当铺大门，不过你在走私者暗格里的私房货或许能帮你东山再起……`
      };
      state.phase = 'gameover';
      return { ok: true, nightReport, gameOver: state.gameOver };
    }
  }

  if (state.heat >= 100) {
    state.gameOver = { victory: false, endingId: 'raid_busted', title: '结局：查抄没收', desc: '嫌疑满格，治安部查封了你的当铺！' };
    state.phase = 'gameover';
    return { ok: true, nightReport, gameOver: state.gameOver };
  }
  if (state.augThreat >= 100) {
    state.gameOver = {
      victory: false,
      endingId: 'aug_uprising',
      title: '结局：哨兵 AI 同化第13街区',
      desc: '过多伪装的失控 AI 改造体混过你的柜台，整座空间站底层被机械蜂巢意识彻底接管。'
    };
    state.phase = 'gameover';
    return { ok: true, nightReport, gameOver: state.gameOver };
  }

  state.day += 1;
  for (const line of nightReport) addLog(state, line);
  prepareDay(state);
  return { ok: true, nightReport };
}

// 买断永久地契解锁多结局
export function buyoutShopProperty(state) {
  if (state.ownsShop) return { ok: false, msg: '已拥有永久地契' };
  if (state.credits < state.buyoutPrice) {
    return { ok: false, msg: `买断店铺地契需 ${state.buyoutPrice} CR（还差 ${state.buyoutPrice - state.credits} CR）！` };
  }

  state.credits -= state.buyoutPrice;
  state.ownsShop = true;

  let ending = {
    victory: true,
    endingId: 'kingdom_key',
    title: '结局【王国之钥】：深空自由大掌柜',
    desc: '你亲手买下了第13区当铺的永久地契！从此再无房东催租，无论是满柜套包神装还是各路黑白通吃的批发专线，整座空间站都流传着你的商业传奇。'
  };

  if (state.rep.rebel >= 45 && (state.stats.helpedSerpico || state.stats.metOdinFriendly)) {
    ending = {
      victory: true,
      endingId: 'rebel_star',
      title: '传奇结局：自由星环的地下军火库',
      desc: '在卢、奥丁与塞尔皮科的见证下，你的当铺不仅赢回了独立产权，更用源源不断的补给与脉冲武器点燃了下层解放的火炬！'
    };
  } else if (state.stats.cratesOpened >= 4 && state.rep.blackmarket >= 45) {
    ending = {
      victory: true,
      endingId: 'shadow_box_king',
      title: '黑金结局：第13区盲盒与暗巷教父',
      desc: '没有你刷不开的密封箱，也没有你的走私者伪装箱藏不住的违禁珍宝。索耶与全城大盗奉你为地下交易之王！'
    };
  } else if ((state.stats.hydroHarvested || 0) >= 20) {
    ending = { victory: true, endingId: 'hydro_king', title: '传奇结局：水培之王', desc: '你的水培作物垄断了全站市场！' };
  } else if ((state.stats.aquaHarvested || 0) >= 15) {
    ending = { victory: true, endingId: 'aqua_tycoon', title: '传奇结局：水产大亨', desc: '鱼子酱帝国崛起！' };
  } else if (state.stats.itemsCrafted >= 40) {
    ending = { victory: true, endingId: 'chem_master', title: '传奇结局：化学大师', desc: '制药酿酒传奇！' };
  } else if (state.rep.blackmarket >= 60) {
    ending = { victory: true, endingId: 'blackmarket_boss', title: '传奇结局：黑市教父', desc: '地下世界之王！' };
  } else if (state.rep.upper >= 60) {
    ending = { victory: true, endingId: 'upper_tycoon', title: '传奇结局：上层大亨', desc: '上层区顶级富豪！' };
  } else if (state.rep.security >= 60) {
    ending = { victory: true, endingId: 'security_hero', title: '传奇结局：治安英雄', desc: '治安部终身荣誉！' };
  } else if (state.rep.lower >= 60) {
    ending = { victory: true, endingId: 'lower_saint', title: '传奇结局：下层圣人', desc: '下层街坊爱戴！' };
  } else if (state.stats.augsEliminated >= 3 && state.rep.security >= 40) {
    ending = {
      victory: true,
      endingId: 'aug_hunter',
      title: '铁血结局：改造体猎手与特许皇商',
      desc: '凭着毒辣的识人眼力与柜台下的霰弹枪，你肃清了潜伏街区的 AI 改造体，荣获贸易署终身免检金章！'
    };
  }

  state.gameOver = ending;
  state.phase = 'gameover';
  addLog(state, `🏆 恭喜买下永久地契！达成结局：《${ending.title}》！`);
  return { ok: true, ending };
}

export function continueEndlessAfterVictory(state) {
  state.gameOver = null;
  state.phase = state.currentCustomer ? 'open' : 'night';
}
