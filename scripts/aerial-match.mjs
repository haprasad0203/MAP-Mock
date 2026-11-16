// Whole-campus check against the official drone photos (REAL_CAMPUS_MODELS.md section 4): the map rendered from a camera
// matched by eye to DJI_0338 and Image_363 (dev switch ?cam=x,y,az,pitch,dist,fov in Engine3D), cropped to the photo's
// banner shape and stacked under it → reference/style/compare/aerial_match_v<N>.png.
// Usage: node scripts/aerial-match.mjs <round> [--base=http://localhost:5173]
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import fs from 'node:fs';

const [round = '1', ...rest] = process.argv.slice(2);
const opt = Object.fromEntries(rest.filter(a => a.startsWith('--')).map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));
const base = opt.base ?? 'http://localhost:5173';
// cam: target x, y (local metres), azimuth from target to camera (deg, from east CCW), pitch down, distance, vertical fov of
// the 1920×1080 render; the photo's band is the middle `bandH` rows (its own aspect).
export const SHOTS = [
  { photo: 'reference/photos/aerial/DJI_0338-0000-01.jpg', label: 'DJI_0338 (official drone, from the SE)', cam: [160, -140, -62, 17, 420, 34], bandH: 300 },
  { photo: 'reference/photos/aerial/Image_363.jpeg', label: 'Image_363 (official drone, from the S, wider)', cam: [158, -150, -70, 18, 560, 34], bandH: 270 },
];
const W = 1920, H = 1080;
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
try {
  const rows = [];
  for (const s of SHOTS) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await page.goto(`${base}/campus?cam=${s.cam.join(',')}&view=${s.cam[0]},${s.cam[1]},4,0`);
    await page.waitForTimeout(14000);
    const shot = await page.screenshot({ type: 'png' }); await page.close();
    const band = await sharp(shot).extract({ left: 0, top: Math.round((H - s.bandH) / 2), width: W, height: s.bandH }).png().toBuffer();
    const real = await sharp(s.photo).resize(W, s.bandH, { fit: 'fill' }).png().toBuffer();
    rows.push({ s, band, real });
  }
  const label = t => Buffer.from(`<svg width="${W}" height="30"><rect width="100%" height="100%" fill="#101418"/><text x="10" y="21" font-family="Arial" font-size="17" font-weight="700" fill="#FFD23F">${t}</text></svg>`);
  const comp = []; let y = 0;
  for (const r of rows) {
    comp.push({ input: label(`REAL · ${r.s.label}`), left: 0, top: y }); y += 30; comp.push({ input: r.real, left: 0, top: y }); y += r.s.bandH + 4;
    comp.push({ input: label(`MAP v${round} · camera ${r.s.cam.join(', ')} (target x, y, az, pitch, dist, fov)`), left: 0, top: y }); y += 30; comp.push({ input: r.band, left: 0, top: y }); y += r.s.bandH + 16;
  }
  const out = `reference/style/compare/aerial_match_v${round}.png`;
  await sharp({ create: { width: W, height: y, channels: 3, background: '#101418' } }).composite(comp).png().toFile(out);
  console.log(out);
} finally { await browser.close(); }
