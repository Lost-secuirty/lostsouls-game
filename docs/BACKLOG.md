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
- [x] ~~**Orbital blade survived a game reset.**~~ **FIXED (Stage 6, 2026-06-20).** The blades
      were `scene.add`-ed but only `_hideOrbital()`-d (visibility) on weapon swap, so a full reset
      orphaned them in the scene at their last position. `Player.dispose(scene)` now removes them,
      called from `Game._teardownActors`. (Same teardown gap as the AnimModel leak below.)
- [ ] **Dispose AnimModel mixers on room change (Stage 6 cleanup).** `AnimModel` has no
      `dispose()`, and `loadRoom`/the boss-death sweep only `scene.remove()` the mesh — so each
      removed GLB boss + minion (mushroom, dog/cat, skeleton) leaks an `AnimationMixer` + clip-action
      cache + cloned Object3D graph across room visits (geometry/material are shared via
      `SkeletonUtils.clone`, so no buffer leak). Fix: add `dispose()` (`mixer.stopAllAction()` +
      `uncacheRoot`) and call it where meshes are removed. Pre-existing cross-cutting pattern; bundle
      with the orbital-blade teardown above. (Found by the Stage 4 review, 2026-06-20.)
- [ ] Next-phase expansion content — tracked here as it comes up; promoted to an ADR when decided.

## Balance — parked, DO NOT change yet (playtest notes, 2026-06-20)

> Scott's call: **note these now, tune later.** Don't touch the numbers in this pass — changing
> balance mid-stream is how we end up reworking things twice.

- [ ] **Stat-cap scaling ramps too fast and isn't meaningful enough.** Speed / damage / fire-rate
      currently hit their `CAPS` ceilings in ~2–3 pickups (`PICKUPS.*Amount`, `CAPS.*`), so the
      run swings between **over-powered too fast** and **under-powered**. Want: a **longer, more
      meaningful** ramp (more pickups to cap, each one felt). Affects `CAPS` + `PICKUPS` step sizes.
- [ ] **Some guns are OP at the current scale rate.** **Machine gun, homing missiles, and rockets**
      feel over-powered once stats ramp. Tie this fix to the cap-scaling rework above (it's the
      ramp, not just the gun). Intentional by contrast: the **pistol is weak by design**, and the
      **shotgun feels balanced** as-is — leave those two alone.

## Polish — entity scale (follow-up after the Stage 6 arena pass)

- [ ] **Fine-tune entity sizes by eye.** Stage 6 enlarged the arena ~2.5× and set a documented
      size ladder (player < basic mob < boss) with a camera that fits the bigger room
      (`docs/adr/0020-*`). The numbers are sensible defaults in `config.js` (`ARENA`, `CAMERA`,
      `PLAYER`, `ALLY`, `ENEMY`) — but final "feel" is Scott + Caden's eyes in `npm run dev`.
      Tweak radii/heights/camera there if anything reads too small or too big.

## Cross-repo / org

- [ ] **Dedicated logging repo (org-wide idea).** Scott wants a single repo just for logs/history
      later, to keep the game and other repos clean. Out of scope here; logged so it isn't lost.
