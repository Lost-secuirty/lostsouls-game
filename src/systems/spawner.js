// =====================================================================
// spawner.js — decides what's in each room: how many monsters, which kind,
// and where the survivors stand. Gets harder the deeper you go.
// =====================================================================

import { ARENA, ROOMS, ENEMY, NPC } from '../config.js';
import { Enemy } from '../entities/enemies.js';
import { Npc } from '../entities/npc.js';
import { circleVsBox } from '../core/math2d.js';

const SURVIVOR_NAMES = ['a kid', 'an old man', 'a soldier', 'a nurse', 'a stranger', 'a shopkeeper'];

/** find a spot in the upper part of the arena that isn't inside a wall */
function findSpot(rng, walls, radius) {
  const hw = ARENA.width / 2 - 2;
  const hd = ARENA.depth / 2;
  for (let tries = 0; tries < 30; tries++) {
    const x = rng.range(-hw, hw);
    const z = rng.range(-hd + 3, 2); // upper / middle, away from player spawn
    if (!walls.some((b) => circleVsBox(x, z, radius + 0.5, b))) return { x, z };
  }
  return { x: 0, z: -hd + 4 };
}

/** Populate the room: spawns enemies + (sometimes) two survivors. */
export function populateRoom(game, roomIndex) {
  const { rng } = game;
  const roomNo = roomIndex + 1;

  const count = Math.round(ROOMS.baseEnemies + roomIndex * ROOMS.enemiesPerRoom);
  for (let i = 0; i < count; i++) {
    const useShooter = roomNo >= ROOMS.shooterFromRoom && rng.chance(0.4);
    const type = useShooter ? 'shooter' : 'chaser';
    const spot = findSpot(rng, game.walls, ENEMY[type].radius);
    game.addEnemy(new Enemy(game.scene, type, spot.x, spot.z));
  }

  if (ROOMS.npcRooms.includes(roomNo)) {
    for (let i = 0; i < NPC.perRoom; i++) {
      const spot = findSpot(rng, game.walls, 1);
      const name = rng.pick(SURVIVOR_NAMES);
      game.npcs.push(new Npc(game.scene, spot.x, spot.z, name));
    }
  }
}
