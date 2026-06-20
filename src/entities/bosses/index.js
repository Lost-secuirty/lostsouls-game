// =====================================================================
// bosses/index.js — registry of boss behavior modules, keyed by boss type.
//
// The generic Boss shell (boss.js) looks a behavior up by `bossType` (which
// comes from PROGRESSION.floors[].boss). Add a new boss = add a module here.
// =====================================================================

import { spider } from './spider.js';
import { mushroom } from './mushroom.js';

export const BEHAVIORS = {
  spider,
  mushroom,
  // expansion 6 (added per stage): dog, cat, skeleton, human
};
