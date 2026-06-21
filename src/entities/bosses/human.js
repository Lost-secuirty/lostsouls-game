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
import { aimedBurst, telegraphedRing } from './patterns.js';

function firePanicRing(boss, game) {
  boss.phase += 0.3;
  const n = boss.ringCount;
  for (let i = 0; i < n; i++) {
    const a = boss.phase + (i / n) * Math.PI * 2;
    game.bullets.spawnEnemy(boss.x, boss.z, Math.sin(a), Math.cos(a), boss.cfg.ringBulletSpeed);
  }
  game.juice.shake(0.16);
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
    telegraphedRing(boss, dt, game, firePanicRing); // P2 — panic spray ring
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
