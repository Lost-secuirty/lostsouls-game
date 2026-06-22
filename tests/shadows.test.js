// Unit tests for the shadow-caster helper (src/core/shadows.js). Pure traversal +
// material check — no three/DOM needed (duck-typed Object3D fakes).
import { describe, it, expect } from 'vitest';
import { castShadows } from '../src/core/shadows.js';

// minimal fake Object3D graph: traverse() just visits the given nodes
const root = (nodes) => ({ traverse: (fn) => nodes.forEach(fn) });

describe('castShadows', () => {
  it('flags a PBR mesh as a caster', () => {
    const body = { isMesh: true, material: { isMeshStandardMaterial: true } };
    castShadows(root([body]));
    expect(body.castShadow).toBe(true);
  });

  it('flags a SkinnedMesh (GLB) as a caster', () => {
    const skin = { isSkinnedMesh: true, material: {} };
    castShadows(root([skin]));
    expect(skin.castShadow).toBe(true);
  });

  it('skips unlit MeshBasic sub-meshes (glowing eyes never cast)', () => {
    const eye = { isMesh: true, material: { isMeshBasicMaterial: true } };
    castShadows(root([eye]));
    expect(eye.castShadow).toBeUndefined();
  });

  it('skips a mesh if ANY material in its array is MeshBasic', () => {
    const mixed = {
      isMesh: true,
      material: [{ isMeshStandardMaterial: true }, { isMeshBasicMaterial: true }],
    };
    castShadows(root([mixed]));
    expect(mixed.castShadow).toBeUndefined();
  });

  it('ignores non-meshes (groups, lights, bones)', () => {
    const grp = { isMesh: false };
    castShadows(root([grp]));
    expect(grp.castShadow).toBeUndefined();
  });
});
