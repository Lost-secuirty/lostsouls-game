import { describe, it, expect } from 'vitest';
import { turnAngle } from '../src/core/math2d.js';

describe('turnAngle (homing curve, capped turn rate)', () => {
  it('steps straight to the target when within maxStep', () => {
    expect(turnAngle(0, 0.1, 1)).toBeCloseTo(0.1);
  });

  it('caps the step at ±maxStep (so a juke can outrun a homer)', () => {
    expect(turnAngle(0, 1, 0.2)).toBeCloseTo(0.2);
    expect(turnAngle(0, -1, 0.2)).toBeCloseTo(-0.2);
  });

  it('turns the SHORT way around the ±π wrap', () => {
    const cur = Math.PI - 0.05;
    const des = -Math.PI + 0.05; // shortest path is +0.1 (through π), not -2π+0.1
    expect(turnAngle(cur, des, 1)).toBeCloseTo(Math.PI + 0.05);
  });

  it('never overshoots a tiny target', () => {
    expect(turnAngle(1, 1.0001, 1)).toBeCloseTo(1.0001);
  });
});
