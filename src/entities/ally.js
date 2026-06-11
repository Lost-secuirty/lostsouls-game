// =====================================================================
// ally.js — Ally. An AI buddy who tags along and shoots nearby monsters.
// (Two-player co-op would replace this with a second Player later.)
// =====================================================================

import { ALLY, PALETTE } from '../config.js';
import { makeCharacter } from './characterMesh.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { normalize, dist } from '../core/math2d.js';

export class Ally {
  constructor(scene) {
    this.mesh = makeCharacter('ally', {
      radius: ALLY.radius,
      height: ALLY.height,
      color: PALETTE.ally,
    });
    scene.add(this.mesh);
    this.radius = ALLY.radius;
    this.fireTimer = 0;
    this.reset(0, 0);
  }

  reset(x, z) {
    this.x = x;
    this.z = z;
    this.fireTimer = 0;
    this.mesh.position.set(x, 0, z);
  }

  update(dt, game) {
    const p = game.player;

    // --- follow: walk toward the player but stop at followDist ---
    const d = dist(this.x, this.z, p.x, p.z);
    if (d > ALLY.followDist) {
      const dir = normalize(p.x - this.x, p.z - this.z);
      this.x += dir.x * ALLY.speed * dt;
      this.z += dir.z * ALLY.speed * dt;
      let q = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
      q = clampToArena(q.x, q.z, this.radius);
      this.x = q.x;
      this.z = q.z;
    }

    // --- shoot the nearest enemy in range ---
    this.fireTimer -= dt;
    const target = this._nearestEnemy(game);
    if (target) {
      const aim = normalize(target.x - this.x, target.z - this.z);
      this.mesh.rotation.y = Math.atan2(aim.x, aim.z);
      if (this.fireTimer <= 0) {
        game.bullets.spawnPlayer(this.x, this.z, aim.x, aim.z, 1);
        this.fireTimer = ALLY.fireCooldown;
      }
    } else {
      // face the way the player faces when idle
      this.mesh.rotation.y = p.mesh.rotation.y;
    }

    this.mesh.position.set(this.x, 0, this.z);
  }

  _nearestEnemy(game) {
    let best = null;
    let bestD = ALLY.range;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const d = dist(this.x, this.z, e.x, e.z);
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }
}
