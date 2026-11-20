// The hostel and sports zone, measured on H A's oblique June drone frame (dji 0623 191506 @0:42.8) with its solved
// camera (reference/layout/oblique/f0623_428.json → .cam.json: the OSM court corners and two OSM road centrelines,
// rms about 10 px). Points are read on the photo and converted at their own height above the terrain
// (scripts/oblique-points.mjs). Writes reference/layout/zone_oblique.json, applied by scripts/apply_zone_oblique.py.
//   gym      the Sports Pavilion & Gym (H A, 21 Nov: "this building is the gym, it is mapped wrong"): the white hall with
//            the green hip roof beside the tennis court; eave height measured on its near corner (3.7 m); a gabled annex
//            on the court side
//   walk     the Scholar's Path from the lake side up past the gym to D Block: its real zig-zag (roof centreline, 3 m up)
import fs from 'node:fs';
import { camera } from './lib/obliquecam.mjs';
const cam = camera(JSON.parse(fs.readFileSync('reference/layout/oblique/f0623_428.cam.json', 'utf8')).p);
const T = JSON.parse(fs.readFileSync('public/data/terrain.json', 'utf8')), Hh = T.heights;
const ground = (x, y) => { const u = (x - T.minX) / T.step, v = (y - T.minY) / T.step, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, g = (a, b) => Hh[b][a]; return (g(i, j) * (1 - fu) + g(i + 1, j) * fu) * (1 - fv) + (g(i, j + 1) * (1 - fu) + g(i + 1, j + 1) * fu) * fv; };
const at = (u, v, h) => cam.toGround([u, v], (x, y) => ground(x, y) + h).map(c => +c.toFixed(2));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], add = (a, b) => [a[0] + b[0], a[1] + b[1]];
function inset(poly, d) { // a convex quadrilateral pulled in by d metres on every side
  const n = poly.length, c = [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
  const lines = poly.map((a, i) => { const b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); let nx = dy / l, ny = -dx / l; if ((c[0] - a[0]) * nx + (c[1] - a[1]) * ny < 0) { nx = -nx; ny = -ny; } return { p: [a[0] + nx * d, a[1] + ny * d], d: [dx / l, dy / l] }; });
  return lines.map((L1, i) => { const L0 = lines[(i - 1 + n) % n], den = L0.d[0] * L1.d[1] - L0.d[1] * L1.d[0], t = ((L1.p[0] - L0.p[0]) * L1.d[1] - (L1.p[1] - L0.p[1]) * L1.d[0]) / den; return [+(L0.p[0] + L0.d[0] * t).toFixed(2), +(L0.p[1] + L0.d[1] * t).toFixed(2)]; });
}
// ---- the gym: eave corners read on the photo (gym_z, gym_base), the eave 3.7 m up (fitted on the near corner's edge)
const EAVE = 3.7, A = at(647.5, 2770, EAVE), B = at(978.8, 2593.8, EAVE), D = at(463, 2670, EAVE), NW = add(B, sub(D, A));
const hall = inset([D, A, B, NW], 0.3);                 // the walls stand 0.3 m inside the eaves (the near corner's foot)
const annexRoof = [at(519, 2587.5, 3.2), at(547.5, 2547, 3.2), at(685, 2544, 3.2), at(691, 2587.5, 3.2)];
const annex = inset(annexRoof, 0.3);
const eastMid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], eastN = (() => { const u = sub(B, A), l = Math.hypot(...u); return [u[1] / l, -u[0] / l]; })();
const door = [+(eastMid[0] + eastN[0] * 0.8).toFixed(2), +(eastMid[1] + eastN[1] * 0.8).toFixed(2)];
// ---- the Scholar's Path: the roof centreline at its corners, 3 m up (walk_lo, walk_hi)
const walk = [[754, 2105], [692, 2188], [758, 2222], [692, 2284], [1040, 2420], [1045, 2670], [646.7, 2886.7], [506.7, 3666.7]].map(([u, v]) => at(u, v, 3));
const out = {
  note: "H A's June drone frame (dji 0623 191506 @0:42.8), camera solved from the OSM courts and roads (scripts/zone-from-oblique.mjs)",
  gym: { ground: +ground(...A).toFixed(1), eave: EAVE, hall, annex, door },
  walk,
};
fs.writeFileSync('reference/layout/zone_oblique.json', JSON.stringify(out, null, 1));
const len = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]).toFixed(1);
console.log('gym hall', JSON.stringify(hall), 'sides', len(hall[0], hall[1]), len(hall[1], hall[2]), '| annex', JSON.stringify(annex), '| door', door, '| ground', out.gym.ground);
console.log('walk', JSON.stringify(walk));
