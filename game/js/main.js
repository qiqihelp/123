// ============================================================================
// 《深空当铺：可能是偷的》2.0 视图与交互控制器
// 支持：强制横屏全屏切换、套包扩容箱展开独立子仓库、密封箱刷卡开箱、刮刮乐、
// 单顾客多物品勾选与整单议价、电话大宗批发商订货
// ============================================================================

import {
  FACTIONS,
  PROFESSIONS,
  ITEM_TEMPLATES,
  WHOLESALE_MERCHANTS,
  MACHINES,
  UPGRADES_AND_LICENSES,
  DIFFICULTIES,
  PERKS_POSITIVE,
  PERKS_NEGATIVE,
  PERKS_NEUTRAL,
  NEWSPAPER_EVENTS
} from './data.js';

import {
  createNewGameState,
  evaluateItemFairPrice,
  getItemIllegalityReason,
  usedSlots,
  containerUsedSlots,
  itemSlotCost,
  getAllOwnedItemsWithLoc,
  getShopSellableItems,
  moveItemToTarget,
  quickHideAllIllegal,
  openSealedCrate,
  useConsumableItem,
  unlockWholesaleMerchant,
  buyFromWholesaleMerchant,
  getCustomerSelectedTotal,
  toggleDealEntrySelection,
  inspectItem,
  inspectAllSellerItems,
  confrontSellerFake,
  haggleWithCustomer,
  executeBuyFromCustomer,
  executeSellToCustomer,
  fulfillAppraisal,
  refuseCustomer,
  scanCustomerForAug,
  shootCustomerWithShotgun,
  reportWantedCustomer,
  handleSecurityRaid,
  resolveStoryChoice,
  runMachineRecipe,
  scrubStolenItem,
  purchaseShopUpgrade,
  performNightActionAndSleep,
  buyoutShopProperty,
  continueEndlessAfterVictory
} from './engine.js';

import { sfx, drawCustomerPortrait } from './audio_art.js';

const SAVE_KEY = 'deepspace_pawnshop_save_v2';

const CATEGORY_NAMES = {
  supply: '民生食品补给',
  medical: '化学医疗制剂',
  weapon: '军火武器弹药',
  luxury: '上层奢侈古董',
  tech: '工程赛博组件',
  material: '工业原料耗材',
  contraband: '黑市违禁硬货',
  crate: '密封物资盲盒箱',
  container: '套包扩容箱'
};

let gameState = null;
let activeTab = 'inventory'; // 'inventory' | 'merchants' | 'workshop' | 'upgrades' | 'guide'
let openedContainerUid = null; // 当前点击展开查看的套包扩容箱 UID！
let openConfrontIdx = null;    // 当前打开假货质询下拉面板的条目索引
let animTick = 0;

// ----------------------------------------------------------------------------
// 全屏 & 强制横屏锁定 API
// ----------------------------------------------------------------------------
async function toggleFullscreenLandscape() {
  try {
    const docEl = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
      if (screen.orientation && screen.orientation.lock) {
        try { await screen.orientation.lock('landscape'); } catch (_) {}
      }
      showToast('已开启全屏横屏沉浸模式！', 'good');
    } else {
      if (document.exitFullscreen) await document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  } catch (_) {
    showToast('当前浏览器内嵌环境限制原生全屏，已自动启用视口 100% 横屏布局！', 'info');
  }
}

function showToast(msg, kind = 'info') {
  const box = document.getElementById('toast-container');
  if (!box) return;
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.25s';
    setTimeout(() => el.remove(), 260);
  }, 3400);
}

function saveGame() {
  if (!gameState) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(gameState)); } catch (_) {}
}

function loadSavedGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 2) return parsed;
  } catch (_) {}
  return null;
}

// ----------------------------------------------------------------------------
// 开局 6 大职业选择弹窗
// ----------------------------------------------------------------------------
function openStartModal(allowClose = false) {
  const modal = document.getElementById('start-modal');
  modal.classList.remove('hidden');

  const saved = loadSavedGame();
  const resumeBtn = document.getElementById('btn-resume-save');
  if (saved && !saved.gameOver) {
    resumeBtn.classList.remove('hidden');
    resumeBtn.textContent = `📂 继续存档 (第${saved.day}天 · ${saved.professionName} · ${saved.credits} CR)`;
  resumeBtn.onclick = () => {
    sfx.play('click');
    toggleFullscreenLandscape().then(() => {
      modal.classList.add('hidden');
      renderAll();
    }).catch(() => {
      modal.classList.add('hidden');
      renderAll();
    });
    gameState = saved;
  };
  } else {
    resumeBtn.classList.add('hidden');
  }

  const closeBtn = document.getElementById('btn-close-start');
  if (allowClose && gameState) {
    closeBtn.classList.remove('hidden');
    closeBtn.onclick = () => modal.classList.add('hidden');
  } else {
    closeBtn.classList.add('hidden');
  }

  const grid = document.getElementById('prof-grid');
  grid.innerHTML = PROFESSIONS.map(p => `
    <div class="prof-card" data-prof="${p.id}">
      <div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:22px;">${p.icon}</span>
          <span class="badge badge-cyan">${p.subtitle}</span>
        </div>
        <h3 style="font-size:14.5px;color:${p.color};margin-bottom:4px;">${p.name}</h3>
        <p style="font-size:11.5px;color:#cbd5e1;margin-bottom:7px;">${p.desc}</p>
        <ul style="list-style:none;font-size:11px;color:#94a3b8;display:flex;flex-direction:column;gap:3px;">
          ${p.perks.map(pk => `<li>✦ ${pk}</li>`).join('')}
        </ul>
      </div>
      <button class="btn-primary" style="width:100%;">选择【${p.name}】开店</button>
    </div>
  `).join('');

  grid.querySelectorAll('.prof-card').forEach(card => {
    card.onclick = () => {
      const profId = card.getAttribute('data-prof');
      const diffSelect = document.getElementById('diff-select');
      const perkPosSelect = document.getElementById('perk-pos-select');
      const perkNegSelect = document.getElementById('perk-neg-select');
      const perkNeuSelect = document.getElementById('perk-neu-select');
      const diffId = diffSelect ? diffSelect.value : 'markup';
      const perkPos = perkPosSelect ? perkPosSelect.value : null;
      const perkNeg = perkNegSelect ? perkNegSelect.value : null;
      const perkNeu = perkNeuSelect ? perkNeuSelect.value : null;
      sfx.play('door');
      toggleFullscreenLandscape().then(() => {
        modal.classList.add('hidden');
        renderAll();
      }).catch(() => {
        modal.classList.add('hidden');
        renderAll();
      });
      gameState = createNewGameState(profId, { difficulty: diffId, perkPositive: perkPos, perkNegative: perkNeg, perkNeutral: perkNeu });
      const firstBag = [...gameState.shelf, ...gameState.stash].find(i => i.isContainer);
      openedContainerUid = firstBag ? firstBag.uid : null;
      openConfrontIdx = null;
      saveGame();
      showToast(`欢迎掌柜！已为你自动展开身上的【${firstBag ? firstBag.name : '货架'}】套包空间！`, 'good');
    };
  });
}

// ----------------------------------------------------------------------------
// 全界面同步渲染
// ----------------------------------------------------------------------------
function renderAll() {
  if (!gameState) return;
  renderTopBar();
  renderLeftPanel();
  renderCenterStage();
  renderRightTabs();
  renderGameOverModal();
  saveGame();
}

function renderTopBar() {
  const s = gameState;
  const daysLeft = Math.max(0, s.rentDueDay - s.day);
  const rentText = s.ownsShop
    ? '🏆 免房租永久产权'
    : `房租 ${s.rentAmount} (${daysLeft === 0 ? '今晚收!' : `剩${daysLeft}天`})`;

  document.getElementById('hud-day').textContent = `第 ${s.day} 天 · ${s.phase === 'night' ? '🌙 夜晚整备' : '🏮 营业中'} · ${s.professionName}`;
  document.getElementById('hud-credits').textContent = `💰 ${s.credits} CR`;
  document.getElementById('hud-rent').textContent = `🏠 ${rentText}`;
  document.getElementById('hud-energy').textContent = `⚡ ${s.energy}/${s.maxEnergy}`;
  document.getElementById('hud-luck').textContent = `🍀 幸运 ${s.luck || 0}${s.luckBuffDays > 0 ? `(药效${s.luckBuffDays}天)` : ''}`;
  document.getElementById('hud-heat').textContent = `🚨 嫌疑 ${s.heat}%`;

  const diffEl = document.getElementById('difficulty-badge');
  if (diffEl) {
    const diff = DIFFICULTIES.find(d => d.id === s.difficulty) || DIFFICULTIES[1];
    diffEl.textContent = diff.icon + ' ' + diff.name;
    diffEl.style.color = diff.id === 'gouge' ? '#10b981' : diff.id === 'markup' ? '#3b82f6' : diff.id === 'thin_margins' ? '#f59e0b' : '#ef4444';
  }
  const perkEl = document.getElementById('perks-badge');
  if (perkEl) {
    const p = s.perks;
    const names = [
      p.positive ? (ITEM_TEMPLATES[p.positive]?.name || PERKS_POSITIVE.find(x=>x.id===p.positive)?.name || '') : '',
      p.negative ? (ITEM_TEMPLATES[p.negative]?.name || PERKS_NEGATIVE.find(x=>x.id===p.negative)?.name || '') : '',
      p.neutral ? (ITEM_TEMPLATES[p.neutral]?.name || PERKS_NEUTRAL.find(x=>x.id===p.neutral)?.name || '') : ''
    ].filter(Boolean);
    perkEl.textContent = names.length ? names.join(' · ') : '无特性';
  }
  const modEl = document.getElementById('modules-badge');
  if (modEl) {
    modEl.textContent = `⚙️ ${s.modules ? s.modules.length : 0}/${s.moduleMaxSlots || 4}`;
  }
  const newsEl = document.getElementById('newspaper-badge');
  if (newsEl && s.newspaper) {
    newsEl.textContent = s.newspaper.headline;
    newsEl.title = s.newspaper.desc;
  }
  document.getElementById('hud-aug').textContent = `🤖 AI ${s.augThreat}%`;

  const buyoutBtn = document.getElementById('btn-buyout');
  if (s.ownsShop) {
    buyoutBtn.textContent = '🏆 已拥有地契';
    buyoutBtn.disabled = true;
  } else {
    buyoutBtn.textContent = `🔑 买断地契(${s.buyoutPrice})`;
    buyoutBtn.disabled = s.credits < s.buyoutPrice;
  }
}

function renderLeftPanel() {
  const s = gameState;
  document.getElementById('market-hot').innerHTML = `
    📈 今日紧俏溢价 (+25%)：<strong style="color:#4ade80;">${CATEGORY_NAMES[s.hotCategory] || '民生补给'}</strong>
  `;

  const w = s.dailyWanted;
  document.getElementById('wanted-box').innerHTML = w ? `
    <div style="display:flex;justify-content:space-between;color:#fca5a5;font-weight:700;font-size:11.5px;">
      <span>🚨 治安悬赏通缉</span>
      <span>+${w.bounty} CR</span>
    </div>
    <div style="font-size:12px;color:#f8fafc;font-weight:700;margin-top:2px;">${w.name}</div>
    <div style="font-size:11px;color:#fde047;margin-top:2px;">特征：${w.mark}</div>
  ` : '';

  document.getElementById('faction-list').innerHTML = Object.values(FACTIONS).map(f => {
    const val = s.rep[f.id] || 0;
    const pct = Math.max(4, Math.min(100, ((val + 50) / 150) * 100));
    const unlocked = val >= f.perkThreshold;
    return `
      <div class="faction-row" title="${f.desc}\n${f.perkDesc}">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;">
          <span style="color:${f.color};font-weight:700;">${f.name} ${unlocked ? '★特权' : ''}</span>
          <span style="font-family:var(--font-mono);">${val}</span>
        </div>
        <div class="rep-bar-bg">
          <div class="rep-bar-fill" style="width:${pct}%;background:${f.color};"></div>
        </div>
      </div>
    `;
  }).join('');

  document.getElementById('log-box').innerHTML = s.logs.slice(0, 30).map(l => `<div class="log-entry">${l}</div>`).join('');
}

// ----------------------------------------------------------------------------
// 中央当铺柜台区渲染（支持单名顾客 1~4 件商品批量/勾选交易与逐件鉴伪！）
// ----------------------------------------------------------------------------
function renderCenterStage() {
  const s = gameState;
  const stageContainer = document.getElementById('center-content');
  const underMount = document.getElementById('under-counter-mount');
  const queueInfo = document.getElementById('queue-counter');

  if (s.phase === 'night') {
    queueInfo.textContent = '🌙 打烊整备时段';
    underMount.innerHTML = '';
    drawCustomerPortrait(document.getElementById('customer-canvas'), null, animTick);
    document.getElementById('customer-badges').innerHTML = `<span class="badge badge-purple">打烊整备</span>`;
    document.getElementById('customer-meta').innerHTML = `
      <h3 style="font-size:15px;color:#e2e8f0;margin-bottom:5px;">第 ${s.day} 天夜晚 · 后室整备与外出行动</h3>
      <div class="dialogue-bubble">
        卷帘门已关闭。你可以先在右侧<strong>打开密封物资箱、刮彩票、向电话批发商订货、或开动机器生产</strong>，再选择下方一项夜间行动进入明天！
        ${(!s.ownsShop && s.day >= s.rentDueDay) ? `<div style="margin-top:6px;color:#fda4af;font-weight:700;">⚠️ 今晚房东将收缴房租 ${s.rentAmount} CR！（当前持有 ${s.credits} CR）</div>` : ''}
      </div>
    `;

    const hasBarrel = getAllOwnedItemsWithLoc(s).some(x => x.item.templateId === 'rad_barrel');
    stageContainer.innerHTML = `
      <div class="deal-card">
        <h4 style="color:var(--neon-cyan);margin-bottom:8px;">🌃 选择夜间行动（执行后进入第 ${s.day + 1} 天）</h4>
        <div style="display:grid;gap:7px;">
          <div class="recipe-box">
            <div>
              <div style="font-weight:700;color:#86efac;">🗑️ 前往垃圾倾倒场翻找物资 ${hasBarrel ? '<span class="badge badge-red">顺便倾倒放射性废料桶!</span>' : ''}</div>
              <div style="font-size:11.5px;color:#94a3b8;">免费翻出 3~4 件原料/彩票/甚至后勤箱与钥匙卡，并安全丢弃所有高危放射性废料桶。</div>
            </div>
            <button class="btn-success" id="act-night-scrap">出发拾荒</button>
          </div>

          <div class="recipe-box">
            <div>
              <div style="font-weight:700;color:#e9d5ff;">🎁 地下交易所盲盒套组暗拍 (-160 CR)</div>
              <div style="font-size:11.5px;color:#94a3b8;">必得 1 个【随机部门密封物资箱】+ 1 张【配套部门钥匙卡】！回店即可刷卡爽开箱！</div>
            </div>
            <button class="btn-purple" id="act-night-crate" ${s.credits < 160 ? 'disabled' : ''}>买箱+卡套组</button>
          </div>

          <div class="recipe-box">
            <div>
              <div style="font-weight:700;color:#7dd3fc;">⚡ 留店检修聚变电容 & 消除案底</div>
              <div style="font-size:11.5px;color:#94a3b8;">电力大幅恢复 +65⚡（另加基础回电 +22⚡），治安局嫌疑值 -18%。</div>
            </div>
            <button class="btn-primary" id="act-night-rest">留店休整</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('act-night-scrap').onclick = () => triggerNight('dump_scrapyard');
    document.getElementById('act-night-crate').onclick = () => triggerNight('underground_crate');
    document.getElementById('act-night-rest').onclick = () => triggerNight('rest_recharge');
    return;
  }

  // 营业阶段
  const c = s.currentCustomer;
  queueInfo.textContent = `门外排队：还有 ${s.customersQueue.length} 位访客`;
  drawCustomerPortrait(document.getElementById('customer-canvas'), c, animTick);

  if (!c) {
    stageContainer.innerHTML = '';
    underMount.innerHTML = '';
    return;
  }

  const fac = FACTIONS[c.faction] || FACTIONS.lower;
  let badgesHtml = `<span class="badge" style="background:#0a101d;color:${fac.color};border-color:${fac.color};">${fac.short}</span>`;
  if (c.isSecurityRaid) badgesHtml += `<span class="badge badge-red">突击盘查</span>`;
  if (c.type === 'story') badgesHtml += `<span class="badge badge-amber">剧情人物</span>`;
  if (c.isOdin) badgesHtml += `<span class="badge badge-green">电话:51189</span>`;
  if (c.augScanned) {
    badgesHtml += c.isAug
      ? `<span class="badge badge-red">🤖 确认改造体!</span>`
      : `<span class="badge badge-green">✅ 人类</span>`;
  }
  document.getElementById('customer-badges').innerHTML = badgesHtml;

  document.getElementById('customer-meta').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
      <div>
        <span style="font-size:15px;font-weight:800;color:#f8fafc;">${c.name}</span>
        <span style="font-size:11.5px;color:#94a3b8;margin-left:5px;">· ${c.roleName}</span>
      </div>
      ${c.patience ? `<span style="font-size:11.5px;color:#fbbf24;">耐心 ${'★'.repeat(c.patience)}${'☆'.repeat(Math.max(0, c.maxPatience - c.patience))}</span>` : ''}
    </div>
    <div class="dialogue-bubble">${c.dialogue}</div>
    ${c.behaviorNote ? `<div class="behavior-clue">👁️ <strong>观察：</strong>${c.behaviorNote}${getVisualAugHintText(c)}</div>` : ''}
  `;

  // 1. 剧情角色
  if (c.type === 'story') {
    underMount.innerHTML = '';
    stageContainer.innerHTML = `
      <div class="deal-card">
        <h4 style="color:#fbbf24;margin-bottom:7px;">🎭 剧情抉择</h4>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${c.choices.map((ch, idx) => `
            <button class="${idx === 0 ? 'btn-primary' : ''}" data-story-eff="${ch.effect}" style="text-align:left;padding:8px 10px;white-space:normal;">
              ➤ ${ch.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    stageContainer.querySelectorAll('[data-story-eff]').forEach(btn => {
      btn.onclick = () => {
        const res = resolveStoryChoice(s, btn.getAttribute('data-story-eff'));
        sfx.play(res.ok ? 'coin' : 'fail');
        showToast(res.msg, res.ok ? 'good' : 'warn');
        renderAll();
      };
    });
    return;
  }

  // 2. 治安部突击盘查
  if (c.isSecurityRaid) {
    underMount.innerHTML = '';
    const exposed = getAllOwnedItemsWithLoc(s).filter(x => !x.shieldedFromRaid && getItemIllegalityReason(x.item, s) !== null);
    stageContainer.innerHTML = `
      <div class="deal-card" style="border-color:#ef4444;">
        <h4 style="color:#fca5a5;margin-bottom:6px;">🚨 治安部突击盘查！</h4>
        <p style="font-size:12px;color:#cbd5e1;margin-bottom:9px;">
          当前非屏蔽明面区共有 <strong style="color:${exposed.length ? '#f87171' : '#4ade80'};">${exposed.length} 件</strong> 违规/无证/赃物暴露在外！
          （装在<strong>走私者免检伪装箱</strong>或<strong>秘密暗格</strong>内的物品绝对安全！）
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          ${exposed.length > 0 ? `<button class="btn-purple" id="btn-raid-quickhide">🕵️ 一键把违规品塞入免检暗仓!</button>` : ''}
          <button class="btn-primary" id="btn-raid-comply">👐 打开货架配合检查</button>
          <button class="btn-amber" id="btn-raid-bribe">🤫 塞钱消灾 (-${c.bribeCost} CR)</button>
        </div>
      </div>
    `;
    const qh = document.getElementById('btn-raid-quickhide');
    if (qh) {
      qh.onclick = () => {
        const res = quickHideAllIllegal(s);
        sfx.play(res.ok ? 'craft' : 'fail');
        showToast(res.msg, res.ok ? 'good' : 'warn');
        renderAll();
      };
    }
    document.getElementById('btn-raid-comply').onclick = () => {
      const res = handleSecurityRaid(s, 'comply');
      sfx.play(res.clean ? 'coin' : 'alert');
      showToast(res.msg, res.clean ? 'good' : 'warn');
      renderAll();
    };
    document.getElementById('btn-raid-bribe').onclick = () => {
      const res = handleSecurityRaid(s, 'bribe');
      sfx.play(res.ok ? 'coin' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
    return;
  }

  // 3. 多物品买卖 / 鉴定委托顾客
  if (c.intent === 'empty_leave') {
    stageContainer.innerHTML = `
      <div class="deal-card">
        <p style="color:#94a3b8;margin-bottom:8px;">主货架和公开箱包里没有顾客可买的商品（也可去电话批发商随时进货！）。</p>
        <button class="btn-primary" id="btn-refuse">👋 送走顾客</button>
      </div>
    `;
  } else if (c.intent === 'appraise_request') {
    const item = c.offerEntries[0].item;
    stageContainer.innerHTML = `
      <div class="deal-card">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span class="badge badge-amber">🏅 鉴定委员会专单（判真伪直接拿高额佣金）</span>
        </div>
        <div class="multi-item-row">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:26px;">${item.icon}</span>
            <div style="flex:1;">
              <div style="font-weight:700;color:#f8fafc;">${item.name}</div>
              <div style="font-size:11.5px;color:#94a3b8;">${item.desc}</div>
            </div>
            <button data-insp-vis="0" ${item.inspectedVisual ? 'disabled' : ''}>🔍 放大镜(免费)</button>
            <button data-insp-deep="0" ${item.inspectedDeep ? 'disabled' : ''}>🔬 光谱(-10⚡)</button>
          </div>
          ${renderInspectionReportHtml(item)}
        </div>
        <div class="haggle-bar">
          <button class="btn-success" id="btn-appraise-true">✅ 判定：原装真品</button>
          <button class="btn-danger" id="btn-appraise-fake">❌ 判定：伪造赝品</button>
          <button id="btn-refuse">👋 婉拒</button>
        </div>
      </div>
    `;
  } else if (c.intent === 'sell_to_shop') {
    // 卖家带来 1~4 件商品！支持一键全检、单件挑瑕疵压价、勾选想买的那几件！
    const selCount = c.offerEntries.filter(e => e.selected).length;
    const totalAsk = getCustomerSelectedTotal(c);
    const anyUninspected = c.offerEntries.some(e => !e.item.inspectedVisual);

    stageContainer.innerHTML = `
      <div class="deal-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;gap:6px;">
          <span class="badge badge-cyan">📥 卖家共拿出 ${c.offerEntries.length} 件货品（可勾选挑着买！）</span>
          ${anyUninspected ? `<button class="btn-primary" id="btn-insp-all">🔍 放大镜一键全检 (${c.offerEntries.length}件免费)</button>` : `<span style="font-size:11px;color:#86efac;">✓ 外观已全部过眼</span>`}
        </div>

        ${c.offerEntries.map((entry, idx) => {
          const item = entry.item;
          const tpl = ITEM_TEMPLATES[item.templateId];
          const fair = evaluateItemFairPrice(item, s);
          const showConfront = openConfrontIdx === idx && item.inspectedVisual && !item.confronted;
          return `
            <div class="multi-item-row ${entry.selected ? '' : 'unselected'}">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <input type="checkbox" data-toggle-idx="${idx}" ${entry.selected ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;" title="勾选是否购买此件">
                <span style="font-size:24px;">${item.icon}</span>
                <div style="flex:1;min-width:130px;">
                  <div style="font-weight:700;color:#f8fafc;font-size:12.5px;">
                    ${item.name}
                    <span style="font-size:10.5px;color:#94a3b8;font-weight:400;">(占${item.slots}格 · 估值~${fair})</span>
                    ${(item.inspectedVisual || item.inspectedDeep) && item.isStolen ? '<span class="badge badge-amber">赃物</span>' : ''}
                    ${item.confronted && item.isFake ? '<span class="badge badge-red">已揭穿暴降!</span>' : ''}
                  </div>
                  <div style="font-size:11px;color:#94a3b8;">${item.desc}</div>
                </div>

                <div style="display:flex;align-items:center;gap:4px;">
                  <button data-insp-vis="${idx}" ${item.inspectedVisual ? 'disabled' : ''}>🔍</button>
                  <button data-insp-deep="${idx}" ${item.inspectedDeep ? 'disabled' : ''} title="光谱仪深度透视(-10⚡)">🔬</button>
                  ${(item.inspectedVisual && !item.confronted && tpl.fakeSigns && tpl.fakeSigns.length > 0) ? `
                    <button class="btn-amber" data-open-conf="${idx}">⚡揭穿假货</button>
                  ` : ''}
                  <span style="font-family:var(--font-mono);font-size:14px;font-weight:800;color:#fde047;min-width:62px;text-align:right;">
                    ${Math.round(entry.askPrice * (c.haggleMult || 1))} CR
                  </span>
                </div>
              </div>

              ${renderInspectionReportHtml(item)}

              ${showConfront ? `
                <div style="background:#1c1124;border:1px solid #f59e0b;border-radius:5px;padding:6px;margin-top:5px;">
                  <div style="font-size:11px;color:#fcd34d;margin-bottom:4px;font-weight:700;">指出确凿伪造证据（选对单价暴砍 ~70%）：</div>
                  <div style="display:flex;flex-direction:column;gap:4px;">
                    ${tpl.fakeSigns.map(fs => `
                      <button data-conf-idx="${idx}" data-conf-reason="${fs.reason}" style="text-align:left;font-size:11px;white-space:normal;">
                        ❗ 指控：${fs.reason}
                      </button>
                    `).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}

        <div class="haggle-bar">
          <button class="btn-success" id="btn-buy-direct" ${selCount === 0 ? 'disabled' : ''}>
            💰 买下已选 ${selCount} 件 (共 ${totalAsk} CR)
          </button>
          <div style="display:flex;align-items:center;gap:4px;">
            <input type="number" id="inp-haggle" class="price-input" value="${Math.max(5, Math.round(totalAsk * 0.82))}" min="5" max="99999">
            <button class="btn-primary" id="btn-haggle-sub" ${selCount === 0 ? 'disabled' : ''}>🗣️ 整单砍价</button>
          </div>
          <button id="btn-refuse" style="margin-left:auto;">👋 不买送客</button>
        </div>
      </div>
    `;
  } else if (c.intent === 'buy_from_shop') {
    // 买家一次看中你店里的 1~4 件商品！可自由勾选卖哪几件！
    const sellableMap = new Map(getShopSellableItems(s).map(i => [i.uid, i]));
    const selCount = c.buyEntries.filter(e => e.selected).length;
    const totalOffer = getCustomerSelectedTotal(c);
    const anyIllegal = c.buyEntries.some(e => {
      const it = sellableMap.get(e.itemUid);
      return e.selected && it && getItemIllegalityReason(it, s) !== null;
    });

    stageContainer.innerHTML = `
      <div class="deal-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;flex-wrap:wrap;gap:6px;">
          <span class="badge badge-green">📤 买家想打包求购 ${c.buyEntries.length} 件商品（可勾选出售）</span>
          ${anyIllegal ? `<span class="badge badge-red">⚠️ 含管制/违禁品：警惕便衣钓鱼！</span>` : ''}
        </div>

        ${c.buyEntries.map((entry, idx) => {
          const item = sellableMap.get(entry.itemUid);
          if (!item) return '';
          const ill = getItemIllegalityReason(item, s);
          return `
            <div class="multi-item-row ${entry.selected ? '' : 'unselected'}">
              <div style="display:flex;align-items:center;gap:8px;">
                <input type="checkbox" data-toggle-idx="${idx}" ${entry.selected ? 'checked' : ''} style="width:16px;height:16px;cursor:pointer;">
                <span style="font-size:22px;">${item.icon}</span>
                <div style="flex:1;">
                  <div style="font-weight:700;color:#f8fafc;font-size:12.5px;">
                    ${item.name}
                    ${item.isFake ? '<span class="badge badge-red">赝品</span>' : ''}
                    ${item.isStolen ? '<span class="badge badge-amber">赃物</span>' : ''}
                    ${ill ? '<span class="badge badge-red">违规</span>' : ''}
                  </div>
                  <div style="font-size:11px;color:#94a3b8;">市价基准: ${item.baseValue} CR</div>
                </div>
                <div style="font-family:var(--font-mono);font-size:14px;font-weight:800;color:#4ade80;">
                  +${Math.round(entry.unitOffer * (c.haggleMult || 1))} CR
                </div>
              </div>
            </div>
          `;
        }).join('')}

        <div class="haggle-bar">
          <button class="btn-success" id="btn-sell-direct" ${selCount === 0 ? 'disabled' : ''}>
            💵 出售已选 ${selCount} 件 (收款 +${totalOffer} CR)
          </button>
          <div style="display:flex;align-items:center;gap:4px;">
            <input type="number" id="inp-haggle" class="price-input" value="${Math.round(totalOffer * 1.18)}" min="5" max="99999">
            <button class="btn-primary" id="btn-haggle-sub" ${selCount === 0 ? 'disabled' : ''}>📈 整单加价</button>
          </div>
          <button id="btn-refuse" style="margin-left:auto;">👋 不卖送客</button>
        </div>
      </div>
    `;
  }

  // 底部固定挂载柜台下安防系统
  underMount.innerHTML = `
    <div class="under-counter-bar">
      <span style="font-size:11.5px;color:#fda4af;font-weight:700;">🛡️ 柜台下安防：</span>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        <button id="btn-aug-scan">📡 AI扫描(-20⚡)</button>
        <button class="btn-amber" id="btn-report-wanted">🚨 举报通缉犯</button>
        <button class="btn-danger" id="btn-shotgun">💥 霰弹枪击毙</button>
      </div>
    </div>
  `;

  bindCounterEvents(s, c);
}

function getVisualAugHintText(c) {
  if (!c.isAug) return '';
  if (c.augVisualType === 'chip') return ' <span style="color:#fda4af;">(右耳后闪烁红光芯片!)</span>';
  if (c.augVisualType === 'pupil') return ' <span style="color:#67e8f9;">(双瞳异色反光且不眨眼!)</span>';
  if (c.augVisualType === 'smile') return ' <span style="color:#fda4af;">(嘴角呈机械固定假笑!)</span>';
  return '';
}

function renderInspectionReportHtml(item) {
  const tpl = ITEM_TEMPLATES[item.templateId];
  if (!item.inspectedVisual && !item.inspectedDeep) return '';

  const lines = [];
  const signs = tpl.authenticSigns || {};
  const keys = Object.keys(signs);

  keys.forEach((k, idx) => {
    const isFlawHere = item.isFake && item.fakeFlaw && item.fakeFlaw.key === k;
    const hiddenWithoutDeep = (idx >= 2 && !item.inspectedDeep && !isFlawHere);
    if (hiddenWithoutDeep) {
      lines.push(`<div style="color:#64748b;">• [深层指标需光谱仪透视]</div>`);
    } else if (isFlawHere) {
      lines.push(`<div class="finding-Sus">⚠️ 造假破绽：${item.fakeFlaw.badText}</div>`);
    } else {
      lines.push(`<div class="finding-ok">✓ 正常：${signs[k]}</div>`);
    }
  });

  if (item.inspectedDeep) {
    lines.push(`<div style="color:#38bdf8;margin-top:3px;border-top:1px dashed #1e293b;padding-top:3px;">
      🔬 光谱结论：${item.isFake ? '❌ 伪造赝品！' : '✅ 100% 原厂正品'} · ${item.isStolen ? `⚠️ 赃物追踪码(剩${item.heatDays}天)` : '无追踪码'}
    </div>`);
  }

  return `<div class="inspect-findings">${lines.join('')}</div>`;
}

function bindCounterEvents(s, c) {
  document.querySelectorAll('[data-toggle-idx]').forEach(chk => {
    chk.onchange = () => {
      sfx.play('click');
      toggleDealEntrySelection(c, Number(chk.getAttribute('data-toggle-idx')));
      renderCenterStage();
    };
  });

  const btnInspAll = document.getElementById('btn-insp-all');
  if (btnInspAll) {
    btnInspAll.onclick = () => {
      const res = inspectAllSellerItems(s);
      sfx.play('scan');
      showToast(res.msg, 'info');
      renderAll();
    };
  }

  document.querySelectorAll('[data-insp-vis]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.getAttribute('data-insp-vis'));
      const res = inspectItem(s, c.offerEntries[idx].item, 'visual');
      sfx.play('scan');
      showToast(res.msg, 'info');
      renderAll();
    };
  });

  document.querySelectorAll('[data-insp-deep]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.getAttribute('data-insp-deep'));
      const res = inspectItem(s, c.offerEntries[idx].item, 'deep');
      sfx.play(res.ok ? 'scan' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
  });

  document.querySelectorAll('[data-open-conf]').forEach(btn => {
    btn.onclick = () => {
      sfx.play('click');
      const idx = Number(btn.getAttribute('data-open-conf'));
      openConfrontIdx = (openConfrontIdx === idx) ? null : idx;
      renderCenterStage();
    };
  });

  document.querySelectorAll('[data-conf-idx]').forEach(btn => {
    btn.onclick = () => {
      const idx = Number(btn.getAttribute('data-conf-idx'));
      const reason = btn.getAttribute('data-conf-reason');
      openConfrontIdx = null;
      const res = confrontSellerFake(s, idx, reason);
      sfx.play(res.success ? 'coin' : 'alert');
      showToast(res.msg, res.success ? 'good' : 'warn');
      renderAll();
    };
  });

  const btnBuy = document.getElementById('btn-buy-direct');
  if (btnBuy) {
    btnBuy.onclick = () => {
      openConfrontIdx = null;
      const res = executeBuyFromCustomer(s);
      sfx.play(res.ok ? 'coin' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
  }

  const btnSell = document.getElementById('btn-sell-direct');
  if (btnSell) {
    btnSell.onclick = () => {
      const res = executeSellToCustomer(s);
      sfx.play(res.stingCaught ? 'alert' : 'coin');
      showToast(res.msg, res.stingCaught ? 'warn' : 'good');
      renderAll();
    };
  }

  const btnHaggle = document.getElementById('btn-haggle-sub');
  if (btnHaggle) {
    btnHaggle.onclick = () => {
      const val = document.getElementById('inp-haggle').value;
      const res = haggleWithCustomer(s, val);
      sfx.play(res.left ? 'fail' : 'click');
      showToast(res.msg, res.left ? 'warn' : 'info');
      renderAll();
    };
  }

  const btnAppTrue = document.getElementById('btn-appraise-true');
  if (btnAppTrue) btnAppTrue.onclick = () => { sfx.play('coin'); showToast(fulfillAppraisal(s, true).msg, 'info'); renderAll(); };
  const btnAppFake = document.getElementById('btn-appraise-fake');
  if (btnAppFake) btnAppFake.onclick = () => { sfx.play('coin'); showToast(fulfillAppraisal(s, false).msg, 'info'); renderAll(); };

  const btnRefuse = document.getElementById('btn-refuse');
  if (btnRefuse) {
    btnRefuse.onclick = () => {
      openConfrontIdx = null;
      sfx.play('door');
      showToast(refuseCustomer(s).msg, 'info');
      renderAll();
    };
  }

  const btnScan = document.getElementById('btn-aug-scan');
  if (btnScan) {
    btnScan.onclick = () => {
      const res = scanCustomerForAug(s);
      sfx.play(res.ok ? (res.isAug ? 'alert' : 'scan') : 'fail');
      showToast(res.msg, res.isAug ? 'warn' : 'info');
      renderAll();
    };
  }

  const btnReport = document.getElementById('btn-report-wanted');
  if (btnReport) {
    btnReport.onclick = () => {
      const res = reportWantedCustomer(s);
      sfx.play('alert');
      showToast(res.msg, 'info');
      renderAll();
    };
  }

  const btnShotgun = document.getElementById('btn-shotgun');
  if (btnShotgun) {
    btnShotgun.onclick = () => {
      if (!c.augScanned) {
        if (!window.confirm(`⚠️ 尚未用扫描仪验证【${c.name}】是否为 AI 改造体！误杀活人将重罚 360 CR！确认开枪？`)) return;
      }
      sfx.play('shotgun');
      const res = shootCustomerWithShotgun(s);
      showToast(res.msg, res.correctKill ? 'good' : 'warn');
      renderAll();
    };
  }
}

function triggerNight(choice) {
  const res = performNightActionAndSleep(gameState, choice);
  if (!res.ok) {
    sfx.play('fail');
    showToast(res.msg, 'warn');
    return;
  }
  sfx.play('door');
  if (res.nightReport && res.nightReport.length > 0) {
    showToast(res.nightReport[0], 'good');
  }
  renderAll();
}

// ----------------------------------------------------------------------------
// 右侧 5 合 1 经营面板渲染（含暗区式套包扩容箱可视化展开 + 电话大宗批发商！）
// ----------------------------------------------------------------------------
function renderRightTabs() {
  const s = gameState;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === activeTab);
  });

  const body = document.getElementById('right-tab-body');

  if (activeTab === 'inventory') {
    renderInventoryAndContainersTab(s, body);
  } else if (activeTab === 'merchants') {
    renderWholesaleMerchantsTab(s, body);
  } else if (activeTab === 'workshop') {
    renderWorkshopTab(s, body);
  } else if (activeTab === 'upgrades') {
    renderUpgradesTab(s, body);
  } else if (activeTab === 'guide') {
    renderGuideTab(body);
  }
}

// 标签 1：库存、暗区突围式套包扩容箱展开视图、开箱与刮刮乐操作
function renderInventoryAndContainersTab(s, body) {
  const shelfUsed = usedSlots(s.shelf);
  const stashUsed = usedSlots(s.stash);
  const allContainers = [...s.shelf, ...s.stash].filter(i => i.isContainer);

  // 校验当前展开的扩容箱是否依然存在
  const activeBag = allContainers.find(c => c.uid === openedContainerUid) || null;
  if (!activeBag) openedContainerUid = null;

  const buyerWantedIds = new Set(
    (s.currentCustomer && s.currentCustomer.intent === 'buy_from_shop')
      ? s.currentCustomer.buyEntries.map(e => e.itemUid)
      : []
  );

  // 渲染已展开的套包扩容箱独立子仓库窗口！
  let openedBagHtml = '';
  if (activeBag) {
    const usedInBag = containerUsedSlots(activeBag);
    const cells = [];
    for (let i = 0; i < activeBag.containerCap; i++) {
      cells.push(`<div class="slot-cell ${i < usedInBag ? (activeBag.shielded ? 'filled-purple' : 'filled') : ''}"></div>`);
    }

    openedBagHtml = `
      <div class="opened-bag-window ${activeBag.shielded ? 'shielded' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <strong style="color:${activeBag.shielded ? '#e9d5ff' : '#67e8f9'};font-size:13px;">
              📂 已展开套包：${activeBag.icon} ${activeBag.name}
            </strong>
            <div style="font-size:11px;color:#94a3b8;">
              外占仅 ${activeBag.slots} 格 → 内部独立容量 <strong>${usedInBag}/${activeBag.containerCap} 格</strong>
              ${activeBag.shielded ? ' · 🛡️ <span style="color:#d8b4fe;">铅屏蔽免检保护中！</span>' : ''}
            </div>
          </div>
          <button id="btn-close-bag">收起 ▲</button>
        </div>

        <div class="slot-meter">${cells.join('')}</div>

        <div class="inv-grid" style="margin-bottom:2px;">
          ${activeBag.contents.length === 0
            ? `<div style="grid-column:1/-1;color:#64748b;font-size:11.5px;padding:6px;">此扩容箱内部为空。可在下方任意物品卡片选择“装入套包”塞进来！</div>`
            : activeBag.contents.map(sub => renderInvItemCard(sub, s, 'container', activeBag, allContainers, buyerWantedIds)).join('')}
        </div>
      </div>
    `;
  }

  body.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:4px;flex-wrap:wrap;">
      <span style="font-size:11.5px;color:#94a3b8;">💡 点击扩容箱【📂打开套包】查看内部格子；点击密封箱【🔑刷卡开箱】！</span>
      <button class="btn-purple" id="btn-quick-hide-top" title="一键把暴露在外的违禁品和赃物塞进免检伪装箱或暗格">🕵️ 一键藏匿违禁</button>
    </div>

    ${openedBagHtml}

    <div style="margin-bottom:5px;display:flex;justify-content:space-between;align-items:center;">
      <span style="font-weight:700;color:#e2e8f0;">📦 明面主货架 (${shelfUsed}/${s.shelfMaxSlots} 格)</span>
      <span style="font-size:11px;color:#64748b;">套包只占1~2格却能装4~12格!</span>
    </div>
    <div class="inv-grid">
      ${s.shelf.length === 0
        ? `<div style="grid-column:1/-1;color:#64748b;font-size:11.5px;padding:8px;">主货架为空，快去【☎️电话批发】整箱进货吧！</div>`
        : s.shelf.map(it => renderInvItemCard(it, s, 'shelf', null, allContainers, buyerWantedIds)).join('')}
    </div>

    <div style="margin:8px 0 5px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1e293b;padding-top:7px;">
      <span style="font-weight:700;color:#c084fc;">🗄️ 柜台下固定暗格 (${stashUsed}/${s.stashMaxSlots} 格 · 免检)</span>
    </div>
    <div class="inv-grid">
      ${s.stash.length === 0
        ? `<div style="grid-column:1/-1;color:#64748b;font-size:11.5px;padding:6px;">固定暗格为空。</div>`
        : s.stash.map(it => renderInvItemCard(it, s, 'stash', null, allContainers, buyerWantedIds)).join('')}
    </div>
  `;

  // 绑定库存区操作事件
  const btnCloseBag = document.getElementById('btn-close-bag');
  if (btnCloseBag) {
    btnCloseBag.onclick = () => {
      sfx.play('click');
      openedContainerUid = null;
      renderRightTabs();
    };
  }

  document.getElementById('btn-quick-hide-top').onclick = () => {
    const res = quickHideAllIllegal(s);
    sfx.play(res.ok ? 'craft' : 'fail');
    showToast(res.msg, res.ok ? 'good' : 'warn');
    renderAll();
  };

  body.querySelectorAll('[data-open-bag]').forEach(btn => {
    btn.onclick = () => {
      sfx.play('click');
      const uid = btn.getAttribute('data-open-bag');
      openedContainerUid = (openedContainerUid === uid) ? null : uid;
      renderRightTabs();
    };
  });

  body.querySelectorAll('[data-open-crate]').forEach(btn => {
    btn.onclick = () => {
      const res = openSealedCrate(s, btn.getAttribute('data-open-crate'));
      sfx.play(res.ok ? (res.isFakeCrate ? 'fail' : 'coin') : 'fail');
      showToast(res.msg, res.ok && !res.isFakeCrate ? 'good' : 'warn');
      renderAll();
    };
  });

  body.querySelectorAll('[data-use-item]').forEach(btn => {
    btn.onclick = () => {
      const res = useConsumableItem(s, btn.getAttribute('data-use-item'));
      sfx.play(res.ok ? 'coin' : 'fail');
      showToast(res.msg, res.hitJackpot ? 'good' : 'info');
      renderAll();
    };
  });

  body.querySelectorAll('[data-scrub-uid]').forEach(btn => {
    btn.onclick = () => {
      const res = scrubStolenItem(s, btn.getAttribute('data-scrub-uid'));
      sfx.play(res.ok ? 'craft' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
  });

  body.querySelectorAll('.move-select').forEach(sel => {
    sel.onchange = () => {
      const uid = sel.getAttribute('data-item-uid');
      const target = sel.value;
      if (!target) return;
      const res = moveItemToTarget(s, uid, target);
      sfx.play(res.ok ? 'click' : 'fail');
      showToast(res.msg, res.ok ? 'info' : 'warn');
      renderAll();
    };
  });
}

function renderInvItemCard(item, s, zone, parentBag, allContainers, buyerWantedIds) {
  const illegalReason = getItemIllegalityReason(item, s);
  const shieldedNow = (zone === 'stash') || (parentBag && parentBag.shielded);
  const isExposedIllegal = Boolean(illegalReason && !shieldedNow);
  const isWantedByBuyer = buyerWantedIds.has(item.uid);
  const fairVal = evaluateItemFairPrice(item, s);

  let cardCls = 'inv-card';
  if (item.isContainer) cardCls += item.shielded ? ' is-shielded-container' : ' is-container';
  if (isExposedIllegal) cardCls += ' illegal';
  if (isWantedByBuyer) cardCls += ' wanted-buy';

  // 构建移动位置下拉菜单（主货架 / 固定暗格 / 各个套包扩容箱！）
  const moveOptions = [`<option value="">⇄ 移至...</option>`];
  if (zone !== 'shelf') moveOptions.push(`<option value="shelf">📦 主货架</option>`);
  if (zone !== 'stash') moveOptions.push(`<option value="stash">🗄️ 固定暗格(免检)</option>`);
  if (!item.isContainer) {
    for (const bag of allContainers) {
      if (!parentBag || parentBag.uid !== bag.uid) {
        const free = bag.containerCap - containerUsedSlots(bag);
        moveOptions.push(`<option value="${bag.uid}">${bag.icon} 装入:${bag.name.split(' ')[0]}(余${free}格)</option>`);
      }
    }
  }

  let usableBtnLabel = '';
  if (item.isUsable === 'scratcher') usableBtnLabel = '🎟️ 刮奖!';
  else if (item.isUsable === 'scratcher_pack') usableBtnLabel = '🎫 五连刮!';
  else if (item.isUsable === 'drink_luck') usableBtnLabel = '🍀 喝下!';
  else if (item.isUsable === 'charge_power') usableBtnLabel = '⚡ 充电';

  return `
    <div class="${cardCls}">
      <div>
        <div style="display:flex;gap:6px;align-items:center;">
          <span style="font-size:20px;">${item.icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:11.5px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${item.name}\n${item.desc}">
              ${item.name}
            </div>
            <div style="font-size:10.5px;color:#94a3b8;">
              ${item.isContainer
                ? `占${item.slots}格 → <strong>内${containerUsedSlots(item)}/${item.containerCap}格</strong>`
                : `~${fairVal} CR · 占${item.slots}格`}
            </div>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:4px;">
          ${item.isContainer && item.shielded ? '<span class="badge badge-purple">免检套包</span>' : ''}
          ${item.isContainer && !item.shielded ? '<span class="badge badge-cyan">扩容套包</span>' : ''}
          ${item.isSealedCrate ? '<span class="badge badge-amber">密封盲盒箱</span>' : ''}
          ${item.isFake ? '<span class="badge badge-red">赝品</span>' : ''}
          ${item.isStolen ? `<span class="badge badge-amber">赃物(${item.heatDays}d)</span>` : ''}
          ${isExposedIllegal ? '<span class="badge badge-red">暴露违禁!</span>' : ''}
          ${illegalReason && shieldedNow ? '<span class="badge badge-purple">已隐蔽保护</span>' : ''}
          ${isWantedByBuyer ? '<span class="badge badge-green">买家求购</span>' : ''}
        </div>
      </div>

      <div class="inv-actions">
        ${item.isContainer ? `
          <button class="${openedContainerUid === item.uid ? 'btn-amber' : 'btn-primary'}" data-open-bag="${item.uid}">
            ${openedContainerUid === item.uid ? '📂 正在查看' : `📂 打开套包(${containerUsedSlots(item)}/${item.containerCap})`}
          </button>
        ` : ''}
        ${item.isSealedCrate ? `<button class="btn-amber" data-open-crate="${item.uid}">🔑 刷卡开箱!</button>` : ''}
        ${usableBtnLabel ? `<button class="btn-success" data-use-item="${item.uid}">${usableBtnLabel}</button>` : ''}
        ${item.isStolen && s.machines.includes('scrambler') ? `<button class="btn-purple" data-scrub-uid="${item.uid}">💻洗白</button>` : ''}
        <select class="move-select" data-item-uid="${item.uid}">${moveOptions.join('')}</select>
      </div>
    </div>
  `;
}

// 标签 2：星环加密电话批发供货商（整箱/批量低价进货、买套包扩容箱、买密封箱与钥匙卡！）
function renderWholesaleMerchantsTab(s, body) {
  body.innerHTML = `
    <div style="font-size:11.5px;color:#94a3b8;margin-bottom:8px;">
      ☎️ <strong>星环专线批发网：</strong>不同于门外零散顾客，你可以随时拨号向五大批发商<strong>整箱大宗拿货</strong>、抢购<strong>套包扩容箱</strong>与<strong>密封物资箱+钥匙卡</strong>！（每日早间自动补满库存）
    </div>
    ${WHOLESALE_MERCHANTS.map(m => {
      const unlocked = s.unlockedMerchants.includes(m.id);
      const freeUnlock = (m.id === 'sawyer_exchange' && s.rep.blackmarket >= 25);
      return `
        <div class="machine-card">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;">
            <div>
              <strong style="color:var(--neon-cyan);font-size:13px;">${m.icon} [${m.code}] ${m.name}</strong>
              <div style="font-size:11px;color:#cbd5e1;">${m.role}</div>
            </div>
            ${unlocked
              ? `<span class="badge badge-green">已接通</span>`
              : `<button class="btn-amber" data-unlock-merch="${m.id}">🔓 接通专线 (${freeUnlock ? '声望免费!' : `${m.unlockCost} CR`})</button>`}
          </div>
          <div style="font-size:11px;color:#94a3b8;margin:4px 0 6px;">${m.desc}</div>

          ${unlocked ? m.catalog.map(c => {
            const tpl = ITEM_TEMPLATES[c.tplId];
            const left = s.merchantDailyStock[`${m.id}:${c.tplId}`] ?? c.stockPerDay;
            return `
              <div class="recipe-box">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:12px;font-weight:700;color:#f8fafc;">
                    ${tpl.icon} ${tpl.name} × ${c.packQty}
                    <span class="badge badge-cyan">${c.tag}</span>
                  </div>
                  <div style="font-size:10.5px;color:#94a3b8;">
                    零售单价基准 ${tpl.baseValue} CR · 今日余量: ${left} 批
                  </div>
                </div>
                <button class="btn-success" data-ws-merch="${m.id}" data-ws-tpl="${c.tplId}" ${(left <= 0 || s.credits < c.price) ? 'disabled' : ''}>
                  批发 ${c.price} CR
                </button>
              </div>
            `;
          }).join('') : `<div style="font-size:11px;color:#fcd34d;">🔒 ${m.unlockNote}</div>`}
        </div>
      `;
    }).join('')}
  `;

  body.querySelectorAll('[data-unlock-merch]').forEach(btn => {
    btn.onclick = () => {
      const res = unlockWholesaleMerchant(s, btn.getAttribute('data-unlock-merch'));
      sfx.play(res.ok ? 'coin' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
  });

  body.querySelectorAll('[data-ws-merch]').forEach(btn => {
    btn.onclick = () => {
      const res = buyFromWholesaleMerchant(s, btn.getAttribute('data-ws-merch'), btn.getAttribute('data-ws-tpl'));
      sfx.play(res.ok ? 'coin' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
  });
}

// 标签 3：后室机器生产合成
function renderWorkshopTab(s, body) {
  const owned = s.machines.map(id => MACHINES[id]).filter(Boolean);
  body.innerHTML = `
    <div style="font-size:11.5px;color:#94a3b8;margin-bottom:8px;">
      ⚙️ 机器会自动调用货架、暗格及所有扩容箱内的原料进行合成。配合【☎️电话批发】低价买原料加工暴利翻倍！
    </div>
    ${owned.length === 0 ? `
      <div class="machine-card" style="text-align:center;color:#94a3b8;padding:16px;">
        尚未安装生产机器。请前往【📜证照设备】购置净水器、改装台、蒸馏釜、制卡仪或养鼠培育舱！
      </div>
    ` : owned.map(m => `
      <div class="machine-card">
        <div style="display:flex;justify-content:space-between;">
          <strong style="color:var(--neon-cyan);">${m.icon} ${m.name}</strong>
          <span class="badge badge-cyan">通电就绪</span>
        </div>
        <div style="font-size:11px;color:#94a3b8;margin:3px 0 5px;">${m.desc}</div>
        ${m.recipes.map(r => `
          <div class="recipe-box">
            <div style="flex:1;">
              <div style="font-size:12px;font-weight:700;color:#f1f5f9;">${r.name} (-${r.power}⚡)</div>
              <div style="font-size:11px;color:#94a3b8;">${r.note}</div>
            </div>
            <button class="btn-primary" data-machine="${m.id}" data-recipe="${r.id}">加工</button>
          </div>
        `).join('')}
      </div>
    `).join('')}
  `;

  body.querySelectorAll('[data-recipe]').forEach(btn => {
    btn.onclick = () => {
      const res = runMachineRecipe(s, btn.getAttribute('data-machine'), btn.getAttribute('data-recipe'));
      sfx.play(res.ok ? 'craft' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
  });
}

// 标签 4：购买后室机器、证照与扩建
function renderUpgradesTab(s, body) {
  body.innerHTML = `
    <h4 style="color:var(--neon-cyan);margin-bottom:6px;">🏭 五大流派后室生产机器</h4>
    ${Object.values(MACHINES).map(m => {
      const owned = s.machines.includes(m.id);
      return `
        <div class="machine-card">
          <div style="display:flex;justify-content:space-between;">
            <strong>${m.icon} ${m.name}</strong>
            <span style="color:#fde047;font-family:var(--font-mono);font-weight:700;">${owned ? '已安装' : `${m.cost} CR`}</span>
          </div>
          <p style="font-size:11px;color:#94a3b8;margin:4px 0 6px;">${m.desc}</p>
          <button class="${owned ? '' : 'btn-primary'}" data-buy-up="${m.id}" ${owned ? 'disabled' : ''}>
            ${owned ? '✓ 已拥有' : `购置机器 (${m.cost} CR)`}
          </button>
        </div>
      `;
    }).join('')}

    <h4 style="color:#4ade80;margin:10px 0 6px;">📜 经营许可证、扫描仪与仓库扩建</h4>
    ${UPGRADES_AND_LICENSES.map(u => {
      const owned = s.tools.includes(u.id) || s.licenses.includes(u.id);
      return `
        <div class="machine-card">
          <div style="display:flex;justify-content:space-between;">
            <strong>${u.icon} ${u.name}</strong>
            <span style="color:#fde047;font-family:var(--font-mono);font-weight:700;">${owned ? '已激活' : `${u.cost} CR`}</span>
          </div>
          <p style="font-size:11px;color:#94a3b8;margin:4px 0 6px;">${u.desc}</p>
          <button class="${owned ? '' : 'btn-success'}" data-buy-up="${u.id}" ${owned ? 'disabled' : ''}>
            ${owned ? '✓ 已解锁' : `购买解锁 (${u.cost} CR)`}
          </button>
        </div>
      `;
    }).join('')}
  `;

  body.querySelectorAll('[data-buy-up]').forEach(btn => {
    btn.onclick = () => {
      const res = purchaseShopUpgrade(s, btn.getAttribute('data-buy-up'));
      sfx.play(res.ok ? 'coin' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
  });
}

// 标签 5：原版进阶机制掌柜手册
function renderGuideTab(body) {
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;font-size:11.5px;color:#cbd5e1;">
      <div class="machine-card">
        <strong style="color:var(--neon-cyan);">1. 🎒 暗区式「套包扩容箱」与「走私者免检箱」</strong>
        <p style="margin-top:3px;">向杰克逊博士购买腰包(占1扩4)、行军包(占2扩8)、军用包(占2扩12)，在货架只占1~2格，点击<strong>【📂打开套包】</strong>即可展开全新的独立大容量仓库！其中紫色的<strong>【走私者伪装箱】</strong>自带铅屏蔽，把违禁品装进去连治安官突击搜查都绝对搜不到！</p>
      </div>
      <div class="machine-card">
        <strong style="color:#fcd34d;">2. 📦 五类密封物资箱 + 钥匙卡盲盒暴富</strong>
        <p style="margin-top:3px;">后勤、医疗、工程、治安、罚没物证柜五种密封箱，搭配对应部门钥匙卡（或万能指挥官卡）点击<strong>【🔑刷卡开箱】</strong>可爆出“永恒”精华液、自充电零点能电池、脉冲步枪等神装！喝下<strong>【液体好运】</strong>再开箱/刮彩票欧气拉满！</p>
      </div>
      <div class="machine-card">
        <strong style="color:#4ade80;">3. ☎️ 电话批发商大宗进货 + 多物品交易</strong>
        <p style="margin-top:3px;">顾客现在一次会带 2~4 件货或求购多件商品，你可以<strong>勾选只买真货/只卖高利货</strong>并整单砍价！随时在【☎️电话批发】整箱低价进原料，用机器合成高价品卖给上层主厨、奥丁或开箱狂人！</p>
      </div>
      <div class="machine-card">
        <strong style="color:#fda4af;">4. 🤖 猎杀 AI 改造体（Aug）与买断地契</strong>
        <p style="margin-top:3px;">留意顾客耳后红光芯片、异色瞳孔、僵硬假笑与机械台词，用扫描仪确认后拔出<strong>霰弹枪击毙</strong>领赏！攒够 6,000 CR 点击右上角【买断地契】解锁专属结局！</p>
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 结局结算弹窗
// ----------------------------------------------------------------------------
function renderGameOverModal() {
  const modal = document.getElementById('ending-modal');
  if (!gameState || !gameState.gameOver) {
    modal.classList.add('hidden');
    return;
  }
  const end = gameState.gameOver;
  const st = gameState.stats;
  modal.classList.remove('hidden');

  document.getElementById('ending-content').innerHTML = `
    <div style="text-align:center;margin-bottom:12px;">
      <div style="font-size:40px;">${end.victory ? '🏆' : '💀'}</div>
      <h2 style="font-size:20px;color:${end.victory ? '#fde047' : '#f87171'};margin:4px 0;">${end.title}</h2>
      <p style="font-size:13px;color:#e2e8f0;line-height:1.6;">${end.desc}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:#080d18;padding:10px;border-radius:7px;border:1px solid #1e293b;margin-bottom:14px;text-align:center;">
      <div><div style="color:#94a3b8;font-size:11px;">经营天数</div><div style="font-size:15px;font-weight:700;color:#38bdf8;">${gameState.day} 天</div></div>
      <div><div style="color:#94a3b8;font-size:11px;">累计营收</div><div style="font-size:15px;font-weight:700;color:#fde047;">${st.totalEarned} CR</div></div>
      <div><div style="color:#94a3b8;font-size:11px;">刷卡开箱</div><div style="font-size:15px;font-weight:700;color:#fbbf24;">${st.cratesOpened || 0} 箱</div></div>
      <div><div style="color:#94a3b8;font-size:11px;">识破假货</div><div style="font-size:15px;font-weight:700;color:#4ade80;">${st.fakesExposed} 次</div></div>
      <div><div style="color:#94a3b8;font-size:11px;">猎杀改造体</div><div style="font-size:15px;font-weight:700;color:#c084fc;">${st.augsEliminated} 具</div></div>
      <div><div style="color:#94a3b8;font-size:11px;">后室合成</div><div style="font-size:15px;font-weight:700;color:#f472b6;">${st.itemsCrafted} 件</div></div>
    </div>

    <div style="display:flex;justify-content:center;gap:10px;">
      ${end.victory ? `<button class="btn-success" id="btn-endless">🚀 继续无尽自由经营</button>` : ''}
      <button class="btn-primary" id="btn-restart-new">🔄 选择新职业重开</button>
    </div>
  `;

  const btnEnd = document.getElementById('btn-endless');
  if (btnEnd) btnEnd.onclick = () => { sfx.play('coin'); continueEndlessAfterVictory(gameState); renderAll(); };
  document.getElementById('btn-restart-new').onclick = () => {
    localStorage.removeItem(SAVE_KEY);
    modal.classList.add('hidden');
    openStartModal(false);
  };
}

// ----------------------------------------------------------------------------
// 初始化
// ----------------------------------------------------------------------------
function initApp() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      sfx.play('click');
      activeTab = btn.getAttribute('data-tab');
      renderRightTabs();
    };
  });

  document.getElementById('btn-buyout').onclick = () => {
    if (!gameState) return;
    const res = buyoutShopProperty(gameState);
    sfx.play(res.ok ? 'coin' : 'fail');
    if (!res.ok) showToast(res.msg, 'warn');
    renderAll();
  };

  document.getElementById('btn-fullscreen').onclick = () => {
    sfx.play('click');
    toggleFullscreenLandscape().then(() => {
      const btn = document.getElementById('btn-fullscreen');
      if (btn) btn.style.display = 'none';
    }).catch(() => {});
  };

  const startFsBtn = document.getElementById('btn-start-fullscreen');
  if (startFsBtn) {
    startFsBtn.onclick = () => {
      sfx.play('click');
      toggleFullscreenLandscape().then(() => {
        const btn = document.getElementById('btn-start-fullscreen');
        if (btn) btn.style.display = 'none';
      }).catch(() => {});
    };
  }

  document.getElementById('btn-mute').onclick = (e) => {
    sfx.muted = !sfx.muted;
    e.currentTarget.textContent = sfx.muted ? '🔇' : '🔊';
  };

  document.getElementById('btn-newgame-top').onclick = () => {
    sfx.play('click');
    openStartModal(true);
  };

  setInterval(() => {
    animTick++;
    if (gameState && gameState.phase === 'open') {
      drawCustomerPortrait(document.getElementById('customer-canvas'), gameState.currentCustomer, animTick);
    }
  }, 110);

  openStartModal(false);
}

window.addEventListener('DOMContentLoaded', initApp);

// 批量整理库存：按类别排序 + 容器自动装入
function handleBatchSort(s) {
  const shelf = s.shelf;
  const stash = s.stash;
  const all = [...shelf, ...stash];
  const containers = all.filter(i => ITEM_TEMPLATES[i.templateId]?.isContainer);
  const others = all.filter(i => !ITEM_TEMPLATES[i.templateId]?.isContainer);
  others.sort((a,b) => {
    const ca = ITEM_TEMPLATES[a.templateId]?.category || '';
    const cb = ITEM_TEMPLATES[b.templateId]?.category || '';
    return ca.localeCompare(cb);
  });
  for (const c of containers) {
    const tpl = ITEM_TEMPLATES[c.templateId];
    let cap = tpl.containerCap - c.slots;
    if (cap > 0) {
      const toMove = others.splice(0, cap);
      c.slots += toMove.length;
      c.contents = (c.contents || []).concat(toMove.map(i => i.uid));
    }
  }
  s.shelf = containers.filter(i => !stash.includes(i)).concat(others.filter(i => !stash.includes(i)));
  s.stash = containers.filter(i => stash.includes(i)).concat(others.filter(i => stash.includes(i)));
  showToast('📦 仓储协调器自动整理完成！', 'info');
}

// 批量整理库存：按类别排序 + 容器自动装入
function handleBatchSort(s) {
  const shelf = s.shelf;
  const stash = s.stash;
  const all = [...shelf, ...stash];
  const containers = all.filter(i => ITEM_TEMPLATES[i.templateId]?.isContainer);
  const others = all.filter(i => !ITEM_TEMPLATES[i.templateId]?.isContainer);
  others.sort((a,b) => {
    const ca = ITEM_TEMPLATES[a.templateId]?.category || '';
    const cb = ITEM_TEMPLATES[b.templateId]?.category || '';
    return ca.localeCompare(cb);
  });
  for (const c of containers) {
    const tpl = ITEM_TEMPLATES[c.templateId];
    let cap = tpl.containerCap - c.slots;
    if (cap > 0) {
      const toMove = others.splice(0, cap);
      c.slots += toMove.length;
      c.contents = (c.contents || []).concat(toMove.map(i => i.uid));
    }
  }
  s.shelf = containers.filter(i => !stash.includes(i)).concat(others.filter(i => !stash.includes(i)));
  s.stash = containers.filter(i => stash.includes(i)).concat(others.filter(i => stash.includes(i)));
  showToast('📦 仓储协调器自动整理完成！', 'info');
}
