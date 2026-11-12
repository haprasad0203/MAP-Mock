# Campus layout inventory (v2, 13 Nov 2026)

`public/data/campus-layout.json` v2 was authored outside Claude Code from open data and checked against the satellite screenshots. This file lists where every feature came from and how sure we are about it. **Low** = placed by eye or assumed, so survey it on campus.

## Confirmed by H A (13 Nov 2026)
- The Auditorium and the Library are INSIDE the Admin Block: one building, not three. Places `auditorium` and `library` and rooms AUD and LIB-R point to `admin`.
- The kiosk next to Cafe Cloud is **Amul Cafe** (`amul-cafe`). Tin Café's location is still unknown.
- The statue in the middle of the terraced garden south-east of the Admin Block is the **Kalam statue**.
- Hostels: **Hostel 1 = D Block**, **Hostel 2 = F Block**, **Hostel 3 = the north-ridge blocks**, **Hostel 4 = the block between D and F**. The old ten-block cluster west of the courts is NOT Hostel 1 (now `west-cluster`, name to confirm).
- Google's "Mithaas" pin is the **Commercial Complex** (Mithaas is a shop inside).

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
- `unnamed: true` marks 44 small footprints inside the campus that we could not name (staff houses, sheds, plant rooms). Draw them, never label them, leave them out of search.
- Entrances are placed on the face nearest a road, with a short `fp-<id>` footpath connector. The Admin entrance faces the flag forecourt.
- The covered walkway comes from two long roof footprints in Overture, joined by eye.
- Boundary: the campus only. The south-west village, the east settlements, NECT, NIELIT and NIFT are outside. The ATM is just outside, on the public road. Lariti is not on campus.

## Elevation (from the DEM)
Lake = 0 m. Academic core is +5 to +12 m. Courts and the west cluster are +7 to +16 m. Mess, Commercial Complex, Hostel 1 (D Block) and Hostel 4 are about +18 to +21 m. Hostel 2 (F Block) is about +33 m. Hostel 3 on the north ridge is about +50 m. Type 2/3 quarters on the west hairpin are +23 to +30 m. SRTM is coarse: smooth it, and flatten building pads and courts.

## Named buildings
| Name | id | Category | Zone | Parts | Floors | Roof | Ground (m) | Footprint source | Confidence | To confirm |
|---|---|---|---|---|---|---|---|---|---|---|
| Admin Block | `admin` | venue | academic core | 4 | 4 | hip | 9.6 | by-eye (drone + satellite), survey to confirm; overture | High | One building holding the Admin offices, the Auditorium and the Library (confirmed). Which wing holds which: to confirm. Google labels it "IIM Shillong Auditorium". |
| New Academic Block (NAB) | `nab` | venue | academic core | 4 | 5 | flat | 5.4 | derived; overture | High | Long white block at the Google "IIM SHILLONG" pin; stone stair towers at both ends (drone). |
| Cafe Cloud Campus | `cafe-cloud` | food | academic core | 1 | 1 | octagon | 6.7 | overture | High | Octagonal pavilion west of the main road, opposite the Admin Block (Google pin + drone). |
| Amul Cafe | `amul-cafe` | food | academic core | 1 | 1 | gable | 2.9 | by-eye (drone + satellite), survey to confirm | High | Kiosk next to Cafe Cloud (confirmed as Amul Cafe); exact outline by eye. |
| Dr. Kalam Centre | `kalam-centre` | venue | lake valley | 2 | 3 | hip | 12.3 | overture | High |  |
| Kalam Building | `kalam-building` | venue | lake valley | 1 | 2 | hip | 10.9 | overture | Medium | Assumed to be the block just east of the Kalam Centre. |
| Campus blocks (between NAB and Kalam Centre) | `east-cluster` | service | academic core | 5 | 2 | hip | 7.8 | overture | Low | Use of these small blocks to confirm. |
| Campus building | `block-501` | service | academic core | 1 | 2 | hip | 4.8 | overture | Low | Use to confirm. |
| Campus building | `block-503` | service | academic core | 1 | 2 | hip | 9.7 | overture | Low | Use to confirm. |
| East hill residence | `east-residence` | staff | academic core | 2 | 2 | hip | -2.3 | overture | Low | Use to confirm. |
| Octagonal Hall | `octagon-hall` | venue | lake valley | 1 | 1 | octagon | 0.8 | overture | Medium | Hall on the north shore of the lake beside the road (drone video). Use to confirm. |
| Service block | `road-block` | service | lake valley | 1 | 1 | flat | 8.5 | overture | Medium | Small block at the lake-road junction; use to confirm. |
| Sports Pavilion & Gym | `gym` | sports | hostel slope | 1 | 1 | gable | 16.4 | overture | Medium | Pavilion at the west end of the court strip; whether the gym is inside to confirm. |
| Court-side kiosk | `court-kiosk` | service | hostel slope | 1 | 1 | gable | 11.6 | overture | Medium |  |
| Residential cluster (west of the courts) | `west-cluster` | hostel | lake valley | 10 | 3 | hip | 7.5 | overture | Low | Ten small blocks west of the courts. NOT Hostel 1 (H A: D Block is Hostel 1). Name and use to confirm. |
| Hostel 1 · D Block | `hostel-1` | hostel | hostel slope | 5 | 4 | hip | 17.5 | overture | Medium | Named by H A (Google: "D block"). Whether the two south-west blocks belong to it to confirm. |
| Students' Mess | `mess` | food | hostel slope | 1 | 2 | gable | 20.0 | overture | High |  |
| Commercial Complex | `commercial` | food | hostel slope | 1 | 1 | flat | 20.3 | overture | High | Google labels it "Mithaas" (a shop inside). Confirmed by H A as the Commercial Complex. |
| Residential blocks (west of the Mess) | `west-blocks` | hostel | hostel slope | 2 | 3 | hip | 21.7 | overture | Low | Two blocks west of the Mess; use to confirm. |
| Hostel 4 | `hostel-4` | hostel | north ridge | 1 | 4 | hip | 20.8 | by-eye (drone + satellite), survey to confirm | Medium | Named by H A. Blue-roofed block between Hostel 1 (D Block) and Hostel 2 (F Block); missing from the open footprint data, so the outline is by eye. Survey the corners. |
| Hostel 2 · F Block | `hostel-2` | hostel | north ridge | 4 | 5 | hip | 33.5 | overture | High |  |
| Hostel 3 | `hostel-3` | hostel | north ridge | 3 | 4 | hip | 52.0 | overture | High | Named by H A. Highest hostel blocks on the north ridge. |
| Campus building | `block-962` | service | north ridge | 1 | 2 | hip | 18.6 | overture | Low | Use to confirm. |
| Campus building | `block-488` | service | hostel slope | 1 | 2 | hip | 16.4 | overture | Low | Use to confirm. |
| Type 2 Quarters (staff housing) | `type2` | staff | hostel slope | 9 | 3 | hip | 23.2 | overture | High |  |
| Faculty Quarters Type 3 | `type3` | staff | hostel slope | 14 | 3 | hip | 30.3 | overture | High |  |
| IIM Substation | `substation` | service | academic core | 1 | 1 | flat | -46.6 | overture | High |  |
| Service buildings (east of Admin) | `service-east` | service | academic core | 2 | 1 | flat | -11.6 | overture | Low | Use to confirm. |
| Main Gate Security | `guard-room` | help | south road | 1 | 1 | hip | 4.5 | by-eye (drone + satellite), survey to confirm | Low | Gate at the "Indian Institute of Management–Shillong" pin; guard-room spot to confirm. |

## Areas, paths, landmarks
| Feature | Source | Confidence |
|---|---|---|
| Lake (`lake` area, also in `osm.json`) | OSM | High |
| Lake walking trail | OSM lake outline + 7 m | Medium |
| Basketball ×2, volleyball | OSM pitches | High; whether one west court is tennis/badminton is Low |
| Football ground | by eye (satellite) at the Google pin | Medium |
| Flag forecourt (round garden), plaza | by eye (drone DJI_0338, Image_363) | Medium |
| Kalam statue garden (terraced garden SE of the Admin Block) | by eye; confirmed by H A | High |
| Admin Block parking (paved lot between NAB and Admin) | by eye | Low |
| All public and campus roads (`public/data/osm.json`, 122 lines) | fresh OSM export + 3 Overture-only segments | High (OSM sits up to ~8 m off the satellite in places) |
| Hostel 2 access loop, north hostel road, Hostel 2 lower road, east road from the Kalam junction | by eye (satellite); missing from OSM and Overture | Medium |
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
Main gate posts, Admin main door (and which wing holds the Auditorium and the Library), NAB entrances (both ends), Hostel 4 corners (outline by eye), the west cluster (what it is), where Worth The Taste (Tin Café) is, the parking lot, the medical room, the help desk, and the guard room.
