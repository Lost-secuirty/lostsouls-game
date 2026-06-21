// =====================================================================
// bosses/skeleton.js — RATTLEBONES 💀, the skeleton boss (Expansion 6 Stage 4).
//
//   P1 — bone throw: a quick aimed volley of bone bolts.
//   P2 — scatter ring: a rattle wind-up, then a ring of bones at seeded
//        jittered angles (the "scatter" — still has gaps to slip through).
//   P3 — reassemble & relocate: it COLLAPSES (invulnerable + intangible),
//        vanishes for a beat (your free breather), then reforms far from you.
//   P4 — boneling summons: HP-gated (skeletonWaveTarget(); the summoner raises
//        a bigger wave than the spider/mushroom as it weakens).
//
// All feel-numbers live in config.BOSS.skeleton (data-driven, ADR-0014); the
// i-frame flag (boss.invuln) is handled by the generic Boss shell.
// =====================================================================

import * as THREE from 'three';
import { ARENA } from '../../config.js';
import { getAnimated } from '../../core/assets.js';
import { AnimModel } from '../../core/animModel.js';
import { buildSkeletonMesh } from '../skeletonMesh.js';
import { skeletonWaveTarget } from '../../core/progression.js';
import { Enemy } from '../enemies.js';
import { normalize, spreadDirs } from '../../core/math2d.js';
import { slideOutOfWalls, clampToArena } from '../../systems/collision.js';
import * as audio from '../../systems/audio.js';

const POOF = 18; // particle puff on vanish/reform (cosmetic, like other death/spawn puffs)

function fireScatterRing(boss, game) {
  boss.phase += 0.3;
  const n = boss.ringCount;
  const j = boss.cfg.scatterJitter;
  for (let i = 0; i < n; i++) {
    // even ring + a seeded per-bone jitter = a "scatter" (deterministic/testable)
    const a = boss.phase + (i / n) * Math.PI * 2 + (game.rng.next() * 2 - 1) * j;
    game.bullets.spawnEnemy(boss.x, boss.z, Math.sin(a), Math.cos(a), boss.cfg.ringBulletSpeed);
  }
  game.juice.shake(0.18);
}

/** pick a relocate spot far from every living player (seeded; honors teleportMargin) */
function teleportSpot(boss, game) {
  const hw = ARENA.width / 2 - 3;
  const hd = ARENA.depth / 2 - 3;
  let best = { x: 0, z: -hd };
  let bestD = -1;
  for (let t = 0; t < 8; t++) {
    const x = game.rng.range(-hw, hw);
    const z = game.rng.range(-hd, hd);
    let minD = Infinity;
    for (const pl of game.players) {
      if (!pl.alive) continue;
      minD = Math.min(minD, Math.hypot(pl.x - x, pl.z - z));
    }
    if (minD > bestD) {
      bestD = minD;
      best = { x, z };
    }
    if (minD >= boss.cfg.teleportMargin) break; // far enough, stop early
  }
  return clampToArena(best.x, best.z, boss.radius);
}

export const skeleton = {
  name: 'Rattlebones',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    const m = getAnimated('skeleton');
    if (m) {
      const anim = new AnimModel(m.scene, m.clips).fitTo(boss.radius * 2.6);
      anim.play('Walk');
      const wrap = new THREE.Group(); // base-1 wrapper (hit-pop / telegraph scale)
      wrap.add(anim.group);
      return { mesh: wrap, anim };
    }
    const built = buildSkeletonMesh(boss.radius, palette || {});
    boss.skull = built.skull;
    return { mesh: built.group };
  },

  init(boss) {
    boss.p1Timer = boss.cfg.p1Interval;
    boss.p2Timer = boss.cfg.p2Interval;
    boss.spawnTimer = boss.cfg.spawnInterval;
    boss.reassembleTimer = boss.cfg.reassembleInterval;
    boss.ringCount = Math.round(boss.cfg.ringBullets * boss.diff);
    boss._reassembling = false;
  },

  // scuttle toward the player, but periodically pull the disappear-and-reform trick
  move(boss, dt, game, p, rage) {
    const cfg = boss.cfg;

    // mid-reassemble: stand gone & intangible, count down, then reform far away
    if (boss._reassembling) {
      boss.reassembleTimer -= dt;
      if (boss.reassembleTimer <= 0) {
        const spot = teleportSpot(boss, game);
        boss.x = spot.x;
        boss.z = spot.z;
        boss._reassembling = false;
        boss.invuln = false;
        boss.mesh.visible = true;
        game.particles.burst(boss.x, boss.z, POOF, boss.palette?.eye ?? 0x9bff6a);
        audio.play('bossRoar');
        boss.reassembleTimer = cfg.reassembleInterval;
      }
      return;
    }

    const dir = normalize(p.x - boss.x, p.z - boss.z);
    boss.x += dir.x * boss.speed * rage * dt;
    boss.z += dir.z * boss.speed * rage * dt;
    let q = slideOutOfWalls(boss.x, boss.z, boss.radius, game.walls);
    q = clampToArena(q.x, q.z, boss.radius);
    boss.x = q.x;
    boss.z = q.z;
    boss.mesh.rotation.y = Math.atan2(dir.x, dir.z);

    boss.reassembleTimer -= dt;
    if (boss.reassembleTimer <= 0) {
      boss._reassembling = true;
      boss.invuln = true; // i-frames + intangible (shell handles both)
      boss.mesh.visible = false;
      game.particles.burst(boss.x, boss.z, POOF, boss.palette?.eye ?? 0x9bff6a);
      audio.play('bossRattle');
      boss.reassembleTimer = cfg.reassembleTime; // gone for this long (your breather)
    }
  },

  attacks(boss, dt, game, p, rage) {
    if (boss._reassembling) return; // it's gone — no attacks while reforming
    const cfg = boss.cfg;

    // P1 — aimed bone-bolt volley
    boss.p1Timer -= dt;
    if (boss.p1Timer <= 0) {
      const aim = normalize(p.x - boss.x, p.z - boss.z);
      for (const d of spreadDirs(aim.x, aim.z, cfg.p1Burst, cfg.p1Spread)) {
        game.bullets.spawnEnemy(boss.x, boss.z, d.x, d.z, cfg.p1BulletSpeed);
      }
      audio.play('bossShoot');
      boss.p1Timer = cfg.p1Interval / rage;
    }

    // P2 — scatter ring with a rattle wind-up
    if (boss.charge > 0) {
      boss.charge -= dt;
      if (boss.charge <= 0) {
        boss.charge = 0;
        fireScatterRing(boss, game);
      }
    } else {
      boss.p2Timer -= dt;
      if (boss.p2Timer <= 0) {
        boss.charge = cfg.telegraph;
        audio.play('bossRattle');
        boss.p2Timer = cfg.p2Interval;
      }
    }
  },

  // P4 — keep the HP-gated number of bonelings alive
  spawns(boss, dt, game) {
    if (boss._reassembling) return;
    boss.spawnTimer -= dt;
    if (boss.spawnTimer > 0) return;
    boss.spawnTimer = boss.cfg.spawnInterval;

    const tgt = skeletonWaveTarget(boss.hp / boss.maxHp);
    if (tgt.max === 0) return;
    const alive = game.enemies.filter((e) => e.isBoneling && !e.dead).length;
    if (alive >= tgt.min) return;

    for (let i = alive; i < tgt.max; i++) {
      const a = game.rng.next() * Math.PI * 2; // seeded (ADR-0013)
      const lx = boss.x + Math.cos(a) * boss.radius * boss.cfg.spawnDist;
      const lz = boss.z + Math.sin(a) * boss.radius * boss.cfg.spawnDist;
      game.particles.burst(lx, lz, 5, boss.palette?.eye ?? 0x9bff6a); // bone-rise puff
      const b = new Enemy(boss.scene, 'chaser', lx, lz, boss.theme);
      b.isBoneling = true;
      b.mesh.scale.setScalar(boss.cfg.bonelingScale);
      b.radius *= 0.6;
      b.hp = boss.cfg.bonelingHp;
      game.addEnemy(b);
    }
  },

  animate(boss) {
    if (boss.skull) boss.skull.rotation.z = Math.sin(boss.t * 4) * 0.08; // skull sway (fallback)
  },
};
