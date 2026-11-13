// New Academic Block, modelled after the approved render (reference/generated/raw/tycoon/nab_v3.png) on the data footprint.
// Part 1 is the long slab: its lawn-side face carries the teal glass atrium between two tan stone panels.
// Parts 0 and 2 are the end blocks, each with one tall white tower under a green-capped pavilion. Part 3 is a plain annex.
import type { XY } from '../../geo/grid';
import { partFootprint } from '../terrain';
import { ccw, rgb } from '../mesh';
import { flatRoof, hipRoof } from '../roofs';
import { visibleSpan, centroidOf, emblem, faceToward, facesOf, FH, fp, glassPanel, ONE, panel, PLINTH, stonePanel, WHITE, windowWall, blankWall, type Face, type LandmarkBuilder } from './kit';

const SLAB = 1;
const DECK = '#CFCAC2';

export const buildNab: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, H = g + 4 * FH;
  const slab = b.parts[SLAB], poly = ccw(partFootprint(slab)), fs = facesOf(poly);
  const lawn = ctx.areas.find(a => a.id === 'nab-lawn'), toward: XY = lawn ? centroidOf(lawn.pts) : [slab.cx + 60, slab.cy - 30];
  const front = faceToward(fs, toward), L = front.len;
  // the end blocks stand forward of the slab, so the entrance front is laid out on the stretch between them
  const [v0, v1] = visibleSpan(front, b.parts.filter((_, i) => i !== SLAB).map(p => ccw(partFootprint(p)))), Lv = v1 - v0, mid = (v0 + v1) / 2;
  let top = H;

  const deck = (pts: XY[], angle: number, seed: number) => flatRoof(B, pts, H, { roofHex: DECK, wall: WHITE, angle, seed, clutter: false });
  const walls = (faces: Face[], skip?: Face) => { for (const f of faces) { B.wall('plain', f.a, f.b, g - 4, g + 0.4, PLINTH); if (f !== skip) windowWall(B, f, 0, f.len, g + 0.4 - 0.4, 4, WHITE, 4.4); } };

  // ---------- the slab ----------
  walls(fs, front); deck(poly, slab.angle, 7);
  const aw = Math.min(10, Lv * 0.24), sw = Math.min(9.5, Lv * 0.2), gap = 0.8;                                   // atrium width, stone panel width
  const a0 = mid - aw / 2, a1 = mid + aw / 2;
  windowWall(B, front, 0, a0 - gap - sw - 2.6, g, 4, WHITE, 4.4); windowWall(B, front, a1 + gap + sw + 2.6, L, g, 4, WHITE, 4.4);
  blankWall(B, front, a0 - gap - sw - 2.6, a1 + gap + sw + 2.6, g, H, WHITE);
  // teal glass atrium, standing proud, under a flat white roof slab
  glassPanel(B, front, a0, a1, 1.6, g + 0.3, H + 0.9, 2.2);
  panel(B, 'plain', front, a0 - 1.2, a1 + 1.2, 2.8, H + 0.9, H + 1.4, WHITE);
  panel(B, 'plain', front, a0 + 1.5, a1 - 1.5, 4.6, g + 3.3, g + 3.7, WHITE);                                  // door canopy
  for (const s of [a0 + 1.9, a1 - 1.9]) panel(B, 'plain', front, s - 0.25, s + 0.25, 4.4, g, g + 3.3, WHITE, 0, WHITE, 3.9);
  // tan stone panels both sides, the left one with the emblem; a teal strip outside each
  stonePanel(B, front, a0 - gap - sw, a0 - gap, 0.5, g, H + 0.5); stonePanel(B, front, a1 + gap, a1 + gap + sw, 0.5, g, H + 0.5);
  emblem(B, front, a0 - gap - sw / 2, 0.56, g + 2.85 * FH, 2.2);
  glassPanel(B, front, a0 - gap - sw - 2.3, a0 - gap - sw - 0.3, 0.3, g + 0.6, H - 0.4, 1.9); glassPanel(B, front, a1 + gap + sw + 0.3, a1 + gap + sw + 2.3, 0.3, g + 0.6, H - 0.4, 1.9);
  // side entrances with flat white canopies
  if (Lv > 46) for (const s of [v0 + Lv * 0.1, v1 - Lv * 0.1]) { panel(B, 'plain', front, s - 3.4, s + 3.4, 3.6, g + 3.2, g + 3.6, WHITE); for (const k of [-3, 3]) panel(B, 'plain', front, s + k - 0.22, s + k + 0.22, 3.4, g, g + 3.2, WHITE, 0, WHITE, 2.96); }
  // a few small grey rooftop units
  const ang = Math.atan2(front.u[1], front.u[0]);
  for (const s of [L * 0.3, L * 0.68]) { const q = fp(front, s, -slab.d * 0.55); B.box('plain', q[0], q[1], 3.4, 2.4, ang, H, H + 0.35, rgb('#8F9396')); B.box('plain', q[0], q[1], 3.0, 2.0, ang, H + 0.35, H + 1.7, rgb('#A9ADAE'), rgb('#8F9396')); }

  // ---------- end blocks, annex and the two towers ----------
  b.parts.forEach((p, idx) => {
    if (idx === SLAB) return;
    const pp = ccw(partFootprint(p)); walls(facesOf(pp)); deck(pp, p.angle, idx * 13);
    if (!p.stoneTowers) return;
    // the tower stands at the block's outer front corner: furthest along the slab, on the lawn side
    const c = centroidOf(pp), side = (c[0] - fp(front, mid)[0]) * front.u[0] + (c[1] - fp(front, mid)[1]) * front.u[1] > 0 ? 1 : -1;
    let best = pp[0], sc = -Infinity;
    for (const q of pp) { const v = side * (q[0] * front.u[0] + q[1] * front.u[1]) + 0.7 * (q[0] * front.n[0] + q[1] * front.n[1]); if (v > sc) { sc = v; best = q; } }
    const d = Math.hypot(c[0] - best[0], c[1] - best[1]) || 1, T = 6.4, tc: XY = [best[0] + ((c[0] - best[0]) / d) * (T * 0.72), best[1] + ((c[1] - best[1]) / d) * (T * 0.72)];
    top = Math.max(top, tower(tc, T));
  });
  return { top, centre: centroidOf(poly) };

  /** White stair tower one floor higher than the block, with a teal strip, a green skirt roof and an open pavilion under a green cap. */
  function tower(c: XY, T: number): number {
    const Ht = g + 5 * FH + 0.6, deg = (ang * 180) / Math.PI, sq = (half: number): XY[] => [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => [c[0] + front.u[0] * x * half - front.n[0] * y * half, c[1] + front.u[1] * x * half - front.n[1] * y * half] as XY);
    const tf = facesOf(sq(T / 2)), show = faceToward(tf, [c[0] + front.n[0] * 50, c[1] + front.n[1] * 50]);
    for (const f of tf) {
      B.wall('plain', f.a, f.b, g - 4, g + 0.4, PLINTH); blankWall(B, f, 0, f.len, g + 0.4, Ht, WHITE);
      if (f === show) glassPanel(B, f, T / 2 - 0.7, T / 2 + 0.7, 0.14, g + 2.2, Ht - 2.2, 1.4);
      else for (let fl = 1; fl < 5; fl++) panel(B, 'plain', f, T / 2 - 0.55, T / 2 + 0.55, 0.06, g + fl * FH + 0.9, g + fl * FH + 2.2, rgb('#2F464E'));
    }
    const skirt = hipRoof(B, { cx: c[0], cy: c[1], w: T, d: T, angle: deg }, Ht, b.roofColor, 0.9, 1.0);      // green skirt roof
    const p0 = skirt - 0.1, p1 = p0 + 2.7, in4 = sq(T / 2 - 1.1);
    B.prism('plain', sq(T / 2 - 0.6), p0 - 0.6, p0 + 0.25, WHITE);
    for (const q of in4) B.box('plain', q[0], q[1], 0.55, 0.55, ang, p0, p1, WHITE);                             // pavilion posts
    B.prism('plain', sq(T / 2 - 0.5), p1, p1 + 0.35, WHITE);
    return hipRoof(B, { cx: c[0], cy: c[1], w: T - 1.0, d: T - 1.0, angle: deg }, p1 + 0.35, b.roofColor, 2.2, 0.9);
  }
};
