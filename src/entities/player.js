// =====================================================================
// player.js — that's you. Move with WASD (or left stick), aim + shoot with
// the mouse (or right stick), lose hearts when monsters hit you, and grab
// items + weapons.
// =====================================================================

import * as THREE from 'three';
import { PLAYER, WEAPONS, PALETTE } from '../config.js';
import { makeCharacter } from './characterMesh.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { spreadDirs } from '../core/math2d.js';
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
    this.speed = PLAYER.speed; // SPEED_UP raises this
    this.damageBonus = 0; // DAMAGE_UP raises this
    this.fireRateMul = 1; // FIRE_RATE_UP lowers this (faster)
    this.setWeapon('pistol');
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
  }

  setWeapon(type) {
    this.weapon = type;
    this.weaponDef = WEAPONS[type] || WEAPONS.pistol;
    this.weaponName = this.weaponDef.name;
  }

  update(dt, game) {
    if (!this.alive) return;
    const { input, camera } = game;

    // --- move ---
    const m = input.move();
    this.x += m.x * this.speed * dt;
    this.z += m.z * this.speed * dt;
    let p = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
    p = clampToArena(p.x, p.z, this.radius);
    this.x = p.x;
    this.z = p.z;

    // --- aim + shoot ---
    const aim = input.aim(camera, this.x, this.z);
    this.mesh.rotation.y = Math.atan2(aim.x, aim.z);

    this.fireTimer -= dt;
    if (input.shoot && this.fireTimer <= 0 && (aim.x !== 0 || aim.z !== 0)) {
      this._fireWeapon(game, aim);
      this.fireTimer = this.weaponDef.cooldown * this.fireRateMul;
      game.juice.shake(game.JUICE.shakeOnShoot);
      audio.play(this.weapon === 'shotgun' ? 'shotgun' : 'shoot');
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

  _fireWeapon(game, aim) {
    const w = this.weaponDef;
    const dmg = w.damage + this.damageBonus;
    const dirs = spreadDirs(aim.x, aim.z, w.pellets, w.spreadDeg);
    for (const d of dirs) {
      game.bullets.spawnPlayer(this.x, this.z, d.x, d.z, {
        damage: dmg,
        speed: w.bulletSpeed,
        explosive: w.explosive,
        explodeRadius: w.explodeRadius,
      });
    }
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

  /** apply a survivor outcome or pickup buff/debuff */
  applyEffect(effect, magnitude, game) {
    switch (effect) {
      case 'HEAL':
        this.hearts = Math.min(PLAYER.maxHearts, this.hearts + magnitude);
        break;
      case 'FIRE_RATE_UP':
        this.fireRateMul = Math.max(0.25, this.fireRateMul * magnitude);
        break;
      case 'DAMAGE_UP':
        this.damageBonus += magnitude;
        break;
      case 'SPEED_UP':
        this.speed += magnitude;
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
