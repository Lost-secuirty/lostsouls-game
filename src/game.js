// =====================================================================
// game.js — the conductor. Owns the world, runs the state machine, wires
// every system together each tick, and renders (with camera shake).
//
//   BOOT -> PLAYING -> ROOM_CLEAR -> (next room) -> ... -> WIN
//                 \-> DEAD
// =====================================================================

import { PLAYER, ROOMS, CAMERA, JUICE, ARENA } from './config.js';
import { State } from './states.js';
import { makeRng } from './core/rng.js';
import { Player } from './entities/player.js';
import { Ally } from './entities/ally.js';
import { Enemy } from './entities/enemies.js';
import { Bullets } from './entities/bullets.js';
import { Particles } from './systems/particles.js';
import { Juice } from './systems/juice.js';
import { buildRoom } from './systems/rooms.js';
import { populateRoom } from './systems/spawner.js';
import { resolveDecision } from './systems/npcDecision.js';
import { circleVsBox } from './core/math2d.js';
import { hud } from './ui/hud.js';
import { prompts } from './ui/prompts.js';
import * as audio from './systems/audio.js';

export class Game {
  constructor({ renderer, scene, camera, baseCam, input }) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.baseCam = baseCam;
    this.input = input;
    this.JUICE = JUICE;

    this.enemies = [];
    this.npcs = [];
    this.walls = [];
    this.activeNpc = null;
    this.room = null;
    this.roomIndex = 0;
    this.state = State.BOOT;
  }

  init() {
    audio.registerDefaultSounds();
    this.particles = new Particles(this.scene);
    this.juice = new Juice();
    this.bullets = new Bullets(this.scene);
    this.player = new Player(this.scene);
    this.ally = new Ally(this.scene);
    this.startRun();
  }

  startRun() {
    this.rng = makeRng((Math.random() * 1e9) | 0);
    this.roomIndex = 0;
    this.player.reset(0, ARENA.depth / 2 - 4);
    this.ally.reset(2, ARENA.depth / 2 - 3);
    this.loadRoom(0);
  }

  loadRoom(index) {
    this.roomIndex = index;

    // clear out the previous room
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
    for (const n of this.npcs) {
      this.scene.remove(n.mesh);
      this.scene.remove(n.marker);
    }
    this.npcs = [];
    this.activeNpc = null;
    this.bullets.clearAll();
    if (this.room) this.room.dispose();

    this.room = buildRoom(this.scene, this.rng, index);
    this.walls = this.room.walls;

    // place player at the bottom-center entrance
    this.player.x = 0;
    this.player.z = ARENA.depth / 2 - 4;
    this.player.mesh.position.set(this.player.x, 0, this.player.z);
    this.ally.reset(2, ARENA.depth / 2 - 3);

    populateRoom(this, index);

    this.state = State.PLAYING;
    hud.hideBanner();
    prompts.hide();
    this.refreshHud();
  }

  refreshHud() {
    hud.setHearts(this.player.hearts, PLAYER.maxHearts);
    hud.setRoom(this.roomIndex + 1, ROOMS.total);
  }

  addEnemy(e) {
    this.enemies.push(e);
  }

  update(dt) {
    // restart from a finished run
    if ((this.state === State.DEAD || this.state === State.WIN) && this.input.consumeRestart()) {
      this.startRun();
      return;
    }

    if (this.state === State.PLAYING) {
      this.player.update(dt, this);
      this.ally.update(dt, this);
      for (const e of this.enemies) e.update(dt, this);
      this.bullets.update(dt, this);
      this._handleSurvivors(dt);
      this.enemies = this.enemies.filter((e) => !e.dead);

      if (!this.player.alive) this._onDeath();
      else if (this.enemies.length === 0) this._onRoomClear();
    } else if (this.state === State.ROOM_CLEAR) {
      this.player.update(dt, this);
      this.ally.update(dt, this);
      this.bullets.update(dt, this);
      this._checkDoor();
    }

    this.particles.update(dt);
    this.juice.update(dt);
  }

  _handleSurvivors(dt) {
    let near = null;
    for (const n of this.npcs) {
      n.update(dt);
      if (!near && n.inRange(this.player)) near = n;
    }
    this.activeNpc = near;

    if (near) {
      prompts.show(`${near.name} cowers here —  [E] Help   ·   [Q] Leave`);
      if (this.input.consumeHelp()) this._resolveSurvivor(near, 'HELP');
      else if (this.input.consumeLeave()) this._resolveSurvivor(near, 'LEAVE');
    } else {
      prompts.hide();
      this.input.consumeHelp(); // drop stray presses
      this.input.consumeLeave();
    }
  }

  _resolveSurvivor(npc, choice) {
    const outcome = resolveDecision(this.rng, choice);
    npc.markUsed();
    this.activeNpc = null;
    prompts.hide();

    if (outcome.effect === 'SPAWN_ENEMIES') {
      for (let i = 0; i < outcome.magnitude; i++) {
        const ox = npc.x + (this.rng.next() * 4 - 2);
        const oz = npc.z + (this.rng.next() * 4 - 2);
        this.addEnemy(new Enemy(this.scene, 'chaser', ox, oz));
      }
    } else {
      this.player.applyEffect(outcome.effect, outcome.magnitude, this);
    }

    const label = (choice === 'HELP' ? 'You helped. ' : 'You walked away. ') + outcome.message;
    hud.toast(label, outcome.good);
    audio.play(outcome.good ? 'good' : 'bad');
    this.refreshHud();
  }

  _onRoomClear() {
    this.bullets.clearEnemyBullets();
    this.room.openDoor();
    this.state = State.ROOM_CLEAR;
    if (this.room.lastRoom) {
      hud.banner('LAST EXIT AHEAD');
    } else {
      hud.banner('ROOM CLEAR — RUN!');
    }
    prompts.hide();
  }

  _checkDoor() {
    const p = this.player;
    if (this.room.door.active && circleVsBox(p.x, p.z, p.radius, this.room.door.box)) {
      if (this.room.lastRoom) this._onWin();
      else this.loadRoom(this.roomIndex + 1);
    }
  }

  _onDeath() {
    this.state = State.DEAD;
    hud.banner('YOU DIED  —  press R');
    prompts.hide();
  }

  _onWin() {
    this.state = State.WIN;
    hud.banner('YOU ESCAPED THE CITY!  —  press R');
    prompts.hide();
  }

  render() {
    const m = this.juice.shakeMag;
    this.camera.position.set(
      this.baseCam.x + (Math.random() * 2 - 1) * m,
      this.baseCam.y + (Math.random() * 2 - 1) * m,
      this.baseCam.z + (Math.random() * 2 - 1) * m,
    );
    this.camera.lookAt(0, CAMERA.lookAtY, 0);
    this.renderer.render(this.scene, this.camera);
  }
}
