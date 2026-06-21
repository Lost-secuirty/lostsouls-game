# boss-shots — boss portrait studio

A dev-only harness that renders each boss with its **real in-game mesh** (the GLB
model when present, the procedural fallback otherwise) and frames it in a 3/4 hero
shot, so you can grab a clean portrait of every boss without playing to its room.

## Run

```bash
npm run dev                       # serve the repo root (Vite) on :5173
node scripts/boss-shots.mjs       # Playwright -> artifacts/boss-shots/<type>.png
```

- `SHOTS_URL` overrides the server origin (default `http://127.0.0.1:5173`).
- `CHROME_PATH` points Playwright at a pre-installed Chromium if the bundled
  browser can't be downloaded (e.g. a locked-down CI box):
  `CHROME_PATH=/path/to/chrome node scripts/boss-shots.mjs`.

Open `tools/boss-shots/index.html` directly in the dev server to browse the bosses
interactively — `window.showBoss('skeleton')` swaps the subject.

## Gotchas worth knowing

- **Model paths are root-relative.** `config.MODELS` uses `models/x.glb`, which
  resolves against the server ROOT in the real game. This harness lives in a
  subdir, so it re-roots them to `/models/x.glb` before `loadModels`.
- **Skinned GLB bounding boxes lie.** `Box3.setFromObject` reads bind/bone extents
  on a `SkinnedMesh` and frames empty space; the harness unions per-mesh
  `geometry.boundingBox` in world space instead (the same trick `AnimModel.fitTo`
  uses).
- **`FACING`** in `harness.js` holds a per-boss yaw because the Quaternius GLBs
  don't share a forward axis — tune by eye if a model shows its back.
