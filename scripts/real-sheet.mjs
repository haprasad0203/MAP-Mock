// Real-building sheet images (Phase 3M v2, REAL_CAMPUS_MODELS.md section 2a).
// Usage: node scripts/real-sheet.mjs <building-id>
// Reads reference/real/<id>.sources.json:
//   { "id", "title",
//     "views":   [{ "file", "label", "source", "crop": [x, y, w, h]? }],          every real view, labelled with its source
//     "colours": [{ "name", "file", "rect": [x, y, w, h] }],                       sampled in good light
//     "fit":     { "shots": ["hr0423", "03"], "padM": 30 } }                       satellite shots for the footprint check
// Writes reference/real/<id>.jpg (montage), reference/real/<id>_fit.png (data footprints over the satellite views: a
// check underlay only, nothing traced) and prints the sampled colours as hex (a trimmed mean of the rectangle).
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fitShot } from './lib/satfit.mjs';

const id = process.argv[2], dir = 'reference/real', cfg = JSON.parse(fs.readFileSync(`${dir}/${id}.sources.json`, 'utf8'));
const layout = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));
const b = layout.buildings.find(x => x.id === id);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const resolve = f => (fs.existsSync(f) ? f : path.join('D:/Map Mock', f)); // main-folder sources (official photo set) are read in place

// ---------- montage ----------
const TW = 620, TH = 400, LH = 44, COLS = 3;
const tiles = await Promise.all(cfg.views.map(async (v, i) => {
  let img = sharp(resolve(v.file));
  if (v.crop) img = img.extract({ left: v.crop[0], top: v.crop[1], width: v.crop[2], height: v.crop[3] });
  const buf = await img.resize(TW, TH, { fit: 'contain', background: '#1b1f24' }).toBuffer();
  const lab = Buffer.from(`<svg width="${TW}" height="${LH}"><rect width="100%" height="100%" fill="#0d1014"/>
    <text x="8" y="18" font-family="Arial" font-size="15" font-weight="700" fill="#FFD23F">${i + 1}. ${esc(v.label)}</text>
    <text x="8" y="37" font-family="Arial" font-size="12" fill="#cfd6de">${esc(v.source).slice(0, 96)}</text></svg>`);
  return { buf, lab, i };
}));
const rows = Math.ceil(tiles.length / COLS), HEAD = 56;
const comp = [{ input: Buffer.from(`<svg width="${COLS * TW + (COLS + 1) * 8}" height="${HEAD}"><text x="10" y="36" font-family="Arial" font-size="26" font-weight="700" fill="#fff">${esc(cfg.title)} · real views (${tiles.length})</text></svg>`), left: 0, top: 0 }];
for (const t of tiles) { const x = 8 + (t.i % COLS) * (TW + 8), y = HEAD + Math.floor(t.i / COLS) * (TH + LH + 8); comp.push({ input: t.lab, left: x, top: y }, { input: t.buf, left: x, top: y + LH }); }
await sharp({ create: { width: COLS * TW + (COLS + 1) * 8, height: HEAD + rows * (TH + LH + 8), channels: 3, background: '#0d1014' } }).composite(comp).jpeg({ quality: 84 }).toFile(`${dir}/${id}.jpg`);

// ---------- footprint fit ----------
if (b && cfg.fit) {
  const panels = [];
  for (const key of cfg.fit.shots) {
    const F = fitShot(key), pad = cfg.fit.padM ?? 30, pts = b.parts.flatMap(p => p.poly ?? []);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const [ax, ay] = F.toPx([Math.min(...xs) - pad, Math.max(...ys) + pad]), [bx, by] = F.toPx([Math.max(...xs) + pad, Math.min(...ys) - pad]);
    const meta = await sharp(F.file).metadata();
    const l = Math.max(0, Math.floor(ax)), t = Math.max(0, Math.floor(ay)), w = Math.min(meta.width - l, Math.ceil(bx - ax)), h = Math.min(meta.height - t, Math.ceil(by - ay));
    const Z = Math.max(1, Math.min(6, Math.floor(900 / Math.max(w, h))));
    const P = q => { const [px, py] = F.toPx(q); return [((px - l) * Z).toFixed(1), ((py - t) * Z).toFixed(1)]; };
    let svg = '';
    b.parts.forEach((p, i) => {
      if (!p.poly) return;
      svg += `<polygon points="${p.poly.map(q => P(q).join(',')).join(' ')}" fill="none" stroke="#FFD23F" stroke-width="2.5"/>`;
      const [cx, cy] = P([p.cx, p.cy]);
      svg += `<text x="${cx}" y="${cy}" text-anchor="middle" font-family="Arial" font-size="15" font-weight="700" fill="#FFD23F" stroke="#000" stroke-width="0.8">part ${i} · ${p.floors} fl</text>`;
    });
    for (const e of layout.entrances.filter(e => e.buildingId === id)) { const [ex, ey] = P(e.at); svg += `<circle cx="${ex}" cy="${ey}" r="6" fill="${e.main ? '#ff3b30' : '#ff9f0a'}" stroke="#fff" stroke-width="1.5"/>`; }
    const W = w * Z, H = h * Z;
    svg += `<rect x="0" y="0" width="${W}" height="28" fill="#000" fill-opacity="0.65"/><text x="8" y="19" font-family="Arial" font-size="14" fill="#fff">${esc(path.basename(F.file))} · pin fit ${F.pxPerM.toFixed(2)} px/m, residual ${(F.rms / F.pxPerM).toFixed(1)} m · yellow = data footprint, red = main entrance (check only, not traced)</text>`;
    const base = await sharp(F.file).extract({ left: l, top: t, width: w, height: h }).resize(W, H, { kernel: 'lanczos3' }).png().toBuffer();
    panels.push({ buf: await sharp(base).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}">${svg}</svg>`) }]).png().toBuffer(), W, H });
  }
  const PW = panels.reduce((s, p) => s + p.W + 10, 10), PH = Math.max(...panels.map(p => p.H)) + 20;
  let x = 10; const c2 = panels.map(p => { const o = { input: p.buf, left: x, top: 10 }; x += p.W + 10; return o; });
  await sharp({ create: { width: PW, height: PH, channels: 3, background: '#0d1014' } }).composite(c2).png().toFile(`${dir}/${id}_fit.png`);
}

// ---------- colours ----------
const out = {};
for (const c of cfg.colours ?? []) {
  const { data, info } = await sharp(resolve(c.file)).extract({ left: c.rect[0], top: c.rect[1], width: c.rect[2], height: c.rect[3] }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = []; for (let i = 0; i < data.length; i += info.channels) px.push([data[i], data[i + 1], data[i + 2]]);
  px.sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  const keep = px.slice(Math.floor(px.length * 0.15), Math.ceil(px.length * 0.85)); // drop the darkest and brightest 15 %
  const m = [0, 1, 2].map(k => Math.round(keep.reduce((s, p) => s + p[k], 0) / keep.length));
  out[c.name] = '#' + m.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
}
console.log(JSON.stringify({ id, views: cfg.views.length, montage: `${dir}/${id}.jpg`, fit: cfg.fit ? `${dir}/${id}_fit.png` : null, colours: out }, null, 1));
