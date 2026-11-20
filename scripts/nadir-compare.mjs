// Real straight-down drone still | our 3D map from the same overhead camera | the two blended, for the whole-campus
// likeness check (H A, 20 Nov: "buildings are mismatching, roads and everything").
// Usage: node scripts/nadir-compare.mjs <photo> <out.jpg> <px,py,x,y;...> [--base=http://localhost:5173] [--w=540]
import { chromium } from 'playwright-core';
import sharp from 'sharp';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [photo, out, pairsArg] = args.filter(a => !a.startsWith('--'));
const base = opt.base ?? 'http://localhost:5173', VW = +(opt.w ?? 540);
const pairs = pairsArg.split(';').map(s => s.split(',').map(Number));
// px = a·x + b·y + tx ; py = b·x − a·y + ty
const N = Array.from({ length: 4 }, () => [0, 0, 0, 0]), R = [0, 0, 0, 0];
const add = (row, v) => { for (let i = 0; i < 4; i++) { R[i] += row[i] * v; for (let j = 0; j < 4; j++) N[i][j] += row[i] * row[j]; } };
for (const [px, py, x, y] of pairs) { add([x, y, 1, 0], px); add([-y, x, 0, 1], py); }
const [a, b, tx, ty] = solve(N, R), s = Math.hypot(a, b);
const toM = (px, py) => { const u = px - tx, v = py - ty, d = a * a + b * b; return [(a * u + b * v) / d, (b * u - a * v) / d]; };
const meta = await sharp(photo).metadata(), VH = Math.round(VW * meta.height / meta.width);
const [cx, cy] = toM(meta.width / 2, meta.height / 2);
const upDeg = (Math.atan2(a, -b) * 180) / Math.PI;           // world direction of the photo's "up"
const spanM = meta.height / s, dist = 2400, fov = (2 * Math.atan(spanM / 2 / dist) * 180) / Math.PI;
const cam = [cx, cy, upDeg + 180, 89.8, dist, fov].map(v => +v.toFixed(3));

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--enable-gpu', '--use-angle=d3d11', '--ignore-gpu-blocklist'] });
let shot;
try {
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  await page.addStyleTag?.({ content: '' }).catch(() => {});
  await page.goto(`${base}/campus?cam=${cam.join(',')}&view=${cx},${cy},4,0&q=high`);
  await page.addStyleTag({ content: '.app > *:not(canvas) { display: none !important; } nav, .tabbar, footer { display: none !important; }' });
  await page.waitForTimeout(15000);
  shot = await page.screenshot({ type: 'png' });
} finally { await browser.close(); }
const real = await sharp(photo).resize(VW, VH).png().toBuffer(), map = await sharp(shot).resize(VW, VH).png().toBuffer();
const blend = await sharp(real).composite([{ input: await sharp(map).ensureAlpha(0.5).png().toBuffer(), blend: 'over' }]).png().toBuffer();
const lab = t => Buffer.from(`<svg width="${VW}" height="28"><rect width="100%" height="100%" fill="#101418"/><text x="8" y="19" font-family="Arial" font-size="15" font-weight="700" fill="#FFD23F">${t}</text></svg>`);
await sharp({ create: { width: VW * 3 + 8, height: VH + 28, channels: 3, background: '#101418' } })
  .composite([{ input: lab('REAL (drone, straight down)'), left: 0, top: 0 }, { input: real, left: 0, top: 28 }, { input: lab('MAP (same camera)'), left: VW + 4, top: 0 }, { input: map, left: VW + 4, top: 28 }, { input: lab('blend 50%'), left: 2 * VW + 8, top: 0 }, { input: blend, left: 2 * VW + 8, top: 28 }])
  .jpeg({ quality: 88 }).toFile(out);
console.log(JSON.stringify({ out, cam, pxPerM: +s.toFixed(3) }));

function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let q = c; q <= n; q++) M[r][q] -= f * M[c][q]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
