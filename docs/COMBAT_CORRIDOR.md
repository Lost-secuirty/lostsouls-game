# Combat corridor — TTK reference (not enforced)

A **tuning reference**, not a gate. From the roguelite-scaling research (deep-research report (4)),
adapted as target "time-to-kill" bands so Scott + Caden can eyeball whether a floor feels right while
playtesting (`npm run dev`, debug HUD with `?debug=1`). Nothing in code reads this file — the live
dial is `config.DIFFICULTY` (see [ADR-0027](adr/0027-difficulty-and-scaling.md)).

The qualitative shape we want at any `hardnessMul`:

- **Trash** stays quick to clear (a fraction of a second to ~1s) — never bullet-spongy busywork.
- **Elites/bruisers** are a noticeable beat, not a wall.
- **Bosses** are a real fight that gets a bit longer across the run, but never an evaporate-instantly
  nor a war of attrition.
- **Hits-to-death (player)** falls more gently than enemy durability rises — fairness is read through
  _incoming_ damage, so we raise HP/density (B5) before ever raising damage.

Research target bands (floors 1→6), as a starting compass:

| Floor | Trash TTK | Boss TTK |
| ----- | --------- | -------- |
| 1     | ~0.9s     | ~22s     |
| 2     | ~0.9s     | ~23s     |
| 3     | ~0.85s    | ~24s     |
| 4     | ~0.8s     | ~24s     |
| 5     | ~0.8s     | ~25s     |
| 6     | ~0.75s    | ~26s     |

Note: this game ships **5 floors** today; the 6-row table is the research's shape — read it as a
curve, not a row-count mandate. When `hardnessMul` is at 2 ("twice as hard"), boss fights run roughly
double these — that's expected; dial `hardnessMul` (or `hpWeight`) toward these numbers if a fight
feels spongy for Caden.
