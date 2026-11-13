// Things drawn on top of the world: the selection ring, and the hooks later phases will drive
// (walking route, "you are here", ON AIR). Nothing here changes the layout.
import * as THREE from 'three';
import type { XY } from '../geo/grid';
import { Buckets, ccw, offset, rgb } from './mesh';
import { addRibbon } from './roads';
import type { SurfaceAt } from './ground';

export interface UserFix { at: XY; accuracy: number; heading?: number }
const YELLOW = '#FFD23F';
const flat = (color: string, opacity = 1) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const ring = (c: XY, r: number, n = 40): XY[] => Array.from({ length: n }, (_, i) => [c[0] + Math.cos((i / n) * Math.PI * 2) * r, c[1] + Math.sin((i / n) * Math.PI * 2) * r] as XY);

export class Markers {
  readonly group = new THREE.Group();
  private sel: THREE.Mesh | null = null; private route: THREE.Mesh | null = null; private user: THREE.Group | null = null;
  private selMat = flat(YELLOW, 0.9);
  constructor(scene: THREE.Scene, private h: SurfaceAt) { this.group.name = 'markers'; this.group.renderOrder = 5; scene.add(this.group); }
  private drop(o: THREE.Object3D | null) { if (!o) return; this.group.remove(o); o.traverse(m => (m as THREE.Mesh).geometry?.dispose()); }
  private band(B: Buckets, inner: XY[], outer: XY[], hAt: (p: XY) => number) {
    const n = inner.length;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; B.quad('m', [...inner[i], hAt(inner[i])], [...outer[i], hAt(outer[i])], [...outer[j], hAt(outer[j])], [...inner[j], hAt(inner[j])], rgb('#ffffff')); }
  }
  /** Yellow ring round the footprints of a building (on its pad), or a circle round a point. */
  select(t: { polys: XY[][]; level: number } | { at: XY } | null) {
    this.drop(this.sel); this.sel = null; if (!t) return;
    const B = new Buckets();
    if ('at' in t) this.band(B, ring(t.at, 4.2), ring(t.at, 5.6), p => this.h(p[0], p[1]) + 0.45);
    else for (const poly of t.polys) { const p = ccw(poly); this.band(B, offset(p, 1.0), offset(p, 2.3), () => t.level + 0.4); }
    this.sel = B.meshes(() => this.selMat)[0] ?? null; if (this.sel) { this.sel.renderOrder = 5; this.group.add(this.sel); }
  }
  /** Soft pulse of the selection ring; u runs 0 → 1 over the pulse, 1 = at rest. */
  pulse(u: number) { this.selMat.opacity = u >= 1 ? 0.9 : 0.55 + 0.45 * Math.abs(Math.cos(u * Math.PI * 3)); }

  // ---------- hooks for later phases ----------
  /** Walking route: a yellow ribbon just above the path. */
  setRoute(pts: XY[] | null) {
    this.drop(this.route); this.route = null; if (!pts || pts.length < 2) return;
    const B = new Buckets(); addRibbon(B, 'm', pts, 1.5, 0.5, rgb('#ffffff'), this.h);
    this.route = B.meshes(() => flat(YELLOW, 0.95))[0] ?? null; if (this.route) { this.route.renderOrder = 6; this.group.add(this.route); }
  }
  /** Blue "you are here" dot with its accuracy circle and, when known, a heading wedge (degrees clockwise from north). */
  setUser(u: UserFix | null) {
    this.drop(this.user); this.user = null; if (!u) return;
    const g = new THREE.Group(), z = this.h(u.at[0], u.at[1]), add = (poly: XY[], lift: number, mat: THREE.Material, order: number) => {
      const B = new Buckets(); B.cap('m', poly, z + lift, rgb('#ffffff')); const m = B.meshes(() => mat)[0]; m.renderOrder = order; g.add(m);
    };
    add(ring(u.at, Math.max(4, u.accuracy)), 0.5, flat('#2F7BFF', 0.18), 6);
    if (u.heading !== undefined) { const a = ((90 - u.heading) * Math.PI) / 180, p = (d: number, r: number): XY => [u.at[0] + Math.cos(a + d) * r, u.at[1] + Math.sin(a + d) * r]; add([u.at, p(-0.5, 9), p(0, 10.5), p(0.5, 9)], 0.55, flat('#2F7BFF', 0.45), 7); }
    add(ring(u.at, 3.2, 24), 0.6, flat('#FFFFFF'), 8); add(ring(u.at, 2.3, 24), 0.65, flat('#2F7BFF'), 9);
    this.user = g; this.group.add(g);
  }
  dispose() { this.drop(this.sel); this.drop(this.route); this.drop(this.user); this.group.removeFromParent(); }
}
