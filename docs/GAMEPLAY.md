# Gameplay — the single home for all design & balance decisions

Everything about _how the game plays_ and _why_ lives here: the core loop, the design principles, the
pillars (progression, combat, enemies, bosses, economy, difficulty), and where every knob lives. This
is the design companion to the world in [`STORY.md`](STORY.md) and the per-decision detail in
[`docs/adr/`](adr/). **Numbers are not duplicated here** — they live in
[`src/config.js`](../src/config.js) (the single source of truth); this doc explains the _intent_
behind them.

> **Status:** the 5-floor run is complete and playable (spider → human → mushroom → duo → skeleton).
> Combat, weapons (10), bosses (6 incl. the duo + the human decision-boss), the upgrade/difficulty
> math, and the accessibility/feel layer are all shipped. **Final balance is Scott + Caden's to
> fine-tune** in `npm run dev` — the values in `config.js` are sensible defaults, not gospel.

## Design principles — engaging through honest skill, _not_ manipulation

The game shares its ethics with the audio layer (see [`AUDIO.md`](AUDIO.md) "Design principles"): grab
attention and feel great through **honest skill → reward**, while deliberately avoiding the
gambling-style tricks that hook rather than delight. Concretely:

- **Fun-first, kid-fair (ADR-0005).** Caden plays this. Danger is **telegraphed and fair** — readable
  wind-ups (ADR-0023 overlays), dodge gaps in every bullet pattern, nothing cheap. The room is
  **always fully on screen** (ADR-0020) so a young player can see every bullet.
- **Skill and progress are the reward, never chance.** Upgrades come from **clearing rooms and beating
  bosses**, not random loot designed to create craving. Pickups are earned. No variable-ratio reward
  spam (that's the slot-machine loop the audio doc also rejects).
- **Honest cause-and-effect.** You got hit → instant hurt cue + i-frames + music duck; you earned it →
  clear positive cue. The player can always trace _why_ something happened.
- **The pistol is weak by design.** Your starting gun is a fallback, so scavenged weapons and upgrades
  _feel_ like power (roguelite wisdom — see `STORY.md` "Weapons" + `WEAPONS` in config). Power should
  **ramp across a whole run**, not cap in the first three pickups (ADR-0022).
- **Difficulty ramps toward a real challenge.** The curve aims above the old "too kid-fair" tuning
  (finale ≈ 2.52× floor 0) — BoI/Gungeon/Doom territory, but only on the _safe_ knobs (never bullet
  speed), so it stays fair while getting harder toward the rift (ADR-0022, and the story's "harder
  toward the center" rule).

## How it works (the 30-second version)

- A **run** = **5 floors**; each floor = **9 normal rooms + 1 boss room** (`PROGRESSION`, ADR-0007).
  Clear a room → a door opens → next room. Clear the boss → next floor. Reach + beat the skeleton →
  win. Lose all lives → game over (checkpoints at floor starts).
- **Twin-stick bullet-hell on the XZ plane** (top-down, ADR-0002). Move + aim + shoot; dodge enemy
  rings. Custom circle/AABB collision, **no physics engine** (ADR-0003).
- **You + an ally** (AI ally solo, or a 2nd human in local co-op — ADR-0011), mapping to the
  dad-and-son of the story. Keyboard/mouse + **gamepad** (ADR-0008).
- **Runs can be seeded** for replay/determinism (ADR-0013); the pure-logic seams (RNG, the human
  read, math) are unit-tested.

## The pillars

| Pillar               | What it is                                                                                          | Config block(s)                        | Key ADRs                           |
| -------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------------------- |
| **Progression**      | 5 floors × (9 rooms + boss); each floor has a boss + a palette its minions share                    | `PROGRESSION`, `ROOMS`, `CAPS`         | 0007, 0015, 0020                   |
| **Combat / weapons** | 10 guns with distinct behaviors (pierce/homing/bounce/charge/rocket/orbital); shared pooled bullets | `WEAPONS`, `BULLET`, `PLAYER`          | 0012, 0015, 0021                   |
| **Enemies**          | chaser (melee) + shooter (ring volleys); HP-gated minions sized off `ENEMY.chaser`                  | `ENEMY`, `ROOMS`                       | 0014, 0020                         |
| **Bosses**           | data-driven behavior modules; per-pattern numbers (P# = attack pattern, not HP phase)               | `BOSS`, `DUO`, `HUMAN_BOSS`, `HAZARD`  | 0009, 0014, 0016, 0018, 0019, 0021 |
| **Economy/upgrades** | earned pickups (heal, damage/firerate/speed stacks, weapons) on a diminishing-returns curve         | `PICKUPS`, `UPGRADES`, `CAPS`          | 0012, 0022                         |
| **Difficulty**       | one curve scales the safe knobs per floor (`diff = base × (1+growth)^floor`)                        | `DIFFICULTY`                           | 0022                               |
| **Feel / a11y**      | trauma shake + hit-stop + screen-flash + hit knockback; persisted settings (volume/mute/overlay)    | `JUICE`, `FEEL`, `SETTINGS`, `OVERLAY` | 0023                               |

### Bosses & the trust mechanic

Bosses are **data-driven** (a generic shell + a per-type behavior module, ADR-0014). The roster maps
straight onto the story's edge → core journey (see `STORY.md`):

- **Spider** (procedural) — first contact; aimed bursts, a dodgeable ring, HP-gated spiderlings.
- **The Survivor / human** — a **decision-boss** (ADR-0019): you pick how to approach a cornered
  survivor; a seeded **right read** skips the fight _and_ grants the weapon slot, a **wrong read**
  means you fight him. **Trust is a gamble** — a story pillar made mechanical (`HUMAN_BOSS`,
  `systems/humanDecision.js`).
- **Mushroom King** — spore ring with a dodge gap + telegraphed **poison pools** (ground-hazard
  system, ADR-0016).
- **Fang & Whisker (duo)** — the first **multi-boss** (ADR-0018): two HP bars, alternating aggression,
  enrage-on-partner-death.
- **Rattlebones (skeleton)** — the finale; bone throws, a scatter ring, a teleport-escape with
  i-frames, HP-gated bonelings.

Bullet patterns come from a pure **emitter library** (`ring`/`gapRing`/`jitterRing`/`star`/`nWay`/
`arc`, ADR-0021) — a new attack is "pick a generator + config numbers."

## Tuning the game (plug-and-play)

Everything that affects _feel_ is a number in [`src/config.js`](../src/config.js) — change it, save,
and watch it live in `npm run dev`. Common knobs:

- **Too hard / too easy?** `DIFFICULTY.growth` (whole-run ramp) and per-floor `diffMul`.
- **A gun feels off?** `WEAPONS.<name>` (cooldown, damage, pellets, spread, behavior flags).
- **Upgrades too fast/slow?** `UPGRADES` (the diminishing-returns curve), `CAPS` (hard backstops).
- **More/less juice?** `JUICE` (trauma shake + hit-stop), `FEEL` (screen-flash + knockback), `PARTICLES`
  (blood). Knockback is pure gameplay (not gated by `reducedEffects`); bosses ignore it by default so
  their telegraphs stay on-beat — flip `FEEL.knockback.enabled` off for the old no-shove combat.
- **Room density / pacing?** `ROOMS`, `PROGRESSION.roomsPerFloor`.

## Adding content (keep it inside the canon)

1. **New floor/boss:** add a behavior module under `entities/bosses/`, a `BOSS.<key>` block, and a
   `PROGRESSION.floors[]` entry (name + boss + palette). Slot it along the edge → core difficulty
   gradient (`STORY.md`). Significant new mechanics get an ADR.
2. **New weapon:** add a `WEAPONS.<name>` entry (+ a behavior flag if it's a new bullet behavior, per
   ADR-0015) and put it in the `PICKUPS` drop table.
3. **Check it against the canon rules** in `STORY.md` (1940s-era, no zombies, trust is earned, harder
   toward the center, kid-fair) — if it breaks a rule, it doesn't go in until the rule changes there
   on purpose.

## Open items / balance parking

Deferred balance + design ideas live in [`BACKLOG.md`](BACKLOG.md) and the curated plan in
[`ROADMAP.md`](ROADMAP.md). Highlights:

- [ ] **Final feel-tuning is Scott's** — the `UPGRADES`/`DIFFICULTY`/`WEAPONS` defaults are starting
      points; crank to taste with Caden.
- [ ] **Entity-size fine-tuning by eye** (post-arena-scale pass, ADR-0020).
- [ ] **Orbital Blade → passive power-up** rework (playtest feedback).
- [ ] **Story arcs not yet built:** "Living Weapons," temporary survivor allies / escort-quest rooms
      (both under the trust pillar) — see `STORY.md` open questions + `ROADMAP.md`.
