# Apply reference/layout/nab_drone.json (written by scripts/nab-from-drone.mjs from H A's drone nadir, 20 Nov) to a layout:
# NAB's parts (each with a role for the 3D builder), its entrances, and the three roads round it. Used both on the live
# file (run this script) and by the layout generator (build_v2.py imports apply()), so a rebuild keeps the change.
# Keeps public/data/campus-layout.json's own formatting (json.dumps indent=1, ASCII, no trailing newline).
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(HERE, '..', 'reference', 'layout', 'nab_drone.json')
SRC = "H A drone nadir 20 Nov (dji_fly_20260907 @0:24.8), traced in the building frame, relief-corrected (scripts/nab-from-drone.mjs)"
# role: floors and roof as the 3D builder reads them (landmarks/nab.ts draws each role its own way)
ROLES = {
    'main': ('main', 4, 'flat'), 'frontW': ('stone', 4, 'flat'), 'frontE': ('stone', 4, 'flat'), 'whiteW': ('white', 4, 'flat'),
    'whiteE': ('white', 4, 'flat'), 'atrium': ('atrium', 4, 'flat'), 'towerW': ('tower', 5, 'flat'), 'towerE': ('tower', 5, 'flat'),
    'pavC': ('pavilion', 1, 'hip'), 'pavW': ('pavilion', 1, 'hip'), 'pavE': ('pavilion', 1, 'hip'), 'annex': ('annex', 1, 'flat'),
}


def _rect(poly, axis):
    """Centre, size along `axis` (w) and across (d) of a polygon, for the 2D map's rectangles."""
    a = math.radians(axis); ux, uy = math.cos(a), math.sin(a)
    al = [x * ux + y * uy for x, y in poly]; ac = [-x * uy + y * ux for x, y in poly]
    ca, cc = (min(al) + max(al)) / 2, (min(ac) + max(ac)) / 2
    return round(ca * ux - cc * uy, 1), round(ca * uy + cc * ux, 1), round(max(al) - min(al), 1), round(max(ac) - min(ac), 1)


def _near(pts, q):
    best = None
    for i in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]; dx, dy = bx - ax, by - ay; l2 = dx * dx + dy * dy or 1
        t = max(0, min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / l2)); p = (ax + dx * t, ay + dy * t); d = math.hypot(p[0] - q[0], p[1] - q[1])
        if best is None or d < best[0]: best = (d, p)
    return [round(best[1][0], 1), round(best[1][1], 1)]


def apply(layout, plan=None):
    plan = plan or json.load(open(PLAN, encoding='utf-8'))
    axis = plan['axisDeg'] + 180 if plan['axisDeg'] < 0 else plan['axisDeg']           # along the front, SW → NE
    nab = next(b for b in layout['buildings'] if b['id'] == 'nab')
    parts = []
    for key, (role, floors, roof) in ROLES.items():
        poly = [[float(x), float(y)] for x, y in plan['parts'][key]]
        ang = axis + 45 if role == 'pavilion' else axis
        cx, cy, w, d = _rect(poly, ang)
        parts.append({'cx': cx, 'cy': cy, 'w': w, 'd': d, 'angle': round(ang, 1), 'floors': floors, 'roof': roof, 'poly': poly, 'src': SRC, 'role': role, 'key': key})
    nab['parts'] = parts
    nab['confirm'] = 'Footprint, roof and roads traced on H A\'s drone footage (20 Nov). Main door: the glass atrium on the lawn side; side doors under the two white blocks.'
    # entrances: the atrium (main) and the two side doors
    layout['entrances'] = [e for e in layout['entrances'] if e.get('buildingId') != 'nab']
    E = plan['entrances']
    layout['entrances'] += [{'id': 'nab-main', 'buildingId': 'nab', 'at': E['main'], 'main': True},
                            {'id': 'nab-side-w', 'buildingId': 'nab', 'at': E['sideW']}, {'id': 'nab-side-e', 'buildingId': 'nab', 'at': E['sideE']}]
    # roads: photo centrelines; the ends that join other roads keep their old vertex so the network stays connected
    paths = {p['id']: p for p in layout['paths']}
    front, west, north = paths['rd-nab-front'], paths['rd-nab-west'], paths['rd-nab-north']
    keep_front_end, keep_west_end = front['pts'][-1], west['pts'][-1]
    front['pts'] = [[float(x), float(y)] for x, y in plan['roads']['rd-nab-front']] + [keep_front_end]
    west['pts'] = [[float(x), float(y)] for x, y in plan['roads']['rd-nab-west']] + [keep_west_end]
    junction = west['pts'][2]                                                              # the back road at u 330: rd-nab-north joins here
    north['pts'] = north['pts'][:-1] + [junction]
    for p in (front, west):
        p['src'] = 'H A drone nadir 20 Nov, centreline traced on the photo (scripts/nab-from-drone.mjs)'
    north['src'] = north.get('src', '') + '; end moved onto the back road (H A drone nadir 20 Nov)'
    # NAB's own footpaths: from each door straight across the forecourt to the front road
    for pid, door, label in (('fp-nab', 'main', 'main door (atrium)'), ('fp-nab-side-w', 'sideW', 'west side door'), ('fp-nab-side-e', 'sideE', 'east side door')):
        pts = [E[door], _near(front['pts'], E[door])]
        if pid in paths: paths[pid]['pts'] = pts; paths[pid]['src'] = label + ' to the front road, H A drone nadir 20 Nov'
        else: layout['paths'].append({'id': pid, 'kind': 'footpath', 'pts': pts, 'src': label + ' to the front road, H A drone nadir 20 Nov'})
    return layout


if __name__ == '__main__':
    f = os.path.join(HERE, '..', 'public', 'data', 'campus-layout.json')
    d = json.load(open(f, encoding='utf-8'))
    apply(d)
    open(f, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=1, ensure_ascii=True))
    print('NAB:', len(next(b for b in d['buildings'] if b['id'] == 'nab')['parts']), 'parts; roads and entrances updated')
