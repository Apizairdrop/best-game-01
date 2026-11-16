// Waves and upgrades for Neon Harvest. Ten waves, each a list of enemy
// types to spawn; later waves mix more types and spawn faster. Between waves
// the player picks one of three upgrades drawn from the pool.

// How many of each type each wave spawns (chaser, shooter, spinner, splitter).
export const WAVES = [
  { chaser: 5, shooter: 0, spinner: 0, splitter: 0, interval: 1.1 },
  { chaser: 8, shooter: 1, spinner: 0, splitter: 0, interval: 1.0 },
  { chaser: 8, shooter: 2, spinner: 3, splitter: 0, interval: 0.95 },
  { chaser: 10, shooter: 3, spinner: 4, splitter: 1, interval: 0.9 },
  { chaser: 12, shooter: 4, spinner: 5, splitter: 1, interval: 0.85 },
  { chaser: 14, shooter: 5, spinner: 6, splitter: 2, interval: 0.8 },
  { chaser: 16, shooter: 6, spinner: 8, splitter: 2, interval: 0.75 },
  { chaser: 18, shooter: 7, spinner: 9, splitter: 3, interval: 0.7 },
  { chaser: 20, shooter: 8, spinner: 10, splitter: 3, interval: 0.65 },
  { chaser: 24, shooter: 10, spinner: 12, splitter: 4, interval: 0.6 },
];

/** Total waves: clearing wave 10 wins the game. */
export const TOTAL_WAVES = WAVES.length;

/** Expand a wave into a shuffled spawn list of enemy types. */
export function buildSpawnList(waveIndex) {
  const def = WAVES[waveIndex];
  const list = [];
  for (const [type, count] of Object.entries(def)) {
    if (type === 'interval') continue;
    for (let i = 0; i < count; i++) list.push(type);
  }
  // Shuffle so the wave never arrives in neat blocks.
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

/** The spawn gap (seconds) for a wave. */
export function waveInterval(waveIndex) {
  return WAVES[waveIndex].interval;
}

// ---------------------------------------------------------------- upgrades

/**
 * The upgrade pool. Each entry has an id, a short name, a one-line
 * description, a colour, and an apply(player) that changes the ship.
 * `can` gates an upgrade (e.g. no extra life past the cap).
 */
export const UPGRADES = [
  {
    id: 'rapid',
    name: 'Rapid Fire',
    desc: 'Fire 25% faster',
    color: '#22d3ee',
    can: (p) => p.fireRate > 0.06,
    apply: (p) => {
      p.fireRate = Math.max(0.06, p.fireRate * 0.75);
    },
  },
  {
    id: 'heavy',
    name: 'Heavy Rounds',
    desc: '+1 bullet damage',
    color: '#fb923c',
    can: () => true,
    apply: (p) => {
      p.damage += 1;
    },
  },
  {
    id: 'plating',
    name: 'Hull Plating',
    desc: '+25 max hull, repair 25',
    color: '#4ade80',
    can: () => true,
    apply: (p) => {
      p.maxHull += 25;
      p.hull = Math.min(p.maxHull, p.hull + 25);
    },
  },
  {
    id: 'magnet',
    name: 'Orb Magnet',
    desc: 'Orbs drift to you from farther',
    color: '#facc15',
    can: (p) => p.magnetRadius < 320,
    apply: (p) => {
      p.magnetRadius += 80;
    },
  },
  {
    id: 'thrusters',
    name: 'Swift Thrusters',
    desc: '+15% move speed',
    color: '#38bdf8',
    can: (p) => p.speed < 420,
    apply: (p) => {
      p.speed *= 1.15;
    },
  },
  {
    id: 'life',
    name: 'Extra Life',
    desc: '+1 life (max 5)',
    color: '#f472b6',
    can: (p) => p.lives < 5,
    apply: (p) => {
      p.lives += 1;
    },
  },
  {
    id: 'shield',
    name: 'Aegis Shield',
    desc: 'Blocks the next hit, every wave',
    color: '#a78bfa',
    can: (p) => !p.shield,
    apply: (p) => {
      p.shield = true;
    },
  },
  {
    id: 'split',
    name: 'Split Shot',
    desc: '+1 projectile (max 3)',
    color: '#f87171',
    can: (p) => p.projectiles < 3,
    apply: (p) => {
      p.projectiles += 1;
    },
  },
];

/** Draw three distinct upgrades the player can still take. */
export function drawUpgrades(player) {
  const pool = UPGRADES.filter((u) => u.can(player));
  const chosen = [];
  while (chosen.length < 3 && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(i, 1)[0]);
  }
  return chosen;
}
