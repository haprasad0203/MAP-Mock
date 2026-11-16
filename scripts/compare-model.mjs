// Screenshot the ?model=<id> viewer and put it next to the approved render (Phase 3R, kept for Phase 3M).
// Usage: node scripts/compare-model.mjs <id> <round> [--az=<deg>] [--pitch=<deg>] [--base=http://localhost:5173] [--rot4] [--plan]
// Writes reference/style/compare/model_<id>_v<round>.png (render on the left, model on the right), and with
//   --rot4  model_<id>_v<round>_rot4.png: the model at the MAP camera (52° down) in its 4 rotations (SE, NE, NW, SW);
//   --plan  model_<id>_v<round>_plan.png: straight down, with the data footprint outlined in yellow (size check).
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
const MAP_PITCH = 52, ROT_NAMES = ['SE', 'NE', 'NW', 'SW']; // src/render3d/camera.ts: azimuth(rot) = -45 - 90 * rot

const [id, round = '1', ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));
const cfg = MODELS[id];
if (!cfg) { console.error(`Unknown model "${id}". Known: ${Object.keys(MODELS).join(', ')}`); process.exit(1); }
const base = opt.base ?? 'http://localhost:5173', az = opt.az ?? cfg.az, pitch = opt.pitch ?? 32;
const renderPath = path.join('reference/generated/raw/tycoon', cfg.render), outDir = 'reference/style/compare';
const png = fs.readFileSync(renderPath), rw = png.readUInt32BE(16), rh = png.readUInt32BE(20); // IHDR
const H = 900, W = Math.round((H * rw) / rh);
const img = (buf) => `data:image/png;base64,${buf.toString('base64')}`;

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
const errors = [];
/** One screenshot of the viewer. */
async function shot(query, w, h) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', e => errors.push(String(e)));
  page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  await page.goto(`${base}/campus?model=${encodeURIComponent(id)}&${query}`);
  await page.waitForFunction(() => window.__modelReady, null, { timeout: 60000 });
  const info = await page.evaluate(() => window.__modelReady);
  await page.waitForTimeout(300);
  const buf = await page.screenshot({ type: 'png' }); await page.close();
  return { buf, info };
}
async function sheetOf(html, w, h, out) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await page.setContent(`<body style="margin:0;background:#101418;font:600 15px system-ui,sans-serif;color:#fff">${html}</body>`);
  await page.waitForTimeout(200); await page.screenshot({ path: out }); await page.close();
}
try {
  const out = { id, round: Number(round) };
  // render | model at the render's camera
  const m = await shot(`az=${az}&pitch=${pitch}`, W, H);
  fs.writeFileSync(path.join(outDir, `model_${id}_v${round}_only.png`), m.buf);
  out.sheet = path.join(outDir, `model_${id}_v${round}.png`); Object.assign(out, m.info);
  await sheetOf(`<div style="display:flex;gap:12px;padding:12px 12px 0"><div style="width:${W}px;color:#FFD23F">APPROVED RENDER · ${cfg.render}</div><div>3D MODEL · ${id} · round ${round} · ${m.info.triangles.toLocaleString()} triangles</div></div>
    <div style="display:flex;gap:12px;padding:8px 12px 12px"><img src="${img(png)}" width="${W}" height="${H}"><img src="${img(m.buf)}" width="${W}" height="${H}"></div>`, W * 2 + 36, H + 64, out.sheet);
  if (opt.rot4) { // the map camera, all four rotations
    const S = 760, shots = [];
    for (let r = 0; r < 4; r++) shots.push((await shot(`az=${-45 - 90 * r}&pitch=${MAP_PITCH}`, S, S)).buf);
    out.rot4 = path.join(outDir, `model_${id}_v${round}_rot4.png`);
    await sheetOf(`<div style="padding:12px 12px 0;color:#FFD23F">${id} · round ${round} · map camera (${MAP_PITCH}° down), 4 rotations</div>
      <div style="display:grid;grid-template-columns:repeat(2,${S}px);gap:12px;padding:8px 12px 12px">${shots.map((b, r) => `<div><div style="padding:0 0 4px">${ROT_NAMES[r]} (rot ${r})</div><img src="${img(b)}" width="${S}" height="${S}"></div>`).join('')}</div>`, S * 2 + 36, S * 2 + 100, out.rot4);
  }
  if (opt.plan) { // straight down, north up, with the data footprint
    const S = 1000, p = await shot('az=-90&pitch=89&outline=1', S, S);
    out.plan = path.join(outDir, `model_${id}_v${round}_plan.png`);
    await sheetOf(`<div style="padding:12px 12px 0;color:#FFD23F">${id} · round ${round} · plan view, north up · yellow = data footprint (public/data/campus-layout.json)</div>
      <div style="padding:8px 12px 12px"><img src="${img(p.buf)}" width="${S}" height="${S}"></div>`, S + 24, S + 60, out.plan);
  }
  console.log(JSON.stringify({ ...out, az: Number(az), pitch: Number(pitch), errors: [...new Set(errors)] }));
} finally { await browser.close(); }
