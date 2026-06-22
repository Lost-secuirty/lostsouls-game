import { describe, it, expect } from 'vitest';
import { knockbackStep } from '../src/core/math2d.js';

// B7 — knockback impulse + exponential decay (research report (5)). Pure helper, so the feel math
// can't silently drift. The key property is frame-rate independence: the displacement is the EXACT
// integral of the decaying velocity, so one big step and many small steps land in the same place.

describe('knockbackStep (B7 shove decay)', () => {
  it('decays the velocity toward zero (speed strictly shrinks each step)', () => {
    let v = { x: 8, z: 0 };
    let prev = Math.hypot(v.x, v.z);
    for (let i = 0; i < 30; i++) {
      v = knockbackStep(v, 1 / 60, { drag: 9 }).vel;
      const sp = Math.hypot(v.x, v.z);
      expect(sp).toBeLessThan(prev);
      prev = sp;
    }
    expect(prev).toBeLessThan(0.5); // nearly settled after half a second
  });

  it('moves along the velocity direction (sign preserved on both axes)', () => {
    const step = knockbackStep({ x: 5, z: -3 }, 1 / 60, { drag: 9 });
    expect(step.dx).toBeGreaterThan(0);
    expect(step.dz).toBeLessThan(0);
  });

  it('is frame-rate independent: 1 big step == N small steps (same total displacement)', () => {
    const v0 = { x: 10, z: 4 };
    const drag = 9;
    const T = 0.25;
    // one big step
    const big = knockbackStep(v0, T, { drag });
    // 60 small steps over the same total time
    let v = { ...v0 };
    let sx = 0;
    let sz = 0;
    const n = 60;
    for (let i = 0; i < n; i++) {
      const s = knockbackStep(v, T / n, { drag });
      sx += s.dx;
      sz += s.dz;
      v = s.vel;
    }
    expect(sx).toBeCloseTo(big.dx, 6); // exact-integral telescopes → matches to many digits
    expect(sz).toBeCloseTo(big.dz, 6);
    // and the leftover velocity matches too
    expect(v.x).toBeCloseTo(big.vel.x, 6);
    expect(v.z).toBeCloseTo(big.vel.z, 6);
  });

  it('total settling distance is v0/drag (integral of the decay to rest)', () => {
    const v0 = { x: 12, z: 0 };
    const drag = 9;
    let v = { ...v0 };
    let total = 0;
    for (let i = 0; i < 2000; i++) {
      // tiny steps, well past settling
      const s = knockbackStep(v, 1 / 240, { drag });
      total += s.dx;
      v = s.vel;
    }
    expect(total).toBeCloseTo(v0.x / drag, 3); // 12/9 ≈ 1.333 world units of shove
  });

  it('degrades gracefully to v·dt as drag→0 (no divide-by-zero)', () => {
    const step = knockbackStep({ x: 6, z: 0 }, 0.1, { drag: 0 });
    expect(step.dx).toBeCloseTo(6 * 0.1); // 0.6
    expect(step.vel.x).toBeCloseTo(6); // no decay at zero drag
  });

  it('a zero velocity stays put (the every-frame no-op case)', () => {
    const step = knockbackStep({ x: 0, z: 0 }, 1 / 60, { drag: 9 });
    expect(step.dx).toBe(0);
    expect(step.dz).toBe(0);
    expect(step.vel.x).toBe(0);
    expect(step.vel.z).toBe(0);
  });

  it('higher drag = shorter shove (settles closer)', () => {
    const v0 = { x: 10, z: 0 };
    const near = knockbackStep(v0, 0.1, { drag: 18 }).dx;
    const far = knockbackStep(v0, 0.1, { drag: 4 }).dx;
    expect(far).toBeGreaterThan(near);
  });
});
