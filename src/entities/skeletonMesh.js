// =====================================================================
// skeletonMesh.js — procedural humanoid skeleton (the boss's fallback art and
// the catacomb boneling/archer minions). Used when no GLB is loaded for
// 'skeleton' (the game always runs without downloaded assets — ADR-0004).
//
// Returns { group, skull } — `skull` is handed back so the boss can sway it
// (procedural idle). `opts.simple` = a cheaper build for the many small minions.
// Proportion ratios stay inline here (construction detail, like spiderMesh.js /
// mushroomMesh.js); gameplay tunables live in config.BOSS.skeleton.
// =====================================================================

import * as THREE from 'three';

const DEFAULT = {
  body: 0xe8e2d0, // bone white
  emissive: 0x8a8a6a, // dim bone glow
  leg: 0xb8b09a, // grey bone
  legEmissive: 0x4a6a3a, // graveyard-green accent
  eye: 0x9bff6a, // green eye-socket glow
};

export function buildSkeletonMesh(radius, palette = {}, opts = {}) {
  const p = { ...DEFAULT, ...palette };
  const simple = !!opts.simple;
  const seg = simple ? 6 : 10;
  const group = new THREE.Group();

  const boneMat = new THREE.MeshStandardMaterial({
    color: p.body,
    emissive: p.emissive,
    emissiveIntensity: 0.25,
    roughness: 0.8,
    flatShading: true,
  });
  const limbMat = new THREE.MeshStandardMaterial({
    color: p.leg,
    roughness: 0.85,
    flatShading: true,
  });

  const legH = radius * 1.0;
  const torsoH = radius * 0.95;
  const torsoW = radius * 0.85;
  const torsoY = legH + radius * 0.3 + torsoH / 2;

  // legs
  const legGeo = new THREE.CylinderGeometry(radius * 0.12, radius * 0.1, legH, seg);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(legGeo, limbMat);
    leg.position.set(sx * radius * 0.22, legH / 2, 0);
    group.add(leg);
  }

  // pelvis + ribcage
  const pelvis = new THREE.Mesh(
    new THREE.BoxGeometry(torsoW * 0.8, radius * 0.3, radius * 0.4),
    boneMat,
  );
  pelvis.position.y = legH + radius * 0.12;
  group.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(torsoW, torsoH, radius * 0.5), boneMat);
  torso.position.y = torsoY;
  group.add(torso);

  // rib lines (skip for the cheap minion build)
  if (!simple) {
    for (let i = 0; i < 3; i++) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(torsoW * 1.02, radius * 0.06, radius * 0.54),
        limbMat,
      );
      rib.position.y = legH + radius * 0.45 + i * radius * 0.26;
      group.add(rib);
    }
  }

  // arms hanging at the sides
  const armGeo = new THREE.CylinderGeometry(radius * 0.09, radius * 0.07, torsoH * 1.05, seg);
  for (const sx of [-1, 1]) {
    const arm = new THREE.Mesh(armGeo, limbMat);
    arm.position.set(sx * (torsoW / 2 + radius * 0.12), torsoY, 0);
    arm.rotation.z = sx * 0.12;
    group.add(arm);
  }

  // skull + jaw
  const skullY = legH + radius * 0.3 + torsoH + radius * 0.45;
  const skull = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.45, seg, seg), boneMat);
  skull.position.y = skullY;
  group.add(skull);
  const jaw = new THREE.Mesh(
    new THREE.BoxGeometry(radius * 0.5, radius * 0.18, radius * 0.4),
    boneMat,
  );
  jaw.position.set(0, skullY - radius * 0.38, radius * 0.08);
  group.add(jaw);

  // glowing eye sockets (facing +Z)
  const eyeMat = new THREE.MeshBasicMaterial({ color: p.eye });
  const eyeGeo = new THREE.SphereGeometry(radius * 0.1, 6, 6);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx * radius * 0.18, skullY + radius * 0.05, radius * 0.34);
    group.add(eye);
  }

  return { group, skull };
}
