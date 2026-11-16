// Phase 3M (reference/style/BUILD_LANDMARKS_3D.md, section 1): facade atlases cut from the approved renders.
//   node scripts/extract-facades.mjs            every building in public/data/facades.json
//   node scripts/extract-facades.mjs admin nab  only these
// Pixel source: the ORIGINAL PNG renders in reference/generated/raw/tycoon/ (read losslessly). Nothing is repainted:
//   1. each marked wall quad is rectified to a flat front-on image with a homography (bilinear), at `pxPerM`;
//      its real width comes from the render camera's pitch (a horizontal run (dx, dy) on screen is sqrt(dx² + (dy/sin p)²)
//      long, a vertical run v is v / cos p), scaled by the face's known height;
//   2. the painted light is evened out: each face is divided by its blurred brightness (baked gradients go, detail
//      stays), then its plaster is set to the building's white (`white`), from the face's own brightest pixels
//      (`wb: "self"`) or from the building's plaster sample;
//   3. walls are split into base / typical / top strips and one seamless window bay; specials are kept whole;
//   4. everything is packed into one WebP atlas per building (8 px edge-extended gutters, so mipmaps don't bleed):
//      public/campus-art/tycoon/facades/<id>.webp, with the regions written back into facades.json → <id>.atlas;
//   5. a contact sheet reference/style/compare/facades_<id>.png shows original → rectified → strips and pieces.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const CFG = 'public/data/facades.json', SRC = 'reference/generated/raw/tycoon', OUT = 'public/campus-art/tycoon/facades', SHEETS = 'reference/style/compare';
const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));
const only = process.argv.slice(2), PPM = cfg.pxPerM ?? 40, PITCH = ((cfg.pitch ?? 32) * Math.PI) / 180, GUT = 8;
fs.mkdirSync(OUT, { recursive: true });

// ---------- small raster helpers (RGB float images) ----------
const img = (w, h) => ({ w, h, d: new Float32Array(w * h * 3) });
const hex = c => '#' + c.map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
const unhex = s => [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
function crop(im, x0, y0, w, h) {
  const o = img(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 3; c++) o.d[(y * w + x) * 3 + c] = im.d[((y0 + y) * im.w + (x0 + x)) * 3 + c];
  return o;
}
function bilinear(src, x, y, out, o) {
  x = Math.max(0, Math.min(src.w - 1.001, x)); y = Math.max(0, Math.min(src.h - 1.001, y));
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, i = (y0 * src.w + x0) * 3, j = i + src.w * 3;
  for (let c = 0; c < 3; c++) out[o + c] = (src.d[i + c] * (1 - fx) + src.d[i + 3 + c] * fx) * (1 - fy) + (src.d[j + c] * (1 - fx) + src.d[j + 3 + c] * fx) * fy;
}
/** Unit square (u right, v down) → quad TL, TR, BR, BL (Heckbert's square-to-quad). */
function squareToQuad(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q, dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(dx3) > 1e-9 || Math.abs(dy3) > 1e-9) { const den = dx1 * dy2 - dx2 * dy1; g = (dx3 * dy2 - dx2 * dy3) / den; h = (dx1 * dy3 - dx3 * dy1) / den; }
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + h * y3, f = y0;
  return (u, v) => { const w = g * u + h * v + 1; return [(a * u + b * v + c) / w, (d * u + e * v + f) / w]; };
}
const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
async function blurLum(im, sigma) {
  const L = Buffer.alloc(im.w * im.h); for (let i = 0; i < im.w * im.h; i++) L[i] = Math.max(0, Math.min(255, Math.round(lum(im.d, i * 3))));
  const b = await sharp(L, { raw: { width: im.w, height: im.h, channels: 1 } }).blur(Math.max(0.5, sigma)).extractChannel(0).raw().toBuffer();
  return b;
}
/** Remove the baked light gradient: divide by the blurred brightness, keep the mean. */
async function evenOut(im) {
  const n = im.w * im.h, b = await blurLum(im, Math.max(4, Math.min(im.w, im.h) * 0.3)); let m = 0; for (let i = 0; i < n; i++) m += b[i]; m /= n;
  for (let i = 0; i < n; i++) { const k = Math.max(0.72, Math.min(1.45, m / Math.max(1, b[i]))); for (let c = 0; c < 3; c++) im.d[i * 3 + c] *= k; }
}
/** Mean colour of the brightest `frac` of pixels (the plaster in a wall picture). */
function brightColour(im, frac = 0.3) {
  const n = im.w * im.h, idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => lum(im.d, b * 3) - lum(im.d, a * 3)), k = Math.max(1, Math.round(n * frac)), s = [0, 0, 0];
  for (let t = 0; t < k; t++) for (let c = 0; c < 3; c++) s[c] += im.d[idx[t] * 3 + c];
  return s.map(v => v / k);
}
const applyGain = (im, g) => { for (let i = 0; i < im.w * im.h; i++) for (let c = 0; c < 3; c++) im.d[i * 3 + c] *= g[c]; };
const gainTo = (from, to) => to.map((t, c) => Math.max(0.75, Math.min(1.5, t / Math.max(1, from[c]))));
/** Seamless across x: the first k columns fade from what follows the tile in the source into the tile itself. */
function seamX(src, x0, y0, w, h) {
  const k = Math.min(Math.round(w * 0.12), src.w - (x0 + w)), o = crop(src, x0, y0, w, h);
  if (k < 2) return o;
  for (let y = 0; y < h; y++) for (let x = 0; x < k; x++) { const t = x / k; for (let c = 0; c < 3; c++) o.d[(y * w + x) * 3 + c] = src.d[((y0 + y) * src.w + x0 + w + x) * 3 + c] * (1 - t) + o.d[(y * w + x) * 3 + c] * t; }
  return o;
}
/** Seamless down y in place, using the rows just below the tile in the source. */
function seamY(o, src, x0, y0) {
  const k = Math.min(Math.round(o.h * 0.12), src.h - (y0 + o.h)); if (k < 2) return o;
  for (let y = 0; y < k; y++) { const t = y / k; for (let x = 0; x < o.w; x++) for (let c = 0; c < 3; c++) o.d[(y * o.w + x) * 3 + c] = src.d[((y0 + o.h + y) * src.w + Math.min(src.w - 1, x0 + x)) * 3 + c] * (1 - t) + o.d[(y * o.w + x) * 3 + c] * t; }
  return o;
}
const toBuf = im => { const b = Buffer.alloc(im.w * im.h * 3); for (let i = 0; i < b.length; i++) b[i] = Math.max(0, Math.min(255, Math.round(im.d[i]))); return b; };
const png = (im, h) => sharp(toBuf(im), { raw: { width: im.w, height: im.h, channels: 3 } }).resize({ height: h, fit: 'inside' }).png().toBuffer({ resolveWithObject: true });

// ---------- one building ----------
async function building(id, F) {
  const { data, info } = await sharp(path.join(SRC, F.file)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const src = img(info.width, info.height); for (let i = 0; i < data.length; i++) src.d[i] = data[i];
  const white = unhex(F.white ?? '#FBFAF6'), items = [], rows = [], faceInfo = {};
  const plasterS = (F.samples ?? []).find(s => s.name === 'plaster');
  let bGain = [1, 1, 1];
  if (plasterS) { const [x0, y0, x1, y1] = plasterS.rect, p = crop(src, x0, y0, x1 - x0, y1 - y0); await evenOut(p); bGain = gainTo(brightColour(p, 0.5), white); }
  const vPxPerM = [];

  for (const f of F.faces) {
    const q = f.quad, top = [((q[1][0] - q[0][0]) + (q[2][0] - q[3][0])) / 2, ((q[1][1] - q[0][1]) + (q[2][1] - q[3][1])) / 2];
    const vpx = (Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]) + Math.hypot(q[2][0] - q[1][0], q[2][1] - q[1][1])) / 2;
    const unitsW = Math.hypot(top[0], top[1] / Math.sin(PITCH)), unitsH = vpx / Math.cos(PITCH), hm = f.heightM, wm = f.widthM ?? (hm * unitsW) / unitsH;
    vPxPerM.push(vpx / hm);
    const W = Math.max(8, Math.round(wm * PPM)), H = Math.max(8, Math.round(hm * PPM)), map = squareToQuad(q), R = img(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [sx, sy] = map((x + 0.5) / W, (y + 0.5) / H); bilinear(src, sx, sy, R.d, (y * W + x) * 3); }
    await evenOut(R);
    applyGain(R, f.wb === 'self' ? gainTo(brightColour(R), white) : bGain);
    const made = [];
    // strips: base / typical / top, one window bay wide
    // default bands from the floor count: top floor, a middle floor (the repeating one), ground floor
    const fl = f.floors, k = fl >= 3 ? Math.floor((fl - 1) / 2) : 0;
    const bands = f.bands ?? (fl ? Object.fromEntries([fl >= 3 && ['top', [0, 1 / fl]], ['typ', [k / fl, (k + 1) / fl]], fl >= 2 && ['base', [1 - 1 / fl, 1]]].filter(Boolean)) : null);
    const bays = f.bays ?? 0;
    if (bands && bays) {
      const bw = Math.floor(W / bays), bi = Math.floor(bays / 2), bx = Math.min(bi * bw, W - bw);
      for (const [band, [v0, v1]] of Object.entries(bands)) {
        const y0 = Math.round(v0 * H), h = Math.max(4, Math.round((v1 - v0) * H));
        let t = bays > 1 ? seamX(R, bx, y0, bw, h) : crop(R, 0, y0, W, h);
        if (band === 'typ') t = seamY(t, R, bx, y0);
        const name = `${f.name}.${band}`; items.push({ name, im: t, wm: t.w / PPM, hm: (v1 - v0) * hm, kind: 'strip' }); made.push(name);
      }
    }
    for (const p of f.pieces ?? []) {
      const x0 = Math.round(p.u[0] * W), y0 = Math.round(p.v[0] * H), w = Math.max(4, Math.round((p.u[1] - p.u[0]) * W)), h = Math.max(4, Math.round((p.v[1] - p.v[0]) * H));
      const t = crop(R, Math.min(x0, W - w), Math.min(y0, H - h), w, h);
      items.push({ name: p.name, im: t, wm: w / PPM, hm: h / PPM, kind: 'piece', type: p.type }); made.push(p.name);
    }
    faceInfo[f.name] = { wm: +wm.toFixed(2), hm, bays, bayM: bays ? +(wm / bays).toFixed(2) : null };
    rows.push({ f, R, made, wm, hm });
  }

  // samples: roof colours, and tileable plaster / stone
  const vpm = vPxPerM.sort((a, b) => a - b)[vPxPerM.length >> 1] ?? 20, colours = {};
  for (const s of F.samples ?? []) {
    const [x0, y0, x1, y1] = s.rect, c = crop(src, x0, y0, x1 - x0, y1 - y0);
    // roof colour: the sample's plain mean (a white-balance gain taken from shaded plaster over-brightens it)
    if (s.type === 'roof') { const m = [0, 0, 0]; for (let i = 0; i < c.w * c.h; i++) for (let k = 0; k < 3; k++) m[k] += c.d[i * 3 + k] / (c.w * c.h); colours[s.name] = hex(m); continue; }
    // scale to pxPerM using the median vertical scale of the faces, then make it tile both ways
    const sc = PPM / vpm, W = Math.max(8, Math.round(c.w * sc)), H = Math.max(8, Math.round(c.h * sc)), R = img(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) bilinear(c, (x + 0.5) / sc, (y + 0.5) / sc, R.d, (y * W + x) * 3);
    await evenOut(R); applyGain(R, s.name === 'plaster' ? gainTo(brightColour(R, 0.5), white) : bGain);
    const k = Math.round(Math.min(W, H) * 0.15), t = seamY(seamX(R, 0, 0, W - k, H - k), R, 0, 0);
    items.push({ name: s.name, im: t, wm: t.w / PPM, hm: t.h / PPM, kind: 'tile' });
    rows.push({ sample: s, R, made: [s.name] });
  }

  // ---------- pack (shelves, tallest first) with edge-extended gutters ----------
  const order = [...items].sort((a, b) => b.im.h - a.im.h);
  let AW = 1024, placed;
  for (;;) {
    placed = []; let x = 0, y = 0, rowH = 0, ok = true;
    for (const it of order) {
      const w = it.im.w + GUT * 2, h = it.im.h + GUT * 2;
      if (w > AW) { ok = false; break; }
      if (x + w > AW) { x = 0; y += rowH; rowH = 0; }
      placed.push({ it, x, y }); x += w; rowH = Math.max(rowH, h);
    }
    const used = y + rowH;
    if (ok && used <= AW) { placed.AH = Math.max(64, 2 ** Math.ceil(Math.log2(used))); break; }
    if (AW >= 4096) throw new Error(`${id}: atlas does not fit in 4096 px`);
    AW *= 2;
  }
  const AH = placed.AH, atlas = Buffer.alloc(AW * AH * 3, 0), regions = {};
  for (const { it, x, y } of placed) {
    const { w, h, d } = it.im;
    for (let yy = -GUT; yy < h + GUT; yy++) for (let xx = -GUT; xx < w + GUT; xx++) {
      const sx = Math.max(0, Math.min(w - 1, xx)), sy = Math.max(0, Math.min(h - 1, yy)), o = ((y + GUT + yy) * AW + (x + GUT + xx)) * 3, i = (sy * w + sx) * 3;
      for (let c = 0; c < 3; c++) atlas[o + c] = Math.max(0, Math.min(255, Math.round(d[i + c])));
    }
    regions[it.name] = { x: x + GUT, y: y + GUT, w, h, wm: +it.wm.toFixed(2), hm: +it.hm.toFixed(2), kind: it.kind, ...(it.type ? { type: it.type } : {}) };
  }
  const webp = await sharp(atlas, { raw: { width: AW, height: AH, channels: 3 } }).webp({ quality: 90 }).toBuffer();
  fs.writeFileSync(path.join(OUT, `${id}.webp`), webp);
  F.atlas = { file: `/campus-art/tycoon/facades/${id}.webp`, w: AW, h: AH, kb: Math.round(webp.length / 1024), roofHex: colours.roof ?? null, colours, faces: faceInfo, regions };
  console.log(`${id}: atlas ${AW}×${AH}, ${F.atlas.kb} kB, ${items.length} pieces, roof ${colours.roof}`);

  // ---------- contact sheet: original (quad drawn) → rectified → strips and pieces ----------
  const RH = 280, layers = [], rowsOut = []; let SH = 0, SW = 1600;
  for (const r of rows) {
    const parts = [];
    if (r.f) {
      const q = r.f.quad, xs = q.map(p => p[0]), ys = q.map(p => p[1]), pad = 30, x0 = Math.max(0, Math.min(...xs) - pad), y0 = Math.max(0, Math.min(...ys) - pad), x1 = Math.min(src.w, Math.max(...xs) + pad), y1 = Math.min(src.h, Math.max(...ys) + pad);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${x1 - x0}" height="${y1 - y0}"><polygon points="${q.map(p => `${p[0] - x0},${p[1] - y0}`).join(' ')}" fill="none" stroke="#FFD23F" stroke-width="4"/></svg>`;
      const drawn = await sharp(path.join(SRC, F.file)).removeAlpha().extract({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }).composite([{ input: Buffer.from(svg) }]).png().toBuffer(); // sharp composites after resizing, so two passes
      const o = await sharp(drawn).resize({ height: RH, fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
      parts.push({ buf: o.data, w: o.info.width, label: `${r.f.name}: render` });
      const rr = await png(r.R, RH); parts.push({ buf: rr.data, w: rr.info.width, label: `rectified ${r.wm.toFixed(1)} × ${r.hm} m` });
    } else { const rr = await png(r.R, Math.min(RH, r.R.h * 2)); parts.push({ buf: rr.data, w: rr.info.width, label: `sample ${r.sample.name}` }); }
    for (const n of r.made) if (r.f || n !== r.sample?.name || true) {
      const it = items.find(i => i.name === n); if (!it || (!r.f && parts.length)) continue;
      const pr = await png(it.im, Math.min(RH, Math.max(60, it.im.h))); parts.push({ buf: pr.data, w: pr.info.width, label: `${n} (${it.wm.toFixed(1)}×${it.hm.toFixed(1)} m)` });
    }
    rowsOut.push(parts); SW = Math.max(SW, parts.reduce((s, p) => s + p.w + 24, 24));
  }
  for (const parts of rowsOut) {
    let x = 12; const y = SH + 34;
    for (const p of parts) {
      layers.push({ input: p.buf, left: x, top: y });
      layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(p.w, 260)}" height="26"><text x="0" y="19" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#FFD23F">${p.label}</text></svg>`), left: x, top: SH + 6 });
      x += Math.max(p.w, 260) + 24;
    }
    SW = Math.max(SW, x); SH += RH + 50;
  }
  const head = `<svg xmlns="http://www.w3.org/2000/svg" width="${SW}" height="40"><text x="12" y="27" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#FFFFFF">${id}: ${F.file} → facade atlas ${AW}×${AH} (${F.atlas.kb} kB) · roof ${colours.roof ?? '-'}${colours.cap ? ` · cap ${colours.cap}` : ''}</text></svg>`;
  await sharp({ create: { width: SW, height: SH + 40, channels: 3, background: '#101418' } })
    .composite([{ input: Buffer.from(head), left: 0, top: 0 }, ...layers.map(l => ({ ...l, top: l.top + 40 }))]).png().toFile(path.join(SHEETS, `facades_${id}.png`));
}

for (const [id, F] of Object.entries(cfg.facades)) if (!only.length || only.includes(id)) await building(id, F);
// keep number arrays (points, ranges) on one line
const tidy = s => s.replace(/\[\s+([-\d.e,\s]+?)\s+\]/g, (_, a) => `[${a.replace(/\s+/g, ' ')}]`).replace(/\[\s+((?:\[[^[\]]*\],?\s*)+)\]/g, (_, a) => `[${a.replace(/\s+/g, ' ').trim()}]`);
fs.writeFileSync(CFG, tidy(JSON.stringify(cfg, null, 1)) + '\n');
