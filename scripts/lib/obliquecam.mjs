// A pinhole camera for H A's oblique DJI frames (2160 × 3840, portrait), solved from ground control points: position
// (x, y, z in local metres, z above the lake), heading (bearing of the view, clockwise from north), pitch (down from the
// horizon), roll and focal length in pixels; the principal point is the image centre. Least squares by Levenberg–
// Marquardt with a numeric Jacobian, started from a coarse search. 7 unknowns, so at least 4 points (8 equations);
// near-planar points are fine because the model has no skew or aspect freedom.
const W = 2160, H = 3840, CX = W / 2, CY = H / 2, D2R = Math.PI / 180;

/** Camera from parameters p = [x, y, z, headingDeg, pitchDeg, rollDeg, f]. */
export function camera(p) {
  const [x, y, z, hd, pd, rd, f] = p, h = hd * D2R, t = pd * D2R, r = rd * D2R;
  const F = [Math.sin(h) * Math.cos(t), Math.cos(h) * Math.cos(t), -Math.sin(t)];
  const R0 = [Math.cos(h), -Math.sin(h), 0];
  const U0 = [R0[1] * F[2] - R0[2] * F[1], R0[2] * F[0] - R0[0] * F[2], R0[0] * F[1] - R0[1] * F[0]];
  const R = R0.map((v, i) => v * Math.cos(r) + U0[i] * Math.sin(r)), U = R0.map((v, i) => -v * Math.sin(r) + U0[i] * Math.cos(r));
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return {
    p, C: [x, y, z], F, R, U, f,
    /** Map point (x, y, z) → image pixel, or null behind the camera. */
    project([X, Y, Z]) { const d = [X - x, Y - y, Z - z], df = dot(d, F); if (df <= 0.1) return null; return [CX + (f * dot(d, R)) / df, CY - (f * dot(d, U)) / df]; },
    /** Image pixel → the map point where its ray meets the horizontal plane at height z0 (or a function of x, y). */
    toGround([u, v], z0) {
      const a = (u - CX) / f, b = -(v - CY) / f, dir = [F[0] + a * R[0] + b * U[0], F[1] + a * R[1] + b * U[1], F[2] + a * R[2] + b * U[2]];
      if (typeof z0 === 'number') { const s = (z0 - z) / dir[2]; return s > 0 ? [x + dir[0] * s, y + dir[1] * s] : null; }
      let s = 1, best = null; for (let k = 0; k < 400; k++) { const q = [x + dir[0] * s, y + dir[1] * s, z + dir[2] * s]; if (q[2] <= z0(q[0], q[1])) { best = s; break; } s += 2; }
      if (best === null) return null; let lo = best - 2, hi = best;
      for (let k = 0; k < 30; k++) { const m = (lo + hi) / 2, q = [x + dir[0] * m, y + dir[1] * m, z + dir[2] * m]; if (q[2] > z0(q[0], q[1])) lo = m; else hi = m; }
      return [x + dir[0] * hi, y + dir[1] * hi];
    },
  };
}

/** Residuals: a point gives two (dx, dy); a point on a known line (g.line: map polyline with z) gives one, its distance to
 *  the projected line in pixels (weighted 0.7: a road centre read on the photo is less exact than a court corner). */
function residuals(p, gcps) {
  const c = camera(p), out = [];
  for (const g of gcps) {
    if (g.line) {
      const pr = g.line.map(q => c.project(q)); let best = 1e4;
      for (let i = 1; i < pr.length; i++) { const a = pr[i - 1], b = pr[i]; if (!a || !b) continue; const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((g.px[0] - a[0]) * dx + (g.px[1] - a[1]) * dy) / l2)); best = Math.min(best, Math.hypot(g.px[0] - a[0] - t * dx, g.px[1] - a[1] - t * dy)); }
      out.push(best * (g.w ?? 0.7)); continue;
    }
    const q = c.project(g.m); if (!q) { out.push(1e4, 1e4); continue; } out.push(q[0] - g.px[0], q[1] - g.px[1]);
  }
  return out;
}
const sse = r => r.reduce((s, v) => s + v * v, 0);

/** Solve the camera from gcps [{ px: [u, v], m: [x, y, z] }]. Returns { p, cam, rms, residuals }. */
export function solveCamera(gcps, guess = {}) {
  const pts = gcps.filter(g => g.m), cx = pts.reduce((s, g) => s + g.m[0], 0) / pts.length, cy = pts.reduce((s, g) => s + g.m[1], 0) / pts.length, cz = pts.reduce((s, g) => s + g.m[2], 0) / pts.length;
  // coarse search: heading, pitch and distance to the points' centroid, with the camera aimed at it
  let best = null;
  const fs = guess.f ? [guess.f] : [2200, 2600, 3000];
  for (let hd = 0; hd < 360; hd += 10) for (let pd = 15; pd <= 75; pd += 10) for (const dist of [120, 200, 320, 500]) for (const f of fs) {
    const h = hd * D2R, t = pd * D2R, p = [cx - Math.sin(h) * Math.cos(t) * dist, cy - Math.cos(h) * Math.cos(t) * dist, cz + Math.sin(t) * dist, hd, pd, 0, f];
    const e = sse(residuals(p, gcps)); if (!best || e < best.e) best = { p, e };
  }
  // Levenberg–Marquardt
  let p = (guess.p ?? best.p).slice(), lambda = 1e-2, e = sse(residuals(p, gcps));
  const steps = [0.5, 0.5, 0.5, 0.05, 0.05, 0.05, 5];
  for (let it = 0; it < 400; it++) {
    const r = residuals(p, gcps), J = p.map((_, j) => { const q = p.slice(); q[j] += steps[j]; const r2 = residuals(q, gcps); return r2.map((v, i) => (v - r[i]) / steps[j]); });
    const n = p.length, A = Array.from({ length: n }, () => new Array(n).fill(0)), g = new Array(n).fill(0);
    for (let i = 0; i < r.length; i++) for (let a = 0; a < n; a++) { g[a] += J[a][i] * r[i]; for (let b = 0; b < n; b++) A[a][b] += J[a][i] * J[b][i]; }
    let improved = false;
    for (let tries = 0; tries < 10; tries++) {
      const M = A.map((row, a) => row.map((v, b) => v + (a === b ? lambda * (v + 1e-9) : 0)).concat([-g[a]]));
      for (let c = 0; c < n; c++) { let piv = c; for (let rr = c + 1; rr < n; rr++) if (Math.abs(M[rr][c]) > Math.abs(M[piv][c])) piv = rr; [M[c], M[piv]] = [M[piv], M[c]]; for (let rr = 0; rr < n; rr++) if (rr !== c && M[c][c]) { const k = M[rr][c] / M[c][c]; for (let q = c; q <= n; q++) M[rr][q] -= k * M[c][q]; } }
      const dp = M.map((row, i) => row[n] / row[i]), q = p.map((v, i) => v + dp[i]), e2 = sse(residuals(q, gcps));
      if (Number.isFinite(e2) && e2 < e) { p = q; e = e2; lambda = Math.max(1e-7, lambda / 3); improved = true; break; }
      lambda *= 4;
    }
    if (!improved || e < 1e-6) break;
  }
  const res = residuals(p, gcps); let k = 0; const per = gcps.map(g => +(g.line ? Math.abs(res[k++]) / (g.w ?? 0.7) : Math.hypot(res[k++], res[k++])).toFixed(1));
  return { p: p.map(v => +v.toFixed(3)), cam: camera(p), rms: +Math.sqrt(e / gcps.length).toFixed(2), residuals: per };
}
