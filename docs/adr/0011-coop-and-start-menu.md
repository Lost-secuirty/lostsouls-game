# ADR-0011: 2-player local co-op + start menu

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

The long-planned co-op phase: the project owner on keyboard/mouse, the co-designer on an Xbox controller, same
screen. the project owner also wanted a basic start menu, and the key-sticking bug (clicking the debug
menu froze movement) needed a real fix.

## Decision

- **Start menu** — a tiny DOM overlay (`#startmenu` + `src/ui/startmenu.js`) with **1 Player /
  2 Players**. `main.js` shows it after boot; the choice calls `game.startRun(coop)`. (Vanilla
  DOM, no library — the `game-menu-html5` pattern.)
- **Device-aware input** — `src/systems/input.js` methods take a device: `'kb'`, `'pad'`, or
  `'both'`. P1 = keyboard/mouse, P2 = the gamepad; solo uses `'both'`. Right-stick aim persists.
- **Two players** — `Player` takes `{ color, modelKey, device }`. P1 = blue, P2 = the green
  "ally" mesh (now player-controlled; the AI `Ally` is skipped in co-op). `game.players` is the
  array; enemies/boss/bullets target/affect the **nearest living player**
  (`game.nearestPlayer`); pickups + survivors work for either.
- **Revive-on-room-clear** — per-player hearts; at 0 a player is "down" (hidden). If anyone is
  still up, the downed revive when the room is cleared. Only a **full wipe** spends one of the
  shared lives (`resolveDeath`) and respawns both at the checkpoint; out of lives = Game Over.
- **Stuck-key fix** — capture-phase key listeners (we see releases first), ignore keys while a
  menu input is focused, and release held keys on any click outside the canvas.
- **Gamepad rumble** — `input.rumble()` via `vibrationActuator.playEffect('dual-rumble', …)`,
  feature-detected (no-op where unsupported); small buzz on the pad player's shots/hits, bigger
  on boss-down. Pure feel.

## Consequences

- Couch co-op with no split-screen (the whole arena is already on screen). No friendly fire.
- Single-player is unchanged (you + the AI ally).
- Confirmed current W3C "standard" Xbox mapping (One S+ / Series X|S identical): A=0/B=1,
  RT=7/RB=5, Start=9; left stick axes 0/1, right stick 2/3.

## Alternatives considered

- **Auto-enable co-op on controller connect** — simpler, but the project owner wanted an explicit start
  menu, which also gives a clean home for future options.
- **Shared health / shared 3 lives only** — rejected in favor of revive-on-clear so a player who
  dies a lot stays in the action; the shared-lives pool still gates a true team wipe.
