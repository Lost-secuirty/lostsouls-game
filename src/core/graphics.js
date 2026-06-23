// =====================================================================
// graphics.js — pure helpers for the graphics / perf-tuning knobs (FPS-1).
//
// No THREE import on purpose, so this stays unit-testable (AGENTS.md: keep pure
// logic separate from render code). scene.js uses these for the renderer setup
// and the live A/B setters; the debug menu uses the option arrays for its dropdowns.
// =====================================================================

/**
 * The effective device pixel ratio to render at: the panel's own ratio, clamped
 * to `cap`, with safe fallbacks for missing/garbage inputs (headless, odd panels).
 * @param {number} deviceRatio typically window.devicePixelRatio
 * @param {number} cap GRAPHICS.pixelRatioCap
 * @returns {number} a finite ratio >= the smaller of the two sane values
 */
export function effectivePixelRatio(deviceRatio, cap) {
  const dr = Number.isFinite(deviceRatio) && deviceRatio > 0 ? deviceRatio : 1;
  const c = Number.isFinite(cap) && cap > 0 ? cap : dr;
  return Math.min(dr, c);
}
