import { describe, it, expect } from 'vitest';
import {
  ring,
  gapRing,
  jitterRing,
  star,
  nWay,
  arc,
  dirsFromAngles,
} from '../src/entities/bosses/emitters.js';

const TAU = Math.PI * 2;

describe('ring', () => {
  it('returns n evenly-spaced angles starting at phase', () => {
    const a = ring(4, 0);
    expect(a).toHaveLength(4);
    expect(a[0]).toBeCloseTo(0);
    expect(a[1]).toBeCloseTo(TAU / 4);
    expect(a[2]).toBeCloseTo(TAU / 2);
    expect(a[3]).toBeCloseTo((3 * TAU) / 4);
  });

  it('offsets every angle by phase', () => {
    const phase = 0.37;
    const a = ring(5, phase);
    a.forEach((ang, i) => expect(ang).toBeCloseTo(phase + (i / 5) * TAU));
  });
});

describe('gapRing', () => {
  it('drops exactly gapWidth consecutive slots (the dodge lane)', () => {
    const a = gapRing(8, 2, 2, 0);
    expect(a).toHaveLength(6); // 8 - 2
    // indices 2 and 3 are the gap; their angles must be absent
    const present = new Set(a.map((x) => Math.round((x / TAU) * 8)));
    expect(present.has(2)).toBe(false);
    expect(present.has(3)).toBe(false);
    expect(present.has(1)).toBe(true);
    expect(present.has(4)).toBe(true);
  });

  it('wraps the gap around the end', () => {
    const a = gapRing(6, 5, 2, 0); // gap = slots 5 and 0
    expect(a).toHaveLength(4);
    const present = new Set(a.map((x) => Math.round((x / TAU) * 6) % 6));
    expect(present.has(5)).toBe(false);
    expect(present.has(0)).toBe(false);
  });
});

describe('jitterRing', () => {
  it('with rng()=0.5 (zero wobble) equals a plain ring', () => {
    const j = jitterRing(6, 0.3, () => 0.5, 0);
    const r = ring(6, 0);
    j.forEach((ang, i) => expect(ang).toBeCloseTo(r[i]));
  });

  it('keeps every bullet within ±jitter of its ring slot, and is rng-deterministic', () => {
    const jitter = 0.25;
    const seq = [0.1, 0.9, 0.5, 0.0, 1.0, 0.5];
    let i = 0;
    const rng = () => seq[i++];
    const a = jitterRing(6, jitter, rng, 0);
    const base = ring(6, 0);
    a.forEach((ang, k) => {
      expect(Math.abs(ang - base[k])).toBeLessThanOrEqual(jitter + 1e-9);
    });
    // same sequence -> same result (determinism seam)
    let j = 0;
    const rng2 = () => seq[j++];
    expect(jitterRing(6, jitter, rng2, 0)).toEqual(a);
  });
});

describe('star', () => {
  it('is a ring of `arms` angles', () => {
    expect(star(4, 0.2)).toEqual(ring(4, 0.2));
  });
});

describe('nWay', () => {
  it('count<=1 returns just the base angle', () => {
    expect(nWay(1.0, 1, 0.8)).toEqual([1.0]);
  });

  it('fans count angles symmetrically across spread, centered on base', () => {
    const base = 0.5;
    const spread = 1.0;
    const a = nWay(base, 5, spread);
    expect(a).toHaveLength(5);
    expect(a[0]).toBeCloseTo(base - spread / 2);
    expect(a[4]).toBeCloseTo(base + spread / 2);
    expect(a[2]).toBeCloseTo(base); // middle = the aim
  });
});

describe('arc', () => {
  it('returns count angles each `step` apart from phase', () => {
    expect(arc(3, 1.0, 0.25)).toEqual([1.0, 1.25, 1.5]);
  });
});

describe('dirsFromAngles', () => {
  it('uses the game convention dir = (sin a, cos a) and stays unit length', () => {
    const [d0] = dirsFromAngles([0]);
    expect(d0.x).toBeCloseTo(0);
    expect(d0.z).toBeCloseTo(1); // angle 0 points +z
    for (const d of dirsFromAngles([0.3, 1.1, 2.7, 5.0])) {
      expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
    }
  });
});
