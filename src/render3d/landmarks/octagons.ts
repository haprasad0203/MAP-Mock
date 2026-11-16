// The campus's octagonal buildings, modelled from the real ones (Phase 3M v2, reference/real/<id>.md).
//   Cafe Cloud: a glazed one-storey octagon under a deep white fascia ring, a low green roof inside it, a raised clerestory
//               under a green pyramid, a white porch block on the road side.
//   Octagonal Hall: a tall white octagon with a sandstone plinth band and high windows under a broad green-teal octagonal
//               pyramid with ridge caps and a small lantern cap (drawn inscribed in the data rectangle; see LAYOUT_CHECK).
//   Students' Mess: four octagons with window bands under dark slate pyramids, the big one two storeys with a lantern.
import type { XY } from '../../geo/grid';
import { partFootprint } from '../terrain';
import { ccw, rgb } from '../mesh';
import { sampledRoof } from '../roofs';
import {
  centroidOf, faceToward, fp, glassGrid, octagon, octagonIn, octRoof, octWalls, panel, punched, sandstone, WALL, type LandmarkBuilder,
} from './kit';

const PL = 0.6;
/** Circumradius and rotation of the regular octagon that best fits a footprint (mean corner distance, first corner). */
function fitOct(poly: XY[]): { c: XY; R: number; turn: number } {
  const c = centroidOf(poly), R = poly.reduce((s, q) => s + Math.hypot(q[0] - c[0], q[1] - c[1]), 0) / poly.length;
  const far = poly.reduce((b, q) => (Math.hypot(q[0] - c[0], q[1] - c[1]) > Math.hypot(b[0] - c[0], b[1] - c[1]) ? q : b), poly[0]);
  return { c, R, turn: Math.atan2(far[1] - c[1], far[0] - c[0]) };
}

export const buildCafeCloud: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, g0 = g + PL, H = g0 + 4.6, roof = sampledRoof('#2F7A6C');
  const { c, R, turn } = fitOct(ccw(partFootprint(b.parts[0]))), pts = octagon(c, R * 0.97, turn);
  const fs = octWalls(B, pts, g - 3, g0, rgb('#C9C3B6')), ent = ctx.entrances.find(e => e.buildingId === b.id)?.at ?? fp(fs[0], 0, 5);
  for (const f of fs) {
    flat(f, g0, g0 + 0.9); glassGrid(B, f, 0.35, f.len - 0.35, g0 + 0.9, H - 1.7, 0.02, Math.max(2, Math.round(f.len / 2.4)), 1, 0.16); // window band
    panel(B, 'plain', f, -0.5, f.len + 0.5, 0.55, H - 1.7, H + 0.9, WALL, 0, WALL, -0.4);                                         // fascia ring, standing above the roof edge as a parapet
  }
  // the low green roof inside the ring, up to the clerestory; the clerestory with its window band; the green pyramid
  const kR = 0.42, hR = octRoof(B, c, R * 0.97 - 0.7, turn, H - 0.2, 0.9, roof, 0, kR * 1.08, 0.05);
  const cl = octagon(c, R * kR, turn), clf = octWalls(B, cl, hR - 0.1, hR + 2.0);
  for (const f of clf) glassGrid(B, f, 0.3, f.len - 0.3, hR + 0.35, hR + 1.6, 0.03, 2, 1, 0.1);
  const top = octRoof(B, c, R * kR, turn, hR + 2.0, 2.4, roof, 0.9);
  for (const k of [-1, 1]) { const q = fp(clf[0], clf[0].len / 2 + k * 2, -R * 0.55); B.box('plain', q[0], q[1], 1.6, 1.4, turn, hR - 0.1, hR + 1.1, rgb('#9AA0A4')); }
  // white porch block on the entrance side
  const pf = faceToward(fs, ent);
  B.box('plain', fp(pf, pf.len / 2, 2.6)[0], fp(pf, pf.len / 2, 2.6)[1], Math.min(9, pf.len + 1.5), 5.4, Math.atan2(pf.u[1], pf.u[0]), g0, H + 0.2, WALL);
  glassGrid(B, pf, pf.len / 2 - 2.4, pf.len / 2 + 2.4, g0 + 0.1, g0 + 2.8, 5.35, 3, 1, 0.12);
  return { top, centre: c };
  function flat(f: Parameters<typeof punched>[1], h0: number, h1: number) { B.wall('plain', f.a, f.b, h0, h1, WALL); }
};

export const buildOctagonHall: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, g0 = g + PL, H = g0 + 5.2, roof = sampledRoof('#3E7F75');
  const { c, R, turn, pts } = octagonIn(b.parts[0]);
  const fs = octWalls(B, pts, g - 3, H);
  const ent = ctx.entrances.find(e => e.buildingId === b.id)?.at ?? c, door = faceToward(fs, ent);
  for (const f of fs) {
    sandstone(B, f, 0, f.len, g0, g0 + 1.2, 0.05);                                                        // stone plinth band
    if (f === door) {
      glassGrid(B, f, f.len / 2 - 1.8, f.len / 2 + 1.8, g0 + 0.1, g0 + 3.0, 0.1, 2, 1, 0.16);
      panel(B, 'plain', f, f.len / 2 - 2.6, f.len / 2 + 2.6, 1.6, g0 + 3.0, g0 + 3.35, WALL);              // door hood
      for (let k = 0; k < 3; k++) panel(B, 'plain', f, f.len / 2 - 3.2, f.len / 2 + 3.2, 2.4 - k * 0.6, g + k * 0.2, g + (k + 1) * 0.2, rgb('#C7C1B4'), 0, rgb('#B9B2A4'), 2.4 - (k + 1) * 0.6);
    }
    punched(B, f, 0.6, f.len - 0.6, g0, 1, 0, 2, 1.2, 1.0, 3.4);                                           // high windows
  }
  const apex = octRoof(B, c, R, turn, H, (R + 1.8) * Math.tan((17 * Math.PI) / 180), roof, 1.8, 0.13);
  const lan = octagon(c, (R + 1.8) * 0.13, turn); octWalls(B, lan, apex - 0.05, apex + 0.7);              // the small lantern cap
  const top = octRoof(B, c, (R + 1.8) * 0.13, turn, apex + 0.7, 0.9, roof, 0.3, 0, 0.12);
  return { top, centre: c };
};

export const buildMess: LandmarkBuilder = (B, b) => {
  const g = b.groundElev ?? 0, g0 = g + PL, roof = sampledRoof('#5C656D');
  let top = g;
  b.parts.forEach((p, i) => {
    const { c, R, turn } = fitOct(ccw(partFootprint(p))), pts = octagon(c, R, turn), H = g0 + p.floors * 3.8;
    const fs = octWalls(B, pts, g - 3, H);
    for (const f of fs) for (let fl = 0; fl < p.floors; fl++) glassGrid(B, f, 0.6, f.len - 0.6, g0 + fl * 3.8 + 0.9, g0 + fl * 3.8 + 3.1, 0.04, Math.max(2, Math.round(f.len / 2.2)), 1, 0.14);
    if (i === 0) { // the big hall: a lantern tier
      const hR = octRoof(B, c, R, turn, H, (R + 1.2) * 0.42, roof, 1.2, 0.4);
      const lan = octagon(c, (R + 1.2) * 0.4, turn), lf = octWalls(B, lan, hR - 0.05, hR + 1.5);
      for (const f of lf) glassGrid(B, f, 0.3, f.len - 0.3, hR + 0.25, hR + 1.25, 0.03, 2, 1, 0.08);
      top = Math.max(top, octRoof(B, c, (R + 1.2) * 0.4, turn, hR + 1.5, (R + 1.2) * 0.4 * 0.5, roof, 0.6));
    } else top = Math.max(top, octRoof(B, c, R, turn, H, (R + 1.0) * 0.45, roof, 1.0));
  });
  return { top, centre: centroidOf(b.parts.map(p => [p.cx, p.cy] as XY)) };
};
