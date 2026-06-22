# ADR-0026: Atmospheric rendering (IBL, real-time shadows, PBR floor, ambient occlusion)

- **Status:** Accepted (phased — A landed; B/C/D follow as separate PRs)
- **Date:** 2026-06-21

## Context

ADR-0025 added the post-FX pipeline (bloom + ACES tone mapping + vignette). The next visual step
Scott chose is the full **atmospheric overhaul**: image-based lighting, real-time shadow maps, CC0
PBR ground textures, and ambient occlusion — to give the dark "ruined city" depth and grounding it
doesn't have under flat directional lights. The hard constraint is unchanged: it must stay
**readable and run at 60fps** for a young player (perf target = Scott's Nitro V15 laptop; Caden's
iPad/Switch 2/Series X are future browser-port targets, not today's budget).

A deep research pass (verified against the live `three@0.184.0` + `postprocessing@6.39.1` source, not
assumed) confirmed the overhaul is safe to run **all-out but phased**: every feature is config-gated,
purely additive (no gameplay dependency), and degrades gracefully, so nothing here can black-screen
the game. The only real risk is perf (shadows + AO on a packed boss room) and taste — both
dial-back-able per phase.

## Decision

Ship the overhaul in four reversible, perf-gated phases, all tuned **subtle** (depth without losing
the dark/glowing identity) and all honoring the existing `reducedEffects` toggle for the expensive
passes. Every tunable lives in `config.js` (`LIGHTING.ibl`, enriched `LIGHTING.fog`,
`GRAPHICS.shadows`, `GRAPHICS.floor`, `GRAPHICS.ao`).

- **Phase A — IBL + richer fog (this PR, v0.8.0).** In `scene.js`, after the lights, set
  `scene.environment` from a one-time `PMREMGenerator.fromScene(new RoomEnvironment(), sigma)` bake
  (the render studio's proven recipe), gated by `LIGHTING.ibl.enabled` and wrapped in try/catch.
  `scene.environmentIntensity` is set **explicitly** to a low value (`0.30`) — it defaults to `1`,
  which washes pale `MeshStandardMaterial` bodies (the bone-white human/skeleton) to white. IBL does
  **not** affect the unlit `MeshBasic` bullets/eyes/door, so the glowing threats and their bloom are
  unchanged. `renderer.outputColorSpace` is pinned to `SRGBColorSpace` (explicit color-management
  contract; the composer follows the renderer). Fog becomes config-mode-driven: `linear` (near/far,
  the default, keeps the far wall readable) or `exp2` (density, a moodier experiment). The render
  studio reads the same `LIGHTING.ibl` knobs so portraits track the game.
- **Phase B — real-time shadow maps (v0.8.1).** `PCFShadowMap` (not the deprecated
  `PCFSoftShadowMap`), one shadow-casting key DirectionalLight with a tight orthographic frustum fit
  to the static `ARENA` constants, `~2048` map. Bullets/door never cast. `reducedEffects` forces it
  off. The highest-perf-risk phase — perf-HUD before/after on a full boss room is mandatory.
- **Phase C — CC0 PBR floor + normal map (v0.8.2).** A never-throw texture loader (missing → flat
  `PALETTE.ground`). Correct color space (albedo sRGB, data maps `NoColorSpace`), `RepeatWrapping`,
  max anisotropy. Dark wet-asphalt CC0 set (Scott's pick), credited in `ASSETS.md`. Walls deferred.
- **Phase D — N8AO ambient occlusion (v0.8.3).** `N8AOPostPass` between `RenderPass` and the
  `EffectPass`, half-res + a quality preset, in its own inner try/catch so an AO failure skips only
  AO (bloom survives). `reducedEffects` forces it off.

## Consequences

- **Easier:** the world reads with real depth (grounded contacts, soft fill, textured floor) while
  the emissive-on-dark identity and bloom are preserved. All knobs are in config, so Scott + Caden
  tune live. The render studio shares the pipeline, so portraits stay matched.
- **Harder / trade-offs:** IBL adds a one-time boot bake (zero per-frame cost); shadows add one
  depth pass/frame; AO adds a screen-space pass. Each has a documented dial-back ladder (map size,
  preset, half-res, or disable) applied automatically and logged if a phase regresses the frame
  budget. A new dependency (`n8ao`) arrives in Phase D only.
- **Out of scope (→ `docs/ROADMAP.md`):** depth-of-field (blurs the playfield — bad for top-down
  readability), wall textures (deferred follow-up after the floor), WebGPU, baked lightmaps, and
  per-entity material texturing (monsters stay flat-shaded stylized on purpose).

## Alternatives considered

- **`FogExp2` as the default.** Moodier, but its density falloff doesn't guarantee a readable far
  wall in a fit-the-room top-down arena. Kept as an opt-in `mode`; linear stays the default.
- **Higher IBL intensity (studio's 0.35) in-game.** The live arena already stacks the full
  key/fill/hemi/ambient rig on top of IBL, so `0.30` avoids washing pale bodies; both game and studio
  read the one knob so they can't drift.
- **KTX2/basis-compressed textures (Phase C).** Not worth a transcoder dependency + Vite config for
  1–2 floor textures; plain compressed PNG/JPG with mipmaps is fine. Revisit only if VRAM bites.
- **A Low/Med/High quality selector.** Rejected for now (no-over-engineering): the single existing
  `reducedEffects` toggle drops shadows + AO; cheap IBL + floor stay. Revisit if a real low-end
  device appears.
- **Do the overhaul in one big PR.** Rejected — phasing keeps each feature reversible and individually
  perf-gated, which is exactly why running all-out is safe.
