# Lostsouls (Game) — Walk-Through

_A browser 3D bullet-hell shooter — co-designed, built for fun and learning · 2026-06-13_

## Bottom line

A top-down 3D twin-stick bullet-hell shooter that runs in a browser (Three.js), with an AI ally and local two-player co-op. It's a co-designed game project — built to move fast and have fun — but it still rides the same lightweight guardrails as its sibling repos (feature branch, draft PR, an ADR for real decisions, a small CI gate). It is **deliberately the lightest** of the connected repos.

## In plain terms (if you read nothing else)

Lostsouls is a game you open in a web browser. You move with one hand and aim/shoot with the other, fighting through rooms and bosses, grabbing weapons and upgrades, making the occasional survivor decision. You can play solo with a computer-controlled ally, or two players on one machine, using keyboard+mouse or gamepads.

Under the hood it's a normal small web app: a game that draws in 3D (Three.js) served by a tiny web server (Express) with a health check.

The important thing about _this_ repo is what it is **not**: it is not over-built. The heavy testing rigor in the sibling repos is here only in a **light** form — just enough to keep it honest and stop it from breaking — because the whole point is to build something fun and learn while doing it. That lightness is a deliberate, written-down decision (ADR-0005), not a corner cut.

It is a game/learning project, not a product. There are no accounts, no payments, nothing to certify.

## Walk-through

### (1) What it is & why it exists (its role)

**Plain:** A for-fun, co-designed game that doubles as a learning vehicle. The rules from the other repos still apply, but ceremony is kept to a minimum on purpose.

**Technical:** A browser 3D bullet-hell shooter (`AGENTS.md`, `README.md`). Its governing posture is **ADR-0005 "Hybrid — fast vibe-coding + the rules"**: Boundaries + Working Agreement still bind, significant decisions get an ADR (`/adr` scaffolds one), but `docs/kb` and drift-audit tooling are **deliberately dropped**. The lightest point on the cross-repo autonomy↔human-gate map.

### (2) How it's built

**Plain:** Standard web-game stack — a 3D engine in the browser, a small server behind it.

**Technical:** Three.js + Vite (client), Express (server, exposes `/healthz`), Node 24. Source under `src/{core, entities, systems, ui, debug}`; assets in `public/{models, audio}`; `server.js` serves the build. Real dependencies are allowed here (unlike the zero-dep repos) — ADR-0005.

### (3) How it works

**Plain:** Twin-stick combat across multi-room floors with bosses, checkpoints, lives, weapon slots and upgrades; solo (with an AI ally) or local co-op; runs can be seeded so the same run replays.

**Technical:** Controls: `WASD`+mouse or gamepad (left stick move / right stick aim / right trigger fire), `1/2/3` weapon switch, `E`/`A` help, `Q`/`B` leave. Five-room floors, boss encounters, checkpoints, capped upgrades, survivor decisions, seeded runs. A debug panel (backtick or `?debug=1`) spawns encounters, edits progression, shows FPS.

### (4) How it's verified — the gates

**Plain:** A light automated safety net, plus the honest admission that whether the game _feels_ good is checked by **playing it**, not by a test.

**Technical:** The CI "light gate": `npm run lint` (ESLint) · `npm test` + `npm run test:proof` + `npm run test:coverage` (Vitest — only the **pure logic** is unit-tested: RNG, NPC decisions, 2D math) · `npm run smoke:prod` (boots the Express build, hits `/healthz`) · `npm run smoke:browser` (Playwright boot/console-error) · plus CodeQL, dependency review, and the secret/PII scan. "Feel" is verified by playing, by design.

### (5) What it proves — and what it doesn't

**Plain:** It proves the calculable parts are correct and that the game boots and serves. It does **not** prove the game is fun or that all gameplay is bug-free — those are judged by playing.

**Technical:** Proves: pure-logic correctness (seeded RNG, NPC decision, `math2d`), a clean production boot (`/healthz`), and a console-error-free browser load. Does not prove: subjective "feel," full gameplay/render correctness, or balance — none are CI-tested by deliberate choice.

## Honest limits (a skeptic's read)

- **Lightest governance by design.** No `docs/kb`, no drift-audit tooling — dropped on purpose (ADR-0005), not missing.
- **"Feel" is not tested.** Subjective quality is verified by playing, never by CI.
- **Only pure logic is unit-tested.** Rendering and gameplay rely on smoke tests + a human at the controls.
- **A game/learning project, not a product.** No accounts, payments, or certification; treat it as such.

## Glossary

- **Bullet-hell:** an action game where you dodge dense patterns of projectiles.
- **Twin-stick:** one control axis moves, the other aims/fires (two sticks, or WASD+mouse).
- **Seeded run:** a run started from a fixed random seed, so the same sequence replays — useful for testing.
- **AI ally:** a computer-controlled teammate in solo play.
- **`/healthz`:** a tiny server endpoint that returns "I'm up," used by the production smoke test.
- **Smoke test:** a minimal check that the thing boots and runs without obvious errors.
- **ADR:** Architecture Decision Record — a short note capturing one significant decision and why.
- **Pure logic:** code with no graphics/IO (e.g., math, RNG) — easy to unit-test deterministically.
