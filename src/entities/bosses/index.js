// =====================================================================
// bosses/index.js — registry of boss behavior modules, keyed by boss type.
//
// The generic Boss shell (boss.js) looks a behavior up by `bossType` (which
// comes from PROGRESSION.floors[].boss). Add a new boss = add a module here.
// =====================================================================

import { spider } from './spider.js';

export const BEHAVIORS = {
  spider,
  // expansion 6 (added per stage): mushroom, dog, cat, skeleton, human
};
