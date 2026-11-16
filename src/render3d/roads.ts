// Roads and paths as crisp ribbons draped on the terrain mesh (the 1 m ground raster is too coarse for them).
// Near the campus a road is three stacked ribbons: kerb, white edge line, asphalt, plus a centre dash.
// Stacking means one road's asphalt covers another road's edge line, so junctions stay clean.
import type { XY } from '../geo/grid';
import type { PathLine } from '../geo/types';
import { Buckets, rgb, type RGB } from './mesh';
import type { SurfaceAt } from './ground';

// Half-widths when hardscape.json has no entry for a path (Phase 3M v2): roads were measured at about 9 m of asphalt plus
// kerbs on the satellite and the drone stills, so the old 7.8 m roads read too narrow next to the buildings.
export const ROAD_HALF: Record<PathLine['kind'], number> = { road: 5.0, service: 3.25, track: 1.8, footpath: 1.3, covered: 1.5 };
/** Half-width of a path at s metres along it: its hardscape width, narrowed locally at the tight spots. */
export function halfOf(p: PathLine, s = -1): number {
  const n = s >= 0 ? p.narrow?.find(z => s >= z.s0 - 1 && s <= z.s1 + 1) : undefined;
  return (n?.width ?? p.width ?? ROAD_HALF[p.kind] * 2) / 2;
}
// The road material carries the asphalt texture (tex-asphalt), so each colour is stored as a multiple of the
// texture's average: the asphalt itself is about 1, the kerb, lines and paths are lighter tints of the same grain.
const AVG: RGB = [0.08, 0.091, 0.107];
const over = (hex: string): RGB => { const c = rgb(hex); return [c[0] / AVG[0], c[1] / AVG[1], c[2] / AVG[2]]; };
const COL = {
  kerb: over('#B5AD9C'), line: over('#F1ECDD'), asphalt: over('#54575C'), service: over('#676766'),
  track: over('#C2A982'), path: over('#DCCFB2'), pavers: over('#C98E80'),
};
const UV = 7; // metres per repeat of the asphalt texture
const LINE_W = 0.5;

export interface Sample { p: XY; n: XY; s: number } // point, left normal (mitred), distance along
/** Resample a polyline at about `stepAt(x, y)` metres, with a mitred left normal at each point. */
export function resample(pts: XY[], stepAt: (x: number, y: number) => number): Sample[] {
  const out: XY[] = [];
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], len = Math.hypot(bx - ax, by - ay); if (len < 0.05) continue;
    const m = Math.max(1, Math.round(len / stepAt((ax + bx) / 2, (ay + by) / 2)));
    for (let t = 0; t < m; t++) out.push([ax + ((bx - ax) * t) / m, ay + ((by - ay) * t) / m]);
  }
  if (pts.length) out.push(pts[pts.length - 1]);
  const res: Sample[] = []; let s = 0;
  for (let i = 0; i < out.length; i++) {
    const a = out[Math.max(0, i - 1)], b = out[i], c = out[Math.min(out.length - 1, i + 1)];
    let d1x = b[0] - a[0], d1y = b[1] - a[1], d2x = c[0] - b[0], d2y = c[1] - b[1];
    const l1 = Math.hypot(d1x, d1y), l2 = Math.hypot(d2x, d2y);
    if (l1 > 1e-6) { d1x /= l1; d1y /= l1; } else { d1x = d2x / (l2 || 1); d1y = d2y / (l2 || 1); }
    if (l2 > 1e-6) { d2x /= l2; d2y /= l2; } else { d2x = d1x; d2y = d1y; }
    let tx = d1x + d2x, ty = d1y + d2y; const tl = Math.hypot(tx, ty);
    if (tl < 1e-3) { tx = d2x; ty = d2y; } else { tx /= tl; ty /= tl; }
    const k = Math.min(1.6, 1 / Math.max(0.3, tx * d2x + ty * d2y)); // mitre
    if (i > 0) s += l1;
    res.push({ p: b, n: [-ty * k, tx * k], s });
  }
  return res;
}

/** One draped band from offset lo(i) to hi(i) (metres, + = left of travel), `lift` above the terrain. `keep` picks the segments drawn. */
function band(B: Buckets, sm: Sample[], lo: (i: number) => number, hi: (i: number) => number, lift: number, col: RGB, h: SurfaceAt, keep?: (i: number) => boolean) {
  const at = (q: Sample, o: number): [number, number, number] => {
    const x = q.p[0] + q.n[0] * o, y = q.p[1] + q.n[1] * o;
    return [x, y, Math.max(h(x, y), h(x + 1.5, y), h(x - 1.5, y), h(x, y + 1.5), h(x, y - 1.5)) + lift + 0.12];
  };
  const uv = (p: [number, number, number]): [number, number] => [p[0] / UV, p[1] / UV];
  for (let i = 0; i + 1 < sm.length; i++) {
    if (keep && !keep(i)) continue;
    const a = sm[i], b = sm[i + 1], ra = at(a, lo(i)), rb = at(b, lo(i + 1)), la = at(a, hi(i)), lb = at(b, hi(i + 1));
    B.quad('road', ra, rb, lb, la, col, uv(ra), uv(rb), uv(lb), uv(la));
  }
}
/** One draped strip: `half` metres each side of the line, `lift` above the terrain. `keep` picks which segments are drawn. */
function strip(B: Buckets, sm: Sample[], half: number | ((i: number) => number), lift: number, col: RGB, h: SurfaceAt, keep?: (i: number) => boolean) {
  const hw = typeof half === 'number' ? () => half : half;
  // sit on the highest ground within reach, so a steep bank never pokes through the ribbon
  const at = (q: Sample, o: number): [number, number, number] => {
    const x = q.p[0] + q.n[0] * o, y = q.p[1] + q.n[1] * o;
    return [x, y, Math.max(h(x, y), h(x + 1.5, y), h(x - 1.5, y), h(x, y + 1.5), h(x, y - 1.5)) + lift + 0.12];
  };
  for (let i = 0; i + 1 < sm.length; i++) {
    if (keep && !keep(i)) continue;
    const a = sm[i], b = sm[i + 1], ra = at(a, -hw(i)), ca = at(a, 0), la = at(a, hw(i)), rb = at(b, -hw(i + 1)), cb = at(b, 0), lb = at(b, hw(i + 1));
    const uv = (p: [number, number, number]): [number, number] => [p[0] / UV, p[1] / UV];
    B.quad('road', ra, rb, cb, ca, col, uv(ra), uv(rb), uv(cb), uv(ca)); B.quad('road', ca, cb, lb, la, col, uv(ca), uv(cb), uv(lb), uv(la));
  }
}

/** All roads, tracks and footpaths into bucket `road`. `near(x, y)`: draw the full detail there (kerb, lines, dash). */
export function addRoads(B: Buckets, paths: PathLine[], h: SurfaceAt, near: (x: number, y: number) => boolean) {
  const stepAt = (x: number, y: number) => (near(x, y) ? 3 : 8);
  for (const p of paths) {
    if (p.pts.length < 2) continue;
    const sm = resample(p.pts, stepAt), isNear = (i: number) => near(sm[i].p[0], sm[i].p[1]), half = (i: number) => halfOf(p, sm[i].s);
    // pavements (hardscape.json): red-pink pavers beside the kerb, left and right of the direction of travel
    if (p.pavementL) band(B, sm, i => half(i), i => half(i) + p.pavementL!, 0.18, COL.pavers, h, isNear);
    if (p.pavementR) band(B, sm, i => -half(i) - p.pavementR!, i => -half(i), 0.18, COL.pavers, h, isNear);
    if (p.kind === 'road') {
      // the kerb sits inside the kerb-to-kerb width: asphalt and lines inside it
      strip(B, sm, half, 0.14, COL.kerb, h, isNear);
      strip(B, sm, i => half(i) - 0.5, 0.19, COL.line, h, isNear);
      strip(B, sm, i => half(i) - 0.5 - LINE_W, 0.24, COL.asphalt, h, isNear);
      strip(B, sm, half, 0.3, COL.asphalt, h, i => !isNear(i)); // far away: asphalt only
      strip(B, sm, 0.22, 0.29, COL.line, h, i => isNear(i) && Math.floor(sm[i].s / 3.2) % 2 === 0);
    } else if (p.kind === 'service') {
      strip(B, sm, half, 0.13, COL.kerb, h, isNear);
      strip(B, sm, i => half(i) - 0.4, 0.21, COL.service, h, isNear);
      strip(B, sm, half, 0.28, COL.service, h, i => !isNear(i));
    } else strip(B, sm, half, p.kind === 'track' ? 0.1 : 0.12, p.kind === 'track' ? COL.track : COL.path, h);
  }
}

/** A plain draped ribbon (used for the route hook). */
export function addRibbon(B: Buckets, key: string, pts: XY[], half: number, lift: number, col: RGB, h: SurfaceAt) {
  const sm = resample(pts, () => 2.5);
  const at = (q: Sample, o: number): [number, number, number] => { const x = q.p[0] + q.n[0] * o, y = q.p[1] + q.n[1] * o; return [x, y, h(x, y) + lift]; };
  for (let i = 0; i + 1 < sm.length; i++) B.quad(key, at(sm[i], -half), at(sm[i + 1], -half), at(sm[i + 1], half), at(sm[i], half), col);
}
