# ADR-0018: Multi-boss fights (`game.bosses[]`) + the Dog/Cat duo

- **Status:** Accepted
- **Date:** 2026-06-20
- **Extends:** ADR-0014 (data-driven bosses), ADR-0009 (boss attack patterns)

## Context

Expansion 6, Stage 3. The roster's 4th boss is the **Dog/Cat duo** — Scott + Caden
asked for "the first multi-boss type… start with two bosses." Until now the engine
assumed exactly one boss: `game.boss` (a single reference) drove the HP bar, the
minion-sweep on death, and the room-clear gate. Two bosses on screen at once needs
a small architectural change plus a coordinator, while leaving the existing
single-boss floors (spider, mushroom) byte-for-byte unchanged.

Locked design (from grilling Scott + Caden): **separate HP bars**, **alternating
aggression** (only one beast attacks at a time), the survivor **enrages** when its
partner dies (**no revive**), and seeded targeting so co-op is fair.

## Decision

- **`game.boss` → `game.bosses[]`** (0, 1, or 2 entries; the duo = 2). A single-boss
  floor is just `bosses.length === 1`, so spider/mushroom code paths are untouched.
  The minion sweep and the room-clear gate now fire only when **every** boss is
  dead; `_countBossBeaten` still increments once per boss room, so the duo counts as
  **one** encounter for the weapon-slot cadence.
- **`DuoController` (`entities/bosses/duo.js`) — pure of three.js.** It holds the two
  bosses and enforces the rules on plain objects, so it is unit-tested directly
  (`tests/duo.test.js`), the same discipline as the `progression.js` helpers:
  - **Alternating aggression:** a switch timer flips `aggressor`; each behavior gates
    the _start_ of an attack on `controller.isAggressor(boss)` (an in-progress
    telegraph still completes — no jarring mid-swing cut).
  - **Enrage, no revive:** when a partner dies, the survivor's `onPartnerDown(mul)`
    folds a permanent multiplier into the shared `rage` getter (Boss shell). The dead
    boss is never revived; its HP bar greys out at 0%.
  - **Seeded co-op targeting:** `chooseTarget(players)` picks a living player with the
    run's seeded RNG, held until the next swap, so both beasts focus fairly instead of
    always piling on whoever's nearest.
    The controller is created and owned by the spawner/`Game` (`game.duo`), ticked once
    per frame in `update()`.
- **Two distinct movesets** (behavior modules, ADR-0014): **Fang** (dog) is a melee
  **pounce** state machine in `move()` — stalk → telegraphed wind-up + danger lane →
  fast dash → vulnerable recovery. **Whisker** (cat) is a ranged **cross-swipe**
  zoner (a "+"/"X" of slow bullets) that summons a small kitten litter **while it's
  the passive partner** (one pressures while the other adds). Both override the shell
  `move()`, so they redo wall-slide + arena-clamp themselves.
- **HUD multi-bar:** the single `#bossbar` becomes a `#bossbars` container with up to
  two `.bossbar` rows; `hud.setBossBars(bosses)` renders 1 or 2 (the cat's bar reads
  cool-blue so the roles are distinct). Names via `textContent`.
- **Models (ADR-0017 reused as-is):** Quaternius **Shiba Inu** + **Cat**, CC0,
  animated. Their clips are prefixed `AnimalArmature|` (the cat triple-prefixed) —
  `AnimModel`'s strip-on-last-`|` already handles it, no code change. Fallback intact:
  no GLB → procedural `beastMesh.js` (warm dog / cool cat).

## Consequences

- The engine now supports N-boss rooms with almost no special-casing; a future
  3-boss fight is mostly config + a controller tweak.
- Minions match the boss as before: the duo floor's normal rooms spawn pups (warm) +
  kittens (cool) via the `enemies.js` theme branch (`theme.boss === 'duo'`).
- The duo is the run's final floor **for now**; the canonical order
  (spider→human→mushroom→duo→skeleton) is set once those bosses exist (Stage 5).

## Alternatives considered

- **Keep `game.boss`, hack a "second boss" beside it** — rejected: every consumer
  (sweep, HUD, win check) would special-case the duo. An array generalizes cleanly.
- **Bake the alternation/enrage logic into the boss behaviors** — rejected: it's
  shared cross-boss state, and burying it in three.js-coupled modules would make it
  untestable. A pure controller keeps the rules in one tested place.
- **Shared HP pool / revive a fallen partner** — rejected by design: separate bars +
  no revive (Scott's call) make the "kill one, the other goes berserk" beat land.
