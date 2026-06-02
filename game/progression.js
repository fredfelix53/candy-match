/* ===== Candy Match — Full Progression System ===== */
(function() {
  'use strict';

  const SAVE_KEY = 'candymatch_progress';
  const DAILY_KEY = 'candymatch_daily';

  const UPGRADE_TIERS = {
    weapon: {
      name: 'Candy', icon: '🍬', maxLevel: 5, baseCost: 1000, costMultiplier: 2, gemCost: 50,
      levels: [
        { level: 0, name: 'Sour Drop',      bonus: { matchBonus: 0, scoreMult: 1.0 },  gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Sweet Cube',     bonus: { matchBonus: 2, scoreMult: 1.1 },   gemReq: 50,  coinsReq: 1000 },
        { level: 2, name: 'Lollipop',       bonus: { matchBonus: 5, scoreMult: 1.2 },   gemReq: 80,  coinsReq: 2000 },
        { level: 3, name: 'Chocolate Bar',  bonus: { matchBonus: 10, scoreMult: 1.35 }, gemReq: 120, coinsReq: 4000 },
        { level: 4, name: 'Caramel Swirl',  bonus: { matchBonus: 15, scoreMult: 1.5 },  gemReq: 200, coinsReq: 8000 },
        { level: 5, name: '🍬 Cosmic',     bonus: { matchBonus: 25, scoreMult: 2.0 },   gemReq: 500, coinsReq: 20000 },
      ]
    },
    case: {
      name: 'Basket', icon: '🧺', maxLevel: 5, baseCost: 800, costMultiplier: 2, gemCost: 50,
      levels: [
        { level: 0, name: 'Small Basket',   bonus: { startMoves: 0, extraSwap: 0 },     gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Woven Basket',   bonus: { startMoves: 2, extraSwap: 0 },     gemReq: 40,  coinsReq: 800 },
        { level: 2, name: 'Gift Box',       bonus: { startMoves: 3, extraSwap: 1 },     gemReq: 70,  coinsReq: 1600 },
        { level: 3, name: 'Treasure Chest', bonus: { startMoves: 5, extraSwap: 1 },     gemReq: 100, coinsReq: 3200 },
        { level: 4, name: 'Golden Basket',  bonus: { startMoves: 7, extraSwap: 2 },     gemReq: 180, coinsReq: 6400 },
        { level: 5, name: '🧺 Magic',     bonus: { startMoves: 10, extraSwap: 3 },     gemReq: 400, coinsReq: 16000 },
      ]
    },
    outfit: {
      name: 'Wrap', icon: '🎀', maxLevel: 5, baseCost: 600, costMultiplier: 2, gemCost: 40,
      levels: [
        { level: 0, name: 'Plain Wrap',     bonus: { comboBonus: 0, specialChance: 0 },    gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Ribbon',         bonus: { comboBonus: 3, specialChance: 0.02 }, gemReq: 30,  coinsReq: 600 },
        { level: 2, name: 'Bow Tie',        bonus: { comboBonus: 5, specialChance: 0.04 }, gemReq: 60,  coinsReq: 1200 },
        { level: 3, name: 'Fancy Wrap',     bonus: { comboBonus: 8, specialChance: 0.06 }, gemReq: 90,  coinsReq: 2400 },
        { level: 4, name: 'Gift Wrap',      bonus: { comboBonus: 12, specialChance: 0.08 },gemReq: 150, coinsReq: 4800 },
        { level: 5, name: '🎀 Celestial', bonus: { comboBonus: 20, specialChance: 0.12 }, gemReq: 350, coinsReq: 12000 },
      ]
    }
  };

  const CATALOG = {
    candyThemes: [
      { id: 'classic',  name: 'Classic Sweets',  price: 0,    desc: 'Red, blue, green, yellow, purple, orange' },
      { id: 'fruit',    name: 'Fruit Fiesta',    price: 600,  desc: 'Fruit-shaped candies' },
      { id: 'gemstone', name: 'Gemstone',        price: 1500, desc: 'Precious gem look' },
      { id: 'space',    name: 'Space Treats',    price: 3000, desc: 'Cosmic candy colors' },
      { id: 'neon',     name: 'Neon Gummies',    price: 5000, desc: 'Bright neon gummies' },
    ],
    boardBackgrounds: [
      { id: 'dark',     name: 'Dark Table',      price: 0,    desc: 'Classic dark board' },
      { id: 'wood',     name: 'Wooden Table',    price: 500,  desc: 'Warm wood surface' },
      { id: 'marble',   name: 'Marble Surface',  price: 1000, desc: 'Elegant marble' },
      { id: 'cotton',   name: 'Cotton Candy',    price: 2000, desc: 'Soft pink pastel' },
      { id: 'galaxy',   name: 'Galaxy Board',    price: 4000, desc: 'Star-filled cosmos' },
    ],
    effects: [
      { id: 'normal',   name: 'Normal Pop',      price: 0,    desc: 'Standard match effect' },
      { id: 'sparkle',  name: 'Sparkle',         price: 600,  desc: 'Sparkly particles' },
      { id: 'fire',     name: 'Fire Burst',      price: 1500, desc: 'Flame explosion' },
      { id: 'magic',    name: 'Magic Twinkle',   price: 3000, desc: 'Magical sparkles' },
    ],
    powerupPacks: [
      { id: 'striped',  name: 'Striped Candy',   price: 400,  desc: 'Clear a row/column' },
      { id: 'wrapped',  name: 'Wrapped Candy',   price: 600,  desc: 'Clear 3x3 area' },
      { id: 'bomb',     name: 'Color Bomb',      price: 1000, desc: 'Clear all of one color' },
    ],
  };

  const ACHIEVEMENTS = [
    { id: 'first_play',   name: 'First Match',      desc: 'Play your first game',                reward: { coins: 50, gems: 0 },  icon: '🎮' },
    { id: 'score_500',    name: '500 Points',       desc: 'Score 500 in one game',               reward: { coins: 100, gems: 0 }, icon: '💯' },
    { id: 'score_2000',   name: '2000 Points',      desc: 'Score 2000 in one game',              reward: { coins: 300, gems: 5 }, icon: '🏆' },
    { id: 'score_5000',   name: '5000 Points',      desc: 'Score 5000 in one game',              reward: { coins: 800, gems: 15 },icon: '🌟' },
    { id: 'score_10000',  name: 'Candy Legend',     desc: 'Score 10000 in one game',             reward: { coins: 2000, gems: 30 },icon: '👑' },
    { id: 'combo_2',      name: 'Chain Reaction',   desc: 'Trigger a 2-chain combo',             reward: { coins: 100, gems: 0 }, icon: '2️⃣' },
    { id: 'combo_3',      name: 'Triple Chain',     desc: 'Trigger a 3-chain combo',             reward: { coins: 300, gems: 5 }, icon: '3️⃣' },
    { id: 'combo_5',      name: 'Chain Master',     desc: 'Trigger a 5-chain combo',             reward: { coins: 1000, gems: 20 },icon: '💥' },
    { id: 'special_1',    name: 'Special Candy',    desc: 'Create a special candy',              reward: { coins: 200, gems: 0 }, icon: '⭐' },
    { id: 'level_5',      desc: 'Clear 5 levels',   reward: { coins: 500, gems: 10 }, icon: '📈', name: 'Level Up' },
    { id: 'level_10',     name: 'Candy Champion',   desc: 'Clear 10 levels',                    reward: { coins: 1500, gems: 25 },icon: '🏅' },
    { id: 'color_clear',  name: 'Rainbow Sweep',    desc: 'Use a color bomb',                    reward: { coins: 500, gems: 10 },icon: '🌈' },
    { id: 'weapon_5',     name: 'Candy Master',     desc: 'Max Candy upgrade',                   reward: { coins: 2000, gems: 50 },icon: '🍬' },
    { id: 'case_5',       name: 'Basket King',      desc: 'Max Basket upgrade',                  reward: { coins: 2000, gems: 50 },icon: '🧺' },
    { id: 'outfit_5',     name: 'Wrap Legend',      desc: 'Max Wrap upgrade',                    reward: { coins: 2000, gems: 50 },icon: '🎀' },
  ];
  ACHIEVEMENTS.forEach(a => { a.check = genCheck(a); });

  function genCheck(ach) {
    const id = ach.id;
    return function(p) {
      if (id === 'first_play') return p.totalPlays >= 1;
      if (id === 'score_500') return p.bestScore >= 500;
      if (id === 'score_2000') return p.bestScore >= 2000;
      if (id === 'score_5000') return p.bestScore >= 5000;
      if (id === 'score_10000') return p.bestScore >= 10000;
      if (id === 'combo_2') return p.bestCombo >= 2;
      if (id === 'combo_3') return p.bestCombo >= 3;
      if (id === 'combo_5') return p.bestCombo >= 5;
      if (id === 'special_1') return p.specialsCreated >= 1;
      if (id === 'level_5') return p.levelsCleared >= 5;
      if (id === 'level_10') return p.levelsCleared >= 10;
      if (id === 'color_clear') return p.colorBombsUsed >= 1;
      if (id === 'weapon_5') return (p.upgrades?.weapon || 0) >= 5;
      if (id === 'case_5') return (p.upgrades?.case || 0) >= 5;
      if (id === 'outfit_5') return (p.upgrades?.outfit || 0) >= 5;
      return false;
    };
  }

  function defaultState() {
    return {
      coins: 100, gems: 0, totalGems: 0, xp: 0, level: 1,
      bestScore: 0, bestCombo: 0, specialsCreated: 0, levelsCleared: 0, colorBombsUsed: 0,
      totalPlays: 0, bestStreak: 0,
      upgrades: { weapon: 0, case: 0, outfit: 0 },
      ownedCandyThemes: ['classic'],
      ownedBoardBackgrounds: ['dark'],
      ownedEffects: ['normal'],
      activeCandyTheme: 'classic',
      activeBoardBackground: 'dark',
      activeEffect: 'normal',
      powerups: { striped: 2, wrapped: 2, bomb: 1 },
      inventory: {},
      achievements: {},
      lastSaveDate: null,
    };
  }

  let state = null;

  function save() { state.lastSaveDate = new Date().toISOString(); try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {} }
  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) { state = { ...defaultState(), ...JSON.parse(raw) }; save(); return true; }
    } catch(e) {}
    reset(); return false;
  }
  function reset() { state = defaultState(); save(); }
  function xpForLevel(l) { return Math.floor(100 * Math.pow(1.2, l - 1)); }
  function addXp(a) { if (!state) return; state.xp += a; let l = false; while (state.xp >= xpForLevel(state.level)) { state.xp -= xpForLevel(state.level); state.level++; l = true; } save(); return l; }
  function addCoins(a) { if (!state) return 0; state.coins += a; save(); return state.coins; }
  function spendCoins(a) { if (!state || state.coins < a) return false; state.coins -= a; save(); return true; }
  function addGems(a) { if (!state) return 0; state.gems += a; state.totalGems += a; save(); return state.gems; }
  function spendGems(a) { if (!state || state.gems < a) return false; state.gems -= a; save(); return true; }

  function getUpgradeCost(cat, cl) { const t = UPGRADE_TIERS[cat]; if (!t) return null; const d = t.levels.find(l => l.level === cl + 1); return d ? { coins: d.coinsReq, gems: d.gemReq } : null; }
  function upgradeItem(cat, useGems) {
    if (!state) return { success: false };
    const t = UPGRADE_TIERS[cat]; const cl = state.upgrades[cat] || 0;
    if (cl >= t.maxLevel) return { success: false, reason: 'max' };
    const c = getUpgradeCost(cat, cl);
    if (!c) return { success: false };
    if (useGems) { if (state.gems < c.gems) return { success: false, reason: 'gems' }; spendGems(c.gems); }
    else { if (state.coins < c.coins) return { success: false, reason: 'coins' }; spendCoins(c.coins); }
    state.upgrades[cat]++; save(); return { success: true, newLevel: state.upgrades[cat] };
  }

  function getActiveBonuses() {
    if (!state) return { matchBonus: 0, scoreMult: 1, startMoves: 0, extraSwap: 0, comboBonus: 0, specialChance: 0 };
    const b = { matchBonus: 0, scoreMult: 1, startMoves: 0, extraSwap: 0, comboBonus: 0, specialChance: 0 };
    const w = state.upgrades.weapon || 0; const wd = UPGRADE_TIERS.weapon.levels[w];
    if (wd) { b.matchBonus = wd.bonus.matchBonus; b.scoreMult = wd.bonus.scoreMult; }
    const c = state.upgrades.case || 0; const cd = UPGRADE_TIERS.case.levels[c];
    if (cd) { b.startMoves = cd.bonus.startMoves; b.extraSwap = cd.bonus.extraSwap; }
    const o = state.upgrades.outfit || 0; const od = UPGRADE_TIERS.outfit.levels[o];
    if (od) { b.comboBonus = od.bonus.comboBonus; b.specialChance = od.bonus.specialChance; }
    return b;
  }

  function checkAchievements() {
    if (!state) return [];
    const u = [];
    for (const a of ACHIEVEMENTS) { if (state.achievements[a.id]) continue; if (a.check(state)) { state.achievements[a.id] = true; addCoins(a.reward.coins); if (a.reward.gems) addGems(a.reward.gems); u.push(a); } }
    if (u.length > 0) save(); return u;
  }

  function claimDailyBonus() {
    if (!state) return null;
    const now = new Date(), today = now.toDateString();
    try {
      const last = localStorage.getItem(DAILY_KEY);
      if (last === today) return null;
      const yest = new Date(now); yest.setDate(yest.getDate() - 1);
      let streak = last === yest.toDateString() ? (state.dailyStreak || 0) + 1 : 1;
      state.dailyStreak = streak; if (streak > state.bestStreak) state.bestStreak = streak;
      const coins = Math.min(100 + (streak - 1) * 20, 1000);
      const gems = streak >= 7 ? 5 : streak >= 3 ? 2 : 0;
      addCoins(coins); if (gems) addGems(gems);
      localStorage.setItem(DAILY_KEY, today); save(); return { streak, coins, gems };
    } catch(e) { return null; }
  }

  function endOfGame(result) {
    if (!state) return;
    state.totalPlays++;
    if (result.score > state.bestScore) state.bestScore = result.score;
    if (result.bestCombo > state.bestCombo) state.bestCombo = result.bestCombo;
    if (result.specialsCreated) state.specialsCreated += result.specialsCreated;
    if (result.levelsCleared) state.levelsCleared += result.levelsCleared;
    if (result.colorBombsUsed) state.colorBombsUsed += result.colorBombsUsed;
    const xpGain = Math.floor(result.score / 10) + result.bestCombo * 10 + 20;
    addXp(xpGain);
    const coinGain = Math.floor(result.score / 20) + result.bestCombo * 5 + 5;
    addCoins(coinGain);
    save();
  }

  function purchasePremiumItem(itemId) {
    if (!state) return false;
    if (itemId === 'remove_ads') {
      state.adFree = true;
      if (!state.inventory) state.inventory = {};
      state.inventory.remove_ads = true;
      save();
      if (window.AdsManager && typeof AdsManager.onAdsRemoved === 'function') {
        AdsManager.onAdsRemoved();
      }
      return true;
    }
    return false;
  }

  window.ProgressionSystem = {
    load, save, reset, addCoins, spendCoins, addGems, spendGems, addXp, xpForLevel,
    upgradeItem, getUpgradeCost, getActiveBonuses, getUpgradeTiers, UPGRADE_TIERS,
    getCatalog, CATALOG, getAchievements, ACHIEVEMENTS,
    checkAchievements, endOfGame, claimDailyBonus, purchasePremiumItem, getState, defaultState,
    getCoinBalance: () => state ? state.coins : 0,
    getGemBalance: () => state ? state.gems : 0,
  };
})();
