import sys, json, statistics; sys.path.insert(0,'layout')
from sat import SHOTS, fit
from PIL import Image, ImageDraw, ImageFont
lay=json.load(open('layout/out/campus-layout.json')); osm=json.load(open('layout/out/osm.json'))
FB=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',22); FS=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',17)
CAT={'venue':(255,70,70),'food':(255,170,0),'hostel':(70,150,255),'sports':(60,230,120),'service':(210,210,210),'help':(255,0,255),'staff':(120,255,255)}
AK={'water':(0,140,255),'court':(0,220,120),'ground':(140,240,60),'lawn':(90,220,90),'plaza':(240,240,240),'parking':(170,170,255),'garden':(170,255,120)}
PK={'road':((255,120,0),5),'service':((255,120,0),4),'track':((220,180,120),3),'footpath':((255,150,220),2),'covered':((255,40,200),4)}
REG=[('A_admin_cafe_gate','03',(760,330,1110,620)),('B_nab_kalam_lake','03',(540,60,960,380)),('C_courts_mess_commercial','02',(560,300,880,580)),
     ('D_hostels_north','02',(560,60,880,360)),('E_west_quarters_tank','02',(340,50,620,480)),('F_east_substation','03',(1000,330,1420,640))]
def txt(d,xy,t,c,f=FS):
    d.text(xy,t,fill=c+(255,),font=f,stroke_width=3,stroke_fill=(0,0,0,255))
for name,shot,(X0,Y0,X1,Y1) in REG:
    path,obs=SHOTS[shot]; P,_=fit(obs); K=3
    im=Image.open(path).convert('RGB').crop((X0,Y0,X1,Y1)).resize(((X1-X0)*K,(Y1-Y0)*K),Image.LANCZOS)
    ov=Image.new('RGBA',im.size,(0,0,0,0)); d=ImageDraw.Draw(ov)
    T=lambda x,y:((P(x,y)[0]-X0)*K,(P(x,y)[1]-Y0)*K); tp=lambda pts:[T(*p) for p in pts]
    for a in lay['areas']:
        c=AK[a['kind']]; d.polygon(tp(a['pts']),outline=c+(255,),fill=c+(35 if a['kind']!='water' else 60,),width=3)
    KC={'road':((255,255,255),9),'service':((215,215,215),4),'track':((220,180,120),3),'footpath':((255,150,220),2),'covered':((255,40,200),4)}
    for r in osm['roads']+lay['paths']:
        c,w=KC[r['kind']]; d.line(tp(r['pts']),fill=c+(235,),width=w)
        if not str(r.get('src','')).startswith('OSM') and r['kind'] in ('road','service','track'):
            d.line(tp(r['pts']),fill=(255,120,0,255),width=1)
    labels=[]
    for b in lay['buildings']:
        c=CAT[b['category']]
        for pt in b['parts']: d.polygon(tp(pt['poly']),outline=c+(255,),fill=c+(55,),width=3)
        if not b.get('unnamed'):
            xs=[T(pt['cx'],pt['cy']) for pt in b['parts']]; labels.append((statistics.mean(x for x,_ in xs),statistics.mean(y for _,y in xs),b.get('short',b['name']),c,FB if b['labelPriority']<=2 else FS))
    for a in lay['areas']:
        if a.get('name'):
            xs=tp(a['pts']); labels.append((statistics.mean(x for x,_ in xs),statistics.mean(y for _,y in xs),a['name'],AK[a['kind']],FS))
    for e in lay['entrances']:
        x,y=T(*e['at']); d.ellipse([x-6,y-6,x+6,y+6],fill=(255,0,0,255),outline=(255,255,255,255),width=2)
    for l in lay['landmarks']:
        x,y=T(*l['at']); d.rectangle([x-8,y-8,x+8,y+8],fill=(255,240,0,255),outline=(0,0,0,255),width=2); labels.append((x+12,y-10,l['name'],(255,240,0),FS))
    for x,y,t,c,f in labels:
        if -50<x<im.size[0] and -20<y<im.size[1]: txt(d,(x+10,y-10),t,c,f)
    d.rectangle([0,im.size[1]-34,im.size[0],im.size[1]],fill=(0,0,0,170))
    txt(d,(8,im.size[1]-30),'white = asphalt road · grey = service road · orange stripe = road added (not in OSM) · pink = footpath · magenta = covered walk · red dot = entrance · yellow = landmark · blue = lake',(255,255,255),ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',15))
    Image.alpha_composite(im.convert('RGBA'),ov).convert('RGB').save(f'layout/out/zoom_{name}.png')
print('ok')
