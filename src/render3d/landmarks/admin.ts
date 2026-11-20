// Admin Block, v3: the plan traced on H A's straight-down drone footage (20 Nov; scripts/admin-from-drone.mjs), each layout
// part carrying its role. It is an L round the flag forecourt on the campus grid:
//   endblock  the west and east end blocks: 4 storeys, sandstone ground floor, a full-height glass strip on the forecourt
//             face by the wing, the round IIM emblem and lettering on the east one; small square windows elsewhere
//   wing      the two 3-storey linking wings: open corridor galleries with teal canopies and sandstone piers on the forecourt
//             side, long low hip roofs with a dark green fascia
//   hall      the big square hall at the corner of the L, under one great green hip roof whose corner points at the flag;
//             that corner is the centre block: a portico of tall white columns under glass bands, wrapping both faces
// Details from reference/real/admin.md and the brand films (2025 @0:06, IIMS @0:42). Photos win over everything else.
import type { XY } from '../../geo/grid';
import type { Part } from '../../geo/types';
import { partFootprint } from '../terrain';
import { ccw, rgb } from '../mesh';
import { sampledRoof } from '../roofs';
import {
  bevelCorners, centroidOf, emblem, faceToward, facesOf, flat, gallery, glassGrid, hipPart, panel, punched, REAL_ROOF, sandstone, WALL, type Face, type LandmarkBuilder,
} from './kit';

const FHR = 3.7, PL = 0.6, EAVE_OVER = 1.3;
const ROOF_OPTS = { fascia: 0.5, ridge: true }, WING_ROOF = { ...ROOF_OPTS, fasciaCol: rgb('#1F5A4C') };
const PLINTH_C = rgb('#C9C3B6');

export const buildAdmin: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, g0 = g + PL, roof = sampledRoof(REAL_ROOF), H4 = g0 + 4 * FHR, H3 = g0 + 3 * FHR;
  const flag = ctx.landmarks.find(l => l.id === 'flag')?.at ?? ctx.entrances.find(e => e.buildingId === b.id)?.at ?? [b.parts[0].cx, b.parts[0].cy];
  const by = (role: Part['role'] | string) => b.parts.filter(p => (p.role as string) === role);
  const hall = by('hall')[0];
  let top = g;
  if (!hall) return legacy();
  const polys = new Map(b.parts.map(p => [p, ccw(partFootprint(p))]));
  /** The stretch of face f not covered by another part standing against it (a wing or block): [s0, s1]. */
  const exposed = (f: Face, self: Part): [number, number] => {
    let s0 = 0, s1 = f.len;
    for (const [p, o] of polys) {
      if (p === self) continue;
      const ss = o.map(q => (q[0] - f.a[0]) * f.u[0] + (q[1] - f.a[1]) * f.u[1]), dd = o.map(q => (q[0] - f.a[0]) * f.n[0] + (q[1] - f.a[1]) * f.n[1]);
      if (Math.min(...dd) > 2.5 || Math.max(...dd) < -2.5) continue;                 // not against this face
      const lo = Math.max(0, Math.min(...ss)), hi = Math.min(f.len, Math.max(...ss)); if (hi - lo < 1) continue;
      if (lo <= s0 + 1) s0 = Math.max(s0, hi); else if (hi >= s1 - 1) s1 = Math.min(s1, lo);
    }
    return [s0, s1];
  };

  // ---------- the hall, with the centre block at its flag corner ----------
  const hp = polys.get(hall)!, hf = facesOf(hp);
  const ci = hp.reduce((bi, q, i) => (Math.hypot(q[0] - flag[0], q[1] - flag[1]) < Math.hypot(hp[bi][0] - flag[0], hp[bi][1] - flag[1]) ? i : bi), 0);
  for (const f of hf) {
    B.wall('plain', f.a, f.b, g - 4, g0, PLINTH_C);
    flat(B, f, 0, f.len, g0, H4);
    const fromCorner = f.a === hp[ci], toCorner = f.b === hp[ci];
    if (!fromCorner && !toCorner) { if (f.len > 8) punched(B, f, 1, f.len - 1, g0, 4, FHR, Math.max(1, Math.round(f.len / 5)), 1.6, 1.4, 1.1); continue; }
    // the centre block: from the corner to where the wing stands against this face
    const [e0, e1] = exposed(f, hall), s0 = fromCorner ? 0 : e0, s1 = fromCorner ? e1 : f.len, w = s1 - s0;
    if (w < 3) continue;
    const bays = Math.max(2, Math.round(w / 5.5)), bw = w / bays;
    for (let fl = 1; fl <= 4; fl++) panel(B, 'plain', f, s0, s1, 0.6, g0 + fl * FHR - 0.45, g0 + fl * FHR, WALL);          // white slab bands
    for (let fl = 1; fl < 4; fl++) for (let i = 0; i < bays; i++) glassGrid(B, f, s0 + i * bw + 0.35, s0 + (i + 1) * bw - 0.35, g0 + fl * FHR + 0.15, g0 + (fl + 1) * FHR - 0.55, 0.05, 4, 1, 0.1); // glass bands
    for (let i = 0; i <= bays; i++) panel(B, 'plain', f, s0 + i * bw - 0.3, s0 + i * bw + 0.3, 0.3, g0 + FHR, H4, WALL);  // piers
    // the portico: tall white columns before a recessed glass front, sandstone at its ends, steps up to it
    glassGrid(B, f, s0 + 1, s1 - 1, g0 + 0.1, g0 + FHR - 0.6, -2.3, Math.max(2, Math.round(w / 2.2)), 1, 0.1);
    sandstone(B, f, s0, s0 + 1, g0, g0 + FHR - 0.45, -2.2); sandstone(B, f, s1 - 1, s1, g0, g0 + FHR - 0.45, -2.2);
    const cols = Math.max(2, Math.round(w / 4.5));
    for (let i = 0; i < cols; i++) { const s = s0 + 1.6 + (i * (w - 3.2)) / Math.max(1, cols - 1); panel(B, 'plain', f, s - 0.4, s + 0.4, 0.4, g0, g0 + 2 * FHR, WALL, 0, WALL, -0.4); }
    panel(B, 'plain', f, s0, s1, 0.6, g0 + FHR - 0.5, g0 + FHR, WALL);
    for (let k = 0; k < 4; k++) panel(B, 'plain', f, s0 + 0.5, s1 - 0.5, 2.6 - k * 0.45, g + k * 0.15, g + (k + 1) * 0.15, rgb('#C7C1B4'), 0, rgb('#B9B2A4'), 2.6 - (k + 1) * 0.45);
  }
  bevelCorners(B, hp, g0, H4, WALL, 0.12);
  top = Math.max(top, hipPart(B, hall, H4, roof, EAVE_OVER, 8.5, ROOF_OPTS));

  // ---------- the linking wings: corridor galleries on the forecourt side ----------
  for (const p of by('wing')) {
    const poly = polys.get(p)!, fs = facesOf(poly), front = faceToward(fs, flag);
    for (const f of fs) {
      B.wall('plain', f.a, f.b, g - 4, g0, PLINTH_C);
      const [e0, e1] = exposed(f, p); if (e1 - e0 < 1) continue;
      if (f === front) gallery(B, f, e0, e1, g0, 3, FHR);
      else { flat(B, f, e0, e1, g0, H3); if (e1 - e0 > 6) punched(B, f, e0 + 0.8, e1 - 0.8, g0, 3, FHR, Math.max(1, Math.round((e1 - e0) / 4.4)), 1.4, 1.4, 1.0); }
    }
    top = Math.max(top, hipPart(B, p, H3, roof, EAVE_OVER, 3.4, WING_ROOF));
  }

  // ---------- the end blocks ----------
  const centreOfL = centroidOf(hp);
  for (const p of by('endblock')) {
    const poly = polys.get(p)!, fs = facesOf(poly), front = faceToward(fs, flag), east = p.key === 'endE';
    for (const f of fs) {
      B.wall('plain', f.a, f.b, g - 4, g0, PLINTH_C);
      const [e0, e1] = exposed(f, p); if (e1 - e0 < 1) continue;
      flat(B, f, e0, e1, g0, H4);
      if (e1 - e0 > 3) sandstone(B, f, e0, e1, g0, g0 + FHR - 0.2, 0.08);                                        // sandstone ground floor
      if (f === front) {
        // the full-height glass strip on the side toward the hall, a glazed entrance under it; the emblem on the east block
        const toHall = (q: XY) => Math.hypot(q[0] - centreOfL[0], q[1] - centreOfL[1]), nearB = toHall(f.b) < toHall(f.a), sx = nearB ? e1 - 2.8 : e0 + 2.8;
        glassGrid(B, f, sx - 1.2, sx + 1.2, g0 + FHR, H4 - 1.0, 0.12, 2, 7);
        glassGrid(B, f, sx - 1.6, sx + 1.6, g0 + 0.1, g0 + FHR - 0.6, 0.14, 2, 1);
        if (east) emblem(B, f, nearB ? e0 + (e1 - e0 - 5) / 2 : e1 - (e1 - e0 - 5) / 2, 0.12, H4 - 4.6, 2.25, true);
        else if (e1 - e0 > 8) punched(B, f, nearB ? e0 + 0.8 : e0 + 5, nearB ? e1 - 5 : e1 - 0.8, g0, 4, FHR, Math.max(1, Math.round((e1 - e0 - 5) / 4.6)), 1.3, 1.5, 1.0, 1);
      } else if (e1 - e0 > 6) punched(B, f, e0 + 0.8, e1 - 0.8, g0, 4, FHR, Math.max(1, Math.round((e1 - e0) / 4.6)), 1.3, 1.5, 1.0, 1);
    }
    bevelCorners(B, poly, g0, H4, WALL, 0.12);
    top = Math.max(top, hipPart(B, p, H4, roof, EAVE_OVER, 4.6, ROOF_OPTS));
  }
  return { top, centre: hp[ci] };

  /** Before the drone trace (no roles): plain white blocks under hip roofs, so an old layout still draws. */
  function legacy() {
    let t = g;
    for (const p of b.parts) { const poly = ccw(partFootprint(p)); for (const f of facesOf(poly)) flat(B, f, 0, f.len, g0, H4); t = Math.max(t, hipPart(B, p, H4, roof, EAVE_OVER, 5, ROOF_OPTS)); }
    return { top: t, centre: centroidOf(b.parts.flatMap(p => partFootprint(p))) };
  }
};
