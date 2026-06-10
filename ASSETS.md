# Assets & credits

The game runs with **zero downloaded assets** — everything is drawn with colored
shapes and plays silently by default. When you add real models or sounds, list them
here with their source and license. **Only use CC0 or free-for-games assets.**

## How to add an asset

- **Model:** put a `.glb` file in `public/models/`, then reference its key in
  `src/config.js` (see `MODELS`). Missing file → the game uses a primitive shape.
- **Sound:** sound is **generated in code** in `src/systems/sfx.js` (Web Audio, no
  files). Edit the sound recipes there to change how things sound. If you'd rather use
  recorded audio files, you can wire them in behind the `audio.play()` facade in
  `src/systems/audio.js`.

## Where to get free assets

| Source                               | License                  | Good for                                                 |
| ------------------------------------ | ------------------------ | -------------------------------------------------------- |
| [Kenney](https://kenney.nl/assets)   | CC0                      | Monsters, characters, props, sounds — clean + consistent |
| [Quaternius](https://quaternius.com) | CC0                      | Animated monsters & characters                           |
| [Poly Pizza](https://poly.pizza)     | CC0                      | Huge low-poly model library                              |
| [Freesound](https://freesound.org)   | CC0 / CC-BY (check each) | Sound effects                                            |
| [Pixabay](https://pixabay.com)       | Pixabay License          | Music + sounds                                           |

## Credits

_(none yet — the current build uses procedural shapes and no audio files)_

| File | Source | Author | License |
| ---- | ------ | ------ | ------- |
| —    | —      | —      | —       |
