// Layout items traced on H A's straight-down drone still (20 Nov) outside NAB: the flag forecourt lawn, the forecourt drive
// path, and the small buildings round Cafe Cloud and between Admin and NAB. Read in photo pixels and converted at their own
// level with the relief-aware fit (roof tops of the huts sit 3–4 m above their ground). Writes
// reference/layout/drone_items.json, applied by scripts/apply_drone_items.py (live data and the generator).
import fs from 'node:fs';
import { fitDrone3 } from './lib/dronefit.mjs';
const f = fitDrone3(), M = (pts, z) => pts.map(q => f.toM3(q, z).map(v => +v.toFixed(1)));
const off = ([dx, dy]) => q => q.map(([x, y]) => [x + dx, y + dy]);
const out = {
  note: "H A's drone nadir (dji_fly_20260907 @0:24.8), relief-aware fit (scripts/drone-items.mjs)",
  areas: {
    // the teardrop lawn inside the paved loop drive (read on the Admin crop, offset 150, 1050)
    'admin-forecourt': M(off([150, 1050])([[395, 82], [600, 86], [870, 108], [890, 165], [860, 215], [780, 280], [700, 345], [640, 360], [590, 355], [550, 330], [520, 300], [470, 230], [420, 160]]), 9.6),
    // the statue garden: the whole mown lawn with its terrace curves (the old area was a by-eye rectangle across it)
    'terrace-garden': M([[60, 170], [170, 80], [300, 100], [400, 210], [455, 300], [460, 400], [430, 445], [330, 465], [200, 480], [120, 470], [60, 380]].map(([x, y]) => [x * 2.16, y * 2.16]), 6),
    // the NAB lawn is the slope lawn between Admin and NAB (the old area was a by-eye quadrilateral across it)
    'nab-lawn': M([[330, 905], [470, 905], [590, 960], [640, 1050], [560, 1110], [450, 1150], [340, 1200], [250, 1250], [230, 1180], [300, 1080], [330, 1000]].map(([x, y]) => [x * 2.16, y * 2.16]), 7),
  },
  paths: {
    // portico → flag ring → down the lawn → the drive to the bus bay → the main road (the first two points stay on the data)
    // starts at Admin's main door (the portico corner, reference/layout/admin_drone.json), then the flag ring
    'fp-admin-forecourt': [JSON.parse(fs.readFileSync('reference/layout/admin_drone.json', 'utf8')).entrance, [204.0, -227.0], ...M([[780, 1150], [900, 1105], [985, 1000], [1000, 860], [1110, 700]], 8.5)],
  },
  // small buildings: roof outline on the photo, converted at roof level; ground level for the 3D pad
  buildings: {
    'service-plant': { ground: 8, poly: M([[1385, 2185], [1455, 2165], [1480, 2230], [1410, 2250]], 12) },
    'cafe-hut-red': { ground: 6.5, poly: M([[1808, 1470], [1850, 1445], [1875, 1485], [1830, 1510]], 10) },
    'amul-cafe': { ground: 6.5, poly: M([[2012, 1482], [2048, 1482], [2050, 1522], [2014, 1524]], 10) },
    'cafe-shed-blue': { ground: 6.5, poly: M([[2105, 1582], [2142, 1595], [2135, 1615], [2100, 1605]], 9.5) },
    'cafe-store': { ground: 6.5, poly: M([[1950, 1975], [2008, 1922], [2055, 1955], [1995, 2012]], 10.5) },
  },
};
fs.writeFileSync('reference/layout/drone_items.json', JSON.stringify(out, null, 1));
console.log('written: areas', Object.keys(out.areas).length, 'paths', Object.keys(out.paths).length, 'buildings', Object.keys(out.buildings).length);
