// =====================================================================
// hazards.js — lingering, TELEGRAPHED ground zones (spore/poison pools).
//
// A small pool mirroring bullets.js. Each zone first shows a harmless pulsing
// "warn" ring (fair warning — walk out), then turns lethal for a few seconds,
// hurting any player standing in it on a slow tick. Per-zone size/timings/damage
// come from the spawner, so one system serves the mushroom's pools, dying
// puffballs, and any future fire/acid. Reusable; no new deps.
// =====================================================================

import * as THREE from 'three';
import { HAZARD } from '../config.js';
import { circleVsCircle } from '../core/math2d.js';

export class Hazards {
  constructor(scene) {
    this.items = [];
    const geo = new THREE.CircleGeometry(1, 28); // unit disc; scaled per zone
    for (let i = 0; i < HAZARD.poolSize; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: HAZARD.warnColor,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = -Math.PI / 2; // lie flat on the XZ ground
      mesh.renderOrder = -1; // draw under bullets/entities
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({
        mesh,
        mat,
        active: false,
        x: 0,
        z: 0,
        radius: 1,
        warn: 0,
        live: 0,
        tick: 0,
        damage: 1,
      });
    }
    this._next = 0;
  }

  /** drop a zone. warnTime = harmless telegraph; liveTime = dangerous window. */
  spawn(x, z, { radius = 3, warnTime = 0.7, liveTime = 2.5, damage = 1 } = {}) {
    const h = this._grab();
    h.active = true;
    h.x = x;
    h.z = z;
    h.radius = radius;
    h.warn = warnTime;
    h.live = liveTime;
    h.tick = 0;
    h.damage = damage;
    h.mat.color.setHex(HAZARD.warnColor);
    h.mat.opacity = 0.3;
    h.mesh.scale.set(radius, radius, radius);
    h.mesh.position.set(x, 0.05, z);
    h.mesh.visible = true;
  }

  clearAll() {
    for (const h of this.items) {
      h.active = false;
      h.mesh.visible = false;
    }
  }

  update(dt, game) {
    for (const h of this.items) {
      if (!h.active) continue;

      if (h.warn > 0) {
        h.warn -= dt;
        // pulse the telegraph so it clearly reads as "coming, not yet dangerous"
        h.mat.opacity = 0.2 + 0.18 * (0.5 + 0.5 * Math.sin(h.warn * 18));
        if (h.warn <= 0) {
          h.mat.color.setHex(HAZARD.liveColor);
          h.mat.opacity = 0.5;
        }
        continue;
      }

      h.live -= dt;
      h.tick -= dt;
      if (h.tick <= 0) {
        h.tick = HAZARD.tickInterval;
        for (const p of game.players) {
          if (p.alive && circleVsCircle(h.x, h.z, h.radius, p.x, p.z, p.radius)) {
            p.hurt(h.damage, game);
          }
        }
      }
      if (h.live <= 0) {
        h.active = false;
        h.mesh.visible = false;
      }
    }
  }

  _grab() {
    for (let i = 0; i < this.items.length; i++) {
      const idx = (this._next + i) % this.items.length;
      if (!this.items[idx].active) {
        this._next = (idx + 1) % this.items.length;
        return this.items[idx];
      }
    }
    const h = this.items[this._next];
    this._next = (this._next + 1) % this.items.length;
    return h;
  }
}
