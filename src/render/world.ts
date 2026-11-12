import type { CampusGeometrySource } from '../geo/source';
import type { XY } from '../geo/grid';
import type { Area, Building, Landmark, PathLine } from '../geo/types';
import { hash2, valueNoise } from './noise';

/** Ground classes in the 1 m raster. */
export const G = {
  WILD: 0, LAWN: 1, ROAD: 2, SERVICE: 3, TRACK: 4, PATH: 5, WATER: 6, COURT: 7, GROUND: 8, PLAZA: 9,
  PARKING: 10, GARDEN: 11, BUILDING: 12, COURT_RED: 13, ROAD_EDGE: 14, COVERED: 15, COURT_BLUE: 16, EARTH: 17,
} as const;

export const HALF = 1300; // raster covers [-HALF, HALF) metres in x and y
export const SIZE = HALF * 2;

export interface CampusTree { x: number; y: number; s: number; v: number }

export interface WorldModel {
  src: CampusGeometrySource;
  mask: Uint8Array; inCampus: Uint8Array; // inCampus: 1 m raster flag (boundary polygon)
  buildings: Building[]; areas: Area[]; paths: PathLine[]; landmarks: Landmark[];
  campusTrees: CampusTree[];
  centre: XY; bounds: { minX: number; minY: number; maxX: number; maxY: number };
  attribution?: string;
}

export function cls(m: WorldModel, x: number, y: number): number {
  const ix = Math.floor(x + HALF), iy = Math.floor(y + HALF);
  if (ix < 0 || iy < 0 || ix >= SIZE || iy >= SIZE) return G.WILD;
  return m.mask[iy * SIZE + ix];
}
export function campusAt(m: WorldModel, x: number, y: number): boolean {
  const ix = Math.floor(x + HALF), iy = Math.floor(y + HALF);
  if (ix < 0 || iy < 0 || ix >= SIZE || iy >= SIZE) return false;
  return m.inCampus[iy * SIZE + ix] === 1;
}

function fillPoly(buf: Uint8Array, pts: XY[], val: number, onlyIf?: (cur: number) => boolean) {
  if (pts.length < 3) return;
  const ys = pts.map(p => p[1]);
  const y0 = Math.max(-HALF, Math.floor(Math.min(...ys))), y1 = Math.min(HALF - 1, Math.ceil(Math.max(...ys)));
  const xs: number[] = [];
  for (let y = y0; y <= y1; y++) {
    const yc = y + 0.5; xs.length = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > yc) !== (yj > yc)) xs.push(xi + ((yc - yi) / (yj - yi)) * (xj - xi));
    }
    xs.sort((a, b) => a - b);
    const row = (y + HALF) * SIZE;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      const a = Math.max(-HALF, Math.ceil(xs[k] - 0.5)), b = Math.min(HALF - 1, Math.floor(xs[k + 1] - 0.5));
      for (let x = a; x <= b; x++) { const p = row + x + HALF; if (!onlyIf || onlyIf(buf[p])) buf[p] = val; }
    }
  }
}

function strokeLine(buf: Uint8Array, pts: XY[], radius: number, val: number, onlyIf?: (cur: number) => boolean) {
  const r2 = radius * radius, R = Math.ceil(radius);
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.ceil(len / 0.7));
    for (let s = 0; s <= steps; s++) {
      const cx = x0 + ((x1 - x0) * s) / steps, cy = y0 + ((y1 - y0) * s) / steps;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const ix = Math.floor(cx + dx + HALF), iy = Math.floor(cy + dy + HALF);
        if (ix < 0 || iy < 0 || ix >= SIZE || iy >= SIZE) continue;
        const p = iy * SIZE + ix; if (!onlyIf || onlyIf(buf[p])) buf[p] = val;
      }
    }
  }
}

export function partCorners(p: { cx: number; cy: number; w: number; d: number; angle: number }): XY[] {
  const a = (p.angle * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return ([[-p.w / 2, -p.d / 2], [p.w / 2, -p.d / 2], [p.w / 2, p.d / 2], [-p.w / 2, p.d / 2]] as XY[]).map(([x, y]) => [p.cx + x * c - y * s, p.cy + x * s + y * c]);
}

const ROAD_W: Record<PathLine['kind'], number> = { road: 3.6, service: 2.8, track: 1.8, footpath: 1.1, covered: 1.4 };
const ROAD_C: Record<PathLine['kind'], number> = { road: G.ROAD, service: G.SERVICE, track: G.TRACK, footpath: G.PATH, covered: G.COVERED };

export function buildWorld(src: CampusGeometrySource): WorldModel {
  const mask = new Uint8Array(SIZE * SIZE); const inCampus = new Uint8Array(SIZE * SIZE);
  const boundary = src.getBoundary();
  fillPoly(inCampus, boundary, 1);
  // Campus interior stays natural ground (no visible boundary); authored lawns are mown.

  const areas = src.getAreas();
  const order: Area['kind'][] = ['lawn', 'garden', 'plaza', 'parking', 'ground', 'court', 'water'];
  for (const kind of order) for (const a of areas.filter(a => a.kind === kind)) {
    const v = kind === 'lawn' ? G.LAWN : kind === 'garden' ? G.GARDEN : kind === 'plaza' ? (a.id === 'courts-surround' ? G.COURT_RED : G.PLAZA)
      : kind === 'parking' ? G.PARKING : kind === 'ground' ? (a.surface === 'earth' ? G.EARTH : G.GROUND)
      : kind === 'court' ? (a.sport === 'tennis' ? G.COURT_BLUE : G.COURT) : G.WATER;
    fillPoly(mask, a.pts, v);
  }
  const paths = src.getPaths();
  const notWater = (c: number) => c !== G.WATER;
  for (const kind of ['track', 'footpath', 'service', 'road', 'covered'] as const)
    for (const p of paths.filter(p => p.kind === kind)) {
      if (kind === 'road' || kind === 'service') strokeLine(mask, p.pts, ROAD_W[kind] + 1, G.ROAD_EDGE, c => c !== G.ROAD && c !== G.SERVICE && c !== G.WATER);
      strokeLine(mask, p.pts, ROAD_W[kind], ROAD_C[kind], kind === 'footpath' ? notWater : undefined);
    }
  const buildings = src.getBuildings();
  for (const b of buildings) for (const p of b.parts) {
    const pad = { ...p, w: p.w + 3, d: p.d + 3 };
    fillPoly(mask, partCorners(pad), G.PLAZA, c => c === G.LAWN || c === G.WILD || c === G.GARDEN);
    fillPoly(mask, partCorners(p), G.BUILDING);
  }

  // Campus trees: authored clusters plus a light scatter on open lawn, kept off everything built.
  const campusTrees: CampusTree[] = [];
  const free = (x: number, y: number, r: number) => {
    for (let dy = -r; dy <= r; dy += r) for (let dx = -r; dx <= r; dx += r) {
      const c = cls({ mask } as WorldModel, x + dx, y + dy); if (c !== G.LAWN && c !== G.WILD) return false;
    }
    return true;
  };
  for (const t of src.getTrees()) {
    const n = Math.round(t.r * t.r * Math.PI * t.density / 40);
    for (let i = 0; i < n; i++) {
      const a = hash2(i, t.c[0] | 0, 3) * Math.PI * 2, rr = Math.sqrt(hash2(i, t.c[1] | 0, 5)) * t.r;
      const x = t.c[0] + Math.cos(a) * rr, y = t.c[1] + Math.sin(a) * rr;
      if (free(x, y, 4)) campusTrees.push({ x, y, s: 0.8 + hash2(i, 9, 7) * 0.5, v: hash2(i, 11, 13) });
    }
  }
  const b = src.getBounds();
  for (let y = Math.floor(b.minY); y < b.maxY; y += 9) for (let x = Math.floor(b.minX); x < b.maxX; x += 9) {
    const jx = x + hash2(x, y, 21) * 8, jy = y + hash2(x, y, 22) * 8;
    if (!campusAt({ inCampus } as WorldModel, jx, jy)) continue;
    if (valueNoise(jx / 70, jy / 70, 5) < 0.62) continue;
    if (free(jx, jy, 5)) campusTrees.push({ x: jx, y: jy, s: 0.8 + hash2(x, y, 23) * 0.5, v: hash2(x, y, 24) });
  }

  return {
    src, mask, inCampus, buildings, areas, paths, landmarks: src.getLandmarks(), campusTrees,
    centre: [(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2], bounds: b, attribution: src.attribution,
  };
}
