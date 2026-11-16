// Admin Block (Phase 3M, reference/style/BUILD_LANDMARKS_3D.md): built on the data footprint and painted with pieces cut
// from the approved render (reference/generated/raw/tycoon/admin_v1.png → public/campus-art/tycoon/facades/admin.webp).
// Part 2 (the big block) is the centre: a taller centre block with the largest hip roof and a glass bay over the door,
// between two lower linking wings with corridor balconies. Parts 0, 1 and 3 are the white end blocks.
// With no atlas (tests, a failed load) every wall falls back to the procedural textures.
import type { XY } from '../../geo/grid';
import { partFootprint } from '../terrain';
import { ccw, rgb } from '../mesh';
import { insetRoof } from '../roofs';
import {
  atlasOf, behind, bevelCorners, blankWall, centroidOf, corridorFloor, depthAt, emblem, faceOf, faceToward, facesOf, FH, fp, glassPanel, hipOver, hipPart,
  ngon, ONE, panel, piece, PLINTH, ring, roofOf, stonePanel, stripWall, tiled, WHITE, windowWall, type LandmarkBuilder,
} from './kit';

const MAIN = 2; // index of the centre part in the data

export const buildAdmin: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, A = atlasOf('admin'), roofHex = roofOf(A, b.roofColor);
  const flag = ctx.landmarks.find(l => l.id === 'flag')?.at ?? ctx.entrances.find(e => e.buildingId === b.id)?.at ?? [b.parts[0].cx, b.parts[0].cy - 40];
  let top = g;
  // atlas-or-procedural wall pieces
  const plaster = (f: Parameters<typeof blankWall>[1], s0: number, s1: number, h0: number, h1: number, out = 0) => tiled(B, A, 'plaster', f, s0, s1, h0, h1, out) || blankWall(B, f, s0, s1, h0, h1, WHITE, out);
  const stone = (f: Parameters<typeof blankWall>[1], s0: number, s1: number, out: number, h0: number, h1: number) => tiled(B, A, 'stone', f, s0, s1, h0, h1, out, false, rgb('#B9B2A4')) || stonePanel(B, f, s0, s1, out, h0, h1);

  // ---------- centre: part 2 ----------
  const main = b.parts[MAIN], poly = ccw(partFootprint(main)), fs = facesOf(poly), front = faceToward(fs, flag), L = front.len;
  // floors from the data: part 2 has 3 (the render shows the centre block one floor taller; the data wins), so the centre
  // block reads as the biggest through its roof and a 0.8 m raised parapet band
  const Hw = g + main.floors * FH, Hc = Hw + 0.8;                    // wing eaves, centre-block eaves
  const Df = Math.max(12, Math.min(26, Math.min(depthAt(poly, front, 1), depthAt(poly, front, L - 1)) - 4)); // depth of the front range
  const cw = Math.min(27, L * 0.45), s0 = (L - cw) / 2, s1 = s0 + cw;
  for (const f of fs) {
    B.wall('plain', f.a, f.b, g - 4, g + 0.5, PLINTH);
    // sides and back: the render's corridor-wing strips (back walls reuse the side strips until H A's videos arrive)
    if (f !== front && !stripWall(B, A, 'wing', f, 0, f.len, g + 0.5, Hw)) windowWall(B, f, 0, f.len, g, 3, WHITE);
  }
  bevelCorners(B, poly, g + 0.5, Hw, WHITE);
  // linking wings: three corridor floors with grey-green rails (real depth: recess, slab edge, glass rail, piers)
  for (const [a, c] of [[0, s0], [s1, L]] as [number, number][]) {
    for (let fl = 0; fl < 3; fl++) corridorFloor(B, front, a, c, g + fl * FH + (fl === 0 ? 0.3 : 0));
    hipOver(B, front, a - (a === 0 ? 0 : 0.4), c + (c === L ? 0 : 0.4), 0, Df, Hw, roofHex, 0.8, 3.6);
  }
  // rear range: a low hip over whatever lies behind the front range
  const rear = behind(poly, front, Df); if (rear.length >= 3) insetRoof(B, rear, Hw, roofHex);
  // centre block: stone either side of a two-storey glass curtain bay (0.5 m proud), two corridor floors above, then the big hip
  const gw = cw * 0.6, g0 = s0 + (cw - gw) / 2, g1 = g0 + gw;
  stone(front, s0, g0, 0.15, g, g + 2 * FH); stone(front, g1, s1, 0.15, g, g + 2 * FH);
  if (!tiled(B, A, 'curtain', front, g0, g1, g + 0.3, g + 2 * FH - 0.3, 0.5, true)) glassPanel(B, front, g0, g1, 0.8, g + 0.3, g + 2 * FH - 0.3, 1.9);
  panel(B, 'plain', front, g0 - 0.15, g1 + 0.15, 0.62, g + 2 * FH - 0.3, g + 2 * FH - 0.1, WHITE);                // white frame over the bay
  panel(B, 'plain', front, s0 - 0.3, s1 + 0.3, 1.5, g + 2 * FH - 0.3, g + 2 * FH + 0.3, rgb('#4A4E50'));        // dark band over the glass
  for (let i = 0; i <= 3; i++) { const s = g0 + (gw * i) / 3; panel(B, 'plain', front, s - 0.4, s + 0.4, 2.6, g, g + 2 * FH - 0.3, WHITE, 0, WHITE, 1.8); } // portico columns
  panel(B, 'plain', front, g0 - 0.8, g1 + 0.8, 2.9, g + 2 * FH - 0.9, g + 2 * FH - 0.3, WHITE);                 // portico beam
  for (let fl = 2; fl < main.floors; fl++) corridorFloor(B, front, s0, s1, g + fl * FH, cw / 5, rgb('#3E9AA0'));
  plaster(front, s0, s1, Hw, Hc, 0.5);
  // sides and back of the centre block where it stands above the wings
  const cFace = (a: XY, c: XY) => { const f = faceOf(a, c); if (!stripWall(B, A, 'wing', f, 0, f.len, Hw - 0.6, Hc, 0, { base: false })) B.wall('heroBlank', a, c, Hw - 0.6, Hc, WHITE, 0, 1, 0, (Hc - Hw + 0.6) / FH); };
  cFace(fp(front, s0, -Df), fp(front, s0, 0.5)); cFace(fp(front, s1, 0.5), fp(front, s1, -Df)); cFace(fp(front, s1, -Df), fp(front, s0, -Df));
  // the roof rises at most 35 % of the wall height
  top = Math.max(top, hipOver(B, front, s0, s1, -0.5, Df, Hc, roofHex, 1.1, 0.35 * (Hc - g)));

  // ---------- end blocks: parts 0, 1 and 3 ----------
  b.parts.forEach((p, idx) => {
    if (idx === MAIN) return;
    const pp = ccw(partFootprint(p)), pf = facesOf(pp), show = faceToward(pf, flag), H = g + p.floors * FH;
    for (const f of pf) {
      B.wall('plain', f.a, f.b, g - 4, g + 0.4, PLINTH);
      if (f.len > 3) stone(f, 0, f.len, 0.12, g + 0.4, g + 3.3); else B.wall('plain', f.a, f.b, g + 0.4, g + 3.3, WHITE);
      if (f === show) {
        plaster(f, 0, f.len, g + 3.3, H);
        const sx = f.len * 0.3;                                                                                       // vertical teal strip
        if (!piece(B, A, 'teal-strip', f, sx - 0.8, sx + 0.8, g + 3.9, H - 1.6, 0.14)) glassPanel(B, f, sx - 1.1, sx + 1.1, 0.14, g + 3.9, H - 1.6, 1.6);
        if (idx === 3) { const e = f.len * 0.68, eh = H - 3.6; if (!piece(B, A, 'emblem', f, e - 1.25, e + 1.25, eh - 1.55, eh + 1.55, 0.08)) emblem(B, f, e, 0.16, eh, 2.3); } // IIM emblem, east block
        else if (!piece(B, A, 'door', f, f.len * 0.55, f.len * 0.55 + 4.6, g + 0.45, g + 3.15, 0.2)) glassPanel(B, f, f.len * 0.55, f.len * 0.55 + 5, 0.2, g + 0.5, g + 3.1, 1.6); // glazed door, west block
      } else if (f.len > 6) { if (!stripWall(B, A, 'end-side', f, 0, f.len, g + 3.3, H, 0, { base: false })) { blankWall(B, f, 0, f.len, g + 3.3, g + FH, WHITE); windowWall(B, f, 0, f.len, g + FH, 3, WHITE, 5.2); } }
      else plaster(f, 0, f.len, g + 3.3, H);
    }
    bevelCorners(B, pp, g + 0.4, H, WHITE);
    top = Math.max(top, hipPart(B, p, H, roofHex, 0.8, 4.4));
  });

  if (ctx.forecourt) forecourt();
  const c = centroidOf(poly);
  return { top, centre: c };

  // ---------- forecourt: pink-paved plaza, round lawn with a ring path, flag mast, lamps, cars ----------
  function forecourt() {
    const h = g + 0.14, out = Math.max(30, Math.hypot(flag[0] - fp(front, L / 2)[0], flag[1] - fp(front, L / 2)[1]) + 19);
    const plaza = [fp(front, -4, 0.2), fp(front, -4, out), fp(front, L + 10, out), fp(front, L + 10, 0.2)];
    const apron = ccw([fp(front, -30, -Df - 26), fp(front, -30, out + 5), fp(front, L + 22, out + 5), fp(front, L + 22, -Df - 26)]);   // the grass block the render stands on
    B.cap('lawn', apron, g + 0.05, ONE, 14);
    B.prism('plain', ccw(plaza), g - 0.02, h - 0.02, rgb('#B9B4A8'), false); B.cap('brick', ccw(plaza), h, ONE, 5);
    const R = 12.5;
    B.cap('lawn', ngon(flag, R, 40), h + 0.1, ONE, 14); ring(B, 'plain', flag, R, R + 0.7, h + 0.16, rgb('#CFC9BA'));
    ring(B, 'plain', flag, 3.4, 5.4, h + 0.14, rgb('#D9D0BC')); ring(B, 'plain', flag, 5.4, 5.9, h + 0.18, rgb('#BDB6A6'));
    for (let k = 0; k < 4; k++) { const a = Math.atan2(front.u[1], front.u[0]) + (k * Math.PI) / 2; B.box('plain', flag[0] + Math.cos(a) * 9.2, flag[1] + Math.sin(a) * 9.2, 7.6, 2.2, a, h + 0.05, h + 0.14, rgb('#D9D0BC')); }
    // flag mast with the tricolour
    B.prism('plain', ngon(flag, 1.1, 10), h, h + 0.5, rgb('#C9C6BC')); B.prism('plain', ngon(flag, 0.16, 6), h + 0.5, h + 17, rgb('#D8D8D4'));
    const fa = Math.atan2(front.u[1], front.u[0]);
    ([['#FF9933', 16.0], ['#FFFFFF', 15.2], ['#138808', 14.4]] as [string, number][]).forEach(([col, z]) => B.box('plain', flag[0] + Math.cos(fa) * 2.0, flag[1] + Math.sin(fa) * 2.0, 3.7, 0.12, fa, h + z, h + z + 0.8, rgb(col)));
    // lamp posts along the plaza edge and parked white cars near the wings
    for (const s of [-2, L * 0.25, L * 0.75, L + 8]) for (const o of [9, out - 2]) { const q = fp(front, s, o); B.box('plain', q[0], q[1], 0.18, 0.18, 0, h, h + 4.2, rgb('#3A3F45')); B.box('plain', q[0], q[1], 0.5, 0.5, 0, h + 4.2, h + 4.7, rgb('#FFF3C4')); }
    for (const [s, o, t] of [[s0 - 9, 7, 0.4], [s1 + 9, 7, -0.4], [L * 0.75, out - 6, 0]] as [number, number, number][]) {
      const q = fp(front, s, o), a = fa + t; B.box('plain', q[0], q[1], 4.3, 1.9, a, h + 0.3, h + 1.05, rgb('#F4F4F0')); B.box('plain', q[0], q[1], 2.3, 1.7, a, h + 1.05, h + 1.6, rgb('#2C3F4A'), rgb('#F4F4F0'));
    }
  }
};
