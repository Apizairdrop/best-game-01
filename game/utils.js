// Shared math and random helpers for Neon Harvest. No game state lives here,
// only small pure functions every other module can use.

/** Two pi, for angle math. */
export const TAU = Math.PI * 2;

/** Clamp a number into [min, max]. */
export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation between a and b by t (0..1). */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Distance between two points. */
export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

/** Angle from (ax, ay) to (bx, by), in radians. */
export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** A random float in [min, max). */
export function rand(min = 0, max = 1) {
  return min + Math.random() * (max - min);
}

/** A random integer in [min, max] inclusive. */
export function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

/** Pick one element of an array at random. */
export function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * A small seeded random generator (mulberry32) so screenshot staging and
 * wave layouts can be reproduced exactly from one number.
 */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Format a number with thousands separators (for the score). */
export function fmt(n) {
  return Math.floor(n).toLocaleString('en-US');
}
