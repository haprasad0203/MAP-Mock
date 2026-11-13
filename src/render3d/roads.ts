// Roads and paths as crisp ribbons draped on the terrain mesh (the 1 m ground raster is too coarse for them).
// Near the campus a road is three stacked ribbons: kerb, white edge line, asphalt, plus a centre dash.
// Stacking means one road's asphalt covers another road's edge line, so junctions stay clean.
import type { XY } from '../geo/grid';
import type { PathLine } from '../geo/types';
import { Buckets, rgb, type RGB } from './mesh';
import type { SurfaceAt } from './ground';

export const ROAD_HALF: Record<PathLine['kind'], number> = { road: 3.9, service: 2.2, track: 1.8, footpath: 1.1, covered: 1.4 };
const COL = {
  kerb: rgb('#B4B0A2'), line: rgb('#F1ECDD'), asphalt: rgb('#4E535B'), service: rgb('#63676D'),
  track: rgb('#C9B48C'), path: rgb('#E0D5BC'),
};
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

/** One draped strip: `half` metres each side of the line, `lift` above the terrain. `keep` picks which segments are drawn. */
function strip(B: Buckets, sm: Sample[], half: number, lift: number, col: RGB, h: SurfaceAt, keep?: (i: number) => boolean) {
  // sit on the highest ground within reach, so a steep bank never pokes through the ribbon
  const at = (q: Sample, o: number): [number, number, number] => {
    const x = q.p[0] + q.n[0] * o, y = q.p[1] + q.n[1] * o;
    return [x, y, Math.max(h(x, y), h(x + 1.5, y), h(x - 1.5, y), h(x, y + 1.5), h(x, y - 1.5)) + lift + 0.12];
  };
  for (let i = 0; i + 1 < sm.length; i++) {
    if (keep && !keep(i)) continue;
    const a = sm[i], b = sm[i + 1], ra = at(a, -half), ca = at(a, 0), la = at(a, half), rb = at(b, -half), cb = at(b, 0), lb = at(b, half);
    B.quad('road', ra, rb, cb, ca, col); B.quad('road', ca, cb, lb, la, col);
  }
}

/** All roads, tracks and footpaths into bucket `road`. `near(x, y)`: draw the full detail there (kerb, lines, dash). */
export function addRoads(B: Buckets, paths: PathLine[], h: SurfaceAt, near: (x: number, y: number) => boolean) {
  const stepAt = (x: number, y: number) => (near(x, y) ? 3 : 8);
  for (const p of paths) {
    if (p.pts.length < 2) continue;
    const sm = resample(p.pts, stepAt), isNear = (i: number) => near(sm[i].p[0], sm[i].p[1]), half = ROAD_HALF[p.kind];
    if (p.kind === 'road') {
      strip(B, sm, half + 0.9, 0.14, COL.kerb, h, isNear);
      strip(B, sm, half, 0.19, COL.line, h, isNear);
      strip(B, sm, half - LINE_W, 0.24, COL.asphalt, h, isNear);
      strip(B, sm, half, 0.3, COL.asphalt, h, i => !isNear(i)); // far away: asphalt only
      strip(B, sm, 0.22, 0.29, COL.line, h, i => isNear(i) && Math.floor(sm[i].s / 3.2) % 2 === 0);
    } else if (p.kind === 'service') {
      strip(B, sm, half + 0.5, 0.13, COL.kerb, h, isNear);
      strip(B, sm, half, 0.21, COL.service, h, isNear);
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
