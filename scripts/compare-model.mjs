// Phase 3R: screenshot the ?model=<id> viewer and put it next to the approved render.
// Usage: node scripts/compare-model.mjs <id> <round> [--az=<deg>] [--pitch=<deg>] [--base=http://localhost:5173]
// Writes reference/style/compare/model_<id>_v<round>.png (render on the left, model on the right).
// Needs the dev server running and Microsoft Edge installed (playwright-core drives it; no browser download).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

// The approved render for each landmark (reference/generated/GENERATED.md) and the camera that matches it.
// az = compass direction from the building to the camera, degrees from east, counter-clockwise.
export const MODELS = {
  admin: { render: 'admin_v1.png', az: -70 },
  nab: { render: 'nab_v3.png', az: -77 },
  'hostel-2': { render: 'hostel2-fblock_v2-cream.png', az: -45 },
  'hostel-3': { render: 'hostel3_v1-cream.png', az: -45 },
  'hostel-4': { render: 'hostel4_v1-cream.png', az: -45 },
  'hostel-1': { render: 'hostel1-dblock_v2.png', az: -45 },
  mess: { render: 'mess_v2.png', az: -45 },
  'cafe-cloud': { render: 'cafe-cloud_v1.png', az: -45 },
  'octagon-hall': { render: 'octagon-hall_v1.png', az: -45 },
  'guard-room': { render: 'main-gate_v1.png', az: -45 },
};

const [id, round = '1', ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const cfg = MODELS[id];
if (!cfg) { console.error(`Unknown model "${id}". Known: ${Object.keys(MODELS).join(', ')}`); process.exit(1); }
const base = opt.base ?? 'http://localhost:5173', az = opt.az ?? cfg.az, pitch = opt.pitch ?? 32;
const renderPath = path.join('reference/generated/raw/tycoon', cfg.render), outDir = 'reference/style/compare';
const png = fs.readFileSync(renderPath), rw = png.readUInt32BE(16), rh = png.readUInt32BE(20); // IHDR
const H = 900, W = Math.round((H * rw) / rh);

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/campus?model=${encodeURIComponent(id)}&az=${az}&pitch=${pitch}`);
  await page.waitForFunction(() => window.__modelReady, null, { timeout: 60000 });
  const info = await page.evaluate(() => window.__modelReady);
  await page.waitForTimeout(300);
  const shot = await page.screenshot({ type: 'png' });
  fs.writeFileSync(path.join(outDir, `model_${id}_v${round}_only.png`), shot);
  // the sheet: render | model, same height
  const sheet = await browser.newPage({ viewport: { width: W * 2 + 36, height: H + 64 }, deviceScaleFactor: 1 });
  const img = (buf) => `data:image/png;base64,${buf.toString('base64')}`;
  await sheet.setContent(`<body style="margin:0;background:#101418;font:600 15px system-ui,sans-serif;color:#fff">
    <div style="display:flex;gap:12px;padding:12px 12px 0"><div style="width:${W}px;color:#FFD23F">APPROVED RENDER · ${cfg.render}</div><div>3D MODEL · ${id} · round ${round} · ${info.triangles.toLocaleString()} triangles</div></div>
    <div style="display:flex;gap:12px;padding:8px 12px 12px"><img src="${img(png)}" width="${W}" height="${H}"><img src="${img(shot)}" width="${W}" height="${H}"></div></body>`);
  await sheet.waitForTimeout(200);
  const out = path.join(outDir, `model_${id}_v${round}.png`);
  await sheet.screenshot({ path: out });
  console.log(JSON.stringify({ out, ...info, az: Number(az), pitch: Number(pitch), errors }));
} finally { await browser.close(); }
