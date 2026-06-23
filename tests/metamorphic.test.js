import { describe, it, expect } from 'vitest';
import { statBonus, floorScale, marginalBonus } from '../src/core/scaling.js';
import { DIFFICULTY } from '../src/config.js';

// Metamorphic tests — relations the math MUST hold under a transformed input,
// without requiring a known correct output. They catch bugs that make the
// calculation wrong in a systematic way (e.g. using an absolute scale where
// only the relative one should matter).
//
// Pattern ported from Lost-secuirty/Demo-math-slot-test-only (test/metamorphic.test.js).

describe('metamorphic: statBonus is linear in maxBonus', () => {
  // statBonus(n, m, h) = m * n/(n+h) — linear in m.
  // Transform: scale maxBonus by k. Relation: output scales by exactly k.
  // A bug that bakes in a hardcoded scale or uses m² breaks this.
  it('scaling maxBonus by k scales the output by exactly k', () => {
    for (const n of [0, 1, 3, 5, 10, 50]) {
      for (const h of [3, 5, 10]) {
        for (const k of [2, 5, 0.5]) {
          expect(statBonus(n, k, h)).toBeCloseTo(k * statBonus(n, 1, h), 12);
        }
      }
    }
  });

  it('maxBonus=0 always gives 0, regardless of stacks and half', () => {
    for (const n of [0, 1, 10, 100]) {
      expect(statBonus(n, 0, 5)).toBe(0);
    }
  });
});

describe('metamorphic: floorScale ratio is constant across floor transitions', () => {
  // floorScale(f) = base * (1+growth)^f, so the ratio of consecutive floors
  // is always (1+growth) — independent of which floor f is.
  // A table-lookup bug or off-by-one in the exponent breaks this.
  it('consecutive-floor ratio equals 1+growth for any base and growth value', () => {
    for (const growth of [0.1, 0.26, 0.5, 1.0]) {
      const params = { base: 1, growth };
      for (let f = 0; f < 6; f++) {
        const ratio = floorScale(f + 1, params) / floorScale(f, params);
        expect(ratio, `growth=${growth} f=${f}`).toBeCloseTo(1 + growth, 10);
      }
    }
  });

  it('ratio invariant holds for the shipped DIFFICULTY config', () => {
    const expectedRatio = 1 + DIFFICULTY.growth;
    for (let f = 0; f < 5; f++) {
      expect(floorScale(f + 1, DIFFICULTY) / floorScale(f, DIFFICULTY)).toBeCloseTo(
        expectedRatio,
        10,
      );
    }
  });
});

describe('metamorphic: marginalBonus telescopes to statBonus (sum invariant)', () => {
  // Sum of marginalBonus(1..N, m, h) must equal statBonus(N, m, h) for all N and h.
  // A rounding or off-by-one bug in marginalBonus breaks this relation.
  // Extends the single-param regression in scaling.test.js to a broader parameter sweep.
  it('partial sums of marginals match total statBonus for varying N and half', () => {
    for (const n of [1, 5, 10, 25]) {
      for (const h of [3, 5, 8]) {
        let sum = 0;
        for (let i = 1; i <= n; i++) sum += marginalBonus(i, 1.0, h);
        expect(sum, `n=${n} h=${h}`).toBeCloseTo(statBonus(n, 1.0, h), 10);
      }
    }
  });
});
