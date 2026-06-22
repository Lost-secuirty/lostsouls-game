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
// relative paths (resolve to /src/* under the Vite dev server from this subdir)
import { Boss } from '../../src/entities/boss.js';
import { loadModels } from '../../src/core/assets.js';
import { createPostFX } from '../../src/core/postfx.js';
import { MODELS, PROGRESSION, BOSS, LIGHTING } from '../../src/config.js';

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

// the studio's own knob board (dev-tool tuning — the game's feel lives in src/config.js;
// the base lights are reused from config.LIGHTING so portraits match the game).
const STUDIO = {
  fov: 45,
  poseTime: 0.6, // seconds into the idle/walk clip — a fixed, deterministic pose
  framing: { dir: [0.55, 0.42, 1], distMul: 1.15, lookYMul: 0.92 }, // 3/4 hero angle
  ground: { size: 80, color: 0x140f18 },
  grid: { size: 80, divisions: 40, color1: 0x3a2a44, color2: 0x2a1f33, opacity: 0.4 },
};

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
if (!TRANSPARENT) scene.background = new THREE.Color(LIGHTING.background);

// IBL: a soft studio environment so the GLB PBR materials read richer than flat lights.
// Reuses config.LIGHTING.ibl — the SAME subtle fill the game now applies in-scene
// (ADR-0026) — so portraits match the live look instead of drifting from it.
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), LIGHTING.ibl.sigma).texture;
scene.environmentIntensity = LIGHTING.ibl.intensity;

// key/fill lights — REUSE the game's lighting (config.LIGHTING) so portraits match the game
const L = LIGHTING;
scene.add(new THREE.HemisphereLight(L.hemisphere.sky, L.hemisphere.ground, L.hemisphere.intensity));
scene.add(new THREE.AmbientLight(L.ambient.color, L.ambient.intensity));
const key = new THREE.DirectionalLight(L.key.color, L.key.intensity);
key.position.set(...L.key.pos);
scene.add(key);
const fill = new THREE.DirectionalLight(L.fill.color, L.fill.intensity);
fill.position.set(...L.fill.pos);
scene.add(fill);

// ground + grid (the "ruined street" floor) — skipped in transparent cutout mode
if (!TRANSPARENT) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(STUDIO.ground.size, STUDIO.ground.size),
    new THREE.MeshStandardMaterial({ color: STUDIO.ground.color, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  const grid = new THREE.GridHelper(
    STUDIO.grid.size,
    STUDIO.grid.divisions,
    STUDIO.grid.color1,
    STUDIO.grid.color2,
  );
  grid.position.y = 0.02;
  grid.material.opacity = STUDIO.grid.opacity;
  grid.material.transparent = true;
  scene.add(grid);
}

const camera = new THREE.PerspectiveCamera(
  STUDIO.fov,
  window.innerWidth / window.innerHeight,
  0.1,
  500,
);

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
  // pull back far enough to fit the bounding sphere in the FOV, at the 3/4 hero angle
  const dist =
    (r / Math.sin((STUDIO.fov * Math.PI) / 360)) * STUDIO.framing.distMul * (sub.zoom ?? 1);
  const dir = new THREE.Vector3(...STUDIO.framing.dir).normalize();
  camera.position.copy(c).add(dir.multiplyScalar(dist));
  camera.lookAt(c.x, c.y * STUDIO.framing.lookYMul, c.z);
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
  if (current.anim?.mixer?.setTime) {
    current.anim.mixer.setTime(STUDIO.poseTime);
  } else {
    // no setTime: step in fixed ticks to the SAME poseTime (stays in sync with config)
    const step = 0.05;
    const ticks = Math.max(1, Math.round(STUDIO.poseTime / step));
    for (let i = 0; i < ticks; i++) current.anim?.update(step);
  }
  current.t = STUDIO.poseTime;
  current.behavior?.animate?.(current, 1);

  frameBoss(current, sub);
  if (labelEl) {
    // textContent (not innerHTML) so a boss type/name can never inject markup
    labelEl.textContent = current.name;
    const small = document.createElement('small');
    small.textContent = type;
    labelEl.appendChild(small);
  }
  return current.name;
};

// Preload the GLB models, then signal ready. config.MODELS paths are root-relative
// ("models/x.glb") and resolve against the server ROOT in the game; this harness lives
// in a subdir, so re-root to /models/x.glb (served from public/). A still-missing model
// falls back to the boss's procedural mesh — still a valid portrait.
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postfx?.setSize(window.innerWidth, window.innerHeight);
});

animate(); // start the render loop immediately (renders an empty scene until a boss loads)

const rootedModels = Object.fromEntries(
  Object.entries(MODELS).map(([k, v]) => [k, v ? '/' + v.replace(/^\/+/, '') : v]),
);
window.__ready = false;
try {
  await loadModels(rootedModels); // top-level await (ES module)
} catch (err) {
  // loadModels normally falls back to primitives (ADR-0004), but if the loader itself
  // throws, still signal ready so the driver proceeds (bosses use procedural meshes)
  // rather than hanging until its timeout.
  console.error('[render-studio] model preload failed; using procedural fallbacks:', err);
} finally {
  window.__ready = true;
}
