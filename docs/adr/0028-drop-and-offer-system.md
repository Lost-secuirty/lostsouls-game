# ADR-0028: Room-clear upgrade OFFER screen (drops → pick-1-of-3)

- **Status:** Accepted
- **Date:** 2026-06-22

## Context

Mid-B9, Scott redesigned the reward loop: **no more power-ups on the ground**. Every normal room clear
should open a **pick-1-of-3 upgrade OFFER** drawn from a central item registry, with an asymptotic
"hard-cap-but-scales-almost-forever" curve, a new `ultra` rarity for a block-N-hits **guard**, and an
**AI-ally-gets-20%** rule. **B9a** shipped the pure, non-wired foundation (`core/items.js` registry,
`core/offers.js` `generateOffer`, `core/scaling.js` `marginalBonus`/`allyShare`, and the config), all
unit-tested but inert. **B9b** (this ADR) flips it on.

Hard constraints (unchanged): kid-fair (ADR-0005/B4), seeded/deterministic (ADR-0013), never-throw UI
with graceful fallbacks, every tunable in `config.js`, and **hearts stay whole integers** (the
lives→%/HP rework is deferred — see `BACKLOG.md`).

## Decision

- **Normal room clear → a paused `OFFER` state** (`states.js`) showing `OFFERS.cardCount` tier-colored
  cards (`ui/offer.js`, modeled on `ui/humanchoice.js`; keyboard 1-3 / arrows+Enter / click / gamepad;
  headless auto-resolves the first card). The door stays **closed** and the world stays paused until
  every living player has picked, then the game opens the door and drops into `ROOM_CLEAR`
  (`game._beginOffers` → `_presentNextOffer` → `_onOfferPick` → `_finishRoomClear`). **Boss rooms are
  unchanged** — they keep the ground HEAL + weapon chest (`_dropBossReward`, B8). Ground **stat**-drops
  are removed.
- **Co-op:** each player picks their **own** offer, presented **sequentially** (P1 then P2). Solo: only
  the player picks; the **AI ally** passively receives `ALLY.upgradeShare` (20%) of the player's
  accrued damage / fire-rate / move-speed bonuses (`core/scaling.js allyShare`) and carries a real gun
  the solo player can **reroll** from the offer screen (`[R]`, `ally.rerollWeapon`).
- **Two separate tier ladders by design.** `OFFERS.tiers` = `common/rare/epic/ultra` (the offer pool;
  `ultra` = the guard, offer-only). `PICKUPS.rarity.tiers` = `common/rare/epic` (the B8 ground/boss-chest
  engine, still live for boss rooms). `core/items.js` is the **single** offer registry; a **no-drift
  test** keeps its weapon tiers in lockstep with `PICKUPS.rarity.itemRarity`. The ladders never merge
  (different pools), which avoids a risky refactor of the B8 engine.
- **Effects apply in `entities/player.js`** (`applyOfferCard` → registry `effect.kind`): stacking stats
  (damage/fire-rate/speed/damage-reduction) bump a stack and recompute off the diminishing-returns
  curve; `maxLife` raises a per-player `maxHearts` (capped `CAPS.maxHearts`) and heals; `guard` adds
  block-N-hit charges; weapon `mod`s stack onto the existing BULLET behavior flags (pierce/bounce/
  bullet-speed/blast) in `_fireWeapon`/`_releaseCharge`; `weapon` fills a slot.
- **Guard** charges are consumed **first** in `hurt()` (one whole hit each). A blocked hit still spends
  the i-frame window (it _was_ a hit) but gets a distinct, lighter cue (gold spark + a metallic "shield"
  SFX, no blood / music duck / heart loss).
- **Damage reduction is a deterministic %** via a **carry accumulator** (`core/defense.js
resolveIncoming`): a 40% reduction on 1-damage hits banks 0.6 of a heart each time, and a whole heart
  comes off only when the carry crosses 1. Over a stream the player loses ≈ `(1-reduction)` of the
  damage — a true %, with **no RNG** (fits the "skill/progress is the reward, never chance" ethic) and
  `hearts` never goes fractional.
- **Upgrade retune for the every-room cadence:** offers now appear far more often than the old
  occasional drops, and the design intent is that **each pick is a SMALL nudge** (the excitement is the
  tier roll + later meta systems). So we **kept the power ceilings + `CAPS`** and only **stretched the
  ramp** (`UPGRADES.*.half` 5/6→12, `DAMAGE_REDUCTION.half` 4→8) — smaller per-pick gains, a gentle
  climb across a long/endless run. Added `CAPS.maxHearts` (12) for the new max-life path.

## Consequences

- **Easier:** one central registry (`items.js`) drives every offer; reward cadence is now a clear,
  honest "clear a room → choose your upgrade" loop; the guard/ally-share/reroll are all config-tunable.
- **Trade-offs:** the offer is a brief **pause** each room (intended — it's a choice moment); the
  carry-DR has mild opacity (a 1-damage hit can still cost a heart on the accumulator's schedule), which
  we accept as the only integer-clean way to do a true % without the deferred HP-model change; co-op
  offers are **sequential** (simultaneous is backlogged). The retune is sensible defaults — **final
  balance is Scott + Caden's** to fine-tune live (`npm run dev`).
- **Validation:** `tests/defense.test.js` (guard + carry-DR invariants), the `items.js` no-drift test,
  the existing seeded `offers.proof`/`scaling` tests, the full gauntlet, and a Playwright `window.__game`
  drive (modal appears → pick applies the effect → door opens → co-op shows two offers → 0 page errors).

## Alternatives considered

- **Probabilistic damage reduction** (each hit has a `drFrac` chance to deal 0). Simplest + integer-
  clean, but injects **chance into defense**, which conflicts with the game's "never chance" ethic.
  Rejected in favor of the deterministic carry model.
- **Half-heart / %-HP model** so a flat "% off" maps to sub-heart damage. A bigger HP-model change;
  deferred to `BACKLOG.md` (the guard + carry-DR work fine with whole hearts today).
- **Merge the two tier ladders / refactor `drops.js` to read `items.js`.** Real single-source purity,
  but it would destabilize the B8 chi-square/pity/determinism tests for no gameplay gain. Rejected; the
  no-drift test gives the safety without the churn.
