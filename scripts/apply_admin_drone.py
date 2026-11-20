# Apply reference/layout/admin_drone.json (scripts/admin-from-drone.mjs: the Admin Block traced on H A's drone nadir,
# 20 Nov) to a layout: the five parts with roles for landmarks/admin.ts, and the main door at the portico corner.
# Run on the live file; also imported by the layout generator. Keeps the file's own formatting.
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(HERE, '..', 'reference', 'layout', 'admin_drone.json')
SRC = "H A drone nadir 20 Nov, roof outline at eave height, walls 1.3 m in, relief-corrected (scripts/admin-from-drone.mjs)"
ROLES = {'endW': ('endblock', 4), 'wingW': ('wing', 3), 'hall': ('hall', 4), 'wingE': ('wing', 3), 'endE': ('endblock', 4)}


def _rect(poly):
    (x0, y0), (x1, y1), (x2, y2) = poly[0], poly[1], poly[2]
    return {'cx': round(sum(p[0] for p in poly) / len(poly), 1), 'cy': round(sum(p[1] for p in poly) / len(poly), 1),
            'w': round(math.hypot(x1 - x0, y1 - y0), 1), 'd': round(math.hypot(x2 - x1, y2 - y1), 1), 'angle': round(math.degrees(math.atan2(y1 - y0, x1 - x0)), 1)}


def apply(layout, plan=None):
    plan = plan or json.load(open(PLAN, encoding='utf-8'))
    adm = next(b for b in layout['buildings'] if b['id'] == 'admin')
    parts = []
    for key, (role, floors) in ROLES.items():
        poly = [[float(x), float(y)] for x, y in plan['parts'][key]]
        p = _rect(poly); p.update({'floors': floors, 'roof': 'hip', 'poly': poly, 'src': SRC, 'role': role, 'key': key})
        if key == 'hall': p['glass'] = 'atrium'
        parts.append(p)
    adm['parts'] = parts
    adm['confirm'] = 'Plan traced on H A\'s drone footage (20 Nov): an L round the flag forecourt, the big square hall at the corner with the portico facing the flag.'
    for e in layout['entrances']:
        if e['id'] == 'admin-main': e['at'] = [float(v) for v in plan['entrance']]
    return layout


if __name__ == '__main__':
    f = os.path.join(HERE, '..', 'public', 'data', 'campus-layout.json')
    d = json.load(open(f, encoding='utf-8'))
    apply(d)
    open(f, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=1, ensure_ascii=True))
    print('Admin: 5 parts and the main door updated')
