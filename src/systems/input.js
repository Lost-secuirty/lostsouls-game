// =====================================================================
// input.js — turns the keyboard + mouse into a simple "intent" the game reads.
//
//   move      : {x, z} direction from WASD (already normalized)
//   aim       : {x, z} direction from the player toward the mouse on the ground
//   shoot     : true while the mouse button is held
//   (edge keys: E = help survivor, Q = leave survivor, R = restart)
// =====================================================================

import * as THREE from 'three';
import { normalize } from '../core/math2d.js';

export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.shoot = false;
    this.mouseNdc = new THREE.Vector2(0, 0);

    // edge-triggered presses (consumed once)
    this._help = false;
    this._leave = false;
    this._restart = false;

    this._raycaster = new THREE.Raycaster();
    this._ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hit = new THREE.Vector3();

    addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      this.keys.add(k);
      if (k === 'e') this._help = true;
      if (k === 'q') this._leave = true;
      if (k === 'r') this._restart = true;
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));

    domElement.addEventListener('mousemove', (e) => {
      this.mouseNdc.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseNdc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });
    domElement.addEventListener('mousedown', () => (this.shoot = true));
    addEventListener('mouseup', () => (this.shoot = false));
    // also fire while touching (basic mobile support)
    domElement.addEventListener('touchstart', () => (this.shoot = true), { passive: true });
    addEventListener('touchend', () => (this.shoot = false));
  }

  /** WASD -> normalized {x, z}. Screen "up" (W) moves away from the camera (-z). */
  move() {
    let x = 0;
    let z = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) z -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) z += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    return normalize(x, z);
  }

  /** Direction from player world position toward where the mouse points on the ground. */
  aim(camera, fromX, fromZ) {
    this._raycaster.setFromCamera(this.mouseNdc, camera);
    const hit = this._raycaster.ray.intersectPlane(this._ground, this._hit);
    if (!hit) return { x: 0, z: -1 };
    return normalize(hit.x - fromX, hit.z - fromZ);
  }

  consumeHelp() {
    const v = this._help;
    this._help = false;
    return v;
  }
  consumeLeave() {
    const v = this._leave;
    this._leave = false;
    return v;
  }
  consumeRestart() {
    const v = this._restart;
    this._restart = false;
    return v;
  }
}
