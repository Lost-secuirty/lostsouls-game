import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { resolveHuman, _internals } from '../src/systems/humanDecision.js';

// The human decision-boss outcome is seeded (ADR-0013): reproducible + testable,
// and the chosen LABEL never tells you whether it's right (that's pure rng).
describe('resolveHuman (human decision-boss pre-fight outcome)', () => {
  it('is deterministic for a given seed', () => {
    const a = makeRng(2026);
    const b = makeRng(2026);
    for (let i = 0; i < 20; i++) {
      expect(resolveHuman(a, 'A')).toEqual(resolveHuman(b, 'A'));
    }
  });

  it('skipFight always mirrors right, and the choice round-trips', () => {
    const rng = makeRng(7);
    for (const c of _internals.choices) {
      const o = resolveHuman(rng, c);
      expect(o.choice).toBe(c);
      expect(o.skipFight).toBe(o.right);
      expect(typeof o.message).toBe('string');
    }
  });

  it('the same choice comes out BOTH right and wrong across seeds (label is no tell)', () => {
    let rights = 0;
    let wrongs = 0;
    for (let s = 0; s < 50; s++) {
      if (resolveHuman(makeRng(s), 'A').right) rights++;
      else wrongs++;
    }
    expect(rights).toBeGreaterThan(0);
    expect(wrongs).toBeGreaterThan(0);
  });

  it('right outcomes land near rightChance over many seeded rolls (±3%)', () => {
    const N = 4000;
    const rng = makeRng(99);
    let rights = 0;
    for (let i = 0; i < N; i++) if (resolveHuman(rng, 'A').right) rights++;
    expect(Math.abs(rights / N - _internals.rightChance)).toBeLessThan(0.03);
  });
});
