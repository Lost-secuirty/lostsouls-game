// =====================================================================
// input.js — keyboard + mouse + Xbox gamepad -> a simple "intent".
//
// Device-aware so two players can share one Input:
//   'kb'   = keyboard + mouse        (Player 1)
//   'pad'  = the Xbox controller     (Player 2)
//   'both' = either (solo play)
//
// move(device) · aim(device,cam,x,z) · shoot(device) · consumeHelp/Leave(device)
// consumeRestart() is global (R or Start). call update() once per tick.
// =====================================================================

import * as THREE from 'three';
import { normalize } from '../core/math2d.js';
import { hud } from '../ui/hud.js';

const DEADZONE = 0.15;
const dz = (v) => (Math.abs(v) < DEADZONE ? 0 : v);

/** is the event target a text field / menu control (so we shouldn't treat keys as game input)? */
export function isEditable(el) {
  if (!el || !el.tagName) return false;
  const t = el.tagName;
  return t === 'INPUT' || t === 'TEXTAREA' || t === 'SELECT' || el.isContentEditable;
}

export class Input {
  constructor(domElement) {
    this.dom = domElement;
    this.keys = new Set();
    this.mouseNdc = new THREE.Vector2(0, 0);
    this._mouseDown = false;
    this._touchDown = false;

    // edge-triggered presses, per device (consumed once)
    this._kbHelp = false;
    this._kbLeave = false;
    this._kbRestart = false;
    this._padHelp = false;
    this._padLeave = false;
    this._padRestart = false;

    // weapon switching: keyboard picks a slot (0-2); pad cycles
    this._kbSlot = null;
    this._padCycle = false;

    // gamepad state
    this._padIndex = null;
    this._padPrev = {};
    this.pad = { moveX: 0, moveZ: 0, aimX: 0, aimZ: 0, active: false, aiming: false, shoot: false };
    this._padAim = { x: 0, z: -1 }; // right-stick aim persists when the stick is idle

    this._raycaster = new THREE.Raycaster();
    this._ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._hit = new THREE.Vector3();

    // Capture phase so we always see key releases first — even if a menu control
    // (lil-gui) would otherwise swallow them (the "stuck key" bug).
    addEventListener(
      'keydown',
      (e) => {
        if (isEditable(e.target)) return; // typing in the debug menu isn't game input
        const k = e.key.toLowerCase();
        this.keys.add(k);
        if (k === 'e') this._kbHelp = true;
        if (k === 'q') this._kbLeave = true;
        if (k === 'r') this._kbRestart = true;
        if (k === '1') this._kbSlot = 0;
        if (k === '2') this._kbSlot = 1;
        if (k === '3') this._kbSlot = 2;
      },
      { capture: true },
    );
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()), { capture: true });

    // Clicking anything that isn't the game canvas (e.g. the debug panel) releases
    // held keys, so movement can't get stuck when you poke a menu.
    addEventListener(
      'pointerdown',
      (e) => {
        if (this.dom && e.target !== this.dom && !this.dom.contains(e.target)) this.clearKeys();
      },
      { capture: true },
    );

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

  /** poll the gamepad once per tick; compute aim/shoot + button edges */
  update() {
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
      if (this.pad.aiming) {
        const n = normalize(ax, az);
        this._padAim.x = n.x;
        this._padAim.z = n.z;
      }
      const btn = (i) => !!(gp.buttons[i] && gp.buttons[i].pressed);
      this.pad.shoot = btn(7) || btn(5); // RT or RB
      this._edge('a', btn(0), () => (this._padHelp = true));
      this._edge('b', btn(1), () => (this._padLeave = true));
      this._edge('y', btn(3), () => (this._padCycle = true)); // Y cycles weapons
      this._edge('start', btn(9), () => (this._padRestart = true));
    } else {
      this.pad.active = false;
      this.pad.aiming = false;
      this.pad.shoot = false;
    }
  }

  _edge(name, pressed, onPress) {
    if (pressed && !this._padPrev[name]) onPress();
    this._padPrev[name] = pressed;
  }

  /** drop all held keyboard/mouse inputs (window blur / tab hide / click off canvas) */
  clearKeys() {
    this.keys.clear();
    this._mouseDown = false;
    this._touchDown = false;
  }

  /** rumble the controller — feature-detected, silent no-op where unsupported */
  rumble(strong = 0.4, weak = 0.2, ms = 120) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = this._padIndex != null ? pads[this._padIndex] : null;
    const act = gp && gp.vibrationActuator;
    if (act && act.playEffect) {
      try {
        act.playEffect('dual-rumble', {
          duration: ms,
          strongMagnitude: strong,
          weakMagnitude: weak,
        });
      } catch {
        /* some browsers throw on unknown effects — ignore */
      }
    }
  }

  /** WASD / left stick -> {x, z}. Screen "up" (W) moves away from the camera (-z). */
  move(device = 'both') {
    let x = 0;
    let z = 0;
    if (device !== 'pad') {
      if (this.keys.has('w') || this.keys.has('arrowup')) z -= 1;
      if (this.keys.has('s') || this.keys.has('arrowdown')) z += 1;
      if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
      if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    }
    if (device !== 'kb' && this.pad.active) {
      x += this.pad.moveX;
      z += this.pad.moveZ;
    }
    const l = Math.hypot(x, z);
    return l > 1 ? { x: x / l, z: z / l } : { x, z };
  }

  /** aim toward the mouse, or the right stick (which keeps its last direction for the pad). */
  aim(device, camera, fromX, fromZ) {
    if (device !== 'kb' && this.pad.aiming) return { ...this._padAim };
    if (device === 'pad') return { ...this._padAim }; // pad-only: keep last aim while stick is idle
    this._raycaster.setFromCamera(this.mouseNdc, camera);
    const hit = this._raycaster.ray.intersectPlane(this._ground, this._hit);
    if (!hit) return { x: 0, z: -1 };
    return normalize(hit.x - fromX, hit.z - fromZ);
  }

  shoot(device = 'both') {
    const kb = this._mouseDown || this._touchDown;
    const pad = this.pad.shoot;
    if (device === 'kb') return kb;
    if (device === 'pad') return pad;
    return kb || pad;
  }

  consumeHelp(device = 'both') {
    let v = false;
    if (device !== 'pad' && this._kbHelp) {
      v = true;
      this._kbHelp = false;
    }
    if (device !== 'kb' && this._padHelp) {
      v = true;
      this._padHelp = false;
    }
    return v;
  }
  consumeLeave(device = 'both') {
    let v = false;
    if (device !== 'pad' && this._kbLeave) {
      v = true;
      this._kbLeave = false;
    }
    if (device !== 'kb' && this._padLeave) {
      v = true;
      this._padLeave = false;
    }
    return v;
  }
  consumeRestart() {
    const v = this._kbRestart || this._padRestart;
    this._kbRestart = false;
    this._padRestart = false;
    return v;
  }

  /** weapon switch request for a device: {slot} (keyboard) or {cycle:true} (pad), else null */
  consumeWeaponSwitch(device = 'both') {
    if (device !== 'pad' && this._kbSlot != null) {
      const slot = this._kbSlot;
      this._kbSlot = null;
      return { slot };
    }
    if (device !== 'kb' && this._padCycle) {
      this._padCycle = false;
      return { cycle: true };
    }
    return null;
  }
}
