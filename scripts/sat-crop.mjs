// A satellite crop around a point in local metres with the data footprints (yellow, labelled) and paths drawn on it, for
// checking a building's real outline against our data. Check underlay only: nothing is traced.
// Usage: node scripts/sat-crop.mjs <shot: 01|02|03|hr0405|hr0423> <x> <y> <radiusM> <out.png> [sizePx=700]
import sharp from 'sharp';
import fs from 'node:fs';
import { fitShot } from './lib/satfit.mjs';

const [key, X, Y, Rm, out, size = '700'] = process.argv.slice(2);
const F = fitShot(key), meta = await sharp(F.file).metadata(), S = +size;
const [cx, cy] = F.toPx([+X, +Y]), R = +Rm * F.pxPerM;
const l = Math.max(0, Math.round(cx - R)), t = Math.max(0, Math.round(cy - R)), w = Math.min(meta.width - l, Math.round(2 * R)), h = Math.min(meta.height - t, Math.round(2 * R));
const k = S / Math.max(w, h), P = q => { const [px, py] = F.toPx(q); return [((px - l) * k).toFixed(1), ((py - t) * k).toFixed(1)]; };
const L = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));
let svg = '';
for (const b of L.buildings) for (const p of b.parts) if (p.poly) {
  svg += `<polygon points="${p.poly.map(q => P(q).join(',')).join(' ')}" fill="none" stroke="#FFD23F" stroke-width="1.6"/>`;
  if (!b.unnamed && p === b.parts[0]) { const [x, y] = P([p.cx, p.cy]); svg += `<text x="${x}" y="${y}" font-family="Arial" font-size="13" fill="#FFD23F" stroke="#000" stroke-width="0.5" text-anchor="middle">${b.id}</text>`; }
}
for (const p of L.paths) svg += `<polyline points="${p.pts.map(q => P(q).join(',')).join(' ')}" fill="none" stroke="#7FDBFF" stroke-width="1" stroke-dasharray="4 3"/>`;
const W = Math.round(w * k), H = Math.round(h * k);
svg += `<text x="6" y="16" font-family="Arial" font-size="12" fill="#fff" stroke="#000" stroke-width="0.4">${key} · ${(+Rm * 2)} m across · ±${(F.rms / F.pxPerM).toFixed(0)} m fit</text>`;
const base = await sharp(F.file).extract({ left: l, top: t, width: w, height: h }).resize(W, H).png().toBuffer();
await sharp(base).composite([{ input: Buffer.from(`<svg width="${W}" height="${H}">${svg}</svg>`) }]).toFile(out);
console.log(out);
