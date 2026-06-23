// =====================================================================
// items.js — the canonical OFFERABLE-ITEM registry (B9). PURE: no THREE, no game state.
//
// One entry per thing the room-clear offer screen can hand you, across three CATEGORIES:
//   'upgrade' — player passives (damage / fire-rate / move-speed / max-life / guard / dmg-reduction)
//   'mod'     — weapon mods that buff your guns via the existing BULLET behavior flags
//   'weapon'  — the guns themselves (the 8 in config.WEAPONS)
// Each item is graded into a rarity TIER (common < rare < epic < ultra). `core/offers.js` pools from
// here; `blurbFor` renders the card's exact effect line (the marginal % of the next pick, so the
// player sees the honest delta — not the running total). Keeping this here (not in the THREE-backed
// entities/pickups.js) keeps it unit-testable and one source of truth for the offer system.
// =====================================================================

import { UPGRADES, DAMAGE_REDUCTION, GUARD, WEAPON_MODS, PICKUPS } from '../config.js';
import { marginalBonus } from './scaling.js';

/** rarity tiers, low → high (the offer system's own ladder; adds `ultra` for the guard). */
export const TIERS = ['common', 'rare', 'epic', 'ultra'];

/** the three offer categories. */
export const CATEGORIES = ['upgrade', 'mod', 'weapon'];

const STAT_LABEL = { damage: 'damage', fireRate: 'fire rate', speed: 'move speed' };

// The registry. `effect` is a small descriptor the live code (B9b) reads to apply the pick; `tags`
// drive future synergy/anti-repeat scoring. Weapon tiers mirror B8's PICKUPS.rarity.itemRarity.
export const ITEMS = [
  // --- player upgrades ---
  {
    id: 'DAMAGE_UP',
    name: 'Damage Up',
    category: 'upgrade',
    tier: 'common',
    tags: ['offense'],
    effect: { kind: 'stat', stat: 'damage' },
  },
  {
    id: 'FIRE_RATE_UP',
    name: 'Faster Shots',
    category: 'upgrade',
    tier: 'common',
    tags: ['offense', 'rapid'],
    effect: { kind: 'stat', stat: 'fireRate' },
  },
  {
    id: 'SPEED_UP',
    name: 'Speed Up',
    category: 'upgrade',
    tier: 'common',
    tags: ['mobility'],
    effect: { kind: 'stat', stat: 'speed' },
  },
  {
    id: 'HEAL',
    name: 'Heal',
    category: 'upgrade',
    tier: 'common',
    tags: ['sustain'],
    effect: { kind: 'heal', amount: PICKUPS.healAmount },
  },
  {
    id: 'MAX_HP_UP',
    name: 'Max Life Up',
    category: 'upgrade',
    tier: 'rare',
    tags: ['sustain'],
    effect: { kind: 'maxLife', amount: 1 },
  },
  {
    id: 'DMG_REDUCT',
    name: 'Tough Hide',
    category: 'upgrade',
    tier: 'rare',
    tags: ['defense'],
    effect: { kind: 'damageReduction' },
  },
  {
    id: 'GUARD',
    name: 'Guard',
    category: 'upgrade',
    tier: 'rare',
    tags: ['defense'],
    effect: { kind: 'guard', charges: GUARD.rareCharges },
  },
  {
    id: 'GREATER_GUARD',
    name: 'Greater Guard',
    category: 'upgrade',
    tier: 'ultra',
    tags: ['defense'],
    effect: { kind: 'guard', charges: GUARD.ultraCharges },
  },

  // --- weapon mods (reuse the existing bullet flags) ---
  {
    id: 'MOD_PIERCE',
    name: 'Piercing Rounds',
    category: 'mod',
    tier: 'rare',
    tags: ['weapon', 'pierce'],
    effect: { kind: 'mod', flag: 'pierce', amount: WEAPON_MODS.pierce },
  },
  {
    id: 'MOD_BOUNCE',
    name: 'Ricochet',
    category: 'mod',
    tier: 'rare',
    tags: ['weapon', 'bounce'],
    effect: { kind: 'mod', flag: 'bounces', amount: WEAPON_MODS.bounces },
  },
  {
    id: 'MOD_BULLET_SPEED',
    name: 'Hot Loads',
    category: 'mod',
    tier: 'common',
    tags: ['weapon', 'rapid'],
    effect: { kind: 'mod', flag: 'bulletSpeed', amount: WEAPON_MODS.bulletSpeed },
  },
  {
    id: 'MOD_BLAST',
    name: 'Explosive Tips',
    category: 'mod',
    tier: 'epic',
    tags: ['weapon', 'aoe'],
    effect: { kind: 'mod', flag: 'explodeRadius', amount: WEAPON_MODS.explodeRadius },
  },

  // --- weapons (tiers mirror B8 PICKUPS.rarity.itemRarity) ---
  {
    id: 'SHOTGUN',
    name: 'Shotgun',
    category: 'weapon',
    tier: 'rare',
    tags: ['burst', 'close'],
    effect: { kind: 'weapon', weapon: 'shotgun' },
  },
  {
    id: 'MACHINEGUN',
    name: 'Machine Gun',
    category: 'weapon',
    tier: 'rare',
    tags: ['rapid'],
    effect: { kind: 'weapon', weapon: 'machinegun' },
  },
  {
    id: 'BOUNCER',
    name: 'Bouncer',
    category: 'weapon',
    tier: 'rare',
    tags: ['bounce', 'crowd'],
    effect: { kind: 'weapon', weapon: 'bouncer' },
  },
  {
    id: 'ROCKET',
    name: 'Rocket Launcher',
    category: 'weapon',
    tier: 'epic',
    tags: ['aoe', 'burst'],
    effect: { kind: 'weapon', weapon: 'rocket' },
  },
  {
    id: 'HOMING',
    name: 'Homing Missiles',
    category: 'weapon',
    tier: 'epic',
    tags: ['homing', 'aoe'],
    effect: { kind: 'weapon', weapon: 'homing' },
  },
  {
    id: 'RAILGUN',
    name: 'Railgun',
    category: 'weapon',
    tier: 'epic',
    tags: ['pierce', 'precise'],
    effect: { kind: 'weapon', weapon: 'railgun' },
  },
  {
    id: 'CHARGE',
    name: 'Charge Cannon',
    category: 'weapon',
    tier: 'epic',
    tags: ['burst', 'precise'],
    effect: { kind: 'weapon', weapon: 'charge' },
  },
  {
    id: 'ORBITAL',
    name: 'Orbital Blade',
    category: 'weapon',
    tier: 'epic',
    tags: ['crowd', 'defensive'],
    effect: { kind: 'weapon', weapon: 'orbital' },
  },
];

const BY_ID = new Map(ITEMS.map((it) => [it.id, it]));

/** look up an item by id (undefined if unknown). */
export function itemById(id) {
  return BY_ID.get(id);
}

/** group items into a {key: [items]} map, pre-seeding every key in `keys` (so lookups never miss). */
function groupByKey(items, keyOf, keys) {
  const m = {};
  for (const k of keys) m[k] = [];
  for (const it of items) m[keyOf(it)].push(it);
  return m;
}

/** tier -> [items], derived once from the registry. */
export const itemsByTier = groupByKey(ITEMS, (it) => it.tier, TIERS);

/** category -> [items], derived once. */
export const itemsByCategory = groupByKey(ITEMS, (it) => it.category, CATEGORIES);

/**
 * The card's exact effect line (PURE). For stacking stats it shows the MARGINAL gain of the NEXT pick
 * (so "+12% damage" early, "+2%" deep in a run); everything else is a fixed description.
 * @param {object} item a registry entry
 * @param {{stacks?: number}} [ctx] current stacks of this item (for the marginal % on stat/dmg-reduction)
 * @returns {string}
 */
export function blurbFor(item, ctx = {}) {
  const e = item.effect;
  const nextStack = (ctx.stacks ?? 0) + 1;
  switch (e.kind) {
    case 'stat': {
      const u = UPGRADES[e.stat];
      const pct = Math.round(marginalBonus(nextStack, u.maxBonus, u.half) * 100);
      return `+${pct}% ${STAT_LABEL[e.stat] ?? e.stat}`;
    }
    case 'damageReduction': {
      const pct = Math.round(
        marginalBonus(nextStack, DAMAGE_REDUCTION.maxBonus, DAMAGE_REDUCTION.half) * 100,
      );
      return `+${pct}% damage reduction`;
    }
    case 'maxLife':
      return `+${e.amount} max life`;
    case 'heal':
      return `Heal ${e.amount} hearts`;
    case 'guard':
      return e.charges === 1 ? 'Block the next hit' : `Block the next ${e.charges} hits`;
    case 'mod':
      if (e.flag === 'pierce') return `Shots pierce +${e.amount} enemy`;
      if (e.flag === 'bounces') return `Shots bounce +${e.amount}`;
      if (e.flag === 'bulletSpeed') return `+${Math.round(e.amount * 100)}% bullet speed`;
      if (e.flag === 'explodeRadius') return 'Shots explode on impact';
      return 'Weapon mod';
    case 'weapon':
      return item.name;
    default:
      return item.name;
  }
}
