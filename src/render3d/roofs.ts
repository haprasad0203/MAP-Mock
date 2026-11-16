// Roof builders. Hip, gable and shed roofs are fitted to the part's rectangle (cx, cy, w, d, angle);
// flat and octagon roofs follow the true footprint polygon.
import * as THREE from 'three';
import type { XY } from '../geo/grid';
import { hash2 } from '../render/noise';
import { signedDist } from './terrain';
import { Buckets, centroid, ccw, mul, offset, rect, rgb, scaled, type P3, type RGB, WHITE } from './mesh';

export const EAVE = 0.5;        // overhang (m)
const SLAB = 0.3;               // white fascia / eave slab thickness
const PITCH_TAN = 0.42;         // about 23°
const MAX_RISE = 5.5;
const TILE = 6;                 // metres per roof-texture repeat
const FASCIA = rgb('#F7F5EE');
const CONCRETE = '#C9C6BC';

const GREEN_BASE = new THREE.Color('#3E8A4E'), SLATE_BASE = new THREE.Color('#4B525A');
const SLATE_TINT: RGB = [1.75, 1.72, 1.7]; // roofSlate's material colour (materials.ts)

/** Roof colours sampled from a render (Phase 3M): drawn on the neutral ribbed texture with a vertex colour chosen so that
 *  texture × material tint × colour = the sampled colour. Registered by colour, so every roof builder picks it up. */
const SAMPLED = new Map<string, { key: string; col: RGB }>();
export function sampledRoof(hex: string, albedo = 0.85): string {
  if (!SAMPLED.has(hex)) { const c = new THREE.Color(hex); SAMPLED.set(hex, { key: 'roofSlate', col: [(c.r * albedo) / (SLATE_BASE.r * SLATE_TINT[0]), (c.g * albedo) / (SLATE_BASE.g * SLATE_TINT[1]), (c.b * albedo) / (SLATE_BASE.b * SLATE_TINT[2])] }); }
  return hex;
}
/** Material key and tint for a sloped roof of the given colour. */
export function roofMat(hex: string): { key: string; col: RGB } {
  const s = SAMPLED.get(hex); if (s) return s;
  const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  const green = hsl.s > 0.18 && hsl.h > 0.2 && hsl.h < 0.52;
  const base = green ? GREEN_BASE : SLATE_BASE, r = (a: number, b: number) => Math.max(0.4, Math.min(3, a / Math.max(0.004, b)));
  return { key: green ? 'roofGreen' : 'roofSlate', col: [r(c.r, base.r), r(c.g, base.g), r(c.b, base.b)] };
}
const isGreen = (hex: string) => roofMat(hex).key === 'roofGreen';

interface Frame { c: XY; lx: XY; sx: XY; a: number; b: number } // long axis, short axis, half lengths
export function frameOf(p: { cx: number; cy: number; w: number; d: number; angle: number }): Frame {
  const t = (p.angle * Math.PI) / 180, ux: XY = [Math.cos(t), Math.sin(t)], uy: XY = [-Math.sin(t), Math.cos(t)];
  return p.w >= p.d ? { c: [p.cx, p.cy], lx: ux, sx: uy, a: p.w / 2, b: p.d / 2 } : { c: [p.cx, p.cy], lx: uy, sx: [-ux[0], -ux[1]], a: p.d / 2, b: p.w / 2 };
}
const at = (f: Frame, l: number, s: number, h: number): P3 => [f.c[0] + f.lx[0] * l + f.sx[0] * s, f.c[1] + f.lx[1] * l + f.sx[1] * s, h];

/** Sloped face o0 → o1 (eave) up to i1, i0 with ribs running up the slope. */
function slope(B: Buckets, key: string, o0: P3, o1: P3, i1: P3, i0: P3, col: RGB) {
  const ex = o1[0] - o0[0], ey = o1[1] - o0[1], el = Math.hypot(ex, ey) || 1;
  const uv = (p: P3): [number, number] => {
    const dx = p[0] - o0[0], dy = p[1] - o0[1], along = (dx * ex + dy * ey) / el;
    const across = Math.hypot(dx - (ex / el) * along, dy - (ey / el) * along, p[2] - o0[2]);
    return [along / TILE, across / TILE];
  };
  B.quad(key, o0, o1, i1, i0, col, uv(o0), uv(o1), uv(i1), uv(i0));
}

/** Options for the landmark roofs: a deeper white fascia band, and raised caps along the hips and the ridge. */
export interface RoofOpts { fascia?: number; ridge?: boolean }

export function hipRoof(B: Buckets, part: { cx: number; cy: number; w: number; d: number; angle: number }, top: number, roofHex: string, maxRise = MAX_RISE, eave = EAVE, opts: RoofOpts = {}) {
  const f = frameOf(part), a = f.a + eave, b = f.b + eave, m = roofMat(roofHex), slab = opts.fascia ?? SLAB;
  B.prism('plain', [at(f, -a, -b, 0), at(f, a, -b, 0), at(f, a, b, 0), at(f, -a, b, 0)].map(p => [p[0], p[1]] as XY), top, top + slab, FASCIA, false);
  const inset = Math.min(b, maxRise / PITCH_TAN), h0 = top + slab, h1 = h0 + inset * PITCH_TAN, ia = a - inset, ib = b - inset;
  const o = [at(f, -a, -b, h0), at(f, a, -b, h0), at(f, a, b, h0), at(f, -a, b, h0)], i = [at(f, -ia, -ib, h1), at(f, ia, -ib, h1), at(f, ia, ib, h1), at(f, -ia, ib, h1)];
  for (let k = 0; k < 4; k++) slope(B, m.key, o[k], o[(k + 1) % 4], i[(k + 1) % 4], i[k], m.col);
  if (ib > 0.05) B.cap(m.key, i.map(p => [p[0], p[1]] as XY), h1, m.col, TILE);
  if (opts.ridge) {
    const cap = mul(rgb(roofHex), SAMPLED.has(roofHex) ? 0.95 : 1.18);
    for (let k = 0; k < 4; k++) ridgeCap(B, o[k], i[k], cap);                                  // the four hips
    if (ib > 0.05) for (let k = 0; k < 4; k++) ridgeCap(B, i[k], i[(k + 1) % 4], cap);           // rise capped: edges of the flat top
    else ridgeCap(B, i[0], i[1], cap);                                                          // the ridge
  }
  return h1;
}

/** A small tent-shaped cap along a hip or ridge line (0.32 m wide, 0.12 m proud), so the line catches the light. */
export function ridgeCap(B: Buckets, p: P3, q: P3, col: RGB) {
  const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); if (l < 0.2) return;
  const nx = (-dy / l) * 0.16, ny = (dx / l) * 0.16, up = 0.12;
  const pl: P3 = [p[0] + nx, p[1] + ny, p[2] - 0.04], pr: P3 = [p[0] - nx, p[1] - ny, p[2] - 0.04], ql: P3 = [q[0] + nx, q[1] + ny, q[2] - 0.04], qr: P3 = [q[0] - nx, q[1] - ny, q[2] - 0.04];
  const pt: P3 = [p[0], p[1], p[2] + up], qt: P3 = [q[0], q[1], q[2] + up];
  for (const [a, b, c, d] of [[pr, qr, qt, pt], [ql, pl, pt, qt]] as P3[][]) { B.quad('plain', a, b, c, d, col); B.quad('plain', d, c, b, a, col); } // both windings
}

export function gableRoof(B: Buckets, part: { cx: number; cy: number; w: number; d: number; angle: number }, top: number, roofHex: string, wall: RGB) {
  const f = frameOf(part), a = f.a + EAVE, b = f.b + EAVE, m = roofMat(roofHex);
  const h0 = top, h1 = h0 + Math.min(MAX_RISE, b * 0.55);
  const o = [at(f, -a, -b, h0), at(f, a, -b, h0), at(f, a, b, h0), at(f, -a, b, h0)], r0 = at(f, -a, 0, h1), r1 = at(f, a, 0, h1);
  slope(B, m.key, o[0], o[1], r1, r0, m.col); slope(B, m.key, o[2], o[3], r0, r1, m.col);
  // gable-end walls sit on the wall line, not the eave
  const w = [at(f, -f.a, -f.b, h0), at(f, f.a, -f.b, h0), at(f, f.a, f.b, h0), at(f, -f.a, f.b, h0)], g0 = at(f, -f.a, 0, h1 - EAVE * 0.55), g1 = at(f, f.a, 0, h1 - EAVE * 0.55);
  B.tri('plain', w[1], w[2], g1, wall); B.tri('plain', w[3], w[0], g0, wall);
  return h1;
}

/** Pyramid over the footprint (octagonal halls). With `lantern`, a raised glazed lantern with its own cap. */
export function pyramidRoof(B: Buckets, poly: XY[], top: number, roofHex: string, lantern: boolean) {
  const p = ccw(poly), ring = offset(p, EAVE + 0.2), c = centroid(p), m = roofMat(roofHex), n = ring.length;
  const r = ring.reduce((s, q) => s + Math.hypot(q[0] - c[0], q[1] - c[1]), 0) / n;
  B.prism('plain', ring, top, top + SLAB, FASCIA, false);
  const h0 = top + SLAB;
  const cone = (base: XY[], hb: number, apex: number) => { for (let i = 0; i < n; i++) { const a = base[i], b = base[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); B.tri(m.key, [a[0], a[1], hb], [b[0], b[1], hb], [c[0], c[1], apex], m.col, [0, 0], [l / TILE, 0], [l / 2 / TILE, r / TILE]); } };
  if (!lantern) { const apex = h0 + Math.min(6.5, r * 0.4); cone(ring, h0, apex); return apex; }
  const inner = scaled(ring, c, 0.42), h1 = h0 + Math.min(4, r * 0.24);
  for (let i = 0; i < n; i++) slope(B, m.key, [...ring[i], h0] as P3, [...ring[(i + 1) % n], h0] as P3, [...inner[(i + 1) % n], h1] as P3, [...inner[i], h1] as P3, m.col);
  const drum = Math.max(1.2, r * 0.11), h2 = h1 + drum;
  for (let i = 0; i < n; i++) { const a = inner[i], b = inner[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); B.wall('glass', a, b, h1, h2, WHITE, 0, l / 1.6, 0, drum / 1.6); }
  const capRing = scaled(inner, c, 1.22);
  B.prism('plain', capRing, h2, h2 + 0.18, FASCIA, false);
  const apex = h2 + 0.18 + Math.min(3, r * 0.16); cone(capRing, h2 + 0.18, apex);
  return apex;
}

/** Hip-like roof for footprints that fill their rectangle badly (L and T shapes): slopes rise from the outline to a smaller copy of it. */
export function insetRoof(B: Buckets, poly: XY[], top: number, roofHex: string) {
  const p = ccw(poly), ring = offset(p, EAVE), c = centroid(p), m = roofMat(roofHex), n = ring.length;
  const r = ring.reduce((s, q) => s + Math.hypot(q[0] - c[0], q[1] - c[1]), 0) / n;
  B.prism('plain', ring, top, top + SLAB, FASCIA, false);
  const h0 = top + SLAB, h1 = h0 + Math.min(4, r * 0.3), inner = scaled(ring, c, 0.4);
  for (let i = 0; i < n; i++) slope(B, m.key, [...ring[i], h0] as P3, [...ring[(i + 1) % n], h0] as P3, [...inner[(i + 1) % n], h1] as P3, [...inner[i], h1] as P3, m.col);
  B.cap(m.key, inner, h1, m.col, TILE);
  return h1;
}

export interface FlatOpts { roofHex: string; wall: RGB; angle: number; seed: number; eaveSlab?: boolean; clutter?: boolean }
/** Flat roof on the true footprint: parapet (or a thin projecting slab) and seeded rooftop units. */
export function flatRoof(B: Buckets, poly: XY[], top: number, o: FlatOpts) {
  const p = ccw(poly), green = isGreen(o.roofHex), deck = rgb(green ? CONCRETE : o.roofHex);
  let h = top;
  if (o.eaveSlab) { B.prism('plain', offset(p, 0.7), top, top + 0.28, FASCIA, true, deck); h = top + 0.28; }
  else {
    B.cap('plain', p, top, deck);
    for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; B.wall('plain', a, b, top, top + 0.9, o.wall); B.wall('plain', b, a, top, top + 0.9, mul(o.wall, 0.85)); }
  }
  let hi = h + (o.eaveSlab ? 0 : 0.9);
  if (o.clutter === false) return hi;
  // rooftop units: stair heads, water tanks, AC units; placed with a seed so they never move
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, ar = 0;
  for (let i = 0; i < p.length; i++) { const q = p[i], n = p[(i + 1) % p.length]; ar += q[0] * n[1] - n[0] * q[1]; minX = Math.min(minX, q[0]); maxX = Math.max(maxX, q[0]); minY = Math.min(minY, q[1]); maxY = Math.max(maxY, q[1]); }
  ar = Math.abs(ar / 2); if (ar < 70) return hi;
  const want = Math.max(1, Math.min(7, Math.round(ar / 130))), ang = (o.angle * Math.PI) / 180, placed: XY[] = [];
  for (let t = 0; t < 60 && placed.length < want; t++) {
    const x = minX + hash2(t, o.seed, 51) * (maxX - minX), y = minY + hash2(t, o.seed, 52) * (maxY - minY);
    if (signedDist(x, y, p) > -3 || placed.some(q => Math.hypot(q[0] - x, q[1] - y) < 5)) continue;
    const kind = placed.length === 0 ? 0 : Math.floor(hash2(t, o.seed, 53) * 3);
    if (kind === 0) { // stair / lift head
      B.box('plain', x, y, 4.2, 3.2, ang, h, h + 2.6, o.wall);
      B.box('plain', x, y, 4.9, 3.9, ang, h + 2.6, h + 2.85, green ? rgb(o.roofHex) : FASCIA); hi = Math.max(hi, h + 2.85);
    } else if (kind === 1) { B.box('plain', x, y, 1.9, 1.9, ang, h, h + 0.5, rgb('#8A939B')); B.box('plain', x, y, 1.6, 1.6, ang, h + 0.5, h + 2, rgb(hash2(t, o.seed, 54) > 0.5 ? '#2A2F35' : '#E9E6DC')); hi = Math.max(hi, h + 2); }
    else B.box('plain', x, y, 2.4, 1.3, ang, h, h + 1, rgb('#AEB4B8'), rgb('#8A939B'));
    placed.push([x, y]);
  }
  return hi;
}

export { rect };
