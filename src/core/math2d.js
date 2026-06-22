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

/**
 * Smallest signed turn from angle `cur` toward `des`, capped at ±maxStep (radians).
 * Used by homing bullets so they curve (capped turn rate = a perpendicular juke
 * still loses them — fair for a young dodger). PURE.
 */
export function turnAngle(cur, des, maxStep) {
  let diff = des - cur;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (diff > maxStep) diff = maxStep;
  else if (diff < -maxStep) diff = -maxStep;
  return cur + diff;
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

// =====================================================================
// Feel math (ADR-0026 follow-up / research report (5) "game-feel math").
// Pure, frame-rate-independent helpers consumed by the juice/camera/knockback
// systems. Kept here (not a new file) so there's ONE pure-math module and no
// duplicate clamp/lerp. None of these touch THREE — they stay unit-testable.
// =====================================================================

/** linear interpolate a→b by t (t clamped to [0,1] so callers can't overshoot) */
export function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

/** ease-out cubic — fast start, gentle stop. Good for danger-zone / radius growth. */
export function cubicOut(t) {
  const x = 1 - clamp(t, 0, 1);
  return 1 - x * x * x;
}

/** ease in-out quad — smooth accelerate then decelerate. Good for camera blends / feathering. */
export function quadInOut(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

/** ease-out "back" — slight overshoot past 1 then settle. UI reward pops ONLY, never telegraphs. */
export function backOut(t) {
  const x = clamp(t, 0, 1) - 1;
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * x * x * x + c1 * x * x;
}

/**
 * Deterministic hash noise in [-1, 1] for an integer-ish `x` + `seed`. PURE — no Math.random,
 * so camera shake stays reproducible under seeded runs (ADR-0013).
 */
export function hashNoise1D(x, seed = 0) {
  const n = Math.sin(x * 127.1 + seed * 311.7) * 43758.5453123;
  return (n - Math.floor(n)) * 2 - 1;
}

/** Smoothstep-interpolated value noise in [-1, 1] — continuous + reproducible per seed. */
export function smoothNoise1D(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f); // smoothstep
  return lerp(hashNoise1D(i, seed), hashNoise1D(i + 1, seed), u);
}

/**
 * Advance ONE axis of a critically-damped spring toward `target` (Juckett's exact solution —
 * frame-rate independent, no oscillation/overshoot). `omega` = stiffness (bigger = snappier).
 * @returns {{pos:number, vel:number}}
 */
export function springCritDamped(pos, vel, target, dt, omega) {
  const e = Math.exp(-omega * dt);
  const x = pos - target;
  const tmp = vel + omega * x;
  return { pos: target + (x + tmp * dt) * e, vel: (vel - tmp * omega * dt) * e };
}

/**
 * Critically-damped spring on the XZ plane. Mutates `pos`/`vel` ({x,z}) in place and returns them
 * so the camera can advance toward a moving centroid smoothly. PURE w.r.t. `target`.
 * `omega` (stiffness) is a feel tunable — callers MUST pass it from config (e.g. CAMERA.followOmega);
 * no default lives here so no feel-number is baked into this pure module.
 */
export function springCritDampedXZ(pos, vel, target, dt, { omega } = {}) {
  const sx = springCritDamped(pos.x, vel.x, target.x, dt, omega);
  const sz = springCritDamped(pos.z, vel.z, target.z, dt, omega);
  pos.x = sx.pos;
  vel.x = sx.vel;
  pos.z = sz.pos;
  vel.z = sz.vel;
  return { pos, vel };
}

/**
 * Cheap asymptotic follow (Eiserloh) as a spring fallback: pos += (target - pos) * a. `a` uses an
 * EXPONENTIAL remap of the per-60Hz-frame weight so it's genuinely frame-rate independent (the
 * weight compounds correctly across variable dt). Mutates + returns `pos` ({x,z}).
 * `weightPer60HzFrame` (0..1) is a feel tunable — callers pass it from config (no default here).
 */
export function asymptoticFollowXZ(pos, target, dt, { weightPer60HzFrame } = {}) {
  const a = clamp(1 - Math.pow(1 - weightPer60HzFrame, dt * 60), 0, 1);
  pos.x += (target.x - pos.x) * a;
  pos.z += (target.z - pos.z) * a;
  return pos;
}

/**
 * Co-op camera split weight: 0 (merged) at/below `inner`, 1 (fully split) at/above `outer`, a
 * raw linear ramp between. Feather it with an ease (e.g. quadInOut) at the call site. PURE.
 * `inner`/`outer` are feel tunables — callers pass them from config (no defaults baked here).
 */
export function splitWeight(distance, { inner, outer } = {}) {
  if (outer <= inner) return distance >= outer ? 1 : 0;
  return clamp((distance - inner) / (outer - inner), 0, 1);
}

/**
 * Advance an exponentially-decaying knockback impulse for ONE step (PURE, frame-rate independent).
 * The shove velocity decays as v·e^(−drag·dt); the returned displacement is the EXACT integral of
 * that decay over dt, so one big step and many small steps land in the same place (no tunneling-by-
 * framerate). Caller adds {dx,dz} to the entity position, stores `vel`, then runs the displaced
 * circle through collision so a shove never pushes it through a wall. `drag` (1/sec) is a feel
 * tunable — callers pass it from config; as drag→0 the displacement degrades gracefully to v·dt.
 * @param {{x:number,z:number}} vel current knockback velocity
 * @param {number} dt seconds this step
 * @param {{drag:number}} opts exponential decay rate (1/sec)
 * @returns {{vel:{x:number,z:number}, dx:number, dz:number}}
 */
export function knockbackStep(vel, dt, { drag }) {
  const e = Math.exp(-drag * dt);
  const k = drag > 1e-6 ? (1 - e) / drag : dt; // ∫₀ᵈᵗ e^(−drag·t) dt, → dt as drag→0
  return { vel: { x: vel.x * e, z: vel.z * e }, dx: vel.x * k, dz: vel.z * k };
}
