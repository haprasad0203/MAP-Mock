import type { XY } from '../geo/grid';
import type { Building, Category } from '../geo/types';
import { LEVELS, project, unproject, depth, tierOf, type Rot, type Tier } from './iso';
import { CHUNK, renderChunk } from './ground';
import { buildingSprite, propSprite, treeSprite, type Sprite } from './sprites';
import { C } from './palette';
import type { WorldModel } from './world';

import type { EngineOptions, IMapEngine, Layers, Pin, View } from './engineApi';
export type { EngineOptions, Layers, Pin, View } from './engineApi';

const CAT_COLOR: Record<string, string> = { venue: '#0F4D32', food: '#FF8A3D', hostel: '#3E6FB8', sports: '#2F8A6A', service: '#5E6872', help: '#B5463A', landmark: '#7A5536', staff: '#77808A' };
const PIXEL = 2; // CSS px per art pixel

interface Ent { kind: 'b' | 't' | 'p'; d: number; x: number; y: number; b?: Building; size?: number; v?: number; prop?: string }

export class MapEngine implements IMapEngine {
  readonly kind = '2d' as const;
  private ctx: CanvasRenderingContext2D;
  private fb = document.createElement('canvas'); private fbg = this.fb.getContext('2d')!;
  private chunks = new Map<string, HTMLCanvasElement>();
  private sprites = new Map<string, Sprite>();
  private ents: Ent[] = []; private entsRot: Rot | -1 = -1;
  private dpr = 1; private W = 0; private H = 0;
  view: View;
  private vScale = 1; // continuous visual zoom between discrete levels (pinch / wheel / fly)
  private dirty = true; private raf = 0; private anim: ((t: number) => boolean) | null = null;
  private vel: XY = [0, 0]; private fade: { cv: HTMLCanvasElement; t0: number } | null = null;
  filter: Category | 'all' = 'all'; selected: string | null = null; pins: Pin[] = [];
  layers: Layers = { labels: true, illustrated: true, trees: true };
  private labelBoxes: { x: number; y: number; w: number; h: number; id: string }[] = [];

  constructor(private canvas: HTMLCanvasElement, public world: WorldModel, view: View | null, private opts: EngineOptions = {}) {
    this.ctx = canvas.getContext('2d')!;
    this.view = view ?? { cx: world.centre[0], cy: world.centre[1], level: 1, rot: 0 };
    this.bindInput();
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  // ---------- public API ----------
  get k() { return LEVELS[this.view.level]; }
  get tier(): Tier { return tierOf(this.k * this.vScale); }
  invalidate() { this.dirty = true; this.kick(); }
  setFilter(f: Category | 'all') { this.filter = f; this.invalidate(); }
  setSelected(id: string | null) { this.selected = id; this.invalidate(); }
  setLayers(l: Partial<Layers>) {
    const resetSprites = l.illustrated !== undefined && l.illustrated !== this.layers.illustrated;
    this.layers = { ...this.layers, ...l }; if (resetSprites) this.sprites.clear(); this.invalidate();
  }
  rotate(dir: 1 | -1 = 1) {
    const snap = document.createElement('canvas'); snap.width = this.canvas.width; snap.height = this.canvas.height; snap.getContext('2d')!.drawImage(this.canvas, 0, 0);
    this.view.rot = (((this.view.rot + dir) % 4) + 4) % 4 as Rot; this.fade = { cv: snap, t0: performance.now() }; this.emitView(); this.invalidate();
  }
  recentre() { this.flyTo([this.world.centre[0] + 20, this.world.centre[1]], this.W < 700 ? 2 : 3); }
  /** Fly so `at` lands at screen fraction (fx, fy) — lets callers keep it clear of the bottom sheet. */
  flyTo(at0: XY, level?: number, ms = 650, fx = 0.5, fy = 0.5) {
    const from = { x: this.view.cx, y: this.view.cy, z: Math.log(this.k * this.vScale) };
    const lv = level ?? Math.max(this.view.level, 5); const toZ = Math.log(LEVELS[lv]);
    const kk = LEVELS[lv], dx = (0.5 - fx) * this.W / PIXEL, dy = (0.5 - fy) * this.H / PIXEL;
    const o = unproject(dx, dy, this.view.rot, kk); const at: XY = [at0[0] + o[0], at0[1] + o[1]];
    const t0 = performance.now(); this.vel = [0, 0];
    this.anim = (t) => {
      const u = Math.min(1, (t - t0) / ms), e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
      this.view.cx = from.x + (at[0] - from.x) * e; this.view.cy = from.y + (at[1] - from.y) * e;
      this.setContinuousZoom(Math.exp(from.z + (toZ - from.z) * e));
      if (u >= 1) { this.view.level = lv; this.vScale = 1; this.emitView(); return false; }
      return true;
    };
    this.kick();
  }
  zoomBy(f: number, anchor?: XY) { this.zoomAround(f, anchor ?? [this.W / 2, this.H / 2]); this.settleZoom(); }
  /** World position of a CSS-pixel point on the canvas. */
  screenToWorld(px: number, py: number): XY {
    const [bx, by] = this.centreBuf(); const s = PIXEL * this.vScale;
    return unproject(bx + (px - this.W / 2) / s, by + (py - this.H / 2) / s, this.view.rot, this.k);
  }
  worldToScreen(x: number, y: number, z = 0): XY {
    const [bx, by] = this.centreBuf(); const [sx, sy] = project(x, y, z, this.view.rot, this.k); const s = PIXEL * this.vScale;
    return [(sx - bx) * s + this.W / 2, (sy - by) * s + this.H / 2];
  }
  destroy() { cancelAnimationFrame(this.raf); this.raf = 0; }

  // ---------- internals ----------
  private centreBuf(): XY { return project(this.view.cx, this.view.cy, 0, this.view.rot, this.k); }
  private emitView() { this.opts.onView?.({ ...this.view, tier: this.tier }); }
  private resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = this.canvas.getBoundingClientRect(); this.W = r.width; this.H = r.height;
    this.canvas.width = Math.round(r.width * this.dpr); this.canvas.height = Math.round(r.height * this.dpr);
    this.invalidate();
  }
  private kick() { if (!this.raf) this.raf = requestAnimationFrame(t => this.frame(t)); }
  private frame(t: number) {
    this.raf = 0; let more = false;
    if (this.anim) { more = this.anim(t); if (!more) this.anim = null; this.dirty = true; }
    if (Math.abs(this.vel[0]) + Math.abs(this.vel[1]) > 0.02 && !this.dragging) {
      this.panBy(this.vel[0] * 16, this.vel[1] * 16); this.vel = [this.vel[0] * 0.92, this.vel[1] * 0.92]; more = true;
      if (Math.abs(this.vel[0]) + Math.abs(this.vel[1]) <= 0.02) this.persist();
    }
    if (this.fade) more = true;
    if (this.dirty || more) { this.draw(t); this.dirty = false; }
    if (more || this.anim) this.kick();
  }
  private persist() { try { sessionStorage.setItem('campus.view', JSON.stringify(this.view)); } catch { /* ignore */ } this.emitView(); }

  private chunk(ci: number, cj: number) {
    const key = `${this.view.rot}:${this.view.level}:${ci}:${cj}`; let c = this.chunks.get(key);
    if (!c) { c = renderChunk(this.world, this.view.rot, this.k, ci, cj); this.chunks.set(key, c); if (this.chunks.size > 160) this.chunks.delete(this.chunks.keys().next().value!); }
    else { this.chunks.delete(key); this.chunks.set(key, c); }
    return c;
  }
  private sprite(b: Building): Sprite {
    const key = `${b.id}:${this.view.rot}:${this.view.level}`; let s = this.sprites.get(key);
    if (!s) { s = buildingSprite(b, this.view.rot, this.k, this.layers.illustrated, () => { this.sprites.clear(); this.invalidate(); }); this.sprites.set(key, s); }
    return s;
  }
  private entities(): Ent[] {
    if (this.entsRot === this.view.rot) return this.ents;
    const r = this.view.rot; const e: Ent[] = [];
    for (const b of this.world.buildings) { const p = b.parts[0]; e.push({ kind: 'b', b, x: p.cx, y: p.cy, d: Math.max(...b.parts.map(q => depth(q.cx, q.cy, r))) }); }
    for (const t of this.world.campusTrees) e.push({ kind: 't', x: t.x, y: t.y, d: depth(t.x, t.y, r), size: t.s > 1.1 ? 2 : t.s > 0.95 ? 1 : 0, v: t.v > 0.5 ? 1 : 0 });
    for (const l of this.world.landmarks) e.push({ kind: 'p', x: l.at[0], y: l.at[1], d: depth(l.at[0], l.at[1], r), prop: l.kind });
    e.sort((a, b) => a.d - b.d); this.ents = e; this.entsRot = r; return e;
  }

  private draw(t: number) {
    const s = PIXEL * this.vScale;
    const fbW = Math.ceil(this.W / s) + 2, fbH = Math.ceil(this.H / s) + 2;
    if (this.fb.width !== fbW || this.fb.height !== fbH) { this.fb.width = fbW; this.fb.height = fbH; }
    const g = this.fbg; g.imageSmoothingEnabled = false;
    const [bx, by] = this.centreBuf(); const ox = Math.round(bx - fbW / 2), oy = Math.round(by - fbH / 2);
    // ground chunks
    g.fillStyle = C.mist; g.fillRect(0, 0, fbW, fbH);
    for (let cj = Math.floor(oy / CHUNK); cj <= Math.floor((oy + fbH) / CHUNK); cj++)
      for (let ci = Math.floor(ox / CHUNK); ci <= Math.floor((ox + fbW) / CHUNK); ci++) g.drawImage(this.chunk(ci, cj), ci * CHUNK - ox, cj * CHUNK - oy);
    if (this.filter !== 'all') { g.fillStyle = 'rgba(236,242,240,0.45)'; g.fillRect(0, 0, fbW, fbH); }
    // depth-sorted buildings, campus trees and props
    const k = this.k, rot = this.view.rot;
    for (const e of this.entities()) {
      if (e.kind === 'b') {
        const b = e.b!; const sp = this.sprite(b);
        const x = sp.x0 - ox, y = sp.y0 - oy; if (x > fbW || y > fbH || x + sp.w < 0 || y + sp.h < 0) continue;
        const dim = this.filter !== 'all' && b.category !== this.filter;
        if (this.selected === b.id) this.drawHalo(g, sp, x, y, t);
        g.globalAlpha = dim ? 0.35 : 1; g.drawImage(sp.canvas, x, y); g.globalAlpha = 1;
      } else if (e.kind === 't') {
        if (!this.layers.trees) continue;
        const sp = treeSprite(k, e.size!, e.v!); const [sx, sy] = project(e.x, e.y, 0, rot, k);
        const x = Math.round(sx - ox + sp.x0), y = Math.round(sy - oy + sp.y0); if (x > fbW || y > fbH || x + sp.w < 0 || y + sp.h < 0) continue;
        g.drawImage(sp.canvas, x, y);
      } else if (k >= 0.3 && !(e.prop === 'flag' && rot === 0 && this.layers.illustrated)) { // the Admin sprite already has its flag
        const sp = propSprite(e.prop!, k); const [sx, sy] = project(e.x, e.y, 0, rot, k);
        g.drawImage(sp.canvas, Math.round(sx - ox + sp.x0), Math.round(sy - oy + sp.y0));
      }
    }
    // upscale with hard pixels
    const c = this.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    const dev = s * this.dpr; const offX = (ox - (bx - this.W / 2 / s)) * dev, offY = (oy - (by - this.H / 2 / s)) * dev;
    c.drawImage(this.fb, 0, 0, fbW, fbH, Math.round(offX), Math.round(offY), Math.round(fbW * dev), Math.round(fbH * dev));
    if (this.layers.labels) this.drawLabels(c);
    if (this.fade) {
      const u = (t - this.fade.t0) / 260; if (u >= 1) this.fade = null;
      else { c.globalAlpha = 1 - u; c.drawImage(this.fade.cv, 0, 0); c.globalAlpha = 1; }
    }
  }

  private drawHalo(g: CanvasRenderingContext2D, sp: Sprite, x: number, y: number, t: number) {
    const key = 'halo'; let h = (sp as any)[key] as HTMLCanvasElement | undefined;
    if (!h) {
      h = document.createElement('canvas'); h.width = sp.w + 4; h.height = sp.h + 4; const hg = h.getContext('2d')!;
      for (const [dx, dy] of [[0, 2], [4, 2], [2, 0], [2, 4], [0, 0], [4, 4], [0, 4], [4, 0]]) hg.drawImage(sp.canvas, dx, dy);
      hg.globalCompositeOperation = 'source-in'; hg.fillStyle = C.accent; hg.fillRect(0, 0, h.width, h.height); (sp as any)[key] = h;
    }
    g.globalAlpha = 0.75 + 0.25 * Math.sin(t / 220); g.drawImage(h, x - 2, y - 2); g.globalAlpha = 1;
    this.dirty = true; this.kick();
  }

  private drawLabels(c: CanvasRenderingContext2D) {
    const tier = this.tier; const maxP = tier === 'campus' ? 1 : tier === 'area' ? 2 : 3;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const placed: { x: number; y: number; w: number; h: number; id: string }[] = [];
    const fs = tier === 'building' ? 13 : 12; c.font = `600 ${fs}px "Pixelify Sans", monospace`; c.textBaseline = 'middle';
    const items: { id: string; text: string; at: XY; z: number; pri: number; cat: string; sel: boolean }[] = [];
    for (const b of this.world.buildings) {
      if (b.unnamed) continue; // v2: unnamed footprints are scenery only
      if (b.labelPriority > maxP && this.selected !== b.id) continue;
      if (this.filter !== 'all' && b.category !== this.filter && this.selected !== b.id) continue;
      const p = b.parts[0]; const top = Math.max(...b.parts.map(q => 4 + (q.floors - 1) * 3.4)) + 6;
      const cx = b.parts.reduce((s, q) => s + q.cx, 0) / b.parts.length, cy = b.parts.reduce((s, q) => s + q.cy, 0) / b.parts.length;
      items.push({ id: b.id, text: tier === 'campus' ? (b.short ?? b.name) : (b.short && b.name.length > 26 ? b.short : b.name), at: [cx, cy], z: top + (p.roof === 'flat' ? 2 : 6), pri: b.labelPriority, cat: b.category, sel: this.selected === b.id });
    }
    for (const pin of this.pins) {
      if (pin.priority > maxP) continue; if (this.filter !== 'all' && pin.category !== this.filter) continue;
      items.push({ id: pin.id, text: pin.label, at: pin.at, z: 3, pri: pin.priority, cat: pin.category, sel: this.selected === pin.id });
    }
    items.sort((a, b) => (b.sel ? 1 : 0) - (a.sel ? 1 : 0) || a.pri - b.pri);
    for (const it of items) {
      const [sx, sy] = this.worldToScreen(it.at[0], it.at[1], it.z);
      const w = Math.ceil(c.measureText(it.text).width) + 18, h = fs + 9, x = Math.round(sx - w / 2), y = Math.round(sy - h - 6);
      if (x > this.W || y > this.H || x + w < 0 || y + h < 0) continue;
      if (!it.sel && placed.some(p => x < p.x + p.w + 3 && x + w + 3 > p.x && y < p.y + p.h + 3 && y + h + 3 > p.y)) continue;
      placed.push({ x, y, w, h, id: it.id });
      c.fillStyle = C.pine; c.fillRect(x + 2, y + 2, w, h); // hard offset shadow
      c.fillStyle = it.sel ? C.accent : '#FFFDF5'; c.fillRect(x, y, w, h);
      c.strokeStyle = C.pine; c.lineWidth = 2; c.strokeRect(x + 1, y + 1, w - 2, h - 2);
      c.fillStyle = CAT_COLOR[it.cat] ?? C.pine; c.fillRect(x + 5, y + h / 2 - 3, 6, 6);
      c.fillStyle = C.ink; c.fillText(it.text, x + 14, y + h / 2 + 1);
      c.fillStyle = C.pine; c.fillRect(Math.round(sx) - 1, y + h, 2, 6);
    }
    this.labelBoxes = placed;
  }

  // ---------- input ----------
  private dragging = false;
  private setContinuousZoom(effK: number) {
    // choose the discrete level at/below effK, express the rest as visual scale
    let lv = 0; for (let i = 0; i < LEVELS.length; i++) if (LEVELS[i] <= effK * 1.0001) lv = i;
    this.view.level = lv; this.vScale = effK / LEVELS[lv];
  }
  private zoomAround(f: number, anchor: XY) {
    const before = this.screenToWorld(anchor[0], anchor[1]);
    const eff = Math.max(LEVELS[0], Math.min(LEVELS[LEVELS.length - 1] * 1.25, this.k * this.vScale * f));
    this.setContinuousZoom(eff);
    const after = this.screenToWorld(anchor[0], anchor[1]);
    this.view.cx += before[0] - after[0]; this.view.cy += before[1] - after[1]; this.clamp(); this.invalidate();
  }
  private settleZoom() {
    // snap to the nearest discrete level so pixels stay a whole size
    const eff = this.k * this.vScale; let best = 0;
    LEVELS.forEach((l, i) => { if (Math.abs(Math.log(l / eff)) < Math.abs(Math.log(LEVELS[best] / eff))) best = i; });
    if (best !== this.view.level || this.vScale !== 1) {
      const from = Math.log(eff), to = Math.log(LEVELS[best]), t0 = performance.now();
      this.anim = (t) => { const u = Math.min(1, (t - t0) / 160); this.setContinuousZoom(Math.exp(from + (to - from) * u)); if (u >= 1) { this.view.level = best; this.vScale = 1; this.persist(); return false; } return true; };
      this.kick();
    } else this.persist();
  }
  private panBy(dx: number, dy: number) {
    const a = this.screenToWorld(this.W / 2 - dx, this.H / 2 - dy); this.view.cx = a[0]; this.view.cy = a[1]; this.clamp(); this.dirty = true;
  }
  private clamp() {
    const b = this.world.bounds, m = 380;
    this.view.cx = Math.max(b.minX - m, Math.min(b.maxX + m, this.view.cx)); this.view.cy = Math.max(b.minY - m, Math.min(b.maxY + m, this.view.cy));
  }
  hitTest(px: number, py: number): { buildingId?: string; at: XY } | null {
    for (const l of this.labelBoxes) if (px >= l.x && px <= l.x + l.w && py >= l.y && py <= l.y + l.h) return { buildingId: l.id, at: this.screenToWorld(px, py) };
    const [bx, by] = this.centreBuf(); const s = PIXEL * this.vScale;
    const fx = bx + (px - this.W / 2) / s, fy = by + (py - this.H / 2) / s;
    const ents = this.entities();
    for (let i = ents.length - 1; i >= 0; i--) {
      const e = ents[i]; if (e.kind !== 'b' || e.b!.unnamed) continue; const sp = this.sprite(e.b!);
      const lx = Math.floor(fx - sp.x0), ly = Math.floor(fy - sp.y0);
      if (lx >= 0 && ly >= 0 && lx < sp.w && ly < sp.h && sp.alpha[ly * sp.w + lx]) return { buildingId: e.b!.id, at: [e.x, e.y] };
    }
    return { at: this.screenToWorld(px, py) };
  }
  private bindInput() {
    const el = this.canvas; const pts = new Map<number, XY>(); let last: XY = [0, 0], lastT = 0, start: XY = [0, 0], startT = 0, moved = 0, pinchD = 0;
    const local = (e: PointerEvent): XY => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    el.addEventListener('pointerdown', e => {
      el.setPointerCapture(e.pointerId); pts.set(e.pointerId, local(e)); this.anim = null; this.vel = [0, 0];
      if (pts.size === 1) { this.dragging = true; last = start = local(e); lastT = startT = performance.now(); moved = 0; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinchD = Math.hypot(a[0] - b[0], a[1] - b[1]); moved = 99; }
    });
    el.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return; const p = local(e); pts.set(e.pointerId, p);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinchD > 0) this.zoomAround(d / pinchD, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]); pinchD = d; return;
      }
      const dx = p[0] - last[0], dy = p[1] - last[1]; const now = performance.now(); moved += Math.abs(dx) + Math.abs(dy);
      this.panBy(dx, dy); this.vel = [dx / Math.max(1, now - lastT), dy / Math.max(1, now - lastT)]; last = p; lastT = now; this.kick();
    });
    const up = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return; const p = local(e); pts.delete(e.pointerId);
      if (pts.size === 1) { last = [...pts.values()][0]; pinchD = 0; this.settleZoom(); return; }
      if (pts.size === 0) {
        this.dragging = false;
        if (moved < 8 && performance.now() - startT < 500) { this.vel = [0, 0]; this.opts.onSelect?.(this.hitTest(p[0], p[1])); }
        else if (performance.now() - lastT > 80) { this.vel = [0, 0]; this.persist(); }
        this.kick();
      }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    let wheelT: ReturnType<typeof setTimeout> | undefined;
    el.addEventListener('wheel', e => {
      e.preventDefault(); const r = el.getBoundingClientRect();
      this.zoomAround(Math.exp(-e.deltaY * 0.0022), [e.clientX - r.left, e.clientY - r.top]);
      clearTimeout(wheelT); wheelT = setTimeout(() => this.settleZoom(), 140);
    }, { passive: false });
    el.addEventListener('dblclick', e => { const r = el.getBoundingClientRect(); this.zoomBy(1.9, [e.clientX - r.left, e.clientY - r.top]); });
  }
}
