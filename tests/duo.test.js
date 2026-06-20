import { describe, it, expect } from 'vitest';
import { DuoController } from '../src/entities/bosses/duo.js';
import { makeRng } from '../src/core/rng.js';

// DuoController is pure of three.js (it operates on plain boss-like objects), so
// the locked multi-boss rules are unit-tested directly here:
//   • alternating aggression (only one beast attacks at a time, swapped on a timer)
//   • enrage on partner death (no revive)
//   • seeded co-op targeting (reproducible, held until a swap)

const CFG = { switchInterval: 4, enrageMul: 1.4 };

function mkBoss() {
  return {
    dead: false,
    enraged: false,
    mul: 1,
    calls: 0,
    onPartnerDown(m = 1.4) {
      this.enraged = true;
      this.mul = m;
      this.calls++;
    },
  };
}

describe('DuoController — alternating aggression', () => {
  it('only the first beast attacks initially, then they swap on the timer', () => {
    const ctrl = new DuoController(makeRng(1), CFG);
    const a = mkBoss();
    const b = mkBoss();
    ctrl.add(a).add(b);

    expect(a.duo).toBe(ctrl); // add() back-links the boss
    expect(ctrl.isAggressor(a)).toBe(true);
    expect(ctrl.isAggressor(b)).toBe(false);

    ctrl.update(2); // timer 4 -> 2, no swap yet
    expect(ctrl.isAggressor(a)).toBe(true);

    ctrl.update(2.1); // timer crosses 0 -> swap to b
    expect(ctrl.isAggressor(b)).toBe(true);
    expect(ctrl.isAggressor(a)).toBe(false);

    ctrl.update(4.1); // swap back to a
    expect(ctrl.isAggressor(a)).toBe(true);
  });
});

describe('DuoController — enrage on partner death (no revive)', () => {
  it('enrages the survivor once when its partner dies, and never revives the dead one', () => {
    const ctrl = new DuoController(makeRng(1), CFG);
    const a = mkBoss();
    const b = mkBoss();
    ctrl.add(a).add(b);

    b.dead = true;
    ctrl.update(0.1);

    expect(a.enraged).toBe(true);
    expect(a.mul).toBe(CFG.enrageMul); // permanent rage bump passed through
    expect(ctrl.enraged).toBe(true);
    expect(ctrl.isAggressor(a)).toBe(true); // a lone survivor attacks freely
    expect(b.dead).toBe(true); // NO revive

    ctrl.update(0.1); // onPartnerDown fires exactly once
    expect(a.calls).toBe(1);
  });
});

describe('DuoController — seeded co-op targeting', () => {
  const players = [{ alive: true }, { alive: true }];

  it('picks the same living player from the same seed (reproducible)', () => {
    const c1 = new DuoController(makeRng(42), CFG).add(mkBoss()).add(mkBoss());
    const c2 = new DuoController(makeRng(42), CFG).add(mkBoss()).add(mkBoss());
    const t1 = c1.chooseTarget(players);
    const t2 = c2.chooseTarget(players);
    expect(players.indexOf(t1)).toBe(players.indexOf(t2));
  });

  it('holds the same target until a role swap, then re-rolls (still reproducible)', () => {
    const c1 = new DuoController(makeRng(7), CFG).add(mkBoss()).add(mkBoss());
    const c2 = new DuoController(makeRng(7), CFG).add(mkBoss()).add(mkBoss());

    const first = c1.chooseTarget(players);
    expect(c1.chooseTarget(players)).toBe(first); // held (no re-roll between calls)

    c1.update(CFG.switchInterval + 0.1); // swap -> retarget
    c2.update(CFG.switchInterval + 0.1);
    expect(players.indexOf(c1.chooseTarget(players))).toBe(
      players.indexOf(c2.chooseTarget(players)),
    );
  });

  it('only ever targets a living player, and falls back when nobody is alive', () => {
    const ctrl = new DuoController(makeRng(3), CFG).add(mkBoss()).add(mkBoss());
    expect(ctrl.chooseTarget([{ alive: false }, { alive: true }])).toEqual({ alive: true });
    const fb = { alive: false };
    expect(ctrl.chooseTarget([{ alive: false }], fb)).toBe(fb);
  });
});
