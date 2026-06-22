import { describe, it, expect } from 'vitest';
import { timeToImpactSec, gapWidthAtRadius, minimumTelegraphMs } from '../src/core/fairnessCalc.js';
import { BOSS, PLAYER, FAIRNESS_TARGETS } from '../src/config.js';

describe('fairnessCalc helpers', () => {
  it('timeToImpactSec = distance / speed (guards divide-by-zero)', () => {
    expect(timeToImpactSec(20, 10)).toBeCloseTo(2);
    expect(Number.isFinite(timeToImpactSec(5, 0))).toBe(true);
  });

  it('gapWidthAtRadius grows with radius and gap slots; flags a tight ring', () => {
    expect(gapWidthAtRadius(10, 10, 1)).toBeGreaterThan(gapWidthAtRadius(3, 10, 1));
    expect(gapWidthAtRadius(10, 10, 2)).toBeGreaterThan(gapWidthAtRadius(10, 10, 1));
    const hurtDia = 2 * PLAYER.radius;
    // a dense ring at close range is a tight (unfair) lane
    expect(gapWidthAtRadius(2, 30, 1)).toBeLessThan(FAIRNESS_TARGETS.gapMinMul * hurtDia);
  });

  it('minimumTelegraphMs rises with distance, falls with speed, child > adult', () => {
    expect(minimumTelegraphMs(10, 11)).toBeGreaterThan(minimumTelegraphMs(2, 11));
    expect(minimumTelegraphMs(10, 20)).toBeLessThan(minimumTelegraphMs(10, 5));
    expect(minimumTelegraphMs(6, 11, { childMode: true })).toBeGreaterThan(
      minimumTelegraphMs(6, 11, { childMode: false }),
    );
  });
});

describe('kid-fairness regression — shipped bosses (guards the B5 "twice as hard" pass)', () => {
  const telegraphed = Object.entries(BOSS).filter(([, c]) => c && c.telegraph != null);

  it('every known boss is telegraphed (no silent guard-rail erosion)', () => {
    const types = telegraphed.map(([t]) => t);
    for (const expected of ['spider', 'mushroom', 'dog', 'cat', 'skeleton', 'human']) {
      expect(types, `${expected} should be telegraphed`).toContain(expected);
    }
    // and nothing silently dropped its telegraph: every BOSS entry is covered
    expect(telegraphed.length).toBe(Object.keys(BOSS).length);
  });

  it('every telegraphed boss meets the easy telegraph target', () => {
    for (const [type, c] of telegraphed) {
      expect(c.telegraph * 1000, `${type} telegraph`).toBeGreaterThanOrEqual(
        FAIRNESS_TARGETS.telegraphMinMs.easy,
      );
    }
  });

  it("mushroom's seeded ring gap is a passable lane at engagement range", () => {
    const m = BOSS.mushroom;
    const hurtDia = 2 * PLAYER.radius;
    // the 2-slot gap in the spore ring, evaluated at a typical ~10u engagement distance
    const gap = gapWidthAtRadius(10, m.ringBullets, m.ringGap);
    expect(gap).toBeGreaterThanOrEqual(FAIRNESS_TARGETS.gapMinMul * hurtDia);
  });
});
