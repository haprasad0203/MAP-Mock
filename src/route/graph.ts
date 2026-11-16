// Walking graph and routing (Phase 3B). Built from the path polylines (roads, service lanes, footpaths, tracks, the
// Scholar's Path, and the hardscape footpaths), with nodes at junctions and at building entrances. Edges are weighted by
// length, times a slope factor when a height function is given. Routing is A* to a building's entrance.
import type { XY } from '../geo/grid';
import type { Entrance, PathLine } from '../geo/types';

export interface Edge { to: number; len: number; w: number; covered?: boolean }
export interface Graph { pts: XY[]; adj: Edge[][]; entrance: Map<string, number> }

const SNAP = 2.5;      // endpoints closer than this are one junction
const JOIN = 7;        // a path end this close to another path's segment joins it there
const ENTRANCE = 60;   // an entrance further than this from any path is not connected

const dist = (a: XY, b: XY) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Nearest point on segment ab to p, with the fraction t along it. */
export function onSegment(p: XY, a: XY, b: XY): { q: XY; t: number; d: number } {
  const dx = b[0] - a[0], dy = b[1] - a[1], l2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2));
  const q: XY = [a[0] + dx * t, a[1] + dy * t]; return { q, t, d: dist(p, q) };
}

/** Build the graph. `heightAt` (optional) adds a slope factor: 1 + 8 × |gradient|. Paths outside `keep` are skipped. */
export function buildGraph(paths: PathLine[], entrances: Entrance[], heightAt?: (x: number, y: number) => number, keep?: (p: XY) => boolean): Graph {
  // 1. densify every walkable line to vertices at least every 12 m, and collect them
  const lines: { pts: XY[]; covered: boolean }[] = [];
  for (const p of paths) {
    if (p.pts.length < 2 || (keep && !p.pts.some(keep))) continue;
    const out: XY[] = [];
    for (let i = 0; i + 1 < p.pts.length; i++) {
      const a = p.pts[i], b = p.pts[i + 1], n = Math.max(1, Math.ceil(dist(a, b) / 12));
      for (let k = 0; k < n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
    }
    out.push(p.pts[p.pts.length - 1]);
    lines.push({ pts: out, covered: p.kind === 'covered' });
  }
  // 2. nodes with snapping (a coarse hash grid keeps it fast)
  const pts: XY[] = [], cell = new Map<string, number[]>(), key = (x: number, y: number) => `${Math.floor(x / 10)},${Math.floor(y / 10)}`;
  const nodeAt = (q: XY): number => {
    const cx = Math.floor(q[0] / 10), cy = Math.floor(q[1] / 10);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) for (const i of cell.get(`${cx + dx},${cy + dy}`) ?? []) if (dist(pts[i], q) < SNAP) return i;
    pts.push(q); const k = key(q[0], q[1]); (cell.get(k) ?? cell.set(k, []).get(k)!).push(pts.length - 1); return pts.length - 1;
  };
  const adj: Edge[][] = [];
  const link = (a: number, b: number, covered = false) => {
    if (a === b) return; while (adj.length < pts.length) adj.push([]);
    if (adj[a].some(e => e.to === b)) return;
    const len = dist(pts[a], pts[b]), slope = heightAt ? Math.abs(heightAt(...pts[b]) - heightAt(...pts[a])) / Math.max(1, len) : 0, w = len * (1 + 8 * slope) * (covered ? 0.92 : 1);
    adj[a].push({ to: b, len, w, covered }); adj[b].push({ to: a, len, w, covered });
  };
  const lineNodes = lines.map(l => { const ids = l.pts.map(nodeAt); for (let i = 0; i + 1 < ids.length; i++) link(ids[i], ids[i + 1], l.covered); return ids; });
  while (adj.length < pts.length) adj.push([]);
  // 3. T-junctions: a line end that stops near another line's segment is joined to the nearest point on it
  const segs: [number, number][] = []; lineNodes.forEach(ids => { for (let i = 0; i + 1 < ids.length; i++) segs.push([ids[i], ids[i + 1]]); });
  const joinTo = (n: number, maxD: number): number | null => {
    let best: { s: [number, number]; q: XY; t: number; d: number } | null = null;
    for (const s of segs) { if (s[0] === n || s[1] === n) continue; const r = onSegment(pts[n], pts[s[0]], pts[s[1]]); if (r.d < maxD && (!best || r.d < best.d)) best = { s, ...r }; }
    if (!best) return null;
    const m = best.t < 0.05 ? best.s[0] : best.t > 0.95 ? best.s[1] : nodeAt(best.q);
    while (adj.length < pts.length) adj.push([]);
    if (m !== best.s[0] && m !== best.s[1]) { link(best.s[0], m); link(m, best.s[1]); }
    link(n, m); return m;
  };
  for (const ids of lineNodes) for (const end of [ids[0], ids[ids.length - 1]]) if (adj[end].length <= 1) joinTo(end, JOIN);
  // 4. entrances: each joined to the nearest point on the network
  const entrance = new Map<string, number>();
  for (const e of entrances) {
    const n = nodeAt(e.at); while (adj.length < pts.length) adj.push([]);
    if (adj[n].length || joinTo(n, ENTRANCE) !== null) { entrance.set(e.id, n); if (e.main || !entrance.has('b:' + e.buildingId)) entrance.set('b:' + e.buildingId, n); }
  }
  return { pts, adj, entrance };
}

/** Everything walkable: the source's paths plus the hardscape footpaths and trails (forecourt ring, terrace paths, lake trail). */
export function walkable(paths: PathLine[], items: { id: string; type: string; pts?: XY[] }[] = []): PathLine[] {
  return [...paths, ...items.filter(i => (i.type === 'footpath' || i.type === 'trail') && i.pts && i.pts.length > 1).map(i => ({ id: 'hs:' + i.id, kind: 'footpath' as const, pts: i.pts! }))];
}

/** Nearest node to a point (linear scan; the graph is a few thousand nodes). */
export function nearestNode(g: Graph, p: XY): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < g.pts.length; i++) { if (!g.adj[i]?.length) continue; const d = dist(g.pts[i], p); if (d < bd) { bd = d; best = i; } }
  return best;
}

/** A* from node a to node b; returns the node list, or null when unreachable. */
export function astar(g: Graph, a: number, b: number): number[] | null {
  const n = g.pts.length, gs = new Float64Array(n).fill(Infinity), prev = new Int32Array(n).fill(-1), done = new Uint8Array(n);
  const h = (i: number) => dist(g.pts[i], g.pts[b]);
  const open: [number, number][] = [[h(a), a]]; gs[a] = 0;
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, u] = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (done[u]) continue; done[u] = 1;
    if (u === b) { const out = [b]; for (let v = prev[b]; v !== -1; v = prev[v]) out.push(v); return out.reverse(); }
    for (const e of g.adj[u] ?? []) { const ng = gs[u] + e.w; if (ng < gs[e.to]) { gs[e.to] = ng; prev[e.to] = u; open.push([ng + h(e.to), e.to]); } }
  }
  return null;
}

export interface Route { pts: XY[]; lengthM: number; minutes: number; to: string }
const WALK = 65; // metres per minute on the hill campus (about 1.1 m/s)
/** Route from a point to a building (its main entrance), or null. The start is the snap point on the network. */
export function routeTo(g: Graph, from: XY, buildingId: string): Route | null {
  const end = g.entrance.get('b:' + buildingId); if (end === undefined) return null;
  const path = astar(g, nearestNode(g, from), end); if (!path) return null;
  const pts = [from, ...path.map(i => g.pts[i])];
  const lengthM = pts.reduce((s, q, i) => (i ? s + dist(pts[i - 1], q) : 0), 0);
  return { pts, lengthM, minutes: Math.max(1, Math.round(lengthM / WALK)), to: buildingId };
}

/** Route to the network point nearest a target point (grounds, courts, landmarks: places without an entrance). */
export function routeToPoint(g: Graph, from: XY, to: XY, label: string): Route | null {
  const path = astar(g, nearestNode(g, from), nearestNode(g, to)); if (!path) return null;
  const pts = [from, ...path.map(i => g.pts[i])];
  const lengthM = pts.reduce((s, q, i) => (i ? s + dist(pts[i - 1], q) : 0), 0);
  return { pts, lengthM, minutes: Math.max(1, Math.round(lengthM / WALK)), to: label };
}

/** Distance from a point to a route polyline, and how far along it the nearest point is (metres). */
export function offRoute(p: XY, pts: XY[]): { d: number; along: number } {
  let best = { d: Infinity, along: 0 }, s = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const r = onSegment(p, pts[i], pts[i + 1]), L = dist(pts[i], pts[i + 1]);
    if (r.d < best.d) best = { d: r.d, along: s + r.t * L }; s += L;
  }
  return best;
}
export const REROUTE_M = 25;   // recompute when more than this far from the route
export const ARRIVE_M = 18;    // within this of the end = arrived

/** The next instruction from a position along the route: the next turn of more than 35°, named by the nearest landmark. */
export function nextStep(pts: XY[], along: number, named: { name: string; at: XY }[]): { text: string; inM: number } {
  let s = 0;
  for (let i = 1; i + 1 < pts.length; i++) {
    s += dist(pts[i - 1], pts[i]); if (s <= along + 3) continue;
    const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
    let turn = ((b - a) * 180) / Math.PI; while (turn > 180) turn -= 360; while (turn < -180) turn += 360;
    if (Math.abs(turn) < 35) continue;
    const side = turn > 0 ? 'left' : 'right', near = named.filter(n => dist(n.at, pts[i]) < 45).sort((x, y) => dist(x.at, pts[i]) - dist(y.at, pts[i]))[0];
    return { text: near ? `Past ${near.name}, then ${side}` : `Turn ${side}`, inM: Math.round(s - along) };
  }
  const total = pts.reduce((t, q, i) => (i ? t + dist(pts[i - 1], q) : 0), 0);
  return { text: 'Straight on to the entrance', inM: Math.max(0, Math.round(total - along)) };
}
