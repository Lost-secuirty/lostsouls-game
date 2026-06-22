// =====================================================================
// fairnessCalc.js — PURE kid-fairness math (no imports; research report (5),
// "Fairness and readability for kids"). The guard rail for the difficulty work:
// a boss attack is fair if the player can RECOGNIZE it, CHOOSE a response, and
// MOVE clear in the telegraph window, and if every ring leaves a gap a player
// body can fit through. B5 ("twice as hard") must keep passing these.
//
// Callers pass config values (PLAYER.radius/speed, boss telegraph, ring counts),
// so this stays a pure, unit-testable module like math2d/scaling.
// =====================================================================

/** Seconds for a bullet to cover `distance` at `bulletSpeed` (the reaction budget). */
export function timeToImpactSec(distance, bulletSpeed) {
  return distance / Math.max(0.001, bulletSpeed);
}

/**
 * Chord width of a `gapSlots`-wide angular gap in an `ringCount`-bullet ring, measured at
 * `radius` from the boss. The safe lane a player must fit through; compare to
 * `gapMinMul × player hurt diameter`. Grows with radius (the ring expands as it travels).
 */
export function gapWidthAtRadius(radius, ringCount, gapSlots = 1) {
  const step = (Math.PI * 2) / Math.max(1, ringCount);
  return 2 * radius * Math.sin((step * gapSlots) / 2);
}

/**
 * Minimum FAIR telegraph (ms): time to recognize the attack + choose a response (Hick's law
 * in `choices`) + move `moveDistance` clear at `playerSpeed` + a safety margin. `childMode`
 * uses the slower child reaction model (children are materially slower than adult-shmup
 * instincts assume). Returns a rounded millisecond figure.
 */
export function minimumTelegraphMs(
  moveDistance,
  playerSpeed,
  { childMode = true, choices = 2 } = {},
) {
  const recognize = childMode ? 320 : 180;
  const choose = childMode
    ? 140 + 40 * Math.log2(Math.max(1, choices))
    : 80 + 25 * Math.log2(Math.max(1, choices));
  const move = (moveDistance / Math.max(playerSpeed, 0.001)) * 1000;
  const margin = childMode ? 120 : 70;
  return Math.round(recognize + choose + move + margin);
}
