// =====================================================================
// camera.js — pure camera-follow math (no THREE import, unit-testable).
//
// ADR-0020 framed the WHOLE room (static cam) so a kid sees every bullet. B3
// (ADR-0026 follow-up) adds a SUBTLE spring-follow on top: the camera pans
// toward the live-player centroid, but the pan is hard-clamped to ±maxPan so
// the full-room read is preserved. In co-op, as the two players separate the
// pan eases back to center (recenter) so BOTH stay framed on the shared screen.
//
// This module just computes the desired pan TARGET; game.js springs toward it
// (math2d.springCritDampedXZ) and the renderer adds it to baseCam.
// =====================================================================

import { clamp, dist, quadInOut, splitWeight } from './math2d.js';

/**
 * Desired camera pan point (world XZ) for the current players. PURE.
 * @param players array of { x, z, alive }
 * @param opts { maxPan, splitInner, splitOuter } — all from config (no baked feel numbers)
 * @returns {{x:number, z:number}} pan offset from arena center (0,0), clamped to ±maxPan
 */
export function cameraTarget(players, { maxPan = 0, splitInner = 0, splitOuter = 0 } = {}) {
  const alive = players ? players.filter((p) => p && p.alive) : [];
  if (alive.length === 0) return { x: 0, z: 0 };

  let cx = 0;
  let cz = 0;
  for (const p of alive) {
    cx += p.x;
    cz += p.z;
  }
  cx /= alive.length;
  cz /= alive.length;

  // clamp the pan small so the whole room stays readable (the ADR-0020 promise)
  cx = clamp(cx, -maxPan, maxPan);
  cz = clamp(cz, -maxPan, maxPan);

  // co-op: as the pair separates, ease the pan back toward center so both stay on the
  // shared screen (we render one camera, not split-screen). Feathered with quadInOut.
  if (alive.length > 1) {
    const d = dist(alive[0].x, alive[0].z, alive[1].x, alive[1].z);
    const w = quadInOut(splitWeight(d, { inner: splitInner, outer: splitOuter }));
    cx *= 1 - w;
    cz *= 1 - w;
  }

  return { x: cx, z: cz };
}
