// =====================================================================
// scene.js — sets up Three.js: the renderer, scene, lights, ground, and the
// tilted top-down camera (the "Binding of Isaac" angle).
// =====================================================================

import * as THREE from 'three';
import { ARENA, CAMERA, PALETTE } from '../config.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07060a);
  // Fog sized to the camera distance + arena span so the far wall stays readable as
  // the arena grows (it scales with config CAMERA/ARENA instead of fixed 45–90).
  const camDist = Math.hypot(CAMERA.back, CAMERA.height);
  const arenaSpan = Math.max(ARENA.width, ARENA.depth);
  scene.fog = new THREE.Fog(0x07060a, camDist, camDist + arenaSpan * 1.6);

  // ---- camera: high up and tilted back, looking at the arena center ----
  const camera = new THREE.PerspectiveCamera(
    CAMERA.fov,
    window.innerWidth / window.innerHeight,
    0.1,
    300,
  );
  const baseCam = { x: 0, y: CAMERA.height, z: CAMERA.back };
  camera.position.set(baseCam.x, baseCam.y, baseCam.z);
  camera.lookAt(0, CAMERA.lookAtY, 0);

  // ---- lights: moody, but bright enough to read the action ----
  scene.add(new THREE.HemisphereLight(0x8a6b8a, 0x241826, 0.9));
  scene.add(new THREE.AmbientLight(0x66556a, 0.6));
  const key = new THREE.DirectionalLight(0xffb088, 1.3);
  key.position.set(10, 30, 12);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x6688ff, 0.5);
  fill.position.set(-15, 20, -10);
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

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  return { renderer, scene, camera, baseCam, resize };
}
