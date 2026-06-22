// =====================================================================
// config.js — EVERY tunable number in the game lives here.
//
// This is the fun file to mess with: change a value, save, and (in
// `npm run dev`) watch the game change instantly. Want to run faster?
// Shoot faster? More blood? More screen shake? It's all here.
// =====================================================================

// ---- the playfield (a flat arena on the XZ plane; y is "up") ----
// Roomy by design (Stage 6 / ADR-0020): ~2.5× the old floor area so there's space
// to dodge when a room is full of mobs firing. Walls, the door, ground/grid, and
// every spawn position derive from these two numbers — bump them and the whole
// arena (and the camera below) scales with it.
export const ARENA = {
  width: 64, // left-right size (X)  — was 40
  depth: 48, // near-far size (Z)    — was 30  (64×48 ≈ 2.56× the old 40×30 area)
  wall: 1.5, // wall thickness
  doorWidth: 6, // gap in the top wall to the next room
};

// ---- camera: tilted top-down, "Binding of Isaac" angle ----
// height/back are sized to FIT the whole ARENA on screen (the room is always fully
// visible — fairer for a young player who needs to see every bullet). They scale
// with ARENA: if you grow the arena, grow these by the same factor to keep the fit.
// Want to zoom IN (bigger sprites, but you may clip the room edges)? Lower both.
export const CAMERA = {
  fov: 55,
  height: 48, // how high above the arena (was 30; ×1.6 to fit the bigger arena)
  back: 29, // how far back (toward the player/camera) (was 18; ×1.6)
  lookAtY: 0,
  near: 0.1, // near clip plane
  far: 300, // far clip plane (well past the arena + fog)
};

// ---- lighting + fog (scene.js) ----
// The game's MOOD lives here: a warm key light + a cool fill over a purple
// hemisphere/ambient, plus fog that fades the far wall. Tweak intensities/colors to make
// the world brighter, moodier, warmer, colder, etc. (Post-FX bloom/tone-mapping that sits
// on top of this is in GRAPHICS.) The render studio reuses this so portraits match the game.
export const LIGHTING = {
  background: 0x07060a, // scene clear color (matches fog so the far edge dissolves)
  hemisphere: { sky: 0x8a6b8a, ground: 0x241826, intensity: 0.9 },
  ambient: { color: 0x66556a, intensity: 0.6 },
  key: { color: 0xffb088, intensity: 1.3, pos: [10, 30, 12] }, // warm main light
  fill: { color: 0x6688ff, intensity: 0.5, pos: [-15, 20, -10] }, // cool backlight
  // image-based lighting (ADR-0026): a subtle RoomEnvironment fill so PBR surfaces
  // (ground/walls/characters) read with depth. `intensity` is scene.environmentIntensity
  // — KEEP IT LOW (the default is 1, which washes pale models to white). It does NOT
  // touch the glowing MeshBasic bullets/eyes/door. The render studio reads the same knob
  // so portraits match the game. `sigma` = PMREM blur (higher = softer/flatter fill).
  ibl: { enabled: true, intensity: 0.3, sigma: 0.04 },
  // fog fades the far wall so the world dissolves at its edge. `mode`:'linear' uses
  // near/far planes (recommended for this fit-the-room top-down arena — keeps the far
  // wall readable); 'exp2' uses `density` for a moodier closing-in haze (an experiment).
  //   linear near = camDist × nearMul ; linear far = camDist + max(arena) × farMul
  // Keep `color` === `background` so the far edge dissolves instead of showing a wall.
  fog: { color: 0x07060a, mode: 'linear', nearMul: 1.0, farMul: 1.6, density: 0.012 },
};

// ---- colors / palette ----
export const PALETTE = {
  ground: 0x1a1320,
  groundGrid: 0x3a2a40,
  wall: 0x2c2230,
  wallTop: 0x4a3a52,
  player: 0x49b3ff, // you = blue
  ally: 0x6cff8a, // ally = green
  enemyChaser: 0x8b1a1a, // dark red demon
  enemyShooter: 0x9b2fb0, // purple caster
  playerBullet: 0xffe24a, // yellow
  enemyBullet: 0xff4d4d, // red
  npc: 0xd8c47a, // survivor = tan
  blood: 0xb20000,
  door: 0x36e0c0,
};

// ---- the "size ladder" (Stage 6 / ADR-0020) ----
// Size reads as threat in a top-down game, so we keep a clear hierarchy:
//   player/ally (0.85) < chaser (1.05) < shooter (1.2) < bosses (2.0–3.0, below).
// `radius` is BOTH the drawn size and the collision circle, so these affect feel —
// tune gently. (Speeds are deliberately left alone: keeping them constant in the
// bigger arena is what actually buys "more room" to dodge.)
// NOTE: every HP-gated MINION sizes itself RELATIVE to ENEMY.chaser.radius (it is
// built as a 'chaser' then shrunk in enemies.js topUpMinions / cat.js), so a tweak
// to chaser.radius moves all the bonelings/puffballs/kittens/survivors too.

// ---- player (you) ----
export const PLAYER = {
  radius: 0.85, // was 0.7 — a touch bigger so it still reads in the roomier arena
  height: 2.2, // was 1.8 — taller silhouette (visual only; collision is on XZ)
  speed: 11, // units/sec
  maxHearts: 6, // 6 = 3 full hearts (2 halves each)... we use whole hearts here
  fireCooldown: 0.16, // seconds between shots (lower = faster)
  invuln: 0.8, // i-frames after a hit (seconds)
};

// ---- ally (AI ally) ----
export const ALLY = {
  radius: 0.85, // matches the player (size ladder)
  height: 2.2,
  speed: 9,
  followDist: 4.5, // tries to stay this close to you
  fireCooldown: 0.45,
  range: 22, // will shoot enemies within this distance (bumped for the bigger arena)
};

// ---- bullets (shared pool for player + enemies) ----
export const BULLET = {
  poolSize: 600,
  radius: 0.28,
  lifetime: 2.5, // seconds before it disappears
  player: { speed: 26, damage: 1 },
  enemy: { speed: 12, damage: 1 },
};

// ---- enemies ----
export const ENEMY = {
  chaser: {
    hp: 3,
    radius: 1.05, // was 0.85 — slightly bigger than the player (reads as a threat)
    speed: 6,
    contactDamage: 1,
    contactCooldown: 0.7, // how often it can hurt you by touching
  },
  shooter: {
    hp: 4,
    radius: 1.2, // was 0.95 — the bigger, ranged threat sits above the chaser
    speed: 3.2,
    preferredDist: 11, // keeps roughly this far from you
    fireInterval: 1.6, // seconds between bullet-hell volleys
    bulletsPerRing: 10, // bullets in a ring volley
    contactDamage: 1,
    contactCooldown: 0.9,
  },
};

// ---- survivors (NPCs you help or leave) ----
export const NPC = {
  radius: 0.7,
  height: 1.7,
  interactRadius: 3.4, // how close before "press E" shows (roomy so it's easy to trigger)
  perRoom: 1, // one survivor in survivor-rooms (clearer than two)
};

// ---- per-room tunables (counts/obstacles) ----
export const ROOMS = {
  baseEnemies: 3, // enemies in the first room of a floor
  enemiesPerRoom: 0.8, // extra enemies added per room deeper in the floor (9 rooms now)
  shooterFromRoom: 3, // shooters start appearing at this room-in-floor (1-based)
  obstaclesMin: 2, // rubble boxes
  obstaclesMax: 5,
  survivorRoomsInFloor: [2, 5, 7], // which normal rooms (0-based) hold a survivor
};

// ---- progression: floors of 9 rooms + 1 boss room each ----
export const PROGRESSION = {
  roomsPerFloor: 9, // normal rooms before the boss
  // each floor: a boss type + difficulty + a color palette shared by the boss
  // AND that floor's monsters (so the monsters "reflect" their boss).
  floors: [
    {
      // diff is now computed from the DIFFICULTY curve (scaling.floorScale) by
      // floorInfo() — set an optional `diffMul` here for a per-floor spike.
      name: 'The Outskirts',
      boss: 'spider',
      palette: {
        body: 0x2a0606,
        emissive: 0x6a0d0d,
        leg: 0x1a0303,
        legEmissive: 0x400808,
        eye: 0xffe000,
      },
    },
    {
      // Expansion 6 Stage 5 — the Human DECISION-boss (a nervous survivor). Before
      // the fight you pick how to approach (A/B/C/D, config.HUMAN_BOSS.labels); a
      // seeded "right" read skips the fight + grants the slot, a wrong read means you
      // fight him for it (systems/humanDecision.js + bosses/human.js).
      name: 'The Barricade',
      boss: 'human',
      palette: {
        body: 0x6a7280, // grey jacket
        emissive: 0x3a4250, // cold blue
        leg: 0x4a3a2a, // worn boots / pants
        legEmissive: 0x3a5a2a, // military-green webbing
        eye: 0xffd24a, // wary amber
      },
    },
    {
      // Expansion 6 Stage 2 — Caden's mushroom boss + matching fungal minions.
      // (Final boss order spider→human→mushroom→duo→skeleton is set in a later
      // stage once those bosses exist; for now the mushroom caps off the run.)
      name: 'The Fungal Depths',
      boss: 'mushroom',
      palette: {
        body: 0xb83a2a, // cap red
        emissive: 0xff6a4a, // cap glow
        leg: 0xe8d8a8, // stem / gills (pale)
        legEmissive: 0x6a8a2a, // spore green accent
        eye: 0xffe66a,
      },
    },
    {
      // Expansion 6 Stage 3 — the Dog/Cat duo (first multi-boss). `boss: 'duo'`
      // marks a multi-boss floor; `duo` lists the two boss types (see spawner.js).
      // (Final boss order spider→human→mushroom→duo→skeleton is set in a later
      // stage; for now the duo caps off the run.)
      name: 'The Kennels',
      boss: 'duo',
      duo: ['dog', 'cat'], // Fang (pounce) + Whisker (zoner)
      palette: {
        // shared kennel ambiance; minions pick warm (pups) / cool (kittens) by kind
        body: 0x6a5230,
        emissive: 0xc8923a,
        leg: 0x2a2018,
        legEmissive: 0x5a4020,
        eye: 0xffd23a,
      },
    },
    {
      // Expansion 6 Stage 4 — the skeleton boss + bone-white catacomb minions.
      // (Final boss order spider→human→mushroom→duo→skeleton is set in Stage 5;
      // for now the skeleton caps off the run.)
      name: 'The Catacombs',
      boss: 'skeleton',
      palette: {
        body: 0xe8e2d0, // bone white
        emissive: 0x8a8a6a, // dim bone glow
        leg: 0xb8b09a, // grey bone
        legEmissive: 0x4a6a3a, // sickly graveyard green accent
        eye: 0x9bff6a, // green eye-socket glow
      },
    },
  ],
};

// ---- lives + global stat caps (SAFETY BACKSTOPS, not the main shaper) ----
// The real upgrade ramp is the diminishing-returns curve in UPGRADES below; these
// caps just stop a mis-tuned curve from ever running away. Set at/above the curve
// asymptotes so the curve is what you feel.
export const CAPS = {
  lives: { start: 3, max: 5 }, // start with 3, can grow to 5
  damageMul: 2.0, // hard ceiling on the damage multiplier (curve asymptote = +100%)
  fireRateMin: 0.4, // cooldown floor (curve asymptote = -60% cooldown)
  speedMul: 1.6, // hard ceiling on move speed (curve asymptote = +60%)
  maxWeaponSlots: 3, // carry up to 3 weapons
  slotUnlockBosses: [2, 10, 20], // a slot unlocks after these boss counts
};

// ---- upgrade curves (diminishing returns — see core/scaling.js statBonus) ----
// Each pickup adds ONE stack; the stat grows big early then tapers toward maxBonus,
// so power ramps across a whole run instead of capping in ~3 pickups. Tune per stat:
//   maxBonus = the eventual ceiling, half = how many stacks reach HALF of it
//   (higher half = slower, longer ramp). The pistol-stays-weak / shotgun-fine
//   balance is in WEAPONS; this is the player's stat growth.
export const UPGRADES = {
  damage: { maxBonus: 1.0, half: 5 }, // damageMul = 1 + bonus  → up to ×2 damage
  fireRate: { maxBonus: 0.6, half: 6 }, // fireRateMul = 1 - bonus → cooldown down to ×0.4
  speed: { maxBonus: 0.6, half: 6 }, // speed = base × (1 + bonus) → up to +60%
};

// ---- difficulty curve (one knob for the whole run — see scaling.js floorScale) ----
// diff(floorIndex) = base × (1 + growth)^floorIndex, applied to the SAFE knobs only
// (boss HP, ring density, enemy counts — never bullet speed). Higher growth = a
// steeper, more challenging ramp. Defaults aim above the old kid-fair tuning:
//   floors ≈ 1.00, 1.26, 1.59, 2.00, 2.52 (vs the old 1.0, 1.3, 1.6, 1.9, 2.15).
// A floor may also set an optional `diffMul` for a per-floor spike (default ×1).
export const DIFFICULTY = {
  base: 1.0, // floor 0 (the tutorial floor)
  growth: 0.26, // per-floor ramp (~+26%/floor)
};

// ---- the spider boss ----
// the co-designer's design card: P# = an ATTACK PATTERN (not a health phase).
//   P1 = base attack (pistol mimic)   P2 = dodgeable bullet ring
//   P3 = baby-spider spawns, HP-gated (see spiderlingTarget in progression.js)
export const BOSS = {
  spider: {
    hp: 60, // base HP (scaled by floor diff)
    radius: 2.7,
    speed: 4.5,
    contactDamage: 1,
    contactCooldown: 0.8,

    // P1 — base attack: a quick aimed burst, like a pistol
    p1Interval: 1.3, // seconds between bursts
    p1Burst: 3, // shots per burst
    p1Spread: 8, // degrees of spread across the burst
    p1BulletSpeed: 14,

    // P2 — bullet ring: "a circle of small dots", few on floor 1, denser later
    p2Interval: 3.6, // seconds between rings
    telegraph: 0.45, // wind-up (boss rears up) before the ring fires = fair warning
    ringBullets: 8, // base count on floor 1 (scaled by floor diff in code)
    ringBulletSpeed: 9, // slower so the ring is dodgeable

    // P3 — spiderling spawns (count gated by HP in spiderlingTarget())
    spawnInterval: 2.4, // how often it tops up toward the target count
  },

  // ---- the mushroom boss (Caden's pick) — Expansion 6 Stage 2 ----
  // P1 = slow spore spit · P2 = spore ring with a guaranteed dodge GAP ·
  // P3 = lingering poison pools (telegraphed, see systems/hazards.js) ·
  // P4 = HP-gated puffball spawns (puffballTarget(); pop into a pool on death).
  mushroom: {
    hp: 80,
    radius: 3.0,
    speed: 3.2, // slow and chunky
    contactDamage: 1,
    contactCooldown: 0.9,

    // P1 — spore spit: a slow, fat aimed cone (reads as drifting gas)
    p1Interval: 1.6,
    p1Burst: 4,
    p1Spread: 16,
    p1BulletSpeed: 9,

    // P2 — spore ring: telegraphed, with `ringGap` adjacent slots left empty
    p2Interval: 4.2,
    telegraph: 0.55,
    ringBullets: 10, // base on floor 1 (scaled by floor diff in code)
    ringBulletSpeed: 7,
    ringGap: 2, // guaranteed dodge lane (seeded position)

    // P3 — lingering poison pools dropped at the player's feet
    poolInterval: 3.6,
    poolRadius: 3.0,
    poolWarn: 0.8, // harmless telegraph window (fair warning)
    poolLive: 2.6, // seconds the pool is dangerous
    poolDamage: 1,
    puffPoolRadius: 2.2, // smaller pool left by a dying puffball

    // P4 — puffball spawns (count gated by HP in puffballTarget())
    spawnInterval: 3.0,
  },

  // ---- the Dog/Cat DUO (first multi-boss) — Expansion 6 Stage 3 ----
  // Two bosses at once, SEPARATE HP bars, ALTERNATING aggression (only the
  // "aggressor" attacks; see DUO + bosses/duo.js). The survivor ENRAGES when its
  // partner dies (no revive). Fang (dog) is a melee pouncer; Whisker (cat) is a
  // ranged cross-swipe zoner that summons kittens while it's the passive partner.

  // Fang — the DOG: stalk → wind-up (rear back) → fast pounce dash → recover.
  dog: {
    hp: 70,
    radius: 2.2,
    speed: 2.6, // slow stalk between pounces
    contactDamage: 1,
    contactCooldown: 0.8,
    stalkTime: 2.8, // seconds stalking before it readies a pounce
    telegraph: 0.6, // wind-up; the danger lane lights up = fair warning
    dashSpeed: 24, // fast lunge along the locked lane
    dashTime: 0.42, // short, so a sidestep clears it
    recoverTime: 1.2, // stands panting, open to hits (Whisker covers it)
    laneSparks: 4, // telegraph sparks painted ahead along the locked pounce lane
    laneColor: 0xff5a2a, // warning-orange lane sparks
    laneRepaint: 0.07, // seconds between lane spark refreshes during the wind-up
  },

  // Whisker — the CAT: keeps its distance and fires telegraphed cross-swipes
  // (arms of slow bullets in a +, rotated to an X each volley).
  cat: {
    hp: 60,
    radius: 2.0,
    speed: 3.2,
    contactDamage: 1,
    contactCooldown: 0.9,
    preferredDist: 12, // zoner: holds roughly this far away
    preferredStrafe: 0.5, // how hard it circles sideways while holding range
    swipeInterval: 2.2, // seconds between cross-swipes
    telegraph: 0.4, // wind-up before a swipe
    swipeArms: 4, // 4 = a "+"; the pattern rotates 45° each volley (→ an X)
    swipeBullets: 5, // dots per arm (staggered speeds make a growing line)
    swipeBulletSpeed: 8, // slow so it's dodgeable
    swipeSpeedBase: 0.5, // per-bullet arm shaping: speed *= (base + i*step) → a growing line
    swipeSpeedStep: 0.14,
    kittenInterval: 3.4, // tops up its litter this often while passive
    kittenCap: 2, // small (kid-fair); +1 when enraged
  },

  // ---- the SKELETON boss — "Rattlebones" 💀 (Expansion 6 Stage 4) ----
  // P1 = bone throw (aimed bolt volley) · P2 = scatter ring + rattle wind-up ·
  // P3 = reassemble & relocate (collapses, i-frames, teleports away, free breather) ·
  // P4 = HP-gated boneling summons (skeletonWaveTarget() in progression.js).
  skeleton: {
    hp: 90,
    radius: 2.6,
    speed: 3.4,
    contactDamage: 1,
    contactCooldown: 0.85,

    // P1 — bone throw: a quick aimed volley of bone bolts
    p1Interval: 1.5,
    p1Burst: 3,
    p1Spread: 12, // degrees across the volley
    p1BulletSpeed: 13,

    // P2 — scatter ring: a rattle wind-up, then a ring of bones at seeded jittered angles
    p2Interval: 4,
    telegraph: 0.5, // rattle wind-up (fair warning)
    ringBullets: 14, // base count (scaled by floor diff in code)
    ringBulletSpeed: 8, // slow so the ring is dodgeable
    scatterJitter: 0.22, // radians of seeded angle wobble per bone (the "scatter")

    // P3 — reassemble & relocate: collapse (invulnerable), teleport away, reform
    reassembleInterval: 9, // seconds between disappear-and-reform tricks
    reassembleTime: 1.4, // invulnerable + gone this long = your free breather
    teleportMargin: 7, // reappears at least this far from the nearest player

    // P4 — bonelings (count gated by HP in skeletonWaveTarget())
    spawnInterval: 2.6,
    spawnDist: 1.6, // ring radius (× boss.radius) the bonelings rise from
    bonelingScale: 0.62, // boneling size + collision shrink
    bonelingHp: 1,
  },

  // ---- the HUMAN boss — a nervous survivor 🚪 (Expansion 6 Stage 5, decision-boss).
  // You only fight him on a WRONG pre-fight read (see HUMAN_BOSS + bosses/human.js).
  // P1 = panicked pistol bursts · P2 = telegraphed panic spray ring ·
  // P3 = rally armed survivors (HP-gated, humanRallyTarget()).
  human: {
    hp: 75,
    radius: 2.4,
    speed: 4, // panicked, quick on his feet
    contactDamage: 1,
    contactCooldown: 0.8,

    // P1 — aimed pistol burst
    p1Interval: 1.4,
    p1Burst: 3,
    p1Spread: 10, // degrees across the volley
    p1BulletSpeed: 15,

    // P2 — telegraphed "panic spray": a wide AIMED cone at you (not a tidy ring —
    // distinct from the spider; dodge it by strafing sideways). emitters.nWay.
    p2Interval: 3.8,
    telegraph: 0.5, // wind-up (fair warning)
    ringBullets: 12, // bullets in the spray (scaled by floor diff in code)
    ringBulletSpeed: 8, // slow so it's dodgeable
    p2SprayDeg: 60, // cone width of the panic spray (degrees)

    // P3 — rally armed survivors (count gated by HP in humanRallyTarget())
    spawnInterval: 2.8,
    spawnDist: 1.7, // ring radius (× boss.radius) the survivors rush in from
    minionScale: 0.7, // armed survivor size + collision shrink
    minionHp: 2, // tougher than other minions (they're armed)
  },
};

// ---- the DUO controller knobs (shared by both beasts) — Stage 3 ----
export const DUO = {
  switchInterval: 4.5, // seconds one beast stays the "aggressor" before they swap
  enrageMul: 1.4, // the survivor's permanent rage (speed/rate) bump when its partner falls
  enrageScale: 1.3, // the "I'm angry now" size pop when a partner falls
  spawnX: 5, // each beast spawns this far left/right of center
  spawnZOffset: 4, // ...and this far in front of the back wall
};

// ---- the HUMAN decision-boss pre-fight choice — Expansion 6 Stage 5 ----
// A nervous survivor blocks the gate; you pick how to approach (A/B/C/D). The
// outcome is SEEDED (game.rng), so you never know which read was right — a "right"
// read (rightChance) skips the fight AND still grants the weapon slot; a "wrong"
// read means you fight him, then get the slot anyway (the normal boss-clear reward).
// Resolver: systems/humanDecision.js. The labels are flavor only — never a tell.
export const HUMAN_BOSS = {
  rightChance: 0.25, // odds a read lands right (~1-in-4); the design's config knob
  choices: ['A', 'B', 'C', 'D'], // button keys + the resolver's domain
  labels: {
    A: 'Talk to him gently',
    B: 'Slowly step closer',
    C: 'Offer him a trade',
    D: 'Raise your weapon',
  },
  setupLine:
    'A trembling survivor blocks the gate, his weapon shaking. "S-stay back! ...or ' +
    "don't. I can't tell who's a monster anymore. What do you do?\"",
  winLine: 'His shoulders drop. "You\'re... real. Okay — take this, and go." He waves you through.',
  loseLine: 'He flinches — "MONSTER!" — and opens fire. Looks like we do this the hard way.',
};

// ---- ground hazards: lingering, telegraphed damage zones (spore/poison pools) ----
// A small pool mirroring BULLET/PARTICLES. Per-pool size/timings/damage come from
// the spawner (config.BOSS.mushroom.pool*), so one system serves many sources.
export const HAZARD = {
  poolSize: 24, // max simultaneous zones
  tickInterval: 0.5, // seconds between damage ticks while you stand in a live pool
  warnColor: 0xc8ff3a, // telegraph ring (harmless)
  liveColor: 0x66c000, // active poison
};

// ---- accessibility / feel settings (persisted-store defaults — systems/settings.js) ----
// Starting values for the persisted player settings. settings.js seeds its store from
// these (and clamps a loaded `volume` to a finite 0..1), and sfx.js uses them as the
// pre-unlock fallback — so there's ONE source of truth. (ADR-0023)
export const SETTINGS = {
  volume: 0.5, // master volume, 0..1
  muted: false,
  showHitboxes: false, // the opt-in hitbox/danger overlay (toggle with H)
  reducedEffects: false, // post-FX off (raw render) — accessibility / low-end (toggle in panel)
};

// ---- graphics / post-processing (ADR-0025 — src/core/postfx.js, docs/GRAPHICS.md) ----
// The look: a dark world where the THREATS GLOW. The post-FX pass adds bloom to the
// bright emissive bits (bullets, enemies, pickups, the door) + ACES tone mapping so
// colors don't blow out. Readability first — bloom is luminance-gated, so only bright
// things bloom, never the whole screen. All swap-and-see in `npm run dev`. `enabled:false`
// (or the in-game "reduced effects" toggle) drops to the raw renderer (the old look),
// and the pipeline auto-falls-back to raw render if post-FX can't initialize (never breaks).
export const GRAPHICS = {
  enabled: true, // master switch — false = raw renderer.render()
  pixelRatioCap: 2, // max devicePixelRatio (perf/quality knob; higher = crisper but heavier)
  toneMapping: 'aces', // filmic curve: 'aces' | 'agx' | 'neutral' | 'none'
  aaSamples: 4, // WebGL2 MSAA samples for the post-FX path (0 = off)
  bloom: {
    intensity: 0.8, // glow strength
    threshold: 0.55, // only pixels brighter than this bloom (keeps the dark world dark)
    smoothing: 0.3, // soft knee around the threshold
    radius: 0.62, // glow spread (0..1)
  },
  vignette: {
    enabled: true,
    darkness: 0.5, // how dark the corners get
    offset: 0.3, // where the darkening starts (higher = smaller bright center)
  },
  vfx: {
    impactSparks: true, // a small spark burst when a bullet hits a wall (reuses the particle pool)
    sparkCount: 4,
    sparkColor: 0xffd27a, // warm spark; bloom makes it pop
  },
};

// ---- readability overlay rings (ADR-0023 — systems/overlays.js) ----
// Flat ground rings drawn over the action: an always-on boss TELEGRAPH ring (pulses
// while a boss winds up) + the opt-in HITBOX overlay. Pooled like HAZARD (meshes made
// once, repositioned each frame). The telegraph color comes from HAZARD.warnColor.
export const OVERLAY = {
  poolSize: 96, // ring meshes: players + a crowded room of enemies + a few telegraphs
  ring: { inner: 0.82, outer: 1.0, segments: 28 }, // unit ring geometry (scaled per entity)
  colors: { player: 0x6cff8a, enemy: 0xff4d4d, boss: 0xff3030 }, // green = you, red = threat
  hitboxOpacity: { player: 0.9, enemy: 0.85 },
  hitboxY: 0.06, // height above the ground for the hitbox rings
  telegraph: {
    radiusMul: 1.6, // telegraph ring size = boss.radius × this
    pulseBase: 0.3, // opacity = base + amp × (0..1 sine)
    pulseAmp: 0.28,
    pulseSpeed: 18, // rad/sec pulse cadence (wall-clock driven, so refresh-rate-stable)
    y: 0.04, // sits just under the hitbox rings
  },
};

// ---- music: recorded background tracks (Howler — ADR-0024) ----
// PLUG-AND-PLAY: drop an audio file in public/audio/ and point its track id at the
// filename below — no code change. A null/missing/undecodable file falls back to the
// procedural synth drone (sfx.js), so the game is never silent (offline/CI-safe).
// Files stream (html5) and load lazily, so big tracks don't bloat memory or stall boot.
export const MUSIC = {
  enabled: true,
  basePath: 'audio/', // under public/ (Vite base './' is prepended at runtime)
  crossfadeMs: 1500, // fade time when swapping tracks (stage <-> boss <-> menu)
  level: 0.7, // music volume relative to the master (0..1)
  duckTo: 0.4, // dip music to this fraction of `level` when the player is hit
  duckMs: 160, // fade-down time when the player is hit
  duckRecoverMul: 5, // music ramps back over duckMs × this after the dip
  duckRestoreDelayMs: 50, // wait this long after the dip before ramping back
  // track id -> filename in public/audio/  (null = use the synth fallback for now).
  // stageN = floor N exploration; boss_<key> = that boss's theme; win/gameover sting.
  // Current = CC-BY placeholders (Kevin MacLeod, credited in ASSETS.md + the in-game
  // credits panel). Boss themes share one placeholder until Scott + Caden design the real
  // ones — swap each `boss_*` to its own file then. See docs/AUDIO.md for the full plan.
  // OGG, loudness-normalized to -16 LUFS via scripts/audio-studio.mjs (consistent volume).
  tracks: {
    menu: 'menu.ogg', // Hush
    stage0: 'stage-outskirts.ogg', // The Outskirts — Darkest Child
    stage1: 'stage-barricade.ogg', // The Barricade — Anxiety
    stage2: 'stage-fungal.ogg', // The Fungal Depths — Echoes of Time
    stage3: 'stage-kennels.ogg', // The Kennels — Killers
    stage4: 'stage-catacombs.ogg', // The Catacombs — Dark Times
    boss_spider: 'boss-placeholder.ogg', // placeholder (Despair and Triumph) — swap per boss later
    boss_human: 'boss-placeholder.ogg',
    boss_mushroom: 'boss-placeholder.ogg',
    boss_duo: 'boss-placeholder.ogg',
    boss_skeleton: 'boss-placeholder.ogg',
    win: null, // synth stinger for now
    gameover: null, // synth stinger for now
  },
  // attribution — the SINGLE source of truth for in-game credits (ui/credits.js renders
  // this) AND ASSETS.md. CC-BY must be credited in-game, so update this list whenever you
  // swap a track in `tracks` above (keeps the legal credit in lockstep with the file).
  credits: [
    { slot: 'Menu', track: 'Hush', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    { slot: 'The Outskirts', track: 'Darkest Child', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    { slot: 'The Barricade', track: 'Anxiety', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    {
      slot: 'The Fungal Depths',
      track: 'Echoes of Time',
      by: 'Kevin MacLeod',
      license: 'CC BY 4.0',
    },
    { slot: 'The Kennels', track: 'Killers', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    { slot: 'The Catacombs', track: 'Dark Times', by: 'Kevin MacLeod', license: 'CC BY 4.0' },
    {
      slot: 'Boss themes (placeholder)',
      track: 'Despair and Triumph',
      by: 'Kevin MacLeod',
      license: 'CC BY 4.0',
    },
  ],
  creditsSource: 'incompetech.com', // where the current tracks come from
};

// ---- juice (the "feel good" knobs) ----
export const JUICE = {
  shakeOnShoot: 0.05,
  shakeOnHurt: 0.55,
  shakeOnKill: 0.28,
  shakeDecay: 6, // higher = shake fades faster
  hitStopOnKill: 0.06, // seconds the world freezes on a kill
  hitStopOnHurt: 0.09,
};

// ---- blood / particles ----
export const PARTICLES = {
  poolSize: 400,
  perHit: 8,
  perDeath: 22,
  lifetime: 0.6,
  speed: 9,
  gravity: 22,
  size: 0.22,
};

// ---- weapons (Doom-style). The pistol is the default. ----
// cooldown = seconds between shots; pellets = bullets per shot;
// spreadDeg = cone width for multi-pellet guns; explosive = rocket AoE.
export const WEAPONS = {
  pistol: { name: 'Pistol', cooldown: 0.26, damage: 1, pellets: 1, spreadDeg: 0, bulletSpeed: 24 },
  shotgun: {
    name: 'Shotgun',
    cooldown: 0.5,
    damage: 1,
    pellets: 6,
    spreadDeg: 40,
    bulletSpeed: 24,
  },
  machinegun: {
    name: 'Machine Gun',
    cooldown: 0.09, // was 0.07 — still the fastest hose, just less runaway (Exp7 Stage 2)
    damage: 1,
    pellets: 1,
    spreadDeg: 8,
    bulletSpeed: 30,
  },
  rocket: {
    name: 'Rocket',
    cooldown: 1.0, // was 0.8 — the big AoE nuke should be a slower, deliberate shot
    damage: 4,
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 18,
    explosive: true,
    explodeRadius: 4.5,
  },

  // --- Expansion 6 guns ---
  // New bullet flags (handled in bullets.js): pierce (pass through N enemies),
  // homing + turnRate (curve toward nearest enemy), bounces (ricochet off walls
  // N times), plus per-bullet life/scale/color overrides. charge + orbital are
  // handled player-side (player.js) because they don't fire on a fixed cooldown.
  homing: {
    name: 'Homing Missiles',
    cooldown: 0.55,
    damage: 2, // was 3 — it already homes + explodes; 2 (×damageMul) is plenty (Exp7 Stage 2)
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 18, // slow so the curve is visible/dramatic
    homing: true,
    turnRate: 5, // rad/sec — low enough that a perpendicular juke loses it
    explosive: true,
    explodeRadius: 3.2,
  },
  railgun: {
    name: 'Railgun',
    cooldown: 0.4,
    damage: 2,
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 44, // fast bolt that reads as a beam
    pierce: 6, // punches through a whole line of monsters
    life: 2.6,
    color: 0x66e0ff,
    scale: 1.3,
  },
  bouncer: {
    name: 'Bouncer',
    cooldown: 0.26,
    damage: 1,
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 26,
    bounces: 3, // ricochet off walls this many times
    life: 3.5, // live long enough for the bounces to matter
    color: 0x9b7bff,
  },
  charge: {
    name: 'Charge Cannon',
    cooldown: 0.12,
    damage: 1,
    pellets: 1,
    spreadDeg: 0,
    bulletSpeed: 24,
    // hold to charge; tap = weak fast shot, full = big slow piercing cannonball
    charge: {
      maxTime: 0.8,
      minDamage: 1,
      maxDamage: 7,
      minSpeed: 24,
      maxSpeed: 18,
      maxScale: 2.6,
      pierce: 3,
      color: 0xffd23a,
    },
  },
  orbital: {
    name: 'Orbital Blade',
    orbital: true, // player-side: blades circle you and hit on contact (no aiming)
    count: 2, // how many blades orbit
    radius: 2.6, // orbit radius
    spin: 3, // rad/sec
    damage: 1,
    hitCooldown: 0.4, // per-enemy seconds between hits from a blade
    color: 0x66ffd0,
  },
};

// ---- pickups you walk over to grab ----
export const PICKUPS = {
  radius: 0.7, // grab range
  // weighted drop table for the reward after clearing a normal room
  dropTable: [
    { type: 'HEAL', weight: 3 },
    { type: 'DAMAGE_UP', weight: 2 },
    { type: 'FIRE_RATE_UP', weight: 2 },
    { type: 'SPEED_UP', weight: 2 },
    { type: 'SHOTGUN', weight: 2 },
    { type: 'MACHINEGUN', weight: 2 },
    { type: 'ROCKET', weight: 1 },
    { type: 'HOMING', weight: 1 },
    { type: 'RAILGUN', weight: 1 },
    { type: 'BOUNCER', weight: 1 },
    { type: 'CHARGE', weight: 1 },
    { type: 'ORBITAL', weight: 1 },
  ],
  // DAMAGE_UP / FIRE_RATE_UP / SPEED_UP now add ONE stack each and the stat is
  // recomputed from the diminishing-returns curve (see UPGRADES + core/scaling.js),
  // so there are no per-pickup step sizes any more — tune the ramp in UPGRADES.
  healAmount: 2, // hearts restored by a HEAL pickup
};

// ---- models: map a key -> a file under /models/ (.glb). ----
// null  => use a built-in primitive shape (always works).
// To use a real model: drop the .glb in public/models/ and set its path,
// e.g.  chaser: 'models/demon.glb'
export const MODELS = {
  player: null,
  ally: null,
  chaser: null,
  shooter: null,
  spider: null,
  spiderling: null,
  npc: null,
  // expansion 6: animated CC0 monster models (null => procedural fallback mesh)
  mushroom: 'models/mushroom-king.glb', // Quaternius "Mushroom King" (CC0)
  sporeling: 'models/mushnub.glb', // Quaternius "Mushnub" (CC0) — mushroom minions
  dog: 'models/dog.glb', // Stage 3: animated CC0 beast — Fang + pups (warm)
  cat: 'models/cat.glb', // Stage 3: animated CC0 beast — Whisker + kittens (cool)
  skeleton: 'models/skeleton.glb', // Stage 4: animated CC0 skeleton — Rattlebones + bonelings
  human: 'models/human.glb', // Stage 5: animated CC0 human — the Survivor + rallied survivors
};
