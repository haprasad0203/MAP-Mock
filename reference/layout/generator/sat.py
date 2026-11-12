import sys; sys.path.insert(0,'layout')
from common import *
import numpy as np
SHOTS={
 '03':('pkg/IIM_Shillong_Campus_Map_Pack/01_satellite_screenshots/03_south_academic_auditorium_closeup.jpg',
       [('IIM SHILLONG (pin)',863,307),('Dr Kalam Centre',733,175),('Basketball courts',610,107),('ICICI ATM',998,592),('IIM-Shillong (main listing)',1005,549),('IIM Substation',1302,396)]),
 '02':('pkg/IIM_Shillong_Campus_Map_Pack/01_satellite_screenshots/02_north_hostels_sports_closeup.jpg',
       [('F Block New Hostel',695,184),('D block',749,308),('Football Ground',797,373),('Basketball courts',749,454),('Type 2 Quarters',427,383),('Water Supply Tank',502,93),('Dr Kalam Centre',873,520),('IIM SHILLONG (pin)',1003,654)]),
 '01':('pkg/IIM_Shillong_Campus_Map_Pack/01_satellite_screenshots/01_whole_campus_labeled.jpg',
       [('D block',655,139),('Type 2 Quarters',405,196),('Football Ground',692,189),('Basketball courts',656,252),('Dr Kalam Centre',751,303),('IIM SHILLONG (pin)',851,408),('IIM-Shillong (main listing)',962,595),('ICICI ATM',957,628),('IIM Substation',1193,476)]),
}
def fit(obs):
    A=[];b=[]
    for n,px,py in obs:
        x,y=L(*PINS[n]); A.append([x,1,0]); b.append(px); A.append([-y,0,1]); b.append(py)
    s,tx,ty=np.linalg.lstsq(np.array(A,float),np.array(b,float),rcond=None)[0]
    return lambda x,y:(s*x+tx,-s*y+ty), s
