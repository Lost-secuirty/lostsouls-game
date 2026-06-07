// =====================================================================
// particles.js — pooled blood bursts.
//
// A fixed pool of little spheres we reuse forever (no garbage, no stutter).
// burst() throws a spray of them out from a point; update() flies them out,
// drops them with gravity, fades them, and recycles them.
// =====================================================================

import * as THREE from 'three';
import { PARTICLES, PALETTE } from '../config.js';

export class Particles {
  constructor(scene) {
    this.items = [];
    const geo = new THREE.SphereGeometry(PARTICLES.size, 6, 6);
    for (let i = 0; i < PARTICLES.poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: PALETTE.blood });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({ mesh, mat, active: false, vx: 0, vy: 0, vz: 0, life: 0 });
    }
    this._next = 0;
  }

  /** Spray `count` particles from (x,z) at ground-ish height. */
  burst(x, z, count = PARTICLES.perHit, color = PALETTE.blood) {
    for (let i = 0; i < count; i++) {
      const p = this._grab();
      const ang = Math.random() * Math.PI * 2;
      const spd = PARTICLES.speed * (0.4 + Math.random() * 0.8);
      p.vx = Math.cos(ang) * spd;
      p.vz = Math.sin(ang) * spd;
      p.vy = PARTICLES.speed * (0.4 + Math.random() * 0.7);
      p.life = PARTICLES.lifetime * (0.7 + Math.random() * 0.6);
      p.mat.color.setHex(color);
      p.mat.opacity = 1;
      p.mat.transparent = true;
      p.mesh.position.set(x, 1.0, z);
      p.mesh.scale.setScalar(1);
      p.mesh.visible = true;
      p.active = true;
    }
  }

  update(dt) {
    for (const p of this.items) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      p.vy -= PARTICLES.gravity * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      if (p.mesh.position.y < 0.1) {
        p.mesh.position.y = 0.1;
        p.vy *= -0.3; // little bounce / splat
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      const t = Math.max(0, p.life / PARTICLES.lifetime);
      p.mat.opacity = t;
      p.mesh.scale.setScalar(0.5 + t * 0.5);
    }
  }

  _grab() {
    // round-robin: reuse the oldest slot
    for (let i = 0; i < this.items.length; i++) {
      const idx = (this._next + i) % this.items.length;
      if (!this.items[idx].active) {
        this._next = (idx + 1) % this.items.length;
        return this.items[idx];
      }
    }
    const p = this.items[this._next];
    this._next = (this._next + 1) % this.items.length;
    return p;
  }
}
