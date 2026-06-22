// =====================================================================
// juice.js — the "feel good" system: trauma-based screen-shake + hit-stop.
//
// addTrauma(amount) : an impact adds trauma (0..1); shake magnitude = trauma², so
//                     small hits barely shake and big ones punch. Trauma decays
//                     linearly (JUICE.decayPerSec).
// hitStop(secs)     : freeze the whole world for a moment (huge for impact).
//
// The game loop reads getTimeScale() (0 while frozen); the renderer reads
// shakeOffsetXZ(now) to offset the camera. That offset is sampled from COHERENT
// value-noise (math2d.smoothNoise1D) by wall-clock time — NO Math.random — so a
// seeded run renders identical shake (ADR-0013). reducedEffects scales trauma down.
// =====================================================================

import { JUICE } from '../config.js';
import { clamp, smoothNoise1D } from '../core/math2d.js';
import { settings } from './settings.js';

export class Juice {
  constructor() {
    this.trauma = 0; // 0..1; per-frame shake magnitude = trauma²
    this.stopUntil = 0;
  }

  /** An impact adds trauma (clamped to 1). Scaled down (or off) when reducedEffects is on. */
  addTrauma(amount) {
    const mul = settings.get('reducedEffects') ? JUICE.reducedEffectsTraumaMul : 1;
    this.trauma = clamp(this.trauma + amount * mul, 0, 1);
  }

  hitStop(secs) {
    const until = performance.now() + secs * 1000;
    if (until > this.stopUntil) this.stopUntil = until;
  }

  /** 0 while frozen (skip updates), 1 normally. Read by the loop. */
  getTimeScale() {
    return performance.now() < this.stopUntil ? 0 : 1;
  }

  update(dt) {
    // linear trauma decay (research): reaches 0 in ~trauma / decayPerSec seconds
    this.trauma = Math.max(0, this.trauma - JUICE.decayPerSec * dt);
  }

  /**
   * Camera shake offset for THIS frame, sampled from coherent value-noise by wall-clock
   * `timeSec`. PURE of randomness (no Math.random) → a seeded run is byte-identical.
   * Magnitude scales with trauma² (gentle until a real hit). Returns {x, y, z}; Y is a
   * smaller kick so the top-down read stays steady.
   */
  shakeOffsetXZ(timeSec) {
    const s = this.trauma * this.trauma;
    if (s <= 0) return { x: 0, y: 0, z: 0 };
    const t = timeSec * JUICE.shakeFrequency;
    return {
      x: smoothNoise1D(t, 11) * JUICE.shakeMaxOffset * s,
      y: smoothNoise1D(t, 53) * JUICE.shakeMaxY * s,
      z: smoothNoise1D(t, 29) * JUICE.shakeMaxOffset * s,
    };
  }
}
