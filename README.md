# 🩸 Lostsouls

A **3D bullet-hell shooter** — think _Binding of Isaac_ meets _Doom_ — that a dad and
his 11-year-old son are building together. You're stuck in a **ruined city overrun by
monsters and demons**. Your dad fights beside you. Other survivors are scattered
around… but not all of them are friendly, and you can't always tell who is.

- 🎮 **Top-down twin-stick action.** Move with **WASD**, **aim with the mouse**, hold
  to **shoot** — or plug in an **Xbox controller** (left stick move, right stick aim,
  right trigger shoot).
- 🏙️ **Floors of 5 rooms + a boss.** Clear five rooms, get a **⚠ BOSS AHEAD** warning,
  then fight the 🕷️ **spider boss**. Beat it to reach the next floor.
- 🕷️ **The spider has real attack patterns** (designed by Caden): a pistol-like **base
  attack**, a telegraphed **bullet ring** you dodge through, and **baby spiders** that swarm
  in once it drops below half health.
- 🎨 **Each floor is themed around its boss** — the monsters are mini versions of the boss
  and share its colors (floor 1 red, floor 2 toxic-green, floor 3 violet).
- ❤️ **3 lives + checkpoints.** Beat a boss and you respawn at the next floor if you
  die. Run out of all 3 lives and it's back to the start.
- 🔫 **Weapons & power-ups you walk over to grab** — shotgun, machine gun, rocket
  launcher, plus heart / damage / speed / fire-rate boosts, each with a **floating name
  label** so you know what it is. (The starting pistol is weak on purpose, so every upgrade
  feels great.)
- 🩸 **Blood, screen-shake, hit-stop, and sound** — all made in code, fast and punchy.
- 🤝 **Survivors you can help or leave.** Walk up, press **E** (or **A** on a pad), and
  choose. The outcome is **random** — helping might heal you… or be a trap. You never
  know until it happens.
- 👨‍👦 **Play solo or 2-player co-op.** Solo, Dad is an AI buddy. In co-op, **Player 2 takes
  over Dad on an Xbox controller** — pick 1 or 2 players on the start screen. If one of you
  goes down, you revive when the room is cleared; it's only Game Over if you both fall.

> It runs out of the box with simple colored shapes — no downloads needed. You can
> swap in cooler monsters and sounds whenever you want (see **Make it your own** below).

---

## ▶️ How to run it

You need **Node.js** (version 22 LTS): <https://nodejs.org/> — download, install,
restart your terminal.

```bash
npm install      # one time: get the building blocks
npm run dev      # play it! opens http://localhost:5173 with instant reload
```

To run the "real" (built) version through the game server:

```bash
npm run build    # bundle the game into dist/
npm start        # serve it at http://localhost:3000
```

At the **start screen** pick **1 Player** or **2 Players**. In 2-player, P1 uses the
keyboard/mouse and P2 uses an Xbox controller (it also rumbles).

**Controls:** `WASD` move · mouse aim · click/hold shoot · `1/2/3` switch weapon ·
`E` help a survivor · `Q` leave a survivor · `R` restart. **Xbox pad:** left stick move ·
right stick aim · `RT` shoot · `Y` switch weapon · `A` help · `B` leave · `Start` restart.

You **carry up to 3 weapons** (extra slots unlock as you beat bosses) and switch between them.
Stat boosts are **capped** (so the game stays fair), and a full-health player leaves hearts for
a hurt teammate.

**Debug menu (for grown-ups):** press the **backtick** key (`` ` ``) or add `?debug=1` to the
URL to open a dev panel — jump to any floor/room, spawn the boss, give weapons/pickups, god
mode, kill-all, and an FPS meter. It never loads during normal play.

---

## 🛠️ Make it your own (free tools for you + dad)

Everything here is **free**.

| Want to…                               | Use                  | Where                                        | How hard              |
| -------------------------------------- | -------------------- | -------------------------------------------- | --------------------- |
| Make blocky monsters (Minecraft style) | **MagicaVoxel**      | <https://ephtracy.github.io>                 | ⭐ easy               |
| Make any 3D model                      | **Blender**          | <https://www.blender.org/download/>          | ⭐⭐⭐ takes practice |
| Edit/record sounds                     | **Audacity**         | <https://www.audacityteam.org/download/>     | ⭐ easy               |
| Paint textures/art                     | **Krita** / **GIMP** | <https://krita.org> · <https://www.gimp.org> | ⭐⭐                  |

**Free monsters, props & sounds you can download** (all free for games):

- **Kenney** — <https://kenney.nl/assets> (huge, super clean, CC0)
- **Quaternius** — <https://quaternius.com> (animated monsters + characters, CC0)
- **Poly Pizza** — <https://poly.pizza> (tons of low-poly models, CC0)
- **Freesound** — <https://freesound.org> (sound effects)
- **Pixabay** — <https://pixabay.com> (music + sounds)

**To add a model:** drop a `.glb` file into `public/models/` and point to it from
`src/config.js` (the game falls back to shapes if it's missing, so you can't break it).
**Sound is made in code** (`src/systems/sfx.js`) — no files needed; tweak the little
sound recipes there to change how things sound. See `ASSETS.md` for details.

---

## 🧠 The most fun thing to change

Open **`src/config.js`** — _every_ number that controls how the game feels lives there:
player speed, fire rate, how much the screen shakes, how much blood, monster health.
Change a number, save, and watch it change instantly in `npm run dev`. That's the best
way to learn how games work.

---

## For grown-ups / contributors

This is a **hybrid** project: fast and fun, but it keeps a real rulebook.

- **`AGENTS.md`** — the contract (commands, structure, boundaries, working agreement).
- **`docs/adr/`** — why the big technical choices were made.
- **`docs/LEARNINGS.md`** — running notes/gotchas.

Tech: Three.js + Vite + Express, with procedural Web Audio sound and a lil-gui debug menu. No physics engine
(custom collision). MIT licensed.


Note from Lostsoulfs:This is special to me. 
