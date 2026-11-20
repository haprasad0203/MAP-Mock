// Convert points read on one of H A's oblique drone frames to map metres with its solved camera, each at a height above
// the terrain (h, metres): node scripts/oblique-points.mjs <frame.cam.json> '<[[u, v, h], ...]>'  → prints [x, y] per point.
import fs from 'node:fs';
import { camera } from './lib/obliquecam.mjs';
const [camFile, ptsJson] = process.argv.slice(2), cam = camera(JSON.parse(fs.readFileSync(camFile, 'utf8')).p);
const T = JSON.parse(fs.readFileSync('public/data/terrain.json', 'utf8')), Hh = T.heights;
const ground = (x, y) => { const u = (x - T.minX) / T.step, v = (y - T.minY) / T.step, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, g = (a, b) => Hh[Math.max(0, Math.min(T.rows - 1, b))][Math.max(0, Math.min(T.cols - 1, a))]; return (g(i, j) * (1 - fu) + g(i + 1, j) * fu) * (1 - fv) + (g(i, j + 1) * (1 - fu) + g(i + 1, j + 1) * fu) * fv; };
export function toMap(u, v, h, g0) { const m = cam.toGround([u, v], g0 != null ? g0 + h : (x, y) => ground(x, y) + h); return m && m.map(c => +c.toFixed(2)); }
const out = JSON.parse(ptsJson).map(([u, v, h, g0]) => toMap(u, v, h, g0));
console.log(JSON.stringify(out));
