// The whole of H A's straight-down drone still with our data drawn back onto it at each item's own height (relief-aware
// fit), for H A to judge the tracing: buildings at roof level (should hug the roof edges), roads and ground items at
// ground level, walls and tanks at their tops. Usage: node scripts/drone-check.mjs <out.jpg> [--w=1400]
import sharp from 'sharp';
import fs from 'node:fs';
import { fitDrone3 } from './lib/dronefit.mjs';
const [out, ...rest] = process.argv.slice(2), opt = Object.fromEntries(rest.map(a => a.slice(2).split('=')));
const f = fitDrone3(), file = 'D:/Map Mock/reference/video/stills/drone_20nov/dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg';
const meta = await sharp(file).metadata(), W = +(opt.w ?? 1400), k = W / meta.width, H = Math.round(meta.height * k);
const L = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8')), O = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const HS = JSON.parse(fs.readFileSync('public/data/hardscape.json', 'utf8'));
const P = (m, z) => { const [x, y] = f.toPx3(m, z); return `${(x * k).toFixed(1)},${(y * k).toFixed(1)}`; };
const inView = pts => pts.some(m => { const [x, y] = f.toPx3(m, 6); return x > -50 && y > -50 && x < meta.width + 50 && y < meta.height + 50; });
// roof level of a building part: its ground plus its height (NAB's own measured heights by role; others by floors)
const ROLE_H = { main: 14.5, stone: 14.5, white: 14.5, atrium: 14.5, tower: 19.5, pavilion: 18, annex: 5, endblock: 15.4, hall: 15.4, wing: 11.7 }; // wall tops (Admin's roofs overhang them by 1.3 m)
const OWN_H = { 'cafe-cloud': 5.2 }; // a building's own outline height when its roles mean something else (the cafe's outline is the verandah roof)
const roofZ = (b, p) => (b.groundElev ?? 6) + (OWN_H[b.id] ?? (p.role ? ROLE_H[p.role] : b.id === 'admin' ? 0.6 + p.floors * 3.7 : 0.45 + p.floors * 3.4));
let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linejoin="round">`;
for (const r of [...O.roads, ...L.paths]) if (inView(r.pts)) svg += `<polyline points="${r.pts.map(m => P(m, 6)).join(' ')}" stroke="${r.kind === 'footpath' ? '#ffd23f' : r.kind === 'covered' ? '#22e0d0' : '#ff3b6b'}" stroke-width="${r.kind === 'footpath' ? 1.5 : 2.2}" stroke-opacity="0.9"/>`;
for (const a of L.areas) if (inView(a.pts)) svg += `<polygon points="${a.pts.map(m => P(m, 6)).join(' ')}" stroke="#7fd4ff" stroke-width="1.4" stroke-dasharray="5 4"/>`;
for (const it of HS.items) { const pts = it.pts ?? it.poly; if (!pts?.length || !inView(pts)) continue; const line = /walkway|footpath|wall|fence|hedge|tree-line|light-row|bench-row|trail|lake-edge|steps|earth-track/.test(it.type); const z = 6 + (it.type === 'wall' ? (it.height ?? 1.5) : it.type === 'open-tank' ? (it.height ?? 1.5) : 0); svg += `<${line ? 'polyline' : 'polygon'} points="${pts.map(m => P(m, z)).join(' ')}" stroke="${it.type === 'earth-track' ? '#d9824f' : '#ffa64d'}" stroke-width="1.2" stroke-opacity="0.85"/>`; }
for (const b of L.buildings) for (const p of b.parts) { if (!inView(p.poly)) continue; svg += `<polygon points="${p.poly.map(m => P(m, roofZ(b, p))).join(' ')}" stroke="${b.unnamed ? '#ffffff' : '#00ff66'}" stroke-width="${b.unnamed ? 1.4 : 2}"/>`; }
for (const b of L.buildings.filter(b => !b.unnamed)) { const p = b.parts[0]; if (!inView(p.poly)) continue; const [x, y] = P([p.cx, p.cy], roofZ(b, p)).split(',').map(Number); svg += `<text x="${x}" y="${y}" fill="#00ff66" stroke="#000" stroke-width="3" paint-order="stroke" font-family="Arial" font-size="13" font-weight="700">${b.id}</text>`; }
svg += `</g><rect width="${W}" height="26" fill="#000" fill-opacity="0.7"/><text x="8" y="18" fill="#fff" font-family="Arial" font-size="13">H A drone nadir, our data drawn back at each item's height · green: buildings at roof level · pink: roads · yellow: paths · orange: hardscape · blue dashed: areas</text></svg>`;
await sharp(file).resize(W).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 86 }).toFile(out);
console.log(out);
