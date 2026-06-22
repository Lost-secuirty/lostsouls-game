import { describe, it, expect } from 'vitest';
import { atLeastOne, chiSquare } from '../src/core/probability.js';

// Probability helpers used to reason about / verify the game's drop odds. The drop SELECTION itself
// (rarity tiers + hard pity) is proven in rarity.proof.test.js + pity.test.js against core/drops.js.

describe('probability helpers', () => {
  it('atLeastOne combines independent chances (1 - ∏(1-p))', () => {
    expect(atLeastOne([0.5, 0.5])).toBeCloseTo(0.75);
    expect(atLeastOne([1])).toBe(1);
    expect(atLeastOne([0, 0])).toBe(0);
    expect(atLeastOne([0.77])).toBeCloseTo(0.77); // the Dokkan EX-SA example
  });

  it('chiSquare is 0 for a perfect fit and grows with deviation', () => {
    expect(chiSquare([10, 10], [10, 10])).toBe(0);
    expect(chiSquare([20, 0], [10, 10])).toBeGreaterThan(10);
  });
});
