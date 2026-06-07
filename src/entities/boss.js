// =====================================================================
// boss.js — the SPIDER BOSS. 🕷️
//
// A big procedural spider (body + 8 animated legs + glowing eyes) that
// scuttles at you, sprays rings of bullets, spawns little spiderlings, and
// goes into a faster "enrage" when low on health. Conforms to the same
// interface the bullet/collision code expects (x, z, radius, hp, dead,
// hurt(), die(), update()).
// =====================================================================

import * as THREE from 'three';
import { BOSS, PALETTE, PARTICLES } from '../config.js';
import { getModel } from '../core/assets.js';
import { Enemy } from './enemies.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { normalize, circleVsCircle } from '../core/math2d.js';
import * as audio from '../systems/audio.js';

function buildSpiderMesh(radius) {
  const group = new THREE.Group();
  const model = getModel('spider');
  if (model) {
    group.add(model);
    return { group, legs: [] };
  }

  const dark = new THREE.MeshStandardMaterial({
    color: 0x2a0606,
    emissive: 0x6a0d0d,
    emissiveIntensity: 0.5,
    roughness: 0.4,
    flatShading: true,
  });

  // abdomen (big rear) + head (smaller front), sitting up on the legs
  const bodyY = radius * 0.9;
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.7, 12, 12), dark);
  abdomen.position.set(0, bodyY, -radius * 0.3);
  group.add(abdomen);

  const head = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.45, 12, 12), dark);
  head.position.set(0, bodyY, radius * 0.45);
  group.add(head);

  // glowing eyes on the head
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffe000 });
  for (const sx of [-1, 1]) {
    for (const sy of [0, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.08, 6, 6), eyeMat);
      eye.position.set(sx * radius * 0.18, bodyY + sy * radius * 0.14, radius * 0.78);
      group.add(eye);
    }
  }

  // 8 legs (4 per side), each = thigh + shin we can animate
  const legMat = new THREE.MeshStandardMaterial({
    color: 0x1a0303,
    emissive: 0x400808,
    emissiveIntensity: 0.3,
    flatShading: true,
  });
  const legs = [];
  for (let i = 0; i < 8; i++) {
    const side = i < 4 ? -1 : 1;
    const k = i % 4;
    const hip = new THREE.Group();
    hip.position.set(side * radius * 0.35, bodyY, radius * (0.4 - k * 0.3));
    hip.rotation.y = side * (0.5 + k * 0.12);

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.06, radius * 0.05, radius), legMat);
    thigh.geometry.translate(0, -radius / 2, 0); // pivot at the hip
    thigh.rotation.z = side * 0.7;
    hip.add(thigh);

    const shin = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.045, radius * 0.03, radius * 1.1),
      legMat,
    );
    shin.geometry.translate(0, -radius * 0.55, 0);
    shin.position.y = -radius;
    shin.rotation.z = side * -0.9;
    thigh.add(shin);

    group.add(hip);
    legs.push({ hip, thigh, side, offset: i * 0.5 });
  }

  return { group, legs };
}

export class Boss {
  constructor(scene, x, z, diff = 1) {
    this.scene = scene;
    this.cfg = BOSS.spider;
    this.isBoss = true;
    this.name = 'The Spider';
    this.x = x;
    this.z = z;
    this.radius = this.cfg.radius;
    this.maxHp = Math.round(this.cfg.hp * diff);
    this.hp = this.maxHp;
    this.speed = this.cfg.speed * (0.9 + diff * 0.1);
    this.dead = false;
    this.contactTimer = 0;
    this.fireTimer = this.cfg.fireInterval;
    this.spawnTimer = this.cfg.spawnInterval;
    this.phase = 0;
    this.t = 0;

    const built = buildSpiderMesh(this.radius);
    this.mesh = built.group;
    this.legs = built.legs;
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
  }

  get enraged() {
    return this.hp / this.maxHp <= this.cfg.enrageAt;
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.player;
    this.t += dt;
    this.contactTimer -= dt;
    const rage = this.enraged ? 1.6 : 1;

    // scuttle toward the player
    const dir = normalize(p.x - this.x, p.z - this.z);
    this.x += dir.x * this.speed * rage * dt;
    this.z += dir.z * this.speed * rage * dt;
    let q = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
    q = clampToArena(q.x, q.z, this.radius);
    this.x = q.x;
    this.z = q.z;
    this.mesh.rotation.y = Math.atan2(dir.x, dir.z);

    // contact damage
    if (
      this.contactTimer <= 0 &&
      p.alive &&
      circleVsCircle(this.x, this.z, this.radius, p.x, p.z, p.radius)
    ) {
      p.hurt(this.cfg.contactDamage, game);
      this.contactTimer = this.cfg.contactCooldown;
    }

    // bullet-hell volleys (ring + aimed spread)
    this.fireTimer -= dt;
    if (this.fireTimer <= 0 && p.alive) {
      this._fireRing(game, this.cfg.ringBullets + (this.enraged ? 6 : 0));
      this._fireAimed(game, p);
      this.fireTimer = this.cfg.fireInterval / rage;
    }

    // spawn spiderlings
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      for (let i = 0; i < this.cfg.spawnCount; i++) {
        const a = Math.random() * Math.PI * 2;
        const lx = this.x + Math.cos(a) * this.radius * 1.5;
        const lz = this.z + Math.sin(a) * this.radius * 1.5;
        const ling = new Enemy(this.scene, 'chaser', lx, lz);
        ling.mesh.scale.setScalar(0.55);
        ling.radius *= 0.6;
        ling.hp = 1;
        game.addEnemy(ling);
      }
      this.spawnTimer = this.cfg.spawnInterval;
    }

    this._animateLegs(rage);

    // settle hit-pop scale
    const s = this.mesh.scale.x;
    if (s !== 1) this.mesh.scale.setScalar(s + (1 - s) * Math.min(1, dt * 10));
    this.mesh.position.set(this.x, 0, this.z);
  }

  _animateLegs(rage) {
    const sp = 6 * rage;
    for (const leg of this.legs) {
      const a = Math.sin(this.t * sp + leg.offset) * 0.35;
      leg.thigh.rotation.x = a;
      if (leg.thigh.children[0]) leg.thigh.children[0].rotation.x = -a * 0.8;
    }
  }

  _fireRing(game, n) {
    this.phase += 0.35;
    for (let i = 0; i < n; i++) {
      const a = this.phase + (i / n) * Math.PI * 2;
      game.bullets.spawnEnemy(this.x, this.z, Math.sin(a), Math.cos(a), this.cfg.bulletSpeed);
    }
  }

  _fireAimed(game, p) {
    const base = normalize(p.x - this.x, p.z - this.z);
    for (const off of [-0.18, 0, 0.18]) {
      const c = Math.cos(off);
      const s = Math.sin(off);
      const dx = base.x * c - base.z * s;
      const dz = base.x * s + base.z * c;
      game.bullets.spawnEnemy(this.x, this.z, dx, dz, this.cfg.bulletSpeed * 1.2);
    }
  }

  hurt(dmg, game) {
    if (this.dead) return;
    this.hp -= dmg;
    game.particles.burst(this.x, this.z, PARTICLES.perHit, PALETTE.blood);
    this.mesh.scale.setScalar(1.15);
    audio.play('bossHit');
    if (this.hp <= 0) this.die(game);
  }

  die(game) {
    this.dead = true;
    game.particles.burst(this.x, this.z, PARTICLES.perDeath * 3, PALETTE.blood);
    game.juice.shake(1.2);
    game.juice.hitStop(0.12);
    this.scene.remove(this.mesh);
  }
}
