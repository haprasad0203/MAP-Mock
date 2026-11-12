// Converts reference/osm/overpass.json into local-metre features (public/data/osm.json).
// Data © OpenStreetMap contributors, ODbL.
import fs from 'node:fs';
const ORIGIN = { lat: 25.6176, lon: 91.9522 };
const KX = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180), KY = 110574;
const r1 = (n) => Math.round(n * 10) / 10;
const toLocal = (p) => [r1((p.lon - ORIGIN.lon) * KX), r1((p.lat - ORIGIN.lat) * KY)];
const src = JSON.parse(fs.readFileSync(process.argv[2] ?? 'reference/osm/overpass.json', 'utf8'));
const roads = [], areas = [];
for (const e of src.elements) {
  if (e.type !== 'way' || !e.geometry) continue;
  const t = e.tags ?? {}, pts = e.geometry.map(toLocal);
  if (t.highway) {
    const kind = t.highway === 'track' ? 'track' : t.highway === 'service' ? 'service' : t.highway === 'footway' || t.highway === 'path' || t.highway === 'steps' ? 'footpath' : 'road';
    roads.push({ id: `osm-${e.id}`, kind, pts, steps: t.highway === 'steps' || undefined });
  } else if (t.natural === 'water') areas.push({ id: `osm-${e.id}`, kind: 'water', pts });
  else if (t.leisure === 'pitch') areas.push({ id: `osm-${e.id}`, kind: 'court', sport: t.sport, pts });
}
fs.writeFileSync('public/data/osm.json', JSON.stringify({ attribution: '© OpenStreetMap contributors', origin: ORIGIN, roads, areas }));
console.log(`roads ${roads.length}, areas ${areas.length}`);
