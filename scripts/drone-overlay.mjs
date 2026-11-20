// Check our data against a straight-down drone still (H A's DJI footage, 20 Nov): a least-squares similarity fit from a
// few matched points (pixel ↔ local metres), then the layout's footprints, roads (at their hardscape widths), areas and
// hardscape items drawn over the photo. Measuring and checking only; the photo is H A's own footage.
// Usage: node scripts/drone-overlay.mjs <photo> <out.jpg> <px,py,x,y;px,py,x,y;...> [--w=1600] [--grid=20]
//   pixel coordinates are in the photo's own full-size pixels.
import sharp from 'sharp';
import fs from 'node:fs';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [photo, out, pairsArg] = args.filter(a => !a.startsWith('--'));
const pairs = pairsArg.split(';').map(s => s.split(',').map(Number));
// px = a·x + b·y + tx ; py = b·x − a·y + ty  (image y runs down; a similarity with that flip)
const N = [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], R = [0, 0, 0, 0];
const add = (row, v) => { for (let i = 0; i < 4; i++) { R[i] += row[i] * v; for (let j = 0; j < 4; j++) N[i][j] += row[i] * row[j]; } };
for (const [px, py, x, y] of pairs) { add([x, y, 1, 0], px); add([-y, x, 0, 1], py); }
const [a, b, tx, ty] = solve(N, R);
export const toPx = ([x, y]) => [a * x + b * y + tx, b * x - a * y + ty];
const s = Math.hypot(a, b);
let rms = 0; for (const [px, py, x, y] of pairs) { const [qx, qy] = toPx([x, y]); rms += (qx - px) ** 2 + (qy - py) ** 2; }
rms = Math.sqrt(rms / pairs.length);

const meta = await sharp(photo).metadata(), W = +(opt.w ?? 1600), k = W / meta.width, H = Math.round(meta.height * k);
const P = p => toPx(p).map(v => (v * k).toFixed(1)).join(',');
const L = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));
const O = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const HS = JSON.parse(fs.readFileSync('public/data/hardscape.json', 'utf8'));
const widths = new Map(HS.roads.map(r => [r.id, r.width]));
let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linejoin="round" stroke-linecap="round">`;
const DEF = { road: 10, service: 6.5, footpath: 2.6, track: 3.6, covered: 3 };
for (const r of [...O.roads, ...L.paths]) {
  const w = (widths.get(r.id) ?? DEF[r.kind] ?? 4) * s * k, col = r.kind === 'covered' ? '#22e0d0' : r.kind === 'footpath' ? '#ffd23f' : '#ff3b6b';
  svg += `<polyline points="${r.pts.map(P).join(' ')}" stroke="${col}" stroke-opacity="0.28" stroke-width="${w.toFixed(1)}"/><polyline points="${r.pts.map(P).join(' ')}" stroke="${col}" stroke-width="1.6"/>`;
}
for (const ar of [...L.areas, ...O.areas]) svg += `<polygon points="${ar.pts.map(P).join(' ')}" stroke="#7fd4ff" stroke-width="1.6" stroke-dasharray="6 4"/>`;
for (const it of HS.items) { const pts = it.pts ?? it.poly; if (!pts?.length) continue; const tag = it.closed === false || it.type === 'covered' || it.line ? 'polyline' : 'polygon'; svg += `<${tag} points="${pts.map(P).join(' ')}" stroke="${it.id === 'scholars-path' ? '#22e0d0' : '#ffa64d'}" stroke-width="${it.id === 'scholars-path' ? 3 : 1.2}" stroke-opacity="0.9"/>`; }
for (const bd of L.buildings) for (const p of bd.parts) svg += `<polygon points="${p.poly.map(P).join(' ')}" stroke="${bd.unnamed ? '#ffffff' : '#00ff66'}" stroke-width="${bd.unnamed ? 1.5 : 2.6}"/>`;
for (const bd of L.buildings.filter(b => !b.unnamed)) { const c = bd.parts[0]; const [x, y] = toPx([c.cx, c.cy]).map(v => v * k); svg += `<text x="${x}" y="${y}" fill="#00ff66" stroke="#000" stroke-width="3" paint-order="stroke" font-family="Arial" font-size="15" font-weight="700">${bd.id}</text>`; }
for (const l of L.landmarks) { const [x, y] = toPx(l.at).map(v => v * k); svg += `<circle cx="${x}" cy="${y}" r="5" fill="#ff0"/><text x="${x + 7}" y="${y + 4}" fill="#ff0" stroke="#000" stroke-width="3" paint-order="stroke" font-family="Arial" font-size="13">${l.id}</text>`; }
for (const [px, py] of pairs) svg += `<circle cx="${px * k}" cy="${py * k}" r="7" stroke="#ff00ff" stroke-width="2.5"/>`;
if (opt.grid) { const g = +opt.grid; for (let x = -400; x <= 400; x += g) for (let y = -400; y <= 400; y += g) { const [qx, qy] = toPx([x, y]).map(v => v * k); if (qx > 0 && qy > 0 && qx < W && qy < H && x % 100 === 0 && y % 100 === 0) svg += `<text x="${qx}" y="${qy}" fill="#fff" font-size="11" font-family="Arial">${x},${y}</text>`; } }
svg += `</g><rect width="${W}" height="26" fill="#000" fill-opacity="0.7"/><text x="8" y="18" fill="#fff" font-family="Arial" font-size="14">${photo.split(/[\\/]/).pop()} · fit ${pairs.length} pts, ${(s).toFixed(2)} px/m, rms ${rms.toFixed(1)} px · green = our footprints, pink = roads at hardscape width, teal = covered walk</text></svg>`;
await sharp(photo).resize(W).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 86 }).toFile(out);
console.log(JSON.stringify({ out, pxPerM: +s.toFixed(3), rms: +rms.toFixed(1), rotDeg: +(Math.atan2(b, a) * 180 / Math.PI).toFixed(1) }));

function solve(A, b) {
  const n = b.length, M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let q = c; q <= n; q++) M[r][q] -= f * M[c][q]; }
  }
  return M.map((r, i) => r[n] / r[i]);
}
