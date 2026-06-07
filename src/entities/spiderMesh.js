// =====================================================================
// spiderMesh.js — builds a procedural spider (body + legs + glowing eyes).
//
// Shared by the boss (big, animated) and the themed mini-spider enemies
// (small, simplified). Lives in its own module so both can import it without
// a boss<->enemies cycle. Colors are a per-floor palette so each floor's
// spiders look distinct and the monsters match their boss.
// =====================================================================

import * as THREE from 'three';

const DEFAULT_PALETTE = {
  body: 0x2a0606,
  emissive: 0x6a0d0d,
  leg: 0x1a0303,
  legEmissive: 0x400808,
  eye: 0xffe000,
};

/**
 * @param {number} radius overall size
 * @param {object} palette {body, emissive, leg, legEmissive, eye}
 * @param {object} opts {simple} — simple = fewer legs/segments for many on screen
 * @returns {{group: THREE.Group, legs: Array}}
 */
export function buildSpiderMesh(radius, palette = {}, opts = {}) {
  const p = { ...DEFAULT_PALETTE, ...palette };
  const simple = !!opts.simple;
  const seg = simple ? 6 : 12;
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: p.body,
    emissive: p.emissive,
    emissiveIntensity: 0.5,
    roughness: 0.4,
    flatShading: true,
  });

  const bodyY = radius * 0.9;
  const abdomen = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.7, seg, seg), bodyMat);
  abdomen.position.set(0, bodyY, -radius * 0.3);
  group.add(abdomen);

  const head = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.45, seg, seg), bodyMat);
  head.position.set(0, bodyY, radius * 0.45);
  group.add(head);

  // glowing eyes (4 normally, 2 when simple)
  const eyeMat = new THREE.MeshBasicMaterial({ color: p.eye });
  const eyeRows = simple ? [0] : [0, 1];
  for (const sx of [-1, 1]) {
    for (const sy of eyeRows) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.08, 6, 6), eyeMat);
      eye.position.set(sx * radius * 0.18, bodyY + sy * radius * 0.14, radius * 0.78);
      group.add(eye);
    }
  }

  // legs: 8 (thigh + shin) full, or 6 single-segment when simple
  const legMat = new THREE.MeshStandardMaterial({
    color: p.leg,
    emissive: p.legEmissive,
    emissiveIntensity: 0.3,
    flatShading: true,
  });
  const legs = [];
  const legCount = simple ? 6 : 8;
  for (let i = 0; i < legCount; i++) {
    const side = i < legCount / 2 ? -1 : 1;
    const k = i % (legCount / 2);
    const hip = new THREE.Group();
    hip.position.set(side * radius * 0.35, bodyY, radius * (0.4 - k * 0.3));
    hip.rotation.y = side * (0.5 + k * 0.12);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.06, radius * 0.05, radius),
      legMat,
    );
    thigh.geometry.translate(0, -radius / 2, 0); // pivot at the hip
    thigh.rotation.z = side * 0.7;
    hip.add(thigh);

    if (!simple) {
      const shin = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.045, radius * 0.03, radius * 1.1),
        legMat,
      );
      shin.geometry.translate(0, -radius * 0.55, 0);
      shin.position.y = -radius;
      shin.rotation.z = side * -0.9;
      thigh.add(shin);
    }

    group.add(hip);
    legs.push({ hip, thigh, side, offset: i * 0.5 });
  }

  return { group, legs };
}
