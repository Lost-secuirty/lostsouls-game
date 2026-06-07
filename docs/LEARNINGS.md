# Learnings

Running log of gotchas, fixes, and API surprises. Append (don't rewrite) with the date.
Referenced by the Working Agreement (`AGENTS.md` #2).

## 2026-06-07 — project bootstrapped

- Stack chosen and recorded in `docs/adr/0001`–`0005`.
- Three.js `CapsuleGeometry` exists in modern three (≥ r142) — used for the player/dad.
- Pure-logic modules (`core/rng.js`, `core/math2d.js`, `systems/npcDecision.js`) import
  **nothing** from `three`, so Vitest runs them in plain Node with no DOM/WebGL.
- Asset seam: the game must run with an empty `public/models` + `public/audio`. Always
  fall back to primitives/silence — never throw on a missing asset.

## 2026-06-07 — Expansion 1 (bosses, items, lives, sound, controller)

- v1 squash-merged to `main`; for the expansion PR, reset the feature branch to
  `origin/main` first so the diff is only the expansion (squash-merge diverges history).
- Web Audio is blocked until a user gesture — must `resume()` the AudioContext on the
  first click/keydown (`{ once: true }` listeners in `main.js`). Built a tiny in-code
  synth (`systems/sfx.js`) instead of shipping audio files; dropped the `howler` dep.
- Gamepad API: poll `navigator.getGamepads()` every tick (don't cache the object); the
  pad only appears after a button press. Edge-detect buttons for one-shot actions.
- The survivor "E does nothing" report: the path was fine — fix was UX (bigger interact
  radius 2.6→3.4, banner+hit-stop feedback, gamepad A) and it's now covered by a
  headless test that stands on a survivor, presses E, and asserts the outcome applied.
- Exposed `window.__game` as a debug handle — also lets the headless smoke test drive
  scenarios deterministically (spawn a pickup, jump to the boss room, etc.).
- Boss/enemies share one interface (`x,z,radius,hp,dead,update,hurt(dmg,game),die(game)`)
  so the existing pooled-bullet collision works on the boss with no special-casing.

## 2026-06-07 — Expansion 2 (Caden's boss patterns + polish)

- Caden beat the whole game first try (died twice); difficulty "medium = good", keep it.
- His terminology: **"P# = an attack pattern"**, not a health phase. Boss attacks rebuilt as
  P1 (aimed burst) / P2 (telegraphed bullet ring, scales by floor) / P3 (HP-gated spiderling
  spawns via the pure, tested `spiderlingTarget(hpFrac)`).
- Web research takeaway baked in: **telegraph attacks** (a wind-up before the ring) is the #1
  fairness rule — keep hit-stop tiny (~20–60ms), reserve big shake for explosions/boss death.
- "Starting weapon should be weak" is real design wisdom — slowed the pistol (cooldown
  0.16→0.26) so pickups feel powerful. Confirmed via roguelite-progression sources.
- More procedural SFX added in `sfx.js` (rocket launch/boom, door/room-clear, boss roar +
  attack cues, low-health heartbeat) and the drone music rises ~2 semitones per floor.
- Tag boss adds with `isSpiderling` so the boss can count its own live spawns to maintain
  the HP-gated target.

## 2026-06-07 — Expansion 3 (bug fixes, theming, debug menu, probability)

- **"E doesn't work" was real**: `_handleSurvivors` only ran in `State.PLAYING`, so you
  couldn't help survivors after clearing a room (when it's calm — exactly when you try). Fix:
  also run it in `ROOM_CLEAR`. (Combat-only help is now a future hard-mode toggle.)
- **"Stuck going up"**: a held key's `keyup` is lost when the window/tab loses focus (common
  in the VS Code Simple Browser), so the key stays in the Set. Fix: `input.clearKeys()` on
  window `blur` + `visibilitychange(hidden)`.
- Extracted `buildSpiderMesh` into `entities/spiderMesh.js` (palette + `simple` mode) so the
  boss AND themed mini-spider enemies share it without a boss↔enemies import cycle. Floor
  palette in `PROGRESSION.floors[].palette` is shared by the boss and its monsters.
- Pickups now carry a camera-facing canvas `Sprite` label (`core/textSprite.js`,
  `depthTest:false`) + distinct shapes — readable with no pickup key.
- Debug menu = `lil-gui`, lazy-loaded only on `?debug=1`/backtick (never in normal play);
  drives `window.__game`. God mode = a `game.godMode` flag checked in `Player.hurt`.
- Probability: `core/probability.js` `atLeastOne` (1−∏(1−p)) is from Scott's Dokkan notes;
  `droprate.test.js` verifies the real drop table with seeded sampling + chi-square + ±10%
  (deterministic, no flake). Methodology ported from `testing-kits` harness patterns.
- Drive recon: the April Dokkan docs are mostly unit stats; only the RNG/probability section
  was useful (independent-probability formula, ±3% variance). Looked, used the bit that fit.

## 2026-06-07 — Expansion 4 (2-player co-op + start menu)

- **Stuck-key bug round 2:** the Exp-3 blur fix didn't catch clicking the lil-gui panel
  (window keeps focus, so the keyup is swallowed by the control). Real fix: capture-phase
  key listeners (see releases first), ignore keys when an editable element is the target, and
  release held keys on any `pointerdown` outside the canvas. Verified headlessly.
- Input is now **device-aware** (`'kb'|'pad'|'both'`) so two players share one Input; right-
  stick aim persists. `Player` takes `{color, modelKey, device}`; co-op uses the green "dad"
  mesh as P2 and skips the AI `Ally`.
- Co-op targeting via `game.nearestPlayer(x,z)`; enemies/boss/bullets/pickups/survivors all
  go through `game.players`. **Revive-on-room-clear**, full-wipe spends a shared life.
- Start menu = a plain DOM overlay (`#startmenu` + `ui/startmenu.js`); `game.init()` no longer
  auto-starts — the menu calls `game.startRun(coop)`. Clicking a button also unlocks audio.
- Gamepad rumble via `vibrationActuator.playEffect('dual-rumble', …)`, feature-detected.
  Confirmed W3C standard Xbox mapping is current (One S+/Series identical).
- Headless can't feed real gamepad input, so we verified the device split + co-op logic
  (players array, nearest-target, down/continue, revive, team-death) by driving `window.__game`.
