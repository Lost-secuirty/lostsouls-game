import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { resolveDecision, _internals } from '../src/systems/npcDecision.js';

const GOOD = new Set(_internals.GOOD_EFFECTS.map((e) => e.effect));
const BAD = new Set(_internals.BAD_EFFECTS.map((e) => e.effect));

describe('resolveDecision', () => {
  it('is deterministic for a given seed + choice', () => {
    const a = resolveDecision(makeRng(2026), 'HELP');
    const b = resolveDecision(makeRng(2026), 'HELP');
    expect(a).toEqual(b);
  });

  it('always returns a well-formed outcome', () => {
    for (let seed = 0; seed < 200; seed++) {
      for (const choice of ['HELP', 'LEAVE']) {
        const r = resolveDecision(makeRng(seed), choice);
        expect(typeof r.good).toBe('boolean');
        expect(typeof r.message).toBe('string');
        expect(r.choice).toBe(choice);
        if (r.good) expect(GOOD.has(r.effect)).toBe(true);
        else expect(BAD.has(r.effect)).toBe(true);
      }
    }
  });

  it('BOTH choices can turn out good AND bad (you never know)', () => {
    const seen = {
      HELP: { good: false, bad: false },
      LEAVE: { good: false, bad: false },
    };
    for (let seed = 0; seed < 300; seed++) {
      for (const choice of ['HELP', 'LEAVE']) {
        const r = resolveDecision(makeRng(seed), choice);
        if (r.good) seen[choice].good = true;
        else seen[choice].bad = true;
      }
    }
    expect(seen.HELP.good).toBe(true);
    expect(seen.HELP.bad).toBe(true);
    expect(seen.LEAVE.good).toBe(true);
    expect(seen.LEAVE.bad).toBe(true);
  });
});
