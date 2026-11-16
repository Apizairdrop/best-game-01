// Neon Harvest — boot, the one game loop, and the state machine.
// Screens: title → play → (upgrade between waves) → win / over.
// The loop advances in fixed 1/60 s steps so play is the same speed on any
// machine; rendering paints whatever the world holds right now.

import { clamp, dist, rand, fmt } from './utils.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createParticles } from './particles.js';
import {
  createPlayer,
  updatePlayer,
  damagePlayer,
  healPlayer,
  ARENA_W,
  ARENA_H,
} from './player.js';
import {
  spawnEnemy,
  spawnMini,
  updateEnemy,
  damageEnemy,
  randomPointAway,
} from './enemies.js';
import { buildSpawnList, waveInterval, drawUpgrades, TOTAL_WAVES } from './waves.js';
import { createRenderer, hitRegions } from './render.js';
import { stageShot } from './shots.js';

/** Fixed step for the simulation (seconds). */
const STEP = 1 / 60;
/** Longest real frame the loop catches up on; longer stalls are dropped. */
const MAX_FRAME = 0.25;
/** localStorage key for the best score. */
const BEST_KEY = 'neon-harvest-best';

const params = new URLSearchParams(window.location.search);
const shotKind = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1337;

const canvas = document.getElementById('game');
const input = createInput(canvas);
const audio = createAudio();
const renderer = createRenderer(canvas);

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best then lasts this visit only.
  }
}

/** A fresh run: a new ship, empty arena, wave 1 about to start. */
function freshRun() {
  const player = createPlayer();
  player.shieldOwned = false;
  return {
    state: 'play',
    score: 0,
    best: readBest(),
    wave: 0,
    wavesCleared: 0,
    kills: 0,
    orbsCollected: 0,
    waveBonus: 0,
    player,
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    orbs: [],
    particles: createParticles(),
    upgrades: [],
    hoverUpgrade: -1,
    spawnList: [],
    spawnTimer: 0,
    orbTimer: 0,
    muted: false,
    time: 0,
  };
}

let game = freshRun();
game.state = 'title';
let staged = false;

function startWave() {
  game.wave += 1;
  game.spawnList = buildSpawnList(game.wave - 1);
  game.spawnTimer = 0.6;
  game.orbTimer = 1.5;
  if (game.player.shieldOwned) game.player.shield = true;
  for (let i = 0; i < 3; i++) {
    const p = randomPointAway(game.player);
    game.orbs.push({ x: p.x, y: p.y, color: Math.random() > 0.5 ? '#facc15' : '#22d3ee', phase: rand(0, 6) });
  }
}

function startGame() {
  const best = game.best;
  const muted = game.muted;
  game = freshRun();
  game.best = best;
  game.muted = muted;
  audio.unlock();
  audio.click();
  startWave();
}

function endGame(won) {
  game.state = won ? 'win' : 'over';
  if (won) {
    game.score += 1000;
    audio.win();
  } else {
    audio.gameOver();
  }
  if (game.score > game.best) {
    game.best = game.score;
    saveBest(game.best);
  }
  game.particles.ring(game.player.x, game.player.y, won ? '#4ade80' : '#f87171');
}

function waveCleared() {
  game.wavesCleared += 1;
  game.waveBonus = 100 * game.wave;
  game.score += game.waveBonus;
  audio.waveClear();
  game.particles.ring(ARENA_W / 2, ARENA_H / 2, '#4ade80');
  game.particles.popup(ARENA_W / 2, ARENA_H / 2 - 40, `WAVE BONUS +${fmt(game.waveBonus)}`, '#4ade80');
  if (game.wave >= TOTAL_WAVES) {
    endGame(true);
    return;
  }
  game.upgrades = drawUpgrades(game.player);
  game.hoverUpgrade = -1;
  game.state = 'upgrade';
}

function applyUpgrade(index) {
  const u = game.upgrades[index];
  if (!u) return;
  u.apply(game.player);
  if (u.id === 'shield') game.player.shieldOwned = true;
  audio.upgrade();
  game.particles.burst(game.player.x, game.player.y, u.color, 20, 260, 3);
  game.particles.popup(game.player.x, game.player.y - 30, u.name, u.color);
  game.state = 'play';
  startWave();
}

function collectOrb(orb) {
  game.orbsCollected += 1;
  game.score += 10;
  healPlayer(game.player, 2);
  game.particles.burst(orb.x, orb.y, orb.color, 8, 140, 2.5);
  game.particles.popup(orb.x, orb.y - 12, '+10', orb.color);
  audio.pickup();
}

function killEnemy(enemy, index) {
  game.enemies.splice(index, 1);
  game.kills += 1;
  game.score += enemy.score;
  game.particles.burst(enemy.x, enemy.y, enemy.color, 18, 260, 3);
  game.particles.popup(enemy.x, enemy.y - 14, `+${enemy.score}`, enemy.color);
  audio.explode();
  if (enemy.type === 'splitter') {
    game.enemies.push(spawnMini(enemy.x, enemy.y));
    game.enemies.push(spawnMini(enemy.x, enemy.y));
  }
}

function hurtPlayer(amount) {
  const result = damagePlayer(game.player, amount);
  if (result === 'none') return;
  if (result === 'shield') {
    game.particles.burst(game.player.x, game.player.y, '#a78bfa', 12, 200, 3);
    audio.enemyHit();
    return;
  }
  game.particles.shake(result === 'dead' ? 1 : 0.6);
  game.particles.burst(game.player.x, game.player.y, '#f87171', 22, 280, 3);
  audio.hurt();
  if (result === 'down') {
    game.particles.ring(game.player.x, game.player.y, '#f87171');
  }
  if (result === 'dead') {
    endGame(false);
  }
}

function update(dt) {
  game.time += dt;
  game.particles.update(dt);
  if (game.state !== 'play') return;

  // --- player ---
  const fired = updatePlayer(game.player, input, dt, (b) => game.playerBullets.push(b));
  if (fired) audio.shoot();

  // --- bullets ---
  for (let i = game.playerBullets.length - 1; i >= 0; i--) {
    const b = game.playerBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) game.playerBullets.splice(i, 1);
  }
  for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
    const b = game.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (b.x < -20 || b.x > ARENA_W + 20 || b.y < -20 || b.y > ARENA_H + 20) game.enemyBullets.splice(i, 1);
  }

  // --- enemies ---
  for (const e of game.enemies) {
    updateEnemy(e, game.player, dt, game.enemyBullets);
  }

  // --- orbs: spawn, magnet, collect ---
  game.orbTimer -= dt;
  if (game.orbTimer <= 0 && game.orbs.length < 8) {
    game.orbTimer = rand(2.0, 3.0);
    const p = randomPointAway(game.player);
    game.orbs.push({ x: p.x, y: p.y, color: Math.random() > 0.5 ? '#facc15' : '#22d3ee', phase: rand(0, 6) });
  }
  for (let i = game.orbs.length - 1; i >= 0; i--) {
    const orb = game.orbs[i];
    const d = dist(orb.x, orb.y, game.player.x, game.player.y);
    if (d < game.player.magnetRadius && d > 1) {
      const pull = (1 - d / game.player.magnetRadius) * 320;
      orb.x += ((game.player.x - orb.x) / d) * pull * dt;
      orb.y += ((game.player.y - orb.y) / d) * pull * dt;
    }
    if (d < game.player.radius + 12) {
      collectOrb(orb);
      game.orbs.splice(i, 1);
    }
  }

  // --- player bullets vs enemies ---
  for (let i = game.playerBullets.length - 1; i >= 0; i--) {
    const b = game.playerBullets[i];
    let hit = false;
    for (let j = game.enemies.length - 1; j >= 0; j--) {
      const e = game.enemies[j];
      if (dist(b.x, b.y, e.x, e.y) < b.radius + e.radius) {
        hit = true;
        game.playerBullets.splice(i, 1);
        if (damageEnemy(e, b.damage)) killEnemy(e, j);
        else {
          audio.enemyHit();
          game.particles.burst(b.x, b.y, e.color, 4, 120, 2);
        }
        break;
      }
    }
    if (hit) continue;
  }

  // --- enemies vs player ---
  if (!game.player.dead) {
    for (const e of game.enemies) {
      if (dist(e.x, e.y, game.player.x, game.player.y) < e.radius + game.player.radius - 2) {
        hurtPlayer(e.contact);
        if (game.player.dead) break;
      }
    }
  }

  // --- enemy bullets vs player ---
  if (!game.player.dead) {
    for (let i = game.enemyBullets.length - 1; i >= 0; i--) {
      const b = game.enemyBullets[i];
      if (dist(b.x, b.y, game.player.x, game.player.y) < b.radius + game.player.radius - 2) {
        game.enemyBullets.splice(i, 1);
        hurtPlayer(b.damage);
        if (game.player.dead) break;
      }
    }
  }

  // --- wave flow ---
  if (game.state !== 'play') return;
  if (game.spawnList.length > 0) {
    game.spawnTimer -= dt;
    if (game.spawnTimer <= 0) {
      game.spawnTimer = waveInterval(game.wave - 1);
      const type = game.spawnList.shift();
      game.enemies.push(spawnEnemy(type, game.player));
    }
  } else if (game.enemies.length === 0) {
    waveCleared();
  }
}

/** A click (mouse press edge) at canvas coordinates. */
function handleClick(x, y) {
  audio.unlock();
  for (const region of hitRegions(game)) {
    if (x >= region.x && x <= region.x + region.w && y >= region.y && y <= region.y + region.h) {
      if (region.id === 'start') {
        startGame();
        return;
      }
      if (region.id.startsWith('upgrade:')) {
        applyUpgrade(Number.parseInt(region.id.slice(8), 10));
        return;
      }
    }
  }
}

let prevMouseDown = false;

function frame(now) {
  requestAnimationFrame(frame);
  const dt = clamp((now - last) / 1000, 0, MAX_FRAME);
  last = now;

  // Global keys.
  if (input.wasPressed('KeyM')) {
    game.muted = audio.toggleMute();
  }
  if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
    if (game.state === 'play') game.state = 'paused';
    else if (game.state === 'paused') game.state = 'play';
  }
  if (input.wasPressed('Enter')) {
    if (game.state === 'title' || game.state === 'over' || game.state === 'win') startGame();
  }
  if (game.state === 'upgrade') {
    if (input.wasPressed('Digit1')) applyUpgrade(0);
    else if (input.wasPressed('Digit2')) applyUpgrade(1);
    else if (input.wasPressed('Digit3')) applyUpgrade(2);
    // Hover the card under the mouse.
    game.hoverUpgrade = -1;
    for (const region of hitRegions(game)) {
      if (
        input.mouse.x >= region.x &&
        input.mouse.x <= region.x + region.w &&
        input.mouse.y >= region.y &&
        input.mouse.y <= region.y + region.h
      ) {
        game.hoverUpgrade = Number.parseInt(region.id.slice(8), 10);
      }
    }
  }
  // Click edge (mouse press).
  if (input.mouse.down && !prevMouseDown) handleClick(input.mouse.x, input.mouse.y);
  prevMouseDown = input.mouse.down;

  if (!staged) {
    acc += dt;
    let steps = 0;
    while (acc >= STEP && steps < 5) {
      update(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === 5) acc = 0;
  }
  renderer.draw(game, game.time);
  input.endFrame();
}

let last = performance.now();
let acc = 0;

// Stage a screenshot scene instead of running the loop (?shot=start|play|end).
if (shotKind) {
  staged = stageShot(shotKind, game, seed);
  if (staged) {
    game.muted = true;
    renderer.draw(game, 1.2);
    window.__shotReady = true;
  }
}

requestAnimationFrame(frame);

// A small handle for headless testing and debugging: the state, and the
// actions a test drives (start, hurt the ship, restart). Nothing here is
// used by normal play.
window.__neon = {
  game,
  version: 'neon-harvest-1',
  start: () => startGame(),
  state: () => game.state,
  score: () => game.score,
  wave: () => game.wave,
  hurt: (n) => {
    game.player.invuln = 0;
    game.player.shield = false;
    hurtPlayer(n);
  },
  setHull: (n) => {
    game.player.hull = n;
  },
  /** Empty the arena so the wave clears and the upgrade screen appears. */
  clearWave: () => {
    game.enemies.length = 0;
    game.spawnList.length = 0;
  },
  /** Pick upgrade card i (0, 1 or 2) on the upgrade screen. */
  pickUpgrade: (i) => {
    if (game.state === 'upgrade') applyUpgrade(i);
  },
};
