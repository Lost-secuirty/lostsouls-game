// =====================================================================
// juice.js — the "feel good" system: screen-shake + hit-stop.
//
// shake(mag)    : kick the camera; it decays back to center.
// hitStop(secs) : freeze the whole world for a moment (huge for impact).
//
// The game loop reads getTimeScale() (0 while frozen) and the renderer reads
// shakeMag to offset the camera.
// =====================================================================

import { JUICE } from '../config.js';

export class Juice {
  constructor() {
    this.shakeMag = 0;
    this.stopUntil = 0;
  }

  shake(mag) {
    if (mag > this.shakeMag) this.shakeMag = mag;
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
    // exponential decay toward 0
    this.shakeMag *= Math.exp(-JUICE.shakeDecay * dt);
    if (this.shakeMag < 0.002) this.shakeMag = 0;
  }
}
