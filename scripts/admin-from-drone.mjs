// Admin Block traced on H A's straight-down drone still (20 Nov), like NAB (scripts/nab-from-drone.mjs): read in the
// campus-grid frame (the same u, v as NAB: Admin's walls run on the same grid), roof outlines at eave level, converted at
// their own height with the relief-aware fit, then pulled in by the eave overhang to give the walls.
// The plan is an L round the flag forecourt: the west arm (end block + linking wing) and the east arm (linking wing + end
// block) meet at the big square hall, whose corner faces the flag; that corner is the centre block with the portico.
// Writes reference/layout/admin_drone.json (applied by scripts/apply_admin_drone.py) and a check image.
// Usage: node scripts/admin-from-drone.mjs [check.jpg]
import fs from 'node:fs';
import sharp from 'sharp';
import { fitDrone3 } from './lib/dronefit.mjs';

const f = fitDrone3();
const A = [941.8, 2943.2], r = 39.55 * Math.PI / 180, U = [Math.cos(r), -Math.sin(r)], V = [Math.sin(r), Math.cos(r)];
const px = ([u, v]) => [A[0] + u * U[0] + v * V[0], A[1] + u * U[1] + v * V[1]];
const G = 9.6, EAVE4 = 15.6, EAVE3 = 11.9, OVER = 1.3; // ground, eave heights (4 and 3 storeys), overhang (m)
const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];
// roof outlines (eaves) read on the rotated views (adm_rot_full.jpg; 0.85 zoom) in photo pixels
// per edge (top v0, right u1, bottom v1, left u0): 'e' an eave (walls 1.3 m in), 'j' a joint with the next part (walls run
// 1.6 m past the shared roof line, into the neighbour, so nothing gaps where the eaves of the two meet)
const plan = {
  // (the photo has north down and east to the left: the arm at u 451–698 is the EAST one, its end block carries the emblem)
  endE: { h: EAVE4, uv: rect(451, 698, -1676, -1542), edges: 'eeje' },
  wingE: { h: EAVE3, uv: rect(451, 698, -1542, -1330), edges: 'jeje' },
  hall: { h: EAVE4, uv: rect(456.5, 850.6, -1330, -932.4), edges: 'eeee' },
  wingW: { h: EAVE3, uv: rect(850.6, 1062.4, -1150, -932.4), edges: 'ejej' },
  endW: { h: EAVE4, uv: rect(1060, 1189.4, -1167.6, -932.4), edges: 'eeej' },
};
const toM = (q, h) => f.toM3(px(q), G + h);
// move each edge of a convex outline in by its own distance (negative = out), walls under the eaves
function inset(poly, ds) {
  const n = poly.length, c = [poly.reduce((s, p) => s + p[0], 0) / n, poly.reduce((s, p) => s + p[1], 0) / n];
  const lines = poly.map((a, i) => { const d = Array.isArray(ds) ? ds[i] : ds, b = poly[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); let nx = dy / l, ny = -dx / l; if ((c[0] - a[0]) * nx + (c[1] - a[1]) * ny < 0) { nx = -nx; ny = -ny; } return { p: [a[0] + nx * d, a[1] + ny * d], d: [dx / l, dy / l] }; });
  return lines.map((L1, i) => { const L0 = lines[(i - 1 + n) % n], den = L0.d[0] * L1.d[1] - L0.d[1] * L1.d[0], t = ((L1.p[0] - L0.p[0]) * L1.d[1] - (L1.p[1] - L0.p[1]) * L1.d[0]) / den; return [+(L0.p[0] + L0.d[0] * t).toFixed(1), +(L0.p[1] + L0.d[1] * t).toFixed(1)]; });
}
const out = { note: "Admin from H A's drone nadir (20 Nov), scripts/admin-from-drone.mjs: roofs at eave level, walls 1.3 m in", parts: {}, roofs: {} };
for (const [k, it] of Object.entries(plan)) { const roofOutline = it.uv.map(q => toM(q, it.h)); out.roofs[k] = roofOutline.map(p => p.map(v => +v.toFixed(1))); out.parts[k] = inset(roofOutline, [...it.edges].map(e => (e === 'e' ? OVER : -1.6))); out.edges = { ...(out.edges ?? {}), [k]: it.edges }; }
// the axis (along the east arm, west → east) and the portico corner (the hall's corner facing the flag, at ground)
const e0 = toM([850.6, -1330], EAVE4), e1 = toM([1189.4, -1330], EAVE4);
out.axisDeg = +(Math.atan2(e1[1] - e0[1], e1[0] - e0[0]) * 180 / Math.PI).toFixed(1);
const corner = out.parts.hall[1]; // hall rect [u0,v0],[u1,v0],[u1,v1],[u0,v1] → index 1 = (u1, v0): the corner toward the forecourt
const flag = [203.5, -226.8], dc = Math.hypot(flag[0] - corner[0], flag[1] - corner[1]);
out.entrance = [+(corner[0] + (flag[0] - corner[0]) / dc * 2.5).toFixed(1), +(corner[1] + (flag[1] - corner[1]) / dc * 2.5).toFixed(1)];
fs.writeFileSync('reference/layout/admin_drone.json', JSON.stringify(out, null, 1));
console.log('axis', out.axisDeg, 'corner', corner, 'entrance', out.entrance, 'hall side', Math.hypot(out.parts.hall[1][0] - out.parts.hall[0][0], out.parts.hall[1][1] - out.parts.hall[0][1]).toFixed(1), 'm');

const chk = process.argv[2];
if (chk) {
  const file = 'D:/Map Mock/reference/video/stills/drone_20nov/dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg';
  const L = 150, T = 1050, W = 1250, H = 1050, Z = 0.85;
  const P = (m, h) => { const [x, y] = f.toPx3(m, G + h); return `${((x - L) * Z).toFixed(1)},${((y - T) * Z).toFixed(1)}`; };
  let svg = `<svg width="${W * Z}" height="${H * Z}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-width="2">`;
  for (const [k, it] of Object.entries(plan)) {
    svg += `<polygon points="${out.roofs[k].map(m => P(m, it.h)).join(' ')}" stroke="#00ff66"/>`;               // roof outline at eave height: should hug the roofs
    svg += `<polygon points="${out.parts[k].map(m => P(m, 0)).join(' ')}" stroke="#ffd23f" stroke-dasharray="6 4"/>`; // walls at ground
  }
  const [ex, ey] = P(out.entrance, 0).split(',').map(Number); svg += `<circle cx="${ex}" cy="${ey}" r="6" fill="#ff0" stroke="#000"/>`;
  svg += `</g><rect width="100%" height="22" fill="#000" fill-opacity="0.6"/><text x="6" y="16" fill="#fff" font-size="13" font-family="Arial">green: roof outlines at eave height (should hug the roofs) · yellow dashed: walls at ground · dot: main door</text></svg>`;
  await sharp(file).extract({ left: L, top: T, width: W, height: H }).resize(Math.round(W * Z)).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toFile(chk);
  console.log(chk);
}
