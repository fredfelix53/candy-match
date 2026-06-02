/* ===== Challenges System =====
   Daily (3-5 tasks), Weekly, Milestone challenges
   With progress tracking, reward claiming, UI display
   Designed to be game-agnostic — configure per game
*/
(function(global) {
  'use strict';

  const STORAGE_KEY = '***';

  // ─── Default Challenge Templates ───────────────────
  // Each can be overridden per game at init time
  const DEFAULT_DAILY_POOL = [
    { id: 'daily_score_1',    type: 'score',      target: 500,  desc: 'Score 500 points',           reward: { coins: 200, gems: 2 }, icon: '🎯' },
    { id: 'daily_lines_1',    type: 'lines',      target: 10,   desc: 'Clear 10 lines',             reward: { coins: 150, gems: 1 }, icon: '📏' },
    { id: 'daily_combo_1',    type: 'combo',      target: 3,    desc: 'Reach 3x combo',             reward: { coins: 100, gems: 1 }, icon: '🔥' },
    { id: 'daily_games_1',    type: 'games',      target: 3,    desc: 'Play 3 games',               reward: { coins: 100, gems: 1 }, icon: '🎮' },
    { id: 'daily_perfect_1',  type: 'perfect',    target: 1,    desc: 'Get a perfect clear',        reward: { coins: 300, gems: 3 }, icon: '💎' },
    { id: 'daily_powerup_1',  type: 'powerups',   target: 3,    desc: 'Use 3 power-ups',            reward: { coins: 150, gems: 1 }, icon: '⚡' },
    { id: 'daily_time_1',     type: 'time',       target: 120,  desc: 'Play for 2 minutes total',   reward: { coins: 100, gems: 1 }, icon: '⏱️' },
    { id: 'daily_survive_1',  type: 'survive',    target: 1,    desc: 'Survive without losing',     reward: { coins: 250, gems: 2 }, icon: '🛡️' },
    { id: 'daily_score_2',    type: 'score',      target: 1500, desc: 'Score 1500 points',          reward: { coins: 500, gems: 5 }, icon: '🏆' },
    { id: 'daily_lines_2',    type: 'lines',      target: 25,   desc: 'Clear 25 lines total',       reward: { coins: 400, gems: 3 }, icon: '📐' },
  ];

  const DEFAULT_WEEKLY_POOL = [
    { id: 'weekly_score',          type: 'score',      target: 10000, desc: 'Score 10,000 total',              reward: { coins: 2000, gems: 20 }, icon: '🏆' },
    { id: 'weekly_lines',          type: 'lines',      target: 200,   desc: 'Clear 200 lines total',            reward: { coins: 1500, gems: 15 }, icon: '📏' },
    { id: 'weekly_games',          type: 'games',      target: 30,    desc: 'Play 30 games',                    reward: { coins: 1000, gems: 10 }, icon: '🎮' },
    { id: 'weekly_streak',         type: 'streak',     target: 5,     desc: 'Reach 5x streak in one game',      reward: { coins: 2000, gems: 25 }, icon: '🔥' },
    { id: 'weekly_perfect',        type: 'perfect',    target: 5,     desc: 'Get 5 perfect clears',              reward: { coins: 3000, gems: 30 }, icon: '💎' },
    { id: 'weekly_combo',          type: 'combo',      target: 10,    desc: 'Reach 10x combo in one game',      reward: { coins: 2500, gems: 20 }, icon: '💫' },
    { id: 'weekly_powerups',       type: 'powerups',   target: 30,    desc: 'Use 30 power-ups',                 reward: { coins: 1500, gems: 15 }, icon: '⚡' },
    { id: 'weekly_boss',           type: 'score',      target: 50000, desc: 'Score 50,000 in one game',         reward: { coins: 5000, gems: 50 }, icon: '👑' },
  ];

  const DEFAULT_MILESTONES = [
    { id: 'milestone_10games',     type: 'total_games',    target: 10,   desc: 'Play 10 games total',        reward: { coins: 500, gems: 10 },  icon: '🎯' },
    { id: 'milestone_100games',    type: 'total_games',    target: 100,  desc: 'Play 100 games total',       reward: { coins: 2000, gems: 25 }, icon: '🎮' },
    { id: 'milestone_500games',    type: 'total_games',    target: 500,  desc: 'Play 500 games total',       reward: { coins: 5000, gems: 50 }, icon: '🏆' },
    { id: 'milestone_1000lines',   type: 'total_lines',    target: 1000, desc: 'Clear 1000 lines total',     reward: { coins: 3000, gems: 30 }, icon: '📏' },
    { id: 'milestone_5000lines',   type: 'total_lines',    target: 5000, desc: 'Clear 5000 lines total',     reward: { coins: 8000, gems: 80 }, icon: '👑' },
    { id: 'milestone_1m_score',    type: 'total_score',    target: 1000000, desc: 'Earn 1M total score',     reward: { coins: 10000, gems: 100 }, icon: '💎' },
    { id: 'milestone_lv_10',       type: 'player_level',   target: 10,   desc: 'Reach player level 10',     reward: { coins: 1000, gems: 15 }, icon: '⭐' },
    { id: 'milestone_lv_25',       type: 'player_level',   target: 25,   desc: 'Reach player level 25',     reward: { coins: 3000, gems: 30 }, icon: '🌟' },
    { id: 'milestone_lv_50',       type: 'player_level',   target: 50,   desc: 'Reach player level 50',     reward: { coins: 8000, gems: 80 }, icon: '✨' },
    { id: 'milestone_lv_100',      type: 'player_level',   target: 100,  desc: 'Reach player level 100 — LEGEND!', reward: { coins: 20000, gems: 200 }, icon: '👑' },
  ];

  // ─── State ─────────────────────────────────────────
  let config = {
    dailyPool: [],
    weeklyPool: [],
    milestones: [],
    numDaily: 3,          // 3 daily challenges per day
    numWeekly: 2,         // 2 weekly challenges per week
  };

  let state = {
    daily: [],            // { id, progress, target, claimed }
    weekly: [],
    milestones: [],
    lastDailyRefresh: null,
    lastWeeklyRefresh: null,
    totalGames: 0,
    totalLines: 0,
    totalScore: 0,
    playerLevel: 1,
  };

  let isInitialized = false;

  // ─── Initialize ────────────────────────────────────
  function init(overrides) {
    if (overrides) {
      if (overrides.dailyPool) config.dailyPool = overrides.dailyPool;
      if (overrides.weeklyPool) config.weeklyPool = overrides.weeklyPool;
      if (overrides.milestones) config.milestones = overrides.milestones;
      if (overrides.numDaily) config.numDaily = overrides.numDaily;
      if (overrides.numWeekly) config.numWeekly = overrides.numWeekly;
    }

    // Fill defaults for empty pools
    if (config.dailyPool.length === 0) config.dailyPool = DEFAULT_DAILY_POOL;
    if (config.weeklyPool.length === 0) config.weeklyPool = DEFAULT_WEEKLY_POOL;
    if (config.milestones.length === 0) config.milestones = DEFAULT_MILESTONES;

    loadState();
    refreshChallenges();
    isInitialized = true;
  }

  // ─── Persistence ───────────────────────────────────
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

  // ─── Refresh Daily/Weekly ──────────────────────────
  function refreshChallenges() {
    const today = new Date().toDateString();
    const week = getWeekId();

    // Daily refresh
    if (state.lastDailyRefresh !== today) {
      state.daily = pickRandom(config.dailyPool, config.numDaily).map(c => ({
        id: c.id, type: c.type, target: c.target, desc: c.desc,
        reward: c.reward, icon: c.icon,
        progress: 0, claimed: false,
      }));
      state.lastDailyRefresh = today;
      saveState();
    }

    // Weekly refresh
    if (state.lastWeeklyRefresh !== week) {
      state.weekly = pickRandom(config.weeklyPool, config.numWeekly).map(c => ({
        id: c.id, type: c.type, target: c.target, desc: c.desc,
        reward: c.reward, icon: c.icon,
        progress: 0, claimed: false,
      }));
      state.lastWeeklyRefresh = week;
      saveState();
    }

    // Initialize milestones (track which ones exist)
    const existingIds = new Set(state.milestones.map(m => m.id));
    config.milestones.forEach(m => {
      if (!existingIds.has(m.id)) {
        state.milestones.push({
          id: m.id, type: m.type, target: m.target, desc: m.desc,
          reward: m.reward, icon: m.icon,
          progress: 0, claimed: false,
        });
      }
    });
    saveState();
  }

  function getWeekId() {
    const d = new Date();
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - start) / 86400000) + start.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + week;
  }

  function pickRandom(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, arr.length));
  }

  // ─── Progress Updates (called by game engine) ──────
  function reportProgress(type, amount) {
    if (!isInitialized) return;

    // Update totals for milestone tracking
    if (type === 'score') state.totalScore += amount;
    if (type === 'lines') state.totalLines += amount;
    if (type === 'games') state.totalGames += amount;

    // Update daily challenges
    state.daily.forEach(c => {
      if (!c.claimed && c.type === type) {
        c.progress = Math.min(c.progress + amount, c.target);
      }
    });

    // Update weekly challenges
    state.weekly.forEach(c => {
      if (!c.claimed && c.type === type) {
        c.progress = Math.min(c.progress + amount, c.target);
      }
    });

    // Update milestones
    state.milestones.forEach(m => {
      if (!m.claimed) {
        let val = 0;
        if (m.type === 'total_games') val = state.totalGames;
        else if (m.type === 'total_lines') val = state.totalLines;
        else if (m.type === 'total_score') val = state.totalScore;
        else if (m.type === 'player_level') val = state.playerLevel;
        else if (m.type === type) val = amount;
        m.progress = Math.min(m.progress + (m.type.startsWith('total_') || m.type === 'player_level' ? 0 : amount), m.target);
        // For total_ types, set progress to the actual total
        if (m.type.startsWith('total_') || m.type === 'player_level') {
          if (m.type === 'total_games') m.progress = Math.min(state.totalGames, m.target);
          else if (m.type === 'total_lines') m.progress = Math.min(state.totalLines, m.target);
          else if (m.type === 'total_score') m.progress = Math.min(state.totalScore, m.target);
          else if (m.type === 'player_level') m.progress = Math.min(state.playerLevel, m.target);
        }
      }
    });

    // Check for newly completed challenges & notify
    checkNewCompletions();
    saveState();
  }

  function setPlayerLevel(level) {
    state.playerLevel = level;
    // Re-check milestone progress
    state.milestones.forEach(m => {
      if (!m.claimed && m.type === 'player_level') {
        m.progress = Math.min(state.playerLevel, m.target);
      }
    });
    checkNewCompletions();
    saveState();
  }

  // ─── Claim Reward ──────────────────────────────────
  function claimDaily(index) {
    const c = state.daily[index];
    if (!c || c.claimed || c.progress < c.target) return false;
    c.claimed = true;
    grantReward(c.reward);
    saveState();
    return true;
  }

  function claimWeekly(index) {
    const c = state.weekly[index];
    if (!c || c.claimed || c.progress < c.target) return false;
    c.claimed = true;
    grantReward(c.reward);
    saveState();
    return true;
  }

  function claimMilestone(index) {
    const c = state.milestones[index];
    if (!c || c.claimed || c.progress < c.target) return false;
    c.claimed = true;
    grantReward(c.reward);
    saveState();
    return true;
  }

  function grantReward(reward) {
    if (global.ProgressionSystem) {
      if (reward.coins) global.ProgressionSystem.addCoins(reward.coins);
      if (reward.gems) global.ProgressionSystem.addGems(reward.gems);
    }
    showToast('🏆 Challenge reward: +' + (reward.coins||0) + '🪙 +' + (reward.gems||0) + '💎');
  }

  // ─── Check for completions ─────────────────────────
  let notifiedIds = new Set();

  function checkNewCompletions() {
    const all = [...state.daily, ...state.weekly, ...state.milestones];
    all.forEach(c => {
      if (!c.claimed && c.progress >= c.target && !notifiedIds.has(c.id)) {
        notifiedIds.add(c.id);
        showToast('✅ Challenge complete: ' + c.desc + '! Claim your reward!');
      }
    });
  }

  // ─── UI Builder — returns HTML for challenges panel ──
  function buildChallengesHTML() {
    let html = '<div class="challenges-panel">';
    html += '<h3 style="text-align:center;margin:0 0 10px;color:var(--accent-gold);">📋 Daily Challenges</h3>';
    state.daily.forEach((c, i) => {
      const done = c.progress >= c.target;
      html += buildChallengeRow(c, i, 'daily', done);
    });
    html += '<h3 style="text-align:center;margin:16px 0 10px;color:var(--accent-purple);">📅 Weekly Challenges</h3>';
    state.weekly.forEach((c, i) => {
      const done = c.progress >= c.target;
      html += buildChallengeRow(c, i, 'weekly', done);
    });
    html += '<h3 style="text-align:center;margin:16px 0 10px;color:var(--accent-blue);">🏅 Milestones</h3>';
    state.milestones.forEach((m, i) => {
      const done = m.progress >= m.target;
      html += buildChallengeRow(m, i, 'milestone', done);
    });
    html += '</div>';
    return html;
  }

  function buildChallengeRow(c, index, type, done) {
    const pct = Math.min(100, (c.progress / c.target) * 100);
    const claimable = done && !c.claimed;
    return '<div class="challenge-row ' + (done ? 'challenge-done' : '') + '" style="display:flex;align-items:center;gap:8px;padding:8px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:6px;">' +
      '<span style="font-size:22px;width:30px;text-align:center;">' + (c.icon || '📌') + '</span>' +
      '<div style="flex:1;min-width:0;">' +
        '<div style="font-size:12px;font-weight:600;margin-bottom:3px;">' + c.desc + '</div>' +
        '<div style="height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden;">' +
          '<div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,' + (done ? '#4caf50' : '#ff9800') + ',var(--accent-gold));border-radius:3px;transition:width 0.3s;"></div>' +
        '</div>' +
        '<div style="font-size:10px;color:var(--text-secondary);margin-top:2px;">' + c.progress + '/' + c.target + '</div>' +
      '</div>' +
      (claimable ? '<button class="game-btn btn-small" style="padding:4px 10px;font-size:11px;" onclick="ChallengesSystem.claim' + type.charAt(0).toUpperCase() + type.slice(1) + '(' + index + ');this.closest(\'.challenge-row\').style.opacity=\'0.5\';">Claim</button>' :
       c.claimed ? '<span style="font-size:14px;color:#4caf50;">✅</span>' :
       '<span style="font-size:11px;color:var(--text-secondary);font-weight:600;">+' + (c.reward.coins||0) + '🪙' + (c.reward.gems ? ' +' + c.reward.gems + '💎' : '') + '</span>') +
    '</div>';
  }

  // ─── Show Challenges Modal ─────────────────────────
  function showChallengesModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box" style="min-width:320px;max-height:80vh;overflow-y:auto;">' +
      buildChallengesHTML() +
      '<button class="game-btn btn-restart" style="margin:14px auto 0;display:block;" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>' +
    '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ─── Toast ─────────────────────────────────────────
  function showToast(msg) {
    if (global.showToast) { global.showToast(msg); return; }
    let el = document.getElementById('challenge-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'challenge-toast';
      el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  // ─── Public API ────────────────────────────────────
  const ChallengesSystem = {
    init,
    reportProgress,
    setPlayerLevel,
    claimDaily, claimWeekly, claimMilestone,
    buildChallengesHTML,
    showChallengesModal,
    getState: () => ({ ...state }),
    getConfig: () => ({
      dailyPool: config.dailyPool,
      weeklyPool: config.weeklyPool,
      milestones: config.milestones,
      numDaily: config.numDaily,
      numWeekly: config.numWeekly,
    }),
    getDailyProgress: () => state.daily.map(c => ({ id: c.id, progress: c.progress, target: c.target, claimed: c.claimed, done: c.progress >= c.target })),
    getWeeklyProgress: () => state.weekly.map(c => ({ id: c.id, progress: c.progress, target: c.target, claimed: c.claimed, done: c.progress >= c.target })),
    getMilestoneProgress: () => state.milestones.map(m => ({ id: m.id, progress: m.progress, target: m.target, claimed: m.claimed, done: m.progress >= m.target })),
    isInitialized: () => isInitialized,
  };

  global.ChallengesSystem = ChallengesSystem;
})(typeof window !== 'undefined' ? window : this);
