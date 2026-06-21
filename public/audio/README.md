# public/audio/ — recorded music tracks (ADR-0024)

Drop background-music files here and point their **track id** at the filename in
`src/config.js` → `MUSIC.tracks`. That's it — **plug-and-play**, no code change. A track
with `null` (or a missing/undecodable file) falls back to the procedural synth drone, so
the game is never silent.

Track ids:

- `menu` — title/menu theme
- `stage0`..`stage4` — exploration music per floor
  (Outskirts · Barricade · Fungal Depths · Kennels · Catacombs)
- `boss_spider` · `boss_human` · `boss_mushroom` · `boss_duo` · `boss_skeleton` — boss themes
- `win` · `gameover` — one-shot stingers

Notes:

- Prefer **OGG** (seamless looping, small). Tracks **stream** (`html5`) and load lazily,
  so large files don't bloat memory or stall boot.
- Credit every non-original track in [`../../ASSETS.md`](../../ASSETS.md) (creator · license
  · URL). CC-BY also requires the in-game credits surface.
