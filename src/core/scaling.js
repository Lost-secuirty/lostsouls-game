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
 * @param {number} half     stacks to reach half of maxBonus; MUST be > 0 (higher =
 *                          slower ramp). half <= 0 degrades to the asymptote rather
 *                          than producing Infinity / a negative (debuff) bonus.
 * @returns {number} the bonus to ADD (damage/speed) or convert (fire rate)
 */
export function statBonus(stacks, maxBonus, half) {
  if (stacks <= 0 || half <= 0) return stacks > 0 ? maxBonus : 0;
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
 * @param {{base:number, growth:number}} params REQUIRED — pass `config.DIFFICULTY`
 *        (kept pure/import-free, so the only source of these knobs is the caller's
 *        config; no in-module defaults to silently drift from it).
 * @returns {number} the difficulty multiplier for that floor
 */
export function floorScale(floorIndex, { base, growth }) {
  return base * Math.pow(1 + growth, Math.max(0, floorIndex));
}

/**
 * Distribute the "twice as hard" master knob across one difficulty FACET (PURE):
 *
 *     facet(mul, weight) = 1 + (mul - 1) * weight
 *
 * `hardnessMul` is the single dial (1 = the original game, 2 = "twice as hard"). Applying it
 * 1:1 to EVERY facet would compound (2× HP × 2× count × 2× damage ≈ brutal), so each facet
 * takes a `weight` (0..1) share of it: weight 1 = full doubling, 0 = untouched. This keeps the
 * harder game FAIR — e.g. ring density + contact damage stay at weight 0 so bullet gaps
 * (tests/fairness.test.js) and one-hit risk don't change. `mul<1` clamps to 1 (no easier-mode here).
 *
 * @param {number} hardnessMul config.DIFFICULTY.hardnessMul
 * @param {number} weight 0..1 share of the hardness this facet absorbs
 * @returns {number} the per-facet multiplier (>= 1)
 */
export function hardnessFacet(hardnessMul, weight) {
  const w = Math.min(1, Math.max(0, weight)); // clamp to the documented 0..1 share
  return 1 + (Math.max(1, hardnessMul) - 1) * w;
}
