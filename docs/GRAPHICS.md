# Graphics — the single home for all visual & rendering decisions

Everything about _how the game looks_ and _why_ lives here: the render pipeline, the visual identity,
lighting/materials, the VFX/juice, and where every visual knob lives. Companion to the mood in
[`STORY.md`](STORY.md), the camera/scale decisions in [ADR-0020](adr/0020-arena-scale-and-camera-fit.md),
and the accessibility/feel layer in [ADR-0023](adr/0023-settings-and-overlays.md). Numbers live in
[`src/config.js`](../src/config.js) (source of truth); this doc explains the _intent_.

> **Status:** the **post-processing pipeline is live** — luminance-gated bloom + ACES tone mapping +
> vignette + WebGL2 MSAA, via the pmndrs `postprocessing` lib ([ADR-0025](adr/0025-postprocessing-pipeline.md),
> [`src/core/postfx.js`](../src/core/postfx.js), tuned in `config.GRAPHICS`). It falls back to the raw
> renderer if it can't initialize, and an in-game **"reduced effects"** toggle flips it off. The
> companion **render studio** dev harness (boss portraits / contact sheets) lands next. The
> "How it works" section below now describes the live pipeline.

## Design principles — readability first, then atmosphere

- **Readability beats spectacle (kid-fair).** This is a bullet-hell a kid plays — the player must
  always be able to find themselves, the bullets, and the safe gaps. Every visual choice serves
  clarity first. Bloom (planned) is **selective**, used to make gameplay-critical things _pop_, never
  to wash the screen.
- **The room is always fully visible.** The camera is sized to fit the whole arena (ADR-0020) — no
  follow-cam surprises. Effects must not fight that fairness.
- **Dark world, glowing threats (the visual identity).** A near-black, desaturated city (purples,
  browns, cold blues) with **emissive accents** on everything that matters — enemies, pickups,
  bullets, the door. Glow = "pay attention to this." This is the look bloom will amplify.
- **Performance is a feature.** Pooled objects, flat-shaded geometry, capped pixel ratio. New effects
  ship with a budget and a **toggle** (accessibility + low-end fallback, extends ADR-0023). The game
  must never drop below a smooth frame on the target machine.
- **Never break the render.** Like the audio's synth fallback, any new render path degrades
  gracefully — if post-processing or WebGL2 is unavailable, fall back to the raw renderer. Never a
  black screen, headless/CI included.

## How it works (the render pipeline)

- **Renderer** (`src/core/scene.js`): `WebGLRenderer({ antialias: true })`, pixel ratio capped at 2,
  **real-time shadows on** (ADR-0026 Phase B): `PCFShadowMap`, the warm **key** light is the sole
  caster with a tight orthographic frustum fit to the `ARENA` (~2048 map); entities + walls cast,
  ground + walls receive, the glowing `MeshBasic` bullets/eyes/door never cast. Tuned in
  `config.GRAPHICS.shadows`; the **reduced-effects** toggle turns shadows off with the rest. Each frame
  goes through the **post-FX composer** (`src/core/postfx.js`, below); tone mapping is owned there (the
  renderer stays `NoToneMapping` to avoid double tone-mapping). The composer self-falls-back to a plain
  `renderer.render(scene, camera)` if it can't initialize.
- **Camera** (`src/core/scene.js`, `CAMERA` config): tilted top-down "Binding of Isaac" angle
  (perspective, FOV 55), positioned to fit the whole `ARENA` (ADR-0020). Screen-shake offsets it per
  frame (`systems/juice.js`).
- **Lighting** (`src/core/scene.js`, tunable in **`config.LIGHTING`**): a two-key dynamic rig — warm
  orange key + cool blue fill directional lights, over a muted-purple hemisphere + ambient — **plus a
  subtle image-based-lighting (IBL) fill** (ADR-0026): a one-time `PMREMGenerator` bake of a
  `RoomEnvironment` sets `scene.environment` (intensity kept low at `LIGHTING.ibl.intensity` so pale
  models don't wash out). All colors/intensities/positions live in config (the render studio reuses
  them, IBL included). `renderer.outputColorSpace` is pinned to `SRGBColorSpace`.
- **Materials**: `MeshStandardMaterial` for the world/characters/bosses (matte, flat-shaded minions)
  — these pick up the IBL fill; `MeshBasicMaterial` (unlit) for bullets, eyes, the door glow,
  overlays, hazards — these are **untouched by IBL**, so the glowing threats and their bloom are
  unchanged. **Emissive** is used liberally on enemies/pickups/bosses so they read against the dark
  ground. No image textures yet — colors only (`PALETTE` + per-floor palettes in `PROGRESSION`); a CC0
  PBR floor lands in a later phase of ADR-0026.
- **Atmosphere**: `Fog` matched to the background color, depth-cued to the arena size. Config-driven
  mode (`LIGHTING.fog.mode`): `linear` (near/far — the default, keeps the far wall readable) or
  `exp2` (density — a moodier closing-in haze).
- **Scene composition** (`systems/rooms.js`): ground plane + grid, perimeter walls with a door gap,
  2–5 rubble obstacles, a glowing cyan door that appears when the room is cleared.

## VFX & juice map (what plays, and why)

| Event             | Visual                                     | Where                  | Principle                        |
| ----------------- | ------------------------------------------ | ---------------------- | -------------------------------- |
| Bullet hits wall  | impact spark burst (pooled)                | `bullets.js` + sparks  | earned, readable feedback        |
| Enemy hit / death | blood particle burst (pooled)              | `systems/particles.js` | proportionate gore (kid-fair)    |
| Player hit        | screen shake (big) + i-frames + music duck | `systems/juice.js`     | negative feedback, clearly yours |
| Kill              | screen shake (med) + hit-stop freeze       | `systems/juice.js`     | impact without spectacle         |
| Boss wind-up      | pulsing telegraph ring on the ground       | `systems/overlays.js`  | fair warning (ADR-0023)          |
| Hazard (poison)   | telegraph ring → opaque danger zone        | `systems/hazards.js`   | telegraphed, fair (ADR-0016)     |

_(Muzzle flash on every shot is intentionally **not** added — on rapid-fire weapons it's visual noise;
bloom already gives muzzles/bullets a glow. Parked in `ROADMAP.md` if it's ever wanted as a subtle
brief flash rather than a per-bullet burst.)_

Juice is tuned in `JUICE` (shake magnitudes + decay, hit-stop durations) and `PARTICLES` (blood pool).

## The post-FX pipeline (live — ADR-0025, `src/core/postfx.js`)

`createPostFX()` wraps the renderer in a pmndrs **`postprocessing`** `EffectComposer`:
`RenderPass → EffectPass( Bloom + [Vignette] + ToneMapping(ACES) )`, with a `HalfFloatType` HDR buffer
and WebGL2 **MSAA**. `game.render()` calls `postfx.render()` instead of `renderer.render()`.

- **Luminance-gated bloom** — only pixels brighter than `bloom.threshold` glow, so the dark world
  stays dark and the emissive threats (bullets/enemies/pickups/door) pop. (We use brightness-gated
  bloom rather than object-selection `SelectiveBloomEffect` — simpler + more robust cross-browser; see
  ADR-0025.)
- **ACES filmic tone mapping** so bright/emissive colors don't clip to flat white (mode is swappable:
  `aces` / `agx` / `neutral` / `none`).
- **Vignette** (subtle corner darkening) + **MSAA** anti-aliasing.
- **Impact sparks** — a small pooled spark burst when a bullet hits a wall (`config.GRAPHICS.vfx`).
- **Fallback contract:** if the composer can't initialize (no WebGL2 / a feature gap / headless quirk)
  or a frame throws, it falls back to `renderer.render(scene, camera)`. Never a black screen.
- **Accessibility / low-end:** the `#settings` panel's ✨ button (the `reducedEffects` setting,
  extending ADR-0023) flips post-FX off → raw render, persisted across reloads.

### `config.GRAPHICS` (the knobs)

All swap-and-see in `npm run dev`:

- `enabled` — master on/off (off = raw render).
- `toneMapping` — `'aces' | 'agx' | 'neutral' | 'none'`.
- `aaSamples` — WebGL2 MSAA sample count (0 = off).
- `bloom` — `{ intensity, threshold, smoothing, radius }` (threshold keeps the dark world dark).
- `vignette` — `{ enabled, darkness, offset }`.
- `vfx` — `{ impactSparks, sparkCount, sparkColor }`.

## Render studio (dev harness — `tools/render-studio/`, `npm run render:studio`)

A Playwright harness that renders each boss's **real in-game mesh** through the **same post-FX
pipeline** (so portraits match the live look), and writes one PNG per boss + a combined **contact
sheet** to `artifacts/render-studio/`. Upgrades over a plain screenshot: IBL (a subtle fill),
**deterministic frozen pose** (`mixer.setTime`), auto camera-fit (world-space union bounds — skinned
GLB boxes lie), a per-subject facing table, SSAA via device-scale, and a `STUDIO_TRANSPARENT=1` cutout
mode. Run `npm run dev` first (it serves the repo root on :5173). Full details in
[`tools/render-studio/README.md`](../tools/render-studio/README.md).

## Open items / later scope

Curated in [`ROADMAP.md`](ROADMAP.md); parking lot in [`BACKLOG.md`](BACKLOG.md):

- [x] **Post-FX pipeline** (bloom + ACES + vignette + MSAA + impact sparks) — **done** (ADR-0025).
- [x] **Render studio** harness (boss portraits + contact sheet) — **done** (`tools/render-studio/`).
- [~] **Atmospheric overhaul** (ADR-0026, phased, subtle + perf-gated): **[x] Phase A — in-game IBL +
  richer fog (done)**; **[x] Phase B — real-time shadow maps (done)**; [ ] Phase C — CC0 PBR floor +
  normal map; [ ] Phase D — N8AO ambient occlusion. Depth-of-field + wall textures stay out of scope.
- [ ] **Muzzle flash** (subtle brief flash, not per-bullet noise) — parked.
- [ ] **WebGPU renderer** (someday) — only if there's a reason.
