# ADR-0019: Human decision-boss + the HUMAN_CHOICE state

- **Status:** Accepted
- **Date:** 2026-06-21
- **Extends:** ADR-0014 (data-driven bosses), ADR-0013 (seeded RNG), ADR-0010 (probability)

## Context

Expansion 6, Stage 5 (the finale). The roster's last boss is the **Human** — and
Scott + Caden wanted it to be a **decision-boss**, not just another fight: a nervous
survivor blocks the gate and you pick how to approach (A/B/C/D). The outcome is a
gamble (you never know which read was right), echoing the survivor help/leave
mechanic (ADR — npcDecision). A **right** read lets you pass — you SKIP the fight
and still get the weapon slot; a **wrong** read means he panics and you fight him
for it. This is the first boss that pauses the game for a UI choice before combat.

## Decision

- **A real game `State`, not a flag:** added `State.HUMAN_CHOICE`. `game.update()`
  only ticks entities under `PLAYING`/`ROOM_CLEAR`, so the fight pauses for free
  while the choice overlay is up. `loadRoom` enters `HUMAN_CHOICE` (instead of the
  normal "KILL IT" banner) when `info.def.boss === 'human'`.
- **Pure seeded resolver** (`systems/humanDecision.js`, modeled on `npcDecision.js`):
  `resolveHuman(rng, choice)` consumes exactly one `rng.chance(HUMAN_BOSS.rightChance)`
  (default **0.25** — the design's config knob), so it's reproducible (ADR-0013) and
  unit-tested. The button **labels are flavor only** — which choice is "right" is
  never tied to the label, so it can't be memorized.
- **The reward is the existing boss-clear cadence — no new slot logic.** A right read
  removes the un-fought boss and runs the unchanged `_onRoomClear` → `_countBossBeaten`
  → `weaponSlotsForBosses` → `setSlotsUnlocked` path; a wrong read fights the boss,
  which funnels into the same path on death. The human counts as exactly **one** boss
  either way, so `CAPS.slotUnlockBosses` cadence is untouched (no drift).
- **Overlay reuses the start-menu pattern** (`ui/humanchoice.js` + `#humanchoice` DOM,
  shared button CSS): mouse + keyboard (1-4 / arrows + Enter) in the module, gamepad
  (stick + A) driven from `game.update`'s `HUMAN_CHOICE` arm. Headless-safe
  (auto-resolves when the element is absent, so `window.__game` drives still work).
- **Boss + dialog are data:** `bosses/human.js` reuses the shared primitives
  (`aimedBurst`/`telegraphedRing`/`topUpMinions`/`loadAnimated`, procedural
  `makeCharacter` fallback) — no new duplication. All dialog + tunables live in
  `config.HUMAN_BOSS` / `config.BOSS.human`; adding/altering a choice is data-only.
- **Final floor order set:** `spider → human → mushroom → duo → skeleton` (the chosen
  tight 5-floor run), diff re-tuned monotonically — config-only.

## Consequences

- The engine now supports a "pause for a UI decision" boss with one new State; future
  pre-fight choices (merchants, riddles) are mostly data + the existing overlay.
- The "you never know" gamble is honest and seeded — a fixed seed replays the same
  outcome across both branches.

## Alternatives considered

- **A boolean flag instead of a State** — rejected: a real State pauses the fight via
  the existing update gate with no scattered `if (paused)` checks.
- **A bespoke slot-grant for the skip** — rejected: reusing `_onRoomClear` keeps the
  reward cadence in ONE place (no duplication, no drift vs. the wrong-read path).
- **Label-tied "correct" answer** — rejected: it'd be memorizable; seeded RNG keeps
  every run a genuine gamble (matches the survivor help/leave design).
