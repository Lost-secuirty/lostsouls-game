// =====================================================================
// render-studio/studio.js — a portrait studio for the bosses (dev-only).
//
// Loads each boss's REAL in-game mesh (GLB when present, procedural fallback
// otherwise) via the actual Boss shell, lights it with IBL + key/fill, renders
// it through the SAME post-FX pipeline as the game (bloom + ACES — ADR-0025) so
// the portraits MATCH the live look, frames a deterministic 3/4 hero shot, and
// exposes window.showBoss(type) so scripts/render-studio.mjs can step the roster.
// Not shipped in the game build.
//
// Salvaged + upgraded from the boss-shots harness (PR #35). Upgrades: post-FX
// reuse, IBL (RoomEnvironment), a deterministic frozen pose (mixer.setTime), a
// per-subject framing table, and a transparent-cutout mode (?bg=transparent).
// =====================================================================

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Boss } from '/src/entities/boss.js';
import { loadModels } from '/src/core/assets.js';
import { createPostFX } from '/src/core/postfx.js';
import { MODELS, PROGRESSION, BOSS } from '/src/config.js';

// transparent cutout mode (?bg=transparent): render raw (no post-FX/ground) so the
// PNG alpha is preserved for compositing elsewhere. Default = the full game look.
const TRANSPARENT = new URLSearchParams(location.search).get('bg') === 'transparent';
if (TRANSPARENT) {
  // the page itself sets an opaque bg in CSS; clear it so Playwright's omitBackground works
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
}

// Per-subject framing table (replaces the old hardcoded FACING). Quaternius GLBs
// don't share a forward axis, so `facing` (radians) turns each model's front toward
// the 3/4 camera; tune by eye if a model shows its back. `zoom` nudges the framing.
const SUBJECTS = {
  spider: { facing: 0 },
  mushroom: { facing: 0 },
  dog: { facing: 0 },
  cat: { facing: 0 },
  skeleton: { facing: Math.PI },
  human: { facing: 0 },
};
const POSE_TIME = 0.6; // seconds into the idle/walk clip — a fixed, deterministic pose

// Each boss's canonical per-floor palette (so the procedural fallback colors match
// what the floor actually fights).
const paletteFor = {};
for (const f of PROGRESSION.floors) {
  if (f.boss === 'duo' && f.duo) for (const b of f.duo) paletteFor[b] = f.palette;
  else if (f.boss) paletteFor[f.boss] = f.palette;
}

const labelEl = document.getElementById('label');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  alpha: TRANSPARENT,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 3)); // a little SSAA headroom
renderer.setSize(window.innerWidth, window.innerHeight);
if (TRANSPARENT) renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
if (!TRANSPARENT) scene.background = new THREE.Color(0x0a0810);

// IBL: a soft studio environment so the GLB PBR materials read richer than flat lights.
// Kept to a SUBTLE fill (the game has no IBL) so it adds depth without over-brightening
// pale/untextured models into a bloom-blown white blob — keeps portraits close to the game.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

// key/fill lights (from core/scene.js, nudged for a clean portrait)
scene.add(new THREE.HemisphereLight(0x8a6b8a, 0x241826, 1.0));
scene.add(new THREE.AmbientLight(0x66556a, 0.6));
const key = new THREE.DirectionalLight(0xffb088, 1.4);
key.position.set(10, 30, 12);
scene.add(key);
const fill = new THREE.DirectionalLight(0x6688ff, 0.6);
fill.position.set(-15, 20, -10);
scene.add(fill);

// ground + grid (the "ruined street" floor) — skipped in transparent cutout mode
if (!TRANSPARENT) {
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
}

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);

// post-FX: the SAME pipeline as the game (bloom + ACES) so portraits match the live
// look. In transparent cutout mode we render raw so the alpha survives.
const postfx = TRANSPARENT ? null : createPostFX({ renderer, scene, camera });

let current = null;

// Union per-mesh geometry boxes in world space. Box3.setFromObject is unreliable on
// skinned GLB meshes (reads bind-pose extents and frames empty space) — same trap
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

function frameBoss(boss, sub) {
  const box = boundsOf(boss.mesh) || new THREE.Box3().setFromObject(boss.mesh);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const c = sphere.center;
  const r = Math.max(sphere.radius, 1);
  // pull back far enough to fit the bounding sphere in the 45° FOV, 3/4 angle
  const dist = (r / Math.sin((45 * Math.PI) / 360)) * 1.15 * (sub.zoom ?? 1);
  const dir = new THREE.Vector3(0.55, 0.42, 1).normalize();
  camera.position.copy(c).add(dir.multiplyScalar(dist));
  camera.lookAt(c.x, c.y * 0.92, c.z);
}

function renderFrame() {
  if (postfx) postfx.render();
  else renderer.render(scene, camera);
}

// The studio holds a FROZEN deterministic pose (set in showBoss); the loop only
// re-renders (e.g. after a resize), it does not advance the animation.
function animate() {
  requestAnimationFrame(animate);
  renderFrame();
}

window.__bossTypes = Object.keys(BOSS).filter((k) => paletteFor[k] || BOSS[k]);

window.showBoss = (type) => {
  if (current) {
    scene.remove(current.mesh);
    current.anim?.dispose?.();
    current = null;
  }
  const sub = SUBJECTS[type] || {};
  current = new Boss(scene, 0, 0, type, 1, paletteFor[type] || null);
  current.mesh.rotation.y = sub.facing ?? 0;

  // Deterministic pose: jump the GLB mixer to a fixed time (frozen, not wall-clock
  // driven), and step the procedural behavior to the same fixed t. Same pose every run.
  if (current.anim?.mixer?.setTime) current.anim.mixer.setTime(POSE_TIME);
  else for (let i = 0; i < 12; i++) current.anim?.update(0.05);
  current.t = POSE_TIME;
  current.behavior?.animate?.(current, 1);

  frameBoss(current, sub);
  if (labelEl) labelEl.innerHTML = `${current.name}<small>${type}</small>`;
  return current.name;
};

// Preload the GLB models, then signal ready. config.MODELS paths are root-relative
// ("models/x.glb") and resolve against the server ROOT in the game; this harness lives
// in a subdir, so re-root to /models/x.glb (served from public/). A still-missing model
// falls back to the boss's procedural mesh — still a valid portrait.
const rootedModels = Object.fromEntries(
  Object.entries(MODELS).map(([k, v]) => [k, v ? '/' + v.replace(/^\/+/, '') : v]),
);
window.__ready = false;
loadModels(rootedModels).then(() => {
  window.__ready = true;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx?.setSize(window.innerWidth, window.innerHeight);
});

animate();
