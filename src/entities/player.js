// =====================================================================
// player.js — a player. Player 1 = keyboard/mouse (blue); Player 2 (co-op) =
// Xbox controller (green). Carries up to a few weapons in SLOTS (unlocked by
// beating bosses) and switches between them. Stat upgrades are capped (see
// config.CAPS) so power can't run away.
// =====================================================================

import * as THREE from 'three';
import { PLAYER, WEAPONS, PALETTE, CAPS, UPGRADES } from '../config.js';
import { statBonus } from '../core/scaling.js';
import { makeCharacter } from './characterMesh.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { spreadDirs, circleVsCircle, normalize } from '../core/math2d.js';
import * as audio from '../systems/audio.js';
import { hud } from '../ui/hud.js';

// which procedural sound a weapon's normal shot plays (default: 'shoot')
const SHOOT_SFX = {
  shotgun: 'shotgun',
  rocket: 'rocketLaunch',
  homing: 'rocketLaunch',
  railgun: 'railgun',
};

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
    // upgrade STACKS — each pickup adds one; the derived stats below come from the
    // diminishing-returns curve (config.UPGRADES + core/scaling.js), so power ramps
    // over the whole run instead of capping in ~3 pickups.
    this._up = { damage: 0, fireRate: 0, speed: 0 };
    this._recomputeUpgrades(); // sets speed / damageMul / fireRateMul from 0 stacks
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
    this._charge = 0; // drop any in-progress charge when the weapon changes
    if (!this.weaponDef.orbital) this._hideOrbital(); // stash orbital blades
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

    if (this.weaponDef.orbital) {
      this._updateOrbital(dt, game);
    } else if (this.weaponDef.charge) {
      this.fireTimer -= dt;
      this._updateCharge(dt, game, aim);
    } else {
      this.fireTimer -= dt;
      if (input.shoot(this.device) && this.fireTimer <= 0 && (aim.x !== 0 || aim.z !== 0)) {
        this._fireWeapon(game, aim);
        this.fireTimer = this.weaponDef.cooldown * this.fireRateMul;
        game.juice.addTrauma(game.JUICE.traumaOnShoot);
        audio.play(SHOOT_SFX[this.weapon] || 'shoot');
        if (this.device !== 'kb' && this.weaponDef.cooldown >= 0.15) input.rumble(0.12, 0.08, 50);
      }
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
        pierce: w.pierce,
        homing: w.homing,
        turnRate: w.turnRate,
        bounces: w.bounces,
        life: w.life,
        scale: w.scale,
        color: w.color,
      });
    }
  }

  // --- Orbital Blade: blades circle the player and hit on contact (no aiming) ---
  _updateOrbital(dt, game) {
    const def = this.weaponDef;
    if (!this._orbital) this._orbital = { blades: [], angle: 0, cd: new Map() };
    const orb = this._orbital;
    while (orb.blades.length < def.count) {
      const m = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.4, 0),
        new THREE.MeshBasicMaterial({ color: def.color ?? 0x66ffd0 }),
      );
      game.scene.add(m);
      orb.blades.push(m);
    }
    orb.angle += def.spin * dt;
    for (let i = 0; i < def.count; i++) {
      const a = orb.angle + (i / def.count) * Math.PI * 2;
      const bx = this.x + Math.sin(a) * def.radius;
      const bz = this.z + Math.cos(a) * def.radius;
      const m = orb.blades[i];
      m.position.set(bx, 1, bz);
      m.rotation.y += dt * 6;
      m.visible = true;
      for (const e of game.enemies) {
        if (e.dead || (orb.cd.get(e) || 0) > 0) continue;
        if (circleVsCircle(bx, bz, 0.5, e.x, e.z, e.radius)) {
          e.hurt(def.damage * this.damageMul, game, normalize(e.x - this.x, e.z - this.z)); // shove away (B7)
          orb.cd.set(e, def.hitCooldown);
        }
      }
    }
    for (const [e, t] of orb.cd) {
      const nt = t - dt;
      if (nt <= 0) orb.cd.delete(e);
      else orb.cd.set(e, nt);
    }
  }

  _hideOrbital() {
    if (this._orbital) for (const m of this._orbital.blades) m.visible = false;
  }

  /**
   * Tear down anything this player added to the scene BEYOND its own mesh.
   * Right now that's the orbital blades — they live directly in the scene (not
   * under `this.mesh`), so removing the mesh alone would orphan them. Without
   * this, resetting the game while the Orbital Blade is equipped left the blades
   * frozen in the scene at their last position. Call before dropping a player.
   */
  dispose(scene) {
    if (this._orbital) {
      for (const m of this._orbital.blades) {
        scene.remove(m);
        m.geometry?.dispose();
        m.material?.dispose();
      }
      this._orbital = null;
    }
  }

  // --- Charge Cannon: hold to charge, release a bigger/stronger cannonball ---
  _updateCharge(dt, game, aim) {
    const aiming = aim.x !== 0 || aim.z !== 0;
    if (this.fireTimer > 0) return; // respect the weapon cooldown between charge shots
    if (game.input.shoot(this.device) && aiming) {
      this._charge = Math.min(this.weaponDef.charge.maxTime, (this._charge || 0) + dt);
      // auto-fire at full charge so a kid who just holds it still shoots
      if (this._charge >= this.weaponDef.charge.maxTime) this._releaseCharge(game, aim);
    } else if (this._charge > 0) {
      this._releaseCharge(game, aim);
    }
  }

  _releaseCharge(game, aim) {
    const c = this.weaponDef.charge;
    const f = Math.min(1, (this._charge || 0) / c.maxTime);
    this._charge = 0;
    if (aim.x === 0 && aim.z === 0) return;
    const lerp = (a, b) => a + (b - a) * f;
    game.bullets.spawnPlayer(this.x, this.z, aim.x, aim.z, {
      damage: lerp(c.minDamage, c.maxDamage) * this.damageMul,
      speed: lerp(c.minSpeed, c.maxSpeed),
      pierce: Math.round(lerp(0, c.pierce)),
      scale: lerp(1, c.maxScale),
      color: c.color,
    });
    this.fireTimer = this.weaponDef.cooldown * this.fireRateMul; // cap charge cadence
    game.juice.addTrauma(game.JUICE.traumaOnShoot + game.JUICE.traumaChargeBonus * f);
    audio.play(f > 0.6 ? 'chargeShot' : 'shoot');
    if (this.device !== 'kb') game.input.rumble(0.2 + 0.4 * f, 0.1, 60 + f * 80);
  }

  hurt(dmg, game) {
    if (game.godMode || this.invuln > 0 || !this.alive) return;
    this.hearts -= dmg;
    this.invuln = PLAYER.invuln;
    game.juice.addTrauma(game.JUICE.traumaOnHurt);
    game.juice.hitStop(game.JUICE.hitStopOnHurt);
    game.particles.burst(this.x, this.z, 10, this._baseColor.getHex());
    hud.flashSplatter();
    const sf = game.FEEL.screenFlash.hurt;
    hud.flashScreen(sf.peak, sf.color, sf.ms);
    audio.play('hurt');
    audio.duckMusic(); // dip the music for a beat when you get hit
    if (this.device !== 'kb') game.input.rumble(0.6, 0.4, 200);
    if (this.hearts <= 0) {
      this.hearts = 0;
      this.alive = false;
      this.mesh.visible = false;
      this._hideOrbital(); // else orbital blades freeze visible at the death spot
    }
    game.refreshHud();
  }

  /**
   * Recompute the three derived stats from the upgrade STACK counts via the
   * diminishing-returns curve (config.UPGRADES). CAPS are a safety backstop only.
   */
  _recomputeUpgrades() {
    const u = this._up;
    this.damageMul = Math.min(
      CAPS.damageMul,
      1 + statBonus(u.damage, UPGRADES.damage.maxBonus, UPGRADES.damage.half),
    );
    this.fireRateMul = Math.max(
      CAPS.fireRateMin,
      1 - statBonus(u.fireRate, UPGRADES.fireRate.maxBonus, UPGRADES.fireRate.half),
    );
    this.speed = Math.min(
      PLAYER.speed * CAPS.speedMul,
      PLAYER.speed * (1 + statBonus(u.speed, UPGRADES.speed.maxBonus, UPGRADES.speed.half)),
    );
  }

  /** apply a survivor outcome or pickup buff/debuff. The UPs add one stack each
   *  (magnitude-agnostic) and recompute from the curve; HEAL/TAKE_DAMAGE use it. */
  applyEffect(effect, magnitude, game) {
    switch (effect) {
      case 'HEAL':
        this.hearts = Math.min(PLAYER.maxHearts, this.hearts + magnitude);
        break;
      case 'FIRE_RATE_UP':
        this._up.fireRate++;
        this._recomputeUpgrades();
        break;
      case 'DAMAGE_UP':
        this._up.damage++;
        this._recomputeUpgrades();
        break;
      case 'SPEED_UP':
        this._up.speed++;
        this._recomputeUpgrades();
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
