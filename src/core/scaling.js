// =====================================================================
// scaling.js — pure progression/difficulty CURVES (no imports). The "feel math"
// lives here so it's testable and tunable from one place (config.UPGRADES /
// config.DIFFICULTY). Two curves:
//   1. statBonus  — diminishing-returns player upgrades (no hard cap-in-3).
//   2. floorScale — the per-floor difficulty ramp for the whole run.
// =====================================================================

/**
 * Diminishing-returns upgrade bonus for a stack count (PURE):
 *
 *     bonus(n) = maxBonus * n / (n + half)
 *
 * A saturating curve: big early, tapering, approaching `maxBonus` but never
 * hitting a hard wall — so every pickup still adds *something* across a whole run
 * instead of capping after ~3. `half` is the number of stacks that reaches HALF of
 * `maxBonus` (the "knee" of the curve). n<=0 -> 0.
 *
 * @param {number} stacks   how many of this upgrade you've collected
 * @param {number} maxBonus the eventual ceiling (e.g. 1.0 = up to +100%)
 * @param {number} half     stacks to reach half of maxBonus (higher = slower ramp)
 * @returns {number} the bonus to ADD (damage/speed) or convert (fire rate)
 */
export function statBonus(stacks, maxBonus, half) {
  if (stacks <= 0) return 0;
  return (maxBonus * stacks) / (stacks + half);
}

/**
 * Per-floor difficulty multiplier on a smooth growth curve (PURE):
 *
 *     floorScale(i) = base * (1 + growth)^i
 *
 * One place shapes the whole run's challenge: `base` is floor 0 (the tutorial
 * floor) and `growth` is the per-floor ramp. Used for the "safe" difficulty knobs
 * (boss HP, ring density, enemy counts) — never bullet speed. Replaces hand-set
 * per-floor diffs so the curve is tunable in one spot. Negative indices clamp to 0.
 *
 * @param {number} floorIndex 0-based floor
 * @param {{base?:number, growth?:number}} params
 * @returns {number} the difficulty multiplier for that floor
 */
export function floorScale(floorIndex, { base = 1, growth = 0.25 } = {}) {
  return base * Math.pow(1 + growth, Math.max(0, floorIndex));
}
