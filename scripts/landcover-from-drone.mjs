// Land cover from H A's drone footage (21 Nov): where the campus is woodland, open grass or bare earth, read off the
// frames themselves instead of assumed. Every 3 m map cell is projected into each frame whose camera is known (the
// straight-down still: relief-aware fit; the June oblique frames: solved cameras), its colour and texture classified,
// the views combined (the straight-down still first), and a 3×3 majority filter applied. Writes public/data/landcover.json
// ({ x0, y0, cell, cols, rows, rle: [value, count, ...] }, values 0 none · 1 trees · 2 grass · 3 earth) and a check image.
// Usage: node scripts/landcover-from-drone.mjs [--sample] [--check=out.png]
import fs from 'node:fs';
import sharp from 'sharp';
import { fitDrone3 } from './lib/dronefit.mjs';
import { camera } from './lib/obliquecam.mjs';

const opt = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => { const [k, v = 'true'] = a.slice(2).split('='); return [k, v]; }));
const T = JSON.parse(fs.readFileSync('public/data/terrain.json', 'utf8')), Hh = T.heights;
const ground = (x, y) => { const u = (x - T.minX) / T.step, v = (y - T.minY) / T.step, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, g = (a, b) => Hh[Math.max(0, Math.min(T.rows - 1, b))][Math.max(0, Math.min(T.cols - 1, a))]; return (g(i, j) * (1 - fu) + g(i + 1, j) * fu) * (1 - fv) + (g(i, j + 1) * (1 - fu) + g(i + 1, j + 1) * fu) * fv; };
const DIR = 'D:/Map Mock/reference/video/stills/drone_20nov/';

// ---- the views ----
const views = [];
if (opt.nadir) { const f = fitDrone3(); views.push({ name: 'nadir 0907', file: DIR + 'dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg', project: ([x, y, z]) => f.toPx3([x, y], z), maxDist: Infinity, prio: 2 }); }
for (const camFile of fs.readdirSync('reference/layout/oblique').filter(n => n.endsWith('.cam.json'))) {
  const J = JSON.parse(fs.readFileSync('reference/layout/oblique/' + camFile, 'utf8')), cam = camera(J.p);
  // obliques: only where the ground is within 320 m and seen at least 12° down (haze and grazing views mislead)
  views.push({ name: camFile, file: J.frame, project: q => { const d = Math.hypot(q[0] - J.p[0], q[1] - J.p[1]); if (d > 320 || Math.atan2(J.p[2] - q[2], d) < (12 * Math.PI) / 180) return null; return cam.project(q); }, prio: 1 });
}
for (const v of views) { const { data, info } = await sharp(v.file).removeAlpha().raw().toBuffer({ resolveWithObject: true }); v.data = data; v.w = info.width; v.h = info.height; }

/** Colour and texture at a pixel: mean RGB over a 5×5 window, and the luminance spread (trees are textured, grass smooth). */
function feat(v, u, w) {
  const x0 = Math.round(u), y0 = Math.round(w); if (x0 < 3 || y0 < 3 || x0 >= v.w - 3 || y0 >= v.h - 3) return null;
  let r = 0, g = 0, b = 0, l2 = 0, l1 = 0, n = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = ((y0 + dy) * v.w + x0 + dx) * 3, R = v.data[k], G = v.data[k + 1], B = v.data[k + 2], L = 0.299 * R + 0.587 * G + 0.114 * B; r += R; g += G; b += B; l1 += L; l2 += L * L; n++; }
  r /= n; g /= n; b /= n; const L = l1 / n; let t1 = 0, t2 = 0, tn = 0;
  for (let dy = -7; dy <= 7; dy += 3) for (let dx = -7; dx <= 7; dx += 3) { const xx = Math.min(v.w - 1, Math.max(0, x0 + dx)), yy = Math.min(v.h - 1, Math.max(0, y0 + dy)), k = (yy * v.w + xx) * 3, Lq = 0.299 * v.data[k] + 0.587 * v.data[k + 1] + 0.114 * v.data[k + 2]; t1 += Lq; t2 += Lq * Lq; tn++; }
  const sd = Math.sqrt(Math.max(0, t2 / tn - (t1 / tn) ** 2));
  return { r, g, b, L, sd, green: g - (r + b) / 2, sat: Math.max(r, g, b) - Math.min(r, g, b) };
}
/** 1 trees · 2 grass · 3 earth · 0 none (paved, roofs, water, haze: the data draws those). */
function classify(f) {
  if (!f) return 0;
  if (f.r > f.g + 6 && f.r > f.b + 14 && f.L > 35) return 3;                                  // red-brown earth
  if (f.green > 3 && f.g > f.b - 2) { if (f.L < 38 || (f.sd > 14 && f.L < 70)) return 1; return 2; } // dark or rough green: tree crowns; smooth green: grass
  return 0;
}

if (opt.sample) { // print the features at known spots, to tune the thresholds
  const S = [['f0623_428.cam.json', [[300, 3200, 'big lawn'], [150, 3500, 'big lawn 2'], [1700, 2400, 'football grass'], [900, 3300, 'woods'], [1250, 3500, 'woods 2'], [1900, 3200, 'construction earth'], [900, 2300, 'slope grass'], [200, 2900, 'red patch'], [400, 1950, 'trees by mess'], [1500, 2000, 'trees right']]]];
  for (const [vn, pts] of S) { const v = views.find(x => x.name === vn); for (const [u, w, what] of pts) { const f = feat(v, u, w); console.log(vn.padEnd(20), what.padEnd(20), f && Object.fromEntries(Object.entries(f).map(([k, x]) => [k, +x.toFixed(1)])), '→', classify(f)); } }
  process.exit(0);
}

// ---- the grid over the campus and a margin ----
const L = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));
const bx = L.boundary.map(p => p[0]), by = L.boundary.map(p => p[1]), CELL = 3;
const x0 = Math.floor((Math.min(...bx) - 80) / CELL) * CELL, y0 = Math.floor((Math.min(...by) - 80) / CELL) * CELL;
const cols = Math.ceil((Math.max(...bx) + 80 - x0) / CELL), rows = Math.ceil((Math.max(...by) + 80 - y0) / CELL);
const grid = new Uint8Array(cols * rows);
for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
  const x = x0 + (i + 0.5) * CELL, y = y0 + (j + 0.5) * CELL, z = ground(x, y);
  let best = 0, bp = -1;
  for (const v of views) { const p = v.project([x, y, z]); if (!p || p[0] < 3 || p[1] < 3 || p[0] >= v.w - 3 || p[1] >= v.h - 3) continue; const c = classify(feat(v, p[0], p[1])); if (c && v.prio > bp) { best = c; bp = v.prio; } }
  grid[j * cols + i] = best;
}
// majority filter (3×3) over the known cells
const out = new Uint8Array(grid);
for (let j = 1; j < rows - 1; j++) for (let i = 1; i < cols - 1; i++) {
  const cnt = [0, 0, 0, 0]; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) cnt[grid[(j + dy) * cols + i + dx]]++;
  if (!grid[j * cols + i]) continue; let m = grid[j * cols + i]; for (let c = 1; c <= 3; c++) if (cnt[c] > cnt[m]) m = c; out[j * cols + i] = m;
}
const rle = []; for (let k = 0; k < out.length;) { let n = 1; while (k + n < out.length && out[k + n] === out[k]) n++; rle.push(out[k], n); k += n; }
fs.writeFileSync('public/data/landcover.json', JSON.stringify({ note: "Land cover read off H A's drone footage (scripts/landcover-from-drone.mjs): 0 none, 1 trees, 2 grass, 3 earth; 3 m cells from (x0, y0).", x0, y0, cell: CELL, cols, rows, rle }));
const counts = [0, 0, 0, 0]; for (const v of out) counts[v]++;
console.log('landcover', cols, 'x', rows, 'cells; none/trees/grass/earth', counts.join(' / '), '; runs', rle.length / 2);
if (opt.check) {
  const px = Buffer.alloc(cols * rows * 3), COL = [[40, 40, 40], [34, 90, 40], [150, 190, 90], [190, 110, 70]];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const c = COL[out[j * cols + i]], k = ((rows - 1 - j) * cols + i) * 3; px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; }
  let svg = `<svg width="${cols}" height="${rows}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#fff" stroke-width="0.6">`;
  for (const b of L.buildings) for (const p of b.parts) svg += `<polygon points="${p.poly.map(q => `${((q[0] - x0) / CELL).toFixed(1)},${(rows - (q[1] - y0) / CELL).toFixed(1)}`).join(' ')}"/>`;
  svg += `<polygon points="${L.boundary.map(q => `${((q[0] - x0) / CELL).toFixed(1)},${(rows - (q[1] - y0) / CELL).toFixed(1)}`).join(' ')}" stroke="#ff0" stroke-dasharray="3 2"/></g></svg>`;
  await sharp(px, { raw: { width: cols, height: rows, channels: 3 } }).composite([{ input: Buffer.from(svg) }]).resize(cols * 2, rows * 2, { kernel: 'nearest' }).png().toFile(opt.check);
  console.log(opt.check);
}
