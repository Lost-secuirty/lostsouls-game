// =====================================================================
// probability.js — small PURE probability helpers (easy to unit-test).
//
// Used to reason about / verify the game's "% chances". The independent-
// probability rule here is taken from the project owner's old Dokkan reference notes:
//   "Independent Probability: 1 - [(1 - Passive %) * (1 - HiPo %)]"
// i.e. the chance that AT LEAST ONE of several independent rolls succeeds.
// =====================================================================

/**
 * Chance that at least one of several INDEPENDENT events happens.
 * atLeastOne([0.5, 0.5]) === 0.75 ; atLeastOne([0.77]) === 0.77
 * @param {number[]} probs each in [0,1]
 * @returns {number}
 */
export function atLeastOne(probs) {
  return 1 - probs.reduce((acc, p) => acc * (1 - p), 1);
}

/**
 * Chi-square goodness-of-fit statistic: Σ (observed - expected)² / expected.
 * Lower = the observed counts fit the expected distribution better.
 * @param {number[]} observed counts
 * @param {number[]} expected counts (same length, > 0)
 * @returns {number}
 */
export function chiSquare(observed, expected) {
  let chi = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) chi += (observed[i] - expected[i]) ** 2 / expected[i];
  }
  return chi;
}
