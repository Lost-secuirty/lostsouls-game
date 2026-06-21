# ADR-0023: Persisted settings + a readability overlay (accessibility/feel layer)

- **Status:** Accepted
- **Date:** 2026-06-21

## Context

Scott + Caden picked two accessibility/feel items for this pass: **"Clearer danger"** and
**Volume + mute**. The repo had neither — master audio volume was hardcoded (`master.gain.value =
0.5`, no UI), there was no settings menu, and **no persistence** (`localStorage`) anywhere. "Clearer
danger" was split: telegraph legibility shipped in Stage 1 (the wind-up puff); this stage adds the
**hitbox/danger overlay** and the **leak-safe ground-ring telegraph** deferred from Stage 1 (a new
scene-mesh-per-boss would have re-introduced the teardown-leak class the Stage-6 review caught).

## Decision

A small, persisted accessibility/feel layer:

- **`src/systems/settings.js`** — a tiny shared store for `{ volume, muted, showHitboxes }`,
  persisted to **`localStorage`** (the repo's first use), with a subscribe hook. Degrades to defaults
  where storage is unavailable (private mode / headless) — never throws.
- **Volume + mute** — `sfx.js` gains `setMasterVolume`/`setMuted` (a `masterVolume`/`muted` pair
  applied to the master gain, honored even if set before audio unlocks). A bottom-right `#settings`
  panel (revealed once the boot splash clears, then always reachable, `ui/settingsPanel.js`) gives a
  mute button + volume slider, and `M` / `H` keys toggle mute / hitboxes. `main.js` applies settings
  to audio and keeps them in sync.
- **`src/systems/overlays.js`** — flat ground rings drawn in `render()`, **pooled** like
  `hazards.js` (a fixed set of meshes made once, reused every frame → never added/removed during
  play, so no teardown leak). Two uses: (1) an **always-on boss telegraph ring** that pulses while a
  boss winds up (fair warning), and (2) an **opt-in hitbox overlay** (`settings.showHitboxes`) that
  rings each player's (green) and enemy's/boss's (red) exact collision circle.
- **Dev perf HUD** — the debug menu's FPS readout grew into a Performance folder (draw calls via
  `renderer.info`, live bullet + enemy counts) to support difficulty/perf tuning.
- **Carry-overs** — `ally.range` 16 → 22 for the bigger arena; the Stage-6 `scale.test.js` review
  nits (ARENA-area bound tightened to the documented ~2.5×; the camera-fit test comment made honest
  about being a coarse distance check, not a frustum proof).

## Consequences

- **Easier:** a young player can cut/cut-the-volume and turn on hitboxes to learn what hits them;
  every fight telegraphs clearly on the ground. Settings persist across reloads. The overlay system
  is leak-safe and reusable for any future ground marker.
- **Trade-offs:** first `localStorage` dependency (guarded). The overlay/settings/panel modules are
  render/DOM-coupled, so they're verified by the Playwright drive rather than unit tests (they sit
  outside the coverage `include`, so the gate is unaffected — consistent with `scene.js`).
- **Not done:** reduced-shake and high-contrast/colorblind palettes were _not_ picked this round
  (the `settings` store + panel make them easy to add later).

## Alternatives considered

- **Per-boss telegraph ring as a child of the boss mesh.** Simpler to attach, but the mesh
  puffs/rotates/(GLB-)scales, distorting the ring, and a separate scene mesh would leak on room
  change. The pooled `overlays.js` (game-lifetime, never torn down) avoids both. Chosen.
- **Settings baked into the start menu only.** Rejected — a fixed bottom-right panel + `M`/`H` keys
  are reachable during play too, where they matter.
- **Ring every bullet in the hitbox overlay.** Hundreds of extra meshes for little gain (a bullet
  basically _is_ its hitbox). Limited to players + enemies + bosses — the high-value, cheap subset.
