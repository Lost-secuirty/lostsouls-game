# ADR-0021: A pure bullet-pattern (emitter) library

- **Status:** Accepted
- **Date:** 2026-06-21

## Context

Playtest feedback (Scott + Caden) and a deep-research audit both flagged the same thing: boss attacks
felt **"same-ish"**, and adding a new attack meant hand-rolling another bullet loop. Five or six boss
files each had their own near-identical "fire a ring" closure (`spider.fireRing`,
`mushroom.fireSporeRing`, `skeleton.fireScatterRing`, `human.firePanicRing`, `cat.fireCrossSwipe`,
`enemies._fireRing`) — duplicated plumbing that also tripped the SonarCloud duplication gate and made
the fights blur together. The research recommended treating patterns as **parameterized emission
functions** (a small "pattern DSL").

We already had the right adjacent pieces — `math2d.spreadDirs`/`turnAngle`, `patterns.aimedBurst`/
`telegraphedRing`, `enemies.topUpMinions` — but no shared library for the **ring/cone shapes**.

## Decision

Add **`src/entities/bosses/emitters.js`**: pure angle-array generators, no THREE and no game state, so
they are trivially unit-testable and reusable:

- `ring(n, phase)`, `gapRing(n, gapStart, gapWidth, phase)`, `jitterRing(n, jitter, rng, phase)`,
  `star(arms, phase)`, `nWay(baseAngle, count, spreadRad)`, `arc(count, phase, step)` (spiral arm),
  and `dirsFromAngles(angles)`.
- They return arrays of **angles** in the game's existing convention (a maps to direction
  `(sin a, cos a)`), so the refactor is behavior-preserving.

A `patterns.fireAngles(boss, game, angles, speed, shake)` helper holds the shared spawn loop, so each
boss's fire function is now a one-liner that picks a generator. Every duplicate ring closure was
refactored onto the library (bullet directions verified **identical** for spider/mushroom/skeleton/
cat/enemy-shooter — including the seeded gap and per-bone jitter sequences, so determinism is intact).

**De-samey:** the **human** boss's P2 was a copy of the spider's plain ring — it became an **aimed
"panic spray" cone** (`nWay`, new `config.BOSS.human.p2SprayDeg`), which fits the cornered-survivor
fantasy and is dodged by strafing rather than threading a ring. The five ranged bosses now read
distinctly: spider = rotating ring, mushroom = gap ring, skeleton = scatter/jitter, human = aimed
spray, cat = cross/X. Telegraph legibility was also bumped (a bigger, pulsing wind-up puff; the full
ground-ring telegraph lands with the danger overlay in a later stage).

## Consequences

- **Easier:** a new boss attack is "pick a generator + set counts/speeds in `config.BOSS`"; the shapes
  are unit-tested (`tests/emitters.test.js`) and reusable by bosses AND the basic enemy shooter; the
  duplication that fed the Sonar gate is gone.
- **Variety:** fights are visibly distinct, addressing the "all the same-ish" feedback, with `arc`/
  spiral and `nWay` ready for future bosses.
- **Trade-offs:** one more module to know about; the angle convention `(sin a, cos a)` is unusual but
  is the codebase's existing one and is documented at the top of `emitters.js`.

## Alternatives considered

- **Leave the per-boss loops.** Rejected — that is the duplication + sameness the feedback called out.
- **A heavyweight emitter object / scriptable timeline DSL** (stateful emitters with their own
  schedulers). Rejected as over-engineering for this game's size; pure angle generators + the existing
  `telegraphedRing`/`aimedBurst` timers cover every current and near-future pattern.

## Sources

- ChatGPT deep-research repo audit (patterns-as-emission-functions; pattern table).
- [Boghog's bullet-hell shmup 101 — Shmups Wiki](https://shmups.wiki/library/Boghog's_bullet_hell_shmup_101)
