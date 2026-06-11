# ADR-0005: Hybrid — fast vibe-coding + the rules

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The operator's other repos are stability-first (zero-deps, heavy docs, drift audits).
This one is different on purpose: a fun co-designed game where the priority is
"runnable and cool," **not** perfection. But it should still not be trash, and the
operator's core rules must carry over.

## Decision

A **hybrid** posture:

- **Keep:** `AGENTS.md` (Boundaries, Agent safety, Working Agreement), `CLAUDE.md`,
  this `docs/adr/` process, a light `docs/LEARNINGS.md`, ESLint + Prettier, and a few
  **pure-logic** unit tests (`rng`, `npcDecision`, `math2d`) — the brittle math.
- **Allow:** real dependencies (Three.js, Express, howler) — not the zero-dep rule.
- **Drop (deliberately):** drift-audit tooling, `SPEC.md`, `PAR-SHEET.md`,
  `AGENT-SCAFFOLDING.md`, and exhaustive per-module tests. Visual/feel code is verified
  by **playing**, not unit tests.

## Consequences

- Fast iteration with guardrails: the rules and decision-trail exist, the ceremony
  doesn't.
- Test coverage is intentionally narrow (logic only) — regressions in feel are caught
  by playing, not CI.
- If this game ever grows into something serious, revisit and add the heavier gates.

## Alternatives considered

- **Full stability rig** (like the other repos) — too much ceremony for a player's game;
  kills the fun/speed.
- **No rules at all** — risks "trash"; loses the boundaries + decision trail the
  operator wants kept.
