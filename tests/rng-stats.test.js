import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { chiSquareUniform, ksUniform, runsZ, serialCorrelation } from './helpers/stats.js';

// Statistical battery for makeRng (mulberry32). These prove the PRNG is
// actually uniform and independent — not just "seems random". Seeded stream
// = deterministic, so these never flake.
//
// Ported from the rng-stats harness in Lost-secuirty/Demo-math-slot-test-only.

const SEED = 2026;
function stream(seed) {
  const r = makeRng(seed);
  return () => r.next();
}

describe('makeRng — randomness battery (uniformity + independence)', () => {
  it('chi-square frequency test passes (k=10, dof=9, crit 16.919)', () => {
    expect(chiSquareUniform(stream(SEED), 100_000, 10)).toBeLessThan(16.919);
  });

  it('Kolmogorov-Smirnov uniformity test passes', () => {
    const n = 10_000;
    expect(ksUniform(stream(SEED), n)).toBeLessThan(1.36 / Math.sqrt(n));
  });

  it('runs test shows no clustering (|Z| < 1.96)', () => {
    expect(Math.abs(runsZ(stream(SEED), 100_000))).toBeLessThan(1.96);
  });

  it('lag-1 serial correlation is ~0 (|r| < 3/sqrt(n))', () => {
    const n = 100_000;
    expect(Math.abs(serialCorrelation(stream(SEED), n))).toBeLessThan(3 / Math.sqrt(n));
  });
});
