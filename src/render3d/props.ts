// Static props, seeded and merged into the `plain` bucket: flag mast, gate, statue, water tank, street lamps,
// parked cars, a bus, goalposts, a floodlight, court lines and the roof of the covered walkway.
import type { XY } from '../geo/grid';
import { G, HALF, SIZE, type WorldModel } from '../render/world';
import { hash2 } from '../render/noise';
import { Buckets, rgb, type RGB } from './mesh';
import { hipRoof } from './roofs';
import { halfOf, resample } from './roads';
import type { SurfaceAt } from './ground';

const K = 'plain';
const WHITE = rgb('#F4F2EA'), STEEL = rgb('#59626B'), CONCRETE = rgb('#C9C6BC'), LAMP = rgb('#FFF3C4'), TEAL = rgb('#2E8C86');
const CAR_COLS = ['#F2F2EE', '#F2F2EE', '#D9DCDF', '#B33A32', '#2F5E9E', '#3A3F45', '#E8E2D0'].map(rgb), GLASS = rgb('#2C3F4A');
const ngon = (cx: number, cy: number, r: number, n: number): XY[] => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * Math.PI * 2) * r, cy + Math.sin((i / n) * Math.PI * 2) * r] as XY);
const cell = (x: number, y: number) => { const ix = Math.floor(x + HALF), iy = Math.floor(y + HALF); return ix < 0 || iy < 0 || ix >= SIZE || iy >= SIZE ? -1 : iy * SIZE + ix; };
const maskAt = (w: WorldModel, x: number, y: number) => { const q = cell(x, y); return q < 0 ? G.WILD : w.mask[q]; };
const inCampus = (w: WorldModel, x: number, y: number) => { const q = cell(x, y); return q >= 0 && w.inCampus[q] === 1; };

function car(B: Buckets, x: number, y: number, ang: number, h: number, col: RGB, bus = false) {
  if (bus) { B.box(K, x, y, 10.5, 2.5, ang, h + 0.4, h + 3.1, col, WHITE); B.box(K, x, y, 10.6, 2.56, ang, h + 1.6, h + 2.5, GLASS); return; }
  B.box(K, x, y, 4.2, 1.8, ang, h + 0.25, h + 1.0, col); B.box(K, x - Math.cos(ang) * 0.2, y - Math.sin(ang) * 0.2, 2.3, 1.62, ang, h + 1.0, h + 1.55, GLASS, col);
}

export function addProps(B: Buckets, world: WorldModel, h: SurfaceAt) {
  const lm = (id: string) => world.landmarks.find(l => l.id === id)?.at;

  // ---- flag mast with the tricolour ----
  const flag = lm('flag');
  if (flag) {
    const [x, y] = flag, g = h(x, y);
    B.prism(K, ngon(x, y, 1.6, 8), g, g + 0.5, CONCRETE); B.prism(K, ngon(x, y, 0.16, 6), g + 0.5, g + 19, WHITE);
    ([['#FF9933', 18.0], ['#FFFFFF', 17.2], ['#138808', 16.4]] as [string, number][]).forEach(([c, z]) => B.box(K, x + 2.0, y, 3.6, 0.1, 0, g + z, g + z + 0.8, rgb(c)));
  }

  // ---- main gate: a portal across the road with a long green roof and a smaller raised one ----
  const gate = lm('main-gate');
  if (gate) {
    let best = Infinity, ang = Math.PI / 2, at: XY = gate;
    for (const p of world.paths) if (p.kind === 'road') for (let i = 0; i + 1 < p.pts.length; i++) {
      const [ax, ay] = p.pts[i], [bx, by] = p.pts[i + 1], dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((gate[0] - ax) * dx + (gate[1] - ay) * dy) / l2)), qx = ax + dx * t, qy = ay + dy * t, d = Math.hypot(gate[0] - qx, gate[1] - qy);
      if (d < best) { best = d; ang = Math.atan2(dy, dx); at = [qx, qy]; }
    }
    if (best > 40) at = gate;
    const across = ang + Math.PI / 2, cx = Math.cos(across), cy = Math.sin(across), g = h(at[0], at[1]), W = 15;
    for (const s of [-1, 1]) for (const o of [5.2, 7.2]) B.box(K, at[0] + cx * s * o, at[1] + cy * s * o, 0.9, 0.9, across, g - 1, g + 5.6, rgb('#9A9FA3'));
    B.box(K, at[0], at[1], W + 1.5, 2.6, across, g + 5.6, g + 6.3, WHITE);
    const deg = (across * 180) / Math.PI;
    hipRoof(B, { cx: at[0], cy: at[1], w: W + 3, d: 5.4, angle: deg }, g + 6.3, '#3E8A4E');
    B.box(K, at[0], at[1], 7, 2.2, across, g + 7.2, g + 8.6, WHITE);
    hipRoof(B, { cx: at[0], cy: at[1], w: 8.6, d: 3.8, angle: deg }, g + 8.6, '#3E8A4E');
    // a bus waiting just inside the gate, at the side of the road
    const k = inCampus(world, at[0] + Math.cos(ang) * 26, at[1] + Math.sin(ang) * 26) ? 1 : -1;
    const bx = at[0] + Math.cos(ang) * 26 * k - cx * 2.2, by = at[1] + Math.sin(ang) * 26 * k - cy * 2.2;
    car(B, bx, by, ang, h(bx, by) + 0.2, rgb('#F2F2EE'), true);
  }

  // ---- Dr. Kalam statue: a small bronze figure on a pale plinth ----
  const st = lm('kalam-statue');
  if (st) {
    const [x, y] = st, g = h(x, y), bronze = rgb('#7A5A36');
    B.prism(K, ngon(x, y, 3.2, 8), g - 0.5, g + 0.4, CONCRETE); B.box(K, x, y, 2.2, 2.2, 0, g + 0.4, g + 2.4, rgb('#E9E4D6'));
    B.box(K, x, y, 0.95, 0.6, 0, g + 2.4, g + 4.5, bronze); B.box(K, x, y, 0.5, 0.5, 0, g + 4.5, g + 5.1, bronze);
  }

  // ---- water supply tank ----
  const tank = lm('water-tank');
  if (tank) { const [x, y] = tank, g = h(x, y); B.prism(K, ngon(x, y, 4.2, 12), g - 1.5, g + 6.5, CONCRETE, true, rgb('#B5B2A8')); B.prism(K, ngon(x, y, 1.1, 6), g + 6.5, g + 7.1, STEEL); }

  // ---- along the campus roads: lamps on both kinds, parked cars on the service lanes ----
  for (const p of world.paths) {
    if (p.kind !== 'road' && p.kind !== 'service') continue;
    const sm = resample(p.pts, () => 4), half = halfOf(p) + Math.max(p.pavementL ?? 0, p.pavementR ?? 0) * 0.5, seed = Math.round(p.pts[0][0] * 3 + p.pts[0][1] * 7);
    let nextLamp = 12, nextCar = 30, side = 1;
    sm.forEach((q, i) => {
      if (!inCampus(world, q.p[0], q.p[1])) return;
      const nAng = Math.atan2(q.n[1], q.n[0]), dir = nAng - Math.PI / 2; // normal is to the left of travel
      if (q.s >= nextLamp) {
        nextLamp = q.s + 38; side = -side;
        const x = q.p[0] + q.n[0] * side * (half + 1.7), y = q.p[1] + q.n[1] * side * (half + 1.7), c = maskAt(world, x, y);
        if (c !== G.BUILDING && c !== G.WATER && c !== G.ROAD && c !== G.SERVICE) {
          const g = h(x, y); B.box(K, x, y, 0.16, 0.16, 0, g - 0.5, g + 6.2, STEEL);
          B.box(K, x - q.n[0] * side * 0.7, y - q.n[1] * side * 0.7, 1.5, 0.14, nAng, g + 6.1, g + 6.25, STEEL);
          B.box(K, x - q.n[0] * side * 1.3, y - q.n[1] * side * 1.3, 0.7, 0.36, nAng, g + 5.86, g + 6.1, LAMP);
        }
      }
      if (p.kind === 'service' && q.s >= nextCar) {
        nextCar = q.s + 26 + hash2(i, seed, 81) * 60;
        if (hash2(i, seed, 82) < 0.4) {
          const s2 = hash2(i, seed, 83) < 0.5 ? 1 : -1, x = q.p[0] + q.n[0] * s2 * (half - 0.9), y = q.p[1] + q.n[1] * s2 * (half - 0.9);
          car(B, x, y, dir + (s2 > 0 ? Math.PI : 0), h(x, y) + 0.2, CAR_COLS[Math.floor(hash2(i, seed, 84) * CAR_COLS.length)]);
        }
      }
    });
  }

  // ---- sports: goalposts and a floodlight on the football ground, lines and nets on the courts ----
  for (const a of world.areas) {
    if (a.kind !== 'ground' && a.kind !== 'court') continue;
    const pts = a.pts.length > 3 && Math.hypot(a.pts[0][0] - a.pts[a.pts.length - 1][0], a.pts[0][1] - a.pts[a.pts.length - 1][1]) < 0.01 ? a.pts.slice(0, -1) : a.pts;
    if (pts.length !== 4) continue;
    const mid = (i: number): XY => [(pts[i % 4][0] + pts[(i + 1) % 4][0]) / 2, (pts[i % 4][1] + pts[(i + 1) % 4][1]) / 2];
    const len = (i: number) => Math.hypot(pts[(i + 1) % 4][0] - pts[i % 4][0], pts[(i + 1) % 4][1] - pts[i % 4][1]);
    const s0 = len(0) < len(1) ? 0 : 1, c: XY = [(pts[0][0] + pts[2][0]) / 2, (pts[0][1] + pts[2][1]) / 2], g = h(c[0], c[1]);
    const ends = [mid(s0), mid(s0 + 2)], along = Math.atan2(ends[1][1] - ends[0][1], ends[1][0] - ends[0][0]), acr = along + Math.PI / 2, Wd = len(s0);
    if (a.kind === 'ground') {
      ends.forEach((e, n) => {
        const k = n === 0 ? 1 : -1, x = e[0] + Math.cos(along) * 5 * k, y = e[1] + Math.sin(along) * 5 * k;
        for (const s of [-1, 1]) B.box(K, x + Math.cos(acr) * 3.66 * s, y + Math.sin(acr) * 3.66 * s, 0.16, 0.16, acr, g, g + 2.5, WHITE);
        B.box(K, x, y, 7.5, 0.16, acr, g + 2.44, g + 2.6, WHITE);
      });
      const fx = pts[0][0] + (c[0] - pts[0][0]) * 0.04, fy = pts[0][1] + (c[1] - pts[0][1]) * 0.04;
      B.box(K, fx, fy, 0.4, 0.4, 0, g - 0.5, g + 17, STEEL); B.box(K, fx, fy, 3, 0.5, along + 0.8, g + 17, g + 18.2, LAMP);
    } else {
      const line = (x: number, y: number, w: number, ang: number) => B.box(K, x, y, w, 0.22, ang, g + 0.03, g + 0.09, WHITE);
      for (let i = 0; i < 4; i++) { const m = mid(i); line(m[0], m[1], len(i), Math.atan2(pts[(i + 1) % 4][1] - pts[i][1], pts[(i + 1) % 4][0] - pts[i][0])); }
      line(c[0], c[1], Wd, acr);
      if (a.sport === 'volleyball' || a.sport === 'tennis') B.box(K, c[0], c[1], Wd, 0.08, acr, g + 0.9, g + 2.3, rgb('#2A2F35'));
      else ends.forEach((e, n) => {
        const k = n === 0 ? 1 : -1, x = e[0] + Math.cos(along) * 0.8 * k, y = e[1] + Math.sin(along) * 0.8 * k;
        B.box(K, x, y, 0.2, 0.2, 0, g, g + 3.2, STEEL); B.box(K, x + Math.cos(along) * 0.6 * k, y + Math.sin(along) * 0.6 * k, 1.8, 0.1, acr, g + 2.7, g + 3.8, WHITE);
      });
    }
  }

  // ---- covered walkway: a teal pitched roof on white posts ----
  for (const p of world.paths) {
    if (p.kind !== 'covered') continue;
    const sm = resample(p.pts, () => 3), R = 1.9;
    const pt = (q: typeof sm[0], o: number, z: number): [number, number, number] => [q.p[0] + q.n[0] * o, q.p[1] + q.n[1] * o, h(q.p[0], q.p[1]) + z];
    for (let i = 0; i + 1 < sm.length; i++) {
      const a = sm[i], b = sm[i + 1];
      B.quad(K, pt(a, -R, 2.9), pt(b, -R, 2.9), pt(b, 0, 3.7), pt(a, 0, 3.7), TEAL); B.quad(K, pt(a, 0, 3.7), pt(b, 0, 3.7), pt(b, R, 2.9), pt(a, R, 2.9), TEAL);
      if (i % 2 === 0) for (const s of [-1, 1]) { const x = a.p[0] + a.n[0] * s * 1.4, y = a.p[1] + a.n[1] * s * 1.4; B.box(K, x, y, 0.2, 0.2, 0, h(x, y) - 0.3, h(a.p[0], a.p[1]) + 2.95, WHITE); }
    }
  }
}
