---
lifecycle: growing
frozen: false
visibility: public
maturity: active-development
updated: 2026-06-20
---

# Status — Lostsouls

**This project is GROWING, not frozen.** It is a co-designed game (Scott + son), fun-first and
**light by design** (ADR-0005). It will keep gaining expansions and polish until it is explicitly
marked `frozen: true` in the front-matter above. Treat anything here as a current snapshot of an
in-progress build, not a final release.

This file is the lifecycle source-of-truth for the repo. The detailed running history lives in
[`docs/LEARNINGS.md`](docs/LEARNINGS.md); the "why" behind decisions lives in
[`docs/adr/`](docs/adr/).

## Lifecycle

- **lifecycle:** `growing` — actively developed; expect change.
- **frozen:** `false` — no freeze declared.
- **visibility:** `public`.

## Current state (v0.6.0)

A browser 3D bullet-hell shooter (Three.js + Vite + Express): solo with an AI ally and local
two-player co-op (keyboard/mouse/gamepad). Most recent work:

- **Expansion 6 Stage 1** — data-driven bosses (behavior modules, ADR-0014), 5 new guns with
  pierce/homing/bounce/charge/orbital behaviors, and 9-room floors (ADR-0015). First of a
  staged expansion adding the human/mushroom/duo/skeleton bosses + animated CC0 models.
- **Expansion 5 Stage 1** — weapon slots + global stat caps (ADR-0012).
- **Seeded runs + determinism** — optional replayable seed on `startRun`, plus a cross-system
  determinism test over the pure RNG seams (ADR-0013).
- **Cross-repo hardening** — secret/PII pre-commit + CI scanner (public-repo BLOCK policy),
  ESLint 10, pinned actions.

15 ADRs (0001–0015). Verification: probability/proof tests, coverage gate, production smoke +
browser smoke, OpenSSF scorecard, dependency review, control audit.

## Scope (unchanged)

A static single-page game. **No accounts, no payments, no real wagering, no PII, no backend
beyond the static Express server + `/healthz`.** Light by design — it is not a governance
showcase; it is a game built for fun and learning (ADR-0005).

## Backlog

Deferred ideas and known gaps are parked in [`docs/BACKLOG.md`](docs/BACKLOG.md).
