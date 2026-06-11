# Learnings

Running log of gotchas, fixes, and API surprises. Append (don't rewrite) with the date.
Referenced by the Working Agreement (`AGENTS.md` #2).

## 2026-06-07 — project bootstrapped

- Stack chosen and recorded in `docs/adr/0001`–`0005`.
- Three.js `CapsuleGeometry` exists in modern three (≥ r142) — used for the player/ally.
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

## 2026-06-07 — Expansion 2 (the co-designer's boss patterns + polish)

- the co-designer beat the whole game first try (died twice); difficulty "medium = good", keep it.
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
- Probability: `core/probability.js` `atLeastOne` (1−∏(1−p)) is from the project owner's Dokkan notes;
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
  stick aim persists. `Player` takes `{color, modelKey, device}`; co-op uses the green "ally"
  mesh as P2 and skips the AI `Ally`.
- Co-op targeting via `game.nearestPlayer(x,z)`; enemies/boss/bullets/pickups/survivors all
  go through `game.players`. **Revive-on-room-clear**, full-wipe spends a shared life.
- Start menu = a plain DOM overlay (`#startmenu` + `ui/startmenu.js`); `game.init()` no longer
  auto-starts — the menu calls `game.startRun(coop)`. Clicking a button also unlocks audio.
- Gamepad rumble via `vibrationActuator.playEffect('dual-rumble', …)`, feature-detected.
  Confirmed W3C standard Xbox mapping is current (One S+/Series identical).
- Headless can't feed real gamepad input, so we verified the device split + co-op logic
  (players array, nearest-target, down/continue, revive, team-death) by driving `window.__game`.

## 2026-06-08 — Expansion 5 Stage 1 (weapon slots + caps)

- `Player` now carries weapons in `slots[]` (capacity `slotsUnlocked`, grows via bosses);
  pickups `addWeapon` (fill empty slot, else replace active); switch P1 `1/2/3`, P2 controller Y.
- All stat upgrades are capped in `config.CAPS` (lives 3→5, damage ×1.5, fire-rate floor 0.5,
  speed ×1.5; ~3 stacks each). Damage became a multiplier (`damageMul`); base weapon damage
  unchanged. Survivor DAMAGE_UP retuned to +20% to match.
- Full-health players skip HEAL pickups (left for a hurt teammate). `weaponSlotsForBosses` is a
  pure, unit-tested helper (unlock at 2/10/20, cap 3). Verified caps/slots/HEAL headlessly.
- Staging Expansion 5: this is Stage 1; next = human decision-boss, then data-driven endless.

## 2026-06-10 — maintenance pass (deps, ESLint 10, action pins, SECURITY.md)

- `npm update` won't cross minors on `^0.x` deps (semver treats `^0.x` like `~0.x`) —
  three needed an explicit range bump `^0.180.0 → ^0.184.0`. Game code needed zero changes
  for three r184; all 47 unit + 7 proof tests and the build pass unchanged.
- **ESLint 9 → 10 was a no-op here**: v10 requires flat config, which this repo already had,
  so `eslint@10.4.1` + `@eslint/js@10.0.1` lint clean with the existing `eslint.config.js`
  (no `globals` changes needed). ESLint 9.x is EOL 2026-08-06. Kept at ^10.
- Workflow action pins refreshed (Node-20-era v4 actions are deprecated; runners default to
  Node 24 from 2026-06-16): checkout v4→v6.0.3, setup-node v4→v6.4.0, upload-artifact
  v4→v7.0.1, codeql-action →v4.36.2, dependency-review-action v4.0.0→v5.0.0. Gotcha:
  `git ls-remote ... refs/tags/vX.Y.Z` may return an annotated tag object — pin the peeled
  `^{}` SHA when present (checkout, codeql-action); lightweight tags point at the commit
  directly (setup-node, upload-artifact, dependency-review).
- `uvx zizmor` flagged all three workflows for `artipacked` (checkout defaults to
  `persist-credentials: true`); fixed with `persist-credentials: false` — nothing here pushes
  back to the repo. Remaining zizmor findings only appear at auditor/pedantic personas
  (undocumented-permissions comments, unnamed jobs, one excessive-permissions) — left as-is.
- Vite chunk-size warning quieted via `build.chunkSizeWarningLimit: 1024` — the Three.js
  bundle (~604 kB / 157 kB gzip) is intentionally one chunk for a single-page game.
- Added `.node-version` (22) alongside `.nvmrc` (some tools only read one), and a minimal
  `SECURITY.md` (private vulnerability reporting via the Security tab; no-auth no-PII game).
- AGENTS.md still claimed howler.js for audio — stale since Expansion 1 dropped it for the
  procedural synth (`systems/sfx.js`, ADR-0006). Fixed; lesson: stack lists in AGENTS.md
  drift silently when deps change.
- Vitest coverage thresholds (40/40/30/40) came in with the proof-backed CI gate
  (PR #7, 2026-06-09) and only gate the pure-logic `include` list — documented in a comment.
  Current coverage sits just above the floors (42/35/50/42), so they're a real regression gate.

## 2026-06-10 — research fold-in: seeded runs + determinism (ADR-0013)

- Four Gemini "deep dive" docs were reviewed for useful additions. Three (AI-dev
  trustworthiness, solo-repo security, advanced testing) cite **unverifiable,
  future-dated sources** (`arXiv:2603.*`, "ICLR 2026", tools like *ClaimCheck/
  Lore*) — treated as **RESEARCH_ONLY**, judged by concept not citation. The
  gaming-math doc's sources are real (GLI-19, NIST, `scipy.stats.binomtest`).
- **The research mostly VALIDATED what's already here** — don't "rediscover" it:
  seeded `mulberry32` (`core/rng.js`); the drop-rate chi-square test with a
  **planted-bias proof control** (`droprate.proof.test.js`); a fixed-timestep,
  decoupled loop (`core/loop.js`). The genuine gaps were (a) no way to pin a
  run's seed and (b) no cross-system determinism check.
- Added: optional `seed` on `startRun` (default unchanged) so a run is replayable
  via `window.__game.startRun(false, N)`; and `tests/determinism.test.js` driving
  the real pure rng seams (`dropRandomPickup`, `resolveDecision`, spawn rolls)
  through one shared rng. `populateRoom` is render-coupled (builds Enemy/Boss/Npc
  with the scene), so the full `Game` step stays out of the headless test — the
  guarantee covers the random *logic*, which is what reproducibility needs.
