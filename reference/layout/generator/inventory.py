import json
lay=json.load(open('layout/out/campus-layout.json'))
CONF={'admin':'High','amul-cafe':'High','nab':'High','cafe-cloud':'High','tin-cafe':'Low','kalam-centre':'High','kalam-building':'Medium',
 'octagon-hall':'Medium','road-block':'Medium','gym':'Medium','court-kiosk':'Medium','hostel-1':'Medium','hostel-2':'High','mess':'High','commercial':'High',
 'hostel-mid':'Low','hostel-3':'High','hostel-4':'Medium','type2':'High','type3':'High','substation':'High','guard-room':'Low'}
ZONE=lambda x,y:'north ridge' if y>300 else 'hostel slope' if y>150 else 'lake valley' if (x<0 and y>-150) else 'academic core' if y>-260 else 'south road'
rows=[]
for b in lay['buildings']:
    if b.get('unnamed'): continue
    p=b['parts'][0]; n=len(b['parts']); src='; '.join(sorted({q['src'].split(' (')[0].split(' ')[0] if q['src'].startswith('overture') else q['src'] for q in b['parts']}))
    rows.append(f"| {b['name']} | `{b['id']}` | {b['category']} | {ZONE(p['cx'],p['cy'])} | {n} | {max(q['floors'] for q in b['parts'])} | {p['roof']} | {b.get('groundElev','')} | {src} | {CONF.get(b['id'],'Low')} | {b.get('confirm','')} |")
unnamed=sum(1 for b in lay['buildings'] if b.get('unnamed'))
md=f"""# Campus layout inventory (v2, 13 Nov 2026)

`public/data/campus-layout.json` v2 was authored outside Claude Code from open data and checked against the satellite screenshots. This file lists where every feature came from and how sure we are about it. **Low** = placed by eye or assumed, so survey it on campus.

## Confirmed by H A (13 Nov 2026)
- The Auditorium and the Library are INSIDE the Admin Block: one building, not three. Places `auditorium` and `library` and rooms AUD and LIB-R point to `admin`.
- The kiosk next to Cafe Cloud is **Amul Cafe** (`amul-cafe`). Tin Café's location is still unknown.
- The statue in the middle of the terraced garden south-east of the Admin Block is the **Kalam statue**.
- Hostels: **Hostel 1 = D Block**, **Hostel 2 = F Block**, **Hostel 3 = the north-ridge blocks**, **Hostel 4 = the block between D and F**. The old ten-block cluster west of the courts is NOT Hostel 1 (now `west-cluster`, name to confirm).
- Google's "Mithaas" pin is the **Commercial Complex** (Mithaas is a shop inside).
- The "Admin Block Parking" area was wrong and has been removed (no parking area for now).
- NAB front road (`rd-nab-front`) traced by H A: it runs round the east side of NAB past the NAB lawn. Also added by eye: the approach road from the Kalam side (`rd-nab-north`) and the west lane beside the main road (`rd-nab-west`).
- The lawn east of NAB (`nab-lawn`) marked by H A.
- Hostel road (`rd-fblock`, asphalt): re-traced on H A's high-res satellite screenshot of the hostels, from the junction east of Hostel 1 past Hostel 2, round the loop to Hostel 3. `rd-north` is now the short Hostel 3 upper access; the old by-eye `rd-hostel2-lower` was removed (duplicate).
- Road types: the NAB front road, the main campus road (gate → Kalam junction, OSM 1050247311) and the campus loop (OSM 1050247312) are `kind: road` (asphalt, full width with markings). OSM tags every campus road as `service`; the rest stay `service` (narrower).
- Football ground re-traced on the actual field. OSM way 1050247323 ran through the middle of the field; that part is moved to 4 m outside the east edge in `osm.json`. Two stray shapes on the field were dropped.

## Sources used
| Source | Used for | Licence |
|---|---|---|
| Overture Maps buildings, release 2026-10-21.0 (`reference/overture/export_2026-11-13/`) | Building footprints: shapes, sizes, angles (`poly`) | ODbL / CC BY 4.0 (Google Open Buildings), Microsoft ML |
| OpenStreetMap export (`reference/osm/export_2026-11-13/`, `public/data/osm.json`) | Road network, lake, courts, recreation ground | ODbL, © OpenStreetMap contributors |
| Google Maps pins | ONLY to identify which footprint is which building; nothing traced | – |
| Drone photos (`reference/photos/aerial/`), official photos, satellite screenshots | By-eye shapes: Admin hall and front, NAB middle, Hostel 4, the hostel roads, forecourt, gardens, football ground | – |
| AWS Terrain Tiles (SRTM-based, about 30 m) | `public/data/terrain.json` and `groundElev` per building | public domain |

## How to read the JSON
- Coordinates are metres on the local grid (`src/geo/grid.ts`): x = east, y = north, origin 25.6176, 91.9522.
- Each `Part` keeps the old fields (`cx, cy, w, d, angle, floors, roof`, …) so the current renderer still works. New optional fields:
  - `poly`: the true footprint polygon, to extrude in 3D;
  - `src`: where the part came from.
- Each `Building` has `groundElev` (metres above the lake surface, from the DEM).
- `unnamed: true` marks {unnamed} small footprints inside the campus that we could not name (staff houses, sheds, plant rooms). Draw them, never label them, leave them out of search.
- Entrances are placed on the face nearest a road, with a short `fp-<id>` footpath connector. The Admin entrance faces the flag forecourt.
- The covered walkway comes from two long roof footprints in Overture, joined by eye.
- Boundary: the campus only. The south-west village, the east settlements, NECT, NIELIT and NIFT are outside. The ATM is just outside, on the public road. Lariti is not on campus.

## Elevation (from the DEM)
Lake = 0 m. Academic core is +5 to +12 m. Courts and the west cluster are +7 to +16 m. Mess, Commercial Complex, Hostel 1 (D Block) and Hostel 4 are about +18 to +21 m. Hostel 2 (F Block) is about +33 m. Hostel 3 on the north ridge is about +50 m. Type 2/3 quarters on the west hairpin are +23 to +30 m. SRTM is coarse: smooth it, and flatten building pads and courts.

## Named buildings
| Name | id | Category | Zone | Parts | Floors | Roof | Ground (m) | Footprint source | Confidence | To confirm |
|---|---|---|---|---|---|---|---|---|---|---|
""" + "\n".join(rows) + """

## Areas, paths, landmarks
| Feature | Source | Confidence |
|---|---|---|
| Lake (`lake` area, also in `osm.json`) | OSM | High |
| Lake walking trail | OSM lake outline + 7 m | Medium |
| Basketball ×2, volleyball | OSM pitches | High; whether one west court is tennis/badminton is Low |
| Football ground | re-traced 13 Nov on the playing field inside the perimeter track (satellite) | High |
| Flag forecourt (round garden), plaza | by eye (drone DJI_0338, Image_363) | Medium |
| Kalam statue garden (terraced garden SE of the Admin Block) | by eye; confirmed by H A | High |
| All public and campus roads (`public/data/osm.json`, 122 lines) | fresh OSM export + 3 Overture-only segments | High (OSM sits up to ~8 m off the satellite in places) |
| Hostel 2 access loop, north hostel road, Hostel 2 lower road, east road from the Kalam junction, NAB approach road, NAB west lane | by eye (satellite); missing from OSM and Overture | Medium |
| Covered walkway | Overture roof footprints + joins by eye | Medium |
| Main gate | Google listing pin on the south road | Medium |
| Flag mast | centre of the forecourt | Medium |
| Kalam statue | centre of the terraced garden SE of the Admin Block (confirmed by H A) | High |
| Water tank | Google pin + Overture footprint | High |
| ICICI ATM | Google pin (off campus, on the public road) | High |

## Checks run
- Every `buildingId`, `areaId` and `landmarkId` in `places.json` (places and rooms) exists in the layout.
- All 30 entrances sit on the main connected path network (OSM roads + layout paths, 3 m snap).
- Overlays on the three satellite screenshots: `reference/layout/check_01.png`, `check_02.png`, `check_03.png`. Six close-ups with every label, road and the lake: `zoom_A..F_*.png`. Plain top-down: `layout_v2_topdown.png`.

## Survey on campus (Survey mode)
Main gate posts, Admin main door (and which wing holds the Auditorium and the Library), NAB entrances (both ends), Hostel 4 corners (outline by eye), the west cluster (what it is), where Worth The Taste (Tin Café) is, the medical room, the help desk, and the guard room.
"""
open('layout/out/LAYOUT_INVENTORY.md','w').write(md); print(len(rows),'rows')
