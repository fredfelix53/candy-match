/* ===== Retention System — Daily Rewards, Streaks, Push Reminders =====
   Drives daily engagement through:
   - Calendar-style daily rewards (7-day rolling, resets on miss)
   - Streak tracking (consecutive days played)
   - Push notification scheduling
   - Return-player incentives
   Configurable per game.
*/
(function(global) {
  'use strict';

  const STORAGE_KEY = 'retention_system_state';

  // ─── Default Daily Reward Schedule ──────────────
  const DEFAULT_DAILY_REWARDS = [
    { day: 0, reward: { coins: 100 },                   label: '100 🪙',         icon: '🪙' },
    { day: 1, reward: { coins: 150, gems: 1 },          label: '150 🪙 + 1 💎',  icon: '💎' },
    { day: 2, reward: { coins: 200 },                   label: '200 🪙',         icon: '🪙' },
    { day: 3, reward: { gems: 3 },                      label: '3 💎',           icon: '💎' },
    { day: 4, reward: { coins: 300, gems: 2 },          label: '300 🪙 + 2 💎',  icon: '💎' },
    { day: 5, reward: { coins: 500, gems: 3 },          label: '500 🪙 + 3 💎',  icon: '🎁' },
    { day: 6, reward: { coins: 1000, gems: 10, item: { id: 'chest', count: 1 } }, label: '🎉 JACKPOT!', icon: '👑' },
  ];

  // ─── State ───────────────────────────────────────
  let config = {
    dailyRewards: [],             // 7-day reward schedule
    streakReminderIntervalMs: 14400000, // push every 4h if idle
    returnPlayerBonusMultiplier: 2,
    returnPlayerBonusHours: 48,   // if away >48h, give bonus
    showRewardAnimation: true,
    rewardAnimationDurationMs: 2000,
  };

  let state = {
    streak: 0,                    // consecutive days played
    lastPlayedDate: null,         // date string of last play
    dailyRewardClaimed: false,    // claimed today's reward?
    dailyRewardDayIndex: 0,       // index in dailyRewards (0-6, wraps)
    totalDaysPlayed: 0,
    lastActiveTimestamp: 0,       // for idle detection
    lastPushReminderSent: 0,      // timestamp
    earnedRewards: [],            // history of claimed rewards
    returnPlayerBonusActive: false,
  };

  let isInitialized = false;

  // ─── Initialize ──────────────────────────────────
  function init(overrides) {
    if (overrides) {
      if (overrides.dailyRewards) config.dailyRewards = overrides.dailyRewards;
      if (overrides.returnPlayerBonusMultiplier) config.returnPlayerBonusMultiplier = overrides.returnPlayerBonusMultiplier;
      if (overrides.returnPlayerBonusHours) config.returnPlayerBonusHours = overrides.returnPlayerBonusHours;
    }

    // Fill defaults
    if (config.dailyRewards.length === 0) config.dailyRewards = DEFAULT_DAILY_REWARDS;

    loadState();
    checkDaily();
    isInitialized = true;
  }

  // ─── Persistence ─────────────────────────────────
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = Object.assign(state, parsed);
      }
    } catch(e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch(e) {}
  }

  // ─── Daily Check ─────────────────────────────────
  function checkDaily() {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    // First time playing ever?
    if (!state.lastPlayedDate) {
      state.streak = 1;
      state.dailyRewardDayIndex = 0;
      state.dailyRewardClaimed = false;
      state.lastPlayedDate = today;
      state.totalDaysPlayed = 1;
      saveState();
      return;
    }

    // Already played today?
    if (state.lastPlayedDate === today) return;

    // Check if streak continues
    if (state.lastPlayedDate === yesterday) {
      // Consecutive day!
      state.streak++;
      state.dailyRewardDayIndex = (state.dailyRewardDayIndex + 1) % config.dailyRewards.length;
    } else {
      // Streak broken :( — check for return bonus
      const hoursAway = (Date.now() - new Date(state.lastPlayedDate).getTime()) / 3600000;
      if (hoursAway >= config.returnPlayerBonusHours) {
        state.returnPlayerBonusActive = true;
      }
      state.streak = 1;
      state.dailyRewardDayIndex = 0;
    }

    state.dailyRewardClaimed = false;
    state.lastPlayedDate = today;
    state.totalDaysPlayed++;
    saveState();
  }

  // ─── Claim Daily Reward ──────────────────────────
  function claimDailyReward() {
    if (state.dailyRewardClaimed) return { success: false, reason: 'already_claimed' };

    const rewardDef = config.dailyRewards[state.dailyRewardDayIndex];
    if (!rewardDef) return { success: false, reason: 'no_reward' };

    let coins = rewardDef.reward.coins || 0;
    let gems = rewardDef.reward.gems || 0;

    // Apply return player bonus
    if (state.returnPlayerBonusActive) {
      coins = Math.floor(coins * config.returnPlayerBonusMultiplier);
      gems = Math.floor(gems * config.returnPlayerBonusMultiplier);
      state.returnPlayerBonusActive = false;
    }

    // Grant rewards
    if (global.ProgressionSystem) {
      if (coins > 0) global.ProgressionSystem.addCoins(coins);
      if (gems > 0) global.ProgressionSystem.addGems(gems);
    }

    state.dailyRewardClaimed = true;
    state.earnedRewards.push({
      date: state.lastPlayedDate,
      day: state.dailyRewardDayIndex,
      coins, gems,
    });
    saveState();

    showToast('🎁 Daily reward: +' + coins + '🪙' + (gems > 0 ? ' +' + gems + '💎' : '') + '!');
    return { success: true, coins, gems, day: state.dailyRewardDayIndex };
  }

  // ─── Game End Tracking ───────────────────────────
  function onGameEnd(score, linesCleared, won) {
    // Track last active time for idle detection
    state.lastActiveTimestamp = Date.now();

    // If it's a new highscore or significant achievement, save
    // This is called by game.js on game over
    saveState();
  }

  // ─── Push Reminder ───────────────────────────────
  function sendPushReminderIfNeeded() {
    const now = Date.now();
    if (now - state.lastPushReminderSent < config.streakReminderIntervalMs) return;

    // Check if player hasn't played today
    const today = new Date().toDateString();
    if (state.lastPlayedDate === today) return; // already played

    state.lastPushReminderSent = now;
    saveState();

    // Try Web Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🎮 Come play!', {
          body: 'Your ' + state.streak + '-day streak is waiting! Claim your daily reward 🎁',
          icon: '/icon-192.png',
        });
      } catch(e) {}
    }
  }

  // ─── Request Notification Permission ─────────────
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  // ─── UI Builder ──────────────────────────────────
  function buildDailyRewardsHTML() {
    let html = '<div class="retention-panel">';
    html += '<h3 style="text-align:center;margin:0 0 10px;color:var(--accent-gold);">📅 Daily Rewards</h3>';
    html += '<div style="text-align:center;margin-bottom:10px;">🔥 <strong>' + state.streak + '</strong> day streak' +
      (state.returnPlayerBonusActive ? ' <span style="color:#ff9800;">🎉 Return Bonus Active! (2x)</span>' : '') +
    '</div>';

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(80px,1fr));gap:6px;">';
    config.dailyRewards.forEach((r, i) => {
      const isToday = i === state.dailyRewardDayIndex;
      const past = state.dailyRewardDayIndex > i;
      const claimed = isToday && state.dailyRewardClaimed;
      let cellClass = '';
      let extraStyle = '';
      if (claimed) { cellClass = 'claimed'; extraStyle = 'opacity:0.5;'; }
      else if (isToday) { cellClass = 'today'; extraStyle = 'border:2px solid var(--accent-gold);'; }
      else if (past && !isToday) { cellClass = 'claimed'; extraStyle = 'opacity:0.4;'; }
      else { extraStyle = 'opacity:0.6;'; }

      html += '<div class="reward-cell ' + cellClass + '" style="background:rgba(255,255,255,0.04);border-radius:10px;padding:8px;text-align:center;' + extraStyle + '">' +
        '<div style="font-size:22px;">' + r.icon + '</div>' +
        '<div style="font-size:9px;color:var(--text-secondary);margin-top:2px;">' + r.label + '</div>' +
        (isToday && !claimed ? '<div style="font-size:10px;color:#4caf50;font-weight:700;">TODAY</div>' : '') +
        (claimed ? '<div style="font-size:10px;color:#4caf50;">✅</div>' : '') +
      '</div>';
    });
    html += '</div>';

    // Claim button (only show if not claimed today)
    if (!state.dailyRewardClaimed) {
      const rewardDef = config.dailyRewards[state.dailyRewardDayIndex];
      html += '<button class="game-btn" style="margin:12px auto 0;display:block;padding:10px 30px;font-size:16px;background:linear-gradient(135deg,#ff9800,#f44336);" onclick="RetentionSystem.claimDailyReward();this.closest(\'.retention-panel\').querySelector(\'.claim-btn-cont\').innerHTML=\'<div style=\\'text-align:center;color:#4caf50;font-weight:700;\\'>✅ Claimed!</div>\';this.remove()">🎁 Claim ' + (rewardDef ? rewardDef.label : 'Reward') + '</button>';
    } else {
      html += '<div style="text-align:center;padding:10px;color:#4caf50;font-weight:700;">✅ Today\'s reward claimed!</div>';
    }

    html += '<div style="text-align:center;margin-top:10px;font-size:11px;color:var(--text-secondary);">🎯 Day ' + (state.dailyRewardDayIndex + 1) + ' of ' + config.dailyRewards.length + '</div>';
    html += '</div>';
    return html;
  }

  // ─── Show Daily Rewards Modal ────────────────────
  function showDailyRewardsModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box" style="min-width:300px;max-width:400px;">' +
      buildDailyRewardsHTML() +
      '<button class="game-btn btn-restart" style="margin:14px auto 0;display:block;" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>' +
    '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ─── Toast ───────────────────────────────────────
  function showToast(msg) {
    if (global.showToast) { global.showToast(msg); return; }
    let el = document.getElementById('retention-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'retention-toast';
      el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  // ─── Public API ──────────────────────────────────
  const RetentionSystem = {
    init,
    checkDaily,
    claimDailyReward,
    onGameEnd,
    sendPushReminderIfNeeded,
    requestNotificationPermission,
    buildDailyRewardsHTML,
    showDailyRewardsModal,
    getState: () => ({
      streak: state.streak,
      dailyRewardClaimed: state.dailyRewardClaimed,
      dailyRewardDayIndex: state.dailyRewardDayIndex,
      totalDaysPlayed: state.totalDaysPlayed,
      returnPlayerBonusActive: state.returnPlayerBonusActive,
      lastPlayedDate: state.lastPlayedDate,
    }),
    getCurrentReward: () => config.dailyRewards[state.dailyRewardDayIndex],
    isInitialized: () => isInitialized,
  };

  global.RetentionSystem = RetentionSystem;
})(typeof window !== 'undefined' ? window : this);
