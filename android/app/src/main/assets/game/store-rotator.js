/* ===== Store Rotator — Dynamic Daily Offers =====
   Shows time-limited deals that rotate daily.
   Integrates with ProgressionSystem for purchases.
   Configurable per game.
*/
(function(global) {
  'use strict';

  const STORAGE_KEY = 'store_rotator_state';

  // ─── Default Offer Pools ─────────────────────────
  const DEFAULT_POOLS = {
    daily: [
      { id: 'daily_coins_small',  type: 'coins',  amount: 500,  price: 1.99,  discount: 20, desc: '500 Coins',            icon: '🪙', tag: '-20%' },
      { id: 'daily_gems_small',   type: 'gems',   amount: 10,   price: 0.99,  discount: 0,  desc: '10 Gems',              icon: '💎', tag: null },
      { id: 'daily_powerup',      type: 'item',   itemId: 'hammer',   count: 3,     price: 1.49,  discount: 25, desc: '3 Hammers',            icon: '🔨', tag: '-25%' },
      { id: 'daily_coins_med',    type: 'coins',  amount: 2000, price: 4.99,  discount: 30, desc: '2000 Coins',           icon: '🪙', tag: '-30%' },
      { id: 'daily_gems_med',     type: 'gems',   amount: 25,   price: 1.99,  discount: 17, desc: '25 Gems',              icon: '💎', tag: '-17%' },
      { id: 'daily_bundle',       type: 'bundle', items: [{type:'coins',amount:1000},{type:'gems',amount:5},{type:'item',itemId:'hammer',count:2}], price: 3.99, discount: 40, desc: 'Starter Bundle', icon: '🎁', tag: '-40%' },
      { id: 'daily_shield',       type: 'item',   itemId: 'shield',   count: 2,     price: 1.99,  discount: 20, desc: '2 Shields',            icon: '🛡️', tag: '-20%' },
      { id: 'daily_bomb',         type: 'item',   itemId: 'bomb',     count: 3,     price: 1.49,  discount: 25, desc: '3 Bombs',              icon: '💣', tag: '-25%' },
    ],
    featured: [
      { id: 'featured_mega',      type: 'coins',  amount: 10000, price: 14.99, discount: 50, desc: 'MEGA 10K Coins',       icon: '🪙', tag: '-50%' },
      { id: 'featured_gems',      type: 'gems',   amount: 100,   price: 4.99,  discount: 38, desc: '100 Gems',             icon: '💎', tag: '-38%' },
      { id: 'featured_ultra',     type: 'bundle', items: [{type:'coins',amount:5000},{type:'gems',amount:20},{type:'item',itemId:'hammer',count:5},{type:'item',itemId:'shield',count:3}], price: 9.99, discount: 55, desc: 'Ultra Bundle', icon: '🎁', tag: '-55%' },
      { id: 'featured_remove_ads', type: 'remove_ads', price: 3.99, discount: 0, desc: 'Remove Ads', icon: '🚫', tag: 'POPULAR' },
    ],
  };

  // ─── State ───────────────────────────────────────
  let config = {
    pools: { daily: [], featured: [] },
    dailyOffersCount: 4,    // 4 daily offers
    featuredCount: 2,       // 2 featured offers
    refreshIntervalMs: 86400000, // 24 hours
  };

  let state = {
    dailyOffers: [],        // current daily offers
    featuredOffers: [],     // current featured offers
    lastRefresh: null,
    purchasedToday: [],     // ids of purchased offers today
  };

  let isInitialized = false;

  // ─── Initialize ──────────────────────────────────
  function init(overrides) {
    if (overrides) {
      if (overrides.pools) {
        if (overrides.pools.daily) config.pools.daily = overrides.pools.daily;
        if (overrides.pools.featured) config.pools.featured = overrides.pools.featured;
      }
      if (overrides.dailyOffersCount) config.dailyOffersCount = overrides.dailyOffersCount;
      if (overrides.featuredCount) config.featuredCount = overrides.featuredCount;
    }

    // Fill defaults for empty pools
    if (config.pools.daily.length === 0) config.pools.daily = DEFAULT_POOLS.daily;
    if (config.pools.featured.length === 0) config.pools.featured = DEFAULT_POOLS.featured;

    loadState();
    refreshStore();
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

  // ─── Refresh Store (daily rotation) ──────────────
  function refreshStore() {
    const today = new Date().toDateString();

    if (state.lastRefresh !== today) {
      // Reset purchased today
      state.purchasedToday = [];

      // Pick random daily offers
      state.dailyOffers = pickRandom(config.pools.daily, config.dailyOffersCount).map(o => ({
        ...o, soldToday: 0, maxPerDay: 5,
      }));

      // Pick random featured offers
      state.featuredOffers = pickRandom(config.pools.featured, config.featuredCount).map(o => ({
        ...o, soldToday: 0, maxPerDay: 1,
      }));

      state.lastRefresh = today;
      saveState();
    }
  }

  function pickRandom(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(n, arr.length));
  }

  // ─── Purchase Offer ──────────────────────────────
  function purchaseOffer(offerId, paymentMethod) {
    // paymentMethod: 'iap' (real money) or 'coins' or 'gems'
    const allOffers = [...state.dailyOffers, ...state.featuredOffers];
    const offer = allOffers.find(o => o.id === offerId);
    if (!offer) return { success: false, reason: 'not_found' };
    if (state.purchasedToday.includes(offerId)) return { success: false, reason: 'already_purchased' };

    if (paymentMethod === 'iap') {
      // Handle IAP purchase via ProgressionSystem
      if (offer.type === 'remove_ads') {
        if (global.ProgressionSystem) {
          global.ProgressionSystem.purchaseRemoveAds(offer.price);
        }
      } else {
        if (global.ProgressionSystem) {
          global.ProgressionSystem.purchaseIAP(offer.id, offer.price, (success) => {
            if (success) {
              grantOfferItems(offer);
            }
          });
        }
      }
      state.purchasedToday.push(offerId);
      offer.soldToday = (offer.soldToday || 0) + 1;
      saveState();
      return { success: true };
    }

    // Coins/gems purchase isn't typical for rotating offers (they're real-money)
    return { success: false, reason: 'invalid_payment' };
  }

  function grantOfferItems(offer) {
    if (!global.ProgressionSystem) return;

    if (offer.type === 'coins') {
      global.ProgressionSystem.addCoins(offer.amount);
    } else if (offer.type === 'gems') {
      global.ProgressionSystem.addGems(offer.amount);
    } else if (offer.type === 'item' && offer.itemId) {
      global.ProgressionSystem.addItem(offer.itemId, offer.count || 1);
    } else if (offer.type === 'bundle' && offer.items) {
      offer.items.forEach(item => {
        if (item.type === 'coins') global.ProgressionSystem.addCoins(item.amount);
        else if (item.type === 'gems') global.ProgressionSystem.addGems(item.amount);
        else if (item.type === 'item') global.ProgressionSystem.addItem(item.itemId, item.count || 1);
      });
    }

    showToast('🎉 ' + (offer.desc || 'Purchase') + ' unlocked!');
  }

  // ─── UI Builder ──────────────────────────────────
  function buildStoreHTML() {
    let html = '<div class="store-rotator-panel">';

    // Featured section
    if (state.featuredOffers.length > 0) {
      html += '<h3 style="text-align:center;margin:0 0 10px;color:var(--accent-gold);">⭐ Featured</h3>';
      state.featuredOffers.forEach(o => {
        html += buildOfferCard(o, true);
      });
    }

    // Daily offers section
    html += '<h3 style="text-align:center;margin:16px 0 10px;color:var(--accent-blue);">🔄 Daily Offers</h3>';
    if (state.dailyOffers.length === 0) {
      html += '<p style="text-align:center;color:var(--text-secondary);">No offers today. Check back tomorrow!</p>';
    } else {
      state.dailyOffers.forEach(o => {
        html += buildOfferCard(o, false);
      });
    }

    html += '</div>';
    return html;
  }

  function buildOfferCard(offer, isFeatured) {
    const alreadyBought = state.purchasedToday.includes(offer.id);
    const textColor = isFeatured ? 'var(--accent-gold)' : 'var(--text-primary)';

    return '<div class="store-offer ' + (isFeatured ? 'featured' : '') + '" style="background:rgba(255,255,255,0.04);border:1px solid ' + (isFeatured ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)') + ';border-radius:12px;padding:12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;' + (alreadyBought ? 'opacity:0.5;' : '') + '">' +
      '<span style="font-size:28px;">' + (offer.icon || '🛒') + '</span>' +
      '<div style="flex:1;">' +
        '<div style="font-size:14px;font-weight:600;color:' + textColor + ';">' + offer.desc + '</div>' +
        (offer.discount ? '<div style="font-size:12px;color:#4caf50;font-weight:700;">🔥 ' + offer.discount + '% OFF</div>' : '') +
        '<div style="font-size:12px;color:var(--text-secondary);">' + (offer.tag ? '<span style="background:#ff9800;color:#000;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700;">' + offer.tag + '</span> ' : '') + '$' + offer.price.toFixed(2) + '</div>' +
      '</div>' +
      (alreadyBought ? '<span style="color:#4caf50;">✅</span>' :
       '<button class="game-btn btn-small" style="padding:6px 14px;font-size:12px;background:linear-gradient(135deg,' + (isFeatured ? '#ff9800,#f44336' : '#4caf50,#2196f3') + ');" onclick="StoreRotator.purchaseOffer(\'' + offer.id + '\',\'iap\');this.innerHTML=\'✅\';">Buy</button>') +
    '</div>';
  }

  // ─── Show Store Modal ────────────────────────────
  function showStoreModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = '<div class="modal-box" style="min-width:320px;max-height:80vh;overflow-y:auto;">' +
      buildStoreHTML() +
      '<button class="game-btn btn-restart" style="margin:14px auto 0;display:block;" onclick="this.closest(\'.modal-overlay\').remove()">Close</button>' +
    '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  // ─── Toast ───────────────────────────────────────
  function showToast(msg) {
    if (global.showToast) { global.showToast(msg); return; }
    let el = document.getElementById('store-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'store-toast';
      el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  // ─── Public API ──────────────────────────────────
  const StoreRotator = {
    init,
    purchaseOffer,
    refreshStore,
    buildStoreHTML,
    showStoreModal,
    getState: () => ({
      dailyOffers: state.dailyOffers.map(o => ({ ...o })),
      featuredOffers: state.featuredOffers.map(o => ({ ...o })),
      lastRefresh: state.lastRefresh,
      purchasedToday: [...state.purchasedToday],
    }),
    isInitialized: () => isInitialized,
  };

  global.StoreRotator = StoreRotator;
})(typeof window !== 'undefined' ? window : this);
