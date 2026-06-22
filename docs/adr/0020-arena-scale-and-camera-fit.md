# ADR-0020: Roomier arenas, a camera that fits them, and an entity size ladder

- **Status:** Accepted
- **Date:** 2026-06-20

## Context

Playtest feedback (Scott + Caden, 2026-06-20): with the expanded boss roster, normal rooms now hold
a lot of mobs firing fast, and the old **40×30** arena felt cramped — not enough space to dodge.
Scott's ask was specific: **keep the mob counts, add ~2.5× the space**, and make the **player and
basic mobs scale better / more naturally** (bosses already feel right). He also asked us to "find
the math" rather than eyeball it.

Two things in the codebase were NOT already arena-relative:

1. **The camera** is fixed and always frames the arena centered on the origin (`scene.js`,
   `game.js` shake). Enlarging the arena without moving the camera would push the room edges
   off-screen.
2. **Entity sizes** (`PLAYER`, `ALLY`, `ENEMY.*.radius`) are absolute. In a bigger arena, with the
   camera pulled back to fit, everything would shrink on screen and read as tiny.

Everything else — walls, the door, ground/grid, fog, and every spawn position — already derives
from `ARENA`, so it scales for free.

Research backed two design calls (see Sources): twin-stick / bullet-hell arenas are intentionally
**confined-but-roomy** because attacks come from all sides, and **size communicates threat**, so a
clear player < basic-mob < boss hierarchy helps a young player read danger at a glance.

## Decision

A **scale pass**, all tunable in `config.js`:

1. **Arena ~2.5× area.** `ARENA` **40×30 → 64×48** (≈2.56× area). **Speeds are left unchanged** —
   keeping movement and bullet speeds constant in a bigger room is what actually buys "more room to
   dodge" (more space relative to the action), which is the real ask.
2. **Camera fits the whole room.** `CAMERA.height`/`back` scale with the arena (30/18 → 48/29, the
   same ×1.6) so the **entire room stays visible** — deliberately chosen over a follow-cam because
   seeing every bullet is fairer for a kid. Fog in `scene.js` now derives from camera distance +
   arena span instead of fixed 45–90, so the far wall stays readable as the arena grows.
3. **A documented size ladder.** Player/ally **0.7 → 0.85**, chaser **0.85 → 1.05**, shooter
   **0.95 → 1.2**; bosses unchanged. The ladder (player < chaser < shooter < boss) is asserted by
   `tests/scale.test.js` so it can't silently regress. `radius` is both the drawn size and the
   collision circle, so bumps were kept gentle.

## Consequences

- **Easier:** more room to maneuver with the same mob counts; threats read by size; the whole room
  is always on screen. Any future arena edit auto-scales walls/door/ground/grid/fog/spawns, and the
  camera/fog follow from two numbers.
- **Trade-offs:** the camera pulls back to fit, so sprites are somewhat smaller on screen than
  before (the gentle size bumps offset most of it); final "feel" is a `config.js` dial for Scott +
  Caden (parked as a follow-up in `BACKLOG.md`). Bumping enemy `radius` slightly enlarges their
  collision/contact footprint — acceptable given the extra dodge room, and reversible in config.
- **Not touched:** balance/stat-cap scaling and gun tuning (machine gun / homing / rockets feel OP)
  are **parked, not changed** this pass, per Scott — see `BACKLOG.md` (changing balance mid-stream
  is how we'd end up reworking twice).

## Alternatives considered

- **Follow-cam (constant zoom).** Keeps sprite size fixed, but you can't see the whole room — a kid
  could be hit by off-screen bullets. Rejected as less fair for the target player.
- **Bigger arena, camera unchanged.** Room edges fall off-screen. Rejected.
- **Scale everything (arena + speeds + entities) by the same factor.** That's just a unit change —
  it looks identical and adds no actual dodging room. Rejected; the point is to scale the arena
  _more_ than the entities/speeds.

## Sources

- [What Other Games Can Learn From the Bullet Hell Genre — AV Club](https://www.avclub.com/what-other-games-can-learn-from-the-bullet-hell-ge)
- [Design Tips: In-Game Proportions and Scale — Game Developer](https://www.gamedeveloper.com/design/design-tips-in-game-proportions-and-scale)
- [Metrics — The Level Design Book](https://book.leveldesignbook.com/process/blockout/metrics)

## Amendment (2026-06-22, v0.8.7 — B3, ADR-0026 follow-up)

The "static full-room camera, no follow-cam" call above is **softened, not reversed.** Scott opted
into a **subtle spring-follow** (`config.CAMERA.follow*`, `src/core/camera.js`): the camera gently
pans toward the live-player centroid, but the pan is **hard-clamped to `followMaxPan` (5 units)** so
the whole room stays on screen — the "see every bullet" fairness intent is preserved. In co-op the
pan eases back to center as the players separate so both stay framed (we render one shared camera,
not split-screen). It's config-gated (`followEnabled`, default on) and pinned to the old static view
under `reducedEffects` + `calmCamera` (motion-sensitive play). The rejected "follow-cam (constant
zoom)" alternative remains rejected — this is a small bounded pan, not a zoom that hides the room.
