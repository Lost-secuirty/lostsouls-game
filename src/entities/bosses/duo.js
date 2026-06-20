// =====================================================================
// bosses/duo.js — the DuoController: the brain behind a MULTI-boss fight. 🐶🐱
//
// Two bosses share one controller. It enforces the locked design rules:
//   • ALTERNATING aggression — only the current "aggressor" starts attacks;
//     the partner pressures passively (stalks / summons). They swap on a timer.
//   • ENRAGE on partner death — when one falls, the survivor permanently rages
//     (speed/fire-rate bump) and fights solo. NO revive.
//   • Seeded co-op targeting — both beasts focus the same seeded living player
//     (re-rolled on each swap) so they don't always pile on whoever's nearest.
//
// PURE of three.js (operates on boss objects via {dead, onPartnerDown, alive}),
// so the role/enrage logic is unit-tested directly (tests/duo.test.js).
// =====================================================================

export class DuoController {
  constructor(rng, cfg) {
    this.rng = rng;
    this.cfg = cfg;
    this.members = []; // the bosses, in spawn order (index 0 attacks first)
    this.aggressor = 0; // index into members of the beast currently allowed to attack
    this.timer = cfg.switchInterval;
    this.enraged = false; // true once a partner has fallen (survivor fights freely)
    this._target = null; // seeded focus player, held until the next swap
    this._retarget = true;
  }

  /** register a boss with the controller (and back-link it for isAggressor checks) */
  add(boss) {
    boss.duo = this;
    this.members.push(boss);
    return this;
  }

  livingMembers() {
    return this.members.filter((b) => !b.dead);
  }

  /** is this boss the one currently allowed to START attacks? */
  isAggressor(boss) {
    if (this.enraged) return true; // a lone survivor attacks freely
    if (this.livingMembers().length <= 1) return true; // safety: only one left
    return this.members[this.aggressor % this.members.length] === boss;
  }

  /**
   * Seeded choice of which living player both beasts focus (co-op fairness). Held
   * until the next role swap, then re-rolled. Falls back to `fallback` if nobody
   * is alive (shouldn't happen mid-fight, but keeps callers safe).
   */
  chooseTarget(players, fallback = null) {
    const living = players.filter((p) => p.alive);
    if (living.length === 0) return fallback;
    if (!this._retarget && this._target && this._target.alive) return this._target;
    this._target = living[this.rng.int(living.length)];
    this._retarget = false;
    return this._target;
  }

  update(dt) {
    const living = this.livingMembers();
    // partner down -> the survivor ENRAGES and fights solo (NO revive)
    if (living.length <= 1) {
      if (!this.enraged && living.length === 1) {
        this.enraged = true;
        living[0].onPartnerDown?.(this.cfg.enrageMul);
      }
      return;
    }
    // swap who's allowed to attack on the switch timer
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = this.cfg.switchInterval;
      this.aggressor = (this.aggressor + 1) % this.members.length;
      this._retarget = true; // re-roll the focus player on each swap
    }
  }
}
