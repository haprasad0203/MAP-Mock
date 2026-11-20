// The green roofs on NAB measured automatically: sample H A's nadir in the building's (u, v) frame, keep green pixels,
// group them, and report each group's extent (u, v, and the diagonals u+v, u−v for the 45° diamonds).
import sharp from 'sharp';
const file = 'D:/Map Mock/reference/video/stills/drone_20nov/dji_fly_20260907_045954_491_1788784390269_video-00.24.8.jpg';
const A = [941.8, 2943.2], r = 39.55 * Math.PI / 180, U = [Math.cos(r), -Math.sin(r)], V = [Math.sin(r), Math.cos(r)];
const meta = await sharp(file).metadata(), { data } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const u0 = -140, u1 = 820, v0 = -90, v1 = 340, W = u1 - u0, H = v1 - v0, g = new Uint8Array(W * H);
const col = (x, y, c) => data[(Math.round(y) * meta.width + Math.round(x)) * 3 + c];
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const u = u0 + i, v = v0 + j, x = A[0] + u * U[0] + v * V[0], y = A[1] + u * U[1] + v * V[1];
  const R = col(x, y, 0), G = col(x, y, 1), B = col(x, y, 2);
  g[j * W + i] = G > R + 10 && G >= B - 4 && G > 60 && Math.max(R, G, B) - Math.min(R, G, B) > 18 ? 1 : 0;
}
// opening (remove specks), then components
const er = g.slice(); for (let j = 1; j < H - 1; j++) for (let i = 1; i < W - 1; i++) { const k = j * W + i; er[k] = g[k] && g[k - 1] && g[k + 1] && g[k - W] && g[k + W] ? 1 : 0; }
const lab = new Int32Array(W * H).fill(-1), comps = [];
for (let k = 0; k < W * H; k++) {
  if (!er[k] || lab[k] >= 0) continue;
  const c = { n: 0, su: 0, sv: 0, umin: 1e9, umax: -1e9, vmin: 1e9, vmax: -1e9, pmin: 1e9, pmax: -1e9, mmin: 1e9, mmax: -1e9 }, st = [k]; lab[k] = comps.length;
  while (st.length) {
    const q = st.pop(), i = q % W, j = (q / W) | 0, u = u0 + i, v = v0 + j;
    c.n++; c.su += u; c.sv += v; c.umin = Math.min(c.umin, u); c.umax = Math.max(c.umax, u); c.vmin = Math.min(c.vmin, v); c.vmax = Math.max(c.vmax, v);
    c.pmin = Math.min(c.pmin, u + v); c.pmax = Math.max(c.pmax, u + v); c.mmin = Math.min(c.mmin, u - v); c.mmax = Math.max(c.mmax, u - v);
    for (const d of [-1, 1, -W, W]) { const n = q + d; if (n >= 0 && n < W * H && er[n] && lab[n] < 0 && !(d === -1 && i === 0) && !(d === 1 && i === W - 1)) { lab[n] = lab[k]; st.push(n); } }
  }
  comps.push(c);
}
for (const c of comps.filter(c => c.n > 150).sort((a, b) => b.n - a.n)) {
  const cu = (c.su / c.n).toFixed(1), cv = (c.sv / c.n).toFixed(1);
  // a 45° square (diamond in u,v): its four vertices from the diagonal extremes
  const diam = { top: [((c.pmin + c.mmax) / 2).toFixed(1), ((c.pmin - c.mmax) / 2).toFixed(1)], right: [((c.pmax + c.mmax) / 2).toFixed(1), ((c.pmax - c.mmax) / 2).toFixed(1)], bottom: [((c.pmax + c.mmin) / 2).toFixed(1), ((c.pmax - c.mmin) / 2).toFixed(1)], left: [((c.pmin + c.mmin) / 2).toFixed(1), ((c.pmin - c.mmin) / 2).toFixed(1)] };
  console.log(`n=${c.n} centroid (${cu}, ${cv}) u ${c.umin}..${c.umax} v ${c.vmin}..${c.vmax} | u+v ${c.pmin}..${c.pmax} u-v ${c.mmin}..${c.mmax} | square-in-diagonals: sides ${((c.pmax - c.pmin) / Math.SQRT2).toFixed(1)} x ${((c.mmax - c.mmin) / Math.SQRT2).toFixed(1)}`);
}
