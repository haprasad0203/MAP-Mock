// New Academic Block, v3: every piece traced on H A's straight-down drone footage (20 Nov; scripts/nab-from-drone.mjs),
// each layout part carrying its role. Facade details from reference/real/nab.md (the homepage video) and the oblique
// drone pass (dji 0623 @0:18.8):
//   main     the long white block, 4 storeys (parapet about 14.5 m, measured from the wall's lean on the photo), flat roof
//   stone    the two sandstone blocks standing 4.8 m proud on the lawn side: a full-height glass bay at the inner end;
//            the SW one carries the IIM emblem and lettering
//   white    the white blocks either side of the entrance: two stacked windows, a louvre band, a flat canopy over a side door
//   atrium   the faceted glass entrance: two glass facets meeting at the front, a green flared band along their top that runs
//            back over the roof at 45° (the V seen from above)
//   tower    the two end towers, set back from the front: sandstone shafts a storey above the roof with a white-framed glass
//            strip, a white cornice, a green flared skirt and a white parapet crown with plant inside
//   pavilion three skylight pavilions on the centre line, square in plan and turned 45°: white with a dark clerestory band
//            under a green pyramid roof (the middle one 14.5 m, the side ones 10 m)
//   annex    the low hexagonal wing behind the middle, with two dark light courts
import type { XY } from '../../geo/grid';
import type { Part } from '../../geo/types';
import { partFootprint } from '../terrain';
import { ccw, rgb, type RGB } from '../mesh';
import { flatRoof, hipRoof, sampledRoof } from '../roofs';
import {
  bevelCorners, centroidOf, emblem, faceOf, facesOf, flat, fp, glassGrid, ONE, panel, punched, REAL_ROOF, SANDSTONE, sandstone, WALL, type Face, type LandmarkBuilder,
} from './kit';

const FHR = 3.35, PL = 0.6, FLOORS = 4;
const DECK = '#83827D', PLINTH_C = rgb('#C9C3B6'), DARKBAND = rgb('#2F464E'), LOUVRE = rgb('#33393B');
const ROOF_OPTS = { fascia: 0.4, ridge: true };

export const buildNab: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, g0 = g + PL, Hm = g0 + FLOORS * FHR, roof = sampledRoof(REAL_ROOF);
  const parts = b.parts, by = (role: Part['role']) => parts.filter(p => p.role === role);
  const main = by('main')[0];
  if (!main) return legacy();
  const mainPoly = ccw(partFootprint(main)), ang = (main.angle * Math.PI) / 180, U: XY = [Math.cos(ang), Math.sin(ang)];
  // the lawn side: across the axis, toward the stone blocks (they stand proud of the front)
  const cM = centroidOf(mainPoly), stones = by('stone'), cS = stones.length ? centroidOf(stones.flatMap(p => partFootprint(p))) : [cM[0] - U[1], cM[1] + U[0]] as XY;
  let N: XY = [-U[1], U[0]]; if ((cS[0] - cM[0]) * N[0] + (cS[1] - cM[1]) * N[1] < 0) N = [U[1], -U[0]];
  const isFront = (f: Face) => f.n[0] * N[0] + f.n[1] * N[1] > 0.9;
  let top = Hm + 0.5;

  // ---------- main block ----------
  for (const f of facesOf(mainPoly)) {
    B.wall('plain', f.a, f.b, g - 4, g0, PLINTH_C);
    flat(B, f, 0, f.len, g0, Hm);
    if (f.len > 5) punched(B, f, 0.9, f.len - 0.9, g0, FLOORS, FHR, Math.max(1, Math.round(f.len / 3.8)), 1.5, 1.55, 0.95);
  }
  bevelCorners(B, mainPoly, g0, Hm, WALL, 0.1);
  flatRoof(B, mainPoly, Hm, { roofHex: DECK, wall: WALL, angle: main.angle, seed: 37, clutter: true });

  // ---------- the lawn-side front pieces ----------
  const frontFace = (p: Part) => facesOf(ccw(partFootprint(p))).filter(isFront).sort((a, c) => c.len - a.len)[0];
  const mid = centroidOf(by('atrium').length ? partFootprint(by('atrium')[0]) : mainPoly), alongMid = mid[0] * U[0] + mid[1] * U[1];
  for (const p of stones) {
    const poly = ccw(partFootprint(p)), ff = frontFace(p), c = centroidOf(poly), west = c[0] * U[0] + c[1] * U[1] < alongMid;
    for (const f of facesOf(poly)) {
      B.wall('plain', f.a, f.b, g - 4, g0, PLINTH_C);
      if (f.n[0] * N[0] + f.n[1] * N[1] < -0.9) { flat(B, f, 0, f.len, g0, Hm); continue; } // the back, hidden inside the main block
      sandstone(B, f, 0, f.len, g0, Hm, 0.02);
    }
    if (ff) {
      // the full-height glass bay at the inner end (toward the entrance), 3 lights in a white frame
      const innerAtB = (ff.b[0] * U[0] + ff.b[1] * U[1] > ff.a[0] * U[0] + ff.a[1] * U[1]) === west, s0 = innerAtB ? ff.len - 4.0 : 0.8;
      panel(B, 'plain', ff, s0 - 0.25, s0 + 3.45, 0.12, g0 + 0.3, Hm - 0.6, WALL);
      glassGrid(B, ff, s0, s0 + 3.2, g0 + 0.5, Hm - 0.8, 0.2, 3, FLOORS * 2, 0.08);
      if (west) emblem(B, ff, innerAtB ? (ff.len - 4.0) / 2 : 4.2 + (ff.len - 4.2) / 2, 0.12, g0 + FLOORS * FHR * 0.62, 1.75, true);
      panel(B, 'plain', ff, -0.2, ff.len + 0.2, 0.3, Hm - 0.35, Hm + 0.5, WALL);                 // white coping
    }
    flatRoof(B, poly, Hm, { roofHex: DECK, wall: WALL, angle: main.angle, seed: 11, clutter: false });
  }
  for (const p of by('white')) {
    const poly = ccw(partFootprint(p)), ff = frontFace(p);
    for (const f of facesOf(poly)) { B.wall('plain', f.a, f.b, g - 4, g0, PLINTH_C); flat(B, f, 0, f.len, g0, Hm); }
    if (ff) {
      const c = ff.len / 2;
      for (const fl of [1, 2]) glassGrid(B, ff, c - 1.15, c + 1.15, g0 + fl * FHR + 0.95, g0 + fl * FHR + 2.55, 0.06, 2, 1, 0.14); // two stacked windows
      panel(B, 'plain', ff, 0.8, ff.len - 0.8, 0.06, g0 + 3.9, g0 + 4.4, LOUVRE);                     // dark louvre band
      glassGrid(B, ff, c - 2.4, c + 2.4, g0 + 0.1, g0 + 2.9, 0.08, 4, 1, 0.1);                         // glazed side door
      panel(B, 'plain', ff, c - 3.1, c + 3.1, 1.6, g0 + 3.1, g0 + 3.45, WALL);                         // flat canopy
      for (let k = 0; k < 3; k++) panel(B, 'plain', ff, c - 3.0, c + 3.0, 2.2 - k * 0.5, g + k * 0.2, g + (k + 1) * 0.2, rgb('#C7C1B4'), 0, rgb('#B9B2A4'), 2.2 - (k + 1) * 0.5); // steps
    }
    flatRoof(B, poly, Hm, { roofHex: DECK, wall: WALL, angle: main.angle, seed: 13, clutter: false });
  }
  for (const p of by('atrium')) {
    const poly = ccw(partFootprint(p)), facets = facesOf(poly).filter(f => f.n[0] * N[0] + f.n[1] * N[1] > 0.3 && f.n[0] * N[0] + f.n[1] * N[1] < 0.98);
    for (const f of facesOf(poly)) B.wall('plain', f.a, f.b, g - 4, g0, PLINTH_C);
    for (const f of facets) {
      glassGrid(B, f, 0.15, f.len - 0.15, g0 + 0.1, Hm - 0.3, 0.05, Math.max(2, Math.round(f.len / 1.6)), FLOORS * 2, 0.07); // the glass facet
      panel(B, 'plain', f, -0.35, 0.35, 0.4, g0, Hm + 0.4, WALL); panel(B, 'plain', f, f.len - 0.35, f.len + 0.35, 0.4, g0, Hm + 0.4, WALL); // white piers
      // the green flared band along the top of the facet, and on along the same line back over the roof from its back end
      // (away from the apex), as the V reads from above
      const fwd = (q: XY) => q[0] * N[0] + q[1] * N[1], apexAtB = fwd(f.b) > fwd(f.a), back = 9;
      const tail: [XY, XY] = apexAtB ? [[f.a[0] - f.u[0] * back, f.a[1] - f.u[1] * back], f.a] : [f.b, [f.b[0] + f.u[0] * back, f.b[1] + f.u[1] * back]];
      for (const [a, c] of [[f.a, f.b], tail] as [XY, XY][]) {
        const o0: XY = [a[0] + f.n[0] * 1.4, a[1] + f.n[1] * 1.4], o1: XY = [c[0] + f.n[0] * 1.4, c[1] + f.n[1] * 1.4];
        B.quad('plain', [a[0], a[1], Hm + 1.0], [c[0], c[1], Hm + 1.0], [o1[0], o1[1], Hm - 0.1], [o0[0], o0[1], Hm - 0.1], rgb(roof));
        B.quad('plain', [o0[0], o0[1], Hm - 0.1], [o1[0], o1[1], Hm - 0.1], [c[0], c[1], Hm + 1.0], [a[0], a[1], Hm + 1.0], rgb(roof));
      }
    }
    flatRoof(B, poly, Hm, { roofHex: DECK, wall: WALL, angle: main.angle, seed: 17, clutter: false });
  }

  // ---------- rooftop: stair heads behind the stone blocks, then the light wells (white rims round dark courts) ----------
  const mainFront = facesOf(mainPoly).filter(isFront).sort((a, c) => c.len - a.len)[0];
  if (mainFront) for (const p of stones) {
    const ff = frontFace(p); if (!ff) continue;
    const s = (q: XY) => (q[0] - mainFront.a[0]) * mainFront.u[0] + (q[1] - mainFront.a[1]) * mainFront.u[1];
    const s0 = Math.min(s(ff.a), s(ff.b)) - 1.2, s1 = Math.max(s(ff.a), s(ff.b)) - 0.6, w = s1 - s0;
    const c = fp(mainFront, (s0 + s1) / 2, -2.8), a = Math.atan2(mainFront.u[1], mainFront.u[0]);
    B.box('plain', c[0], c[1], w, 3.8, a, Hm, Hm + 3.0, WALL); B.box('plain', c[0], c[1], w + 0.3, 4.1, a, Hm + 3.0, Hm + 3.25, WALL);
    for (const k of [-0.2, 0.2]) { const q = fp(mainFront, (s0 + s1) / 2 + k * w, -0.85); B.box('plain', q[0], q[1], w * 0.24, 0.12, a, Hm + 0.9, Hm + 1.5, LOUVRE); }
    const lw = fp(mainFront, (s0 + s1) / 2 + w * 0.12, -8.2);
    B.box('plain', lw[0], lw[1], 7.4, 7.0, a, Hm, Hm + 1.1, WALL); B.box('plain', lw[0], lw[1], 6.6, 6.2, a, Hm + 0.05, Hm + 1.12, rgb('#3A3F42'));
    top = Math.max(top, Hm + 3.25);
  }

  // ---------- the skylight pavilions: white, dark clerestory, green pyramid; square and turned 45° ----------
  for (const p of by('pavilion')) {
    const poly = ccw(partFootprint(p)), side = Math.hypot(poly[1][0] - poly[0][0], poly[1][1] - poly[0][1]), c = centroidOf(poly), eave = g + 18.0;
    const pa = Math.atan2(poly[1][1] - poly[0][1], poly[1][0] - poly[0][0]);
    const inner = poly.map(q => [c[0] + (q[0] - c[0]) * 0.86, c[1] + (q[1] - c[1]) * 0.86] as XY);
    for (const f of facesOf(inner)) { flat(B, f, 0, f.len, Hm, eave); panel(B, 'plain', f, 0.4, f.len - 0.4, 0.04, eave - 1.7, eave - 0.5, DARKBAND); }
    const rise = (side / 2) * Math.tan((24 * Math.PI) / 180);
    top = Math.max(top, hipRoof(B, { cx: c[0], cy: c[1], w: side, d: side, angle: (pa * 180) / Math.PI }, eave, roof, rise, 0.6, ROOF_OPTS));
  }

  // ---------- the end towers ----------
  for (const p of by('tower')) {
    const poly = ccw(partFootprint(p)), c = centroidOf(poly), Ht = g + 17.6, w = Math.hypot(poly[1][0] - poly[0][0], poly[1][1] - poly[0][1]), d = Math.hypot(poly[2][0] - poly[1][0], poly[2][1] - poly[1][1]);
    const ta = Math.atan2(poly[1][1] - poly[0][1], poly[1][0] - poly[0][0]), deg = (ta * 180) / Math.PI;
    for (const f of facesOf(poly)) {
      B.wall('plain', f.a, f.b, g - 4, g0, PLINTH_C);
      sandstone(B, f, 0, f.len, g0, Ht, 0.03);
      const m = f.len / 2;
      panel(B, 'plain', f, m - 1.1, m + 1.1, 0.09, g0 + 0.4, Ht - 0.7, WALL);                     // white frame
      glassGrid(B, f, m - 0.65, m + 0.65, g0 + 0.8, Ht - 1.1, 0.13, 1, 9, 0.06);                  // narrow glass strip
    }
    bevelCorners(B, poly, g0, Ht, SANDSTONE, 0.1);
    for (const f of facesOf(poly)) panel(B, 'plain', f, -0.3, f.len + 0.3, 0.3, Ht - 0.5, Ht, WALL); // cornice
    const skirt = hipRoof(B, { cx: c[0], cy: c[1], w, d, angle: deg }, Ht, roof, 1.1, 1.0, ROOF_OPTS); // green flared skirt
    const crown = poly.map(q => [c[0] + (q[0] - c[0]) * 0.84, c[1] + (q[1] - c[1]) * 0.84] as XY), ch = skirt - 0.5;
    for (const f of facesOf(crown)) { flat(B, f, 0, f.len, Ht, ch + 1.6); B.wall('plain', f.b, f.a, ch + 0.2, ch + 1.6, rgb('#D9D6CF')); }
    B.cap('plain', crown, ch + 0.2, rgb('#8D9196'));
    for (const [k, l] of [[-0.25, -0.2], [0.2, 0.15], [-0.05, 0.25]] as [number, number][]) B.box('plain', c[0] + Math.cos(ta) * k * w - Math.sin(ta) * l * d, c[1] + Math.sin(ta) * k * w + Math.cos(ta) * l * d, 1.8, 1.4, ta, ch + 0.2, ch + 1.3, rgb('#2E3338'), rgb('#4B5157'));
    top = Math.max(top, ch + 1.6);
  }

  // ---------- the low annex at the back ----------
  for (const p of by('annex')) {
    const poly = ccw(partFootprint(p)), Ha = g + 4.8, c = centroidOf(poly);
    for (const f of facesOf(poly)) { B.wall('plain', f.a, f.b, g - 4, g0, PLINTH_C); flat(B, f, 0, f.len, g0, Ha); if (f.len > 5) punched(B, f, 0.8, f.len - 0.8, g0, 1, 4.0, Math.max(1, Math.round(f.len / 3.6)), 1.4, 1.6, 1.0); }
    flatRoof(B, poly, Ha, { roofHex: DECK, wall: WALL, angle: main.angle, seed: 23, clutter: false });
    for (const k of [-1, 1]) { const q: XY = [c[0] + U[0] * k * 6.5, c[1] + U[1] * k * 6.5]; B.box('plain', q[0], q[1], 5.6, 5.6, ang + Math.PI / 4, Ha + 0.02, Ha + 0.95, rgb('#3A3F42'), rgb('#3A3F42')); }
  }

  // the front plaza on the ?model= viewer (on the map the ground and hardscape.json draw it)
  if (ctx.forecourt && mainFront) { const pl = [fp(mainFront, -8, 5), fp(mainFront, mainFront.len + 8, 5), fp(mainFront, mainFront.len + 8, 17), fp(mainFront, -8, 17)]; B.cap('plain', ccw(pl), g + 0.12, rgb('#C98E80')); }
  return { top, centre: cM };

  /** Before the drone trace (no roles): plain white blocks with flat roofs, so an old layout still draws. */
  function legacy() {
    let t = Hm;
    for (const p of parts) { const poly = ccw(partFootprint(p)); for (const f of facesOf(poly)) flat(B, f, 0, f.len, g0, Hm); t = Math.max(t, flatRoof(B, poly, Hm, { roofHex: DECK, wall: WALL, angle: p.angle, seed: 3, clutter: false })); }
    return { top: t, centre: centroidOf(parts.flatMap(p => partFootprint(p))) };
  }
};
void ONE; void faceOf; void (null as unknown as RGB);
