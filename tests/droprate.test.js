import { describe, it, expect } from 'vitest';
import { atLeastOne, chiSquare } from '../src/core/probability.js';
import { makeRng } from '../src/core/rng.js';
import { dropRandomPickup } from '../src/entities/pickups.js';
import { PICKUPS } from '../src/config.js';

const WEAPONS = ['SHOTGUN', 'MACHINEGUN', 'ROCKET'];

describe('probability helpers', () => {
  it('atLeastOne combines independent chances (1 - ∏(1-p))', () => {
    expect(atLeastOne([0.5, 0.5])).toBeCloseTo(0.75);
    expect(atLeastOne([1])).toBe(1);
    expect(atLeastOne([0, 0])).toBe(0);
    expect(atLeastOne([0.77])).toBeCloseTo(0.77); // the Dokkan EX-SA example
  });

  it('chiSquare is 0 for a perfect fit and grows with deviation', () => {
    expect(chiSquare([10, 10], [10, 10])).toBe(0);
    expect(chiSquare([20, 0], [10, 10])).toBeGreaterThan(10);
  });
});

describe('pickup drop table fairness (seeded, deterministic)', () => {
  it('observed drop rates match the configured weights', () => {
    const rng = makeRng(12345);
    const N = 20000;
    const table = PICKUPS.dropTable;
    const total = table.reduce((s, e) => s + e.weight, 0);

    const counts = {};
    for (const e of table) counts[e.type] = 0;
    for (let i = 0; i < N; i++) counts[dropRandomPickup(rng, false)]++;

    const observed = table.map((e) => counts[e.type]);
    const expected = table.map((e) => (e.weight / total) * N);

    // chi-square below the df=6, p=0.01 critical value (16.81) — generous + deterministic
    expect(chiSquare(observed, expected)).toBeLessThan(16.81);

    // and every category is within 10% (relative) of its expected count
    for (let i = 0; i < table.length; i++) {
      expect(observed[i]).toBeGreaterThan(expected[i] * 0.9);
      expect(observed[i]).toBeLessThan(expected[i] * 1.1);
    }
  });

  it('boss rewards are always weapons', () => {
    const rng = makeRng(999);
    for (let i = 0; i < 200; i++) {
      expect(WEAPONS).toContain(dropRandomPickup(rng, true));
    }
  });

  it('is deterministic for a given seed', () => {
    const seq = (seed) => {
      const r = makeRng(seed);
      return Array.from({ length: 20 }, () => dropRandomPickup(r, false));
    };
    expect(seq(42)).toEqual(seq(42));
  });
});
