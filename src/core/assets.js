// =====================================================================
// assets.js — the "ask by key, get a model or nothing" seam.
//
// The game runs entirely on primitive shapes. When you drop a real .glb into
// public/models/ and point config.MODELS at it, getModel(key) starts returning
// a clone of it — and the entities use it automatically. If a file is missing
// or fails to load, we just return null and the entity keeps its shape.
// Nothing ever throws over a missing asset.
// =====================================================================

const cache = new Map();

/**
 * Try to load every non-null model path in `models`. Missing/broken files are
 * skipped with a warning. Safe to call with all-null config (does nothing).
 * @param {Record<string, string|null>} models
 */
export async function loadModels(models) {
  const entries = Object.entries(models).filter(([, path]) => !!path);
  if (entries.length === 0) return;

  // Only pull in the loader if we actually have something to load.
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();

  await Promise.all(
    entries.map(
      ([key, path]) =>
        new Promise((resolve) => {
          loader.load(
            path,
            (gltf) => {
              cache.set(key, gltf.scene);
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

/**
 * Get a fresh clone of a loaded model, or null if we don't have it.
 * @param {string} key
 * @returns {import('three').Object3D | null}
 */
export function getModel(key) {
  const m = cache.get(key);
  return m ? m.clone(true) : null;
}
