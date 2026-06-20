import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { AnimModel } from '../src/core/animModel.js';

// AnimationMixer/Clip are pure math (no WebGL/DOM), so this runs in Node.
function makeClip(name) {
  const track = new THREE.VectorKeyframeTrack('.position', [0, 1], [0, 0, 0, 0, 1, 0]);
  return new THREE.AnimationClip(name, 1, [track]);
}

describe('AnimModel', () => {
  it('strips the "CharacterArmature|" prefix from clip names', () => {
    const am = new AnimModel(new THREE.Object3D(), [
      makeClip('CharacterArmature|Walk'),
      makeClip('Idle'),
    ]);
    expect(Object.keys(am.actions).sort((a, b) => a.localeCompare(b))).toEqual(['Idle', 'Walk']);
  });

  it('play() sets the current action and update() advances the mixer', () => {
    const am = new AnimModel(new THREE.Object3D(), [makeClip('CharacterArmature|Walk')]);
    expect(am.current).toBeNull();
    am.play('Walk');
    expect(am.current).toBeTruthy();
    const t0 = am.mixer.time;
    am.update(0.5);
    expect(am.mixer.time).toBeGreaterThan(t0);
  });

  it('play() of a missing clip is a safe no-op', () => {
    const am = new AnimModel(new THREE.Object3D(), []);
    am.play('Nope');
    expect(am.current).toBeNull();
  });

  it('fitTo() scales the group so its height matches the target', () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2))); // 4 units tall
    const am = new AnimModel(g, []);
    am.fitTo(2); // -> scale 0.5
    expect(am.group.scale.y).toBeCloseTo(0.5);
  });
});
