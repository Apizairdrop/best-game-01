// All canvas drawing for Neon Harvest: the neon arena, every entity, the
// HUD, and every screen (title, upgrade, paused, game over, win). Drawing
// is the only job here; the game logic lives in the other modules. The
// renderer also reports the clickable regions of the current screen so the
// main loop can hit-test mouse clicks against buttons and upgrade cards.

import { TAU, fmt, clamp } from './utils.js';
import { ARENA_W, ARENA_H } from './player.js';

/** Canvas font stack (system fonts only, nothing fetched). */
const FONT = '"Segoe UI", system-ui, -apple-system, sans-serif';
const FONT_MONO = '"Cascadia Code", "SF Mono", Consolas, monospace';

/** The upgrade card layout, shared with hit-testing. */
export const UPGRADE_CARDS = { w: 220, h: 150, gap: 24, y: 300 };

/** Draw a glowing shape: a path filled with a colour and a soft halo. */
function glowPath(ctx, color, draw) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  draw();
  ctx.restore();
}

/** A regular polygon path centred at (x, y). */
function polygon(ctx, x, y, radius, sides, rot) {
  ctx.beginPath();
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * TAU;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawBackground(ctx, time) {
  ctx.fillStyle = '#050510';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  // Faint grid.
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 40; x < ARENA_W; x += 40) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA_H);
  }
  for (let y = 40; y < ARENA_H; y += 40) {
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_W, y);
  }
  ctx.stroke();
  // Arena border, pulsing gently.
  const pulse = 0.35 + 0.12 * Math.sin(time * 2);
  ctx.strokeStyle = `rgba(34, 211, 238, ${pulse})`;
  ctx.lineWidth = 3;
  ctx.strokeRect(6, 6, ARENA_W - 12, ARENA_H - 12);
  // A few drifting stars.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 173 + 40) % ARENA_W;
    const sy = (i * 97 + 60 + time * 6) % ARENA_H;
    ctx.fillRect(sx, sy, 2, 2);
  }
}

function drawOrb(ctx, orb, time) {
  const r = 7 + 1.5 * Math.sin(time * 4 + orb.phase);
  glowPath(ctx, orb.color, () => {
    ctx.fillStyle = orb.color;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, r, 0, TAU);
    ctx.fill();
  });
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, 2.5, 0, TAU);
  ctx.fill();
}

function drawEnemy(ctx, e) {
  const flash = e.flash > 0;
  const color = flash ? '#ffffff' : e.color;
  glowPath(ctx, e.color, () => {
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    if (e.shape === 'diamond') {
      polygon(ctx, e.x, e.y, e.radius, 4, e.angle);
      ctx.fill();
    } else if (e.shape === 'square') {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      ctx.fillRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
      ctx.restore();
    } else if (e.shape === 'hex') {
      polygon(ctx, e.x, e.y, e.radius, 6, e.angle);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius * 0.55, 0, TAU);
      ctx.fillStyle = '#050510';
      ctx.fill();
    }
  });
  // Health pips for tougher enemies.
  if (e.maxHp > 2 && e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 4);
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, (w * e.hp) / e.maxHp, 4);
  }
}

function drawPlayer(ctx, p, time) {
  if (p.dead) return;
  const blink = p.invuln > 0 && Math.floor(time * 14) % 2 === 0;
  ctx.save();
  if (blink) ctx.globalAlpha = 0.35;
  // Engine glow when thrusting.
  if (p.thrust > 0) {
    const bx = p.x - Math.cos(p.angle) * (p.radius + 4);
    const by = p.y - Math.sin(p.angle) * (p.radius + 4);
    glowPath(ctx, '#fb923c', () => {
      ctx.fillStyle = '#fb923c';
      ctx.beginPath();
      ctx.arc(bx, by, 5 + 2 * Math.sin(time * 30), 0, TAU);
      ctx.fill();
    });
  }
  glowPath(ctx, '#22d3ee', () => {
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#22d3ee';
    ctx.beginPath();
    ctx.moveTo(p.radius + 6, 0);
    ctx.lineTo(-p.radius * 0.8, p.radius * 0.85);
    ctx.lineTo(-p.radius * 0.4, 0);
    ctx.lineTo(-p.radius * 0.8, -p.radius * 0.85);
    ctx.closePath();
    ctx.fill();
  });
  // Cockpit dot.
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 3, 0, TAU);
  ctx.fill();
  ctx.restore();
  // Shield ring.
  if (p.shield) {
    ctx.save();
    ctx.strokeStyle = 'rgba(167, 139, 250, 0.9)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#a78bfa';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 9 + Math.sin(time * 5) * 2, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBullets(ctx, bullets) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of bullets) {
    if (b.friendly) {
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    } else {
      glowPath(ctx, '#ff6b35', () => {
        ctx.fillStyle = '#ff6b35';
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius, 0, TAU);
        ctx.fill();
      });
    }
  }
  ctx.restore();
}

function drawHud(ctx, s) {
  ctx.save();
  // Top bar.
  ctx.fillStyle = 'rgba(5, 5, 16, 0.72)';
  ctx.fillRect(0, 0, ARENA_W, 44);
  ctx.strokeStyle = 'rgba(34, 211, 238, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 44.5);
  ctx.lineTo(ARENA_W, 44.5);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = `bold 17px ${FONT_MONO}`;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`SCORE ${fmt(s.score)}`, 14, 23);
  ctx.fillStyle = '#facc15';
  ctx.fillText(`WAVE ${Math.max(1, s.wave)}/10`, 250, 23);
  // Lives as little ships.
  ctx.fillStyle = '#f472b6';
  for (let i = 0; i < s.player.lives; i++) {
    const x = 420 + i * 26;
    ctx.beginPath();
    ctx.moveTo(x + 9, 14);
    ctx.lineTo(x, 30);
    ctx.lineTo(x + 5, 22);
    ctx.lineTo(x + 13, 22);
    ctx.lineTo(x + 18, 30);
    ctx.closePath();
    ctx.fill();
  }
  // Hull bar.
  const bx = 560;
  const bw = 170;
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(bx, 14, bw, 16);
  const ratio = clamp(s.player.hull / s.player.maxHull, 0, 1);
  ctx.fillStyle = ratio > 0.5 ? '#4ade80' : ratio > 0.25 ? '#facc15' : '#f87171';
  ctx.fillRect(bx, 14, bw * ratio, 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.strokeRect(bx, 14, bw, 16);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = `bold 12px ${FONT}`;
  ctx.fillText('HULL', bx + 6, 22);
  // Orbs and mute.
  ctx.textAlign = 'right';
  ctx.font = `bold 17px ${FONT_MONO}`;
  ctx.fillStyle = '#facc15';
  ctx.fillText(`◉ ${s.orbsCollected}`, ARENA_W - 70, 23);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `13px ${FONT}`;
  ctx.fillText(s.muted ? 'MUTED (M)' : 'M mute', ARENA_W - 14, 23);
  ctx.restore();
}

function drawCentered(ctx, lines, y0, gap) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  lines.forEach((line, i) => {
    ctx.font = line.font;
    ctx.fillStyle = line.color;
    ctx.fillText(line.text, ARENA_W / 2, y0 + i * gap);
  });
}

function drawTitle(ctx, s, time) {
  ctx.fillStyle = 'rgba(5, 5, 16, 0.66)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  const bob = Math.sin(time * 2) * 6;
  drawCentered(
    ctx,
    [
      { text: 'NEON HARVEST', font: `bold 64px ${FONT}`, color: '#22d3ee' },
      { text: 'collect the light · survive the swarm', font: `20px ${FONT}`, color: '#a5f3fc' },
    ],
    190 + bob,
    54,
  );
  drawCentered(
    ctx,
    [
      { text: 'WASD / arrows — fly      Mouse — aim      Hold click / Space — fire', font: `17px ${FONT}`, color: '#e2e8f0' },
      { text: 'Grab energy orbs, blast 10 waves, pick upgrades between waves.', font: `17px ${FONT}`, color: '#e2e8f0' },
      { text: 'Clear wave 10 to win. You have 3 lives — good luck, pilot.', font: `17px ${FONT}`, color: '#e2e8f0' },
    ],
    330,
    30,
  );
  // Start button.
  const bw = 260;
  const bh = 58;
  const bx = ARENA_W / 2 - bw / 2;
  const by = 450;
  const pulse = 0.7 + 0.3 * Math.sin(time * 4);
  ctx.save();
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 18 * pulse;
  ctx.fillStyle = '#0e7490';
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶  START', ARENA_W / 2, by + bh / 2 + 1);
  if (s.best > 0) {
    ctx.fillStyle = '#facc15';
    ctx.font = `bold 16px ${FONT_MONO}`;
    ctx.fillText(`BEST ${fmt(s.best)}`, ARENA_W / 2, by + bh + 36);
  }
}

function drawUpgrade(ctx, s) {
  ctx.fillStyle = 'rgba(5, 5, 16, 0.78)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  drawCentered(
    ctx,
    [
      { text: `WAVE ${s.wave} CLEARED`, font: `bold 40px ${FONT}`, color: '#4ade80' },
      { text: `+${fmt(s.waveBonus)} wave bonus · choose one upgrade`, font: `18px ${FONT}`, color: '#e2e8f0' },
    ],
    150,
    46,
  );
  const { w, h, gap, y } = UPGRADE_CARDS;
  const total = s.upgrades.length * w + (s.upgrades.length - 1) * gap;
  let x = ARENA_W / 2 - total / 2;
  s.upgrades.forEach((u, i) => {
    const hover = s.hoverUpgrade === i;
    ctx.save();
    if (hover) {
      ctx.shadowColor = u.color;
      ctx.shadowBlur = 20;
    }
    ctx.fillStyle = hover ? '#1e293b' : '#0f172a';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = u.color;
    ctx.lineWidth = hover ? 3 : 2;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = u.color;
    ctx.font = `bold 19px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(u.name, x + w / 2, y + 36);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `15px ${FONT}`;
    ctx.fillText(u.desc, x + w / 2, y + 78);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `13px ${FONT_MONO}`;
    ctx.fillText(`[ ${i + 1} ]`, x + w / 2, y + h - 24);
    x += w + gap;
  });
  ctx.fillStyle = '#94a3b8';
  ctx.font = `14px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('Click a card or press 1 / 2 / 3', ARENA_W / 2, y + h + 40);
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5, 5, 16, 0.7)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  drawCentered(
    ctx,
    [
      { text: 'PAUSED', font: `bold 48px ${FONT}`, color: '#e2e8f0' },
      { text: 'Press P or Esc to resume', font: `18px ${FONT}`, color: '#94a3b8' },
    ],
    280,
    52,
  );
}

function drawEnd(ctx, s, won) {
  ctx.fillStyle = 'rgba(5, 5, 16, 0.8)';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);
  drawCentered(
    ctx,
    [
      { text: won ? 'HARVEST COMPLETE!' : 'GAME OVER', font: `bold 52px ${FONT}`, color: won ? '#4ade80' : '#f87171' },
      {
        text: won ? 'All 10 waves cleared. The arena is yours.' : 'Your ship went dark among the neon.',
        font: `19px ${FONT}`,
        color: '#e2e8f0',
      },
    ],
    180,
    56,
  );
  drawCentered(
    ctx,
    [
      { text: `FINAL SCORE  ${fmt(s.score)}`, font: `bold 28px ${FONT_MONO}`, color: '#facc15' },
      { text: `Waves cleared ${s.wavesCleared} · Enemies destroyed ${s.kills} · Orbs collected ${s.orbsCollected}`, font: `16px ${FONT}`, color: '#cbd5e1' },
      { text: s.score >= s.best && s.score > 0 ? '★ NEW BEST SCORE ★' : `Best ${fmt(s.best)}`, font: `bold 17px ${FONT}`, color: '#facc15' },
    ],
    300,
    40,
  );
  const bw = 260;
  const bh = 58;
  const bx = ARENA_W / 2 - bw / 2;
  const by = 450;
  ctx.save();
  ctx.shadowColor = '#22d3ee';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#0e7490';
  ctx.fillRect(bx, by, bw, bh);
  ctx.restore();
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 24px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('↻  PLAY AGAIN', ARENA_W / 2, by + bh / 2 + 1);
  ctx.fillStyle = '#94a3b8';
  ctx.font = `14px ${FONT}`;
  ctx.fillText('or press Enter', ARENA_W / 2, by + bh + 32);
}

/** The clickable regions of the current screen, for hit-testing. */
export function hitRegions(s) {
  if (s.state === 'title' || s.state === 'over' || s.state === 'win') {
    return [{ id: 'start', x: ARENA_W / 2 - 130, y: 450, w: 260, h: 58 }];
  }
  if (s.state === 'upgrade') {
    const { w, h, gap, y } = UPGRADE_CARDS;
    const total = s.upgrades.length * w + (s.upgrades.length - 1) * gap;
    let x = ARENA_W / 2 - total / 2;
    return s.upgrades.map((u, i) => {
      const region = { id: `upgrade:${i}`, x, y, w, h };
      x += w + gap;
      return region;
    });
  }
  return [];
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(s, time) {
      ctx.save();
      ctx.clearRect(0, 0, ARENA_W, ARENA_H);
      const shake = s.particles.offset();
      ctx.translate(shake.x, shake.y);
      drawBackground(ctx, time);
      for (const orb of s.orbs) drawOrb(ctx, orb, time);
      for (const e of s.enemies) drawEnemy(ctx, e);
      drawBullets(ctx, s.playerBullets);
      drawBullets(ctx, s.enemyBullets);
      drawPlayer(ctx, s.player, time);
      s.particles.draw(ctx);
      ctx.restore();
      if (s.state === 'play' || s.state === 'paused' || s.state === 'upgrade') drawHud(ctx, s);
      if (s.state === 'title') drawTitle(ctx, s, time);
      if (s.state === 'upgrade') drawUpgrade(ctx, s);
      if (s.state === 'paused') drawPaused(ctx);
      if (s.state === 'over') drawEnd(ctx, s, false);
      if (s.state === 'win') drawEnd(ctx, s, true);
    },
  };
}
