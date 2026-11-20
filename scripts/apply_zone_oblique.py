# Apply reference/layout/zone_oblique.json (scripts/zone-from-oblique.mjs: the hostel and sports zone measured on H A's
# June drone frame) to a layout:
#   - the gym moves onto the real hall beside the tennis court (H A, 21 Nov), with its annex, door and a footpath to the
#     Scholar's Path; the building at the old position (a white building with a columned portico by the loop road) stays,
#     unnamed, its use to confirm;
#   - the Scholar's Path between the lake side and D Block follows its real zig-zag.
# Run on the live file; also imported by the layout generator. Keeps the file's own formatting.
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(HERE, '..', 'reference', 'layout', 'zone_oblique.json')
SRC = "H A June drone frame (dji 0623 191506 @0:42.8), camera solved from the OSM courts and roads (scripts/zone-from-oblique.mjs)"


def _rect(poly):
    (x0, y0), (x1, y1), (x2, y2) = poly[0], poly[1], poly[2]
    return {'cx': round(sum(p[0] for p in poly) / len(poly), 1), 'cy': round(sum(p[1] for p in poly) / len(poly), 1),
            'w': round(math.hypot(x1 - x0, y1 - y0), 1), 'd': round(math.hypot(x2 - x1, y2 - y1), 1), 'angle': round(math.degrees(math.atan2(y1 - y0, x1 - x0)), 1)}


def _near(pts, q):
    best = None
    for i in range(len(pts) - 1):
        (ax, ay), (bx, by) = pts[i], pts[i + 1]; dx, dy = bx - ax, by - ay; l2 = dx * dx + dy * dy or 1
        t = max(0, min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / l2)); p = (ax + dx * t, ay + dy * t); d = math.hypot(p[0] - q[0], p[1] - q[1])
        if best is None or d < best[0]: best = (d, p)
    return [round(best[1][0], 2), round(best[1][1], 2)]


def apply(layout, plan=None):
    plan = plan or json.load(open(PLAN, encoding='utf-8'))
    blds = {b['id']: b for b in layout['buildings']}
    # the old 'gym' footprint is a different, real building: keep it unnamed
    old = blds.get('gym')
    if old and not any(b['id'] == 'bldg-portico-loop' for b in layout['buildings']):
        layout['buildings'].append({**{k: v for k, v in old.items() if k not in ('id', 'name', 'short', 'confirm', 'category', 'labelPriority')},
                                    'id': 'bldg-portico-loop', 'name': 'Campus building', 'category': 'service', 'labelPriority': 3, 'unnamed': True,
                                    'confirm': 'White building with a columned portico by the loop road (it was mapped as the gym); its use to confirm.'})
    g = plan['gym']
    hall = [[float(x), float(y)] for x, y in g['hall']]; annex = [[float(x), float(y)] for x, y in g['annex']]
    gym = blds['gym']
    gym['parts'] = [{**_rect(hall), 'floors': 1, 'roof': 'hip', 'poly': hall, 'src': SRC, 'role': 'main', 'key': 'hall'},
                    {**_rect(annex), 'floors': 1, 'roof': 'gable', 'poly': annex, 'src': SRC, 'role': 'annex', 'key': 'annex'}]
    gym['groundElev'] = g['ground']; gym['wall'] = '#F2F0EA'; gym['roofColor'] = '#3E9C8A'
    gym['confirm'] = 'The white hall with the green hip roof beside the tennis court (H A, 21 Nov); door on the walkway side to confirm.'
    # the Scholar's Path: the D Block end stays, then the traced corners, then the south end stays
    walk = next(p for p in layout['paths'] if p['id'] == 'covered-walk')
    pts = walk['pts']; walk['pts'] = [pts[0]] + [[float(x), float(y)] for x, y in plan['walk']] + [pts[-1]]
    walk['src'] = 'D Block end and south end: Overture walkway roofs; between them the real zig-zag from ' + SRC
    door = [float(v) for v in g['door']]
    for e in layout['entrances']:
        if e['id'] == 'gym-main': e['at'] = door
    for p in layout['paths']:
        if p['id'] == 'fp-gym': p['pts'] = [door, _near(walk['pts'], door)]; p['src'] = 'the gym door to the Scholar\'s Path (H A drone, 21 Nov)'
    # the football ground: the grass pitch, 51 x 94 m (measured as lengths on H A's hi-res satellite screenshot), placed and
    # turned by its fence's two corners on the June frame (the fence runs about 6 m outside the grass, round a dirt track)
    c, u, v = (-116.0, 211.2), (0.5888, -0.8086), (0.8086, 0.5888)
    pitch = [[round(c[0] + a * 47 * u[0] + b * 25.5 * v[0], 1), round(c[1] + a * 47 * u[1] + b * 25.5 * v[1], 1)] for a, b in ((-1, -1), (-1, 1), (1, 1), (1, -1))]
    for a in layout['areas']:
        if a['id'] == 'football': a['pts'] = pitch; a['src'] = 'grass pitch 51 x 94 m: H A satellite (lengths) and June drone frame (fence corners)'
        # the red surround belongs to the two basketball courts only (the tennis court has its own blue one)
        if a['id'] == 'courts-surround': a['pts'] = [[-229.2, 157.0], [-190.7, 157.0], [-190.7, 123.0], [-229.2, 123.0]]; a['src'] = 'the basketball pair + 2.5 m (OSM courts; June drone frame)'
    return layout


if __name__ == '__main__':
    f = os.path.join(HERE, '..', 'public', 'data', 'campus-layout.json')
    d = json.load(open(f, encoding='utf-8'))
    apply(d)
    open(f, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=1, ensure_ascii=True))
    print('gym moved onto the real hall; the Scholar\'s Path follows its zig-zag')
