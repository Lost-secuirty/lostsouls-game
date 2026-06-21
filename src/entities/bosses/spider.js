// =====================================================================
// bosses/spider.js — the SPIDER boss behavior. 🕷️
//
// A behavior module (see boss.js): the generic Boss shell calls these hooks.
//   P1 — aimed burst (pistol mimic)
//   P2 — telegraphed bullet ring (denser on later floors)
//   P3 — HP-gated baby-spider spawns (spiderlingTarget)
// Extracted verbatim from the original boss.js so the spider plays identically.
// =====================================================================

import { getModel } from '../../core/assets.js';
import { buildSpiderMesh } from '../spiderMesh.js';
import { spiderlingTarget } from '../../core/progression.js';
import { topUpMinions } from '../enemies.js';
import { normalize, spreadDirs } from '../../core/math2d.js';
import * as audio from '../../systems/audio.js';

function fireRing(boss, game) {
  boss.phase += 0.35;
  const n = boss.ringCount;
  for (let i = 0; i < n; i++) {
    const a = boss.phase + (i / n) * Math.PI * 2;
    game.bullets.spawnEnemy(boss.x, boss.z, Math.sin(a), Math.cos(a), boss.cfg.ringBulletSpeed);
  }
  game.juice.shake(0.15);
}

export const spider = {
  name: 'The Spider',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    const model = getModel('spider');
    if (model) return { mesh: model, legs: [] };
    const built = buildSpiderMesh(boss.radius, palette || {});
    return { mesh: built.group, legs: built.legs };
  },

  init(boss) {
    boss.p1Timer = boss.cfg.p1Interval; // P1 base attack
    boss.p2Timer = boss.cfg.p2Interval; // P2 ring
    boss.spawnTimer = boss.cfg.spawnInterval; // P3
    boss.ringCount = Math.round(boss.cfg.ringBullets * boss.diff); // P2 denser on later floors
  },

  // P1 (aimed burst) + P2 (telegraphed bullet ring)
  attacks(boss, dt, game, p, rage) {
    boss.p1Timer -= dt;
    if (boss.p1Timer <= 0) {
      const aim = normalize(p.x - boss.x, p.z - boss.z);
      for (const d of spreadDirs(aim.x, aim.z, boss.cfg.p1Burst, boss.cfg.p1Spread)) {
        game.bullets.spawnEnemy(boss.x, boss.z, d.x, d.z, boss.cfg.p1BulletSpeed);
      }
      audio.play('bossShoot');
      boss.p1Timer = boss.cfg.p1Interval / rage;
    }

    if (boss.charge > 0) {
      boss.charge -= dt;
      if (boss.charge <= 0) fireRing(boss, game);
    } else {
      boss.p2Timer -= dt;
      if (boss.p2Timer <= 0) {
        boss.charge = boss.cfg.telegraph; // rear up (fair warning)
        audio.play('bossRing');
        boss.p2Timer = boss.cfg.p2Interval;
      }
    }
  },

  // P3 — keep the HP-gated number of baby spiders alive
  spawns(boss, dt, game) {
    boss.spawnTimer -= dt;
    if (boss.spawnTimer > 0) return;
    boss.spawnTimer = boss.cfg.spawnInterval;
    topUpMinions(boss, game, spiderlingTarget(boss.hp / boss.maxHp), 'isSpiderling');
  },

  animate(boss, rage) {
    const sp = 6 * rage;
    for (const leg of boss.legs) {
      const a = Math.sin(boss.t * sp + leg.offset) * 0.35;
      leg.thigh.rotation.x = a;
      if (leg.thigh.children[0]) leg.thigh.children[0].rotation.x = -a * 0.8;
    }
  },
};
