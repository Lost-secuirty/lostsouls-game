// =====================================================================
// server.js — tiny Express server for PRODUCTION.
//
//   Dev:  `npm run dev`   -> Vite dev server with hot reload (no Express).
//   Prod: `npm run build` -> bundles to dist/, then `npm start` serves it here.
//
// Kept deliberately simple: serve the built game + a health check. No API
// yet (save games / multiplayer can be added later as routes above the
// static handler).
// =====================================================================

import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, 'dist');
const PORT = process.env.PORT || 3000;

const app = express();

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
  }),
);

// Health check (useful for "is it up?" + future deploy probes).
app.get('/healthz', (_req, res) => res.send('ok'));

// Serve the built game.
app.use(express.static(DIST));

// SPA-style fallback: anything else returns the game shell.
app.get('/{*splat}', (_req, res) => res.sendFile(join(DIST, 'index.html')));

app.listen(PORT, () => {
  console.log(`Lostsouls running at http://localhost:${PORT}`);
  console.log(`    (run "npm run build" first if you see a blank page)`);
});
