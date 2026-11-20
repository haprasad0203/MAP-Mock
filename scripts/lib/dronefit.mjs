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
