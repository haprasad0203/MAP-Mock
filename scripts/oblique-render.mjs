// Our map rendered from the solved camera of one of H A's oblique drone frames, side by side with the photo (and a
// crop of both), so a building can be judged against the real one from exactly the same viewpoint.
// Usage: node scripts/oblique-render.mjs <frame.cam.json> <out.jpg> [--base=http://localhost:5173] [--crop=x0,y0,x1,y1] (photo px)
import fs from 'node:fs';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import { camera } from './lib/obliquecam.mjs';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [camFile, out] = args.filter(a => !a.startsWith('--')), base = opt.base ?? 'http://localhost:5173';
const J = JSON.parse(fs.readFileSync(camFile, 'utf8')), cam = camera(J.p), [x, y, z, , , , f] = J.p;
const T = JSON.parse(fs.readFileSync('public/data/terrain.json', 'utf8')), Hh = T.heights;
const ground = (a, b) => { const u = (a - T.minX) / T.step, v = (b - T.minY) / T.step, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, g = (p, q) => Hh[q][p]; return (g(i, j) * (1 - fu) + g(i + 1, j) * fu) * (1 - fv) + (g(i, j + 1) * (1 - fu) + g(i + 1, j + 1) * fu) * fv; };
// the optical axis meets the terrain at the target; the dev camera (?cam=) looks at the target from (az, pitch, dist)
const tgt = cam.toGround([1080, 1920], ground), th = ground(...tgt), dx = x - tgt[0], dy = y - tgt[1], hd = Math.hypot(dx, dy);
const az = (Math.atan2(dy, dx) * 180) / Math.PI, pitch = (Math.atan2(z - th, hd) * 180) / Math.PI, dist = Math.hypot(hd, z - th), vfov = (2 * Math.atan(1920 / f) * 180) / Math.PI;
const q = `cam=${[tgt[0], tgt[1], az, pitch, dist, vfov].map(v => v.toFixed(3)).join(',')}`;
const W = 540, H = 960;
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
let shot;
try {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(`${base}/campus?${q}&view=${tgt[0]},${tgt[1]},4,0`);
  await page.addStyleTag({ content: '.app > *:not(canvas) { display: none !important; } nav, .tabbar, footer { display: none !important; }' });
  await page.waitForTimeout(14000);
  shot = await page.screenshot({ type: 'png' });
} finally { await browser.close(); }
const real = await sharp(J.frame).resize(W, H).png().toBuffer(), map = await sharp(shot).resize(W, H).png().toBuffer();
const lab = t => Buffer.from(`<svg width="${W}" height="26"><rect width="100%" height="100%" fill="#101418"/><text x="8" y="18" font-family="Arial" font-size="14" font-weight="700" fill="#FFD23F">${t}</text></svg>`);
const comp = [{ input: lab('REAL (H A drone)'), left: 0, top: 0 }, { input: real, left: 0, top: 26 }, { input: lab('MAP (same camera)'), left: W + 4, top: 0 }, { input: map, left: W + 4, top: 26 }];
let width = 2 * W + 4, height = H + 26;
if (opt.crop) { // a magnified crop of the same region in both
  const [x0, y0, x1, y1] = opt.crop.split(',').map(Number), k = W / 2160, cw = Math.round((x1 - x0) * k), ch = Math.round((y1 - y0) * k), Z = Math.min(2.5, 700 / cw);
  const rc = await sharp(real).extract({ left: Math.round(x0 * k), top: Math.round(y0 * k), width: cw, height: ch }).resize(Math.round(cw * Z)).png().toBuffer();
  const mc = await sharp(map).extract({ left: Math.round(x0 * k), top: Math.round(y0 * k), width: cw, height: ch }).resize(Math.round(cw * Z)).png().toBuffer();
  comp.push({ input: rc, left: 0, top: H + 30 }, { input: mc, left: Math.round(cw * Z) + 4, top: H + 30 });
  width = Math.max(width, 2 * Math.round(cw * Z) + 4); height = H + 30 + Math.round(ch * Z);
}
await sharp({ create: { width, height, channels: 3, background: '#101418' } }).composite(comp).jpeg({ quality: 86 }).toFile(out);
console.log(out, q);
