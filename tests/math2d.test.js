import { describe, it, expect } from 'vitest';
import {
  normalize,
  dist,
  clamp,
  circleVsCircle,
  pointInBox,
  circleVsBox,
  resolveCircleBox,
} from '../src/core/math2d.js';

describe('math2d', () => {
  it('normalize returns a unit vector', () => {
    const n = normalize(3, 4);
    expect(n.x).toBeCloseTo(0.6);
    expect(n.z).toBeCloseTo(0.8);
    expect(Math.hypot(n.x, n.z)).toBeCloseTo(1);
  });

  it('normalize of zero stays zero (no NaN)', () => {
    expect(normalize(0, 0)).toEqual({ x: 0, z: 0 });
  });

  it('dist and clamp', () => {
    expect(dist(0, 0, 3, 4)).toBeCloseTo(5);
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('circleVsCircle detects overlap and separation', () => {
    expect(circleVsCircle(0, 0, 1, 1.5, 0, 1)).toBe(true); // gap 1.5 < r 2
    expect(circleVsCircle(0, 0, 1, 3, 0, 1)).toBe(false); // gap 3 > r 2
  });

  const box = { minX: -2, maxX: 2, minZ: -2, maxZ: 2 };

  it('pointInBox', () => {
    expect(pointInBox(0, 0, box)).toBe(true);
    expect(pointInBox(3, 0, box)).toBe(false);
  });

  it('circleVsBox: edge contact + clear miss', () => {
    expect(circleVsBox(2.5, 0, 1, box)).toBe(true); // 0.5 into the box's reach
    expect(circleVsBox(4, 0, 1, box)).toBe(false); // 2 away, radius 1
  });

  it('resolveCircleBox pushes an overlapping circle outside', () => {
    const fixed = resolveCircleBox(2.5, 0, 1, box); // overlapping from the +X side
    expect(circleVsBox(fixed.x, fixed.z, 1, box)).toBe(false);
    expect(fixed.x).toBeGreaterThan(2);
  });

  it('resolveCircleBox leaves a non-overlapping circle alone', () => {
    const same = resolveCircleBox(10, 10, 1, box);
    expect(same).toEqual({ x: 10, z: 10 });
  });

  it('resolveCircleBox handles a center stuck INSIDE the box', () => {
    const fixed = resolveCircleBox(0.5, 0, 1, box); // center inside
    expect(circleVsBox(fixed.x, fixed.z, 1, box)).toBe(false);
  });
});
