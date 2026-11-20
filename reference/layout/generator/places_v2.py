import json, sys; sys.path.insert(0,'layout')
from common import L, load_osm
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import unary_union
lay=json.load(open('layout/out/campus-layout.json'))
pl=json.load(open('/mnt/user-data/uploads/Map Mock/public/data/places.json'))
area={a['id']:a for a in lay['areas']}
cen=lambda pts:[round(Polygon(pts).centroid.x),round(Polygon(pts).centroid.y)]
AT={'football':cen(area['football']['pts']),'basketball':[-210,140],'volleyball':[-217,171],'tennis':[-180,137],  # 21 Nov: the sand court north of the basketball courts; the blue court with a net (H A drone)
    
    'covered-walkway':[-150,170],'lake':[-79,-55]}
for p in pl['places']:
    if p['id'] in AT: p['at']=AT[p['id']]
    if p['id']=='tennis': p['note']='The blue court with a net east of the basketball courts (H A drone, June; OSM tags it volleyball).'
    if p['id']=='covered-walkway':
        p['name']="Scholar's Path"; p['aliases']=list(dict.fromkeys(["Scholar's Path","Scholars Path",'Covered walkway','Walkway','Corridor']))
        p['confirm']="H A, 16 Nov: the Scholar's Path is the teal-roofed covered walkway (canopy). It runs beside the main road on the right as you enter by the main gate and up through the middle of campus (zig-zag past the courts to the hostels). Only the middle section is in the layout; the roadside run is to be added in hardscape.json"
    if p['id']=='parking': p['confirm']='Paved lot between NAB and the Admin Block (satellite); confirm it is the visitor car park'
    if p['id']=='main-gate': p['confirm']='Placed at the Google listing pin on the south road; survey the gate posts'
    if p['id']=='hostel-3': p['aliases']=sorted(set(p['aliases']+['F Block New Hostel']))
# 13 Nov (H A): Auditorium and Library are inside the Admin Block; the kiosk next to Cafe Cloud is Amul Cafe; the statue in the terraced garden is the Kalam statue
for p in pl['places']:
    if p['id'] in ('auditorium', 'library'):
        p['buildingId'] = 'admin'; p['confirm'] = 'Inside the Admin Block (confirmed); which wing and floor to confirm'
    if p['id'] == 'admin':
        p['inside'] = list(dict.fromkeys(p.get('inside', []) + ['IIM Shillong Auditorium', 'Knowledge Centre (Library)']))
    if p['id'] == 'kalam-statue': p.pop('confirm', None)
    if p['id'] == 'tin-cafe':
        p.pop('buildingId', None); p['at'] = [round(v) for v in L(25.6157059, 91.9528862)]
        p['confirm'] = 'Not the kiosk next to Cafe Cloud (that is Amul Cafe). Where is Worth The Taste (Tin Café)?'
for r in pl.get('rooms', []):
    if r.get('buildingId') in ('auditorium', 'library'): r['buildingId'] = 'admin'
ids={p['id'] for p in pl['places']}
pl['places']=[p for p in pl['places'] if p['id']!='parking']   # H A, 13 Nov: the Admin Block parking was wrong; removed
if 'amul-cafe' not in ids:
    pl['places'].insert([p['id'] for p in pl['places']].index('tin-cafe'),
      {'id':'amul-cafe','name':'Amul Cafe','category':'food','buildingId':'amul-cafe','aliases':['Amul','Ice cream','Milkshake'],'confirm':'Opening hours'})
# 13 Nov (H A): hostel names. D Block = Hostel 1, F Block = Hostel 2, north ridge = Hostel 3, block between D and F = Hostel 4.
H={'hostel-1':{'name':'Hostel 1 · D Block','aliases':['D Block','D block','Hostel 1','H1']},
   'hostel-2':{'name':'Hostel 2 · F Block','aliases':['F Block','F Block New Hostel','Hostel 2','H2']},
   'hostel-3':{'name':'Hostel 3','aliases':['Hostel 3','H3','North ridge hostel']},
   'hostel-4':{'name':'Hostel 4','aliases':['Hostel 4','H4','New block']}}
pl['places']=[p for p in pl['places'] if p['id']!='hostel-mid']
for p in pl['places']:
    if p['id'] in H:
        p.update(H[p['id']]); p['buildingId']=p['id']; p.pop('inside',None); p.pop('confirm',None)
        if p['id']=='hostel-4': p['confirm']='Outline placed by eye; survey the corners'
    if p['id']=='commercial': p['aliases']=list(dict.fromkeys(p.get('aliases',[])+['Mithaas','Commercial complex']))
    if p['id']=='medical' and p.get('buildingId')=='hostel-2': p['buildingId']='hostel-1'; p['confirm']='Placeholder in Hostel 1 (D Block). Real location and phone to confirm'
pl['note']=(pl.get('note','')+' | v2 (13 Nov 2026): coordinates match campus-layout.json v2.').strip(' |')
# ---- checks ----
B={b['id'] for b in lay['buildings']}; LM={l['id'] for l in lay['landmarks']}; AR=set(area)
errs=[]
for p in pl['places']:
    if 'buildingId' in p and p['buildingId'] not in B: errs.append(('building',p['id'],p['buildingId']))
    if 'landmarkId' in p and p['landmarkId'] not in LM: errs.append(('landmark',p['id'],p['landmarkId']))
    if 'areaId' in p and p['areaId'] not in AR: errs.append(('area',p['id'],p['areaId']))
for r in pl.get('rooms',[]):
    if r.get('buildingId') and r['buildingId'] not in B: errs.append(('room',r.get('id'),r['buildingId']))
print('ref errors',errs)
# network connectivity: OSM roads + layout paths, snapped at 3 m
osm=json.load(open('/mnt/user-data/uploads/Map Mock/public/data/osm.json')) if False else None
lines=[LineString(r['pts']) for r in json.load(open('layout/out/osm.json'))['roads']]+[LineString(p['pts']) for p in lay['paths']]
import networkx as nx
G=nx.Graph(); G.add_nodes_from(range(len(lines)))
for i in range(len(lines)):
    for j in range(i+1,len(lines)):
        if lines[i].distance(lines[j])<3: G.add_edge(i,j)
comps=sorted(nx.connected_components(G),key=len,reverse=True)
main=comps[0]; print('components',len(comps),'main size',len(main),'of',len(lines))
mainU=unary_union([lines[i] for i in main])
far=[(e['id'],round(mainU.distance(Point(e['at'])),1)) for e in lay['entrances'] if mainU.distance(Point(e['at']))>3]
print('entrances not on main network',far)
json.dump(pl,open('layout/out/places.json','w'),indent=2,ensure_ascii=False)
