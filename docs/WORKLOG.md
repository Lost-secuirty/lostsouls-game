# Worklog — Lostsouls

A running, **reverse-chronological** log of _what was done_ each work session — the build diary.
It complements, and is distinct from, its neighbours:

- [`docs/LEARNINGS.md`](LEARNINGS.md) — _what we learned_ (gotchas, fixes, API surprises).
- [`STATUS.md`](../STATUS.md) — _where the project stands_ (current lifecycle snapshot).
- [`docs/BACKLOG.md`](BACKLOG.md) / [`docs/ROADMAP.md`](ROADMAP.md) — _what's next_ (parking lot /
  curated plan).
- [`docs/adr/`](adr/) — _why_ (the decisions behind the work).

Each entry is dated and records the work, its PR, and the version it shipped under. This is the
interim home for the dedicated org-wide logging repo noted in [`BACKLOG.md`](BACKLOG.md)
(Cross-repo) — when that exists, these entries can feed it.

---

## 2026-06-21 — Phase A: in-game IBL + richer fog (v0.8.0, ADR-0026)

First graphics phase of the atmospheric overhaul (ADR-0026), preceded by a deep research sweep
(5 parallel threads + synthesis, every claim verified against the live `three@0.184.0` +
`postprocessing@6.39.1` source). Verdict: **GO** — run A→B→C→D all-out, each a perf-gated PR; the
overhaul is safe because every feature is config-gated, additive, and degrades gracefully. Scott's
calls: subtle mood, perf target = his Nitro V15 laptop, single `reducedEffects` toggle, wet-asphalt
floor (Phase C).

- **IBL** (`src/core/scene.js`): after the lights, a one-time `PMREMGenerator.fromScene(new
RoomEnvironment(), sigma)` bake sets `scene.environment` (the render studio's proven recipe, now
  shared). `scene.environmentIntensity` is set **explicitly** to `LIGHTING.ibl.intensity` (0.30) — it
  defaults to **1**, which washes the pale bone-white human/skeleton to white (the #1 trap). Wrapped
  in try/catch: any failure drops the env and the key/fill/hemi/ambient rig still lights everything
  (never breaks boot). IBL only touches `MeshStandardMaterial` — the `MeshBasic` glowing bullets/
  eyes/door (and their bloom) are unchanged.
- **Color contract:** `renderer.outputColorSpace = SRGBColorSpace` set explicitly (the composer
  follows the renderer) — cheap insurance against a future three default shift.
- **Fog** (`config.LIGHTING.fog`): now mode-driven — `linear` (near/far, default, keeps the far wall
  readable; identical math to before when `nearMul=1`) or `exp2` (density, a parked moodier
  experiment). New knobs: `mode`, `nearMul`, `density`.
- **Config:** added `LIGHTING.ibl = { enabled, intensity:0.30, sigma:0.04 }`; enriched `LIGHTING.fog`.
- **Render studio** (`tools/render-studio/studio.js`): dropped its local `STUDIO.iblIntensity` and
  repointed the env bake at `LIGHTING.ibl.{intensity,sigma}`, so portraits == game (the plan's "align
  IBL to config" deliverable).
- **Perf:** effectively free — a one-time PMREM bake at boot, zero per-frame cost beyond the texture
  taps `MeshStandardMaterial` already does. Dial-back ladder: lower `ibl.intensity` → `enabled:false`.
- Docs: ADR-0026 (the full four-phase plan), GRAPHICS.md (IBL now in-game; fog modes), LEARNINGS.

## 2026-06-21 — Audit bot: drift auditor ported from Codex-Speed-Test (v0.7.3, PR #42)

Kicks off the atmospheric-overhaul run (next: IBL → shadows → floor texture → AO). Scott asked for
the codex repo's **audit bot** set up here first, so it watches every graphics PR.

- **`scripts/audit-drift.mjs` + `scripts/audit-lib.mjs`** (pure, unit-tested — `tests/audit-lib.test.js`,
  15 tests) — deterministic, no API key. Diffs the branch vs `main`, reads the **logged intent**
  (commits, PR body, WORKLOG, LEARNINGS) and flags **drift**: lint suppressions, `.skip/.only` tests,
  `console.log`/`debugger` in src, sensitive-path changes, deep nesting, src-growth-without-tests,
  stale docs, oversized LEARNINGS, unlogged files, and a missing PR "Deviations" section. `--fix`
  applies only `prettier --write` (formatting) — never edits logic to pass.
- **`.github/workflows/audit.yml`** — runs on every PR and **posts the report as a comment**.
  `GITHUB_TOKEN` only; **comment-only (no push)** — the repo's control policy (`tools/control_audit.py`)
  forbids the writable-head-checkout / persisted-credentials / fork-skip that codex's auto-fix-push
  needs, and I won't waive a security control. Auto-format is redundant anyway (`ci.yml`'s
  `format:check` already gates it); `--fix`/`--history` stay available for local runs. Informational,
  not a required merge-blocker.
- **`docs/DRIFT-AUDIT.md`** — the design doc. Adapted from codex: biome→prettier, TS→JS, codex
  paths/rules → lostsouls. `npm run audit`.
- **Deferred:** the local `.claude/` `auditor` agent + `/audit` command (the pre-push _semantic_
  layer). A safety guard flagged adding a `.claude/` agent as agent-self-config beyond Scott's
  approval — correct call; it needs his explicit OK. The **CI bot (the part that audits every PR) is
  fully shipped**; the local agent is a convenience to add later.
- **Status:** built + verified (15 lib tests, full gauntlet green); PR open, awaiting checks + the
  bot's first self-report.

## 2026-06-21 — Retro fix: centralize lighting/fog into config (v0.7.2, PR #41)

A retro with Scott flagged the recurring config-discipline slip: feel-numbers in files I _edit_
(not just my new block) staying hardcoded. Concrete fix:

- **New `config.LIGHTING`** — the game's lights (hemisphere/ambient/key/fill colors, intensities,
  positions), fog (color + far multiplier), and background. Added `CAMERA.near/far` and
  `GRAPHICS.pixelRatioCap`. `scene.js` now reads all of it (was hardcoded at `scene.js:37-43/23`).
- **Render studio reuses `config.LIGHTING`** (was a copy-paste of the same lights → now matches the
  game automatically) + its own `STUDIO` knob block (fov, IBL fill, pose time, framing, ground/grid)
  and a `CONTACT` block in the driver — no more scattered magic numbers in the tool.
- Verified: game renders identically (same values), studio re-rendered 6/6 + contact sheet, 0 errors,
  full gauntlet + both smokes green.
- **Process change (logged in memory):** sweep adjacent feel-numbers in any file I touch, default to
  "when in doubt → config," and grep the diff for numeric literals + `0x` hexes before committing.

## 2026-06-21 — Phase 5: render studio harness (v0.7.1, PR #40)

The "photo harness" — salvaged the boss-portrait harness from the closed PR #35 and upgraded it.

- **`tools/render-studio/`** (`index.html`, `studio.js`, `README.md`) + **`scripts/render-studio.mjs`**
  (`npm run render:studio`). Renders each boss's **real in-game mesh** (GLB or procedural fallback)
  via the actual `Boss` shell.
- **Upgrades over PR #35's harness:** renders through the **same post-FX pipeline as the game**
  (`createPostFX` — bloom + ACES, so portraits match the live look); **IBL** (`RoomEnvironment`, kept
  to a 0.35 fill so pale/untextured models don't bloom-blow to white); **deterministic frozen pose**
  (`mixer.setTime` + fixed procedural `t`); a **per-subject facing table** (replaces hardcoded
  FACING); **SSAA** via 2× device scale; a **contact sheet** (box-downsampled grid via `pngjs`); and a
  `STUDIO_TRANSPARENT=1` cutout mode. Kept the three solved traps (root-relative model paths,
  world-space union bounds for skinned meshes, per-subject yaw).
- Re-added `pngjs` (contact sheet). Closed **PR #35** (superseded).
- **Produced** portraits + a contact sheet of all 6 bosses (spider, mushroom, Fang, Whisker,
  Rattlebones, the Survivor) for Caden — caught + fixed an IBL over-bright on the white human model.
- Docs: `GRAPHICS.md` render-studio section + `tools/render-studio/README.md`.
- **Status:** built + verified (6/6 bosses + contact sheet render, 0 errors); PR open, awaiting checks.

## 2026-06-21 — Phase 4: in-game graphics overhaul — post-FX (v0.7.0, PR #39, ADR-0025)

The headline visual upgrade. The game rendered raw (no tone mapping, no post-processing); now it
runs a real pipeline.

- **`src/core/postfx.js`** (new) — a pmndrs `postprocessing` `EffectComposer`:
  `RenderPass → EffectPass( BloomEffect + VignetteEffect + ToneMappingEffect(ACES_FILMIC) )` on a
  `HalfFloatType` HDR buffer with WebGL2 **MSAA**. **Luminance-gated bloom** (only bright/emissive
  pixels glow → the dark world's threats pop, scene stays dark + readable). Tone mapping owned by the
  composer (renderer stays `NoToneMapping`).
- **Wiring:** `scene.js` builds + returns `postfx` (resize → `postfx.setSize`); `game.render()` calls
  `postfx.render()`; `main.js` passes it in + binds the `reducedEffects` setting.
- **`config.GRAPHICS`** — all knobs: `enabled`, `toneMapping`, `aaSamples`, `bloom{}`, `vignette{}`,
  `vfx{}`. **Impact sparks** on bullet→wall hits via the existing pooled particles (`bullets.js`).
- **Accessibility:** a ✨ "reduced effects" toggle in the `#settings` panel (extends ADR-0023) flips
  post-FX off → raw render, persisted.
- **Fallback contract:** composer init failure OR a throwing frame → raw `renderer.render`. Never a
  black screen. Hardened `browser-smoke.mjs` to fail on any uncaught page error.
- **ADR-0025** + GRAPHICS.md completed (pipeline + config reference). Bundle +72 KB (gzip +16 KB) for
  postprocessing — a one-time download, no runtime bloat.
- **Verified:** Playwright drive confirmed `window.__postfx = {enabled:true, active:true}` at boot and
  in the boss room, the toggle flips it to `{false,false}` (raw render), **0 console/page errors**.
  Bloom + vignette visibly working (boss room screenshots). Full gauntlet + both smokes green.
- **Deviation:** muzzle flash deferred (per-bullet flash = rapid-fire noise; bloom already glows
  muzzles) → parked in ROADMAP. Threshold bloom instead of `SelectiveBloomEffect` (robustness; ADR-0025).
- **Status:** built + verified locally; PR open, awaiting CodeRabbit + checks.

## 2026-06-21 — Phase 3: dependency audit + bump (v0.6.10, PR #38)

Honest audit pass — **`npm audit` = 0 vulnerabilities**, and the **runtime stack is already on the
latest** (three r184, vite 8, express 5, howler 2.2.4, lil-gui). Only **dev tooling** had newer
releases (all minor/patch, same major); bumped to latest:

- `eslint` 10.4.1 → **10.5.0**, `eslint-plugin-security` 4.0.0 → **4.0.1**
- `vitest` + `@vitest/coverage-v8` 4.1.8 → **4.1.9**
- `playwright` 1.60.0 → **1.61.0** (re-ran `npx playwright install chromium` to match the bundled
  browser — Chrome Headless Shell 149).

No runtime code changed. Full gauntlet + both smokes green on the new tooling (lint · format · test
115 · coverage · build · prod smoke · browser smoke). npm rewrote the lockfile; package.json `^`
floors moved up to the new versions.

- **Status:** built + verified locally; PR open, awaiting CodeRabbit + checks.

## 2026-06-21 — Phase 2: decision docs (v0.6.9, PR #37)

Added three "single home for decisions" docs, mirroring the structure of the existing
[`AUDIO.md`](AUDIO.md) / [`STORY.md`](STORY.md):

- **`docs/GAMEPLAY.md`** — design & balance: principles (kid-fair, skill-honest, pistol-weak-by-design,
  the shared anti-addiction ethics), the core loop, the pillars (progression / combat / enemies /
  bosses / economy / difficulty / feel) with a config-block + ADR map, and "adding content inside the
  canon." Numbers stay in `config.js` (no duplication / no drift).
- **`docs/GRAPHICS.md`** — visual & render decisions: the **honest current baseline** (raw render, no
  post-FX, two-key lighting, emissive-glow identity, fog, the VFX/juice map) plus the **planned**
  post-FX pipeline (bloom + ACES, ADR-0025) and render-studio sections marked as upcoming.
- **`docs/ROADMAP.md`** — the curated later-scope plan (graphics / audio / gameplay / tooling / tech-
  perf / cross-repo), each item with why-deferred + a trigger. Distinct from `BACKLOG.md` (parking
  lot, now noted as feeding the roadmap).
- Wired into `README.md` (doc index), `BACKLOG.md` (pointer), `STATUS.md` (v0.6.9).
- **Status:** docs-only; full gauntlet green; PR open, awaiting CodeRabbit + checks.

## 2026-06-21 — Full Package Upgrade kickoff + Phase 1: audio studio + OGG (v0.6.8, PR #36)

**The effort.** "Full package upgrade for everything" — graphics, tooling, dependencies, and a set of
decision docs — delivered in **phases**, each its own PR, merged only when CodeRabbit and every check
clear (no rushing). Plan locked with Scott: tasteful in-game graphics polish via the pmndrs
`postprocessing` library (selective bloom + ACES tone mapping + a little VFX juice), a full dependency
bump + audit pass, new decision docs (`GRAPHICS.md`, `GAMEPLAY.md`, `ROADMAP.md`), and this worklog.

**Phase 1 — audio studio + OGG migration.**

- New **`scripts/audio-studio.mjs`** dev harness (`npm run audio:report` / `audio:process`):
  per-track **LUFS / true-peak / duration** table + **waveform PNGs** (→ gitignored
  `artifacts/audio/`), and **EBU-R128 loudness-normalize** to −16 LUFS + **MP3→OGG** transcode
  (libvorbis). ffmpeg/ffprobe resolved from `$FFMPEG`/`$FFPROBE` → PATH → the winget install glob.
- Migrated the 7 placeholder tracks **MP3 → OGG**, loudness-normalized to ≈−16 LUFS (they had an 11 LU
  spread, −24…−12.6 LUFS — some ~4× louder than others). Repo audio **58 MB → 33 MB**.
  `config.MUSIC.tracks` now point at the `.ogg` files; MP3s removed.
- Docs: `docs/AUDIO.md` (added the audio-studio section + OGG/−16 LUFS status), `ASSETS.md` (OGG
  filenames + the normalization note), `docs/LEARNINGS.md` (ffmpeg-writes-to-stderr-exits-0 gotcha;
  Howler `html5:true` ranged-stream `ERR_ABORTED` gotcha).
- Removed `pixelmatch`/`pngjs` from this PR (they belong to the Phase 5 render studio).
- Started this worklog.
- **Status:** built + verified locally — OGGs serve HTTP 200 and play, the synth fallback contract is
  intact, full gauntlet green. PR open; awaiting CodeRabbit + checks before merge.
