# Move the NAB footprint onto the real building (H A's drone nadir, 20 Nov): the real end towers are 94 m apart with the
# central atrium pyramid exactly between them (99.1, -66.4); the axis is about 47.5 deg (data 53.2), and the building is
# about 7% longer than the data parts. A similarity about the data's atrium point, applied to every NAB part and entrance.
# Keeps the layout file's own formatting. Usage: python scripts/nab_fit.py
import json, math
f = 'public/data/campus-layout.json'
d = json.load(open(f, encoding='utf-8'))
nab = next(b for b in d['buildings'] if b['id'] == 'nab')
a = math.radians(nab['parts'][1]['angle']); U = (math.cos(a), math.sin(a)); V = (-U[1], U[0])
lawn = next(x for x in d['areas'] if x['id'] == 'nab-lawn')['pts']; lc = (sum(p[0] for p in lawn) / len(lawn), sum(p[1] for p in lawn) / len(lawn))
allp = [q for p in nab['parts'] for q in p['poly']]; c = (sum(q[0] for q in allp) / len(allp), sum(q[1] for q in allp) / len(allp))
if (lc[0] - c[0]) * V[0] + (lc[1] - c[1]) * V[1] < 0: V = (-V[0], -V[1])
al = lambda q: q[0] * U[0] + q[1] * U[1]; ac = lambda q: q[0] * V[0] + q[1] * V[1]
A0, A1 = min(map(al, allp)), max(map(al, allp)); Dw = max(map(ac, nab['parts'][1]['poly']))
at = A0 + 0.494 * (A1 - A0)                                           # the atrium's middle on the data front (nab.ts)
Cd = (U[0] * at + V[0] * Dw, U[1] * at + V[1] * Dw)
REAL_AXIS = 47.5; th = math.radians(REAL_AXIS) - a                    # turn
Ur = (math.cos(math.radians(REAL_AXIS)), math.sin(math.radians(REAL_AXIS))); Vr = (-Ur[1], Ur[0])
if Vr[0] * V[0] + Vr[1] * V[1] < 0: Vr = (-Vr[0], -Vr[1])
Cr = (99.1 + Vr[0] * 2.6, -66.4 + Vr[1] * 2.6)                       # the real front, 2.6 m ahead of the pyramid's centre
SC = 94.0 / (0.917 * (A1 - A0))                                       # tower span: real 94 m, data 0.917 of the length
def T(q):
    x, y = q[0] - Cd[0], q[1] - Cd[1]
    s, t = (x * U[0] + y * U[1]) * SC, x * V[0] + y * V[1]               # stretch along the axis only
    return [round(Cr[0] + s * Ur[0] + t * Vr[0], 1), round(Cr[1] + s * Ur[1] + t * Vr[1], 1)]
for p in nab['parts']:
    p['poly'] = [T(q) for q in p['poly']]
    cx, cy = T([p['cx'], p['cy']]); p['cx'], p['cy'] = cx, cy
    p['angle'] = round(p['angle'] + math.degrees(th), 1)
    if p.get('w') and abs(((p['angle'] - REAL_AXIS + 90) % 180) - 90) < 20: p['w'] = round(p['w'] * SC, 1)
    p['src'] = (p.get('src', '') + '; moved onto the real building (H A drone nadir 20 Nov, scripts/nab_fit.py)').lstrip('; ')
for e in d['entrances']:
    if e['buildingId'] == 'nab': e['at'] = T(e['at'])
open(f, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=1, ensure_ascii=True))
print('scale %.3f turn %.1f deg; atrium %s -> %s' % (SC, math.degrees(th), [round(v, 1) for v in Cd], [round(v, 1) for v in Cr]))
