// =====================================================================
// sfx.js — tiny procedural sound synth (pure Web Audio, no files, no deps).
//
// Everything is generated in code, so the game makes noise with ZERO
// downloaded assets and never fails over a missing file. Browsers block audio
// until the first user gesture, so call unlock() on first click/keypress.
// =====================================================================

let ctx = null;
let master = null;
let musicOn = false;

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  return ctx;
}

/** Resume audio after the first user gesture, and kick off the music. */
export function unlock() {
  ensure();
  if (ctx && ctx.state === 'suspended') ctx.resume();
  startMusic();
}

const ready = () => ctx && ctx.state === 'running';

/** a single oscillator note with an attack/decay envelope (+ optional pitch slide) */
function tone({ freq = 220, type = 'square', dur = 0.12, vol = 0.25, slideTo = 0, delay = 0 }) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

/** a burst of filtered noise — great for hits/explosions */
function noise({ dur = 0.2, vol = 0.25, freq = 1000, q = 1 }) {
  if (!ready()) return;
  const t0 = ctx.currentTime;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = freq;
  filt.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filt).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur);
}

// named sound effects (the game calls these by name)
const SOUNDS = {
  shoot: () => tone({ freq: 620, slideTo: 180, type: 'square', dur: 0.08, vol: 0.12 }),
  shotgun: () => {
    noise({ dur: 0.18, vol: 0.25, freq: 1600 });
    tone({ freq: 200, slideTo: 70, type: 'sawtooth', dur: 0.18, vol: 0.18 });
  },
  hurt: () => tone({ freq: 300, slideTo: 80, type: 'sawtooth', dur: 0.25, vol: 0.3 }),
  hit: () => tone({ freq: 820, slideTo: 380, type: 'square', dur: 0.05, vol: 0.1 }),
  kill: () => {
    noise({ dur: 0.22, vol: 0.28, freq: 900 });
    tone({ freq: 160, slideTo: 40, type: 'square', dur: 0.18, vol: 0.16 });
  },
  pickup: () => {
    tone({ freq: 520, type: 'square', dur: 0.07, vol: 0.18 });
    tone({ freq: 880, type: 'square', dur: 0.1, vol: 0.18, delay: 0.07 });
  },
  weapon: () => {
    tone({ freq: 300, slideTo: 900, type: 'square', dur: 0.16, vol: 0.2 });
    tone({ freq: 600, type: 'square', dur: 0.12, vol: 0.18, delay: 0.14 });
  },
  good: () => [523, 659, 784].forEach((f, i) => tone({ freq: f, dur: 0.12, vol: 0.2, delay: i * 0.09 })),
  bad: () => [400, 300, 200].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.14, vol: 0.22, delay: i * 0.09 })),
  bossHit: () => {
    tone({ freq: 220, slideTo: 120, type: 'square', dur: 0.08, vol: 0.18 });
    noise({ dur: 0.06, vol: 0.12, freq: 600 });
  },
  bossDie: () => {
    noise({ dur: 0.7, vol: 0.35, freq: 700 });
    tone({ freq: 200, slideTo: 30, type: 'sawtooth', dur: 0.7, vol: 0.3 });
  },
  lifeLost: () => tone({ freq: 330, slideTo: 60, type: 'triangle', dur: 0.4, vol: 0.3 }),
  gameover: () => [300, 240, 180, 120].forEach((f, i) => tone({ freq: f, type: 'sawtooth', dur: 0.3, vol: 0.28, delay: i * 0.18 })),
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, dur: 0.18, vol: 0.25, delay: i * 0.12 })),
};

export function play(name) {
  const s = SOUNDS[name];
  if (s && ready()) s();
}

/** a low, creepy ambient drone loop (built once on the shared context) */
export function startMusic() {
  if (musicOn || !ready()) return;
  musicOn = true;
  const g = ctx.createGain();
  g.gain.value = 0.06;
  g.connect(master);

  // two detuned low voices
  for (const f of [55, 82.5]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(g);
    o.start();
  }
  // a slow LFO swelling the volume for an uneasy feel
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.value = 0.12;
  lfoGain.gain.value = 0.04;
  lfo.connect(lfoGain).connect(g.gain);
  lfo.start();
}
