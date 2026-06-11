# ADR-0007: Floors, lives, and checkpoints

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

v1 was a flat run of 6 rooms with a single life. project collaborators asked for structure:
5 normal rooms then a boss, a "boss ahead" warning, and stakes — 3 lives, a checkpoint
after each boss, and "die 3 times → start all over."

## Decision

- **Floors** are config-driven (`config.PROGRESSION`): each floor = `roomsPerFloor`
  normal rooms + 1 boss room. Pure helpers in `src/core/progression.js`
  (`floorInfo`, `nextIsBoss`, `resolveDeath`) keep the math testable.
- **Boss room** spawns a boss instead of normal enemies; a **"⚠ BOSS AHEAD"** banner
  shows when clearing the room before it.
- **Lives** are a global pool of 3 (`config.LIVES`). On death, `resolveDeath` either
  respawns you at the last checkpoint (lives remain) or ends the run (lives gone →
  full restart, lives refilled).
- **Checkpoint** = the room after a boss; it's set only when a boss dies. There is no
  checkpoint before the first boss, so early deaths send you back to the start.

## Consequences

- Real progression + stakes without being punishing; checkpoints respect the player's
  time after a hard boss.
- Lives don't refill at checkpoints (by design) so "die 3 times and start over" always
  holds. Tunable in config if it feels too harsh.
- Pure, unit-tested core (`progression.test.js`) — the brittle part can't silently break.

## Alternatives considered

- **Refill lives at each checkpoint** — friendlier, but then "start all over" rarely
  triggers; rejected to honor the requested rule. Easy to switch later.
- **Per-room checkpoints** — too forgiving; bosses are the natural milestone.
