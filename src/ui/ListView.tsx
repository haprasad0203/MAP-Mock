// The list view (Phase 3B): every campus place as an accessible list, grouped by kind, with what is on now, events and
// room changes, and a Map and a Directions button on each row. Opened from Layers or with ?list=1.
import type { Category } from '../geo/types';
import { sessionsIn, type Place, type PlacesData, type ScheduleData } from '../data/places';
import type { LiveEvent } from '../data/live';
import { IconClose, IconWalk } from './icons';

const GROUPS: { id: Category; label: string }[] = [
  { id: 'venue', label: 'Conference venues' }, { id: 'food', label: 'Food and shops' }, { id: 'help', label: 'Help' },
  { id: 'hostel', label: 'Hostels' }, { id: 'sports', label: 'Sports' }, { id: 'service', label: 'Services' }, { id: 'landmark', label: 'Landmarks' }, { id: 'staff', label: 'Staff housing' },
];

interface Props {
  places: PlacesData; sched: ScheduleData | null; events: LiveEvent[]; onAir: string[];
  onClose: () => void; onShow: (p: Place) => void; onDirections: (p: Place) => void;
}
export function ListView({ places, sched, events, onAir, onClose, onShow, onDirections }: Props) {
  return (
    <section className="listview" aria-label="Campus places as a list">
      <div className="lv-head"><h2>Campus list</h2><button className="close" aria-label="Close the list and show the map" onClick={onClose}><IconClose /></button></div>
      {events.length > 0 && (
        <div className="lv-group"><h3>Around campus now</h3>
          <ul>{events.map(e => { const p = places.places.find(x => x.id === e.placeId); return (
            <li key={e.id}><span className="lv-name">{e.label}</span><span className="muted">{p?.name ?? ''}</span>
              {p && <span className="lv-btns"><button className="btn" onClick={() => onShow(p)}>Map</button><button className="btn primary" onClick={() => onDirections(p)} aria-label={`Directions to ${e.label}`}><IconWalk /> Go</button></span>}</li>); })}
          </ul>
        </div>
      )}
      {GROUPS.map(g => {
        const list = places.places.filter(p => p.category === g.id && !p.landmarkOnly).sort((a, b) => a.name.localeCompare(b.name));
        if (!list.length) return null;
        return (
          <div className="lv-group" key={g.id}><h3>{g.label}</h3>
            <ul>{list.map(p => {
              const bid = p.buildingId ?? '', on = bid && onAir.includes(bid) && p.buildingId === p.id;
              const now = on && sched ? sessionsIn(bid, sched, places.rooms).running : [];
              return (
                <li key={p.id}>
                  <span className="lv-name">{on && <span className="onair">ON AIR</span>} {p.name}</span>
                  <span className="muted">{now.length ? now.map(s => `${s.title} · Room ${s.room}`).join('; ') : p.hours ?? (p.inside?.slice(0, 3).join(', ') ?? '')}</span>
                  <span className="lv-btns"><button className="btn" onClick={() => onShow(p)} aria-label={`Show ${p.name} on the map`}>Map</button>
                    <button className="btn primary" onClick={() => onDirections(p)} aria-label={`Directions to ${p.name}`}><IconWalk /> Go</button></span>
                </li>
              );
            })}</ul>
          </div>
        );
      })}
    </section>
  );
}
