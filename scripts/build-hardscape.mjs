// Writes public/data/hardscape.json (Phase 3M v2, REAL_CAMPUS_MODELS.md section 2b): road and pavement widths per path,
// the full Scholar's Path, and the paved, walled, fenced and planted ground around the buildings.
// Everything is placed by eye from the real photos, drone stills and satellite screenshots (looked at, never traced) and
// snapped to our own data: road offsets come from the data roads, building surroundings from the data footprints,
// the rest are local metres chosen by eye with the source named on each item. campus-layout.json is not edited.
// Usage: node scripts/build-hardscape.mjs  (then node scripts/hardscape-check.mjs)
import fs from 'node:fs';

const layout = JSON.parse(fs.readFileSync('public/data/campus-layout.json', 'utf8'));
const osm = JSON.parse(fs.readFileSync('public/data/osm.json', 'utf8'));
const r1 = v => Math.round(v * 10) / 10, P = q => [r1(q[0]), r1(q[1])];
const paths = [...osm.roads, ...layout.paths], pathOf = id => paths.find(p => p.id === id);
const bld = id => layout.buildings.find(b => b.id === id), area = id => layout.areas.find(a => a.id === id), lm = id => layout.landmarks.find(l => l.id === id)?.at;
const B = layout.boundary, inside = (x, y, poly = B) => { let c = false; for (let i = 0, k = poly.length - 1; i < poly.length; k = i++) { const [xi, yi] = poly[i], [xk, yk] = poly[k]; if ((yi > y) !== (yk > y) && x < ((xk - xi) * (y - yi)) / (yk - yi) + xi) c = !c; } return c; };

// ---------- geometry ----------
function resample(pts, step) {
  const out = [];
  for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], m = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / step)); for (let t = 0; t < m; t++) out.push([ax + ((bx - ax) * t) / m, ay + ((by - ay) * t) / m]); }
  out.push(pts[pts.length - 1]);
  let s = 0;
  return out.map((p, i) => {
    const a = out[Math.max(0, i - 1)], c = out[Math.min(out.length - 1, i + 1)], dx = c[0] - a[0], dy = c[1] - a[1], l = Math.hypot(dx, dy) || 1;
    if (i) s += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]);
    return { p, n: [-dy / l, dx / l], s }; // n = left normal
  });
}
const offsetLine = (pts, o, step = 4) => resample(pts, step).map(q => P([q.p[0] + q.n[0] * o, q.p[1] + q.n[1] * o]));
const sliceLine = (pts, from, to) => { // the part of a polyline nearest to two points
  const near = q => pts.reduce((b, p, i) => (Math.hypot(p[0] - q[0], p[1] - q[1]) < b.d ? { d: Math.hypot(p[0] - q[0], p[1] - q[1]), i } : b), { d: 1e9, i: 0 }).i;
  const a = near(from), b = near(to); return a <= b ? pts.slice(a, b + 1) : pts.slice(b, a + 1).reverse();
};
const circle = (c, r, n = 32) => Array.from({ length: n }, (_, i) => P([c[0] + r * Math.cos((2 * Math.PI * i) / n), c[1] + r * Math.sin((2 * Math.PI * i) / n)]));
const rect = (c, w, d, deg) => { const a = (deg * Math.PI) / 180, u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]]; return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([i, j]) => P([c[0] + (u[0] * w * i + v[0] * d * j) / 2, c[1] + (u[1] * w * i + v[1] * d * j) / 2])); };
const centroid = poly => { let x = 0, y = 0; for (const p of poly) { x += p[0]; y += p[1]; } return [x / poly.length, y / poly.length]; };
function grow(poly, d) { // offset a simple polygon outward by d (vertex normals; fine for the gentle shapes used here)
  const c = centroid(poly);
  return poly.map((p, i) => {
    const a = poly[(i + poly.length - 1) % poly.length], b = poly[(i + 1) % poly.length];
    let nx = -(b[1] - a[1]), ny = b[0] - a[0]; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    if ((p[0] + nx - c[0]) ** 2 + (p[1] + ny - c[1]) ** 2 < (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2) { nx = -nx; ny = -ny; }
    return P([p[0] + nx * d, p[1] + ny * d]);
  });
}
/** The edge of a footprint whose outward side faces a point, as a frame: fp(s, o) = point s metres along it, o metres out. */
function faceToward(poly, q) {
  const c = centroid(poly); let best = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 3) continue;
    const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len]; let n = [u[1], -u[0]];
    const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; if ((m[0] - c[0]) * n[0] + (m[1] - c[1]) * n[1] < 0) n = [-n[0], -n[1]];
    const score = ((q[0] - m[0]) * n[0] + (q[1] - m[1]) * n[1]) / Math.hypot(q[0] - m[0], q[1] - m[1]) + len / 1000;
    if (!best || score > best.score) best = { a, u, n, len, score };
  }
  return { len: best.len, fp: (s, o) => P([best.a[0] + best.u[0] * s + best.n[0] * o, best.a[1] + best.u[1] * s + best.n[1] * o]) };
}
const len = pts => pts.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]) : 0), 0);

// ---------- 1. roads: widths, pavements, tight spots ----------
// Measured on H A's hi-res satellite screenshots (scale bars: 0423 = 2.0 px/m, 0405 = 2.45 px/m) with
// scripts/grid-crop.mjs, and checked against the drone stills (cars about 4.3 m, lane markings):
const MEASURED = {
  'osm-1050247311': ['asphalt 9 ± 1 m by the lake (0423 grid crop at 815,250)', 'asphalt 9 ± 1 m near the gate (0423 at 1170,735)', 'about 8 m between the white edge lines, concrete kerb and drain about 1 m, red hex-paver pavement about 2.5 m on the east side, by Cafe Cloud (drone still 9QBtbam1G5Q @0:05.5)'],
  'rd-fblock': ['asphalt 7 ± 1 m on the hostel hairpin (0405 grid crop at 770,250)'],
};
const SPEC = { road: { width: 10, kerb: 0.5 }, service: { width: 6.5, kerb: 0.4 }, footpath: { width: 2.6, kerb: 0 }, track: { width: 3.6, kerb: 0 }, covered: { width: 3, kerb: 0 } };
// per-road choices (L/R = left/right of the polyline's direction of travel)
const ROADS = {
  'osm-1050247311': { width: 10.5, pavementL: 2.0, pavementR: 1.0, note: 'Main campus road (gate → Admin → lake → Kalam Centre). Pavement on the Admin/east side (red hex pavers), a kerb-and-drain verge on the west.', confidence: 'measured' },
  'osm-1050247312': { width: 9, pavementL: 1.5, pavementR: 1.5, note: 'Campus loop road to the courts, hostels and quarters', confidence: 'by-eye' },
  'rd-fblock': { width: 7.5, pavementL: 1.2, pavementR: 0, note: 'Hostel hairpin road (F Block); a light footpath strip on the inside of the bends in the 0405 screenshot', confidence: 'measured' },
  'rd-nab-front': { width: 7, pavementL: 1.5, pavementR: 0, note: 'NAB front road along the SE face, past the NAB lawn (H A marked view)', confidence: 'by-eye' },
  'osm-1050216150': { width: 8, pavementL: 0, pavementR: 0, note: 'Public road along the south (ATM); outside the campus', confidence: 'by-eye' },
};
// (the main road's east pavement is the 2 m verge between the kerb and the Scholar's Path)
const roadIds = new Set([...osm.roads.filter(r => r.pts.some(q => inside(q[0], q[1]))).map(r => r.id), ...layout.paths.filter(p => p.kind === 'road' || p.kind === 'service').map(p => p.id), 'osm-1050216150']);
const footprints = layout.buildings.flatMap(b => b.parts.filter(p => p.poly).map(p => ({ id: b.id, poly: p.poly })));
const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
/** distance from a point on the road to the nearest footprint edge on one side (sign = side of the left normal) */
function clearance(q, side) {
  let best = { d: 1e9, id: null };
  for (const f of footprints) for (let i = 0; i < f.poly.length; i++) {
    const a = f.poly[i], b = f.poly[(i + 1) % f.poly.length], d = segDist(q.p, a, b), mid = [(a[0] + b[0]) / 2 - q.p[0], (a[1] + b[1]) / 2 - q.p[1]];
    if (d < best.d && (mid[0] * q.n[0] + mid[1] * q.n[1]) * side > 0) best = { d, id: f.id };
    if (inside(q.p[0], q.p[1], f.poly)) best = { d: 0, id: f.id };
  }
  return best;
}
const roads = [], tight = [];
for (const id of roadIds) {
  const p = pathOf(id); if (!p) continue;
  const base = SPEC[p.kind] ?? SPEC.service, own = ROADS[id] ?? {};
  const r = { id, kind: p.kind, width: own.width ?? base.width, kerb: base.kerb, pavementL: own.pavementL ?? 0, pavementR: own.pavementR ?? 0, narrow: [], measured: MEASURED[id] ?? [], confidence: own.confidence ?? 'default', note: own.note ?? (p.kind === 'service' ? 'Campus service road (target 6–7 m)' : '') };
  // tight spots: full half-width plus pavement must stay at least 1 m clear of every footprint; otherwise narrow locally
  const sm = resample(p.pts, 2); let run = null;
  const flush = () => { if (run) { r.narrow.push({ s0: r1(run.s0), s1: r1(run.s1), width: r1(run.w), reason: `within ${r1(run.c)} m of ${run.id}` }); tight.push({ road: id, at: P(run.at), width: r1(run.w), from: r.width, building: run.id }); run = null; } };
  sm.forEach(q => {
    if (!inside(q.p[0], q.p[1]) && id !== 'osm-1050216150') { flush(); return; }
    let need = 1e9, who = null;
    for (const side of [1, -1]) { const c = clearance(q, side); const pav = side > 0 ? r.pavementL : r.pavementR; const allowed = 2 * (c.d - 1 - pav); if (allowed < need) { need = allowed; who = c; } }
    if (need < r.width) {
      const w = Math.max(p.kind === 'road' ? 6 : 4, need);
      if (!run) run = { s0: q.s, s1: q.s, w, c: who.d, id: who.id, at: q.p }; else { run.s1 = q.s; run.w = Math.min(run.w, w); run.c = Math.min(run.c, who.d); }
    } else flush();
  });
  flush();
  roads.push(r);
}
// off-campus OSM roads (village lanes and the highway beyond): kept at a plain 7 m so the new campus default doesn't widen them
for (const r of osm.roads) if (!roadIds.has(r.id) && (r.kind === 'road' || r.kind === 'service')) roads.push({ id: r.id, kind: r.kind, width: r.kind === 'road' ? 7 : 5, kerb: 0, pavementL: 0, pavementR: 0, narrow: [], measured: [], confidence: 'default', note: 'off campus' });

// ---------- 2. the Scholar's Path ----------
// H A (16 Nov): the teal-roofed covered walkway. Beside the main road on the right as you enter by the main gate, then up
// through the middle of campus in the zig-zag past the courts to the hostels. Seen on: hi-res satellite 0423 (a pale strip
// all along the east side of the main road from the gate to the Kalam Centre), homepage video @0:08.5 (beside Admin's west
// parking), drone 54s / 9QBtbam1G5Q @0:50–0:55 (the zig-zag past the courts). The middle run is the data's covered-walk.
const main = pathOf('osm-1050247311'), gate = lm('main-gate');
const mainRun = sliceLine(main.pts, gate, [-79, 36]);              // gate → Kalam Centre junction (polyline runs the other way)
const roadside = offsetLine(mainRun, -(10.5 / 2 + 2.0 + 1.5)); // right of travel from the gate (heading NW) = the east side; the pale strip sits just past the kerb verge in 0423
const middle = pathOf('covered-walk').pts.slice().reverse();        // (-91.9, 47.5) → … → D Block (-221.7, 224.2)
const scholars = [...roadside.slice(0, -1), ...middle.map(P)];

// ---------- 3. items ----------
const items = [];
const add = (o) => items.push(o);
const SRC = {
  sat: "H A's hi-res satellite 0423/0405 (looked at, not traced)", home04: 'homepage video @0:04.5', home05: 'homepage video @0:05.5', home08: 'homepage video @0:08.5',
  q05: 'drone 9QBtbam1G5Q @0:05.5', q16: 'drone 9QBtbam1G5Q @0:16.5', q22: 'drone 9QBtbam1G5Q @0:22.5', q38: 'drone 9QBtbam1G5Q @0:38.5', q54: 'drone 54s / 9QBtbam1G5Q @0:52.5',
  dji: 'DJI_0338', i363: 'Image_363', marked: "H A's marked top views (from_above)", s9159: 'DSC_9159 (courts and pavilion)', s677: '677.jpg (football ground)', s9119: 'DSC_9119 (hostel walkway)',
};

add({ id: 'scholars-path', type: 'covered-walkway', name: "Scholar's Path", material: 'teal corrugated metal roof on white steel posts, paver floor', colour: '#3FA39C', roofColour: '#3FA39C', postColour: '#F2F2EE', width: 3.0, height: 2.9, roofRise: 0.6, postSpacing: 4, railing: { height: 1.0, colour: '#E8E8E2', sides: 'road side along the main road; both sides on the zig-zag' }, pts: scholars, length: r1(len(scholars)), source: [SRC.sat, SRC.home08, SRC.q54, 'campus-layout covered-walk (middle run)', 'H A, 16 Nov'], confidence: 'seen' });
add({ id: 'scholars-path-mess-link', type: 'covered-walkway', name: "Scholar's Path, link to the Mess", material: 'covered walkway, roof colour to confirm (looks brown/grey from above)', colour: '#8A7766', width: 3.0, height: 2.9, pts: [P([-221.7, 224.2]), P([-238, 232]), P([-252, 244]), P([-262, 252])], source: [SRC.sat], confidence: 'by-eye' });
// the D Block walkways (spec: "the teal one and the brown one at D Block")
{ const h1 = bld('hostel-1'), a = h1.parts[0], ang = (a.angle * Math.PI) / 180, u = [Math.cos(ang), Math.sin(ang)], nw = [-u[1], u[0]], c = [a.cx + nw[0] * 11, a.cy + nw[1] * 11];
  add({ id: 'dblock-walkway-teal', type: 'covered-walkway', name: 'D Block walkway (teal)', material: 'teal metal roof on posts', colour: '#3FA39C', width: 3.0, height: 2.9, pts: [P([c[0] - u[0] * 60, c[1] - u[1] * 60]), P([c[0] + u[0] * 40, c[1] + u[1] * 40])], source: [SRC.sat, SRC.s9119], confidence: 'guess', note: 'runs along the NW side of D Block toward the F Block road (0405 screenshot); exact line to confirm' }); }

// Admin: flag forecourt, ring path, hedges, parking, planters, terraces, statue garden
const fore = area('admin-forecourt').pts, flag = lm('flag');
add({ id: 'admin-forecourt-paving', type: 'plaza', name: 'Flag forecourt paving', material: 'red-pink brick pavers', colour: '#C98E80', poly: grow(fore, 8), source: [SRC.home04, SRC.q22, SRC.dji], confidence: 'seen', note: 'horseshoe of pavers round the oval flag lawn, up to the building fronts' });
add({ id: 'admin-forecourt-hedge', type: 'hedge', material: 'clipped box hedge with conifer topiary', colour: '#3E7A35', height: 0.7, width: 0.8, pts: [...fore.map(P), P(fore[0])], source: [SRC.home04], confidence: 'seen' });
add({ id: 'flag-ring-path', type: 'footpath', material: 'pale concrete pavers', colour: '#D9D2C2', width: 1.6, pts: [...circle(flag, 6.5, 28), circle(flag, 6.5, 28)[0]], source: [SRC.home04, SRC.q22], confidence: 'seen' });
add({ id: 'flag-cross-paths', type: 'footpath', material: 'pale concrete pavers', colour: '#D9D2C2', width: 1.6, pts: [P([flag[0] - 18, flag[1] + 4]), P([flag[0] + 18, flag[1] - 4])], source: [SRC.home04], confidence: 'by-eye' });
add({ id: 'flag-plinth', type: 'plaza', material: 'stone ring plinth', colour: '#CFC6B4', poly: circle(flag, 2.6, 16), height: 0.5, source: [SRC.home04], confidence: 'seen' });
{ const e = bld('admin').parts[3], f = faceToward(e.poly, flag);
  add({ id: 'admin-parking-east', type: 'parking', material: 'red-pink pavers, painted bays', colour: '#C98E80', poly: [f.fp(-4, 2), f.fp(f.len + 12, 2), f.fp(f.len + 12, 16), f.fp(-4, 16)], bays: 10, source: [SRC.home04, SRC.q16, SRC.dji], confidence: 'seen', note: 'cars parked in front of and beside the east block' }); }
{ const w = bld('admin').parts[1], f = faceToward(w.poly, [120, -260]);
  add({ id: 'admin-parking-west', type: 'parking', material: 'red-pink pavers', colour: '#C98E80', poly: [f.fp(0, 3), f.fp(f.len, 3), f.fp(f.len, 15), f.fp(0, 15)], bays: 8, source: [SRC.home08, SRC.q16], confidence: 'by-eye', note: 'below the west block, by the road (cars in the homepage still @0:08.5)' }); }
{ const m = bld('admin').parts[2], f = faceToward(m.poly, flag);
  add({ id: 'admin-wing-planters', type: 'flower-bed', material: 'stone-edged raised beds, flowers and shrubs', colour: '#6E9A3E', height: 0.5, width: 1.6, pts: [f.fp(2, 2.2), f.fp(f.len - 2, 2.2)], source: ['iimshillong 2024/10/7', 'collegebatch 310633'], confidence: 'seen' });
  add({ id: 'admin-portico-steps', type: 'steps', material: 'granite steps', colour: '#BEB8AC', width: 14, height: 0.6, steps: 4, pts: [f.fp(f.len / 2 - 7, 0.5), f.fp(f.len / 2 + 7, 0.5)], depth: 1.4, source: ['iimking (portico)', SRC.home04], confidence: 'by-eye' }); }
const tg = area('terrace-garden').pts, tc = centroid(tg), statue = lm('kalam-statue');
[0, 1, 2, 3].forEach(k => add({ id: `terrace-wall-${k + 1}`, type: 'retaining-wall', name: 'Terraced garden wall', material: 'random rubble stone', colour: '#9C8F7A', height: 1.2, width: 0.4, pts: [P([tg[0][0] + 4, tg[0][1] - 8 - k * 15]), P([tc[0], tc[1] - k * 15 + 22]), P([tg[1][0] - 6, tg[1][1] - 10 - k * 15])], source: [SRC.i363, SRC.q22, 'iimshillong 2024/10/3'], confidence: 'by-eye', note: 'stepped grass terraces south of the forecourt; curved stone walls, winding paths' }));
add({ id: 'terrace-paths', type: 'footpath', material: 'pale concrete', colour: '#D9D2C2', width: 1.8, pts: [P([tg[0][0] + 8, tg[0][1] - 4]), P([tc[0] - 20, tc[1] + 6]), P([tc[0] + 5, tc[1] - 12]), P([tc[0] - 10, tc[1] - 28]), P(statue)], source: [SRC.q22, SRC.i363], confidence: 'by-eye' });
[8, 14, 20].forEach((r, k) => add({ id: `statue-garden-terrace-${k + 1}`, type: 'terrace', name: 'Kalam statue garden terrace', material: 'grass terrace with stone edge', colour: '#8DAF4A', edgeColour: '#9C8F7A', height: 0.8, pts: [...circle(statue, r, 28), circle(statue, r, 28)[0]], source: [SRC.marked, SRC.q22, 'iimshillong 2024/10/3'], confidence: 'by-eye' }));
add({ id: 'statue-plaza', type: 'plaza', material: 'pale pavers round the statue plinth', colour: '#D9D2C2', poly: circle(statue, 4.5, 20), source: [SRC.marked], confidence: 'by-eye' });

// the roadside below Admin: stone retaining wall with a railing between the Scholar's Path and the Admin ground
add({ id: 'admin-road-retaining-wall', type: 'retaining-wall', material: 'random rubble stone, white railing on top', colour: '#9C8F7A', height: 2.0, width: 0.5, railing: { height: 1.0, colour: '#E8E8E2' }, pts: offsetLine(sliceLine(main.pts, [99, -232], [187, -295]), 10.5 / 2 + 2.5 + 3.4, 6), source: [SRC.home08, SRC.q16], confidence: 'seen' });

// NAB: front plaza, lawn path, canopy steps
{ const n = bld('nab'), mid = n.parts[1], lawn = area('nab-lawn').pts, f = faceToward(mid.poly, centroid(lawn));
  add({ id: 'nab-front-plaza', type: 'plaza', name: 'NAB front plaza', material: 'red-pink pavers', colour: '#C98E80', poly: [f.fp(-14, 0.3), f.fp(f.len + 14, 0.3), f.fp(f.len + 14, 9), f.fp(-14, 9)], source: [SRC.home05, 'crops/nab_dji'], confidence: 'seen' });
  for (const s of [f.len / 2 - 15, f.len / 2 + 15]) add({ id: `nab-canopy-steps-${s < f.len / 2 ? 'sw' : 'ne'}`, type: 'steps', material: 'granite', colour: '#BEB8AC', width: 6, height: 0.6, steps: 4, pts: [f.fp(s - 3, 0.6), f.fp(s + 3, 0.6)], depth: 1.4, source: [SRC.home05], confidence: 'seen' });
  add({ id: 'nab-lawn-path', type: 'footpath', material: 'pale concrete', colour: '#D9D2C2', width: 2.0, pts: [f.fp(f.len * 0.2, 9), P(centroid(lawn)), f.fp(f.len * 0.9, 40)], source: [SRC.home05], confidence: 'by-eye', note: 'the diagonal path across the NAB lawn' }); }

// Cafe Cloud plaza (red hex pavers between the cafe and the main road)
{ const c = bld('cafe-cloud').parts[0];
  add({ id: 'cafe-cloud-plaza', type: 'plaza', material: 'red hexagonal pavers', colour: '#C4887A', poly: circle([c.cx, c.cy], 22, 24), source: [SRC.q05, 'drone 9QBtbam1G5Q @0:00.5–0:08.5'], confidence: 'seen', note: 'the octagon sits in a paved apron that reaches the main road kerb; a railing on its lower edge' }); }

// sports: court fences, football fence and floodlights, pavilion forecourt
{ const cs = area('courts-surround').pts;
  add({ id: 'courts-fence', type: 'fence', material: 'green chain-link on steel posts', colour: '#3D6B4A', height: 3.6, pts: [...grow(cs.slice(0, 4), 1.0), grow(cs.slice(0, 4), 1.0)[0]], source: [SRC.q54, SRC.s9159], confidence: 'seen' });
  add({ id: 'courts-surround-red', type: 'court-surround', material: 'red acrylic surround', colour: '#C8534A', poly: cs.slice(0, 4).map(P), source: [SRC.q54, 'courts-aerial_s1'], confidence: 'seen' }); }
{ const fb = area('football').pts.slice(0, 4), g = grow(fb, 3);
  add({ id: 'football-fence', type: 'fence', material: 'dark steel mesh fence', colour: '#3A4148', height: 2.4, pts: [...g, g[0]], source: [SRC.q38, SRC.s677], confidence: 'seen' });
  g.forEach((q, k) => add({ id: `football-floodlight-${k + 1}`, type: 'floodlight', material: 'steel lattice mast, lamp head', colour: '#9AA1A8', height: 18, at: q, source: [SRC.q38, 'homepage video @0:39.5 (lit at night)', SRC.s677], confidence: k === 0 ? 'seen' : 'by-eye' })); }

// lake edge
{ const lake = osm.areas.find(a => a.kind === 'water') ?? area('lake'), ring = lake.pts;
  add({ id: 'lake-edge', type: 'lake-edge', material: 'stone pitching at the waterline, grass bank', colour: '#8E8676', width: 1.2, pts: grow(ring.slice(0, -1), 0.8).concat([grow(ring.slice(0, -1), 0.8)[0]]), source: ['homepage video @0:15.5', SRC.sat], confidence: 'by-eye' });
  add({ id: 'lake-trail', type: 'trail', material: 'gravel trail', colour: '#C9B48E', width: 1.8, ref: 'campus-layout lake-trail', pts: (pathOf('lake-trail')?.pts ?? []).map(P), source: ['campus-layout lake-trail', SRC.sat], confidence: 'seen' }); }

// gate
{ const g = lm('main-gate');
  add({ id: 'main-gate-portal', type: 'gate', material: 'white frame, green pitched roof, sliding steel gate', colour: '#F2F2EE', roofColour: '#3F8F80', width: 14, height: 7, at: P(g), source: ['web main-gate photos (jdmagicbox, collegeadmission)', 'drone 9QBtbam1G5Q @0:45'], confidence: 'seen' });
  add({ id: 'main-gate-name-wall', type: 'wall', material: 'stone name wall, Hindi and English letters', colour: '#A89C88', height: 1.6, width: 0.5, pts: [P([g[0] + 9, g[1] + 6]), P([g[0] + 20, g[1] + 14])], source: ['web main-gate photos'], confidence: 'by-eye' }); }

// hostels: courtyard, mess plaza
add({ id: 'hostel2-courtyard', type: 'courtyard', material: 'pavers and lawn between the F Block wings', colour: '#CDBFA6', poly: area('hostel2-court').pts.filter((q, i) => i % 3 === 0).map(P), source: ['campus-layout hostel2-court', 'hostel22 (courtyard photo)'], confidence: 'seen' });
{ const m = bld('mess').parts[0]; add({ id: 'mess-plaza', type: 'plaza', material: 'red pavers', colour: '#C4887A', poly: circle([m.cx + 12, m.cy - 8], 21, 16), source: [SRC.sat, 'mess_from_above.png'], confidence: 'by-eye', note: 'the paved apron round the four octagons' }); }

// tree lines
add({ id: 'roadside-conifers-admin', type: 'tree-line', material: 'clipped conifers (cypress)', colour: '#2F5F35', height: 4, spacing: 4, pts: offsetLine(sliceLine(main.pts, [95, -224], [145, -268]), 10.5 / 2 + 2.5 + 5.2, 6), source: [SRC.home08], confidence: 'seen' });
add({ id: 'forecourt-solar-lights', type: 'light-row', material: 'solar street lights, 6 m', colour: '#9AA1A8', height: 6, spacing: 14, pts: grow(fore, 4.5).concat([grow(fore, 4.5)[0]]), source: [SRC.home04], confidence: 'seen' });

// ---------- write ----------
const out = {
  note: "Phase 3M v2 (reference/style/REAL_CAMPUS_MODELS.md 2b), generated by scripts/build-hardscape.mjs. Road widths and pavements per path id, the full Scholar's Path, and the paved, walled, fenced and planted ground. Local metres like campus-layout.json. Placed by eye from real photos, drone stills and satellite screenshots (never traced), snapped to the data roads and footprints. 'confidence': measured | seen | by-eye | guess.",
  origin: layout.origin,
  defaults: Object.fromEntries(Object.entries(SPEC).map(([k, v]) => [k, v.width])),
  roads, tightSpots: tight,
  items,
};
fs.writeFileSync('public/data/hardscape.json', JSON.stringify(out, null, 1).replace(/\[\s+(-?[\d.]+),\s+(-?[\d.]+)\s+\]/g, '[$1, $2]') + '\n');
console.log(JSON.stringify({ roads: roads.length, tightSpots: tight.length, items: items.length, scholarsPathM: r1(len(scholars)), tight: tight.map(t => `${t.road} near ${t.building} → ${t.width} m`) }, null, 1));
