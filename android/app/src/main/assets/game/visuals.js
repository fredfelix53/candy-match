/* ===== Block Crush Daily — Visual Overhaul Engine =====
   Particle system, gradient rendering, animations, glow effects
*/
(function() {
  'use strict';

  // ─── Particle System ────────────────────────────────
  class Particle {
    constructor(x, y, color, type = 'sparkle') {
      this.x = x;
      this.y = y;
      this.color = color;
      this.type = type;
      this.life = 1.0;
      this.decay = 0.02 + Math.random() * 0.03;
      this.size = type === 'confetti' ? 4 + Math.random() * 4 : 2 + Math.random() * 3;
      this.vx = (Math.random() - 0.5) * 6;
      this.vy = (Math.random() - 0.5) * 6 - 2;
      this.gravity = 0.08 + Math.random() * 0.05;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.2;
      this.shape = type === 'confetti' ? 'rect' : 'circle';
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.life -= this.decay;
      this.rotation += this.rotSpeed;
      return this.life > 0;
    }

    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      
      if (this.shape === 'rect') {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 0.6);
      } else {
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 8;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  class ParticleSystem {
    constructor() {
      this.particles = [];
    }

    emit(x, y, color, count = 15, type = 'sparkle') {
      for (let i = 0; i < count; i++) {
        this.particles.push(new Particle(x, y, color, type));
      }
    }

    emitLineClear(x, y, colors) {
      for (let i = 0; i < 30; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.particles.push(new Particle(
          x + (Math.random() - 0.5) * 300,
          y + (Math.random() - 0.5) * 30,
          color, 'confetti'
        ));
      }
    }

    emitLevelUp() {
      const colors = ['#ffd700', '#ff6b6b', '#48dbfb', '#ff9ff3', '#54a0ff'];
      for (let i = 0; i < 80; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        this.particles.push(new Particle(
          300 + (Math.random() - 0.5) * 400,
          300 + (Math.random() - 0.5) * 200,
          color, 'confetti'
        ));
      }
    }

    emitReward(x, y) {
      const colors = ['#ffd700', '#ffe66d', '#ff9ff3', '#f368e0'];
      for (let i = 0; i < 40; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const p = new Particle(x, y, color, 'sparkle');
        p.vy = -3 - Math.random() * 4;
        p.vx = (Math.random() - 0.5) * 8;
        p.gravity = 0.06;
        p.decay = 0.008;
        p.size = 3 + Math.random() * 4;
        this.particles.push(p);
      }
    }

    update() {
      this.particles = this.particles.filter(p => p.update());
    }

    draw(ctx) {
      for (const p of this.particles) {
        p.draw(ctx);
      }
    }

    get count() { return this.particles.length; }
  }

  // ─── Gradient Block Renderer ────────────────────────
  const BLOCK_COLORS = {
    // Each entry: [gradientTop, gradientBottom, glowColor]
    I: { top: '#00d2ff', bottom: '#3a7bd5', glow: '#00d2ff' },
    O: { top: '#ffe259', bottom: '#ffa751', glow: '#ffe259' },
    T: { top: '#a18cd1', bottom: '#fbc2eb', glow: '#a18cd1' },
    S: { top: '#56ab2f', bottom: '#a8e063', glow: '#56ab2f' },
    Z: { top: '#ff6b6b', bottom: '#ee5a24', glow: '#ff6b6b' },
    J: { top: '#4facfe', bottom: '#00f2fe', glow: '#4facfe' },
    L: { top: '#fa709a', bottom: '#fee140', glow: '#fa709a' },
    default: { top: '#667eea', bottom: '#764ba2', glow: '#667eea' },
  };

  function getBlockColors(type) {
    return BLOCK_COLORS[type] || BLOCK_COLORS.default;
  }

  // ─── Upgrade Visual Configs ─────────────────────────
  const UPGRADE_VISUALS = {
    weapon: {
      0: { name: 'Wooden Mallet',      color: '#8B6914', glow: 'rgba(139,105,20,0.3)', particleColor: '#8B6914', border: '#6B4914' },
      1: { name: 'Stone Hammer',       color: '#7B7B7B', glow: 'rgba(123,123,123,0.4)', particleColor: '#7B7B7B', border: '#5B5B5B' },
      2: { name: 'Iron Sledge',        color: '#4A4A6A', glow: 'rgba(74,74,106,0.5)', particleColor: '#4A4A6A', border: '#2A2A4A' },
      3: { name: 'Steel Crusher',      color: '#2C3E6B', glow: 'rgba(44,62,107,0.6)', particleColor: '#4A7BFF', border: '#1A2E5B' },
      4: { name: 'Neon Laser Blade',   color: '#FF00FF', glow: 'rgba(255,0,255,0.8)', particleColor: '#FF00FF', border: '#00FFFF' },
      5: { name: '⚡ Void Devourer',   color: '#0F0F0F', glow: 'rgba(100,0,255,0.9)', particleColor: '#6600FF', border: '#FF00FF' },
    },
    case: {
      0: { name: 'Basic Cardboard',    color: '#C4A35A', glow: 'rgba(196,163,90,0.2)', shieldColor: '#C4A35A' },
      1: { name: 'Wooden Chest',       color: '#8B6914', glow: 'rgba(139,105,20,0.3)', shieldColor: '#A0782A' },
      2: { name: 'Iron Vault',         color: '#4A5A7A', glow: 'rgba(74,90,122,0.4)', shieldColor: '#6A8AAA' },
      3: { name: 'Silver Guardian',    color: '#C0C0C0', glow: 'rgba(192,192,192,0.5)', shieldColor: '#E0E0E0' },
      4: { name: 'Golden Fortress',    color: '#FFD700', glow: 'rgba(255,215,0,0.7)', shieldColor: '#FFD700' },
      5: { name: '💎 Diamond Aegis',  color: '#00FFFF', glow: 'rgba(0,255,255,0.9)', shieldColor: '#00FFFF' },
    },
    outfit: {
      0: { name: 'Rags',               color: '#6B5B4B', glow: 'rgba(107,91,75,0.2)', trailColor: '#6B5B4B' },
      1: { name: 'Leather Vest',       color: '#8B4513', glow: 'rgba(139,69,19,0.3)', trailColor: '#A06030' },
      2: { name: 'Chainmail',          color: '#708090', glow: 'rgba(112,128,144,0.4)', trailColor: '#90A0B0' },
      3: { name: 'Phantom Cloak',      color: '#6A0DAD', glow: 'rgba(106,13,173,0.5)', trailColor: '#8A2BE2' },
      4: { name: 'Crystal Armor',      color: '#00CED1', glow: 'rgba(0,206,209,0.7)', trailColor: '#00FF7F' },
      5: { name: '🔥 Phoenix Robe',   color: '#FF4500', glow: 'rgba(255,69,0,0.9)', trailColor: '#FF6347' },
    }
  };

  // ─── Floating Score Text ────────────────────────────
  class FloatingText {
    constructor(x, y, text, color = '#fff', size = 24) {
      this.x = x;
      this.y = y;
      this.text = text;
      this.color = color;
      this.size = size;
      this.life = 1.0;
      this.vy = -2;
    }
    update() {
      this.y += this.vy;
      this.vy *= 0.97;
      this.life -= 0.02;
      return this.life > 0;
    }
    draw(ctx) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.font = `bold ${this.size}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.fillText(this.text, this.x, this.y);
      ctx.restore();
    }
  }

  // ─── Draw Gradient Block (with glow, border, shine) ─
  function drawGradientBlock(ctx, x, y, size, type, glowEnabled = true, borderColor = null) {
    const colors = getBlockColors(type);
    const pad = 2;
    const bx = x + pad;
    const by = y + pad;
    const bs = size - pad * 2;
    const radius = 4;

    // Outer glow
    if (glowEnabled) {
      ctx.save();
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 12;
      ctx.fillStyle = colors.glow;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.roundRect(x, y, size, size, radius + 2);
      ctx.fill();
      ctx.restore();
    }

    // Main gradient
    const grad = ctx.createLinearGradient(bx, by, bx, by + bs);
    grad.addColorStop(0, colors.top);
    grad.addColorStop(1, colors.bottom);
    ctx.fillStyle = grad;

    ctx.beginPath();
    ctx.roundRect(bx, by, bs, bs, radius);
    ctx.fill();

    // Border
    if (borderColor) {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bs, bs, radius);
      ctx.stroke();
    }

    // Shine highlight (top-left corner)
    ctx.save();
    const shineGrad = ctx.createLinearGradient(bx, by, bx, by + bs * 0.4);
    shineGrad.addColorStop(0, 'rgba(255,255,255,0.25)');
    shineGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = shineGrad;
    ctx.beginPath();
    ctx.roundRect(bx, by, bs, bs * 0.4, radius);
    ctx.clip();
    ctx.beginPath();
    ctx.roundRect(bx, by, bs, bs * 0.4, radius);
    ctx.fill();
    ctx.restore();

    // Icon/letter overlay
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `bold ${bs * 0.4}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(type, bx + bs / 2, by + bs / 2);
  }

  // ─── Draw Empty Cell ────────────────────────────────
  function drawEmptyCell(ctx, x, y, size, themeColors) {
    ctx.fillStyle = themeColors.accent || 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.roundRect(x + 1, y + 1, size - 2, size - 2, 3);
    ctx.fill();
  }

  // ─── Animated Background ────────────────────────────
  class AnimatedBackground {
    constructor(canvas, colors) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.color1 = colors[0];
      this.color2 = colors[1];
      this.offset = 0;
    }

    update() {
      this.offset = (this.offset + 0.0003) % 1;
    }

    draw() {
      const ctx = this.ctx;
      const w = this.canvas.width;
      const h = this.canvas.height;
      const grad = ctx.createRadialGradient(
        w * (0.5 + Math.sin(this.offset * Math.PI * 2) * 0.3),
        h * (0.5 + Math.cos(this.offset * Math.PI * 2) * 0.2),
        0,
        w / 2, h / 2, w * 0.8
      );
      grad.addColorStop(0, this.color1);
      grad.addColorStop(1, this.color2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ─── Export ──────────────────────────────────────────
  window.ParticleSystem = ParticleSystem;
  window.Particle = Particle;
  window.FloatingText = FloatingText;
  window.drawGradientBlock = drawGradientBlock;
  window.drawEmptyCell = drawEmptyCell;
  window.AnimatedBackground = AnimatedBackground;
  window.UPGRADE_VISUALS = UPGRADE_VISUALS;
  window.getBlockColors = getBlockColors;
})();
