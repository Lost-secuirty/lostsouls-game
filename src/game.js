// =====================================================================
// game.js — the conductor. Owns the world, runs the state machine, wires
// every system together each tick, and renders (with camera shake).
//
//   BOOT -> (start menu) -> PLAYING -> ROOM_CLEAR -> ... -> WIN
//                                  \-> DEAD (out of lives -> start over)
//
// Single-player: you (blue) + an AI ally (green). Co-op: P1 = you (keyboard,
// blue), P2 = the ally (Xbox controller, green). In co-op a downed player
// revives when the room is cleared; Game Over only on a full wipe.
// =====================================================================

import { PLAYER, CAMERA, JUICE, ARENA, CAPS, PALETTE } from './config.js';
import { State } from './states.js';
import { makeRng } from './core/rng.js';
import { floorInfo, nextIsBoss, resolveDeath, weaponSlotsForBosses } from './core/progression.js';
import { Player } from './entities/player.js';
import { Ally } from './entities/ally.js';
import { Enemy } from './entities/enemies.js';
import { Bullets } from './entities/bullets.js';
import { Hazards } from './systems/hazards.js';
import { dropRandomPickup, Pickup } from './entities/pickups.js';
import { Particles } from './systems/particles.js';
import { Juice } from './systems/juice.js';
import { buildRoom } from './systems/rooms.js';
import { populateRoom } from './systems/spawner.js';
import { resolveDecision } from './systems/npcDecision.js';
import { resolveHuman } from './systems/humanDecision.js';
import { circleVsBox, circleVsCircle } from './core/math2d.js';
import { hud } from './ui/hud.js';
import { prompts } from './ui/prompts.js';
import { showHumanChoice, moveChoiceFocus, confirmChoice } from './ui/humanchoice.js';
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
    this.bosses = []; // 0, 1, or 2 bosses in a boss room (the duo = 2)
    this.duo = null; // DuoController when a multi-boss floor is loaded
    this.room = null;
    this.roomIndex = 0;
    this.lives = CAPS.lives.start;
    this.checkpointRoom = 0;
    this.bossesBeaten = 0; // drives weapon-slot unlocks
    this.godMode = false; // debug menu toggle

    this.coop = false;
    this.players = []; // [p1] or [p1, p2]
    this.player = null; // = players[0]
    this.player2 = null;
    this.ally = null; // AI ally (single-player only)
    this.state = State.BOOT;
  }

  init() {
    audio.registerDefaultSounds();
    this.particles = new Particles(this.scene);
    this.juice = new Juice();
    this.bullets = new Bullets(this.scene);
    this.hazards = new Hazards(this.scene);
    // players are created in startRun (which the start menu calls)
  }

  startRun(coop = false, seed = (Math.random() * 1e9) | 0) {
    this.coop = coop;
    // Seed defaults to random per run; pass a fixed seed to make a run
    // reproducible (e.g. window.__game.startRun(false, 12345)) — ADR-0013.
    this.rng = makeRng(seed);
    this.lives = CAPS.lives.start;
    this.checkpointRoom = 0;
    this.bossesBeaten = 0;

    this._teardownActors();
    this.player = new Player(this.scene, {
      color: PALETTE.player,
      modelKey: 'player',
      device: coop ? 'kb' : 'both',
    });
    if (coop) {
      this.player2 = new Player(this.scene, {
        color: PALETTE.ally,
        modelKey: 'ally',
        device: 'pad',
      });
      this.players = [this.player, this.player2];
    } else {
      this.ally = new Ally(this.scene);
      this.players = [this.player];
    }
    hud.setCoop(coop);
    this.loadRoom(0);
  }

  _teardownActors() {
    if (this.player) this.scene.remove(this.player.mesh);
    if (this.player2) this.scene.remove(this.player2.mesh);
    if (this.ally) this.scene.remove(this.ally.mesh);
    this.player = null;
    this.player2 = null;
    this.ally = null;
  }

  /** closest living player to a point (null if everyone is down) */
  nearestPlayer(x, z) {
    let best = null;
    let bd = Infinity;
    for (const p of this.players) {
      if (!p.alive) continue;
      const d = (p.x - x) ** 2 + (p.z - z) ** 2;
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }

  loadRoom(index) {
    this.roomIndex = index;
    this.bosses = [];
    this.duo = null; // re-created by the spawner if this is a multi-boss room
    this._bossHandled = false;
    hud.hideBossBars();

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
    this.hazards.clearAll();
    if (this.room) this.room.dispose();

    this.room = buildRoom(this.scene, this.rng);
    this.walls = this.room.walls;

    // place players at the bottom entrance (spread out in co-op)
    this.players.forEach((pl, i) => {
      pl.x = this.players.length > 1 ? (i === 0 ? -2.5 : 2.5) : 0;
      pl.z = ARENA.depth / 2 - 4;
      pl.mesh.position.set(pl.x, 0, pl.z);
      pl.mesh.visible = true;
    });
    if (this.ally) this.ally.reset(2, ARENA.depth / 2 - 3);

    populateRoom(this, index);
    this.bosses = this.enemies.filter((e) => e.isBoss);

    this.state = State.PLAYING;
    hud.hideBanner();
    prompts.hide();
    this.refreshHud();

    const info = floorInfo(index);
    audio.setMusicFloor(info.floorIndex); // music gets tenser each floor
    if (info.isBossRoom && info.def.boss === 'human') {
      // decision-boss: pause for the A/B/C/D approach choice BEFORE any fight
      this.state = State.HUMAN_CHOICE;
      showHumanChoice((choice) => this._onHumanChoice(choice));
    } else if (info.isBossRoom && this.bosses.length) {
      const names = this.bosses.map((b) => b.name).join(' & ');
      hud.banner(`${names.toUpperCase()} — ${this.bosses.length > 1 ? 'KILL THEM' : 'KILL IT'}`);
      setTimeout(() => hud.hideBanner(), 1600);
    }
  }

  refreshHud() {
    const info = floorInfo(this.roomIndex);
    hud.setHearts(this.player.hearts, PLAYER.maxHearts);
    if (this.coop && this.player2) hud.setHearts2(this.player2.hearts, PLAYER.maxHearts);
    hud.setLives(this.lives);
    hud.setRoom(info, this._weaponLabel(this.player));
  }

  _weaponLabel(p) {
    return p.slotsUnlocked > 1
      ? `${p.weaponName} [${p.slotIndex + 1}/${p.slotsUnlocked}]`
      : p.weaponName;
  }

  addEnemy(e) {
    this.enemies.push(e);
  }

  /** spawn a pickup a player can walk over to grab */
  spawnPickup(type, x, z) {
    this.pickups.push(new Pickup(this.scene, type, x, z));
  }

  update(dt) {
    this.input.update(); // poll gamepad once per tick

    // restart from a finished run
    if ((this.state === State.DEAD || this.state === State.WIN) && this.input.consumeRestart()) {
      this.startRun(this.coop);
      return;
    }

    if (this.state === State.PLAYING) {
      for (const pl of this.players) if (pl.alive) pl.update(dt, this);
      if (this.ally) this.ally.update(dt, this);
      if (this.duo) this.duo.update(dt); // alternating aggression + enrage-on-death
      for (const e of this.enemies) e.update(dt, this);
      this.bullets.update(dt, this);
      this.hazards.update(dt, this);
      this._handlePickups();
      this._handleSurvivors(dt);

      // ALL bosses dead -> sweep their minions so the room finishes cleanly
      if (this.bosses.length && this.bosses.every((b) => b.dead) && !this._bossHandled) {
        this._bossHandled = true;
        for (const e of this.enemies) {
          if (!e.isBoss && !e.dead) {
            this.scene.remove(e.mesh);
            e.dead = true;
          }
        }
      }
      this.enemies = this.enemies.filter((e) => !e.dead);

      if (this.bosses.length && this.bosses.some((b) => !b.dead)) hud.setBossBars(this.bosses);

      const wipe = !this.players.some((p) => p.alive);
      if (this.coop ? wipe : !this.player.alive) this._onDefeat();
      else if (this.enemies.length === 0) this._onRoomClear();
    } else if (this.state === State.ROOM_CLEAR) {
      for (const pl of this.players) if (pl.alive) pl.update(dt, this);
      if (this.ally) this.ally.update(dt, this);
      this.bullets.update(dt, this);
      this._handlePickups();
      this._handleSurvivors(dt); // survivors stay helpable after the fight is over
      this._checkDoor();
    } else if (this.state === State.HUMAN_CHOICE) {
      // fight is paused while the overlay is up; just drive the gamepad cursor
      // (mouse + keyboard are handled inside ui/humanchoice.js)
      const mv = this.input.move('pad');
      if (mv.x > 0.5 && !this._choiceLatch) {
        moveChoiceFocus(1);
        this._choiceLatch = true;
      } else if (mv.x < -0.5 && !this._choiceLatch) {
        moveChoiceFocus(-1);
        this._choiceLatch = true;
      } else if (Math.abs(mv.x) < 0.3) {
        this._choiceLatch = false;
      }
      if (this.input.consumeHelp('pad')) confirmChoice();
    }

    this.particles.update(dt);
    this.juice.update(dt);
  }

  _handlePickups() {
    for (const item of this.pickups) {
      if (item.dead) continue;
      item.update(1 / 60);
      for (const pl of this.players) {
        if (!pl.alive) continue;
        // a full-health player can't pick up a heart (leave it for a hurt teammate)
        if (item.type === 'HEAL' && pl.hearts >= PLAYER.maxHearts) continue;
        if (circleVsCircle(pl.x, pl.z, pl.radius, item.x, item.z, item.radius)) {
          item.collect(this, pl);
          break;
        }
      }
    }
    this.pickups = this.pickups.filter((i) => !i.dead);
  }

  _handleSurvivors(dt) {
    let near = null;
    for (const n of this.npcs) {
      n.update(dt);
      if (!near && this.players.some((p) => p.alive && n.inRange(p))) near = n;
    }
    this.activeNpc = near;

    if (near) {
      prompts.show(`${near.name} is trapped!   [E] Help   ·   [Q] Leave`);
      if (this.input.consumeHelp('both')) this._resolveSurvivor(near, 'HELP');
      else if (this.input.consumeLeave('both')) this._resolveSurvivor(near, 'LEAVE');
    } else {
      prompts.hide();
      this.input.consumeHelp('both'); // drop stray presses
      this.input.consumeLeave('both');
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
      const pl = this.nearestPlayer(npc.x, npc.z) || this.player;
      pl.applyEffect(outcome.effect, outcome.magnitude, this);
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
    // co-op: revive any downed teammate now that it's safe
    if (this.coop) {
      for (const pl of this.players) if (!pl.alive) pl.revive(pl.x, pl.z);
      this.refreshHud();
    }

    this.bullets.clearEnemyBullets();
    this.hazards.clearAll();
    this.room.openDoor();
    audio.play('doorOpen');
    this.state = State.ROOM_CLEAR;
    prompts.hide();
    const info = floorInfo(this.roomIndex);

    if (info.isBossRoom) {
      hud.hideBossBars();
      audio.play('bossDie');
      this.input.rumble(0.8, 0.6, 300); // boss-down rumble
      this._countBossBeaten();
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

  /** the player picked an approach at the human decision-boss (A/B/C/D) */
  _onHumanChoice(choice) {
    const outcome = resolveHuman(this.rng, choice); // seeded (ADR-0013)
    hud.toast(outcome.message, outcome.right);
    audio.play(outcome.right ? 'good' : 'bad');
    if (outcome.right) {
      this._resolveHumanSkip(); // he waves you through — skip the fight, keep the reward
    } else {
      this.state = State.PLAYING; // he panics — the fight is on
      audio.play(this.bosses[0]?.behavior?.roar ?? 'bossRoar');
    }
  }

  /** right read: clear the un-fought human and run the normal boss-clear reward */
  _resolveHumanSkip() {
    for (const b of this.bosses) {
      if (!b.dead) {
        this.scene.remove(b.mesh);
        b.dead = true;
      }
    }
    this._bossHandled = true; // boss is gone; don't let any PLAYING sweep re-fire
    this.enemies = this.enemies.filter((e) => !e.dead);
    this._onRoomClear(); // grants the weapon slot + checkpoint + open door, like any boss clear
  }

  _checkDoor() {
    const atDoor =
      this.room.door.active &&
      this.players.some((p) => p.alive && circleVsBox(p.x, p.z, p.radius, this.room.door.box));
    if (atDoor) {
      if (floorInfo(this.roomIndex).isLastRoom) this._onWin();
      else this.loadRoom(this.roomIndex + 1);
    }
  }

  /** a player went down (1P) or the whole team wiped (co-op) */
  _onDefeat() {
    const result = resolveDeath(this.lives, this.checkpointRoom);
    this.lives = result.lives;
    audio.play(result.action === 'GAMEOVER' ? 'gameover' : 'lifeLost');

    if (result.action === 'RESPAWN') {
      hud.banner(`${this.coop ? 'TEAM DOWN' : 'LIFE LOST'} — ${this.lives} left`);
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
    for (const pl of this.players) pl.revive(0, 0);
    this.loadRoom(room);
  }

  /** a boss fell — bump the count and unlock a weapon slot at the right milestones */
  _countBossBeaten() {
    this.bossesBeaten += 1;
    const slots = weaponSlotsForBosses(this.bossesBeaten);
    if (slots > this.player.slotsUnlocked) {
      for (const pl of this.players) pl.setSlotsUnlocked(slots);
      hud.toast(`WEAPON SLOT UNLOCKED! (${slots})`, true);
    }
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
