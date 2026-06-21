# ADR-0022: Scaling math — diminishing-returns upgrades + a difficulty curve

- **Status:** Accepted
- **Date:** 2026-06-21

## Context

Two long-standing playtest complaints (parked since Stage 6, unparked by Scott for this pass):

1. **Upgrades "cap out too fast."** Damage/fire-rate/speed each hit their `CAPS` ceiling in ~2–3
   pickups (`damageMul += 0.2` to a 1.5 wall; `fireRateMul *= 0.82` to a 0.5 floor; `speed += 1.8`
   to a 1.5× wall). The run swung between over-powered early and flat afterwards.
2. **A few guns feel OP** (machine gun, homing, rockets) and the overall challenge was tuned
   kid-fair. Scott wants it **genuinely challenging** (Binding-of-Isaac / Gungeon / Doom tier — his
   son is strong at BoI) — _not_ kiddy, _not_ Dark-Souls — and he wants the **math** so he can
   fine-tune feel himself.

Balance was already 100% config-driven, but the upgrade steps and the per-floor `diff` numbers were
ad-hoc constants with no shared curve.

## Decision

A pure **`src/core/scaling.js`** holds the two curves; all knobs live in `config.js`.

**Upgrades — diminishing returns (soft cap), `statBonus(stacks, maxBonus, half)`:**

```text
bonus(n) = maxBonus * n / (n + half)
```

Each pickup now adds **one stack**; the player recomputes the stat from the curve (`damageMul`,
`fireRateMul`, `speed`). Big early, tapering, approaching `maxBonus` but never a hard wall — so every
pickup adds _something_ across a whole run. Knobs in `config.UPGRADES` (`maxBonus` = ceiling,
`half` = stacks to half of it). Defaults: damage +100% (half 5), fire-rate −60% cooldown (half 6),
speed +60% (half 6). `CAPS` are kept only as safety backstops at the asymptotes. Verified in-browser:
3 stacks of damage = ×1.375 (was a ×1.5 wall), still climbing to ×1.71 at 12 → ×2.0.

**Difficulty — one curve for the whole run, `floorScale(floorIndex, {base, growth})`:**

```text
diff(i) = base * (1 + growth)^i        (× an optional per-floor `diffMul` spike)
```

Replaces the hand-set per-floor `diff` array. `floorInfo()` computes it; the spawner and bosses read
it for the **safe** difficulty knobs only — boss HP, ring density, enemy counts — **never** bullet
speed or off-screen spawns (the research's "risky knobs"). Defaults `base 1.0, growth 0.26` give
floors ≈ 1.00, 1.26, 1.59, 2.00, 2.52 (vs the old 1.0, 1.3, 1.6, 1.9, **2.15**) — early floors about
the same, finale meaningfully harder.

**Gun rebalance** (starting points, tunable): machine gun cooldown 0.07 → 0.09 (still the fastest
hose), homing damage 3 → 2 (it already homes + explodes), rocket cooldown 0.8 → 1.0 (the AoE nuke is
a deliberate shot). Pistol stays weak by design; shotgun unchanged.

## Consequences

- **Easier:** the whole run's challenge is one curve (`DIFFICULTY`), the whole power ramp is three
  curves (`UPGRADES`) — Scott fine-tunes feel from `config.js` with no code changes. Curves are pure
  and golden-value tested (`tests/scaling.test.js`), so the feel math can't silently drift.
- **Net feel:** early game is slightly _harder_ (you ramp slower) and late game is _stronger_ and
  _harder_ (curves keep growing, difficulty climbs to 2.52×) — the intended "challenging, meaningful
  progression."
- **Trade-offs:** several balance levers move at once (upgrade ramp + difficulty + gun nerfs), so the
  numbers are deliberately defaults for Scott's playtest tuning, not final. Per-pickup step configs
  (`PICKUPS.*Amount`) are removed (now stack-driven). Survivor stat rewards add one stack each
  (magnitude-agnostic) — consistent with pickups.

## Alternatives considered

- **Keep additive steps, just raise the caps.** Still a hard wall, just later; doesn't fix the
  "each pickup stops mattering" feel. Rejected for the saturating curve.
- **Logarithmic curve** (`a·ln(n+1)`). Also valid, but the `n/(n+half)` form has intuitive knobs
  (asymptote + half-life) and a clean asymptote to back the CAPS. Chosen for tunability.
- **A full threat-budget director** (`T = wB·B + wS·S + …`). Powerful but a big new system; deferred
  — the per-floor curve + safe-knob scaling delivers the ask without the accounting layer.

## Sources

- [Diminishing Returns in Game Design: The Logarithm — Filler](https://blog.nerdbucket.com/diminishing-returns-in-game-design-the-logarithm/article)
- [Binding of Isaac vs Enter the Gungeon difficulty discussion](https://steamcommunity.com/app/311690/discussions/0/2572002906846785115/)
- ChatGPT deep-research repo audit (difficulty director + safe vs risky knobs).
