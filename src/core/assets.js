// =====================================================================
// assets.js — the "ask by key, get a model or nothing" seam.
//
// The game runs entirely on primitive shapes. When you drop a real .glb into
// public/models/ and point config.MODELS at it, getModel/getAnimated(key) start
// returning a clone — and the entities use it automatically. If a file is
// missing or fails to load, we return null and the entity keeps its shape.
// Nothing ever throws over a missing asset.
//
// Animated/skinned GLBs MUST be cloned with SkeletonUtils.clone (not
// Object3D.clone) so each instance rebinds to its own skeleton; clips live on
// gltf.animations and are reused across instances (see core/animModel.js).
// =====================================================================

const cache = new Map(); // key -> { scene, animations }
let _clone = null; // SkeletonUtils.clone (loaded lazily with the GLTF loader)

/**
 * Try to load every non-null model path in `models`. Missing/broken files are
 * skipped with a warning. Safe to call with all-null config (does nothing).
 * @param {Record<string, string|null>} models
 */
export async function loadModels(models) {
  const entries = Object.entries(models).filter(([, path]) => !!path);
  if (entries.length === 0) return;

  // Only pull these in if we actually have something to load.
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  if (!_clone) {
    const SkeletonUtils = await import('three/addons/utils/SkeletonUtils.js');
    _clone = SkeletonUtils.clone;
  }
  const loader = new GLTFLoader();

  await Promise.all(
    entries.map(
      ([key, path]) =>
        new Promise((resolve) => {
          loader.load(
            path,
            (gltf) => {
              cache.set(key, { scene: gltf.scene, animations: gltf.animations || [] });
              resolve();
            },
            undefined,
            (err) => {
              console.warn(`[assets] could not load "${key}" (${path}): ${err?.message ?? err}`);
              resolve();
            },
          );
        }),
    ),
  );
}

function cloneScene(entry) {
  return _clone ? _clone(entry.scene) : entry.scene.clone(true);
}

/**
 * Get a fresh clone of a loaded model, or null if we don't have it.
 * @param {string} key
 * @returns {import('three').Object3D | null}
 */
export function getModel(key) {
  const entry = cache.get(key);
  return entry ? cloneScene(entry) : null;
}

/**
 * Get a per-instance clone PLUS the model's animation clips, or null.
 * Clips come from the original gltf (they aren't part of the scene graph), so
 * they're safe to share across each clone's own AnimationMixer.
 * @param {string} key
 * @returns {{ scene: import('three').Object3D, clips: import('three').AnimationClip[] } | null}
 */
export function getAnimated(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  return { scene: cloneScene(entry), clips: entry.animations };
}
