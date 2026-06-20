# ADR-0015: New bullet behaviors, 5 new guns, and 9-room floors

- **Status:** Accepted
- **Date:** 2026-06-20

## Context

Expansion 6, Stage 1. Scott + Caden picked **5 new guns** and a longer floor
layout. The pooled bullet (`entities/bullets.js`) previously carried only
position/velocity/life/team/damage + `explosive`. The new guns need a few extra
projectile behaviors, and two guns don't fit the "fire on a fixed cooldown" model.

## Decision

- **New per-shot bullet flags** (all optional, composed from a weapon def; default off):
  - `pierce` (int) — pass through N enemies before dying (tracks a per-bullet
    hit-set so it never double-hits the same enemy).
  - `homing` + `turnRate` — curve toward the nearest enemy. Steering uses the pure,
    unit-tested `turnAngle(cur, des, maxStep)` (`core/math2d.js`); the **capped turn
    rate** is the fairness lever — a perpendicular juke still loses it.
  - `bounces` (int) — ricochet off walls via axis-separated reflection, then despawn.
  - per-bullet `life` / `scale` / `color` overrides (color via a small material cache).
- **5 new guns** (`config.WEAPONS`): **Homing Missiles** (homing + explosive),
  **Railgun** (fast, `pierce: 6`), **Bouncer** (`bounces: 3`), **Charge Cannon**
  (hold-to-charge), **Orbital Blade** (blades orbit the player, no aiming). They drop
  in normal rooms and as boss rewards (`pickups.js` `WEAPON_TYPES`, now exported so
  tests + the debug menu stay in lockstep).
- **Charge + Orbital are handled player-side** (`player.js`), not as fire-on-cooldown
  weapons: Charge tracks hold time and fires a scaled/piercing cannonball on release
  (auto-fires at full charge so a young kid who just holds it still shoots); Orbital
  maintains contact-damaging blades with a per-enemy hit cooldown.
- **Floors are now 9 mob rooms + 1 boss** (`PROGRESSION.roomsPerFloor: 5 → 9`);
  `enemiesPerRoom`/`shooterFromRoom`/`survivorRoomsInFloor` retuned for the longer
  floor. The progression math (`floorInfo`) is already parameterized, so only the
  number changed.

## Consequences

- All new behaviors live in the single pooled `update()` loop — no second projectile
  system, no new deps (still glowing spheres, tinted/scaled). Bullets stay within the
  600-slot pool budget.
- Tests that encoded the old `5+1` floors and the old 3-weapon set were updated to the
  new design (progression unit/proof tests, drop-table fairness now df=11, the
  determinism transcript mirrors `9+1`). Coverage stays above the 40/30/40 floor.
- Fairness for kid co-op is tuned into the configs (slow homing turn rate, slow/few
  bouncers, generous charge) — verified by play, per the repo's "feel" rule.

## Alternatives considered

- **A separate projectile system per behavior** — rejected: the pooled bullet absorbs
  every behavior with small flags; one system is simpler and cheaper.
- **Boomerang gun** — offered but not chosen, so the returning-bullet code was not added.
