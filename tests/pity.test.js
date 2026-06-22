import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { rollDrop, pityMinTier } from '../src/core/drops.js';
import { PICKUPS } from '../src/config.js';

// B8 — hard pity (research report (4) anti-frustration rule): a run can't go "mean" — after a dry
// streak of commons the next normal drop is forced rare+. Pure + seeded, so it's provable.

const R = PICKUPS.rarity;
const { commonStreakMax, minTier } = R.hardPity;

describe('pityMinTier (the floor decision)', () => {
  it('returns no floor below the streak cap', () => {
    for (let s = 0; s < commonStreakMax; s++) expect(pityMinTier(s)).toBeNull();
  });

  it('forces the configured minTier at/above the cap', () => {
    expect(pityMinTier(commonStreakMax)).toBe(minTier);
    expect(pityMinTier(commonStreakMax + 5)).toBe(minTier);
  });
});

describe('rollDrop honors the pity floor', () => {
  it('with minTier set, never rolls below it — even on a common-heavy weight table', () => {
    const rng = makeRng(123);
    const commonHeavy = { common: 1000, rare: 1, epic: 1 }; // would almost always roll common
    for (let i = 0; i < 500; i++) {
      const drop = rollDrop(rng, commonHeavy, { minTier });
      expect(drop.tier).not.toBe('common');
    }
  });
});

describe('the streak loop guarantees a rare+ within commonStreakMax+1 drops', () => {
  it('mirrors game.js: a forced drop lands no later than the cap, then the streak resets', () => {
    const rng = makeRng(2026);
    const weights = R.regularChestWeights[0]; // early floor — the most common-heavy band
    let streak = 0;
    let everForced = false;

    for (let i = 0; i < 200; i++) {
      const floor = pityMinTier(streak); // game.js passes this as minTier
      const drop = rollDrop(rng, weights, { minTier: floor });
      if (floor) {
        // a pity-forced draw must be rare+ and must reset the dry streak
        expect(drop.tier).not.toBe('common');
        everForced = true;
      }
      // game.js streak update: a common extends the streak, anything rarer resets it
      streak = drop.tier === R.tiers[0] ? streak + 1 : 0;
      // the streak can never exceed the cap (pity fires the moment it reaches it)
      expect(streak).toBeLessThanOrEqual(commonStreakMax);
    }

    expect(everForced).toBe(true); // over 200 draws the dry-streak guard definitely triggers
  });
});
