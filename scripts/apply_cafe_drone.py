# Apply reference/layout/cafe_drone.json (scripts/cafe-from-drone.mjs: Cafe Cloud measured on H A's drone nadir, 21 Nov) to
# a layout: the cafe's footprint becomes the verandah octagon round the hall (the model insets the hall from it), and the
# main door moves to the entrance block on the road side. Run on the live file; also imported by the layout generator.
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
PLAN = os.path.join(HERE, '..', 'reference', 'layout', 'cafe_drone.json')
SRC = "H A drone nadir 21 Nov: the green roof octagon fitted by colour (rms 1.9 px), the verandah ring read on the photo (scripts/cafe-from-drone.mjs)"


def apply(layout, plan=None):
    plan = plan or json.load(open(PLAN, encoding='utf-8'))
    cafe = next(b for b in layout['buildings'] if b['id'] == 'cafe-cloud')
    cx, cy = plan['ringCentre']; A = plan['verandahApothem']; n0 = math.radians(plan['flatNormalDeg'])
    R = A / math.cos(math.pi / 8)
    poly = [[round(cx + math.cos(n0 + math.pi / 8 + k * math.pi / 4) * R, 2), round(cy + math.sin(n0 + math.pi / 8 + k * math.pi / 4) * R, 2)] for k in range(8)]
    ent = math.radians(plan['entranceNormalDeg'])
    cafe['parts'] = [{'cx': cx, 'cy': cy, 'w': round(2 * A, 1), 'd': round(2 * A, 1), 'angle': round(math.degrees(ent) - 90, 1), 'floors': 1, 'roof': 'octagon',
                      'glass': 'atrium', 'poly': poly, 'src': SRC, 'role': 'main', 'key': 'cafe'}]
    cafe['wall'] = '#EFE3CF'
    cafe['confirm'] = 'Octagon and verandah measured on H A\'s drone footage (21 Nov); the entrance with the sign faces the main road.'
    door = [round(cx + math.cos(ent) * (A + 2.2), 1), round(cy + math.sin(ent) * (A + 2.2), 1)]
    for e in layout['entrances']:
        if e['id'] == 'cafe-cloud-main': e['at'] = door
    # the entrance path: from the foot of the steps straight out to the main road (it faces the road)
    end = [round(door[0] + math.cos(ent) * 17.3, 1), round(door[1] + math.sin(ent) * 17.3, 1)]
    for p in layout['paths']:
        if p['id'] == 'fp-cafe-cloud': p['pts'] = [door, end]; p['src'] = 'the entrance steps to the main road (H A drone nadir 21 Nov)'
    return layout


if __name__ == '__main__':
    f = os.path.join(HERE, '..', 'public', 'data', 'campus-layout.json')
    d = json.load(open(f, encoding='utf-8'))
    apply(d)
    open(f, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=1, ensure_ascii=True))
    print('Cafe Cloud: verandah octagon and the main door updated')
