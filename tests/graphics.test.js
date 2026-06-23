import { describe, it, expect } from 'vitest';
import { effectivePixelRatio, PIXEL_RATIO_CAPS, SHADOW_MAP_SIZES } from '../src/core/graphics.js';

describe('effectivePixelRatio', () => {
  it('clamps the device ratio down to the cap', () => {
    expect(effectivePixelRatio(3, 1.5)).toBe(1.5);
    expect(effectivePixelRatio(2, 1)).toBe(1);
  });

  it('uses the device ratio when it is below the cap', () => {
    expect(effectivePixelRatio(1, 1.5)).toBe(1);
    expect(effectivePixelRatio(1.25, 2)).toBe(1.25);
  });

  it('falls back to 1 for a missing/garbage device ratio', () => {
    expect(effectivePixelRatio(undefined, 2)).toBe(1);
    expect(effectivePixelRatio(0, 2)).toBe(1);
    expect(effectivePixelRatio(NaN, 2)).toBe(1);
    expect(effectivePixelRatio(-4, 2)).toBe(1);
  });

  it('falls back to the device ratio for a missing/garbage cap', () => {
    expect(effectivePixelRatio(1.25, undefined)).toBe(1.25);
    expect(effectivePixelRatio(2, 0)).toBe(2);
    expect(effectivePixelRatio(1.5, NaN)).toBe(1.5);
  });

  it('always returns a finite positive number', () => {
    for (const dr of [undefined, NaN, 0, -1, 1, 2, 5]) {
      for (const cap of [undefined, NaN, 0, 1, 1.5, 2]) {
        const r = effectivePixelRatio(dr, cap);
        expect(Number.isFinite(r)).toBe(true);
        expect(r).toBeGreaterThan(0);
      }
    }
  });
});

describe('graphics A/B option arrays', () => {
  it('expose the dropdown choices, including the dial-back defaults and the old values', () => {
    expect(PIXEL_RATIO_CAPS).toContain(1.5); // FPS-1 new default
    expect(PIXEL_RATIO_CAPS).toContain(2.0); // the old default, for A/B
    expect(SHADOW_MAP_SIZES).toContain(1024); // FPS-1 new default
    expect(SHADOW_MAP_SIZES).toContain(2048); // the old default, for A/B
  });

  it('are sorted ascending', () => {
    expect([...PIXEL_RATIO_CAPS].sort((a, b) => a - b)).toEqual(PIXEL_RATIO_CAPS);
    expect([...SHADOW_MAP_SIZES].sort((a, b) => a - b)).toEqual(SHADOW_MAP_SIZES);
  });
});
