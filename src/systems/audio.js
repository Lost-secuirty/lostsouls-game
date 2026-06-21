// =====================================================================
// audio.js — thin facade over BOTH sound systems:
//   • sfx.js   — procedural synth: shots/hits/pickups + a fallback music drone.
//   • music.js — recorded background MUSIC tracks via Howler (ADR-0024).
//
// Game code only ever calls `audio.*`, so it never needs to know which system
// makes a given sound. Recorded music takes over when a track file exists for the
// context; otherwise the procedural drone keeps playing (never silent).
// =====================================================================

import * as sfx from './sfx.js';
import * as music from './music.js';
import { stageTrackId, bossTrackId } from '../core/musicMap.js';

export function play(name) {
  sfx.play(name);
}

/** unlock + start audio after the first click/keypress (call from main.js) */
export function unlock() {
  sfx.unlock(); // starts the procedural drone
  music.unlock(); // (re)plays the current recorded track once Howler is unlocked
}

/** raise the procedural-drone intensity per floor (the music fallback path) */
export function setMusicFloor(floorIndex) {
  sfx.setMusicFloor(floorIndex);
}

/** stage (exploration) music for a floor — recorded track if mapped, else the drone */
export function setStageMusic(floorIndex) {
  if (music.crossfadeTo(stageTrackId(floorIndex))) {
    sfx.setSynthMusicMuted(true);
  } else {
    sfx.setSynthMusicMuted(false);
    sfx.setMusicFloor(floorIndex); // drone gets tenser each floor (fallback behavior)
  }
}

/** boss theme — recorded track if mapped, else keep the drone going */
export function setBossMusic(bossKey) {
  if (music.crossfadeTo(bossTrackId(bossKey))) {
    sfx.setSynthMusicMuted(true);
  } else {
    sfx.setSynthMusicMuted(false);
  }
}

/** title/menu theme (only audible after the first gesture unlocks audio) */
export function setMenuMusic() {
  if (music.crossfadeTo('menu')) {
    sfx.setSynthMusicMuted(true);
  } else {
    sfx.setSynthMusicMuted(false);
  }
}

/** dip the music briefly (e.g. when the player takes a hit) */
export function duckMusic() {
  music.duck();
}

export function stingerWin() {
  if (!music.playStinger('win')) sfx.play('win');
}
export function stingerGameOver() {
  if (!music.playStinger('gameover')) sfx.play('gameover');
}

/** master volume (0..1) + mute — drives BOTH systems (settings panel, ADR-0023) */
export function setMasterVolume(v) {
  sfx.setMasterVolume(v);
  music.setVolume(v);
}
export function setMuted(b) {
  sfx.setMuted(b);
  music.setMuted(b);
}

/** kept for call-site compatibility; nothing to pre-register */
export function registerDefaultSounds() {
  // procedural SFX need no loading; recorded tracks load lazily on first use.
}

/** active recorded track id, or null if on the synth fallback (verification drive) */
export function currentMusicTrack() {
  return music.currentTrackId();
}
