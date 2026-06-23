# 0001 — FPS instrumentation + safe dial-backs

**Shipped:** v0.8.16 · **Branch:** `feat/fps-perf-hud`

## Context

The game ran **~33fps while moving (dips < 30)** on the dev laptop (i9 / RTX 5060 / 32GB) — hardware that
should do 100+. The cause is a renderer/config bottleneck, not scene complexity. But there was **no clean
way to measure FPS / draw calls / the cost of each effect in-game**, so any fix would be a guess. Per the
standing rule _measure, don't guess-fix_, the first move is to make the bottleneck measurable, bundled
with the two lowest-risk dial-backs so there's a likely real gain in the same PR.

## Decisions

- First FPS PR = **measure + safe dial-backs** (not measure-only; not instancing). Instancing is deferred
  until the readout proves draw calls are the bottleneck.
- Audit ground-truth: pixel ratio was already capped, bullets already pooled, N8AO already half-res/Low.
  Likely bottleneck = **fill-rate** (2048 shadow map + post-FX), **not** draw calls. Post-FX is
  identity-critical (ADR-0025) — optimize, never strip.

## What shipped

- **Measure:** the debug **Performance** folder gained **Frame ms** + **Triangles** (it already showed
  FPS + draw calls). New **Graphics (A/B perf)** folder toggles each fill-rate suspect live and
  independently — pixel-ratio cap, MSAA samples, shadows + map-size, post-FX, bloom, AO quality, vignette,
  and camera-follow (standalone, so the `config.calmCamera` coupling can be ruled out).
- **Live finding during build:** the owner observed post-FX + shadows off = **30 → 165fps** (refresh-cap).
  Camera-follow rides the same "reduced effects" switch via `calmCamera` but can't cost frames — so the
  bottleneck is the **post-FX pipeline + shadows**, not draw calls. The targeted cut (MSAA / AO) is the
  data-gated follow-up PR once the A/B isolation names the sub-pass.
- **Dial-backs (reversible defaults):** `GRAPHICS.shadows.mapSize` 2048 → **1024**; `pixelRatioCap`
  2 → **1.5**.
- **Plumbing:** pure `core/graphics.js` (`effectivePixelRatio` + option arrays, unit-tested); `scene.js`
  setters `setPixelRatioCap` / `setShadowMapSize` (disposes the old shadow map) exposed via `game.gfx`;
  `postfx.rebuild()` for live AO/vignette changes.

## As-built (deviation from the original plan)

The original plan called for a **standalone `ui/perfHud.js` overlay** + loop/dt plumbing + a
`perfHud.test.js`. During build the audit was found incomplete: the debug menu **already** had a live
FPS/draw-call readout. A separate overlay would duplicate it, against the "don't over-build" priority. So
the existing folder was **extended** instead, the overlay/loop/dt changes were dropped, and the unit test
covers the new pure `core/graphics.js` helper instead. Net: less code, no duplication, same goal.

## Verification

- Gauntlet green: format · lint · 281 tests · coverage 57.67% (≥40%) · build · `smoke:prod` · `smoke:browser`.
- **Owner-side (the real measurement):** `npm run dev`, open debug (`` ` ``), watch the Performance folder
  while flipping Graphics A/B levers. Record baseline (2048 / cap 2) vs dial-back (1024 / cap 1.5) FPS +
  draw calls. **Branch:** high draw calls in a packed boss room → instancing PR next; FPS swinging with
  shadows/post-FX → fill-rate is the win. (`pixelRatioCap` only moves the needle on hi-DPI panels.)
