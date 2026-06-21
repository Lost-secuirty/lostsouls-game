import { describe, it, expect } from 'vitest';
import { skeletonWaveTarget } from '../src/core/progression.js';

describe('skeletonWaveTarget (skeleton boss P4 — HP-gated bonelings)', () => {
  it('spawns nothing while the boss is above 50% HP', () => {
    expect(skeletonWaveTarget(1)).toEqual({ min: 0, max: 0 });
    expect(skeletonWaveTarget(0.75)).toEqual({ min: 0, max: 0 });
    expect(skeletonWaveTarget(0.51)).toEqual({ min: 0, max: 0 });
  });

  it('keeps 2–3 alive between 25% and 50% HP', () => {
    expect(skeletonWaveTarget(0.5)).toEqual({ min: 2, max: 3 });
    expect(skeletonWaveTarget(0.4)).toEqual({ min: 2, max: 3 });
    expect(skeletonWaveTarget(0.26)).toEqual({ min: 2, max: 3 });
  });

  it('raises a bigger wave (up to 4) at or below 25% HP — it is the summoner', () => {
    expect(skeletonWaveTarget(0.25)).toEqual({ min: 3, max: 4 });
    expect(skeletonWaveTarget(0.1)).toEqual({ min: 3, max: 4 });
    expect(skeletonWaveTarget(0)).toEqual({ min: 3, max: 4 });
  });
});
