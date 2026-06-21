// =====================================================================
// debug/menu.js — the project owner's dev menu (lil-gui). Lazy-loaded only when asked
// (?debug=1 or the backtick key), so it never loads during normal play.
//
// Everything drives the live game via window.__game, reusing existing methods
// (loadRoom, setWeapon, spawnPickup, startRun, etc.).
// =====================================================================

import GUI from 'lil-gui';
import { PLAYER, WEAPONS, PROGRESSION, CAPS } from '../config.js';
import { roomsPerFloor, floorCount, floorInfo } from '../core/progression.js';
import { WEAPON_TYPES } from '../entities/pickups.js';

const PICKUP_TYPES = ['HEAL', 'DAMAGE_UP', 'FIRE_RATE_UP', 'SPEED_UP', ...WEAPON_TYPES];

export function initDebugMenu(game) {
  const gui = new GUI({ title: '🛠 Debug (the project owner)' });

  const state = {
    godMode: false,
    floor: 0,
    room: 0,
    // the menu can open on the start screen (?debug=1) before a run exists, so
    // fall back to 'pistol' until startRun() creates the players.
    weapon: game.player?.weapon ?? 'pistol',
    pickup: 'HEAL',
    fps: 0,
    drawCalls: 0,
    bullets: 0,
    enemies: 0,
  };

  // ---- World ----
  const world = gui.addFolder('World');
  world.add(state, 'floor', 0, floorCount() - 1, 1).name('Floor');
  world.add(state, 'room', 0, roomsPerFloor() - 1, 1).name('Room (last = boss)');
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

  // ---- Performance (FPS + the counts that matter for tuning difficulty/perf) ----
  const perf = gui.addFolder('Performance');
  const fpsCtrl = perf.add(state, 'fps').name('FPS').disable().listen();
  const dcCtrl = perf.add(state, 'drawCalls').name('Draw calls').disable().listen();
  const blCtrl = perf.add(state, 'bullets').name('Bullets (live)').disable().listen();
  const enCtrl = perf.add(state, 'enemies').name('Enemies (live)').disable().listen();
  let last = performance.now();
  let frames = 0;
  let acc = 0;
  function tick(now) {
    frames++;
    acc += now - last;
    last = now;
    if (acc >= 500) {
      state.fps = Math.round((frames * 1000) / acc);
      state.drawCalls = game.renderer?.info?.render?.calls ?? 0;
      state.bullets = game.bullets ? game.bullets.items.filter((b) => b.active).length : 0;
      state.enemies = game.enemies.filter((e) => !e.dead).length;
      fpsCtrl.updateDisplay();
      dcCtrl.updateDisplay();
      blCtrl.updateDisplay();
      enCtrl.updateDisplay();
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
