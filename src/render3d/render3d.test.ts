import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import * as THREE from 'three';
import type { CampusLayout } from '../geo/types';
import type { XY } from '../geo/grid';
import { LEVELS } from '../render/iso';
import { Terrain, partFootprint, pointInPoly } from './terrain';
import { applyPose, distanceFor, kFor, pxPerMetre, screenToGround, screenToPlane, worldToScreen } from './camera';
import { Buckets } from './mesh';
import { addBuilding, addHouses } from './buildings';

const layout: CampusLayout = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));
const osm = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const terrainData = JSON.parse(fs.readFileSync('public/data/terrain.json', 'utf8'));
const surroundings = JSON.parse(fs.readFileSync('public/data/surroundings.json', 'utf8'));
const xs = layout.boundary.map(p => p[0]), ys = layout.boundary.map(p => p[1]);
const terrain = new Terrain(terrainData, {
  buildings: layout.buildings, areas: [...layout.areas.filter(a => a.id !== 'lake'), ...osm.areas], paths: [...osm.roads, ...layout.paths],
  bounds: { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) },
});

describe('terrain', () => {
  it('every building stands on a flat pad at its groundElev', () => {
    const bad: string[] = [];
    for (const b of layout.buildings) for (const p of b.parts) {
      const poly = partFootprint(p); if (!pointInPoly(p.cx, p.cy, poly)) continue;
      const h = terrain.heightAt(p.cx, p.cy);
      if (Math.abs(h - b.groundElev!) > 0.2) bad.push(`${b.id}: ${h.toFixed(1)} vs ${b.groundElev}`);
    }
    expect(bad).toEqual([]);
  });
  it('the lake bed is below the water surface and the hostels climb the slope', () => {
    const lake = osm.areas.find((a: any) => a.kind === 'water').pts as XY[];
    const c: XY = [lake.reduce((s, p) => s + p[0], 0) / lake.length, lake.reduce((s, p) => s + p[1], 0) / lake.length];
    if (pointInPoly(c[0], c[1], lake)) expect(terrain.heightAt(c[0], c[1])).toBeLessThan(0);
    const at = (id: string) => { const p = layout.buildings.find(b => b.id === id)!.parts[0]; return terrain.heightAt(p.cx, p.cy); };
    expect(at('hostel-3')).toBeGreaterThan(at('hostel-2')); expect(at('hostel-2')).toBeGreaterThan(at('hostel-1'));
  });
  it('is finite and continuous across the whole world, including beyond the DEM', () => {
    for (let x = -3000; x <= 3000; x += 150) for (let y = -3000; y <= 3000; y += 150) expect(Number.isFinite(terrain.heightAt(x, y))).toBe(true);
    // no cliff where the fine campus grid meets the base grid
    const f = terrain.fine, edge = f.x0 + (f.nx - 1) * f.step;
    for (let y = f.y0 + 10; y < f.y0 + (f.ny - 1) * f.step; y += 37) expect(Math.abs(terrain.heightAt(edge - 0.5, y) - terrain.heightAt(edge + 0.5, y))).toBeLessThan(1);
  });
});

describe('camera', () => {
  const W = 390, H = 844;
  it('zoom level and camera distance convert both ways, at the 2D map scale', () => {
    for (const k of LEVELS) expect(kFor(distanceFor(k, H), H)).toBeCloseTo(k, 6);
    // a metre on the ground at the centre covers pxPerMetre(k) pixels across the screen
    const cam = new THREE.PerspectiveCamera(), k = LEVELS[4];
    applyPose(cam, { cx: 0, cy: 0, h: 0, k, rot: 0 }, W, H);
    const a = worldToScreen(cam, 0, 0, 0, W, H), b = worldToScreen(cam, 10 / Math.SQRT2, 10 / Math.SQRT2, 0, W, H); // 10 m to the north-east = screen right at rot 0
    expect(b[0] - a[0]).toBeCloseTo(10 * pxPerMetre(k), 0); expect(Math.abs(b[1] - a[1])).toBeLessThan(0.5);
  });
  it('screen → ground → screen round-trips on the terrain, at every rotation', () => {
    const cam = new THREE.PerspectiveCamera(), hAt = (x: number, y: number) => terrain.heightAt(x, y);
    for (const rot of [0, 1, 2, 3]) {
      applyPose(cam, { cx: -150, cy: 250, h: terrain.baseAt(-150, 250), k: LEVELS[5], rot }, W, H);
      for (const [px, py] of [[195, 422], [40, 120], [350, 760]]) {
        const g = screenToGround(cam, px, py, W, H, hAt, terrain.baseAt(-150, 250)), s = worldToScreen(cam, g[0], g[1], hAt(g[0], g[1]), W, H);
        expect(Math.hypot(s[0] - px, s[1] - py)).toBeLessThan(1.5);
      }
      const c = screenToPlane(cam, W / 2, H / 2, W, H, terrain.baseAt(-150, 250));
      expect(Math.hypot(c[0] + 150, c[1] - 250)).toBeLessThan(0.01);
    }
  });
});

describe('building geometry', () => {
  it('builds every building and part without NaN, from the true footprint', () => {
    const B = new Buckets(); let parts = 0;
    for (const b of layout.buildings) {
      const info = addBuilding(B, b, layout.entrances); parts += b.parts.length;
      expect(info.top).toBeGreaterThan(b.groundElev! + 2);
      expect(Number.isFinite(info.centre[0] + info.centre[1])).toBe(true);
    }
    expect(parts).toBe(layout.buildings.reduce((s, b) => s + b.parts.length, 0));
    for (const [key, b] of B.map) { expect(b.pos.every(Number.isFinite), key).toBe(true); expect(b.nor.every(Number.isFinite), key).toBe(true); expect(b.uv.every(Number.isFinite), key).toBe(true); }
    expect(B.triangles).toBeGreaterThan(5000); expect(B.triangles).toBeLessThan(120000);
  });
  it('roofs face up and walls face out', () => {
    const B = new Buckets(), b = layout.buildings.find(x => x.id === 'hostel-2')!; addBuilding(B, b, layout.entrances);
    const roof = B.map.get('roofGreen')!; let up = 0, n = 0;
    for (let i = 1; i < roof.nor.length; i += 3) { n++; if (roof.nor[i] > 0.05) up++; }
    expect(up / n).toBeGreaterThan(0.98);
    // one part on its own, without the stair tower, so every facade triangle belongs to its outline
    const p = { ...b.parts[0], glass: undefined, balconies: false }, B1 = new Buckets(); addBuilding(B1, { ...b, parts: [p] }, []);
    const wall = B1.map.get('facadeCream')!; let out = 0, m = 0;
    for (let i = 0; i < wall.pos.length; i += 9) { // normal · (triangle − part centre) > 0 for that part's walls
      const dx = wall.pos[i] - p.cx, dz = wall.pos[i + 2] + p.cy; if (Math.hypot(dx, dz) > p.w) continue;
      m++; if (wall.nor[i] * dx + wall.nor[i + 2] * dz > 0) out++;
    }
    expect(m).toBeGreaterThan(4); expect(out).toBe(m);
  });
  it('surroundings are off campus and build into one cheap mesh', () => {
    expect(surroundings.houses.length).toBeGreaterThan(100);
    for (const h of surroundings.houses) for (const q of h.p) expect(pointInPoly(q[0], q[1], layout.boundary)).toBe(false);
    const B = new Buckets(); addHouses(B, surroundings.houses, (x, y) => terrain.heightAt(x, y));
    expect([...B.map.keys()]).toEqual(['house']); expect(B.map.get('house')!.pos.every(Number.isFinite)).toBe(true);
  });
});

describe('facade atlases (Phase 3M)', () => {
  const cfg = JSON.parse(fs.readFileSync('public/data/facades.json', 'utf8'));
  it('every marked face has 4 corners and a real height, and every piece lies inside its face', () => {
    for (const [id, F] of Object.entries<any>(cfg.facades)) for (const f of F.faces) {
      expect(f.quad.length, `${id}/${f.name}`).toBe(4);
      expect(f.heightM, `${id}/${f.name}`).toBeGreaterThan(0);
      for (const p of f.pieces ?? []) for (const r of [p.u, p.v]) { expect(r[0]).toBeGreaterThanOrEqual(0); expect(r[1]).toBeLessThanOrEqual(1); expect(r[1]).toBeGreaterThan(r[0]); }
    }
  });
  it('no wall is painted from a Gemini render (REAL_CAMPUS_MODELS.md: real photos only)', () => {
    for (const [id, F] of Object.entries<any>(cfg.facades)) expect(String(F.file ?? F.source ?? ''), id).not.toMatch(/generated\/raw|tycoon/);
  });
  it('every atlas region lies inside its atlas, and the atlas file exists', () => {
    for (const [id, F] of Object.entries<any>(cfg.facades)) {
      if (!F.atlas) continue;
      expect(fs.existsSync(`public${F.atlas.file}`), id).toBe(true);
      for (const [name, r] of Object.entries<any>(F.atlas.regions)) {
        expect(r.x >= 0 && r.y >= 0 && r.x + r.w <= F.atlas.w && r.y + r.h <= F.atlas.h, `${id}/${name}`).toBe(true);
        expect(r.wm > 0 && r.hm > 0, `${id}/${name}`).toBe(true);
      }
    }
  });
});
