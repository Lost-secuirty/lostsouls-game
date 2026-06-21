// =====================================================================
// music.js — recorded background MUSIC layer (Howler.js — ADR-0024).
//
// Distinct looping track per stage, a crossfade to each boss theme, a menu theme,
// and win/gameover stingers. Separate from the procedural SFX synth (sfx.js), which
// stays. The audio facade (systems/audio.js) drives this from game state.
//
// PLUG-AND-PLAY: tracks are config.MUSIC.tracks (id -> filename). A null/missing file
// means "no recorded track" -> the caller keeps the synth drone (never silent). Large
// files STREAM (html5:true) and load lazily, so they don't bloat memory or stall boot.
// =====================================================================

import { Howl, Howler } from 'howler';
import { MUSIC } from '../config.js';
import { resolveTrackFile } from '../core/musicMap.js';

const howls = new Map(); // id -> Howl (created lazily, only for mapped files)
let currentId = null;
let currentHowl = null;
let duckTimer = null;

/** full URL for a track id, or null if no file is mapped (-> synth fallback) */
function urlFor(id) {
  const file = resolveTrackFile(MUSIC.tracks, id);
  if (!file) return null;
  const base =
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
  return `${base}${MUSIC.basePath}${file}`;
}

const isStinger = (id) => id === 'win' || id === 'gameover';

function getHowl(id) {
  if (howls.has(id)) return howls.get(id);
  const url = urlFor(id);
  if (!url || !MUSIC.enabled) return null;
  let h;
  try {
    h = new Howl({
      src: [url],
      html5: true, // stream large tracks (don't load whole file into memory / block boot)
      loop: !isStinger(id),
      volume: 0,
      preload: true,
    });
  } catch {
    return null; // no audio support (headless) -> caller falls back to the synth
  }
  howls.set(id, h);
  return h;
}

/**
 * Crossfade the looping background music to `id`. Returns true if a recorded track
 * is now playing, false if there's no file for `id` (caller keeps the synth drone).
 */
export function crossfadeTo(id, ms = MUSIC.crossfadeMs) {
  if (id === currentId && currentHowl) return true; // already on it
  const next = getHowl(id);
  if (!next) return false;
  const target = MUSIC.level ?? 0.7;

  if (currentHowl && currentHowl !== next) {
    const old = currentHowl;
    old.fade(old.volume(), 0, ms);
    old.once('fade', () => {
      if (old !== currentHowl) old.stop();
    });
  }
  if (!next.playing()) next.play();
  next.volume(0);
  next.fade(0, target, ms);
  currentHowl = next;
  currentId = id;
  return true;
}

/** play a one-shot stinger (win/gameover) over the top. Returns false if no file. */
export function playStinger(id) {
  const h = getHowl(id);
  if (!h) return false;
  h.volume(MUSIC.level ?? 0.7);
  h.play();
  return true;
}

/** briefly dip the music (e.g. when the player is hit), then ramp it back. */
export function duck(toFrac = MUSIC.duckTo, ms = MUSIC.duckMs) {
  if (!currentHowl) return;
  const base = MUSIC.level ?? 0.7;
  currentHowl.fade(currentHowl.volume(), base * toFrac, ms);
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    if (currentHowl) currentHowl.fade(currentHowl.volume(), base, ms * 5);
  }, ms + 50);
}

/** re-issue the current track after the first user gesture (Howler unlocks then). */
export function unlock() {
  if (currentHowl && !currentHowl.playing()) currentHowl.play();
}

// --- master volume / mute bridge (settings panel, ADR-0023) ---
export function setVolume(v) {
  const n = Number(v);
  Howler.volume(Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 1);
}
export function setMuted(b) {
  Howler.mute(!!b);
}

/** the active track id (for the verification drive); null if on the synth fallback. */
export function currentTrackId() {
  return currentId;
}
