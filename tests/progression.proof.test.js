import { describe, expect, it } from 'vitest';
import { floorInfo, nextIsBoss, resolveDeath, totalRooms } from '../src/core/progression.js';

describe('progression proof controls', () => {
  it('proves boss-room boundaries are exact and not off by one', () => {
    expect(nextIsBoss(4)).toBe(true);
    expect(floorInfo(5).isBossRoom).toBe(true);
    expect(nextIsBoss(5)).toBe(false);
  });

  it('proves only the final boss room is marked last room', () => {
    expect(floorInfo(totalRooms() - 1).isLastRoom).toBe(true);
    expect(floorInfo(totalRooms() - 2).isLastRoom).toBe(false);
  });

  it('proves game-over resets to room zero only when lives are gone', () => {
    expect(resolveDeath(2, 6)).toEqual({ lives: 1, action: 'RESPAWN', room: 6 });
    expect(resolveDeath(1, 6)).toEqual({ lives: 0, action: 'GAMEOVER', room: 0 });
  });
});
