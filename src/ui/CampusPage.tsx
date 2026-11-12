import { useEffect, useMemo, useRef, useState } from 'react';
import { loadGeometry } from '../geo/source';
import type { Category } from '../geo/types';
import type { XY } from '../geo/grid';
import { buildWorld, type WorldModel } from '../render/world';
import { MapEngine, type Pin, type View } from '../render/engine';
import { LEVELS, type Tier } from '../render/iso';
import { fixturePlaces, fixtureSchedule, sanitize, search, type Hit, type Place, type PlacesData, type Room, type ScheduleData } from '../data/places';
import { IconClose, IconCompass, IconLayers, IconLocate, IconRotate, IconSearch } from './icons';
import { BottomSheet, type Selection } from './BottomSheet';

const CHIPS: { id: Category | 'all'; label: string; color?: string }[] = [
  { id: 'all', label: 'All' }, { id: 'venue', label: 'Venues', color: '#0F4D32' }, { id: 'food', label: 'Food', color: '#FF8A3D' },
  { id: 'hostel', label: 'Hostels', color: '#3E6FB8' }, { id: 'sports', label: 'Sports', color: '#2F8A6A' },
  { id: 'service', label: 'Services', color: '#5E6872' }, { id: 'help', label: 'Help', color: '#B5463A' },
];

function savedView(): View | null { try { const v = JSON.parse(sessionStorage.getItem('campus.view') ?? 'null'); return v && typeof v.cx === 'number' ? v : null; } catch { return null; } }

export default function CampusPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<MapEngine | null>(null);
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
    const e = new MapEngine(canvasRef.current, world, first, {
      onSelect: hit => {
        if (!hit?.buildingId) { setSel(null); e.setSelected(null); return; }
        const pinPlace = places.places.find(p => p.id === hit.buildingId && !p.buildingId);
        if (pinPlace) { selectPlace(pinPlace, false); return; }
        const pl = places.places.find(p => p.buildingId === hit.buildingId && p.id === hit.buildingId) ?? places.places.find(p => p.buildingId === hit.buildingId);
        setSel({ kind: 'building', buildingId: hit.buildingId, place: pl }); e.setSelected(hit.buildingId);
      },
      onView: v => { setTier(v.tier); setRot(v.rot); },
    });
    // map pins for places that are not buildings (grounds, courts, gate, ATM, lake…)
    const pins: Pin[] = places.places.filter(p => !p.buildingId).map(p => ({ id: p.id, at: placeAt(p)!, label: p.name, kind: 'place' as const, category: p.category, priority: p.category === 'landmark' || p.category === 'sports' ? 2 : 3 as 1 | 2 | 3 })).filter(p => p.at);
    e.pins = pins; e.setLayers(layers);
    engineRef.current = e; (window as any).__engine = e;
    // deep links: ?place=<id> | ?room=<code>
    const qs = new URLSearchParams(location.search);
    const pid = qs.get('place'), room = qs.get('room');
    if (pid) { const p = places.places.find(x => x.id === pid); if (p) setTimeout(() => selectPlace(p), 50); }
    else if (room) { const r = places.rooms.find(x => x.code.toLowerCase() === room.toLowerCase()); if (r) setTimeout(() => selectRoom(r), 50); }
    return () => e.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, places]);

  useEffect(() => { engineRef.current?.setFilter(filter); }, [filter]);
  useEffect(() => { engineRef.current?.setLayers(layers); }, [layers]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 2600); return () => clearTimeout(t); }, [toast]);

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
      <canvas ref={canvasRef} className="map-canvas" role="img" aria-label="Pixel-art isometric map of the IIM Shillong campus. Use search or the list of places to navigate." />
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
        <button className="ctl" aria-label="Locate me" onClick={() => setToast('Live location arrives in Phase 3.')}><IconLocate /></button>
        <button className="ctl" aria-label="Rotate the view 90 degrees" onClick={() => engineRef.current?.rotate(1)}><IconRotate /><span className="badge">{['SE', 'NE', 'NW', 'SW'][rot]}</span></button>
        <button className="ctl" aria-label="Recentre on the whole campus" onClick={() => { engineRef.current?.recentre(); }}><IconCompass /></button>
        <button className="ctl" aria-label="Map layers" aria-pressed={layersOpen} onClick={() => setLayersOpen(o => !o)}><IconLayers /></button>
      </div>
      {layersOpen && (
        <div className="layers" role="dialog" aria-label="Map layers">
          <h3>Layers</h3>
          <label><input type="checkbox" checked={layers.labels} onChange={e => setLayers(l => ({ ...l, labels: e.target.checked }))} /> Name boards</label>
          <label><input type="checkbox" checked={layers.illustrated} onChange={e => setLayers(l => ({ ...l, illustrated: e.target.checked }))} /> Illustrated landmarks</label>
          <label><input type="checkbox" checked={layers.trees} onChange={e => setLayers(l => ({ ...l, trees: e.target.checked }))} /> Campus trees</label>
          <div className="soon">Volunteers, crowd, step-free routes and parking come with the live layer.</div>
        </div>
      )}

      <div className={'attrib' + (tier === 'campus' ? '' : '')}>{world?.attribution ?? ''} · Schematic layout, survey pending</div>

      {places && (
        <BottomSheet sel={sel} places={places} sched={sched} nameOf={nameOf} tier={tier}
          onClose={() => { setSel(null); engineRef.current?.setSelected(null); }}
          onPickPlace={selectPlace} onPickRoom={selectRoom} onToast={setToast} />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
