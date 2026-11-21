// ============================================================================
// 《深空当铺：可能是偷的》前端交互与视图控制器
// ============================================================================

import {
  FACTIONS,
  PROFESSIONS,
  ITEM_TEMPLATES,
  MACHINES,
  UPGRADES_AND_LICENSES
} from './data.js';

import {
  createNewGameState,
  evaluateItemFairPrice,
  getItemIllegalityReason,
  usedSlots,
  itemSlotCost,
  inspectItem,
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
  toggleItemStorage,
  useBatteryForPower,
  runMachineRecipe,
  scrubStolenItem,
  purchaseShopUpgrade,
  performNightActionAndSleep,
  buyoutShopProperty,
  continueEndlessAfterVictory
} from './engine.js';

import { sfx, drawCustomerPortrait } from './audio_art.js';

const SAVE_KEY = 'deepspace_pawnshop_save_v1';

const CATEGORY_NAMES = {
  supply: '民生补给',
  medical: '化学医疗',
  weapon: '军火武器',
  luxury: '奢侈古董',
  tech: '赛博零件',
  material: '工业原料',
  contraband: '重度违禁'
};

let gameState = null;
let activeTab = 'inventory'; // 'inventory' | 'workshop' | 'upgrades' | 'guide'
let animTick = 0;

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
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
  } catch (_) {}
}

function loadSavedGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.version === 1) return parsed;
  } catch (_) {}
  return null;
}

// ----------------------------------------------------------------------------
// 开局职业选择弹窗渲染
// ----------------------------------------------------------------------------
function openStartModal(allowClose = false) {
  const modal = document.getElementById('start-modal');
  modal.classList.remove('hidden');

  const saved = loadSavedGame();
  const resumeBtn = document.getElementById('btn-resume-save');
  if (saved && !saved.gameOver) {
    resumeBtn.classList.remove('hidden');
    resumeBtn.textContent = `📂 继续存档（第 ${saved.day} 天 · ${saved.professionName} · ${saved.credits} CR）`;
    resumeBtn.onclick = () => {
      sfx.play('click');
      gameState = saved;
      modal.classList.add('hidden');
      renderAll();
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
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:24px;">${p.icon}</span>
          <span class="badge badge-cyan">${p.subtitle}</span>
        </div>
        <h3 style="font-size:16px;color:${p.color};margin-bottom:6px;">${p.name}</h3>
        <p style="font-size:12.5px;color:#cbd5e1;margin-bottom:10px;">${p.desc}</p>
        <ul style="list-style:none;font-size:12px;color:#94a3b8;display:flex;flex-direction:column;gap:4px;">
          ${p.perks.map(pk => `<li>✦ ${pk}</li>`).join('')}
        </ul>
      </div>
      <button class="btn-primary" style="width:100%;margin-top:8px;">以此身份接手当铺</button>
    </div>
  `).join('');

  grid.querySelectorAll('.prof-card').forEach(card => {
    card.addEventListener('click', () => {
      const profId = card.getAttribute('data-prof');
      sfx.play('door');
      gameState = createNewGameState(profId);
      saveGame();
      modal.classList.add('hidden');
      renderAll();
      showToast(`欢迎来到第13底层街区！你以【${gameState.professionName}】身份开启了当铺生涯。`, 'good');
    });
  });
}

// ----------------------------------------------------------------------------
// 主界面全量渲染
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
    ? '🏆 已买断永久产权 (免房租)'
    : `房租 ${s.rentAmount} CR (${daysLeft === 0 ? '今晚收租!' : `剩 ${daysLeft} 天`})`;

  document.getElementById('hud-day').textContent = `第 ${s.day} 天 · ${s.phase === 'night' ? '🌙 打烊夜晚' : '🏮 营业中'} (${s.professionName})`;
  document.getElementById('hud-credits').textContent = `💰 ${s.credits} CR`;
  document.getElementById('hud-rent').textContent = `🏠 ${rentText}`;
  document.getElementById('hud-energy').textContent = `⚡ 电力 ${s.energy}/${s.maxEnergy}`;
  document.getElementById('hud-heat').textContent = `🚨 嫌疑 ${s.heat}%`;
  document.getElementById('hud-aug').textContent = `🤖 AI渗透 ${s.augThreat}%`;

  const buyoutBtn = document.getElementById('btn-buyout');
  if (s.ownsShop) {
    buyoutBtn.textContent = '🏆 永久产权店主';
    buyoutBtn.disabled = true;
  } else {
    buyoutBtn.textContent = `🔑 买断产权 (${s.buyoutPrice} CR)`;
    buyoutBtn.disabled = s.credits < s.buyoutPrice;
  }
}

function renderLeftPanel() {
  const s = gameState;

  // 今日紧俏行情
  document.getElementById('market-hot').innerHTML = `
    📈 今日紧俏溢价 (+25%)：<strong style="color:#4ade80;">${CATEGORY_NAMES[s.hotCategory] || '民生补给'}</strong>
  `;

  // 派系声望条
  const facContainer = document.getElementById('faction-list');
  facContainer.innerHTML = Object.values(FACTIONS).map(f => {
    const val = s.rep[f.id] || 0;
    const pct = Math.max(4, Math.min(100, ((val + 50) / 150) * 100));
    const unlocked = val >= f.perkThreshold;
    return `
      <div class="faction-row" title="${f.desc}\n${f.perkDesc}">
        <div class="faction-top">
          <span style="color:${f.color};font-weight:700;">${f.name} ${unlocked ? '★特权激活' : ''}</span>
          <span style="font-family:var(--font-mono);color:${val >= 0 ? '#e2e8f0' : '#fca5a5'};">${val}</span>
        </div>
        <div class="rep-bar-bg">
          <div class="rep-bar-fill" style="width:${pct}%;background:${f.color};"></div>
        </div>
        <div style="font-size:11px;color:#64748b;margin-top:3px;">${f.perkDesc}</div>
      </div>
    `;
  }).join('');

  // 今日治安局通缉令
  const w = s.dailyWanted;
  const wantedEl = document.getElementById('wanted-box');
  if (w) {
    wantedEl.innerHTML = `
      <div class="wanted-header">
        <span>🚨 今日治安悬赏通缉</span>
        <span>赏金 +${w.bounty} CR</span>
      </div>
      <div style="font-size:12.5px;color:#f8fafc;font-weight:600;">${w.name}（${FACTIONS[w.faction].short}）</div>
      <div style="font-size:11.5px;color:#cbd5e1;margin-top:2px;">罪名：${w.crime}</div>
      <div style="font-size:11.5px;color:#fde047;margin-top:3px;">识别特征：${w.mark}</div>
    `;
  }

  // 账本日志
  const logEl = document.getElementById('log-box');
  logEl.innerHTML = s.logs.slice(0, 25).map(l => `<div class="log-entry">${l}</div>`).join('');
}

// ----------------------------------------------------------------------------
// 中央当铺柜台区渲染（访客互动 / 鉴定质询 / 议价 / 夜间行动）
// ----------------------------------------------------------------------------
function renderCenterStage() {
  const s = gameState;
  const stageContainer = document.getElementById('center-content');
  const queueInfo = document.getElementById('queue-counter');

  if (s.phase === 'night') {
    queueInfo.textContent = '🌙 卷帘门已落下 · 夜间自由整备时段';
    drawCustomerPortrait(document.getElementById('customer-canvas'), null, animTick);
    document.getElementById('customer-badges').innerHTML = `<span class="badge badge-purple">打烊整备</span>`;
    document.getElementById('customer-meta').innerHTML = `
      <h3 style="font-size:17px;color:#e2e8f0;margin-bottom:6px;">第 ${s.day} 天夜晚 · 抉择你的夜间行动</h3>
      <div class="dialogue-bubble">
        白天的喧嚣暂时退去。你可以先在右侧面板<strong>操作后室机器合成高价货品</strong>或<strong>调整货架库存</strong>，然后选择一项夜间行动进入明天。
        ${(!s.ownsShop && s.day >= s.rentDueDay) ? `<div style="margin-top:8px;color:#fda4af;font-weight:700;">⚠️ 今晚结账时房东将准时收缴本期房租 ${s.rentAmount} CR！（当前持有 ${s.credits} CR）</div>` : ''}
      </div>
    `;

    const hasRadBarrel = [...s.shelf, ...s.stash].some(i => i.templateId === 'rad_barrel');
    stageContainer.innerHTML = `
      <div class="deal-card">
        <h4 style="color:var(--neon-cyan);margin-bottom:10px;">🌃 选择今晚外出或整备计划（执行后推进至第 ${s.day + 1} 天）</h4>
        <div style="display:grid;gap:10px;">
          <div class="recipe-box">
            <div>
              <div style="font-weight:700;color:#86efac;">🗑️ 溜去下层垃圾倾倒场拾荒 ${hasRadBarrel ? '<span class="badge badge-red">顺便倾倒放射性废料桶!</span>' : ''}</div>
              <div style="font-size:12px;color:#94a3b8;">免费翻找 2~3 件金属/滤芯/浑浊水/旧零件，并安全丢弃店内所有高危放射性废料桶。</div>
            </div>
            <button class="btn-success" id="act-night-scrap">出发拾荒</button>
          </div>

          <div class="recipe-box">
            <div>
              <div style="font-weight:700;color:#e9d5ff;">🕶️ 潜入第13区地下黑市暗拍 (-130 CR)</div>
              <div style="font-size:12px;color:#94a3b8;">支付 130 CR 盲盒入场费，必定淘回 1 件高价值真品硬货（义体/怀表/紫酒/加密芯片/遗物），黑市声望 +6。</div>
            </div>
            <button class="btn-purple" id="act-night-bm" ${s.credits < 130 ? 'disabled' : ''}>黑市淘货</button>
          </div>

          <div class="recipe-box">
            <div>
              <div style="font-weight:700;color:#7dd3fc;">⚡ 留店检修聚变电容与抹除监控</div>
              <div style="font-size:12px;color:#94a3b8;">店铺电力大幅恢复 +55（另加每晚基础回电 +20），且治安局嫌疑值下降 -15。</div>
            </div>
            <button class="btn-primary" id="act-night-rest">检修休整</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('act-night-scrap').onclick = () => triggerNight('dump_scrapyard');
    document.getElementById('act-night-bm').onclick = () => triggerNight('black_market');
    document.getElementById('act-night-rest').onclick = () => triggerNight('rest_recharge');
    return;
  }

  // 营业阶段：渲染当前访客
  const c = s.currentCustomer;
  queueInfo.textContent = `今日剩余排队访客：${s.customersQueue.length} 人`;
  drawCustomerPortrait(document.getElementById('customer-canvas'), c, animTick);

  if (!c) {
    stageContainer.innerHTML = '';
    return;
  }

  // 访客身份徽章
  const fac = FACTIONS[c.faction] || FACTIONS.lower;
  let badgesHtml = `<span class="badge" style="background:rgba(15,23,42,0.8);color:${fac.color};border-color:${fac.color};">${fac.short}</span>`;
  if (c.isSecurityRaid) badgesHtml += `<span class="badge badge-red">突击搜查</span>`;
  if (c.type === 'story') badgesHtml += `<span class="badge badge-amber">特殊剧情</span>`;
  if (c.augScanned) {
    badgesHtml += c.isAug
      ? `<span class="badge badge-red">🤖 确认AI改造体!</span>`
      : `<span class="badge badge-green">✅ 确认人类</span>`;
  }
  document.getElementById('customer-badges').innerHTML = badgesHtml;

  // 访客台词与外貌举止观察线索
  document.getElementById('customer-meta').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
      <div>
        <span style="font-size:17px;font-weight:800;color:#f8fafc;">${c.name}</span>
        <span style="font-size:12px;color:#94a3b8;margin-left:6px;">· ${c.roleName}</span>
      </div>
      ${c.patience ? `<span style="font-size:12px;color:#fbbf24;">耐心：${'★'.repeat(c.patience)}${'☆'.repeat(Math.max(0, c.maxPatience - c.patience))}</span>` : ''}
    </div>
    <div class="dialogue-bubble">${c.dialogue}</div>
    ${c.behaviorNote ? `<div class="behavior-clue">👁️ <strong>柜台观察记录：</strong>${c.behaviorNote}${getVisualAugHintText(c)}</div>` : ''}
  `;

  // 分支 1：剧情人物交互
  if (c.type === 'story') {
    stageContainer.innerHTML = `
      <div class="deal-card">
        <h4 style="color:#fbbf24;margin-bottom:10px;">🎭 关键抉择（你的决定将影响派系关系与后续故事线）</h4>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${c.choices.map((ch, idx) => `
            <button class="${idx === 0 ? 'btn-primary' : ''}" data-story-eff="${ch.effect}" style="text-align:left;padding:10px 12px;">
              ➤ ${ch.label}
            </button>
          `).join('')}
        </div>
      </div>
    `;
    stageContainer.querySelectorAll('[data-story-eff]').forEach(btn => {
      btn.onclick = () => {
        const eff = btn.getAttribute('data-story-eff');
        const res = resolveStoryChoice(s, eff);
        if (!res.ok) {
          sfx.play('fail');
          showToast(res.msg, 'warn');
        } else {
          sfx.play('coin');
          showToast(res.msg, 'good');
          renderAll();
        }
      };
    });
    return;
  }

  // 分支 2：治安局突击搜查！
  if (c.isSecurityRaid) {
    const illegalOnShelf = s.shelf.filter(it => getItemIllegalityReason(it, s) !== null);
    stageContainer.innerHTML = `
      <div class="deal-card" style="border-color:#ef4444;">
        <h4 style="color:#fca5a5;margin-bottom:8px;">🚨 治安局突击搜查正在进行！</h4>
        <p style="font-size:12.5px;color:#cbd5e1;margin-bottom:10px;">
          当前明面货架上有 <strong style="color:${illegalOnShelf.length ? '#f87171' : '#4ade80'};">${illegalOnShelf.length} 件</strong> 无证军火、未洗白赃物或违禁品！
          ${illegalOnShelf.length > 0 ? '<br>💡 <strong>提示：现在立刻在右侧【库存与暗格】点击“藏入暗格”还来得及藏匿！</strong>' : ''}
        </p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          <button class="btn-primary" id="btn-raid-comply">👐 打开货架配合检查</button>
          <button class="btn-amber" id="btn-raid-bribe">🤫 塞钱打点霍克警督 (-${c.bribeCost} CR)</button>
        </div>
      </div>
    `;
    document.getElementById('btn-raid-comply').onclick = () => {
      const res = handleSecurityRaid(s, 'comply');
      sfx.play(res.clean ? 'coin' : 'alert');
      showToast(res.msg, res.clean ? 'good' : 'warn');
      renderAll();
    };
    document.getElementById('btn-raid-bribe').onclick = () => {
      const res = handleSecurityRaid(s, 'bribe');
      if (!res.ok) {
        sfx.play('fail');
        showToast(res.msg, 'warn');
      } else {
        sfx.play('coin');
        showToast(res.msg, 'good');
        renderAll();
      }
    };
    return;
  }

  // 分支 3：普通/特殊顾客（卖货给当铺 / 买当铺货 / 鉴定委托 / 空架离开）
  let dealHtml = '';

  if (c.intent === 'empty_leave') {
    dealHtml = `
      <div class="deal-card">
        <p style="color:#94a3b8;margin-bottom:10px;">主货架上没有可出售的商品（暗格内的商品顾客看不见）。</p>
        <button class="btn-primary" id="btn-next-empty">送走顾客</button>
      </div>
    `;
  } else if (c.intent === 'sell_to_shop' || c.intent === 'appraise_request') {
    const item = c.offerItem;
    const tpl = ITEM_TEMPLATES[item.templateId];
    const fairEst = evaluateItemFairPrice(item, s);
    dealHtml = `
      <div class="deal-card">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
          <span class="badge ${c.intent === 'appraise_request' ? 'badge-amber' : 'badge-cyan'}">
            ${c.intent === 'appraise_request' ? '🏅 鉴定委员会委托单（无需收购，判真伪赚佣金）' : '📥 顾客向你兜售物品'}
          </span>
          <span style="font-family:var(--font-mono);font-size:12px;color:#94a3b8;">
            图鉴正品参考价: ~${tpl.baseValue} CR ${s.hotCategory === item.category ? '🔥紧俏' : ''}
          </span>
        </div>

        <div class="deal-item-header">
          <div class="deal-item-icon">${item.icon}</div>
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:700;color:#f8fafc;">
              ${item.name}
              ${(item.inspectedVisual || item.inspectedDeep) && item.isStolen ? '<span class="badge badge-amber">⚠️ 疑似带追踪码赃物</span>' : ''}
            </div>
            <div style="font-size:12px;color:#94a3b8;">${item.desc}</div>
          </div>
          ${c.intent === 'sell_to_shop' ? `
            <div style="text-align:right;">
              <div style="font-size:11px;color:#94a3b8;">对方当前要价</div>
              <div style="font-size:20px;font-weight:800;color:#fde047;font-family:var(--font-mono);">${c.askingPrice} CR</div>
            </div>
          ` : ''}
        </div>

        <!-- 鉴定工具栏 -->
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin:8px 0;">
          <button id="btn-insp-visual" ${item.inspectedVisual ? 'disabled' : ''}>
            🔍 放大镜外观核验 (免费)
          </button>
          <button id="btn-insp-deep" ${item.inspectedDeep ? 'disabled' : ''}>
            🔬 光谱仪深度透视 (-10⚡)
          </button>
          ${(c.intent === 'sell_to_shop' && item.inspectedVisual && !item.confronted) ? `
            <button class="btn-amber" id="btn-open-confront">⚡ 指出假货瑕疵压价！</button>
          ` : ''}
        </div>

        <!-- 鉴定结果展示面板 -->
        ${renderInspectionReportHtml(item)}

        <!-- 质询瑕疵选择折叠栏 -->
        <div id="confront-panel" class="hidden" style="background:#1a1122;border:1px solid #f59e0b;border-radius:6px;padding:9px;margin-top:8px;">
          <div style="font-size:12px;color:#fcd34d;margin-bottom:6px;font-weight:700;">
            请选择你发现的确凿造假证据（若指控正确对方将暴降价格；冤枉真货会掉声望！）：
          </div>
          <div style="display:flex;flex-direction:column;gap:5px;">
            ${(tpl.fakeSigns || []).map((fs, i) => `
              <button class="btn-confront-reason" data-reason="${fs.reason}" style="text-align:left;font-size:12px;">
                ❗ 指控瑕疵 ${i + 1}：${fs.reason}
              </button>
            `).join('')}
          </div>
        </div>

        ${c.intent === 'sell_to_shop' ? `
          <div class="haggle-bar">
            <button class="btn-success" id="btn-buy-direct">💰 按 ${c.askingPrice} CR 直接买下</button>
            <div style="display:flex;align-items:center;gap:5px;">
              <input type="number" id="inp-haggle" class="price-input" value="${Math.max(8, Math.round(c.askingPrice * 0.82))}" min="5" max="9999">
              <button class="btn-primary" id="btn-haggle-sub">🗣️ 还价博弈</button>
            </div>
            <button id="btn-refuse">👋 拒绝送客</button>
            <span style="font-size:11.5px;color:#64748b;margin-left:auto;">当前你的估值: ~${fairEst} CR</span>
          </div>
        ` : `
          <div class="haggle-bar">
            <button class="btn-success" id="btn-appraise-true">✅ 出具报告：真品无疑</button>
            <button class="btn-danger" id="btn-appraise-fake">❌ 出具报告：系伪造赝品</button>
            <button id="btn-refuse">👋 婉拒委托</button>
          </div>
        `}
      </div>
    `;
  } else if (c.intent === 'buy_from_shop') {
    const targetItem = s.shelf.find(i => i.uid === c.wantedBuyItemUid);
    const illegalWarn = targetItem ? getItemIllegalityReason(targetItem, s) : null;
    dealHtml = `
      <div class="deal-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span class="badge badge-green">📤 顾客想购买你货架上的商品</span>
          ${illegalWarn ? `<span class="badge badge-red">⚠️ 违规风险：留意对方是否便衣钓鱼!</span>` : ''}
        </div>

        ${targetItem ? `
          <div class="deal-item-header">
            <div class="deal-item-icon">${targetItem.icon}</div>
            <div style="flex:1;">
              <div style="font-size:15px;font-weight:700;color:#f8fafc;">
                ${targetItem.name}
                ${targetItem.isFake ? '<span class="badge badge-red">赝品次货</span>' : '<span class="badge badge-cyan">正品</span>'}
                ${targetItem.isStolen ? '<span class="badge badge-amber">赃物</span>' : ''}
              </div>
              <div style="font-size:12px;color:#94a3b8;">基准市价: ${targetItem.baseValue} CR · ${illegalWarn || '合法合规商品'}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;color:#94a3b8;">买家当前出价</div>
              <div style="font-size:20px;font-weight:800;color:#4ade80;font-family:var(--font-mono);">${c.currentOffer} CR</div>
            </div>
          </div>

          <div class="haggle-bar">
            <button class="btn-success" id="btn-sell-direct">💵 按 ${c.currentOffer} CR 立即成交</button>
            <div style="display:flex;align-items:center;gap:5px;">
              <input type="number" id="inp-haggle" class="price-input" value="${Math.round(c.currentOffer * 1.18)}" min="5" max="9999">
              <button class="btn-primary" id="btn-haggle-sub">📈 加价博弈</button>
            </div>
            <button id="btn-refuse">👋 不卖送客</button>
          </div>
        ` : `<p>目标商品已被移走。</p><button id="btn-refuse">送客</button>`}
      </div>
    `;
  }

  // 柜台下战术防卫操作栏（AI扫描仪、通缉举报、霰弹枪轰击！）
  const underCounterHtml = `
    <div class="under-counter-bar">
      <div style="font-size:12px;color:#fda4af;font-weight:700;">
        🛡️ 柜台下安防系统：
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:7px;">
        <button id="btn-aug-scan" title="消耗20点电力扫描对方体内是否有失控AI芯片">
          📡 AI改造体扫描 (-20⚡)
        </button>
        <button class="btn-amber" id="btn-report-wanted" title="若认出对方符合左栏今日通缉犯特征，可秘密报警领赏">
          🚨 举报通缉犯
        </button>
        <button class="btn-danger" id="btn-shotgun" title="确认对方是失控AI改造体(Aug)时可合法当场击毙领赏！切勿误杀真人类！">
          💥 拔出霰弹枪击毙
        </button>
      </div>
    </div>
  `;

  stageContainer.innerHTML = dealHtml + underCounterHtml;
  bindCounterEvents(s, c);
}

function getVisualAugHintText(c) {
  if (!c.isAug) return '';
  if (c.augVisualType === 'chip') return ' <span style="color:#fda4af;">（细看肖像：右耳后似乎有微弱红点闪烁…）</span>';
  if (c.augVisualType === 'pupil') return ' <span style="color:#67e8f9;">（细看肖像：双瞳泛着诡异异色反光且从不眨眼…）</span>';
  if (c.augVisualType === 'smile') return ' <span style="color:#fda4af;">（细看肖像：嘴角弧度僵硬得像尺子量出来一样…）</span>';
  return '';
}

function renderInspectionReportHtml(item) {
  const tpl = ITEM_TEMPLATES[item.templateId];
  if (!item.inspectedVisual && !item.inspectedDeep) {
    return `<div class="inspect-findings" style="color:#64748b;">尚未检验商品细节。建议先用【放大镜】核验包装、封口或纯度！</div>`;
  }

  const lines = [];
  const signs = tpl.authenticSigns || {};
  const keys = Object.keys(signs);

  keys.forEach((k, idx) => {
    // 基础放大镜可看前2项特征；若有第3项或深层瑕疵，光谱仪可100%全看清，放大镜看大部分
    const isFlawHere = item.isFake && item.fakeFlaw && item.fakeFlaw.key === k;
    const hiddenWithoutDeep = (idx >= 2 && !item.inspectedDeep && !isFlawHere);

    if (hiddenWithoutDeep) {
      lines.push(`<div class="finding-line" style="color:#64748b;">• [深层指标需光谱仪透视]</div>`);
    } else if (isFlawHere) {
      lines.push(`<div class="finding-line finding-Sus">⚠️ 异常破绽：${item.fakeFlaw.badText}</div>`);
    } else {
      lines.push(`<div class="finding-line finding-ok">✓ 核验正常：${signs[k]}</div>`);
    }
  });

  if (item.inspectedDeep) {
    lines.push(`<div class="finding-line" style="color:#38bdf8;border-top:1px dashed #1e293b;margin-top:4px;padding-top:4px;">
      🔬 光谱仪总结论：${item.isFake ? '❌ 确认为伪造次品！' : '✅ 100% 原装真品'} · ${item.isStolen ? `⚠️ 检测到失主防盗报案码（冷却剩 ${item.heatDays} 天）` : '无防盗追踪码'}
    </div>`);
  }

  return `<div class="inspect-findings">${lines.join('')}</div>`;
}

function bindCounterEvents(s, c) {
  const btnNextEmpty = document.getElementById('btn-next-empty');
  if (btnNextEmpty) {
    btnNextEmpty.onclick = () => {
      sfx.play('click');
      refuseCustomer(s);
      renderAll();
    };
  }

  const btnVisual = document.getElementById('btn-insp-visual');
  if (btnVisual) {
    btnVisual.onclick = () => {
      const res = inspectItem(s, c.offerItem, 'visual');
      sfx.play('scan');
      showToast(res.msg, 'info');
      renderAll();
    };
  }

  const btnDeep = document.getElementById('btn-insp-deep');
  if (btnDeep) {
    btnDeep.onclick = () => {
      const res = inspectItem(s, c.offerItem, 'deep');
      sfx.play(res.ok ? 'scan' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
  }

  const btnOpenConfront = document.getElementById('btn-open-confront');
  if (btnOpenConfront) {
    btnOpenConfront.onclick = () => {
      sfx.play('click');
      document.getElementById('confront-panel').classList.toggle('hidden');
    };
  }

  document.querySelectorAll('.btn-confront-reason').forEach(btn => {
    btn.onclick = () => {
      const reason = btn.getAttribute('data-reason');
      const res = confrontSellerFake(s, reason);
      sfx.play(res.success ? 'coin' : 'alert');
      showToast(res.msg, res.success ? 'good' : 'warn');
      renderAll();
    };
  });

  const btnBuy = document.getElementById('btn-buy-direct');
  if (btnBuy) {
    btnBuy.onclick = () => {
      const res = executeBuyFromCustomer(s, c.askingPrice);
      sfx.play(res.ok ? 'coin' : 'fail');
      showToast(res.msg, res.ok ? 'good' : 'warn');
      renderAll();
    };
  }

  const btnSell = document.getElementById('btn-sell-direct');
  if (btnSell) {
    btnSell.onclick = () => {
      const res = executeSellToCustomer(s, c.currentOffer);
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
  if (btnAppTrue) {
    btnAppTrue.onclick = () => {
      const res = fulfillAppraisal(s, true);
      sfx.play('coin');
      showToast(res.msg, 'info');
      renderAll();
    };
  }

  const btnAppFake = document.getElementById('btn-appraise-fake');
  if (btnAppFake) {
    btnAppFake.onclick = () => {
      const res = fulfillAppraisal(s, false);
      sfx.play('coin');
      showToast(res.msg, 'info');
      renderAll();
    };
  }

  const btnRefuse = document.getElementById('btn-refuse');
  if (btnRefuse) {
    btnRefuse.onclick = () => {
      sfx.play('door');
      const res = refuseCustomer(s);
      showToast(res.msg, 'info');
      renderAll();
    };
  }

  // 柜台下三件套：扫描、举报、霰弹枪
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
        const sure = window.confirm(`⚠️ 警告：你尚未用扫描仪确认【${c.name}】是否为失控 AI 改造体！\n一旦误杀真人类将被治安局重罚 350 CR！确定要直接扣动扳机吗？`);
        if (!sure) return;
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
// 右侧多功能经营面板（库存&秘密暗格 / 后室生产链 / 设备许可商店 / 经营指南）
// ----------------------------------------------------------------------------
function renderRightTabs() {
  const s = gameState;
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-tab') === activeTab);
  });

  const body = document.getElementById('right-tab-body');

  if (activeTab === 'inventory') {
    const shelfUsed = usedSlots(s.shelf);
    const stashUsed = usedSlots(s.stash);
    const curWantedUid = (s.currentCustomer && s.currentCustomer.intent === 'buy_from_shop')
      ? s.currentCustomer.wantedBuyItemUid
      : null;

    body.innerHTML = `
      <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;color:#e2e8f0;">📦 明面主货架 (${shelfUsed}/${s.shelfMaxSlots} 格)</span>
        <span style="font-size:11.5px;color:#94a3b8;">大件占2格 · 小件占1格</span>
      </div>
      <div class="inv-grid">
        ${s.shelf.length === 0 ? `<div style="grid-column:1/-1;color:#64748b;font-size:12px;padding:10px;">主货架空空如也。</div>` : s.shelf.map(it => renderInvItemCard(it, s, 'shelf', curWantedUid)).join('')}
      </div>

      <div style="margin:12px 0 8px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid #1e293b;padding-top:10px;">
        <span style="font-weight:700;color:#c084fc;">🗄️ 柜台下秘密暗格 (${stashUsed}/${s.stashMaxSlots} 格)</span>
        <span style="font-size:11.5px;color:#a855f7;">防治安官搜查 · 顾客不可见</span>
      </div>
      <div class="inv-grid">
        ${s.stash.length === 0 ? `<div style="grid-column:1/-1;color:#64748b;font-size:12px;padding:10px;">暗格为空。可将赃物、无证武器或违禁品藏在这里躲避突击搜查！</div>` : s.stash.map(it => renderInvItemCard(it, s, 'stash', null)).join('')}
      </div>
    `;

    body.querySelectorAll('[data-move-uid]').forEach(btn => {
      btn.onclick = () => {
        const res = toggleItemStorage(s, btn.getAttribute('data-move-uid'));
        sfx.play(res.ok ? 'click' : 'fail');
        showToast(res.msg, res.ok ? 'info' : 'warn');
        renderAll();
      };
    });

    body.querySelectorAll('[data-charge-uid]').forEach(btn => {
      btn.onclick = () => {
        const res = useBatteryForPower(s, btn.getAttribute('data-charge-uid'));
        sfx.play('craft');
        showToast(res.msg, 'good');
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
  } else if (activeTab === 'workshop') {
    const ownedMachines = s.machines.map(id => MACHINES[id]).filter(Boolean);
    body.innerHTML = `
      <div style="font-size:12px;color:#94a3b8;margin-bottom:10px;">
        ⚙️ 后室生产线可将廉价废料、浑浊水、损坏枪械加工成高利润商品（白天与夜晚均可随时开动机器）。
      </div>
      ${ownedMachines.length === 0 ? `
        <div class="machine-card" style="text-align:center;color:#94a3b8;padding:18px;">
          当前后室尚未安装任何生产机器。<br>请前往【证照&设备】标签页购置净水器、改装台、蒸馏釜或解码仪！
        </div>
      ` : ownedMachines.map(m => `
        <div class="machine-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:var(--neon-cyan);font-size:14px;">${m.icon} ${m.name}</strong>
            <span class="badge badge-cyan">已通电就绪</span>
          </div>
          <div style="font-size:12px;color:#94a3b8;margin:4px 0 6px;">${m.desc}</div>
          ${m.recipes.map(r => `
            <div class="recipe-box">
              <div style="flex:1;">
                <div style="font-size:12.5px;font-weight:700;color:#f1f5f9;">${r.name} (-${r.power}⚡)</div>
                <div style="font-size:11.5px;color:#94a3b8;">${r.note}</div>
              </div>
              <button class="btn-primary" data-machine="${m.id}" data-recipe="${r.id}">合成加工</button>
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
  } else if (activeTab === 'upgrades') {
    const machineListHtml = Object.values(MACHINES).map(m => {
      const owned = s.machines.includes(m.id);
      return `
        <div class="machine-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:#f8fafc;">${m.icon} ${m.name}</strong>
            <span style="font-family:var(--font-mono);color:#fde047;font-weight:700;">${owned ? '已安装' : `${m.cost} CR`}</span>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:5px 0 8px;">${m.desc}</p>
          <button class="${owned ? '' : 'btn-primary'}" data-buy-up="${m.id}" ${owned ? 'disabled' : ''}>
            ${owned ? '✓ 已拥有该设备' : `购置设备 (${m.cost} CR)`}
          </button>
        </div>
      `;
    }).join('');

    const upListHtml = UPGRADES_AND_LICENSES.map(u => {
      const owned = s.tools.includes(u.id) || s.licenses.includes(u.id);
      return `
        <div class="machine-card">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong style="color:#f8fafc;">${u.icon} ${u.name}</strong>
            <span style="font-family:var(--font-mono);color:#fde047;font-weight:700;">${owned ? '已激活' : `${u.cost} CR`}</span>
          </div>
          <p style="font-size:12px;color:#94a3b8;margin:5px 0 8px;">${u.desc}</p>
          <button class="${owned ? '' : 'btn-success'}" data-buy-up="${u.id}" ${owned ? 'disabled' : ''}>
            ${owned ? '✓ 已解锁' : `购买解锁 (${u.cost} CR)`}
          </button>
        </div>
      `;
    }).join('');

    body.innerHTML = `
      <h4 style="color:var(--neon-cyan);margin-bottom:8px;">🏭 后室生产链重型设备</h4>
      ${machineListHtml}
      <h4 style="color:#4ade80;margin:14px 0 8px;">📜 官方许可证、鉴定仪器与扩建</h4>
      ${upListHtml}
    `;

    body.querySelectorAll('[data-buy-up]').forEach(btn => {
      btn.onclick = () => {
        const res = purchaseShopUpgrade(s, btn.getAttribute('data-buy-up'));
        sfx.play(res.ok ? 'coin' : 'fail');
        showToast(res.msg, res.ok ? 'good' : 'warn');
        renderAll();
      };
    });
  } else if (activeTab === 'guide') {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px;font-size:12.5px;color:#cbd5e1;">
        <div class="machine-card">
          <strong style="color:var(--neon-cyan);">1. 🔍 真伪鉴定与质询大砍价</strong>
          <p style="margin-top:4px;">收货前先点【放大镜外观核验】（免费）。一旦看到红色异常破绽，点击<strong>【指出假货瑕疵压价】</strong>并选对造假原因，卖家会当场暴降 65%~75% 价格！你既可以拒收，也可以白菜价买进再处理。</p>
        </div>
        <div class="machine-card">
          <strong style="color:#fda4af;">2. 🤖 识别失控 AI 改造体（Aug）</strong>
          <p style="margin-top:4px;">潜伏在人群中的失控 AI 宿主有 6 大蛛丝马迹：<strong>右耳后红光芯片、异色不眨眼瞳孔、僵硬对称假笑、机械抽搐、阵营服饰错位、生硬协议式台词</strong>。可用【AI扫描仪】100%验明正身，拔出<strong>霰弹枪击毙</strong>可领高额赏金！切忌误杀活人！</p>
        </div>
        <div class="machine-card">
          <strong style="color:#c084fc;">3. 🗄️ 赃物、许可证与突击检查</strong>
          <p style="margin-top:4px;">未持证的武器/药剂、带追踪码的赃物、脉冲步枪与猩红星尘摆在明面货架上会被<strong>便衣钓鱼执法</strong>或<strong>治安官查抄</strong>！遇到检查前赶紧把红框物品塞进【秘密暗格】。赃物放满 2 晚或用【序列号打磨机】即可洗白。</p>
        </div>
        <div class="machine-card">
          <strong style="color:#fde047;">4. 🏠 房租与买断自由多结局</strong>
          <p style="margin-top:4px;">每 4 天房东上门收租且金额递增。攒够 <strong>5,000 CR</strong> 点击右上角【买断产权】，将根据你的阵营声望与剧情抉择解锁不同结局，之后还可继续无尽自由经营！</p>
        </div>
      </div>
    `;
  }
}

function renderInvItemCard(item, s, loc, curWantedUid) {
  const illegalReason = getItemIllegalityReason(item, s);
  const fairVal = evaluateItemFairPrice(item, s);
  const slots = itemSlotCost(item);
  const isWantedByBuyer = curWantedUid === item.uid;

  return `
    <div class="inv-card ${illegalReason && loc === 'shelf' ? 'illegal' : ''} ${isWantedByBuyer ? 'wanted-buy' : ''}">
      <div>
        <div class="inv-card-top">
          <span style="font-size:22px;">${item.icon}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:12.5px;font-weight:700;color:#f8fafc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${item.name}">
              ${item.name}
            </div>
            <div style="font-size:11px;color:#94a3b8;">
              估值 ~${fairVal} CR · 占${slots}格
            </div>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:3px;margin-top:5px;">
          ${item.isFake ? '<span class="badge badge-red">赝品</span>' : ''}
          ${item.isStolen ? `<span class="badge badge-amber">赃物(${item.heatDays}天)</span>` : ''}
          ${item.questTag ? '<span class="badge badge-purple">剧情寄存</span>' : ''}
          ${illegalReason && loc === 'shelf' ? '<span class="badge badge-red">违规暴露!</span>' : ''}
          ${isWantedByBuyer ? '<span class="badge badge-green">当前买家求购</span>' : ''}
        </div>
      </div>

      <div class="inv-actions">
        <button data-move-uid="${item.uid}">
          ${loc === 'shelf' ? '🗄️ 藏入暗格' : '📦 摆上货架'}
        </button>
        ${item.templateId === 'energy_cell' ? `<button class="btn-primary" data-charge-uid="${item.uid}">⚡ 充电</button>` : ''}
        ${item.isStolen && s.machines.includes('scrambler') ? `<button class="btn-purple" data-scrub-uid="${item.uid}">💻 洗白</button>` : ''}
      </div>
    </div>
  `;
}

// ----------------------------------------------------------------------------
// 结局结算弹窗渲染
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
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:46px;margin-bottom:6px;">${end.victory ? '🏆' : '💀'}</div>
      <h2 style="font-size:24px;color:${end.victory ? '#fde047' : '#f87171'};margin-bottom:8px;">${end.title}</h2>
      <p style="font-size:14.5px;color:#e2e8f0;max-width:640px;margin:0 auto;line-height:1.65;">${end.desc}</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;background:#090e1a;padding:14px;border-radius:8px;border:1px solid #1e293b;margin-bottom:18px;text-align:center;">
      <div><div style="color:#94a3b8;font-size:12px;">经营天数</div><div style="font-size:18px;font-weight:700;color:#38bdf8;">${gameState.day} 天</div></div>
      <div><div style="color:#94a3b8;font-size:12px;">累计营业收入</div><div style="font-size:18px;font-weight:700;color:#fde047;">${st.totalEarned} CR</div></div>
      <div><div style="color:#94a3b8;font-size:12px;">识破赝品/鉴定</div><div style="font-size:18px;font-weight:700;color:#4ade80;">${st.fakesExposed} 次</div></div>
      <div><div style="color:#94a3b8;font-size:12px;">猎杀AI改造体</div><div style="font-size:18px;font-weight:700;color:#c084fc;">${st.augsEliminated} 具</div></div>
      <div><div style="color:#94a3b8;font-size:12px;">后室制造货品</div><div style="font-size:18px;font-weight:700;color:#f472b6;">${st.itemsCrafted} 件</div></div>
    </div>

    <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
      ${end.victory ? `<button class="btn-success" id="btn-endless">🚀 继续无尽自由经营（免房租）</button>` : ''}
      <button class="btn-primary" id="btn-restart-new">🔄 选择新职业重开一局</button>
    </div>
  `;

  const btnEndless = document.getElementById('btn-endless');
  if (btnEndless) {
    btnEndless.onclick = () => {
      sfx.play('coin');
      continueEndlessAfterVictory(gameState);
      renderAll();
    };
  }

  document.getElementById('btn-restart-new').onclick = () => {
    localStorage.removeItem(SAVE_KEY);
    modal.classList.add('hidden');
    openStartModal(false);
  };
}

// ----------------------------------------------------------------------------
// 启动与全局事件绑定
// ----------------------------------------------------------------------------
function initApp() {
  // 标签页切换
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sfx.play('click');
      activeTab = btn.getAttribute('data-tab');
      renderRightTabs();
    });
  });

  // 顶部功能按钮
  document.getElementById('btn-buyout').addEventListener('click', () => {
    if (!gameState) return;
    const res = buyoutShopProperty(gameState);
    if (!res.ok) {
      sfx.play('fail');
      showToast(res.msg, 'warn');
    } else {
      sfx.play('coin');
      renderAll();
    }
  });

  document.getElementById('btn-mute').addEventListener('click', (e) => {
    sfx.muted = !sfx.muted;
    e.currentTarget.textContent = sfx.muted ? '🔇 静音' : '🔊 音效';
  });

  document.getElementById('btn-newgame-top').addEventListener('click', () => {
    sfx.play('click');
    openStartModal(true);
  });

  // 肖像微动画循环（呼吸、眨眼、AI改造体芯片闪烁与机械抽搐）
  setInterval(() => {
    animTick++;
    if (gameState && gameState.phase === 'open') {
      drawCustomerPortrait(document.getElementById('customer-canvas'), gameState.currentCustomer, animTick);
    }
  }, 110);

  // 打开开局界面
  openStartModal(false);
}

window.addEventListener('DOMContentLoaded', initApp);
