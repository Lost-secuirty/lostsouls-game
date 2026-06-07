# ADR-0009: Spider boss attack patterns (Caden's design card)

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

After beating Expansion 1, Caden (11) designed the spider boss's moves on paper. His
terminology: **"P1/P2/P3" = an ATTACK PATTERN**, not a health phase ("Phase = attack
pattern"). The Expansion 1 boss just sprayed a dense ring + aimed spread on one timer and
spawned spiderlings on an always-on timer — functional but not his vision.

## Decision

Rebuild the boss's attacks in `src/entities/boss.js` as Caden's three named patterns,
config-driven in `BOSS.spider`:

- **P1 — Base Attack ("pistol mimic"):** frequent quick **aimed burst** (reuses the pure
  `spreadDirs` helper).
- **P2 — Bullet ring ("circle of small dots"):** a **telegraphed** ring — a ~0.45s wind-up
  (boss rears up + a charge cue) **then** fires. Count is small on floor 1 and scales by
  floor (`round(ringBullets * floor.diff)`), with slower, dodgeable bullets.
- **P3 — Baby-spider spawns, HP-gated:** a pure, unit-tested `spiderlingTarget(hpFrac)`
  (`src/core/progression.js`) drives spawns — none above 50% HP, keep 2–3 under 50%, keep 3
  under 25%. Replaces the old always-on spawner.

Also applied playtest feedback: **the starting pistol is intentionally weaker** (slower fire)
so weapon pickups feel like a real jump, and **more procedural SFX** were added.

## Consequences

- The fight reads as three distinct, escalating behaviors; the telegraph makes the ring
  fair/dodgeable (a core bullet-hell design rule we confirmed via research).
- The HP-gated spawn rule is pure + tested, so the trickiest bit can't silently regress.
- All three floors reuse the same boss (scaled), so patterns escalate automatically.

## Alternatives considered

- **True health-gated phases** (swap movesets at HP thresholds) — heavier and not what
  Caden asked for; his P3 is the only HP-gated piece, which we honored. Easy to extend later
  for unique per-floor bosses.
