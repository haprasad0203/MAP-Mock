// Dev route /campus?facade-edit=<id> (Phase 3M, reference/style/BUILD_LANDMARKS_3D.md section 1): mark the wall faces,
// special pieces and samples on a building's approved render. Faces are 4-corner quads (TL, TR, BR, BL as seen
// front-on), pieces are [u0, u1] × [v0, v1] inside a face, samples are rectangles. Save writes public/data/facades.json
// through the dev server; Extract runs scripts/extract-facades.mjs and refreshes the contact sheet. Dev server only.
import { useEffect, useMemo, useRef, useState } from 'react';

type Pt = [number, number];
interface Piece { name: string; type: string; u: [number, number]; v: [number, number] }
interface FaceMark { name: string; quad: Pt[]; heightM: number; floors?: number; bays?: number; wb?: string; bands?: Record<string, [number, number]>; pieces?: Piece[] }
interface Sample { name: string; type: string; rect: [number, number, number, number] }
interface Entry { file: string; white?: string; faces: FaceMark[]; samples?: Sample[]; atlas?: unknown }

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Point (u, v) of a quad, bilinear (close enough to draw the pieces). */
const at = (q: Pt[], u: number, v: number) => lerp(lerp(q[0], q[1], u), lerp(q[3], q[2], u), v);

export default function FacadeEditor({ id }: { id: string }) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [sel, setSel] = useState<{ kind: 'face' | 'sample'; i: number } | null>(null);
  const [mode, setMode] = useState<'idle' | 'face' | 'sample'>('idle');
  const [pending, setPending] = useState<Pt[]>([]);
  const [msg, setMsg] = useState('');
  const [size, setSize] = useState<Pt>([0, 0]);
  const drag = useRef<{ face: number; corner: number } | null>(null), svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    fetch('/data/facades.json').then(r => r.json()).then(c => {
      const e = c.facades?.[id]; if (!e) { setMsg(`No facades.json entry "${id}". Known: ${Object.keys(c.facades ?? {}).join(', ')}`); return; }
      const { atlas: _skip, ...rest } = e; setEntry(rest);
    });
  }, [id]);
  const scale = useMemo(() => (size[0] ? Math.min(1, (window.innerWidth - 380) / size[0], (window.innerHeight - 20) / size[1]) : 1), [size]);
  const toImg = (ev: { clientX: number; clientY: number }): Pt => { const r = svg.current!.getBoundingClientRect(); return [Math.round((ev.clientX - r.left) / scale), Math.round((ev.clientY - r.top) / scale)]; };
  const update = (f: (e: Entry) => void) => setEntry(e => { if (!e) return e; const c = structuredClone(e); f(c); return c; });

  const click = (ev: React.MouseEvent) => {
    if (mode === 'idle' || !entry) return;
    const p = [...pending, toImg(ev)];
    if (mode === 'face' && p.length === 4) {
      const name = prompt('Face name (e.g. end-side, front, tower)') || `face-${entry.faces.length + 1}`;
      update(e => e.faces.push({ name, quad: p, heightM: 15 })); setSel({ kind: 'face', i: entry.faces.length }); setMode('idle'); setPending([]); return;
    }
    if (mode === 'sample' && p.length === 2) {
      const name = prompt('Sample name (roof, plaster, stone, cap)') || 'sample', rect: Sample['rect'] = [Math.min(p[0][0], p[1][0]), Math.min(p[0][1], p[1][1]), Math.max(p[0][0], p[1][0]), Math.max(p[0][1], p[1][1])];
      update(e => { (e.samples ??= []).push({ name, type: name === 'roof' || name === 'cap' ? 'roof' : 'tile', rect }); }); setMode('idle'); setPending([]); return;
    }
    setPending(p);
  };
  const move = (ev: React.PointerEvent) => { const d = drag.current; if (!d) return; const p = toImg(ev); update(e => { e.faces[d.face].quad[d.corner] = p; }); };
  const save = () => entry && fetch('/__facades', { method: 'POST', body: JSON.stringify({ id, entry }) }).then(r => r.text()).then(setMsg);
  const extract = () => { setMsg('Extracting…'); fetch(`/__facades/extract?id=${encodeURIComponent(id)}`, { method: 'POST' }).then(r => r.text()).then(t => setMsg(`${t}  ·  sheet: reference/style/compare/facades_${id}.png`)); };

  if (!entry) return <div style={{ padding: 16, font: '600 14px Inter, system-ui, sans-serif' }}>{msg || 'Loading…'}</div>;
  const face = sel?.kind === 'face' ? entry.faces[sel.i] : null, sample = sel?.kind === 'sample' ? entry.samples?.[sel.i] : null;
  const num = (label: string, v: number | undefined, set: (n: number | undefined) => void) => (
    <label style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>{label}<input type="number" step="0.1" value={v ?? ''} style={{ width: 90 }} onChange={ev => set(ev.target.value === '' ? undefined : Number(ev.target.value))} /></label>);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#1A1F24', color: '#fff', font: '13px/1.4 Inter, system-ui, sans-serif' }}>
      <div style={{ overflow: 'auto', flex: 1, padding: 10 }}>
        <div style={{ position: 'relative', width: size[0] * scale, height: size[1] * scale }}>
          <img src={`/__facades/render/${encodeURIComponent(entry.file)}`} alt={entry.file} style={{ width: '100%', height: '100%', display: 'block' }} onLoad={ev => setSize([ev.currentTarget.naturalWidth, ev.currentTarget.naturalHeight])} />
          <svg ref={svg} viewBox={`0 0 ${size[0]} ${size[1]}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', cursor: mode === 'idle' ? 'default' : 'crosshair' }}
            onClick={click} onPointerMove={move} onPointerUp={() => (drag.current = null)} onPointerLeave={() => (drag.current = null)}>
            {entry.faces.map((f, i) => {
              const on = sel?.kind === 'face' && sel.i === i;
              return <g key={i}>
                <polygon points={f.quad.map(p => p.join(',')).join(' ')} fill={on ? 'rgba(255,210,63,0.12)' : 'none'} stroke="#FFD23F" strokeWidth={on ? 4 : 2.5} onClick={ev => { if (mode === 'idle') { ev.stopPropagation(); setSel({ kind: 'face', i }); } }} />
                {(f.pieces ?? []).map((p, k) => <polygon key={k} points={[at(f.quad, p.u[0], p.v[0]), at(f.quad, p.u[1], p.v[0]), at(f.quad, p.u[1], p.v[1]), at(f.quad, p.u[0], p.v[1])].map(q => q.join(',')).join(' ')} fill="none" stroke="#5FD3FF" strokeWidth={2} strokeDasharray="8 5" />)}
                <text x={f.quad[0][0] + 6} y={f.quad[0][1] - 8} fill="#FFD23F" fontSize={26} fontWeight={700} stroke="#000" strokeWidth={4} paintOrder="stroke">{f.name}</text>
                {on && f.quad.map((p, c) => <circle key={c} cx={p[0]} cy={p[1]} r={12} fill="#FFD23F" stroke="#000" strokeWidth={2} style={{ cursor: 'move' }} onPointerDown={ev => { ev.stopPropagation(); drag.current = { face: i, corner: c }; }} />)}
              </g>;
            })}
            {(entry.samples ?? []).map((s, i) => <g key={`s${i}`} onClick={ev => { if (mode === 'idle') { ev.stopPropagation(); setSel({ kind: 'sample', i }); } }}>
              <rect x={s.rect[0]} y={s.rect[1]} width={s.rect[2] - s.rect[0]} height={s.rect[3] - s.rect[1]} fill="none" stroke="#FF7BD5" strokeWidth={sel?.kind === 'sample' && sel.i === i ? 4 : 2.5} />
              <text x={s.rect[0] + 4} y={s.rect[1] - 6} fill="#FF7BD5" fontSize={22} fontWeight={700} stroke="#000" strokeWidth={4} paintOrder="stroke">{s.name}</text>
            </g>)}
            {pending.map((p, i) => <circle key={`p${i}`} cx={p[0]} cy={p[1]} r={9} fill="#5FD3FF" />)}
          </svg>
        </div>
      </div>
      <aside style={{ width: 340, padding: 14, background: '#101418', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h3 style={{ margin: 0 }}>Facades: {id}</h3>
        <div style={{ color: '#AEB7BF' }}>{entry.file}. Click a quad to select it, drag its corners. Yellow = faces, blue dashes = pieces, pink = samples.</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => { setMode('face'); setPending([]); setMsg('Click 4 corners: TL, TR, BR, BL (as seen front-on)'); }}>New face</button>
          <button onClick={() => { setMode('sample'); setPending([]); setMsg('Click 2 opposite corners of the sample'); }}>New sample</button>
          {sel && <button onClick={() => { update(e => { if (sel.kind === 'face') e.faces.splice(sel.i, 1); else e.samples?.splice(sel.i, 1); }); setSel(null); }}>Delete selected</button>}
        </div>
        {face && sel && <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>name<input value={face.name} onChange={ev => update(e => { e.faces[sel.i].name = ev.target.value; })} /></label>
          {num('real height (m)', face.heightM, n => update(e => { e.faces[sel.i].heightM = n ?? 15; }))}
          {num('floors', face.floors, n => update(e => { e.faces[sel.i].floors = n; }))}
          {num('window bays', face.bays, n => update(e => { e.faces[sel.i].bays = n; }))}
          <label style={{ display: 'flex', justifyContent: 'space-between' }}>white balance<select value={face.wb ?? 'building'} onChange={ev => update(e => { e.faces[sel.i].wb = ev.target.value; })}><option value="building">building</option><option value="self">self</option></select></label>
          <div>bands and pieces (JSON)</div>
          <textarea key={`${sel.i}-${face.name}`} rows={12} style={{ font: '12px ui-monospace, monospace' }} defaultValue={JSON.stringify({ bands: face.bands, pieces: face.pieces }, null, 1)}
            onBlur={ev => { try { const j = JSON.parse(ev.target.value); update(e => { e.faces[sel.i].bands = j.bands; e.faces[sel.i].pieces = j.pieces; }); setMsg(''); } catch (err) { setMsg(String(err)); } }} />
        </div>}
        {sample && <div>Sample <b>{sample.name}</b> ({sample.type}): [{sample.rect.join(', ')}]</div>}
        <div style={{ display: 'flex', gap: 6 }}><button onClick={save}>Save</button><button onClick={extract}>Save first, then Extract</button></div>
        <div style={{ color: '#FFD23F', whiteSpace: 'pre-wrap' }}>{msg}</div>
      </aside>
    </div>
  );
}
