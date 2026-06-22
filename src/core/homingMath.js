// =====================================================================
// homingMath.js — PURE turn-rate-limited homing (research report (5),
// "Lightweight homing and curving bullet"). Extracted from bullets.js so the
// curve is unit-testable and reusable (future "seeker" minions / boss threats).
//
// The model is a clamped HEADING turn, not full seek acceleration: each tick the
// heading turns toward the target by at most turnRate*dt, then velocity is rebuilt
// at the fixed bullet speed. So a perpendicular juke still loses it — fair for a
// young dodger (a "cheating missile" that always corrects feels unfair).
// =====================================================================

import { turnAngle } from './math2d.js';

/**
 * Homing velocity for this tick (PURE). Turns the current heading toward `target` by at most
 * `turnRate * dt`, then re-speeds to `speed`. Game angle convention: dir = (sin a, cos a).
 * @param {{x:number,z:number}} pos    bullet position
 * @param {{x:number,z:number}} vel    current velocity (direction is what matters)
 * @param {{x:number,z:number}} target point to home toward
 * @param {number} dt                  seconds this step
 * @param {{speed:number, turnRate:number}} opts  bullet speed + max turn (rad/sec)
 * @returns {{x:number, z:number}} the new velocity
 */
export function turnRateHomingVelocity(pos, vel, target, dt, { speed, turnRate }) {
  const cur = Math.atan2(vel.x, vel.z);
  const des = Math.atan2(target.x - pos.x, target.z - pos.z);
  const a = turnAngle(cur, des, turnRate * dt);
  return { x: Math.sin(a) * speed, z: Math.cos(a) * speed };
}
