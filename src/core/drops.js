// =====================================================================
// drops.js — PURE rarity-tier drop selection + hard pity (B8, research report (4)).
//
// The per-room reward rolls a TIER (floor-scaled weights, descending falloff deeper in the run),
// then a uniform TYPE within that tier. A "hard pity" floor guarantees a rare+ once the player has
// drawn too many commons in a row — so a young player never reads a run as "mean" (the research's
// anti-frustration rule). No THREE / no game state: lives in core/ so it's unit-testable and the
// THREE-backed Pickup (entities/pickups.js) just consumes `type`. Seeded via the game rng (ADR-0013)
// → reproducible + chi-square testable, exactly like the old flat drop table it replaces.
// =====================================================================

import { PICKUPS } from '../config.js';

const RARITY = PICKUPS.rarity;

/** the rarity tier of a pickup type (unlisted types fall back to the lowest tier). */
export function rarityOf(type) {
  return RARITY.itemRarity[type] ?? RARITY.tiers[0];
}

/** tier -> [types], derived once from itemRarity (so the two never drift apart). */
export const typesByTier = (() => {
  const m = {};
  for (const t of RARITY.tiers) m[t] = [];
  for (const [type, tier] of Object.entries(RARITY.itemRarity)) {
    (m[tier] ??= []).push(type);
  }
  return m;
})();

/**
 * Which normal-chest weight band a floor uses. Floors at/after each `bandEdges` value bump up a
 * band (rarer drops deeper in the run), clamped to the number of weight rows. PURE.
 */
export function rarityBand(floorIndex) {
  let band = 0;
  for (const edge of RARITY.bandEdges) if (floorIndex >= edge) band++;
  return Math.min(band, RARITY.regularChestWeights.length - 1);
}

/**
 * Hard pity: once `commonStreak` consecutive common drops have been drawn, return the forced floor
 * tier (`minTier`); otherwise null (no floor). PURE — the streak itself is tracked by the caller.
 */
export function pityMinTier(commonStreak) {
  return commonStreak >= RARITY.hardPity.commonStreakMax ? RARITY.hardPity.minTier : null;
}

/**
 * Roll a drop `{type, tier}` from a tier-weight map (e.g. a `regularChestWeights` row or
 * `bossChestWeights`): pick a tier by weight, then a uniform type within it. `minTier` removes every
 * tier below it (hard pity). Empty tiers are skipped; if every eligible weight is 0 it falls back to
 * a uniform tier pick so it can never return undefined. Seeded via `rng` (ADR-0013). PURE.
 * @param {{next:()=>number, int:(n:number)=>number}} rng
 * @param {Record<string,number>} weights tier -> weight
 * @param {{minTier?: string|null}} [opts]
 * @returns {{type:string, tier:string}}
 */
export function rollDrop(rng, weights, { minTier = null } = {}) {
  const tiers = RARITY.tiers;
  const minIdx = minTier ? Math.max(0, tiers.indexOf(minTier)) : 0;
  const eligible = tiers.filter((t, i) => i >= minIdx && (typesByTier[t]?.length ?? 0) > 0);

  const total = eligible.reduce((s, t) => s + (weights[t] ?? 0), 0);
  let chosen;
  if (total > 0) {
    let roll = rng.next() * total;
    chosen = eligible[eligible.length - 1]; // last-bucket fallback for float drift
    for (const t of eligible) {
      roll -= weights[t] ?? 0;
      if (roll <= 0) {
        chosen = t;
        break;
      }
    }
  } else {
    chosen = eligible[rng.int(eligible.length)]; // no weights configured → uniform among eligible
  }

  const pool = typesByTier[chosen];
  return { type: pool[rng.int(pool.length)], tier: chosen };
}
