// Things drawn on top of the world: the selection ring, and the hooks later phases will drive
// (walking route, "you are here", ON AIR). Nothing here changes the layout.
import * as THREE from 'three';
import type { XY } from '../geo/grid';
import { Buckets, ccw, offset, rgb } from './mesh';
import { addRibbon } from './roads';
import type { SurfaceAt } from './ground';

export interface UserFix { at: XY; accuracy: number; heading?: number }
const YELLOW = '#FFD23F';
const flat = (color: string, opacity = 1, onTop = false) => new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false, depthTest: !onTop, toneMapped: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
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
    const B = new Buckets(); addRibbon(B, 'm', pts, 2.8, 0.5, rgb('#ffffff'), this.h); // wide enough to read at the campus zoom
    // a dark dashed centre line on the yellow trail, so the route reads without relying on colour alone (Phase 3B)
    const D = new Buckets(); let s = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      for (let t = 0; t < L; t += 1) { const on = Math.floor((s + t) / 3.5) % 2 === 0; if (!on) continue; const t1 = Math.min(L, t + 1); addRibbon(D, 'm', [[a[0] + ((b[0] - a[0]) * t) / L, a[1] + ((b[1] - a[1]) * t) / L], [a[0] + ((b[0] - a[0]) * t1) / L, a[1] + ((b[1] - a[1]) * t1) / L]], 0.9, 0.56, rgb('#ffffff'), this.h); }
      s += L;
    }
    // drawn on top of everything: the route often runs under the Scholar's Path roof or behind a building
    const g = new THREE.Group(), trail = B.meshes(() => flat(YELLOW, 0.9, true))[0], dash = D.meshes(() => flat('#0F4D32', 0.95, true))[0];
    if (trail) { trail.renderOrder = 20; g.add(trail); } if (dash) { dash.renderOrder = 21; g.add(dash); }
    this.route = g as unknown as THREE.Mesh; this.group.add(g);
  }
  /** Blue "you are here" dot with its accuracy circle and, when known, a heading wedge (degrees clockwise from north). */
  setUser(u: UserFix | null) {
    this.drop(this.user); this.user = null; if (!u) return;
    const g = new THREE.Group(), z = this.h(u.at[0], u.at[1]), add = (poly: XY[], lift: number, mat: THREE.Material, order: number) => {
      const B = new Buckets(); B.cap('m', poly, z + lift, rgb('#ffffff')); const m = B.meshes(() => mat)[0]; m.renderOrder = order + 20; (mat as THREE.MeshBasicMaterial).depthTest = false; g.add(m);
    };
    add(ring(u.at, Math.max(4, u.accuracy)), 0.5, flat('#2F7BFF', 0.18), 6);
    if (u.heading !== undefined) { const a = ((90 - u.heading) * Math.PI) / 180, p = (d: number, r: number): XY => [u.at[0] + Math.cos(a + d) * r, u.at[1] + Math.sin(a + d) * r]; add([u.at, p(-0.5, 12), p(0, 15), p(0.5, 12)], 0.55, flat('#2F7BFF', 0.45), 7); }
    add(ring(u.at, 6.0, 28), 0.6, flat('#FFFFFF'), 8); add(ring(u.at, 4.4, 28), 0.65, flat('#2F7BFF'), 9); // big enough to read at the campus zoom (Phase 3B)
    this.user = g; this.group.add(g);
  }
  dispose() { this.drop(this.sel); this.drop(this.route); this.drop(this.user); this.group.removeFromParent(); }
}
