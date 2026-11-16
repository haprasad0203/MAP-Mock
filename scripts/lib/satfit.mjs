// Fit between our local metres (x east, y north from campus-layout.json's origin) and the pixels of the Map Pack
// satellite screenshots: a scale + offset least-squares fit on the Google pins, ported from
// reference/layout/generator/sat.py. Used ONLY to measure (road widths) and to draw check underlays; nothing is
// traced from the imagery (REAL_CAMPUS_MODELS.md section 6).
const O = [25.6176, 91.9522], KX = 111320 * Math.cos((O[0] * Math.PI) / 180), KY = 110574;
/** lat, lon → local metres */
export const L = (lat, lon) => [(lon - O[1]) * KX, (lat - O[0]) * KY];

export const PINS = {
  'IIM SHILLONG (pin)': [25.6168529, 91.9531595], 'Auditorium (pin)': [25.6160427, 91.9540054], 'Dr Kalam Centre': [25.6180674, 91.9518524],
  'F Block New Hostel': [25.6212283, 91.9500786], 'D block': [25.6200387, 91.9505678], "Students' Mess": [25.6199197, 91.9495275],
  Mithaas: [25.6194178, 91.9495941], 'Football Ground': [25.6194387, 91.9510608], 'Basketball courts': [25.6187004, 91.9505785],
  'Volleyball Court': [25.6191415, 91.9500313], 'Type 2 Quarters': [25.619346, 91.9472831], 'Faculty Qtrs Type 3': [25.6204254, 91.9482607],
  'Water Supply Tank': [25.6220258, 91.9480405], 'IIM Substation': [25.616188, 91.957687], 'ICICI ATM': [25.614248, 91.954537],
  'IIM-Shillong (main listing)': [25.6146357, 91.9546082], 'Cafe Cloud / Tin Cafe': [25.6157059, 91.9528862],
};

const PACK = 'reference/IIM_Shillong_Campus_Map_Pack/01_satellite_screenshots/';
/** Each screenshot with the pixel position of the pins visible on it (from sat.py). */
export const SHOTS = {
  '01': { file: PACK + '01_whole_campus_labeled.jpg', obs: [['D block', 655, 139], ['Type 2 Quarters', 405, 196], ['Football Ground', 692, 189], ['Basketball courts', 656, 252], ['Dr Kalam Centre', 751, 303], ['IIM SHILLONG (pin)', 851, 408], ['IIM-Shillong (main listing)', 962, 595], ['ICICI ATM', 957, 628], ['IIM Substation', 1193, 476]] },
  '02': { file: PACK + '02_north_hostels_sports_closeup.jpg', obs: [['F Block New Hostel', 695, 184], ['D block', 749, 308], ['Football Ground', 797, 373], ['Basketball courts', 749, 454], ['Type 2 Quarters', 427, 383], ['Water Supply Tank', 502, 93], ['Dr Kalam Centre', 873, 520], ['IIM SHILLONG (pin)', 1003, 654]] },
  '03': { file: PACK + '03_south_academic_auditorium_closeup.jpg', obs: [['IIM SHILLONG (pin)', 863, 307], ['Dr Kalam Centre', 733, 175], ['Basketball courts', 610, 107], ['ICICI ATM', 998, 592], ['IIM-Shillong (main listing)', 1005, 549], ['IIM Substation', 1302, 396]] },
  // H A's hi-res screenshots (reference/photos/from_above/), pins read at the marker tips; scale bar 50 m = 100 px
  hr0423: { file: 'reference/photos/from_above/google_sat_hires_HA_2026-11-13_0423.png', obs: [['IIM SHILLONG (pin)', 976, 304], ['Dr Kalam Centre', 714, 33], ['Cafe Cloud / Tin Cafe', 913, 531], ['IIM-Shillong (main listing)', 1262, 790], ['ICICI ATM', 1248, 876]] },
};

/** Least-squares s, tx, ty with px = s·x + tx, py = −s·y + ty. Returns the mapping both ways, the scale and the RMS residual (px). */
export function fitShot(key) {
  const { obs } = SHOTS[key];
  // normal equations for [s, tx, ty]
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
  const add = (row, v) => { for (let i = 0; i < 3; i++) { b[i] += row[i] * v; for (let j = 0; j < 3; j++) A[i][j] += row[i] * row[j]; } };
  for (const [n, px, py] of obs) { const [x, y] = L(...PINS[n]); add([x, 1, 0], px); add([-y, 0, 1], py); }
  const [s, tx, ty] = solve3(A, b);
  const toPx = ([x, y]) => [s * x + tx, -s * y + ty], toM = ([px, py]) => [(px - tx) / s, -(py - ty) / s];
  let e = 0; for (const [n, px, py] of obs) { const [qx, qy] = toPx(L(...PINS[n])); e += (qx - px) ** 2 + (qy - py) ** 2; }
  return { file: SHOTS[key].file, s, pxPerM: s, toPx, toM, rms: Math.sqrt(e / obs.length) };
}

function solve3(A, b) {
  const M = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < 3; c++) {
    let p = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < 3; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let k = c; k < 4; k++) M[r][k] -= f * M[c][k]; }
  }
  return M.map((r, i) => r[3] / r[i]);
}
