# Lostsouls

Lostsouls is a browser-based 3D bullet-hell shooter built with Three.js, Vite,
and Express. It supports solo play with an AI ally and local two-player co-op
with keyboard, mouse, and gamepad controls.

> **Status: growing, not frozen.** See [`STATUS.md`](STATUS.md) for the current
> lifecycle and [`docs/BACKLOG.md`](docs/BACKLOG.md) for parked ideas.

## Features

- Top-down twin-stick combat with procedural audio and custom collision logic.
- Five-room floors, boss encounters, checkpoints, lives, and progression.
- Weapon slots, capped upgrades, pickups, survivor decisions, and seeded runs.
- Deterministic probability tests, proof tests, coverage gates, and browser smoke tests.
- A developer debug panel for spawning encounters, changing progression, and inspecting FPS.

## Run locally

Use Node.js 24.

```bash
npm ci
npm run dev
```

The Vite development server runs at <http://localhost:5173>.

To test the production server:

```bash
npm run build
npm start
```

The Express server runs at <http://localhost:3000> and exposes `/healthz`.

## Controls

- Keyboard and mouse: `WASD`, mouse aim, hold click to fire, `1`/`2`/`3` to switch weapons.
- Gamepad: left stick to move, right stick to aim, right trigger to fire.
- Interaction: `E` or gamepad `A` to help; `Q` or gamepad `B` to leave.
- Debug panel: backtick or `?debug=1`.

## Verification

```bash
npm run lint
npm test
npm run test:proof
npm run test:coverage
npm run build
npm run smoke:prod
npm run smoke:browser
```

CI also runs CodeQL and dependency review. See `docs/adr/` for technical
decisions and `docs/LEARNINGS.md` for implementation notes.

## Repo map (the six-slot model)

The same skeleton repeats across the connected repos — **rules → memory →
decisions → agent-tooling → verification → product** — but this one runs it
_light by design_ (ADR-0005: fast vibe-coding + the rules):

- **Rules** — `AGENTS.md` (contract) · `CLAUDE.md` (pointer) · `SECURITY.md` · `ASSETS.md` (CC0 asset hygiene). No `GOLDEN_RULES.md` — kept lean.
- **Memory** — `docs/LEARNINGS.md` (gotchas, light on purpose) · `docs/WORKLOG.md` (the build diary — what was done, per session). No `docs/kb` — dropped by ADR-0005.
- **Decisions** — `docs/adr/` (significant calls get an ADR; `/adr` scaffolds one). Area decision docs: [`STORY.md`](docs/STORY.md) · [`GAMEPLAY.md`](docs/GAMEPLAY.md) · [`GRAPHICS.md`](docs/GRAPHICS.md) · [`AUDIO.md`](docs/AUDIO.md). Curated plan in [`ROADMAP.md`](docs/ROADMAP.md).
- **Agent tooling** — `.claude/` (the `/adr` command + hooks; no predefined agent roles).
- **Verification** — a light CI gate: `npm run lint` · `npm test` + `test:proof` + `test:coverage` · `npm run smoke:prod` (`/healthz`) · `npm run smoke:browser` · CodeQL + dependency review. "Feel" is verified by _playing_, not CI.
- **Product** — `src/{core,entities,systems,ui,debug}` (the Three.js game) + `server.js` (Express).

Plain-language **and** technical walk-through: [`docs/WALKTHROUGH.md`](docs/WALKTHROUGH.md).

## License

MIT
