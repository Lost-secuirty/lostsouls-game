import { describe, it, expect } from 'vitest';
import { resolveIncoming } from '../src/core/defense.js';

// B9b — incoming-damage resolution (guard charges + damage-reduction carry). Pure, so every property
// below is deterministic. The hard invariant: a whole-heart HP pool can subtract `heartsLost` directly.

describe('resolveIncoming — baseline (no guard, no reduction)', () => {
  it('passes the full hit through', () => {
    const r = resolveIncoming(1, {});
    expect(r).toEqual({ heartsLost: 1, guardCharges: 0, carry: 0, blocked: false });
  });
  it('defaults missing state to zero', () => {
    expect(resolveIncoming(2).heartsLost).toBe(2);
  });
});

describe('resolveIncoming — guard charges block whole hits first', () => {
  it('eats one whole hit per charge (even a big rocket hit) and decrements', () => {
    const r = resolveIncoming(4, { guardCharges: 2, reduction: 0.4, carry: 0.9 });
    expect(r.blocked).toBe(true);
    expect(r.heartsLost).toBe(0);
    expect(r.guardCharges).toBe(1);
    expect(r.carry).toBe(0.9); // guard takes precedence; the DR carry is untouched
  });
  it('falls through to damage once the charges run out', () => {
    const r = resolveIncoming(1, { guardCharges: 0, reduction: 0 });
    expect(r.blocked).toBe(false);
    expect(r.heartsLost).toBe(1);
  });
});

describe('resolveIncoming — damage reduction banks fractional damage in a carry', () => {
  it('a 40% reduction on 1-damage hits only costs a heart once the carry crosses 1', () => {
    const a = resolveIncoming(1, { reduction: 0.4, carry: 0 }); // eff 0.6
    expect(a.heartsLost).toBe(0);
    expect(a.carry).toBeCloseTo(0.6);
    const b = resolveIncoming(1, { reduction: 0.4, carry: a.carry }); // eff 1.2
    expect(b.heartsLost).toBe(1);
    expect(b.carry).toBeCloseTo(0.2);
  });

  it('clamps reduction to 0..1 (>=1 fully absorbs into carry, <0 is no reduction)', () => {
    expect(resolveIncoming(1, { reduction: 2 }).heartsLost).toBe(0); // full reduction → banked
    expect(resolveIncoming(1, { reduction: -1 }).heartsLost).toBe(1); // negative clamps to 0
  });

  it('never returns a fractional, negative, or >dmg heart loss across a sweep', () => {
    for (const dmg of [1, 2, 3, 4]) {
      for (let r = 0; r <= 0.9; r += 0.1) {
        for (const carry of [0, 0.3, 0.75, 0.99]) {
          const res = resolveIncoming(dmg, { reduction: r, carry });
          expect(Number.isInteger(res.heartsLost)).toBe(true);
          expect(res.heartsLost).toBeGreaterThanOrEqual(0);
          expect(res.heartsLost).toBeLessThanOrEqual(dmg);
          expect(res.carry).toBeGreaterThanOrEqual(0);
          expect(res.carry).toBeLessThan(1);
        }
      }
    }
  });

  it('over a long stream, total hearts lost ≈ (1 - reduction) × hits (a true %)', () => {
    const r = 0.4;
    const N = 1000;
    let carry = 0;
    let total = 0;
    for (let i = 0; i < N; i++) {
      const res = resolveIncoming(1, { reduction: r, carry });
      carry = res.carry;
      total += res.heartsLost;
    }
    expect(Math.abs(total - (1 - r) * N)).toBeLessThanOrEqual(1); // off by at most the banked carry
  });
});
