// Trace a building's roof outline on H A's straight-down drone still (20 Nov): flood-fill the roof from seed points,
// with the white parapet lines as walls, then take the outer boundary of the filled region (plus the parapet itself and
// the roof structures inside it) and simplify it. Prints the outline in full-size pixels and writes a check image.
// Usage: node scripts/trace-roof.mjs <photo> <L,T,W,H> <seeds x,y;x,y...> <out.jpg> [--white=165] [--eps=3] [--grow=2]
import sharp from 'sharp';
import fs from 'node:fs';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [photo, box, seedArg, out] = args.filter(a => !a.startsWith('--'));
const [L, T, W, H] = box.split(',').map(Number), seeds = seedArg.split(';').map(s => s.split(',').map(Number));
const WHITE = +(opt.white ?? 165), EPS = +(opt.eps ?? 3), GROW = +(opt.grow ?? 2);
const { data } = await sharp(photo).extract({ left: L, top: T, width: W, height: H }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const N = W * H, lum = new Float32Array(N), sat = new Float32Array(N);
for (let i = 0; i < N; i++) { const r = data[3 * i], g = data[3 * i + 1], b = data[3 * i + 2]; lum[i] = 0.299 * r + 0.587 * g + 0.114 * b; sat[i] = Math.max(r, g, b) - Math.min(r, g, b); }
// walls: bright, unsaturated pixels (the white parapets), grown a little so thin lines have no gaps
let wall = new Uint8Array(N); for (let i = 0; i < N; i++) wall[i] = lum[i] > WHITE && sat[i] < 45 ? 1 : 0;
for (let k = 0; k < GROW; k++) { const w2 = wall.slice(); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (!wall[i] && (wall[i - 1] || wall[i + 1] || wall[i - W] || wall[i + W])) w2[i] = 1; } wall = w2; }
// flood fill from every seed (a seed on a wall pixel is moved to the nearest open pixel)
const fill = new Uint8Array(N), stack = [];
for (const [sx, sy] of seeds) { const i = (sy - T) * W + (sx - L); if (i >= 0 && i < N && !wall[i]) stack.push(i); }
while (stack.length) { const i = stack.pop(); if (fill[i] || wall[i]) continue; fill[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1); if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W); }
// building = filled roof + the walls that touch it (the parapets and roof boxes), then close small gaps
let bld = new Uint8Array(N); for (let i = 0; i < N; i++) bld[i] = fill[i];
for (let k = 0; k < GROW + 3; k++) { const b2 = bld.slice(); for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (!bld[i] && wall[i] && (bld[i - 1] || bld[i + 1] || bld[i - W] || bld[i + W])) b2[i] = 1; } bld = b2; }
// fill holes: everything not reachable from the border through non-building pixels
const outside = new Uint8Array(N), q = []; for (let x = 0; x < W; x++) q.push(x, (H - 1) * W + x); for (let y = 0; y < H; y++) q.push(y * W, y * W + W - 1);
while (q.length) { const i = q.pop(); if (outside[i] || bld[i]) continue; outside[i] = 1; const x = i % W, y = (i / W) | 0; if (x > 0) q.push(i - 1); if (x < W - 1) q.push(i + 1); if (y > 0) q.push(i - W); if (y < H - 1) q.push(i + W); }
for (let i = 0; i < N; i++) if (!outside[i]) bld[i] = 1;
// outer boundary: Moore-neighbour tracing from the top-left building pixel
let start = -1; for (let i = 0; i < N; i++) if (bld[i]) { start = i; break; }
const D = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]], at = (x, y) => x >= 0 && y >= 0 && x < W && y < H && bld[y * W + x];
let cx = start % W, cy = (start / W) | 0, dir = 7; const contour = [[cx, cy]];
for (let n = 0; n < N * 2; n++) {
  let found = false;
  for (let k = 0; k < 8; k++) { const d = (dir + 6 + k) % 8, nx = cx + D[d][0], ny = cy + D[d][1]; if (at(nx, ny)) { cx = nx; cy = ny; dir = d; found = true; break; } }
  if (!found || (cx === contour[0][0] && cy === contour[0][1] && contour.length > 2)) break;
  contour.push([cx, cy]);
}
// Douglas-Peucker on the closed contour
function dp(pts, eps) {
  if (pts.length < 3) return pts;
  const [a, b] = [pts[0], pts[pts.length - 1]]; let best = -1, bi = 0;
  for (let i = 1; i < pts.length - 1; i++) { const p = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, d = Math.abs((p[0] - a[0]) * dy - (p[1] - a[1]) * dx) / l; if (d > best) { best = d; bi = i; } }
  return best > eps ? [...dp(pts.slice(0, bi + 1), eps).slice(0, -1), ...dp(pts.slice(bi), eps)] : [a, b];
}
const far = contour.reduce((m, p, i) => (Math.hypot(p[0] - contour[0][0], p[1] - contour[0][1]) > m.d ? { d: Math.hypot(p[0] - contour[0][0], p[1] - contour[0][1]), i } : m), { d: 0, i: 0 }).i;
const poly = [...dp(contour.slice(0, far + 1), EPS).slice(0, -1), ...dp([...contour.slice(far), contour[0]], EPS).slice(0, -1)].map(([x, y]) => [x + L, y + T]);
// check image: the fill (tinted), the walls, the outline and its vertices
const tint = Buffer.alloc(N * 4); for (let i = 0; i < N; i++) { if (fill[i]) { tint[4 * i] = 0; tint[4 * i + 1] = 255; tint[4 * i + 2] = 120; tint[4 * i + 3] = 70; } else if (wall[i] && bld[i]) { tint[4 * i] = 255; tint[4 * i + 1] = 0; tint[4 * i + 2] = 200; tint[4 * i + 3] = 90; } }
const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><polygon points="${poly.map(([x, y]) => `${x - L},${y - T}`).join(' ')}" fill="none" stroke="#ffff00" stroke-width="2"/>${poly.map(([x, y], k) => `<circle cx="${x - L}" cy="${y - T}" r="3" fill="#ff0"/><text x="${x - L + 4}" y="${y - T - 3}" fill="#fff" stroke="#000" stroke-width="2" paint-order="stroke" font-size="11" font-family="Arial">${k}</text>`).join('')}${seeds.map(([x, y]) => `<circle cx="${x - L}" cy="${y - T}" r="4" fill="#f00"/>`).join('')}</svg>`;
await sharp(photo).extract({ left: L, top: T, width: W, height: H }).composite([{ input: tint, raw: { width: W, height: H, channels: 4 } }, { input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toFile(out);
fs.writeFileSync(out.replace(/\.jpg$/, '.json'), JSON.stringify(poly));
console.log(JSON.stringify({ vertices: poly.length, contour: contour.length, filled: fill.reduce((s, v) => s + v, 0), out }));
