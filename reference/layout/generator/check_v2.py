import sys, json; sys.path.insert(0,'layout')
from sat import SHOTS, fit
from PIL import Image, ImageDraw, ImageFont
lay=json.load(open('layout/out/campus-layout.json')); osm=json.load(open('layout/out/osm.json'))
CAT={'venue':(255,80,80),'food':(255,170,0),'hostel':(80,160,255),'sports':(60,220,120),'service':(200,200,200),'help':(255,0,255),'staff':(140,255,255),'landmark':(255,255,0)}
PK={'road':(255,120,0),'service':(255,120,0),'track':(200,170,120),'footpath':(255,150,220),'covered':(255,60,200)}
AK={'water':(0,120,255),'court':(0,200,120),'ground':(120,220,60),'lawn':(80,200,80),'plaza':(230,230,230),'parking':(150,150,255),'garden':(160,255,120)}
for k,(path,obs) in SHOTS.items():
    P,s=fit(obs); im=Image.open(path).convert('RGB'); ov=Image.new('RGBA',im.size,(0,0,0,0)); d=ImageDraw.Draw(ov)
    tp=lambda pts:[P(x,y) for x,y in pts]
    d.line(tp(lay['boundary']+[lay['boundary'][0]]),fill=(255,255,0,255),width=2)
    for a in lay['areas']: d.polygon(tp(a['pts']),outline=AK[a['kind']]+(255,),fill=AK[a['kind']]+(50,))
    for r in osm['roads']:
        col=(255,255,255) if r['src'].startswith('OSM') else (0,255,255)
        d.line(tp(r['pts']),fill=col+(235,),width=3 if r['kind']=='road' else 2)
    for p in lay['paths']: d.line(tp(p['pts']),fill=PK[p['kind']]+(230,),width=2 if p['kind'] in('road','service') else 1)
    for b in lay['buildings']:
        c=CAT[b['category']]
        for pt in b['parts']: d.polygon(tp(pt['poly']),outline=c+(255,),fill=c+(90,))
        p0=b['parts'][0]; x,y=P(p0['cx'],p0['cy'])
        if b['labelPriority']<=2: d.text((x+4,y-4),b.get('short',b['name'])[:14],fill=(255,255,255,255),stroke_width=2,stroke_fill=(0,0,0,255))
    for e in lay['entrances']: x,y=P(*e['at']); d.ellipse([x-2,y-2,x+2,y+2],fill=(255,0,0,255))
    for l in lay['landmarks']: x,y=P(*l['at']); d.rectangle([x-3,y-3,x+3,y+3],fill=(255,255,0,255)); d.text((x+5,y),l['id'],fill=(255,255,0,255),stroke_width=2,stroke_fill=(0,0,0,255))
    Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB').save(f'layout/out/check_{k}.png')
print('ok')
