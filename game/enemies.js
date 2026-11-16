// Enemies for Neon Harvest. Five types, each with its own shape, colour,
// movement and score. A chaser hunts the player, a shooter keeps its distance
// and fires, a spinner wobbles fast, a splitter bursts into minis on death,
// and a mini is the splitter's fast little child.

import { rand, randInt, angleTo, dist, TAU } from './utils.js';
import { ARENA_W, ARENA_H } from './player.js';

/** The enemy roster: shape, colour, size, health, speed and score. */
export const ENEMY_TYPES = {
  chaser: { shape: 'diamond', color: '#ff2d78', radius: 14, hp: 2, speed: 95, score: 25, contact: 10 },
  shooter: { shape: 'square', color: '#ff9f1c', radius: 16, hp: 3, speed: 62, score: 40, contact: 10 },
  spinner: { shape: 'hex', color: '#b537f2', radius: 13, hp: 2, speed: 135, score: 35, contact: 10 },
  splitter: { shape: 'orb', color: '#39d353', radius: 20, hp: 4, speed: 70, score: 50, contact: 12 },
  mini: { shape: 'diamond', color: '#a6ff4d', radius: 9, hp: 1, speed: 150, score: 10, contact: 6 },
};

/** Spawn one enemy of `type` at an arena edge, away from the player. */
export function spawnEnemy(type, player, rng = Math.random) {
  const def = ENEMY_TYPES[type];
  let x;
  let y;
  for (let tries = 0; tries < 12; tries++) {
    const edge = Math.floor(rng() * 4);
    if (edge === 0) {
      x = rand(30, ARENA_W - 30);
      y = 30;
    } else if (edge === 1) {
      x = rand(30, ARENA_W - 30);
      y = ARENA_H - 30;
    } else if (edge === 2) {
      x = 30;
      y = rand(30, ARENA_H - 30);
    } else {
      x = ARENA_W - 30;
      y = rand(30, ARENA_H - 30);
    }
    if (dist(x, y, player.x, player.y) > 240) break;
  }
  return {
    type,
    x,
    y,
    radius: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * rand(0.9, 1.1),
    score: def.score,
    contact: def.contact,
    color: def.color,
    shape: def.shape,
    angle: rand(0, TAU),
    fireCooldown: rand(1.2, 2.2),
    wobble: rand(0, TAU),
    flash: 0,
  };
}

/** Spawn a mini at a position (used when a splitter dies). */
export function spawnMini(x, y) {
  const def = ENEMY_TYPES.mini;
  return {
    type: 'mini',
    x: x + rand(-14, 14),
    y: y + rand(-14, 14),
    radius: def.radius,
    hp: def.hp,
    maxHp: def.hp,
    speed: def.speed * rand(0.9, 1.2),
    score: def.score,
    contact: def.contact,
    color: def.color,
    shape: def.shape,
    angle: rand(0, TAU),
    fireCooldown: 0,
    wobble: rand(0, TAU),
    flash: 0,
  };
}

/**
 * Move one enemy for a frame. Shooters fire into `enemyBullets` (each is
 * {x, y, vx, vy, radius, damage, friendly: false}).
 */
export function updateEnemy(enemy, player, dt, enemyBullets) {
  if (enemy.flash > 0) enemy.flash -= dt;
  const d = dist(enemy.x, enemy.y, player.x, player.y);
  const a = angleTo(enemy.x, enemy.y, player.x, player.y);
  enemy.angle = a;

  if (enemy.type === 'shooter') {
    // Hold a ring around the player and fire.
    const want = 230;
    const radial = d > want + 30 ? 1 : d < want - 30 ? -1 : 0;
    enemy.x += Math.cos(a) * enemy.speed * radial * dt;
    enemy.y += Math.sin(a) * enemy.speed * radial * dt;
    enemy.x += Math.cos(a + Math.PI / 2) * enemy.speed * 0.4 * dt;
    enemy.y += Math.sin(a + Math.PI / 2) * enemy.speed * 0.4 * dt;
    enemy.fireCooldown -= dt;
    if (enemy.fireCooldown <= 0 && d < 520) {
      enemy.fireCooldown = rand(1.6, 2.2);
      const spread = rand(-0.08, 0.08);
      enemyBullets.push({
        x: enemy.x,
        y: enemy.y,
        vx: Math.cos(a + spread) * 170,
        vy: Math.sin(a + spread) * 170,
        radius: 5,
        damage: 8,
        friendly: false,
      });
      return 'shot';
    }
  } else if (enemy.type === 'spinner') {
    enemy.wobble += dt * 5;
    const wob = Math.sin(enemy.wobble) * 0.9;
    enemy.x += Math.cos(a + wob) * enemy.speed * dt;
    enemy.y += Math.sin(a + wob) * enemy.speed * dt;
  } else {
    enemy.x += Math.cos(a) * enemy.speed * dt;
    enemy.y += Math.sin(a) * enemy.speed * dt;
  }

  enemy.x = Math.max(enemy.radius, Math.min(ARENA_W - enemy.radius, enemy.x));
  enemy.y = Math.max(enemy.radius, Math.min(ARENA_H - enemy.radius, enemy.y));
  return null;
}

/** Damage an enemy. Returns true when it dies. */
export function damageEnemy(enemy, amount) {
  enemy.hp -= amount;
  enemy.flash = 0.12;
  return enemy.hp <= 0;
}

/** A random point inside the arena, away from the player. */
export function randomPointAway(player, margin = 60) {
  let x;
  let y;
  do {
    x = rand(margin, ARENA_W - margin);
    y = rand(margin, ARENA_H - margin);
  } while (dist(x, y, player.x, player.y) < 180);
  return { x, y };
}

export { randInt };
