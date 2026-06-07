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
import { getModel } from '../core/assets.js';
import { buildSpiderMesh } from './spiderMesh.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { normalize, dist, circleVsCircle } from '../core/math2d.js';
import * as audio from '../systems/audio.js';

function makeEnemyMesh(type, theme) {
  const group = new THREE.Group();
  const model = getModel(type);
  if (model) {
    group.add(model);
    return group;
  }
  // themed mini-spiders on spider floors (small, simplified for many on screen)
  if (theme && theme.boss === 'spider') {
    return buildSpiderMesh(ENEMY[type].radius * 1.4, theme.palette || {}, { simple: true }).group;
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
  return group;
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
    this.mesh = makeEnemyMesh(type, theme);
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.player;
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

    // spiders face the player; blobs do a slow menacing spin
    if (this.isSpider) this.mesh.rotation.y = Math.atan2(p.x - this.x, p.z - this.z);
    else this.mesh.rotation.y += dt * 1.5;
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
    this.scene.remove(this.mesh);
  }
}
