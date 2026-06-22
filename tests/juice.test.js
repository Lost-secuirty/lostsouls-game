import { describe, it, expect } from 'vitest';
import { Juice } from '../src/systems/juice.js';
import { JUICE } from '../src/config.js';
import { settings } from '../src/systems/settings.js';

describe('juice — trauma model', () => {
  it('addTrauma accumulates and clamps to 1', () => {
    const j = new Juice();
    j.addTrauma(0.3);
    expect(j.trauma).toBeCloseTo(0.3);
    j.addTrauma(0.5);
    expect(j.trauma).toBeCloseTo(0.8);
    j.addTrauma(5);
    expect(j.trauma).toBe(1);
  });

  it('update decays trauma linearly toward 0', () => {
    const j = new Juice();
    j.addTrauma(1);
    j.update(0.5);
    expect(j.trauma).toBeCloseTo(1 - JUICE.decayPerSec * 0.5);
    j.update(100);
    expect(j.trauma).toBe(0); // floored, never negative
  });

  it('shakeOffsetXZ is zero at rest, and bounded + deterministic under load', () => {
    const j = new Juice();
    expect(j.shakeOffsetXZ(1.23)).toEqual({ x: 0, y: 0, z: 0 });

    j.addTrauma(1);
    const a = j.shakeOffsetXZ(2.5);
    const b = j.shakeOffsetXZ(2.5);
    expect(a).toEqual(b); // PURE (no Math.random) → identical under a seeded run (ADR-0013)
    expect(Math.abs(a.x)).toBeLessThanOrEqual(JUICE.shakeMaxOffset + 1e-9);
    expect(Math.abs(a.z)).toBeLessThanOrEqual(JUICE.shakeMaxOffset + 1e-9);
    expect(Math.abs(a.y)).toBeLessThanOrEqual(JUICE.shakeMaxY + 1e-9);
  });

  it('reducedEffects scales trauma adds down', () => {
    const prev = settings.get('reducedEffects');
    settings.set('reducedEffects', true);
    try {
      const j = new Juice();
      j.addTrauma(0.5);
      expect(j.trauma).toBeCloseTo(0.5 * JUICE.reducedEffectsTraumaMul);
    } finally {
      settings.set('reducedEffects', prev);
    }
  });

  it('hitStop freezes the timescale, normal otherwise', () => {
    const j = new Juice();
    expect(j.getTimeScale()).toBe(1);
    j.hitStop(10);
    expect(j.getTimeScale()).toBe(0);
  });
});
