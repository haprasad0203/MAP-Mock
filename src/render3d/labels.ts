// Name tags as an HTML overlay above the canvas: always sharp (never blurred by the tilt-shift) and cheap.
// The tags don't take pointer events; taps are matched against their boxes by the engine, so dragging still works over them.
import type { XY } from '../geo/grid';
import type { Category } from '../geo/types';

export interface LabelItem { id: string; text: string; at: XY; h: number; pri: number; cat: Category; sel: boolean; onAir?: boolean; icon?: string | null }
const CAT_COLOR: Record<string, string> = { venue: '#0F4D32', food: '#FF8A3D', hostel: '#3E6FB8', sports: '#2F8A6A', service: '#5E6872', help: '#B5463A', landmark: '#8A6A2F', staff: '#7A6F8A' };
interface Tag { el: HTMLDivElement; text: string; w: number; h: number; shown: boolean; sel: boolean; onAir: boolean }

export class Labels {
  readonly root: HTMLDivElement;
  private tags = new Map<string, Tag>();
  private boxes: { x: number; y: number; w: number; h: number; id: string }[] = [];
  constructor(host: HTMLElement) {
    this.root = document.createElement('div'); this.root.className = 'map-labels'; this.root.setAttribute('aria-hidden', 'true');
    host.appendChild(this.root);
  }
  private tag(it: LabelItem): Tag {
    let t = this.tags.get(it.id);
    if (!t) {
      const el = document.createElement('div'); el.className = 'map-label'; el.style.visibility = 'hidden';
      if (it.icon) { el.innerHTML = '<img class="ico" alt=""><span class="txt"></span>'; (el.firstChild as HTMLImageElement).src = it.icon; el.classList.add('has-ico'); }
      else { el.innerHTML = '<span class="dot"></span><span class="txt"></span>'; (el.firstChild as HTMLElement).style.background = CAT_COLOR[it.cat] ?? '#0F4D32'; }
      this.root.appendChild(el); t = { el, text: '', w: 0, h: 0, shown: false, sel: false, onAir: false }; this.tags.set(it.id, t);
    }
    const onAir = !!it.onAir;
    if (t.text !== it.text || t.sel !== it.sel || t.onAir !== onAir) {
      (t.el.children[1] as HTMLElement).textContent = it.text; t.el.classList.toggle('sel', it.sel); t.el.classList.toggle('onair', onAir);
      t.text = it.text; t.sel = it.sel; t.onAir = onAir; t.w = t.el.offsetWidth; t.h = t.el.offsetHeight; // measured only when the tag changes
    }
    return t;
  }
  /** Place the tags: selected first, then by priority; a tag that would overlap an earlier one is hidden. */
  /** Screen boxes of the floating UI (search, chips, controls, sheet), refreshed at most twice a second: tags never hide under them (Phase 4). */
  private ui: { x: number; y: number; w: number; h: number; id: string }[] = []; private uiAt = 0;
  private uiBoxes() {
    const t = performance.now(); if (t - this.uiAt < 500) return this.ui; this.uiAt = t;
    const r0 = this.root.getBoundingClientRect();
    this.ui = [...document.querySelectorAll('.search, .chips, .nav, .results, .controls, .sheet-inner, .layers, .sim')].map(el => { const r = el.getBoundingClientRect(); return { x: r.left - r0.left, y: r.top - r0.top, w: r.width, h: r.height, id: 'ui' }; }).filter(b => b.w > 0 && b.h > 0);
    return this.ui;
  }
  update(items: LabelItem[], project: (x: number, y: number, h: number) => XY, W: number, H: number) {
    const placed: typeof this.boxes = [], seen = new Set<string>(), ui = this.uiBoxes();
    items.sort((a, b) => (b.sel ? 1 : 0) - (a.sel ? 1 : 0) || a.pri - b.pri);
    for (const it of items) {
      const t = this.tag(it), [sx, sy] = project(it.at[0], it.at[1], it.h);
      const x = Math.round(sx - t.w / 2), y = Math.round(sy - t.h - 7);
      if (x > W || y > H || x + t.w < 0 || y + t.h < 0) continue;
      if (!it.sel && [...placed, ...ui].some(p => x < p.x + p.w + 4 && x + t.w + 4 > p.x && y < p.y + p.h + 4 && y + t.h + 4 > p.y)) continue;
      placed.push({ x, y, w: t.w, h: t.h, id: it.id }); seen.add(it.id);
      t.el.style.transform = `translate(${x}px,${y}px)`;
      if (!t.shown) { t.el.style.visibility = 'visible'; t.shown = true; }
    }
    for (const [id, t] of this.tags) if (t.shown && !seen.has(id)) { t.el.style.visibility = 'hidden'; t.shown = false; }
    this.boxes = placed;
  }
  clear() { for (const t of this.tags.values()) if (t.shown) { t.el.style.visibility = 'hidden'; t.shown = false; } this.boxes = []; }
  /** Id of the tag under a point, if any. */
  hit(px: number, py: number): string | null {
    for (const b of this.boxes) if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h + 7) return b.id;
    return null;
  }
  destroy() { this.root.remove(); this.tags.clear(); }
}
