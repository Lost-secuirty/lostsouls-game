// =====================================================================
// math2d.js — 2D vector + collision helpers on the XZ plane (PURE: no imports).
//
// The whole game is "top-down", so we only do flat 2D math using {x, z}.
// - Players, enemies, bullets = CIRCLES (a point + a radius).
// - Walls and rubble = AABBs (axis-aligned boxes): {minX, maxX, minZ, maxZ}.
//
// Two collision tests cover everything: circle-vs-circle and circle-vs-box.
// These are pure functions, so they're easy to unit-test.
// =====================================================================

/** length of vector (x, z) */
export function len(x, z) {
  return Math.hypot(x, z);
}

/** rotate a vector (x, z) by `rad` radians on the XZ plane */
export function rotate(x, z, rad) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return { x: x * c - z * s, z: x * s + z * c };
}

/**
 * Fan a number of unit directions out around an aim direction (for shotguns).
 * pellets=1 -> just the aim. Otherwise evenly spread across `spreadDeg` degrees.
 * @returns {{x:number,z:number}[]}
 */
export function spreadDirs(aimX, aimZ, pellets, spreadDeg) {
  const base = normalize(aimX, aimZ);
  if (pellets <= 1 || spreadDeg <= 0) return [base];
  const span = (spreadDeg * Math.PI) / 180;
  const out = [];
  for (let i = 0; i < pellets; i++) {
    const t = pellets === 1 ? 0.5 : i / (pellets - 1); // 0..1
    const ang = -span / 2 + t * span;
    out.push(rotate(base.x, base.z, ang));
  }
  return out;
}

/** return a unit-length {x, z} pointing the same way (zero stays zero) */
export function normalize(x, z) {
  const l = Math.hypot(x, z);
  if (l < 1e-8) return { x: 0, z: 0 };
  return { x: x / l, z: z / l };
}

/** distance between two points */
export function dist(ax, az, bx, bz) {
  return Math.hypot(ax - bx, az - bz);
}

/** clamp v into [lo, hi] */
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** do two circles overlap? */
export function circleVsCircle(ax, az, ar, bx, bz, br) {
  const r = ar + br;
  const dx = ax - bx;
  const dz = az - bz;
  return dx * dx + dz * dz <= r * r;
}

/** is point (px,pz) inside box? box = {minX,maxX,minZ,maxZ} */
export function pointInBox(px, pz, box) {
  return px >= box.minX && px <= box.maxX && pz >= box.minZ && pz <= box.maxZ;
}

/** does a circle overlap an AABB? */
export function circleVsBox(cx, cz, cr, box) {
  const nx = clamp(cx, box.minX, box.maxX);
  const nz = clamp(cz, box.minZ, box.maxZ);
  const dx = cx - nx;
  const dz = cz - nz;
  return dx * dx + dz * dz <= cr * cr;
}

/**
 * Push a circle out of an AABB if it's overlapping (the smallest shove).
 * Returns the corrected {x, z}. Used to slide players/enemies along walls.
 */
export function resolveCircleBox(cx, cz, cr, box) {
  const EPS = 1e-4; // nudge fully clear so we're not left exactly tangent
  const nx = clamp(cx, box.minX, box.maxX);
  const nz = clamp(cz, box.minZ, box.maxZ);
  const dx = cx - nx;
  const dz = cz - nz;
  const d2 = dx * dx + dz * dz;

  if (d2 > cr * cr) return { x: cx, z: cz }; // not touching

  if (d2 > 1e-8) {
    // circle center is outside the box: push straight out along the contact normal
    const d = Math.sqrt(d2);
    const push = cr - d + EPS;
    return { x: cx + (dx / d) * push, z: cz + (dz / d) * push };
  }

  // center is INSIDE the box: shove out the nearest edge
  const toLeft = cx - box.minX;
  const toRight = box.maxX - cx;
  const toNear = cz - box.minZ;
  const toFar = box.maxZ - cz;
  const m = Math.min(toLeft, toRight, toNear, toFar);
  if (m === toLeft) return { x: box.minX - cr - EPS, z: cz };
  if (m === toRight) return { x: box.maxX + cr + EPS, z: cz };
  if (m === toNear) return { x: cx, z: box.minZ - cr - EPS };
  return { x: cx, z: box.maxZ + cr + EPS };
}
