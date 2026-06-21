// =====================================================================
// humanDecision.js — the HUMAN decision-boss pre-fight outcome (PURE).
//
// A nervous survivor blocks the gate; before the fight you pick how to approach
// (A/B/C/D — config.HUMAN_BOSS.labels). EITHER way the read is a gamble: a
// "right" read (HUMAN_BOSS.rightChance) means he lets you pass — you SKIP the
// fight and still get the weapon slot; a "wrong" read means he panics and you
// fight him for it. Seeded (game.rng) so it's reproducible and unit-testable —
// same shape as systems/npcDecision.js. The labels are flavor only: which choice
// is "right" is never tied to the label, so it can't be memorized.
// =====================================================================

import { HUMAN_BOSS } from '../config.js';

/**
 * Resolve the pre-fight choice. PURE — give it a seeded rng and the chosen key.
 * Consumes exactly one rng.chance() (ADR-0013 ordering stays stable).
 * @param {{chance:(p:number)=>boolean}} rng
 * @param {string} choice one of HUMAN_BOSS.choices ('A'|'B'|'C'|'D')
 * @returns {{right:boolean, skipFight:boolean, choice:string, message:string}}
 */
export function resolveHuman(rng, choice) {
  const right = rng.chance(HUMAN_BOSS.rightChance);
  return {
    right,
    skipFight: right,
    choice,
    message: right ? HUMAN_BOSS.winLine : HUMAN_BOSS.loseLine,
  };
}

// Exported for tests / tuning visibility.
export const _internals = { rightChance: HUMAN_BOSS.rightChance, choices: HUMAN_BOSS.choices };
