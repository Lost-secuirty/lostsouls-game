// =====================================================================
// scene.js — sets up Three.js: the renderer, scene, lights, ground, and the
// tilted top-down camera (the "Binding of Isaac" angle).
// =====================================================================

import * as THREE from 'three';
import { ARENA, CAMERA, PALETTE, LIGHTING, GRAPHICS } from '../config.js';
import { createPostFX } from './postfx.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GRAPHICS.pixelRatioCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(LIGHTING.background);
  // Fog sized to the camera distance + arena span so the far wall stays readable as
  // the arena grows (it scales with config CAMERA/ARENA instead of fixed 45–90).
  const camDist = Math.hypot(CAMERA.back, CAMERA.height);
  const arenaSpan = Math.max(ARENA.width, ARENA.depth);
  scene.fog = new THREE.Fog(LIGHTING.fog.color, camDist, camDist + arenaSpan * LIGHTING.fog.farMul);

  // ---- camera: high up and tilted back, looking at the arena center ----
  const camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    window.innerWidth / window.innerHeight,
    CAMERA.near,
    CAMERA.far,
  );
  const baseCam = { x: 0, y: CAMERA.height, z: CAMERA.back };
  camera.position.set(baseCam.x, baseCam.y, baseCam.z);
  camera.lookAt(0, CAMERA.lookAtY, 0);

  // ---- lights: moody, but bright enough to read the action (config.LIGHTING) ----
  const L = LIGHTING;
  scene.add(
    new THREE.HemisphereLight(L.hemisphere.sky, L.hemisphere.ground, L.hemisphere.intensity),
  );
  scene.add(new THREE.AmbientLight(L.ambient.color, L.ambient.intensity));
  const key = new THREE.DirectionalLight(L.key.color, L.key.intensity);
  key.position.set(...L.key.pos);
  scene.add(key);
  const fill = new THREE.DirectionalLight(L.fill.color, L.fill.intensity);
  fill.position.set(...L.fill.pos);
  scene.add(fill);

  // ---- ground: dark plane + a grid for the "ruined street" feel ----
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA.width + 20, ARENA.depth + 20),
    new THREE.MeshStandardMaterial({ color: PALETTE.ground, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const grid = new THREE.GridHelper(
    Math.max(ARENA.width, ARENA.depth) + 20,
    Math.round((Math.max(ARENA.width, ARENA.depth) + 20) / 2),
    PALETTE.groundGrid,
    PALETTE.groundGrid,
  );
  grid.position.y = 0.02;
  grid.material.opacity = 0.35;
  grid.material.transparent = true;
  scene.add(grid);

  // post-processing pipeline (bloom + ACES tone mapping + vignette; ADR-0025). Falls
  // back to the raw renderer internally if it can't initialize, so this never breaks boot.
  const postfx = createPostFX({ renderer, scene, camera });

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    postfx.setSize(window.innerWidth, window.innerHeight);
  }

  return { renderer, scene, camera, baseCam, resize, postfx };
}
