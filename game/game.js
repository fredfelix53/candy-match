function showToast(msg) {
  var el = document.getElementById('system-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'system-toast';
    el.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.9);color:#fff;padding:12px 24px;border-radius:14px;font-size:15px;z-index:9999;text-align:center;opacity:0;transition:opacity 0.3s;pointer-events:none;max-width:80%;border:1px solid rgba(255,255,255,0.1);';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(function() { el.style.opacity = '0'; }, 3000);
}

/* ===== Candy Match — Game Engine (Match-3) ===== */
(function() {
  'use strict';

  let canvas, ctx;
  const COLS = 8;
  const ROWS = 8;
  const CELL = 50;
  let board = [];
  let score = 0;
  let movesLeft = 30;
  let moveLimit = 30;
  let level = 1;
  let levelsCleared = 0;
  let bestCombo = 0;
  let specialsCreated = 0;
  let colorBombsUsed = 0;
  let gameActive = false;
  let gameOver = false;
  let isProcessing = false;
  let selectedCell = null;
  let particles = null;
  let floatingTexts = [];
  let animationId = null;

  const CANDY_COLORS = {
    classic: ['#ff4757', '#2ed573', '#1e90ff', '#ffd700', '#a855f7', '#ff9ff3'],
    fruit: ['#ff5151', '#7bed9f', '#70a1ff', '#ffd93d', '#c56cf0', '#ff9ff3'],
    gemstone: ['#dc143c', '#00cc44', '#0066ff', '#ffcc00', '#9933ff', '#ff66cc'],
    space: ['#ff3366', '#00ff88', '#00ccff', '#ffdd00', '#aa66ff', '#ff66aa'],
    neon: ['#ff0077', '#00ff88', '#00d4ff', '#ffff00', '#ff00ff', '#ff3300'],
  };

  const SPECIAL_TYPES = { striped: 'striped', wrapped: 'wrapped', bomb: 'bomb' };
  const BG_COLORS = {
    dark: ['#0f1020', '#1a1a2e'],
    wood: ['#3a2a1a', '#5a3a2a'],
    marble: ['#2a2a3a', '#3a3a4a'],
    cotton: ['#2a1a2a', '#4a2a4a'],
    galaxy: ['#0a0020', '#1a0050'],
  };

  function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = COLS * CELL;
    canvas.height = ROWS * CELL;
    loadProgression();
    startLevel(1);
  }

  function loadProgression() {
    if (window.ProgressionSystem) { ProgressionSystem.load();

  // ─── Framework Modules Init ───────────────────
  if (window.StoreRotator) StoreRotator.init();
  if (window.RetentionSystem) RetentionSystem.init();
  if (window.AdsManager) AdsManager.init();
  if (window.ChallengesSystem) ChallengesSystem.init();
  if (window.CollectiblesSystem) CollectiblesSystem.init();
  if (window.TutorialSystem) {
    TutorialSystem.init({ gameTitle: 'Game' });
    if (TutorialSystem.shouldShow()) {
      setTimeout(() => TutorialSystem.start(function() {
        if (window.showToast) showToast('Tutorial complete! Good luck!');
      }), 500);
    }
  }
  // ─── End Framework Init ───────────────────────
 updateHUD(); }
  }

  function startLevel(lvl) {
    level = lvl;
    score = 0;
    bestCombo = 0;
    specialsCreated = 0;
    colorBombsUsed = 0;
    isProcessing = false;
    selectedCell = null;
    floatingTexts = [];
    particles = new window.ParticleSystem();

    const bonuses = window.ProgressionSystem ? ProgressionSystem.getActiveBonuses() : {};
    movesLeft = (25 + (bonuses.startMoves || 0));
    moveLimit = movesLeft;

    // Generate board with no initial matches
    do {
      generateBoard();
    } while (findMatches().length > 0);

    gameActive = true;
    gameOver = false;
    document.getElementById('game-over-overlay')?.classList.remove('visible');
    document.getElementById('level-overlay')?.classList.remove('visible');
    updateUI();
    if (animationId) cancelAnimationFrame(animationId);
    render();
  }

  function generateBoard() {
    board = [];
    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) {
        const colors = getCandyColors();
        let color;
        do {
          color = Math.floor(Math.random() * colors.length);
        } while (r >= 2 && board[r-1][c] === color && board[r-2][c] === color ||
                 c >= 2 && board[r][c-1] === color && board[r][c-2] === color);
        board[r][c] = color;
      }
    }
  }

  function getCandyColors() {
    const theme = (window.ProgressionSystem ? ProgressionSystem.getState().activeCandyTheme : 'classic') || 'classic';
    return CANDY_COLORS[theme] || CANDY_COLORS.classic;
  }

  // ─── Match Detection ────────────────────────────────
  function findMatches() {
    const matches = [];
    // Horizontal matches of 3+
    for (let r = 0; r < ROWS; r++) {
      let start = 0;
      for (let c = 1; c <= COLS; c++) {
        if (c < COLS && board[r][c] === board[r][start]) continue;
        const len = c - start;
        if (len >= 3) {
          for (let i = start; i < c; i++) {
            matches.push({ row: r, col: i });
          }
        }
        start = c;
      }
    }
    // Vertical matches of 3+
    for (let c = 0; c < COLS; c++) {
      let start = 0;
      for (let r = 1; r <= ROWS; r++) {
        if (r < ROWS && board[r][c] === board[start][c]) continue;
        const len = r - start;
        if (len >= 3) {
          for (let i = start; i < r; i++) {
            matches.push({ row: i, col: c });
          }
        }
        start = r;
      }
    }
    // Deduplicate
    const unique = [];
    const seen = new Set();
    for (const m of matches) {
      const key = m.row + ',' + m.col;
      if (!seen.has(key)) { seen.add(key); unique.push(m); }
    }
    return unique;
  }

  // ─── Swap Logic ────────────────────────────────────
  function trySwap(r1, c1, r2, c2) {
    if (isProcessing || !gameActive || gameOver) return false;
    // Adjacent check
    if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false;
    if (board[r1][c1] === null || board[r2][c2] === null) return false;

    // Check if special candy is being swapped
    const cell1 = getCellInfo(r1, c1);
    const cell2 = getCellInfo(r2, c2);
    let specialSwap = false;

    // Color bomb + anything = clear all of that color
    if (cell1.special === 'bomb' || cell2.special === 'bomb') {
      const bombColor = cell1.special === 'bomb' ? board[r2][c2] : board[r1][c1];
      const bombRow = cell1.special === 'bomb' ? r1 : r2;
      const bombCol = cell1.special === 'bomb' ? c1 : c2;
      const normalRow = cell1.special === 'bomb' ? r2 : r1;
      const normalCol = cell1.special === 'bomb' ? c2 : c1;
      clearColor(bombColor, normalRow, normalCol);
      board[bombRow][bombCol] = null;
      specialSwap = true;
      colorBombsUsed++;
    } else {
      // Swap
      [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
    }

    const matches = findMatches();
    if (matches.length === 0 && !specialSwap) {
      // Swap back
      [board[r1][c1], board[r2][c2]] = [board[r2][c2], board[r1][c1]];
      return false;
    }

    movesLeft--;
    isProcessing = true;

    if (!specialSwap) {
      // Check for special candy creation
      processMatches(matches, r1, c1);
    } else {
      processSpecials(r1, c1);
    }

    selectedCell = null;
    updateUI();
    return true;
  }

  function processMatches(matches, srcR, srcC) {
    const bonuses = window.ProgressionSystem ? ProgressionSystem.getActiveBonuses() : {};
    const scoreMult = bonuses.scoreMult || 1;
    const matchBonus = bonuses.matchBonus || 0;
    const comboBonus = bonuses.comboBonus || 0;

    const colors = getCandyColors();
    const color = colors[board[srcR][srcC] >= 0 ? board[srcR][srcC] : 0];

    // Score
    const matchScore = (matches.length * 10 + matchBonus + comboBonus) * scoreMult;
    score += Math.floor(matchScore);

    // Particle effect
    if (particles) {
      for (const m of matches) {
        particles.emit(m.col * CELL + CELL/2, m.row * CELL + CELL/2, color, 5);
      }
    }

    // Remove matched
    for (const m of matches) {
      board[m.row][m.col] = null;
    }

    // Check for special candy creation (match of 4+)
    const specialChance = bonuses.specialChance || 0;
    let comboChain = 1;

    setTimeout(() => {
      // Create special candy at source position if 4+ match
      if (matches.length >= 4 && Math.random() < (0.3 + specialChance)) {
        board[srcR][srcC] = board[srcR][srcC] < 0 ? -board[srcR][srcC] - 1 : board[srcR][srcC];
        if (matches.length >= 5) {
          markSpecial(srcR, srcC, 'bomb');
          specialsCreated++;
        } else if (Math.random() < 0.5) {
          markSpecial(srcR, srcC, 'wrapped');
          specialsCreated++;
        } else {
          markSpecial(srcR, srcC, 'striped');
          specialsCreated++;
        }
      }

      // Fill gaps
      fillBoard();

      // Check chain reactions
      const newMatches = findMatches();
      if (newMatches.length > 0) {
        comboChain++;
        if (comboChain > bestCombo) bestCombo = comboChain;
        floatingTexts.push(new window.FloatingText(canvas.width/2, canvas.height/2, `🔥 Combo x${comboChain}!`, '#ffd700', 28));
        processMatches(newMatches, srcR, srcC);
      } else {
        isProcessing = false;
        checkGameEnd();
        render();
      }
    }, 300);

    // Check game end
    checkGameEnd();
  }

  function processSpecials(r, c) {
    setTimeout(() => {
      fillBoard();
      const newMatches = findMatches();
      if (newMatches.length > 0) {
        processMatches(newMatches, r, c);
      } else {
        isProcessing = false;
        checkGameEnd();
        render();
      }
    }, 300);
  }

  function clearColor(color, exceptR, exceptC) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if ((r !== exceptR || c !== exceptC) && board[r][c] >= 0 && board[r][c] === color) {
          board[r][c] = null;
          if (particles) particles.emit(c * CELL + CELL/2, r * CELL + CELL/2, '#ffffff', 8);
        }
      }
    }
  }

  function markSpecial(r, c, type) {
    // Store special type in the board as negative offset
    // Using parallel array for simplicity
    if (!board[r][c] && board[r][c] !== 0) return;
    const val = board[r][c];
    const specialArr = specialGrid;
    if (!specialArr[r]) specialArr[r] = [];
    specialArr[r][c] = type;
  }

  let specialGrid = [];

  function getCellInfo(r, c) {
    return { special: specialGrid?.[r]?.[c] || null, color: board[r]?.[c] ?? -1 };
  }

  function isSpecial(r, c) {
    return specialGrid?.[r]?.[c] != null;
  }

  // ─── Fill Board ────────────────────────────────────
  function fillBoard() {
    // Gravity: drop candies down
    for (let c = 0; c < COLS; c++) {
      let emptyRow = ROWS - 1;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][c] !== null && board[r][c] !== undefined) {
          if (r !== emptyRow) {
            board[emptyRow][c] = board[r][c];
            board[r][c] = null;
          }
          emptyRow--;
        }
      }
      // Fill from top
      const colors = getCandyColors();
      for (let r = emptyRow; r >= 0; r--) {
        board[r][c] = Math.floor(Math.random() * colors.length);
      }
    }
    specialGrid = [];
  }

  // ─── Game End Check ─────────────────────────────────
  function checkGameEnd() {
    if (board.length === 0) return;
    // Check if any valid move exists
    let hasValidMove = false;
    for (let r = 0; r < ROWS && !hasValidMove; r++) {
      for (let c = 0; c < COLS && !hasValidMove; c++) {
        // Try swap right
        if (c + 1 < COLS && board[r][c] !== null && board[r][c+1] !== null) {
          [board[r][c], board[r][c+1]] = [board[r][c+1], board[r][c]];
          if (findMatches().length > 0) hasValidMove = true;
          [board[r][c], board[r][c+1]] = [board[r][c+1], board[r][c]];
        }
        // Try swap down
        if (!hasValidMove && r + 1 < ROWS && board[r][c] !== null && board[r+1][c] !== null) {
          [board[r][c], board[r+1][c]] = [board[r+1][c], board[r][c]];
          if (findMatches().length > 0) hasValidMove = true;
          [board[r][c], board[r+1][c]] = [board[r+1][c], board[r][c]];
        }
      }
    }

    if (!hasValidMove || movesLeft <= 0) {
      gameActive = false;
      gameOver = true;
      showGameOver();
    }
  }

  // ─── Render ────────────────────────────────────────
  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const bgId = (window.ProgressionSystem ? ProgressionSystem.getState().activeBoardBackground : 'dark') || 'dark';
    const bgColors = BG_COLORS[bgId] || BG_COLORS.dark;
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, bgColors[0]);
    grad.addColorStop(1, bgColors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(canvas.width, r * CELL); ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, canvas.height); ctx.stroke();
    }

    // Candies
    const colors = getCandyColors();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r]?.[c] === null || board[r]?.[c] === undefined) continue;
        const colorIdx = board[r][c];
        const color = colors[colorIdx] || '#888';
        const x = c * CELL + 2;
        const y = r * CELL + 2;
        const size = CELL - 4;

        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;

        // Candy shape
        const isSelected = selectedCell && selectedCell.row === r && selectedCell.col === c;
        if (isSelected) {
          ctx.shadowBlur = 12;
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
        }

        // Draw candy
        const cx = x + size / 2;
        const cy = y + size / 2;
        const rad = size / 2 - 2;

        // Gradient
        const cGrad = ctx.createRadialGradient(cx - 4, cy - 4, 2, cx, cy, rad);
        cGrad.addColorStop(0, lightenColor(color, 0.3));
        cGrad.addColorStop(1, color);
        ctx.fillStyle = cGrad;

        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
        ctx.fill();

        // Shine
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.beginPath();
        ctx.arc(cx - rad * 0.25, cy - rad * 0.25, rad * 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Special indicator
        if (isSpecial(r, c)) {
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 16px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const sym = specialGrid[r][c] === 'striped' ? '══' : specialGrid[r][c] === 'wrapped' ? '◆' : '★';
          ctx.fillText(sym, cx, cy + 1);
        }

        ctx.restore();

        // Selection border
        if (isSelected) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(cx, cy, rad + 2, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Particles
    if (particles) { particles.update(); particles.draw(ctx); }

    // Floating texts
    floatingTexts = floatingTexts.filter(ft => ft.update());
    for (const ft of floatingTexts) ft.draw(ctx);
  }

  function lightenColor(color, amount) {
    // Simple lighten
    try {
      const r = parseInt(color.slice(1,3), 16);
      const g = parseInt(color.slice(3,5), 16);
      const b = parseInt(color.slice(5,7), 16);
      const lr = Math.min(255, Math.floor(r + (255 - r) * amount));
      const lg = Math.min(255, Math.floor(g + (255 - g) * amount));
      const lb = Math.min(255, Math.floor(b + (255 - b) * amount));
      return `rgb(${lr},${lg},${lb})`;
    } catch(e) { return color; }
  }

  // ─── UI ────────────────────────────────────────────
  function updateUI() {
    document.getElementById('score-value').textContent = score;
    document.getElementById('moves-value').textContent = movesLeft;
    document.getElementById('level-display').textContent = `Lv.${level}`;
  }

  function updateHUD() {
    if (!window.ProgressionSystem) return;
    const st = ProgressionSystem.getState();
    const c = document.getElementById('hud-coins');
    const g = document.getElementById('hud-gems');
    const l = document.getElementById('hud-level');
    if (c) c.textContent = st.coins;
    if (g) g.textContent = st.gems;
    if (l) l.textContent = st.level;
  }

  function showGameOver() {
    const targetScore = 500 + level * 200;
    const passed = score >= targetScore;
    document.getElementById('final-score').textContent = score;
    document.getElementById('target-score').textContent = targetScore;
    document.getElementById('game-result').textContent = passed ? '⭐ LEVEL PASSED! ⭐' : 'Try again!';
    document.getElementById('game-over-overlay').classList.add('visible');
    document.getElementById('next-level-btn').style.display = passed ? 'inline-flex' : 'none';

    if (passed) levelsCleared++;

    if (window.ProgressionSystem) {
      ProgressionSystem.endOfGame({ score, bestCombo, specialsCreated, levelsCleared: passed ? 1 : 0, colorBombsUsed });
      const unlocked = ProgressionSystem.checkAchievements();

  // ─── Framework Module Hooks ───────────────────
  if (window.RetentionSystem) {
    RetentionSystem.onGameEnd(score);
    RetentionSystem.submitScore('Player', score);
  }
  if (window.ChallengesSystem) {
    ChallengesSystem.reportProgress('score', score);
    ChallengesSystem.reportProgress('games', 1);
  }
  if (window.CollectiblesSystem) {
    CollectiblesSystem.incrementTracker('totalGames');
    CollectiblesSystem.setTracker('highestScore', score);
    CollectiblesSystem.checkUnlocks();
  }
  if (window.AdsManager) {
    setTimeout(function() { AdsManager.tryShowInterstitial(); }, 2000);
  }
  // ─── End Framework Hooks ─────────────────────
      if (unlocked.length > 0) setTimeout(() => showAchievementPopup(unlocked), 800);
      setTimeout(() => checkDailyBonus(), 1200);
    }
    if (particles) setTimeout(() => particles.emitLevelUp(), 400);
  }

  function showAchievementPopup(achievements) {
    achievements.forEach((ach, i) => {
      setTimeout(() => {
        const d = document.createElement('div');
        d.className = 'achievement-popup show';
        d.innerHTML = `<div class="ach-icon">${ach.icon}</div><div class="ach-title">🏅 Unlocked!</div><div class="ach-name">${ach.name}</div><div class="ach-reward">+${ach.reward.coins} 🪙${ach.reward.gems ? ' +'+ach.reward.gems+' 💎' : ''}</div>`;
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 3000);
      }, i * 700);
    });
  }

  function checkDailyBonus() {
    if (!window.ProgressionSystem) return;
    const r = ProgressionSystem.claimDailyBonus();
    if (!r) return;
    const d = document.createElement('div');
    d.className = 'daily-bonus-popup show';
    d.innerHTML = `<h3>📅 Daily Bonus!</h3><div class="streak-fire">${'🔥'.repeat(Math.min(r.streak,7))}</div><div class="reward-row">🪙 +${r.coins}${r.gems ? ' 💎 +'+r.gems : ''}</div><button class="game-btn btn-primary" style="margin-top:10px" onclick="this.closest('.daily-bonus-popup').remove()">OK</button>`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 5000);
  }

  function showAchievementsList() {
    if (!window.ProgressionSystem) return;
    const st = ProgressionSystem.getState(), ach = ProgressionSystem.getAchievements();
    const unlocked = Object.keys(st.achievements).length;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-box" style="min-width:300px;"><h3 style="text-align:center;color:var(--accent-gold);">🏆 Achievements</h3><div style="text-align:center;font-size:14px;color:var(--text-secondary);margin:8px 0;">${unlocked}/${ach.length}</div><div style="max-height:400px;">${ach.map(a => {
      const done = !!st.achievements[a.id];
      return `<div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:${done ? 'rgba(76,209,55,0.05)' : 'transparent'};border-radius:8px;margin-bottom:4px;"><span style="font-size:20px;">${done ? a.icon : '🔒'}</span><div style="flex:1;"><div style="font-size:13px;font-weight:600;">${a.name}</div><div style="font-size:11px;color:var(--text-secondary);">${a.desc}</div></div>${done ? '✅' : `<span style="font-size:11px;color:var(--accent-gold);">🪙${a.reward.coins}${a.reward.gems ? ' 💎'+a.reward.gems : ''}</span>`}</div>`;
    }).join('')}</div><button class="game-btn btn-restart" style="margin:10px auto 0;display:block;" onclick="this.closest('.modal-overlay').remove()">Close</button></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  }

  function showNotification(msg) {
    const el = document.getElementById('notification') || (() => { const n = document.createElement('div'); n.id = 'notification'; document.body.appendChild(n); return n; })();
    el.textContent = msg; el.className = 'show'; clearTimeout(el._timeout); el._timeout = setTimeout(() => el.className = '', 2500);
  }

  // ─── Controls ─────────────────────────────────────
  function initControls() {
    function handleClick(clientX, clientY) {
      if (isProcessing || !gameActive || gameOver) return;
      const rect = canvas.getBoundingClientRect();
      const mx = (clientX - rect.left) * (canvas.width / rect.width);
      const my = (clientY - rect.top) * (canvas.height / rect.height);
      const col = Math.floor(mx / CELL);
      const row = Math.floor(my / CELL);

      if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return;

      if (selectedCell) {
        const { row: sr, col: sc } = selectedCell;
        if (row === sr && col === sc) {
          selectedCell = null;
          render();
          return;
        }
        trySwap(sr, sc, row, col);
        render();
        render(); // Double render after animation
      } else {
        selectedCell = { row, col };
        render();
      }
    }

    canvas.addEventListener('click', (e) => handleClick(e.clientX, e.clientY));
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      handleClick(t.clientX, t.clientY);
    }, { passive: false });
  }

  // ─── Boot ──────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('restart-btn')?.addEventListener('click', () => startLevel(level));
    document.getElementById('restart-btn2')?.addEventListener('click', () => startLevel(1));
    document.getElementById('next-level-btn')?.addEventListener('click', () => {
      document.getElementById('game-over-overlay').classList.remove('visible');
      startLevel(level + 1);
    });
    document.getElementById('shop-btn')?.addEventListener('click', () => { if (window.ShopUI) ShopUI.open(); });
    document.getElementById('button-shop')?.addEventListener('click', () => { if (window.ShopUI) ShopUI.open(); });
    document.getElementById('button-ach')?.addEventListener('click', showAchievementsList);
    document.getElementById('button-upgrade')?.addEventListener('click', () => { if (window.ShopUI) { ShopUI.open(); ShopUI.showTab('upgrades'); } });
    initControls();
    setInterval(() => { if (window.ProgressionSystem) updateHUD(); }, 3000);
    init();
  });
})();
