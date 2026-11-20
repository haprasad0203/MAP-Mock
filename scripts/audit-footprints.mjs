// Fake-building audit (H A, 20 Nov: "remove the buildings and structures that are not there"): every footprint part
// drawn over the best real image of its spot: H A's straight-down drone still where it covers the spot, else H A's hi-res
// satellite screenshots (check only, nothing traced), else the Map Pack screenshots. One labelled tile per part.
// Usage: node scripts/audit-footprints.mjs <outDir> [--only=id1,id2] [--cols=6]
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { fitShot, SHOTS } from './lib/satfit.mjs';
import { fitDrone, NADIR_ADMIN } from './lib/dronefit.mjs';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const outDir = args.find(a => !a.startsWith('--')); fs.mkdirSync(outDir, { recursive: true });
const only = opt.only ? new Set(opt.only.split(',')) : null, COLS = +(opt.cols ?? 6), TW = 300, TH = 300, LH = 34;
const L = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));

// image sources, best first; each maps local metres → its own pixels
const NADIR = path.join('D:/Map Mock/reference/video/stills/drone_20nov', NADIR_ADMIN.file);
const sources = [];
if (fs.existsSync(NADIR)) { const f = fitDrone(NADIR_ADMIN.pairs), m = await sharp(NADIR).metadata(); sources.push({ name: 'drone nadir 20 Nov', file: NADIR, toPx: f.toPx, s: f.s, w: m.width, h: m.height }); }
for (const k of ['hr0405', 'hr0423', '02', '03', '01']) { const f = fitShot(k), m = await sharp(SHOTS[k].file).metadata(); sources.push({ name: k === 'hr0405' || k === 'hr0423' ? `satellite ${k} (check only)` : `Map Pack ${k} (check only)`, file: SHOTS[k].file, toPx: f.toPx, s: f.s, w: m.width, h: m.height }); }
const imgCache = new Map(); const img = f => { if (!imgCache.has(f)) imgCache.set(f, sharp(f).toBuffer()); return imgCache.get(f); };

const parts = [];
for (const b of L.buildings) b.parts.forEach((p, i) => { if (!only || only.has(b.id)) parts.push({ b, p, i }); });
const tiles = [];
for (const { b, p, i } of parts) {
  const span = Math.max(36, Math.max(p.w, p.d) * 2.2); // metres shown across the tile
  // the source that contains the whole window, preferring the sharpest
  const src = (opt.prefer ? [...sources.filter(s => s.name.includes(opt.prefer)), ...sources] : sources).find(s => { const pts = [[p.cx - span / 2, p.cy - span / 2], [p.cx + span / 2, p.cy + span / 2], [p.cx - span / 2, p.cy + span / 2], [p.cx + span / 2, p.cy - span / 2]].map(s.toPx); return pts.every(([x, y]) => x > 0 && y > 0 && x < s.w && y < s.h); });
  let tile;
  if (!src) tile = await sharp({ create: { width: TW, height: TH, channels: 3, background: '#333' } }).png().toBuffer();
  else {
    const [cx, cy] = src.toPx([p.cx, p.cy]), half = (span / 2) * src.s, l = Math.round(cx - half), t = Math.round(cy - half), size = Math.round(half * 2);
    const k = TW / size, P = q => { const [x, y] = src.toPx(q); return `${((x - l) * k).toFixed(1)},${((y - t) * k).toFixed(1)}`; };
    let svg = `<svg width="${TW}" height="${TH}" xmlns="http://www.w3.org/2000/svg"><g fill="none">`;
    for (const o of L.buildings) for (const q of o.parts) if (Math.hypot(q.cx - p.cx, q.cy - p.cy) < span) svg += `<polygon points="${q.poly.map(P).join(' ')}" stroke="${q === p ? '#00ff66' : '#ffffff'}" stroke-width="${q === p ? 2.4 : 1}" stroke-opacity="${q === p ? 1 : 0.6}"/>`;
    svg += `</g><text x="4" y="${TH - 6}" fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke" font-family="Arial" font-size="11">${src.name} · ${span.toFixed(0)} m across</text></svg>`;
    const base = await sharp(await img(src.file)).extract({ left: Math.max(0, l), top: Math.max(0, t), width: Math.min(size, src.w - Math.max(0, l)), height: Math.min(size, src.h - Math.max(0, t)) }).resize(TW, TH, { fit: 'fill' }).toBuffer();
    tile = await sharp(base).composite([{ input: Buffer.from(svg) }]).png().toBuffer();
  }
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const lab = Buffer.from(`<svg width="${TW}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#101418"/><text x="4" y="14" font-family="Arial" font-size="13" font-weight="700" fill="#FFD23F">${esc(b.id)}${b.parts.length > 1 ? ` [${i}]` : ''} ${b.unnamed ? '(unnamed)' : ''}</text><text x="4" y="29" font-family="Arial" font-size="11" fill="#ccc">${p.w}×${p.d} m · ${p.floors} fl · ${p.roof} · ${esc((p.src ?? '').split(' ')[0])} · (${Math.round(p.cx)}, ${Math.round(p.cy)})</text></svg>`);
  tiles.push({ tile, lab });
}
const PER = COLS * 5;
for (let s = 0; s * PER < tiles.length; s++) {
  const chunk = tiles.slice(s * PER, (s + 1) * PER), rows = Math.ceil(chunk.length / COLS), comp = [];
  chunk.forEach((t, j) => { const x = (j % COLS) * (TW + 4), y = Math.floor(j / COLS) * (TH + LH + 4); comp.push({ input: t.lab, left: x, top: y }, { input: t.tile, left: x, top: y + LH }); });
  const out = path.join(outDir, `${opt.name ?? 'audit'}_${String(s + 1).padStart(2, '0')}.jpg`);
  await sharp({ create: { width: COLS * (TW + 4), height: rows * (TH + LH + 4), channels: 3, background: '#101418' } }).composite(comp).jpeg({ quality: 84 }).toFile(out);
  console.log(out, chunk.length);
}
console.log('parts', tiles.length);
