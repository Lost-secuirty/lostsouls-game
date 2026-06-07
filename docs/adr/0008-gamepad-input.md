# ADR-0008: Basic gamepad (Xbox controller) input

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

Caden prefers an Xbox controller. The input layer was already abstracted
(`move()`/`aim()`/`shoot`/`consume*`), so adding a pad is low-risk and high-value.

## Decision

Add single-player gamepad support in `src/systems/input.js`, polled once per tick via
a new `input.update()` (called at the top of `game.update`). Standard mapping: left
stick → move, right stick → aim (overrides the mouse while in use), RT/RB → shoot,
A/B/Start → help/leave/restart (edge-detected). 0.15 deadzone; a toast on
`gamepadconnected`. Keyboard + mouse are unchanged and OR-combined with the pad.

## Consequences

- Plug in an Xbox pad and play; keyboard/mouse still work simultaneously.
- The intent abstraction means no gameplay code had to change.
- This is single-player only; the same input seam is what 2-player co-op (a future
  expansion) will build on (a second pad → a second player).

## Alternatives considered

- **Skip until co-op** — but Caden wanted it now, and it was cheap given the existing
  abstraction.
