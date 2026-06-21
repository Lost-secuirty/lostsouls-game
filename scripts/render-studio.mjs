// =====================================================================
// render-studio.mjs — drive the boss render studio with Playwright: one PNG per
// boss to artifacts/render-studio/<type>.png, plus a combined contact-sheet.png.
//
// Assumes a server (vite dev or preview) is serving the repo root; pass its URL
// via SHOTS_URL (default http://127.0.0.1:5173 — `npm run dev`).
//
//   SHOTS_URL       server origin (default vite dev :5173)
//   CHROME_PATH     use a pre-installed Chromium (locked-down boxes)
//   STUDIO_SCALE    device scale / SSAA factor (default 2)
//   STUDIO_TRANSPARENT=1   transparent cutout PNGs (no bg/ground, no post-FX)
// =====================================================================

import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const base = (process.env.SHOTS_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');
const transparent = process.env.STUDIO_TRANSPARENT === '1';
const url = `${base}/tools/render-studio/index.html${transparent ? '?bg=transparent' : ''}`;
const scale = Number(process.env.STUDIO_SCALE) || 2;
const outDir = 'artifacts/render-studio';
const CONTACT = { tile: 480, cols: 3, pad: 16 }; // contact-sheet grid layout

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch(
  process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
);
const page = await browser.newPage({
  viewport: { width: 1000, height: 1000 },
  deviceScaleFactor: scale,
});

const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const shots = []; // one captured entry per boss — type, name and file path

try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
  await page.waitForFunction('window.__ready === true', { timeout: 30_000 });

  const types = await page.evaluate('window.__bossTypes');
  console.log(`render studio — ${types.length} bosses${transparent ? ' (transparent)' : ''}`);

  for (const type of types) {
    const name = await page.evaluate((t) => window.showBoss(t), type);
    await page.waitForTimeout(400); // let the camera frame + a couple of frames render
    const file = `${outDir}/${type}.png`;
    await page.screenshot({ path: file, omitBackground: transparent });
    shots.push({ type, name, file });
    console.log(`  ✓ ${type} — ${name}`);
  }
} finally {
  await browser.close();
}

// ---- contact sheet: tile every boss into one PNG (box-downsampled) ----
if (shots.length) {
  const sheet = await buildContactSheet(shots, { ...CONTACT, transparent });
  const sheetPath = `${outDir}/contact-sheet.png`;
  await writeFile(sheetPath, PNG.sync.write(sheet));
  console.log(`  ✓ contact sheet -> ${sheetPath} (${sheet.width}×${sheet.height})`);
}

if (errors.length) {
  console.warn('\nconsole/page errors during capture:');
  for (const e of errors) console.warn('  ' + e);
  process.exitCode = 1; // surface a real render error
}

// Average-downsample each shot to `tile`×`tile` and lay them out in a grid.
async function buildContactSheet(items, { tile, cols, pad, transparent: clear }) {
  const rows = Math.ceil(items.length / cols);
  const W = cols * tile + (cols + 1) * pad;
  const H = rows * tile + (rows + 1) * pad;
  const sheet = new PNG({ width: W, height: H });
  // background: dark (or transparent)
  for (let i = 0; i < sheet.data.length; i += 4) {
    sheet.data[i] = 0x0a;
    sheet.data[i + 1] = 0x08;
    sheet.data[i + 2] = 0x10;
    sheet.data[i + 3] = clear ? 0 : 0xff;
  }
  for (let idx = 0; idx < items.length; idx++) {
    const src = PNG.sync.read(await readFile(items[idx].file));
    const small = downsample(src, tile, tile);
    const gx = idx % cols;
    const gy = Math.floor(idx / cols);
    const ox = pad + gx * (tile + pad);
    const oy = pad + gy * (tile + pad);
    blit(small, sheet, ox, oy);
  }
  return sheet;
}

// box-average downsample an RGBA PNG to (dw×dh)
function downsample(src, dw, dh) {
  const out = new PNG({ width: dw, height: dh });
  const { width: sw, height: sh, data: s } = src;
  for (let y = 0; y < dh; y++) {
    const sy0 = Math.floor((y * sh) / dh);
    const sy1 = Math.max(sy0 + 1, Math.floor(((y + 1) * sh) / dh));
    for (let x = 0; x < dw; x++) {
      const sx0 = Math.floor((x * sw) / dw);
      const sx1 = Math.max(sx0 + 1, Math.floor(((x + 1) * sw) / dw));
      let r = 0,
        g = 0,
        b = 0,
        a = 0,
        n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (sy * sw + sx) * 4;
          r += s[i];
          g += s[i + 1];
          b += s[i + 2];
          a += s[i + 3];
          n++;
        }
      }
      const o = (y * dw + x) * 4;
      out.data[o] = r / n;
      out.data[o + 1] = g / n;
      out.data[o + 2] = b / n;
      out.data[o + 3] = a / n;
    }
  }
  return out;
}

// copy `src` PNG into `dst` PNG at (ox,oy) with simple alpha-over compositing
function blit(src, dst, ox, oy) {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const si = (y * src.width + x) * 4;
      const di = ((oy + y) * dst.width + (ox + x)) * 4;
      const a = src.data[si + 3] / 255;
      dst.data[di] = src.data[si] * a + dst.data[di] * (1 - a);
      dst.data[di + 1] = src.data[si + 1] * a + dst.data[di + 1] * (1 - a);
      dst.data[di + 2] = src.data[si + 2] * a + dst.data[di + 2] * (1 - a);
      dst.data[di + 3] = Math.max(dst.data[di + 3], src.data[si + 3]);
    }
  }
}
