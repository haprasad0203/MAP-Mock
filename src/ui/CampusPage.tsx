import { useEffect, useMemo, useRef, useState } from 'react';
import { loadGeometry } from '../geo/source';
import type { Category } from '../geo/types';
import type { XY } from '../geo/grid';
import { buildWorld, campusAt, type WorldModel } from '../render/world';
import { MapEngine, type Pin, type View } from '../render/engine';
import type { IMapEngine } from '../render/engineApi';
import { LEVELS, type Tier } from '../render/iso';
import { autoQuality, currentChoice, saveChoice, webgl2Available, type QualityChoice } from '../render/quality';
import { fixturePlaces, fixtureSchedule, floorName, sanitize, search, type Hit, type Place, type PlacesData, type Room, type ScheduleData } from '../data/places';
import { activeEvents, activeRoomChanges, applyRoomChanges, fixtureLive, minutesAgo, onAirBuildings, type LiveData } from '../data/live';
import { ARRIVE_M, buildGraph, nextStep, offRoute, REROUTE_M, routeTo, routeToPoint, walkable, type Route } from '../route/graph';
import { LocationSource, type Fix } from '../route/location';
import { ListView } from './ListView';
import { IconClose, IconCompass, IconLayers, IconLocate, IconRotate, IconSearch } from './icons';
import { BottomSheet, type Selection } from './BottomSheet';
import { iconUrl } from './mapIcons';

const CHIPS: { id: Category | 'all'; label: string; color?: string; icon?: string }[] = [
  { id: 'all', label: 'All' }, { id: 'venue', label: 'Venues', icon: 'venue' }, { id: 'food', label: 'Food', icon: 'food' },
  { id: 'hostel', label: 'Hostels', icon: 'hostel' }, { id: 'sports', label: 'Sports', icon: 'sports' },
  { id: 'service', label: 'Services', color: '#5E6872' }, { id: 'help', label: 'Help', icon: 'help-desk' },
];

// The 3D tycoon map is the default; the 2D pixel map is the fallback (no WebGL2, a 3D error, or "2D map" in Layers).
// URL switches: ?q=high|medium|low|2d, ?fps=1 (frame-time box), ?demo=hooks (route, blue dot and ON AIR samples).
const QUALITY_LABEL: Record<QualityChoice, string> = { auto: 'Automatic', high: 'High', medium: 'Medium', low: 'Low', '2d': '2D map' };

/** Dev switch: ?view=cx,cy,level,rot opens the map on an exact view (used for the review screenshots). */
function urlView(): View | null {
  const v = new URLSearchParams(location.search).get('view')?.split(',').map(Number);
  return v && v.length >= 3 && v.every(Number.isFinite) ? { cx: v[0], cy: v[1], level: v[2], rot: ((v[3] ?? 0) & 3) as View['rot'] } : null;
}
function savedView(): View | null { try { const v = JSON.parse(sessionStorage.getItem('campus.view') ?? 'null'); return v && typeof v.cx === 'number' ? v : null; } catch { return null; } }

export default function CampusPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<IMapEngine | null>(null);
  const [choice, setChoice] = useState<QualityChoice>(currentChoice);
  const [failed3d, setFailed3d] = useState(() => !webgl2Available());
  const use3d = choice !== '2d' && !failed3d;
  const [world, setWorld] = useState<WorldModel | null>(null);
  const [places, setPlaces] = useState<PlacesData | null>(null);
  const [schedRaw, setSched] = useState<ScheduleData | null>(null);
  const [live, setLive] = useState<LiveData | null>(null); const [liveErr, setLiveErr] = useState(false);
  const sched = useMemo(() => (schedRaw ? applyRoomChanges(schedRaw, live) : null), [schedRaw, live]);
  // ---- Phase 3B: location, directions, list view ----
  const loc = useRef<LocationSource>(null as unknown as LocationSource); if (!loc.current) loc.current = new LocationSource();
  const [fix, setFix] = useState<Fix | null>(null); const [follow, setFollow] = useState<'off' | 'centre' | 'follow'>('off');
  const [nav, setNav] = useState<{ bid?: string; at?: XY; label: string; room?: Room; title?: string } | null>(null);
  const [route, setRouteS] = useState<Route | null>(null); const [arrived, setArrived] = useState<string | null>(null);
  const [pickStart, setPickStart] = useState(false); const [simArm, setSimArm] = useState(false);
  const [list, setList] = useState(() => new URLSearchParams(location.search).get('list') === '1');
  const [tick, setTick] = useState(0); const [ready, setReady] = useState(0);
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
    const pull = () => fixtureLive.load().then(d => { if (alive) { setLive(d); setLiveErr(false); } }).catch(() => alive && setLiveErr(true));
    pull(); const iv = setInterval(() => { pull(); setTick(t => t + 1); }, fixtureLive.pollMs ?? 60000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const modeRef = useRef({ pickStart, simArm }); modeRef.current = { pickStart, simArm };
  const graph = useMemo(() => (world ? buildGraph(walkable(world.paths, world.src.getHardscape?.() ?? []), world.src.getEntrances(), undefined, p => campusAt(world, p[0], p[1]) || Math.hypot(p[0] - world.centre[0], p[1] - world.centre[1]) < 900) : null), [world]);
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
    // the hero view (SCENE_LOOK row 1): close on the Admin–NAB–lake axis; Recentre still shows the whole campus
    const first = urlView() ?? savedView() ?? { cx: 125, cy: -150, level: window.innerWidth < 700 ? 4 : 5, rot: 0 as const };
    const opts = {
      onSelect: (hit: { buildingId?: string; at: XY } | null) => {
        const e = engineRef.current; if (!e) return;
        // Phase 3B modes: pick a start point (no GPS) or place the simulated delegate (?simgps=1)
        if (hit && modeRef.current.pickStart) { loc.current.set(hit.at, false); setPickStart(false); return; }
        if (hit && modeRef.current.simArm) { loc.current.set(hit.at, true); setSimArm(false); return; }
        if (hit?.buildingId?.startsWith('event:') || hit?.buildingId?.startsWith('change:')) { pickLivePin(hit.buildingId); return; }
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
    e.pins = pins; e.setLayers(layers); basePins.current = pins;
    engineRef.current = e; (window as any).__engine = e; setReady(r => r + 1);
    // deep links: ?place=<id> | ?room=<code>
    const qs = new URLSearchParams(location.search);
    const pid = qs.get('place'), room = qs.get('room');
    if (pid) { const p = places.places.find(x => x.id === pid); if (p) setTimeout(() => selectPlace(p), 50); }
    else if (room) { const r = places.rooms.find(x => x.code.toLowerCase() === room.toLowerCase()); if (r) setTimeout(() => selectRoom(r), 50); }
    // ?route=<placeId | room code | session:<id>>: start walking directions there (Phase 3B)
    const rt = qs.get('route');
    if (rt) setTimeout(() => {
      const sess = rt.startsWith('session:') ? sched?.sessions.find(x => x.id === rt.slice(8)) : undefined;
      const r = places.rooms.find(x => x.code.toLowerCase() === (sess ? sess.room : rt).toLowerCase()), p = places.places.find(x => x.id === rt);
      if (r) startNav({ bid: r.buildingId, label: nameOf(r.buildingId), room: r, title: sess?.title }); else if (p) startNav(placeTarget(p));
    }, 80);
    if (qs.get('demo') === 'hooks') { // sample data for the hooks later phases will drive
      // sample route: the campus road that passes nearest the flag forecourt
      const flag = world.landmarks.find(l => l.id === 'flag')?.at ?? world.centre;
      const near = (p: { pts: XY[] }) => Math.min(...p.pts.map(q => Math.hypot(q[0] - flag[0], q[1] - flag[1])));
      const road = world.paths.filter(p => p.kind === 'road' || p.kind === 'service').sort((a, b) => near(a) - near(b))[0] ?? world.paths[0];
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

  // ---------- Phase 3B: live layer on the map (ON AIR, event pins, room-change signs), refreshed with the poll ----------
  const events = useMemo(() => activeEvents(live), [live, tick]);
  const changes = useMemo(() => activeRoomChanges(live, sched), [live, sched, tick]);
  const onAir = useMemo(() => onAirBuildings(sched, places), [sched, places, tick]);
  const basePins = useRef<Pin[] | null>(null);
  useEffect(() => {
    const e = engineRef.current; if (!e || !places || !world) return;
    basePins.current ??= e.pins;
    const evPins: Pin[] = events.flatMap((ev, i) => { const p = places.places.find(x => x.id === ev.placeId), at = p && placeAt(p); return at ? [{ id: `event:${ev.id}`, at: [at[0] + Math.cos(i * 2.1) * 9, at[1] + Math.sin(i * 2.1) * 9] as XY, label: ev.label, kind: 'place' as const, category: 'help' as Category, priority: 1 as const }] : []; });
    const chPins: Pin[] = changes.flatMap(c => { const r = places.rooms.find(x => x.code === c.to), b = r && world.buildings.find(x => x.id === r.buildingId); return b ? [{ id: `change:${c.sessionId}`, at: [b.parts[0].cx + 6, b.parts[0].cy - 6] as XY, label: `Room change: ${c.from} → ${c.to}`, kind: 'place' as const, category: 'help' as Category, priority: 1 as const }] : []; });
    e.pins = [...basePins.current, ...evPins, ...chPins]; e.setOnAir?.(onAir); e.invalidate();
  }, [events, changes, onAir, ready, places, world]);
  function pickLivePin(id: string) {
    if (!places) return;
    if (id.startsWith('event:')) {
      const ev = events.find(x => `event:${x.id}` === id), p = ev && places.places.find(x => x.id === ev.placeId); if (!ev || !p) return;
      setSel({ kind: 'building', buildingId: p.buildingId ?? '', place: p, note: `${ev.label}${ev.confirm ? ` · to confirm: ${ev.confirm}` : ''}` }); engineRef.current?.setSelected(id);
    } else {
      const c = changes.find(x => `change:${x.sessionId}` === id), r = c && places.rooms.find(x => x.code === c.to); if (!c || !r) return;
      selectRoom(r); setSel(s => (s ? { ...s, session: c.session, note: `Room change: ${c.session.title} has moved from Room ${c.from} to Room ${c.to}.` } : s));
    }
  }

  // ---------- Phase 3B: location ----------
  useEffect(() => loc.current.on((f, err) => { setFix(f); if (err) setToast(err); }), []);
  useEffect(() => () => loc.current.stop(), []);
  useEffect(() => { engineRef.current?.setUser?.(fix ? { at: fix.at, accuracy: fix.accuracy, heading: fix.heading } : null); }, [fix]);
  const offCampus = !!(fix && world && !fix.sim && !campusAt(world, fix.at[0], fix.at[1]));
  useEffect(() => { // first fix after Locate: centre; in follow mode keep the map on the delegate
    if (!fix || follow === 'off') return;
    engineRef.current?.flyTo(fix.at, follow === 'follow' ? undefined : 6, follow === 'follow' ? 300 : 650);
  }, [fix, follow]);
  function locate() {
    if (loc.current.sim && !loc.current.fix) { setSimArm(true); setToast('Simulator: tap the map to place yourself.'); return; }
    loc.current.start();
    setFollow(f => (f === 'off' ? 'centre' : f === 'centre' ? 'follow' : 'off'));
  }

  // ---------- Phase 3B: directions ----------
  function placeTarget(p: Place): { bid?: string; at?: XY; label: string } { return p.buildingId ? { bid: p.buildingId, label: p.name } : { at: placeAt(p) ?? undefined, label: p.name }; }
  function startNav(t: { bid?: string; at?: XY; label: string; room?: Room; title?: string }) {
    setNav(t); setRouteS(null); setArrived(null); setList(false);
    if (!loc.current.fix) {
      if (loc.current.sim) { setSimArm(true); setToast('Simulator: tap the map to place yourself.'); }
      else { loc.current.start(); setToast('Finding your location… or pick a start point.'); }
    }
  }
  function stopNav() { setNav(null); setRouteS(null); setArrived(null); setPickStart(false); engineRef.current?.setRoute?.(null); loc.current.stopWalk(); }
  function directionsFor(s: Selection) {
    if (s.room) startNav({ bid: s.room.buildingId, label: nameOf(s.room.buildingId), room: s.room, title: s.session?.title });
    else if (s.place) startNav(placeTarget(s.place));
    else if (s.buildingId) startNav({ bid: s.buildingId, label: nameOf(s.buildingId) });
  }
  // (re)route on every fix: first fix, or more than REROUTE_M off the route; arrival within ARRIVE_M of the end
  useEffect(() => {
    if (!nav || !fix || !graph) return;
    const end = route?.pts[route.pts.length - 1];
    if (end && Math.hypot(fix.at[0] - end[0], fix.at[1] - end[1]) < ARRIVE_M) {
      const roomMsg = nav.room ? ` Room ${nav.room.code} is on the ${floorName(nav.room.floor)}.` : '';
      setArrived(`You're at ${nav.label}.${roomMsg}${nav.title ? ` ${nav.title}.` : ''}`); setRouteS(null); engineRef.current?.setRoute?.(null); loc.current.stopWalk(); return;
    }
    if (route && offRoute(fix.at, route.pts).d <= REROUTE_M) return;
    const r = nav.bid ? routeTo(graph, fix.at, nav.bid) : nav.at ? routeToPoint(graph, fix.at, nav.at, nav.label) : null;
    if (!r) { setToast(`No walking route to ${nav.label} from here.`); return; }
    if (route) setToast('Off the route: new directions.');
    setRouteS(r); engineRef.current?.setRoute?.(r.pts);
    if (follow === 'off') engineRef.current?.flyTo([(r.pts[0][0] + r.pts[r.pts.length - 1][0]) / 2, (r.pts[0][1] + r.pts[r.pts.length - 1][1]) / 2], 4, 700);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fix, nav, graph]);
  const named = useMemo(() => (world ? [...world.landmarks.map(l => ({ name: l.name, at: l.at })), ...world.buildings.filter(b => !b.unnamed && b.labelPriority <= 2).map(b => ({ name: b.short ?? b.name, at: [b.parts[0].cx, b.parts[0].cy] as XY }))] : []), [world]);
  const step = route && fix ? (() => { const o = offRoute(fix.at, route.pts), left = Math.max(0, route.lengthM - o.along); return { ...nextStep(route.pts, o.along, named), minutes: Math.max(1, Math.round(left / 65)) }; })() : null;

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
    <div className={'app' + (nav || offCampus ? ' has-nav' : '')}>
      <canvas key={use3d ? '3d' : '2d'} ref={canvasRef} className={use3d ? 'map-canvas' : 'map-canvas pixel'} role="img" aria-label="3D map of the IIM Shillong campus. Use search to find buildings, rooms and sessions." />
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
        {nav && !(focus && q) && (
          <div className={'nav' + (arrived ? ' arrived' : '')} role="status" aria-live="polite">
            <div className="grow">
              {arrived ? <div className="big">{arrived}</div>
                : step ? <><div className="big">{step.text}{step.inM > 5 ? ` in ${step.inM} m` : ''}</div><div className="sm">{step.minutes} min to {nav.label}{nav.room ? ` · Room ${nav.room.code}, ${floorName(nav.room.floor)}` : ''}</div></>
                : <><div className="big">Directions to {nav.label}</div><div className="sm">{pickStart ? 'Tap the map where you are.' : 'Waiting for your location…'}</div></>}
            </div>
            {!arrived && !route && !pickStart && <button className="btn" onClick={() => setPickStart(true)}>Pick start</button>}
            <button className="btn" onClick={stopNav} aria-label="End directions">{arrived ? 'Done' : 'End'}</button>
          </div>
        )}
        {offCampus && !nav && <div className="nav warn" role="status"><div className="grow"><div className="big">Not on campus yet</div><div className="sm"><a href="/guide">See the arrival plan</a> to get to Umsawli.</div></div></div>}
        {!(focus && q) && (
          <div className="chips" role="toolbar" aria-label="Filter places">
            {CHIPS.map(c => (
              <button key={c.id} className="chip" aria-pressed={filter === c.id} onClick={() => setFilter(c.id)}>
                {c.icon ? <img className="ci" src={iconUrl(c.icon)} alt="" /> : c.color && <span className="sw" style={{ background: c.color }} />}{c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="controls">
        <button className="ctl" aria-label={follow === 'follow' ? 'Following you: tap to stop' : follow === 'centre' ? 'Tap again to follow you' : 'Show my location'} aria-pressed={follow !== 'off'} onClick={locate}><IconLocate />{follow === 'follow' && <span className="badge">ON</span>}</button>
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
          <button className="btn" style={{ marginTop: 8, width: '100%' }} onClick={() => { setList(true); setLayersOpen(false); }}>Show as a list</button>
          {liveErr && live && <div className="soon">Offline: live data last updated {minutesAgo(live.updated)} min ago.</div>}
        </div>
      )}

      <div className="attrib">{world?.attribution ?? ''} · Layout v2, survey pending</div>

      {places && (
        <BottomSheet sel={sel} places={places} sched={sched} nameOf={nameOf} tier={tier}
          onClose={() => { setSel(null); engineRef.current?.setSelected(null); }}
          onPickPlace={selectPlace} onPickRoom={selectRoom} onToast={setToast} onDirections={directionsFor}
          live={{ events, updated: live ? new Date(live.updated).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : undefined, stale: liveErr }} />
      )}
      {loc.current.sim && (
        <div className="sim" aria-label="GPS simulator (dev)">
          <button className="btn" aria-pressed={simArm} onClick={() => setSimArm(a => !a)}>{simArm ? 'Tap the map…' : 'Sim: place me'}</button>
          {route && <button className="btn" onClick={() => loc.current.walk(route.pts, 8)}>Sim: walk route</button>}
          {route && <button className="btn" onClick={() => { const p = route.pts[Math.floor(route.pts.length / 2)]; loc.current.set([p[0] + 40, p[1] + 30]); }}>Sim: stray 50 m</button>}
        </div>
      )}
      {list && places && <ListView places={places} sched={sched} events={events} onAir={onAir} onClose={() => setList(false)} onShow={p => { setList(false); selectPlace(p); }} onDirections={p => startNav(placeTarget(p))} />}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
