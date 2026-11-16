// Particles, floating score popups and screen shake for Neon Harvest.
// Everything here is visual feedback: sparks on hits, bursts on explosions,
// drifting "+25" texts, and a trauma-based shake that kicks on damage.

import { rand, TAU } from './utils.js';

export function createParticles() {
  const parts = [];
  const texts = [];
  let trauma = 0;

  return {
    /** Add a radial burst of glowing dots. */
    burst(x, y, color, count = 14, speed = 220, size = 3) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, TAU);
        const v = rand(speed * 0.3, speed);
        parts.push({
          x,
          y,
          vx: Math.cos(a) * v,
          vy: Math.sin(a) * v,
          life: rand(0.25, 0.6),
          maxLife: 0.6,
          size: rand(size * 0.5, size * 1.4),
          color,
          drag: 0.92,
        });
      }
    },

    /** A thin ring that expands and fades (wave clear, big kills). */
    ring(x, y, color) {
      parts.push({
        x,
        y,
        vx: 0,
        vy: 0,
        life: 0.5,
        maxLife: 0.5,
        size: 4,
        color,
        drag: 1,
        ring: true,
      });
    },

    /** A floating "+25" style popup. */
    popup(x, y, text, color = '#ffffff') {
      texts.push({ x, y, text, life: 0.9, maxLife: 0.9, color });
    },

    /** Kick the shake; 1 is a hard hit, 0.3 a soft one. */
    shake(amount) {
      trauma = Math.min(1, trauma + amount);
    },

    update(dt) {
      trauma = Math.max(0, trauma - dt * 1.6);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          parts.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
        if (p.ring) p.size += dt * 420;
      }
      for (let i = texts.length - 1; i >= 0; i--) {
        const t = texts[i];
        t.life -= dt;
        t.y -= 42 * dt;
        if (t.life <= 0) texts.splice(i, 1);
      }
    },

    /** The current shake offset (0 when calm). */
    offset() {
      if (trauma <= 0) return { x: 0, y: 0 };
      const s = trauma * trauma * 14;
      return { x: rand(-s, s), y: rand(-s, s) };
    },

    draw(ctx) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const p of parts) {
        const a = Math.max(0, p.life / p.maxLife);
        if (p.ring) {
          ctx.globalAlpha = a * 0.8;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.stroke();
        } else {
          ctx.globalAlpha = a;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * a + 0.5, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.save();
      ctx.textAlign = 'center';
      ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
      for (const t of texts) {
        const a = Math.max(0, t.life / t.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = t.color;
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.restore();
    },

    clear() {
      parts.length = 0;
      texts.length = 0;
      trauma = 0;
    },
  };
}
