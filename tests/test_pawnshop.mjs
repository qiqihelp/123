import assert from 'node:assert/strict';
import { ITEM_TEMPLATES, WHOLESALE_MERCHANTS, CUSTOMER_ARCHETYPES } from '../game/js/data.js';
import {
  createNewGameState,
  createItemInstance,
  usedSlots,
  containerUsedSlots,
  getAllOwnedItemsWithLoc,
  moveItemToTarget,
  quickHideAllIllegal,
  openSealedCrate,
  useConsumableItem,
  unlockWholesaleMerchant,
  buyFromWholesaleMerchant,
  inspectItem,
  confrontSellerFake,
  toggleDealEntrySelection,
  getCustomerSelectedTotal,
  executeBuyFromCustomer,
  executeSellToCustomer,
  scanCustomerForAug,
  shootCustomerWithShotgun,
  handleSecurityRaid,
  runMachineRecipe,
  performNightActionAndSleep,
  buyoutShopProperty
} from '../game/js/engine.js';

let passed = 0;
function check(cond, name) {
  assert.ok(cond, name);
  passed++;
}

// 1. 验证道具池丰富度（50+ 道具、5大密封物资箱、7款套包扩容箱、15类顾客原型、5大批发商）
check(Object.keys(ITEM_TEMPLATES).length >= 50, 'At least 50 distinct item templates');
check(WHOLESALE_MERCHANTS.length >= 5, 'At least 5 wholesale merchants');
check(CUSTOMER_ARCHETYPES.length >= 15, 'At least 15 distinct customer archetypes');

// 2. 验证全部 6 大职业开局（含隐藏驯鼠人）自带套包扩容箱
for (const prof of ['apprentice', 'water_merchant', 'gunsmith', 'chemist', 'fence', 'rat_rancher']) {
  const st = createNewGameState(prof);
  check(st.profession === prof, `Init profession ${prof}`);
  const hasBag = [...st.shelf, ...st.stash].some(i => i.isContainer);
  check(hasBag, `${prof} starts with an expansion container bag`);
}

// 3. 测试暗区突围式「套包扩容箱」（占2格扩出12格 + 禁止无限套娃 + 走私者伪装箱免检防盘查）
{
  const st = createNewGameState('apprentice');
  st.shelf = [];
  st.stash = [];
  const milBag = createItemInstance('backpack_military'); // 外占2格，内扩12格
  const smugglerBox = createItemInstance('smuggler_bay'); // 外占2格，内扩9格且免检屏蔽！
  st.shelf.push(milBag, smugglerBox);
  check(usedSlots(st.shelf) === 4, 'Two large containers only occupy 4 outer shelf slots');

  // 禁止容器套进另一个容器
  const subAttempt = moveItemToTarget(st, milBag.uid, smugglerBox.uid);
  check(!subAttempt.ok, 'Prevent infinite container-inside-container nesting');

  // 往军用包里塞 6 件占1格的商品，外层主货架占用依然只占 4 格！
  for (let i = 0; i < 6; i++) {
    const w = createItemInstance('pure_water');
    st.shelf.push(w);
    const mv = moveItemToTarget(st, w.uid, milBag.uid);
    check(mv.ok, `Pack item ${i} into military bag`);
  }
  check(usedSlots(st.shelf) === 4 && containerUsedSlots(milBag) === 6, 'Outer slots remain 4 while bag holds 6 items');

  // 测试走私者伪装箱（虽摆在明面货架上，但内部装违禁品完全免疫治安官盘查！）
  const contraband = createItemInstance('dream_dust');
  st.shelf.push(contraband);
  const hideRes = quickHideAllIllegal(st);
  check(hideRes.ok && containerUsedSlots(smugglerBox) > 0, 'Quick-hide moves contraband into shielded smuggler bay');

  st.currentCustomer = {
    id: 'raid_1',
    type: 'raid',
    isSecurityRaid: true,
    name: '伦警官',
    faction: 'security',
    bribeCost: 165
  };
  const raidRes = handleSecurityRaid(st, 'comply');
  check(raidRes.ok && raidRes.clean, 'Shielded smuggler bay on shelf completely hides contraband during Security Raid');
}

// 4. 测试五类密封物资箱 + 对应部门钥匙卡 / 万能指挥官卡开箱系统
{
  const st = createNewGameState('apprentice');
  // 学徒自带后勤物资箱 + 后勤钥匙卡
  const allBefore = getAllOwnedItemsWithLoc(st);
  const crateEntry = allBefore.find(x => x.item.templateId === 'crate_service');
  check(Boolean(crateEntry), 'Apprentice has sealed service crate');

  const openRes = openSealedCrate(st, crateEntry.item.uid);
  check(openRes.ok && openRes.lootNames.length >= 2 && st.stats.cratesOpened === 1, 'Keycard opens sealed crate and spawns rolled loot');
}

// 5. 测试液体好运药水 + 5连刮刮乐彩票
{
  const st = createNewGameState('fence');
  const luckPotion = createItemInstance('liquid_luck');
  const pack5 = createItemInstance('scratcher_pack');
  st.shelf.push(luckPotion, pack5);

  const drinkRes = useConsumableItem(st, luckPotion.uid);
  check(drinkRes.ok && st.luck >= 80 && st.luckBuffDays === 3, 'Liquid Luck boosts luck by +75 for 3 days');

  const scratchRes = useConsumableItem(st, pack5.uid);
  check(scratchRes.ok, 'Scratcher 5-pack resolves cleanly');
}

// 6. 测试批发供货商电话批量采购 & 解锁暗网专线
{
  const st = createNewGameState('apprentice');
  st.credits = 2000;
  // 向 GP 矿业考尔森批量买 4 桶浑浊水整箱包
  const wsBuy = buyFromWholesaleMerchant(st, 'caulson_mining', 'dirty_water');
  check(wsBuy.ok, 'Wholesale bulk purchase of 4x dirty_water succeeds');

  // 解锁索耶地下黑市交易所并买密封工程箱
  const unl = unlockWholesaleMerchant(st, 'sawyer_exchange');
  check(unl.ok && st.unlockedMerchants.includes('sawyer_exchange'), 'Unlock Sawyer underground wholesale line');
  const buyCrate = buyFromWholesaleMerchant(st, 'sawyer_exchange', 'crate_engineering');
  check(buyCrate.ok, 'Buy sealed engineering crate from Sawyer');
}

// 7. 测试单名顾客携带多件商品：逐件鉴伪砍价 + 勾选部分购买
{
  const st = createNewGameState('apprentice');
  st.credits = 1000;
  const fakeRib = createItemInstance('rib_sandwich', { isFake: true });
  const realPlasma = createItemInstance('plasma_cartridge', { isFake: false });
  const junkWater = createItemInstance('dirty_water', { isFake: false });

  st.currentCustomer = {
    id: 'multi_seller',
    type: 'customer',
    name: '批发拾荒客',
    faction: 'lower',
    intent: 'sell_to_shop',
    offerEntries: [
      { item: fakeRib, askPrice: 150, selected: true },
      { item: realPlasma, askPrice: 300, selected: true },
      { item: junkWater, askPrice: 30, selected: true }
    ],
    haggleMult: 1.0,
    minSellMult: 0.75,
    patience: 3,
    maxPatience: 3
  };

  inspectItem(st, fakeRib, 'visual');
  const conf = confrontSellerFake(st, 0, fakeRib.fakeFlaw.reason);
  check(conf.ok && conf.success && st.currentCustomer.offerEntries[0].askPrice < 60, 'Confronting specific item #0 slashes its price');

  // 取消勾选第3件脏水，只买前2件
  toggleDealEntrySelection(st.currentCustomer, 2);
  const expectedSum = st.currentCustomer.offerEntries[0].askPrice + 300;
  check(getCustomerSelectedTotal(st.currentCustomer) === expectedSum, 'Multi-item selection total updates accurately');

  const buyMulti = executeBuyFromCustomer(st);
  check(buyMulti.ok, 'Executing multi-item selective purchase succeeds');
}

// 8. 测试驯鼠人培育舱产特级生肉 & 夜间行动 & 买断地契
{
  const st = createNewGameState('rat_rancher');
  const breedRes = runMachineRecipe(st, 'rat_cage', 'breed_meat_morsel');
  check(breedRes.ok, 'Rat rancher breeds 2x premium raw meat');

  st.customersQueue = [];
  st.currentCustomer = null;
  st.phase = 'night';
  const nightRes = performNightActionAndSleep(st, 'underground_crate');
  check(nightRes.ok && st.day === 2, 'Night underground crate pack advances to Day 2');

  st.credits = 7000;
  const winRes = buyoutShopProperty(st);
  check(winRes.ok && st.ownsShop && st.gameOver.victory, 'Buyout deed triggers victory ending');
}

console.log(`✅ All ${passed} Deepspace Pawnshop 2.0 assertions passed!`);
