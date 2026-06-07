// =====================================================================
// player.js — that's you. Move with WASD, aim + shoot with the mouse, lose
// hearts when monsters hit you, and pick up buffs from survivors.
// =====================================================================

import * as THREE from 'three';
import { PLAYER, BULLET, PALETTE } from '../config.js';
import { makeCharacter } from './characterMesh.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import * as audio from '../systems/audio.js';
import { hud } from '../ui/hud.js';

export class Player {
  constructor(scene) {
    this.mesh = makeCharacter('player', {
      radius: PLAYER.radius,
      height: PLAYER.height,
      color: PALETTE.player,
    });
    scene.add(this.mesh);
    this.radius = PLAYER.radius;
    this._baseColor = new THREE.Color(PALETTE.player);
    this.reset(0, 0);
  }

  reset(x, z) {
    this.x = x;
    this.z = z;
    this.hearts = PLAYER.maxHearts;
    this.alive = true;
    this.fireTimer = 0;
    this.invuln = 0;
    this.fireCooldown = PLAYER.fireCooldown; // buffs can lower this
    this.damage = BULLET.player.damage; // buffs can raise this
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
  }

  update(dt, game) {
    if (!this.alive) return;
    const { input, camera } = game;

    // --- move ---
    const m = input.move();
    this.x += m.x * PLAYER.speed * dt;
    this.z += m.z * PLAYER.speed * dt;
    let p = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
    p = clampToArena(p.x, p.z, this.radius);
    this.x = p.x;
    this.z = p.z;

    // --- aim + shoot ---
    const aim = input.aim(camera, this.x, this.z);
    this.mesh.rotation.y = Math.atan2(aim.x, aim.z);

    this.fireTimer -= dt;
    if (input.shoot && this.fireTimer <= 0 && (aim.x !== 0 || aim.z !== 0)) {
      game.bullets.spawnPlayer(this.x, this.z, aim.x, aim.z, this.damage);
      this.fireTimer = this.fireCooldown;
      game.juice.shake(game.JUICE.shakeOnShoot);
      audio.play('shoot');
    }

    // --- i-frames + hit flash ---
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.mesh.visible = Math.floor(this.invuln * 20) % 2 === 0; // blink
    } else {
      this.mesh.visible = true;
    }

    this.mesh.position.set(this.x, 0, this.z);
  }

  hurt(dmg, game) {
    if (this.invuln > 0 || !this.alive) return;
    this.hearts -= dmg;
    this.invuln = PLAYER.invuln;
    game.juice.shake(game.JUICE.shakeOnHurt);
    game.juice.hitStop(game.JUICE.hitStopOnHurt);
    game.particles.burst(this.x, this.z, 10, PALETTE.player);
    hud.flashSplatter();
    audio.play('hurt');
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.alive = false;
    }
    hud.setHearts(this.hearts, PLAYER.maxHearts);
  }

  /** apply a survivor outcome buff/debuff */
  applyEffect(effect, magnitude, game) {
    switch (effect) {
      case 'HEAL':
        this.hearts = Math.min(PLAYER.maxHearts, this.hearts + magnitude);
        break;
      case 'FIRE_RATE_UP':
        this.fireCooldown = Math.max(0.05, this.fireCooldown * magnitude);
        break;
      case 'DAMAGE_UP':
        this.damage += magnitude;
        break;
      case 'TAKE_DAMAGE':
        this.invuln = 0; // make sure the trap actually lands
        this.hurt(magnitude, game);
        break;
      // SPAWN_ENEMIES is handled by the game (it owns spawning)
    }
    hud.setHearts(this.hearts, PLAYER.maxHearts);
  }
}
