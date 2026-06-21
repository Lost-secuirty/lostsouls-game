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
  future-dated sources** (`arXiv:2603.*`, "ICLR 2026", tools like _ClaimCheck/
  Lore_) — treated as **RESEARCH_ONLY**, judged by concept not citation. The
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
  guarantee covers the random _logic_, which is what reproducibility needs.

## 2026-06-11 — secret/PII gate added (cross-repo hardening pass)

- This repo now carries the PII-blocking scanner variant (public-repo policy):
  `tools/scan_staged.py` + `.githooks/pre-commit` + `.github/workflows/scan.yml`.
  The SessionStart hook activates `core.hooksPath` on web sessions.
- Verified end-to-end, not just self-test: a planted AWS key staged in this
  repo was blocked by the real pre-commit hook (exit 1), then cleaned up.
- The scanner family diverges deliberately across repos: public repos BLOCK
  PII, private-tier repos WARN only — read the module docstring before
  "fixing" the difference.

## 2026-06-20 — Expansion 6 Stage 1 (data-driven bosses + 5 guns + 9-room floors)

- **Boss refactor (ADR-0014):** `boss.js` is now a generic, type-driven shell;
  per-boss logic lives in `entities/bosses/<type>.js` (spider extracted verbatim,
  plays identically). Add a boss = add `config.BOSS[type]` + a behavior module +
  register in `bosses/index.js`. `spawner.js` passes `info.def.boss`. The duo
  (two bosses) still needs `game.boss → game.bosses[]` — deferred to Stage 3.
- **New bullet flags (ADR-0015):** `pierce` (with a per-bullet hit-set so it never
  double-hits one enemy), `homing` + `turnRate` (steer via the new pure
  `turnAngle()` — capped turn = a perpendicular juke escapes it), `bounces`
  (axis-separated wall reflection), plus per-bullet `life`/`scale`/`color`. All in
  the one pooled `update()`. Color needs a tiny material cache (shared mats can't
  carry per-bullet color).
- **Charge + Orbital are player-side, not fire-on-cooldown.** Charge tracks hold
  time and auto-fires at full charge (kid can just hold). Orbital keeps contact
  blades with a per-enemy hit cooldown. KNOWN: orbital blade meshes are world-space
  scene children and aren't torn down on restart — minor leak, flagged for Stage 6.
- **Tests had to change with the design:** floors went `5+1 → 9+1`
  (`roomsPerFloor`), so the progression unit/proof tests and the determinism
  transcript were updated to `9+1`. The drop-table now has 12 categories (df=11) —
  bumped the χ² bound to 24.725 and N to 40000 for a stable seeded check. Exported
  `WEAPON_TYPES` from `pickups.js` so the boss-reward test + debug menu stop
  hand-copying the weapon list.
- **Pre-existing bug fixed:** opening `?debug=1` at boot crashed `initDebugMenu`
  (`game.player.weapon` read before `startRun` creates players). Guarded with
  `game.player?.weapon ?? 'pistol'`. Found via a Playwright drive of `window.__game`.
- **Verified:** lint/format clean; 54 unit tests; coverage 43/37/51/44 (> floor);
  build + prod smoke; a Playwright drive fired all 5 guns, ticked bullets, spawned
  the refactored spider, and confirmed zero console errors.

## 2026-06-20 — Expansion 6 Stage 2 (mushroom boss 🍄 + ground hazards + animated GLB models)

- **Mushroom boss (ADR-0014 pattern):** `bosses/mushroom.js` — P1 spore spit, P2
  spore ring with a seeded dodge gap (`game.rng.int(n)`), P3 telegraphed poison
  pools, P4 HP-gated puffballs via pure `puffballTarget()` (unit-tested) that pop
  into a pool on death (new generic `Enemy.onDeath` hook). New "The Fungal Depths"
  floor; mini-mushroom minions via `enemies.js` theme branch.
- **Ground hazards (ADR-0016):** `systems/hazards.js`, pooled like bullets;
  telegraph→lethal flat discs; owned by Game, cleared on room load/clear.
- **Animated GLB models (ADR-0017) — two non-obvious skinned-mesh gotchas, both
  found by DRIVING the real build with Playwright (not unit tests):**
  1. **Invisible #1 — frustum culling:** skinned meshes keep a bind-pose bounding
     sphere that doesn't follow the bones, so three.js culls them off-screen.
     Fix: `frustumCulled = false` on the model's meshes (in `AnimModel`).
  2. **Invisible #2 — `Box3.setFromObject` lies on skinned models:** it read the
     bind/bone extents as ~206 units, so `fitTo` shrank the mushroom to a
     **0.05-unit speck**. Fix: measure the union of MESH `geometry.boundingBox`
     transformed by world matrix instead. After both fixes the boss renders ~3–5
     units and minions ~1.9.
  - **Cloning:** animated/skinned GLBs MUST use `SkeletonUtils.clone`
    (`three/addons/utils/SkeletonUtils.js`), never `Object3D.clone` (the clone
    won't rebind to its own skeleton). Each instance needs its own mixer; clips
    come from the original `gltf.animations`. Quaternius clip names are prefixed
    `CharacterArmature|` — strip it.
  - Models: Quaternius **Mushroom King** + **Mushnub**, CC0, in `public/models/`,
    credited in `ASSETS.md` (committed; ~500 KB, under the 1 MB hook limit).
- **Verified:** lint/format; 61 unit tests (added `puffball`, `animmodel`);
  coverage 47/41/54/48; build + prod + browser smoke; a Playwright drive confirmed
  the mushroom boss + 6 themed minions render & animate, pools + puffballs spawn,
  spider unchanged, zero console errors; full security gauntlet green.

## 2026-06-20 — Expansion 6 Stage 3 (Dog/Cat duo 🐶🐱 — the first MULTI-boss)

- **Multi-boss refactor (ADR-0018):** `game.boss → game.bosses[]` (0/1/2 entries).
  Single-boss floors are just `bosses.length === 1`, so spider/mushroom are
  untouched (regression-checked: spider still shows one bar). Minion sweep + the
  room-clear gate now fire only when **every** boss is dead; `_countBossBeaten`
  still +1 per boss room, so the duo is one encounter for slot-unlock cadence.
- **`DuoController` (`bosses/duo.js`) is pure of three.js** (operates on boss-like
  objects), so the locked rules are unit-tested directly: alternating aggression
  (timer swap; each behavior gates its attack starts on `isAggressor(boss)`),
  enrage-on-partner-death (no revive; `boss.onPartnerDown(mul)` folds a permanent
  multiplier into the shared `rage` getter), and seeded co-op targeting
  (`chooseTarget(players)`, held until the next swap). Keeping it three-free is
  what makes it testable — same pattern as the `progression.js` helpers.
- **Two beasts, two rhythms:** Fang (dog) is a melee **pounce** state machine in
  `move()` (stalk→wind/telegraph lane→dash→recover); Whisker (cat) is a ranged
  **cross-swipe** zoner that summons a small kitten litter **while passive** (so
  one pressures while the other adds). Both override the shell `move()` and so must
  redo wall-slide + arena-clamp themselves (the shell only sets `mesh.position`).
- **HUD multi-bar:** `#bossbar` (one element) → `#bossbars` container with two
  `.bossbar` rows; `hud.setBossBars(bosses)` fills 1 or 2 (cat bar is cool-blue,
  dead boss greys at 0%). Names use `textContent` (no innerHTML).
- **GLB clip-prefix is NOT always `CharacterArmature|`:** the Quaternius animals use
  `AnimalArmature|Walk`, and the cat is even **triple-prefixed**
  (`AnimalArmature|AnimalArmature|AnimalArmature|Walk`). `AnimModel` already strips
  on the LAST `|` (`split('|').pop()`), so both resolve to `Walk` with no change —
  the generic split was the right call in Stage 2. Verified the real clip list by
  parsing the GLB JSON chunk (`readUInt32LE(12)` → JSON) before wiring.
- **Preview serves `dist/`, dev serves `public/`:** dropping the GLBs into
  `public/models/` after `npm run build` left the _built_ `dist/` without them, so a
  `vite preview` drive rendered the **procedural fallback** beasts (not a bug — the
  fallback working is the point). Rebuild after adding assets, or drive the dev
  server. Also: Chromium blocks "unsafe" ports (5060 = SIP) for `page.goto` — use
  4173/5173/8080.
- **Models:** Quaternius **Shiba Inu** (`dog.glb`) + **Cat** (`cat.glb`), CC0, in
  `public/models/`, credited in `ASSETS.md`. The duo doesn't have to _look_ like a
  cat/dog (co-designer's call) but recognizable animals delight the kid.
- **Verified:** lint/format; 66 unit tests (added `duo`); coverage 47/41/54/48
  (> floor); build + prod + browser smoke; a Playwright drive confirmed two bosses
  - two HP bars render with the real animated models, the cat summons a kitten,
    killing one beast enrages the survivor + greys its bar, spider single-boss
    unchanged, zero console errors.

## 2026-06-20 — Expansion 6 Stage 4 (skeleton boss 💀 "Rattlebones")

- **New boss on existing systems (no new ADR needed):** `bosses/skeleton.js` — P1
  aimed bone-bolt volley, P2 scatter ring (even ring + seeded per-bone jitter via
  `game.rng.next()` = a dodgeable "scatter"), P3 reassemble & relocate, P4 HP-gated
  bonelings via pure `skeletonWaveTarget()` (unit-tested; tops out at 4 — the skeleton
  is the summoner). New "The Catacombs" floor; bone-white minions via the `enemies.js`
  theme branch.
- **Reassemble/teleport = one reusable shell flag.** Added `boss.invuln` to the generic
  Boss shell: `hurt()` early-returns AND the contact-damage check is skipped while it's
  true. The skeleton sets it for its collapse→vanish→reform beat (a free breather +
  i-frames), reusing one `reassembleTimer` for both the interval-between and the
  gone-duration. Drove it headless: `hurt()` during the window did nothing, then it
  reformed far from the players.
- **Config-first this time (Scott's feedback):** every skeleton feel-number went into
  `config.BOSS.skeleton` from the START (timings, scatter jitter, teleport margin,
  boneling scale/hp, spawn ring) — no end-of-PR rework. Construction ratios
  (skeletonMesh.js) and the SFX recipe (`bossRattle`) stay inline by the established
  split (spiderMesh/mushroomMesh/sfx precedent). See the `config-tunables-upfront` note.
- **Quaternius GLB clip names can be DOUBLY mangled:** this skeleton's clips are
  `CharacterArmature|CharacterArmature|CharacterArmature|Walk|CharacterArmature|Walk`.
  `AnimModel`'s `split('|').pop()` still yields `Walk`, so it Just Worked — the
  strip-on-last-`|` choice keeps paying off across every model (mushroom
  `CharacterArmature|`, animals `AnimalArmature|`/tripled, skeleton this). Confirm clip
  names by parsing the GLB JSON chunk (`readUInt32LE(12)` → JSON) before wiring.
- **Models:** Quaternius **Skeleton** (Ultimate Monsters, CC0) in `public/models/`,
  credited in `ASSETS.md` (~791 KB).
- **Verified:** lint/format; 69 unit tests (added `skeletonwave`); build; a Playwright
  drive — boss renders + animates (sword in hand), P1/P2 fire, bonelings rise at ≤50%
  HP, the reassemble i-frames block damage then it reforms, single-boss bar unchanged,
  0 console errors.

## 2026-06-20 — SonarCloud duplication gate vs. a content-growing game (the fix-loop)

- **Symptom:** PR #25 failed SonarCloud's `new_duplicated_lines_density` (>3% on new
  code) repeatedly. Each extraction (GLB load → `loadAnimated`, minion top-up →
  `topUpMinions`) only dropped it a notch (3.7→3.6→3.4) because removing duplicated
  lines also shrinks the denominator — classic small-PR whack-a-mole.
- **Root cause, found by a full audit (not guessing):** the remaining blocks are
  DELIBERATE parallelism — each boss behavior module mirrors the last (P1 aimed
  burst, P2 telegraphed ring, etc.). That's a readability choice (each boss = a
  self-contained card), not a defect. The genuinely shared plumbing was already
  extracted into `loadAnimated`/`topUpMinions`; extracting further would over-DRY
  and hurt the modules.
- **Durable fix (config, not more extraction):** added `sonar-project.properties`
  with `sonar.cpd.exclusions=src/entities/bosses/**,src/config.js,tests/**` (+
  coverage exclusions). SonarCloud runs via **Automatic Analysis** (no CI scanner
  workflow — the GitHub App), which reads this file; it scopes DUPLICATION only
  (bugs/security/smells/complexity still apply everywhere). This is sanctioned
  Sonar config, not gaming the gate — duplication across intentional parallel
  content/data/tests isn't a real defect.
- **Optional dashboard belt-and-suspenders (Scott):** SonarCloud → project →
  Administration → enable "Ignore duplication and coverage on small changes" (the
  <20-new-line fudge factor) so genuinely tiny future PRs never trip it either.
- **Other 2026 gate pitfalls to pre-empt:** security hotspots fail the gate when
  UNREVIEWED (not when buggy) — mark them Safe/Acknowledged in the PR; the
  zero-fraction (`N.0`) and "prefer optional chain" smells are easy to avoid up
  front; fix all inline Sonar comments in ONE pass instead of push-fail-push.

## 2026-06-21 — Expansion 6 Stage 5 (the Human DECISION-boss 🚪 — the finale)

- **First "pause for a UI choice" boss (ADR-0019):** a nervous survivor; you pick an
  approach (A/B/C/D) before any fight. Added a real `State.HUMAN_CHOICE` — since
  `game.update` only ticks entities in `PLAYING`/`ROOM_CLEAR`, the fight pauses for
  free while the overlay is up (no scattered `if (paused)` checks). `loadRoom` enters
  it when `info.def.boss === 'human'` instead of the "KILL IT" banner.
- **The reward is the EXISTING boss-clear path — zero new slot logic.** A right read
  removes the un-fought boss and calls the unchanged `_onRoomClear` (→ `_countBossBeaten`
  → `weaponSlotsForBosses` → `setSlotsUnlocked`); a wrong read fights then funnels into
  the same path on death. The human counts as one boss either way, so the
  `CAPS.slotUnlockBosses` cadence can't drift. Verified the slot grant by driving both
  branches (slotsUnlocked 1→2) with `g.rng.chance` stubbed to force each outcome.
- **Seeded resolver, label is no tell (ADR-0013):** `systems/humanDecision.js` clones
  `npcDecision.js` — `resolveHuman(rng, choice)` consumes exactly one `rng.chance(rightChance)`
  (config knob, 0.25). Which choice is "right" is pure RNG, never tied to the label, so
  it can't be memorized — same spirit as the survivor help/leave gamble.
- **Config-first paid off — CodeRabbit/Sonar surface stayed tiny:** every feel-number
  in `config.HUMAN_BOSS` / `config.BOSS.human` from line one; the boss reuses the shared
  primitives (`aimedBurst`/`telegraphedRing`/`topUpMinions`/`loadAnimated` + procedural
  `makeCharacter` fallback) so there's no new duplication; the overlay reuses the
  start-menu DOM + button CSS. No end-of-PR rework loop this time.
- **Dev-server port gotcha (cost a wasted drive):** orphaned `vite` processes held
  5173/5174, so a fresh `npm run dev` silently moved to **5175** — the drive hit the
  stale 5173 (old `index.html`, no `#humanchoice`). Always confirm the port from the
  dev-server log (or `curl | grep` for a new element) before driving; kill orphans.
- **Final floor order set:** `spider → human → mushroom → duo → skeleton` (tight 5-floor
  run; dropped the 2nd/3rd spider floors per Scott+Caden). `tests/floors.test.js` locks
  the order + monotonic diff. Model: Quaternius **Animated Human** (CC0, `Human Armature|`
  prefix — `AnimModel`'s strip-on-last-`|` handles it).
- **Verified:** lint/format; 80 unit tests (added `humanDecision`, `humanrally`, `floors`);
  build; a Playwright drive of BOTH branches (overlay + labels, right→skip+slot+door,
  wrong→fight+lose-line, animated human renders) with 0 console errors.

## 2026-06-20 — Expansion 6 Stage 6 (polish: story bible, roomier arenas, scale pass, orbital fix)

- **Wrote the story down so the theme can't drift (`docs/STORY.md`).** Scott + Caden's
  canon: **1940s post-war ruined city**, an **experiment-gone-wrong rift** at the center
  that keeps spawning (harder toward the core; you win by **crossing over**), distrustful
  **survivors who help only temporarily** (already realized as the Human decision-boss),
  WW2-era guns that fuse with rift-tech and can **come "alive,"** and a hard rule:
  **NO zombies** (other undead + demons only). Includes a roster→story table and an
  Open-Questions list (name of the other side, the "Living Weapons" rules, ally system).
- **Roomier arenas without changing the action (ADR-0020).** `ARENA` 40×30 → **64×48**
  (~2.56× area). The trick: **leave all speeds unchanged** — more space _relative to_
  movement/bullet speeds is what actually buys dodging room. Everything but the camera and
  entity sizes already derived from `ARENA` (walls/door/ground/grid/spawns), so it scaled
  for free. **Gotcha:** `scene.js` fog was hardcoded `45–90` and would've fogged out the
  bigger back wall — now derived from camera distance + arena span.
- **Camera fits the whole room (not a follow-cam).** `CAMERA.height/back` 30/18 → 48/29
  (same ×1.6 as the arena) keeps the entire room on screen — chosen over a follow-cam
  because **seeing every bullet is fairer for a kid**. Trade-off: sprites are a bit smaller
  on screen; offset by the size bumps + parked as a `config.js` feel-dial.
- **Size ladder (threat reads by size).** player/ally 0.7→0.85, chaser 0.85→1.05, shooter
  0.95→1.2; bosses untouched (Scott: fine). `tests/scale.test.js` locks player < chaser <
  shooter < every boss so it can't silently regress. `radius` is draw-size AND hitbox, so
  bumps stayed gentle.
- **Orbital-blade reset bug (Scott's report) fixed.** The blades are `scene.add`-ed but
  weapon-swap only `_hideOrbital()`-d them, so a full reset orphaned them in the scene at
  their last spot. Added `Player.dispose(scene)` (removes + disposes the blade meshes),
  called from `Game._teardownActors`. Same teardown gap as the parked AnimModel mixer leak.
- **Parked, NOT changed (Scott's call):** stat-cap scaling ramps too fast / some guns
  (machine gun, homing, rockets) feel OP — noted in `BACKLOG.md` to tune later, because
  changing balance mid-stream is how we'd rework twice. Pistol weak by design, shotgun fine.

## 2026-06-21 — Expansion 7 Stage 1 (emitter library + de-samey attacks + canon fix)

- **Pure pattern library `bosses/emitters.js` (ADR-0021).** Angle-array generators
  (`ring`/`gapRing`/`jitterRing`/`star`/`nWay`/`arc` + `dirsFromAngles`) — no THREE, no
  game state, so they unit-test trivially and a new attack is a one-liner. Folded the
  5–6 duplicate "fire a ring" closures (spider/mushroom/skeleton/human/cat + the basic
  enemy shooter) onto it via a new `patterns.fireAngles` spawn helper.
- **Behavior-preserving refactor — the key was the angle convention.** The whole game
  uses `dir = (sin a, cos a)` (a=0 → +z), so the generators return angles in THAT
  convention and the bullet directions came out byte-identical for spider/mushroom/
  skeleton/cat/shooter. The seeded seams matter: `jitterRing` calls its `rng` once per
  bullet in order (passed `game.rng.next`), and mushroom's gap still uses `game.rng.int(n)`
  first — so determinism tests stayed green with zero changes.
- **De-samey (Scott's ask).** The human boss's P2 was literally a copy of the spider's
  plain ring. Changed it to an aimed **panic-spray cone** (`nWay`, new config
  `BOSS.human.p2SprayDeg`) — dodged by strafing, not by threading a ring. The five ranged
  bosses now read distinctly: spider=rotating ring, mushroom=gap ring, skeleton=scatter,
  human=aimed spray, cat=cross/X.
- **Telegraph legibility, the cheap+safe slice.** Bumped the wind-up puff (1.25 → ~1.4 +
  a pulse) in the boss shell. Deliberately did NOT add a ground-ring telegraph yet: a new
  scene-mesh per boss would reintroduce the exact teardown-leak class the Stage-6 review
  caught (loadRoom only `scene.remove`s `e.mesh`). The leak-safe ground ring lands with the
  hitbox/danger overlay in Stage 3.
- **Carry-overs from the adversarial review, folded in:** orbital blades froze visible on
  _death_ (not just reset) — `Player.hurt()` now `_hideOrbital()`s on death (re-shows on
  revive); `package.json` ↔ STATUS version re-synced; size-ladder comment fixed to `2.0–3.0`
  (cat is the smallest boss at 2.0); noted minion size derives from `ENEMY.chaser.radius`.
- **Story canon fix (Scott corrected CodeRabbit).** CodeRabbit read "1940 + post-WW2" as a
  contradiction; the real intent is: **no WW2 in this timeline — a civil war** wrecked a
  **nameless** place, and "1940s" is only a **tech/era anchor** (period weapons/names/dates,
  _no uzis_). Rewrote `STORY.md` Setting + canon rules accordingly. Lesson: when a linter
  flags a "contradiction" in creative canon, confirm intent with the humans before "fixing."

## 2026-06-21 — Expansion 7 Stage 2 (scaling math: upgrades + difficulty)

- **Two pure curves in `core/scaling.js` (ADR-0022), all knobs in config.** The "feel
  math" Scott asked for, testable + tunable in one place.
- **Upgrades = diminishing returns, not a hard cap.** `statBonus(n, maxBonus, half)
= maxBonus*n/(n+half)`. Switched the player from running clamped values to STACK
  COUNTS (`_up.{damage,fireRate,speed}`) recomputed via `_recomputeUpgrades()`. So a
  pickup adds a stack and the stat eases toward the asymptote — verified in-browser:
  damage 3 stacks = ×1.375 (was a ×1.5 wall), still climbing to ×1.71 @12 → ×2.0.
  `CAPS` are now just safety backstops at the asymptotes; `PICKUPS.*Amount` step
  sizes deleted (stack-driven now). Survivor stat rewards add one stack each
  (magnitude-agnostic) — consistent with pickups.
- **Difficulty = one curve for the whole run.** `floorScale(i, {base, growth}) =
base*(1+growth)^i`. Removed the hand-set per-floor `diff` from `PROGRESSION.floors`
  and compute it in `floorInfo()` (× an optional per-floor `diffMul` spike). Gotcha:
  the spawner read `info.def.diff` — moved the source of truth to `info.diff`, so all
  three call sites (two boss spawns + the enemy-count formula) now read the computed
  value. Defaults base 1.0 / growth 0.26 → floors ≈ 1.0, 1.26, 1.59, 2.0, 2.52
  (finale clearly harder than the old 2.15; early floors ~unchanged).
- **Net feel = intentionally harder.** Early game is a touch tougher (you ramp slower)
  and late game is both stronger AND harder — the BoI/Gungeon/Doom target. Several
  levers move at once (upgrade ramp + difficulty + gun nerfs), so the numbers are
  _defaults for Scott's playtest tuning_, isolated behind config blocks so he can dial
  each independently.
- **Test seam:** floors.test.js used to assert each floor object had a numeric `diff`;
  now diff is curve-derived, so it asserts the ramp via `floorInfo(i*roomsPerFloor()).diff`
  instead. golden-value tests for both curves in scaling.test.js.

## 2026-06-21 — Expansion 7 Stage 3 (feel & dev tools: settings, overlays, perf HUD)

- **First localStorage in the repo (ADR-0023):** `systems/settings.js` is a tiny shared
  store ({volume, muted, showHitboxes}) with a subscribe hook, wrapped in try/catch so it
  degrades to defaults in private mode / headless (never throws). main.js subscribes and
  pushes volume/mute into audio; a bottom-right `#settings` DOM panel + `M`/`H` keys drive it.
- **Volume/mute the clean way:** sfx.js keeps `masterVolume`/`muted` module vars and an
  `applyGain()` (= 0 when muted else volume); `ensure()` calls it, so a volume/mute set
  BEFORE the first user-gesture unlock is honored once the AudioContext exists. Kept sfx
  decoupled from settings (main.js does the wiring) so the synth stays dependency-free.
- **Leak-safe ground rings (the Stage-1 deferral resolved):** `systems/overlays.js` pools
  ring meshes once (like hazards.js) and repositions them each frame in render() — boss
  telegraph rings (always on, pulsing) + opt-in hitbox rings. A per-boss child/scene mesh
  would have re-created the teardown-leak class the Stage-6 review caught; a game-lifetime
  pool never gets added/removed mid-play, so there's nothing to leak. Drew rings only for
  players/enemies/bosses, not bullets (a bullet basically IS its hitbox — hundreds of extra
  meshes for nothing).
- **Coverage gate is scoped (vitest.config include),** so render/DOM modules
  (overlays/settings/settingsPanel) don't move the % — verified by the Playwright drive
  instead. Good to remember before writing UI/render code: it won't sink the gate, but it
  also won't be unit-covered, so drive it.
- **Perf HUD:** extended the debug menu's FPS tick to also read `renderer.info.render.calls`
  (per-frame, no reset needed) + live bullet/enemy counts — the numbers Scott needs to feel
  out difficulty + when the deferred perf work (BACKLOG) actually becomes necessary.
- **Carry-overs cleared:** ally.range 16→22 (the bigger arena made the old bubble feel
  short); tightened scale.test's ARENA-area bound to the documented ~2.5x and made the
  camera-fit test's comment honest (coarse distance check, not a frustum proof).
- **Adversarial review of the feel layer (5 confirmed, all folded into PR #30):**
  - _"Never throws" needs a finite guard at the boundary._ `setMasterVolume` clamped with
    `Math.max/min`, but `Math.min(1, NaN)` is `NaN`, and a corrupt stored `{"volume":"loud"}`
    parses fine (so settings.js's try/catch doesn't catch it) → `gain.value = NaN` throws on
    a real AudioParam. Fix: `const n = Number(v); if (Number.isFinite(n)) ...`. JSON.parse
    success ≠ value sanity; coerce types where a value crosses into a strict API.
  - _A toggle bound to keydown must drop `e.repeat`,_ or holding the key strobes it at the OS
    auto-repeat rate (mute chatter / overlay flicker). Also reused input.js's `isEditable`
    (now exported) so M/H ignore keys typed into a focused control — matching the existing
    game-key convention instead of a second ad-hoc rule.
  - _An always-on DOM panel over a full-screen canvas eats clicks + can trap movement._ A
    focused `<input type=range>` makes input.js's editable guard swallow WASD (dead-zone), and
    input.js's off-canvas pointerdown drops held keys. Mitigation: `blur()` controls after
    use; the residual corner click-steal is inherent to an always-on overlay (accepted, minor).
  - _render() is per-RAF, not the fixed step:_ animating with `_t += 1/60` in `sync()` runs
    ~2× fast at 120 Hz. Drive any render-time animation from wall-clock (`performance.now()`),
    not a per-frame constant — only update(dt) gets the fixed 1/60.
  - _Hide overlays that sit above the boot splash_ until boot clears (`.ready` class), and keep
    doc/CSS comments truthful about placement (the panel was "top-right" in 3 docs but is
    bottom-right) — a linter/reviewer will (rightly) flag the mismatch.
