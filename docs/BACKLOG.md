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
- [ ] Next-phase expansion content — tracked here as it comes up; promoted to an ADR when decided.

## Cross-repo / org

- [ ] **Dedicated logging repo (org-wide idea).** Scott wants a single repo just for logs/history
      later, to keep the game and other repos clean. Out of scope here; logged so it isn't lost.
