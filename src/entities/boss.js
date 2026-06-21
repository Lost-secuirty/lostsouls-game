// =====================================================================
// boss.js — the generic BOSS shell. Data-driven: a `bossType` selects a
// behavior module (entities/bosses/*) and a stat block (config.BOSS[type]).
//
// The shell owns the shared parts every boss needs — HP, movement, contact
// damage, the telegraph "puff up" scale, hurt/die — and delegates the unique
// parts to the behavior: buildMesh / init / move? / attacks / spawns / animate.
// (P# = an ATTACK PATTERN, not a health phase — the co-designer's card.)
//
// Conforms to the bullet/collision interface (x, z, radius, hp, dead, hurt(),
// die(), update()) so pooled-bullet collision works on bosses with no special
// casing.
// =====================================================================

import { BOSS, PALETTE, PARTICLES, DUO } from '../config.js';
import { BEHAVIORS } from './bosses/index.js';
import { slideOutOfWalls, clampToArena } from '../systems/collision.js';
import { normalize, circleVsCircle } from '../core/math2d.js';
import * as audio from '../systems/audio.js';

export class Boss {
  constructor(scene, x, z, bossType = 'spider', diff = 1, palette = null) {
    this.scene = scene;
    this.isBoss = true;
    this.bossType = bossType;
    this.behavior = BEHAVIORS[bossType] || BEHAVIORS.spider;
    this.cfg = BOSS[bossType] || BOSS.spider;
    this.name = this.behavior.name;
    this.palette = palette; // per-floor colors (shared with this boss's minions)
    this.theme = { boss: bossType, palette };
    this.diff = diff;
    this.x = x;
    this.z = z;
    this.radius = this.cfg.radius;
    this.maxHp = Math.round(this.cfg.hp * diff);
    this.hp = this.maxHp;
    this.speed = this.cfg.speed * (0.9 + diff * 0.1);
    this.dead = false;
    this.contactTimer = 0;
    this.charge = 0; // >0 while telegraphing (drives the puff-up scale)
    this.phase = 0;
    this.t = 0;
    this.enraged = false; // duo: set when a partner falls (no revive)
    this.enrageMul = 1; // permanent rage bump folded into `rage` once enraged

    this.behavior.init?.(this);

    const built = this.behavior.buildMesh(this, palette);
    this.mesh = built.mesh;
    this.legs = built.legs || []; // spider leg joints (procedural animate)
    this.cap = built.cap || null; // mushroom procedural cap (pulsed in animate)
    this.anim = built.anim || null; // animated GLB model (plays its own clip)
    this.mesh.position.set(x, 0, z);
    scene.add(this.mesh);
    audio.play(this.behavior.roar || 'bossRoar');
  }

  /** speeds up as it weakens (50%/25% gates), then again if enraged — every boss */
  get rage() {
    const f = this.hp / this.maxHp;
    const base = f <= 0.25 ? 1.5 : f <= 0.5 ? 1.2 : 1;
    return base * this.enrageMul;
  }

  /** duo: this beast's partner fell — rage permanently and fight solo (no revive) */
  onPartnerDown(mul = DUO.enrageMul) {
    if (this.dead) return;
    this.enraged = true;
    this.enrageMul = mul;
    this.mesh.scale.setScalar(DUO.enrageScale); // a visible "I'm angry now" pop
    audio.play('bossRoar');
  }

  update(dt, game) {
    if (this.dead) return;
    const p = game.nearestPlayer(this.x, this.z) || game.player;
    this.t += dt;
    this.contactTimer -= dt;
    const rage = this.rage;

    if (this.behavior.move) {
      this.behavior.move(this, dt, game, p, rage);
    } else {
      // default movement: scuttle toward the nearest player
      const dir = normalize(p.x - this.x, p.z - this.z);
      this.x += dir.x * this.speed * rage * dt;
      this.z += dir.z * this.speed * rage * dt;
      let q = slideOutOfWalls(this.x, this.z, this.radius, game.walls);
      q = clampToArena(q.x, q.z, this.radius);
      this.x = q.x;
      this.z = q.z;
      this.mesh.rotation.y = Math.atan2(dir.x, dir.z);
    }

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
      this.behavior.attacks?.(this, dt, game, p, rage);
      this.behavior.spawns?.(this, dt, game);
    }

    this.behavior.animate?.(this, rage);
    this.anim?.update(dt); // advance the GLB animation clip, if any

    // settle the hit-pop / telegraph scale back toward 1 (charge => puff up)
    const target = this.charge > 0 ? 1.25 : 1;
    const s = this.mesh.scale.x;
    this.mesh.scale.setScalar(s + (target - s) * Math.min(1, dt * 12));
    this.mesh.position.set(this.x, 0, this.z);
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
