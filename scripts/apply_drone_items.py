# Apply reference/layout/drone_items.json (scripts/drone-items.mjs: items traced on H A's drone nadir, 20 Nov, relief-aware)
# to a layout: area outlines, path points, and small buildings' outlines and ground levels. Run on the live file, and
# imported by the layout generator (build_v2.py) so a rebuild keeps them. Keeps the file's own formatting.
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(HERE, '..', 'reference', 'layout', 'drone_items.json')
SRC = "H A drone nadir 20 Nov, relief-aware (scripts/drone-items.mjs)"


def _part_rect(poly):
    (x0, y0), (x1, y1), (x2, y2) = poly[0], poly[1], poly[2]
    return {'cx': round(sum(p[0] for p in poly) / len(poly), 1), 'cy': round(sum(p[1] for p in poly) / len(poly), 1),
            'w': round(math.hypot(x1 - x0, y1 - y0), 1), 'd': round(math.hypot(x2 - x1, y2 - y1), 1), 'angle': round(math.degrees(math.atan2(y1 - y0, x1 - x0)), 1)}


def apply(layout, plan=None):
    plan = plan or json.load(open(PLAN, encoding='utf-8'))
    for a in layout['areas']:
        if a['id'] in plan['areas']: a['pts'] = [[float(x), float(y)] for x, y in plan['areas'][a['id']]]; a['src'] = SRC
    for p in layout['paths']:
        if p['id'] in plan['paths']: p['pts'] = [[float(x), float(y)] for x, y in plan['paths'][p['id']]]; p['src'] = SRC
    for b in layout['buildings']:
        it = plan['buildings'].get(b['id'])
        if not it: continue
        part = b['parts'][0]; poly = [[float(x), float(y)] for x, y in it['poly']]
        part.update(_part_rect(poly)); part['poly'] = poly; part['src'] = SRC
        b['groundElev'] = it['ground']
    # the Amul kiosk's door and path follow the kiosk (its counter faces the road, east)
    for e in layout['entrances']:
        if e['id'] == 'amul-cafe-main': e['at'] = [60.2, -235.4]
    for p in layout['paths']:
        if p['id'] == 'fp-amul-cafe': p['pts'] = [[60.2, -235.4], [95.3, -228.3]]; p['src'] = 'the Amul kiosk to the main road (H A drone nadir)'
    return layout


if __name__ == '__main__':
    f = os.path.join(HERE, '..', 'public', 'data', 'campus-layout.json')
    d = json.load(open(f, encoding='utf-8'))
    apply(d)
    open(f, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=1, ensure_ascii=True))
    print('applied drone items')
