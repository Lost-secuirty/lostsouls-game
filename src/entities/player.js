// =====================================================================
// player.js — a player. Player 1 = keyboard/mouse (blue); Player 2 (co-op) =
// Xbox controller (green). Carries up to a few weapons in SLOTS (unlocked by
// beating bosses) and switches between them. Stat upgrades are capped (see
// config.CAPS) so power can't run away.
// =====================================================================

import * as THREE from 'three';
import { PLAYER, WEAPONS, PALETTE, CAPS } from '../config.js';
import { makeCharacter } from './characterMesh.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { spreadDirs } from '../core/math2d.js';
import * as audio from '../systems/audio.js';
import { hud } from '../ui/hud.js';

export class Player {
  constructor(scene, { color = PALETTE.player, modelKey = 'player', device = 'both' } = {}) {
    this.device = device; // 'kb' | 'pad' | 'both'
    this.mesh = makeCharacter(modelKey, {
      radius: PLAYER.radius,
      height: PLAYER.height,
      color,
    });
    scene.add(this.mesh);
    this.radius = PLAYER.radius;
    this._baseColor = new THREE.Color(color);
    this.slotsUnlocked = 1; // grows as bosses are beaten (set by game)
    this.reset(0, 0);
  }

  reset(x, z) {
    this.x = x;
    this.z = z;
    this.hearts = PLAYER.maxHearts;
    this.alive = true;
    this.fireTimer = 0;
    this.invuln = 0;
    this._beatTimer = 0;
    this.speed = PLAYER.speed; // SPEED_UP raises this (capped)
    this.damageMul = 1; // DAMAGE_UP raises this (capped CAPS.damageMul)
    this.fireRateMul = 1; // FIRE_RATE_UP lowers this (floor CAPS.fireRateMin)
    this.slots = ['pistol']; // weapons you carry; slotsUnlocked is the capacity
    this.slotIndex = 0;
    this._refreshWeapon();
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
  }

  revive(x, z) {
    this.x = x;
    this.z = z;
    this.hearts = PLAYER.maxHearts;
    this.alive = true;
    this.invuln = 1.4;
    this.mesh.position.set(x, 0, z);
    this.mesh.visible = true;
  }

  _refreshWeapon() {
    this.weapon = this.slots[this.slotIndex];
    this.weaponDef = WEAPONS[this.weapon] || WEAPONS.pistol;
    this.weaponName = this.weaponDef.name;
  }

  /** capacity for carried weapons (bumped by the game as bosses fall) */
  setSlotsUnlocked(n) {
    this.slotsUnlocked = Math.min(CAPS.maxWeaponSlots, n);
  }

  /** debug/explicit: set the active slot's weapon */
  setWeapon(type) {
    this.slots[this.slotIndex] = type;
    this._refreshWeapon();
  }

  /** a weapon pickup: fill the next empty slot (and equip it), else replace the active one */
  addWeapon(type) {
    if (this.slots.length < this.slotsUnlocked) {
      this.slots.push(type);
      this.slotIndex = this.slots.length - 1;
    } else {
      this.slots[this.slotIndex] = type;
    }
    this._refreshWeapon();
  }

  switchTo(i) {
    if (i >= 0 && i < this.slots.length) {
      this.slotIndex = i;
      this._refreshWeapon();
    }
  }

  cycleWeapon() {
    if (this.slots.length > 1) {
      this.slotIndex = (this.slotIndex + 1) % this.slots.length;
      this._refreshWeapon();
    }
  }

  update(dt, game) {
    if (!this.alive) return;
    const { input, camera } = game;

    // --- weapon switching ---
    const sw = input.consumeWeaponSwitch(this.device);
    if (sw) {
      if (sw.cycle) this.cycleWeapon();
      else this.switchTo(sw.slot);
      game.refreshHud();
    }

    // --- move ---
    const m = input.move(this.device);
    this.x += m.x * this.speed * dt;
    this.z += m.z * this.speed * dt;
    let p = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
    p = clampToArena(p.x, p.z, this.radius);
    this.x = p.x;
    this.z = p.z;

    // --- aim + shoot ---
    const aim = input.aim(this.device, camera, this.x, this.z);
    this.mesh.rotation.y = Math.atan2(aim.x, aim.z);

    this.fireTimer -= dt;
    if (input.shoot(this.device) && this.fireTimer <= 0 && (aim.x !== 0 || aim.z !== 0)) {
      this._fireWeapon(game, aim);
      this.fireTimer = this.weaponDef.cooldown * this.fireRateMul;
      game.juice.shake(game.JUICE.shakeOnShoot);
      audio.play(
        this.weapon === 'shotgun' ? 'shotgun' : this.weapon === 'rocket' ? 'rocketLaunch' : 'shoot',
      );
      if (this.device !== 'kb' && this.weaponDef.cooldown >= 0.15) input.rumble(0.12, 0.08, 50);
    }

    // --- i-frames + hit flash ---
    if (this.invuln > 0) {
      this.invuln -= dt;
      this.mesh.visible = Math.floor(this.invuln * 20) % 2 === 0;
    } else {
      this.mesh.visible = true;
    }

    // --- low-health heartbeat ---
    if (this.hearts <= 1) {
      this._beatTimer -= dt;
      if (this._beatTimer <= 0) {
        audio.play('lowHealth');
        this._beatTimer = 0.9;
      }
    } else {
      this._beatTimer = 0;
    }

    this.mesh.position.set(this.x, 0, this.z);
  }

  _fireWeapon(game, aim) {
    const w = this.weaponDef;
    const dmg = w.damage * this.damageMul; // base unchanged; multiplier is capped
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
    if (game.godMode || this.invuln > 0 || !this.alive) return;
    this.hearts -= dmg;
    this.invuln = PLAYER.invuln;
    game.juice.shake(game.JUICE.shakeOnHurt);
    game.juice.hitStop(game.JUICE.hitStopOnHurt);
    game.particles.burst(this.x, this.z, 10, this._baseColor.getHex());
    hud.flashSplatter();
    audio.play('hurt');
    if (this.device !== 'kb') game.input.rumble(0.6, 0.4, 200);
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.alive = false;
      this.mesh.visible = false;
    }
    game.refreshHud();
  }

  /** apply a survivor outcome or pickup buff/debuff (all capped) */
  applyEffect(effect, magnitude, game) {
    switch (effect) {
      case 'HEAL':
        this.hearts = Math.min(PLAYER.maxHearts, this.hearts + magnitude);
        break;
      case 'FIRE_RATE_UP':
        this.fireRateMul = Math.max(CAPS.fireRateMin, this.fireRateMul * magnitude);
        break;
      case 'DAMAGE_UP':
        this.damageMul = Math.min(CAPS.damageMul, this.damageMul + magnitude);
        break;
      case 'SPEED_UP':
        this.speed = Math.min(PLAYER.speed * CAPS.speedMul, this.speed + magnitude);
        break;
      case 'TAKE_DAMAGE':
        this.invuln = 0;
        this.hurt(magnitude, game);
        break;
      // SPAWN_ENEMIES is handled by the game (it owns spawning)
    }
    game.refreshHud();
  }
}
