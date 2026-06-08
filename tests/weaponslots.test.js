import { describe, it, expect } from 'vitest';
import { weaponSlotsForBosses } from '../src/core/progression.js';
import { CAPS } from '../src/config.js';

describe('weaponSlotsForBosses (Caden/Scott: unlock at boss 2/10/20, max 3)', () => {
  it('starts with 1 slot', () => {
    expect(weaponSlotsForBosses(0)).toBe(1);
    expect(weaponSlotsForBosses(1)).toBe(1);
  });

  it('unlocks the 2nd slot at boss 2', () => {
    expect(weaponSlotsForBosses(2)).toBe(2);
    expect(weaponSlotsForBosses(9)).toBe(2);
  });

  it('unlocks the 3rd slot at boss 10', () => {
    expect(weaponSlotsForBosses(10)).toBe(3);
    expect(weaponSlotsForBosses(19)).toBe(3);
  });

  it('never exceeds the cap', () => {
    expect(weaponSlotsForBosses(20)).toBe(CAPS.maxWeaponSlots);
    expect(weaponSlotsForBosses(1000)).toBe(CAPS.maxWeaponSlots);
  });
});
