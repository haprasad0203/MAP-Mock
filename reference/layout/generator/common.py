import json, math
O=(25.6176,91.9522); KX=111320*math.cos(math.radians(O[0])); KY=110574
def L(lat,lon): return ((lon-O[1])*KX,(lat-O[0])*KY)
PINS={
 'IIM SHILLONG (pin)':(25.6168529,91.9531595),'Auditorium (pin)':(25.6160427,91.9540054),'Dr Kalam Centre':(25.6180674,91.9518524),
 'F Block New Hostel':(25.6212283,91.9500786),'D block':(25.6200387,91.9505678),"Students' Mess":(25.6199197,91.9495275),
 'Mithaas':(25.6194178,91.9495941),'Football Ground':(25.6194387,91.9510608),'Basketball courts':(25.6187004,91.9505785),
 'Volleyball Court':(25.6191415,91.9500313),'Type 2 Quarters':(25.619346,91.9472831),'Faculty Qtrs Type 3':(25.6204254,91.9482607),
 'Water Supply Tank':(25.6220258,91.9480405),'IIM Substation':(25.616188,91.957687),'ICICI ATM':(25.614248,91.954537),
 'IIM-Shillong (main listing)':(25.6146357,91.9546082),'Cafe Cloud / Tin Cafe':(25.6157059,91.9528862),
}
def ring(g): return g['coordinates'][0] if g['type']=='Polygon' else g['coordinates'][0][0]
def load_buildings():
    fs=json.load(open('overture/buildings.geojson'))['features']
    out=[]
    for i,f in enumerate(fs):
        r=[L(y,x) for x,y in ring(f['geometry'])]
        cx=sum(p[0] for p in r[:-1])/(len(r)-1); cy=sum(p[1] for p in r[:-1])/(len(r)-1)
        a=0
        for (x1,y1),(x2,y2) in zip(r,r[1:]): a+=x1*y2-x2*y1
        out.append({'i':i,'ring':r,'c':(cx,cy),'area':abs(a)/2,'src':f['properties']['sources'][0]['dataset'],'gers':f['id'] if 'id' in f else f['properties'].get('id')})
    return out
def load_osm(name):
    return json.load(open(f'osm_dl2/out/osm_{name}.geojson'))['features']
