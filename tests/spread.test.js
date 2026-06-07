import { describe, it, expect } from 'vitest';
import { spreadDirs, normalize } from '../src/core/math2d.js';

describe('spreadDirs (shotgun fan)', () => {
  it('a single pellet is just the aim direction', () => {
    const dirs = spreadDirs(0, -1, 1, 40);
    expect(dirs).toHaveLength(1);
    expect(dirs[0].x).toBeCloseTo(0);
    expect(dirs[0].z).toBeCloseTo(-1);
  });

  it('returns one unit vector per pellet', () => {
    const dirs = spreadDirs(0, -1, 6, 40);
    expect(dirs).toHaveLength(6);
    for (const d of dirs) {
      expect(Math.hypot(d.x, d.z)).toBeCloseTo(1);
    }
  });

  it('fans symmetrically around the aim', () => {
    const dirs = spreadDirs(0, -1, 3, 40);
    // middle pellet points straight along the aim
    expect(dirs[1].x).toBeCloseTo(0);
    expect(dirs[1].z).toBeCloseTo(-1);
    // outer two are mirror images across the aim axis
    expect(dirs[0].x).toBeCloseTo(-dirs[2].x);
    expect(dirs[0].z).toBeCloseTo(dirs[2].z);
  });

  it('normalizes the incoming aim', () => {
    const dirs = spreadDirs(0, -5, 1, 0);
    expect(dirs[0]).toEqual(normalize(0, -5));
  });
});
