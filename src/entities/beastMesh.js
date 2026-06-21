// =====================================================================
// beastMesh.js — procedural four-legged BEAST (the dog/cat duo's fallback art
// and the floor's pup/kitten minions). Used when no GLB is loaded for
// 'dog'/'cat' (the game always runs without downloaded assets — ADR-0004).
//
//   opts.kind = 'dog' -> warm palette, floppy ears, low tail
//   opts.kind = 'cat' -> cool palette, pointy ears, upright tail
//   opts.simple        -> a cheaper build for the many small minions
//
// Returns { group, head, tail } — head/tail are handed back so the boss can
// bob/flick them (procedural idle). +Z is "forward" (the mesh is yaw-faced).
// =====================================================================

import * as THREE from 'three';

const WARM = { body: 0xb5602a, emissive: 0x7a2e0e, leg: 0x6a3415, eye: 0xffd23a, accent: 0xe0a050 };
const COOL = { body: 0x49497a, emissive: 0x26264f, leg: 0x2c2c4e, eye: 0x66e0ff, accent: 0x8a8ad0 };

export function buildBeastMesh(radius, palette = {}, opts = {}) {
  const kind = opts.kind === 'cat' ? 'cat' : 'dog';
  const p = { ...(kind === 'cat' ? COOL : WARM), ...palette };
  const simple = !!opts.simple;
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: p.body,
    emissive: p.emissive,
    emissiveIntensity: 0.4,
    roughness: 0.6,
    flatShading: true,
  });
  const legMat = new THREE.MeshStandardMaterial({
    color: p.leg,
    roughness: 0.85,
    flatShading: true,
  });

  const standH = radius * 0.8; // leg length / belly height
  const bodyLen = radius * 1.7;
  const bodyW = radius * 0.85;
  const bodyH = radius * 0.7;

  // torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(bodyW, bodyH, bodyLen), bodyMat);
  torso.position.set(0, standH, 0);
  group.add(torso);

  // head (front = +Z)
  const headR = radius * 0.5;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(headR * 1.2, headR * 1.1, headR * 1.1),
    bodyMat,
  );
  head.position.set(0, standH + bodyH * 0.35, bodyLen * 0.5 + headR * 0.3);
  group.add(head);

  // snout
  const snout = new THREE.Mesh(
    new THREE.BoxGeometry(headR * 0.6, headR * 0.5, headR * 0.7),
    bodyMat,
  );
  snout.position.set(0, standH + bodyH * 0.2, headR * 0.55);
  head.add(snout);

  // ears — cat: pointy cones up; dog: floppy boxes out
  const earMat = new THREE.MeshStandardMaterial({
    color: p.accent,
    emissive: p.emissive,
    emissiveIntensity: 0.3,
    flatShading: true,
  });
  for (const sx of [-1, 1]) {
    let ear;
    if (kind === 'cat') {
      ear = new THREE.Mesh(new THREE.ConeGeometry(headR * 0.35, headR * 0.85, 4), earMat);
      ear.position.set(sx * headR * 0.45, headR * 0.7, 0);
    } else {
      ear = new THREE.Mesh(new THREE.BoxGeometry(headR * 0.35, headR * 0.7, headR * 0.18), earMat);
      ear.position.set(sx * headR * 0.62, headR * 0.2, 0);
      ear.rotation.z = sx * 0.5; // flop outward
    }
    head.add(ear);
  }

  // glowing eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: p.eye });
  const eyeGeo = new THREE.SphereGeometry(headR * 0.17, 6, 6);
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(sx * headR * 0.32, headR * 0.05, headR * 0.5);
    head.add(eye);
  }

  // four legs
  const legGeo = new THREE.CylinderGeometry(radius * 0.13, radius * 0.1, standH, simple ? 5 : 8);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(sx * bodyW * 0.42, standH / 2, sz * bodyLen * 0.36);
      group.add(leg);
    }
  }

  // tail — cat: upright; dog: out behind
  const tail = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.09, radius * 0.04, radius * 0.95, simple ? 5 : 6),
    legMat,
  );
  tail.geometry.translate(0, radius * 0.47, 0); // pivot at the base so flicks read
  tail.position.set(0, standH + bodyH * 0.2, -bodyLen * 0.5);
  tail.rotation.x = kind === 'cat' ? -0.5 : 1.1;
  group.add(tail);

  return { group, head, tail };
}
