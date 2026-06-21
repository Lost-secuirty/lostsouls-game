import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const url = process.env.SMOKE_URL || 'http://127.0.0.1:4173';
const artifactDir = 'artifacts/playwright';

await mkdir(artifactDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.context().tracing.start({ screenshots: true, snapshots: true });

// fail on any uncaught exception (e.g. a render/post-FX crash at boot — ADR-0025's
// pipeline must initialize cleanly or fall back, never throw).
const pageErrors = [];
page.on('pageerror', (err) => pageErrors.push(err.message));

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.screenshot({ path: `${artifactDir}/smoke.png`, fullPage: true });
  const canvasCount = await page.locator('canvas').count();
  if (canvasCount < 1) throw new Error('expected at least one canvas');
  const title = await page.title();
  if (!title || title.length < 2) throw new Error('missing document title');
  if (pageErrors.length) throw new Error(`uncaught page error(s): ${pageErrors.join(' | ')}`);
  await page.context().tracing.stop({ path: `${artifactDir}/trace.zip` });
} catch (err) {
  await page
    .context()
    .tracing.stop({ path: `${artifactDir}/trace.zip` })
    .catch(() => {});
  throw err;
} finally {
  await browser.close();
}
