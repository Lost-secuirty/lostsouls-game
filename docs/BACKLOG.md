# Backlog — Lostsouls

A running parking lot for deferred ideas, known gaps, and out-of-scope items, so the working repo
stays clean and nothing gets lost. Not a roadmap or a promise — just where things wait. Add items
as `- [ ] <item> — <why deferred / status>`; the running history of _done_ work lives in
[`docs/LEARNINGS.md`](LEARNINGS.md) and decisions in [`docs/adr/`](adr/).

> **Light by design (ADR-0005).** This is a fun-first co-designed game; keep the backlog short and
> honest. Don't pad it with process for its own sake.

## Known gaps / deferred

- [ ] **Full `Game` step is not in the headless determinism test** — `populateRoom` is
      render-coupled (it builds Enemy/Boss/Npc against the scene), so `tests/determinism.test.js`
      covers the pure RNG _logic_ seams only, not a full stepped game. Reproducibility of the random
      logic is guaranteed; a fuller headless harness is deferred. (Documented in LEARNINGS 2026-06-10.)

## Future ideas (parking lot)

- [ ] **Rework the Orbital Blade (playtest feedback, 2026-06-20).** As a standalone weapon it
      "sucks": only 2 blades, doesn't fire, and forces you into contact range so you can't act
      without taking damage. Plan: demote it from a weapon to a **power-up / passive** that adds
      orbiting blades for extra contact damage _on top of_ a real gun — not a slot you're stuck
      with. (Remove from the weapon drop table / `WEAPON_TYPES` when it becomes a passive.)
- [x] ~~**Orbital blade survived a game reset / froze on death.**~~ **FIXED (Stage 6 + Exp 7
      Stage 1).** Reset: blades were `scene.add`-ed but only `_hideOrbital()`-d on weapon swap, so a
      full reset orphaned them — `Player.dispose(scene)` (called from `Game._teardownActors`) now
      removes them. Death: dying mid-run left the blades frozen visible (the adversarial review's
      catch) — `Player.hurt()` now `_hideOrbital()`s on death; they re-show on revive.
- [x] ~~**Dispose AnimModel mixers on room change (Stage 6 cleanup).**~~ **DONE (v0.6.5).**
      `AnimModel.dispose()` (`mixer.stopAllAction()` + `uncacheRoot`) now runs wherever an animated
      boss/minion mesh is removed — `Boss.die`, `Enemy.die`, `loadRoom`'s sweep, the post-boss minion
      sweep, the human-skip path, and the debug kill-all. Geometry/materials stay shared
      (`SkeletonUtils.clone`), clips come from the original gltf, so only the per-instance mixer +
      action cache are freed. (Found by the Stage 4 review, 2026-06-20.)
- [ ] Next-phase expansion content — tracked here as it comes up; promoted to an ADR when decided.

## Balance — REWORKED in Exp 7 Stage 2 (now Scott's to fine-tune)

- [x] ~~**Stat-cap scaling ramps too fast.**~~ **DONE (ADR-0022).** Upgrades are now a
      diminishing-returns curve (`core/scaling.js statBonus`, knobs in `config.UPGRADES`): each
      pickup adds a stack, power ramps over a whole run, no hard cap-in-3. `CAPS` kept as backstops.
- [x] ~~**Some guns are OP.**~~ **DONE (ADR-0022).** Gentle nerfs: machine gun cooldown 0.07→0.09,
      homing damage 3→2, rocket cooldown 0.8→1.0. Pistol stays weak, shotgun unchanged.
- [x] ~~**Difficulty too kid-fair.**~~ **DONE (ADR-0022).** One `DIFFICULTY` curve (`floorScale`)
      drives the whole run (finale ≈ 2.52× vs old 2.15×); tuned toward BoI/Gungeon/Doom challenge.
- [ ] **Final feel-tuning is Scott's.** The above are sensible _defaults_ — crank `UPGRADES` /
      `DIFFICULTY` / `WEAPONS` in `config.js` (live in `npm run dev`) to taste.

## Polish — entity scale (follow-up after the Stage 6 arena pass)

- [ ] **Fine-tune entity sizes by eye.** Stage 6 enlarged the arena ~2.5× and set a documented
      size ladder (player < basic mob < boss) with a camera that fits the bigger room
      (`docs/adr/0020-*`). The numbers are sensible defaults in `config.js` (`ARENA`, `CAMERA`,
      `PLAYER`, `ALLY`, `ENEMY`) — but final "feel" is Scott + Caden's eyes in `npm run dev`.
      Tweak radii/heights/camera there if anything reads too small or too big.

## Accessibility — easy adds (the store + panel exist now, ADR-0023)

- [ ] **Reduced-shake / "calm camera" toggle** and **high-contrast / colorblind palette** — both
      were offered but not picked this round. `systems/settings.js` + the `#settings` panel make
      them small: add a setting, guard `juice.shake()` (reduced) and swap `PALETTE` (high-contrast).

## Deferred — heavy engine perf (do it when bullets go hundreds → thousands)

> From the 2026 deep-research audit. The repo's bullet system does linear scans and one mesh per
> pooled bullet — fine at our current counts (hundreds), the **first** bottleneck only at thousands.
> Deliberately deferred (Exp 7) so we don't destabilize a working build for speed it doesn't need yet.

- [ ] **Data-oriented projectile store (SoA / typed arrays)** to cut per-bullet JS overhead.
- [ ] **Spatial-hash broad phase** for bullet↔actor and wall queries (replaces the linear scans).
- [ ] **Instanced bullet rendering** (`InstancedMesh`) to collapse draw calls.
- [ ] Optional: asset compression (glTF + KTX2/Draco), `OffscreenCanvas` worker — only if needed.
- **Trigger to revisit:** sustained on-screen bullets approaching the pool ceiling, or frame budget
  blowing past ~16 ms on a target device (watch via the Stage-3 perf HUD).

## Cross-repo / org

- [ ] **Dedicated logging repo (org-wide idea).** Scott wants a single repo just for logs/history
      later, to keep the game and other repos clean. Out of scope here; logged so it isn't lost.
