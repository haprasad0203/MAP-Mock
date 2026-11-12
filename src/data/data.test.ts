import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { sanitize, search, type PlacesData } from './places';
import { fitAffine, fitSimilarity, apply, residuals } from '../geo/fit';
import { toLatLon, toLocal, type XY } from '../geo/grid';

const places: PlacesData = JSON.parse(fs.readFileSync('public/data/places.json', 'utf8'));
const layout = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));
const osm = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const sessions = JSON.parse(fs.readFileSync('public/data/sessions.json', 'utf8'));

describe('place data', () => {
  it('never contains off-campus names (Lariti etc.)', () => {
    const banned = places.excluded.map(s => s.toLowerCase());
    const texts = [
      ...places.places.flatMap(p => [p.name, ...p.aliases, ...(p.inside ?? [])]),
      ...layout.buildings.map((b: any) => b.name), ...layout.landmarks.map((l: any) => l.name),
    ].map(s => s.toLowerCase());
    for (const b of banned) expect(texts.filter(t => t.includes(b))).toEqual([]);
  });
  it('sanitize() strips excluded places even if a source adds them', () => {
    const dirty = { ...places, places: [...places.places, { id: 'x', name: 'Lariti', category: 'food', aliases: [] } as any] };
    expect(sanitize(dirty).places.some(p => p.name === 'Lariti')).toBe(false);
  });
  it('every buildingId, areaId and landmarkId in places, rooms and sessions exists in the layout', () => {
    const b = new Set(layout.buildings.map((x: any) => x.id)), a = new Set(layout.areas.map((x: any) => x.id)), l = new Set(layout.landmarks.map((x: any) => x.id));
    const bad: string[] = [];
    for (const p of places.places as any[]) {
      if (p.buildingId && !b.has(p.buildingId)) bad.push(`place ${p.id} -> building ${p.buildingId}`);
      if (p.areaId && !a.has(p.areaId)) bad.push(`place ${p.id} -> area ${p.areaId}`);
      if (p.landmarkId && !l.has(p.landmarkId)) bad.push(`place ${p.id} -> landmark ${p.landmarkId}`);
    }
    for (const r of places.rooms) if (!b.has(r.buildingId)) bad.push(`room ${r.code} -> building ${r.buildingId}`);
    const codes = new Set(places.rooms.map(r => r.code));
    for (const s of sessions.sessions as any[]) {
      if (s.room && !codes.has(s.room)) bad.push(`session ${s.id} -> room ${s.room}`);
      if (s.buildingId && !b.has(s.buildingId)) bad.push(`session ${s.id} -> building ${s.buildingId}`);
      if (s.placeId && !places.places.some(p => p.id === s.placeId)) bad.push(`session ${s.id} -> place ${s.placeId}`);
    }
    expect(bad).toEqual([]);
  });
  it('v2 decisions: Auditorium and Library live in the Admin Block; Tin Café has no building', () => {
    const byId = (id: string) => places.places.find(p => p.id === id) as any;
    expect(byId('auditorium').buildingId).toBe('admin');
    expect(byId('library').buildingId).toBe('admin');
    expect(byId('tin-cafe').buildingId).toBeUndefined();
    for (const code of ['AUD', 'LIB-R']) expect(places.rooms.find(r => r.code === code)?.buildingId).toBe('admin');
  });
  it('search finds rooms, aliases and shops', () => {
    const name = (id: string) => id;
    expect(search('104', places, null, name)[0]).toMatchObject({ kind: 'room' });
    expect(search('D Block', places, null, name)[0].label).toContain('D Block');
    expect(search('laundry', places, null, name)[0].label).toContain('Laundry');
  });
});

describe('geometry', () => {
  it('lat/lon <-> local metres round-trips', () => {
    const p: XY = [123.4, -567.8]; const ll = toLatLon(p); const q = toLocal(ll.lat, ll.lon);
    expect(Math.hypot(q[0] - p[0], q[1] - p[1])).toBeLessThan(1e-6);
  });
  it('similarity fit recovers a known rotation+scale+shift', () => {
    const src: XY[] = [[0, 0], [100, 0], [0, 80], [-50, 30]];
    const th = 0.2, s = 1.05, tr: XY = [12, -7];
    const dst = src.map(([x, y]) => [s * (x * Math.cos(th) - y * Math.sin(th)) + tr[0], s * (x * Math.sin(th) + y * Math.cos(th)) + tr[1]] as XY);
    const t = fitSimilarity(src, dst);
    expect(Math.max(...residuals(t, src, dst))).toBeLessThan(1e-9);
    expect(Math.hypot(t.a, t.b)).toBeCloseTo(s, 9);
  });
  it('affine fit handles shear', () => {
    const src: XY[] = [[0, 0], [100, 0], [0, 100], [60, 70]];
    const dst = src.map(([x, y]) => [1.02 * x + 0.05 * y + 3, -0.03 * x + 0.98 * y - 4] as XY);
    const t = fitAffine(src, dst); const q = apply(t, [40, 40]);
    expect(q[0]).toBeCloseTo(1.02 * 40 + 0.05 * 40 + 3, 6); expect(q[1]).toBeCloseTo(-0.03 * 40 + 0.98 * 40 - 4, 6);
  });
});

// ---------- layout v2 checks (RESTYLE_TYCOON section 0.3) ----------
type Seg = [XY, XY];
const segDist = (p: XY, [a, b]: Seg) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  const t = L ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L)) : 0;
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
};
const cross = ([a, b]: Seg, [c, d]: Seg) => {
  const o = (p: XY, q: XY, r: XY) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
};
const lines: { id: string; segs: Seg[]; ends: XY[] }[] = [...osm.roads, ...layout.paths].map((p: any) => ({
  id: p.id, segs: p.pts.slice(1).map((q: XY, i: number) => [p.pts[i], q] as Seg), ends: [p.pts[0], p.pts[p.pts.length - 1]],
}));
const near = (p: XY, li: number) => Math.min(...lines[li].segs.map(s => segDist(p, s)));
// union-find: lines join when an endpoint is within 3 m of the other line, or two segments cross
const parent = lines.map((_, i) => i);
const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
  if (find(i) === find(j)) continue;
  const joined = lines[i].ends.some(e => near(e, j) <= 3) || lines[j].ends.some(e => near(e, i) <= 3)
    || lines[i].segs.some(a => lines[j].segs.some(b => cross(a, b)));
  if (joined) parent[find(i)] = find(j);
}
const compLen = new Map<number, number>();
lines.forEach((l, i) => compLen.set(find(i), (compLen.get(find(i)) ?? 0) + l.segs.reduce((s, [a, b]) => s + Math.hypot(b[0] - a[0], b[1] - a[1]), 0)));
const main = [...compLen.entries()].sort((a, b) => b[1] - a[1])[0][0];

const inPoly = ([x, y]: XY, poly: XY[]) => {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
};
const boundary: XY[] = layout.boundary;
const boundarySegs: Seg[] = boundary.map((p, i) => [p, boundary[(i + 1) % boundary.length]] as Seg);
const centreOf = (b: any): XY => [b.parts.reduce((s: number, q: any) => s + q.cx, 0) / b.parts.length, b.parts.reduce((s: number, q: any) => s + q.cy, 0) / b.parts.length];

describe('layout v2', () => {
  it('is version 2 with credits, and every part has a footprint poly', () => {
    expect(layout.version).toBe(2);
    for (const src of ['OpenStreetMap', 'Overture', 'Google Open Buildings', 'Microsoft']) expect(layout.attribution).toContain(src);
    const missing = layout.buildings.flatMap((b: any) => b.parts.filter((p: any) => !Array.isArray(p.poly) || p.poly.length < 3).map(() => b.id));
    expect(missing).toEqual([]);
  });
  it('unnamed buildings have no place entry', () => {
    const unnamed = new Set(layout.buildings.filter((b: any) => b.unnamed).map((b: any) => b.id));
    expect(places.places.filter(p => p.buildingId && unnamed.has(p.buildingId)).map(p => p.id)).toEqual([]);
  });
  it('every entrance is within 3 m of the path network', () => {
    const far = layout.entrances.map((e: any) => ({ id: e.id, d: Math.min(...lines.map((_, i) => near(e.at, i))) })).filter((x: any) => x.d > 3);
    expect(far.map((x: any) => `${x.id} ${x.d.toFixed(1)} m`)).toEqual([]);
  });
  it('every entrance reaches the main connected network (small detached pieces are allowed)', () => {
    const off = layout.entrances.filter((e: any) => !lines.some((_, i) => find(i) === main && near(e.at, i) <= 3)).map((e: any) => e.id);
    expect(off).toEqual([]);
  });
  it('every place pin is inside the boundary (10 m tolerance); only the ATM is outside', () => {
    const at = (p: any): XY | null => {
      if (p.at) return p.at;
      if (p.buildingId) { const b = layout.buildings.find((x: any) => x.id === p.buildingId); return b ? centreOf(b) : null; }
      if (p.landmarkId) return layout.landmarks.find((x: any) => x.id === p.landmarkId)?.at ?? null;
      return null;
    };
    const outside = (places.places as any[]).filter(p => {
      if (p.id === 'atm' || p.landmarkId === 'atm') return false;
      const q = at(p); if (!q) return false;
      return !inPoly(q, boundary) && Math.min(...boundarySegs.map(s => segDist(q, s))) > 10;
    }).map(p => p.id);
    expect(outside).toEqual([]);
  });
});
