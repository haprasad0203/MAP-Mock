# Layout v2 check log

Rule: change the layout only when it is clearly wrong against `check_01..03.png`, `zoom_*.png`, `layout_v2_topdown.png` or the drone photos. Log every change with what, why and evidence. Never move buildings to "look nicer" or to make a test pass.

## Phase 1 (13 Nov 2026)

### Layout changes
None. `campus-layout.json` v2, `places.json`, `osm.json` and `terrain.json` are unchanged.

### Code references fixed (code, not data)
- No hard-coded building ids in `src/` were stale. The deep links (`room=AUD`, `room=104`, `room=LIB-R`, `room=101`, `place=mess`, `place=help-desk`) all resolve.
- `auditorium`, `library`, `AUD` and `LIB-R` point to `admin`. `tin-cafe` is a pin with no building. The hostel ids match the H A naming.

### Data tests (`src/data/data.test.ts`), all passing
| Check | Result |
|---|---|
| buildingId / areaId / landmarkId in places, rooms and sessions exist | OK |
| Every entrance within 3 m of the network | OK (max 0.22 m) |
| Every entrance on the main network | OK. The main network is 141 of 151 lines. |
| Pins inside the boundary (10 m tolerance) | OK. Only the ATM is outside (29.7 m, expected). |
| Every part has `poly`; unnamed buildings have no places | OK |

### Observations (not changed, for the organiser)
- **`lake-trail` (layout path) is not connected to the main network.** Its ends are more than 3 m from any road and it crosses none. No entrance depends on it, but Phase 3 routing can't use the trail until a connector is surveyed.
- **Small detached OSM pieces** (expected): `osm-1050925777+…779+…782`, `osm-1051011499+osm-1051186881+osm-1051189581`, `osm-1050216167`, `osm-1050925783`, `ovt-150`.
- Low-confidence items in `LAYOUT_INVENTORY.md` stay flagged `confirm` for Survey mode.

## Road types (13 Nov 2026, data update)
- The data update marks `rd-nab-front`, `osm-1050247311` (main campus road) and `osm-1050247312` (campus loop) as `kind: road`, `surface: asphalt`. The rest of the campus roads stay `service`.
- 2D renderer:
  - `road` is about 8 m of asphalt with a kerb, white edge lines (shown from k ≥ 0.64) and a 3 m on / 3 m off centre dash (shown from k ≥ 0.9).
  - `service` is narrower, about 4.4 m, with no markings.
  - The public `road` lines outside campus get the same asphalt look.
- All 13 data tests pass on the updated data. No layout changes made.

## Hostel roads (13 Nov 2026, data update)
- `rd-fblock` is now the asphalt hostel road (`kind: road`): Hostel 1 junction → past Hostel 4 and Hostel 2 → Hostel 3. `rd-north` is the short Hostel 3 upper access (`service`). `rd-hostel2-lower` was removed.
- No code or place referred to the removed road. All 13 data tests pass, so every entrance is still on the main network. No layout changes made.

## Phase 2 photo check (13 Nov 2026)
- **`admin` roofColor `#4B525A` (slate grey) disagrees with the photos.** DJI_0338, Image_363 and yt-drone-19s all show green hipped roofs on every wing; only the older satellite shows dark grey. Per the Phase 2 rule the photos win, so the renders and 3D materials use green. The layout data is not edited; to change it, set `admin.roofColor` to the campus green. Organiser to confirm.
- **Hostel roofs:** the satellite shows grey-blue, the ground photos show green. The renders use green.

## Phase 3: 3D render details (13 Nov 2026)
The layout data was re-read before the 3D build (H A's data update: Hostel 1 is `flat` with `stoneBase`; the Admin roof is green `hip`; the Mess is four slate-roofed octagons). **No layout data was changed.** The 3D engine takes roof type, colours, floors, footprints and `groundElev` from the data. The only things it adds are details the schema has no field for, all from `reference/generated/LOOKS_LIKE.md` and kept in `src/render3d/buildingStyles.ts`:

| Building | Render-side detail | Why it is not in the data |
|---|---|---|
| `cafe-cloud`, `octagon-hall`, `mess` (big hall only) | Octagon roof has a raised glazed lantern tier | `roof: octagon` has no "two-tier" option |
| `octagon-hall` | 1.5 m brown stone band round the base | `stoneBase` means a full stone ground floor |
| `nab` | The two `stoneTowers` end blocks stay white and carry a rooftop pavilion with a green cap; the stone is on panels beside the glass atrium | LOOKS_LIKE correction: the towers are white, the stone is on the panels |
| `hostel-1` | Flat roof ends in a thin projecting slab (no parapet); black balcony rails | No field for the roof edge or rail colour |

General rules (not overrides): a flat roof whose `roofColor` is green gets a concrete deck with green-capped stair heads; a `hip` roof on a footprint that fills under 75% of its rectangle (`east-cluster` part, `bldg-966`) uses slopes that follow the outline.

Off-campus scenery: `public/data/surroundings.json` (489 Overture footprints outside the boundary, made by `scripts/build-surroundings.mjs`) is drawn as plain houses with no labels and no hit-test. It is not part of the campus layout.

Props added by the 3D engine (`src/render3d/props.ts`), placed from the layout data only, no new positions:
- At landmarks: the flag mast (`flag`), the gate portal across the nearest road to `main-gate`, the Kalam statue on a plinth (`kalam-statue`), the water tank (`water-tank`).
- Seeded along campus roads: street lamps; parked cars on service lanes; one bus 26 m inside the gate.
- On areas: goalposts and one floodlight on `football`; lines, hoops or a net on the three OSM courts.
- Along `covered-walk`: a teal pitched roof on white posts.
- Trees: campus trees are the world model's list; the forest outside the boundary is seeded from noise on wild ground and kept off the Overture houses.

Added in the Phase 3 fix-up (13 Nov 2026): `admin` part 2 (the 60 × 44 m main wing, `hip` in the data) is drawn as a low hip over the whole part with a raised centre pavilion under its own hip, to match the Admin render. The footprint, floors and roof colour still come from the data; only the roof's form is a render detail (`pavilionRoof` in `src/render3d/buildingStyles.ts`).

## Phase 3M v2: real-building study (16 Nov 2026), proposals for H A
Proposals only. `campus-layout.json` is **not** edited. Evidence: `reference/real/admin.md`, `reference/real/nab.md`, the fit images `reference/real/*_fit.png`.

| # | Building | Field | Now | Proposed | Evidence |
|---|---|---|---|---|---|
| 1 | `admin` part 3 (east end block) | `floors` | 3 | **4** | Ground plus 3 window rows, same as the west block (homepage video @0:04.5, DJI_0338, iimshillong 2024/10/7) |
| 2 | `admin` part 2 (centre range) | `floors` | 3 | 3 for the linking wings, **4 for the centre block** (a sub-part, or a model-side detail) | The centre block's eaves are level with the 4-storey end blocks; the wings have 3 |
| 3 | Auditorium | place | separate pin | It is the **rear hall of the Admin Block** (the large dark roof inside `admin` part 2) | Hi-res satellite 0423: the "IIM Shillong Auditorium" pin and dark roof sit on the Admin footprint |
| 4 | `nab` entrances | `main` | the SW tip | **main = the SE face centre (glass atrium)**, plus two side entrances under the flat canopies about 15 m either side | Homepage video @0:05.5, DJI crop: all doors are on the SE face, toward the NAB lawn and front road |
| 5 | `nab` stone towers | (render detail) | the towers white | The towers' faces are **sandstone** with a white-framed glass strip; only the top box is white | Homepage video @0:05.5; replaces the Phase 3 "towers white" correction above |

The footprints of both buildings fit the satellite within the pin-fit error (about 5 m). No footprint changes are proposed.
| 6 |  | footprint and position | 18 × 17 m rectangle at (-198, 24), 45 m south of the loop road | a regular **octagon about 27 m across**, standing **on the loop road opposite **, with two octagonal ponds behind | Drone stills 9QBtbam1G5Q @0:00.5, 0:07.5, 0:08.5, 0:49.5 (measured against the 8 m road) |
| 7 |  | outline | 14-point outline | about 5 m east of the drawn outline (within the fit error; check on the survey walk) | reference/real/cafe-cloud_fit.png |
