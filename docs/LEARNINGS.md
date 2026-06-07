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
