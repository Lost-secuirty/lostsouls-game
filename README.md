# Lostsouls

Lostsouls is a browser-based 3D bullet-hell shooter built with Three.js, Vite,
and Express. It supports solo play with an AI ally and local two-player co-op
with keyboard, mouse, and gamepad controls.

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

## License

MIT
