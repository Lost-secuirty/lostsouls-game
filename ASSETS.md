# Assets & credits

The game runs with **zero downloaded assets** — everything is drawn with colored
shapes and plays silently by default. When you add real models or sounds, list them
here with their source and license. **Only use CC0 or free-for-games assets.**

## How to add an asset

- **Model:** put a `.glb` file in `public/models/`, then reference its key in
  `src/config.js` (see `MODELS`). Missing file → the game uses a primitive shape.
- **SFX:** sound effects are **generated in code** in `src/systems/sfx.js` (Web Audio, no
  files). Edit the recipes there to change how shots/hits/pickups sound.
- **Music:** recorded background tracks play via Howler (ADR-0024). Drop a file in
  `public/audio/` and point its track id at the filename in `src/config.js` → `MUSIC.tracks`
  (plug-and-play; a `null`/missing file falls back to the synth drone). Credit every
  non-original track in the table below.

## Where to get free assets

| Source                               | License                  | Good for                                                 |
| ------------------------------------ | ------------------------ | -------------------------------------------------------- |
| [Kenney](https://kenney.nl/assets)   | CC0                      | Monsters, characters, props, sounds — clean + consistent |
| [Quaternius](https://quaternius.com) | CC0                      | Animated monsters & characters                           |
| [Poly Pizza](https://poly.pizza)     | CC0                      | Huge low-poly model library                              |
| [Freesound](https://freesound.org)   | CC0 / CC-BY (check each) | Sound effects                                            |
| [Pixabay](https://pixabay.com)       | Pixabay License          | Music + sounds                                           |

## Credits

SFX are procedural (no files). Models below are **CC0 (Public Domain)** — no
attribution is required, but we credit the author anyway.

| File                              | Source                                         | Author     | License |
| --------------------------------- | ---------------------------------------------- | ---------- | ------- |
| `public/models/mushroom-king.glb` | [Poly Pizza](https://poly.pizza/m/grnFTziU8u)  | Quaternius | CC0 1.0 |
| `public/models/mushnub.glb`       | [Poly Pizza](https://poly.pizza/m/LWKmS30Xxl)  | Quaternius | CC0 1.0 |
| `public/models/dog.glb`           | [Poly Pizza](https://poly.pizza/m/y4wdQpg767)  | Quaternius | CC0 1.0 |
| `public/models/cat.glb`           | [Poly Pizza](https://poly.pizza/m/qKICY6xla2)  | Quaternius | CC0 1.0 |
| `public/models/skeleton.glb`      | [Poly Pizza](https://poly.pizza/m/yq5ATpujSt)  | Quaternius | CC0 1.0 |
| `public/models/human.glb`         | [Poly Pizza](https://poly.pizza/m/c3Ibh9I3udk) | Quaternius | CC0 1.0 |

### Music (ADR-0024 · see [docs/AUDIO.md](docs/AUDIO.md))

Current tracks are **placeholders** by **Kevin MacLeod (incompetech.com)**, licensed
**Creative Commons BY 4.0** (<https://creativecommons.org/licenses/by/4.0/>) — also credited
in-game (start menu → ♪ Credits). They'll be swapped for the final score (curated stage tracks +
AI-generated boss themes). The 5 boss slots share one placeholder until the real themes exist.

| Track id(s)      | File                                | Track (Kevin MacLeod) | License   |
| ---------------- | ----------------------------------- | --------------------- | --------- |
| `menu`           | `public/audio/menu.mp3`             | "Hush"                | CC BY 4.0 |
| `stage0`         | `public/audio/stage-outskirts.mp3`  | "Darkest Child"       | CC BY 4.0 |
| `stage1`         | `public/audio/stage-barricade.mp3`  | "Anxiety"             | CC BY 4.0 |
| `stage2`         | `public/audio/stage-fungal.mp3`     | "Echoes of Time"      | CC BY 4.0 |
| `stage3`         | `public/audio/stage-kennels.mp3`    | "Killers"             | CC BY 4.0 |
| `stage4`         | `public/audio/stage-catacombs.mp3`  | "Dark Times"          | CC BY 4.0 |
| `boss_*` (all 5) | `public/audio/boss-placeholder.mp3` | "Despair and Triumph" | CC BY 4.0 |
