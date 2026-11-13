import { useEffect, useMemo, useRef, useState } from 'react';
import { loadGeometry } from '../geo/source';
import type { Category } from '../geo/types';
import type { XY } from '../geo/grid';
import { buildWorld, type WorldModel } from '../render/world';
import { MapEngine, type Pin, type View } from '../render/engine';
import type { IMapEngine } from '../render/engineApi';
import { LEVELS, type Tier } from '../render/iso';
import { autoQuality, currentChoice, saveChoice, webgl2Available, type QualityChoice } from '../render/quality';
import { fixturePlaces, fixtureSchedule, sanitize, search, type Hit, type Place, type PlacesData, type Room, type ScheduleData } from '../data/places';
import { IconClose, IconCompass, IconLayers, IconLocate, IconRotate, IconSearch } from './icons';
import { BottomSheet, type Selection } from './BottomSheet';

const CHIPS: { id: Category | 'all'; label: string; color?: string }[] = [
  { id: 'all', label: 'All' }, { id: 'venue', label: 'Venues', color: '#0F4D32' }, { id: 'food', label: 'Food', color: '#FF8A3D' },
  { id: 'hostel', label: 'Hostels', color: '#3E6FB8' }, { id: 'sports', label: 'Sports', color: '#2F8A6A' },
  { id: 'service', label: 'Services', color: '#5E6872' }, { id: 'help', label: 'Help', color: '#B5463A' },
];

// The 3D tycoon map is the default; the 2D pixel map is the fallback (no WebGL2, a 3D error, or "2D map" in Layers).
// URL switches: ?q=high|medium|low|2d, ?fps=1 (frame-time box), ?demo=hooks (route, blue dot and ON AIR samples).
const QUALITY_LABEL: Record<QualityChoice, string> = { auto: 'Automatic', high: 'High', medium: 'Medium', low: 'Low', '2d': '2D map' };

function savedView(): View | null { try { const v = JSON.parse(sessionStorage.getItem('campus.view') ?? 'null'); return v && typeof v.cx === 'number' ? v : null; } catch { return null; } }

export default function CampusPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IMapEngine | null>(null);
  const [choice, setChoice] = useState<QualityChoice>(currentChoice);
  const [failed3d, setFailed3d] = useState(() => !webgl2Available());
  const use3d = choice !== '2d' && !failed3d;
  const [world, setWorld] = useState<WorldModel | null>(null);
  const [places, setPlaces] = useState<PlacesData | null>(null);
  const [sched, setSched] = useState<ScheduleData | null>(null);
  const [q, setQ] = useState(''); const [focus, setFocus] = useState(false);
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [sel, setSel] = useState<Selection | null>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [layers, setLayers] = useState({ labels: true, illustrated: true, trees: true });
  const [tier, setTier] = useState<Tier>('area'); const [rot, setRot] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // ---- load data + build the world ----
  useEffect(() => {
    let alive = true;
    Promise.all([loadGeometry(), fixturePlaces.load(), fixtureSchedule.load()]).then(([src, p, s]) => {
      if (!alive) return; setPlaces(sanitize(p)); setSched(s);
      // let the first paint happen, then raster the world
      setTimeout(() => { const t0 = performance.now(); const w = buildWorld(src); (window as any).__buildMs = Math.round(performance.now() - t0); setWorld(w); }, 0);
    });
    return () => { alive = false; };
  }, []);

  const nameOf = (bid: string) => world?.buildings.find(b => b.id === bid)?.name ?? bid;
  const placeAt = (p: Place): XY | null => {
    if (p.at) return p.at;
    if (p.buildingId) { const b = world?.buildings.find(b => b.id === p.buildingId); if (b) return [b.parts.reduce((s, q) => s + q.cx, 0) / b.parts.length, b.parts.reduce((s, q) => s + q.cy, 0) / b.parts.length]; }
    if (p.landmarkId) { const l = world?.landmarks.find(l => l.id === p.landmarkId); if (l) return l.at; }
    return null;
  };

  // ---- engine ----
  useEffect(() => {
    if (!world || !canvasRef.current || !places) return;
    const first = savedView() ?? { cx: world.centre[0] + 20, cy: world.centre[1], level: window.innerWidth < 700 ? 2 : 3, rot: 0 as const };
    const opts = {
      onSelect: (hit: { buildingId?: string; at: XY } | null) => {
        const e = engineRef.current; if (!e) return;
        if (!hit?.buildingId) { setSel(null); e.setSelected(null); return; }
        const pinPlace = places.places.find(p => p.id === hit.buildingId && !p.buildingId);
        if (pinPlace) { selectPlace(pinPlace, false); return; }
        const pl = places.places.find(p => p.buildingId === hit.buildingId && p.id === hit.buildingId) ?? places.places.find(p => p.buildingId === hit.buildingId);
        setSel({ kind: 'building', buildingId: hit.buildingId, place: pl }); e.setSelected(hit.buildingId);
      },
      onView: (v: View & { tier: Tier }) => { setTier(v.tier); setRot(v.rot); },
      onQuality: (q: string) => setToast(`Map detail lowered to ${q} to keep it smooth.`),
    };
    let dead = false, engine: IMapEngine | null = null;
    const start = (e: IMapEngine) => {
    // map pins for places that are not buildings (grounds, courts, gate, ATM, lake…)
    const pins: Pin[] = places.places.filter(p => !p.buildingId).map(p => ({ id: p.id, at: placeAt(p)!, label: p.name, kind: 'place' as const, category: p.category, priority: p.category === 'landmark' || p.category === 'sports' ? 2 : 3 as 1 | 2 | 3 })).filter(p => p.at);
    e.pins = pins; e.setLayers(layers);
    engineRef.current = e; (window as any).__engine = e;
    // deep links: ?place=<id> | ?room=<code>
    const qs = new URLSearchParams(location.search);
    const pid = qs.get('place'), room = qs.get('room');
    if (pid) { const p = places.places.find(x => x.id === pid); if (p) setTimeout(() => selectPlace(p), 50); }
    else if (room) { const r = places.rooms.find(x => x.code.toLowerCase() === room.toLowerCase()); if (r) setTimeout(() => selectRoom(r), 50); }
    if (qs.get('demo') === 'hooks') { // sample data for the hooks later phases will drive
      const road = world.paths.filter(p => p.kind === 'road' && p.src !== undefined).sort((a, b) => b.pts.length - a.pts.length)[0] ?? world.paths[0];
      const flag = world.landmarks.find(l => l.id === 'flag')?.at ?? world.centre;
      e.setRoute?.(road.pts); e.setUser?.({ at: [flag[0] + 14, flag[1] - 10], accuracy: 12, heading: 330 }); e.setOnAir?.(['nab']);
    }
    };
    if (use3d) {
      // Three.js is loaded only when the 3D map is used; any failure falls back to the 2D map
      const c = currentChoice(), auto = c === 'auto' || c === '2d';
      import('../render3d/Engine3D').then(m => m.createEngine3D(canvasRef.current!, world, first, opts, auto ? autoQuality() : c, auto))
        .then(e => { if (dead) e.destroy(); else { engine = e; start(e); } })
        .catch(err => { console.warn('3D map unavailable, using the 2D map:', err); if (!dead) setFailed3d(true); });
    } else { engine = new MapEngine(canvasRef.current, world, first, opts); start(engine); }
    return () => { dead = true; engine?.destroy(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, places, use3d]);

  useEffect(() => { engineRef.current?.setFilter(filter); }, [filter]);
  useEffect(() => { engineRef.current?.setLayers(layers); }, [layers]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

  function pickQuality(c: QualityChoice) {
    saveChoice(c); setChoice(c);
    // between 3D tiers the running engine just switches; to or from the 2D map the canvas is rebuilt (use3d changes)
    if (c !== '2d' && engineRef.current?.kind === '3d') engineRef.current.setQuality?.(c === 'auto' ? autoQuality() : c);
  }
  function fly(at: XY, level = 6) {
    const wide = window.innerWidth >= 900; // desktop: sheet on the left; phone: sheet at the bottom
    engineRef.current?.flyTo(at, Math.min(level, LEVELS.length - 1), 650, wide ? 0.62 : 0.5, wide ? 0.5 : 0.3);
  }
  function selectPlace(p: Place, move = true) {
    const at = placeAt(p); const bid = p.buildingId ?? p.id;
    setSel({ kind: 'building', buildingId: p.buildingId ?? '', place: p }); engineRef.current?.setSelected(bid);
    if (at && move) fly(at, p.buildingId ? 6 : 5);
  }
  function selectRoom(r: Room) {
    const b = world?.buildings.find(b => b.id === r.buildingId); const p = places?.places.find(x => x.buildingId === r.buildingId && x.id === r.buildingId);
    setSel({ kind: 'building', buildingId: r.buildingId, place: p, room: r }); engineRef.current?.setSelected(r.buildingId);
    if (b) fly([b.parts[0].cx, b.parts[0].cy], 6);
  }
  function pick(h: Hit) {
    setQ(''); setFocus(false); (document.activeElement as HTMLElement)?.blur();
    if (h.kind === 'place') selectPlace(h.place);
    else if (h.kind === 'room') selectRoom(h.room);
    else if (h.room) { selectRoom(h.room); setSel(s => s ? { ...s, session: h.session } : s); }
  }
  const hits = useMemo(() => (places && q ? search(q, places, sched, nameOf) : []), [q, places, sched, world]);

  return (
    <div className="app">
      <canvas key={use3d ? '3d' : '2d'} ref={canvasRef} className="map-canvas" role="img" aria-label="3D map of the IIM Shillong campus. Use search to find buildings, rooms and sessions." />
      {!world && <div className="toast" style={{ bottom: '50%' }}>Drawing the campus…</div>}

      <div className="top">
        <div className="search" role="search">
          <IconSearch />
          <input value={q} onChange={e => setQ(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setTimeout(() => setFocus(false), 150)}
            placeholder="Search buildings, rooms, sessions…" aria-label="Search campus" enterKeyHint="search"
            onKeyDown={e => { if (e.key === 'Enter' && hits[0]) pick(hits[0]); if (e.key === 'Escape') setQ(''); }} />
          {q && <button className="icon-btn" aria-label="Clear search" onClick={() => setQ('')}><IconClose /></button>}
        </div>
        {focus && q && (
          <div className="results" role="listbox">
            {hits.length === 0 && <div style={{ padding: 12 }} className="muted">No match on campus for “{q}”.</div>}
            {hits.map((h, i) => (
              <button key={i} role="option" onMouseDown={e => e.preventDefault()} onClick={() => pick(h)}>
                <span className="kind">{h.kind === 'place' ? 'PLACE' : h.kind === 'room' ? 'ROOM' : 'SESSION'}</span>
                <span><div className="t">{h.label}</div><div className="s">{h.sub}</div></span>
              </button>
            ))}
          </div>
        )}
        {!(focus && q) && (
          <div className="chips" role="toolbar" aria-label="Filter places">
            {CHIPS.map(c => (
              <button key={c.id} className="chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.color && <span className="sw" style={{ background: c.color }} />}{c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="controls">
        <button className="ctl" aria-label="Locate me" onClick={() => setToast('Live location comes in a later phase.')}><IconLocate /></button>
        <button className="ctl" aria-label="Rotate the view 90 degrees" onClick={() => engineRef.current?.rotate(1)}><IconRotate /><span className="badge">{['SE', 'NE', 'NW', 'SW'][rot]}</span></button>
        <button className="ctl" aria-label="Recentre on the whole campus" onClick={() => { engineRef.current?.recentre(); }}><IconCompass /></button>
        <button className="ctl" aria-label="Map layers" aria-pressed={layersOpen} onClick={() => setLayersOpen(o => !o)}><IconLayers /></button>
      </div>
      {layersOpen && (
        <div className="layers" role="dialog" aria-label="Map layers">
          <h3>Layers</h3>
          <label><input type="checkbox" checked={layers.labels} onChange={e => setLayers(l => ({ ...l, labels: e.target.checked }))} /> Name boards</label>
          {!use3d && <label><input type="checkbox" checked={layers.illustrated} onChange={e => setLayers(l => ({ ...l, illustrated: e.target.checked }))} /> Illustrated landmarks</label>}
          <label><input type="checkbox" checked={layers.trees} onChange={e => setLayers(l => ({ ...l, trees: e.target.checked }))} /> Campus trees</label>
          <label className="quality">Map detail
            <select value={failed3d ? '2d' : choice} disabled={failed3d} onChange={e => pickQuality(e.target.value as QualityChoice)} aria-label="Map detail">
              {(Object.keys(QUALITY_LABEL) as QualityChoice[]).map(c => <option key={c} value={c}>{QUALITY_LABEL[c]}</option>)}
            </select>
          </label>
          {failed3d && <div className="soon">This browser can't draw the 3D map, so the 2D map is shown.</div>}
          <div className="soon">Volunteers, crowd, step-free routes and parking come with the live layer.</div>
        </div>
      )}

      <div className="attrib">{world?.attribution ?? ''} · Layout v2, survey pending</div>

      {places && (
        <BottomSheet sel={sel} places={places} sched={sched} nameOf={nameOf} tier={tier}
          onClose={() => { setSel(null); engineRef.current?.setSelected(null); }}
          onPickPlace={selectPlace} onPickRoom={selectRoom} onToast={setToast} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
