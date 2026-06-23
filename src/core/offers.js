// =====================================================================
// offers.js — PURE generation of the room-clear "pick 1 of 3" upgrade offer (B9). No THREE, no
// game state — just (rng, ctx) -> cards, so it's deterministic + unit-testable.
//
// Per card: roll a TIER (weighted by config.OFFERS.tierWeights, with a soft/hard PITY floor on the
// first card), then pick a distinct ITEM of that tier from the core/items.js registry — down-weighting
// items offered recently and weapons you already own, and steering toward CATEGORY VARIETY so you
// rarely see three of the same kind. Self-contained (its own tier ladder incl. `ultra`) so it never
// disturbs the B8 ground-drop rarity engine (core/drops.js / config.PICKUPS.rarity).
// =====================================================================

import { OFFERS } from '../config.js';
import { TIERS, itemsByTier, blurbFor } from './items.js';

function tierIndex(t) {
  return TIERS.indexOf(t);
}

/**
 * The guaranteed floor tier for one card given the dry common-streak (soft + hard pity). Returns the
 * highest tier any rule implies, or null for no floor. PURE — the streak is tracked by the caller.
 */
export function pityFloorTier(commonStreak) {
  const { softPity, hardPity } = OFFERS;
  let floor = null;
  const raise = (t) => {
    if (!floor || tierIndex(t) > tierIndex(floor)) floor = t;
  };
  if (commonStreak >= softPity.rareAfter) raise('rare');
  if (commonStreak >= softPity.epicAfter) raise('epic');
  if (commonStreak >= hardPity.commonStreakMax) raise(hardPity.minTier);
  return floor;
}

/** weighted choice from [{value, weight}]; uniform fallback if every weight is 0. PURE (seeded rng). */
function weightedPick(rng, entries) {
  if (!entries.length) return null;
  const total = entries.reduce((s, e) => s + e.weight, 0);
  if (total <= 0) return entries[rng.int(entries.length)].value;
  let roll = rng.next() * total;
  for (const e of entries) {
    roll -= e.weight;
    if (roll <= 0) return e.value;
  }
  return entries[entries.length - 1].value;
}

/** roll a tier by weight, never below `minTier`, skipping empty tiers. */
function rollTier(rng, minTier) {
  const minIdx = minTier ? Math.max(0, tierIndex(minTier)) : 0;
  const entries = TIERS.filter((t, i) => i >= minIdx && (itemsByTier[t]?.length ?? 0) > 0).map(
    (t) => ({ value: t, weight: OFFERS.tierWeights[t] ?? 0 }),
  );
  return weightedPick(rng, entries);
}

/**
 * Pick a distinct item, anti-repeat-weighted. With `tier` set, picks within that tier (equal item
 * weights). Without `tier`, spans ALL tiers weighted by tier rarity — used for the variety card so it
 * can always reach another category. `avoidCat` is relaxed only if it would otherwise empty the pool.
 */
function pickItem(rng, { tier = null, chosen, recent, owned, avoidCat = null }) {
  const pools = tier ? [tier] : TIERS;
  const build = (useAvoid) => {
    const entries = [];
    for (const t of pools) {
      for (const it of itemsByTier[t] ?? []) {
        if (chosen.has(it.id)) continue;
        if (useAvoid && it.category === avoidCat) continue;
        let w = tier ? 1 : (OFFERS.tierWeights[t] ?? 0); // spanning tiers → weight by tier rarity
        if (!tier && w <= 0) w = 0.0001; // keep a zero-weight tier barely reachable when spanning
        if (recent.has(it.id)) w *= OFFERS.recentDecay;
        if (it.category === 'weapon' && owned.has(it.id)) w *= OFFERS.ownedWeaponDecay;
        entries.push({ value: it, weight: w });
      }
    }
    return entries;
  };
  let entries = avoidCat ? build(true) : build(false);
  if (!entries.length) entries = build(false); // relax category-variety rather than return nothing
  return weightedPick(rng, entries);
}

/**
 * Generate the offer: `OFFERS.cardCount` distinct cards. PURE + seeded (ADR-0013) → reproducible.
 * @param {{next:()=>number, int:(n:number)=>number}} rng
 * @param {{owned?: Iterable<string>, recent?: Iterable<string>, stacks?: Record<string,number>,
 *          commonStreak?: number}} [ctx]
 *   owned = weapon ids already carried; recent = recently-offered ids; stacks = id->count (for the
 *   marginal "+X%" blurb); commonStreak = dry-streak of commons taken (drives pity).
 * @returns {Array<{id:string, name:string, category:string, tier:string, blurb:string}>}
 */
export function generateOffer(rng, ctx = {}) {
  const owned = ctx.owned instanceof Set ? ctx.owned : new Set(ctx.owned ?? []);
  const recent = ctx.recent instanceof Set ? ctx.recent : new Set(ctx.recent ?? []);
  const stacksOf = ctx.stacks ?? {};
  const floor = pityFloorTier(ctx.commonStreak ?? 0);

  const chosen = new Set();
  const catCount = {};
  const cards = [];

  for (let i = 0; i < OFFERS.cardCount; i++) {
    const overCat = OFFERS.categoryVariety
      ? Object.keys(catCount).find((c) => catCount[c] >= OFFERS.cardCount - 1)
      : null;
    let item;
    if (overCat) {
      // variety guard: span every tier so we can always reach a different category
      item = pickItem(rng, { chosen, recent, owned, avoidCat: overCat });
    } else {
      const tier = rollTier(rng, i === 0 ? floor : null) ?? rollTier(rng, null);
      item = tier ? pickItem(rng, { tier, chosen, recent, owned }) : null;
    }
    if (!item) item = pickItem(rng, { chosen, recent, owned }); // last-ditch: any not-chosen item
    if (!item) break; // registry exhausted (won't happen at the current size)

    chosen.add(item.id);
    catCount[item.category] = (catCount[item.category] ?? 0) + 1;
    cards.push({
      id: item.id,
      name: item.name,
      category: item.category,
      tier: item.tier,
      blurb: blurbFor(item, { stacks: stacksOf[item.id] ?? 0 }),
    });
  }
  return cards;
}
