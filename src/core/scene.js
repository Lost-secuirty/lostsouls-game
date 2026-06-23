// =====================================================================
// scene.js — sets up Three.js: the renderer, scene, lights, ground, and the
// tilted top-down camera (the "Binding of Isaac" angle).
// =====================================================================

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ARENA, CAMERA, PALETTE, LIGHTING, GRAPHICS } from '../config.js';
import { createPostFX } from './postfx.js';
import { getTexture } from './textures.js';
import { effectivePixelRatio } from './graphics.js';

export function createScene(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(effectivePixelRatio(window.devicePixelRatio, GRAPHICS.pixelRatioCap));
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Real-time shadows (ADR-0026 Phase B). Type is set ONCE here (before first render)
  // to avoid a mid-run shader recompile; PCFShadowMap is the current soft type.
  // `enabled` starts from config; main.js then reconciles it with the reducedEffects
  // setting via the returned setShadowsEnabled().
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.enabled = GRAPHICS.shadows.enabled;
  // Explicit color-management contract (ADR-0026): the post-FX composer follows the
  // renderer's outputColorSpace, so pin it rather than leaning on the three default.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(LIGHTING.background);
  // Fog sized to the camera distance + arena span so the far wall stays readable as
  // the arena grows (it scales with config CAMERA/ARENA instead of fixed 45–90).
  // `mode` picks linear (near/far) vs exp2 (density) — see config.LIGHTING.fog.
  const camDist = Math.hypot(CAMERA.back, CAMERA.height);
  const arenaSpan = Math.max(ARENA.width, ARENA.depth);
  const fogCfg = LIGHTING.fog;
  scene.fog =
    fogCfg.mode === 'exp2'
      ? new THREE.FogExp2(fogCfg.color, fogCfg.density)
      : new THREE.Fog(
          fogCfg.color,
          camDist * (fogCfg.nearMul ?? 1),
          camDist + arenaSpan * fogCfg.farMul,
        );

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

  // ---- shadows: the KEY light is the sole caster (ADR-0026 Phase B) ----
  // A tight orthographic frustum fit to the static ARENA (not entity bounds — skinned
  // GLB boxes lie). The fill light never casts (perf). Tunable in config.GRAPHICS.shadows.
  const sh = GRAPHICS.shadows;
  key.castShadow = true;
  key.shadow.mapSize.set(sh.mapSize, sh.mapSize);
  key.shadow.bias = sh.bias;
  key.shadow.normalBias = sh.normalBias;
  key.shadow.radius = sh.radius;
  const sc = key.shadow.camera; // an OrthographicCamera for a directional light
  sc.left = -(ARENA.width / 2 + sh.frustumMargin);
  sc.right = ARENA.width / 2 + sh.frustumMargin;
  sc.top = ARENA.depth / 2 + sh.frustumMargin;
  sc.bottom = -(ARENA.depth / 2 + sh.frustumMargin);
  sc.near = sh.near;
  sc.far = sh.far;
  sc.updateProjectionMatrix(); // REQUIRED — without it the frustum keeps defaults

  // ---- image-based lighting (ADR-0026): a subtle environment fill ----
  // One-time PMREM bake of a RoomEnvironment at boot (zero per-frame cost). Adds depth
  // to the PBR materials (ground/walls/characters); does NOT affect the MeshBasic glowing
  // bullets/eyes/door. environmentIntensity defaults to 1 (too strong — washes pale models),
  // so we set it explicitly low. Never breaks boot: on any failure we drop the env and the
  // key/fill/hemi/ambient rig still lights everything. The render studio uses the same knobs.
  const ibl = L.ibl;
  if (ibl.enabled) {
    let pmrem;
    let env;
    try {
      pmrem = new THREE.PMREMGenerator(renderer);
      env = new RoomEnvironment();
      scene.environment = pmrem.fromScene(env, ibl.sigma).texture; // baked texture survives dispose
      scene.environmentIntensity = ibl.intensity;
    } catch (err) {
      console.warn('[scene] IBL disabled — keeping the light-only rig:', err?.message || err);
      scene.environment = null;
    } finally {
      // dispose in finally so a throw in fromScene() can't leak the GPU resources
      env?.dispose();
      pmrem?.dispose();
    }
  }

  // ---- ground: dark plane + a grid for the "ruined street" feel ----
  // floor material: a CC0 wet-asphalt PBR set when present (ADR-0026 Phase C —
  // textures preloaded in main.js), else the flat PALETTE.ground color. The albedo
  // is tinted white when textured so it isn't double-darkened; metalness stays 0.
  const fl = GRAPHICS.floor;
  const aniso =
    fl.anisotropy === 'max' ? renderer.capabilities.getMaxAnisotropy() : fl.anisotropy || 1;
  const floorMap = fl.enabled
    ? getTexture(fl.map, { srgb: true, repeat: fl.repeat, anisotropy: aniso })
    : null;
  const floorNormal = fl.enabled
    ? getTexture(fl.normalMap, { repeat: fl.repeat, anisotropy: aniso })
    : null;
  const floorRough = fl.enabled
    ? getTexture(fl.roughnessMap, { repeat: fl.repeat, anisotropy: aniso })
    : null;
  const groundMat = new THREE.MeshStandardMaterial({
    color: fl.tint ?? (floorMap ? 0xffffff : PALETTE.ground),
    roughness: fl.roughness ?? 1,
    metalness: fl.metalness ?? 0,
  });
  if (floorMap) groundMat.map = floorMap;
  if (floorNormal) {
    groundMat.normalMap = floorNormal;
    groundMat.normalScale.set(fl.normalScale, fl.normalScale);
  }
  if (floorRough) groundMat.roughnessMap = floorRough;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA.width + 20, ARENA.depth + 20),
    groundMat,
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true; // the floor catches entity + wall shadows (ADR-0026)
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

  // runtime on/off for shadows (the reducedEffects toggle in main.js). Toggling
  // shadowMap.enabled after the first render needs a material recompile to take effect.
  function setShadowsEnabled(on) {
    const active = on && GRAPHICS.shadows.enabled;
    if (renderer.shadowMap.enabled === active) return;
    renderer.shadowMap.enabled = active;
    scene.traverse((o) => {
      const mat = o.material;
      if (!mat) return;
      if (Array.isArray(mat)) mat.forEach((m) => (m.needsUpdate = true));
      else mat.needsUpdate = true;
    });
  }

  // FPS-1: live A/B of the two safe dial-backs from the debug "Graphics" folder.
  // Both mutate GRAPHICS so the config value stays the single source of truth.
  function setPixelRatioCap(cap) {
    GRAPHICS.pixelRatioCap = cap;
    renderer.setPixelRatio(effectivePixelRatio(window.devicePixelRatio, cap));
    resize(); // re-apply size to renderer + composer + camera aspect
  }
  // Resizing a shadow map needs the old GPU texture disposed and the map recreated,
  // or it leaks and the new size is silently ignored.
  function setShadowMapSize(size) {
    GRAPHICS.shadows.mapSize = size;
    const sm = key.shadow;
    sm.map?.dispose();
    sm.map = null;
    sm.mapSize.set(size, size);
    sm.needsUpdate = true;
  }

  return {
    renderer,
    scene,
    camera,
    baseCam,
    resize,
    postfx,
    setShadowsEnabled,
    setPixelRatioCap,
    setShadowMapSize,
  };
}
