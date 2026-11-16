// The conference-live layer (Phase 3B): ON AIR buildings, event pins, meal times and room changes, read from a LiveSource.
// The fixture source reads public/data/live.json; the WMC app can swap in a polling source with the same shape.
// The clock is data/places.ts now(), so ?now=2026-11-27T10:30 previews any moment of the conference.
import { now, type PlacesData, type ScheduleData, type Session } from './places';

export interface LiveEvent { id: string; label: string; placeId: string; icon?: string; from: string; to: string; confirm?: string }
export interface RoomChange { sessionId: string; from: string; to: string; note?: string; since?: string }
export interface LiveData { updated: string; events: LiveEvent[]; meals?: { placeId: string } & Record<'breakfast' | 'lunch' | 'dinner', [string, string]>; roomChanges: RoomChange[] }
export interface LiveSource { load(): Promise<LiveData>; pollMs?: number }
export const fixtureLive: LiveSource = { load: () => fetch('/data/live.json', { cache: 'no-cache' }).then(r => r.json()), pollMs: 60000 };

export type LiveSession = Session & { movedFrom?: string; moveNote?: string };
/** The schedule with room changes applied: the session now lists its new room, and remembers the old one. */
export function applyRoomChanges(s: ScheduleData, live: LiveData | null): ScheduleData {
  if (!live) return s;
  return { ...s, sessions: s.sessions.map(x => { const c = live.roomChanges.find(r => r.sessionId === x.id); return c ? { ...x, room: c.to, movedFrom: c.from, moveNote: c.note } as LiveSession : x; }) };
}
/** Buildings with a session running now. */
export function onAirBuildings(s: ScheduleData | null, P: PlacesData | null, at = now()): string[] {
  if (!s || !P) return [];
  const t = +at, ids = new Set<string>();
  for (const x of s.sessions) if (+new Date(x.start) <= t && t < +new Date(x.end)) { const r = P.rooms.find(r => r.code === x.room); if (r) ids.add(r.buildingId); }
  return [...ids];
}
/** Events on now or later today, and the meal running now at the mess (as "Lunch now"). */
export function activeEvents(live: LiveData | null, at = now()): LiveEvent[] {
  if (!live) return [];
  const t = +at, out = live.events.filter(e => +new Date(e.from) <= t && t < +new Date(e.to));
  if (live.meals) {
    const hm = at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
    for (const m of ['breakfast', 'lunch', 'dinner'] as const) { const [a, b] = live.meals[m]; if (hm >= a && hm < b) out.push({ id: 'meal', label: `${m[0].toUpperCase()}${m.slice(1)} now`, placeId: live.meals.placeId, icon: 'food', from: '', to: '' }); }
  }
  return out;
}
/** Room changes that matter now: from `since` until the session ends. */
export function activeRoomChanges(live: LiveData | null, s: ScheduleData | null, at = now()): (RoomChange & { session: Session })[] {
  if (!live || !s) return [];
  const t = +at;
  return live.roomChanges.flatMap(c => { const x = s.sessions.find(y => y.id === c.sessionId); return x && (!c.since || +new Date(c.since) <= t) && t < +new Date(x.end) ? [{ ...c, session: x }] : []; });
}
export const minutesAgo = (iso: string, at = now()) => Math.max(0, Math.round((+at - +new Date(iso)) / 60000));
