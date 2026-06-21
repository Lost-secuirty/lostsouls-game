// =====================================================================
// music.js — recorded background MUSIC layer (Howler.js — ADR-0024).
//
// Distinct looping track per stage, a crossfade to each boss theme, a menu theme,
// and win/gameover stingers. Separate from the procedural SFX synth (sfx.js), which
// stays. The audio facade (systems/audio.js) drives this from game state.
//
// CONTRACT: recorded music and the synth drone are mutually exclusive. When a
// context has a usable track, it plays and the synth is muted; when it has none
// (unmapped, missing, undecodable, or no audio support) the recorded layer is
// stopped and the caller un-mutes the synth — the game is NEVER silent and never
// stacks both. Tracks are plug-and-play (config.MUSIC.tracks id->file) and STREAM
// (html5) + load lazily, so big files don't bloat memory or stall boot.
// =====================================================================

import { Howl, Howler } from 'howler';
import { MUSIC } from '../config.js';
import { resolveTrackFile } from '../core/musicMap.js';

const howls = new Map(); // id -> Howl (created lazily, only for usable files)
const failed = new Set(); // ids whose file failed to load -> treat as unmapped
let currentId = null;
let currentHowl = null;
let duckTimer = null;
let duckedHowl = null;
let onSilentCb = null; // audio.js registers this to un-mute the synth when music drops out

/** register a callback fired when the recorded layer goes inactive (synth takes over) */
export function onSilent(fn) {
  onSilentCb = fn;
}

/** full URL for a track id, or null if no file is mapped (-> synth fallback) */
function urlFor(id) {
  const file = resolveTrackFile(MUSIC.tracks, id);
  if (!file) return null;
  const base = import.meta.env?.BASE_URL || './'; // Vite base ('./'); honors the build base
  return `${base}${MUSIC.basePath}${file}`;
}

const isStinger = (id) => id === 'win' || id === 'gameover';

/** a mapped track failed to load/decode -> drop it so the synth takes over (never silent) */
function failTrack(id) {
  failed.add(id);
  const h = howls.get(id);
  if (h) {
    try {
      h.stop();
    } catch {
      /* ignore */
    }
    howls.delete(id);
  }
  if (currentId === id) {
    currentId = null;
    currentHowl = null;
    if (onSilentCb) onSilentCb();
  }
}

function getHowl(id) {
  if (howls.has(id)) return howls.get(id);
  if (failed.has(id)) return null; // already known-bad -> synth fallback
  const url = urlFor(id);
  if (!url || !MUSIC.enabled || Howler.noAudio) return null; // unmapped / disabled / no audio
  let h;
  try {
    h = new Howl({ src: [url], html5: true, loop: !isStinger(id), volume: 0, preload: true });
  } catch {
    failed.add(id);
    return null;
  }
  // a 404 / undecodable file fails ASYNC via loaderror -> fail over to the synth.
  h.on('loaderror', () => failTrack(id));
  // a blocked play (autoplay lock) is recoverable -> retry on the next unlock, don't fail.
  h.on('playerror', () =>
    h.once('unlock', () => {
      if (currentHowl === h) h.play();
    }),
  );
  howls.set(id, h);
  return h;
}

/** fade out + stop the active recorded track and clear the "current" state */
function stopCurrent(ms = MUSIC.crossfadeMs) {
  clearTimeout(duckTimer);
  duckedHowl = null;
  if (currentHowl) {
    const old = currentHowl;
    old.fade(old.volume(), 0, ms);
    old.once('fade', () => {
      if (old !== currentHowl) {
        try {
          old.stop();
        } catch {
          /* ignore */
        }
      }
    });
  }
  currentHowl = null;
  currentId = null;
}

/**
 * Crossfade the looping background music to `id`. Returns true if a recorded track is
 * now the active layer, false if there's no usable file for `id` — in which case any
 * current recorded track is STOPPED so the caller's synth fallback is the sole layer.
 */
export function crossfadeTo(id, ms = MUSIC.crossfadeMs) {
  if (id === currentId && currentHowl) return true; // already on it
  const next = getHowl(id);
  if (!next) {
    stopCurrent(ms); // no usable track -> hand off to the synth, don't stack
    return false;
  }
  clearTimeout(duckTimer);
  duckedHowl = null;
  const target = MUSIC.level ?? 0.7;

  if (currentHowl && currentHowl !== next) {
    const old = currentHowl;
    old.fade(old.volume(), 0, ms);
    old.once('fade', () => {
      if (old !== currentHowl) {
        try {
          old.stop();
        } catch {
          /* ignore */
        }
      }
    });
  }
  if (!next.playing()) next.play();
  next.fade(next.volume(), target, ms); // from current volume (no click on a reused howl)
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
  const h = currentHowl; // capture: only this howl gets restored, and only if still current
  duckedHowl = h;
  h.fade(h.volume(), base * toFrac, ms);
  clearTimeout(duckTimer);
  duckTimer = setTimeout(() => {
    if (currentHowl === h && duckedHowl === h) h.fade(h.volume(), base, ms * 5);
    duckedHowl = null;
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
