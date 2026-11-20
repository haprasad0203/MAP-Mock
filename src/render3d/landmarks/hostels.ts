// The hostels, modelled from the real ones (Phase 3M v2, reference/real/hostel-1.md and hostel-2.md).
//   D Block (Hostel 1): white 4-storey blocks with paired balconies (black rails, curved white slab edges), grey louvre
//     panels between them, a stone ground floor, a flat roof with a thin projecting white slab, white stair heads.
//   F Block design (Hostel 2; Hostels 3 and 4 share it, H A): peach-cream walls, sandstone piers between balcony bays,
//     full-height teal glass stair towers with a green-capped pavilion, a stone base, low green hip roofs with wide eaves,
//     a white gable porch at the entrance.
import type { XY } from '../../geo/grid';
import { partFootprint } from '../terrain';
import { ccw, rgb, type RGB } from '../mesh';
import { gableRoof, hipRoof, sampledRoof } from '../roofs';
import {
  bevelCorners, centroidOf, faceToward, facesOf, flat, fp, glassGrid, hipPart, panel, punched, ROOF_OPTS, WALL, type Face, type LandmarkBuilder,
} from './kit';

const PL = 0.6, FHH = 3.3;
const RAIL: RGB = rgb('#2B2E30'), LOUVRE: RGB = rgb('#8E9497'), STONE_GREY: RGB = rgb('#A89A88');
const PEACH = rgb('#EEE5D4'), PIER = rgb('#B2967A'), EAVE_WHITE = rgb('#F4F2EC'); // cream walls, beige-brown piers (H A drone, June)
const SKIRT = '#3E8F7E';
const stoneTint = (c: RGB): RGB => [c[0] / 0.72, c[1] / 0.6, c[2] / 0.47]; // the stone texture averages about #B89978
const isLong = (f: Face, all: Face[]) => f.len >= Math.max(...all.map(x => x.len)) * 0.7;

/** Balcony: a slab `d` deep with a rounded-looking white edge and a black rail, w wide, at floor height z. */
function balcony(B: Parameters<LandmarkBuilder>[0], f: Face, s: number, w: number, z: number, d: number, rail: RGB, slab: RGB = WALL) {
  panel(B, 'plain', f, s - w / 2, s + w / 2, d, z - 0.22, z + 0.05, slab);
  panel(B, 'plain', f, s - w / 2 + 0.05, s + w / 2 - 0.05, d - 0.05, z + 0.95, z + 1.02, rail, 0, rail, d - 0.12);
  for (let k = 0; k <= Math.round(w / 0.5); k++) { const x = s - w / 2 + 0.1 + (k * (w - 0.2)) / Math.round(w / 0.5); panel(B, 'plain', f, x - 0.025, x + 0.025, d - 0.06, z + 0.05, z + 0.95, rail); }
  for (const e of [-1, 1]) panel(B, 'plain', f, s + e * (w / 2) - (e > 0 ? 0.06 : 0), s + e * (w / 2) + (e < 0 ? 0.06 : 0), d - 0.06, z + 0.05, z + 1.0, rail, 0, rail, 0.05);
}

export const buildDBlock: LandmarkBuilder = (B, b) => {
  const g = b.groundElev ?? 0, g0 = g + PL;
  let top = g;
  b.parts.forEach((p, i) => {
    const pp = ccw(partFootprint(p)), fs = facesOf(pp), H = g0 + p.floors * FHH;
    for (const f of fs) {
      B.wall('plain', f.a, f.b, g - 4, g0, rgb('#C9C3B6'));
      flat(B, f, 0, f.len, g0, H);
      if (p.stoneBase) panel(B, 'stone', f, 0, f.len, 0.05, g0 - 0.6, g0 + 1.0, stoneTint(STONE_GREY), 2.6, STONE_GREY); // stone base band (DSC_9111)
      if (isLong(f, fs) && f.len > 12) {                                                   // paired balconies and louvres
        const bay = 7.2, n = Math.max(1, Math.floor((f.len - 1) / bay)), s0 = (f.len - n * bay) / 2;
        for (let k = 0; k < n; k++) {
          const c = s0 + (k + 0.5) * bay;
          panel(B, 'plain', f, c - 0.55, c + 0.55, 0.12, g0 + FHH, H - 0.4, LOUVRE);         // grey louvre strip between the pair
          for (let fl = 1; fl < p.floors; fl++) for (const e of [-1, 1]) {
            const s = c + e * 1.95, z = g0 + fl * FHH;
            glassGrid(B, f, s - 1.0, s + 1.0, z + 0.1, z + 2.5, 0.02, 2, 1, 0.08);           // the door behind the balcony
            balcony(B, f, s, 2.9, z, 1.25, RAIL);
          }
        }
      } else if (f.len > 5) punched(B, f, 0.8, f.len - 0.8, g0, p.floors, FHH, Math.max(1, Math.round(f.len / 4)), 1.0, 1.3, 1.0, 1);
    }
    bevelCorners(B, pp, g0, H, WALL, 0.1);
    // flat roof (grey concrete deck) behind a green sloping skirt all round, as filmed; rows of tank stands with green caps
    const ang = (p.angle * Math.PI) / 180;
    let t = greenSkirt(B, pp, H);
    tankStands(B, p, H + 0.3);
    if (p.glass === 'stair') { B.box('plain', p.cx, p.cy, 4.6, p.d + 0.6, ang, g0, H + 2.6, WALL); B.box('plain', p.cx, p.cy, 5.2, p.d + 1.2, ang, H + 2.6, H + 2.85, EAVE_WHITE); t = H + 2.85; }
    top = Math.max(top, t);
    if (i === 0) { /* label anchor below */ }
  });
  return { top, centre: centroidOf(b.parts.map(p => [p.cx, p.cy] as XY)) };
};

export const buildNewHostel: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, g0 = g + PL, roof = sampledRoof('#3F8F80');
  const centre = centroidOf(b.parts.map(p => [p.cx, p.cy] as XY)), ent = ctx.entrances.find(e => e.buildingId === b.id)?.at;
  let top = g;
  b.parts.forEach(p => {
    const pp = ccw(partFootprint(p)), fs = facesOf(pp), H = g0 + p.floors * FHH;
    for (const f of fs) {
      B.wall('plain', f.a, f.b, g - 4, g0, rgb('#C9C3B6'));
      flat(B, f, 0, f.len, g0, H, PEACH);
      if (p.stoneBase) panel(B, 'stone', f, 0, f.len, 0.06, g0, g0 + 1.4, stoneTint(PIER), 2.4, PIER);
      if (isLong(f, fs) && f.len > 12) {                                                    // stone piers, balcony bays between
        const bay = 7.0, n = Math.max(1, Math.round(f.len / bay)), w = f.len / n;
        for (let k = 0; k <= n; k++) panel(B, 'stone', f, Math.max(0, k * w - 0.55), Math.min(f.len, k * w + 0.55), 0.35, g0, H - 0.3, stoneTint(PIER), 2.4, PIER);
        for (let k = 0; k < n; k++) for (let fl = 1; fl < p.floors; fl++) {
          const s = (k + 0.5) * w, z = g0 + fl * FHH;
          glassGrid(B, f, s - 1.3, s + 1.3, z + 0.1, z + 2.5, 0.02, 3, 1, 0.08);
          balcony(B, f, s, w - 1.6, z, 1.1, RAIL, EAVE_WHITE);
        }
      } else if (f.len > 5) punched(B, f, 0.8, f.len - 0.8, g0, p.floors, FHH, Math.max(1, Math.round(f.len / 4)), 1.0, 1.4, 1.0, 1);
    }
    bevelCorners(B, pp, g0, H, PEACH, 0.1);
    top = Math.max(top, hipPart(B, p, H, roof, 1.3, 3.2, ROOF_OPTS));
    // the glass stair tower: on the long face away from the building's middle, rising above the eaves to a green-capped pavilion
    if (p.glass === 'stair') {
      const longF = fs.filter(f => isLong(f, fs)), f = faceToward(longF.length ? longF : fs, [p.cx + (p.cx - centre[0]) * 3 + 0.01, p.cy + (p.cy - centre[1]) * 3]);
      const s = f.len / 2, Ht = H + 2.4, a = Math.atan2(f.u[1], f.u[0]), q = fp(f, s, 0.2);
      B.box('plain', q[0], q[1], 5.0, 2.6, a, g0, Ht, WALL);
      glassGrid(B, f, s - 2.0, s + 2.0, g0 + 0.5, Ht - 0.6, 1.5, 3, p.floors + 1, 0.2);
      const c: XY = fp(f, s, 0.1);
      top = Math.max(top, hipRoof(B, { cx: c[0], cy: c[1], w: 5.6, d: 3.4, angle: (a * 180) / Math.PI }, Ht, roof, 1.6, 0.7, ROOF_OPTS));
    }
  });
  // white gable porch at the entrance
  if (ent) {
    const p = b.parts.reduce((best, q) => (Math.hypot(q.cx - ent[0], q.cy - ent[1]) < Math.hypot(best.cx - ent[0], best.cy - ent[1]) ? q : best), b.parts[0]);
    const fs = facesOf(ccw(partFootprint(p))), f = faceToward(fs, ent), s = Math.max(2.5, Math.min(f.len - 2.5, ((ent[0] - f.a[0]) * f.u[0] + (ent[1] - f.a[1]) * f.u[1]))), a = Math.atan2(f.u[1], f.u[0]);
    const c = fp(f, s, 1.6);
    for (const k of [-1, 1]) { const q = fp(f, s + k * 1.8, 3.0); B.box('plain', q[0], q[1], 0.35, 0.35, a, g0, g0 + 3.0, WALL); }
    B.box('plain', c[0], c[1], 4.4, 3.4, a, g0 + 3.0, g0 + 3.4, EAVE_WHITE);
    gableRoof(B, { cx: c[0], cy: c[1], w: 3.4, d: 4.4, angle: (a * 180) / Math.PI }, g0 + 3.4, sampledRoof('#F4F2EC'), EAVE_WHITE);
    glassGrid(B, f, s - 1.2, s + 1.2, g0 + 0.1, g0 + 2.8, 0.06, 2, 1, 0.12);
  }
  return { top, centre };
};

/** A flat roof behind a green sloping skirt: from the wall top it slopes out 1.1 m and down 0.9 m, with a white fascia
 *  under its edge; the deck is weathered grey concrete. Returns the skirt's top height. */
function greenSkirt(B: Parameters<LandmarkBuilder>[0], pp: XY[], H: number): number {
  const out = grow(pp, 1.1), top = H + 1.0, col = rgb(sampledRoof(SKIRT));
  B.cap('plain', pp, H + 0.3, rgb('#8D8F8C'));
  for (let i = 0; i < pp.length; i++) {
    const a = pp[i], b2 = pp[(i + 1) % pp.length], oa = out[i], ob = out[(i + 1) % out.length];
    B.quad('plain', [oa[0], oa[1], H + 0.1], [ob[0], ob[1], H + 0.1], [b2[0], b2[1], top], [a[0], a[1], top], col);
    B.quad('plain', [a[0], a[1], top], [b2[0], b2[1], top], [ob[0], ob[1], H + 0.1], [oa[0], oa[1], H + 0.1], col);
    B.wall('plain', oa, ob, H - 0.15, H + 0.1, EAVE_WHITE);
    B.wall('plain', a, b2, H + 0.3, top, rgb('#C9C6BE'));
  }
  return top;
}
/** Water-tank stands on a hostel roof: small white frames under green pyramid caps in a row along the block. */
function tankStands(B: Parameters<LandmarkBuilder>[0], p: { cx: number; cy: number; w: number; d: number; angle: number }, z: number) {
  const a = (p.angle * Math.PI) / 180, u = [Math.cos(a), Math.sin(a)], n = Math.max(1, Math.floor(p.w / 7.5));
  for (let k = 0; k < n; k++) {
    const t = (k + 0.5) / n - 0.5, x = p.cx + u[0] * t * (p.w - 4), y = p.cy + u[1] * t * (p.w - 4);
    B.box('plain', x, y, 1.6, 1.6, a, z, z + 1.5, rgb('#E9E6DE'));
    hipRoof(B, { cx: x, cy: y, w: 1.9, d: 1.9, angle: p.angle }, z + 1.5, sampledRoof(SKIRT), 0.8, 0.15, { fascia: 0.08, ridge: false });
  }
}

/** A hostel tower (Hostel 4, finished 2026): 9 storeys of cream walls with balcony rows, a flat roof behind a white
 *  parapet, a stair-and-lift core rising above it. */
export const buildTower: LandmarkBuilder = (B, b) => {
  const g = b.groundElev ?? 0, g0 = g + PL; let top = g;
  for (const p of b.parts) {
    const pp = ccw(partFootprint(p)), fs = facesOf(pp), H = g0 + p.floors * FHH;
    for (const f of fs) {
      B.wall('plain', f.a, f.b, g - 4, g0, rgb('#C9C3B6')); flat(B, f, 0, f.len, g0, H, PEACH);
      if (isLong(f, fs) && f.len > 12) {
        const bay = 4.2, n = Math.max(1, Math.floor(f.len / bay)), s0 = (f.len - n * bay) / 2;
        for (let k = 0; k < n; k++) for (let fl = 1; fl < p.floors; fl++) { const c = s0 + (k + 0.5) * bay, z = g0 + fl * FHH; glassGrid(B, f, c - 0.9, c + 0.9, z + 0.1, z + 2.4, 0.02, 2, 1, 0.07); panel(B, 'plain', f, c - 1.6, c + 1.6, 1.0, z - 0.2, z + 1.0, EAVE_WHITE); } // solid white balcony walls, as filmed
        for (let k = 0; k <= n; k += 2) panel(B, 'plain', f, s0 + k * bay - 0.3, s0 + k * bay + 0.3, 0.25, g0, H, PIER);
      } else if (f.len > 5) punched(B, f, 0.8, f.len - 0.8, g0, p.floors, FHH, Math.max(1, Math.round(f.len / 3.6)), 1.0, 1.3, 1.0);
    }
    bevelCorners(B, pp, g0, H, PEACH, 0.1);
    B.cap('plain', pp, H, rgb('#8D8F8C'));
    for (const f of fs) { B.wall('plain', f.a, f.b, H, H + 1.1, EAVE_WHITE); B.wall('plain', f.b, f.a, H, H + 1.1, rgb('#D9D6CF')); }
    const a = (p.angle * Math.PI) / 180; B.box('plain', p.cx, p.cy, 7, 6, a, H, H + 3.2, EAVE_WHITE);
    top = Math.max(top, H + 3.2);
  }
  return { top, centre: centroidOf(b.parts.map(p => [p.cx, p.cy] as XY)) };
};

/** A building still a bare concrete frame (H A: construction sites shown as sites): grey floor slabs on a grid of columns,
 *  brick infill on the lower floors, scaffolding along one face, a mesh screen, a stair core with exposed rebar on top. */
export const buildConstruction: LandmarkBuilder = (B, b) => {
  const g = b.groundElev ?? 0, CON = rgb('#A3A19B'), SLAB = rgb('#8F8D88'), BRICK = rgb('#9C5B45'), SCAF = rgb('#5E6A73'); let top = g;
  for (const p of b.parts) {
    const pp = ccw(partFootprint(p)), fs = facesOf(pp), a = (p.angle * Math.PI) / 180, u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]], FH = 3.2;
    for (let fl = 0; fl <= p.floors; fl++) { const z = g + fl * FH; B.prism('plain', pp, z - 0.25, z, SLAB, true, CON); }
    const nx = Math.max(2, Math.round(p.w / 4.5)), ny = Math.max(2, Math.round(p.d / 4.5));
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
      const x = p.cx + u[0] * (i / nx - 0.5) * (p.w - 0.6) + v[0] * (j / ny - 0.5) * (p.d - 0.6), y = p.cy + u[1] * (i / nx - 0.5) * (p.w - 0.6) + v[1] * (j / ny - 0.5) * (p.d - 0.6);
      B.box('plain', x, y, 0.45, 0.45, a, g - 0.5, g + p.floors * FH, CON);
    }
    for (const f of fs) for (let fl = 0; fl < Math.min(3, p.floors); fl++) panel(B, 'plain', f, 0.4, f.len - 0.4, -0.15, g + fl * FH + 0.05, g + (fl + 1) * FH - 0.3, BRICK);
    const sf = fs.reduce((m, f) => (f.len > m.len ? f : m), fs[0]);
    for (let k = 0; k <= Math.round(sf.len / 2.5); k++) { const q = fp(sf, k * 2.5, 1.0); B.box('plain', q[0], q[1], 0.08, 0.08, a, g, g + p.floors * FH + 1.2, SCAF); }
    for (let fl = 1; fl <= p.floors; fl++) panel(B, 'plain', sf, 0, sf.len, 1.1, g + fl * FH - 0.05, g + fl * FH + 0.05, SCAF, 0, SCAF, 0.9);
    panel(B, 'plain', sf, 0.5, sf.len * 0.45, 1.25, g + 2, g + p.floors * FH * 0.7, rgb('#3F7A52'));
    const H = g + p.floors * FH; B.box('plain', p.cx, p.cy, 5, 4, a, H, H + 3, CON);
    for (let k = 0; k < 6; k++) { const x = p.cx + u[0] * (k - 2.5) * 0.7, y = p.cy + u[1] * (k - 2.5) * 0.7; B.box('plain', x, y, 0.05, 0.05, 0, H + 3, H + 4.2, rgb('#5B3A2A')); }
    top = Math.max(top, H + 4.2);
  }
  return { top, centre: centroidOf(b.parts.map(p => [p.cx, p.cy] as XY)) };
};

/** Offset a convex-ish footprint outward by d (vertex normals). */
function grow(poly: XY[], d: number): XY[] {
  const c = centroidOf(poly);
  return poly.map((p, i) => {
    const a = poly[(i + poly.length - 1) % poly.length], b2 = poly[(i + 1) % poly.length];
    const e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b2[0] - p[0], b2[1] - p[1]], l1 = Math.hypot(e1[0], e1[1]) || 1, l2 = Math.hypot(e2[0], e2[1]) || 1;
    let nx = e1[1] / l1 + e2[1] / l2, ny = -e1[0] / l1 - e2[0] / l2; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if ((p[0] + nx - c[0]) ** 2 + (p[1] + ny - c[1]) ** 2 < (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2) { nx = -nx; ny = -ny; }
    return [p[0] + nx * d, p[1] + ny * d] as XY;
  });
}
