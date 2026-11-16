// The player's ship for Neon Harvest: a small neon dart that moves with
// WASD/arrows, aims at the mouse, and fires while the mouse or Space is held.
// Upgrades modify its fields; damage, healing and lives are handled here.

import { clamp, angleTo, TAU } from './utils.js';

/** The arena the ship flies in (matches the canvas size). */
export const ARENA_W = 960;
export const ARENA_H = 640;

export function createPlayer() {
  return {
    x: ARENA_W / 2,
    y: ARENA_H / 2,
    radius: 14,
    angle: -Math.PI / 2,
    hull: 100,
    maxHull: 100,
    lives: 3,
    speed: 260,
    fireRate: 0.16,
    damage: 1,
    projectiles: 1,
    magnetRadius: 90,
    shield: false,
    fireCooldown: 0,
    invuln: 0,
    thrust: 0,
    dead: false,
  };
}

/**
 * Move, aim and shoot. Returns the bullets this frame created (each is
 * {x, y, vx, vy, radius, damage, friendly: true}).
 */
export function updatePlayer(player, input, dt, onShoot) {
  let mx = 0;
  let my = 0;
  if (input.anyDown(['KeyA', 'ArrowLeft'])) mx -= 1;
  if (input.anyDown(['KeyD', 'ArrowRight'])) mx += 1;
  if (input.anyDown(['KeyW', 'ArrowUp'])) my -= 1;
  if (input.anyDown(['KeyS', 'ArrowDown'])) my += 1;
  if (mx !== 0 || my !== 0) {
    const len = Math.hypot(mx, my);
    player.x += (mx / len) * player.speed * dt;
    player.y += (my / len) * player.speed * dt;
    player.thrust = 1;
  } else {
    player.thrust = 0;
  }
  player.x = clamp(player.x, player.radius, ARENA_W - player.radius);
  player.y = clamp(player.y, player.radius, ARENA_H - player.radius);

  player.angle = angleTo(player.x, player.y, input.mouse.x, input.mouse.y);
  player.fireCooldown -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  const firing = input.mouse.down || input.down('Space');
  if (firing && player.fireCooldown <= 0) {
    player.fireCooldown = player.fireRate;
    const spread = 0.09;
    const n = player.projectiles;
    for (let i = 0; i < n; i++) {
      const off = (i - (n - 1) / 2) * spread;
      const a = player.angle + off;
      onShoot({
        x: player.x + Math.cos(a) * (player.radius + 6),
        y: player.y + Math.sin(a) * (player.radius + 6),
        vx: Math.cos(a) * 540,
        vy: Math.sin(a) * 540,
        radius: 4,
        damage: player.damage,
        friendly: true,
      });
    }
    return true;
  }
  return false;
}

/** Damage the ship. Returns 'shield' when the shield ate it, 'hit' or 'dead'. */
export function damagePlayer(player, amount) {
  if (player.invuln > 0 || player.dead) return 'none';
  if (player.shield) {
    player.shield = false;
    player.invuln = 1.0;
    return 'shield';
  }
  player.hull -= amount;
  player.invuln = 1.2;
  if (player.hull <= 0) {
    player.lives -= 1;
    if (player.lives <= 0) {
      player.dead = true;
      return 'dead';
    }
    player.hull = player.maxHull;
    return 'down';
  }
  return 'hit';
}

/** Heal the hull, never past its max. Returns the amount actually healed. */
export function healPlayer(player, amount) {
  const before = player.hull;
  player.hull = Math.min(player.maxHull, player.hull + amount);
  return player.hull - before;
}

/** The ship's nose position, for muzzle effects. */
export function nose(player) {
  return {
    x: player.x + Math.cos(player.angle) * (player.radius + 8),
    y: player.y + Math.sin(player.angle) * (player.radius + 8),
  };
}

export { TAU };
