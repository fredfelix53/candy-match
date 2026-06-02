/* ===== AdMob Ads Manager — Rewarded, Interstitial, Banner =====
   For all 24 games. Handles:
   - Rewarded ads (optional: extra coins, gems, second chance, double rewards)
   - Interstitial ads (between levels/games)
   - Banner ad (bottom of screen)
   - Cooldowns between ad types
   - Daily limit on rewarded ads
   - "Remove Ads" purchase awareness
   - Configurable per game via AdMobGameConfig
*/
(function(global) {
  'use strict';

  // ─── Default configuration — override per game ────
  const DEFAULT_CONFIG = {
    // AdMob IDs — swap with real ones after verification
    appId: 'ca-app-pub-3940256099942544~3347511713',
    rewardedId: 'ca-app-pub-3940256099942544/5224354917',   // test
    interstitialId: 'ca-app-pub-3940256099942544/1033173712', // test
    bannerId: 'ca-app-pub-3940256099942544/6300978111',     // test

    // Rate limits
    maxRewardedPerDay: 10,
    rewardedCooldownMs: 30000,  // 30s between rewarded ads
    interstitialCooldownMs: 60000, // 1min between interstitials
    showInterstitialEvery: 3,    // Every N game overs / level completes

    // Rewards
    rewardCoins: 100,
    rewardGems: 2,
    secondChanceEnabled: true,
    doubleRewardEnabled: true,
  };

  let config = {};
  let state = {
    rewardedToday: 0,
    lastRewardedTime: 0,
    lastInterstitialTime: 0,
    gamesSinceInterstitial: 0,
    adsRemoved: false,     // set by "Remove Ads" purchase
    rewardedAdsDisabled: false,
  };

  let isInitialized = false;

  // ─── AdMob SDK Shim (works with real or test ads) ──
  let adMobReady = false;
  let pendingRewardCallback = null;

  // ─── Initialize AdMob ──────────────────────────────
  function init(overrides) {
    config = Object.assign({}, DEFAULT_CONFIG, overrides || {});
    state.adsRemoved = !!(global.ProgressionSystem && global.ProgressionSystem.getState().adsRemoved);

    // Try to load AdMob SDK
    if (typeof admob !== 'undefined') {
      try {
        admob.start().then(() => {
          adMobReady = true;
          loadRewarded();
          loadInterstitial();
          loadBanner();
        });
      } catch(e) {
        console.warn('[Ads] AdMob SDK init failed, using fallback:', e.message);
        adMobReady = false;
      }
    } else {
      console.log('[Ads] AdMob SDK not loaded — using simulated ads');
      adMobReady = false;
    }

    isInitialized = true;
  }

  // ─── Load Ad Units ─────────────────────────────────
  function loadRewarded() {
    if (!adMobReady) return;
    try {
      admob.rewarded.load({ id: config.rewardedId });
    } catch(e) {}
  }

  function loadInterstitial() {
    if (!adMobReady) return;
    try {
      admob.interstitial.load({ id: config.interstitialId });
    } catch(e) {}
  }

  function loadBanner() {
    if (!adMobReady) return;
    try {
      admob.banner.show({ id: config.bannerId, position: 'bottom' });
    } catch(e) {}
  }

  // ─── Hide/Show Banner ──────────────────────────────
  function hideBanner() {
    if (adMobReady) {
      try { admob.banner.hide(); } catch(e) {}
    }
  }

  function showBanner() {
    if (state.adsRemoved) return;
    if (adMobReady) {
      try { admob.banner.show({ id: config.bannerId, position: 'bottom' }); } catch(e) {}
    }
  }

  // ─── Rewarded Ad ───────────────────────────────────
  function showRewarded(onReward, onError) {
    // Check if ads are removed / disabled
    if (state.adsRemoved && !config.doubleRewardEnabled) {
      if (onError) onError('Ads removed');
      return false;
    }

    // Check daily limit
    if (state.rewardedToday >= config.maxRewardedPerDay) {
      showToast('Daily ad limit reached (' + config.maxRewardedPerDay + ')');
      if (onError) onError('Daily limit');
      return false;
    }

    // Check cooldown
    const now = Date.now();
    if (now - state.lastRewardedTime < config.rewardedCooldownMs) {
      const remaining = Math.ceil((config.rewardedCooldownMs - (now - state.lastRewardedTime)) / 1000);
      showToast('Wait ' + remaining + 's before next ad');
      if (onError) onError('Cooldown');
      return false;
    }

    if (adMobReady) {
      try {
        admob.rewarded.show().then(() => {
          state.rewardedToday++;
          state.lastRewardedTime = Date.now();
          if (onReward) onReward();
        }).catch((err) => {
          if (onError) onError(err.message);
        });
      } catch(e) {
        if (onError) onError(e.message);
      }
    } else {
      // Simulated rewarded ad (2s delay)
      showToast('Watching ad...');
      setTimeout(() => {
        state.rewardedToday++;
        state.lastRewardedTime = Date.now();
        if (onReward) onReward();
      }, 2000);
    }
    return true;
  }

  // ─── Interstitial Ad ───────────────────────────────
  function tryShowInterstitial() {
    if (state.adsRemoved) return false;

    state.gamesSinceInterstitial++;

    const now = Date.now();
    if (now - state.lastInterstitialTime < config.interstitialCooldownMs) return false;
    if (state.gamesSinceInterstitial < config.showInterstitialEvery) return false;

    state.gamesSinceInterstitial = 0;
    state.lastInterstitialTime = Date.now();

    if (adMobReady) {
      try {
        admob.interstitial.show().catch(() => {});
      } catch(e) {}
    }
    return true;
  }

  // ─── Reward Functions (called by game) ─────────────
  function extraCoins(callback) {
    return showRewarded(() => {
      const coins = config.rewardCoins;
      if (global.ProgressionSystem) {
        global.ProgressionSystem.addCoins(coins);
      }
      showToast('+' + coins + ' 🪙 from ad!');
      if (callback) callback(coins);
    });
  }

  function extraGems(callback) {
    return showRewarded(() => {
      const gems = config.rewardGems;
      if (global.ProgressionSystem) {
        global.ProgressionSystem.addGems(gems);
      }
      showToast('+' + gems + ' 💎 from ad!');
      if (callback) callback(gems);
    });
  }

  function secondChance(callback) {
    if (!config.secondChanceEnabled) return false;
    return showRewarded(() => {
      showToast('❤️ Second chance! Continue playing!');
      if (callback) callback();
    });
  }

  function doubleReward(baseCoins, callback) {
    if (!config.doubleRewardEnabled) return false;
    return showRewarded(() => {
      const extra = baseCoins;
      if (global.ProgressionSystem) {
        global.ProgressionSystem.addCoins(extra);
      }
      showToast('+' + extra + ' 🪙 (doubled!)');
      if (callback) callback(extra);
    });
  }

  // ─── Remove Ads Integration ────────────────────────
  function onAdsRemoved() {
    state.adsRemoved = true;
    hideBanner();
    showToast('Ads permanently removed! ✅');
  }

  // ─── Daily Reset ───────────────────────────────────
  function checkDailyReset() {
    const today = new Date().toDateString();
    try {
      const saved = localStorage.getItem('ads_mgr_date');
      if (saved !== today) {
        state.rewardedToday = 0;
        localStorage.setItem('ads_mgr_date', today);
      }
    } catch(e) {}
  }

  // ─── Toast Notification ────────────────────────────
  function showToast(msg) {
    if (global.showToast) {
      global.showToast(msg);
      return;
    }
    // Fallback toast
    let el = document.getElementById('ads-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'ads-toast';
      el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:#fff;padding:10px 20px;border-radius:12px;font-size:14px;z-index:9999;opacity:0;transition:opacity 0.3s;pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 2500);
  }

  // ─── Public API ────────────────────────────────────
  const AdsManager = {
    init,
    showRewarded,
    tryShowInterstitial,
    extraCoins,
    extraGems,
    secondChance,
    doubleReward,
    hideBanner,
    showBanner,
    onAdsRemoved,
    checkDailyReset,
    getState: () => ({ ...state }),
    getConfig: () => ({ ...config }),
    isInitialized: () => isInitialized,
    isAdMobReady: () => adMobReady,
  };

  global.AdsManager = AdsManager;

  // Auto-init on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      checkDailyReset();
    });
  } else {
    checkDailyReset();
  }
})(typeof window !== 'undefined' ? window : this);
