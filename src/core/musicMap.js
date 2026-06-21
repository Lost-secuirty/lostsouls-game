// =====================================================================
// musicMap.js — PURE track-id helpers for the recorded-music layer (ADR-0024).
// No Howler import here, so it stays unit-testable and dependency-free; the
// Howler-backed player (systems/music.js) uses these to look up files.
// =====================================================================

/** stage (exploration) track id for a 0-based floor, e.g. floor 2 -> 'stage2' */
export function stageTrackId(floorIndex) {
  const i = Number.isFinite(floorIndex) ? Math.max(0, Math.floor(floorIndex)) : 0;
  return `stage${i}`;
}

/** boss theme track id for a boss key, e.g. 'mushroom' -> 'boss_mushroom' */
export function bossTrackId(bossKey) {
  return `boss_${bossKey}`;
}

/**
 * Filename mapped to a track id in the config map, or null if unmapped/blank.
 * null is the signal to fall back to the procedural synth drone (never silent).
 * @param {Record<string,string|null>} tracks config.MUSIC.tracks
 * @param {string} id track id
 * @returns {string|null}
 */
export function resolveTrackFile(tracks, id) {
  if (!tracks || !id) return null;
  const f = tracks[id];
  return typeof f === 'string' && f.length > 0 ? f : null;
}
