import { describe, it, expect } from 'vitest';
import { multiArmSpiral, layeredFlower } from '../src/entities/bosses/emitters.js';
import { turnRateHomingVelocity } from '../src/core/homingMath.js';

const TAU = Math.PI * 2;

describe('emitter generators (B6)', () => {
  it('multiArmSpiral returns arms*perArm angles, arms evenly spaced, stepped within an arm', () => {
    const a = multiArmSpiral(3, 4, 0, 0.2);
    expect(a.length).toBe(12);
    expect(a[4] - a[0]).toBeCloseTo(TAU / 3); // arm 1 vs arm 0
    expect(a[8] - a[4]).toBeCloseTo(TAU / 3); // arm 2 vs arm 1
    expect(a[1] - a[0]).toBeCloseTo(0.2); // step within an arm
  });

  it('multiArmSpiral handles arms=0 without divide-by-zero', () => {
    expect(() => multiArmSpiral(0, 3)).not.toThrow();
  });

  it('layeredFlower sums per-layer counts (8 + 10 + 12 = 30)', () => {
    expect(layeredFlower(3, 8, 0.1, 2).length).toBe(30);
  });

  it('generators are reproducible (pure)', () => {
    expect(multiArmSpiral(2, 3, 0.5, 0.2)).toEqual(multiArmSpiral(2, 3, 0.5, 0.2));
    expect(layeredFlower(2, 6, 0.1)).toEqual(layeredFlower(2, 6, 0.1));
  });
});

describe('turnRateHomingVelocity (B6 homing extraction)', () => {
  const speed = 10;

  it('preserves the bullet speed (magnitude == speed)', () => {
    const v = turnRateHomingVelocity({ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 5, z: 5 }, 1 / 60, {
      speed,
      turnRate: 5,
    });
    expect(Math.hypot(v.x, v.z)).toBeCloseTo(speed);
  });

  it('clamps the turn to turnRate*dt (no instant snap onto a perpendicular target)', () => {
    const dt = 1 / 60;
    const turnRate = 2;
    const v = turnRateHomingVelocity({ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 100, z: 0 }, dt, {
      speed,
      turnRate,
    });
    const newAngle = Math.atan2(v.x, v.z); // was 0 (heading +z)
    expect(newAngle).toBeGreaterThan(0); // turned toward +x
    expect(newAngle).toBeLessThanOrEqual(turnRate * dt + 1e-9); // but capped
  });

  it('curves toward the target over many steps', () => {
    let pos = { x: 0, z: 0 };
    let vel = { x: 0, z: 1 };
    const target = { x: 50, z: 0 };
    for (let i = 0; i < 120; i++) {
      vel = turnRateHomingVelocity(pos, vel, target, 1 / 60, { speed, turnRate: 4 });
      pos = { x: pos.x + vel.x / 60, z: pos.z + vel.z / 60 };
    }
    expect(vel.x).toBeGreaterThan(Math.abs(vel.z)); // now heading mostly toward +x
  });
});
