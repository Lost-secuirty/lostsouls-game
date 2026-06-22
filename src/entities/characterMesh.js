// =====================================================================
// characterMesh.js — builds a humanoid mesh (player / ally / survivor).
//
// If a real model is loaded for `modelKey`, we use it. Otherwise we build a
// simple capsule body with a little "nose" cone so you can tell which way it
// is facing. Returns a THREE.Group you can rotate to face an aim direction.
// =====================================================================

import * as THREE from 'three';
import { getModel } from '../core/assets.js';
import { castShadows } from '../core/shadows.js';

export function makeCharacter(modelKey, { radius, height, color }) {
  const group = new THREE.Group();

  const model = getModel(modelKey);
  if (model) {
    group.add(model);
  } else {
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(radius, Math.max(0.1, height - radius * 2), 6, 12),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.1 }),
    );
    body.position.y = height / 2;
    group.add(body);

    // a white "nose" cone pointing forward (+z), so facing is readable
    const nose = new THREE.Mesh(
      new THREE.ConeGeometry(radius * 0.45, radius * 1.1, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    nose.rotation.x = Math.PI / 2; // tip points along +z
    nose.position.set(0, height * 0.55, radius * 0.95);
    group.add(nose);
  }

  castShadows(group); // player / ally / survivor cast shadows (GLB or procedural)
  return group;
}
