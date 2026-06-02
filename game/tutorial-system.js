/* ===== Tutorial System — Guided First-Time Experience =====
   Shows step-by-step overlays for new players.
   Per-game configurable steps with highlight, tooltip, and optional actions.
   Tracks completion state so it only runs once (or can be reset).
*/
(function(global) {
  'use strict';

  const STORAGE_KEY = 'tutorial_system_state';

  // ─── Default Tutorial Steps ─────────────────────
  // These are generic — override per game with game-specific steps.
  const DEFAULT_STEPS = [
    { id: 'welcome',        selector: null,      text: '🎮 Welcome! Let\'s learn how to play.',                          position: 'center', action: 'waitClick' },
    { id: 'gameplay',       selector: '.game-canvas, #gameCanvas, canvas', text: '👆 Tap here to interact with the game.', position: 'bottom', action: 'highlight' },
    { id: 'score',          selector: '.score-display, #score', text: '🏆 Your score appears here!',                      position: 'top',    action: 'highlight' },
    { id: 'powerups',       selector: '.powerups-container, #powerups', text: '🔧 Use power-ups for extra help!',         position: 'bottom', action: 'highlight' },
    { id: 'done',           selector: null,      text: '🎉 You\'re ready! Good luck and have fun!',                       position: 'center', action: 'waitClick' },
  ];

  // ─── State ───────────────────────────────────────
  let config = {
    steps: [],
    highlightColor: 'rgba(255, 152, 0, 0.3)',
    highlightBorderColor: '#ff9800',
    tooltipBgColor: 'rgba(0, 0, 0, 0.92)',
    tooltipTextColor: '#fff',
    showSkipButton: true,
    skipButtonText: 'Skip Tutorial',
  };

  let state = {
    completed: false,           // true if player finished the whole tutorial
    currentStepIndex: 0,
    started: false,
  };

  let isInitialized = false;
  let overlayEl = null;
  let isActive = false;

  // ─── Initialize ──────────────────────────────────
  function init(overrides) {
    if (overrides) {
      if (overrides.steps) config.steps = overrides.steps;
      if (overrides.highlightColor) config.highlightColor = overrides.highlightColor;
      if (overrides.highlightBorderColor) config.highlightBorderColor = overrides.highlightBorderColor;
      if (overrides.showSkipButton !== undefined) config.showSkipButton = overrides.showSkipButton;
      if (overrides.skipButtonText) config.skipButtonText = overrides.skipButtonText;
    }

    // Fill defaults
    if (config.steps.length === 0) config.steps = DEFAULT_STEPS;

    loadState();

    // Auto-start if not completed
    if (!state.completed && !state.started) {
      state.started = true;
      saveState();
      // Delay start to let the game render first
      setTimeout(() => { startTutorial(); }, 500);
    }

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

  // ─── Start Tutorial ──────────────────────────────
  function startTutorial() {
    if (state.completed || isActive) return;
    isActive = true;
    state.currentStepIndex = 0;
    saveState();
    showStep(0);
  }

  // ─── Show Step ───────────────────────────────────
  function showStep(index) {
    const step = config.steps[index];
    if (!step) {
      finishTutorial();
      return;
    }

    // Remove existing overlay
    removeOverlay();

    // Create overlay
    overlayEl = document.createElement('div');
    overlayEl.className = 'tutorial-overlay';
    overlayEl.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:9998;pointer-events:none;';

    // Dark semi-transparent background (only if not center/waitClick mode)
    if (step.action !== 'waitClick' && step.action !== 'center') {
      const bg = document.createElement('div');
      bg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);pointer-events:auto;';
      overlayEl.appendChild(bg);

      // Highlight target element
      if (step.selector) {
        const target = document.querySelector(step.selector);
        if (target) {
          const rect = target.getBoundingClientRect();
          const highlight = document.createElement('div');
          highlight.style.cssText = 'position:fixed;top:' + rect.top + 'px;left:' + rect.left + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;background:' + config.highlightColor + ';border:2px solid ' + config.highlightBorderColor + ';border-radius:8px;box-shadow:0 0 20px rgba(255,152,0,0.4);pointer-events:auto;cursor:pointer;animation:pulse-border 1.5s infinite;';
          overlayEl.appendChild(highlight);
        }
      }
    }

    // Tooltip
    const tooltip = document.createElement('div');
    tooltip.style.cssText = 'position:fixed;padding:16px 24px;background:' + config.tooltipBgColor + ';color:' + config.tooltipTextColor + ';border-radius:14px;font-size:15px;line-height:1.5;max-width:300px;z-index:9999;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.4);pointer-events:auto;';
    tooltip.textContent = step.text;

    // Position tooltip
    if (step.position === 'center') {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    } else if (step.selector) {
      const target = document.querySelector(step.selector);
      if (target) {
        const rect = target.getBoundingClientRect();
        if (step.position === 'top') {
          tooltip.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
          tooltip.style.left = (rect.left + rect.width / 2) + 'px';
          tooltip.style.transform = 'translateX(-50%)';
        } else if (step.position === 'bottom') {
          tooltip.style.top = (rect.bottom + 10) + 'px';
          tooltip.style.left = (rect.left + rect.width / 2) + 'px';
          tooltip.style.transform = 'translateX(-50%)';
        } else if (step.position === 'left') {
          tooltip.style.top = (rect.top + rect.height / 2) + 'px';
          tooltip.style.right = (window.innerWidth - rect.left + 10) + 'px';
          tooltip.style.transform = 'translateY(-50%)';
        } else if (step.position === 'right') {
          tooltip.style.top = (rect.top + rect.height / 2) + 'px';
          tooltip.style.left = (rect.right + 10) + 'px';
          tooltip.style.transform = 'translateY(-50%)';
        }
      } else {
        // Fallback to center
        tooltip.style.top = '50%';
        tooltip.style.left = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
      }
    } else {
      tooltip.style.top = '50%';
      tooltip.style.left = '50%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    }

    overlayEl.appendChild(tooltip);

    // Navigation buttons
    const navContainer = document.createElement('div');
    navContainer.style.cssText = 'position:fixed;bottom:40px;left:50%;transform:translateX(-50%);display:flex;gap:12px;z-index:9999;pointer-events:auto;';

    // Skip button
    if (config.showSkipButton && index < config.steps.length - 1) {
      const skipBtn = document.createElement('button');
      skipBtn.textContent = config.skipButtonText;
      skipBtn.style.cssText = 'padding:8px 16px;border:1px solid rgba(255,255,255,0.3);background:transparent;color:' + config.tooltipTextColor + ';border-radius:8px;font-size:13px;cursor:pointer;opacity:0.7;';
      skipBtn.onclick = () => { finishTutorial(); };
      navContainer.appendChild(skipBtn);
    }

    // Next/Done button
    const nextBtn = document.createElement('button');
    const isLast = index >= config.steps.length - 1;
    nextBtn.textContent = isLast ? 'Done 🎉' : 'Next →';
    nextBtn.style.cssText = 'padding:8px 20px;border:none;background:linear-gradient(135deg,#ff9800,#f44336);color:#fff;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;box-shadow:0 2px 10px rgba(255,152,0,0.4);';
    nextBtn.onclick = () => {
      if (isLast) {
        finishTutorial();
      } else {
        state.currentStepIndex = index + 1;
        saveState();
        showStep(index + 1);
      }
    };

    // If action is 'waitClick', clicking anywhere advances
    if (step.action === 'waitClick' && !isLast) {
      const clickCatcher = document.createElement('div');
      clickCatcher.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:auto;';
      clickCatcher.onclick = () => {
        state.currentStepIndex = index + 1;
        saveState();
        showStep(index + 1);
      };
      overlayEl.insertBefore(clickCatcher, overlayEl.firstChild);
    }

    navContainer.appendChild(nextBtn);
    overlayEl.appendChild(navContainer);

    // Step indicator dots
    if (config.steps.length > 1) {
      const dotsContainer = document.createElement('div');
      dotsContainer.style.cssText = 'position:fixed;bottom:90px;left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:9999;pointer-events:none;';
      config.steps.forEach((_, i) => {
        const dot = document.createElement('div');
        const isActive = i === index;
        dot.style.cssText = 'width:' + (isActive ? '10px' : '6px') + ';height:' + (isActive ? '10px' : '6px') + ';border-radius:50%;background:' + (isActive ? '#ff9800' : 'rgba(255,255,255,0.3)') + ';transition:all 0.3s;';
        dotsContainer.appendChild(dot);
      });
      overlayEl.appendChild(dotsContainer);
    }

    document.body.appendChild(overlayEl);
  }

  // ─── Remove Overlay ──────────────────────────────
  function removeOverlay() {
    if (overlayEl && overlayEl.parentNode) {
      overlayEl.parentNode.removeChild(overlayEl);
      overlayEl = null;
    }
  }

  // ─── Finish Tutorial ─────────────────────────────
  function finishTutorial() {
    state.completed = true;
    state.currentStepIndex = 0;
    state.started = false;
    isActive = false;
    removeOverlay();
    saveState();
    showToast('🎉 Tutorial complete!');
  }

  // ─── Reset (for debugging / "Show Tutorial Again") ─
  function resetTutorial() {
    state.completed = false;
    state.currentStepIndex = 0;
    state.started = false;
    isActive = false;
    removeOverlay();
    saveState();
  }

  // ─── Toast ───────────────────────────────────────
  function showToast(msg) {
    if (global.showToast) { global.showToast(msg); return; }
    let el = document.getElementById('tutorial-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'tutorial-toast';
      el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => { el.style.opacity = '0'; }, 3000);
  }

  // ─── Public API ──────────────────────────────────
  const TutorialSystem = {
    init,
    startTutorial,
    resetTutorial,
    finishTutorial,
    nextStep: () => {
      if (!isActive) return;
      const ni = state.currentStepIndex + 1;
      if (ni >= config.steps.length) {
        finishTutorial();
      } else {
        state.currentStepIndex = ni;
        saveState();
        showStep(ni);
      }
    },
    isActive: () => isActive,
    isCompleted: () => state.completed,
    getState: () => ({ ...state }),
    isInitialized: () => isInitialized,
  };

  global.TutorialSystem = TutorialSystem;

  // Add pulse-border keyframes
  if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = '@keyframes pulse-border { 0%, 100% { box-shadow: 0 0 20px rgba(255,152,0,0.4); } 50% { box-shadow: 0 0 35px rgba(255,152,0,0.7); } }';
    document.head.appendChild(style);
  }
})(typeof window !== 'visible' ? window : this);
