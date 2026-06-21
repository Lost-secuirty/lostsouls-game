# Story Bible — _City of Monsters_ (Lostsouls)

> **Why this file exists.** The game is built fast and fun-first, so the _story_ can drift if it
> isn't written down. This is the canon — the setting, the cast, the rules of the world, and the
> "why" behind the monsters and guns. Read it before adding new content so the theme stays whole.
> It's a **living doc**: when we lock a new story beat, add it here. Co-authored by Scott + Caden.
>
> Caden set it in **1940**. (Asked what he knows about the '40s: _"I know one thing — they had
> nukes."_ So: nukes it is. 🍄☢️)

---

## Logline

A **father and his son** are trapped in a ruined city after an experiment tore open a **portal /
rift**. Demons, the undead, and stranger things pour out in **endless, worsening waves**. The only
way out is _through_: fight to the **center of the city**, reach the rift, and **cross over** to
whatever is on the other side.

## Setting

- **Era:** **1940s**, post–WW2. The shooting war is over, but it didn't end clean.
- **Place:** a **medium-sized city** — not a sprawling metropolis. Streets, barricades, rubble,
  ruined blocks. Think a war-torn town, not a skyline.
- **What broke it:** the city was _already_ wrecked. WW2 bled straight into a **civil war** — so
  even before the monsters, **nobody trusted anybody**. Then an **experiment went wrong** and
  opened the rift. The monsters are the new disaster on top of an old one.
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

- **Base style: WW2-era.** Pistols, shotguns, machine guns, rockets — 1940s silhouettes.
- **Mix with future / monster / demon tech.** Salvage from the rift fuses with old guns to make
  the exotic weapons (homing, railgun, charge cannon, the orbital blade, etc.).
- **Weapons can become "ALIVE."** Carry a fused gun long enough and the monster/demon tech in it
  **wakes up** — the weapon becomes part-creature. This is a deliberate future arc (a weapon that
  grows, talks, demands, or changes how it fires over a run). **Not built yet — see Open Questions.**
- **Design intent:** the pistol is **weak by design** (your fallback); other guns are scavenged
  upgrades. Balance/feel lives in `config.js` (`WEAPONS`).

## Tone & canon rules (the guardrails)

Keep new content inside these so the theme doesn't get lost:

1. **1940s, post-war, ruined medium city.** Scavenged, paranoid, atmospheric.
2. **The rift is the center and the goal.** Everything pushes toward crossing over.
3. **Harder toward the center.** Spawns escalate as you approach the core.
4. **NO zombies.** Other undead + demons + warped "other things" only.
5. **Trust is temporary and earned.** Humans help for a while, or turn on you.
6. **Weapons: WW2 base × rift-tech, and they can come alive.**
7. **Fun-first, kid-fair** (ADR-0005): readable telegraphs, dodge gaps, nothing cheap.

## Open questions / placeholders (decide later, then write it here)

- **Name of the other side** — "the other world," "the zone," the **"warp field"**? (Caden/Scott pick.)
- **What's across the rift?** The finale destination — a final zone/boss beyond the portal.
- **"Living Weapons" rules** — how a weapon wakes up, what it does, is it good or a curse?
- **Survivor ally system** — temp companions, escort/quest rooms, trade, area mini-games.
- **The experiment** — who ran it, why? (A faction from the civil war? The military and the nukes?)
- **The dad & son** — names? a reason they're still together in the worst place on earth?

---

_Add to this file whenever a story beat gets locked. If a new monster, weapon, or area would
break a canon rule above, it doesn't go in — or the rule changes here first, on purpose._
