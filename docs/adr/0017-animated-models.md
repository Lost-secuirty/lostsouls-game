# ADR-0017: Animated CC0 GLB models + animation system

- **Status:** Accepted
- **Date:** 2026-06-20
- **Extends:** ADR-0004 (primitive-first art with a CC0 download seam)

## Context

Expansion 6, Stage 2. Scott + Caden chose "all-in animated" monsters so the game
feels alive. ADR-0004 already defined the model seam (`config.MODELS` →
`getModel`), but it only handled **static** clones and primitive fallback. Skinned,
animated GLBs need real animation playback and correct per-instance cloning.

## Decision

- **First real assets:** Quaternius **Mushroom King** (boss) and **Mushnub**
  (minions), both **CC0**, committed under `public/models/` and credited in
  `ASSETS.md`. `config.MODELS.mushroom`/`sporeling` point at them.
- **`core/assets.js`** now caches `{ scene, animations }` and clones with
  **`SkeletonUtils.clone`** (plain `Object3D.clone` does NOT rebind a skinned
  mesh to its cloned skeleton — animations break or all instances share one
  skeleton). New `getAnimated(key)` returns a fresh clone + the shared clips.
- **`core/animModel.js`** (`AnimModel`) wraps a clone + its own `AnimationMixer`,
  exposes `play(name)` (cross-fades; strips the `CharacterArmature|` clip prefix)
  and `update(dt)`. Entities that use a model own an `AnimModel` and advance it
  each frame; the boss/minions play `Walk`.
- **Two load-bearing fixes for skinned GLBs** (found by driving the real build):
  - `frustumCulled = false` on the model's meshes — their bind-pose bounding
    sphere doesn't follow the bones, so they get culled and vanish.
  - `fitTo()` measures the **union of mesh geometry boxes**, not
    `Box3.setFromObject` — the latter reads bind/bone extents on skinned models
    and was shrinking the mushroom to a 0.05-unit invisible speck.
- **Fallback intact (ADR-0004):** no GLB → procedural mesh (`mushroomMesh.js`,
  `spiderMesh.js`). The game still runs with an empty `public/models/`; the spider
  stays fully procedural (no good CC0 spider model).

## Consequences

- Monsters animate (idle/walk) and each instance has its own mixer, so many
  minions animate independently. Models auto-fit to entity radius regardless of
  the source model's units (Quaternius export ≈ cm).
- Adding a model = drop a CC0 `.glb` in `public/models/`, point `config.MODELS`,
  credit it. The skinned-mesh gotchas are handled once in `AnimModel`/`assets.js`.
- Bundle grows (GLTFLoader + SkeletonUtils chunks, ~500 KB of committed models) —
  acceptable for the payoff; loaded lazily only when a model path is set.

## Alternatives considered

- **Static (posed) models** — simpler, but the whole point was "come alive."
- **Keep `Object3D.clone`** — rejected: breaks skinned animation (per three docs).
- **Hand-built bounding fix per model** — rejected: the geometry-union `fitTo`
  generalizes to the future dog/cat/skeleton models with no per-model tuning.
