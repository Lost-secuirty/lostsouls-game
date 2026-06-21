// =====================================================================
// bosses/emitters.js — pure bullet-PATTERN generators (no THREE, no game state).
//
// Each function returns a plain array of ANGLES (radians). A boss then spawns one
// bullet per angle. Keeping the shapes here (instead of hand-rolled loops in every
// boss) means: (1) no duplication, (2) the patterns are unit-testable, and (3) a
// new boss/attack is a one-liner — pick a generator, pick counts/speeds in config.
//
// ANGLE CONVENTION (matches the rest of the game): an angle `a` maps to the
// direction (Math.sin(a), Math.cos(a)) on the XZ plane, so a = 0 points +z and a
// grows clockwise. Aimed shots therefore use a = atan2(dx, dz). Convert with
// `dirsFromAngles`, or just `Math.sin(a)`/`Math.cos(a)` at the spawn site.
// =====================================================================

const TAU = Math.PI * 2;

/** N angles evenly spaced around a full circle, offset by `phase` (a plain ring). */
export function ring(n, phase = 0) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(phase + (i / n) * TAU);
  return out;
}

/**
 * A ring with a guaranteed dodge GAP: a full ring of `n` minus `gapWidth`
 * consecutive slots starting at index `gapStart` (wraps around). The empty slots
 * are the dodge lane — pick `gapStart` with a seeded RNG so it's reproducible.
 */
export function gapRing(n, gapStart, gapWidth, phase = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    let inGap = false;
    for (let g = 0; g < gapWidth; g++) {
      if ((gapStart + g) % n === i) {
        inGap = true;
        break;
      }
    }
    if (!inGap) out.push(phase + (i / n) * TAU);
  }
  return out;
}

/**
 * A ring where each bullet's angle is nudged by ±`jitter` (radians) — a "scatter"
 * that still leaves gaps to slip through. `rng` is a function returning [0,1)
 * (e.g. game.rng.next); it is called once per bullet, in order, so a seeded rng
 * makes the scatter reproducible/testable.
 */
export function jitterRing(n, jitter, rng, phase = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const wobble = (rng() * 2 - 1) * jitter;
    out.push(phase + (i / n) * TAU + wobble);
  }
  return out;
}

/** `arms` evenly-spaced arm angles (a "+"/"X"/star), offset by `phase`. */
export function star(arms, phase = 0) {
  return ring(arms, phase);
}

/**
 * An aimed CONE: `count` angles fanned evenly across `spreadRad` radians, centered
 * on `baseAngle` (use atan2(dx, dz) to aim at a target). count<=1 -> just the aim.
 * Reads as a directional "spray" you dodge by strafing — distinct from a ring.
 */
export function nWay(baseAngle, count, spreadRad) {
  if (count <= 1) return [baseAngle];
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1); // 0..1
    out.push(baseAngle - spreadRad / 2 + t * spreadRad);
  }
  return out;
}

/**
 * A short ARC of `count` angles each `step` radians apart from `phase` — fire it
 * repeatedly while rotating `phase` fast and it reads as a spiral arm. (Library
 * primitive for future bosses; ready + tested.)
 */
export function arc(count, phase = 0, step = 0.25) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(phase + i * step);
  return out;
}

/** Convert an angle array to unit {x, z} directions (x = sin, z = cos). */
export function dirsFromAngles(angles) {
  return angles.map((a) => ({ x: Math.sin(a), z: Math.cos(a) }));
}
