// The campus's octagonal buildings, modelled from the real ones (Phase 3M v2, reference/real/<id>.md).
//   Cafe Cloud: a glazed one-storey octagon under a deep white fascia ring, a low green roof inside it, a raised clerestory
//               under a green pyramid, a white porch block on the road side.
//   Octagonal Hall: a tall white octagon with a sandstone plinth band and high windows under a broad green-teal octagonal
//               pyramid with ridge caps and a small lantern cap (drawn inscribed in the data rectangle; see LAYOUT_CHECK).
//   Students' Mess: four octagons with window bands under dark slate pyramids, the big one two storeys with a lantern.
import type { XY } from '../../geo/grid';
import { partFootprint } from '../terrain';
import { ccw, rgb, type RGB } from '../mesh';
import { sampledRoof } from '../roofs';
import {
  centroidOf, faceToward, facesOf, fp, glassGrid, ngon, octagon, octagonIn, octRoof, octWalls, panel, punched, sandstone, WALL, type Face, type LandmarkBuilder,
} from './kit';

const PL = 0.6;
const mulRGB = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];
/** Circumradius and rotation of the regular octagon that best fits a footprint (mean corner distance, first corner). */
function fitOct(poly: XY[]): { c: XY; R: number; turn: number } {
  const c = centroidOf(poly), R = poly.reduce((s, q) => s + Math.hypot(q[0] - c[0], q[1] - c[1]), 0) / poly.length;
  const far = poly.reduce((b, q) => (Math.hypot(q[0] - c[0], q[1] - c[1]) > Math.hypot(b[0] - c[0], b[1] - c[1]) ? q : b), poly[0]);
  return { c, R, turn: Math.atan2(far[1] - c[1], far[0] - c[0]) };
}

export const buildCafeCloud: LandmarkBuilder = (B, b, ctx) => {
  // v3 (21 Nov): measured on H A's drone nadir (scripts/cafe-from-drone.mjs) and the entrance photo (CCC_and_Lake IMG_6713).
  // The footprint is the verandah's outer octagon; the hall stands VER metres inside it. A stone-clad plinth about 1 m high
  // carries both; five dark granite steps rise to the entrance on the road side, under the raised fascia with the sign.
  const g = b.groundElev ?? 0, g0 = g + 1.0, roof = sampledRoof('#2E7470');
  const outer = ccw(partFootprint(b.parts[0])), c = centroidOf(outer), cos8 = Math.cos(Math.PI / 8);
  if (outer.length !== 8) return buildCafeCloudLegacy(B, b, ctx);
  const Rv = outer.reduce((s, q) => s + Math.hypot(q[0] - c[0], q[1] - c[1]), 0) / 8, turn = Math.atan2(outer[0][1] - c[1], outer[0][0] - c[0]);
  const VER = 4.7, Rh = Rv - VER / cos8, hall = octagon(c, Rh, turn), ring = octagon(c, Rv, turn);
  const Hv = g0 + 3.6, Hw = g0 + 6.2;                       // verandah ceiling; the hall's wall top under the green eave
  const CREAM = rgb('#EFE3CF'), COLUMN = rgb('#E6C3B3'), FASCIA_C = rgb('#F1E6D4'), FLOOR = rgb('#CFC7BC'), GRANITE = rgb('#4E4542'), CEIL = rgb('#E9DFCF');
  const ent = ctx.entrances.find(e => e.buildingId === b.id)?.at ?? [c[0] + Rv, c[1]];
  const outF = facesOf(ring), hallF = facesOf(hall), doorF = faceToward(outF, ent), di = outF.indexOf(doorF);
  // the plinth: stone faces round the verandah, the verandah floor on top
  for (const f of outF) { B.wall('plain', f.a, f.b, g - 3, g - 0.3, rgb('#B9B2A6')); sandstone(B, f, 0, f.len, g - 0.3, g0, 0.02); }
  B.cap('plain', ring, g0, FLOOR);
  // the hall: cream walls, two windows a face (dark frames), the wooden double doors on the entrance side, and a band of
  // high windows above the verandah roof
  hallF.forEach((f, i) => {
    flat(f, g0, Hw);
    if (i === di) { for (const k of [-1, 1]) panel(B, 'plain', f, f.len / 2 + k * 1.05 - 0.95, f.len / 2 + k * 1.05 + 0.95, 0.06, g0, g0 + 2.6, rgb('#6B4630')); glassGrid(B, f, 0.9, f.len / 2 - 2.3, g0 + 0.7, g0 + 2.6, 0.04, 2, 2, 0.1, rgb('#3A3330')); glassGrid(B, f, f.len / 2 + 2.3, f.len - 0.9, g0 + 0.7, g0 + 2.6, 0.04, 2, 2, 0.1, rgb('#3A3330')); }
    else for (const s of [f.len * 0.27, f.len * 0.73]) glassGrid(B, f, s - 1.0, s + 1.0, g0 + 0.8, g0 + 2.7, 0.04, 2, 2, 0.1, rgb('#3A3330'));
    glassGrid(B, f, 0.5, f.len - 0.5, Hv + 1.2, Hw - 0.35, 0.03, Math.max(2, Math.round(f.len / 1.8)), 1, 0.08);
  });
  // the verandah roof: a flat ring between the hall and the outer edge, a cream fascia band and a low parapet
  for (let i = 0; i < 8; i++) {
    const o0 = ring[i], o1 = ring[(i + 1) % 8], h0 = hall[i], h1 = hall[(i + 1) % 8], z = Hv + 0.35;
    B.quad('plain', [o0[0], o0[1], z], [o1[0], o1[1], z], [h1[0], h1[1], z], [h0[0], h0[1], z], rgb('#B9B5AE'));                     // the roof deck
    B.quad('plain', [h0[0], h0[1], Hv], [h1[0], h1[1], Hv], [o1[0], o1[1], Hv], [o0[0], o0[1], Hv], CEIL);                             // the ceiling under it
  }
  for (const f of outF) { panel(B, 'plain', f, -0.05, f.len + 0.05, 0.12, Hv - 0.05, Hv + 0.95, FASCIA_C); }                         // fascia and parapet
  // round columns along the outer edge: one at each corner and two between, each a grooved peach-pink shaft
  for (const f of outF) for (const s of [0.65, f.len / 3, (2 * f.len) / 3]) {
    const q = fp(f, s, -0.55), col = ngon(q, 0.3, 12);
    B.prism('plain', col, g0, Hv, COLUMN, false);
    for (const z of [g0 + 0.9, g0 + 1.8, g0 + 2.7]) B.prism('plain', ngon(q, 0.315, 12), z - 0.03, z + 0.03, mulRGB(COLUMN, 0.86), false);
  }
  // the entrance block: a deep cream fascia on the road side carrying the sign, over its own pair of columns
  {
    const f = doorF, w = Math.min(f.len * 0.82, 11), s0 = f.len / 2 - w / 2, s1 = f.len / 2 + w / 2;
    panel(B, 'plain', f, s0, s1, 0.7, Hv - 0.2, Hv + 3.0, FASCIA_C, 0, FASCIA_C, -2.2);
    for (const s of [s0 + 0.6, s1 - 0.6]) { const q = fp(f, s, 0.2); B.prism('plain', ngon(q, 0.32, 12), g0, Hv - 0.2, COLUMN, false); }
    // the sign: a white board, the cartoon cloud in pale blue, a teal bowl, dark lettering
    const m = f.len / 2, zS = Hv + 1.45;
    panel(B, 'plain', f, m - 1.9, m + 1.9, 0.78, zS - 1.0, zS + 1.05, rgb('#F7F7F4'), 0, rgb('#3A4A55'));
    panel(B, 'plain', f, m - 1.6, m - 0.2, 0.82, zS - 0.25, zS + 0.75, rgb('#CFE3EC'));
    panel(B, 'plain', f, m + 0.1, m + 1.4, 0.82, zS - 0.55, zS + 0.15, rgb('#2E8C7E'));
    panel(B, 'plain', f, m - 1.5, m + 1.5, 0.82, zS - 0.9, zS - 0.72, rgb('#2B3A44'));
    // five dark granite steps up to the verandah floor, with the stone cheeks either side
    for (let k = 0; k < 5; k++) panel(B, 'plain', f, s0 + 0.4, s1 - 0.4, 2.2 - k * 0.42, g + k * 0.2, g + (k + 1) * 0.2, GRANITE, 0, mulRGB(GRANITE, 0.85), 0);
    for (const s of [s0 - 0.4, s1 + 0.4]) sandstone(B, f, s - 0.4, s + 0.4, g, g0, 2.3);
  }
  // the green roof: a low octagonal pyramid from the hall's eave to the lantern, then the lantern's glazed drum and its roof
  const kL = 0.49, h1 = octRoof(B, c, Rh, turn, Hw, (Rh + 0.6) * cos8 * Math.tan((15 * Math.PI) / 180), roof, 0.6, kL, 0.35);
  const RL = (Rh + 0.6) * kL - 0.3, lan = octagon(c, RL, turn), lanF = facesOf(lan);
  for (const f of lanF) { flat(f, h1 - 0.1, h1 + 1.5); glassGrid(B, f, 0.3, f.len - 0.3, h1 + 0.25, h1 + 1.25, 0.03, 2, 1, 0.08); }
  const top = octRoof(B, c, RL, turn, h1 + 1.5, RL * cos8 * Math.tan((22 * Math.PI) / 180), roof, 0.5, 0, 0.25);
  B.prism('plain', ngon(c, 0.12, 6), top - 0.1, top + 0.9, rgb('#C9C6BC'));
  return { top, centre: c };
  function flat(f: Face, h0: number, h1: number) { B.wall('plain', f.a, f.b, h0, h1, CREAM); }
};

/** Before the drone measurement (an Overture outline): a glazed octagon under a fascia ring and a green pyramid. */
const buildCafeCloudLegacy: LandmarkBuilder = (B, b, ctx) => {
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
