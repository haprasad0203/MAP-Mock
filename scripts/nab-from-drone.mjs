// NAB and its three roads, traced on H A's straight-down drone still (20 Nov, "check again in detail").
// Everything is read in the building's own frame on the photo: u along the SE (lawn) front from its SW corner, v back
// from it, in photo pixels (about 9 px a metre). Each item is converted to local metres at its own height with the
// relief-aware camera fit (scripts/lib/dronefit.mjs → fitDrone3), because a 14.5 m parapet shows about 5 m further from
// the image centre than its base. Writes reference/layout/nab_drone.json (applied by scripts/apply-nab-drone.py) and a
// check image with every item projected back onto the photo at its own height.
// Usage: node scripts/nab-from-drone.mjs [check.jpg]
import fs from 'node:fs';
import sharp from 'sharp';
import { fitDrone3 } from './lib/dronefit.mjs';

const f = fitDrone3();
const A = [941.8, 2943.2], r = 39.55 * Math.PI / 180, U = [Math.cos(r), -Math.sin(r)], V = [Math.sin(r), Math.cos(r)];
const px = ([u, v]) => [A[0] + u * U[0] + v * V[0], A[1] + u * U[1] + v * V[1]];
const G = 5.4;                                    // NAB ground (layout groundElev)
const H = { parapet: 14.5, towerRim: 19.5, pavEave: 18.0, annex: 5.0, ground: 0 };
const toM = (q, h) => f.toM3(px(q), G + h).map(v => +v.toFixed(1));
const diamond = (cu, cv, ru, rv = ru) => [[cu, cv - rv], [cu + ru, cv], [cu, cv + rv], [cu - ru, cv]];
const rect = (u0, u1, v0, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]];

// ---------- the plan, as read on the photo (rotated views nab_rot_*.jpg; green roofs by colour mask, nab-green.mjs) ----------
const plan = {
  main: { h: 'parapet', uv: [[0, 0], [691, 0], [691, 47], [800, 47], [800, 279], [688, 279], [688, 285], [566, 285], [566, 250], [538, 250], [538, 293], [463, 293], [410, 244], [283, 244], [223, 293], [147, 291], [147, 250], [119, 250], [119, 285], [-9, 285], [-9, 279], [-118, 279], [-118, 47], [0, 47]] },
  // the SE front, west to east: stone block (emblem), white block, faceted glass atrium, white block, stone block
  frontW: { h: 'parapet', uv: rect(145, 235, -42, 3) },
  whiteW: { h: 'parapet', uv: rect(235, 312, -23, 3) },
  atrium: { h: 'parapet', uv: [[312, 3], [312, -23], [346.5, -40], [407, -24], [407, 3]] },
  whiteE: { h: 'parapet', uv: rect(407, 491, -24, 3) },
  frontE: { h: 'parapet', uv: rect(491, 580, -42, 3) },
  towerW: { h: 'towerRim', uv: rect(-118, -52.5, 54, 148) },
  towerE: { h: 'towerRim', uv: rect(729, 785, 57, 147) },
  pavC: { h: 'pavEave', uv: diamond(339.5, 152.5, 86.5) },
  pavW: { h: 'pavEave', uv: diamond(129, 148.5, 61, 57.5) },
  pavE: { h: 'pavEave', uv: diamond(552.5, 147, 54.5, 60) },
  annex: { h: 'annex', uv: [[223, 293], [283, 244], [410, 244], [463, 293], [427, 327], [307, 327]] },
};
// the red-paver forecourt between the lawn-side front and the front road's kerb, round both ends (ground level)
const forecourt = [[-125, -157], [860, -157], [860, -12], [-125, -12]];
// the green V band along the atrium's top edges (outer apex, 45° arms back over the roof)
const vband = { h: 'parapet', uv: [[269, 34], [346.5, -43.5], [424, 34]] };
// roads, centrelines on the ground (pixel reading at native scale, nab_roads1/3.jpg)
const roads = {
  'rd-nab-front': [[-198, 650], [-163, 550], [-140, 450], [-135, 330], [-135, 0], [-128, -140], [-100, -172], [0, -180], [300, -181], [600, -180], [800, -179]],
  'rd-nab-west': [[-135, 320], [100, 320], [330, 320], [600, 320], [749, 300], [840, 225]],
};

// ---------- convert ----------
const out = { parts: {}, roads: {}, note: 'NAB and its roads from H A\'s drone nadir (20 Nov), scripts/nab-from-drone.mjs' };
for (const [k, it] of Object.entries(plan)) out.parts[k] = it.uv.map(q => toM(q, H[it.h]));
// the annex shares the main block's recessed back wall: snap its first four points onto the main block's
const mainBack = [[223, 293], [283, 244], [410, 244], [463, 293]].map(q => toM(q, H.parapet));
out.parts.annex = [...mainBack, ...plan.annex.uv.slice(4).map(q => toM(q, H.annex))];
// the front parts overlap the main block by 3 px so their back faces stay hidden; snap their v=0 corners to the main front
out.vband = vband.uv.map(q => toM(q, H[vband.h]));
out.forecourt = forecourt.map(q => toM(q, H.ground));
for (const [id, pts] of Object.entries(roads)) out.roads[id] = pts.map(q => toM(q, H.ground));
// building frame in metres: the front line's direction and the axis angle (for the 2D rectangles)
const a0 = toM([0, 0], H.parapet), a1 = toM([691, 0], H.parapet);
out.axisDeg = +(Math.atan2(a1[1] - a0[1], a1[0] - a0[0]) * 180 / Math.PI).toFixed(1);
// entrances: the atrium's glass apex at ground level, and the two side doors under the white blocks' canopies
out.entrances = { main: toM([346.5, -40], H.parapet), sideW: toM([273, -23], H.parapet), sideE: toM([449, -24], H.parapet) };
fs.writeFileSync('reference/layout/nab_drone.json', JSON.stringify(out, null, 1));
console.log('axis', out.axisDeg, 'deg; main', out.parts.main.length, 'pts; length', Math.hypot(a1[0] - a0[0], a1[1] - a0[1]).toFixed(1), 'm (front 0..691 px)');

// ---------- check image: every item projected back at its own height onto the photo ----------
const chk = process.argv[2];
if (chk) {
  const file = 'D:/Map Mock/reference/video/stills/drone_20nov/dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg';
  const L = 760, T = 2250, W = 1200, Hh = 1350, Z = 0.9;
  const P = (m, h) => { const [x, y] = f.toPx3(m, G + h); return `${((x - L) * Z).toFixed(1)},${((y - T) * Z).toFixed(1)}`; };
  const col = { main: '#00ff66', frontW: '#ffb000', frontE: '#ffb000', whiteW: '#ffffff', whiteE: '#ffffff', atrium: '#00e5ff', towerW: '#ff5ad7', towerE: '#ff5ad7', pavC: '#7CFC00', pavW: '#7CFC00', pavE: '#7CFC00', annex: '#c0a0ff' };
  let svg = `<svg width="${W * Z}" height="${Hh * Z}" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke-width="2">`;
  for (const [k, pts] of Object.entries(out.parts)) svg += `<polygon points="${pts.map(m => P(m, H[plan[k].h])).join(' ')}" stroke="${col[k]}"/>`;
  // the same footprints at ground level (where the walls meet the ground), dashed
  svg += `<polygon points="${out.parts.main.map(m => P(m, 0)).join(' ')}" stroke="#00ff66" stroke-dasharray="6 5" stroke-opacity="0.8"/>`;
  svg += `<polyline points="${out.vband.map(m => P(m, H.parapet)).join(' ')}" stroke="#2ecc71" stroke-width="4"/>`;
  for (const [id, pts] of Object.entries(out.roads)) svg += `<polyline points="${pts.map(m => P(m, 0)).join(' ')}" stroke="#ff3b6b" stroke-width="3"/>`;
  for (const [k, m] of Object.entries(out.entrances)) { const [x, y] = P(m, 0).split(',').map(Number); svg += `<circle cx="${x}" cy="${y}" r="6" fill="#ff0" stroke="#000"/><text x="${x + 8}" y="${y + 4}" fill="#ff0" stroke="#000" stroke-width="3" paint-order="stroke" font-size="13" font-family="Arial">${k}</text>`; }
  svg += `</g><rect width="100%" height="24" fill="#000" fill-opacity="0.6"/><text x="6" y="17" fill="#fff" font-size="13" font-family="Arial">solid: at their own height (should hug the roof edges) · dashed green: NAB's walls at ground · red: roads at ground</text></svg>`;
  await sharp(file).extract({ left: L, top: T, width: W, height: Hh }).resize(Math.round(W * Z)).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 88 }).toFile(chk);
  console.log(chk);
}
