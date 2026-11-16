// Place-card pictures from our own real-campus 3D models (Phase 4): the ?model= viewer at a friendly 3/4 view, saved as
// public/campus-art/model/<id>.webp (640×264). Replaces the Gemini renders on the cards.
// Usage: node scripts/thumbs.mjs [--base=http://localhost:5173]
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs';

const base = process.argv.find(a => a.startsWith('--base='))?.slice(7) ?? 'http://localhost:5173';
// building id → camera (az from the building to the camera, pitch), matched to each building's best side
const SHOTS = {
  admin: [-100, 22], nab: [-38, 18], 'cafe-cloud': [-62, 26], 'octagon-hall': [-60, 28], mess: [-60, 34], 'hostel-1': [-60, 24], 'hostel-2': [-60, 22],
  'hostel-3': [-60, 22], 'hostel-4': [-60, 22], gym: [40, 20], 'guard-room': [-130, 14], 'kalam-centre': [-140, 20], type2: [-60, 30], type3: [-60, 30],
};
const ZOOM = { admin: 1.25, nab: 1.15, mess: 2.0, type2: 1.7, type3: 1.6, gym: 1.6, 'guard-room': 1.5 };
fs.mkdirSync('public/campus-art/model', { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  for (const [id, [az, pitch]] of Object.entries(SHOTS)) {
    const page = await browser.newPage({ viewport: { width: 960, height: 396 }, deviceScaleFactor: 1 });
    await page.goto(`${base}/campus?model=${id}&az=${az}&pitch=${pitch}&fov=18&zoom=${ZOOM[id] ?? 1.45}`);
    await page.waitForFunction(() => window.__modelReady, null, { timeout: 60000 }); await page.waitForTimeout(300);
    const png = await page.screenshot({ type: 'png' }); await page.close();
    const out = `public/campus-art/model/${id}.webp`;
    await sharp(png).resize(640, 264).webp({ quality: 80 }).toFile(out);
    console.log(out, fs.statSync(out).size);
  }
} finally { await browser.close(); }
