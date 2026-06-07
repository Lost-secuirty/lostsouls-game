// =====================================================================
// npcDecision.js — what happens when you HELP or LEAVE a survivor (PURE).
//
// The whole point (the kid's idea): you walk up to a survivor and choose to
// help them or leave them. EITHER choice can turn out good OR bad — and you
// don't know which until after you choose. It's random... but seeded, so it's
// reproducible and testable.
//
// Right now both choices have the same 50/50 odds (truly "you never know").
// The probabilities live here so they're easy to tune later (e.g. make
// helping slightly safer).
// =====================================================================

// Good things that can happen.
const GOOD_EFFECTS = [
  { effect: 'HEAL', magnitude: 2, message: 'They patch you up! +2 hearts' },
  { effect: 'FIRE_RATE_UP', magnitude: 0.7, message: 'They tune your gun! Faster shots' },
  { effect: 'DAMAGE_UP', magnitude: 1, message: 'They sharpen your aim! +1 damage' },
];

// Bad things that can happen.
const BAD_EFFECTS = [
  { effect: 'TAKE_DAMAGE', magnitude: 1, message: 'It was a trap! -1 heart' },
  { effect: 'SPAWN_ENEMIES', magnitude: 2, message: 'They lured monsters in!' },
];

// Odds that a given choice turns out GOOD. (0.5 = a coin flip either way.)
const GOOD_CHANCE = {
  HELP: 0.5,
  LEAVE: 0.5,
};

/**
 * Resolve a survivor interaction. PURE — give it a seeded rng and a choice.
 * @param {{next:()=>number, chance:(p:number)=>boolean, pick:(a:any[])=>any}} rng
 * @param {'HELP'|'LEAVE'} choice
 * @returns {{good:boolean, effect:string, magnitude:number, message:string, choice:string}}
 */
export function resolveDecision(rng, choice) {
  const goodChance = GOOD_CHANCE[choice] ?? 0.5;
  const good = rng.chance(goodChance);
  const pool = good ? GOOD_EFFECTS : BAD_EFFECTS;
  const picked = rng.pick(pool);
  return {
    good,
    effect: picked.effect,
    magnitude: picked.magnitude,
    message: picked.message,
    choice,
  };
}

// Exported for tests/tuning visibility.
export const _internals = { GOOD_EFFECTS, BAD_EFFECTS, GOOD_CHANCE };
