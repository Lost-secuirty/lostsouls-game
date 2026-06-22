# Worklog — Lostsouls

A running, **reverse-chronological** log of _what was done_ each work session — the build diary.
It complements, and is distinct from, its neighbours:

- [`docs/LEARNINGS.md`](LEARNINGS.md) — _what we learned_ (gotchas, fixes, API surprises).
- [`STATUS.md`](../STATUS.md) — _where the project stands_ (current lifecycle snapshot).
- [`docs/BACKLOG.md`](BACKLOG.md) / [`docs/ROADMAP.md`](ROADMAP.md) — _what's next_ (parking lot /
  curated plan).
- [`docs/adr/`](adr/) — _why_ (the decisions behind the work).

Each entry is dated and records the work, its PR, and the version it shipped under. This is the
interim home for the dedicated org-wide logging repo noted in [`BACKLOG.md`](BACKLOG.md)
(Cross-repo) — when that exists, these entries can feed it.

---

## 2026-06-22 — B8: Drop rarity tiers + hard pity (v0.8.12)

Research report (4) progression: the flat 12-entry drop table becomes **rarity-tiered** with
floor-scaled odds + a **hard-pity** safety net, so deeper floors feel richer and a run can never go
"mean" on a kid. **Honest, not slot-machine:** rewards are still earned by clearing rooms; pity only
prevents a frustrating dry streak (no variable-ratio craving loops — matches the design ethics).

- **New pure `src/core/drops.js`** (no THREE → unit-testable): `rarityOf`, `typesByTier` (derived
  from config so they can't drift), `rarityBand(floor)`, `pityMinTier(streak)`, and `rollDrop(rng,
weights, {minTier})` — pick a TIER by weight, then a uniform TYPE within it; `minTier` removes
  tiers below the pity floor. Seeded (ADR-0013) → chi-square provable, like the old table.
- **`config.js PICKUPS.rarity`:** `tiers:[common,rare,epic]`, `itemRarity` (heal+gems=common,
  shotgun/mg/bouncer=rare, rocket/homing/railgun/charge/orbital=epic), `bandEdges:[2,4]`,
  `regularChestWeights` (3 bands, descending falloff), `bossChestWeights` (no commons, leans epic),
  `hardPity:{commonStreakMax:4, minTier:rare}`. The old flat `dropTable` is **removed**.
- **`game.js`:** `commonStreak` counter (reset each run); normal clears roll the floor-banded reward
  with the pity floor and advance/reset the streak; boss chests roll `bossChestWeights` (always a
  weapon). `pickups.js` keeps only the THREE-backed `Pickup` (drop selection moved out).
- **Tests:** `rarity.proof.test.js` (tagging consistency, chi-square distribution, boss-never-common,
  determinism); `pity.test.js` (the floor decision, `rollDrop` honoring the floor, and a streak-loop
  proving a rare+ is guaranteed within `commonStreakMax+1`). `determinism.test.js` updated to drive the
  new seam. drops.js coverage 97%; overall 48.8%.
- **Docs:** `GAMEPLAY.md` Economy pillar + tuning note. **No ADR** here — the drop+offer system ADR
  (ADR-0028) lands with B9 (soft pity + the pick-1-of-3 offer screen), which builds on this.
- **Deviation from plan:** plan said put the rarity logic in `pickups.js`; I put it in a **pure
  `core/drops.js`** instead so the THREE-free selection logic stays unit-testable + counts toward the
  scoped coverage gate (matches the repo's "pure logic separate" rule). No visual rarity treatment
  yet — items already read by their distinct color/label; explicit rarity UI comes with B9's offer
  screen.
- **Tune at the table:** tier assignments + band weights + pity cap are all in `PICKUPS.rarity` —
  Scott + Caden's to feel in `npm run dev`. (Balance note: normal rooms now drop heal/stat commons
  more often early; weapons concentrate at rare/epic + boss chests.)
- **Verified:** lint clean, format clean, 199 tests pass (+13 net; `input.proof` hook-timeout flake is
  pre-existing + passes isolated), build clean, prod-health + browser smoke (fresh build) exit 0.

## 2026-06-22 — B7: Knockback impulse + decay (v0.8.11)

Research report (5) feel layer: a hit now **shoves an enemy back a little**, and the shove decays
smoothly. Adds weight to every shot without changing balance much (enemies still close the gap).

- **New pure `knockbackStep(vel, dt, {drag})`** in `math2d.js`: exponentially-decaying impulse;
  the returned displacement is the **exact integral** of the decay over `dt`, so it's frame-rate
  independent (one big step == many small steps — no tunneling-by-framerate). Degrades to `v·dt` as
  `drag→0`.
- **`collision.js advanceKnockback(entity, dt, walls)`**: steps + decays `entity.knock`, moves it,
  then re-runs the existing `slideOutOfWalls`/`clampToArena` so a shove **never tunnels a wall**.
  No-op when not knocked (free to call every tick). Shared by Enemy + Boss.
- **`enemies.js` / `boss.js`:** `this.knock` velocity + `_applyKnock(dir)` (normalizes the hit dir,
  adds the per-type impulse, clamps stacked impulses to `maxSpeed`). `hurt()` gains an optional
  `knockDir`. **Bosses ignore knockback by default** (`bossDefault: 0`) — a shove would wreck their
  telegraph cadence (kid-fairness); a boss opts in only via `BOSS[type].knockback`.
- **Hit sources pass a direction:** bullets shove along travel; explosions shove **outward from the
  blast**; the orbital weapon shoves **away from the player** (`bullets.js`, `player.js`).
- **Config `FEEL.knockback`:** `enabled, drag:9, maxSpeed:14, bossDefault:0, impulse:{chaser:7,
shooter:5.5}`. Pure gameplay → **not** gated by `reducedEffects`; `enabled:false` = the old
  no-shove combat exactly.
- **Tests** (`tests/knockback.test.js`): 7 — decay-to-rest, direction, **frame-rate independence**
  (1 big step == 60 small, to 6 digits), settling distance = `v0/drag`, `drag→0` fallback, zero-vel
  no-op, higher-drag-shorter-shove.
- **Docs:** `GAMEPLAY.md` Feel pillar + tuning note (no ADR — it's a config-gated feel knob, fully
  reversible). **Tune at the table:** `impulse`/`drag` are Scott+Caden's to feel in `npm run dev`.
- **Verified:** lint clean, format clean, 191 tests all pass (+7), coverage 47.3%, build clean,
  prod-health + browser smoke (re-run against the **fresh** B7 build) exit 0.

## 2026-06-22 — B6: Parametric pattern library + homing extraction (v0.8.10)

Research report (5): extend the pure emitter library and extract homing into a testable module.
**No live-boss change** — the new generators are pure library primitives that **no boss calls yet**.
A later PR will debut one on a low-stakes boss behind a B4 fairness check (and a gating flag)
before it goes live; the live debut and the `PATTERNS`/`HOMING` config block are deferred to that PR
(see _Deviation_ below).

- **`multiArmSpiral(arms, perArm, phase, step)`** in `emitters.js`: N rotating spiral arms, each
  `perArm` bullets `step` rad apart, arms evenly distributed. Fire repeatedly while advancing `phase`
  → classic danmaku spiral. `max(1, arms)` guards divide-by-zero.
- **`layeredFlower(layers, baseCount, phaseStep, countStep)`**: concentric rings with growing petal
  count per layer, each phase-offset so petals interleave — keep counts modest for kid-fair gaps.
- **`src/core/homingMath.js`** (new pure module): `turnRateHomingVelocity(pos, vel, target, dt,
{speed, turnRate})` — clamped heading turn (at most `turnRate*dt` per tick), re-sped to `speed`.
  A perpendicular juke still loses it — fair for a young dodger (instant correction feels unfair).
- **`bullets.js _steerHoming`** now delegates to `turnRateHomingVelocity` — behavior identical,
  now unit-testable and reusable for future seeker-minion boss threats.
- **Tests** (`tests/patterns.test.js`): 7 tests — arm count/spacing/step, divide-by-zero guard,
  layer total (8+10+12=30), pure reproducibility, speed preservation, turn clamping, curve convergence.
- **Verified:** lint clean, format clean, 184 tests all pass (+7), coverage 47%, build clean,
  smoke:prod + smoke:browser exit 0.
- **Deviation from plan:** B6 planned to also debut one pattern on a live boss (gated by a per-boss
  `complexityTier`) + add `PATTERNS`/`HOMING` config. Held back to keep this PR a pure, reversible
  library addition — wiring a live attack is a gameplay change that needs the B4 fairness check on the
  real telegraph + a perf pass, so it earns its own PR. No `complexityTier` flag or new config ships
  here. (The new generators' `step`/`countStep` defaults stay inline as function-signature defaults,
  matching the existing `arc(count, phase, step=0.25)` style — no feel-numbers are live to tune yet.)

## 2026-06-22 — B5: "Twice as hard" difficulty knob (v0.8.9, ADR-0027)

Scott's headline ask. A single master `DIFFICULTY.hardnessMul` (default **2** = twice as hard)
distributed across difficulty facets by `0..1` weights, so 2× total doesn't compound to ~8× brutal.
Stays kid-fair (B4 guards it).

- **New pure `hardnessFacet(mul, weight)`** in `core/scaling.js` = `1 + (max(1,mul)-1)*weight`.
- **Config `DIFFICULTY`:** `hardnessMul:2, hpWeight:1.0, countWeight:0.35`. Shipped flavor: enemy +
  boss HP **×2** (boss.js, enemies.js + summoned minions) and **~1.35×** enemies per room (spawner.js).
  **Ring density + contact damage untouched** (weight 0) — bullet gaps stay fair, no new one-shots.
  Bullet speed never scales (unchanged repo rule).
- **Tests** (`tests/scaling.test.js`): golden values on `hardnessFacet` + the shipped config doubles
  HP / crowds rooms. Fairness regression (B4) still green → harder, not unfair.
- **Docs:** [ADR-0027](adr/0027-difficulty-and-scaling.md); `docs/COMBAT_CORRIDOR.md` (TTK reference).
- **Caveat / tune-me:** HP ×2 **compounds with the per-floor ramp** (a floor-4 boss ≈ 5× base HP), so
  boss fights are longer — `hardnessMul` (or `hpWeight`) is the one knob to dial at the table with
  Caden. Log reactions in `docs/playtest/kid-feedback-log.md`.
- **Verified:** lint clean, tests pass (+10 scaling), build clean, smoke:prod + smoke:browser exit 0.

## 2026-06-22 — B4: Kid-fairness telegraph & gap math (guard rail) (v0.8.8)

Codifies the research's fairness equations as pure helpers + a CI regression so the upcoming "twice
as hard" pass (B5) can't silently make a boss unfair. **No gameplay change** — it only measures.

- **New `src/core/fairnessCalc.js`** (pure): `timeToImpactSec`, `gapWidthAtRadius(radius, ringCount,
gapSlots)`, `minimumTelegraphMs(moveDistance, playerSpeed, {childMode, choices})` — the
  recognize + choose + move + margin model (slower child reaction model by default).
- **Config:** `FAIRNESS_TARGETS { telegraphMinMs:{easy:400,hard:250}, gapMinMul:1.5, childMode:true }`
  - `DEBUG_FAIRNESS { warnOnInit:false }`.
- **`boss.js`:** dev-only `console.warn` on init if a boss telegraph is under the easy target (off by
  default; flip `DEBUG_FAIRNESS.warnOnInit` on while tuning B5 in `npm run dev`).
- **Tests** (`tests/fairness.test.js`): helper math + a **living regression** — every shipped
  telegraphed boss meets the easy target (cat is the tightest, exactly 400ms) and mushroom's 2-slot
  ring gap clears 1.5× the player hurt-diameter at engagement range.
- **Deferred:** the opt-in in-overlay gap/telegraph **visualizer** — the CI test + dev warn already
  give the guarantee + feedback; the visual lane renderer can follow if wanted.
- **Verified:** lint clean, tests pass (+6), build clean, smoke:prod + smoke:browser exit 0.

## 2026-06-22 — B3: Subtle camera spring-follow + co-op recenter (v0.8.7)

Gameplay-feel (research report (5)). The static full-room camera (ADR-0020) gains a **subtle**
spring-follow toward the live-player centroid — bounded so the whole room stays readable. **Amends
ADR-0020** (which chose static framing over a follow-cam); Scott opted into a default-ON follow.

- **New `src/core/camera.js`** (pure): `cameraTarget(players, {maxPan, splitInner, splitOuter})` —
  centroid, hard-clamped to ±maxPan; in co-op it eases the pan back to center as the pair separates so
  both stay on the one shared screen (quadInOut feather on `splitWeight`).
- **`game.js`:** `camPan`/`camVel` state; `_updateCamera(dt)` springs the pan toward the target
  (`springCritDampedXZ`, B1) each tick; `render()` adds the pan to `baseCam` + the B2 shake and looks
  at the panned point. Pinned to center under `reducedEffects` + `calmCamera`.
- **Config:** `CAMERA.followEnabled:true, followOmega:6, followMaxPan:5, coopSplitInner:14,
coopSplitOuter:28, calmCamera:true` — all tunable; `followEnabled:false` = exactly the old static cam.
- **Determinism:** the pan derives from player positions (no `Math.random`) — seeded runs stay
  reproducible (ADR-0013).
- **Verified:** lint clean, tests pass (+5 `camerafollow.test.js`), build clean, smokes green.
  Default-ON + subtle — tune `followMaxPan`/`followOmega` live in `npm run dev`.

## 2026-06-22 — B2: Trauma-based shake + screen-flash, determinism fix (v0.8.6)

The gameplay-feel "punch" pass (research report (5), "game-feel math"). Upgrades the scalar
screen-shake to a trauma model and adds a config-gated impact screen-flash — AND fixes a real
**determinism bug**: `game.render()` used `Math.random()` for camera shake, so a "seeded" run
(ADR-0013) never rendered the same. Shake now comes from coherent value-noise (B1's `smoothNoise1D`),
so it's reproducible.

- **`juice.js`:** scalar `shakeMag` → `trauma` (0..1); shake magnitude = trauma², linear decay
  (`JUICE.decayPerSec`). `addTrauma()` scales by `reducedEffectsTraumaMul` when reducedEffects is on.
  `shakeOffsetXZ(now)` samples coherent noise (no `Math.random`) → seeded-run reproducible. `hitStop`
  unchanged.
- **`game.render()`:** `Math.random()` camera offset → `juice.shakeOffsetXZ(performance.now()/1000)`.
- **Screen-flash:** new `#screenflash` overlay (`index.html`) + `hud.flashScreen(peak,color,ms)`,
  gated OFF by `reducedEffects`. Wired to player hurt (subtle red, atop the blood splatter) + boss
  death (white pop).
- **Config discipline:** every shake magnitude now lives in config — `JUICE.trauma*` knobs + new
  `FEEL` block; the old hardcoded `1.2` (boss death) / `0.4` (explosion) / `0.12` (cat) literals are
  gone.
- **Call sites:** `juice.shake()` → `juice.addTrauma()` across player / enemies / boss / bullets /
  cat / patterns.
- **Deferred (deviation):** per-mesh hit-flash tint on character GLB groups — finicky/risky on
  animated groups, and hurt already has splatter + screen-flash + shake; pushed to `docs/ROADMAP.md`.
- **Verified:** lint clean, 160 tests pass (+5 `juice.test.js`; coverage 44.31% lines, gate 40), build
  clean, smoke:prod + smoke:browser exit 0. Determinism fix proven by `tests/juice.test.js`
  (`shakeOffsetXZ` pure/identical for the same inputs). Feel values are deliberately SUBTLE starting
  points — tune live in `npm run dev`.

## 2026-06-22 — B1: Feel-math foundation (pure utils) (v0.8.5)

Prereq for the gameplay-feel pass (research report (5), "game-feel math"). Pure, frame-rate-independent
helpers added to `src/core/math2d.js` (ONE pure-math module — no duplicate clamp/lerp, no THREE import).
**No gameplay change yet** — these are the primitives B2 (trauma shake), B3 (camera spring), and B7
(knockback) build on.

- **Added** (`src/core/math2d.js`): `lerp`; `cubicOut`/`quadInOut`/`backOut` (t clamped); `hashNoise1D`/
  `smoothNoise1D` (deterministic coherent value noise — NO `Math.random`, so camera shake can be made
  reproducible under seeded runs, ADR-0013); `springCritDamped`/`springCritDampedXZ` (Juckett
  critically-damped — converges with no overshoot); `asymptoticFollowXZ` (cheap follow fallback);
  `splitWeight` (raw co-op merge↔split ramp, feathered at the call site).
- **Tests** (`tests/feelmath.test.js`): deterministic — eases pinned/monotonic, noise reproducible +
  in-range + continuous + integer-exact, spring converges without overshoot, follow never overshoots,
  splitWeight boundaries + degenerate guard.
- **Verified:** lint clean, 155 tests pass (+12), coverage 44.31% lines (up from 41.16%, gate 40), build
  clean, smoke:prod + smoke:browser exit 0.

## 2026-06-22 — A1: Codacy `.gitignore` defense (v0.8.4)

Repo-hygiene quick win (process-tightening Track A, from research report (3) on low-drift solo+AI
dev). The Codacy VS Code extension auto-injects `.github/instructions/codacy.instructions.md` — an
AI-behavior rules file that is **not** project policy. A blanket ignore stops it (or any IDE-injected
instruction file) from ever being committed as if it were repo doctrine — exactly the phantom-rules /
context-bloat failure mode the research warns against.

- **`.gitignore`:** added `/.github/instructions/` (anchored to root, so `.github/workflows/` +
  `pull_request_template.md` stay tracked). Grouped with the other agent/IDE auto-injection carriers
  (`.claude/logs/`).
- **Verified:** `git check-ignore -v` matches the path; a throwaway
  `.github/instructions/codacy.instructions.md` did not appear in `git status` (then deleted). No such
  file existed in the repo — purely preventive.
- **Note for Scott:** also disable the Codacy extension's rule-generation in VS Code so the file isn't
  recreated locally; the ignore is the repo-side safety net regardless.

## 2026-06-21 — Phase D: N8AO ambient occlusion (v0.8.3, ADR-0026) — overhaul complete

Final atmospheric phase — soft contact shading for depth. Completes the ADR-0026 overhaul
(IBL → shadows → PBR floor → AO). Config-gated, own fallback, drops with `reducedEffects`.

- **Dep:** `npm install n8ao@^1.10.2` (peers satisfied: postprocessing ≥6.30, three ≥0.137).
- **Pass** (`src/core/postfx.js`): `N8AOPostPass` (NOT `N8AOPass`) added **between** the `RenderPass`
  and the bloom/tone-mapping `EffectPass`, gated on `GRAPHICS.ao.enabled` inside its **own inner
  try/catch** so an AO failure skips only AO — the composer still renders bloom (the outer catch that
  nulls the whole composer is never hit). `gammaCorrection` forced off mid-pipeline (the final
  EffectPass owns color); depth is auto-wired by the composer (no DepthDownsamplingPass needed).
- **Config:** `GRAPHICS.ao = { enabled, quality:'Low', halfRes:true, radius:2.0, distanceFalloff:1.0,
intensity:1.5, color:0x000000, gammaCorrection:'auto' }`. `aoRadius` is WORLD units — 2.0 for our
  ~1–3 unit entities (n8ao's default 5 muddies our scale). `reducedEffects` already drops the whole
  composer, so AO turns off with it (no extra wiring). The render studio shares `createPostFX`, so AO
  flows into portraits too.
- **Verified:** lint clean, 143 tests pass, coverage 41.2% lines (gate 40); build bundles n8ao
  (+~144 KB); browser smoke clean; headless boss-room screenshot shows soft contact shading at wall
  bases/rubble/corners — subtle, readability intact, world stays dark, `window.__postfx.active=true`,
  0 page errors.
- **Perf:** halfRes + 'Low' ≈ 1–3 ms/frame on a mid laptop iGPU (well within 60 fps on the Nitro's
  5060). Dial-back: keep halfRes → quality 'Performance' → smaller `radius` → `enabled:false`.

## 2026-06-21 — Phase C: CC0 PBR floor texture + normal map (v0.8.2, ADR-0026)

Third atmospheric phase — the "ruined street" floor now reacts to the new IBL + shadows. Scott's pick:
**wet asphalt**. Config-gated, never-break-the-render (missing file → flat color).

- **Asset:** dark, wet **CC0 asphalt** (ambientCG **Asphalt025C**, tagged dark/rain/wet) — Color +
  OpenGL normal + roughness, 1K PNG (~7.7 MB) in `public/textures/floor/`, credited in `ASSETS.md`.
  Skipped AO (negligible on a uniform tiled plane) + displacement (no tessellation). Dark so it never
  crosses `bloom.threshold` and glows.
- **Loader:** new `src/core/textures.js` — `loadTextures(paths)` (preload, never-throws; a missing
  map is warned + skipped) + `getTexture(path, {srgb, repeat, anisotropy})` (mirrors `assets.js` for
  GLBs). `srgb` only for albedo; normal/roughness stay `NoColorSpace` (the r152+ `.colorSpace` API).
- **Wiring** (`scene.js`): the ground `MeshStandardMaterial` takes `map`/`normalMap`/`roughnessMap`
  when loaded (white albedo tint so it isn't double-darkened; `metalness:0`), else the flat
  `PALETTE.ground`. `RepeatWrapping`, `repeat:8`, max anisotropy. `main.js` preloads the maps **before**
  `createScene` (the ground is built there). `GridHelper` stays on top as the readability cue.
- **Config:** `GRAPHICS.floor = { enabled, map, normalMap, roughnessMap, repeat:8, normalScale:0.6,
roughness:1, metalness:0, tint:null, anisotropy:'max' }`.
- **Verified:** full gauntlet green; build copies `public/textures/` into `dist/`; headless boss-room
  screenshot shows the dark wet floor tiling cleanly under the grid, world stays dark, threats still
  glow, `map`/`normalMap`/`roughnessMap` all bound, 0 page errors.
- **Perf:** negligible — the floor is one draw call; just switches the shader to its textured branch.
  VRAM ~16 MB for 3×1K w/ mips. Dial-back: drop roughnessMap → drop normalMap → `enabled:false`.

## 2026-06-21 — Phase B: real-time shadow maps (v0.8.1, ADR-0026)

Second atmospheric-overhaul phase — the highest-perf-risk one, greenlit now that the target device is
confirmed (Scott's Nitro V15 / RTX 5060). Real-time shadows, config-gated, never-break-the-render.

- **Renderer/light** (`src/core/scene.js`): `renderer.shadowMap.type = PCFShadowMap` set once at init
  (avoids a mid-run recompile); `enabled` from `GRAPHICS.shadows.enabled`. The warm **key**
  DirectionalLight is the **sole** caster — a tight orthographic shadow frustum fit to the static
  `ARENA` (not entity bounds — skinned-GLB boxes lie), `mapSize`/`bias`/`normalBias`/`radius` from
  config, `updateProjectionMatrix()` after. The fill light never casts (perf).
- **Casters/receivers:** new `src/core/shadows.js` `castShadows(root)` helper traverses an entity's
  meshes (incl. GLB hierarchies) and sets `castShadow`. Applied at the three chokepoints — `Enemy` and
  `Boss` constructors and `makeCharacter()` — so every monster/boss/minion/player/ally/survivor casts,
  in one line each. Walls + rubble (`rooms.js boxMesh`) cast **and** receive; the ground receives. The
  glowing `MeshBasic` bullets/eyes/door never call the helper, so they never cast.
- **reducedEffects:** `createScene` returns `setShadowsEnabled(on)`; `main.js` calls it alongside
  `postfx.setEnabled` (init + the settings `onChange`), so the one toggle drops shadows + post-FX
  together. Toggling `shadowMap.enabled` mid-run forces a one-time material recompile so it takes
  effect.
- **Config:** `GRAPHICS.shadows = { enabled, mapSize:2048, frustumMargin:4, near:1, far:80,
normalBias:0.02, bias:-0.0005, radius:2 }`.
- **Verified:** full gauntlet green; browser smoke clean; drove the game to the **floor-1 spider boss
  room** headlessly (`startRun` + `loadRoom(9)`) and screenshotted — walls + rubble cast clean soft
  shadows on the floor, no acne/peter-panning, dark identity + glowing threats intact,
  `shadowMap.enabled = true`, 0 page errors.
- **Perf:** one extra depth pass/frame; worst case ~15–25 casters (boss + minions + walls), well under
  the ~50 best-practice cap (bullets excluded). Dial-back ladder: `mapSize` 2048→1024 → `radius` down →
  `frustumMargin` tighter → `enabled:false`. Live-FPS confirmation on a packed boss room is Scott's to
  eyeball on the Nitro; the knobs are ready.

## 2026-06-21 — Phase A: in-game IBL + richer fog (v0.8.0, ADR-0026)

First graphics phase of the atmospheric overhaul (ADR-0026), preceded by a deep research sweep
(5 parallel threads + synthesis, every claim verified against the live `three@0.184.0` +
`postprocessing@6.39.1` source). Verdict: **GO** — run A→B→C→D all-out, each a perf-gated PR; the
overhaul is safe because every feature is config-gated, additive, and degrades gracefully. Scott's
calls: subtle mood, perf target = his Nitro V15 laptop, single `reducedEffects` toggle, wet-asphalt
floor (Phase C).

- **IBL** (`src/core/scene.js`): after the lights, a one-time `PMREMGenerator.fromScene(new
RoomEnvironment(), sigma)` bake sets `scene.environment` (the render studio's proven recipe, now
  shared). `scene.environmentIntensity` is set **explicitly** to `LIGHTING.ibl.intensity` (0.30) — it
  defaults to **1**, which washes the pale bone-white human/skeleton to white (the #1 trap). Wrapped
  in try/catch: any failure drops the env and the key/fill/hemi/ambient rig still lights everything
  (never breaks boot). IBL only touches `MeshStandardMaterial` — the `MeshBasic` glowing bullets/
  eyes/door (and their bloom) are unchanged.
- **Color contract:** `renderer.outputColorSpace = SRGBColorSpace` set explicitly (the composer
  follows the renderer) — cheap insurance against a future three default shift.
- **Fog** (`config.LIGHTING.fog`): now mode-driven — `linear` (near/far, default, keeps the far wall
  readable; identical math to before when `nearMul=1`) or `exp2` (density, a parked moodier
  experiment). New knobs: `mode`, `nearMul`, `density`.
- **Config:** added `LIGHTING.ibl = { enabled, intensity:0.30, sigma:0.04 }`; enriched `LIGHTING.fog`.
- **Render studio** (`tools/render-studio/studio.js`): dropped its local `STUDIO.iblIntensity` and
  repointed the env bake at `LIGHTING.ibl.{intensity,sigma}`, so portraits == game (the plan's "align
  IBL to config" deliverable).
- **Perf:** effectively free — a one-time PMREM bake at boot, zero per-frame cost beyond the texture
  taps `MeshStandardMaterial` already does. Dial-back ladder: lower `ibl.intensity` → `enabled:false`.
- Docs: ADR-0026 (the full four-phase plan), GRAPHICS.md (IBL now in-game; fog modes), LEARNINGS.

## 2026-06-21 — Audit bot: drift auditor ported from Codex-Speed-Test (v0.7.3, PR #42)

Kicks off the atmospheric-overhaul run (next: IBL → shadows → floor texture → AO). Scott asked for
the codex repo's **audit bot** set up here first, so it watches every graphics PR.

- **`scripts/audit-drift.mjs` + `scripts/audit-lib.mjs`** (pure, unit-tested — `tests/audit-lib.test.js`,
  15 tests) — deterministic, no API key. Diffs the branch vs `main`, reads the **logged intent**
  (commits, PR body, WORKLOG, LEARNINGS) and flags **drift**: lint suppressions, `.skip/.only` tests,
  `console.log`/`debugger` in src, sensitive-path changes, deep nesting, src-growth-without-tests,
  stale docs, oversized LEARNINGS, unlogged files, and a missing PR "Deviations" section. `--fix`
  applies only `prettier --write` (formatting) — never edits logic to pass.
- **`.github/workflows/audit.yml`** — runs on every PR and **posts the report as a comment**.
  `GITHUB_TOKEN` only; **comment-only (no push)** — the repo's control policy (`tools/control_audit.py`)
  forbids the writable-head-checkout / persisted-credentials / fork-skip that codex's auto-fix-push
  needs, and I won't waive a security control. Auto-format is redundant anyway (`ci.yml`'s
  `format:check` already gates it); `--fix`/`--history` stay available for local runs. Informational,
  not a required merge-blocker.
- **`docs/DRIFT-AUDIT.md`** — the design doc. Adapted from codex: biome→prettier, TS→JS, codex
  paths/rules → lostsouls. `npm run audit`.
- **Deferred:** the local `.claude/` `auditor` agent + `/audit` command (the pre-push _semantic_
  layer). A safety guard flagged adding a `.claude/` agent as agent-self-config beyond Scott's
  approval — correct call; it needs his explicit OK. The **CI bot (the part that audits every PR) is
  fully shipped**; the local agent is a convenience to add later.
- **Status:** built + verified (15 lib tests, full gauntlet green); PR open, awaiting checks + the
  bot's first self-report.

## 2026-06-21 — Retro fix: centralize lighting/fog into config (v0.7.2, PR #41)

A retro with Scott flagged the recurring config-discipline slip: feel-numbers in files I _edit_
(not just my new block) staying hardcoded. Concrete fix:

- **New `config.LIGHTING`** — the game's lights (hemisphere/ambient/key/fill colors, intensities,
  positions), fog (color + far multiplier), and background. Added `CAMERA.near/far` and
  `GRAPHICS.pixelRatioCap`. `scene.js` now reads all of it (was hardcoded at `scene.js:37-43/23`).
- **Render studio reuses `config.LIGHTING`** (was a copy-paste of the same lights → now matches the
  game automatically) + its own `STUDIO` knob block (fov, IBL fill, pose time, framing, ground/grid)
  and a `CONTACT` block in the driver — no more scattered magic numbers in the tool.
- Verified: game renders identically (same values), studio re-rendered 6/6 + contact sheet, 0 errors,
  full gauntlet + both smokes green.
- **Process change (logged in memory):** sweep adjacent feel-numbers in any file I touch, default to
  "when in doubt → config," and grep the diff for numeric literals + `0x` hexes before committing.

## 2026-06-21 — Phase 5: render studio harness (v0.7.1, PR #40)

The "photo harness" — salvaged the boss-portrait harness from the closed PR #35 and upgraded it.

- **`tools/render-studio/`** (`index.html`, `studio.js`, `README.md`) + **`scripts/render-studio.mjs`**
  (`npm run render:studio`). Renders each boss's **real in-game mesh** (GLB or procedural fallback)
  via the actual `Boss` shell.
- **Upgrades over PR #35's harness:** renders through the **same post-FX pipeline as the game**
  (`createPostFX` — bloom + ACES, so portraits match the live look); **IBL** (`RoomEnvironment`, kept
  to a 0.35 fill so pale/untextured models don't bloom-blow to white); **deterministic frozen pose**
  (`mixer.setTime` + fixed procedural `t`); a **per-subject facing table** (replaces hardcoded
  FACING); **SSAA** via 2× device scale; a **contact sheet** (box-downsampled grid via `pngjs`); and a
  `STUDIO_TRANSPARENT=1` cutout mode. Kept the three solved traps (root-relative model paths,
  world-space union bounds for skinned meshes, per-subject yaw).
- Re-added `pngjs` (contact sheet). Closed **PR #35** (superseded).
- **Produced** portraits + a contact sheet of all 6 bosses (spider, mushroom, Fang, Whisker,
  Rattlebones, the Survivor) for Caden — caught + fixed an IBL over-bright on the white human model.
- Docs: `GRAPHICS.md` render-studio section + `tools/render-studio/README.md`.
- **Status:** built + verified (6/6 bosses + contact sheet render, 0 errors); PR open, awaiting checks.

## 2026-06-21 — Phase 4: in-game graphics overhaul — post-FX (v0.7.0, PR #39, ADR-0025)

The headline visual upgrade. The game rendered raw (no tone mapping, no post-processing); now it
runs a real pipeline.

- **`src/core/postfx.js`** (new) — a pmndrs `postprocessing` `EffectComposer`:
  `RenderPass → EffectPass( BloomEffect + VignetteEffect + ToneMappingEffect(ACES_FILMIC) )` on a
  `HalfFloatType` HDR buffer with WebGL2 **MSAA**. **Luminance-gated bloom** (only bright/emissive
  pixels glow → the dark world's threats pop, scene stays dark + readable). Tone mapping owned by the
  composer (renderer stays `NoToneMapping`).
- **Wiring:** `scene.js` builds + returns `postfx` (resize → `postfx.setSize`); `game.render()` calls
  `postfx.render()`; `main.js` passes it in + binds the `reducedEffects` setting.
- **`config.GRAPHICS`** — all knobs: `enabled`, `toneMapping`, `aaSamples`, `bloom{}`, `vignette{}`,
  `vfx{}`. **Impact sparks** on bullet→wall hits via the existing pooled particles (`bullets.js`).
- **Accessibility:** a ✨ "reduced effects" toggle in the `#settings` panel (extends ADR-0023) flips
  post-FX off → raw render, persisted.
- **Fallback contract:** composer init failure OR a throwing frame → raw `renderer.render`. Never a
  black screen. Hardened `browser-smoke.mjs` to fail on any uncaught page error.
- **ADR-0025** + GRAPHICS.md completed (pipeline + config reference). Bundle +72 KB (gzip +16 KB) for
  postprocessing — a one-time download, no runtime bloat.
- **Verified:** Playwright drive confirmed `window.__postfx = {enabled:true, active:true}` at boot and
  in the boss room, the toggle flips it to `{false,false}` (raw render), **0 console/page errors**.
  Bloom + vignette visibly working (boss room screenshots). Full gauntlet + both smokes green.
- **Deviation:** muzzle flash deferred (per-bullet flash = rapid-fire noise; bloom already glows
  muzzles) → parked in ROADMAP. Threshold bloom instead of `SelectiveBloomEffect` (robustness; ADR-0025).
- **Status:** built + verified locally; PR open, awaiting CodeRabbit + checks.

## 2026-06-21 — Phase 3: dependency audit + bump (v0.6.10, PR #38)

Honest audit pass — **`npm audit` = 0 vulnerabilities**, and the **runtime stack is already on the
latest** (three r184, vite 8, express 5, howler 2.2.4, lil-gui). Only **dev tooling** had newer
releases (all minor/patch, same major); bumped to latest:

- `eslint` 10.4.1 → **10.5.0**, `eslint-plugin-security` 4.0.0 → **4.0.1**
- `vitest` + `@vitest/coverage-v8` 4.1.8 → **4.1.9**
- `playwright` 1.60.0 → **1.61.0** (re-ran `npx playwright install chromium` to match the bundled
  browser — Chrome Headless Shell 149).

No runtime code changed. Full gauntlet + both smokes green on the new tooling (lint · format · test
115 · coverage · build · prod smoke · browser smoke). npm rewrote the lockfile; package.json `^`
floors moved up to the new versions.

- **Status:** built + verified locally; PR open, awaiting CodeRabbit + checks.

## 2026-06-21 — Phase 2: decision docs (v0.6.9, PR #37)

Added three "single home for decisions" docs, mirroring the structure of the existing
[`AUDIO.md`](AUDIO.md) / [`STORY.md`](STORY.md):

- **`docs/GAMEPLAY.md`** — design & balance: principles (kid-fair, skill-honest, pistol-weak-by-design,
  the shared anti-addiction ethics), the core loop, the pillars (progression / combat / enemies /
  bosses / economy / difficulty / feel) with a config-block + ADR map, and "adding content inside the
  canon." Numbers stay in `config.js` (no duplication / no drift).
- **`docs/GRAPHICS.md`** — visual & render decisions: the **honest current baseline** (raw render, no
  post-FX, two-key lighting, emissive-glow identity, fog, the VFX/juice map) plus the **planned**
  post-FX pipeline (bloom + ACES, ADR-0025) and render-studio sections marked as upcoming.
- **`docs/ROADMAP.md`** — the curated later-scope plan (graphics / audio / gameplay / tooling / tech-
  perf / cross-repo), each item with why-deferred + a trigger. Distinct from `BACKLOG.md` (parking
  lot, now noted as feeding the roadmap).
- Wired into `README.md` (doc index), `BACKLOG.md` (pointer), `STATUS.md` (v0.6.9).
- **Status:** docs-only; full gauntlet green; PR open, awaiting CodeRabbit + checks.

## 2026-06-21 — Full Package Upgrade kickoff + Phase 1: audio studio + OGG (v0.6.8, PR #36)

**The effort.** "Full package upgrade for everything" — graphics, tooling, dependencies, and a set of
decision docs — delivered in **phases**, each its own PR, merged only when CodeRabbit and every check
clear (no rushing). Plan locked with Scott: tasteful in-game graphics polish via the pmndrs
`postprocessing` library (selective bloom + ACES tone mapping + a little VFX juice), a full dependency
bump + audit pass, new decision docs (`GRAPHICS.md`, `GAMEPLAY.md`, `ROADMAP.md`), and this worklog.

**Phase 1 — audio studio + OGG migration.**

- New **`scripts/audio-studio.mjs`** dev harness (`npm run audio:report` / `audio:process`):
  per-track **LUFS / true-peak / duration** table + **waveform PNGs** (→ gitignored
  `artifacts/audio/`), and **EBU-R128 loudness-normalize** to −16 LUFS + **MP3→OGG** transcode
  (libvorbis). ffmpeg/ffprobe resolved from `$FFMPEG`/`$FFPROBE` → PATH → the winget install glob.
- Migrated the 7 placeholder tracks **MP3 → OGG**, loudness-normalized to ≈−16 LUFS (they had an 11 LU
  spread, −24…−12.6 LUFS — some ~4× louder than others). Repo audio **58 MB → 33 MB**.
  `config.MUSIC.tracks` now point at the `.ogg` files; MP3s removed.
- Docs: `docs/AUDIO.md` (added the audio-studio section + OGG/−16 LUFS status), `ASSETS.md` (OGG
  filenames + the normalization note), `docs/LEARNINGS.md` (ffmpeg-writes-to-stderr-exits-0 gotcha;
  Howler `html5:true` ranged-stream `ERR_ABORTED` gotcha).
- Removed `pixelmatch`/`pngjs` from this PR (they belong to the Phase 5 render studio).
- Started this worklog.
- **Status:** built + verified locally — OGGs serve HTTP 200 and play, the synth fallback contract is
  intact, full gauntlet green. PR open; awaiting CodeRabbit + checks before merge.
