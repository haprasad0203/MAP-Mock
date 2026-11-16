import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import type { XY } from '../geo/grid';
import type { CampusLayout, Hardscape, PathLine } from '../geo/types';
import { SchematicSurveySource } from '../geo/source';
import { ARRIVE_M, astar, buildGraph, nextStep, offRoute, REROUTE_M, routeTo, walkable, type Graph } from './graph';
import { smooth } from './location';

const layout: CampusLayout = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));
const osm = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const hardscape: Hardscape = JSON.parse(fs.readFileSync('public/data/hardscape.json', 'utf8'));
const src = new SchematicSurveySource(layout, osm, [], hardscape);
const inside = (p: XY) => Math.abs(p[0]) < 800 && Math.abs(p[1]) < 800;

describe('walking graph and routing (Phase 3B)', () => {
  it('A* finds the shortest way on a toy graph', () => {
    // a square with a long way round: 0-1-2 is 20 m, 0-3-2 is 40 m
    const g: Graph = { pts: [[0, 0], [10, 0], [10, 10], [-10, 20]], adj: [[], [], [], []], entrance: new Map() };
    const e = (a: number, b: number, w: number) => { g.adj[a].push({ to: b, len: w, w }); g.adj[b].push({ to: a, len: w, w }); };
    e(0, 1, 10); e(1, 2, 10); e(0, 3, 20); e(3, 2, 20);
    expect(astar(g, 0, 2)).toEqual([0, 1, 2]);
    g.adj[1] = []; g.adj[0] = g.adj[0].filter(x => x.to !== 1); g.adj[2] = g.adj[2].filter(x => x.to !== 1);
    expect(astar(g, 0, 2)).toEqual([0, 3, 2]);
  });
  it('the reroute trigger fires beyond 25 m and not inside it', () => {
    const route: XY[] = [[0, 0], [100, 0], [100, 100]];
    expect(offRoute([50, 20], route).d).toBeLessThan(REROUTE_M);
    expect(offRoute([50, 30], route).d).toBeGreaterThan(REROUTE_M);
    expect(Math.round(offRoute([100, 40], route).along)).toBe(140);
  });
  it('every main entrance can be reached on foot from the main gate', () => {
    const g = buildGraph(walkable(src.getPaths(), src.getHardscape()), src.getEntrances(), undefined, inside);
    const gate = layout.landmarks.find(l => l.id === 'main-gate')!.at;
    const mains = layout.entrances.filter(e => e.main);
    const missing = mains.filter(e => !routeTo(g, gate, e.buildingId)).map(e => e.buildingId);
    expect(missing).toEqual([]);
    const r = routeTo(g, gate, 'nab')!;
    expect(r.lengthM).toBeGreaterThan(200); expect(r.lengthM).toBeLessThan(900);
    expect(r.minutes).toBeGreaterThan(2);
  });
  it('a simulated walk along the route ends within the arrival distance', () => {
    const g = buildGraph(walkable(src.getPaths(), src.getHardscape()), src.getEntrances(), undefined, inside);
    const r = routeTo(g, layout.landmarks.find(l => l.id === 'main-gate')!.at, 'admin')!;
    const end = r.pts[r.pts.length - 1], ent = layout.entrances.find(e => e.buildingId === 'admin' && e.main)!.at;
    expect(Math.hypot(end[0] - ent[0], end[1] - ent[1])).toBeLessThan(ARRIVE_M);
    expect(nextStep(r.pts, 0, [{ name: 'the flag', at: layout.landmarks.find(l => l.id === 'flag')!.at }]).text.length).toBeGreaterThan(4);
  });
  it('location smoothing moves a precise fix further than a vague one', () => {
    const a = smooth({ at: [0, 0], accuracy: 10 }, { at: [10, 0], accuracy: 5 }), b = smooth({ at: [0, 0], accuracy: 10 }, { at: [10, 0], accuracy: 40 });
    expect(a.at[0]).toBeGreaterThan(b.at[0]);
  });
});
describe('live layer fixture (Phase 3B)', () => {
  const live = JSON.parse(fs.readFileSync('public/data/live.json', 'utf8')), P = JSON.parse(fs.readFileSync('public/data/places.json', 'utf8')), S = JSON.parse(fs.readFileSync('public/data/sessions.json', 'utf8'));
  it('event pins sit at existing places and room changes name real sessions and rooms', () => {
    for (const e of live.events) expect(P.places.some((p: { id: string }) => p.id === e.placeId), e.id).toBe(true);
    for (const c of live.roomChanges) {
      const s = S.sessions.find((x: { id: string }) => x.id === c.sessionId); expect(s, c.sessionId).toBeTruthy(); expect(s.room).toBe(c.from);
      expect(P.rooms.some((r: { code: string }) => r.code === c.to), c.to).toBe(true);
    }
  });
});
// keep the import used when the path type is needed for fixtures
export type { PathLine };
