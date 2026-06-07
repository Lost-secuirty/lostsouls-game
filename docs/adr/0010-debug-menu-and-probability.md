# ADR-0010: Debug menu (lil-gui) + probability verification

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

Scott wanted a real in-game **debug menu** for himself, and asked to **verify the game's
"% chances"** (drop rates) — pointing at his `testing-kits` harnesses and old Dokkan Battle
notes as references.

## Decision

**Debug menu** — add `lil-gui` (~30KB, MIT, the GUI three.js's own examples use). A new
`src/debug/menu.js` `initDebugMenu(game)` is **lazy-loaded only on `?debug=1` or the backtick
key**, so it never loads during Caden's normal play. It drives the live game through
`window.__game` (jump to floor/room, jump to boss, kill-all, restart, god mode, full heal,
+1 life, set weapon, drop any pickup, FPS monitor). God mode is a one-line `game.godMode`
flag honored in `Player.hurt`.

**Probability verification** — a pure `src/core/probability.js` with `atLeastOne(probs)` =
`1 − ∏(1 − pᵢ)` and `chiSquare(observed, expected)`, plus `tests/droprate.test.js` that uses
the game's own seeded RNG (`core/rng.js`) to sample the real `dropRandomPickup` 20k times and
assert the distribution matches `PICKUPS.dropTable` (chi-square below the df=6/p=0.01 critical
value **and** every category within ±10%), that boss rewards are always weapons, and that the
RNG is deterministic.

## Consequences

- A fast dev cockpit for testing content, with zero cost to normal play.
- The drop table is now provably fair and locked against regressions; the test is
  deterministic (seeded) so it never flakes.
- One new small runtime dep (`lil-gui`), only pulled into the lazy debug chunk.

## Notes / provenance

The `atLeastOne` formula is taken from Scott's April-2026 Dokkan reference notes
(_"Independent Probability: 1 − [(1 − Passive %) × (1 − HiPo %)]"_) — the correct way to
combine independent rolls (e.g. the EX-Super-Attack 77% example). The test methodology
(seeded sampling + ratio tolerance + property checks) is ported from the `testing-kits`
`property` / `cardinality` / `fuzz` harnesses. The rest of the Dokkan docs (unit stats) were
reviewed and not relevant here.
