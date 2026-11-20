// Cafe Cloud Campus measured on H A's straight-down drone still (21 Nov): the green roof octagon fitted by colour (a regular
// octagon: centre, apothem, rotation, by least squares on the polar edge profile), converted at its own height with the
// relief-aware fit. The covered verandah ring round it (the light flat roof seen from above, about 3 m wide, round
// columns in the ground photos) and the entrance block on the road side (the raised fascia with the sign: the lighter
// rectangle on the ring's east side) are placed relative to it. Writes reference/layout/cafe_drone.json, applied by
// scripts/apply_cafe_drone.py, and a check image.  Usage: node scripts/cafe-from-drone.mjs [check.jpg]
import fs from 'node:fs';
import sharp from 'sharp';
import { fitDrone3 } from './lib/dronefit.mjs';

const f = fitDrone3(), file = 'D:/Map Mock/reference/video/stills/drone_20nov/dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg';
const G = 6.5, EAVE = 5.6, RING = 3.0; // ground (m above the lake), height of the green roof's lower edge, verandah width
const meta = await sharp(file).metadata(), { data } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const px = (x, y) => { const k = (Math.round(y) * meta.width + Math.round(x)) * 3; return [data[k], data[k + 1], data[k + 2]]; };
// the roof reads blue-teal from the air (about 75, 94, 101): blue above green above red; the verandah ring is neutral grey
const green = ([r, g, b]) => g - r >= 9 && b - r >= 14 && Math.max(r, g, b) - Math.min(r, g, b) >= 17 && g < 150;
// 1. the green edge along 360 rays from a first guess of the centre, then refine the centre twice
let c = [1995, 1723];
const profile = cen => Array.from({ length: 360 }, (_, i) => {
  const a = (i * Math.PI) / 180; let last = 0, miss = 0;
  for (let r = 20; r < 160; r += 0.5) { if (green(px(cen[0] + Math.cos(a) * r, cen[1] + Math.sin(a) * r))) { last = r; miss = 0; } else if (++miss > 8 && last > 0) break; }
  return last;
});
// regular octagon polar function: apothem A; the radius is smallest (= A, a flat's middle) at t + 22.5° (t is a vertex direction)
const oct = (a, A, t) => A / Math.cos((((a - t) % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4) - Math.PI / 8);
function fitOct(prof) {
  let best = { e: Infinity };
  for (let t = 0; t < Math.PI / 4; t += Math.PI / 720) for (let A = 90; A < 140; A += 0.5) {
    let e = 0, n = 0; for (let i = 0; i < 360; i++) { if (!prof[i]) continue; const d = prof[i] - oct((i * Math.PI) / 180, A, t); e += d * d; n++; }
    if (e / n < best.e) best = { e: e / n, A, t };
  }
  return best;
}
let fit;
for (let it = 0; it < 3; it++) {
  const prof = profile(c);
  // centre correction: mean of (r − model) along each direction
  fit = fitOct(prof); let sx = 0, sy = 0, n = 0;
  for (let i = 0; i < 360; i++) { if (!prof[i]) continue; const a = (i * Math.PI) / 180, d = prof[i] - oct(a, fit.A, fit.t); sx += d * Math.cos(a); sy += d * Math.sin(a); n++; }
  c = [c[0] + (2 * sx) / n, c[1] + (2 * sy) / n];
}
const prof = profile(c); fit = fitOct(prof);
console.log('image: centre', c.map(v => v.toFixed(1)), 'apothem px', fit.A.toFixed(1), 'flat normal', (((fit.t + Math.PI / 8) * 180) / Math.PI).toFixed(1), '° rms', Math.sqrt(fit.e).toFixed(2), 'px');
// 2. to map metres at the eave height: centre, and a flat's mid-point to give the apothem and the rotation in the map
const tf = fit.t + Math.PI / 8, z = G + EAVE, cm = f.toM3(c, z), mid = f.toM3([c[0] + Math.cos(tf) * fit.A, c[1] + Math.sin(tf) * fit.A], z);
const apothem = Math.hypot(mid[0] - cm[0], mid[1] - cm[1]), flatNormal = Math.atan2(mid[1] - cm[1], mid[0] - cm[0]);
const octPts = (A, n0 = flatNormal) => Array.from({ length: 8 }, (_, k) => { const a = n0 + Math.PI / 8 + (k * Math.PI) / 4, R = A / Math.cos(Math.PI / 8); return [+(cm[0] + Math.cos(a) * R).toFixed(2), +(cm[1] + Math.sin(a) * R).toFixed(2)]; });
// the entrance faces the main road (east): the flat whose normal points most nearly east
const normals = Array.from({ length: 8 }, (_, k) => flatNormal + (k * Math.PI) / 4), east = normals.reduce((b, a) => (Math.cos(a) > Math.cos(b) ? a : b));
const RING_PX = { x0: 1842.5, x1: 2127.5, y0: 1579, y1: 1868 }, ZV = G + 5.2;
const rc = [(RING_PX.x0 + RING_PX.x1) / 2, (RING_PX.y0 + RING_PX.y1) / 2], rcm = f.toM3(rc, ZV);
const ringMid = f.toM3([rc[0] + Math.cos(tf) * ((RING_PX.x1 - RING_PX.x0 + RING_PX.y1 - RING_PX.y0) / 4), rc[1] + Math.sin(tf) * ((RING_PX.x1 - RING_PX.x0 + RING_PX.y1 - RING_PX.y0) / 4)], ZV);
const vApothem = Math.hypot(ringMid[0] - rcm[0], ringMid[1] - rcm[1]);
const porch = f.toM3([1853, 1695], G + 7.5), porchDir = Math.atan2(porch[1] - rcm[1], porch[0] - rcm[0]);
const entrance = normals.reduce((b, a) => (Math.cos(a - porchDir) > Math.cos(b - porchDir) ? a : b));
const out = {
  note: "Cafe Cloud from H A's drone nadir (21 Nov), scripts/cafe-from-drone.mjs. hall = the glazed octagon under the green roof; verandah = the covered ring round it.",
  centre: cm.map(v => +v.toFixed(2)), ringCentre: rcm.map(v => +v.toFixed(2)), hallApothem: +(apothem - 0.6).toFixed(2), roofApothem: +apothem.toFixed(2), verandahApothem: +vApothem.toFixed(2), flatNormalDeg: +((flatNormal * 180) / Math.PI).toFixed(2), entranceNormalDeg: +((entrance * 180) / Math.PI).toFixed(2), porch: porch.map(v => +v.toFixed(2)),
  hall: octPts(apothem - 0.6), verandah: octPts(vApothem), fitRmsPx: +Math.sqrt(fit.e).toFixed(2),
};
fs.writeFileSync('reference/layout/cafe_drone.json', JSON.stringify(out, null, 1));
console.log('ring centre', out.ringCentre, 'porch', out.porch, 'map: centre', out.centre, 'hall apothem', out.hallApothem, 'm; verandah apothem', out.verandahApothem, 'm; flat normal', out.flatNormalDeg, '°; entrance normal', out.entranceNormalDeg, '°');
const chk = process.argv[2];
if (chk) {
  const L = 1755, T = 1515, W = 400, H = 400, Z = 2;
  const P = (m, h) => { const [x, y] = f.toPx3(m, G + h); return `${((x - L) * Z).toFixed(1)},${((y - T) * Z).toFixed(1)}`; };
  const svg = `<svg width="${W * Z}" height="${H * Z}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-width="2.5">
    <polygon points="${out.hall.map(m => P(m, EAVE + 0.6)).join(' ')}" stroke="#00ff66"/>
    <polygon points="${out.verandah.map(m => P(m, 5.2)).join(' ')}" stroke="#ffd23f"/>
    <circle cx="${(c[0] - L) * Z}" cy="${(c[1] - T) * Z}" r="5" fill="#f0f"/></g>
    <rect width="100%" height="22" fill="#000" fill-opacity="0.6"/><text x="6" y="16" fill="#fff" font-size="13" font-family="Arial">green: the green roof's lower edge (fitted) · yellow: the verandah ring's outer edge (3 m out)</text></svg>`;
  await sharp(file).extract({ left: L, top: T, width: W, height: H }).resize(W * Z).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toFile(chk);
  console.log(chk);
}
