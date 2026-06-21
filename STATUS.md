---
lifecycle: growing
frozen: false
visibility: public
maturity: active-development
updated: 2026-06-20
---

# Status — Lostsouls

**This project is GROWING, not frozen.** It is a co-designed game (Scott + son), fun-first and
**light by design** (ADR-0005). It will keep gaining expansions and polish until it is explicitly
marked `frozen: true` in the front-matter above. Treat anything here as a current snapshot of an
in-progress build, not a final release.

This file is the lifecycle source-of-truth for the repo. The detailed running history lives in
[`docs/LEARNINGS.md`](docs/LEARNINGS.md); the "why" behind decisions lives in
[`docs/adr/`](docs/adr/).

## Lifecycle

- **lifecycle:** `growing` — actively developed; expect change.
- **frozen:** `false` — no freeze declared.
- **visibility:** `public`.

## Current state (v0.6.1)

A browser 3D bullet-hell shooter (Three.js + Vite + Express): solo with an AI ally and local
two-player co-op (keyboard/mouse/gamepad). Most recent work:

- **Expansion 6 Stage 6 (polish)** — wrote the **story bible** ([`docs/STORY.md`](docs/STORY.md):
  Caden's 1940s post-war ruined city, the experiment-gone-wrong rift, temporary survivors, WW2 ×
  rift-tech "living weapons", **no zombies**), then a **scale pass** (ADR-0020): arenas ~2.5×
  bigger (40×30 → 64×48) with the **camera sized to fit** the whole room and a documented **size
  ladder** (player < basic mob < boss). Fixed the **orbital-blade-survives-reset** bug
  (`Player.dispose`). Balance/stat-cap tuning is deliberately **parked** in `BACKLOG.md`.
- **Expansion 6 Stage 5 (finale)** — the **Human decision-boss** 🚪 "The Survivor". Before the
  fight you pick how to approach (A/B/C/D); a seeded "right" read skips the fight AND grants the
  weapon slot, a wrong read means you fight him for it (new `HUMAN_CHOICE` state + overlay,
  pure `resolveHuman`, ADR-0019). This sets the **final 5-floor order**:
  spider → human → mushroom → duo → skeleton. Expansion 6's boss roster is complete.
- **Expansion 6 Stage 4** — the **skeleton boss** 💀 "Rattlebones" (aimed bone throws, a seeded
  scatter ring, a reassemble-and-teleport escape with i-frames, and HP-gated boneling summons)
  with an animated CC0 skeleton (Quaternius). Reuses the data-driven boss + animated-model +
  hazard systems — no new ADR.
- **Expansion 6 Stage 3** — the **Dog/Cat duo** 🐶🐱, the first **multi-boss** fight
  (`game.bosses[]`, two separate HP bars, a pure `DuoController` with alternating aggression +
  enrage-on-partner-death, ADR-0018). Fang pounces, Whisker zones with cross-swipes and summons
  kittens; animated CC0 beasts (Quaternius Shiba + Cat).
- **Expansion 6 Stage 2** — the **mushroom boss** 🍄 (spore ring with a dodge gap, telegraphed
  poison pools via a new ground-hazard system ADR-0016, HP-gated puffballs) with **animated
  CC0 GLB monsters** (Quaternius Mushroom King + Mushnub minions) and an animation system
  (ADR-0017). The spider stays procedural.
- **Expansion 6 Stage 1** — data-driven bosses (behavior modules, ADR-0014), 5 new guns with
  pierce/homing/bounce/charge/orbital behaviors, and 9-room floors (ADR-0015). First of a
  staged expansion adding the human/mushroom/duo/skeleton bosses + animated CC0 models.
- **Expansion 5 Stage 1** — weapon slots + global stat caps (ADR-0012).
- **Seeded runs + determinism** — optional replayable seed on `startRun`, plus a cross-system
  determinism test over the pure RNG seams (ADR-0013).
- **Cross-repo hardening** — secret/PII pre-commit + CI scanner (public-repo BLOCK policy),
  ESLint 10, pinned actions.

20 ADRs (0001–0020). Verification: probability/proof tests, coverage gate, production smoke +
browser smoke, OpenSSF scorecard, dependency review, control audit.

## Scope (unchanged)

A static single-page game. **No accounts, no payments, no real wagering, no PII, no backend
beyond the static Express server + `/healthz`.** Light by design — it is not a governance
showcase; it is a game built for fun and learning (ADR-0005).

## Backlog

Deferred ideas and known gaps are parked in [`docs/BACKLOG.md`](docs/BACKLOG.md).
