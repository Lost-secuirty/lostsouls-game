# Backlog — Lostsouls

A running parking lot for deferred ideas, known gaps, and out-of-scope items, so the working repo
stays clean and nothing gets lost. Not a roadmap or a promise — just where things wait. Items that
become real intentions get **promoted to the curated [`ROADMAP.md`](ROADMAP.md)**; the running history
of _done_ work lives in [`docs/WORKLOG.md`](WORKLOG.md) / [`docs/LEARNINGS.md`](LEARNINGS.md) and
decisions in [`docs/adr/`](adr/).

> **Light by design (ADR-0005).** This is a fun-first co-designed game; keep the backlog short and
> honest. Don't pad it with process for its own sake.

## Playtest follow-ups (2026-06-22, from Scott — fix later)

- [ ] **Survivor-spawned enemies don't move** until they touch the player. The "bad read" survivor
      outcome (`game._resolveSurvivor` → `SPAWN_ENEMIES` → `new Enemy(scene, 'chaser', …)`) spawns
      chasers that read as inert until contact. Check target acquisition / `Enemy.update` for enemies
      added mid-room (vs. the spawner's room-load path).
- [ ] **Survivor-spawned enemies spawn on top of you.** They're placed at `npc.x ± 2, npc.z ± 2`
      (right where you're interacting with the survivor). Spawn them at a distance from the nearest
      player instead (a min-distance ring / a different location).
- [ ] **No movement OR firing while a "screen" is up.** Scott can still move + shoot while a clear
      screen shows. The B9b `OFFER` modal already fully pauses input; this is about the `ROOM_CLEAR`
      walk-to-door phase (currently movement-enabled by design so you can reach the door) and/or a
      general rule — decide the intended behavior and gate move + fire for every non-`PLAYING` "screen"
      state (may mean replacing walk-to-door with a prompt/auto-advance).
- [ ] **Pause menu for options.** Move the always-on-screen settings (`#settings` panel, bottom-right)
      into a proper **pause menu** (Esc / Start) — options live in the pause menu, not floating on the HUD.

## Known gaps / deferred

- [ ] **Full `Game` step is not in the headless determinism test** — `populateRoom` is
      render-coupled (it builds Enemy/Boss/Npc against the scene), so `tests/determinism.test.js`
      covers the pure RNG _logic_ seams only, not a full stepped game. Reproducibility of the random
      logic is guaranteed; a fuller headless harness is deferred. (Documented in LEARNINGS 2026-06-10.)

## Upgrade / meta systems — deferred from B9b (Scott's vision, too big for the offer PR)

The B9b offer screen is intentionally a **small** per-pick nudge; the depth/excitement is meant to come
from a stack of bigger systems layered on later. Parked here so the offer PR stays focused — each
becomes an ADR when picked up.

- [ ] **Luck factor / stat** — biases offer tiers + drop rarity (an in-run and/or meta stat).
- [ ] **Other upgrade sources** beyond the room-clear offer (shops, shrines, events, …).
- [ ] **Permanent / meta upgrades** — persistent between-run progression (this is **B10**, ADR-0029).
- [ ] **Unlockable weapons** — guns gated behind progress/achievements (vs. all available from the start).
- [ ] **Unlockable characters** — alternate playables unlocked via **achievements**.
- [ ] **Achievements** — the unlock + tracking layer the above hang off.
- [ ] **Challenge / endless / random (modifier) modes** — alternate run rulesets. Endless is why the
      offer curve is "scales almost forever" (small steps that never hard-cap).

### B9b-specific small follow-ups

- [ ] **Co-op simultaneous offers** — B9b presents the two offers **sequentially** (P1 then P2); a
      side-by-side, device-routed version is a polish pass.
- [ ] **Gamepad ally-weapon reroll** — the solo reroll is keyboard/click (`R`) only for now.
- [ ] **Bespoke boss reward screens** — boss rooms still drop a ground HEAL + weapon chest (B8); a
      boss-specific reward/offer screen is later.
- [ ] **Lives → %/HP-bar rework** — the guard + carry damage-reduction work with whole hearts today; a
      finer HP model (half-hearts / a bar) is a bigger change (kept here so the carry-DR opacity is a
      conscious trade, not a gap).
- [ ] **Range upgrade** (bullets use lifetime, not range — not a mechanic yet) and **reload / finite
      ammo** (guns are infinite-ammo for now).
- [ ] **Level-up / XP cadence** as an alternative to the every-room offer.

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

## Audio (ADR-0024 / docs/AUDIO.md — engine + placeholders shipped; finals to follow)

- [x] ~~**Stage tracks + menu wired.**~~ **DONE (v0.6.7, placeholders).** All 5 stages + menu play
      real looping music (CC-BY Kevin MacLeod placeholders); swappable via `config.MUSIC`. Finals
      (curate with Scott's ear, maybe CC0/OGG, distinct genre per stage) still a polish pass.
- [x] ~~**In-game credits surface.**~~ **DONE (v0.6.7).** Start menu → ♪ Credits panel
      (`ui/credits.js`) lists the CC-BY music attributions.
- [ ] **AI boss themes (5).** Bespoke "1940s doom-jazz × Doom" per boss (Stable Audio, full
      ownership) — designed with Caden. Prompts in `docs/AUDIO.md`. Currently the 5 boss slots share
      one placeholder; swap each `boss_*` in `config.MUSIC` when a theme exists.
- [ ] **Final stage-track curation.** Replace the Kevin MacLeod placeholders with the chosen score
      (genre-per-stage); update `ASSETS.md` + `ui/credits.js`.
- [ ] **Win/gameover music stingers** (synth for now) — optional.
- [ ] **Audio polish (deferred):** recorded SFX (currently procedural), adaptive intensity-layer
      stems (calm↔combat), a separate music-only volume slider (master governs both for now).

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
