import { describe, it, expect } from 'vitest';
import { statBonus, floorScale } from '../src/core/scaling.js';
import { UPGRADES, DIFFICULTY } from '../src/config.js';

// Exp7 Stage 2 / ADR-0022 — the balance curves. Pure functions, golden-value tests
// so the "feel math" can't silently drift.

describe('statBonus (diminishing-returns upgrade curve)', () => {
  it('is zero at zero stacks (and for negative)', () => {
    expect(statBonus(0, 1, 5)).toBe(0);
    expect(statBonus(-3, 1, 5)).toBe(0);
  });

  it('degrades safely on a mis-tuned half<=0 (asymptote, never Infinity / negative)', () => {
    expect(statBonus(3, 1.0, 0)).toBe(1.0); // not 0/0 NaN or a hard step surprise
    expect(statBonus(3, 1.0, -5)).toBe(1.0); // not Infinity / negative debuff
    expect(statBonus(0, 1.0, 0)).toBe(0); // no stacks, no bonus
  });

  it('reaches exactly HALF of maxBonus at `half` stacks (the knee)', () => {
    expect(statBonus(5, 1.0, 5)).toBeCloseTo(0.5);
    expect(statBonus(6, 0.6, 6)).toBeCloseTo(0.3);
  });

  it('is strictly increasing but always below maxBonus (no hard wall)', () => {
    let prev = -1;
    for (let n = 0; n <= 50; n++) {
      const b = statBonus(n, 1.0, 5);
      expect(b).toBeGreaterThan(prev);
      expect(b).toBeLessThan(1.0);
      prev = b;
    }
  });

  it('approaches maxBonus for very large stacks', () => {
    expect(statBonus(1000, 1.0, 5)).toBeGreaterThan(0.99);
  });

  it("fixes 'caps in 3': at 3 stacks it is well under the old +50% hard cap, then keeps growing", () => {
    const at3 = statBonus(3, 1.0, 5); // 3/8 = 0.375
    const at12 = statBonus(12, 1.0, 5); // 12/17 ≈ 0.706
    expect(at3).toBeCloseTo(0.375);
    expect(at12).toBeGreaterThan(at3); // still meaningfully growing past the old cap
  });
});

describe('floorScale (difficulty curve)', () => {
  it('returns base at floor 0 and clamps negatives to 0', () => {
    expect(floorScale(0, { base: 1, growth: 0.26 })).toBeCloseTo(1);
    expect(floorScale(-2, { base: 1.4, growth: 0.26 })).toBeCloseTo(1.4);
  });

  it('grows by exactly (1+growth) per floor', () => {
    const p = { base: 1, growth: 0.26 };
    for (let i = 0; i < 6; i++) {
      expect(floorScale(i + 1, p) / floorScale(i, p)).toBeCloseTo(1.26);
    }
  });

  it('the shipped DIFFICULTY makes a non-decreasing, genuinely rising ramp', () => {
    const diffs = [0, 1, 2, 3, 4].map((i) => floorScale(i, DIFFICULTY));
    for (let i = 1; i < diffs.length; i++) expect(diffs[i]).toBeGreaterThan(diffs[i - 1]);
    expect(diffs[4]).toBeGreaterThan(diffs[0] * 2); // finale clearly harder than floor 0
  });
});

describe('UPGRADES config shape', () => {
  it('every stat has a positive maxBonus and half', () => {
    for (const k of ['damage', 'fireRate', 'speed']) {
      expect(UPGRADES[k].maxBonus).toBeGreaterThan(0);
      expect(UPGRADES[k].half).toBeGreaterThan(0);
    }
  });
});
