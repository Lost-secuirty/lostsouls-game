# Render studio — boss portrait harness

A dev-only tool that renders each boss with its **real in-game mesh** (the GLB model when present,
the procedural fallback otherwise), lit with IBL + key/fill and run through the **same post-FX
pipeline as the game** (bloom + ACES — [ADR-0025](../../docs/adr/0025-postprocessing-pipeline.md)),
so the portraits match the live look. Outputs one PNG per boss plus a combined **contact sheet**.

Salvaged + upgraded from the original boss-shots harness (the closed PR #35). See
[`docs/GRAPHICS.md`](../../docs/GRAPHICS.md) for where this fits.

## Run

```bash
npm run dev                 # serve the repo root (Vite) on :5173
npm run render:studio       # Playwright -> artifacts/render-studio/<type>.png + contact-sheet.png
```

Outputs land in `artifacts/render-studio/` (gitignored).

### Options (env)

- `SHOTS_URL` — server origin (default `http://127.0.0.1:5173`).
- `STUDIO_SCALE` — device-scale / SSAA factor (default `2` → 2000²-px shots).
- `STUDIO_TRANSPARENT=1` — transparent **cutout** PNGs (no background/ground, no post-FX) for
  compositing elsewhere.
- `CHROME_PATH` — use a pre-installed Chromium if the bundled one can't download.

Open `tools/render-studio/index.html` in the dev server to browse interactively —
`window.showBoss('skeleton')` swaps the subject; add `?bg=transparent` for cutout mode.

## What it does (the upgrades over a plain screenshot)

- **Matches the game:** renders through `src/core/postfx.js` (selective bloom + ACES), so a portrait
  looks like the boss does in a fight.
- **IBL** (`RoomEnvironment`, kept to a subtle fill so pale/untextured models don't bloom-blow to a
  white blob) for richer materials.
- **Deterministic pose:** the GLB mixer is jumped to a fixed time (`mixer.setTime`) and the procedural
  behavior to the same fixed `t`, then frozen — the same pose every run (diff-friendly).
- **Auto camera-fit:** unions per-mesh geometry boxes in world space (skinned-GLB bounding boxes lie),
  then frames the bounding sphere at a 3/4 angle.
- **Contact sheet:** box-downsamples every shot into one grid PNG.

## Gotchas worth knowing (the three solved traps)

- **Model paths are root-relative.** `config.MODELS` uses `models/x.glb`, which resolves against the
  server ROOT in the game. This harness lives in a subdir, so it re-roots them to `/models/x.glb`
  before `loadModels`.
- **Skinned GLB bounding boxes lie.** `Box3.setFromObject` reads bind/bone extents on a `SkinnedMesh`
  and frames empty space; the harness unions per-mesh `geometry.boundingBox` in world space instead
  (the same trick `AnimModel.fitTo` uses).
- **Per-subject facing.** The `SUBJECTS` table in `studio.js` holds a per-boss yaw because the
  Quaternius GLBs don't share a forward axis — tune `facing` (radians) if a model shows its back.
