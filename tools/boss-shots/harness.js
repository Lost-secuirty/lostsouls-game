// =====================================================================
// boss-shots/harness.js — a tiny portrait studio for the bosses.
//
// Loads the real boss meshes (GLB models when present, procedural fallback
// otherwise) via the actual Boss shell, frames each one in a 3/4 hero shot,
// and exposes window.showBoss(type) so a Playwright script can step through
// the roster and screenshot each. Not shipped in the game build — a dev tool.
// =====================================================================

import * as THREE from 'three';
import { Boss } from '/src/entities/boss.js';
import { loadModels } from '/src/core/assets.js';
import { MODELS, PROGRESSION, BOSS } from '/src/config.js';

// Pull each boss's canonical per-floor palette out of PROGRESSION so the
// procedural-fallback colors match what the floor actually fights.
const paletteFor = {};
for (const f of PROGRESSION.floors) {
  if (f.boss === 'duo' && f.duo) for (const b of f.duo) paletteFor[b] = f.palette;
  else if (f.boss) paletteFor[f.boss] = f.palette;
}

const labelEl = document.getElementById('label');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0810);

// Lighting lifted from core/scene.js, nudged brighter for a clean portrait.
scene.add(new THREE.HemisphereLight(0x8a6b8a, 0x241826, 1.1));
scene.add(new THREE.AmbientLight(0x66556a, 0.7));
const key = new THREE.DirectionalLight(0xffb088, 1.5);
key.position.set(10, 30, 12);
scene.add(key);
const fill = new THREE.DirectionalLight(0x6688ff, 0.7);
fill.position.set(-15, 20, -10);
scene.add(fill);

// Ground + grid so the boss has a floor to stand on (the "ruined street" look).
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x140f18, roughness: 1 }),
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);
const grid = new THREE.GridHelper(80, 40, 0x3a2a44, 0x2a1f33);
grid.position.y = 0.02;
grid.material.opacity = 0.4;
grid.material.transparent = true;
scene.add(grid);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);

// Per-boss yaw (radians) to turn each model's front toward the 3/4 camera.
// Tuned by eye — Quaternius GLBs don't share a forward axis.
const FACING = {
  spider: 0,
  mushroom: 0,
  dog: 0,
  cat: 0,
  skeleton: Math.PI,
  human: 0,
};

let current = null;
const clock = new THREE.Clock();

// Union per-mesh geometry boxes in world space. Box3.setFromObject is unreliable
// on skinned GLB meshes (bind-pose extents) and frames empty space — same trap
// AnimModel.fitTo documents, so we mirror its approach here.
function boundsOf(obj) {
  obj.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  const tmp = new THREE.Box3();
  let any = false;
  obj.traverse((o) => {
    if ((o.isMesh || o.isSkinnedMesh) && o.geometry) {
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
      box.union(tmp);
      any = true;
    }
  });
  return any ? box : null;
}

function frameBoss(boss) {
  const box = boundsOf(boss.mesh) || new THREE.Box3().setFromObject(boss.mesh);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const c = sphere.center;
  const r = Math.max(sphere.radius, 1);
  // pull back far enough to fit the bounding sphere in the 45° FOV, 3/4 angle
  const dist = (r / Math.sin((45 * Math.PI) / 360)) * 1.15;
  const dir = new THREE.Vector3(0.55, 0.42, 1).normalize();
  camera.position.copy(c).add(dir.multiplyScalar(dist));
  camera.lookAt(c.x, c.y * 0.92, c.z);
}

// Step the procedural + GLB animation so the shot isn't a frozen T-pose.
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (current) {
    current.t += dt;
    current.behavior.animate?.(current, 1);
    current.anim?.update(dt);
  }
  renderer.render(scene, camera);
}

window.__bossTypes = Object.keys(BOSS).filter((k) => paletteFor[k] || BOSS[k]);

window.showBoss = (type) => {
  if (current) {
    current.scene.remove(current.mesh);
    current.anim?.dispose?.();
    current = null;
  }
  current = new Boss(scene, 0, 0, type, 1, paletteFor[type] || null);
  // Per-boss yaw so each faces the camera (models have inconsistent forward axes).
  current.mesh.rotation.y = FACING[type] ?? 0;
  // settle the GLB clip a touch into its idle/walk so the pose reads
  for (let i = 0; i < 12; i++) current.anim?.update(0.05);
  frameBoss(current);
  labelEl.innerHTML = `${current.name}<small>${type}</small>`;
  return current.name;
};

// Preload the GLB models, then signal ready. MODELS paths are relative
// ("models/x.glb") and resolve against the server ROOT in the real game; this
// harness lives in a subdir, so root them to /models/x.glb (served from
// public/). If a model is still missing the boss falls back to its procedural
// mesh — still a valid portrait.
const rootedModels = Object.fromEntries(
  Object.entries(MODELS).map(([k, v]) => [k, v ? '/' + v.replace(/^\/+/, '') : v]),
);
window.__ready = false;
loadModels(rootedModels).then(() => {
  window.__ready = true;
});

animate();
