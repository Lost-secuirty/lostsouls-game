// =====================================================================
// bosses/mushroom.js — the MUSHROOM boss behavior 🍄 (Caden's pick).
//
//   P1 — spore spit: a slow, fat aimed cone (reads as drifting gas).
//   P2 — spore ring: telegraphed, with a guaranteed seeded dodge GAP.
//   P3 — poison pools: telegraphed lingering ground zones at your feet
//        (systems/hazards.js).
//   P4 — puffball spawns: HP-gated (puffballTarget); each pops into a small
//        poison pool when it dies.
// Same conventions as the spider (telegraph via the shell's `charge` scale,
// seeded RNG so rings/spawns/gaps stay reproducible).
// =====================================================================

import { buildMushroomMesh } from '../mushroomMesh.js';
import { loadAnimated } from '../../core/animModel.js';
import { puffballTarget } from '../../core/progression.js';
import { Enemy } from '../enemies.js';
import { normalize, spreadDirs } from '../../core/math2d.js';
import * as audio from '../../systems/audio.js';

function fireSporeRing(boss, game) {
  boss.phase += 0.3;
  const n = boss.ringCount;
  const gapStart = game.rng.int(n); // seeded dodge lane (deterministic, testable)
  const gapW = boss.cfg.ringGap;
  for (let i = 0; i < n; i++) {
    let inGap = false;
    for (let g = 0; g < gapW; g++) {
      if ((gapStart + g) % n === i) {
        inGap = true;
        break;
      }
    }
    if (inGap) continue;
    const a = boss.phase + (i / n) * Math.PI * 2;
    game.bullets.spawnEnemy(boss.x, boss.z, Math.sin(a), Math.cos(a), boss.cfg.ringBulletSpeed);
  }
  game.juice.shake(0.15);
}

export const mushroom = {
  name: 'The Mushroom King',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    const a = loadAnimated('mushroom', boss.radius * 3); // imposing "King"
    if (a) return { mesh: a.wrap, anim: a.anim };
    const built = buildMushroomMesh(boss.radius, palette || {});
    return { mesh: built.group, cap: built.cap };
  },

  init(boss) {
    boss.p1Timer = boss.cfg.p1Interval;
    boss.p2Timer = boss.cfg.p2Interval;
    boss.poolTimer = boss.cfg.poolInterval;
    boss.spawnTimer = boss.cfg.spawnInterval;
    boss.ringCount = Math.round(boss.cfg.ringBullets * boss.diff);
  },

  attacks(boss, dt, game, p, rage) {
    const cfg = boss.cfg;

    // P1 — slow spore spit
    boss.p1Timer -= dt;
    if (boss.p1Timer <= 0) {
      const aim = normalize(p.x - boss.x, p.z - boss.z);
      for (const d of spreadDirs(aim.x, aim.z, cfg.p1Burst, cfg.p1Spread)) {
        game.bullets.spawnEnemy(boss.x, boss.z, d.x, d.z, cfg.p1BulletSpeed);
      }
      audio.play('bossShoot');
      boss.p1Timer = cfg.p1Interval / rage;
    }

    // P2 — telegraphed spore ring with a guaranteed gap
    if (boss.charge > 0) {
      boss.charge -= dt;
      if (boss.charge <= 0) fireSporeRing(boss, game);
    } else {
      boss.p2Timer -= dt;
      if (boss.p2Timer <= 0) {
        boss.charge = cfg.telegraph;
        audio.play('bossRing');
        boss.p2Timer = cfg.p2Interval;
      }
    }

    // P3 — drop a lingering poison pool at a player's feet (the pool telegraphs itself)
    boss.poolTimer -= dt;
    if (boss.poolTimer <= 0) {
      boss.poolTimer = cfg.poolInterval / rage;
      const tp = game.nearestPlayer(boss.x, boss.z) || p;
      if (tp && tp.alive) {
        game.hazards.spawn(tp.x, tp.z, {
          radius: cfg.poolRadius,
          warnTime: cfg.poolWarn,
          liveTime: cfg.poolLive,
          damage: cfg.poolDamage,
        });
      }
    }
  },

  // P4 — keep the HP-gated number of puffballs alive (pop into a pool on death)
  spawns(boss, dt, game) {
    boss.spawnTimer -= dt;
    if (boss.spawnTimer > 0) return;
    boss.spawnTimer = boss.cfg.spawnInterval;

    const tgt = puffballTarget(boss.hp / boss.maxHp);
    if (tgt.max === 0) return;
    const alive = game.enemies.filter((e) => e.isPuffball && !e.dead).length;
    if (alive >= tgt.min) return;

    for (let i = alive; i < tgt.max; i++) {
      const a = game.rng.next() * Math.PI * 2;
      const lx = boss.x + Math.cos(a) * boss.radius * 1.5;
      const lz = boss.z + Math.sin(a) * boss.radius * 1.5;
      game.particles.burst(lx, lz, 5, 0x7aa030); // spore-green puff (telegraph)
      const pf = new Enemy(boss.scene, 'chaser', lx, lz, boss.theme);
      pf.isPuffball = true;
      pf.mesh.scale.setScalar(0.55);
      pf.radius *= 0.6;
      pf.hp = 1;
      // pop into a small poison pool where it dies
      pf.onDeath = (e, g) =>
        g.hazards.spawn(e.x, e.z, {
          radius: boss.cfg.puffPoolRadius,
          warnTime: 0.4,
          liveTime: boss.cfg.poolLive,
          damage: boss.cfg.poolDamage,
        });
      game.addEnemy(pf);
    }
  },

  animate(boss) {
    // breathe the cap (procedural mesh only; the GLB plays its own Walk clip)
    if (boss.cap) {
      const e = Math.sin(boss.t * 3) * 0.06;
      boss.cap.scale.set(1 + e, 1 - e * 0.5, 1 + e);
    }
  },
};
