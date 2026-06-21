// =====================================================================
// animModel.js — wraps a cloned GLB scene + an AnimationMixer so entities can
// play named clips. Quaternius clips are prefixed "CharacterArmature|" — we
// strip that so callers ask for "Walk", "Idle", "Death", etc.
//
// Each instance needs its OWN mixer; the clips themselves are shared (passed in
// from the original gltf.animations — see core/assets.js getAnimated()).
// =====================================================================

import * as THREE from 'three';
import { getAnimated } from './assets.js';

export class AnimModel {
  constructor(scene, clips) {
    this.group = scene;
    // Skinned GLB meshes carry a bind-pose bounding sphere that doesn't follow
    // the bones/scale, so three.js frustum-culls them and they vanish on screen.
    // Disable culling on the model's meshes so they always draw.
    scene.traverse((o) => {
      if (o.isMesh || o.isSkinnedMesh) o.frustumCulled = false;
    });
    this.mixer = new THREE.AnimationMixer(scene);
    this.actions = {};
    for (const clip of clips || []) {
      const name = clip.name.includes('|') ? clip.name.split('|').pop() : clip.name;
      this.actions[name] = this.mixer.clipAction(clip);
    }
    this.current = null;
  }

  /**
   * Scale the model so its height ≈ targetHeight (auto-fits any model's units).
   * Measures the union of the MESH geometry boxes — Box3.setFromObject is
   * unreliable on skinned models (it reads bind/bone extents and can be wildly
   * off, shrinking the model to an invisible speck).
   */
  fitTo(targetHeight) {
    this.group.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    let any = false;
    this.group.traverse((o) => {
      if ((o.isMesh || o.isSkinnedMesh) && o.geometry) {
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        tmp.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
        box.union(tmp);
        any = true;
      }
    });
    if (!any) return this;
    const size = new THREE.Vector3();
    box.getSize(size);
    this.group.scale.multiplyScalar(targetHeight / (size.y || 1));
    return this;
  }

  /** cross-fade to a named clip (no-op if missing or already playing it) */
  play(name, { loop = true, fade = 0.2 } = {}) {
    const action = this.actions[name];
    if (!action || action === this.current) return;
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !loop;
    action.fadeIn(fade);
    if (this.current) this.current.fadeOut(fade);
    action.play();
    this.current = action;
  }

  update(dt) {
    this.mixer.update(dt);
  }
}

/**
 * The shared "GLB if present" builder used by every animated boss/minion: clone
 * the model for `key`, fit it to `targetHeight`, play `clip`, and wrap it in a
 * base-1 Group (so hit-pop / telegraph scaling stays correct). Returns
 * { wrap, anim } or null if the model isn't loaded (caller falls back to a
 * procedural mesh). Keeps the load pattern in ONE place (DRY).
 */
export function loadAnimated(key, targetHeight, clip = 'Walk') {
  const m = getAnimated(key);
  if (!m) return null;
  const anim = new AnimModel(m.scene, m.clips).fitTo(targetHeight);
  anim.play(clip);
  const wrap = new THREE.Group();
  wrap.add(anim.group);
  return { wrap, anim };
}
