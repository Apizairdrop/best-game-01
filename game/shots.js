// Screenshot staging for Neon Harvest. ?shot=start|play|end (with an
// optional &seed=N) sets up one scene deterministically, paints it, and
// sets window.__shotReady so a headless screenshot knows the frame is done.
// These are real renders of the game's own renderer, never edited images.

import { mulberry32 } from './utils.js';
import { createPlayer, ARENA_W, ARENA_H } from './player.js';
import { spawnEnemy, ENEMY_TYPES } from './enemies.js';

/** Build a mid-game scene: player, enemies, orbs, bullets and a score. */
function stagePlay(game, seed) {
  const rng = mulberry32(seed);
  const p = createPlayer();
  p.x = ARENA_W * 0.42;
  p.y = ARENA_H * 0.55;
  p.angle = -0.4;
  p.hull = 72;
  p.shield = true;
  game.player = p;
  game.state = 'play';
  game.wave = 4;
  game.score = 2840;
  game.orbsCollected = 23;
  game.kills = 41;
  game.enemies = [];
  const types = ['chaser', 'chaser', 'shooter', 'spinner', 'splitter', 'chaser', 'mini'];
  for (const type of types) {
    const e = spawnEnemy(type, p, rng);
    e.x = 120 + rng() * (ARENA_W - 240);
    e.y = 90 + rng() * (ARENA_H - 220);
    game.enemies.push(e);
  }
  game.orbs = [];
  for (let i = 0; i < 6; i++) {
    game.orbs.push({
      x: 90 + rng() * (ARENA_W - 180),
      y: 80 + rng() * (ARENA_H - 160),
      color: rng() > 0.5 ? '#facc15' : '#22d3ee',
      phase: rng() * 6,
    });
  }
  game.playerBullets = [
    { x: p.x + 60, y: p.y - 30, vx: 540, vy: -120, radius: 4, damage: 1, friendly: true },
    { x: p.x + 40, y: p.y - 10, vx: 540, vy: -40, radius: 4, damage: 1, friendly: true },
    { x: p.x + 90, y: p.y + 20, vx: 540, vy: 60, radius: 4, damage: 1, friendly: true },
  ];
  game.enemyBullets = [
    { x: p.x + 260, y: p.y - 60, vx: -170, vy: 20, radius: 5, damage: 8, friendly: false },
  ];
  game.particles.burst(p.x + 180, p.y - 90, ENEMY_TYPES.chaser.color, 16, 240, 3);
  game.particles.popup(p.x + 120, p.y - 110, '+25', '#facc15');
  game.particles.popup(p.x - 60, p.y + 90, '+10', '#22d3ee');
}

/** Build the game-over screen with a finished run behind it. */
function stageEnd(game, seed) {
  stagePlay(game, seed);
  game.player.dead = true;
  game.player.lives = 0;
  game.player.hull = 0;
  game.score = 5310;
  game.kills = 87;
  game.orbsCollected = 41;
  game.wavesCleared = 6;
  game.state = 'over';
  game.particles.burst(ARENA_W / 2, ARENA_H / 2, '#ff2d78', 30, 300, 4);
}

/** Stage one named scene on the game object. Returns true when staged. */
export function stageShot(kind, game, seed) {
  if (kind === 'start') {
    game.state = 'title';
    game.best = 5310;
    return true;
  }
  if (kind === 'play') {
    stagePlay(game, seed);
    return true;
  }
  if (kind === 'end') {
    stageEnd(game, seed);
    return true;
  }
  return false;
}
