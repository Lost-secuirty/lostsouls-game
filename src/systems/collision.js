// =====================================================================
// collision.js — keep circles (player/enemies) out of boxes (walls/rubble)
// and inside the arena. Built on the pure helpers in core/math2d.js.
// =====================================================================

import { resolveCircleBox, circleVsBox, clamp, knockbackStep } from '../core/math2d.js';
import { ARENA, FEEL } from '../config.js';

/** Push a moving circle out of every wall/obstacle it overlaps. */
export function slideOutOfWalls(x, z, r, walls) {
  let px = x;
  let pz = z;
  for (const box of walls) {
    const fixed = resolveCircleBox(px, pz, r, box);
    px = fixed.x;
    pz = fixed.z;
  }
  return { x: px, z: pz };
}

/** Clamp a circle to the inner playable area (just inside the outer walls). */
export function clampToArena(x, z, r) {
  const hw = ARENA.width / 2 - r;
  const hd = ARENA.depth / 2 - r;
  return { x: clamp(x, -hw, hw), z: clamp(z, -hd, hd) };
}

/** True if a circle touches any wall/obstacle (used to kill bullets). */
export function hitsAnyWall(x, z, r, walls) {
  for (const box of walls) {
    if (circleVsBox(x, z, r, box)) return true;
  }
  return false;
}

/**
 * Advance an entity's knockback shove for one frame (no-op when it isn't being knocked, so it's
 * free to call every tick on every enemy). Steps the decaying impulse (`entity.knock` {x,z}), moves
 * the entity, then resolves walls + arena so a shove never tunnels. Snaps a tiny residual to exactly
 * zero so the next frame early-outs. Shared by Enemy + Boss; bosses sit still here because their
 * impulse defaults to 0 (their `knock` never gets set). B7 (research report (5)).
 */
export function advanceKnockback(entity, dt, walls) {
  const k = entity.knock;
  if (!k || (k.x === 0 && k.z === 0)) return;
  const step = knockbackStep(k, dt, { drag: FEEL.knockback.drag });
  entity.x += step.dx;
  entity.z += step.dz;
  entity.knock = Math.hypot(step.vel.x, step.vel.z) < 0.05 ? { x: 0, z: 0 } : step.vel;
  let q = slideOutOfWalls(entity.x, entity.z, entity.radius, walls);
  q = clampToArena(q.x, q.z, entity.radius);
  entity.x = q.x;
  entity.z = q.z;
}
