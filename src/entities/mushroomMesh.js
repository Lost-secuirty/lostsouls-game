// =====================================================================
// mushroomMesh.js — procedural mushroom monster (the boss's fallback art and
// the floor's mini-mushroom minions). Used when no GLB model is loaded for
// 'mushroom' (the game always runs without downloaded assets — ADR-0004).
//
// Returns { group, cap } — `cap` is handed back so the boss can breathe/pulse it.
// `opts.simple` = a cheaper build for the many small minions on screen.
// =====================================================================

import * as THREE from 'three';

const DEFAULT = {
  body: 0xb83a2a, // cap
  emissive: 0xff6a4a, // cap glow
  leg: 0xe8d8a8, // stem
  legEmissive: 0x6a8a2a, // spore-green accent
  eye: 0xffe66a,
};

export function buildMushroomMesh(radius, palette = {}, opts = {}) {
  const p = { ...DEFAULT, ...palette };
  const simple = !!opts.simple;
  const group = new THREE.Group();

  // stem
  const stemH = radius * 1.1;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.42, radius * 0.55, stemH, simple ? 6 : 12),
    new THREE.MeshStandardMaterial({ color: p.leg, roughness: 0.85, flatShading: simple }),
  );
  stem.position.y = stemH / 2;
  group.add(stem);

  // cap — a dome (hemisphere)
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(
      radius,
      simple ? 8 : 18,
      simple ? 6 : 12,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2,
    ),
    new THREE.MeshStandardMaterial({
      color: p.body,
      emissive: p.emissive,
      emissiveIntensity: 0.5,
      roughness: 0.5,
      flatShading: simple,
    }),
  );
  cap.position.y = stemH;
  group.add(cap);

  // spots on the cap (skip for the cheap minion build)
  if (!simple) {
    const spotMat = new THREE.MeshStandardMaterial({
      color: 0xfff2dc,
      emissive: p.legEmissive,
      emissiveIntensity: 0.25,
    });
    const spotGeo = new THREE.SphereGeometry(radius * 0.14, 8, 8);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const spot = new THREE.Mesh(spotGeo, spotMat);
      const rr = radius * 0.6;
      spot.position.set(Math.cos(a) * rr, stemH + radius * 0.42, Math.sin(a) * rr);
      group.add(spot);
    }
  }

  // glowing eyes on the stem so facing/menace reads
  const eyeMat = new THREE.MeshBasicMaterial({ color: p.eye });
  const eyeGeo = new THREE.SphereGeometry(radius * 0.1, 6, 6);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx * radius * 0.22, stemH * 0.62, radius * 0.42);
    group.add(eye);
  }

  return { group, cap };
}
