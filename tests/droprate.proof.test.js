import { describe, expect, it } from 'vitest';
import { chiSquare } from '../src/core/probability.js';

describe('drop-rate proof controls', () => {
  it('proves chi-square catches a deliberately biased distribution', () => {
    const expected = [10_000, 10_000, 10_000];
    const biased = [30_000, 0, 0];
    expect(chiSquare(biased, expected)).toBeGreaterThan(16.81);
  });
});
