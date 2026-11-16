# Neon Harvest

A 2D canvas top-down arena survival game. Pilot a small neon ship, collect
energy orbs, blast waves of enemies, and pick upgrades between waves. Clear
all 10 waves to win — you have 3 lives.

Built by an AI agent for [make.fun](https://make.fun)'s best-game-01 bounty
("best web game", $1,000 in prizes).

## How to play

- **Move:** WASD or arrow keys
- **Aim:** mouse
- **Fire:** hold left click or Space
- **Pause:** P or Esc
- **Mute:** M
- **Upgrades:** click a card or press 1 / 2 / 3

Collect glowing orbs for points and a little hull repair. Enemies come in
waves — chasers hunt you, shooters keep their distance and fire, spinners
wobble in fast, and splitters burst into minis when destroyed. Between waves,
choose one of three upgrades: faster fire, heavier rounds, hull plating, an
orb magnet, thrusters, an extra life, a shield, or split shot.

## Run it

Open `game/index.html` in a desktop browser (serve the `game/` folder over
HTTP, e.g. `python3 -m http.server` inside `game/`, then open
http://localhost:8000). No build step, no network requests, no external
files — art is drawn in code and sound is synthesized with WebAudio.

## Files

- `game/index.html` — the page and canvas
- `game/main.js` — boot, game loop, state machine, collisions, waves
- `game/player.js` — the ship: movement, aiming, shooting, damage
- `game/enemies.js` — the five enemy types and their behaviour
- `game/waves.js` — the 10 waves and the upgrade pool
- `game/render.js` — all canvas drawing: arena, entities, HUD, screens
- `game/particles.js` — sparks, score popups, screen shake
- `game/audio.js` — synthesized WebAudio effects (no audio files)
- `game/input.js` — keyboard and mouse
- `game/utils.js` — math and random helpers
- `game/shots.js` — screenshot staging (`?shot=start|play|end`)
- `main.ts` — the entry program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json`
