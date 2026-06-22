import { describe, it, expect } from 'vitest';
import { makeRng } from '../src/core/rng.js';
import { rollDrop, rarityBand, pityMinTier } from '../src/core/drops.js';
import { PICKUPS } from '../src/config.js';
import { resolveDecision } from '../src/systems/npcDecision.js';

// Cross-system determinism: the game's RANDOM LOGIC (not its rendering) must be
// fully reproducible from a single seed. Per-system tests already cover drops
// and survivor outcomes in isolation; this drives the REAL production functions
// through ONE shared rng, in game order, and checks the whole run is stable.
// That stability is what makes a seeded run replayable (see startRun(seed) +
// window.__game) — ADR-0013.
//
// Note: room *population* (populateRoom) is render-coupled (it builds Enemy/
// Boss/Npc with the scene), so it can't run headless. We exercise the pure,
// rng-consuming production seams the run actually uses: the rarity drop roll
// (core/drops.js, incl. floor band + hard pity, exactly as game.js calls it) and
// resolveDecision, plus the shooter/chaser spawn roll (rng.chance(0.4)).

function runTranscript(seed, { rooms = 20 } = {}) {
  const rng = makeRng(seed);
  const log = [];
  let commonStreak = 0; // mirrors game.js hard-pity counter
  for (let r = 0; r < rooms; r++) {
    const floorIndex = Math.floor(r / 10); // 9 normal + 1 boss per floor (progression.js)
    const isBoss = (r + 1) % 10 === 0;
    if (isBoss) {
      log.push(`boss-reward:${rollDrop(rng, PICKUPS.rarity.bossChestWeights).type}`);
    } else {
      // a couple of enemy spawn-type rolls, a rarity drop (floor-banded + pity), and a decision
      log.push(`spawn:${rng.chance(0.4) ? 'shooter' : 'chaser'}`);
      log.push(`spawn:${rng.chance(0.4) ? 'shooter' : 'chaser'}`);
      const weights = PICKUPS.rarity.regularChestWeights[rarityBand(floorIndex)];
      const drop = rollDrop(rng, weights, { minTier: pityMinTier(commonStreak) });
      commonStreak = drop.tier === PICKUPS.rarity.tiers[0] ? commonStreak + 1 : 0;
      log.push(`drop:${drop.type}`);
      const choice = rng.chance(0.5) ? 'HELP' : 'LEAVE';
      log.push(`npc:${choice}:${JSON.stringify(resolveDecision(rng, choice))}`);
    }
  }
  return log;
}

describe('seeded run determinism (cross-system)', () => {
  it('the same seed reproduces an identical run transcript', () => {
    expect(runTranscript(2026)).toEqual(runTranscript(2026));
  });

  it('different seeds produce different runs', () => {
    expect(runTranscript(2026)).not.toEqual(runTranscript(2027));
  });

  it('the transcript is non-trivial (every system actually consumed the rng)', () => {
    const t = runTranscript(2026);
    expect(t.length).toBeGreaterThan(20);
    expect(t.some((x) => x.startsWith('boss-reward:'))).toBe(true);
    expect(t.some((x) => x.startsWith('spawn:'))).toBe(true);
    expect(t.some((x) => x.startsWith('drop:'))).toBe(true);
    expect(t.some((x) => x.startsWith('npc:'))).toBe(true);
  });
});
