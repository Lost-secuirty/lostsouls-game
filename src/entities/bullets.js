// =====================================================================
// bullets.js — one pooled projectile system for BOTH the player and enemies.
//
// A fixed pool of small glowing spheres. spawnPlayer/spawnEnemy launch one;
// update() flies them, kills them on walls or after a lifetime, and checks
// hits (player bullets -> enemies, enemy bullets -> you). Rockets explode
// for area damage.
// =====================================================================

import * as THREE from 'three';
import { BULLET, PALETTE } from '../config.js';
import { circleVsCircle } from '../core/math2d.js';
import { hitsAnyWall } from '../systems/collision.js';
import * as audio from '../systems/audio.js';

export class Bullets {
  constructor(scene) {
    this.items = [];
    const geo = new THREE.SphereGeometry(BULLET.radius, 8, 8);
    this.playerMat = new THREE.MeshBasicMaterial({ color: PALETTE.playerBullet });
    this.enemyMat = new THREE.MeshBasicMaterial({ color: PALETTE.enemyBullet });
    this.rocketMat = new THREE.MeshBasicMaterial({ color: 0xff7722 });
    for (let i = 0; i < BULLET.poolSize; i++) {
      const mesh = new THREE.Mesh(geo, this.playerMat);
      mesh.visible = false;
      scene.add(mesh);
      this.items.push({
        mesh,
        active: false,
        x: 0,
        z: 0,
        vx: 0,
        vz: 0,
        life: 0,
        team: 'player',
        damage: 1,
        explosive: false,
        explodeRadius: 0,
      });
    }
    this._next = 0;
  }

  // opts: { damage, speed, explosive, explodeRadius }  (or a bare number = damage)
  spawnPlayer(x, z, dx, dz, opts = {}) {
    const o = typeof opts === 'number' ? { damage: opts } : opts;
    this._spawn(x, z, dx, dz, 'player', {
      speed: o.speed ?? BULLET.player.speed,
      damage: o.damage ?? BULLET.player.damage,
      explosive: !!o.explosive,
      explodeRadius: o.explodeRadius ?? 0,
    });
  }

  spawnEnemy(x, z, dx, dz, speed) {
    this._spawn(x, z, dx, dz, 'enemy', {
      speed: speed ?? BULLET.enemy.speed,
      damage: BULLET.enemy.damage,
      explosive: false,
      explodeRadius: 0,
    });
  }

  _spawn(x, z, dx, dz, team, o) {
    const b = this._grab();
    b.active = true;
    b.team = team;
    b.x = x;
    b.z = z;
    b.vx = dx * o.speed;
    b.vz = dz * o.speed;
    b.life = BULLET.lifetime;
    b.damage = o.damage;
    b.explosive = o.explosive;
    b.explodeRadius = o.explodeRadius;
    b.mesh.material = b.explosive
      ? this.rocketMat
      : team === 'player'
        ? this.playerMat
        : this.enemyMat;
    b.mesh.scale.setScalar(b.explosive ? 1.9 : 1);
    b.mesh.position.set(x, 1.0, z);
    b.mesh.visible = true;
  }

  clearEnemyBullets() {
    for (const b of this.items) {
      if (b.active && b.team === 'enemy') {
        b.active = false;
        b.mesh.visible = false;
      }
    }
  }

  clearAll() {
    for (const b of this.items) {
      b.active = false;
      b.mesh.visible = false;
    }
  }

  update(dt, game) {
    for (const b of this.items) {
      if (!b.active) continue;

      b.x += b.vx * dt;
      b.z += b.vz * dt;
      b.life -= dt;

      if (b.life <= 0 || hitsAnyWall(b.x, b.z, BULLET.radius, game.walls)) {
        if (b.explosive) this._explode(b, game);
        this._kill(b);
        continue;
      }

      if (b.team === 'player') {
        let hit = null;
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (circleVsCircle(b.x, b.z, BULLET.radius, e.x, e.z, e.radius)) {
            hit = e;
            break;
          }
        }
        if (hit) {
          if (b.explosive) this._explode(b, game);
          else hit.hurt(b.damage, game);
          this._kill(b);
          continue;
        }
      } else {
        const p = game.player;
        if (p.alive && circleVsCircle(b.x, b.z, BULLET.radius, p.x, p.z, p.radius)) {
          p.hurt(b.damage, game);
          this._kill(b);
          continue;
        }
      }

      b.mesh.position.set(b.x, 1.0, b.z);
    }
  }

  /** rocket area-of-effect: damage every enemy within the blast radius */
  _explode(b, game) {
    for (const e of game.enemies) {
      if (e.dead) continue;
      if (circleVsCircle(b.x, b.z, b.explodeRadius, e.x, e.z, e.radius)) {
        e.hurt(b.damage, game);
      }
    }
    game.particles.burst(b.x, b.z, 26, 0xff7722);
    game.juice.shake(0.4);
    audio.play('explosion');
  }

  _kill(b) {
    b.active = false;
    b.mesh.visible = false;
    b.mesh.scale.setScalar(1);
  }

  _grab() {
    for (let i = 0; i < this.items.length; i++) {
      const idx = (this._next + i) % this.items.length;
      if (!this.items[idx].active) {
        this._next = (idx + 1) % this.items.length;
        return this.items[idx];
      }
    }
    const b = this.items[this._next];
    this._next = (this._next + 1) % this.items.length;
    return b;
  }
}
