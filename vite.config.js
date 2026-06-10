import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    // The Three.js bundle is intentionally large for a single-page game — no route splitting to do.
    chunkSizeWarningLimit: 1024,
  },
});
