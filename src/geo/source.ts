import type { XY } from './grid';
import { toLocal } from './grid';
import type { Area, Bounds, Building, CampusLayout, Entrance, Hardscape, Landmark, PathLine, Part, TreeCluster } from './types';
import { apply, fitAffine, fitSimilarity, IDENTITY, type Transform } from './fit';

/** Rendering, routing and search read campus geometry ONLY through this interface. */
export interface CampusGeometrySource {
  readonly name: string;
  readonly attribution?: string;
  getBoundary(): XY[];
  getBuildings(): Building[];
  getPaths(): PathLine[];
  getAreas(): Area[];
  getTrees(): TreeCluster[];
  getEntrances(): Entrance[];
  getLandmarks(): Landmark[];
  getBounds(): Bounds;
  /** public/data/hardscape.json items (paved, walled, fenced and planted ground), when the source has them. */
  getHardscape?(): Hardscape['items'];
}

const boundsOf = (pts: XY[]): Bounds => ({
  minX: Math.min(...pts.map(p => p[0])), minY: Math.min(...pts.map(p => p[1])),
  maxX: Math.max(...pts.map(p => p[0])), maxY: Math.max(...pts.map(p => p[1])),
});

// ---------- Survey control points ----------
export interface SurveyPoint { targetId: string; lat: number; lon: number; accuracy: number; samples: number; spread: number; savedAt: string }
export const SURVEY_KEY = 'campus.survey.v1';
export function loadSurvey(): SurveyPoint[] {
  try { return JSON.parse(localStorage.getItem(SURVEY_KEY) ?? '[]'); } catch { return []; }
}
export function saveSurvey(pts: SurveyPoint[]) { try { localStorage.setItem(SURVEY_KEY, JSON.stringify(pts)); } catch { /* storage blocked */ } }

/** Target ids: "entrance:<id>", "landmark:<id>", "building:<id>" (centre of first part). */
export function targetPosition(layout: CampusLayout, id: string): XY | null {
  const [kind, key] = id.split(':');
  if (kind === 'entrance') return layout.entrances.find(e => e.id === key)?.at ?? null;
  if (kind === 'landmark') return layout.landmarks.find(l => l.id === key)?.at ?? null;
  if (kind === 'building') { const b = layout.buildings.find(b => b.id === key); return b ? [b.parts[0].cx, b.parts[0].cy] : null; }
  return null;
}

export function computeSurveyFit(layout: CampusLayout, pts: SurveyPoint[]) {
  const pairs = pts
    .map(p => ({ p, src: targetPosition(layout, p.targetId), dst: toLocal(p.lat, p.lon) }))
    .filter((x): x is { p: SurveyPoint; src: XY; dst: XY } => !!x.src);
  const src = pairs.map(x => x.src), dst = pairs.map(x => x.dst);
  const transform: Transform = pairs.length >= 4 ? fitAffine(src, dst) : fitSimilarity(src, dst);
  // Per-building nudges = what's left over after the global fit, at that building's surveyed point.
  const nudges: Record<string, XY> = {};
  for (const { p, src: s, dst: d } of pairs) {
    const [kind, key] = p.targetId.split(':');
    const q = apply(transform, s);
    const bid = kind === 'entrance' ? layout.entrances.find(e => e.id === key)?.buildingId : kind === 'building' ? key : undefined;
    if (bid && !nudges[bid] && pairs.length >= 3) nudges[bid] = [d[0] - q[0], d[1] - q[1]];
  }
  return { transform, nudges, pairs };
}

// ---------- Implementation 1: schematic JSON + survey (now) ----------
export interface OsmData { roads: PathLine[]; areas: Area[]; attribution: string }

export class SchematicSurveySource implements CampusGeometrySource {
  readonly name = 'schematic+survey';
  readonly attribution?: string;
  private t: Transform = IDENTITY;
  private nudges: Record<string, XY> = {};
  private surveyed = new Map<string, XY>();

  constructor(private layout: CampusLayout, private osm?: OsmData, survey: SurveyPoint[] = [], private hardscape?: Hardscape) {
    // v2 layouts carry the full credit line (OSM, Overture, Google Open Buildings, Microsoft).
    this.attribution = layout.attribution ?? osm?.attribution;
    if (survey.length) {
      const f = computeSurveyFit(layout, survey);
      this.t = f.transform; this.nudges = f.nudges;
      for (const { p, dst } of f.pairs) this.surveyed.set(p.targetId, dst);
    }
  }
  private tx = (p: XY, bid?: string): XY => {
    const q = apply(this.t, p); const n = bid ? this.nudges[bid] : undefined;
    return n ? [q[0] + n[0], q[1] + n[1]] : q;
  };
  private scale() {
    const a = this.t.affine;
    return a ? Math.sqrt(Math.abs(a[0] * a[3] - a[1] * a[2])) : Math.hypot(this.t.a, this.t.b);
  }
  private rot() {
    const a = this.t.affine;
    return (a ? Math.atan2(a[2], a[0]) : Math.atan2(this.t.b, this.t.a)) * 180 / Math.PI;
  }
  getBoundary() { return this.layout.boundary.map(p => this.tx(p)); }
  getBuildings(): Building[] {
    const s = this.scale(), r = this.rot();
    return this.layout.buildings.map(b => ({
      ...b,
      parts: b.parts.map((pt: Part) => {
        const [cx, cy] = this.tx([pt.cx, pt.cy], b.id);
        return { ...pt, cx, cy, w: pt.w * s, d: pt.d * s, angle: pt.angle + r, poly: pt.poly?.map(q => this.tx(q, b.id)) };
      }),
    }));
  }
  // OSM geometry is already in true coordinates; only the hand-authored layer moves with the survey fit.
  // hardscape.json adds each road's real width and pavements, and the full run of the Scholar's Path (the layout has only
  // its middle section as covered-walk). Hardscape geometry is snapped to the OSM roads, so it is in true coordinates too.
  getPaths(): PathLine[] {
    const spec = new Map(this.hardscape?.roads.map(r => [r.id, r]) ?? []), sp = this.hardscape?.items.find(i => i.id === 'scholars-path');
    const own = this.layout.paths.map(p => (p.id === 'covered-walk' && sp?.pts ? { ...p, pts: sp.pts, width: sp.width } : { ...p, pts: p.pts.map(q => this.tx(q)) }));
    return [...(this.osm?.roads ?? []), ...own].map(p => { const r = spec.get(p.id); return r ? { ...p, width: r.width, pavementL: r.pavementL, pavementR: r.pavementR, narrow: r.narrow, surface: (r as { surface?: string }).surface ?? p.surface } : p; });
  }
  getAreas(): Area[] {
    const osmAreas = this.osm?.areas ?? [];
    // An authored area named 'lake' is only a fallback for when OSM has no lake; small authored ponds always stay.
    const hasOsmWater = osmAreas.some(a => a.kind === 'water');
    const own = this.layout.areas.filter(a => !(a.id === 'lake' && hasOsmWater)).map(a => ({ ...a, pts: a.pts.map(q => this.tx(q)) }));
    return [...own, ...osmAreas];
  }
  getTrees() { return this.layout.trees.map(t => ({ ...t, c: this.tx(t.c) })); }
  getEntrances(): Entrance[] {
    return this.layout.entrances.map(e => {
      const s = this.surveyed.get('entrance:' + e.id);
      return s ? { ...e, at: s, surveyed: true } : { ...e, at: this.tx(e.at, e.buildingId) };
    });
  }
  getLandmarks(): Landmark[] { return this.layout.landmarks.map(l => ({ ...l, at: this.surveyed.get('landmark:' + l.id) ?? this.tx(l.at) })); }
  getBounds(): Bounds { return boundsOf(this.getBoundary()); }
  getHardscape(): Hardscape['items'] { return this.hardscape?.items ?? []; }
}

// ---------- Implementation 3: QGIS GeoJSON (EPSG:4326), later ----------
interface Feature { geometry: { type: string; coordinates: any }; properties: Record<string, any> }
export class QgisGeoJsonSource implements CampusGeometrySource {
  readonly name = 'qgis-geojson';
  constructor(private fc: { features: Feature[] }) {}
  private ring(c: [number, number][]): XY[] { return c.map(([lon, lat]) => toLocal(lat, lon)); }
  private of(layer: string) { return this.fc.features.filter(f => f.properties.layer === layer); }
  getBoundary() { const f = this.of('boundary')[0]; return f ? this.ring(f.geometry.coordinates[0]) : []; }
  getBuildings(): Building[] {
    return this.of('building').map(f => {
      const r = this.ring(f.geometry.coordinates[0]); const b = boundsOf(r); const pr = f.properties;
      return {
        id: pr.id, name: pr.name, category: pr.category ?? 'venue', wall: pr.wall ?? '#F1ECDD', roofColor: pr.roof_color ?? '#3E8A4E', labelPriority: pr.priority ?? 2,
        parts: [{ cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, w: b.maxX - b.minX, d: b.maxY - b.minY, angle: pr.angle ?? 0, floors: pr.floors ?? 2, roof: pr.roof ?? 'hip' }],
      };
    });
  }
  getPaths(): PathLine[] { return this.of('path').map(f => ({ id: f.properties.id, kind: f.properties.kind ?? 'footpath', pts: this.ring(f.geometry.coordinates) })); }
  getAreas(): Area[] { return this.of('area').map(f => ({ id: f.properties.id, kind: f.properties.kind, pts: this.ring(f.geometry.coordinates[0]) })); }
  getTrees(): TreeCluster[] { return []; }
  getEntrances(): Entrance[] {
    return this.of('entrance').map(f => ({ id: f.properties.id, buildingId: f.properties.building, at: toLocal(f.geometry.coordinates[1], f.geometry.coordinates[0]) }));
  }
  getLandmarks(): Landmark[] { return []; }
  getBounds(): Bounds { return boundsOf(this.getBoundary()); }
}

export async function loadLayout(): Promise<{ layout: CampusLayout; osm?: OsmData; hardscape?: Hardscape }> {
  const [layout, osm, hardscape] = await Promise.all([
    fetch('/data/campus-layout.json').then(r => r.json()),
    fetch('/data/osm.json').then(r => (r.ok ? r.json() : undefined)).catch(() => undefined),
    fetch('/data/hardscape.json').then(r => (r.ok ? r.json() : undefined)).catch(() => undefined),
  ]);
  return { layout, osm, hardscape };
}
export async function loadGeometry(): Promise<CampusGeometrySource> {
  const { layout, osm, hardscape } = await loadLayout();
  return new SchematicSurveySource(layout, osm, loadSurvey(), hardscape);
}
