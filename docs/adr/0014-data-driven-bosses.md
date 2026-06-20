# ADR-0014: Data-driven bosses (behavior modules)

- **Status:** Accepted
- **Date:** 2026-06-20

## Context

Expansion 6. The game shipped a single boss (the spider), hardcoded in `boss.js`
(`this.cfg = BOSS.spider`, the spider mesh, and the spider's P1/P2/P3 logic all
baked in). We're adding four more bosses (human, mushroom, dog/cat duo, skeleton),
each with its own moveset and mesh. Continuing to grow one `Boss` class with
`if (bossType === …)` branches would bloat it and couple every boss together.

## Decision

Split the boss into a **generic shell** + **per-boss behavior modules**.

- `entities/boss.js` is now a thin, type-driven shell: `new Boss(scene, x, z, bossType, diff, palette)`.
  It owns everything shared by every boss — HP, default scuttle movement, contact
  damage, the telegraph "puff up" scale, `rage`, `hurt`/`die` — and conforms to the
  same `{x,z,radius,hp,dead,update,hurt,die,isBoss}` interface as before.
- Each boss is a module in `entities/bosses/` exporting hooks the shell calls:
  `buildMesh`, `init`, optional `move`, `attacks`, `spawns`, `animate` (+ `name`, `roar`).
  Registered by type in `entities/bosses/index.js`.
- The spider's logic moved verbatim into `entities/bosses/spider.js` — it plays
  **identically** (regression-safe extraction).
- The floor's boss is chosen by data: `PROGRESSION.floors[].boss` → passed by
  `spawner.js` into the `Boss` constructor. Stat blocks stay in `config.BOSS[type]`.

## Consequences

- Adding a boss = add a `config.BOSS[type]` block + a behavior module + register it.
  No edits to the shell. Each boss's moveset is independently readable/testable.
- Pure helpers (HP-gated spawn targets like `spiderlingTarget`) stay in
  `core/progression.js` and remain unit-tested.
- The shell still assumes **one boss reference** in `game.js`; the dog/cat **duo**
  (two bosses at once) needs `game.boss → game.bosses[]` — deferred to its own
  stage/ADR. This ADR sets up the per-boss seam that the duo will build on.

## Alternatives considered

- **One big `Boss` class with type branches** — rejected: bloats `boss.js`, couples
  bosses, fights the repo's "small one-job modules" style.
- **Fully declarative pattern descriptors (data, no code)** — rejected for now: the
  movesets (telegraphed pools, dashes, teleports) are varied enough that code modules
  are clearer than a pattern mini-language. Can revisit if patterns converge.
