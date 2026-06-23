# ADR-0029 — Meta-progression: Echoes + versioned localStorage save

**Status:** Accepted — B10 (v0.8.15)

## Context

B9b shipped the room-clear offer screen. The next layer is permanent progression:
currency earned across runs, spent on baseline stat buffs that persist into every
future run. This requires the game's first cross-run save (previously only settings
were persisted).

## Decisions

### 1. Currency = Echoes (residual boss life-force)

Bosses in the rift carry extra life-force, energy, and power. When you kill them,
that residual energy — **Echoes** — lingers. Post-beat, you absorb it. Mechanically:
a flat-integer currency (never fractional) awarded per boss kill, scaled by floor
depth (`echoesPerBoss + echoesFloorBonus × floorIndex`).

### 2. The whole meta layer is gated behind beating the game

The first playthrough is the pure base game. Until you clear all floors:

- Bosses shed **0 Echoes** (`recordBossKill` checks `gameBeaten` before awarding).
- `canBuy` returns false for every node.
- `baselineStacks` returns all-zero for every stat.

After the first full win (`recordWin()` → `gameBeaten = true`), all three unlock.
The gate is **triple-enforced** — bypassing the UI can't circumvent it.

### 3. "Beaten the game" = clearing the final boss (the current last floor)

`game._onWin()` calls `saves.recordWin()`. The debug menu lets Scott flip the gate
(`🏆 Mark game beaten`) and grant Echoes without grinding, so the post-beat loop is
testable immediately.

### 4. Upgrades = power-capped, breadth-heavy baseline buffs

Six nodes feed existing capped curves (`vitality`, `sharpness`, `swiftness`, `rapid`,
`toughHide`, `aegis`). Each node has a small `maxLevel` (2–3) and plugs into the
diminishing-returns curves already in `UPGRADES` / `DAMAGE_REDUCTION`, so total
power stays modest even with all nodes maxed. Scott retunes costs in `META_UPGRADES`
in `config.js`.

### 5. Screen name = "Resonance"

Echoes _resonate_ into permanent power. Start-menu button: `🌀 Resonance`.
Dialog title: "Resonance". (Not "Echo Forge" — Scott explicitly chose this name.)

### 6. Versioned save schema (v: 1)

```js
{ v: 1, echoes: 0, gameBeaten: false,
  upgrades: { <nodeId>: level },
  stats: { runs, wins, bestFloor, bossesBeaten } }
```

Unknown/missing `v` or a corrupt blob → safe reset via `migrate()`. All fields
coerced on load via `normalizeSave()`. Never throws at the storage boundary
(try/catch, private mode / headless degrade to defaults). Mirrors `settings.js`.

### 7. Player decoupled from localStorage

`baselineStacks(saves.get())` is computed once in `game.startRun()` and passed as
`baseline` into each `Player` constructor. Player never reads localStorage directly.
Co-op: both players share the account's baseline automatically.

## Implementation

- `src/config.js` — `SAVES` (earn rates) + `META_UPGRADES` (the node list).
- `src/core/saves.js` — pure helpers + `Save` singleton (mirrors `settings.js`).
- `src/ui/metaProgress.js` — native `<dialog>` Resonance panel (mirrors `credits.js`).
- `src/game.js` — wires `recordWin`, `recordBossKill`, `recordRun`, `baselineStacks`,
  `consumeForge` → `openMetaPanel`.
- `src/entities/player.js` — `baseline` option in constructor; `reset()` seeds `_up`,
  `maxHearts`, `guardCharges` from it.
- `src/systems/input.js` — `consumeForge()` (F key + gamepad Select/btn 8).
- `src/debug/menu.js` — "Meta" folder: readout + Mark beaten + +100 Echoes + Reset.
- `index.html` — `#meta` dialog + `.meta-*` CSS + `🌀 Resonance` start-menu button.
- `tests/saves.test.js` — 43 tests covering the gate, econ, normalize/migrate, round-trip.

## Evolvability hazards

- **Persisted contract:** bump `v` and add a new `migrate` branch for any schema change.
  Never rename an existing field without a migrate path — old saves would silently lose data.
- **The gate:** all three enforcement points must stay consistent if the earn/spend
  flows change. A new earn path that doesn't check `gameBeaten` would break the promise.
- **baselineStacks stat keys** must match `player._up` keys exactly
  (`damage`, `fireRate`, `speed`, `damageReduction`) plus the special cases
  (`hearts` → `maxHearts`, `guard` → `guardCharges`). A rename in one place
  must be reflected in the other.
