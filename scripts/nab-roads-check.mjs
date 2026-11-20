// Draw the map's roads (and any extra polylines) over the NAB part of H A's nadir, in the building's rotated (u, v) frame.
// Usage: node scripts/nab-roads-check.mjs <out.jpg> [extra.json: [{ id, pts (map metres), z }]]
import sharp from 'sharp';
import fs from 'node:fs';
import { fitDrone3 } from './lib/dronefit.mjs';
const [out, extraFile] = process.argv.slice(2), f = fitDrone3();
const file = 'D:/Map Mock/reference/video/stills/drone_20nov/dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg';
const A = [941.8, 2943.2], r = 39.55 * Math.PI / 180, U = [Math.cos(r), -Math.sin(r)], V = [Math.sin(r), Math.cos(r)];
const uv = p => { const dx = p[0] - A[0], dy = p[1] - A[1]; return [dx * U[0] + dy * U[1], dx * V[0] + dy * V[1]]; };
const [u0, u1, v0, v1] = (process.env.BOX ?? '-260,1000,-320,560').split(',').map(Number), W = u1 - u0, H = v1 - v0;
const meta = await sharp(file).metadata(), { data } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const buf = Buffer.alloc(W * H * 3);
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const u = u0 + i, v = v0 + j, x = Math.round(A[0] + u * U[0] + v * V[0]), y = Math.round(A[1] + u * U[1] + v * V[1]); if (x < 0 || y < 0 || x >= meta.width || y >= meta.height) continue; for (let c = 0; c < 3; c++) buf[(j * W + i) * 3 + c] = data[(y * meta.width + x) * 3 + c]; }
const L = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8')), O = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const lines = [...L.paths.map(p => ({ id: p.id, pts: p.pts, col: p.kind === 'footpath' ? '#ffd23f' : '#ff3b6b' })), ...O.roads.map(p => ({ id: p.id, pts: p.pts, col: '#ff8c00' }))];
if (extraFile) for (const e of JSON.parse(fs.readFileSync(extraFile, 'utf8'))) lines.push({ id: e.id, pts: e.pts, col: e.col ?? '#00ffff', z: e.z });
let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg"><g fill="none">`;
for (const ln of lines) {
  const q = ln.pts.map(m => uv(f.toPx3(m, ln.z ?? 6))).map(([u, v]) => [u - u0, v - v0]);
  if (!q.some(([x, y]) => x > 0 && y > 0 && x < W && y < H)) continue;
  svg += `<polyline points="${q.map(p => p.join(',')).join(' ')}" stroke="${ln.col}" stroke-width="3"/>`;
  const mid = q[Math.floor(q.length / 2)]; svg += `<text x="${mid[0] + 4}" y="${mid[1] - 4}" fill="${ln.col}" stroke="#000" stroke-width="3" paint-order="stroke" font-size="14" font-family="Arial">${ln.id}</text>`;
  q.forEach(([x, y], k) => { if (k === 0 || k === q.length - 1) svg += `<circle cx="${x}" cy="${y}" r="5" fill="${ln.col}"/>`; });
}
for (let u = Math.ceil(u0 / 100) * 100; u <= u1; u += 100) svg += `<text x="${u - u0 + 2}" y="14" fill="#ff0" font-size="12" font-family="Arial">u${u}</text><line x1="${u - u0}" y1="0" x2="${u - u0}" y2="${H}" stroke="#ff0" stroke-opacity="0.25"/>`;
for (let v = Math.ceil(v0 / 100) * 100; v <= v1; v += 100) svg += `<text x="2" y="${v - v0 - 2}" fill="#ff0" font-size="12" font-family="Arial">v${v}</text><line x1="0" y1="${v - v0}" x2="${W}" y2="${v - v0}" stroke="#ff0" stroke-opacity="0.25"/>`;
svg += '</g></svg>';
await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).composite([{ input: Buffer.from(svg) }]).resize(Math.min(W, 1260)).jpeg({ quality: 86 }).toFile(out);
console.log(out);
