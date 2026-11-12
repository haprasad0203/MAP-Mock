import json,sys; sys.path.insert(0,'layout')
from common import L, load_osm
from PIL import Image, ImageDraw
lay=json.load(open('layout/out/campus-layout.json'))
S=1.6; X0,Y0=-620,640; W,H=int(1260*S),int(1020*S)
T=lambda x,y:((x-X0)*S,(Y0-y)*S); tp=lambda pts:[T(*p) for p in pts]
im=Image.new('RGB',(W,H),(214,226,196)); d=ImageDraw.Draw(im,'RGBA')
for t in lay['trees']:
    x,y=T(*t['c']); r=t['r']*S; d.ellipse([x-r,y-r,x+r,y+r],fill=(70,120,70,int(90*t['density'])))
d.polygon(tp(lay['boundary']),outline=(120,100,40),fill=(236,238,214,200))
AK={'water':(70,140,200),'court':(60,150,110),'ground':(120,190,90),'lawn':(150,205,120),'plaza':(225,220,205),'parking':(190,190,200),'garden':(160,210,130)}
for f in load_osm('water'): d.polygon(tp([L(y,x) for x,y in f['geometry']['coordinates'][0]]),fill=(70,140,200))
for f in load_osm('areas'):
    if f['properties'].get('leisure')=='pitch': d.polygon(tp([L(y,x) for x,y in f['geometry']['coordinates'][0]]),fill=(60,150,110),outline=(255,255,255))
for a in lay['areas']: d.polygon(tp(a['pts']),fill=AK[a['kind']]+(170,))
for f in load_osm('roads_paths'):
    hw=f['properties'].get('highway','')
    w=7 if hw in('primary','secondary','tertiary','unclassified','residential') else 4 if hw=='service' else 2
    d.line(tp([L(y,x) for x,y in f['geometry']['coordinates']]),fill=(120,115,110) if w>2 else (190,170,150),width=max(1,int(w*S)))
PK={'service':((120,115,110),4),'footpath':((190,170,150),2),'covered':((40,140,120),3),'road':((120,115,110),7),'track':((170,150,120),3)}
for p in lay['paths']: c,w=PK[p['kind']]; d.line(tp(p['pts']),fill=c,width=int(w*S))
CAT={'venue':(232,120,90),'food':(240,180,60),'hostel':(110,150,220),'sports':(80,190,120),'service':(170,170,165),'help':(220,90,200),'staff':(110,190,190)}
for b in lay['buildings']:
    for pt in b['parts']: d.polygon(tp(pt['poly']),fill=CAT[b['category']],outline=(60,60,60))
for e in lay['entrances']: x,y=T(*e['at']); d.ellipse([x-3,y-3,x+3,y+3],fill=(220,30,30))
for l in lay['landmarks']: x,y=T(*l['at']); d.rectangle([x-4,y-4,x+4,y+4],fill=(250,220,0),outline=(0,0,0)); d.text((x+6,y-6),l['name'],fill=(0,0,0))
for b in lay['buildings']:
    if b['labelPriority']>2: continue
    import statistics
    xs=[pt['cx'] for pt in b['parts']]; ys=[pt['cy'] for pt in b['parts']]
    x,y=T(statistics.mean(xs),statistics.mean(ys)); d.text((x+8,y-6),b.get('short',b['name']),fill=(0,0,0),stroke_width=3,stroke_fill=(255,255,255))
for x in range(-600,601,100):
    d.text(T(x,630),str(x),fill=(80,80,80))
d.text((10,H-20),'campus-layout.json v2 · north up · 100 m grid labels on top · © OpenStreetMap contributors · Overture Maps / Google Open Buildings / Microsoft',fill=(40,40,40))
im.save('layout/out/layout_v2_topdown.png'); print(im.size)
