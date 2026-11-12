import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { sanitize, search, type PlacesData } from './places';
import { fitAffine, fitSimilarity, apply, residuals } from '../geo/fit';
import { toLatLon, toLocal, type XY } from '../geo/grid';

const places: PlacesData = JSON.parse(fs.readFileSync('public/data/places.json', 'utf8'));
const layout = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));

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
  it('every place building exists in the layout', () => {
    const ids = new Set(layout.buildings.map((b: any) => b.id));
    for (const p of places.places) if (p.buildingId) expect(ids.has(p.buildingId)).toBe(true);
    for (const r of places.rooms) expect(ids.has(r.buildingId)).toBe(true);
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
