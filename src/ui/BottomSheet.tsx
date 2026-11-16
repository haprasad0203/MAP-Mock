import { useEffect, useState } from 'react';
import type { Tier } from '../render/iso';
import { floorName, fmtDay, fmtTime, now, sessionsIn, type Place, type PlacesData, type Room, type ScheduleData, type Session } from '../data/places';
import { IconClose, IconPhone, IconShare, IconWalk } from './icons';

// Place-card pictures (Phase 4): our own real-campus 3D models (public/campus-art/model, made by scripts/thumbs.mjs), by place
// or building id. The Gemini renders are no longer shown.
const THUMB: Record<string, string> = {
  admin: 'admin', nab: 'nab', 'cafe-cloud': 'cafe-cloud', 'hostel-1': 'hostel-1', 'hostel-2': 'hostel-2', 'hostel-3': 'hostel-3', 'hostel-4': 'hostel-4',
  'kalam-centre': 'kalam-centre', 'main-gate': 'guard-room', mess: 'mess', 'octagon-hall': 'octagon-hall', gym: 'gym', type2: 'type2', type3: 'type3',
};

export interface Selection { kind: 'building'; buildingId: string; place?: Place; room?: Room; session?: Session; note?: string }

interface Props {
  sel: Selection | null; places: PlacesData; sched: ScheduleData | null; nameOf: (id: string) => string; tier: Tier;
  onClose: () => void; onPickPlace: (p: Place) => void; onPickRoom: (r: Room) => void; onToast: (s: string) => void;
  /** Phase 3B: walking directions to this selection. */
  onDirections?: (sel: Selection) => void;
  /** Phase 3B live layer: events on now, room changes, when the live data was last updated. */
  live?: { events: { id: string; label: string; placeId: string }[]; updated?: string; stale?: boolean };
}

export function BottomSheet({ sel, places, sched, nameOf, onClose, onPickRoom, onToast, onDirections, live }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(!!sel); }, [sel]);
  const t = now();

  if (!sel) {
    // idle: "On now"
    const all = sched?.sessions ?? [];
    const running = all.filter(s => +new Date(s.start) <= +t && +t < +new Date(s.end));
    const upcoming = all.filter(s => +new Date(s.start) > +t).sort((a, b) => +new Date(a.start) - +new Date(b.start)).slice(0, 4);
    const roomOf = (s: Session) => places.rooms.find(r => r.code === s.room);
    return (
      <div className="sheet"><div className={'sheet-inner' + (open ? '' : ' collapsed')}>
        <button className="handle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <span className="grip" />
          <span>
            <h2>{running.length ? <><span className="onair">ON AIR</span> {running.length} session{running.length > 1 ? 's' : ''} now</> : 'On now'}</h2>
            <div className="sub">{running.length ? 'Tap to see where' : upcoming[0] ? `Next: ${fmtDay(upcoming[0].start)} ${fmtTime(upcoming[0].start)} · ${upcoming[0].title}` : 'Nothing scheduled'}</div>
          </span>
        </button>
        <div className="sheet-body">
          {running.length > 0 && <div className="sec"><h4>Running now</h4>{running.map(s => <SessionRow key={s.id} s={s} room={roomOf(s)} nameOf={nameOf} onGo={onPickRoom} />)}</div>}
          <div className="sec"><h4>Coming up</h4>{upcoming.map(s => <SessionRow key={s.id} s={s} room={roomOf(s)} nameOf={nameOf} onGo={onPickRoom} />)}</div>
          {live && live.events.length > 0 && <div className="sec"><h4>Around campus now</h4><div className="tags">{live.events.map(e => <span className="tag" key={e.id}>{e.label}</span>)}</div></div>}
          <div className="muted" style={{ marginTop: 8 }}>WMC 2026 · 27–29 Nov · IIM Shillong, Umsawli{live?.updated ? ` · live data updated ${live.updated}` : ''}</div>
        </div>
      </div></div>
    );
  }

  const p = sel.place; const bid = sel.buildingId || p?.buildingId || '';
  const title = sel.room ? (sel.room.name ?? `Room ${sel.room.code}`) : p?.name ?? nameOf(bid);
  const sub = sel.room ? `${nameOf(sel.room.buildingId)} · ${floorName(sel.room.floor)}` : p?.floor ? `${nameOf(bid)} · ${p.floor}` : p && bid && p.buildingId !== p.id && p.buildingId ? `In ${nameOf(bid)}` : '';
  const { running, next } = bid && sched ? sessionsIn(bid, sched, places.rooms, t) : { running: [], next: [] };
  const roomsHere = places.rooms.filter(r => r.buildingId === bid);
  const menu = p?.menu && sched ? sched.mess[t.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })] : undefined;
  const thumb = sel.room ? undefined : THUMB[p?.id ?? ''] ?? (p && p.buildingId !== p.id ? undefined : THUMB[bid]);
  const share = async () => {
    const url = `${location.origin}/campus?${sel.room ? 'room=' + encodeURIComponent(sel.room.code) : 'place=' + encodeURIComponent(p?.id ?? bid)}`;
    try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); onToast('Link copied'); } } catch { /* cancelled */ }
  };
  return (
    <div className="sheet"><div className={'sheet-inner' + (open ? '' : ' collapsed')}>
      <div style={{ display: 'flex', alignItems: 'flex-start' }}>
        <button className="handle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <span className="grip" />
          <span><h2>{title}</h2>{sub && <div className="sub">{sub}</div>}</span>
        </button>
        <button className="close" style={{ margin: '8px 8px 0 0' }} aria-label="Close place card" onClick={onClose}><IconClose /></button>
      </div>
      <div className="sheet-body">
        {thumb && <img className="thumb" src={`/campus-art/model/${thumb}.webp`} alt="" loading="lazy" />}
        {sel.note && <div className="confirm" role="status">{sel.note}</div>}
        {sel.session && (sel.session as Session & { movedFrom?: string }).movedFrom && <div className="confirm" role="status"><b>Room changed:</b> {(sel.session as Session & { movedFrom?: string }).movedFrom} → {sel.session.room}</div>}
        {sel.session && <div className="sec"><h4>Your session</h4><div className="row"><span className="time">{fmtTime(sel.session.start)}</span><span>{sel.session.title}</span></div></div>}
        {sel.room && <div className="sec"><div className="row"><span>Room <b>{sel.room.code}</b> is on the <b>{floorName(sel.room.floor)}</b> of {nameOf(sel.room.buildingId)}.</span></div></div>}
        {(running.length > 0 || next.length > 0) && (
          <div className="sec"><h4>What's on here</h4>
            {running.map(s => <div className="row" key={s.id}><span className="onair">ON AIR</span><span>{s.title}<div className="muted">Room {s.room}{(s as Session & { movedFrom?: string }).movedFrom ? ` (moved from ${(s as Session & { movedFrom?: string }).movedFrom})` : ''} · until {fmtTime(s.end)}</div></span></div>)}
            {next.map(s => <div className="row" key={s.id}><span className="time">{fmtTime(s.start)}</span><span>{s.title}<div className="muted">{fmtDay(s.start)} · Room {s.room}</div></span></div>)}
          </div>
        )}
        {p?.inside && <div className="sec"><h4>Inside</h4><div className="tags">{p.inside.map(x => <span className="tag" key={x}>{x}</span>)}</div></div>}
        {!sel.room && roomsHere.length > 0 && <div className="sec"><h4>Rooms</h4><div className="tags">{roomsHere.map(r => <button className="tag" key={r.code} onClick={() => onPickRoom(r)}>{r.name ?? r.code} · {r.floor === 0 ? 'G' : r.floor}F</button>)}</div></div>}
        {p?.hours && <div className="sec"><h4>Hours</h4><div style={{ fontSize: 14 }}>{p.hours}</div></div>}
        {menu && <div className="sec"><h4>Today's menu</h4><div style={{ fontSize: 14 }}><b>Breakfast</b> {menu.breakfast}<br /><b>Lunch</b> {menu.lunch}<br /><b>Dinner</b> {menu.dinner}</div></div>}
        {p?.confirm && <div className="confirm">To confirm with organisers: {p.confirm}</div>}
        <div className="btns">
          <button className="btn primary" onClick={() => (onDirections ? onDirections(sel) : onToast('Directions are not available on this map.'))}><IconWalk /> Directions</button>
          {p?.phone && <a className="btn" href={`tel:${p.phone}`}><IconPhone /> Call</a>}
          <button className="btn" onClick={share}><IconShare /> Share</button>
        </div>
      </div>
    </div></div>
  );
}

function SessionRow({ s, room, nameOf, onGo }: { s: Session; room?: Room; nameOf: (id: string) => string; onGo: (r: Room) => void }) {
  return (
    <div className="row">
      <span className="time">{fmtTime(s.start)}</span>
      <span style={{ flex: 1 }}>{s.title}<div className="muted">{fmtDay(s.start)} · {room ? `${nameOf(room.buildingId)} · ${room.name ?? 'Room ' + room.code}` : s.room}{(s as Session & { movedFrom?: string }).movedFrom ? <b> · room changed</b> : null}</div></span>
      {room && <button className="btn" style={{ minHeight: 36, padding: '0 10px' }} onClick={() => onGo(room)} aria-label={`Show ${s.title} on the map`}>Map</button>}
    </div>
  );
}
