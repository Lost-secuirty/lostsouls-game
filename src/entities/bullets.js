// =====================================================================
// bullets.js — one pooled projectile system for BOTH the player and enemies.
//
// A fixed pool of small glowing spheres. spawnPlayer/spawnEnemy launch one;
// update() flies them, kills them on walls or after a lifetime, and checks
// hits (player bullets -> enemies, enemy bullets -> you).
// =====================================================================

import * as THREE from 'three';
import { BULLET, PALETTE } from '../config.js';
import { circleVsCircle } from '../core/math2d.js';
import { hitsAnyWall } from '../systems/collision.js';

export class Bullets {
  constructor(scene) {
    this.items = [];
    const geo = new THREE.SphereGeometry(BULLET.radius, 8, 8);
    this.playerMat = new THREE.MeshBasicMaterial({ color: PALETTE.playerBullet });
    this.enemyMat = new THREE.MeshBasicMaterial({ color: PALETTE.enemyBullet });
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
      });
    }
    this._next = 0;
  }

  spawnPlayer(x, z, dx, dz, damage) {
    this._spawn(x, z, dx, dz, 'player', BULLET.player.speed, damage ?? BULLET.player.damage);
  }

  spawnEnemy(x, z, dx, dz, speed) {
    this._spawn(x, z, dx, dz, 'enemy', speed ?? BULLET.enemy.speed, BULLET.enemy.damage);
  }

  _spawn(x, z, dx, dz, team, speed, damage) {
    const b = this._grab();
    b.active = true;
    b.team = team;
    b.x = x;
    b.z = z;
    b.vx = dx * speed;
    b.vz = dz * speed;
    b.life = BULLET.lifetime;
    b.damage = damage;
    b.mesh.material = team === 'player' ? this.playerMat : this.enemyMat;
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
        this._kill(b);
        continue;
      }

      if (b.team === 'player') {
        for (const e of game.enemies) {
          if (e.dead) continue;
          if (circleVsCircle(b.x, b.z, BULLET.radius, e.x, e.z, e.radius)) {
            e.hurt(b.damage, game);
            this._kill(b);
            break;
          }
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

  _kill(b) {
    b.active = false;
    b.mesh.visible = false;
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
