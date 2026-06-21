import { describe, it, expect } from 'vitest';
import { PROGRESSION } from '../src/config.js';

// Integrity check for the Stage 5 final floor lineup (pure config — no THREE).
const PALETTE_KEYS = ['body', 'emissive', 'leg', 'legEmissive', 'eye'];

describe('PROGRESSION.floors (Stage 5 final lineup)', () => {
  const floors = PROGRESSION.floors;

  it('is the tight 5-floor order: spider -> human -> mushroom -> duo -> skeleton', () => {
    expect(floors.map((f) => f.boss)).toEqual(['spider', 'human', 'mushroom', 'duo', 'skeleton']);
  });

  it('every floor has a name, a numeric diff, and a full 5-key palette', () => {
    for (const f of floors) {
      expect(typeof f.name).toBe('string');
      expect(f.name.length).toBeGreaterThan(0);
      expect(typeof f.diff).toBe('number');
      for (const k of PALETTE_KEYS) expect(typeof f.palette[k]).toBe('number');
    }
  });

  it('difficulty ramps up monotonically (non-decreasing)', () => {
    for (let i = 1; i < floors.length; i++) {
      expect(floors[i].diff).toBeGreaterThanOrEqual(floors[i - 1].diff);
    }
  });

  it('the duo floor lists its two beasts', () => {
    const duo = floors.find((f) => f.boss === 'duo');
    expect(duo.duo).toEqual(['dog', 'cat']);
  });
});
