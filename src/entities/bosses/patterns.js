// =====================================================================
// bosses/patterns.js — shared boss ATTACK primitives.
//
// Every ranged boss repeats the same plumbing for an aimed burst and a
// telegraphed ring; only the DIFFERENCES (ring shape, cadence, wind-up sfx) are
// per-boss. These two helpers hold the shared plumbing so the boss modules stay
// readable AND non-duplicated. (The shared mesh-load and minion-spawn plumbing
// live in core/animModel.js `loadAnimated` and entities/enemies.js `topUpMinions`.)
// =====================================================================

import { normalize, spreadDirs } from '../../core/math2d.js';
import * as audio from '../../systems/audio.js';

/**
 * Spawn one enemy bullet per ANGLE from the boss (game convention: a bullet's
 * direction is (sin a, cos a)), then an optional screen `shake`. Pairs with the
 * pure pattern generators in emitters.js so a boss's ring/spray is a one-liner.
 */
export function fireAngles(boss, game, angles, speed, shake = 0) {
  for (const a of angles) {
    game.bullets.spawnEnemy(boss.x, boss.z, Math.sin(a), Math.cos(a), speed);
  }
  if (shake) game.juice.addTrauma(shake);
}

/**
 * P1 — aimed burst: a `spreadDirs` volley at the nearest player, on `boss.p1Timer`.
 * Uses cfg.p1Burst / p1Spread / p1BulletSpeed / p1Interval (sped up by `rage`).
 */
export function aimedBurst(boss, dt, game, p, rage) {
  boss.p1Timer -= dt;
  if (boss.p1Timer > 0) return;
  const cfg = boss.cfg;
  const aim = normalize(p.x - boss.x, p.z - boss.z);
  for (const d of spreadDirs(aim.x, aim.z, cfg.p1Burst, cfg.p1Spread)) {
    game.bullets.spawnEnemy(boss.x, boss.z, d.x, d.z, cfg.p1BulletSpeed);
  }
  audio.play('bossShoot');
  boss.p1Timer = cfg.p1Interval / rage;
}

/**
 * P2 — telegraphed ring: rear up for cfg.telegraph (the shell puffs the scale),
 * then call `fire(boss, game)` to launch the ring; repeats on `boss.p2Timer`.
 * The boss supplies the ring SHAPE via `fire` and (optionally) the wind-up `sfx`.
 */
export function telegraphedRing(boss, dt, game, fire, sfx = 'bossRing') {
  if (boss.charge > 0) {
    boss.charge -= dt;
    if (boss.charge <= 0) {
      boss.charge = 0;
      fire(boss, game);
    }
    return;
  }
  boss.p2Timer -= dt;
  if (boss.p2Timer <= 0) {
    boss.charge = boss.cfg.telegraph; // rear up (fair warning)
    audio.play(sfx);
    boss.p2Timer = boss.cfg.p2Interval;
  }
}
