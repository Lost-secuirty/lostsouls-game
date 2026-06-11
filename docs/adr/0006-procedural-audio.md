# ADR-0006: Procedural audio (no files, no library)

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The game shipped silent. We want satisfying sound (shooting, hits, pickups, boss,
music) but downloads are blocked in the build sandbox, and we don't want to ship or
manage audio files for a fast player's game.

## Decision

Generate ALL sound in code with the Web Audio API — a tiny self-contained synth in
`src/systems/sfx.js` (oscillator tones with envelopes + filtered noise bursts) plus a
low ambient drone loop. `src/systems/audio.js` is a thin facade keeping the existing
`audio.play('name')` API. Browsers block audio until a user gesture, so `main.js`
unlocks (resumes the AudioContext + starts music) on the first click/keydown/touch.

Removed the unused `howler` dependency.

## Consequences

- Zero audio files, zero new runtime deps; works fully offline / in CI.
- Every action has instant feedback (great for ADHD feel) with no asset pipeline.
- Sound is "chiptune-ish," not realistic — which fits the stylized look. Real audio
  files could still be added later behind the same `audio.play` facade if wanted.

## Alternatives considered

- **ZzFX / ZzFXM libraries** — excellent and tiny, but a hand-rolled synth has no
  dependency/version risk and is easy to read/tune for a player.
- **Downloaded sound files (howler)** — blocked by the sandbox and adds asset/licensing
  management we don't want here.
