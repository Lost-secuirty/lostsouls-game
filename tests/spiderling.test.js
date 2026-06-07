import { describe, it, expect } from 'vitest';
import { spiderlingTarget } from '../src/core/progression.js';

describe('spiderlingTarget (boss P3 — HP-gated baby spiders)', () => {
  it('spawns nothing while the boss is above 50% HP', () => {
    expect(spiderlingTarget(1.0)).toEqual({ min: 0, max: 0 });
    expect(spiderlingTarget(0.75)).toEqual({ min: 0, max: 0 });
    expect(spiderlingTarget(0.51)).toEqual({ min: 0, max: 0 });
  });

  it('keeps 2–3 alive between 25% and 50% HP', () => {
    expect(spiderlingTarget(0.5)).toEqual({ min: 2, max: 3 });
    expect(spiderlingTarget(0.4)).toEqual({ min: 2, max: 3 });
    expect(spiderlingTarget(0.26)).toEqual({ min: 2, max: 3 });
  });

  it('keeps 3 alive at or below 25% HP', () => {
    expect(spiderlingTarget(0.25)).toEqual({ min: 3, max: 3 });
    expect(spiderlingTarget(0.1)).toEqual({ min: 3, max: 3 });
    expect(spiderlingTarget(0)).toEqual({ min: 3, max: 3 });
  });
});
