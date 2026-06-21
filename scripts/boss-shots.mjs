// =====================================================================
// boss-shots.mjs — drive the boss-portrait harness with Playwright and write
// one PNG per boss to artifacts/boss-shots/. Assumes a server (vite dev or
// preview) is already serving the repo root; pass its URL via SHOTS_URL.
// =====================================================================

import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const base = (process.env.SHOTS_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const url = `${base}/tools/boss-shots/index.html`;
const outDir = 'artifacts/boss-shots';

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage({
  viewport: { width: 1000, height: 1000 },
  deviceScaleFactor: 2,
});

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForFunction('window.__ready === true', { timeout: 30_000 });

  const types = await page.evaluate('window.__bossTypes');
  console.log('bosses:', types.join(', '));

  for (const type of types) {
    const name = await page.evaluate((t) => window.showBoss(t), type);
    await page.waitForTimeout(600); // let the camera frame + a few anim frames tick
    const file = `${outDir}/${type}.png`;
    await page.screenshot({ path: file });
    console.log(`✓ ${type} — ${name} -> ${file}`);
  }

  if (errors.length) {
    console.warn('\nconsole/page errors during capture:');
    for (const e of errors) console.warn('  ' + e);
  }
} finally {
  await browser.close();
}
