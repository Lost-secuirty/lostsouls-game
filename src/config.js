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
  interactRadius: 2.6, // how close before "press E" shows
  perRoom: 2, // exactly two survivors per room (when room has them)
};

// ---- rooms / run structure ----
export const ROOMS = {
  total: 6, // rooms in a run
  baseEnemies: 3, // enemies in room 1
  enemiesPerRoom: 1.5, // extra enemies added per room deeper
  shooterFromRoom: 2, // shooters start appearing at this room number
  obstaclesMin: 2, // rubble boxes
  obstaclesMax: 5,
  npcRooms: [2, 4], // which rooms contain survivors to meet
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

// ---- models: map a key -> a file under /models/ (.glb). ----
// null  => use a built-in primitive shape (always works).
// To use a real model: drop the .glb in public/models/ and set its path,
// e.g.  chaser: 'models/demon.glb'
export const MODELS = {
  player: null,
  ally: null,
  chaser: null,
  shooter: null,
  npc: null,
};
