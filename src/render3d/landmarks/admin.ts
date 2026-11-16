// Admin Block, modelled from the REAL building (Phase 3M v2, reference/real/admin.md; photos win over the renders).
// On the data footprints:
//   parts 0 + 1 = west end block, 4 floors; part 3 = east end block, 4 floors (the data says 3: proposal in LAYOUT_CHECK);
//   part 2 = the centre range: two 3-floor linking wings with open corridor galleries, the 4-floor centre block (glass
//   bands between white slabs over a columned portico) and the hall behind them.
// Sandstone on the end-block ground floors, the wing piers and the portico; green-teal hip roofs with deep white eaves.
import type { XY } from '../../geo/grid';
import { partFootprint } from '../terrain';
import { ccw, offset, rgb } from '../mesh';
import { insetRoof, sampledRoof } from '../roofs';
import {
  behind, bevelCorners, visibleSpan, centroidOf, depthAt, emblem, faceOf, faceToward, facesOf, flat, fp, gallery, glassGrid, hipOver, hipPart, ngon, ONE, panel,
  punched, REAL_ROOF, ring, sandstone, WALL, type Face, type LandmarkBuilder,
} from './kit';

const MAIN = 2, EAST = 3;
const FHR = 3.7, PL = 0.6;          // floor height and plinth from the photos (admin.md)
const ROOF_OPTS = { fascia: 0.5, ridge: true };

export const buildAdmin: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, roof = sampledRoof(REAL_ROOF), g0 = g + PL;
  const flag = ctx.landmarks.find(l => l.id === 'flag')?.at ?? ctx.entrances.find(e => e.buildingId === b.id)?.at ?? [b.parts[0].cx, b.parts[0].cy - 40];
  const Hend = g0 + 4 * FHR, Hw = g0 + 3 * FHR;
  let top = g;

  // ---------- centre range (part 2) ----------
  const main = b.parts[MAIN], poly = ccw(partFootprint(main)), fs = facesOf(poly), front = faceToward(fs, flag), L = front.len;
  // the end blocks stand ahead of the wings (photos): the wings and centre fill only the stretch between them
  const [v0, v1] = visibleSpan(front, b.parts.filter((_, i) => i !== MAIN).map(p => ccw(partFootprint(p)))), Lv = v1 - v0;
  const c0 = v0 + Lv / 3, c1 = v0 + (2 * Lv) / 3, Dw = 11, Dc = Math.max(14, Math.min(22, depthAt(poly, front, L / 2) - 4));
  for (const f of fs) B.wall('plain', f.a, f.b, g - 4, g0, rgb('#C9C3B6'));                        // plinth
  // rear hall: everything deeper than the wings, at the wings' height, plain white with high windows
  const hall = behind(poly, front, Dw);
  if (hall.length >= 3) {
    for (const f of facesOf(hall)) { flat(B, f, 0, f.len, g0, Hw); if (f.len > 6) punched(B, f, 1, f.len - 1, g0, 3, FHR, Math.max(1, Math.round(f.len / 5)), 1.6, 1.4, 1.1); }
    top = Math.max(top, insetRoof(B, hall, Hw, roof));
  }
  // linking wings: corridor galleries on the front, white ends
  gallery(B, front, v0, c0, g0, 3, FHR); gallery(B, front, c1, v1, g0, 3, FHR);
  for (const [s0, s1] of [[v0 - 2, c0], [c1, v1 + 2]] as [number, number][]) top = Math.max(top, hipOver(B, front, s0 - 0.3, s1 + 0.3, -0.2, Dw, Hw, roof, 1.3, 3.2, ROOF_OPTS));
  // centre block: a 4-floor box from the front line back Dc
  const cf = faceOf(fp(front, c0), fp(front, c1));
  const side = (s: number, sgn: number) => faceOf(sgn > 0 ? fp(front, s, -Dc) : fp(front, s), sgn > 0 ? fp(front, s) : fp(front, s, -Dc));
  const sides: Face[] = [side(c0, 1), side(c1, -1), faceOf(fp(front, c1, -Dc), fp(front, c0, -Dc))];
  for (const f of sides) { flat(B, f, 0, f.len, g0, Hend); bands(f, 0.6, f.len - 0.6, f.len > 16 ? 3 : 2); }
  portico(cf);
  bevelCorners(B, [fp(front, c0), fp(front, c1), fp(front, c1, -Dc), fp(front, c0, -Dc)], g0, Hend, WALL, 0.12);
  top = Math.max(top, hipOver(B, front, c0, c1, 0, Dc, Hend, roof, 1.5, 5.5, ROOF_OPTS));

  // ---------- end blocks: parts 0 + 1 (west) and part 3 (east) ----------
  b.parts.forEach((p, idx) => {
    if (idx === MAIN) return;
    const pp = ccw(partFootprint(p)), pf = facesOf(pp), show = faceToward(pf, flag), H = Hend;
    const toMain = (f: Face) => { const m = centroidOf(poly), d0 = Math.hypot(f.a[0] - m[0], f.a[1] - m[1]), d1 = Math.hypot(f.b[0] - m[0], f.b[1] - m[1]); return d0 < d1 ? 0.18 : 0.82; };
    for (const f of pf) {
      B.wall('plain', f.a, f.b, g - 4, g0, rgb('#C9C3B6'));
      flat(B, f, 0, f.len, g0, H);
      if (f.len > 3) sandstone(B, f, 0, f.len, g0, g0 + FHR - 0.2, 0.08);                          // sandstone ground floor
      if (f === show && (idx === 1 || idx === EAST)) {
        const k = toMain(f), sx = f.len * k;                                                       // full-height glass strip by the wing
        glassGrid(B, f, sx - 1.2, sx + 1.2, g0 + FHR, H - 1.0, 0.12, 2, 7);
        glassGrid(B, f, sx - 1.6, sx + 1.6, g0 + 0.1, g0 + FHR - 0.6, 0.14, 2, 1);                   // glazed entrance
        if (idx === EAST) emblem(B, f, f.len * (k < 0.5 ? 0.64 : 0.36), 0.12, H - 4.6, 2.25, true); // the IIM emblem and letters
      } else if (f.len > 6) punched(B, f, 0.8, f.len - 0.8, g0, 4, FHR, Math.max(1, Math.round(f.len / 4.6)), 1.3, 1.5, 1.0, 1);
    }
    bevelCorners(B, pp, g0, H, WALL, 0.12);
    top = Math.max(top, hipPart(B, p, H, roof, 1.4, 4.2, ROOF_OPTS));
  });

  if (ctx.forecourt) forecourt();
  return { top, centre: centroidOf(poly) };

  /** Glass bands between white slab edges on floors 1–3 of the centre block, `n` bays between white piers. */
  function bands(f: Face, s0: number, s1: number, n: number) {
    for (let fl = 1; fl <= 4; fl++) panel(B, 'plain', f, s0 - 0.6, s1 + 0.6, 0.6, g0 + fl * FHR - 0.45, g0 + fl * FHR, WALL); // slab bands
    const w = (s1 - s0) / n;
    for (let fl = 1; fl < 4; fl++) for (let i = 0; i < n; i++) glassGrid(B, f, s0 + i * w + 0.35, s0 + (i + 1) * w - 0.35, g0 + fl * FHR + 0.15, g0 + (fl + 1) * FHR - 0.55, 0.05, 4, 1, 0.1);
    for (let i = 0; i <= n; i++) panel(B, 'plain', f, s0 + i * w - 0.3, s0 + i * w + 0.3, 0.3, g0 + FHR, g0 + 4 * FHR, WALL); // piers
  }
  /** Centre front: glass bands above, and the portico: four white columns before a recessed glass and sandstone front. */
  function portico(f: Face) {
    bands(f, 0.6, f.len - 0.6, 3);
    flat(B, f, 0, f.len, g0 + FHR, Hend);
    const w = f.len;
    for (let i = 0; i < 6; i++) { const s0 = 1 + (i * (w - 2)) / 6, s1 = s0 + (w - 2) / 6; if (i === 0 || i === 5) sandstone(B, f, s0, s1, g0, g0 + FHR - 0.45, -2.2); else glassGrid(B, f, s0 + 0.15, s1 - 0.15, g0 + 0.1, g0 + FHR - 0.6, -2.3, 3, 1, 0.1); }
    flat(B, f, 0, w, g0 + FHR - 0.45, g0 + FHR, WALL, -2.4);
    for (let i = 0; i < 4; i++) { const s = 2.5 + (i * (w - 5)) / 3; panel(B, 'plain', f, s - 0.45, s + 0.45, 0.45, g0, g0 + FHR, WALL, 0, WALL, -0.45); }
    panel(B, 'plain', f, 0, w, 0.6, g0 + FHR - 0.5, g0 + FHR, WALL);                               // first-floor slab over the portico
    // steps up to the portico
    for (let k = 0; k < 4; k++) panel(B, 'plain', f, 3, w - 3, 2.6 - k * 0.45, g + k * 0.15, g + (k + 1) * 0.15, rgb('#C7C1B4'), 0, rgb('#B9B2A4'), 2.6 - (k + 1) * 0.45);
  }

  // ---------- forecourt (?model= viewer only): pink brick paving, the oval lawn with box hedge, the flag ring ----------
  function forecourt() {
    const h = g + 0.14, out = Math.max(30, Math.hypot(flag[0] - fp(front, L / 2)[0], flag[1] - fp(front, L / 2)[1]) + 19);
    const lawnPts = ctx.areas.find(a => a.id === 'admin-forecourt')?.pts ?? ngon(flag, 13, 40);
    const plaza = [fp(front, v0 - 6, 0.2), ...ccw(offset(ccw(lawnPts), 9)).filter(q => (q[0] - fp(front, 0)[0]) * front.n[0] + (q[1] - fp(front, 0)[1]) * front.n[1] > 4), fp(front, v1 + 6, 0.2)];
    const apron = ccw([fp(front, -30, -Dc - 30), fp(front, -30, out + 5), fp(front, L + 22, out + 5), fp(front, L + 22, -Dc - 30)]);
    B.cap('lawn', apron, g + 0.05, ONE, 14);
    B.prism('plain', ccw(offset(ccw(lawnPts), 9)), g - 0.02, h - 0.02, rgb('#B9B4A8'), false); B.cap('plain', ccw(offset(ccw(lawnPts), 9)), h, rgb('#C98E80')); B.cap('plain', ccw(plaza), h, rgb('#C98E80'));
    const lawn = lawnPts;
    B.prism('plain', ccw(lawn), h, h + 0.18, rgb('#3E7A35'), false); B.cap('lawn', ccw(lawn), h + 0.12, ONE, 14);       // hedge edge, lawn
    ring(B, 'plain', flag, 5.8, 7.4, h + 0.16, rgb('#D9D2C2')); ring(B, 'plain', flag, 1.2, 2.6, h + 0.3, rgb('#CFC6B4'));
    const fa = Math.atan2(front.u[1], front.u[0]);
    for (const k of [-1, 1]) { const a = fa + (k > 0 ? 0 : Math.PI), q: XY = [flag[0] + Math.cos(a) * 12, flag[1] + Math.sin(a) * 12]; B.box('plain', q[0], q[1], 10, 1.6, fa, h + 0.13, h + 0.17, rgb('#D9D2C2')); }
    // flag mast with the tricolour
    B.prism('plain', ngon(flag, 1.1, 10), h, h + 0.5, rgb('#C9C6BC')); B.prism('plain', ngon(flag, 0.18, 6), h + 0.5, h + 26, rgb('#D8D8D4'));
    ([['#FF9933', 25.0], ['#FFFFFF', 23.8], ['#138808', 22.6]] as [string, number][]).forEach(([col, z]) => B.box('plain', flag[0] + Math.cos(fa) * 3.0, flag[1] + Math.sin(fa) * 3.0, 5.6, 0.12, fa, h + z, h + z + 1.2, rgb(col)));
    for (const s of [-2, L * 0.25, L * 0.75, L + 8]) for (const o of [9, out - 2]) { const q = fp(front, s, o); B.box('plain', q[0], q[1], 0.18, 0.18, 0, h, h + 5.5, rgb('#3A3F45')); B.box('plain', q[0], q[1], 1.4, 0.7, 0.3, h + 5.5, h + 5.6, rgb('#2C3F4A')); }
    for (const [s, o, t] of [[c0 - 9, 7, 0.4], [L + 4, 9, -0.2], [L + 8, 9, -0.2], [L * 0.75, out - 6, 0]] as [number, number, number][]) {
      const q = fp(front, s, o), a = fa + t; B.box('plain', q[0], q[1], 4.3, 1.9, a, h + 0.3, h + 1.05, rgb('#F4F4F0')); B.box('plain', q[0], q[1], 2.3, 1.7, a, h + 1.05, h + 1.6, rgb('#2C3F4A'), rgb('#F4F4F0'));
    }
  }
};
