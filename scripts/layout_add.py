# Add real structures the footage shows but the layout lacks, or move a part onto its real outline (H A, 20 Nov audit).
# Parts are rectangles read off H A's straight-down drone still (scripts/lib/dronefit.mjs), in local metres.
# Keeps the file's own formatting (json.dumps indent=1, ASCII, no trailing newline).
import json, math
f = 'public/data/campus-layout.json'
d = json.load(open(f, encoding='utf-8'))
SRC = "H A drone nadir 20 Nov (dji_fly_20260907 @0:24.8), fake/missing audit"

def part(poly, floors, roof, **extra):
    (x0, y0), (x1, y1), (x2, y2) = poly[0], poly[1], poly[2]
    w, dd = math.hypot(x1 - x0, y1 - y0), math.hypot(x2 - x1, y2 - y1)
    cx, cy = sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly)
    p = {'cx': round(cx, 1), 'cy': round(cy, 1), 'w': round(w, 1), 'd': round(dd, 1), 'angle': round(math.degrees(math.atan2(y1 - y0, x1 - x0)), 1),
         'floors': floors, 'roof': roof, 'poly': [[round(x, 1), round(y, 1)] for x, y in poly], 'src': SRC}
    p.update(extra); return p

def add(b):
    d['buildings'] = [x for x in d['buildings'] if x['id'] != b['id']] + [b]

base = {'category': 'service', 'labelPriority': 3, 'unnamed': True}
add({'id': 'service-plant', 'name': 'Service plant house', 'wall': '#E9E6DE', 'roofColor': '#8A9096', **base,
     'parts': [part([[108.0, -140.5], [100.9, -144.8], [96.2, -138.5], [103.3, -134.2]], 1, 'flat')],
     'confirm': 'Walled plant between Admin and NAB (open tanks with equipment; water or sewage plant, to confirm).'})
add({'id': 'cafe-hut-red', 'name': 'Hut by Cafe Cloud', 'wall': '#EDE6D8', 'roofColor': '#B8504A', **base,
     'parts': [part([[83.2, -231.5], [79.3, -235.5], [75.4, -231.9], [79.5, -227.8]], 1, 'hip')]})
add({'id': 'cafe-shed-blue', 'name': 'Shed by Cafe Cloud', 'wall': '#D9D6CE', 'roofColor': '#3D6FB0', **base,
     'parts': [part([[47.3, -228.2], [42.8, -227.9], [43.0, -225.5], [47.1, -225.5]], 1, 'flat')]})
add({'id': 'cafe-store', 'name': 'Store north of Cafe Cloud', 'wall': '#E4E1D8', 'roofColor': '#8E969C', **base,
     'parts': [part([[52.4, -180.5], [47.7, -188.1], [41.5, -185.9], [46.4, -177.8]], 1, 'gable')]})
# Amul Cafe is the small teal-roofed kiosk beside Cafe Cloud, about 4 m square (the data had a 10 × 7 m guess)
am = next(b for b in d['buildings'] if b['id'] == 'amul-cafe')
am['parts'] = [part([[60.5, -236.3], [56.5, -237.4], [55.1, -233.1], [59.0, -231.8]], 1, 'hip')]
am['roofColor'] = '#3F9A93'
am['confirm'] = 'The teal-roofed kiosk by Cafe Cloud (H A drone, 20 Nov).'
for b in d['buildings']:
    if b['id'] in ('service-plant', 'cafe-hut-red', 'cafe-shed-blue', 'cafe-store') and 'groundElev' not in b:
        pass  # set by the engine from the terrain (Engine3D fills missing groundElev)
open(f, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=1, ensure_ascii=True))
print('buildings', len(d['buildings']))
