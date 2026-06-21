// =====================================================================
// audio.js — thin facade over the procedural synth (systems/sfx.js).
//
// Keeps the simple `audio.play('name')` API every other file already uses, so
// nothing else needs to know how sound is made. All sound is generated in code
// (no files), and is silent until unlocked on the first user gesture.
// =====================================================================

import * as sfx from './sfx.js';

export function play(name) {
  sfx.play(name);
}

/** unlock + start music after the first click/keypress (call from main.js) */
export function unlock() {
  sfx.unlock();
}

/** raise the music intensity per floor */
export function setMusicFloor(floorIndex) {
  sfx.setMusicFloor(floorIndex);
}

/** master volume (0..1) + mute — wired to the settings panel (ADR-0023) */
export function setMasterVolume(v) {
  sfx.setMasterVolume(v);
}
export function setMuted(b) {
  sfx.setMuted(b);
}

/** kept for call-site compatibility; the synth needs no pre-registration */
export function registerDefaultSounds() {
  // procedural — nothing to load.
}
