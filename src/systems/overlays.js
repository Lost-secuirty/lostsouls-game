// =====================================================================
// overlays.js — flat ground RINGS drawn over the action for readability (ADR-0023):
//   1. boss TELEGRAPH ring — always on; a pulsing warn ring under a boss while it
//      winds up an attack (the leak-safe "ground-ring telegraph"), so the incoming
//      ring/spray reads clearly = fair warning.
//   2. HITBOX overlay — opt-in (settings.showHitboxes); a ring at each player's and
//      enemy's exact collision circle, so you can learn what actually hits you.
//
// Pooled like hazards.js/bullets.js: a fixed set of meshes made ONCE and reused
// every frame, so nothing is ever added/removed during play (no teardown leak).
// Purely visual — it reads positions in render(), consumes no rng, owns no state.
// =====================================================================

import * as THREE from 'three';
import { HAZARD, OVERLAY } from '../config.js';
import { settings } from './settings.js';

export class Overlays {
  constructor(scene) {
    this.items = [];
    const r = OVERLAY.ring;
    const geo = new THREE.RingGeometry(r.inner, r.outer, r.segments); // unit ring, scaled per entity
    for (let i = 0; i < OVERLAY.poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2; // lie flat on the XZ ground
      mesh.renderOrder = 2; // over the ground/hazards
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({ mesh, mat });
    }
    this._n = 0;
    this._t = 0;
  }

  _ring(x, z, radius, colorHex, opacity, y = OVERLAY.hitboxY) {
    const it = this.items[this._n];
    if (!it) return; // pool exhausted (very crowded) — skip the extra ring gracefully
    this._n++;
    it.mat.color.setHex(colorHex);
    it.mat.opacity = opacity;
    it.mesh.scale.set(radius, radius, radius);
    it.mesh.position.set(x, y, z);
    it.mesh.visible = true;
  }

  /** Position the overlay rings for this frame. Call from render() (no dt needed). */
  sync(game) {
    this._n = 0;
    // sync() runs from render() (per display frame, NOT the fixed 1/60 step), so drive
    // the telegraph pulse from wall-clock time — otherwise it flickers ~2× faster on a
    // 120/144 Hz monitor. Only the phase matters for Math.sin. (ADR-0023 / loop.js)
    this._t = (globalThis.performance?.now?.() ?? 0) / 1000;

    this._telegraphRings(game); // 1) always-on boss wind-up warning
    if (settings.get('showHitboxes')) this._hitboxRings(game); // 2) opt-in readability aid

    // hide the unused tail of the pool
    for (let i = this._n; i < this.items.length; i++) this.items[i].mesh.visible = false;
  }

  /** boss telegraph rings — ALWAYS on (fair warning), pulse like the hazard warn ring */
  _telegraphRings(game) {
    const tg = OVERLAY.telegraph;
    for (const b of game.bosses) {
      if (b.dead || b.charge <= 0) continue;
      const pulse = tg.pulseBase + tg.pulseAmp * (0.5 + 0.5 * Math.sin(this._t * tg.pulseSpeed));
      this._ring(b.x, b.z, b.radius * tg.radiusMul, HAZARD.warnColor, pulse, tg.y);
    }
  }

  /** opt-in hitbox overlay — ring each player's (green) and enemy's/boss's (red) circle */
  _hitboxRings(game) {
    const c = OVERLAY.colors;
    const op = OVERLAY.hitboxOpacity;
    for (const p of game.players) {
      if (p.alive) this._ring(p.x, p.z, p.radius, c.player, op.player);
    }
    for (const e of game.enemies) {
      if (!e.dead) this._ring(e.x, e.z, e.radius, e.isBoss ? c.boss : c.enemy, op.enemy);
    }
  }
}
