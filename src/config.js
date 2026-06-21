// =====================================================================
// config.js — EVERY tunable number in the game lives here.
//
// This is the fun file to mess with: change a value, save, and (in
// `npm run dev`) watch the game change instantly. Want to run faster?
// Shoot faster? More blood? More screen shake? It's all here.
// =====================================================================

// ---- the playfield (a flat arena on the XZ plane; y is "up") ----
export const ARENA = {
  width: 40, // left-right size (X)
  depth: 30, // near-far size (Z)
  wall: 1.5, // wall thickness
  doorWidth: 5, // gap in the top wall to the next room
};

// ---- camera: tilted top-down, "Binding of Isaac" angle ----
export const CAMERA = {
  fov: 55,
  height: 30, // how high above the arena
  back: 18, // how far back (toward the player/camera)
  lookAtY: 0,
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

// ---- player (you) ----
export const PLAYER = {
  radius: 0.7,
  height: 1.8,
  speed: 11, // units/sec
  maxHearts: 6, // 6 = 3 full hearts (2 halves each)... we use whole hearts here
  fireCooldown: 0.16, // seconds between shots (lower = faster)
  invuln: 0.8, // i-frames after a hit (seconds)
};

// ---- ally (AI ally) ----
export const ALLY = {
  radius: 0.7,
  height: 1.8,
  speed: 9,
  followDist: 4.5, // tries to stay this close to you
  fireCooldown: 0.45,
  range: 16, // will shoot enemies within this distance
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
    radius: 0.85,
    speed: 6,
    contactDamage: 1,
    contactCooldown: 0.7, // how often it can hurt you by touching
  },
  shooter: {
    hp: 4,
    radius: 0.95,
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
      name: 'The Outskirts',
      boss: 'spider',
      diff: 1,
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
      diff: 1.3,
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
      diff: 1.6,
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
      diff: 1.9,
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
      diff: 2.15,
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

// ---- lives + checkpoints ----
// ---- lives + global stat caps (so upgrades can't run away) ----
export const CAPS = {
  lives: { start: 3, max: 5 }, // start with 3, can grow to 5
  damageMul: 1.5, // max +50% damage (reached in ~3 stacks)
  fireRateMin: 0.5, // cooldown floor = max +50% faster
  speedMul: 1.5, // max +50% move speed
  maxWeaponSlots: 3, // carry up to 3 weapons
  slotUnlockBosses: [2, 10, 20], // a slot unlocks after these boss counts
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

    // P2 — telegraphed "panic spray" ring
    p2Interval: 3.8,
    telegraph: 0.5, // wind-up (fair warning)
    ringBullets: 12, // base count (scaled by floor diff in code)
    ringBulletSpeed: 8, // slow so the ring is dodgeable

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
    cooldown: 0.07,
    damage: 1,
    pellets: 1,
    spreadDeg: 8,
    bulletSpeed: 30,
  },
  rocket: {
    name: 'Rocket',
    cooldown: 0.8,
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
    damage: 3,
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
  // step sizes tuned so ~3 stacks reach the caps in CAPS
  speedUpAmount: 1.8, // units/sec added by SPEED_UP (clamped to CAPS.speedMul)
  damageUpAmount: 0.2, // +20% damage per pickup (damageMul, clamped to CAPS.damageMul)
  fireRateMul: 0.82, // multiplies cooldown (lower = faster; clamped to CAPS.fireRateMin)
  healAmount: 2,
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
