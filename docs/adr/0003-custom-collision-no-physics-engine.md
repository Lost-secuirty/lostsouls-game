# ADR-0003: Custom collision, no physics engine

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

A top-down bullet-hell needs lots of fast collision checks (hundreds of bullets vs
enemies, walls, player) but **not** realistic physics (no stacking, ragdolls, joints).
Options: a full engine (cannon-es, Rapier) or hand-rolled checks.

## Decision

Hand-rolled collision in `core/math2d.js`, all on the **XZ plane (2D math)**:

- Entities (player, enemies, bullets) are **circles** (a position + radius).
- Walls / obstacles are **AABBs**.
- Two primitives cover everything: `circleVsCircle` and `circleVsAABB`.

No physics-engine dependency.

## Consequences

- Tiny, readable, and fast — easy for a kid to follow ("bullets are circles, walls are
  boxes").
- Pure functions → unit-testable without a browser.
- Responsive, game-y feel (we tune it) instead of "physically correct."
- If we ever want knockback/ragdolls, revisit (could add `cannon-es` then).

## Alternatives considered

- **Rapier (WASM)** — great but overkill; bundle weight + WASM startup for collision we
  can do in ~20 lines.
- **cannon-es** — simpler than Rapier but still more than a top-down shooter needs in v1.
