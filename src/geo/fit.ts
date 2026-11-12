import type { XY } from './grid';
/** x' = a*x - b*y + tx ; y' = b*x + a*y + ty  (or a full affine when `affine` is set). */
export interface Transform { a: number; b: number; tx: number; ty: number; affine?: [number, number, number, number, number, number] }
export const IDENTITY: Transform = { a: 1, b: 0, tx: 0, ty: 0 };

export function apply(t: Transform, [x, y]: XY): XY {
  if (t.affine) { const [p, q, r, s, u, v] = t.affine; return [p * x + q * y + u, r * x + s * y + v]; }
  return [t.a * x - t.b * y + t.tx, t.b * x + t.a * y + t.ty];
}

/** Least-squares similarity (Umeyama, no reflection) mapping src -> dst. One point = translation only. */
export function fitSimilarity(src: XY[], dst: XY[]): Transform {
  const n = src.length;
  if (n === 0) return IDENTITY;
  const mean = (p: XY[]) => p.reduce<XY>((m, q) => [m[0] + q[0] / n, m[1] + q[1] / n], [0, 0]);
  const ms = mean(src), md = mean(dst);
  if (n === 1) return { a: 1, b: 0, tx: md[0] - ms[0], ty: md[1] - ms[1] };
  let sxx = 0, sxy = 0, ss = 0;
  for (let i = 0; i < n; i++) {
    const sx = src[i][0] - ms[0], sy = src[i][1] - ms[1], dx = dst[i][0] - md[0], dy = dst[i][1] - md[1];
    sxx += sx * dx + sy * dy; sxy += sx * dy - sy * dx; ss += sx * sx + sy * sy;
  }
  const a = sxx / ss, b = sxy / ss;
  return { a, b, tx: md[0] - (a * ms[0] - b * ms[1]), ty: md[1] - (b * ms[0] + a * ms[1]) };
}

/** Least-squares affine (needs >= 3 non-collinear points, else falls back to similarity). */
export function fitAffine(src: XY[], dst: XY[]): Transform {
  if (src.length < 3) return fitSimilarity(src, dst);
  const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bx = [0, 0, 0], by = [0, 0, 0];
  src.forEach(([x, y], i) => {
    const row = [x, y, 1];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) M[r][c] += row[r] * row[c];
      bx[r] += row[r] * dst[i][0]; by[r] += row[r] * dst[i][1];
    }
  });
  const solve = (A: number[][], b: number[]) => {
    const m = A.map((r, i) => [...r, b[i]]);
    for (let i = 0; i < 3; i++) {
      let p = i;
      for (let k = i + 1; k < 3; k++) if (Math.abs(m[k][i]) > Math.abs(m[p][i])) p = k;
      [m[i], m[p]] = [m[p], m[i]];
      if (Math.abs(m[i][i]) < 1e-9) return null;
      for (let k = 0; k < 3; k++) if (k !== i) { const f = m[k][i] / m[i][i]; for (let c = i; c < 4; c++) m[k][c] -= f * m[i][c]; }
    }
    return m.map((r, i) => r[3] / r[i]);
  };
  const X = solve(M, bx), Y = solve(M, by);
  if (!X || !Y) return fitSimilarity(src, dst);
  return { a: 1, b: 0, tx: 0, ty: 0, affine: [X[0], X[1], Y[0], Y[1], X[2], Y[2]] };
}

export function residuals(t: Transform, src: XY[], dst: XY[]): number[] {
  return src.map((p, i) => { const q = apply(t, p); return Math.hypot(q[0] - dst[i][0], q[1] - dst[i][1]); });
}
