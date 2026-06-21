// =====================================================================
// progression.js — pure helpers for "where am I in the run?" (no imports
// except config). Each floor = N normal rooms + 1 boss room. Rooms are
// numbered globally from 0.
//
//   floor 0: rooms 0,1,2,3,4 (normal) + 5 (BOSS)
//   floor 1: rooms 6,7,8,9,10 + 11 (BOSS)
//   ...
// =====================================================================

import { PROGRESSION, CAPS, DIFFICULTY } from '../config.js';
import { floorScale } from './scaling.js';

/**
 * How many weapon slots are unlocked after beating `bossesBeaten` bosses. PURE.
 * Starts at 1, +1 at each threshold in CAPS.slotUnlockBosses, capped at
 * CAPS.maxWeaponSlots. (the project owner's cadence: unlock at boss 2, 10, 20; max 3.)
 */
export function weaponSlotsForBosses(bossesBeaten) {
  const unlocked = CAPS.slotUnlockBosses.filter((n) => bossesBeaten >= n).length;
  return Math.min(CAPS.maxWeaponSlots, 1 + unlocked);
}

/** rooms per floor including the boss room */
export function roomsPerFloor() {
  return PROGRESSION.roomsPerFloor + 1;
}

export function floorCount() {
  return PROGRESSION.floors.length;
}

/** total rooms across every floor */
export function totalRooms() {
  return roomsPerFloor() * floorCount();
}

/** the floor definition for a floor index (clamped to the last floor) */
export function floorDef(floorIndex) {
  const f = PROGRESSION.floors;
  return f[Math.min(floorIndex, f.length - 1)];
}

/**
 * Describe a global room index.
 * @param {number} roomIndex 0-based global room number
 * @returns {{floorIndex:number, roomInFloor:number, isBossRoom:boolean, isLastRoom:boolean, diff:number, def:object}}
 */
export function floorInfo(roomIndex) {
  const per = roomsPerFloor();
  const floorIndex = Math.floor(roomIndex / per);
  const roomInFloor = roomIndex % per;
  const isBossRoom = roomInFloor === PROGRESSION.roomsPerFloor;
  const isLastFloor = floorIndex >= floorCount() - 1;
  const isLastRoom = isLastFloor && isBossRoom;
  const def = floorDef(floorIndex);
  // difficulty is the DIFFICULTY curve (one knob for the whole run), times an
  // optional per-floor `diffMul` spike. Drives boss HP / ring density / enemy count.
  const diff = floorScale(floorIndex, DIFFICULTY) * (def.diffMul ?? 1);
  return { floorIndex, roomInFloor, isBossRoom, isLastRoom, diff, def };
}

/** true if the room AFTER this one is a boss room (for the "BOSS AHEAD" warning) */
export function nextIsBoss(roomIndex) {
  return floorInfo(roomIndex + 1).isBossRoom && !floorInfo(roomIndex).isBossRoom;
}

/**
 * Spider boss P3: how many baby spiders to keep alive, gated by the boss's HP.
 * PURE. From the co-designer's card: none above 50% HP, keep 2–3 under 50%, keep 3 under 25%.
 * `min` = spawn more when fewer than this are alive; `max` = top up to this (hard cap).
 * @param {number} hpFrac boss hp / maxHp (0..1)
 * @returns {{min:number, max:number}}
 */
export function spiderlingTarget(hpFrac) {
  if (hpFrac > 0.5) return { min: 0, max: 0 };
  if (hpFrac > 0.25) return { min: 2, max: 3 };
  return { min: 3, max: 3 };
}

/**
 * Mushroom boss P4: how many puffball minions to keep alive, gated by HP. PURE.
 * Same shape/cadence as spiderlingTarget (none >50%, 2–3 under 50%, 3 under 25%).
 * @param {number} hpFrac boss hp / maxHp (0..1)
 * @returns {{min:number, max:number}}
 */
export function puffballTarget(hpFrac) {
  if (hpFrac > 0.5) return { min: 0, max: 0 };
  if (hpFrac > 0.25) return { min: 2, max: 3 };
  return { min: 3, max: 3 };
}

/**
 * Skeleton boss P4: how many bonelings to keep alive, gated by HP. PURE.
 * The skeleton is the "summoner", so it raises a bigger wave than the spider/
 * mushroom as it weakens: none above 50%, 2–3 under 50%, up to 4 under 25%.
 * @param {number} hpFrac boss hp / maxHp (0..1)
 * @returns {{min:number, max:number}}
 */
export function skeletonWaveTarget(hpFrac) {
  if (hpFrac > 0.5) return { min: 0, max: 0 };
  if (hpFrac > 0.25) return { min: 2, max: 3 };
  return { min: 3, max: 4 };
}

/**
 * Human boss P3: how many armed survivors he rallies, gated by HP. PURE.
 * Fewer than the other waves because they're tougher (minionHp 2): none above
 * 50% HP, 1–2 under 50%, 2–3 under 25%.
 * @param {number} hpFrac boss hp / maxHp (0..1)
 * @returns {{min:number, max:number}}
 */
export function humanRallyTarget(hpFrac) {
  if (hpFrac > 0.5) return { min: 0, max: 0 };
  if (hpFrac > 0.25) return { min: 1, max: 2 };
  return { min: 2, max: 3 };
}

/**
 * Decide what happens when the player dies. PURE.
 * Lose a life; if any remain, respawn at the checkpoint room; otherwise it's
 * game over (which the caller turns into a full restart).
 * @param {number} lives lives BEFORE this death
 * @param {number} checkpointRoom room index to respawn at
 * @returns {{lives:number, action:'RESPAWN'|'GAMEOVER', room:number}}
 */
export function resolveDeath(lives, checkpointRoom) {
  const remaining = lives - 1;
  if (remaining <= 0) return { lives: 0, action: 'GAMEOVER', room: 0 };
  return { lives: remaining, action: 'RESPAWN', room: checkpointRoom };
}
