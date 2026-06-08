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
  ally: 0x6cff8a, // dad = green
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

// ---- dad (AI ally) ----
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
  enemiesPerRoom: 1.2, // extra enemies added per room deeper in the floor
  shooterFromRoom: 2, // shooters start appearing at this room-in-floor (1-based)
  obstaclesMin: 2, // rubble boxes
  obstaclesMax: 5,
  survivorRoomsInFloor: [1, 3], // which normal rooms (0-based) hold a survivor
};

// ---- progression: floors of 5 rooms + 1 boss room each ----
export const PROGRESSION = {
  roomsPerFloor: 5, // normal rooms before the boss
  // each floor: a boss type + difficulty + a color palette shared by the boss
  // AND that floor's monsters (so the monsters "reflect" their boss).
  floors: [
    {
      name: 'The Outskirts',
      boss: 'spider',
      diff: 1.0,
      palette: {
        body: 0x2a0606,
        emissive: 0x6a0d0d,
        leg: 0x1a0303,
        legEmissive: 0x400808,
        eye: 0xffe000,
      },
    },
    {
      name: 'Downtown Ruins',
      boss: 'spider',
      diff: 1.35,
      palette: {
        body: 0x14210a,
        emissive: 0x4aa00d,
        leg: 0x0a1405,
        legEmissive: 0x2a5008,
        eye: 0xc8ff3a,
      },
    },
    {
      name: 'The Hive',
      boss: 'spider',
      diff: 1.7,
      palette: {
        body: 0x1a0a2a,
        emissive: 0x6a0d8a,
        leg: 0x0a0316,
        legEmissive: 0x40085a,
        eye: 0x6ad8ff,
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
// Caden's design card: P# = an ATTACK PATTERN (not a health phase).
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
};
