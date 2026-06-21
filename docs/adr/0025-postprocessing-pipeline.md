# ADR-0025: Post-processing pipeline (bloom + ACES) via pmndrs `postprocessing`

- **Status:** Accepted
- **Date:** 2026-06-21

## Context

The game rendered raw — a single `renderer.render(scene, camera)` with no tone mapping and no
post-processing (ADR-0001 stack, never extended visually). The art direction is a near-black world
where the threats **glow**: enemies, pickups, bullets, and the door all use emissive materials so they
read against the dark ground (see `docs/GRAPHICS.md`). That look is begging for **bloom** — and with
emissive HDR values, for proper **tone mapping** so bright colors don't clip to flat white. This is
the single highest-value visual upgrade available, and it's low-risk because it's additive.

Dependencies are allowed now (ADR-0024). The two realistic options were Three's
`examples/jsm/postprocessing` (EffectComposer + UnrealBloomPass) or the pmndrs **`postprocessing`**
library. The library merges multiple effects into a single fullscreen pass (fewer draw calls), has
mipmap-blur bloom, WebGL2 MSAA, and built-in tone mapping — better perf and ergonomics for a game
that must stay smooth for a young player.

## Decision

Add a `postprocessing` (pmndrs, v6.39) pipeline in **`src/core/postfx.js`**:

- `EffectComposer` with **WebGL2 MSAA** (`multisampling`) + a `HalfFloatType` HDR buffer →
  `RenderPass` → one `EffectPass` of **`BloomEffect`** (luminance-thresholded + mipmap blur) +
  optional **`VignetteEffect`** + **`ToneMappingEffect`** (`ACES_FILMIC`).
- **Luminance-gated ("selective via brightness") bloom**, not object-selection bloom: only pixels
  brighter than a threshold glow, so the dark world stays dark and only the emissive threats pop.
  This is simpler and more robust than `SelectiveBloomEffect` (which has known cross-browser
  selection quirks) and fits our emissive-on-dark identity perfectly.
- Everything is tunable in **`config.GRAPHICS`** (master `enabled`, tone-mapping mode, MSAA samples,
  bloom intensity/threshold/smoothing/radius, vignette). A small **VFX** add — impact sparks on
  bullet→wall hits via the existing pooled particle system — also lives there.
- **Accessibility / low-end toggle:** a "reduced effects" setting (`settings.js` + the `#settings`
  panel, extending ADR-0023) flips the pipeline off at runtime → raw render.
- **Fallback contract (never break the render):** if the composer can't initialize (no WebGL2, a
  feature/context gap, a headless quirk) or a frame throws, `postfx.render()` falls back to
  `renderer.render(scene, camera)`. Same spirit as the audio synth fallback (ADR-0024); offline/CI is
  safe (the browser smoke now also fails on any uncaught page error).

## Consequences

- **Easier:** a dramatically richer look (glowing bullets/threats, filmic contrast) with one new
  module and ~4 small wiring edits (`scene.js`, `game.js`, `main.js`). All feel-knobs are in config,
  so Scott + Caden tune it live in `npm run dev`. The render studio (Phase 5) renders through the
  same pipeline, so screenshots match the game.
- **Harder / trade-offs:** a new runtime dependency and an extra fullscreen pass per frame (mitigated
  by the single merged EffectPass + a quality toggle + the raw-render fallback). Tone mapping is now
  owned by the composer (`renderer.toneMapping` stays `NoToneMapping`) to avoid double tone-mapping.
- **In-game IBL, PBR textures, depth-of-field** remain out of scope (a heavier "atmospheric overhaul"
  that risks readability/perf) — parked in `docs/ROADMAP.md`.

## Alternatives considered

- **Three.js `examples/jsm` EffectComposer + UnrealBloomPass.** No new dependency, but more render
  passes (heavier), more manual wiring, and weaker effect-merging. Rejected for perf + ergonomics.
- **`SelectiveBloomEffect` (object-selection bloom).** More control, but per-object selection
  management plus documented Chrome/Firefox differences. Luminance-threshold bloom achieves the same
  "only the glowing things bloom" goal more simply for our emissive-on-dark scene.
- **Renderer-side tone mapping only (no composer).** `renderer.toneMapping` isn't applied through the
  composer's intermediate buffers, so it would conflict; the composer's `ToneMappingEffect` is the
  correct integration point.
- **Do nothing.** Leaves the biggest, cheapest visual win on the table.
