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
