// Unit tests for the pure parts of the texture seam (src/core/textures.js).
// The async TextureLoader path needs a browser; here we cover the config helper,
// the cache-miss fallback, and the no-op early return.
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { configureTexture, getTexture, loadTextures } from '../src/core/textures.js';

// a fake texture with just the surface configureTexture touches
const fakeTex = () => ({
  repeat: {
    set(x, y) {
      this.x = x;
      this.y = y;
    },
  },
});

describe('configureTexture', () => {
  it('sets sRGB + tiling for an albedo map', () => {
    const t = configureTexture(fakeTex(), { srgb: true, repeat: 8, anisotropy: 4 });
    expect(t.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(t.wrapS).toBe(THREE.RepeatWrapping);
    expect(t.wrapT).toBe(THREE.RepeatWrapping);
    expect(t.repeat.x).toBe(8);
    expect(t.repeat.y).toBe(8);
    expect(t.anisotropy).toBe(4);
    expect(t.needsUpdate).toBe(true);
  });

  it('keeps data maps linear (NoColorSpace) by default', () => {
    expect(configureTexture(fakeTex()).colorSpace).toBe(THREE.NoColorSpace);
  });
});

describe('getTexture', () => {
  it('returns null for a null or not-preloaded path (color fallback)', () => {
    expect(getTexture(null)).toBeNull();
    expect(getTexture('textures/floor/missing.png')).toBeNull();
  });
});

describe('loadTextures', () => {
  it('no-ops on empty / nullish / all-falsy input', async () => {
    await expect(loadTextures([])).resolves.toBeUndefined();
    await expect(loadTextures(null)).resolves.toBeUndefined();
    await expect(loadTextures([null, undefined, ''])).resolves.toBeUndefined();
  });
});
