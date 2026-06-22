# ADR-0027: "Twice as hard" — a master difficulty knob with fair facet weights

- **Status:** Accepted
- **Date:** 2026-06-22

## Context

Scott's ask after the research pass: **make the game ~2× harder** (Caden beat it first try — see
`docs/LEARNINGS.md`). The existing model (`core/scaling.js`): a smooth per-floor `floorScale` curve
(`DIFFICULTY.base`/`growth`) drives boss HP, ring-bullet density, and enemy COUNT; enemy HP and
contact damage were flat (unscaled). The hard constraint is unchanged: harder must stay **fair for a
young player** — ADR-0020's "see every bullet", B4's telegraph/gap guarantees, and no new one-shots.

The trap with "2×": applying a 2× multiplier to every facet **compounds** (2× HP × 2× count × 2×
damage ≈ 8× threat), which is brutal, not "twice as hard." And naively doubling ring-bullet density
would shrink the safe gaps below the kid-fair `1.5× hurt-diameter` bar (B4).

## Decision

A single master knob with **fair facet weights**, all in `config.DIFFICULTY`:

- `hardnessMul` (default **2** = "twice as hard"; 1 = the original game) — the one dial Scott/Caden
  turn at the playtest table.
- Each difficulty facet absorbs a `0..1` **weight** of it via the pure helper
  `hardnessFacet(mul, weight) = 1 + (max(1,mul) - 1) * weight` (`core/scaling.js`):
  - `hpWeight: 1.0` → enemy + boss HP **×2** (boss.js, enemies.js incl. summoned minions).
  - `countWeight: 0.35` → ~**1.35×** enemies per room (spawner.js) — more pressure, still perf-safe.
  - **Ring density and contact damage are deliberately at weight 0** (not even wired) — so bullet
    gaps stay fair and a hit still costs the same heart(s). No one-shots, no impassable rings.

So the shipped flavor of "twice as hard" is **tankier, more numerous foes** layered on the existing
per-floor ramp — _not_ faster bullets (the repo never scales bullet speed), denser walls, or bigger
hits. `mul < 1` clamps to 1 (this knob only adds difficulty; "easier" is the `reducedEffects`/assist
path, future work). Guarded by `tests/fairness.test.js` (B4) so the rebalance can't cross into unfair,
and by `tests/scaling.test.js` (golden values on the helper + the shipped config).

## Consequences

- **Easier:** one number (`hardnessMul`) re-tunes the whole challenge live; weights re-flavor it
  (e.g. push some hardness into count, or — with a fairness re-check — into ring density later).
- **Trade-offs:** HP ×2 **compounds with the floor ramp** (a floor-4 boss is `cfg.hp × ~2.5 (floor)
× 2 (hardness)` ≈ 5× base), so boss fights are noticeably longer — intended, but the first thing to
  dial if it feels spongy. Contact damage and ring density intentionally did **not** increase, so the
  game is "harder by attrition + crowding", which is the kid-fair lever; if Scott wants more _bite_,
  adding a `contactWeight`/`ringWeight` (with a fairness re-check) is the follow-up.
- **Validation:** `npm run dev` with Caden is the real tuning loop; log reactions in
  `docs/playtest/kid-feedback-log.md`. `docs/COMBAT_CORRIDOR.md` holds the research TTK targets as a
  reference (not enforced).

## Alternatives considered

- **2× on every facet.** Compounds to ~8× — brutal. Rejected (the weights exist precisely to avoid it).
- **Per-floor piecewise HP/damage tables (the research's model).** More control, but a bigger rewrite
  of a working curve; the single knob + weights gets ~2× now and stays trivially tunable. Revisit if
  per-floor shaping is needed.
- **Double ring density / contact damage.** Most direct "harder", but breaks B4 gaps / risks one-shots
  for a young player. Rejected as defaults; left as future weighted facets behind a fairness re-check.
