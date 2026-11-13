import { useEffect, useRef, useState } from 'react';
import { loadGeometry, type CampusGeometrySource } from '../geo/source';
import type { XY } from '../geo/grid';

/** ?debug=layout — plain north-up top-down of the layout, to compare with reference/layout/layout_v2_topdown.png. */
const AREA: Record<string, string> = { water: '#8FC3E8', court: '#7FBF7A', ground: '#C9B48A', lawn: '#BFE3A8', plaza: '#E2D6C0', parking: '#C8C8C8', garden: '#A9D98C' };
const ROAD: Record<string, [string, number]> = { road: ['#8A8378', 6], service: ['#A39C90', 4], track: ['#B9A27A', 2.5], footpath: ['#C98C5A', 1.5], covered: ['#2F8A8A', 3] };

export default function DebugLayout() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [src, setSrc] = useState<CampusGeometrySource | null>(null);
  const view = useRef({ cx: 0, cy: 0, s: 1 }); // world centre + px per metre
  const [opts, setOpts] = useState({ ids: false, unnamed: true });
  const [tick, force] = useState(0);

  useEffect(() => { loadGeometry().then(s => {
    const b = s.getBounds(); view.current = { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, s: Math.min(innerWidth / (b.maxX - b.minX), innerHeight / (b.maxY - b.minY)) * 0.92 };
    setSrc(s); (window as any).__layoutSrc = s;
  }); }, []);

  useEffect(() => {
    const cv = ref.current; if (!cv || !src) return;
    const dpr = devicePixelRatio || 1; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr;
    const c = cv.getContext('2d')!; c.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { cx, cy, s } = view.current;
    const P = ([x, y]: XY): XY => [innerWidth / 2 + (x - cx) * s, innerHeight / 2 - (y - cy) * s];
    const poly = (pts: XY[], close = true) => { c.beginPath(); pts.forEach((p, i) => { const q = P(p); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); if (close) c.closePath(); };
    c.fillStyle = '#F7F5EE'; c.fillRect(0, 0, innerWidth, innerHeight);
    poly(src.getBoundary()); c.fillStyle = '#EEF3E4'; c.fill(); c.setLineDash([6, 4]); c.strokeStyle = '#4E7A3A'; c.lineWidth = 1.5; c.stroke(); c.setLineDash([]);
    for (const a of src.getAreas()) { poly(a.pts); c.fillStyle = AREA[a.kind] ?? '#ddd'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.stroke(); }
    const paths = src.getPaths();
    for (const kind of ['track', 'footpath', 'service', 'road', 'covered'])
      for (const p of paths.filter(p => p.kind === kind)) {
        const [col, w] = ROAD[kind]; poly(p.pts, false); c.strokeStyle = col; c.lineWidth = Math.max(1, w * Math.min(1, s * 0.9)); c.lineCap = 'round'; c.lineJoin = 'round';
        if (p.id.startsWith('fp-')) c.setLineDash([3, 2]); c.stroke(); c.setLineDash([]);
      }
    const blds = src.getBuildings();
    for (const b of blds) {
      if (b.unnamed && !opts.unnamed) continue;
      for (const pt of b.parts) {
        const pts: XY[] = pt.poly ?? rect(pt.cx, pt.cy, pt.w, pt.d, pt.angle);
        poly(pts); c.fillStyle = b.unnamed ? '#B9B9B9' : b.roofColor; c.fill(); c.strokeStyle = '#222'; c.lineWidth = 1; c.stroke();
      }
    }
    c.font = '600 11px Inter, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    const label = (t: string, at: XY, col = '#111') => { const [x, y] = P(at); const w = c.measureText(t).width + 6; c.fillStyle = 'rgba(255,255,255,.82)'; c.fillRect(x - w / 2, y - 7, w, 14); c.fillStyle = col; c.fillText(t, x, y); };
    for (const e of src.getEntrances()) { const [x, y] = P(e.at); c.fillStyle = e.main ? '#E0312B' : '#F08A24'; c.beginPath(); c.arc(x, y, 3.5, 0, 7); c.fill(); }
    for (const l of src.getLandmarks()) { const [x, y] = P(l.at); c.fillStyle = '#6A3FB5'; c.fillRect(x - 4, y - 4, 8, 8); label(l.name, [l.at[0], l.at[1] - 10 / s], '#4B2A8A'); }
    for (const b of blds) {
      if (b.unnamed) continue;
      const n = b.parts.length; label(b.short ?? b.name, [b.parts.reduce((a, q) => a + q.cx, 0) / n, b.parts.reduce((a, q) => a + q.cy, 0) / n]);
    }
    if (opts.ids) { c.font = '10px monospace'; for (const p of paths) label(p.id, p.pts[Math.floor(p.pts.length / 2)], '#7A3B12'); }
  }, [src, opts, tick]);

  useEffect(() => {
    const cv = ref.current; if (!cv) return; let drag: XY | null = null;
    const down = (e: PointerEvent) => { drag = [e.clientX, e.clientY]; cv.setPointerCapture(e.pointerId); };
    const move = (e: PointerEvent) => { if (!drag) return; const v = view.current; v.cx -= (e.clientX - drag[0]) / v.s; v.cy += (e.clientY - drag[1]) / v.s; drag = [e.clientX, e.clientY]; force(n => n + 1); };
    const up = () => { drag = null; };
    const wheel = (e: WheelEvent) => {
      e.preventDefault(); const v = view.current; const f = Math.exp(-e.deltaY * 0.0015);
      const wx = v.cx + (e.clientX - innerWidth / 2) / v.s, wy = v.cy - (e.clientY - innerHeight / 2) / v.s;
      v.s *= f; v.cx = wx - (e.clientX - innerWidth / 2) / v.s; v.cy = wy + (e.clientY - innerHeight / 2) / v.s; force(n => n + 1);
    };
    cv.addEventListener('pointerdown', down); cv.addEventListener('pointermove', move); cv.addEventListener('pointerup', up); cv.addEventListener('wheel', wheel, { passive: false });
    return () => { cv.removeEventListener('pointerdown', down); cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerup', up); cv.removeEventListener('wheel', wheel); };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#F7F5EE' }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', touchAction: 'none', display: 'block' }} aria-label="Debug top-down layout" />
      <div style={{ position: 'absolute', top: 8, left: 8, background: '#fff', border: '1px solid #999', padding: '6px 8px', font: '12px Inter, sans-serif', borderRadius: 4 }}>
        <b>debug=layout</b> · north up · {src?.name}
        <label style={{ marginLeft: 8 }}><input type="checkbox" checked={opts.ids} onChange={e => setOpts(o => ({ ...o, ids: e.target.checked }))} /> path ids</label>
        <label style={{ marginLeft: 8 }}><input type="checkbox" checked={opts.unnamed} onChange={e => setOpts(o => ({ ...o, unnamed: e.target.checked }))} /> unnamed</label>
        <div style={{ color: '#666', marginTop: 2 }}>● red = main entrance · ● orange = entrance · ■ landmark · dashed = fp-* connector</div>
        <div style={{ color: '#666' }}>{src?.attribution}</div>
      </div>
    </div>
  );
}

function rect(cx: number, cy: number, w: number, d: number, angle: number): XY[] {
  const a = angle * Math.PI / 180, u: XY = [Math.cos(a), Math.sin(a)], v: XY = [-Math.sin(a), Math.cos(a)];
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => [cx + u[0] * i * w / 2 + v[0] * j * d / 2, cy + u[1] * i * w / 2 + v[1] * j * d / 2] as XY);
}
