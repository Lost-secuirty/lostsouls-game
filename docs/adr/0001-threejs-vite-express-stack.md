# ADR-0001: Three.js + Vite + Express stack

- **Status:** Accepted
- **Date:** 2026-06-07

## Context

We want a **3D** browser game, shipped as an
**Express project**, that's fun fast and easy to iterate on. Candidates for rendering:
Three.js, Babylon.js, react-three-fiber.

## Decision

- **Three.js** for rendering — imperative, lightweight, the de-facto choice for shipped
  web 3D games; no React layer to fight for a fast action game.
- **Vite** for dev (instant HMR) and the production build (`-> dist/`).
- **Express** (`server.js`) serves the built `dist/` in production (`npm start`).
  Development uses the Vite dev server directly — two simple processes instead of one
  complex one. The "Express project" requirement is satisfied by prod serving.
- **howler.js** for audio.

## Consequences

- Fast iteration loop (change a number, see it instantly) — ideal for a player + ADHD.
- We own the game loop and rendering directly (more control, a little more code).
- Two run modes to remember: `npm run dev` (play/dev) vs `npm run build && npm start`
  (prod). Documented in the README.

## Alternatives considered

- **react-three-fiber** — nice for data-driven UIs, but adds React overhead/bundle for
  no benefit in a twin-stick shooter.
- **Babylon.js** — more batteries-included (built-in physics/XR) but heavier; we don't
  need its physics (see ADR-0003).
- **vite-express** (one process for dev+prod) — fine upgrade path, but the two-process
  split is simpler and more robust to start.
