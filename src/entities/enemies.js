// =====================================================================
// enemies.js — the monsters.
//
//   chaser  : runs straight at you and hurts you on contact.
//   shooter : keeps its distance and sprays rings of bullets (bullet-hell).
//
// Both bleed when hit and explode into blood when they die.
// =====================================================================

import * as THREE from 'three';
import { ENEMY, BULLET, PALETTE, PARTICLES } from '../config.js';
import { getModel, getAnimated } from '../core/assets.js';
import { AnimModel } from '../core/animModel.js';
import { buildSpiderMesh } from './spiderMesh.js';
import { buildMushroomMesh } from './mushroomMesh.js';
import { buildBeastMesh } from './beastMesh.js';
import { buildSkeletonMesh } from './skeletonMesh.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { normalize, dist, circleVsCircle } from '../core/math2d.js';
import * as audio from '../systems/audio.js';

// Returns { group, anim } — `anim` is an AnimModel for GLB-backed minions
// (whose mixer the Enemy advances each frame), else null.
function makeEnemyMesh(type, theme) {
  // themed mini-mushrooms on the fungal floor (minions match their boss)
  if (theme && theme.boss === 'mushroom') {
    const m = getAnimated('sporeling');
    if (m) {
      const anim = new AnimModel(m.scene, m.clips).fitTo(ENEMY[type].radius * 2.2);
      anim.play('Walk');
      const wrap = new THREE.Group(); // base-1 wrapper (hit-pop / spawn scaling)
      wrap.add(anim.group);
      return { group: wrap, anim };
    }
    const g = buildMushroomMesh(ENEMY[type].radius * 1.3, theme.palette || {}, {
      simple: true,
    }).group;
    return { group: g, anim: null };
  }

  // themed beasts on the duo floor: pups (warm) + kittens (cool) match their bosses.
  // theme.boss is 'duo' for normal-room minions (alternate by enemy type) or
  // 'dog'/'cat' for the kittens a boss summons.
  if (theme && (theme.boss === 'dog' || theme.boss === 'cat' || theme.boss === 'duo')) {
    const kind = theme.boss === 'duo' ? (type === 'shooter' ? 'cat' : 'dog') : theme.boss;
    const m = getAnimated(kind); // 'dog' / 'cat' model keys
    if (m) {
      const anim = new AnimModel(m.scene, m.clips).fitTo(ENEMY[type].radius * 1.9);
      anim.play('Walk');
      const wrap = new THREE.Group(); // base-1 wrapper (hit-pop / spawn scaling)
      wrap.add(anim.group);
      return { group: wrap, anim };
    }
    const g = buildBeastMesh(ENEMY[type].radius * 1.2, theme.palette || {}, {
      kind,
      simple: true,
    }).group;
    return { group: g, anim: null };
  }

  // bone-white catacomb minions (bonelings + archers) match the skeleton boss
  if (theme && theme.boss === 'skeleton') {
    const m = getAnimated('skeleton');
    if (m) {
      const anim = new AnimModel(m.scene, m.clips).fitTo(ENEMY[type].radius * 2.1);
      anim.play('Walk');
      const wrap = new THREE.Group(); // base-1 wrapper (hit-pop / spawn scaling)
      wrap.add(anim.group);
      return { group: wrap, anim };
    }
    const g = buildSkeletonMesh(ENEMY[type].radius * 1.3, theme.palette || {}, {
      simple: true,
    }).group;
    return { group: g, anim: null };
  }

  const group = new THREE.Group();
  const model = getModel(type);
  if (model) {
    group.add(model);
    return { group, anim: null };
  }
  // themed mini-spiders on spider floors (small, simplified for many on screen)
  if (theme && theme.boss === 'spider') {
    const g = buildSpiderMesh(ENEMY[type].radius * 1.4, theme.palette || {}, {
      simple: true,
    }).group;
    return { group: g, anim: null };
  }
  const cfg = ENEMY[type];
  const color = type === 'chaser' ? PALETTE.enemyChaser : PALETTE.enemyShooter;
  const geo =
    type === 'chaser'
      ? new THREE.IcosahedronGeometry(cfg.radius, 0) // jagged blob
      : new THREE.OctahedronGeometry(cfg.radius, 0); // sharp caster
  const body = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.55,
      roughness: 0.5,
      flatShading: true,
    }),
  );
  body.position.y = cfg.radius + 0.2;
  group.add(body);

  // glowing eyes
  const eyeGeo = new THREE.SphereGeometry(cfg.radius * 0.18, 6, 6);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffe000 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx * cfg.radius * 0.35, cfg.radius + 0.4, cfg.radius * 0.7);
    group.add(eye);
  }
  return { group, anim: null };
}

export class Enemy {
  constructor(scene, type, x, z, theme = null) {
    this.scene = scene;
    this.type = type;
    this.cfg = ENEMY[type];
    this.x = x;
    this.z = z;
    this.radius = this.cfg.radius;
    this.hp = this.cfg.hp;
    this.dead = false;
    this.contactTimer = 0;
    this.fireTimer = this.cfg.fireInterval ? this.cfg.fireInterval * Math.random() : 0;
    this.phase = Math.random() * Math.PI * 2;
    this.isSpider = !!(theme && theme.boss === 'spider');
    this.isMushroom = !!(theme && theme.boss === 'mushroom');
    this.isBeast = !!(
      theme &&
      (theme.boss === 'dog' || theme.boss === 'cat' || theme.boss === 'duo')
    );
    this.isSkeleton = !!(theme && theme.boss === 'skeleton');
    const built = makeEnemyMesh(type, theme);
    this.mesh = built.group;
    this.anim = built.anim; // AnimModel for GLB minions, else null
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.nearestPlayer(this.x, this.z) || game.player;
    this.contactTimer -= dt;

    if (this.type === 'chaser') {
      const dir = normalize(p.x - this.x, p.z - this.z);
      this.x += dir.x * this.cfg.speed * dt;
      this.z += dir.z * this.cfg.speed * dt;
    } else {
      // shooter: hold preferred distance, then volley
      const d = dist(this.x, this.z, p.x, p.z);
      const dir = normalize(p.x - this.x, p.z - this.z);
      const sign = d < this.cfg.preferredDist - 1 ? -1 : d > this.cfg.preferredDist + 1 ? 1 : 0;
      this.x += dir.x * this.cfg.speed * dt * sign;
      this.z += dir.z * this.cfg.speed * dt * sign;

      this.fireTimer -= dt;
      if (this.fireTimer <= 0 && p.alive) {
        this._fireRing(game);
        this.fireTimer = this.cfg.fireInterval;
      }
    }

    // keep out of walls / arena
    let q = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
    q = clampToArena(q.x, q.z, this.radius);
    this.x = q.x;
    this.z = q.z;

    // contact damage
    if (
      this.contactTimer <= 0 &&
      p.alive &&
      circleVsCircle(this.x, this.z, this.radius, p.x, p.z, p.radius)
    ) {
      p.hurt(this.cfg.contactDamage, game);
      this.contactTimer = this.cfg.contactCooldown;
    }

    // settle the hit-pop scale back to normal
    const s = this.mesh.scale.x;
    if (s !== 1) this.mesh.scale.setScalar(s + (1 - s) * Math.min(1, dt * 12));

    // themed monsters face the player; generic blobs do a slow menacing spin
    if (this.isSpider || this.isMushroom || this.isBeast || this.isSkeleton)
      this.mesh.rotation.y = Math.atan2(p.x - this.x, p.z - this.z);
    else this.mesh.rotation.y += dt * 1.5;
    this.anim?.update(dt); // advance the GLB animation clip, if any
    this.mesh.position.set(this.x, 0, this.z);
  }

  _fireRing(game) {
    const n = this.cfg.bulletsPerRing;
    this.phase += 0.4;
    for (let i = 0; i < n; i++) {
      const a = this.phase + (i / n) * Math.PI * 2;
      game.bullets.spawnEnemy(this.x, this.z, Math.sin(a), Math.cos(a), BULLET.enemy.speed);
    }
  }

  hurt(dmg, game) {
    if (this.dead) return;
    this.hp -= dmg;
    game.particles.burst(this.x, this.z, PARTICLES.perHit, PALETTE.blood);
    this.mesh.scale.setScalar(1.35); // pop
    audio.play('hit');
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    this.dead = true;
    game.particles.burst(this.x, this.z, PARTICLES.perDeath, PALETTE.blood);
    game.juice.shake(game.JUICE.shakeOnKill);
    game.juice.hitStop(game.JUICE.hitStopOnKill);
    audio.play('kill');
    if (this.onDeath) this.onDeath(this, game); // e.g. puffball -> poison pool
    this.scene.remove(this.mesh);
  }
}
