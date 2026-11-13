// Small geometry builder: triangles are collected per material key, then turned into one mesh per key.
// Points are in world terms [x east, y north, h up]; they are converted to Three.js space (X, h, -y) on output.
import * as THREE from 'three';
import type { XY } from '../geo/grid';

export type P3 = [number, number, number]; // x, y, h
export type RGB = [number, number, number]; // linear
export type UV = [number, number];

const colCache = new Map<string, RGB>();
export function rgb(hex: string): RGB {
  let c = colCache.get(hex);
  if (!c) { const k = new THREE.Color(hex); c = [k.r, k.g, k.b]; colCache.set(hex, c); }
  return c;
}
export const WHITE: RGB = [1, 1, 1];
export const mul = (c: RGB, f: number): RGB => [c[0] * f, c[1] * f, c[2] * f];

interface Bucket { pos: number[]; nor: number[]; uv: number[]; col: number[] }

export class Buckets {
  readonly map = new Map<string, Bucket>();
  private b(key: string): Bucket {
    let b = this.map.get(key); if (!b) { b = { pos: [], nor: [], uv: [], col: [] }; this.map.set(key, b); } return b;
  }
  /** Triangle a, b, c: counter-clockwise seen from outside. */
  tri(key: string, a: P3, b: P3, c: P3, col: RGB, ua: UV = [0, 0], ub: UV = [0, 0], uc: UV = [0, 0]) {
    // normal in Three.js space
    const ax = a[0], ay = a[2], az = -a[1], ux = b[0] - ax, uy = b[2] - ay, uz = -b[1] - az, vx = c[0] - ax, vy = c[2] - ay, vz = -c[1] - az;
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz);
    if (l < 1e-7) return; // zero-area triangle (a hip roof that closes to a ridge)
    nx /= l; ny /= l; nz /= l;
    const k = this.b(key);
    for (const [p, u] of [[a, ua], [b, ub], [c, uc]] as [P3, UV][]) { k.pos.push(p[0], p[2], -p[1]); k.nor.push(nx, ny, nz); k.uv.push(u[0], u[1]); k.col.push(col[0], col[1], col[2]); }
  }
  /** Quad a, b, c, d: counter-clockwise seen from outside. */
  quad(key: string, a: P3, b: P3, c: P3, d: P3, col: RGB, ua: UV = [0, 0], ub: UV = [0, 0], uc: UV = [0, 0], ud: UV = [0, 0]) {
    this.tri(key, a, b, c, col, ua, ub, uc); this.tri(key, a, c, d, col, ua, uc, ud);
  }
  /** Vertical wall along a → b (outside on the right of travel), from h0 up to h1. u runs along the wall, v up. */
  wall(key: string, a: XY, b: XY, h0: number, h1: number, col: RGB, u0 = 0, u1 = 1, v0 = 0, v1 = 1) {
    this.quad(key, [a[0], a[1], h0], [b[0], b[1], h0], [b[0], b[1], h1], [a[0], a[1], h1], col, [u0, v0], [u1, v0], [u1, v1], [u0, v1]);
  }
  /** Flat cap over a polygon at height h (facing up). uvScale: metres per texture repeat. */
  cap(key: string, poly: XY[], h: number, col: RGB, uvScale = 4) {
    const pts = poly.map(p => new THREE.Vector2(p[0], p[1]));
    const ccw = !THREE.ShapeUtils.isClockWise(pts);
    for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(pts, [])) {
      const a = poly[i], b = poly[ccw ? j : k], c = poly[ccw ? k : j];
      this.tri(key, [a[0], a[1], h], [b[0], b[1], h], [c[0], c[1], h], col, [a[0] / uvScale, a[1] / uvScale], [b[0] / uvScale, b[1] / uvScale], [c[0] / uvScale, c[1] / uvScale]);
    }
  }
  /** Extruded polygon: walls h0..h1 and a top cap. No UVs (for plain materials). */
  prism(key: string, poly: XY[], h0: number, h1: number, col: RGB, top = true, topCol: RGB = col) {
    const p = ccw(poly);
    for (let i = 0; i < p.length; i++) this.wall(key, p[i], p[(i + 1) % p.length], h0, h1, col);
    if (top) this.cap(key, p, h1, topCol);
  }
  /** Box centred at (cx, cy), w along `angle` (radians), d across, from h0 to h1. */
  box(key: string, cx: number, cy: number, w: number, d: number, angle: number, h0: number, h1: number, col: RGB, topCol: RGB = col) {
    this.prism(key, rect(cx, cy, w, d, angle), h0, h1, col, true, topCol);
  }
  meshes(material: (key: string) => THREE.Material): THREE.Mesh[] {
    const out: THREE.Mesh[] = [];
    for (const [key, b] of this.map) {
      if (!b.pos.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(b.col, 3));
      const m = new THREE.Mesh(g, material(key)); m.name = key; out.push(m);
    }
    return out;
  }
  get triangles() { let n = 0; for (const b of this.map.values()) n += b.pos.length / 9; return n; }
}

export function area2(poly: XY[]) { let a = 0; for (let i = 0; i < poly.length; i++) { const q = poly[(i + 1) % poly.length]; a += poly[i][0] * q[1] - q[0] * poly[i][1]; } return a / 2; }
/** Same polygon, counter-clockwise, without a repeated closing point or zero-length edges. */
export function ccw(poly: XY[]): XY[] {
  let p = poly.filter((q, i) => { const n = poly[(i + 1) % poly.length]; return Math.hypot(q[0] - n[0], q[1] - n[1]) > 0.02; });
  if (p.length < 3) p = poly;
  return area2(p) < 0 ? [...p].reverse() : p;
}
export function rect(cx: number, cy: number, w: number, d: number, angle: number): XY[] {
  const c = Math.cos(angle), s = Math.sin(angle);
  return ([[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]] as XY[]).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c]);
}
export const centroid = (poly: XY[]): XY => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
/** Scale a polygon about a point. */
export const scaled = (poly: XY[], c: XY, f: number): XY[] => poly.map(p => [c[0] + (p[0] - c[0]) * f, c[1] + (p[1] - c[1]) * f]);
/** Push every edge of a counter-clockwise polygon outward by `d` metres (mitred corners, capped). */
export function offset(polyIn: XY[], d: number): XY[] {
  const p = ccw(polyIn), n = p.length, out: XY[] = [];
  for (let i = 0; i < n; i++) {
    const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n];
    let e1x = b[0] - a[0], e1y = b[1] - a[1], e2x = c[0] - b[0], e2y = c[1] - b[1];
    const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1; e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
    const n1x = e1y, n1y = -e1x, n2x = e2y, n2y = -e2x; // outward normals
    let mx = n1x + n2x, my = n1y + n2y; const ml = Math.hypot(mx, my);
    if (ml < 1e-3) { out.push([b[0] + n1x * d, b[1] + n1y * d]); continue; }
    mx /= ml; my /= ml; const k = Math.min(2.5, 1 / Math.max(0.2, mx * n1x + my * n1y));
    out.push([b[0] + mx * d * k, b[1] + my * d * k]);
  }
  return out;
}
