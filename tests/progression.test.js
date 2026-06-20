import { describe, it, expect } from 'vitest';
import {
  floorInfo,
  nextIsBoss,
  resolveDeath,
  roomsPerFloor,
  totalRooms,
  floorCount,
} from '../src/core/progression.js';

describe('progression.floorInfo', () => {
  it('first floor: rooms 0-8 normal, room 9 is the boss', () => {
    for (let r = 0; r <= 8; r++) {
      const info = floorInfo(r);
      expect(info.floorIndex).toBe(0);
      expect(info.roomInFloor).toBe(r);
      expect(info.isBossRoom).toBe(false);
    }
    const boss = floorInfo(9);
    expect(boss.isBossRoom).toBe(true);
    expect(boss.floorIndex).toBe(0);
  });

  it('second floor starts at room 10', () => {
    const info = floorInfo(10);
    expect(info.floorIndex).toBe(1);
    expect(info.roomInFloor).toBe(0);
    expect(info.isBossRoom).toBe(false);
  });

  it('only the final floor boss is the last room', () => {
    const lastRoomIndex = totalRooms() - 1;
    expect(floorInfo(lastRoomIndex).isLastRoom).toBe(true);
    expect(floorInfo(9).isLastRoom).toBe(floorCount() === 1); // not last unless single floor
  });

  it('roomsPerFloor = 9 normal rooms + 1 boss', () => {
    expect(roomsPerFloor()).toBe(10);
  });
});

describe('progression.nextIsBoss', () => {
  it('flags the room right before a boss room', () => {
    expect(nextIsBoss(8)).toBe(true); // room 9 is boss
    expect(nextIsBoss(7)).toBe(false);
    expect(nextIsBoss(9)).toBe(false); // already the boss room
  });
});

describe('progression.resolveDeath', () => {
  it('respawns at the checkpoint while lives remain', () => {
    expect(resolveDeath(3, 10)).toEqual({ lives: 2, action: 'RESPAWN', room: 10 });
    expect(resolveDeath(2, 10)).toEqual({ lives: 1, action: 'RESPAWN', room: 10 });
  });

  it('the 3rd death is game over (start all over)', () => {
    expect(resolveDeath(1, 10)).toEqual({ lives: 0, action: 'GAMEOVER', room: 0 });
  });
});
