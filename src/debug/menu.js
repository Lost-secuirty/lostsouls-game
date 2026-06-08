// =====================================================================
// debug/menu.js — Scott's dev menu (lil-gui). Lazy-loaded only when asked
// (?debug=1 or the backtick key), so it never loads during normal play.
//
// Everything drives the live game via window.__game, reusing existing methods
// (loadRoom, setWeapon, spawnPickup, startRun, etc.).
// =====================================================================

import GUI from 'lil-gui';
import { PLAYER, WEAPONS, PROGRESSION, CAPS } from '../config.js';
import { roomsPerFloor, floorCount, floorInfo } from '../core/progression.js';

const PICKUP_TYPES = [
  'HEAL',
  'DAMAGE_UP',
  'FIRE_RATE_UP',
  'SPEED_UP',
  'SHOTGUN',
  'MACHINEGUN',
  'ROCKET',
];

export function initDebugMenu(game) {
  const gui = new GUI({ title: '🛠 Debug (Scott)' });

  const state = {
    godMode: false,
    floor: 0,
    room: 0,
    weapon: game.player.weapon,
    pickup: 'HEAL',
    fps: 0,
  };

  // ---- World ----
  const world = gui.addFolder('World');
  world.add(state, 'floor', 0, floorCount() - 1, 1).name('Floor');
  world.add(state, 'room', 0, roomsPerFloor() - 1, 1).name('Room (5 = boss)');
  world
    .add(
      {
        go() {
          game.loadRoom(state.floor * roomsPerFloor() + state.room);
        },
      },
      'go',
    )
    .name('▶ Go to room');
  world
    .add(
      {
        boss() {
          const f = floorInfo(game.roomIndex).floorIndex;
          game.loadRoom(f * roomsPerFloor() + PROGRESSION.roomsPerFloor);
        },
      },
      'boss',
    )
    .name('Jump to boss');
  world
    .add(
      {
        killAll() {
          _killAll(game);
        },
      },
      'killAll',
    )
    .name('💀 Kill all enemies');
  world
    .add(
      {
        restart() {
          game.startRun(game.coop);
        },
      },
      'restart',
    )
    .name('↺ Restart run');

  // ---- Player ----
  const pl = gui.addFolder('Player');
  pl.add(state, 'godMode')
    .name('God mode')
    .onChange((v) => {
      game.godMode = v;
    });
  pl.add(
    {
      heal() {
        game.player.hearts = PLAYER.maxHearts;
        game.refreshHud();
      },
    },
    'heal',
  ).name('Full heal');
  pl.add(
    {
      life() {
        game.lives = Math.min(CAPS.lives.max, game.lives + 1);
        game.refreshHud();
      },
    },
    'life',
  ).name('+1 life');
  pl.add(state, 'weapon', Object.keys(WEAPONS))
    .name('Weapon')
    .onChange((v) => {
      game.player.setWeapon(v);
      game.refreshHud();
    });

  // ---- Spawn ----
  const sp = gui.addFolder('Spawn');
  sp.add(state, 'pickup', PICKUP_TYPES).name('Pickup type');
  sp.add(
    {
      drop() {
        game.spawnPickup(state.pickup, game.player.x, game.player.z + 2);
      },
    },
    'drop',
  ).name('🎁 Drop pickup');

  // ---- FPS monitor ----
  const fpsCtrl = gui.add(state, 'fps').name('FPS').disable().listen();
  let last = performance.now();
  let frames = 0;
  let acc = 0;
  function tick(now) {
    frames++;
    acc += now - last;
    last = now;
    if (acc >= 500) {
      state.fps = Math.round((frames * 1000) / acc);
      fpsCtrl.updateDisplay();
      frames = 0;
      acc = 0;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return gui;
}

function _killAll(game) {
  for (const e of game.enemies) {
    if (!e.dead) {
      e.dead = true;
      game.scene.remove(e.mesh);
    }
  }
}
