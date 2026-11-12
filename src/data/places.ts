import type { XY } from '../geo/grid';
import type { Category } from '../geo/types';

export interface Place {
  id: string; name: string; category: Category; buildingId?: string; areaId?: string; landmarkId?: string; at?: XY;
  aliases: string[]; inside?: string[]; hours?: string; menu?: string; phone?: string; floor?: string; confirm?: string; landmarkOnly?: boolean;
}
export interface Room { code: string; name?: string; buildingId: string; floor: number }
export interface Session { id: string; title: string; start: string; end: string; room: string; track?: string; papers?: string[] }
export interface PlacesData { places: Place[]; rooms: Room[]; excluded: string[] }
export interface ScheduleData { sessions: Session[]; mess: Record<string, { breakfast: string; lunch: string; dinner: string }> }

/** Adapters: swap these for the WMC app's venue / schedule stores without touching the map. */
export interface PlacesSource { load(): Promise<PlacesData> }
export interface ScheduleSource { load(): Promise<ScheduleData> }
export const fixturePlaces: PlacesSource = { load: () => fetch('/data/places.json').then(r => r.json()) };
export const fixtureSchedule: ScheduleSource = { load: () => fetch('/data/sessions.json').then(r => r.json()) };

/** Removes anything that is not campus (Lariti and neighbours), whatever the source says. */
export function sanitize(d: PlacesData): PlacesData {
  const bad = (s: string) => d.excluded.some(x => s.toLowerCase().includes(x.toLowerCase()));
  return { ...d, places: d.places.filter(p => !bad(p.name) && !p.aliases.some(bad)) };
}

export const floorName = (f: number) => (f === 0 ? 'ground floor' : f === 1 ? '1st floor' : f === 2 ? '2nd floor' : f === 3 ? '3rd floor' : `${f}th floor`);

// ---------- clock (mock "now" so the conference can be previewed before 27 Nov) ----------
export function now(): Date {
  const q = new URLSearchParams(location.search).get('now');
  const d = q ? new Date(q.includes('+') || q.endsWith('Z') ? q : q + '+05:30') : new Date();
  return isNaN(+d) ? new Date() : d;
}
export function sessionsIn(buildingId: string, s: ScheduleData, rooms: Room[], at = now()) {
  const inB = s.sessions.filter(x => rooms.find(r => r.code === x.room)?.buildingId === buildingId);
  const t = +at;
  const running = inB.filter(x => +new Date(x.start) <= t && t < +new Date(x.end));
  const next = inB.filter(x => +new Date(x.start) > t).sort((a, b) => +new Date(a.start) - +new Date(b.start)).slice(0, 2);
  return { running, next };
}
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
export const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

// ---------- search ----------
export type Hit =
  | { kind: 'place'; place: Place; score: number; label: string; sub: string }
  | { kind: 'room'; room: Room; score: number; label: string; sub: string }
  | { kind: 'session'; session: Session; room?: Room; score: number; label: string; sub: string };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function score(q: string, text: string): number {
  const t = norm(text); if (!q || !t) return 0;
  if (t === q) return 100; if (t.startsWith(q)) return 80; if (t.includes(' ' + q)) return 65; if (t.includes(q)) return 50;
  // all query words present (any order)
  const words = q.split(' '); if (words.every(w => t.includes(w))) return 40;
  // subsequence fuzzy
  let i = 0; for (const ch of t) if (ch === q[i]) i++;
  return i === q.length && q.length >= 3 ? 20 : 0;
}
export function search(qRaw: string, P: PlacesData, S: ScheduleData | null, nameOf: (bid: string) => string): Hit[] {
  const q = norm(qRaw); if (!q) return [];
  const hits: Hit[] = [];
  for (const p of P.places) {
    const s = Math.max(score(q, p.name), ...p.aliases.map(a => score(q, a) - 5), ...(p.inside ?? []).map(a => score(q, a) - 12));
    if (s > 0) hits.push({ kind: 'place', place: p, score: s + (p.landmarkOnly ? -10 : 0), label: p.name, sub: p.buildingId && p.buildingId !== p.id ? nameOf(p.buildingId) : cap(p.category) });
  }
  for (const r of P.rooms) {
    const s = Math.max(score(q, r.code) + 10, score(q, 'room ' + r.code), r.name ? score(q, r.name) : 0);
    if (s > 0) hits.push({ kind: 'room', room: r, score: s, label: r.name ? `${r.name}` : `Room ${r.code}`, sub: `${nameOf(r.buildingId)} · ${floorName(r.floor)}` });
  }
  for (const x of S?.sessions ?? []) {
    const s = Math.max(score(q, x.title) - 5, ...(x.papers ?? []).map(p => score(q, p) - 10), x.track ? score(q, x.track) - 15 : 0);
    if (s > 0) { const room = P.rooms.find(r => r.code === x.room); hits.push({ kind: 'session', session: x, room, score: s, label: x.title, sub: `${fmtDay(x.start)} ${fmtTime(x.start)} · ${room ? nameOf(room.buildingId) + ' ' + (room.name ?? room.code) : x.room}` }); }
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, 12);
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
