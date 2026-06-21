---
lifecycle: growing
frozen: false
visibility: public
maturity: active-development
updated: 2026-06-21
---

# Status — Lostsouls

**This project is GROWING, not frozen.** It is a co-designed game (Scott + son), fun-first and
**light by design** (ADR-0005). It will keep gaining expansions and polish until it is explicitly
marked `frozen: true` in the front-matter above. Treat anything here as a current snapshot of an
in-progress build, not a final release.

This file is the lifecycle source-of-truth for the repo. The build diary (what was done, per
session) lives in [`docs/WORKLOG.md`](docs/WORKLOG.md); the detailed running history of gotchas in
[`docs/LEARNINGS.md`](docs/LEARNINGS.md); the "why" behind decisions lives in
[`docs/adr/`](docs/adr/).

## Lifecycle

- **lifecycle:** `growing` — actively developed; expect change.
- **frozen:** `false` — no freeze declared.
- **visibility:** `public`.

## Current state (v0.6.8)

A browser 3D bullet-hell shooter (Three.js + Vite + Express): solo with an AI ally and local
two-player co-op (keyboard/mouse/gamepad). Most recent work:

- **Audio studio + OGG migration (v0.6.8)** — kicked off a phased **full package upgrade** (graphics,
  tooling, deps, decision docs; see [`docs/WORKLOG.md`](docs/WORKLOG.md)). First phase: a dev
  **audio studio** ([`scripts/audio-studio.mjs`](scripts/audio-studio.mjs), `npm run audio:report` /
  `audio:process`) that reports per-track LUFS/peak + waveform PNGs and loudness-normalizes (EBU R128,
  −16 LUFS) + transcodes the placeholder score **MP3 → OGG** (58 MB → 33 MB, consistent volume).
  Plug-and-play music contract unchanged; synth fallback intact.
- **Audio — placeholder score wired + audio bible (v0.6.7)** — every stage now has real looping
  music and the bosses share a placeholder theme (CC-BY, Kevin MacLeod), all swappable with no code
  change. New [`docs/AUDIO.md`](docs/AUDIO.md) is the single home for audio decisions — track map,
  candidate swaps, and **research-backed design principles** (engaging via horror's tension→release,
  while deliberately avoiding gambling-style reward manipulation). Added an in-game **Credits** panel
  (start menu → ♪ Credits) for the CC-BY attribution. Boss themes get designed with Caden later.
- **Audio overhaul — music engine (v0.6.6, ADR-0024)** — a recorded-music layer via **Howler.js**
  ([`music.js`](src/systems/music.js)): a distinct looping track per stage, a crossfade to each boss
  theme, a menu theme, and music-ducking on hits — driven from game state through the existing
  [`audio.js`](src/systems/audio.js) facade. The procedural **SFX synth stays**; the synth drone is
  now the **fallback** so a missing track is never silent. Tracks are **plug-and-play**
  (`config.MUSIC` id→file map; stream + lazy-load so big files don't bloat runtime). This run's
  identity: "**1940s × Doom**" (doom-jazz), distinct genre per stage. **Engine ships now; track files
  (curated stages + AI boss themes) come next.** This ADR also records Scott **superseding the
  zero-dependency posture** (free libs allowed if they fit the other rules).
- **Maintenance pass (v0.6.5)** — fixed the carried-forward **AnimModel mixer leak**: animated
  bosses/minions ([`animModel.js`](src/core/animModel.js)) now `dispose()` their `AnimationMixer`
  (+ action cache) when removed, so a multi-floor run no longer orphans mixers. Plus doc-freshness
  fixes. The **Exp7 #31 follow-up** had consolidated the last feel-knobs into config
  (`config.SETTINGS`/`OVERLAY`/`DIFFICULTY`/`PICKUPS`).
- **Expansion 7 Stage 3 (feel & dev tools)** — the accessibility/feel layer (ADR-0023). Persisted
  **settings** ([`settings.js`](src/systems/settings.js), the first `localStorage` use): a
  bottom-right panel + `M`/`H` keys for **volume / mute** and a **hitbox overlay**. A pooled, leak-safe
  [`overlays.js`](src/systems/overlays.js) draws an always-on **boss telegraph ring** (the
  ground-ring telegraph deferred from Stage 1) and the opt-in hitbox rings. The debug menu gained a
  **perf HUD** (draw calls / live bullet + enemy counts) for tuning. Carry-overs: `ally.range` 16→22
  for the bigger arena; tightened the Stage-6 `scale.test` nits. Completes the Foundation & Feel pass.
- **Expansion 7 Stage 2 (scaling math)** — the balance rework (ADR-0022). A pure
  [`scaling.js`](src/core/scaling.js): **diminishing-returns upgrades** (`statBonus`, config
  `UPGRADES`) so power ramps over a whole run instead of capping in ~3 pickups, and a single
  **difficulty curve** (`floorScale`, config `DIFFICULTY`) that shapes the whole run (finale ≈ 2.52×
  vs the old 2.15×) toward a real BoI/Gungeon/Doom challenge. Gentle nerfs to the OP guns (machine
  gun / homing / rocket); pistol stays weak, shotgun unchanged. All knobs are Scott's to fine-tune.
- **Expansion 7 Stage 1 (foundation)** — a pure **bullet-pattern (emitter) library**
  ([`emitters.js`](src/entities/bosses/emitters.js): `ring`/`gapRing`/`jitterRing`/`star`/`nWay`/
  `arc`), so a new attack is "pick a generator + config numbers" (ADR-0021). The 5–6 duplicate ring
  closures were refactored onto it (behavior-identical), and the **human** boss was **de-samey'd**
  from a spider-clone ring into an aimed **panic-spray cone**; telegraphs read clearer. Also fixed
  the **orbital-blade-freezes-on-death** residual and corrected the **story canon** (nameless place,
  a **civil war** not WW2, the 1940s as a tech/era anchor — no anachronistic weapons). First of the
  research-led "Foundation & Feel" pass (scaling math + accessibility follow in later stages).
- **Expansion 6 Stage 6 (polish)** — wrote the **story bible** ([`docs/STORY.md`](docs/STORY.md):
  Caden's 1940s post-war ruined city, the experiment-gone-wrong rift, temporary survivors,
  civil-war-era arms × rift-tech "living weapons", **no zombies**), then a **scale pass**
  (ADR-0020): arenas ~2.5×
  bigger (40×30 → 64×48) with the **camera sized to fit** the whole room and a documented **size
  ladder** (player < basic mob < boss). Fixed the **orbital-blade-survives-reset** bug
  (`Player.dispose`). Balance/stat-cap tuning is deliberately **parked** in `BACKLOG.md`.
- **Expansion 6 Stage 5 (finale)** — the **Human decision-boss** 🚪 "The Survivor". Before the
  fight you pick how to approach (A/B/C/D); a seeded "right" read skips the fight AND grants the
  weapon slot, a wrong read means you fight him for it (new `HUMAN_CHOICE` state + overlay,
  pure `resolveHuman`, ADR-0019). This sets the **final 5-floor order**:
  spider → human → mushroom → duo → skeleton. Expansion 6's boss roster is complete.
- **Expansion 6 Stage 4** — the **skeleton boss** 💀 "Rattlebones" (aimed bone throws, a seeded
  scatter ring, a reassemble-and-teleport escape with i-frames, and HP-gated boneling summons)
  with an animated CC0 skeleton (Quaternius). Reuses the data-driven boss + animated-model +
  hazard systems — no new ADR.
- **Expansion 6 Stage 3** — the **Dog/Cat duo** 🐶🐱, the first **multi-boss** fight
  (`game.bosses[]`, two separate HP bars, a pure `DuoController` with alternating aggression +
  enrage-on-partner-death, ADR-0018). Fang pounces, Whisker zones with cross-swipes and summons
  kittens; animated CC0 beasts (Quaternius Shiba + Cat).
- **Expansion 6 Stage 2** — the **mushroom boss** 🍄 (spore ring with a dodge gap, telegraphed
  poison pools via a new ground-hazard system ADR-0016, HP-gated puffballs) with **animated
  CC0 GLB monsters** (Quaternius Mushroom King + Mushnub minions) and an animation system
  (ADR-0017). The spider stays procedural.
- **Expansion 6 Stage 1** — data-driven bosses (behavior modules, ADR-0014), 5 new guns with
  pierce/homing/bounce/charge/orbital behaviors, and 9-room floors (ADR-0015). First of a
  staged expansion adding the human/mushroom/duo/skeleton bosses + animated CC0 models.
- **Expansion 5 Stage 1** — weapon slots + global stat caps (ADR-0012).
- **Seeded runs + determinism** — optional replayable seed on `startRun`, plus a cross-system
  determinism test over the pure RNG seams (ADR-0013).
- **Cross-repo hardening** — secret/PII pre-commit + CI scanner (public-repo BLOCK policy),
  ESLint 10, pinned actions.

24 ADRs (0001–0024). Verification: probability/proof tests, coverage gate, production smoke +
browser smoke, OpenSSF scorecard, dependency review, control audit.

## Scope (unchanged)

A static single-page game. **No accounts, no payments, no real wagering, no PII, no backend
beyond the static Express server + `/healthz`.** Light by design — it is not a governance
showcase; it is a game built for fun and learning (ADR-0005).

## Backlog

Deferred ideas and known gaps are parked in [`docs/BACKLOG.md`](docs/BACKLOG.md).
