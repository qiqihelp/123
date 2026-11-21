import assert from 'node:assert/strict';
import {
  createNewGameState,
  createItemInstance,
  inspectItem,
  confrontSellerFake,
  haggleWithCustomer,
  executeBuyFromCustomer,
  executeSellToCustomer,
  scanCustomerForAug,
  shootCustomerWithShotgun,
  toggleItemStorage,
  handleSecurityRaid,
  runMachineRecipe,
  scrubStolenItem,
  purchaseShopUpgrade,
  performNightActionAndSleep,
  buyoutShopProperty
} from '../game/js/engine.js';

let passed = 0;
function check(cond, name) {
  assert.ok(cond, name);
  passed++;
}

// 1. 测试 5 大职业初始化
for (const prof of ['apprentice', 'water_merchant', 'gunsmith', 'chemist', 'fence']) {
  const st = createNewGameState(prof);
  check(st.profession === prof, `Init profession ${prof}`);
  check(st.shelf.length > 0, `Starting items exist for ${prof}`);
  check(st.currentCustomer !== null, `Day 1 customer spawned for ${prof}`);
}

// 2. 测试假货鉴定与当面揭穿暴降价格
{
  const st = createNewGameState('apprentice');
  const fakeCig = createItemInstance('cig_redstar', { isFake: true });
  st.currentCustomer = {
    id: 'test_seller',
    type: 'customer',
    name: '测试拾荒客',
    faction: 'lower',
    intent: 'sell_to_shop',
    offerItem: fakeCig,
    askingPrice: 100,
    minAcceptPrice: 75,
    patience: 3,
    maxPatience: 3
  };
  const r1 = inspectItem(st, fakeCig, 'visual');
  check(r1.ok && fakeCig.inspectedVisual, 'Magnifier visual inspection works');

  const r2 = confrontSellerFake(st, fakeCig.fakeFlaw.reason);
  check(r2.ok && r2.success && st.currentCustomer.askingPrice < 40, 'Confronting fake slashes price dramatically');

  const creditsBefore = st.credits;
  const r3 = executeBuyFromCustomer(st, st.currentCustomer.askingPrice);
  check(r3.ok && st.credits < creditsBefore, 'Buying slashed item succeeds');
}

// 3. 测试秘密暗格藏匿与治安官突击搜查（藏进暗格免罚，留在货架被抄）
{
  const st = createNewGameState('fence');
  st.shelf = [createItemInstance('pulse_rifle', { inspectedVisual: true })]; // 违禁品
  st.stash = [];
  const moveRes = toggleItemStorage(st, st.shelf[0].uid);
  check(moveRes.ok && st.shelf.length === 0 && st.stash.length === 1, 'Move contraband to secret stash');

  st.currentCustomer = {
    id: 'raid_test',
    type: 'raid',
    isSecurityRaid: true,
    name: '霍克警督',
    faction: 'security',
    bribeCost: 160
  };
  const raidClean = handleSecurityRaid(st, 'comply');
  check(raidClean.ok && raidClean.clean && st.stash.length === 1, 'Stash protects contraband from raid');
}

// 4. 测试后室机器生产链（净水器 & 序列号打磨机洗白赃物）
{
  const st = createNewGameState('water_merchant');
  const beforePure = st.shelf.filter(i => i.templateId === 'pure_water').length;
  const craftRes = runMachineRecipe(st, 'purifier', 'purify_water_clean');
  const afterPure = st.shelf.filter(i => i.templateId === 'pure_water').length;
  check(craftRes.ok && afterPure === beforePure + 2, 'Water purifier produces 2 pure_water');

  const fenceSt = createNewGameState('fence');
  const stolenWatch = fenceSt.shelf.find(i => i.isStolen);
  check(Boolean(stolenWatch), 'Fence starts with a stolen item');
  const scrubRes = scrubStolenItem(fenceSt, stolenWatch.uid);
  check(scrubRes.ok && !stolenWatch.isStolen, 'Scrambler scrubs stolen tag');
}

// 5. 测试 AI 改造体扫描与霰弹枪合法击毙赏金
{
  const st = createNewGameState('gunsmith');
  st.currentCustomer = {
    id: 'aug_1',
    type: 'customer',
    name: '诡异访客',
    faction: 'lower',
    isAug: true,
    augScanned: false,
    intent: 'sell_to_shop',
    offerItem: createItemInstance('scrap_metal')
  };
  const scanRes = scanCustomerForAug(st);
  check(scanRes.ok && scanRes.isAug && st.currentCustomer.augScanned, 'Aug scanner detects rogue AI host');

  const cBefore = st.credits;
  const shotRes = shootCustomerWithShotgun(st);
  check(shotRes.ok && shotRes.correctKill && st.credits > cBefore && st.stats.augsEliminated === 1, 'Shotgun eliminates confirmed Aug and awards bounty');
}

// 6. 测试夜间行动、交租与买断产权多结局
{
  const st = createNewGameState('apprentice');
  // 清空当天队列进入夜晚
  st.customersQueue = [];
  st.currentCustomer = null;
  st.phase = 'night';
  const nightRes = performNightActionAndSleep(st, 'dump_scrapyard');
  check(nightRes.ok && st.day === 2 && st.phase === 'open', 'Night scrapyard advances to Day 2');

  st.credits = 6000;
  const buyRes = buyoutShopProperty(st);
  check(buyRes.ok && st.ownsShop && st.gameOver && st.gameOver.victory, 'Buyout unlocks victory ending');
}

console.log(`✅ All ${passed} Deepspace Pawnshop engine assertions passed!`);
