// Building blocks for the hand-modelled landmarks (Phase 3R). A landmark is built on its data footprint:
// walls follow the true polygon edges; everything is placed in a face's own frame (s along it, `out` away from it).
import type { XY } from '../../geo/grid';
import type { Area, Building, Entrance, Landmark } from '../../geo/types';
import { Buckets, ccw, rgb, type P3, type RGB } from '../mesh';
import { hipRoof, sampledRoof, type RoofOpts } from '../roofs';
import { pointInPoly } from '../terrain';
import type { BuiltInfo } from '../buildings';
import { ATLASES, facadeKey, uvOf, type Atlas, type Region } from '../facadeAtlas';

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
/** A single wall a → b, outside on the right of travel (the same convention as Buckets.wall). */
export function faceOf(a: XY, b: XY): Face {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1e-6, u: XY = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  return { a, b, u, n: [u[1], -u[0]], len };
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
// ---------- facades cut from the approved renders (Phase 3M, src/render3d/facadeAtlas.ts) ----------
// An atlas sub-rectangle can't repeat by texture wrapping, so the geometry repeats instead: one quad per bay per row.
// Every helper returns false when the atlas or the piece is missing, so the caller can draw its procedural wall.
export const atlasOf = (id: string): Atlas | null => ATLASES[id] ?? null;
type UVR = [number, number, number, number];
/** Glass pieces get the atlas with a slight sheen (materials.ts). */
const keyOf = (A: Atlas, r: Region) => (r.type === 'glass' ? `${facadeKey(A.id)}#glass` : facadeKey(A.id));
function tq(B: Buckets, key: string, f: Face, s0: number, s1: number, h0: number, h1: number, out: number, uv: UVR) {
  const a = fp(f, s0, out), b = fp(f, s1, out);
  B.quad(key, [a[0], a[1], h0], [b[0], b[1], h0], [b[0], b[1], h1], [a[0], a[1], h1], ONE, [uv[0], uv[1]], [uv[2], uv[1]], [uv[2], uv[3]], [uv[0], uv[3]]);
}
/** Wall from a face's strips: `base` at the bottom, `top` under the eave, `typ` rows between; whole window bays fitted
 *  to the length. `opts.base / opts.top = false` leave those strips out (for a wall that starts above a plinth). */
export function stripWall(B: Buckets, A: Atlas | null, face: string, f: Face, s0: number, s1: number, h0: number, h1: number, out = 0, opts: { base?: boolean; top?: boolean } = {}): boolean {
  const R = A?.regions, typ = R?.[`${face}.typ`]; if (!A || !R || !typ) return false;
  const base = opts.base === false ? undefined : R[`${face}.base`], top = opts.top === false ? undefined : R[`${face}.top`], H = h1 - h0;
  if (H <= 0.05 || s1 - s0 <= 0.05) return true;
  let hb = base?.hm ?? 0, ht = top?.hm ?? 0;
  if (hb + ht > H * 0.85) { const k = (H * 0.85) / Math.max(1e-6, hb + ht); hb *= k; ht *= k; }
  const n = Math.max(1, Math.round((H - hb - ht) / typ.hm)), hy = (H - hb - ht) / n;
  const rows: [Region, number][] = [...(base && hb > 0 ? [[base, hb]] : []), ...Array.from({ length: n }, () => [typ, hy]), ...(top && ht > 0 ? [[top, ht]] : [])] as [Region, number][];
  const bays = Math.max(1, Math.round((s1 - s0) / typ.wm)), bw = (s1 - s0) / bays, key = facadeKey(A.id);
  let z = h0;
  for (const [r, h] of rows) { const uv = uvOf(A, r); for (let i = 0; i < bays; i++) tq(B, key, f, s0 + i * bw, s0 + (i + 1) * bw, z, z + h, out, uv); z += h; }
  return true;
}
/** A fixed piece (glass strip, emblem, door, atrium) stretched over s0..s1 × h0..h1, `out` proud with plain returns. */
export function piece(B: Buckets, A: Atlas | null, name: string, f: Face, s0: number, s1: number, h0: number, h1: number, out = 0.05, side: RGB = WHITE): boolean {
  const r = A?.regions[name]; if (!A || !r) return false;
  tq(B, keyOf(A, r), f, s0, s1, h0, h1, out, uvOf(A, r));
  if (out > 0.03) { const p0 = fp(f, s0, 0), p1 = fp(f, s1, 0), q0 = fp(f, s0, out), q1 = fp(f, s1, out); B.wall('plain', p0, q0, h0, h1, side); B.wall('plain', q1, p1, h0, h1, side); B.cap('plain', [p0, p1, q1, q0], h1, side); }
  return true;
}
/** A piece repeated at its real size across s0..s1 (and up h0..h1 unless `stretchY`), whole tiles fitted to the span. */
export function tiled(B: Buckets, A: Atlas | null, name: string, f: Face, s0: number, s1: number, h0: number, h1: number, out = 0, stretchY = false, side: RGB = WHITE): boolean {
  const r = A?.regions[name]; if (!A || !r) return false;
  const nx = Math.max(1, Math.round((s1 - s0) / r.wm)), ny = stretchY ? 1 : Math.max(1, Math.round((h1 - h0) / r.hm)), w = (s1 - s0) / nx, h = (h1 - h0) / ny, uv = uvOf(A, r), key = keyOf(A, r);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) tq(B, key, f, s0 + i * w, s0 + (i + 1) * w, h0 + j * h, h0 + (j + 1) * h, out, uv);
  if (out > 0.03) { const p0 = fp(f, s0, 0), p1 = fp(f, s1, 0), q0 = fp(f, s0, out), q1 = fp(f, s1, out); B.wall('plain', p0, q0, h0, h1, side); B.wall('plain', q1, p1, h0, h1, side); B.cap('plain', [p0, p1, q1, q0], h1, side); }
  return true;
}
/** Bevel every convex wall corner of a footprint: a narrow face across the corner (`r` metres back along each wall),
 *  so the edge catches the light as in the renders. */
export function bevelCorners(B: Buckets, polyIn: XY[], h0: number, h1: number, col: RGB, r = 0.13) {
  const p = ccw(polyIn), n = p.length;
  for (let i = 0; i < n; i++) {
    const a = p[(i + n - 1) % n], v = p[i], c = p[(i + 1) % n], e1 = [v[0] - a[0], v[1] - a[1]], e2 = [c[0] - v[0], c[1] - v[1]], l1 = Math.hypot(e1[0], e1[1]), l2 = Math.hypot(e2[0], e2[1]);
    if (l1 < r * 3 || l2 < r * 3 || e1[0] * e2[1] - e1[1] * e2[0] <= 0.01 * l1 * l2) continue; // reflex or straight
    const pa: XY = [v[0] - (e1[0] / l1) * r + (e1[1] / l1) * 0.02, v[1] - (e1[1] / l1) * r - (e1[0] / l1) * 0.02], pb: XY = [v[0] + (e2[0] / l2) * r + (e2[1] / l2) * 0.02, v[1] + (e2[1] / l2) * r - (e2[0] / l2) * 0.02];
    const o: XY = [v[0] + (e1[1] / l1 + e2[1] / l2) * 0.05, v[1] - (e1[0] / l1 + e2[0] / l2) * 0.05]; // a hair outside the corner
    B.wall('plain', pa, o, h0, h1, col); B.wall('plain', o, pb, h0, h1, col);
  }
}
/** Hipped landmark roof: 0.45 m fascia, ridge caps; colour from the render's roof when the atlas has one. */
export const ROOF_OPTS = { fascia: 0.45, ridge: true };
/** Roof colour sampled from the render (roofs.ts sampledRoof: the ribbed texture shows exactly that colour, shaded by the
 *  scene light); the data's roof colour when there is no atlas. */
export function roofOf(A: Atlas | null, fallback: string, sample = 'roof'): string {
  const hex = sample === 'roof' ? A?.roofHex : A?.colours[sample];
  return hex ? sampledRoof(hex) : fallback;
}

/** The IIM Shillong emblem as seen on Admin and NAB (reference/real/*.md): a green sunburst ring on white, a centre disc
 *  blue above and yellow below; with `letters`, a green "IIM SHILLONG" block under it. */
export function emblem(B: Buckets, f: Face, s: number, out: number, h: number, r: number, letters = false) {
  const disc = (rad: number, o: number, col: RGB, a0 = 0, a1 = Math.PI * 2, N = 28) => {
    const c = fp(f, s, o);
    for (let k = 0; k < N; k++) {
      const t0 = a0 + ((a1 - a0) * k) / N, t1 = a0 + ((a1 - a0) * (k + 1)) / N;
      const p = (a: number): P3 => [c[0] + f.u[0] * Math.cos(a) * rad, c[1] + f.u[1] * Math.cos(a) * rad, h + Math.sin(a) * rad];
      B.tri('plain', [c[0], c[1], h], p(t1), p(t0), col); B.tri('plain', [c[0], c[1], h], p(t0), p(t1), col);
    }
  };
  disc(r, out, rgb('#F4F6F1')); disc(r * 0.96, out + 0.03, rgb('#2F8A47')); disc(r * 0.5, out + 0.06, rgb('#F4F6F1'));
  disc(r * 0.4, out + 0.09, rgb('#3F8FCB'), 0, Math.PI); disc(r * 0.4, out + 0.09, rgb('#F2C22E'), Math.PI, Math.PI * 2);
  if (letters) { panel(B, 'plain', f, s - r * 0.55, s + r * 0.55, out + 0.05, h - r - 1.3, h - r - 0.45, rgb('#2F8A47')); panel(B, 'plain', f, s - r * 0.8, s + r * 0.8, out + 0.05, h - r - 1.85, h - r - 1.5, rgb('#2F8A47')); }
}

// ---------- real-campus pieces (Phase 3M v2, reference/real/<id>.md): colours sampled from the photos ----------
export const SANDSTONE = rgb('#B8936A'), WALL = rgb('#EDEAE3'), GLASS_TEAL = rgb('#24494A'), CANOPY_TEAL = rgb('#4AA0B6'), RAIL = rgb('#9BA3A4');
/** Multiplier on the glass texture: the real glass reads dark teal, not the texture's bright cyan. */
export const GLASS_TINT: RGB = [0.5, 0.62, 0.68];
export const REAL_ROOF = '#287565';
/** Plain wall in a flat colour (no texture), `out` metres proud of the face. */
export function flat(B: Buckets, f: Face, s0: number, s1: number, h0: number, h1: number, col: RGB = WALL, out = 0) { B.wall('plain', fp(f, s0, out), fp(f, s1, out), h0, h1, col); }
/** Sandstone cladding (the tan stone of Admin and NAB), as a slab `out` proud. */
export const sandstone = (B: Buckets, f: Face, s0: number, s1: number, h0: number, h1: number, out = 0.06) => panel(B, 'stone', f, s0, s1, out, h0, h1, ONE, 2.6, SANDSTONE);
/** Glass with a white mullion grid (cols × rows panes), `out` proud, in a white frame. */
export function glassGrid(B: Buckets, f: Face, s0: number, s1: number, h0: number, h1: number, out: number, cols: number, rows: number, frame = 0.18, mull: RGB = WALL) {
  panel(B, 'plain', f, s0 - frame, s1 + frame, out, h0 - frame, h1 + frame, mull);
  panel(B, 'glassReal', f, s0, s1, out + 0.03, h0, h1, GLASS_TINT, Math.max(1.2, (s1 - s0) / cols), GLASS_TEAL);
  for (let i = 1; i < cols; i++) { const s = s0 + ((s1 - s0) * i) / cols; panel(B, 'plain', f, s - 0.05, s + 0.05, out + 0.07, h0, h1, mull); }
  for (let j = 1; j < rows; j++) { const z = h0 + ((h1 - h0) * j) / rows; panel(B, 'plain', f, s0, s1, out + 0.07, z - 0.05, z + 0.05, mull); }
}
/** One row of punched windows per floor: `per` windows of ww × wh per floor, evenly spaced, white surrounds. */
export function punched(B: Buckets, f: Face, s0: number, s1: number, h0: number, floors: number, fh: number, per: number, ww: number, wh: number, sill = 0.9, from = 0) {
  for (let fl = from; fl < floors; fl++) for (let i = 0; i < per; i++) {
    const c = s0 + ((i + 0.5) * (s1 - s0)) / per, z = h0 + fl * fh + sill;
    panel(B, 'plain', f, c - ww / 2 - 0.14, c + ww / 2 + 0.14, 0.05, z - 0.14, z + wh + 0.14, rgb('#FFFFFF'));
    panel(B, 'glassReal', f, c - ww / 2, c + ww / 2, 0.08, z, z + wh, GLASS_TINT, ww, GLASS_TEAL);
  }
}
/** Admin's linking-wing front: open corridor galleries behind white slab edges, sandstone piers between the bays and a
 *  teal sloped canopy over each upper corridor (reference/real/admin.md, "Linking wings"). */
export function gallery(B: Buckets, f: Face, s0: number, s1: number, h0: number, floors: number, fh: number, bay = 4.3) {
  const n = Math.max(1, Math.round((s1 - s0) / bay)), w = (s1 - s0) / n, top = h0 + floors * fh;
  B.wall('plain', fp(f, s0, -1.6), fp(f, s1, -1.6), h0, top, rgb('#D8D3CA'));                      // the room fronts, set back
  for (let fl = 0; fl < floors; fl++) {
    const z = h0 + fl * fh;
    for (let i = 0; i < n; i++) { const c = s0 + (i + 0.5) * w; panel(B, 'glassReal', f, c - w * 0.28, c + w * 0.28, -1.55, z + 0.9, z + fh - 0.6, GLASS_TINT, 1.2, GLASS_TEAL, -1.6); }
    if (fl > 0) {                                                                                   // floor slab edge and rail
      panel(B, 'plain', f, s0, s1, 0.15, z - 0.3, z + 0.15, WALL, 0, WALL, -1.6);
      panel(B, 'plain', f, s0, s1, 0.1, z + 1.0, z + 1.08, RAIL, 0, RAIL, 0);
      for (let i = 0; i <= n * 3; i++) { const s = s0 + (i * (s1 - s0)) / (n * 3); panel(B, 'plain', f, s - 0.03, s + 0.03, 0.1, z + 0.15, z + 1.0, RAIL); }
    }
    if (fl < floors - 1) {                                                                          // teal sloped canopy under the next slab
      const a = fp(f, s0, 0.1), b = fp(f, s1, 0.1), c = fp(f, s1, 1.35), d = fp(f, s0, 1.35), zt = z + fh - 0.35, zb = zt - 0.55;
      B.quad('plain', [a[0], a[1], zt], [b[0], b[1], zt], [c[0], c[1], zb], [d[0], d[1], zb], CANOPY_TEAL); B.quad('plain', [d[0], d[1], zb], [c[0], c[1], zb], [b[0], b[1], zt], [a[0], a[1], zt], CANOPY_TEAL);
    }
  }
  for (let i = 0; i <= n; i++) { const s = s0 + i * w; sandstone(B, f, Math.max(s0, s - 0.45), Math.min(s1, s + 0.45), h0, top, 0.2); }
  panel(B, 'plain', f, s0, s1, 0.25, top - 0.35, top + 0.1, WALL);                                   // eave beam
}

// ---------- roofs ----------
export const PITCH22 = Math.tan((22 * Math.PI) / 180);
/** Hipped roof over a rectangle given in a face's frame: s0..s1 along the face, t0..t1 back from it. Returns the ridge height. */
export function hipOver(B: Buckets, f: Face, s0: number, s1: number, t0: number, t1: number, top: number, roofHex: string, eave = 0.8, maxRise = 9, opts: RoofOpts = ROOF_OPTS) {
  const c = fp(f, (s0 + s1) / 2, -(t0 + t1) / 2), w = s1 - s0, d = t1 - t0, angle = (Math.atan2(f.u[1], f.u[0]) * 180) / Math.PI;
  return hipRoof(B, { cx: c[0], cy: c[1], w, d, angle }, top, roofHex, Math.min(maxRise, (Math.min(w, d) / 2 + eave) * PITCH22), eave, opts);
}
/** Hipped roof over a part's own rectangle at a 22° pitch. */
export function hipPart(B: Buckets, p: { cx: number; cy: number; w: number; d: number; angle: number }, top: number, roofHex: string, eave = 0.8, maxRise = 9, opts: RoofOpts = ROOF_OPTS) {
  return hipRoof(B, p, top, roofHex, Math.min(maxRise, (Math.min(p.w, p.d) / 2 + eave) * PITCH22), eave, opts);
}
export const ngon = (c: XY, r: number, n: number, turn = 0): XY[] => Array.from({ length: n }, (_, i) => [c[0] + Math.cos(turn + (i / n) * Math.PI * 2) * r, c[1] + Math.sin(turn + (i / n) * Math.PI * 2) * r] as XY);
/** Flat ring between two radii (paths and kerbs round a circular lawn). */
export function ring(B: Buckets, key: string, c: XY, r0: number, r1: number, h: number, col: RGB, n = 40) {
  const a = ngon(c, r0, n), b = ngon(c, r1, n);
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; B.quad(key, [...a[i], h], [...b[i], h], [...b[j], h], [...a[j], h], col, [a[i][0] / 5, a[i][1] / 5], [b[i][0] / 5, b[i][1] / 5], [b[j][0] / 5, b[j][1] / 5], [a[j][0] / 5, a[j][1] / 5]); }
}
export const centroidOf = (pts: XY[]): XY => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
