// Building geometry: each Part's true footprint (`poly`) is extruded to floors × 3.4 m from the
// building's `groundElev`, then given its roof, glass, stone and balconies.
import * as THREE from 'three';
import type { XY } from '../geo/grid';
import type { Building, Entrance, Part } from '../geo/types';
import { hash2 } from '../render/noise';
import { partFootprint } from './terrain';
import { Buckets, area2, ccw, centroid, mul, offset, rgb, scaled, type RGB, WHITE } from './mesh';
import { flatRoof, frameOf, gableRoof, hipRoof, insetRoof, pyramidRoof, roofMat, EAVE } from './roofs';
import { styleOf } from './buildingStyles';

export const FLOOR = 3.4;   // metres per floor
const BAY = 3.0;            // metres per window bay (the facade textures hold 4 bays × 4 floors)
const SKIRT = 4;            // walls carry on this far below the pad so nothing floats on a slope
const PLINTH = 0.45;
const PLINTH_COL = rgb('#B9B4A8');
const FASCIA = rgb('#F7F5EE');

const CREAM_BASE = new THREE.Color('#F2DFC4'), WHITE_BASE = new THREE.Color('#F4F2EA');
/** Facade texture and tint for a wall colour: peach/cream walls take the cream-plaster texture, the rest the white one. */
export function facadeMat(hex: string): { key: string; col: RGB } {
  const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 }; c.getHSL(hsl);
  const cream = hsl.s > 0.42 && hsl.h < 0.14;
  const base = cream ? CREAM_BASE : WHITE_BASE, r = (a: number, b: number) => Math.max(0.55, Math.min(1.12, a / b));
  return { key: cream ? 'facadeCream' : 'facadeWhite', col: [r(c.r, base.r), r(c.g, base.g), r(c.b, base.b)] };
}

export interface BuiltInfo { top: number; centre: XY }

/** Adds one building to `B`. Returns its highest point and label anchor. */
export function addBuilding(B: Buckets, b: Building, entrances: Entrance[]): BuiltInfo {
  const st = styleOf(b.id), g = b.groundElev ?? 0;
  const ent = entrances.find(e => e.buildingId === b.id && e.main) ?? entrances.find(e => e.buildingId === b.id);
  let top = g, sx = 0, sy = 0, sw = 0;
  b.parts.forEach((p, idx) => {
    const poly = ccw(partFootprint(p)), wallHex = p.wall ?? b.wall, roofHex = p.roofColor ?? b.roofColor;
    const wall = rgb(wallHex), fm = facadeMat(wallHex), wt = g + p.floors * FLOOR, seed = Math.round(p.cx * 7 + p.cy * 13);
    const stoneTo = p.stoneBase ? g + FLOOR : st.stoneBand ? g + PLINTH + st.stoneBand : 0;

    // ---- walls ----
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], c = poly[(i + 1) % poly.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]), bays = Math.round(len / BAY);
      B.wall('plain', a, c, g - SKIRT, g + PLINTH, PLINTH_COL);
      let y0 = g + PLINTH;
      if (stoneTo) { B.wall('stone', a, c, y0, stoneTo, WHITE, 0, len / 3.2, 0, (stoneTo - y0) / 3.2); y0 = stoneTo; }
      if (bays === 0) B.wall('plain', a, c, y0, wt, wall);
      else B.wall(fm.key, a, c, y0, wt, fm.col, 0, bays / 4, (y0 - g) / (FLOOR * 4), p.floors / 4);
    }

    // ---- roof ----
    let h = wt;
    const fill = Math.abs(area2(poly)) / Math.max(1, p.w * p.d);
    if (p.roof === 'flat') h = flatRoof(B, poly, wt, { roofHex, wall, angle: p.angle, seed, eaveSlab: st.eaveSlab });
    else if (p.roof === 'octagon') h = pyramidRoof(B, poly, wt, roofHex, st.lantern === 'all' || (Array.isArray(st.lantern) && st.lantern.includes(idx)));
    else if (p.roof === 'hip' && st.pavilionRoof === idx) h = pavilionHip(B, p, wt, wall, roofHex);
    else if (fill < 0.75 || fill > 1.2) h = insetRoof(B, poly, wt, roofHex);
    else if (p.roof === 'hip') h = hipRoof(B, p, wt, roofHex);
    else h = gableRoof(B, p, wt, roofHex, wall);

    // ---- glass, stone panels, towers, balconies ----
    if (p.roof !== 'octagon') {
      if (p.glass === 'stair') h = Math.max(h, stairTower(B, p, g, wt, wall, roofHex, seed));
      if (p.glass === 'atrium') atrium(B, p, g, wt, ent?.at, !!st.stonePanels);
    }
    if (p.stoneTowers && st.towerPavilions) h = Math.max(h, pavilion(B, p, wt, wall, roofHex));
    if (p.balconies) balconies(B, p, g, rgb(st.rail ?? '#7C8A84'));

    top = Math.max(top, h);
    const w = p.w * p.d; sx += p.cx * w; sy += p.cy * w; sw += w;
  });
  return { top, centre: [sx / sw, sy / sw] };
}

const glassWall = (B: Buckets, a: XY, b: XY, h0: number, h1: number) => B.wall('glass', a, b, h0, h1, WHITE, 0, Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.6, 0, (h1 - h0) / 1.7);
const move = (p: XY, v: XY, k: number): XY => [p[0] + v[0] * k, p[1] + v[1] * k];

/** Full-height glazed stairwell that stands a little proud of both long faces and rises above the eaves. */
function stairTower(B: Buckets, p: Part, g: number, wt: number, wall: RGB, roofHex: string, seed: number): number {
  const f = frameOf(p), W = 4.4, half = f.b + 0.7, s = (hash2(seed, 3, 71) - 0.5) * 0.3 * f.a * 2, c = move(f.c, f.lx, s), top = wt + 2.3;
  const ang = Math.atan2(f.lx[1], f.lx[0]);
  B.box('plain', c[0], c[1], W, half * 2, ang, g, top, wall);
  for (const sgn of [1, -1]) { // glass on the two faces that look out over the long sides
    const m = move(c, f.sx, sgn * (half + 0.04)), a = move(m, f.lx, sgn * (W / 2 - 0.35)), b2 = move(m, f.lx, -sgn * (W / 2 - 0.35));
    glassWall(B, a, b2, g + 0.6, top - 0.35);
  }
  if (p.roof === 'flat') { B.box('plain', c[0], c[1], W + 0.8, half * 2 + 0.8, ang, top, top + 0.25, FASCIA); return top + 0.25; }
  return hipRoof(B, { cx: c[0], cy: c[1], w: W, d: half * 2, angle: (ang * 180) / Math.PI }, top, roofHex);
}

/** Glass curtain-wall bay on the face nearest the main entrance; optional stone-clad panels beside it. */
function atrium(B: Buckets, p: Part, g: number, wt: number, entrance: XY | undefined, panels: boolean) {
  const f = frameOf(p);
  const sides = [{ n: f.sx, t: f.lx, off: f.b, len: f.a * 2 }, { n: [-f.sx[0], -f.sx[1]] as XY, t: f.lx, off: f.b, len: f.a * 2 }, { n: f.lx, t: f.sx, off: f.a, len: f.b * 2 }, { n: [-f.lx[0], -f.lx[1]] as XY, t: f.sx, off: f.a, len: f.b * 2 }];
  const mid = (s: typeof sides[0]) => move(f.c, s.n, s.off);
  const e = entrance ?? mid(sides[0]);
  const side = sides.slice().sort((a, b2) => Math.hypot(mid(a)[0] - e[0], mid(a)[1] - e[1]) - a.len * 0.15 - (Math.hypot(mid(b2)[0] - e[0], mid(b2)[1] - e[1]) - b2.len * 0.15))[0];
  const w = Math.max(4, Math.min(16, side.len * 0.36)), out = 0.8, m = mid(side), ang = Math.atan2(side.t[1], side.t[0]), top = wt + 0.5;
  const c = move(m, side.n, out / 2 - 0.2);
  B.box('plain', c[0], c[1], w, out + 0.4, ang, g, top, FASCIA);
  const face = move(m, side.n, out + 0.04), l = move(face, side.t, w / 2 - 0.3), r = move(face, side.t, -(w / 2 - 0.3));
  // outside is on the right of travel: pick the direction that keeps the normal pointing out
  const cross = (r[0] - l[0]) * side.n[1] - (r[1] - l[1]) * side.n[0];
  glassWall(B, cross < 0 ? l : r, cross < 0 ? r : l, g + 0.5, top - 0.4);
  // flat canopy over the door
  B.box('plain', move(m, side.n, out + 1.4)[0], move(m, side.n, out + 1.4)[1], Math.min(w, 7), 2.8, ang, g + 3.1, g + 3.4, FASCIA);
  if (!panels) return;
  const pw = Math.min(9, (side.len - w) / 2 - 1.5); if (pw < 2) return;
  for (const sgn of [1, -1]) {
    const pc = move(move(m, side.t, sgn * (w / 2 + 0.8 + pw / 2)), side.n, 0.15), q = rectPts(pc, side.t, side.n, pw, 0.7);
    for (let i = 0; i < 4; i++) { const a = q[i], b2 = q[(i + 1) % 4], len = Math.hypot(b2[0] - a[0], b2[1] - a[1]); B.wall('stone', a, b2, g, wt + 0.2, WHITE, 0, len / 3.2, 0, (wt + 0.2 - g) / 3.2); }
    B.cap('plain', q, wt + 0.2, FASCIA);
  }
}
function rectPts(c: XY, t: XY, n: XY, w: number, d: number): XY[] {
  const pts: XY[] = [move(move(c, t, -w / 2), n, -d / 2), move(move(c, t, w / 2), n, -d / 2), move(move(c, t, w / 2), n, d / 2), move(move(c, t, -w / 2), n, d / 2)];
  return ccw(pts);
}

/** A wide wing as in the Admin render: a low hip over the whole part, and a raised centre block with its own hip. */
function pavilionHip(B: Buckets, p: Part, wt: number, wall: RGB, roofHex: string): number {
  const f = frameOf(p), ang = Math.atan2(f.lx[1], f.lx[0]), deg = (ang * 180) / Math.PI, cw = f.a * 2 * 0.44, cd = f.b * 2 * 0.7, lift = 4.4;
  hipRoof(B, p, wt, roofHex, 2.6);
  B.box('plain', f.c[0], f.c[1], cw, cd, ang, wt, wt + lift, wall);
  return hipRoof(B, { cx: f.c[0], cy: f.c[1], w: cw, d: cd, angle: deg }, wt + lift, roofHex, 4.6);
}

/** Small rooftop pavilion with a green cap (NAB end towers). */
function pavilion(B: Buckets, p: Part, wt: number, wall: RGB, roofHex: string): number {
  const f = frameOf(p), s = Math.min(7, f.b * 1.1), ang = Math.atan2(f.lx[1], f.lx[0]), base = wt + 0.9;
  B.box('plain', f.c[0], f.c[1], s, s, ang, wt, base + 2.6, wall);
  return hipRoof(B, { cx: f.c[0], cy: f.c[1], w: s, d: s, angle: (ang * 180) / Math.PI }, base + 2.6, roofHex);
}

/** Thin slabs with railings on both long faces, one per upper floor. */
function balconies(B: Buckets, p: Part, g: number, rail: RGB) {
  const f = frameOf(p), len = f.a * 2 - 1.8, ang = Math.atan2(f.lx[1], f.lx[0]); if (len < 3) return;
  for (const sgn of [1, -1]) for (let fl = 1; fl < p.floors; fl++) {
    const y = g + fl * FLOOR, s = move(f.c, f.sx, sgn * (f.b + 0.55)), r = move(f.c, f.sx, sgn * (f.b + 1.06));
    B.box('plain', s[0], s[1], len, 1.1, ang, y - 0.16, y, FASCIA);
    B.box('plain', r[0], r[1], len, 0.08, ang, y, y + 1, rail);
  }
}

// ---------- off-campus village houses ----------
const HOUSE_WALLS = ['#E8E2D2', '#D9D4C8', '#EDE3C8', '#CFC8B8', '#E4D6C0'].map(rgb);
const HOUSE_ROOFS = ['#8C4A3C', '#5E7A8A', '#6E7781', '#4C7A55', '#A8553F', '#7A8790'].map(rgb);
/** Plain low houses outside the campus: one cheap merged mesh, vertex colours only. */
export function addHouses(B: Buckets, houses: { p: XY[]; f: number }[], heightAt: (x: number, y: number) => number) {
  houses.forEach((hs, i) => {
    const poly = ccw(hs.p); if (poly.length < 3) return;
    const c = centroid(poly), hv = poly.map(q => heightAt(q[0], q[1])), base = Math.max(...hv), low = Math.min(...hv) - 1.5, wt = base + hs.f * 2.9;
    const wall = HOUSE_WALLS[Math.floor(hash2(i, 5, 91) * HOUSE_WALLS.length)], roof = HOUSE_ROOFS[Math.floor(hash2(i, 9, 92) * HOUSE_ROOFS.length)];
    B.prism('house', poly, low, wt, wall, false);
    const ring = offset(poly, 0.3), inner = scaled(ring, c, 0.3), h1 = wt + 1.5, n = ring.length;
    for (let k = 0; k < n; k++) B.quad('house', [...ring[k], wt], [...ring[(k + 1) % n], wt], [...inner[(k + 1) % n], h1], [...inner[k], h1], roof);
    B.cap('house', inner, h1, mul(roof, 1.08));
  });
}

export { EAVE, roofMat };
