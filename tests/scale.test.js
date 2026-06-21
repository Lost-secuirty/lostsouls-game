import { describe, it, expect } from 'vitest';
import { ARENA, CAMERA, PLAYER, ALLY, ENEMY, BOSS } from '../src/config.js';

// Stage 6 / ADR-0020 — locks the "scale pass" intent so a future edit can't quietly
// undo it: a roomier arena, a camera sized to fit it, and a clear size ladder
// (player < basic mob < boss). Pure config — no THREE.

describe('ARENA (Stage 6 roomier playfield)', () => {
  it('is meaningfully bigger than the old 40x30 floor (~2.5x the area)', () => {
    const area = ARENA.width * ARENA.depth;
    expect(area).toBeGreaterThanOrEqual(2 * (40 * 30)); // clearly bigger, not a fluke
    expect(area).toBeLessThan(4 * (40 * 30)); // ...but not absurd
  });

  it('the door gap stays smaller than the wall it sits in', () => {
    expect(ARENA.doorWidth).toBeGreaterThan(0);
    expect(ARENA.doorWidth).toBeLessThan(ARENA.width);
  });
});

describe('CAMERA fits the arena', () => {
  it('sits far enough back to frame the whole room (scales with ARENA)', () => {
    const camDist = Math.hypot(CAMERA.back, CAMERA.height);
    // the camera must be at least as far as the arena is big, or the room clips
    expect(camDist).toBeGreaterThanOrEqual(Math.max(ARENA.width, ARENA.depth) * 0.7);
  });
});

describe('size ladder: player < basic mob < boss (threat reads by size)', () => {
  it('player and ally share the smallest collision radius', () => {
    expect(PLAYER.radius).toBe(ALLY.radius);
  });

  it('basic mobs are at least as big as the player, chaser < shooter', () => {
    expect(ENEMY.chaser.radius).toBeGreaterThanOrEqual(PLAYER.radius);
    expect(ENEMY.shooter.radius).toBeGreaterThan(ENEMY.chaser.radius);
  });

  it('every boss is bigger than the biggest basic mob', () => {
    const biggestMob = Math.max(ENEMY.chaser.radius, ENEMY.shooter.radius);
    for (const [name, b] of Object.entries(BOSS)) {
      expect(b.radius, `${name} should out-size basic mobs`).toBeGreaterThan(biggestMob);
    }
  });
});
