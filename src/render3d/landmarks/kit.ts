// Building blocks for the hand-modelled landmarks (Phase 3R). A landmark is built on its data footprint:
// walls follow the true polygon edges; everything is placed in a face's own frame (s along it, `out` away from it).
import type { XY } from '../../geo/grid';
import type { Area, Building, Entrance, Landmark } from '../../geo/types';
import { Buckets, ccw, rgb, type P3, type RGB } from '../mesh';
import { hipRoof } from '../roofs';
import { pointInPoly } from '../terrain';
import type { BuiltInfo } from '../buildings';

export interface LandmarkCtx {
  entrances: Entrance[]; landmarks: Landmark[]; areas: Area[];
  /** Draw the building's own forecourt or podium too (the ?model= viewer; the map does this once the terrain supports it). */
  forecourt: boolean;
}
export type LandmarkBuilder = (B: Buckets, b: Building, ctx: LandmarkCtx) => BuiltInfo;

export const FH = 3.6;                     // floor height of the hero buildings (m)
export const WHITE = rgb('#FBFAF6'), FASCIA = rgb('#FFFFFF'), PLINTH = rgb('#C4C2BA'), DARK = rgb('#4A4E50'), RECESS = rgb('#77726A');
export const ONE: RGB = [1, 1, 1];

/** One wall of a footprint: a → b with the outside on the right of travel. u runs along it, n points out. */
export interface Face { a: XY; b: XY; u: XY; n: XY; len: number }
export function facesOf(polyIn: XY[]): Face[] {
  const p = ccw(polyIn);
  return p.map((a, i) => { const b = p[(i + 1) % p.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, u: XY = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]; return { a, b, u, n: [u[1], -u[0]] as XY, len }; });
}
/** The face that looks most squarely at a point, favouring long faces. */
export function faceToward(fs: Face[], pt: XY): Face {
  let best = fs[0], score = -Infinity;
  for (const f of fs) {
    const mx = (f.a[0] + f.b[0]) / 2, my = (f.a[1] + f.b[1]) / 2, dx = pt[0] - mx, dy = pt[1] - my, d = Math.hypot(dx, dy) || 1;
    const sc = ((f.n[0] * dx + f.n[1] * dy) / d) * Math.sqrt(f.len);
    if (sc > score) { score = sc; best = f; }
  }
  return best;
}
/** Point on a face: s metres along it, `out` metres proud of it (negative = inside the building). */
export const fp = (f: Face, s: number, out = 0): XY => [f.a[0] + f.u[0] * s + f.n[0] * out, f.a[1] + f.u[1] * s + f.n[1] * out];
/** How far the footprint runs back from a face at s (metres). */
export function depthAt(polyIn: XY[], f: Face, s: number): number {
  const p = ccw(polyIn), o = fp(f, s, -0.05), dx = -f.n[0], dy = -f.n[1]; let best = Infinity;
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], ex = b[0] - a[0], ey = b[1] - a[1], den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue;
    const t = ((a[0] - o[0]) * ey - (a[1] - o[1]) * ex) / den, k = ((a[0] - o[0]) * dy - (a[1] - o[1]) * dx) / den;
    if (t > 0.01 && k >= -1e-6 && k <= 1 + 1e-6) best = Math.min(best, t);
  }
  return Number.isFinite(best) ? best + 0.05 : 0;
}
/** The part of a footprint deeper than `t` metres behind a face. */
export function behind(polyIn: XY[], f: Face, t: number): XY[] {
  const p = ccw(polyIn), dep = (q: XY) => -((q[0] - f.a[0]) * f.n[0] + (q[1] - f.a[1]) * f.n[1]), out: XY[] = [];
  for (let i = 0; i < p.length; i++) {
    const a = p[i], b = p[(i + 1) % p.length], da = dep(a) - t, db = dep(b) - t;
    if (da >= 0) out.push(a);
    if ((da >= 0) !== (db >= 0)) { const k = da / (da - db); out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); }
  }
  return out;
}

/** The longest stretch [s0, s1] of a face that is not hidden behind other parts of the building. */
export function visibleSpan(f: Face, others: XY[][]): [number, number] {
  let best: [number, number] = [0, 0], start = -1;
  for (let s = 0; s <= f.len + 0.5; s += 0.5) {
    const q = fp(f, Math.min(s, f.len), 0.9), open = s <= f.len && !others.some(o => pointInPoly(q[0], q[1], o));
    if (open && start < 0) start = s;
    if (!open && start >= 0) { if (s - 0.5 - start > best[1] - best[0]) best = [start, s - 0.5]; start = -1; }
  }
  return best[1] > best[0] ? best : [0, f.len];
}

// ---------- walls ----------
/** Plaster wall with one row of big windows per floor (floor band at each floor line). */
export function windowWall(B: Buckets, f: Face, s0: number, s1: number, h0: number, floors: number, col: RGB, bay = 4.2, out = 0) {
  const bays = Math.round((s1 - s0) / bay);
  if (bays < 1) { B.wall('heroBlank', fp(f, s0, out), fp(f, s1, out), h0, h0 + floors * FH, col, 0, 1, 0, floors); return; }
  B.wall('heroWall', fp(f, s0, out), fp(f, s1, out), h0, h0 + floors * FH, col, 0, bays, 0, floors);
}
/** Plaster wall with floor bands and no windows. */
export function blankWall(B: Buckets, f: Face, s0: number, s1: number, h0: number, h1: number, col: RGB, out = 0) {
  B.wall('heroBlank', fp(f, s0, out), fp(f, s1, out), h0, h1, col, 0, 1, 0, (h1 - h0) / FH);
}
/** A slab standing `out` proud of a face from s0 to s1: textured front (uv in metres / `tile`), plain returns and top. */
export function panel(B: Buckets, key: string, f: Face, s0: number, s1: number, out: number, h0: number, h1: number, col: RGB, tile = 0, side: RGB = col, back = 0) {
  const p0 = fp(f, s0, back), p1 = fp(f, s1, back), q0 = fp(f, s0, out), q1 = fp(f, s1, out);
  if (tile) B.wall(key, q0, q1, h0, h1, col, 0, (s1 - s0) / tile, 0, (h1 - h0) / tile); else B.wall(key, q0, q1, h0, h1, col);
  B.wall('plain', p0, q0, h0, h1, side); B.wall('plain', q1, p1, h0, h1, side);
  B.cap('plain', [p0, p1, q1, q0], h1, side);
}
export const stonePanel = (B: Buckets, f: Face, s0: number, s1: number, out: number, h0: number, h1: number) => panel(B, 'stone', f, s0, s1, out, h0, h1, ONE, 3.4, rgb('#B08A5E'));
export const glassPanel = (B: Buckets, f: Face, s0: number, s1: number, out: number, h0: number, h1: number, tile = 1.7) => panel(B, 'glass', f, s0, s1, out, h0, h1, ONE, tile, rgb('#2A7F86'));
/** One open corridor floor: a dark recess, a dark slab edge, a glass rail and white piers. */
export function corridorFloor(B: Buckets, f: Face, s0: number, s1: number, h: number, piers = 4.4, rail: RGB = rgb('#7C8A84')) {
  B.wall('plain', fp(f, s0, 0.02), fp(f, s1, 0.02), h, h + FH, RECESS);
  panel(B, 'plain', f, s0, s1, 0.7, h - 0.25, h + 0.3, DARK);                       // slab edge
  panel(B, 'glass', f, s0 + 0.2, s1 - 0.2, 0.62, h + 0.3, h + 1.25, ONE, 1.6, rail, 0.56); // glass rail
  panel(B, 'plain', f, s0, s1, 0.66, h + 1.25, h + 1.33, rail, 0, rail, 0.5);       // handrail
  panel(B, 'plain', f, s0, s1, 0.5, h + FH - 0.75, h + FH - 0.25, WHITE);           // beam under the next slab
  const n = Math.max(1, Math.round((s1 - s0) / piers));
  for (let i = 0; i <= n; i++) { const s = s0 + ((s1 - s0) * i) / n; panel(B, 'plain', f, Math.max(s0, s - 0.3), Math.min(s1, s + 0.3), 0.55, h + 0.3, h + FH - 0.25, WHITE); }
}
/** Round emblem on a wall: a green ring with a pale centre. */
export function emblem(B: Buckets, f: Face, s: number, out: number, h: number, r: number) {
  const disc = (rad: number, o: number, col: RGB) => {
    const c = fp(f, s, o), N = 24;
    for (let k = 0; k < N; k++) {
      const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2;
      const p = (a: number): P3 => [c[0] + f.u[0] * Math.cos(a) * rad, c[1] + f.u[1] * Math.cos(a) * rad, h + Math.sin(a) * rad];
      B.tri('plain', [c[0], c[1], h], p(a1), p(a0), col); B.tri('plain', [c[0], c[1], h], p(a0), p(a1), col);
    }
  };
  disc(r, out, rgb('#2E7D46')); disc(r * 0.78, out + 0.05, rgb('#E4EDD9')); disc(r * 0.5, out + 0.1, rgb('#3B8E52')); disc(r * 0.2, out + 0.15, rgb('#E4EDD9'));
}

// ---------- roofs ----------
export const PITCH22 = Math.tan((22 * Math.PI) / 180);
/** Hipped roof over a rectangle given in a face's frame: s0..s1 along the face, t0..t1 back from it. Returns the ridge height. */
export function hipOver(B: Buckets, f: Face, s0: number, s1: number, t0: number, t1: number, top: number, roofHex: string, eave = 0.8, maxRise = 9) {
  const c = fp(f, (s0 + s1) / 2, -(t0 + t1) / 2), w = s1 - s0, d = t1 - t0, angle = (Math.atan2(f.u[1], f.u[0]) * 180) / Math.PI;
  return hipRoof(B, { cx: c[0], cy: c[1], w, d, angle }, top, roofHex, Math.min(maxRise, (Math.min(w, d) / 2 + eave) * PITCH22), eave);
}
/** Hipped roof over a part's own rectangle at a 22° pitch. */
export function hipPart(B: Buckets, p: { cx: number; cy: number; w: number; d: number; angle: number }, top: number, roofHex: string, eave = 0.8, maxRise = 9) {
  return hipRoof(B, p, top, roofHex, Math.min(maxRise, (Math.min(p.w, p.d) / 2 + eave) * PITCH22), eave);
}
export const ngon = (c: XY, r: number, n: number, turn = 0): XY[] => Array.from({ length: n }, (_, i) => [c[0] + Math.cos(turn + (i / n) * Math.PI * 2) * r, c[1] + Math.sin(turn + (i / n) * Math.PI * 2) * r] as XY);
/** Flat ring between two radii (paths and kerbs round a circular lawn). */
export function ring(B: Buckets, key: string, c: XY, r0: number, r1: number, h: number, col: RGB, n = 40) {
  const a = ngon(c, r0, n), b = ngon(c, r1, n);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; B.quad(key, [...a[i], h], [...b[i], h], [...b[j], h], [...a[j], h], col, [a[i][0] / 5, a[i][1] / 5], [b[i][0] / 5, b[i][1] / 5], [b[j][0] / 5, b[j][1] / 5], [a[j][0] / 5, a[j][1] / 5]); }
}
export const centroidOf = (pts: XY[]): XY => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
