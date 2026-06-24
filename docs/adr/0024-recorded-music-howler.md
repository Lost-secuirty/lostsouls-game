# ADR-0024: Recorded music layer (Howler.js) + dependency-policy change

- **Status:** Accepted
- **Date:** 2026-06-21
- **Supersedes:** ADR-0006 (procedural audio) — **for MUSIC only**; the procedural SFX synth stays.

## Context

Audio was 100% procedural (ADR-0006): snappy synth SFX + one low drone that just shifts pitch per
floor. Scott wants this pass focused **heavy on audio** — real, produced **music**: a distinct
background track per stage and a unique theme per boss, with a "**1950s × Doom**" identity (the real
genre **doom-jazz / dark-jazz / noir-jazz** + industrial weight). ADR-0006 itself anticipated this
("real audio files could still be added later behind the same `audio.play` facade").

Scott also **superseded the repo's zero-dependency posture**: it was a learning-phase choice, not a
principle. Free libraries that add robustness are now allowed if they fit all other rules; anything
that crosses a specific ADR still requires asking to supersede that ADR first (this ADR is that ask,
granted, for Howler).

## Decision

- **Add Howler.js** (MIT) for the music layer. New `src/systems/music.js` manages a registry of
  looping `Howl`s with **`crossfadeTo` / `duck` / `playStinger`**, created **lazily** and streamed
  (**`html5: true`**) so large tracks don't bloat memory or stall boot. Procedural SFX (`sfx.js`)
  are untouched.
- **Facade unchanged as the entry point** (`systems/audio.js`): adds `setStageMusic(floorIndex)`,
  `setBossMusic(bossKey)`, `setMenuMusic()`, `duckMusic()`, `stingerWin/GameOver()`. Driven from
  game state — `loadRoom` (stage vs boss theme), the human fight-start, win/death, player-hurt (duck).
- **Plug-and-play tracks** via `config.MUSIC` (`id -> filename`). A `null`/missing/undecodable file
  falls back to the procedural drone (`sfx.setSynthMusicMuted` toggles the drone), so the game is
  **never silent** and stays offline/CI-safe — preserving ADR-0006's guarantee. Pure id→file helpers
  live in `core/musicMap.js` (unit-tested, no Howler import).
- **Master volume / mute (ADR-0023)** now drives both systems: the facade bridges to
  `Howler.volume()/mute()` alongside the synth.
- **Sourcing = hybrid:** curated free-for-games stage tracks (CC0 / CC-BY / Pixabay — credited in
  `ASSETS.md` + an in-game credits surface) + AI-generated bespoke boss themes (Stable Audio, full
  ownership). **Distinct genre per stage.**

## Consequences

- Real, swappable music per stage + boss; Scott can drop in/replace files with no code change.
- +1 runtime dependency (`howler`, ~`html5` streaming keeps memory flat). Bigger assets on disk,
  which Scott explicitly accepts (size only matters if it bloats runtime — streaming avoids that).
- `music.js`/`audio.js` are render/Howler-coupled, so they're verified by the Playwright drive
  (active-track assertions + fallback + 0 errors), outside the coverage `include` — consistent with
  the other systems modules. `core/musicMap.js` IS unit-tested.
- The synth drone remains the universal fallback, so a missing file never breaks audio.

## Alternatives considered

- **Native Web Audio (no dep).** Fully capable and integrates with the existing single context, but
  Scott chose Howler for its ergonomics/robustness and because he's moving toward libraries
  generally (graphics next). Accepted the small bridging cost (two audio systems).
- **Stay fully procedural** — rejected; the whole point of this pass is real music.
- **AI for everything / curated for everything** — hybrid wins: bespoke punch where it matters
  (bosses), zero-cost breadth for the 5 stage ambiances.
