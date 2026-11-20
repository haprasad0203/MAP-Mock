// The upright parts of public/data/hardscape.json in 3D (Phase 3M v2): retaining and terrace walls, hedges, fences, railings,
// floodlights, steps, raised flower beds, tree lines and lamp rows. Flat surfaces (plazas, parking, terraces, paths) are
// painted into the ground texture instead (src/render/world.ts). Everything is draped on the terrain and goes into `plain`.
import type { XY } from '../geo/grid';
import type { Hardscape } from '../geo/types';
import { Buckets, rgb, type RGB } from './mesh';
import type { SurfaceAt } from './ground';

type Item = Hardscape['items'][number];
const K = 'plain';
const col = (it: Item, fallback: string): RGB => rgb(typeof it.colour === 'string' ? it.colour : fallback);

/** Points every `step` metres along a polyline, with the segment direction. */
function along(pts: XY[], step: number): { p: XY; a: number }[] {
  // evenly spaced over the whole line (not per segment), so short segments never bunch the posts together
  const out: { p: XY; a: number }[] = []; let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) total += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
  const n = Math.max(1, Math.round(total / step)), gap = total / n;
  let seg = 0, segStart = 0;
  for (let k = 0; k <= n; k++) {
    const s = k * gap;
    while (seg + 1 < pts.length - 1 && segStart + Math.hypot(pts[seg + 1][0] - pts[seg][0], pts[seg + 1][1] - pts[seg][1]) < s) { segStart += Math.hypot(pts[seg + 1][0] - pts[seg][0], pts[seg + 1][1] - pts[seg][1]); seg++; }
    const [ax, ay] = pts[seg], [bx, by] = pts[Math.min(seg + 1, pts.length - 1)], L = Math.hypot(bx - ax, by - ay) || 1, t = Math.min(1, Math.max(0, (s - segStart) / L));
    out.push({ p: [ax + (bx - ax) * t, ay + (by - ay) * t], a: Math.atan2(by - ay, bx - ax) });
  }
  return out;
}
/** A strip of boxes following a polyline: w wide, from ground-sink to height, each box spanning one step. */
function run(B: Buckets, pts: XY[], h: SurfaceAt, w: number, height: number, c: RGB, top?: RGB, step = 2.5, sink = 0.6) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / step)), a = Math.atan2(by - ay, bx - ax);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n, x = ax + (bx - ax) * t, y = ay + (by - ay) * t, g = h(x, y);
      B.box(K, x, y, L / n + 0.05, w, a, g - sink, g + height, c, top ?? c);
    }
  }
}

export function addHardscape(B: Buckets, items: Item[], h: SurfaceAt) {
  for (const it of items) {
    const pts = it.pts ?? it.poly;
    switch (it.type) {
      case 'retaining-wall': case 'wall':
        if (pts) run(B, pts, h, it.width ?? 0.4, it.height ?? 1.2, col(it, '#9C8F7A'), rgb('#B8AE9C'), 2.5, 1.5);
        if (pts && it.railing) for (const q of along(pts, 2.2)) { const g = h(q.p[0], q.p[1]) + (it.height ?? 1.2); B.box(K, q.p[0], q.p[1], 0.08, 0.08, q.a, g, g + 1.0, rgb('#E8E8E2')); }
        if (pts && it.railing) run(B, pts.map(p => p), (x, y) => h(x, y) + (it.height ?? 1.2) + 0.95, 0.07, 0.07, rgb('#E8E8E2'), undefined, 2.5, 0);
        break;
      case 'hedge':
        if (pts) run(B, pts, h, it.width ?? 0.8, it.height ?? 0.7, col(it, '#3E7A35'), rgb('#4A8A3E'), 2, 0.2);
        break;
      case 'flower-bed':
        if (pts) { run(B, pts, h, it.width ?? 1.4, it.height ?? 0.5, rgb('#9C8F7A'), rgb('#6E9A3E'), 2, 0.3); run(B, pts, (x, y) => h(x, y) + 0.5, (it.width ?? 1.4) - 0.3, 0.25, rgb('#D8607A'), rgb('#C94F6B'), 3, 0); }
        break;
      case 'fence': {
        if (!pts) break;
        const H = it.height ?? 2.4, c = col(it, '#3A4148');
        for (const q of along(pts, 3)) { const g = h(q.p[0], q.p[1]); B.box(K, q.p[0], q.p[1], 0.1, 0.1, q.a, g - 0.3, g + H, c); }
        run(B, pts, (x, y) => h(x, y) + H - 0.06, 0.06, 0.06, c, undefined, 3, 0);
        run(B, pts, (x, y) => h(x, y) + 0.2, 0.03, H - 0.3, [c[0] * 1.4, c[1] * 1.4, c[2] * 1.4], undefined, 3, 0); // the mesh, as a thin dark screen
        break;
      }
      case 'floodlight': {
        const at = it.at as XY | undefined; if (!at) break;
        const g = h(at[0], at[1]), H = it.height ?? 18;
        B.box(K, at[0], at[1], 0.5, 0.5, 0, g - 0.5, g + H, rgb('#9AA1A8'));
        B.box(K, at[0], at[1], 2.4, 0.5, 0.6, g + H, g + H + 1.4, rgb('#4A5056'), rgb('#FFF3C4'));
        break;
      }
      case 'steps': {
        if (!pts || pts.length < 2) break;
        const [a, b] = pts, w = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]), n = (it.steps as number) ?? 4, depth = (it.depth as number) ?? 1.4;
        const c: XY = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], g = h(c[0], c[1]), nx = -Math.sin(ang), ny = Math.cos(ang);
        for (let k = 0; k < n; k++) { const o = depth * (1 - k / n) * 0.5; B.box(K, c[0] + nx * o, c[1] + ny * o, w, depth * (1 - k / n), ang, g - 0.3, g + ((it.height ?? 0.6) * (k + 1)) / n, col(it, '#BEB8AC')); }
        break;
      }
      case 'tree-line':
        if (pts) for (const q of along(pts, (it.spacing as number) ?? 4)) {
          const g = h(q.p[0], q.p[1]), H = it.height ?? 4;
          B.box(K, q.p[0], q.p[1], 0.25, 0.25, 0, g, g + 0.8, rgb('#5A4632'));
          for (let k = 0; k < 3; k++) { const r = (1.1 - k * 0.3) * (H / 4); B.box(K, q.p[0], q.p[1], r * 2, r * 2, q.a + k * 0.4, g + 0.6 + k * (H / 4), g + 0.6 + (k + 1.2) * (H / 4), col(it, '#2F5F35')); }
        }
        break;
      case 'light-row':
        if (pts) for (const q of along(pts, (it.spacing as number) ?? 14)) {
          const g = h(q.p[0], q.p[1]), H = it.height ?? 6;
          B.box(K, q.p[0], q.p[1], 0.14, 0.14, 0, g - 0.3, g + H, rgb('#5A6066'));
          B.box(K, q.p[0], q.p[1], 1.2, 0.6, q.a, g + H, g + H + 0.08, rgb('#2C3F4A'));
        }
        break;
      case 'terrace':
        if (pts) run(B, pts, h, 0.35, it.height ?? 0.8, rgb('#9C8F7A'), rgb('#B8AE9C'), 2, 0.8);     // the stone edge of each grass terrace
        break;
      case 'covered-walkway': {
        if (!pts || it.id === 'scholars-path') break; // the Scholar's Path is the covered-walk path, roofed in props.ts
        const w = (it.width ?? 3) / 2, H = it.height ?? 2.9, roof = col(it, '#3FA39C');
        for (const q of along(pts, 4)) for (const s of [-1, 1]) { const x = q.p[0] - Math.sin(q.a) * s * w * 0.9, y = q.p[1] + Math.cos(q.a) * s * w * 0.9, g = h(x, y); B.box(K, x, y, 0.16, 0.16, 0, g - 0.3, g + H, rgb('#F2F2EE')); }
        for (let i = 0; i + 1 < pts.length; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[i + 1], L = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.ceil(L / 3)), a = Math.atan2(by - ay, bx - ax), nx = -Math.sin(a), ny = Math.cos(a);
          for (let k = 0; k < n; k++) {
            const p0: XY = [ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n], p1: XY = [ax + ((bx - ax) * (k + 1)) / n, ay + ((by - ay) * (k + 1)) / n], g0 = h(p0[0], p0[1]) + H, g1 = h(p1[0], p1[1]) + H;
            for (const s of [-1, 1]) {
              const e0: [number, number, number] = [p0[0] + nx * s * (w + 0.3), p0[1] + ny * s * (w + 0.3), g0 - 0.2], e1: [number, number, number] = [p1[0] + nx * s * (w + 0.3), p1[1] + ny * s * (w + 0.3), g1 - 0.2];
              const r0: [number, number, number] = [p0[0], p0[1], g0 + 0.6], r1: [number, number, number] = [p1[0], p1[1], g1 + 0.6];
              B.quad(K, e0, e1, r1, r0, roof); B.quad(K, r0, r1, e1, e0, roof);
            }
          }
        }
        break;
      }
      case 'open-tank': { // concrete tank walls, a flat water surface and (for a plant) rows of dark equipment across it
        const poly = it.poly; if (!poly || poly.length < 3) break;
        const H = it.height ?? 1.6, g = Math.min(...poly.map(q => h(q[0], q[1])));
        run(B, [...poly, poly[0]], () => g, 0.35, H, col(it, '#C9C6BD'), rgb('#E8E6DF'), 2.5, 0.8);
        B.cap(K, poly, g + H - 0.35, rgb(typeof it.water === 'string' ? it.water : '#3E9EA3'));
        const n = Number(it.units ?? 0); if (!n) break;
        const [a, b, c, d] = poly, mid = (p: XY, q: XY, t: number): XY => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        const lenAB = Math.hypot(b[0] - a[0], b[1] - a[1]), lenBC = Math.hypot(c[0] - b[0], c[1] - b[1]);
        const [s0, s1, e0, e1] = lenAB >= lenBC ? [a, b, d, c] : [b, c, a, d]; // units run across the long side
        for (let k = 0; k < n; k++) {
          const t = (k + 0.5) / n, p0 = mid(s0, s1, t), p1 = mid(e0, e1, t), cx = (p0[0] + p1[0]) / 2, cy = (p0[1] + p1[1]) / 2, ang = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
          B.box(K, cx, cy, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) * 0.7, Math.max(lenAB, lenBC) / n * 0.35, ang, g + H - 0.4, g + H + 0.5, rgb('#3A4046'), rgb('#4A5258'));
        }
        break;
      }
      default: break; // plazas, parking, courtyards, paths, the lake edge: ground texture; walkways and the gate: their own builders
    }
  }
}
