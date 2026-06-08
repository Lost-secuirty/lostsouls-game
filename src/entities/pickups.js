// =====================================================================
// pickups.js — items you grab by walking over them (no key press needed).
//
// Stat gems (heal / damage / fire-rate / speed) and weapon pickups
// (shotgun / machine gun / rocket). They float and spin so they're easy to
// spot. Collection is handled in game.js via a circle-vs-circle check.
// =====================================================================

import * as THREE from 'three';
import { PICKUPS } from '../config.js';
import { makeTextSprite } from '../core/textSprite.js';
import { hud } from '../ui/hud.js';
import * as audio from '../systems/audio.js';

/** a distinct shape per pickup type, so you can read it at a glance */
function shapeFor(type, weapon) {
  if (weapon) return new THREE.BoxGeometry(0.7, 0.4, 0.9);
  switch (type) {
    case 'HEAL':
      return new THREE.TetrahedronGeometry(0.55);
    case 'DAMAGE_UP':
      return new THREE.OctahedronGeometry(0.5);
    case 'FIRE_RATE_UP':
      return new THREE.DodecahedronGeometry(0.45);
    case 'SPEED_UP':
      return new THREE.ConeGeometry(0.45, 0.9, 6);
    default:
      return new THREE.OctahedronGeometry(0.5);
  }
}

const WEAPON_TYPES = ['SHOTGUN', 'MACHINEGUN', 'ROCKET'];

const LOOK = {
  HEAL: { color: 0xff3b6b, label: '+2 HEARTS', weapon: false },
  DAMAGE_UP: { color: 0xff8a3b, label: 'DAMAGE UP', weapon: false },
  FIRE_RATE_UP: { color: 0xffe24a, label: 'FASTER SHOTS', weapon: false },
  SPEED_UP: { color: 0x49b3ff, label: 'SPEED UP', weapon: false },
  SHOTGUN: { color: 0xff5a2a, label: 'SHOTGUN!', weapon: true },
  MACHINEGUN: { color: 0xc0c0ff, label: 'MACHINE GUN!', weapon: true },
  ROCKET: { color: 0xff2a2a, label: 'ROCKET LAUNCHER!', weapon: true },
};

/** weighted random pickup type. bossReward => always a weapon. */
export function dropRandomPickup(rng, bossReward) {
  if (bossReward) return rng.pick(WEAPON_TYPES);
  const table = PICKUPS.dropTable;
  const total = table.reduce((s, e) => s + e.weight, 0);
  let roll = rng.next() * total;
  for (const e of table) {
    roll -= e.weight;
    if (roll <= 0) return e.type;
  }
  return table[0].type;
}

export class Pickup {
  constructor(scene, type, x, z) {
    this.scene = scene;
    this.type = type;
    this.x = x;
    this.z = z;
    this.radius = PICKUPS.radius;
    this.dead = false;
    this._t = Math.random() * 10;

    const look = LOOK[type] || LOOK.HEAL;
    // group = a spinning shape + a floating name label (so you know what it is)
    const group = new THREE.Group();
    this.shape = new THREE.Mesh(
      shapeFor(type, look.weapon),
      new THREE.MeshStandardMaterial({
        color: look.color,
        emissive: look.color,
        emissiveIntensity: 0.6,
        roughness: 0.3,
        flatShading: true,
      }),
    );
    group.add(this.shape);

    const label = makeTextSprite(look.label, look.color);
    label.position.set(0, 1.4, 0);
    group.add(label);

    group.position.set(x, 1, z);
    this.mesh = group;
    scene.add(group);
  }

  update(dt) {
    this._t += dt;
    this.mesh.position.y = 1 + Math.sin(this._t * 3) * 0.2;
    this.shape.rotation.y += dt * 2.5;
  }

  collect(game, player = game.player) {
    if (this.dead) return;
    this.dead = true;
    this.scene.remove(this.mesh);

    const look = LOOK[this.type] || LOOK.HEAL;
    if (look.weapon) {
      player.addWeapon(this.type.toLowerCase());
      audio.play('weapon');
    } else {
      const mag = {
        HEAL: PICKUPS.healAmount,
        DAMAGE_UP: PICKUPS.damageUpAmount,
        FIRE_RATE_UP: PICKUPS.fireRateMul,
        SPEED_UP: PICKUPS.speedUpAmount,
      }[this.type];
      player.applyEffect(this.type, mag, game);
      audio.play('pickup');
    }
    hud.toast(look.label, true);
    game.refreshHud();
  }
}
