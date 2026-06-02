/* ===== Candy Match — Shop & IAP ===== */
(function() {
  'use strict';
  let sc = null, activeTab = 'coins';
  function fmt(p) { return '€' + p.toFixed(2); }
  function open() {
    if (sc) { sc.style.display = 'block'; show(activeTab); return; }
    sc = document.createElement('div'); sc.id = 'shop-panel';
    sc.innerHTML = `<div class="shop-overlay"></div><div class="shop-window"><button class="shop-close">&times;</button><h2 class="shop-title">🍬 Candy Shop</h2><div class="shop-balance-bar"><span class="balance-item"><span class="coin-icon">🪙</span> <span id="shop-coins">0</span></span><span class="balance-item"><span class="gem-icon">💎</span> <span id="shop-gems">0</span></span></div><div class="shop-tabs"><button class="shop-tab" data-tab="coins">🛒 Shop</button><button class="shop-tab" data-tab="upgrades">⚡ Upgrades</button><button class="shop-tab" data-tab="premium">👑 Premium</button></div><div class="shop-content" id="shop-content"></div></div>`;
    document.body.appendChild(sc);
    sc.querySelector('.shop-close').addEventListener('click', close);
    sc.querySelector('.shop-overlay').addEventListener('click', close);
    sc.querySelectorAll('.shop-tab').forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));
    show('upgrades'); updateBal();
  }
  function close() { if (sc) sc.style.display = 'none'; }
  function show(tab) {
    activeTab = tab; if (!sc) return;
    sc.querySelectorAll('.shop-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    const c = sc.querySelector('#shop-content');
    if (tab === 'coins') renderCoin(c);
    else if (tab === 'upgrades') renderUpgrade(c);
    else if (tab === 'premium') renderPremium(c);
    updateBal();
  }
  function updateBal() {
    const c = sc?.querySelector('#shop-coins'); const g = sc?.querySelector('#shop-gems');
    if (c) c.textContent = ProgressionSystem.getCoinBalance();
    if (g) g.textContent = ProgressionSystem.getGemBalance();
  }

  function renderCoin(container) {
    const cat = ProgressionSystem.getCatalog(), st = ProgressionSystem.getState();
    let html = '<div class="shop-section"><h3>🍬 Candy Themes</h3><div class="shop-grid">';
    for (const ct of cat.candyThemes) {
      const owned = st.ownedCandyThemes.includes(ct.id), active = st.activeCandyTheme === ct.id;
      html += `<div class="shop-item ${owned ? 'owned' : ''} ${active ? 'active' : ''}" data-type="candyTheme" data-id="${ct.id}" data-price="${ct.price}"><div class="item-name">${ct.name}</div><div class="item-desc">${ct.desc}</div>${owned ? (active ? '<span class="item-status">✓ Active</span>' : '<button class="btn-equip">Equip</button>') : `<button class="btn-buy">🪙 ${ct.price}</button>`}</div>`;
    }
    html += '</div></div><div class="shop-section"><h3>🎨 Board Backgrounds</h3><div class="shop-grid">';
    for (const bg of cat.boardBackgrounds) {
      const owned = st.ownedBoardBackgrounds.includes(bg.id), active = st.activeBoardBackground === bg.id;
      html += `<div class="shop-item ${owned ? 'owned' : ''} ${active ? 'active' : ''}" data-type="boardBackground" data-id="${bg.id}" data-price="${bg.price}"><div class="item-name">${bg.name}</div><div class="item-desc">${bg.desc}</div>${owned ? (active ? '<span class="item-status">✓ Active</span>' : '<button class="btn-equip">Equip</button>') : `<button class="btn-buy">🪙 ${bg.price}</button>`}</div>`;
    }
    html += '</div></div><div class="shop-section"><h3>✨ Match Effects</h3><div class="shop-grid">';
    for (const ef of cat.effects) {
      const owned = st.ownedEffects.includes(ef.id), active = st.activeEffect === ef.id;
      html += `<div class="shop-item ${owned ? 'owned' : ''} ${active ? 'active' : ''}" data-type="effect" data-id="${ef.id}" data-price="${ef.price}"><div class="item-name">${ef.name}</div><div class="item-desc">${ef.desc}</div>${owned ? (active ? '<span class="item-status">✓ Active</span>' : '<button class="btn-equip">Equip</button>') : `<button class="btn-buy">🪙 ${ef.price}</button>`}</div>`;
    }
    html += '</div></div>';
    container.innerHTML = html;
    container.querySelectorAll('.btn-buy').forEach(btn => btn.addEventListener('click', (e) => { const it = e.target.closest('.shop-item'); buy(it.dataset.type, it.dataset.id, parseInt(it.dataset.price)); }));
    container.querySelectorAll('.btn-equip').forEach(btn => btn.addEventListener('click', (e) => { const it = e.target.closest('.shop-item'); equip(it.dataset.type, it.dataset.id); }));
  }

  function buy(type, id, price) {
    const st = ProgressionSystem.getState();
    const map = { candyTheme: 'ownedCandyThemes', boardBackground: 'ownedBoardBackgrounds', effect: 'ownedEffects' };
    const amap = { candyTheme: 'activeCandyTheme', boardBackground: 'activeBoardBackground', effect: 'activeEffect' };
    if (map[type] && st[map[type]].includes(id)) { equip(type, id); return; }
    if (!ProgressionSystem.spendCoins(price)) { ntf('Not enough coins!'); return; }
    st[map[type]].push(id); st[amap[type]] = id; ProgressionSystem.save();
    ntf('Purchased! ✨'); show('coins');
  }

  function equip(type, id) {
    const st = ProgressionSystem.getState();
    const map = { candyTheme: 'ownedCandyThemes', boardBackground: 'ownedBoardBackgrounds', effect: 'ownedEffects' };
    const amap = { candyTheme: 'activeCandyTheme', boardBackground: 'activeBoardBackground', effect: 'activeEffect' };
    if (!st[map[type]].includes(id)) return;
    st[amap[type]] = id; ProgressionSystem.save(); show('coins'); ntf('Applied! ✅');
  }

  function renderUpgrade(container) {
    const tiers = ProgressionSystem.getUpgradeTiers(), st = ProgressionSystem.getState(), b = ProgressionSystem.getActiveBonuses();
    let html = '<div class="shop-section"><h3>⚡ Upgrade Station</h3><p class="shop-subtitle">Permanent candy upgrades</p>';
    html += `<div class="bonus-summary"><span>🍬 Match Bonus: <strong>+${b.matchBonus}</strong></span><span>💯 Score: <strong>${b.scoreMult.toFixed(2)}x</strong></span><span>🧺 Start Moves: <strong>+${b.startMoves}</strong></span><span>🎀 Combo Bonus: <strong>+${b.comboBonus}</strong></span><span>✨ Special Chance: <strong>+${Math.round((b.specialChance||0)*100)}%</strong></span></div>`;
    html += `<div class="upgrade-balance"><span>🪙 ${st.coins.toLocaleString()}</span><span>💎 ${st.gems}</span></div>`;
    for (const [cat, tier] of Object.entries(tiers)) {
      const cl = st.upgrades[cat] || 0, maxed = cl >= tier.maxLevel;
      const costs = maxed ? null : ProgressionSystem.getUpgradeCost(cat, cl);
      html += `<div class="upgrade-card" data-cat="${cat}"><div class="upgrade-header"><span class="upgrade-icon">${tier.icon}</span><span class="upgrade-name">${tier.name}</span><span class="upgrade-level">Lv.${cl} → ${cl+1}</span></div><div class="upgrade-bar"><div class="upgrade-fill" style="width:${(cl/tier.maxLevel)*100}%"></div></div><div class="upgrade-dots">`;
      for (let i = 0; i <= tier.maxLevel; i++) html += `<span class="upgrade-dot ${i <= cl ? 'filled' : ''} ${i === cl+1 ? 'next' : ''}">${i}</span>`;
      html += `</div>`;
      if (tier.levels[cl]) html += `<div class="upgrade-current">Current: <strong>${tier.levels[cl].name}</strong></div>`;
      if (tier.levels[cl+1]) html += `<div class="upgrade-next">Next: <strong>${tier.levels[cl+1].name}</strong></div>`;
      if (maxed) html += `<div class="upgrade-maxed">⭐ MAX ⭐</div>`;
      else if (costs) html += `<div class="upgrade-actions"><button class="btn-upgrade coin-upgrade ${st.coins >= costs.coins ? '' : 'disabled'}" data-cat="${cat}" data-currency="coins">🪙 ${costs.coins.toLocaleString()}</button><button class="btn-upgrade gem-upgrade ${st.gems >= costs.gems ? '' : 'disabled'}" data-cat="${cat}" data-currency="gems">💎 ${costs.gems}</button></div>`;
      html += `</div>`;
    }
    container.innerHTML = html;
    container.querySelectorAll('.btn-upgrade:not(.disabled)').forEach(btn => btn.addEventListener('click', (e) => {
      const cat = e.target.closest('.upgrade-card').dataset.cat, cur = btn.dataset.currency;
      const r = ProgressionSystem.upgradeItem(cat, cur === 'gems');
      if (r.success) { ntf(`⬆️ ${cat} to Lv.${r.newLevel}!`); renderUpgrade(container); updateBal(); } else ntf('Not enough!');
    }));
  }

  function renderPremium(container) {
    const st = ProgressionSystem.getState();
    let html = '<div class="shop-section"><h3>👑 Premium</h3><h4>🚫 Ads</h4><div class="shop-grid">';
    html += `<div class="shop-item premium-item ${st.adFree ? 'owned' : ''}"><div class="item-name">Remove Ads</div><div class="item-desc">Permanently remove all ads</div>${st.adFree ? '<span class="item-status">✓ Active</span>' : '<button class="btn-buy premium-btn iap-btn" data-id="remove_ads">€2.99</button>'}</div></div></div>`;
    container.innerHTML = html;
    container.querySelectorAll('.iap-btn').forEach(btn => btn.addEventListener('click', () => {
      if (confirm('Buy Remove Ads for €2.99? (Simulated)')) {
        ProgressionSystem.purchasePremiumItem('remove_ads');
        ntf('✅ Purchased!'); renderPremium(container); updateBal();
      }
    }));
  }

  function ntf(msg) {
    const el = document.getElementById('notification') || (() => { const n = document.createElement('div'); n.id = 'notification'; document.body.appendChild(n); return n; })();
    el.textContent = msg; el.className = 'show'; clearTimeout(el._timeout); el._timeout = setTimeout(() => el.className = '', 2500);
  }

  window.ShopUI = { open, close, showTab: show, updateBalances: updateBal };
})();
