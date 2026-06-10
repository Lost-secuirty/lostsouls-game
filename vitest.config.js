import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure-logic tests only (no Three.js / DOM / WebGL) — run in Node.
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/core/**/*.js', 'src/systems/input.js', 'src/entities/pickups.js'],
      // CI gate from the proof-backed harness (PR #7, 2026-06-09): floors over the
      // pure-logic modules in `include` only — render code is exercised by the smoke tests.
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 30,
        statements: 40,
      },
    },
  },
});
