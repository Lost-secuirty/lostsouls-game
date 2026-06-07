import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure-logic tests only (no Three.js / DOM / WebGL) — run in Node.
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
