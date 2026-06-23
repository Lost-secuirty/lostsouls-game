# Story Bible — _City of Monsters_ (Lostsouls)

> **Why this file exists.** The game is built fast and fun-first, so the _story_ can drift if it
> isn't written down. This is the canon — the setting, the cast, the rules of the world, and the
> "why" behind the monsters and guns. Read it before adding new content so the theme stays whole.
> It's a **living doc**: when we lock a new story beat, add it here. Co-authored by Scott + Caden.
>
> Caden set it in the **1940s**. (Asked what he knows about the '40s: _"I know one thing — they had
> nukes."_) The decade is an **era / tech anchor**, not real history — it keeps weapons, names, and
> dates period-consistent (1940s-era tech, _no uzis_). In this timeline there was **no WW2**; the war
> that wrecked the place was a **civil war** (see Setting). 🍄☢️

---

## Logline

A **father and his son** are trapped in a ruined city after an experiment tore open a **portal /
rift**. Demons, the undead, and stranger things pour out in **endless, worsening waves**. The only
way out is _through_: fight to the **center of the city**, reach the rift, and **cross over** to
whatever is on the other side.

## Setting

- **Era:** the **1940s** — used as a **tech / era anchor** only (period weapons, names, dates). This
  is an alternate timeline: **there was no WW2.**
- **Place:** a **nameless, medium-sized city** — not a sprawling metropolis, and deliberately unnamed
  (the _where_ doesn't matter). Streets, barricades, rubble, ruined blocks; a war-torn town, not a
  skyline.
- **What broke it:** a **civil war** (not a world war) had _already_ wrecked the place — so even
  before the monsters, **nobody trusted anybody**. Then an **experiment went wrong** and opened the
  rift. The monsters are the new disaster on top of an old one.
- **The mood:** paranoid, scavenged, desperate. Survivors hole up. Help is temporary and earned.

## The Rift (the engine of the game)

- A **portal** opened by an experiment-gone-wrong. It sits at the **center of the city**.
- It **keeps spitting out monsters**, and the spawns get **harder the closer you get to it**.
  Small things at the edges; nightmares at the core.
- **It does not stop on its own.** The waves only end when the heroes **reach inside it and cross
  over** — into the other world / zone / "warp field" (name TBD; see Open Questions).
- **Direction = difficulty.** Moving toward the center is moving toward the worst of it.

## The heroes

- **The Dad** and **The Son** — the two playable characters (this maps cleanly onto our existing
  **solo + AI-ally** and **2-player co-op**). It's their story: stick together, push to the rift.
- They're survivors, not soldiers-by-trade. They scavenge weapons and keep moving.

## Humans & trust (this is a core mechanic, not just flavor)

- **No one trusts anyone.** Survivors are scared and twitchy — to them, _you_ might be a monster
  wearing a face.
- A survivor **can be talked into helping you — temporarily.** They'll fight alongside you for a
  **few floors**, or hand something over, often after a **quest or a mini-game** in an area.
- This is already in the game as the **Human decision-boss** ("The Survivor", `bosses/human.js` +
  `systems/humanDecision.js`): you choose how to approach a cornered survivor; a good read means
  he helps and waves you through, a bad read means he panics and fights. **Trust is a gamble.**
- **Future:** temporary survivor allies, escort/quest rooms, trade, and area mini-games all live
  under this pillar.

## The bestiary (what comes out of the rift)

**Hard rule: NO zombies.** No shambling-corpse "zombie" enemies, ever. The undead here are
_other_ kinds of undead.

What's allowed out of the portal:

- **The undead** — skeletons, bound spirits, reanimated things (but **not** zombies).
- **Demons** — things that were never human.
- **Twisted nature & "other things"** — fungal horrors, beast-things, and whatever the rift warps
  on its way through. The further in, the less they make sense.

**Threat reads by size & distance from the rift** (see `docs/adr/0020-*` for the scale system):
small/weak at the city's edge → big/deadly at the core.

### Current roster → how it fits the story

The live 5-floor run is the journey from the city's edge toward the rift:

| Floor             | Boss                      | In-world read                                                |
| ----------------- | ------------------------- | ------------------------------------------------------------ |
| The Outskirts     | 🕷️ Spider                 | First things crawling out at the edge of the breach.         |
| The Barricade     | 🚪 The Survivor (human)   | A terrified survivor holding a checkpoint — _trust gamble._  |
| The Fungal Depths | 🍄 Mushroom King          | The rift warping the city's nature; spores choke the blocks. |
| The Kennels       | 🐶🐱 Fang & Whisker (duo) | Twisted beasts hunting in a pair, deeper in.                 |
| The Catacombs     | 💀 Rattlebones (skeleton) | The proper undead, near the core.                            |

_(Order/contents are tunable in `config.js`. As we add bosses we slot them along this edge → core
gradient.)_

## Weapons — and the "Living Weapons" arc

- **Base style: 1940s-era.** Pistols, shotguns, machine guns, rockets — period silhouettes. **Keep
  it period-correct:** the 1940s anchor means no anachronistic guns (no uzis, no modern optics) until
  rift-tech justifies it.
- **Mix with future / monster / demon tech.** Salvage from the rift fuses with old guns to make
  the exotic weapons (homing, railgun, charge cannon, the orbital blade, etc.).
- **Weapons can become "ALIVE."** Carry a fused gun long enough and the monster/demon tech in it
  **wakes up** — the weapon becomes part-creature. This is a deliberate future arc (a weapon that
  grows, talks, demands, or changes how it fires over a run). **Not built yet — see Open Questions.**
- **Design intent:** the pistol is **weak by design** (your fallback); other guns are scavenged
  upgrades. Balance/feel lives in `config.js` (`WEAPONS`).

## Tone & canon rules (the guardrails)

Keep new content inside these so the theme doesn't get lost:

1. **1940s-era, nameless ruined city; the war was a CIVIL war (no WW2).** Scavenged, paranoid,
   atmospheric — the decade is a tech/era anchor, not real history.
2. **The rift is the center and the goal.** Everything pushes toward crossing over.
3. **Harder toward the center.** Spawns escalate as you approach the core.
4. **NO zombies.** Other undead + demons + warped "other things" only.
5. **Trust is temporary and earned.** Humans help for a while, or turn on you.
6. **Weapons: 1940s-era base × rift-tech, period-correct (no anachronisms), and they can come alive.**
7. **Fun-first, kid-fair** (ADR-0005): readable telegraphs, dodge gaps, nothing cheap.

## Open questions / placeholders (decide later, then write it here)

- **Name of the other side** — "the other world," "the zone," the **"warp field"**? (Caden/Scott pick.)
- **What's across the rift?** The finale destination — a final zone/boss beyond the portal.
- **"Living Weapons" rules** — how a weapon wakes up, what it does, is it good or a curse?
- **Survivor ally system** — temp companions, escort/quest rooms, trade, area mini-games.
- **The experiment** — who ran it, why? (A faction from the **civil war**? Whoever held the city?)
- **The dad & son** — names? a reason they're still together in the worst place on earth?

## Under discussion — Scott's lore expansion (2026-06-23, not canon yet)

> These ideas are **not locked** — they're Scott's notes from a brainstorm session. Nothing below
> overrides the canon above until it's decided and written in. Conflicts with current canon are noted.

### The energy source — "Echo" origin story

Scott's concept: the energy that powers the rift comes from **nuclear experiments**, seeded by
**Russia's first nuclear test (1949)**. Key beats:

- Scientists learned to **harvest the energy released by the explosion** — it behaves like a new
  kind of fuel/force, not just radiation.
- Early applications: heat, power generation, industrial output. Tech advances faster than in our
  timeline because of this new power source.
- Governments (US, Soviet, others) began secret experiments — many real-world sites used as cover:
  **TVA dams** and the **Hoover Dam** officially run on hydroelectric power, but are secretly also
  channeling/containing this energy.
- The **teleportation experiment** — someone tried to use the energy as a transit mechanism.
  It went wrong. **Portals opened.** The monsters came through.
- **The name "Echoes"** does NOT exist in the game world at the start. It's what survivors
  eventually call the energy after the player **beats the final boss and claims or discovers something
  about its source**. The word comes last — earned.

**Open conflict with current canon:** current STORY.md says "no WW2 — a civil war wrecked the
city." Scott is considering a **post-WW2 alt-history** instead (WW2 happened → Russia tests nuke in
1949 → the portal energy is nuclear in origin). **These cannot both be true** — needs a decision.
Options: (a) keep civil-war-only, nuclear energy is still the experiment trigger; (b) switch to
post-WW2 alt-history; (c) WW2 happened elsewhere but the _city_ was the civil-war's battleground.

**Era:** Scott is also considering **shifting to 1950s** (vs current 1940s anchor) — makes the Cold
War paranoia and nuclear anxiety feel more natural. Not decided.

### Folklore / atmosphere notes (background research, not lore decisions)

Scott uploaded reference research on 1940s–50s American folklore. Relevant atmosphere sources for
art direction, room themes, and enemy flavor:

- **Dark Watchers (Big Sur)** — shadowy tall figures in coastal mountains. Good enemy silhouette
  inspiration.
- **Foo Fighters / early UFO sightings** — glowing orbs trailing aircraft. Could be a projectile
  or enemy visual motif.
- **Phantom Hitchhiker** — ghost that appears human, then isn't. Maps well onto the Human boss /
  "trust is a gamble" pillar.
- **Kilroy Was Here** — veteran graffiti that spread everywhere. Good in-world detail for ruins/walls.
- **The Philadelphia Experiment** — ship turned invisible via military tech. Fits the "government
  experiments gone wrong" theme.

These are **atmosphere/flavor sources**, not canon decisions. Use them to inspire room names, wall
detail, enemy design — don't force them into plot.

---

_Add to this file whenever a story beat gets locked. If a new monster, weapon, or area would
break a canon rule above, it doesn't go in — or the rule changes here first, on purpose._
