// Phase 3S: cut the approved Phase 2 renders out of their backgrounds, to use as the buildings on the map.
// Masks and cut-outs only, never repainting. Driven by public/data/sprites.json.
//   node scripts/make-sprites.mjs            all sprites + the checkerboard sheet
//   node scripts/make-sprites.mjs admin nab  only these (the sheet is still rebuilt from what exists)
// Per sprite:
//   1. background: the plain backdrop is flood-filled away from the image border (pixels within `bgTol` of the corner colour;
//      `solid` is a polygon the flood may not enter, for white walls that are close to the backdrop colour);
//   2. diorama cleanup: only what lies inside `mask` (a polygon in image pixels) is kept, with a feathered edge;
//   3. light colour match: `gain` [r, g, b] multipliers only (exposure / white balance), no hue changes;
//   4. export: trimmed WebP with alpha at 2× (full size) and 1× (1024 px wide), plus manifest.json with sizes and trim offsets.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'reference/generated/raw/tycoon', OUT = 'public/campus-art/tycoon/sprites', SHEET = 'reference/style/compare/sprites_cutouts.png';
const cfg = JSON.parse(fs.readFileSync('public/data/sprites.json', 'utf8'));
const only = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const manifestPath = path.join(OUT, 'manifest.json');
const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : {};

function polyMask(poly, W, H) { // 1 inside the polygon
  const m = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    const xs = [], yc = y + 0.5;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > yc) !== (yj > yc)) xs.push(xi + ((yc - yi) / (yj - yi)) * (xj - xi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k])); x <= Math.min(W - 1, Math.floor(xs[k + 1])); x++) m[y * W + x] = 1;
  }
  return m;
}

async function cut(id, s) {
  const { data, info } = await sharp(path.join(SRC, s.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H, tol = s.bgTol ?? 9, shade = s.shadeTol ?? 0;
  // backdrop colour: the median of the four corners
  const corner = (x, y) => { const o = (y * W + x) * 4; return [data[o], data[o + 1], data[o + 2]]; };
  const cs = [corner(4, 4), corner(W - 5, 4), corner(4, H - 5), corner(W - 5, H - 5)];
  const bg = [0, 1, 2].map(c => cs.map(v => v[c]).sort((a, b) => a - b)[1]);
  // backdrop test. With shadeTol, the soft floor shadows (darker, still grey) also count, but only outside the mask.
  const inMask = s.mask ? polyMask(s.mask, W, H) : null, solid = s.solid ? polyMask(s.solid, W, H) : null; // solid: never eaten by the flood (white walls close to the backdrop colour)
  const isBg = q => {
    if (solid && solid[q]) return false;
    const o = q * 4, r = data[o], g = data[o + 1], b = data[o + 2];
    if (Math.abs(r - bg[0]) <= tol && Math.abs(g - bg[1]) <= tol && Math.abs(b - bg[2]) <= tol) return true;
    if (!shade || (inMask && inMask[q])) return false;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mx - mn <= 16 && mx <= bg[0] + tol && mx >= bg[0] - shade;
  };
  const gone = new Uint8Array(N), stack = new Int32Array(N); let top = 0;
  const push = q => { if (!gone[q] && isBg(q)) { gone[q] = 1; stack[top++] = q; } };
  for (let x = 0; x < W; x++) { push(x); push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { push(y * W); push(y * W + W - 1); }
  while (top) { const q = stack[--top], x = q % W; if (x > 0) push(q - 1); if (x < W - 1) push(q + 1); if (q >= W) push(q - W); if (q < N - W) push(q + W); }
  // alpha: kept = not backdrop and (no mask, or inside it); then a small feather
  const alpha = Buffer.alloc(N);
  for (let q = 0; q < N; q++) alpha[q] = !gone[q] && (!inMask || inMask[q]) ? 255 : 0;
  // the generator's sparkle mark sits in the bottom-right corner; `erase` lists any other rectangles [x0, y0, x1, y1] to drop
  for (const [ex0, ey0, ex1, ey1] of [...(s.watermark === false ? [] : [[W - 210, H - 210, W, H]]), ...(s.erase ?? [])]) for (let y = Math.max(0, ey0); y < Math.min(H, ey1); y++) alpha.fill(0, y * W + Math.max(0, ex0), y * W + Math.min(W, ex1));
  const soft = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(s.feather ?? 2).extractChannel(0).raw().toBuffer(); // one channel back, whatever sharp widened it to
  const gain = s.gain ?? [1, 1, 1];
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let q = 0; q < N; q++) {
    const a = Math.max(0, Math.min(255, (soft[q] - 110) * 2.6)); // pull the edge in a little, so no pale halo is left
    const o = q * 4; data[o + 3] = a;
    for (let c = 0; c < 3; c++) data[o + c] = Math.max(0, Math.min(255, data[o + c] * gain[c]));
    if (a > 8) { const x = q % W, y = (q / W) | 0; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const PAD = 3; // transparent border, so a quad that reaches past the picture never smears its edge row
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, w = cw + PAD * 2, h = ch + PAD * 2; x0 -= PAD; y0 -= PAD;
  const cutBuf = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).extract({ left: x0 + PAD, top: y0 + PAD, width: cw, height: ch }).extend({ top: PAD, bottom: PAD, left: PAD, right: PAD, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const full = sharp(cutBuf);
  const b2 = await full.clone().webp({ quality: 86, alphaQuality: 90 }).toBuffer();
  const b1 = await full.clone().resize({ width: Math.min(1024, w) }).webp({ quality: 84, alphaQuality: 90 }).toBuffer();
  fs.writeFileSync(path.join(OUT, `${id}@2x.webp`), b2); fs.writeFileSync(path.join(OUT, `${id}.webp`), b1);
  manifest[id] = { w, h, trim: [x0, y0], source: [W, H], masked: !!s.mask, kb1: Math.round(b1.length / 1024), kb2: Math.round(b2.length / 1024) };
  console.log(`${id}: ${w}×${h}, trim ${x0},${y0}, ${manifest[id].kb1} kB + ${manifest[id].kb2} kB${s.mask ? '' : '  (no cleanup mask yet)'}`);
}

for (const [id, s] of Object.entries(cfg.sprites)) if (!only.length || only.includes(id)) await cut(id, s);
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

// ---------- checkerboard sheet of every cut-out ----------
const ids = Object.keys(cfg.sprites).filter(id => fs.existsSync(path.join(OUT, `${id}.webp`)));
const COLS = 4, CW = 620, CH = 470, rows = Math.ceil(ids.length / COLS), SW = COLS * CW, SH = rows * CH;
const check = Buffer.alloc(SW * SH * 3);
for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const v = ((x >> 4) + (y >> 4)) & 1 ? 150 : 110, o = (y * SW + x) * 3; check[o] = v; check[o + 1] = v; check[o + 2] = v + 6; }
const layers = [];
for (const [i, id] of ids.entries()) {
  const img = await sharp(path.join(OUT, `${id}.webp`)).resize({ width: CW - 30, height: CH - 60, fit: 'inside' }).toBuffer({ resolveWithObject: true });
  const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH;
  layers.push({ input: img.data, left: cx + Math.round((CW - img.info.width) / 2), top: cy + 44 + Math.round((CH - 60 - img.info.height) / 2) });
  const label = `${id}  ·  ${cfg.sprites[id].file}${cfg.sprites[id].mask ? '' : '  ·  background only, no cleanup mask yet'}`;
  layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="36"><rect width="${CW}" height="36" fill="#101418"/><text x="12" y="24" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="${cfg.sprites[id].mask ? '#FFD23F' : '#FF9A8A'}">${label}</text></svg>`), left: cx, top: cy });
}
await sharp(check, { raw: { width: SW, height: SH, channels: 3 } }).composite(layers).png().toFile(SHEET);
const total = ids.reduce((s, id) => s + manifest[id].kb1 + manifest[id].kb2, 0);
console.log(`sheet: ${SHEET} (${ids.length} cut-outs). Total download if every 1× and 2× loads: ${(total / 1024).toFixed(1)} MB`);
