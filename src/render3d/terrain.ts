// Terrain height model for the 3D map. Pure maths (no Three.js) so it can be unit-tested.
// Source: public/data/terrain.json (SRTM, 20 m grid, metres above the lake). It is smoothed, then
// flattened under buildings, courts, plazas and road beds so nothing floats or sinks.
import type { XY } from '../geo/grid';
import type { Area, Bounds, Building, PathLine } from '../geo/types';
import { fbm } from '../render/noise';

export interface TerrainData { step: number; minX: number; minY: number; cols: number; rows: number; heights: number[][] }
export interface TerrainInput { buildings: Building[]; areas: Area[]; paths: PathLine[]; bounds: Bounds }

const FINE = 2;          // fine grid step (m) over the campus
const MARGIN = 140;      // fine grid reaches this far beyond the campus bounds
const PAD = 3, PAD_BLEND = 7;      // building pad: flat to PAD m outside the footprint, blended over PAD_BLEND m
const AREA_BLEND = 6;
// road beds are levelled across the full road plus its pavements (widths from hardscape.json via PathLine.width)
const bedHalf = (p: PathLine) => (p.kind === 'road' || p.kind === 'service' ? (p.width ?? (p.kind === 'road' ? 10 : 6.5)) / 2 + Math.max(p.pavementL ?? 0, p.pavementR ?? 0) : 0);
const ROAD_BLEND = 4;

const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function pointInPoly(x: number, y: number, poly: XY[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function distToSeg(x: number, y: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)) : 0;
  return [Math.hypot(x - ax - dx * t, y - ay - dy * t), t];
}
/** Distance to the polygon outline; negative inside. */
export function signedDist(x: number, y: number, poly: XY[]): number {
  let d = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) d = Math.min(d, distToSeg(x, y, poly[j][0], poly[j][1], poly[i][0], poly[i][1])[0]);
  return pointInPoly(x, y, poly) ? -d : d;
}
export function partFootprint(p: { cx: number; cy: number; w: number; d: number; angle: number; poly?: XY[] }): XY[] {
  if (p.poly && p.poly.length >= 3) return p.poly;
  const a = (p.angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return ([[-p.w / 2, -p.d / 2], [p.w / 2, -p.d / 2], [p.w / 2, p.d / 2], [-p.w / 2, p.d / 2]] as XY[]).map(([x, y]) => [p.cx + x * c - y * s, p.cy + x * s + y * c]);
}
const centroid = (poly: XY[]): XY => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];

export class Terrain {
  readonly half: number;
  private base: Float32Array; private cols: number; private rows: number; private step: number; private minX: number; private minY: number;
  /** Fine grid over the campus (flattened heights). */
  readonly fine: { x0: number; y0: number; nx: number; ny: number; step: number; h: Float32Array };
  /** Height each flattened area was set to (by area id). */
  readonly areaLevel = new Map<string, number>();

  constructor(data: TerrainData, input: TerrainInput) {
    this.cols = data.cols; this.rows = data.rows; this.step = data.step; this.minX = data.minX; this.minY = data.minY;
    this.half = -data.minX;
    this.base = this.smoothed(data);

    const b = input.bounds, lim = Math.floor((this.half - 2 * this.step) / 40) * 40; // multiples of 40 m: the outer mesh grid
    const x0 = Math.max(-lim, Math.floor((b.minX - MARGIN) / 40) * 40), y0 = Math.max(-lim, Math.floor((b.minY - MARGIN) / 40) * 40);
    const x1 = Math.min(lim, Math.ceil((b.maxX + MARGIN) / 40) * 40), y1 = Math.min(lim, Math.ceil((b.maxY + MARGIN) / 40) * 40);
    const nx = Math.round((x1 - x0) / FINE) + 1, ny = Math.round((y1 - y0) / FINE) + 1;
    const h = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) h[j * nx + i] = this.baseAt(x0 + i * FINE, y0 + j * FINE);
    this.fine = { x0, y0, nx, ny, step: FINE, h };
    this.flatten(input);
  }

  // ---------- base DEM ----------
  private smoothed(d: TerrainData): Float32Array {
    const { cols, rows } = d; const src = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) src[j * cols + i] = d.heights[j][i];
    // separable Gaussian, sigma about 1.2 cells (5-tap), two passes: about a 2-cell blur
    const k = [0.1, 0.24, 0.32, 0.24, 0.1]; let a = src, tmp = new Float32Array(cols * rows);
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { let s = 0; for (let t = -2; t <= 2; t++) s += k[t + 2] * a[j * cols + Math.max(0, Math.min(cols - 1, i + t))]; tmp[j * cols + i] = s; }
      const out = new Float32Array(cols * rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { let s = 0; for (let t = -2; t <= 2; t++) s += k[t + 2] * tmp[Math.max(0, Math.min(rows - 1, j + t)) * cols + i]; out[j * cols + i] = s; }
      a = out;
    }
    return a;
  }
  private node(i: number, j: number) { return this.base[Math.max(0, Math.min(this.rows - 1, j)) * this.cols + Math.max(0, Math.min(this.cols - 1, i))]; }
  /** Smoothed natural ground (no pads). Beyond the DEM it carries on as gentle noise hills. */
  baseAt(x: number, y: number): number {
    const H = this.half, cx = Math.max(-H, Math.min(H, x)), cy = Math.max(-H, Math.min(H, y));
    const u = (cx - this.minX) / this.step, v = (cy - this.minY) / this.step;
    const i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    // Catmull-Rom bicubic: smooth slopes instead of 20 m facets
    const cr = (p0: number, p1: number, p2: number, p3: number, t: number) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
    const row = (jj: number) => cr(this.node(i - 1, jj), this.node(i, jj), this.node(i + 1, jj), this.node(i + 2, jj), fu);
    let h = cr(row(j - 1), row(j), row(j + 1), row(j + 2), fv);
    const out = Math.max(Math.abs(x) - H, Math.abs(y) - H);
    if (out > 0) h += smooth(0, 700, out) * ((fbm(x / 520, y / 520, 3, 41) - 0.35) * 150);
    return h;
  }

  // ---------- flattening ----------
  private flatten(input: TerrainInput) {
    const f = this.fine, n = f.nx * f.ny;
    const T = new Float32Array(n), W = new Float32Array(n), WB = new Float32Array(n); // target, weight, building weight
    const stamp = (poly: XY[], reach: number, fn: (sd: number, x: number, y: number) => [number, number] | null, building = false) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [x, y] of poly) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
      const i0 = Math.max(0, Math.floor((minX - reach - f.x0) / FINE)), i1 = Math.min(f.nx - 1, Math.ceil((maxX + reach - f.x0) / FINE));
      const j0 = Math.max(0, Math.floor((minY - reach - f.y0) / FINE)), j1 = Math.min(f.ny - 1, Math.ceil((maxY + reach - f.y0) / FINE));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const x = f.x0 + i * FINE, y = f.y0 + j * FINE; const r = fn(signedDist(x, y, poly), x, y); if (!r) continue;
        const [t, w] = r, q = j * f.nx + i;
        if (w >= W[q] && w > 0) { W[q] = w; T[q] = t; }
        if (building && w > WB[q]) WB[q] = w;
      }
    };
    const flat = (poly: XY[], level: number, pad: number, blend: number, building = false) =>
      // weight 2 inside the outline itself, so a neighbour's pad never lifts or drops a footprint
      stamp(poly, pad + blend, sd => (sd > pad + blend ? null : [level, sd <= 0 ? 2 : 1 - smooth(pad, pad + blend, sd)]), building);

    // 1. areas: water first, then hard surfaces
    const levelOf = (poly: XY[]) => { const pts = [...poly, centroid(poly)]; return pts.reduce((s, p) => s + this.baseAt(p[0], p[1]), 0) / pts.length; };
    const parts = input.buildings.flatMap(b => b.parts.map(p => ({ poly: partFootprint(p), level: b.groundElev ?? this.baseAt(p.cx, p.cy), named: !b.unnamed })));
    const done: { poly: XY[]; level: number }[] = [];
    for (const kind of ['plaza', 'parking', 'ground', 'court'] as const) for (const a of input.areas.filter(a => a.kind === kind)) {
      if (a.pts.length < 3) continue; const c = centroid(a.pts);
      let level = levelOf(a.pts);
      const host = done.find(d => pointInPoly(c[0], c[1], d.poly));
      if (host) level = host.level;
      else if (kind === 'plaza') {
        // a plaza beside a building is that building's terrace
        let best = 12, lv: number | null = null;
        for (const p of parts) { if (!p.named) continue; for (const q of [...a.pts, c]) { const d = signedDist(q[0], q[1], p.poly); if (d < best) { best = d; lv = p.level; } } }
        if (lv !== null) level = lv;
      }
      done.push({ poly: a.pts, level }); this.areaLevel.set(a.id, level);
      flat(a.pts, level, 1, AREA_BLEND);
    }
    for (const a of input.areas.filter(a => a.kind === 'water')) {
      if (a.pts.length < 3) continue; this.areaLevel.set(a.id, 0);
      // bed dips below the water surface (y = 0); the shore just outside sits a little above it
      stamp(a.pts, 12, sd => (sd > 12 ? null : [sd < 0 ? Math.max(-1.6, sd * 0.5) : 0.25, sd < 0 ? 1 : 1 - smooth(0, 12, sd)]));
    }
    // 2. building pads win over everything
    for (const p of parts) flat(p.poly, p.level, PAD, PAD_BLEND, true);
    const h1 = new Float32Array(n);
    for (let q = 0; q < n; q++) { h1[q] = f.h[q] + (T[q] - f.h[q]) * Math.min(1, W[q]); WB[q] = Math.min(1, WB[q]); }
    f.h.set(h1);

    // 3. road beds: level across the width, at the (smoothed) centre-line height
    const T2 = new Float32Array(n), W2 = new Float32Array(n);
    for (const p of input.paths) {
      const half = bedHalf(p); if (!half || p.pts.length < 2) continue;
      // resample at about 3 m, then smooth heights along the road
      const pts: XY[] = [];
      for (let s = 0; s + 1 < p.pts.length; s++) {
        const [ax, ay] = p.pts[s], [bx, by] = p.pts[s + 1], m = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 3));
        for (let t = 0; t < m; t++) pts.push([ax + ((bx - ax) * t) / m, ay + ((by - ay) * t) / m]);
      }
      pts.push(p.pts[p.pts.length - 1]);
      const raw = pts.map(q => this.fineAt(q[0], q[1]) ?? this.baseAt(q[0], q[1]));
      const hs = raw.map((_, i) => { let s = 0, c = 0; for (let t = -4; t <= 4; t++) { const v = raw[i + t]; if (v !== undefined) { s += v; c++; } } return s / c; });
      const reach = half + 1 + ROAD_BLEND;
      for (let s = 0; s + 1 < pts.length; s++) {
        const [ax, ay] = pts[s], [bx, by] = pts[s + 1];
        const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach - f.x0) / FINE)), i1 = Math.min(f.nx - 1, Math.ceil((Math.max(ax, bx) + reach - f.x0) / FINE));
        const j0 = Math.max(0, Math.floor((Math.min(ay, by) - reach - f.y0) / FINE)), j1 = Math.min(f.ny - 1, Math.ceil((Math.max(ay, by) + reach - f.y0) / FINE));
        for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
          const [d, t] = distToSeg(f.x0 + i * FINE, f.y0 + j * FINE, ax, ay, bx, by); if (d > reach) continue;
          const w = 1 - smooth(half + 1, reach, d), q = j * f.nx + i;
          if (w > W2[q]) { W2[q] = w; T2[q] = hs[s] + (hs[s + 1] - hs[s]) * t; }
        }
      }
    }
    for (let q = 0; q < n; q++) { const w = W2[q] * (1 - WB[q]); if (w > 0) f.h[q] += (T2[q] - f.h[q]) * w; }
  }

  private fineAt(x: number, y: number): number | null {
    const f = this.fine, u = (x - f.x0) / f.step, v = (y - f.y0) / f.step;
    if (u < 0 || v < 0 || u > f.nx - 1 || v > f.ny - 1) return null;
    const i = Math.min(f.nx - 2, Math.floor(u)), j = Math.min(f.ny - 2, Math.floor(v)), fu = u - i, fv = v - j, q = j * f.nx + i;
    return (f.h[q] * (1 - fu) + f.h[q + 1] * fu) * (1 - fv) + (f.h[q + f.nx] * (1 - fu) + f.h[q + f.nx + 1] * fu) * fv;
  }

  /** Ground height (m above the lake) at a local-grid point, pads and road beds included. */
  heightAt(x: number, y: number): number {
    const fh = this.fineAt(x, y); if (fh === null) return this.baseAt(x, y);
    const f = this.fine;
    const edge = Math.min(x - f.x0, f.x0 + (f.nx - 1) * f.step - x, y - f.y0, f.y0 + (f.ny - 1) * f.step - y);
    if (edge >= 40) return fh;
    const b = this.baseAt(x, y); return b + (fh - b) * smooth(0, 40, edge);
  }
}
