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
