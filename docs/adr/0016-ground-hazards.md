# ADR-0016: Ground hazards system (lingering telegraphed zones)

- **Status:** Accepted
- **Date:** 2026-06-20

## Context

Expansion 6, Stage 2 (the mushroom boss). Its signature P3 is **lingering poison
pools** — areas you must walk out of — and dying puffballs (P4) pop into small
pools too. The engine had only instantaneous threats (bullets, contact); nothing
that occupies ground over time. We need a fair, reusable hazard primitive.

## Decision

Add `src/systems/hazards.js` — a **pooled** system mirroring `bullets.js`:

- A fixed pool of flat ring meshes lying on the XZ ground. `spawn(x, z, opts)`
  takes per-zone `radius / warnTime / liveTime / damage`, so one system serves
  the boss's pools, puffball death-pools, and any future fire/acid.
- Each zone has two beats: a **harmless pulsing telegraph** (`warnTime`) — the
  fair-warning window to walk out — then a **lethal** window (`liveTime`) that
  damages players standing in it on a slow tick (`HAZARD.tickInterval`).
- Owned by `Game`: created in `init()`, updated in the PLAYING loop, and cleared
  on room load + room clear (so pools never carry between rooms).
- Tunables in `config.HAZARD` (pool size, tick, colors); per-zone values come
  from `config.BOSS.mushroom.pool*`.

## Consequences

- Telegraph-first matches the repo's #1 fairness rule (a young co-op player gets
  a clear window to leave) and is reusable for later bosses without new systems.
- It's a third pooled system alongside bullets/particles — same cheap pattern,
  no new deps. Render is a translucent disc (`depthWrite:false`, `renderOrder -1`)
  so it sits under entities and never occludes them.
- Damage runs on a tick (not per-frame) so standing in a pool is punishing but
  not instant-death — tunable in `config`.

## Alternatives considered

- **Reuse bullets as slow/huge projectiles** — rejected: pools are stationary,
  persist, and damage repeatedly; that fights the one-hit-then-die bullet model.
- **A full particle/VFX dependency** — rejected: over-kill and against the
  no-unnecessary-deps grain; a flat disc + timers is enough and readable.
