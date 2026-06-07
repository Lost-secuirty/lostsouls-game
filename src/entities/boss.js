// =====================================================================
// boss.js — the SPIDER BOSS. 🕷️
//
// A big procedural spider (body + 8 animated legs + glowing eyes). Its attacks
// are Caden's three design-card patterns (P# = an attack pattern, not a phase):
//   P1 — base attack: a quick aimed burst, like a pistol.
//   P2 — bullet ring: a telegraphed "circle of small dots" (few on floor 1,
//        denser on later floors); the wind-up makes it fair/dodgeable.
//   P3 — baby-spider spawns, gated by HP (none >50%, 2–3 <50%, 3 <25%).
// It also scuttles at you for contact damage, and speeds up as it weakens.
// Conforms to the bullet/collision interface (x, z, radius, hp, dead, hurt(),
// die(), update()).
// =====================================================================

import { BOSS, PALETTE, PARTICLES } from '../config.js';
import { getModel } from '../core/assets.js';
import { buildSpiderMesh } from './spiderMesh.js';
import { spiderlingTarget } from '../core/progression.js';
import { Enemy } from './enemies.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { normalize, spreadDirs, circleVsCircle } from '../core/math2d.js';
import * as audio from '../systems/audio.js';

export class Boss {
  constructor(scene, x, z, diff = 1, palette = null) {
    this.scene = scene;
    this.cfg = BOSS.spider;
    this.isBoss = true;
    this.name = 'The Spider';
    this.palette = palette; // per-floor colors (passed to spiderlings too)
    this.theme = { boss: 'spider', palette };
    this.x = x;
    this.z = z;
    this.radius = this.cfg.radius;
    this.maxHp = Math.round(this.cfg.hp * diff);
    this.hp = this.maxHp;
    this.speed = this.cfg.speed * (0.9 + diff * 0.1);
    this.ringCount = Math.round(this.cfg.ringBullets * diff); // P2 denser on later floors
    this.dead = false;
    this.contactTimer = 0;
    this.p1Timer = this.cfg.p1Interval; // P1 base attack
    this.p2Timer = this.cfg.p2Interval; // P2 ring
    this.charge = 0; // >0 while telegraphing the ring
    this.spawnTimer = this.cfg.spawnInterval; // P3
    this.phase = 0;
    this.t = 0;

    const model = getModel('spider');
    if (model) {
      this.mesh = model;
      this.legs = [];
    } else {
      const built = buildSpiderMesh(this.radius, palette || {});
      this.mesh = built.group;
      this.legs = built.legs;
    }
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    audio.play('bossRoar');
  }

  /** speeds up as it weakens (tied to the same 50%/25% gates as the spawns) */
  get rage() {
    const f = this.hp / this.maxHp;
    return f <= 0.25 ? 1.5 : f <= 0.5 ? 1.2 : 1;
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.nearestPlayer(this.x, this.z) || game.player;
    this.t += dt;
    this.contactTimer -= dt;
    const rage = this.rage;

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

    if (p.alive) {
      this._attacks(dt, game, p, rage);
      this._spawns(dt, game);
    }

    this._animateLegs(rage);

    // settle the hit-pop / telegraph scale back toward 1
    const target = this.charge > 0 ? 1.25 : 1;
    const s = this.mesh.scale.x;
    this.mesh.scale.setScalar(s + (target - s) * Math.min(1, dt * 12));
    this.mesh.position.set(this.x, 0, this.z);
  }

  // P1 (base aimed burst) + P2 (telegraphed bullet ring)
  _attacks(dt, game, p, rage) {
    // P1 — base attack: a quick aimed burst, like a pistol
    this.p1Timer -= dt;
    if (this.p1Timer <= 0) {
      const aim = normalize(p.x - this.x, p.z - this.z);
      for (const d of spreadDirs(aim.x, aim.z, this.cfg.p1Burst, this.cfg.p1Spread)) {
        game.bullets.spawnEnemy(this.x, this.z, d.x, d.z, this.cfg.p1BulletSpeed);
      }
      audio.play('bossShoot');
      this.p1Timer = this.cfg.p1Interval / rage;
    }

    // P2 — bullet ring with a wind-up telegraph (fair warning before it fires)
    if (this.charge > 0) {
      this.charge -= dt;
      if (this.charge <= 0) this._fireRing(game);
    } else {
      this.p2Timer -= dt;
      if (this.p2Timer <= 0) {
        this.charge = this.cfg.telegraph; // rear up...
        audio.play('bossRing');
        this.p2Timer = this.cfg.p2Interval;
      }
    }
  }

  // P3 — keep the HP-gated number of baby spiders alive
  _spawns(dt, game) {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    this.spawnTimer = this.cfg.spawnInterval;

    const tgt = spiderlingTarget(this.hp / this.maxHp);
    if (tgt.max === 0) return;
    const alive = game.enemies.filter((e) => e.isSpiderling && !e.dead).length;
    if (alive >= tgt.min) return;

    for (let i = alive; i < tgt.max; i++) {
      const a = Math.random() * Math.PI * 2;
      const lx = this.x + Math.cos(a) * this.radius * 1.5;
      const lz = this.z + Math.sin(a) * this.radius * 1.5;
      game.particles.burst(lx, lz, 5, PALETTE.blood); // little spawn puff (telegraph)
      const ling = new Enemy(this.scene, 'chaser', lx, lz, this.theme);
      ling.isSpiderling = true;
      ling.mesh.scale.setScalar(0.55);
      ling.radius *= 0.6;
      ling.hp = 1;
      game.addEnemy(ling);
    }
  }

  _animateLegs(rage) {
    const sp = 6 * rage;
    for (const leg of this.legs) {
      const a = Math.sin(this.t * sp + leg.offset) * 0.35;
      leg.thigh.rotation.x = a;
      if (leg.thigh.children[0]) leg.thigh.children[0].rotation.x = -a * 0.8;
    }
  }

  _fireRing(game) {
    this.phase += 0.35;
    const n = this.ringCount;
    for (let i = 0; i < n; i++) {
      const a = this.phase + (i / n) * Math.PI * 2;
      game.bullets.spawnEnemy(this.x, this.z, Math.sin(a), Math.cos(a), this.cfg.ringBulletSpeed);
    }
    game.juice.shake(0.15);
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
