// =====================================================================
// defense.js — PURE incoming-damage resolution for the player (B9b). No imports, no game state —
// just (dmg, state) -> outcome, so it's deterministic + unit-testable like weighted.js / scaling.js.
//
// Two defensive offers feed this:
//   • GUARD  — block-N-hits charges (rare = 1, ultra = 3). Each charge eats one WHOLE hit, first.
//   • DAMAGE REDUCTION — a % off incoming damage. Hearts are WHOLE integers and almost every hit is
//     1 damage, so a flat "% off" can't come off a single hit cleanly. We instead bank the reduced
//     amount in a CARRY accumulator: a heart only comes off once the carry crosses 1. Over many hits
//     the player loses ≈ (1 - reduction) of the damage — a true %, deterministic (no RNG → fits the
//     "skill/progress is the reward, never chance" design ethic), and `hearts` never goes fractional.
// =====================================================================

/**
 * Resolve one incoming hit against the player's guard charges + damage reduction. PURE.
 *
 * Order: a guard charge (if any) blocks the WHOLE hit first; otherwise damage-reduction shaves the hit
 * and banks the remainder in `carry`, deducting only whole hearts. `heartsLost` is always a
 * non-negative integer ≤ `dmg`, so it can be subtracted straight from a whole-heart HP pool.
 *
 * @param {number} dmg incoming damage in hearts (usually 1; a rocket can be more)
 * @param {{guardCharges?: number, reduction?: number, carry?: number}} [state]
 *   guardCharges = block-N-hit charges left; reduction = damage-reduction fraction (0..1, clamped);
 *   carry = banked fractional damage from prior reduced hits.
 * @returns {{heartsLost: number, guardCharges: number, carry: number, blocked: boolean}}
 *   blocked = true when a guard charge ate the hit (heartsLost 0, no carry change).
 */
export function resolveIncoming(dmg, { guardCharges = 0, reduction = 0, carry = 0 } = {}) {
  if (guardCharges > 0) {
    return { heartsLost: 0, guardCharges: guardCharges - 1, carry, blocked: true };
  }
  const r = Math.min(1, Math.max(0, reduction)); // clamp to a documented 0..1 fraction
  const effective = dmg * (1 - r) + carry; // reduced damage + the banked remainder
  const heartsLost = Math.max(0, Math.floor(effective + 1e-9)); // only whole hearts; epsilon kills float drift
  return { heartsLost, guardCharges, carry: Math.max(0, effective - heartsLost), blocked: false };
}
