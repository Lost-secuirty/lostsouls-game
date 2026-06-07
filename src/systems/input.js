// =====================================================================
// input.js — turns keyboard + mouse + an Xbox gamepad into a simple "intent"
// the game reads each tick.
//
//   move      : {x, z} from WASD / left stick
//   aim       : {x, z} toward the mouse, or the right stick if it's being used
//   shoot     : mouse held / right trigger or bumper
//   edges     : E or (A) = help · Q or (B) = leave · R or (Start) = restart
//
// call update() once per tick (game does this) to poll the pad + button edges.
// =====================================================================

import * as THREE from 'three';
import { normalize } from '../core/math2d.js';
import { hud } from '../ui/hud.js';

const DEADZONE = 0.15;
const dz = (v) => (Math.abs(v) < DEADZONE ? 0 : v);

export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.shoot = false;
    this.mouseNdc = new THREE.Vector2(0, 0);

    this._mouseDown = false;
    this._touchDown = false;

    // edge-triggered presses (consumed once)
    this._help = false;
    this._leave = false;
    this._restart = false;

    // gamepad state
    this._padIndex = null;
    this._padPrev = {}; // previous button pressed states (for edges)
    this.pad = { moveX: 0, moveZ: 0, aimX: 0, aimZ: 0, active: false, aiming: false };

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
    domElement.addEventListener('mousedown', () => (this._mouseDown = true));
    addEventListener('mouseup', () => (this._mouseDown = false));
    domElement.addEventListener('touchstart', () => (this._touchDown = true), { passive: true });
    addEventListener('touchend', () => (this._touchDown = false));

    addEventListener('gamepadconnected', (e) => {
      this._padIndex = e.gamepad.index;
      hud.toast('🎮  Controller connected', true);
    });
    addEventListener('gamepaddisconnected', () => (this._padIndex = null));
  }

  /** poll the gamepad once per tick; compute button edges + shoot state */
  update() {
    let padShoot = false;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = this._padIndex != null ? pads[this._padIndex] : null;

    if (gp) {
      const mx = dz(gp.axes[0] || 0);
      const mz = dz(gp.axes[1] || 0);
      const ax = dz(gp.axes[2] || 0);
      const az = dz(gp.axes[3] || 0);
      this.pad.moveX = mx;
      this.pad.moveZ = mz;
      this.pad.active = mx !== 0 || mz !== 0;
      this.pad.aiming = ax !== 0 || az !== 0;
      this.pad.aimX = ax;
      this.pad.aimZ = az;

      const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      padShoot = btn(7) || btn(5); // RT or RB
      this._edge('a', btn(0), () => (this._help = true));
      this._edge('b', btn(1), () => (this._leave = true));
      this._edge('start', btn(9), () => (this._restart = true));
    } else {
      this.pad.active = false;
      this.pad.aiming = false;
    }

    this.shoot = this._mouseDown || this._touchDown || padShoot;
  }

  _edge(name, pressed, onPress) {
    if (pressed && !this._padPrev[name]) onPress();
    this._padPrev[name] = pressed;
  }

  /** drop all held inputs — call on window blur / tab hide so a missed keyup
   *  can't leave the player stuck moving (e.g. "stuck going up"). */
  clearKeys() {
    this.keys.clear();
    this._mouseDown = false;
    this._touchDown = false;
    this.shoot = false;
  }

  /** WASD / left stick -> {x, z}. Screen "up" (W) moves away from the camera (-z). */
  move() {
    let x = 0;
    let z = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) z -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) z += 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.pad.active) {
      x += this.pad.moveX;
      z += this.pad.moveZ;
    }
    const l = Math.hypot(x, z);
    return l > 1 ? { x: x / l, z: z / l } : { x, z };
  }

  /** aim toward the mouse on the ground — or the right stick when it's in use. */
  aim(camera, fromX, fromZ) {
    if (this.pad.aiming) return normalize(this.pad.aimX, this.pad.aimZ);
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
