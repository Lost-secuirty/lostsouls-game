// =====================================================================
// bosses/human.js — THE SURVIVOR 🚪, the human decision-boss (Expansion 6 Stage 5).
//
// You only reach this fight on a WRONG pre-fight read (systems/humanDecision.js);
// a right read skips it. Once he panics he fights like a cornered person:
//   P1 — panicked pistol bursts (aimedBurst)
//   P2 — a telegraphed "panic spray" ring (telegraphedRing)
//   P3 — rallies armed survivors to his side (HP-gated, humanRallyTarget)
// Reuses the shared boss primitives so it adds no new duplication; uses the shell
// default chase for movement. All feel-numbers live in config.BOSS.human.
// =====================================================================

import { PALETTE } from '../../config.js';
import { loadAnimated } from '../../core/animModel.js';
import { makeCharacter } from '../characterMesh.js';
import { humanRallyTarget } from '../../core/progression.js';
import { topUpMinions } from '../enemies.js';
import { aimedBurst, telegraphedRing, fireAngles } from './patterns.js';
import { nWay } from './emitters.js';

// P2 signature: a panicked SPRAY — a wide aimed cone at you (not a tidy ring like
// the spider's). Frantic, but you dodge it by strafing sideways. Distinct + fits
// "a cornered person emptying the magazine in your direction."
function firePanicSpray(boss, game) {
  const p = game.nearestPlayer(boss.x, boss.z);
  if (!p) return;
  const base = Math.atan2(p.x - boss.x, p.z - boss.z); // game convention: dir=(sin,cos)
  const spread = (boss.cfg.p2SprayDeg * Math.PI) / 180;
  fireAngles(boss, game, nWay(base, boss.ringCount, spread), boss.cfg.ringBulletSpeed, 0.16);
}

export const human = {
  name: 'The Survivor',
  roar: 'bossRoar',

  buildMesh(boss, palette) {
    const a = loadAnimated('human', boss.radius * 2.6);
    if (a) return { mesh: a.wrap, anim: a.anim };
    // procedural fallback (ADR-0004): a humanoid capsule, no static model re-fetch
    const group = makeCharacter(null, {
      radius: boss.radius * 0.55,
      height: boss.radius * 2,
      color: palette?.body ?? PALETTE.npc,
    });
    return { mesh: group };
  },

  init(boss) {
    boss.p1Timer = boss.cfg.p1Interval;
    boss.p2Timer = boss.cfg.p2Interval;
    boss.spawnTimer = boss.cfg.spawnInterval;
    boss.ringCount = Math.round(boss.cfg.ringBullets * boss.diff);
  },

  attacks(boss, dt, game, p, rage) {
    aimedBurst(boss, dt, game, p, rage); // P1 — panicked pistol bursts
    telegraphedRing(boss, dt, game, firePanicSpray); // P2 — aimed panic spray (cone)
  },

  // P3 — rally armed survivors (HP-gated; tougher minions, so fewer of them)
  spawns(boss, dt, game) {
    boss.spawnTimer -= dt;
    if (boss.spawnTimer > 0) return;
    boss.spawnTimer = boss.cfg.spawnInterval;
    topUpMinions(boss, game, humanRallyTarget(boss.hp / boss.maxHp), 'isThug', {
      dist: boss.cfg.spawnDist,
      scale: boss.cfg.minionScale,
      hp: boss.cfg.minionHp,
      puff: boss.palette?.eye ?? PALETTE.npc,
    });
  },
};
