"""Merge every road source into public/data/osm.json (roads) and report what each source adds."""
import json, sys, math; sys.path.insert(0,'layout')
from common import L, load_osm
from shapely.geometry import LineString, Point
from shapely.ops import unary_union
KIND={'primary':'road','secondary':'road','tertiary':'road','unclassified':'road','residential':'road','service':'service','track':'track',
      'footway':'footpath','path':'footpath','steps':'footpath','pedestrian':'footpath','unknown':'service'}
old=json.load(open('/mnt/user-data/uploads/Map Mock/public/data/osm.json'))
roads=[]; geoms=[]
def add(id,kind,pts,src,name=None):
    pts=[[round(x,1),round(y,1)] for x,y in pts]
    if len(pts)<2: return
    r={'id':id,'kind':kind,'pts':pts,'src':src}
    if name: r['name']=name
    roads.append(r); geoms.append(LineString(pts))
for f in load_osm('roads_paths'):
    pr=f['properties']; hw=pr.get('highway','service')
    add('osm-'+pr['osm_id'].split('/')[-1], KIND.get(hw,'service'), [L(y,x) for x,y in f['geometry']['coordinates']], 'OSM 2026-11-13', pr.get('name'))
n_osm=len(roads)
osmU=unary_union(geoms)
# Overture segments: keep the parts that OSM doesn't already have (>6 m from any OSM line)
added=0
for k,f in enumerate(json.load(open('overture/segments.geojson'))['features']):
    g=f['geometry']; cs=g['coordinates'] if g['type']=='LineString' else [c for part in g['coordinates'] for c in part]
    line=LineString([L(y,x) for x,y in cs])
    if line.length<8: continue
    pts=[line.interpolate(t,normalized=True) for t in [i/10 for i in range(11)]]
    far=sum(1 for p in pts if osmU.distance(p)>6)
    if far>=5:
        cls=f['properties'].get('class') or 'service'
        add(f'ovt-{k}', KIND.get(cls,'service'), list(line.coords), 'Overture '+ '/'.join(s['dataset'] for s in f['properties'].get('sources') or []))
        added+=1
# old osm.json roads not covered by the fresh export (keep, just in case)
kept_old=0
U=unary_union(geoms)
for r in old['roads']:
    line=LineString(r['pts'])
    pts=[line.interpolate(t,normalized=True) for t in [i/10 for i in range(11)]]
    if sum(1 for p in pts if U.distance(p)>6)>=5: roads.append({**r,'src':'OSM (older export)'}); kept_old+=1
out={'attribution':'© OpenStreetMap contributors · Overture Maps Foundation','origin':old['origin'],'roads':roads,'areas':old['areas']}
json.dump(out,open('layout/out/osm.json','w'))
print('OSM',n_osm,'Overture extra',added,'old extra',kept_old,'total',len(roads))

# ---- Corrections (13 Nov) ----
# H A: an OSM service way (1050247323) ran through the middle of the football ground. The satellite shows no road there,
# only the perimeter track on the east side, so the part inside the field is moved to 4 m outside the field's east edge.
from shapely.geometry import Polygon
lay = json.load(open('layout/out/campus-layout.json'))
field = Polygon(next(a['pts'] for a in lay['areas'] if a['id'] == 'football'))
cx, cy = field.centroid.x, field.centroid.y
cs = list(field.exterior.coords)[:-1]
edges = [(cs[i], cs[(i + 1) % 4]) for i in range(4)]
east = max(edges, key=lambda e: (e[0][0] + e[1][0]) / 2 - cx + 0 * (math.dist(*e)))   # edge whose midpoint is furthest east
(ax, ay), (bx, by) = east; ln = math.dist(east[0], east[1]); nx, ny = (by - ay) / ln, -(bx - ax) / ln
if (ax + bx) / 2 + nx - cx < (ax + bx) / 2 - cx: nx, ny = -nx, -ny
off = LineString([(ax + nx * 4, ay + ny * 4), (bx + nx * 4, by + ny * 4)])
for r in out['roads']:
    if r['id'] == 'osm-1050247323':
        newpts = []
        for x, y in r['pts']:
            if field.buffer(3).contains(Point(x, y)):
                q = off.interpolate(off.project(Point(x, y))); newpts.append([round(q.x, 1), round(q.y, 1)])
            else: newpts.append([x, y])
        r['pts'] = newpts; r['src'] += ' (moved off the football ground by eye, 13 Nov)'
        print('moved', r['id'], round(LineString(newpts).intersection(field).length, 1), 'm still inside')
json.dump(out, open('layout/out/osm.json', 'w'))
# The campus's main asphalt roads are tagged highway=service in OSM; mark them as proper roads (13 Nov, H A: NAB road is asphalt
# branching off the main road, so the main road itself must be a road too). 1050247311 = gate → Kalam junction, 1050247312 = the campus loop.
for r in out['roads']:
    if r['id'] in ('osm-1050247311', 'osm-1050247312'):
        r['kind'] = 'road'; r['surface'] = 'asphalt'; r['name'] = r.get('name') or ('Main campus road' if r['id'].endswith('11') else 'Campus loop road')
json.dump(out, open('layout/out/osm.json', 'w'))
