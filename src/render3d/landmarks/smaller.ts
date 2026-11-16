// Smaller landmarks modelled from the real ones (Phase 3M v2, reference/real/<id>.md):
//   Sports Pavilion & Gym: a white one-storey block with a row of windows under a teal gable, a front cross-gable porch.
//   Main gate + guard room: the portal over the road (green hip roof on two rows of white columns, a raised clerestory, a name
//     fascia with two emblems), the white guard room under its inbound side, a brown sliding gate, a sandstone name wall.
//   Dr. Kalam Centre: cream panel cladding, tall glass windows in deep white frames, a glass canopy on white posts, a low
//     green hip with a deep white eave.
import type { XY } from '../../geo/grid';
import { partFootprint } from '../terrain';
import { ccw, rgb } from '../mesh';
import { gableRoof, hipRoof, sampledRoof } from '../roofs';
import {
  bevelCorners, centroidOf, emblem, faceOf, faceToward, facesOf, flat, fp, glassGrid, hipPart, panel, punched, ROOF_OPTS, SANDSTONE, WALL, type LandmarkBuilder,
} from './kit';

const PL = 0.5;

export const buildGym: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, g0 = g + PL, p = b.parts[0], H = g0 + 4.2, roof = sampledRoof('#4FA8A0');
  const pp = ccw(partFootprint(p)), fs = facesOf(pp), ent = ctx.entrances.find(e => e.buildingId === b.id)?.at ?? [p.cx, p.cy - 20];
  const long = Math.max(...fs.map(f => f.len));
  for (const f of fs) {
    B.wall('plain', f.a, f.b, g - 3, g0, rgb('#C9C3B6')); flat(B, f, 0, f.len, g0, H);
    if (f.len > long * 0.7) punched(B, f, 1, f.len - 1, g0, 1, 0, Math.round(f.len / 3.2), 1.4, 1.3, 1.2);
  }
  bevelCorners(B, pp, g0, H, WALL, 0.08);
  let top = gableRoof(B, p, H, roof, WALL);
  // front cross-gable porch toward the courts / entrance
  const courts = ctx.areas.find(a => a.id === 'courts-surround'), toCourts: XY = courts ? centroidOf(courts.pts) : ent;
  const f = faceToward(fs.filter(x => x.len > long * 0.7), toCourts), s = f.len / 2, a = Math.atan2(f.u[1], f.u[0]), c = fp(f, s, 1.6);
  B.box('plain', c[0], c[1], 5.2, 3.6, a, g0, H, WALL);
  glassGrid(B, faceOf(fp(f, s - 1.6, 3.42), fp(f, s + 1.6, 3.42)), 0, 3.2, g0 + 0.1, g0 + 2.7, 0.01, 2, 1, 0.12, rgb('#3F7FC0'));
  top = Math.max(top, gableRoof(B, { cx: c[0], cy: c[1], w: 3.6, d: 5.2, angle: (a * 180) / Math.PI }, H, roof, WALL));
  return { top, centre: [p.cx, p.cy] };
};

export const buildGuardRoom: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, p = b.parts[0], roof = sampledRoof('#2F7568');
  const gate = ctx.landmarks.find(l => l.id === 'main-gate')?.at ?? [p.cx, p.cy];
  // the portal spans the road at the gate: its long axis runs from the guard room across the gate point
  const dx = gate[0] - p.cx, dy = gate[1] - p.cy, d = Math.hypot(dx, dy) || 1, u: XY = d > 1 ? [dx / d, dy / d] : [Math.cos((p.angle * Math.PI) / 180), Math.sin((p.angle * Math.PI) / 180)];
  const W = 26, D = 8.5, Hc = g + 5.8, mid: XY = [gate[0], gate[1]], a = Math.atan2(u[1], u[0]), deg = (a * 180) / Math.PI;
  const at = (s: number, t: number): XY => [mid[0] + u[0] * s - u[1] * t, mid[1] + u[1] * s + u[0] * t];
  for (const s of [-W / 2 + 0.6, -W / 6, W / 6, W / 2 - 0.6]) for (const t of [-D / 2 + 0.6, D / 2 - 0.6]) { const q = at(s, t); B.box('plain', q[0], q[1], 0.75, 0.75, a, g - 0.5, Hc, rgb('#E6E1D6')); }
  B.box('plain', mid[0], mid[1], W + 0.4, D, a, Hc, Hc + 1.1, rgb('#F2F0EA'));                              // name fascia band
  const ff = faceOf(at(-W / 2 - 0.2, -D / 2 - 0.02), at(W / 2 + 0.2, -D / 2 - 0.02)), fb = faceOf(at(W / 2 + 0.2, D / 2 + 0.02), at(-W / 2 - 0.2, D / 2 + 0.02));
  for (const f of [ff, fb]) {
    panel(B, 'plain', f, f.len * 0.16, f.len * 0.84, 0.04, Hc + 0.35, Hc + 0.75, rgb('#5B6A63'));          // the lettering, as a band
    for (const k of [0.09, 0.91]) emblem(B, f, f.len * k, 0.06, Hc + 0.55, 0.5);
  }
  let top = hipRoof(B, { cx: mid[0], cy: mid[1], w: W + 0.4, d: D, angle: deg }, Hc + 1.1, roof, 1.6, 1.5, ROOF_OPTS);
  B.box('plain', mid[0], mid[1], 6.5, 3.2, a, top - 0.6, top + 1.3, rgb('#F2F0EA'));                     // the raised clerestory
  top = Math.max(top, hipRoof(B, { cx: mid[0], cy: mid[1], w: 6.5, d: 3.2, angle: deg }, top + 1.3, roof, 1.0, 0.8, ROOF_OPTS));
  // guard room (the data part), white with a door and a window
  const pp = ccw(partFootprint(p)), gfs = facesOf(pp), Hg = g + 3.0;
  for (const f of gfs) { flat(B, f, 0, f.len, g - 2, Hg); if (f.len > 3) glassGrid(B, f, f.len / 2 - 0.8, f.len / 2 + 0.8, g + 1.0, g + 2.2, 0.04, 2, 1, 0.08); }
  B.cap('plain', pp, Hg, rgb('#DAD6CC'));
  // sliding gate across the road, sandstone name wall beside it
  const gq = at(W / 2 - 3, 0); B.box('plain', gq[0], gq[1], 0.15, W * 0.55, a + Math.PI / 2, g, g + 2.2, rgb('#8A6A4C'));
  const wq = at(W / 2 + 6, -D / 2 - 2); B.box('stone', wq[0], wq[1], 9, 0.7, a, g, g + 1.8, [1, 1, 1], SANDSTONE);
  return { top, centre: [p.cx, p.cy] };
};

export const buildKalamCentre: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, g0 = g + PL, roof = sampledRoof('#3F8F80'), CLAD = rgb('#E8DCC6');
  const ent = ctx.entrances.find(e => e.buildingId === b.id)?.at;
  let top = g;
  b.parts.forEach((p, i) => {
    const pp = ccw(partFootprint(p)), fs = facesOf(pp), H = g0 + p.floors * 3.6;
    for (const f of fs) {
      B.wall('plain', f.a, f.b, g - 3, g0, rgb('#C9C3B6')); flat(B, f, 0, f.len, g0, H, CLAD);
      for (let z = g0 + 0.6; z < H; z += 0.6) panel(B, 'plain', f, 0, f.len, 0.015, z - 0.02, z + 0.02, rgb('#D6C9B1'));   // panel joints
      const n = Math.max(1, Math.round(f.len / 3.4));
      for (let k = 0; k < n; k++) { const s = (f.len * (k + 0.5)) / n; panel(B, 'plain', f, s - 0.85, s + 0.85, 0.12, g0 + 0.8, H - 0.9, rgb('#F6F4EE')); glassGrid(B, f, s - 0.6, s + 0.6, g0 + 1.0, H - 1.1, 0.16, 1, p.floors, 0.04); }
    }
    bevelCorners(B, pp, g0, H, CLAD, 0.1);
    top = Math.max(top, hipPart(B, p, H, roof, 1.4, 2.8, ROOF_OPTS));
    if (i === 0 && ent) { // glass canopy on white posts over the entrance
      const f = faceToward(fs, ent), s = Math.max(2.5, Math.min(f.len - 2.5, (ent[0] - f.a[0]) * f.u[0] + (ent[1] - f.a[1]) * f.u[1])), a = Math.atan2(f.u[1], f.u[0]);
      for (const k of [-1, 1]) { const q = fp(f, s + k * 2.2, 2.6); B.box('plain', q[0], q[1], 0.3, 0.3, a, g0, g0 + 3.3, rgb('#F6F4EE')); }
      panel(B, 'glass', f, s - 2.6, s + 2.6, 2.9, g0 + 3.3, g0 + 3.45, [0.7, 0.85, 0.9], 2, rgb('#CFE0E3'));
      glassGrid(B, f, s - 1.3, s + 1.3, g0 + 0.1, g0 + 2.9, 0.08, 2, 1, 0.1);
    }
  });
  return { top, centre: centroidOf(b.parts.map(p => [p.cx, p.cy] as XY)) };
};
