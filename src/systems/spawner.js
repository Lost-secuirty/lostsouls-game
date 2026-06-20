// =====================================================================
// spawner.js — decides what's in each room: the boss in boss rooms, otherwise
// monsters (more/tougher deeper into a floor) and the occasional survivor.
// =====================================================================

import { ARENA, ROOMS, ENEMY, NPC } from '../config.js';
import { floorInfo } from '../core/progression.js';
import { Enemy } from '../entities/enemies.js';
import { Boss } from '../entities/boss.js';
import { Npc } from '../entities/npc.js';
import { circleVsBox } from '../core/math2d.js';

const SURVIVOR_NAMES = [
  'a player',
  'an old man',
  'a soldier',
  'a nurse',
  'a stranger',
  'a shopkeeper',
];

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

/** Populate the room: a boss in boss rooms, else monsters + maybe a survivor. */
export function populateRoom(game, roomIndex) {
  const { rng } = game;
  const info = floorInfo(roomIndex);

  // monsters reflect the floor's boss (theme + matching colors)
  const theme = { boss: info.def.boss, palette: info.def.palette };

  // ---- BOSS ROOM ----
  if (info.isBossRoom) {
    game.addEnemy(
      new Boss(game.scene, 0, -ARENA.depth / 2 + 4, info.def.boss, info.def.diff, info.def.palette),
    );
    return;
  }

  // ---- NORMAL ROOM ----
  const diff = info.def.diff;
  const count = Math.round((ROOMS.baseEnemies + info.roomInFloor * ROOMS.enemiesPerRoom) * diff);
  const roomNo = info.roomInFloor + 1; // 1-based within the floor
  for (let i = 0; i < count; i++) {
    const useShooter = roomNo >= ROOMS.shooterFromRoom && rng.chance(0.4);
    const type = useShooter ? 'shooter' : 'chaser';
    const spot = findSpot(rng, game.walls, ENEMY[type].radius);
    game.addEnemy(new Enemy(game.scene, type, spot.x, spot.z, theme));
  }

  // survivors appear in a couple of normal rooms per floor
  if (ROOMS.survivorRoomsInFloor.includes(info.roomInFloor)) {
    for (let i = 0; i < NPC.perRoom; i++) {
      const spot = findSpot(rng, game.walls, 1);
      const name = rng.pick(SURVIVOR_NAMES);
      game.npcs.push(new Npc(game.scene, spot.x, spot.z, name));
    }
  }
}
