// =====================================================================
// audio.js — a tiny howler.js wrapper that NEVER breaks the game.
//
// Sounds are optional. If you haven't registered a sound (or its file is
// missing), play() just does nothing — no errors, no crashes.
//
// To add sound: drop files in public/audio/ and register them in
// registerDefaultSounds() below, e.g.:
//     register('shoot', 'audio/shoot.mp3', { volume: 0.4 });
// The game already calls play('shoot'), play('hurt'), play('hit'),
// play('kill'), play('good'), play('bad') — they're silent until registered.
// =====================================================================

import { Howl } from 'howler';

const sounds = new Map();

export function register(name, src, opts = {}) {
  try {
    const howl = new Howl({
      src: Array.isArray(src) ? src : [src],
      volume: opts.volume ?? 0.5,
      ...opts,
    });
    sounds.set(name, howl);
  } catch {
    // ignore — keep the game silent rather than crash
  }
}

export function play(name, opts = {}) {
  const s = sounds.get(name);
  if (!s) return; // not registered -> silent no-op
  try {
    const id = s.play();
    if (opts.rate) s.rate(opts.rate, id);
  } catch {
    /* ignore */
  }
}

/**
 * Register the bundled sounds. Currently empty (the game ships silent so it
 * always runs). Uncomment / add lines here once you have files in public/audio.
 */
export function registerDefaultSounds() {
  // register('shoot', 'audio/shoot.mp3', { volume: 0.25 });
  // register('hurt',  'audio/hurt.mp3',  { volume: 0.6  });
  // register('hit',   'audio/hit.mp3',   { volume: 0.4  });
  // register('kill',  'audio/kill.mp3',  { volume: 0.6  });
  // register('good',  'audio/good.mp3',  { volume: 0.7  });
  // register('bad',   'audio/bad.mp3',   { volume: 0.7  });
}
