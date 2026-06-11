# ADR-0004: Primitive-first art with a CC0 download seam

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

We want cool 3D monsters and sounds, but we also want the game to **always run** — on a
fresh clone, in CI, and while a player experiments — even with no art downloaded, and even
if a download is blocked.

## Decision

- Build the whole game on **primitive geometry** (boxes/spheres/capsules with palette
  colors) and **silent audio** as the guaranteed baseline.
- Add a thin **asset seam**: ask for a mesh/sound **by key**; if a real asset exists in
  `public/`, use it; otherwise fall back to the primitive/silence. No call-site changes
  when assets appear.
  - Models: `core/assets.js` (GLTF cache) keyed from `config.js` `MODELS`.
  - Sounds: `systems/audio.js` registers by name; missing file = no-op.
- Only **CC0 / free-for-games** assets, credited in `ASSETS.md`.

## Consequences

- `git clone && npm install && npm run dev` is instantly playable.
- Adding a monster model or a gunshot is drag-drop + one line — great for the player.
- Slightly more indirection than hard-wiring meshes, but it's the seam that keeps the
  build unbreakable.

## Alternatives considered

- **Hard-require downloaded models** — breaks the build when a download fails or a file
  is missing; bad for a player's experimentation loop.
- **Bundle assets into the repo** — heavier repo, licensing bookkeeping; `public/` +
  credits is cleaner.
