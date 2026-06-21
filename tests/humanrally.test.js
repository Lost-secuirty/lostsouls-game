import { describe, it, expect } from 'vitest';
import { humanRallyTarget } from '../src/core/progression.js';

describe('humanRallyTarget (human boss P3 — HP-gated rallied survivors)', () => {
  it('rallies nobody above 50% HP', () => {
    expect(humanRallyTarget(1)).toEqual({ min: 0, max: 0 });
    expect(humanRallyTarget(0.6)).toEqual({ min: 0, max: 0 });
    expect(humanRallyTarget(0.51)).toEqual({ min: 0, max: 0 });
  });

  it('rallies 1–2 between 25% and 50% HP', () => {
    expect(humanRallyTarget(0.5)).toEqual({ min: 1, max: 2 });
    expect(humanRallyTarget(0.3)).toEqual({ min: 1, max: 2 });
    expect(humanRallyTarget(0.26)).toEqual({ min: 1, max: 2 });
  });

  it('rallies 2–3 at or below 25% HP (cornered, calls for help)', () => {
    expect(humanRallyTarget(0.25)).toEqual({ min: 2, max: 3 });
    expect(humanRallyTarget(0.1)).toEqual({ min: 2, max: 3 });
    expect(humanRallyTarget(0)).toEqual({ min: 2, max: 3 });
  });
});
