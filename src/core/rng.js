// =====================================================================
// rng.js — a seeded random number generator (PURE: no imports).
//
// Why seeded? So "random" things can be reproduced and TESTED. Give it the
// same seed and it always produces the same sequence of numbers. That's how
// the survivor good/bad outcomes can be both random AND unit-tested.
//
// Algorithm: mulberry32 — tiny, fast, good enough for a game.
// =====================================================================

/**
 * Make a random generator from a numeric seed.
 * @param {number} seed
 * @returns {{ next: () => number, int: (n:number)=>number, range:(a:number,b:number)=>number, pick:(arr:any[])=>any, chance:(p:number)=>boolean }}
 */
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;

  // returns a float in [0, 1)
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    /** integer in [0, n) */
    int: (n) => Math.floor(next() * n),
    /** float in [a, b) */
    range: (lo, hi) => lo + next() * (hi - lo),
    /** random element of an array */
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    /** true with probability p (0..1) */
    chance: (p) => next() < p,
  };
}
