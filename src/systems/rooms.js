// =====================================================================
// rooms.js — builds one arena "room" of the ruined city: four outer walls
// with a door gap at the top, plus some rubble boxes to dodge around.
//
// Returns collision boxes (AABBs) + the Three.js meshes, and a `door` trigger
// that lights up once the room is cleared. dispose() removes it all.
// =====================================================================

import * as THREE from 'three';
import { ARENA, PALETTE, ROOMS } from '../config.js';

function boxMesh(box, height, color) {
  const w = box.maxX - box.minX;
  const d = box.maxZ - box.minZ;
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, height, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true }),
  );
  mesh.position.set((box.minX + box.maxX) / 2, height / 2, (box.minZ + box.maxZ) / 2);
  return mesh;
}

export function buildRoom(scene, rng, roomIndex) {
  const group = new THREE.Group();
  scene.add(group);

  const hw = ARENA.width / 2;
  const hd = ARENA.depth / 2;
  const t = ARENA.wall;
  const dh = ARENA.doorWidth / 2;

  const walls = [];
  const wallH = 3;

  const add = (box) => {
    walls.push(box);
    group.add(boxMesh(box, wallH, PALETTE.wall));
  };

  // left / right / bottom walls
  add({ minX: -hw - t, maxX: -hw, minZ: -hd - t, maxZ: hd + t });
  add({ minX: hw, maxX: hw + t, minZ: -hd - t, maxZ: hd + t });
  add({ minX: -hw, maxX: hw, minZ: hd, maxZ: hd + t });
  // top wall, split to leave a door gap in the middle
  add({ minX: -hw, maxX: -dh, minZ: -hd - t, maxZ: -hd });
  add({ minX: dh, maxX: hw, minZ: -hd - t, maxZ: -hd });

  // rubble obstacles (also block bullets + movement)
  const n = Math.round(rng.range(ROOMS.obstaclesMin, ROOMS.obstaclesMax + 1));
  for (let i = 0; i < n; i++) {
    const w = rng.range(2, 5);
    const d = rng.range(2, 5);
    // keep clear of the player spawn (bottom center) and the door (top center)
    const cx = rng.range(-hw + 4, hw - 4);
    const cz = rng.range(-hd + 5, hd - 7);
    if (Math.abs(cx) < dh + 2 && cz < -hd + 7) continue; // near door
    const box = { minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 };
    walls.push(box);
    group.add(boxMesh(box, rng.range(1.2, 2.4), PALETTE.wallTop));
  }

  // door trigger zone (in the gap), + a glowing marker (hidden until cleared)
  const door = {
    box: { minX: -dh, maxX: dh, minZ: -hd - t, maxZ: -hd + 1.2 },
    active: false,
  };
  const doorGlow = new THREE.Mesh(
    new THREE.BoxGeometry(ARENA.doorWidth, 0.2, 1.2),
    new THREE.MeshBasicMaterial({ color: PALETTE.door, transparent: true, opacity: 0.9 }),
  );
  doorGlow.position.set(0, 0.15, -hd + 0.2);
  doorGlow.visible = false;
  group.add(doorGlow);

  const lastRoom = roomIndex >= ROOMS.total - 1;

  return {
    walls,
    door,
    lastRoom,
    openDoor() {
      door.active = true;
      doorGlow.visible = true;
    },
    dispose() {
      scene.remove(group);
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
    },
  };
}
