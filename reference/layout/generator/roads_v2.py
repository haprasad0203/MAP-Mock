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
