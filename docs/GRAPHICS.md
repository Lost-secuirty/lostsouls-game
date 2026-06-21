# Graphics — the single home for all visual & rendering decisions

Everything about _how the game looks_ and _why_ lives here: the render pipeline, the visual identity,
lighting/materials, the VFX/juice, and where every visual knob lives. Companion to the mood in
[`STORY.md`](STORY.md), the camera/scale decisions in [ADR-0020](adr/0020-arena-scale-and-camera-fit.md),
and the accessibility/feel layer in [ADR-0023](adr/0023-settings-and-overlays.md). Numbers live in
[`src/config.js`](../src/config.js) (source of truth); this doc explains the _intent_.

> **Status:** baseline documented below. A **post-processing overhaul** (selective bloom + ACES tone
> mapping + a little VFX juice, via the pmndrs `postprocessing` lib) is **planned next** — see
> "Planned: the post-FX pipeline" and [ADR-0025](adr/0025-postprocessing-pipeline.md) _(landing in
> the graphics phase)_. The companion **render studio** dev harness (boss portraits / contact sheets)
> lands the phase after. Until then the game renders raw (no post-processing), which is the honest
> current baseline.

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

## How it works (current baseline)

- **Renderer** (`src/core/scene.js`): `WebGLRenderer({ antialias: true })`, pixel ratio capped at 2,
  shadows off. **No tone mapping, no post-processing** today — a single `renderer.render(scene,
camera)` per frame (`src/game.js`).
- **Camera** (`src/core/scene.js`, `CAMERA` config): tilted top-down "Binding of Isaac" angle
  (perspective, FOV 55), positioned to fit the whole `ARENA` (ADR-0020). Screen-shake offsets it per
  frame (`systems/juice.js`).
- **Lighting** (`src/core/scene.js`): a two-key dynamic rig — warm orange key + cool blue fill
  directional lights, over a muted-purple hemisphere + ambient. No IBL/environment map (yet).
- **Materials**: `MeshStandardMaterial` for the world/characters/bosses (matte, flat-shaded minions),
  `MeshBasicMaterial` (unlit) for bullets, eyes, the door glow, overlays, hazards. **Emissive** is
  used liberally on enemies/pickups/bosses so they read against the dark ground. No image textures —
  colors only (`PALETTE` + per-floor palettes in `PROGRESSION`).
- **Atmosphere**: linear `Fog` matched to the background color, depth-cued to the arena size.
- **Scene composition** (`systems/rooms.js`): ground plane + grid, perimeter walls with a door gap,
  2–5 rubble obstacles, a glowing cyan door that appears when the room is cleared.

## VFX & juice map (what plays, and why)

| Event             | Visual                                     | Where                  | Principle                        |
| ----------------- | ------------------------------------------ | ---------------------- | -------------------------------- |
| Shoot             | (planned) muzzle flash                     | `JUICE`/postfx phase   | honest instant feedback          |
| Bullet hits       | (planned) impact sparks                    | `particles.js`/postfx  | earned, proportionate            |
| Enemy hit / death | blood particle burst (pooled)              | `systems/particles.js` | proportionate gore (kid-fair)    |
| Player hit        | screen shake (big) + i-frames + music duck | `systems/juice.js`     | negative feedback, clearly yours |
| Kill              | screen shake (med) + hit-stop freeze       | `systems/juice.js`     | impact without spectacle         |
| Boss wind-up      | pulsing telegraph ring on the ground       | `systems/overlays.js`  | fair warning (ADR-0023)          |
| Hazard (poison)   | telegraph ring → opaque danger zone        | `systems/hazards.js`   | telegraphed, fair (ADR-0016)     |

Juice is tuned in `JUICE` (shake magnitudes + decay, hit-stop durations) and `PARTICLES` (blood pool).

## Planned: the post-FX pipeline _(graphics phase / ADR-0025)_

A new `src/core/postfx.js` will replace the raw render call with an `EffectComposer` from the pmndrs
**`postprocessing`** library:

- **Selective bloom** targeting the emissive entities (bullets, enemies, pickups, door) — the dark
  world's glowing threats get a real glow, gameplay readability preserved.
- **ACES filmic tone mapping** + correct color space + exposure (richer contrast, no blown-out colors).
- **Vignette** (subtle) + **SMAA / WebGL2 MSAA** for crisp edges.
- **VFX juice**: muzzle flash on shoot, impact sparks on hit, optional short bullet trails — pooled
  like the blood particles.
- A new **`config.GRAPHICS`** block (bloom intensity/threshold/radius, exposure, vignette, AA mode,
  VFX toggles, master `enabled`) — all tunable, no code edits.
- A **"reduced effects" settings toggle** (extends ADR-0023) and a **raw-render fallback** if post-FX
  can't initialize.

## Render studio (dev harness) _(render-studio phase)_

A `tools/render-studio/` + `scripts/render-studio.mjs` harness renders deterministic boss
portraits / a contact sheet through the same post-FX pipeline (so screenshots match the game), with
IBL + SSAA for crisp hero shots. Section completed when it lands; see `ROADMAP.md` until then.

## Open items / later scope

Curated in [`ROADMAP.md`](ROADMAP.md); parking lot in [`BACKLOG.md`](BACKLOG.md):

- [ ] **Post-FX pipeline** (bloom + ACES + VFX) — the next phase.
- [ ] **Render studio** harness — the phase after.
- [ ] **Atmospheric overhaul (later):** in-game IBL/environment lighting, PBR textures/normal maps,
      depth-of-field, richer fog — bigger mood, weighed against readability + perf.
- [ ] **WebGPU renderer** (someday) — only if there's a reason.
