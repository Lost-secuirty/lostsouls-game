# ADR-0012: Weapon slots + global stat caps

- **Status:** Accepted
- **Date:** 2026-06-08

## Context

Expansion 5, Stage 1. Caden's "unlock a new weapon slot" idea + Scott's tuning: carry more
than one weapon, and **cap every stat** so upgrades can't run away (the old additive damage /
unbounded speed felt limitless).

## Decision

- **Weapon slots (`Player.slots`)**: start with **1** slot; capacity (`slotsUnlocked`) grows
  as bosses fall. A weapon pickup **fills the next empty slot** (and equips it), else **replaces
  the active slot**. Switch weapons: **P1 keys 1/2/3**, **P2 controller Y** (cycles). Active
  weapon + slot count shows in the HUD.
- **Unlock cadence**: `game.bossesBeaten++` on each boss defeat; the pure
  `weaponSlotsForBosses(n)` (in `core/progression.js`) unlocks a slot at bosses
  **`CAPS.slotUnlockBosses` = [2, 10, 20]**, capped at **`CAPS.maxWeaponSlots` = 3**. Unit-tested.
- **Global caps (`config.CAPS`)**:
  - **Lives** start **3**, max **5** (`game.lives` clamped wherever raised).
  - **Damage** is now a multiplier `damageMul` (base weapon damage unchanged — it feels good),
    capped at **+50%** (`CAPS.damageMul = 1.5`).
  - **Fire rate** `fireRateMul` floored at **0.5** (max +50% faster).
  - **Move speed** capped at **×1.5**.
  - Step sizes (`config.PICKUPS`) are tuned so **~3 stacks** reach each cap.
  - **A full-health player can't pick up a heart** (it's left for a hurt teammate in co-op).

## Consequences

- Power curves are bounded and predictable — important for the upcoming endless mode (enemies
  scale; the player plateaus, so endless eventually wins). Matches roguelite caps/diminishing-
  returns guidance.
- Survivor outcomes and pickups share the same capped `applyEffect`, so both honor the caps.
  Survivor DAMAGE_UP became "+20% damage" (multiplier) to match.

## Notes

Slot unlock milestones (2/10/20) and all caps live in `config.CAPS` for easy tuning.
