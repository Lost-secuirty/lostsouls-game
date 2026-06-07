# 🩸 City of Monsters

A **3D bullet-hell shooter** — think *Binding of Isaac* meets *Doom* — that a dad and
his 11-year-old son are building together. You're stuck in a **ruined city overrun by
monsters and demons**. Your dad fights beside you. Other survivors are scattered
around… but not all of them are friendly, and you can't always tell who is.

- 🎮 **Top-down twin-stick action.** Move with **WASD**, **aim with the mouse**, hold
  to **shoot**.
- 🩸 **Blood, screen-shake, and hit-stop** — fast, punchy, and made to feel good.
- 🤝 **Survivors you can help or leave.** Walk up, press **E**, and choose. But the
  outcome is **random** — helping might heal you… or it might be a trap. Leaving might
  save you… or cost you. You never know until it happens.
- 👨‍👦 **Dad is an AI buddy** who fights with you. (Two-player co-op is planned.)

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

**Controls:** `WASD` move · mouse aim · click/hold shoot · `E` talk to a survivor ·
`R` restart when you die.

---

## 🛠️ Make it your own (free tools for you + dad)

Everything here is **free**.

| Want to… | Use | Where | How hard |
| --- | --- | --- | --- |
| Make blocky monsters (Minecraft style) | **MagicaVoxel** | <https://ephtracy.github.io> | ⭐ easy |
| Make any 3D model | **Blender** | <https://www.blender.org/download/> | ⭐⭐⭐ takes practice |
| Edit/record sounds | **Audacity** | <https://www.audacityteam.org/download/> | ⭐ easy |
| Paint textures/art | **Krita** / **GIMP** | <https://krita.org> · <https://www.gimp.org> | ⭐⭐ |

**Free monsters, props & sounds you can download** (all free for games):

- **Kenney** — <https://kenney.nl/assets> (huge, super clean, CC0)
- **Quaternius** — <https://quaternius.com> (animated monsters + characters, CC0)
- **Poly Pizza** — <https://poly.pizza> (tons of low-poly models, CC0)
- **Freesound** — <https://freesound.org> (sound effects)
- **Pixabay** — <https://pixabay.com> (music + sounds)

**To add a model:** drop a `.glb` file into `public/models/` and point to it from
`src/config.js`. **To add a sound:** drop it into `public/audio/` and register it in
`src/systems/audio.js`. The game falls back to shapes and silence if a file is missing,
so you can never break it by experimenting. See `ASSETS.md` for the credits list.

---

## 🧠 The most fun thing to change

Open **`src/config.js`** — *every* number that controls how the game feels lives there:
player speed, fire rate, how much the screen shakes, how much blood, monster health.
Change a number, save, and watch it change instantly in `npm run dev`. That's the best
way to learn how games work.

---

## For grown-ups / contributors

This is a **hybrid** project: fast and fun, but it keeps a real rulebook.

- **`AGENTS.md`** — the contract (commands, structure, boundaries, working agreement).
- **`docs/adr/`** — why the big technical choices were made.
- **`docs/LEARNINGS.md`** — running notes/gotchas.

Tech: Three.js + Vite + Express + howler.js. No physics engine (custom collision).
MIT licensed.
