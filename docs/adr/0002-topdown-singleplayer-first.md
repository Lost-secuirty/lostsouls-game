# ADR-0002: Top-down camera, single-player first (dad as AI ally)

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The brief referenced both *Binding of Isaac* (top-down) and *Doom* (first-person), and
"based around me and my son" (could be co-op). We need one clear v1 to actually ship
something fun, without painting ourselves into a corner.

## Decision

- **Top-down 3/4 camera** (Isaac-style) over the XZ plane for v1 — best for reading
  bullet-hell patterns and dodging, easiest to control with mouse-aim.
- **Single-player first.** You play the kid; **dad is an AI ally** who fights beside
  you.
- Build clean **seams** for the alternatives instead of building them now:
  - Co-op: players live in an array; a second input source fills `intents[1]`.
  - First-person: camera mode is swappable; aim is already an abstract `{x,z}` vector,
    so game logic is camera-agnostic.

## Consequences

- A focused, genuinely fun v1 instead of a half-built everything.
- Co-op and FP are additive later, not rewrites.
- The "dad" fantasy is present from day one via the ally.

## Alternatives considered

- **First-person (Doom) v1** — more intense but bullet-hell is hard to read/dodge in FP,
  and it's more work to feel good. Deferred to a camera-mode seam.
- **2-player co-op now** — sweet for a dad/son game, but more to build before the core
  loop is fun. Deferred to the players-array seam.
