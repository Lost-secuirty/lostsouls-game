// =====================================================================
// textures.js — the "ask by path, get a texture or nothing" seam (mirrors
// core/assets.js for GLBs). Drop PBR maps in public/textures/ and point
// config.GRAPHICS.floor at them; a missing or broken file is skipped and
// getTexture() returns null, so the material falls back to a flat color.
// Nothing ever throws over a missing texture. ADR-0026 (Phase C).
// =====================================================================

import * as THREE from 'three';

const cache = new Map(); // path -> THREE.Texture
let loader = null;

/**
 * Preload textures into the cache. AWAIT this before building materials that use
 * them (the floor is built in createScene). Never throws — a broken/missing file is
 * warned and left out of the cache. Safe to call with [] or all-falsy paths.
 * @param {Array<string|null|undefined>} paths
 */
export async function loadTextures(paths) {
  const list = [...new Set((paths || []).filter(Boolean))];
  if (list.length === 0) return;
  loader = loader || new THREE.TextureLoader();
  await Promise.all(
    list.map(
      (path) =>
        new Promise((resolve) => {
          loader.load(
            path,
            (tex) => {
              cache.set(path, tex);
              resolve();
            },
            undefined,
            (err) => {
              console.warn(`[textures] could not load "${path}": ${err?.message ?? err}`);
              resolve();
            },
          );
        }),
    ),
  );
}

/**
 * Get a preloaded texture configured for tiling, or null if it isn't loaded.
 * `srgb` ONLY for albedo/color maps — normal/roughness/AO maps must stay linear
 * (NoColorSpace) or the PBR shading is wrong. ADR-0026.
 * @param {string|null|undefined} path
 * @param {{ srgb?: boolean, repeat?: number, anisotropy?: number }} [opts]
 * @returns {import('three').Texture | null}
 */
export function getTexture(path, { srgb = false, repeat = 1, anisotropy = 1 } = {}) {
  const tex = path ? cache.get(path) : null;
  if (!tex) return null;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}
