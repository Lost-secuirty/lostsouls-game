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
  it('first floor: rooms 0-4 normal, room 5 is the boss', () => {
    for (let r = 0; r <= 4; r++) {
      const info = floorInfo(r);
      expect(info.floorIndex).toBe(0);
      expect(info.roomInFloor).toBe(r);
      expect(info.isBossRoom).toBe(false);
    }
    const boss = floorInfo(5);
    expect(boss.isBossRoom).toBe(true);
    expect(boss.floorIndex).toBe(0);
  });

  it('second floor starts at room 6', () => {
    const info = floorInfo(6);
    expect(info.floorIndex).toBe(1);
    expect(info.roomInFloor).toBe(0);
    expect(info.isBossRoom).toBe(false);
  });

  it('only the final floor boss is the last room', () => {
    const lastRoomIndex = totalRooms() - 1;
    expect(floorInfo(lastRoomIndex).isLastRoom).toBe(true);
    expect(floorInfo(5).isLastRoom).toBe(floorCount() === 1); // not last unless single floor
  });

  it('roomsPerFloor = normal rooms + 1 boss', () => {
    expect(roomsPerFloor()).toBe(6);
  });
});

describe('progression.nextIsBoss', () => {
  it('flags the room right before a boss room', () => {
    expect(nextIsBoss(4)).toBe(true); // room 5 is boss
    expect(nextIsBoss(3)).toBe(false);
    expect(nextIsBoss(5)).toBe(false); // already the boss room
  });
});

describe('progression.resolveDeath', () => {
  it('respawns at the checkpoint while lives remain', () => {
    expect(resolveDeath(3, 6)).toEqual({ lives: 2, action: 'RESPAWN', room: 6 });
    expect(resolveDeath(2, 6)).toEqual({ lives: 1, action: 'RESPAWN', room: 6 });
  });

  it('the 3rd death is game over (start all over)', () => {
    expect(resolveDeath(1, 6)).toEqual({ lives: 0, action: 'GAMEOVER', room: 0 });
  });
});
