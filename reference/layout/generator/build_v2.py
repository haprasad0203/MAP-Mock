"""Build campus-layout.json v2 for the WMC Campus map.

Sources:
  - Overture Maps buildings (Google Open Buildings + Microsoft ML footprints, release 2026-10-21.0)
  - OpenStreetMap roads, lake and courts (export 2026-11-13)
  - Google Maps place pins (names and points only) for identifying which footprint is which
  - Drone photos (DJI_0338, Image_363) and satellite screenshots, used BY EYE only for buildings
    missing from the open data (new hostel, Admin hall, NAB middle) and for a few campus roads.
Local grid: x east, y north, metres from 25.6176, 91.9522 (same as src/geo/grid.ts).
"""
import json, math, sys, copy
sys.path.insert(0, 'layout')
from common import L, PINS, load_buildings, load_osm
from sat import SHOTS, fit
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import nearest_points

FP = {b['i']: b for b in load_buildings()}

# ---- pixel (satellite screenshot) -> local metres, for by-eye shapes only ----
def inv(shot):
    P, s = fit(SHOTS[shot][1])
    x0, y0 = P(0, 0)
    return lambda px, py: ((px - x0) / s, -(py - y0) / s)
I03, I02 = inv('03'), inv('02')
z03 = lambda zx, zy: I03(760 + zx / 3, 230 + zy / 3)      # zoom_admin.png coords
z02 = lambda zx, zy: I02(540 + zx / 3, 50 + zy / 3)       # zoom_north.png coords

r1 = lambda v: round(v, 1)

def part_from_poly(pts, floors, roof, **extra):
    poly = Polygon(pts)
    mrr = poly.minimum_rotated_rectangle
    c = list(mrr.exterior.coords)[:4]
    e1 = (c[1][0] - c[0][0], c[1][1] - c[0][1]); e2 = (c[2][0] - c[1][0], c[2][1] - c[1][1])
    l1, l2 = math.hypot(*e1), math.hypot(*e2)
    if l1 >= l2: w, d, ang = l1, l2, math.degrees(math.atan2(e1[1], e1[0]))
    else: w, d, ang = l2, l1, math.degrees(math.atan2(e2[1], e2[0]))
    if ang > 90: ang -= 180
    if ang <= -90: ang += 180
    cx, cy = mrr.centroid.x, mrr.centroid.y
    p = {'cx': r1(cx), 'cy': r1(cy), 'w': r1(w), 'd': r1(d), 'angle': r1(ang), 'floors': floors, 'roof': roof}
    p.update(extra)
    p['poly'] = [[r1(x), r1(y)] for x, y in list(poly.exterior.coords)[:-1]]  # true footprint, for 3D extrusion
    return p

USED = set()
def fpart(i, floors, roof, **extra):
    USED.add(i)
    p = part_from_poly(FP[i]['ring'], floors, roof, **extra); p['src'] = f"overture {FP[i]['gers']} ({FP[i]['src']})"; return p

def bar_between(pa, pb, width, floors, roof, extend=0, **extra):
    (ax, ay), (bx, by) = pa, pb
    ang = math.atan2(by - ay, bx - ax); ln = math.hypot(bx - ax, by - ay) + extend
    cx, cy = (ax + bx) / 2, (ay + by) / 2
    dx, dy = math.cos(ang) * ln / 2, math.sin(ang) * ln / 2; nx, ny = -math.sin(ang) * width / 2, math.cos(ang) * width / 2
    pts = [(cx - dx - nx, cy - dy - ny), (cx + dx - nx, cy + dy - ny), (cx + dx + nx, cy + dy + ny), (cx - dx + nx, cy - dy + ny)]
    p = part_from_poly(pts, floors, roof, **extra); p['src'] = 'derived'; return p

def eye(pts, floors, roof, **extra):
    p = part_from_poly(pts, floors, roof, **extra); p['src'] = 'by-eye (drone + satellite), survey to confirm'; return p

C = dict(TEAL='#3E8A6E', CREAM='#F1EBDC', WHITE='#F4F2EA', PEACH='#EDCDA6', GREEN='#3E8A4E', SLATE='#4B525A', GREY='#77808A', STONE='#8A6B4F')

buildings = []
def B(id, name, category, wall, roof, parts, prio, short=None, confirm=None, **kw):
    b = {'id': id, 'name': name, 'category': category, 'wall': wall, 'roofColor': roof, 'labelPriority': prio, 'parts': parts}
    if short: b['short'] = short
    if confirm: b['confirm'] = confirm
    b.update(kw); buildings.append(b)

# ---------------- Academic core (south) ----------------
# Admin complex = the U-shaped building with the flag forecourt (drone DJI_0338 / Image_363).
# Google labels this whole complex "IIM Shillong Auditorium"; the WMC app lists Admin Block (Auditorium, Library, L-Shaped Hall).
# Admin complex = ONE building (confirmed by H A, 13 Nov): Admin offices, the Auditorium and the Library are all inside it.
# Main block traced by eye on satellite shot 03 (raw px): the big grey pitched roof; west wing = Overture 560/561; east wing = Overture 562.
main = eye([I03(948, 381), I03(1001, 409), I03(993, 438), I03(937, 423)], 3, 'hip')
B('admin', 'Admin Block', 'venue', C['WHITE'], C['GREEN'],   # roof green: confirmed by H A 13 Nov (satellite grey is old imagery)
  [fpart(560, 4, 'hip', glass='atrium'), fpart(561, 4, 'hip'), main, fpart(562, 3, 'hip', glass='stair')], 1, short='Admin',
  confirm='One building holding the Admin offices, the Auditorium and the Library (confirmed). Which wing holds which: to confirm. Google labels it "IIM Shillong Auditorium".')
front = main
nab_mid = bar_between(FP[557]['c'], FP[516]['c'], 18, 4, 'flat', extend=0, glass='atrium')
B('nab', 'New Academic Block (NAB)', 'venue', C['WHITE'], C['GREEN'],
  [fpart(557, 5, 'flat', stoneTowers=True), nab_mid, fpart(516, 5, 'flat', stoneTowers=True), fpart(517, 4, 'flat')], 1, short='NAB',
  confirm='Long white block at the Google "IIM SHILLONG" pin; stone stair towers at both ends (drone).')
B('cafe-cloud', 'Cafe Cloud Campus', 'food', C['WHITE'], C['GREEN'], [fpart(518, 1, 'octagon', glass='atrium')], 2, short='Cafe Cloud',
  confirm='Octagonal pavilion west of the main road, opposite the Admin Block (Google pin + drone).')
oc = FP[518]['c']
B('amul-cafe', 'Amul Cafe', 'food', '#C9B48A', C['GREY'],
  [eye([(oc[0] - 4, oc[1] - 26), (oc[0] + 6, oc[1] - 26), (oc[0] + 6, oc[1] - 19), (oc[0] - 4, oc[1] - 19)], 1, 'gable')], 2, short='Amul Cafe',
  confirm='Kiosk next to Cafe Cloud (confirmed as Amul Cafe); exact outline by eye.')

# ---------------- 20 Nov audit: real structures seen on H A's straight-down drone still (scripts/lib/dronefit.mjs) ----------------
def drone(pts, floors, roof, **extra):
    p = part_from_poly(pts, floors, roof, **extra); p['src'] = "H A drone nadir 20 Nov (dji_fly_20260907 @0:24.8), fake/missing audit"; return p
B('service-plant', 'Service plant house', 'service', '#E9E6DE', '#8A9096', [drone([(108.0, -140.5), (100.9, -144.8), (96.2, -138.5), (103.3, -134.2)], 1, 'flat')], 3,
  confirm='Walled plant between Admin and NAB (open tanks with equipment; water or sewage plant, to confirm).')
B('cafe-hut-red', 'Hut by Cafe Cloud', 'service', '#EDE6D8', '#B8504A', [drone([(83.2, -231.5), (79.3, -235.5), (75.4, -231.9), (79.5, -227.8)], 1, 'hip')], 3)
B('cafe-shed-blue', 'Shed by Cafe Cloud', 'service', '#D9D6CE', '#3D6FB0', [drone([(47.3, -228.2), (42.8, -227.9), (43.0, -225.5), (47.1, -225.5)], 1, 'flat')], 3)
B('cafe-store', 'Store north of Cafe Cloud', 'service', '#E4E1D8', '#8E969C', [drone([(52.4, -180.5), (47.7, -188.1), (41.5, -185.9), (46.4, -177.8)], 1, 'gable')], 3)
for _b in buildings:
    if _b['id'] == 'amul-cafe':  # the teal-roofed kiosk, about 4 m square (was a 10 x 7 m guess)
        _b['parts'] = [drone([(60.5, -236.3), (56.5, -237.4), (55.1, -233.1), (59.0, -231.8)], 1, 'hip')]; _b['roofColor'] = '#3F9A93'
        _b['confirm'] = 'The teal-roofed kiosk by Cafe Cloud (H A drone, 20 Nov).'

# ---------------- Kalam area ----------------
B('kalam-centre', 'Dr. Kalam Centre', 'venue', C['WHITE'], C['GREEN'], [fpart(494, 3, 'hip', glass='stair'), fpart(495, 3, 'hip')], 1, short='Kalam Centre')
B('kalam-building', 'Kalam Building', 'venue', C['WHITE'], C['GREEN'], [fpart(500, 2, 'hip')], 2, confirm='Assumed to be the block just east of the Kalam Centre.')
# 20 Nov: H A's drone footage and the satellite show bare ground, scrub and debris here, no buildings (fake-building audit)
if False: B('east-cluster', 'Campus blocks (between NAB and Kalam Centre)', 'service', '#ECE4D2', C['GREEN'],
  [fpart(i, 2, 'hip') for i in (513, 514, 515, 519, 520)], 3, short='Campus blocks', confirm='Use of these small blocks to confirm.')
B('block-501', 'Campus building', 'service', '#ECE4D2', C['GREEN'], [fpart(501, 2, 'hip')], 3, confirm='Use to confirm.')
B('block-503', 'Campus building', 'service', '#ECE4D2', C['GREEN'], [fpart(503, 2, 'hip')], 3, confirm='Use to confirm.')
B('east-residence', 'East hill residence', 'staff', C['WHITE'], C['TEAL'], [fpart(486, 2, 'hip'), fpart(484, 1, 'hip')], 3, confirm='Use to confirm.')

# ---------------- Lake / courts ----------------
B('octagon-hall', 'Octagonal Hall', 'venue', C['WHITE'], C['GREEN'], [fpart(947, 1, 'octagon', glass='atrium')], 2,
  confirm='Hall on the north shore of the lake beside the road (drone video). Use to confirm.')
B('road-block', 'Service block', 'service', '#E4DAC4', C['GREEN'], [fpart(492, 1, 'flat')], 3, confirm='Small block at the lake-road junction; use to confirm.')
B('gym', 'Sports Pavilion & Gym', 'sports', C['WHITE'], C['TEAL'], [fpart(941, 1, 'gable')], 2, short='Gym',
  confirm='Pavilion at the west end of the court strip; whether the gym is inside to confirm.')
B('court-kiosk', 'Court-side kiosk', 'service', C['WHITE'], C['TEAL'], [fpart(943, 1, 'gable')], 3)
B('west-cluster', 'Residential cluster (west of the courts)', 'hostel', C['CREAM'], C['GREEN'], [fpart(i, 3, 'hip', balconies=True) for i in (928, 929, 930, 931, 932, 933, 934, 944, 945, 946)], 1,
  short='West cluster', confirm='Ten small blocks west of the courts. NOT Hostel 1 (H A: D Block is Hostel 1). Name and use to confirm.')

# ---------------- North: hostels, mess, shops ----------------
B('hostel-1', 'Hostel 1 · D Block', 'hostel', C['WHITE'], '#D9D6CE',
  [fpart(953, 4, 'flat', balconies=True, glass='stair', stoneBase=True), fpart(952, 4, 'flat', balconies=True, stoneBase=True), fpart(956, 4, 'flat', stoneBase=True), fpart(955, 4, 'flat', balconies=True, stoneBase=True), fpart(942, 4, 'flat', balconies=True, stoneBase=True)], 1,   # flat roofs: DSC_9111 + satellite (13 Nov)
  short='Hostel 1', confirm='Named by H A (Google: "D block"). Whether the two south-west blocks belong to it to confirm.')
# Students' Mess = the cluster of four octagonal halls west of Hostel 1 (D Block), confirmed by H A 13 Nov.
# Centres measured on H A's high-res screenshot (relative to each other), anchored to Overture footprints 975/937/938 (mean shift).
def octagon(c, dia, floors, **extra):
    r = dia / 2 / math.cos(math.pi / 8)
    pts = [(c[0] + r * math.cos(math.pi / 8 + k * math.pi / 4), c[1] + r * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)]
    p = part_from_poly(pts, floors, 'octagon', **extra); p['src'] = 'octagon measured on H A screenshot, anchored to Overture'; return p
USED.update({937, 938, 975})
B('mess', "Students' Mess", 'food', C['CREAM'], C['SLATE'],
  [octagon((-297.7, 269.4), 25, 2), octagon((-291.9, 300.9), 23, 1), octagon((-281.4, 279.2), 16, 1), octagon((-269.5, 262.0), 22, 1)], 1, short='Mess',
  confirm='Four octagonal halls with dark grey octagonal roofs (satellite). Roof colour to confirm from a ground photo.')
B('commercial', 'Commercial Complex', 'food', '#E9DCC0', C['GREY'], [fpart(939, 1, 'flat')], 2, short='Commercial Complex', confirm='Google labels it "Mithaas" (a shop inside). Confirmed by H A as the Commercial Complex.')

newh = eye([z02(465, 600), z02(575, 560), z02(600, 620), z02(490, 665)], 4, 'hip', stoneBase=True, glass='stair', balconies=True)
B('hostel-4', 'Hostel 4', 'hostel', C['PEACH'], C['GREEN'], [newh], 1, short='Hostel 4',
  confirm='Named by H A; finished building (H A, 13 Nov). Between Hostel 1 (D Block) and Hostel 2 (F Block); missing from the open footprint data, so the outline is by eye. Survey the corners.')
B('hostel-2', 'Hostel 2 · F Block', 'hostel', C['PEACH'], C['GREEN'],
  [fpart(957, 5, 'hip', stoneBase=True, glass='stair', balconies=True), fpart(958, 5, 'hip', stoneBase=True, glass='stair', balconies=True),
   fpart(974, 5, 'hip', stoneBase=True), fpart(973, 5, 'hip', stoneBase=True, glass='stair', balconies=True)], 1, short='Hostel 2')
B('hostel-3', 'Hostel 3', 'hostel', C['PEACH'], C['GREEN'],
  [fpart(977, 4, 'hip', stoneBase=True, glass='stair'), fpart(976, 4, 'hip', stoneBase=True), fpart(971, 4, 'hip', stoneBase=True, glass='stair')], 1, short='Hostel 3',
  confirm='Named by H A. Highest hostel blocks on the north ridge.')
B('block-962', 'Campus building', 'service', '#ECE4D2', C['GREEN'], [fpart(962, 2, 'hip')], 3, confirm='Use to confirm.')
B('block-488', 'Campus building', 'service', '#ECE4D2', C['GREEN'], [fpart(488, 2, 'hip')], 3, confirm='Use to confirm.')

# ---------------- Staff quarters (west) ----------------
t2, t3 = L(*PINS['Type 2 Quarters']), L(*PINS['Faculty Qtrs Type 3'])
q2, q3 = [], []
for i in list(range(986, 1009)) + [1010]:
    if i not in FP or i == 1009 or FP[i]['area'] < 40: continue
    c = FP[i]['c']; (q2 if math.dist(c, t2) < math.dist(c, t3) else q3).append(i)
B('type2', 'Type 2 Quarters (staff housing)', 'staff', C['WHITE'], C['TEAL'], [fpart(i, 3, 'hip') for i in q2], 3, short='Type 2 Quarters')
B('type3', 'Faculty Quarters Type 3', 'staff', C['WHITE'], C['TEAL'], [fpart(i, 3, 'hip') for i in q3], 3, short='Type 3 Quarters')

# ---------------- Services ----------------
B('substation', 'IIM Substation', 'service', '#D9D4C8', C['GREY'], [fpart(468, 1, 'flat')], 3)
# 20 Nov: bare red earth on the satellite (fake-building audit)
if False: B('service-east', 'Service buildings (east of Admin)', 'service', '#D9D4C8', C['GREY'], [fpart(563, 1, 'flat'), fpart(564, 1, 'flat')], 3, confirm='Use to confirm.')
gate = L(*PINS['IIM-Shillong (main listing)'])
B('guard-room', 'Main Gate Security', 'help', C['CREAM'], C['GREEN'],
  [eye([(gate[0] - 9, gate[1] + 2), (gate[0] - 3, gate[1] + 2), (gate[0] - 3, gate[1] + 7), (gate[0] - 9, gate[1] + 7)], 1, 'hip')], 3, short='Security',
  confirm='Gate at the "Indian Institute of Management–Shillong" pin; guard-room spot to confirm.')

# ---------------- Areas ----------------
def ring_local(f): return [L(y, x) for x, y in f['geometry']['coordinates'][0]]
def rnd(pts): return [[r1(x), r1(y)] for x, y in pts]
def circle(c, r, n=20): return [(c[0] + r * math.cos(2 * math.pi * k / n), c[1] + r * math.sin(2 * math.pi * k / n)) for k in range(n)]
lake_poly = Polygon(ring_local(load_osm('water')[0]))
pitches = [f for f in load_osm('areas') if f['properties'].get('leisure') == 'pitch']
court_union = Polygon(ring_local([f for f in load_osm('areas') if f['properties'].get('landuse') == 'recreation_ground'][0]))
# Football ground re-traced 13 Nov (H A: old box was wrong): the playing field between the light perimeter track, shot 02 raw px
foot = [I02(751.7, 351.7), I02(791.7, 321.7), I02(848.3, 405.0), I02(808.3, 435.0)]
forecourt_c = z03(620, 665)
areas = [
  {'id': 'lake', 'kind': 'water', 'name': 'Campus Lake', 'pts': rnd(list(lake_poly.exterior.coords)[:-1]), 'src': 'OSM lake outline'},
  {'id': 'football', 'kind': 'ground', 'surface': 'grass', 'name': 'Football Ground', 'pts': rnd(foot), 'src': 'by-eye; Google pin'},
  {'id': 'courts-surround', 'kind': 'plaza', 'pts': rnd(list(court_union.buffer(4, join_style=2).exterior.coords)[:-1]), 'src': 'OSM recreation ground + 4 m'},
  {'id': 'admin-forecourt', 'kind': 'garden', 'name': 'Flag forecourt', 'pts': [[231.6, -230.6], [209.0, -236.3], [178.8, -242.0], [174.9, -236.4], [176.7, -230.0], [183.5, -220.5], [190.3, -211.0], [196.4, -207.5], [202.0, -206.6], [207.2, -208.1], [211.3, -210.5], [218.9, -216.7], [226.5, -222.8]], 'src': 'H A drone nadir 20 Nov: the teardrop lawn inside the loop drive (scripts/lib/dronefit.mjs)'},
  {'id': 'aud-plaza', 'kind': 'plaza', 'pts': rnd([z03(470, 640), z03(745, 625), z03(765, 705), z03(470, 725)]), 'src': 'by-eye'},
  {'id': 'terrace-garden', 'kind': 'garden', 'name': 'Kalam statue garden', 'pts': rnd([z03(650, 700), z03(1000, 700), z03(1000, 900), z03(700, 900)]), 'src': 'by-eye (drone)'},
  {'id': 'nab-lawn', 'kind': 'lawn', 'pts': rnd([z03(430, 250), z03(560, 330), z03(520, 420), z03(400, 360)]), 'src': 'by-eye'},
  {'id': 'kalam-lawn', 'kind': 'lawn', 'pts': rnd(list(Polygon(FP[494]['ring']).union(Polygon(FP[495]['ring'])).buffer(14, join_style=2).exterior.coords)[:-1]), 'src': 'around footprints'},
  {'id': 'west-cluster-lawn', 'kind': 'lawn', 'pts': rnd(list(Polygon([FP[i]['c'] for i in (934, 928, 930, 946, 944, 933)]).convex_hull.buffer(10, join_style=2).exterior.coords)[:-1]), 'src': 'around footprints'},
  {'id': 'hostel2-court', 'kind': 'plaza', 'pts': rnd(list(Polygon([FP[i]['c'] for i in (957, 958, 974, 973)]).convex_hull.buffer(4).exterior.coords)[:-1]), 'src': 'between F Block blocks'},
  {'id': 'octagon-plaza', 'kind': 'plaza', 'pts': rnd(list(Polygon(FP[947]['ring']).buffer(8, join_style=2).exterior.coords)[:-1]), 'src': 'around footprint'},
]

# ---------------- Roads & paths ----------------
osm_roads = [LineString([L(y, x) for x, y in f['geometry']['coordinates']]) for f in load_osm('roads_paths')]
paths = []
# Hostel road, re-traced 13 Nov on H A's high-res satellite screenshot of the hostels (georeferenced to shot 02 from 2 pins + 2 buildings, ~2 m fit):
# asphalt, from the junction east of Hostel 1 (D Block) past Hostel 2 (F Block), round the loop, up to Hostel 3.
paths.append({'id': 'rd-fblock', 'kind': 'road', 'surface': 'asphalt', 'name': 'Hostel road (Hostel 1 junction to Hostel 2 and Hostel 3)', 'src': 'traced on H A screenshot (13 Nov)',
              'pts': rnd([I02(*p) for p in [(803.3, 282.4), (784.4, 267.9), (764.1, 254.1), (755.4, 242.6), (753.0, 218.5), (748.1, 203.7), (737.9, 198.9), (723.5, 201.1), (706.1, 209.5), (688.8, 224.3), (675.9, 241.9), (660.0, 255.1), (642.7, 262.3), (626.8, 261.9), (616.6, 251.9), (614.5, 233.9), (616.5, 218.6), (626.6, 208.8), (645.4, 203.0), (661.3, 198.9), (671.4, 189.1), (673.6, 178.3), (668.4, 170.2), (653.9, 169.1), (636.6, 172.3), (625.0, 177.1)]])})
paths.append({'id': 'rd-north', 'kind': 'service', 'name': 'Hostel 3 upper access', 'src': 'traced on H A screenshot (13 Nov)',
              'pts': rnd([I02(*p) for p in [(662.6, 163.9), (663.4, 153.3), (668.3, 147.2), (675.8, 143.6)]])})
# Roads seen on the satellite screenshots that neither OSM nor Overture has (by eye, 13 Nov)
# (rd-hostel2-lower removed 13 Nov: the traced hostel road covers it)
paths.append({'id': 'rd-east', 'kind': 'service', 'name': 'East road (Kalam junction to the east hill)', 'src': 'by-eye (satellite shots 01-03)',
              'pts': rnd([I03(*p) for p in [(783, 110), (830, 119), (873, 110), (960, 87)]])})
# NAB roads (by eye on satellite shot 03, 13 Nov; H A: "road in front of NAB is not marked")
paths.append({'id': 'rd-nab-north', 'kind': 'service', 'name': 'NAB approach road (from the Kalam side)', 'src': 'by-eye (satellite shot 03)',
              'pts': rnd([I03(*p) for p in [(772, 190), (775, 205), (780, 222), (792, 240), (816, 252), (832, 264), (840, 278)]])})
paths.append({'id': 'rd-nab-west', 'kind': 'service', 'name': 'NAB west lane (beside the main road)', 'src': 'by-eye (satellite shot 03)',
              'pts': rnd([I03(*p) for p in [(840, 278), (834, 290), (826, 304), (820, 322), (822, 346), (830, 362), (836, 372)]])})
# NAB front road: traced by H A on the check image (13 Nov), runs round the east (front) side of NAB past the lawn
paths.append({'id': 'rd-nab-front', 'kind': 'road', 'surface': 'asphalt', 'name': 'NAB front road', 'src': 'traced by H A on zoom_G (13 Nov)',
              'pts': rnd([I03(*p) for p in [(843.6, 221.2), (861.8, 238.3), (874.5, 249.3), (889.0, 263.8), (903.5, 272.9), (909.0, 283.8), (907.2, 302.0), (896.3, 320.2), (879.9, 338.4), (867.2, 353.0), (854.5, 367.5), (843.6, 376.6)]])})
from shapely.ops import unary_union as _uu
_net = _uu(osm_roads + [LineString(p['pts']) for p in paths if p['kind'] in ('service', 'road')])
for p in paths:
    if p['id'] in ('rd-fblock', 'rd-north', 'rd-hostel2-lower', 'rd-east', 'rd-nab-north', 'rd-nab-west', 'rd-nab-front'):
        others = _uu(osm_roads + [LineString(q['pts']) for q in paths if q['kind'] in ('service', 'road') and q['id'] != p['id']])
        for end in ((0,) if p['id'] == 'rd-north' else (0, -1)):
            pt = Point(p['pts'][end]); q = nearest_points(others, pt)[0]
            if 0.5 < pt.distance(q) < 30:
                (p['pts'].insert(0, [r1(q.x), r1(q.y)]) if end == 0 else p['pts'].append([r1(q.x), r1(q.y)]))
# NAB lawn (H A marked it with an X, 13 Nov): east of NAB, kept clear of the NAB front road
_lawn = Polygon([I03(*p) for p in [(892.7, 314.8), (945.3, 338.4), (932.6, 369.3), (889.0, 349.3)]]).difference(LineString(next(q['pts'] for q in paths if q['id'] == 'rd-nab-front')).buffer(4))
if _lawn.geom_type != 'Polygon': _lawn = max(_lawn.geoms, key=lambda g: g.area)
for _a in areas:
    if _a['id'] == 'nab-lawn': _a['pts'] = rnd(list(_lawn.exterior.coords)[:-1]); _a['name'] = 'NAB lawn'; _a['src'] = 'marked by H A on zoom_G'
w954 = Polygon(FP[954]['ring']).minimum_rotated_rectangle; w949 = Polygon(FP[949]['ring']).minimum_rotated_rectangle
def long_axis(r):
    c = list(r.exterior.coords)[:4]; e = [(c[k], c[(k + 1) % 4]) for k in range(4)]
    a, b = sorted(e, key=lambda s: -math.dist(*s))[0]; o = sorted(e, key=lambda s: -math.dist(*s))[1]
    return [((a[0] + o[1][0]) / 2, (a[1] + o[1][1]) / 2), ((b[0] + o[0][0]) / 2, (b[1] + o[0][1]) / 2)]
a954, a949 = long_axis(w954), long_axis(w949)
a954.sort(key=lambda p: p[0]); a949.sort(key=lambda p: -p[1])
_p955, _ = nearest_points(Polygon(FP[955]['ring']).exterior, Point(a954[0]))
covered = [(_p955.x, _p955.y), a954[0], a954[1], a949[0], a949[1], FP[492]['c']]
paths.append({'id': 'covered-walk', 'kind': 'covered', 'name': 'Covered walkway', 'src': 'Overture 954 + 949 (walkway roofs) joined by eye', 'pts': rnd(covered)})
lake = Polygon(ring_local(load_osm('water')[0]))
trail = list(lake.buffer(7, resolution=4).simplify(2).exterior.coords)
paths.append({'id': 'lake-trail', 'kind': 'footpath', 'name': 'Lake walking trail', 'src': 'OSM lake outline + 7 m', 'pts': rnd(trail)})

# Entrances + connector footpaths: from each named building to the nearest road
all_roads = osm_roads + [LineString(p['pts']) for p in paths if p['kind'] in ('service', 'road')]
entrances = []
named = [b for b in buildings if b['category'] != 'staff' or b['id'] in ('type2', 'type3')]
for b in named:
    polys = [Polygon(p['poly']) for p in b['parts']]
    best = None
    for poly in polys:
        for rd in all_roads:
            p1, p2 = nearest_points(poly.exterior, rd)
            dd = p1.distance(p2)
            if best is None or dd < best[0]: best = (dd, p1, p2, poly)
    dd, p1, p2, poly = best
    vx, vy = p2.x - p1.x, p2.y - p1.y; n = math.hypot(vx, vy) or 1
    at = (p1.x + vx / n * 1.5, p1.y + vy / n * 1.5)
    entrances.append({'id': f"{b['id']}-main", 'buildingId': b['id'], 'at': [r1(at[0]), r1(at[1])], 'main': True})
    if dd > 2.5:
        paths.append({'id': f"fp-{b['id']}", 'kind': 'footpath', 'pts': rnd([at, (p2.x, p2.y)]), 'src': 'entrance connector (auto)'})
# Admin main door faces the forecourt (drone), override
fc = forecourt_c
for e in entrances:
    if e['buildingId'] == 'admin':
        fx, fy = I03(965, 431); e['at'] = [r1(fx), r1(fy - 1.5)]
paths.append({'id': 'fp-admin-forecourt', 'kind': 'footpath', 'pts': [[201.8, -207.2], [204.0, -227.0], [205.3, -235.7], [193.5, -244.2], [187.4, -258.3], [189.9, -274.0], [182.7, -294.9]], 'src': 'H A drone nadir 20 Nov: portico, flag ring, the path up the lawn, the drive to the bus bay, the main road'})

# ---------------- Landmarks ----------------
landmarks = [
  {'id': 'main-gate', 'name': 'Main Gate', 'kind': 'gate', 'at': [r1(gate[0]), r1(gate[1])], 'src': 'Google pin "Indian Institute Of Management–Shillong"'},
  {'id': 'flag', 'name': 'Flag mast', 'kind': 'flag', 'at': [r1(fc[0]), r1(fc[1])], 'src': 'centre of the forecourt (drone)'},
  {'id': 'kalam-statue', 'name': 'Dr. Kalam Statue', 'kind': 'statue', 'at': [r1(v) for v in I03(1016, 508)], 'src': 'centre of the terraced garden south-east of the Admin Block (confirmed by H A)'},
  {'id': 'water-tank', 'name': 'Water Supply Tank', 'kind': 'tank', 'at': [r1(FP[1009]['c'][0]), r1(FP[1009]['c'][1])], 'src': 'Google pin + Overture 1009'},
  {'id': 'atm', 'name': 'ICICI Bank ATM', 'kind': 'atm', 'at': [r1(v) for v in L(*PINS['ICICI ATM'])], 'src': 'Google pin (on the public road)'},
]

# ---------------- Trees ----------------
trees = [
  {'c': [-580, 0], 'r': 140, 'density': 0.7}, {'c': [-560, 380], 'r': 120, 'density': 0.65}, {'c': [-380, 620], 'r': 140, 'density': 0.7},
  {'c': [-60, 560], 'r': 150, 'density': 0.6}, {'c': [120, 300], 'r': 120, 'density': 0.6}, {'c': [330, 120], 'r': 130, 'density': 0.65},
  {'c': [420, -40], 'r': 90, 'density': 0.55}, {'c': [-130, -230], 'r': 120, 'density': 0.5}, {'c': [80, -330], 'r': 90, 'density': 0.5},
  {'c': [-60, -120], 'r': 50, 'density': 0.55}, {'c': [10, 60], 'r': 35, 'density': 0.5}, {'c': [-330, 160], 'r': 45, 'density': 0.5},
  {'c': [-60, 300], 'r': 50, 'density': 0.5}, {'c': [130, -10], 'r': 45, 'density': 0.5}, {'c': [330, -230], 'r': 70, 'density': 0.55},
]

# ---------------- Boundary (campus only; villages SW/E and NECT/NIELIT excluded) ----------------
boundary = [(250, -345), (335, -330), (420, -232), (500, -225), (575, -242), (602, -140), (540, -138), (545, -190), (500, -222), (417, -198), (319, -180), (268, -100), (240, -10), (265, 40), (235, 110), (60, 145),
            (-40, 175), (-75, 330), (-110, 470), (-180, 540), (-300, 535), (-440, 545), (-560, 330), (-560, 120), (-470, 95), (-380, 30),
            (-330, -20), (-200, -130), (-40, -160), (0, -205), (30, -260), (150, -300)]

# ---------------- Unnamed footprints inside the campus (drawn, never labelled) ----------------
from shapely.geometry import Polygon as _P
_bd = _P(boundary)
_used = set(USED)
_skip = {949, 954, 1009, 891, 892, 522, 523, 524}   # walkway roofs (drawn as the covered walk), the tank, SW village edge
# 20 Nov fake-building audit (H A's drone nadir + satellite show empty ground): the east-cluster and service-east
# footprints, and these stray shapes
_skip |= {513, 514, 515, 519, 520, 563, 564, 467, 507, 508, 509, 521, 556, 558, 559, 959, 963, 964, 983, 984}
for i, f in sorted(FP.items()):
    if i in _used or i in _skip or f['area'] < 15 or not _bd.contains(Point(f['c'])): continue
    if Polygon(foot).buffer(2).contains(Point(f['c'])): continue   # stray shapes on the football ground
    buildings.append({'id': f'bldg-{i}', 'name': 'Campus building', 'category': 'service', 'wall': '#ECE4D2', 'roofColor': C['GREEN'],
                      'labelPriority': 3, 'unnamed': True, 'parts': [fpart(i, 2 if f['area'] > 40 else 1, 'hip')]})

# ---------------- Elevation from the open DEM (AWS terrain tiles, SRTM-based) ----------------
from PIL import Image
TILES = {}
def elev(lat, lon, z=15):
    n = 2 ** z; xt = (lon + 180) / 360 * n; yt = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    tx, ty = int(xt), int(yt); px, py = int((xt - tx) * 256), int((yt - ty) * 256)
    key = (tx, ty)
    if key not in TILES: TILES[key] = Image.open(f'dem/{z}_{tx}_{ty}.png').convert('RGB')
    r, g, b = TILES[key].getpixel((min(px, 255), min(py, 255)))
    return r * 256 + g + b / 256 - 32768
O = (25.6176, 91.9522); KX = 111320 * math.cos(math.radians(O[0])); KY = 110574
def elev_local(x, y): return elev(O[0] + y / KY, O[1] + x / KX)
step, half = 20, 1300
grid = [[round(elev_local(-half + i * step, -half + j * step), 1) for i in range(int(2 * half / step) + 1)] for j in range(int(2 * half / step) + 1)]
lake_level = round(elev_local(*lake.centroid.coords[0]), 1)
for b in buildings:
    p = b['parts'][0]; b['groundElev'] = round(elev_local(p['cx'], p['cy']) - lake_level, 1)
terrain = {'note': 'Elevation in metres above the campus lake (lake = 0). Rows run south to north (j), columns west to east (i). Source: AWS Terrain Tiles (SRTM-based, about 30 m resolution), smooth before use.',
           'origin': {'lat': O[0], 'lon': O[1]}, 'step': step, 'minX': -half, 'minY': -half, 'cols': len(grid[0]), 'rows': len(grid),
           'lakeLevelAMSL': lake_level, 'heights': [[round(h - lake_level, 1) for h in row] for row in grid]}

# 14 Nov: generic "Campus building"-type names cluttered the 3D labels. Draw them, but no label / search / hit-test.
for b in buildings:
    if b['id'] in ('east-cluster', 'block-501', 'block-503', 'east-residence', 'court-kiosk', 'block-962', 'block-488', 'service-east', 'service-plant', 'cafe-hut-red', 'cafe-shed-blue', 'cafe-store'):
        b['unnamed'] = True; b['labelPriority'] = 3
    if b['id'] == 'west-cluster': b['labelPriority'] = 3   # name still to confirm
layout = {'version': 2, 'note': 'Remapped 13 Nov 2026 from Overture footprints, OSM roads/lake/courts, Google pins (names only) and drone photos. See reference/layout/LAYOUT_INVENTORY.md. Parts carry "poly" (true footprint) and "src".',
          'origin': {'lat': O[0], 'lon': O[1]}, 'boundary': rnd(boundary), 'buildings': buildings, 'paths': paths, 'areas': areas,
          'trees': trees, 'entrances': entrances, 'landmarks': landmarks,
          'attribution': '© OpenStreetMap contributors · Overture Maps Foundation · Google Open Buildings · Microsoft'}
import os; os.makedirs('layout/out', exist_ok=True)
json.dump(layout, open('layout/out/campus-layout.json', 'w'), indent=1)
json.dump(terrain, open('layout/out/terrain.json', 'w'))
print('buildings', len(buildings), 'parts', sum(len(b['parts']) for b in buildings), 'paths', len(paths), 'areas', len(areas), 'entrances', len(entrances))
print('type2', q2, 'type3', q3, 'lake level', lake_level)
for b in buildings: print(f"{b['id']:16s} elev {b['groundElev']:6.1f}  parts {len(b['parts'])}")
