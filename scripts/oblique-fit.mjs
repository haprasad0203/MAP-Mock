// Solve the camera of one of H A's oblique DJI frames from ground control points and draw our whole map back onto the
// frame (buildings at roof level, roads and areas on the ground) to check footprints that the straight-down still does
// not reach. Usage: node scripts/oblique-fit.mjs <frame.jpg> <gcps.json> <out.jpg> [--w=1400]
//   gcps.json: [{ "id": "...", "px": [u, v], "m": [x, y] (z from the terrain) or [x, y, z] }]
import fs from 'node:fs';
import sharp from 'sharp';
import { solveCamera } from './lib/obliquecam.mjs';

const args = process.argv.slice(2), opt = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [frame, gfile, out] = args.filter(a => !a.startsWith('--'));
const T = JSON.parse(fs.readFileSync('public/data/terrain.json', 'utf8')), Hh = T.heights;
const ground = (x, y) => { const u = (x - T.minX) / T.step, v = (y - T.minY) / T.step, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, g = (a, b) => Hh[Math.max(0, Math.min(T.rows - 1, b))][Math.max(0, Math.min(T.cols - 1, a))]; return (g(i, j) * (1 - fu) + g(i + 1, j) * fu) * (1 - fv) + (g(i, j + 1) * (1 - fu) + g(i + 1, j + 1) * fu) * fv; };
const L0 = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8')), O0 = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const roadById = id => [...O0.roads, ...L0.paths].find(r => r.id === id);
const gcps = JSON.parse(fs.readFileSync(gfile, 'utf8')).map(g => g.road ? { ...g, line: roadById(g.road).pts.map(q => [q[0], q[1], ground(q[0], q[1])]) } : { ...g, m: g.m.length === 3 ? g.m : [g.m[0], g.m[1], ground(g.m[0], g.m[1])] });
const prev = fs.existsSync(gfile.replace(/.json$/, '.cam.json')) && !opt.fresh ? JSON.parse(fs.readFileSync(gfile.replace(/.json$/, '.cam.json'), 'utf8')).p : null;
const sol = solveCamera(gcps, prev ? { p: prev } : {});
console.log(JSON.stringify({ camera: { x: sol.p[0], y: sol.p[1], z: sol.p[2], heading: sol.p[3], pitch: sol.p[4], roll: sol.p[5], f: sol.p[6] }, rmsPx: sol.rms, perPoint: Object.fromEntries(gcps.map((g, i) => [g.id, sol.residuals[i]])) }));
fs.writeFileSync(gfile.replace(/\.json$/, '.cam.json'), JSON.stringify({ frame, p: sol.p, rmsPx: sol.rms }, null, 1));
const L = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8')), O = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const meta = await sharp(frame).metadata(), Wd = +(opt.w ?? 1400), k = Wd / meta.width, Hd = Math.round(meta.height * k);
const P = q => { const r = sol.cam.project(q); return r ? `${(r[0] * k).toFixed(1)},${(r[1] * k).toFixed(1)}` : null; };
const line = (pts, z, attrs, closed = false) => { const s = pts.map(q => P([q[0], q[1], typeof z === 'function' ? z(q) : z])); if (s.some(v => !v)) return ''; return `<${closed ? 'polygon' : 'polyline'} points="${s.join(' ')}" ${attrs}/>`; };
let svg = `<svg width="${Wd}" height="${Hd}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-linejoin="round">`;
for (const r of [...O.roads, ...L.paths]) { if (opt.labels && (r.kind === 'road' || r.kind === 'service')) { const mid = r.pts[Math.floor(r.pts.length / 2)], s = P([mid[0], mid[1], ground(mid[0], mid[1])]); if (s) { const [x, y] = s.split(',').map(Number); if (x > 0 && y > 0 && x < Wd && y < Hd) svg += `<text x="${x}" y="${y}" fill="#ff8fb0" stroke="#000" stroke-width="3" paint-order="stroke" font-size="12" font-family="Arial">${r.id}</text>`; } } svg += line(r.pts, q => ground(q[0], q[1]), `stroke="${r.kind === 'footpath' ? '#ffd23f' : r.kind === 'covered' ? '#22e0d0' : '#ff3b6b'}" stroke-width="${r.kind === 'footpath' ? 1.2 : 2}" stroke-opacity="0.85"`); }
for (const a of [...L.areas, ...O.areas]) svg += line(a.pts, q => ground(q[0], q[1]), 'stroke="#7fd4ff" stroke-width="1.4" stroke-dasharray="5 4"', true);
for (const b of L.buildings) for (const p of b.parts) {
  const g0 = b.groundElev ?? ground(p.cx, p.cy), top = g0 + 0.5 + p.floors * 3.4;
  svg += line(p.poly, g0, `stroke="${b.unnamed ? '#ffffff' : '#00ff66'}" stroke-width="1" stroke-opacity="0.55" stroke-dasharray="3 3"`, true);   // walls at the ground
  svg += line(p.poly, top, `stroke="${b.unnamed ? '#ffffff' : '#00ff66'}" stroke-width="${b.unnamed ? 1.3 : 2}"`, true);                          // the wall tops
}
for (const b of L.buildings.filter(b => !b.unnamed)) { const p = b.parts[0], g0 = b.groundElev ?? ground(p.cx, p.cy), s = P([p.cx, p.cy, g0 + 0.5 + p.floors * 3.4]); if (s) { const [x, y] = s.split(',').map(Number); svg += `<text x="${x}" y="${y}" fill="#00ff66" stroke="#000" stroke-width="3" paint-order="stroke" font-family="Arial" font-size="13" font-weight="700">${b.id}</text>`; } }
for (const [i, g] of gcps.entries()) { if (g.line) { svg += `<circle cx="${g.px[0] * k}" cy="${g.px[1] * k}" r="4" fill="#00e5ff"/>`; continue; } svg += `<circle cx="${g.px[0] * k}" cy="${g.px[1] * k}" r="4" fill="none" stroke="#ff00ff" stroke-width="2"/>`; const s = P(g.m); if (s) { const [x, y] = s.split(',').map(Number); svg += `<line x1="${g.px[0] * k}" y1="${g.px[1] * k}" x2="${x}" y2="${y}" stroke="#ff00ff" stroke-width="1.5"/>`; } }
svg += `</g><rect width="${Wd}" height="24" fill="#000" fill-opacity="0.7"/><text x="6" y="17" fill="#fff" font-family="Arial" font-size="13">${frame.split(/[\/]/).pop()} · camera solved from ${gcps.length} points, rms ${sol.rms} px · green: building wall tops (solid) and bases (dashed) · pink: roads</text></svg>`;
await sharp(frame).resize(Wd).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 85 }).toFile(out);
console.log(out);
