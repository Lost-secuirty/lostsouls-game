// =====================================================================
// game.js — the conductor. Owns the world, runs the state machine, wires
// every system together each tick, and renders (with camera shake).
//
//   BOOT -> PLAYING -> ROOM_CLEAR -> (next room / next floor) -> ... -> WIN
//                 \-> DEAD (out of lives -> start all over)
//
// Each floor = 5 normal rooms + 1 boss room. Beating a boss sets a checkpoint
// (you respawn at the next floor). You have 3 lives; lose them all and it's
// back to the very beginning.
// =====================================================================

import { PLAYER, CAMERA, JUICE, ARENA, LIVES } from './config.js';
import { State } from './states.js';
import { makeRng } from './core/rng.js';
import { floorInfo, nextIsBoss, resolveDeath } from './core/progression.js';
import { Player } from './entities/player.js';
import { Ally } from './entities/ally.js';
import { Enemy } from './entities/enemies.js';
import { Bullets } from './entities/bullets.js';
import { dropRandomPickup, Pickup } from './entities/pickups.js';
import { Particles } from './systems/particles.js';
import { Juice } from './systems/juice.js';
import { buildRoom } from './systems/rooms.js';
import { populateRoom } from './systems/spawner.js';
import { resolveDecision } from './systems/npcDecision.js';
import { circleVsBox, circleVsCircle } from './core/math2d.js';
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
    this.pickups = [];
    this.walls = [];
    this.activeNpc = null;
    this.boss = null;
    this.room = null;
    this.roomIndex = 0;
    this.lives = LIVES.max;
    this.checkpointRoom = 0;
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
    this.lives = LIVES.max;
    this.checkpointRoom = 0;
    this.player.reset(0, ARENA.depth / 2 - 4); // full reset: hearts, weapon, buffs
    this.ally.reset(2, ARENA.depth / 2 - 3);
    this.loadRoom(0);
  }

  loadRoom(index) {
    this.roomIndex = index;
    this.boss = null;
    this._bossHandled = false;
    hud.hideBossHp();

    // clear out the previous room's actors
    for (const e of this.enemies) this.scene.remove(e.mesh);
    this.enemies = [];
    for (const n of this.npcs) {
      this.scene.remove(n.mesh);
      this.scene.remove(n.marker);
    }
    this.npcs = [];
    for (const p of this.pickups) this.scene.remove(p.mesh);
    this.pickups = [];
    this.activeNpc = null;
    this.bullets.clearAll();
    if (this.room) this.room.dispose();

    this.room = buildRoom(this.scene, this.rng);
    this.walls = this.room.walls;

    // place player at the bottom-center entrance
    this.player.x = 0;
    this.player.z = ARENA.depth / 2 - 4;
    this.player.mesh.position.set(this.player.x, 0, this.player.z);
    this.ally.reset(2, ARENA.depth / 2 - 3);

    populateRoom(this, index);
    this.boss = this.enemies.find((e) => e.isBoss) || null;

    this.state = State.PLAYING;
    hud.hideBanner();
    prompts.hide();
    this.refreshHud();

    const info = floorInfo(index);
    audio.setMusicFloor(info.floorIndex); // music gets tenser each floor
    if (info.isBossRoom && this.boss) {
      hud.banner(`${this.boss.name.toUpperCase()} — KILL IT`);
      setTimeout(() => hud.hideBanner(), 1600);
    }
  }

  refreshHud() {
    const info = floorInfo(this.roomIndex);
    hud.setHearts(this.player.hearts, PLAYER.maxHearts);
    hud.setLives(this.lives);
    hud.setRoom(info, this.player.weaponName);
  }

  addEnemy(e) {
    this.enemies.push(e);
  }

  /** spawn a pickup the player can walk over to grab */
  spawnPickup(type, x, z) {
    this.pickups.push(new Pickup(this.scene, type, x, z));
  }

  update(dt) {
    this.input.update(); // poll gamepad once per tick (edges for E/Q/R)

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
      this._handlePickups();
      this._handleSurvivors(dt);

      // boss died -> sweep its spiderlings so the room finishes cleanly
      if (this.boss && this.boss.dead && !this._bossHandled) {
        this._bossHandled = true;
        for (const e of this.enemies) {
          if (e !== this.boss && !e.dead) {
            this.scene.remove(e.mesh);
            e.dead = true;
          }
        }
      }
      this.enemies = this.enemies.filter((e) => !e.dead);

      if (this.boss && !this.boss.dead) hud.setBossHp(this.boss.hp / this.boss.maxHp, this.boss.name);

      if (!this.player.alive) this._onDeath();
      else if (this.enemies.length === 0) this._onRoomClear();
    } else if (this.state === State.ROOM_CLEAR) {
      this.player.update(dt, this);
      this.ally.update(dt, this);
      this.bullets.update(dt, this);
      this._handlePickups();
      this._checkDoor();
    }

    this.particles.update(dt);
    this.juice.update(dt);
  }

  _handlePickups() {
    const p = this.player;
    for (const item of this.pickups) {
      if (item.dead) continue;
      item.update(1 / 60);
      if (circleVsCircle(p.x, p.z, p.radius, item.x, item.z, item.radius)) {
        item.collect(this);
      }
    }
    this.pickups = this.pickups.filter((i) => !i.dead);
  }

  _handleSurvivors(dt) {
    let near = null;
    for (const n of this.npcs) {
      n.update(dt);
      if (!near && n.inRange(this.player)) near = n;
    }
    this.activeNpc = near;

    if (near) {
      prompts.show(`${near.name} is trapped!   [E] Help   ·   [Q] Leave`);
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

    // big, lingering feedback so the choice never goes unnoticed
    const label = (choice === 'HELP' ? 'HELPED: ' : 'LEFT THEM: ') + outcome.message;
    hud.banner(label);
    setTimeout(() => hud.hideBanner(), 1500);
    this.juice.hitStop(0.08);
    audio.play(outcome.good ? 'good' : 'bad');
    this.refreshHud();
  }

  _onRoomClear() {
    this.bullets.clearEnemyBullets();
    this.room.openDoor();
    audio.play('doorOpen');
    this.state = State.ROOM_CLEAR;
    prompts.hide();
    const info = floorInfo(this.roomIndex);

    if (info.isBossRoom) {
      hud.hideBossHp();
      audio.play('bossDie');
      // checkpoint: respawn at the next floor if you die from here on
      if (!info.isLastRoom) this.checkpointRoom = this.roomIndex + 1;
      hud.banner(info.isLastRoom ? 'BOSS DOWN — FINAL EXIT!' : 'BOSS DOWN — CHECKPOINT SAVED!');
      // boss always drops a great reward
      this.spawnPickup('HEAL', -2, 0);
      this.spawnPickup(dropRandomPickup(this.rng, true), 2, 0);
    } else {
      // normal room: drop a reward in the middle, warn if the boss is next
      audio.play('roomClear');
      this.spawnPickup(dropRandomPickup(this.rng, false), 0, 0);
      hud.banner(nextIsBoss(this.roomIndex) ? '⚠  BOSS AHEAD  ⚠' : 'ROOM CLEAR — RUN!');
    }
  }

  _checkDoor() {
    const p = this.player;
    if (this.room.door.active && circleVsBox(p.x, p.z, p.radius, this.room.door.box)) {
      if (floorInfo(this.roomIndex).isLastRoom) this._onWin();
      else this.loadRoom(this.roomIndex + 1);
    }
  }

  _onDeath() {
    const result = resolveDeath(this.lives, this.checkpointRoom);
    this.lives = result.lives;
    audio.play(result.action === 'GAMEOVER' ? 'gameover' : 'lifeLost');

    if (result.action === 'RESPAWN') {
      hud.banner(`LIFE LOST — ${this.lives} left`);
      setTimeout(() => hud.hideBanner(), 1400);
      this._respawnAtCheckpoint(result.room);
    } else {
      this.state = State.DEAD;
      hud.banner('GAME OVER  —  press R');
      prompts.hide();
    }
    this.refreshHud();
  }

  _respawnAtCheckpoint(room) {
    this.player.alive = true;
    this.player.hearts = PLAYER.maxHearts;
    this.player.invuln = 1.4;
    this.player.mesh.visible = true;
    this.loadRoom(room);
  }

  _onWin() {
    this.state = State.WIN;
    audio.play('win');
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
