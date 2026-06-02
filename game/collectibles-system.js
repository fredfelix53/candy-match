/* ===== Collectibles System — Achievements, Badges, Trophies =====
   Tracks game-specific collectibles with progress,
   unlock conditions, rewards, and visual display.
   Works across all games with per-game config.
*/
(function(global) {
  'use strict';

  const STORAGE_KEY = 'collectibles_system_state';

  // ─── Default Collectible Definitions ────────────
  const DEFAULT_COLLECTIBLES = [
    { id: 'first_game',       name: 'First Steps',         desc: 'Play your first game',            icon: '🎮', category: 'milestone', condition: { type: 'gamesPlayed', target: 1 },      reward: { coins: 100 } },
    { id: 'ten_games',        name: 'Getting Started',     desc: 'Play 10 games',                   icon: '🎯', category: 'milestone', condition: { type: 'gamesPlayed', target: 10 },     reward: { coins: 500, gems: 5 } },
    { id: 'fifty_games',      name: 'Dedicated Player',    desc: 'Play 50 games',                   icon: '🏅', category: 'milestone', condition: { type: 'gamesPlayed', target: 50 },     reward: { coins: 1000, gems: 10 } },
    { id: 'hundred_games',    name: 'Hundred Club',        desc: 'Play 100 games',                  icon: '🏆', category: 'milestone', condition: { type: 'gamesPlayed', target: 100 },    reward: { coins: 3000, gems: 30 } },
    { id: 'first_win',        name: 'First Victory',       desc: 'Win your first game',             icon: '⭐', category: 'milestone', condition: { type: 'wins', target: 1 },             reward: { coins: 200 } },
    { id: 'ten_wins',         name: 'Winning Streak',      desc: 'Win 10 games',                    icon: '🌟', category: 'milestone', condition: { type: 'wins', target: 10 },            reward: { coins: 1000, gems: 10 } },
    { id: 'high_score_1k',    name: 'Century Club',        desc: 'Score 1,000 in one game',         icon: '💎', category: 'score',    condition: { type: 'highScore', target: 1000 },   reward: { coins: 500, gems: 5 } },
    { id: 'high_score_10k',   name: 'Thousand Club',       desc: 'Score 10,000 in one game',        icon: '👑', category: 'score',    condition: { type: 'highScore', target: 10000 },  reward: { coins: 3000, gems: 30 } },
    { id: 'high_score_100k',  name: 'Elite Club',          desc: 'Score 100,000 in one game',       icon: '💠', category: 'score',    condition: { type: 'highScore', target: 100000 }, reward: { coins: 10000, gems: 100 } },
    { id: 'streak_3',         name: 'On Fire',             desc: 'Reach 3x combo/streak',           icon: '🔥', category: 'streak',   condition: { type: 'streak', target: 3 },          reward: { coins: 300, gems: 3 } },
    { id: 'streak_10',        name: 'Unstoppable',         desc: 'Reach 10x combo/streak',          icon: '⚡', category: 'streak',   condition: { type: 'streak', target: 10 },         reward: { coins: 1500, gems: 15 } },
    { id: 'powerups_10',      name: 'Tool Master',         desc: 'Use 10 power-ups total',          icon: '🔨', category: 'usage',    condition: { type: 'powerupsUsed', target: 10 },   reward: { coins: 500, gems: 5 } },
    { id: 'powerups_50',      name: 'Power Junkie',        desc: 'Use 50 power-ups total',          icon: '💪', category: 'usage',    condition: { type: 'powerupsUsed', target: 50 },   reward: { coins: 2000, gems: 20 } },
    { id: 'collector_10',     name: 'Collector',           desc: 'Unlock 10 collectibles',           icon: '📦', category: 'meta',     condition: { type: 'collectiblesUnlocked', target: 10 }, reward: { coins: 1000, gems: 10 } },
    { id: 'collector_all',    name: 'Completionist',       desc: 'Unlock all collectibles',          icon: '🏆', category: 'meta',     condition: { type: 'collectiblesUnlocked', target: 999 }, reward: { coins: 5000, gems: 50 } },
  ];

  // ─── State ───────────────────────────────────────
  let config = {
    collectibles: [],
    perGameCollectibles: {},  // { gameId: [collectibleDefs] }
  };

  let state = {
    collectibles: {},       // { [id]: { unlocked: bool, unlockedAt: timestamp, progress: number, target: number } }
    stats: {
      gamesPlayed: 0,
      wins: 0,
      highScore: 0,
      maxStreak: 0,
      powerupsUsed: 0,
      totalCollectiblesUnlocked: 0,
    },
    // Per-game trackers (reset per game session)
    sessionStreak: 0,
    sessionHighScore: 0,
  };

  let isInitialized = false;

  // ─── Initialize ──────────────────────────────────
  function init(overrides) {
    if (overrides) {
      if (overrides.collectibles) config.collectibles = overrides.collectibles;
      if (overrides.perGameCollectibles) config.perGameCollectibles = overrides.perGameCollectibles;
    }

    if (config.collectibles.length === 0) config.collectibles = DEFAULT_COLLECTIBLES;

    loadState();
    ensureCollectibleEntries();
    isInitialized = true;
  }

  // ─── Persistence ─────────────────────────────────
  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        state = Object.assign(state, parsed);
        // Ensure stats sub-object
        if (!state.stats) state.stats = { gamesPlayed: 0, wins: 0, highScore: 0, maxStreak: 0, powerupsUsed: 0, totalCollectiblesUnlocked: 0 };
        if (!state.collectibles) state.collectibles = {};
      }
    } catch(e) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch(e) {}
  }

  // ─── Ensure all collectibles have entries ────────
  function ensureCollectibleEntries() {
    let changed = false;
    config.collectibles.forEach(c => {
      if (!state.collectibles[c.id]) {
        state.collectibles[c.id] = {
          unlocked: false,
          unlockedAt: null,
          progress: 0,
          target: c.condition.target,
        };
        changed = true;
      }
    });
    if (changed) saveState();
  }

  // ─── Increment Tracker (called by game engine) ───
  function incrementTracker(type, amount) {
    if (!isInitialized) return;
    amount = amount || 1;

    // Update stats
    if (type === 'gamesPlayed') state.stats.gamesPlayed += amount;
    else if (type === 'wins') state.stats.wins += amount;
    else if (type === 'powerupsUsed') state.stats.powerupsUsed += amount;
    else if (type === 'sessionStreak') {
      // Only update if it's higher
      if (amount > state.sessionStreak) state.sessionStreak = amount;
      if (state.sessionStreak > state.stats.maxStreak) {
        state.stats.maxStreak = state.sessionStreak;
      }
    }

    // Update high score
    if (type === 'highScore') {
      if (amount > state.sessionHighScore) state.sessionHighScore = amount;
      if (state.sessionHighScore > state.stats.highScore) {
        state.stats.highScore = state.sessionHighScore;
      }
    }

    // Check each collectible's conditions
    config.collectibles.forEach(c => {
      const entry = state.collectibles[c.id];
      if (!entry || entry.unlocked) return;

      const cond = c.condition;

      if (cond.type === 'gamesPlayed') {
        entry.progress = Math.min(state.stats.gamesPlayed, cond.target);
      } else if (cond.type === 'wins') {
        entry.progress = Math.min(state.stats.wins, cond.target);
      } else if (cond.type === 'highScore') {
        entry.progress = Math.min(state.stats.highScore, cond.target);
      } else if (cond.type === 'streak') {
        entry.progress = Math.min(state.stats.maxStreak, cond.target);
      } else if (cond.type === 'powerupsUsed') {
        entry.progress = Math.min(state.stats.powerupsUsed, cond.target);
      } else if (cond.type === 'collectiblesUnlocked') {
        entry.progress = Math.min(state.stats.totalCollectiblesUnlocked, cond.target);
      }

      // Check unlock
      if (entry.progress >= entry.target) {
        unlockCollectible(c.id);
      }
    });

    saveState();
  }

  // ─── Unlock a collectible ────────────────────────
  function unlockCollectible(id) {
    const entry = state.collectibles[id];
    if (!entry || entry.unlocked) return false;

    const def = config.collectibles.find(c => c.id === id);
    if (!def) return false;

    entry.unlocked = true;
    entry.unlockedAt = Date.now();
    state.stats.totalCollectiblesUnlocked++;

    // Grant reward
    if (def.reward) {
      if (global.ProgressionSystem) {
        if (def.reward.coins) global.ProgressionSystem.addCoins(def.reward.coins);
        if (def.reward.gems) global.ProgressionSystem.addGems(def.reward.gems);
      }
    }

    showToast('🏅 Unlocked: ' + def.name + '! ' + (def.reward ? '+' + (def.reward.coins||0) + '🪙' + (def.reward.gems ? '+' + def.reward.gems + '💎' : '') : ''));
    saveState();
    return true;
  }

  // ─── Reset session (called at game start) ────────
  function resetSessionTracker() {
    state.sessionStreak = 0;
    state.sessionHighScore = 0;
  }

  // ─── UI Builder ──────────────────────────────────
  function buildCollectiblesHTML(filter) {
    let html = '<div class="collectibles-panel">';
    html += '<h3 style="text-align:center;margin:0 0 10px;color:var(--accent-gold);">🏅 Collectibles</h3>';
    html += '<div style="text-align:center;font-size:12px;color:var(--text-secondary);margin-bottom:10px;">Unlocked: ' + state.stats.totalCollectiblesUnlocked + ' / ' + config.collectibles.length + '</div>';

    config.collectibles.forEach(c => {
      const entry = state.collectibles[c.id];
      if (!entry) return;

      // Filter
      if (filter === 'unlocked' && !entry.unlocked) return;
      if (filter === 'locked' && entry.unlocked) return;

      const pct = entry.target > 0 ? Math.min(100, (entry.progress / entry.target) * 100) : 0;
      html += '<div class="collectible-entry" style="display:flex;align-items:center;gap:10px;padding:10px;background:rgba(255,255,255,0.04);border-radius:10px;margin-bottom:6px;' + (entry.unlocked ? '' : 'opacity:0.6;') + '">' +
        '<span style="font-size:28px;">' + (entry.unlocked ? c.icon : '🔒') + '</span>' +
        '<div style="flex:1;">' +
          '<div style="font-size:13px;font-weight:600;">' + c.name + '</div>' +
          '<div style="font-size:11px;color:var(--text-secondary);">' + c.desc + '</div>' +
          (!entry.unlocked ? '<div style="height:4px;background:rgba(255,255,255,0.1);border-radius:2px;margin-top:4px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,#ff9800,var(--accent-gold));border-radius:2px;"></div></div>' +
            '<div style="font-size:9px;color:var(--text-secondary);margin-top:2px;">' + entry.progress + '/' + entry.target + '</div>' : '') +
        '</div>' +
        (entry.unlocked ? '<span style="font-size:14px;color:#4caf50;">✅</span>' : '') +
      '</div>';
    });

    html += '</div>';
    return html;
  }

  // ─── Show Collectibles Modal ─────────────────────
  function showCollectiblesModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box" style="min-width:320px;max-height:80vh;overflow-y:auto;">' +
      buildCollectiblesHTML() +
      '<button class="game-btn btn-restart" style="margin:14px auto 0;display:block;" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>' +
    '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ─── Toast ───────────────────────────────────────
  function showToast(msg) {
    if (global.showToast) { global.showToast(msg); return; }
    let el = document.getElementById('collect-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'collect-toast';
      el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  // ─── Public API ──────────────────────────────────
  const CollectiblesSystem = {
    init,
    incrementTracker,
    unlockCollectible,
    resetSessionTracker,
    buildCollectiblesHTML,
    showCollectiblesModal,
    getState: () => ({
      collectibles: JSON.parse(JSON.stringify(state.collectibles)),
      stats: { ...state.stats },
    }),
    getUnlocked: () => config.collectibles.filter(c => state.collectibles[c.id]?.unlocked),
    getLocked: () => config.collectibles.filter(c => !state.collectibles[c.id]?.unlocked),
    isInitialized: () => isInitialized,
  };

  global.CollectiblesSystem = CollectiblesSystem;
})(typeof window !== 'undefined' ? window : this);
