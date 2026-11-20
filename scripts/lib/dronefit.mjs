// Similarity fit between a straight-down drone still (pixels, y down) and local metres; see drone-overlay.mjs.
export function fitDrone(pairs) {
  const N = Array.from({ length: 4 }, () => [0, 0, 0, 0]), R = [0, 0, 0, 0];
  const add = (row, v) => { for (let i = 0; i < 4; i++) { R[i] += row[i] * v; for (let j = 0; j < 4; j++) N[i][j] += row[i] * row[j]; } };
  for (const [px, py, x, y] of pairs) { add([x, y, 1, 0], px); add([-y, x, 0, 1], py); }
  const M = N.map((r, i) => [...r, R[i]]);
  for (let c = 0; c < 4; c++) { let p = c; for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r; [M[c], M[p]] = [M[p], M[c]]; for (let r = 0; r < 4; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let q = c; q <= 4; q++) M[r][q] -= f * M[c][q]; } }
  const [a, b, tx, ty] = M.map((r, i) => r[4] / r[i]);
  return { a, b, tx, ty, s: Math.hypot(a, b), toPx: ([x, y]) => [a * x + b * y + tx, b * x - a * y + ty], toM: ([px, py]) => { const u = px - tx, v = py - ty, d = a * a + b * b; return [+((a * u + b * v) / d).toFixed(1), +((b * u - a * v) / d).toFixed(1)]; } };
}
// H A's DJI nadir still over Admin–NAB (20 Nov): dji_fly_20260907_045954…-00.24.8.jpg, 2160×3840; flag, Cafe Cloud, Kalam statue
export const NADIR_ADMIN = { file: 'dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg', pairs: [[767, 1253, 204, -227], [1966, 1711, 58, -209], [486, 609, 254, -284]] };

// ---------- relief-aware fit (20 Nov, "check again in detail") ----------
// The straight-down still is a perspective view from about 285 m: anything tall is pushed away from the image centre
// (the 30 m flag mast leans 85 px). Model: a camera straight down over the image centre c at elevation ZC; a point at
// absolute elevation z shows at c + (q − c)·(ZC − zRef)/(ZC − z), where q is its position on a reference plane at zRef
// related to local metres by a similarity. Control points carry their own elevation (lake = 0).
export const NADIR_CAM = { c: [1080, 1920], ZC: 294.6, zRef: 7 };
export const NADIR_CTRL = [
  { px: [773.3, 1265], z: 9.6, m: [203.5, -226.8], what: 'flag mast base (forecourt)' },
  { px: [488, 628], z: 5.2, m: [254, -284], what: 'Kalam statue garden ring centre' },
  { px: [1966, 1711], z: 17.7, m: [58, -209], what: 'Cafe Cloud lantern top (octagon centre)' },
];
export function fitDrone3(ctrl = NADIR_CTRL, cam = NADIR_CAM) {
  const { c, ZC, zRef } = cam, toRef = (p, z) => [c[0] + (p[0] - c[0]) * (ZC - z) / (ZC - zRef), c[1] + (p[1] - c[1]) * (ZC - z) / (ZC - zRef)];
  const f = fitDrone(ctrl.map(k => { const q = toRef(k.px, k.z); return [q[0], q[1], k.m[0], k.m[1]]; }));
  const fromRef = (q, z) => [c[0] + (q[0] - c[0]) * (ZC - zRef) / (ZC - z), c[1] + (q[1] - c[1]) * (ZC - zRef) / (ZC - z)];
  const res = ctrl.map(k => { const p = fromRef(f.toPx(k.m), k.z); return +Math.hypot(p[0] - k.px[0], p[1] - k.px[1]).toFixed(1); });
  return { ...f, cam, residualPx: res, toM3: (p, z) => f.toM(toRef(p, z)), toPx3: (m, z) => fromRef(f.toPx(m), z) };
}
