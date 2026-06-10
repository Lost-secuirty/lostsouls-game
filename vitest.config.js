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
      thresholds: {
        lines: 40,
        functions: 40,
        branches: 30,
        statements: 40,
      },
    },
  },
});
