import { describe, it, expect } from 'vitest';
import { cameraTarget } from '../src/core/camera.js';

const P = (x, z, alive = true) => ({ x, z, alive });

describe('cameraTarget (B3 camera follow)', () => {
  it('returns center (0,0) when nobody is alive', () => {
    expect(cameraTarget([], { maxPan: 5 })).toEqual({ x: 0, z: 0 });
    expect(cameraTarget([P(10, 10, false)], { maxPan: 5 })).toEqual({ x: 0, z: 0 });
  });

  it('follows a single player but clamps the pan to ±maxPan', () => {
    expect(cameraTarget([P(3, -2)], { maxPan: 5 })).toEqual({ x: 3, z: -2 }); // within the clamp
    expect(cameraTarget([P(100, -100)], { maxPan: 5 })).toEqual({ x: 5, z: -5 }); // clamped
  });

  it('uses the centroid of two players', () => {
    const t = cameraTarget([P(-2, 0), P(2, 4)], { maxPan: 50, splitInner: 100, splitOuter: 200 });
    expect(t.x).toBeCloseTo(0);
    expect(t.z).toBeCloseTo(2);
  });

  it('co-op: holds the centroid when close, recenters to (0,0) when far apart', () => {
    const close = cameraTarget([P(10, 0), P(12, 0)], {
      maxPan: 50,
      splitInner: 14,
      splitOuter: 28,
    });
    expect(close.x).toBeCloseTo(11); // distance 2 < inner 14 → no recenter

    const far = cameraTarget([P(10, 0), P(40, 0)], { maxPan: 50, splitInner: 14, splitOuter: 28 });
    expect(far.x).toBeCloseTo(0); // distance 30 > outer 28 → fully recentered (both stay framed)
  });

  it('excludes dead players from the centroid', () => {
    const t = cameraTarget([P(4, 0), P(-4, 0, false)], {
      maxPan: 50,
      splitInner: 100,
      splitOuter: 200,
    });
    expect(t.x).toBeCloseTo(4); // only the live player counts
  });
});
