import { describe, it, expect } from 'vitest';
import {
  lerp,
  cubicOut,
  quadInOut,
  backOut,
  hashNoise1D,
  smoothNoise1D,
  springCritDamped,
  springCritDampedXZ,
  asymptoticFollowXZ,
  splitWeight,
} from '../src/core/math2d.js';

describe('feel math — eases', () => {
  it('lerp hits endpoints and midpoint, and clamps t', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, -3)).toBe(0); // clamped low
    expect(lerp(0, 10, 9)).toBe(10); // clamped high
  });

  it('cubicOut is pinned at 0/1, monotonic, fast-out', () => {
    expect(cubicOut(0)).toBeCloseTo(0);
    expect(cubicOut(1)).toBeCloseTo(1);
    expect(cubicOut(0.5)).toBeCloseTo(0.875); // 1 - 0.5^3
    expect(cubicOut(0.25)).toBeGreaterThan(0.25); // ahead of linear (fast start)
    expect(cubicOut(2)).toBeCloseTo(1); // clamped
  });

  it('quadInOut is pinned at 0/1 and symmetric at the middle', () => {
    expect(quadInOut(0)).toBeCloseTo(0);
    expect(quadInOut(1)).toBeCloseTo(1);
    expect(quadInOut(0.5)).toBeCloseTo(0.5);
    expect(quadInOut(0.25)).toBeCloseTo(1 - quadInOut(0.75)); // symmetric about 0.5
  });

  it('backOut is pinned at 0/1 and overshoots past 1 in the middle', () => {
    expect(backOut(0)).toBeCloseTo(0);
    expect(backOut(1)).toBeCloseTo(1);
    expect(backOut(0.7)).toBeGreaterThan(1); // the "back" overshoot
  });
});

describe('feel math — coherent noise (deterministic, no Math.random)', () => {
  it('hashNoise1D is reproducible and in [-1, 1]', () => {
    for (let i = -5; i <= 5; i++) {
      const a = hashNoise1D(i, 11);
      const b = hashNoise1D(i, 11);
      expect(a).toBe(b); // pure
      expect(a).toBeGreaterThanOrEqual(-1);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it('different seeds produce different values', () => {
    expect(hashNoise1D(3, 11)).not.toBe(hashNoise1D(3, 29));
  });

  it('smoothNoise1D equals the hash at integers, stays in range, is continuous', () => {
    expect(smoothNoise1D(4, 7)).toBeCloseTo(hashNoise1D(4, 7));
    let prev = smoothNoise1D(0, 7);
    for (let x = 0; x <= 3; x += 0.05) {
      const v = smoothNoise1D(x, 7);
      expect(v).toBeGreaterThanOrEqual(-1.0001);
      expect(v).toBeLessThanOrEqual(1.0001);
      expect(Math.abs(v - prev)).toBeLessThan(0.25); // no jumps between close samples
      prev = v;
    }
  });
});

describe('feel math — springs / follow', () => {
  it('springCritDamped converges to target without overshoot', () => {
    let s = { pos: 0, vel: 0 };
    const target = 10;
    const dt = 1 / 60;
    let maxPos = -Infinity;
    for (let i = 0; i < 600; i++) {
      s = springCritDamped(s.pos, s.vel, target, dt, 10);
      maxPos = Math.max(maxPos, s.pos);
    }
    expect(s.pos).toBeCloseTo(target, 2); // arrived
    expect(maxPos).toBeLessThanOrEqual(target + 1e-6); // critically damped: never overshoots
  });

  it('springCritDampedXZ mutates pos/vel toward an XZ target', () => {
    const pos = { x: -8, z: 6 };
    const vel = { x: 0, z: 0 };
    const target = { x: 0, z: 0 };
    for (let i = 0; i < 600; i++) springCritDampedXZ(pos, vel, target, 1 / 60, { omega: 12 });
    expect(pos.x).toBeCloseTo(0, 2);
    expect(pos.z).toBeCloseTo(0, 2);
  });

  it('asymptoticFollowXZ moves toward target but never past it (a clamped <= 1)', () => {
    const pos = { x: 0, z: 0 };
    const target = { x: 10, z: -10 };
    const before = pos.x;
    asymptoticFollowXZ(pos, target, 1 / 60, { weightPer60HzFrame: 0.1 });
    expect(pos.x).toBeGreaterThan(before);
    expect(pos.x).toBeLessThan(target.x); // didn't jump past
    // a huge dt clamps the weight to 1 (snaps, never overshoots)
    const snap = { x: 0, z: 0 };
    asymptoticFollowXZ(snap, target, 100, { weightPer60HzFrame: 0.1 });
    expect(snap.x).toBeCloseTo(target.x);
    expect(snap.z).toBeCloseTo(target.z);
  });
});

describe('feel math — co-op split weight', () => {
  it('is 0 at/below inner, 1 at/above outer, monotonic between', () => {
    expect(splitWeight(8, { inner: 8, outer: 14 })).toBe(0);
    expect(splitWeight(5, { inner: 8, outer: 14 })).toBe(0);
    expect(splitWeight(14, { inner: 8, outer: 14 })).toBe(1);
    expect(splitWeight(20, { inner: 8, outer: 14 })).toBe(1);
    expect(splitWeight(11, { inner: 8, outer: 14 })).toBeCloseTo(0.5);
    expect(splitWeight(10, { inner: 8, outer: 14 })).toBeLessThan(
      splitWeight(12, { inner: 8, outer: 14 }),
    );
  });

  it('degenerate inner>=outer is a hard step (no divide-by-zero)', () => {
    expect(splitWeight(9, { inner: 10, outer: 10 })).toBe(0);
    expect(splitWeight(10, { inner: 10, outer: 10 })).toBe(1);
  });
});
