# Audio — the single home for all music & sound decisions

Everything about the game's audio lives here: what plays where, why, what's a placeholder,
candidate swaps, the design principles, and how to add/replace a track. Engine details are in
[ADR-0024](adr/0024-recorded-music-howler.md); per-file credits are in [`ASSETS.md`](../ASSETS.md).

> **Status:** music **engine** done; **placeholder** stage tracks + a shared boss placeholder wired
> (CC-BY, Kevin MacLeod), now **OGG, loudness-normalized to −16 LUFS** (consistent volume). A dev
> **audio studio** (`scripts/audio-studio.mjs`) reports LUFS/peak/waveforms and normalizes/transcodes.
> SFX are procedural. Boss themes get designed with Caden later. Everything is swappable, no code change.

## Audio studio (dev harness) — `scripts/audio-studio.mjs`

Needs **ffmpeg** on PATH (or `$FFMPEG`/`$FFPROBE`; auto-found from a winget install on Windows).

- `npm run audio:report` — prints a per-track table (duration · **integrated LUFS** · true peak ·
  size), flags any track >3 LU off the −16 target, and writes a **waveform PNG** per track to
  `artifacts/audio/` (so you can _see_ a track). Read-only.
- `npm run audio:process` — two-pass EBU-R128 **loudness-normalize** to −16 LUFS + **transcode**
  every `public/audio/*.mp3` → OGG (smaller, better looping). Then point `config.MUSIC.tracks` at the
  `.ogg` names. (Used to process the current placeholders: 58 MB → 33 MB, loudness spread 11 LU → ~0.4.)

---

## How it works (the 30-second version)

- Music files live in **`public/audio/`**. One list — **`MUSIC.tracks` in `src/config.js`** — maps a
  **track id → filename**. Change the filename, the game plays the new file. That's the whole API.
- `null`/missing/undecodable file → falls back to the procedural synth drone. **Never silent, can't
  break.** (So CI/headless with no files just uses the synth.)
- Recorded music plays via **Howler** (`src/systems/music.js`); the facade `src/systems/audio.js` is
  what game code calls. Tracks **stream** (don't bloat memory) and **crossfade**; the 🔊/mute panel
  controls music + SFX together.
- **SFX stay procedural** (`src/systems/sfx.js`) — shots/hits/pickups are generated in code.

## Design principles — engaging, _not_ addictive (research-backed)

From Scott's research (Drive: _"Addiction Psychology: Risk, Horror, and Loss"_, _"Gambling Addiction
Psychology Research"_, _"Gambling Trends"_). The goal: **grab attention and feel great through honest
skill→reward, while deliberately avoiding the manipulative tricks that make gambling addictive.**

**Use (the healthy loop):**

- **Tension → release (excitation transfer, Zillmann).** The payoff of horror isn't the fear — it's
  the _relief when the threat resolves_. So: build dread in exploration/boss wind-ups, then **release
  hard on genuine progress** (room cleared, boss down, escape). Bigger/clearer resolution = bigger
  reward. Players prefer decisive "evil defeated" endings — our win/clear cues are emphatic.
- **The safety frame.** Fear is fun only when you know you're safe. Keep danger **telegraphed and
  fair** (we already do — ADR-0023 overlays/telegraphs); the music can be ominous because it's
  clearly a game.
- **Honest cause-and-effect.** The research shows addiction is partly a _failure to link action →
  consequence_. Ethical design does the opposite: make it **crystal clear** — you got hit → instant
  hurt cue + music dip; you earned it → clear positive cue. Reward **skill and progress**, never
  chance.

**Avoid (the gambling traps — never do these):**

- **Variable-ratio / random reward sounds** (the slot-machine dopamine engine). No celebratory jingle
  on random/loot RNG designed to create craving. Rewards are _earned_.
- **Near-miss & loss-disguised-as-win celebration.** Never play a triumphant sound on a loss or a
  near-miss in a game of chance. (A _dodge_ in our game is a real skill signal — that's honest and
  fine. A faked reward on damage is not.)
- **Manipulative escalation / dopamine down-regulation** — no ever-louder reward spam that needs more
  to feel the same. Keep feedback proportionate and meaningful.

## Feedback audio map (what plays, and why)

| Event                   | Cue                          | Type        | Principle                             |
| ----------------------- | ---------------------------- | ----------- | ------------------------------------- |
| Shoot / hit enemy       | snappy synth blip            | SFX         | instant honest feedback               |
| Player hit              | hurt sound **+ music ducks** | SFX + music | negative feedback, _clearly_ yours    |
| Kill / explosion        | kill/boom                    | SFX         | earned, proportionate                 |
| Enter normal room       | stage track (loop)           | music       | exploration dread (safety frame)      |
| Boss room / fight start | crossfade to boss theme      | music       | tension spike                         |
| Room cleared            | (synth roomClear)            | SFX         | small release                         |
| Boss defeated           | boss die + return to stage   | SFX + music | **big release** (excitation transfer) |
| You win                 | win stinger                  | music/SFX   | decisive triumph (max payoff)         |
| Death / game over       | gameover stinger             | music/SFX   | honest loss — never celebratory       |

## Track map

Ids match `config.MUSIC.tracks`. **Placeholder** = a stand-in to swap later.

| Track id        | Moment                       | Intended mood               | Status                   | Current file (placeholder)                   |
| --------------- | ---------------------------- | --------------------------- | ------------------------ | -------------------------------------------- |
| `menu`          | Title / menu                 | distant noir dread          | placeholder              | `menu.mp3` (Hush)                            |
| `stage0`        | The Outskirts (spider floor) | sparse eerie noir           | placeholder              | `stage-outskirts.mp3` (Darkest Child)        |
| `stage1`        | The Barricade (human floor)  | tense military dark-jazz    | placeholder              | `stage-barricade.mp3` (Anxiety)              |
| `stage2`        | The Fungal Depths (mushroom) | wet organic dread           | placeholder              | `stage-fungal.mp3` (Echoes of Time)          |
| `stage3`        | The Kennels (duo)            | frantic predatory           | placeholder              | `stage-kennels.mp3` (Killers)                |
| `stage4`        | The Catacombs (skeleton)     | gothic choral dread         | placeholder              | `stage-catacombs.mp3` (Dark Times)           |
| `boss_spider`   | Spider fight                 | creeping → industrial spike | **placeholder (shared)** | `boss-placeholder.mp3` (Despair and Triumph) |
| `boss_human`    | Human fight (wrong read)     | frantic, desperate          | **placeholder (shared)** | `boss-placeholder.mp3`                       |
| `boss_mushroom` | Mushroom fight               | heavy, alien                | **placeholder (shared)** | `boss-placeholder.mp3`                       |
| `boss_duo`      | Dog/Cat fight                | fast, snarling              | **placeholder (shared)** | `boss-placeholder.mp3`                       |
| `boss_skeleton` | Skeleton finale              | gothic doom-metal           | **placeholder (shared)** | `boss-placeholder.mp3`                       |
| `win`           | Victory                      | decisive triumph            | synth stinger            | _(none — uses synth)_                        |
| `gameover`      | Death                        | honest, final               | synth stinger            | _(none — uses synth)_                        |

### Candidate swaps (free-for-games, when curating finals)

- **Curated:** [Eric Matyas / Soundimage](https://soundimage.org/) (CC-BY, looping OGGs by mood:
  Dark/Ominous, Horror/Surreal, Boss), [Kevin MacLeod](https://incompetech.com) (CC-BY),
  [Pixabay](https://pixabay.com/music/) (no-attribution), [OpenGameArt CC0](https://opengameart.org/content/cc0-music-0), FreePD (public domain).
- **Identity to aim for:** "1940s × Doom" = **doom-jazz / dark-jazz** + industrial weight; **distinct
  genre per stage** (noir → military → organic → frantic → gothic).

## Boss themes — designed with Caden (AI-generated, the real ones)

Plan: bespoke **"1940s doom-jazz × Doom"** per boss via **Stable Audio** (Pro = full ownership).
Generate → render OGG (~120s, clean loop) → drop in `public/audio/` as `boss_<key>.ogg` → set the id
in `config.MUSIC.tracks` (loop points: ask Claude to tighten if needed). Prompts:

- **`boss_spider`** — "Creeping 1940s noir doom-jazz: muted trumpet, slow upright-bass walk,
  skittering brushed percussion, faint clarinet; mounting unease erupting into a distorted
  industrial-metal spike — first-contact dread."
- **`boss_human`** — "Frantic, paranoid dark-jazz: jittery brushed drums, anxious dissonant piano,
  nervous double bass, sudden distorted guitar stabs — a cornered, desperate man with a gun."
- **`boss_mushroom`** — "Heavy organic doom: slow crushing groove, detuned brass drones, wet
  squelching textures, low choir pads — alien, fungal, suffocating."
- **`boss_duo`** — "Fast, snarling dark-jazz meets industrial: pounding tom-toms, growling baritone
  sax, relentless driving bass — a predatory two-beast chase."
- **`boss_skeleton`** — "Gothic doom-metal climax: ominous wordless choir, distorted brass, war-drums,
  pipe organ, tritone dread — the biggest, heaviest, final descent."

## Adding / swapping a track (plug-and-play)

1. Put the file in `public/audio/` (OGG best; MP3/WAV fine).
2. In `src/config.js` → `MUSIC.tracks`, set the id to the filename (e.g. `boss_spider:
'boss_spider.ogg'`).
3. If it's not public-domain/CC0, add it to [`ASSETS.md`](../ASSETS.md) **and** `src/ui/credits.js`
   (CC-BY must be credited in-game).
4. `npm run dev`, click once for sound, walk into the matching room. Tune crossfade/levels in
   `MUSIC` (config) to taste.

## Licensing

Repo rule: **CC0 or free-for-games, credited in `ASSETS.md`.** Current placeholders are **CC-BY
(Kevin MacLeod, incompetech.com)** — credited in `ASSETS.md` + the in-game **Credits** panel
(start menu → ♪ Credits). AI-generated boss themes will be original/owned.

## Open items

- [ ] Real boss themes (with Caden) — 5, replacing the shared placeholder.
- [ ] Curate final stage tracks (with Scott's ear) — possibly swap to CC0/OGG.
- [ ] Win/gameover music stingers (synth for now).
- [ ] Later polish: recorded SFX, adaptive intensity layers, a music-only volume slider.
