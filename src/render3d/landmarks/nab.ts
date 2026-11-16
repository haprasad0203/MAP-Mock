// New Academic Block, modelled from the REAL building (Phase 3M v2, reference/real/nab.md; photos win over the renders).
// The SE (lawn) front is symmetric and laid out along the whole building by the fractions measured on the straight-on
// homepage-video still (t = 0 at the SW end, 1 at the NE end):
//   tower 0–.083 · stone panel .083–.26 (glass bay at its inner side, emblem on the SW one) · white block .26–.45 (flat
//   canopy over a side entrance, two stacked windows) · faceted glass atrium .45–.538 under the big green pyramid ·
//   mirror image to the NE tower.
// 3 storeys at the lawn front (about 11 m to the parapet; data says 4: proposal in LAYOUT_CHECK), flat roof with a parapet,
// two tall white stair heads; sandstone towers about 18 m with a white box storey and green caps.
import type { XY } from '../../geo/grid';
import { partFootprint } from '../terrain';
import { ccw, rgb } from '../mesh';
import { flatRoof, hipRoof, sampledRoof } from '../roofs';
import {
  behind, bevelCorners, centroidOf, emblem, faceOf, facesOf, flat, fp, glassGrid, ONE, panel, punched, REAL_ROOF, SANDSTONE, sandstone, WALL, type Face, type LandmarkBuilder,
} from './kit';

const FHR = 3.7, PL = 0.6;
const DECK = '#CFCAC2';
const ROOF_OPTS = { fascia: 0.45, ridge: true };

export const buildNab: LandmarkBuilder = (B, b, ctx) => {
  const g = b.groundElev ?? 0, g0 = g + PL, Hm = g0 + 3 * FHR, roof = sampledRoof(REAL_ROOF);
  const polys = b.parts.map(p => ccw(partFootprint(p)));
  const lawn = ctx.areas.find(a => a.id === 'nab-lawn'), toward: XY = lawn ? centroidOf(lawn.pts) : [b.parts[1].cx + 60, b.parts[1].cy - 30];
  // the building's long axis (the slab's) and the extent of all parts along it
  const ang = (b.parts[1].angle * Math.PI) / 180, U: XY = [Math.cos(ang), Math.sin(ang)], along = (q: XY) => q[0] * U[0] + q[1] * U[1];
  const all = polys.flat(), A0 = Math.min(...all.map(along)), A1 = Math.max(...all.map(along)), Lb = A1 - A0;
  // V: across the building toward the lawn. The front is drawn as a skin at the most-forward point of the footprints over
  // each bay, so the photo's continuous front reads even where the data parts step (the end blocks stand ahead of the slab).
  const c = centroidOf(all), V: XY = (() => { const v: XY = [-U[1], U[0]]; return (toward[0] - c[0]) * v[0] + (toward[1] - c[1]) * v[1] > 0 ? v : [-v[0], -v[1]]; })();
  const across = (q: XY) => q[0] * V[0] + q[1] * V[1];
  const P = (a: number, d: number): XY => [U[0] * a + V[0] * d, U[1] * a + V[1] * d];
  // the photo's rhythm: the white centre at the slab's front line, the stone panels and towers 4 m forward of it; every
  // footprint is clipped at the stone line (the data's SW annex, part 3, would otherwise stand 10 m out from the front)
  const Dw = Math.max(...polys[1].map(across)), Ds = Dw + 4;
  const clip = (() => { let f = faceOf(P(A0 - 20, Ds), P(A1 + 20, Ds)); if (f.n[0] * V[0] + f.n[1] * V[1] < 0) f = faceOf(P(A1 + 20, Ds), P(A0 - 20, Ds)); return f; })();
  const parts = polys.map(pp => behind(pp, clip, 0)).filter(pp => pp.length >= 3);
  /** Draw fn on a front plane at depth d (across, toward the lawn) between fractions t0 and t1; back = d minus the slab front. */
  const on = (t0: number, t1: number, fn: (f: Face, s0: number, s1: number, back: number) => void, d = Dw) => {
    const a = P(A0 + t0 * Lb, d), b2 = P(A0 + t1 * Lb, d);
    let f = faceOf(a, b2); if (f.n[0] * V[0] + f.n[1] * V[1] < 0) f = faceOf(b2, a);
    fn(f, 0, f.len, d - Dw);
  };
  let top = Hm;

  // ---------- the block: white walls, windows on the sides and back, flat roof ----------
  parts.forEach((pp, i) => {
    for (const f of facesOf(pp)) {
      B.wall('plain', f.a, f.b, g - 4, g0, rgb('#C9C3B6'));
      flat(B, f, 0, f.len, g0, Hm);
      if (Math.abs(f.n[0] * V[0] + f.n[1] * V[1]) < 0.9 || f.n[0] * V[0] + f.n[1] * V[1] < 0) if (f.len > 6) punched(B, f, 0.8, f.len - 0.8, g0, 3, FHR, Math.max(1, Math.round(f.len / 4.2)), 1.5, 1.5, 1.0);
    }
    flatRoof(B, pp, Hm, { roofHex: DECK, wall: WALL, angle: b.parts[1].angle, seed: i * 11 + 3, clutter: i === 1 });
    bevelCorners(B, pp, g0, Hm, WALL, 0.12);
  });

  // ---------- the SE front, bay by bay ----------
  for (const [t0, t1, inner] of [[0.083, 0.26, 0.206], [0.73, 0.91, 0.736]] as [number, number, number][]) {
    on(t0, t1, (f, s0, s1, back) => panel(B, 'stone', f, s0, s1, 0, g0, Hm + 0.9, ONE, 2.6, SANDSTONE, -back), Ds); // stone panel to the parapet top
    const left = inner < 0.5;
    on(left ? inner : inner, left ? t1 - 0.004 : inner + 0.049, (f, s0, s1) => glassGrid(B, f, s0, s1, g0 + 0.4, Hm - 0.8, 0.25, 3, 6), Ds); // glass bay
  }
  on(0.14, 0.17, (f, s0, s1) => emblem(B, f, (s0 + s1) / 2, 0.15, g0 + 8.3, 1.75, true), Ds);                  // emblem on the SW panel
  for (const [t0, t1, c0, c1, w] of [[0.26, 0.45, 0.317, 0.397, 0.363], [0.538, 0.73, 0.6, 0.68, 0.69]] as number[][]) {
    on(t0, t1, (f, s0, s1, back) => panel(B, 'plain', f, s0, s1, 0.02, g0, Hm, WALL, 0, WALL, -back));      // white block front skin
    on(c0, c1, (f, s0, s1) => {                                                                            // flat canopy on two posts
      panel(B, 'plain', f, s0, s1, 2.2, g0 + 3.2, g0 + 3.6, WALL);
      for (const s of [s0 + 0.5, s1 - 0.5]) panel(B, 'plain', f, s - 0.2, s + 0.2, 2.0, g0, g0 + 3.2, WALL, 0, WALL, 1.6);
      glassGrid(B, f, s0 + 0.8, s1 - 0.8, g0 + 0.1, g0 + 2.9, 0.08, 4, 1, 0.1);
      for (let k = 0; k < 4; k++) panel(B, 'plain', f, s0 - 0.5, s1 + 0.5, 2.6 - k * 0.5, g + k * 0.15, g + (k + 1) * 0.15, rgb('#C7C1B4'), 0, rgb('#B9B2A4'), 2.6 - (k + 1) * 0.5);
    });
    on(w - 0.012, w + 0.012, (f, s0, s1) => { const c = (s0 + s1) / 2; for (const z of [g0 + FHR + 1.0, g0 + 2 * FHR + 1.0]) glassGrid(B, f, c - 1.1, c + 1.1, z, z + 1.7, 0.06, 2, 1, 0.14); });
    on(t0 + 0.02, c0 - 0.005, (f, s0, s1) => panel(B, 'plain', f, s0, s1, 0.06, g0 + 2.4, g0 + 2.9, rgb('#33393B')));    // dark louvre strip
  }
  // the faceted glass atrium, 1 m proud, up into the white pavilion under the green pyramid
  let atriumTop = Hm;
  on(0.45, 0.538, (f, s0, s1, back) => {
    const w = s1 - s0, k = w * 0.18, ht = g0 + 15.6, z0 = g0 + 0.1;
    panel(B, 'plain', f, s0 - 0.5, s0, 1.0, g0, ht, WALL, 0, WALL, -back); panel(B, 'plain', f, s1, s1 + 0.5, 1.0, g0, ht, WALL, 0, WALL, -back); // white piers
    glassGrid(B, f, s0 + k, s1 - k, z0, ht, 1.0, 4, 7, 0.12);                                                         // front facet
    const facet = (a: XY, c: XY) => { const ff = faceOf(a, c); glassGrid(B, ff, 0.05, ff.len - 0.05, z0, ht, 0.02, 1, 7, 0.08); };
    facet(fp(f, s0, 0.02), fp(f, s0 + k, 1.0)); facet(fp(f, s1 - k, 1.0), fp(f, s1, 0.02));
    // pavilion: a white box with a dark clerestory band, then the largest green pyramid
    const c = fp(f, (s0 + s1) / 2, -2.6), d = 7.2, deg = (Math.atan2(f.u[1], f.u[0]) * 180) / Math.PI;
    B.box('plain', c[0], c[1], w + 1.0, d, Math.atan2(f.u[1], f.u[0]), Hm, ht + 1.6, WALL);
    B.box('plain', c[0] + f.n[0] * 0.05, c[1] + f.n[1] * 0.05, w + 1.05, d + 0.05, Math.atan2(f.u[1], f.u[0]), ht + 0.3, ht + 1.1, rgb('#2F464E'));
    atriumTop = hipRoof(B, { cx: c[0], cy: c[1], w: w + 1.0, d, angle: deg }, ht + 1.6, roof, 3.2, 1.3, ROOF_OPTS);
  });
  top = Math.max(top, atriumTop);
  // two tall white stair heads behind the white blocks, with vertical slots
  for (const [t0, t1] of [[0.31, 0.38], [0.62, 0.68]]) on(t0, t1, (f, s0, s1) => {
    const c = fp(f, (s0 + s1) / 2, -2.8), a = Math.atan2(f.u[1], f.u[0]);
    B.box('plain', c[0], c[1], s1 - s0, 5.2, a, Hm, g + 19.5, WALL);
    for (const k of [-0.6, 0.6]) { const q = fp(f, (s0 + s1) / 2 + k, -0.15); B.box('plain', q[0], q[1], 0.35, 0.1, a, g + 16.3, g + 18.6, rgb('#5C6466')); }
    top = Math.max(top, g + 19.5);
  });
  // small green-hipped rooftop pavilions behind the stone panels
  for (const t of [0.2, 0.8]) on(t - 0.02, t + 0.02, (f, s0, s1) => {
    const c = fp(f, (s0 + s1) / 2, -6), a = Math.atan2(f.u[1], f.u[0]);
    B.box('plain', c[0], c[1], 5, 5, a, Hm, Hm + 2.6, WALL); B.box('plain', c[0], c[1], 5.05, 5.05, a, Hm + 1.2, Hm + 2.0, rgb('#2F464E'));
    hipRoof(B, { cx: c[0], cy: c[1], w: 5, d: 5, angle: (a * 180) / Math.PI }, Hm + 2.6, roof, 1.6, 0.8, ROOF_OPTS);
  });
  // the two end towers: sandstone shafts with a white-framed glass strip, a green flared band, a white box, a green cap
  for (const [t0, t1] of [[0, 0.083], [0.917, 1]]) on(t0, t1, (f, s0, s1) => { top = Math.max(top, tower(f, s0, s1)); }, Ds + 0.3);
  // the front plaza and the NAB lawn (?model= viewer only; on the map the ground and hardscape.json draw them)
  if (ctx.forecourt) {
    on(-0.03, 1.03, f => {
      const h = g + 0.12, pl = [fp(f, 0, 4.5), fp(f, f.len, 4.5), fp(f, f.len, 14), fp(f, 0, 14)], lw = [fp(f, -20, 14), fp(f, f.len + 20, 14), fp(f, f.len + 20, 75), fp(f, -20, 75)];
      B.cap('lawn', ccw(lw), g + 0.05, ONE, 14); B.prism('plain', ccw(pl), g - 0.02, h, rgb('#B9B4A8'), false); B.cap('plain', ccw(pl), h, rgb('#C98E80'));
      for (let k = 0; k < 9; k++) { const q = fp(f, (f.len * (k + 0.5)) / 9, 12.5); B.box('plain', q[0], q[1], 0.16, 0.16, 0, h, h + 5.5, rgb('#3A3F45')); }
    }, Ds);
  }
  return { top, centre: centroidOf(polys[1]) };

  function tower(f: Face, s0: number, s1: number): number {
    const w = s1 - s0, d = w, Ht = g + 17.8, a = Math.atan2(f.u[1], f.u[0]), deg = (a * 180) / Math.PI;
    const sq: XY[] = [fp(f, s0, 0.4), fp(f, s1, 0.4), fp(f, s1, 0.4 - d), fp(f, s0, 0.4 - d)];
    for (const tf of facesOf(sq)) {
      B.wall('plain', tf.a, tf.b, g - 4, g0, rgb('#C9C3B6'));
      sandstone(B, tf, 0, tf.len, g0, Ht, 0.02);
      const m = tf.len / 2;
      panel(B, 'plain', tf, m - 1.15, m + 1.15, 0.08, g0 + 0.3, Ht - 0.6, WALL);                       // white frame
      glassGrid(B, tf, m - 0.7, m + 0.7, g0 + 0.8, Ht - 1.0, 0.12, 1, 8, 0.06);                        // glass strip
    }
    bevelCorners(B, sq, g0, Ht, rgb('#B8936A'), 0.1);
    const c = centroidOf(sq);
    panel(B, 'plain', faceOf(sq[0], sq[1]), -0.3, w + 0.3, 0.35, Ht - 0.6, Ht, WALL);                      // cornice
    const band = hipRoof(B, { cx: c[0], cy: c[1], w, d, angle: deg }, Ht, roof, 0.9, 1.0, ROOF_OPTS);    // green flared band
    const bx = band - 0.4;
    B.box('plain', c[0], c[1], w - 1.2, d - 1.2, a, bx, bx + 3.0, WALL);                                 // white box storey
    B.box('plain', c[0], c[1], w - 1.15, d - 1.15, a, bx + 1.0, bx + 1.9, rgb('#2F464E'));               // its window band
    return hipRoof(B, { cx: c[0], cy: c[1], w: w - 1.2, d: d - 1.2, angle: deg }, bx + 3.0, roof, 1.4, 0.9, ROOF_OPTS);
  }
};
