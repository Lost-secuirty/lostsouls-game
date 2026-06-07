// =====================================================================
// collision.js — keep circles (player/enemies) out of boxes (walls/rubble)
// and inside the arena. Built on the pure helpers in core/math2d.js.
// =====================================================================

import { resolveCircleBox, circleVsBox, clamp } from '../core/math2d.js';
import { ARENA } from '../config.js';

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
