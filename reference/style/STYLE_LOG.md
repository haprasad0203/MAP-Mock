# Style log: Phase 3R (landmarks modelled to match their approved renders)

Spec: `reference/style/REFINE_LANDMARKS.md`. Sheets: `reference/style/compare/model_<id>_v<round>.png` (render left, model right), made by `node scripts/compare-model.mjs <id> <round>` from the `?model=<id>` viewer.

Scores are out of 10 for "does the model read as the render". A building is not left below 7.

## Setup (14 Nov 2026)
- Data: `public/data` in the worktree already matched `D:\Map Mock\public\data` (layout, places, osm, terrain, sessions); nothing to copy.
- Viewer: `/campus?model=<id>&az=<deg>&pitch=<deg>` (`src/ui/ModelViewer.tsx`). One building with its forecourt on plain cream, 14° lens, 32° down, warm sun from the camera's left, framed to fill the view.
- Hero modules: `src/render3d/landmarks/<id>.ts`, on the shared kit (`kit.ts`). The map engine uses the same modules through `addBuilding`.
- Materials: `src/render3d/materials.ts`. New hero wall: pure white plaster, one big window per bay (4.2–5.2 m) with a white frame and dark teal-grey glass, a grey-green floor band per floor.

## Admin Block (render `admin_v1.png`, the approved one per GENERATED.md)

### Round 1: 4/10
Sheet: `model_admin_v1.png`. Camera az -70.

What is in: a taller centre block with the largest hip; lower linking wings with three corridor floors and glass rails; white end blocks with stone bases, a teal strip each and the emblem on the east block; a two-storey glass bay with portico columns; hips at 22° with 0.8 m eaves and white fascia; pink plaza, round lawn with ring path and cross paths, flag mast with the tricolour, lamps, three white cars.

| Item | Render | Model, round 1 | Fix for round 2 |
|---|---|---|---|
| Proportions | Compact U: end blocks stand well forward, centre recessed; about as tall as a wing is deep | Data footprint is a 60 m front with a 31–44 m deep body and end blocks beside it, not in front; reads long, low and deep | Cannot change the footprint. Raise the read of height: taller plinth, attic band, 4 floors on the wings' front range |
| Wall vs roof height | Walls dominate; roof about a third of wall height | Centre hip is fine (5.5 m on 15.4 m). The rear range and wing hips together still make a big roofscape seen from this angle | Rear range: flat grey deck behind a parapet instead of a hip, so only the front range carries green roofs |
| Roof pitch, overhang, fascia | 22°, clear white fascia band under every eave | Pitch right; fascia too thin to read | Fascia band 0.6 m deep, white soffit |
| Colours | Warm white walls, sage roof, strong teal glass | Walls read light grey-cream in shade; roof a little too yellow-green | Lift wall albedo and fill light on walls; roof tint cooler |
| Window pattern | End blocks nearly blank: a few small windows high up | East and west blocks have full window grids on their side faces | Blank side faces with 3 small high windows |
| Glass | Tall teal strips on end blocks, 2–3 storey curtain bay at the centre | Strips present but thin; centre bay present, partly hidden behind the flag and columns | Strips 2.6 m wide and full height; bay taller (2.5 floors) |
| Stone | Stone only at the base of the end blocks and beside the centre bay | Same places; texture too dark and busy | Lighter stone tint, larger blocks |
| Balconies and corridors | Deep open corridors: dark recess, dark slab bands, glass rails | Present but flat (0.7 m deep) and the rails read as teal stripes | Real recess 2 m deep with a dark back wall and soffit shadow |
| Emblem | Round green emblem high on the east block | Present, right place, a little large and target-like | Smaller, plain green ring with pale centre |
| Entrance and canopy | Columns carry the centre block over an open porch | Columns present, porch not open | Open the ground floor of the bay behind the columns |
| Forecourt | Lawn is a rounded triangle with a ring at its centre; plaza hugs the building; green block under everything | Round lawn with cross paths, plaza, grass block: reads right but plaza is too large and empty | Shrink plaza, add the two planted beds by the wings and two pines |

### Round 2
Pending H A's look at round 1.

## New Academic Block (render `nab_v3.png`)

### Round 1: 3/10
Sheet: `model_nab_v1.png`. Camera az -77.

What is in: pure white walls with the new windows; flat light-grey roofs with parapets and two grey rooftop units, no green boxes; a teal glass atrium standing proud under a white roof slab with a door canopy; tan stone panels both sides with the emblem on the left one; teal strips beside the panels; two white towers one floor higher with a teal strip, a green skirt roof and an open pavilion under a green cap.

| Item | Render | Model, round 1 | Fix for round 2 |
|---|---|---|---|
| Proportions | One long narrow slab, about 5 : 1, towers at its two ends | The data has three bulky parts: a 60 × 18 m slab between a 41 × 30 m and a 28 × 22 m end block, plus a small annex at a different angle. The end blocks stand forward of the slab, so only about 22 m of the slab's front shows | Cannot change the footprint. Treat the lawn-side faces of the end blocks as part of the entrance front (stone panels and strips continue across them), so the long front reads as one facade |
| Wall vs roof | Flat roof, thin parapet | Same | None |
| Colours | White walls, warm tan stone, teal glass | White reads right in sun; stone much too dark and brown | Lighter, warmer stone tint |
| Window pattern | Square windows in pairs, dark, deep white frames | New window texture: right idea, glass reads green-black, bays a little small on the end blocks | Larger bay, darker neutral glass |
| Glass | Full-height atrium with a clear mullion grid; glazed strips beside the stone | Atrium present but narrow (squeezed into the 22 m gap) | Wider atrium once the front runs across the end blocks |
| Stone | Two large panels, full height, flanking the atrium | Both present but small and dark | Larger panels on the end blocks' front faces |
| Towers | Slim, at the two ends of the slab, pavilion clearly open | Present on the end blocks' outer front corners; right one is far from the entrance front; pavilions read well | Keep; move each to the corner nearest the slab's line |
| Balconies | None | None | None |
| Emblem | On the left stone panel | Present, too large for the small panel | Resize with the panel |
| Entrance and canopy | Two white porch canopies on the front | Centre door canopy only (side porches need more than 46 m of front) | Porches on the end blocks' front faces |
| Podium | Dark base strip, lawn strip with small trees, road with cars | None | Base strip, lawn strip and small trees |

### Round 2
Pending H A's look at round 1.

## Open question for H A
Both renders show a simpler plan than the data. The spec says footprints stay as in `public/data`, so the models are built on the real footprints and will never match the renders' outline. Rounds 2 and 3 can still close most of the gap in facade, roofs, colour and forecourt.

## 16 Nov 2026: Phase 3M started (BUILD_LANDMARKS_3D.md)
The Phase 3S sprite attempt (the renders standing on the map as pictures) is kept at tag `phase3-sprites-attempt`, with its log and screenshots. The branch went back to `phase3-before-sprites`; the landmarks are now built in 3D on the real footprints and painted with pieces cut from the renders.

### Facade atlases (step 1)
- Marks: `public/data/facades.json` (edit with `/campus?facade-edit=<id>`). Pixels come from the original PNGs; the cut-outs were not needed as masks for these two (every quad lies inside a wall).
- Contact sheets: `compare/facades_admin.png`, `compare/facades_nab.png`.
- Admin: the east end block's side face (top window band, blank plaster, base) and front face (teal strip, emblem, glazed door), the linking wing's corridor face, the centre glass curtain, plaster and stone samples. Roof `#85ab64`. Atlas 1024 px, 23 kB.
- NAB: the end face (framed square windows, 2 bays × 4 floors), tower front (teal strip) and side (small windows), the stone face (stone, emblem, glass strip), the atrium, plaster. Tower cap `#4f8459`. Atlas 1024 px, 33 kB.
- Left out on purpose: Admin's west side face (a tree stands in front of its stone base), and every face the renders don't show (backs reuse the side strips, as the spec says).

### Round 1 (16 Nov): Admin 5.5/10, NAB 5/10
Sheets: `compare/model_admin_v1.png`, `model_nab_v1.png` (render | model at the render camera), `*_v1_rot4.png` (map camera, 4 rotations), `*_v1_plan.png` (plan view with the data footprint in yellow). Map views: `compare/m3_admin_rot1_1280x800.jpg`, `compare/m3_nab_rot2_1280x800.jpg`. (These file names were used by Phase 3R round 1 too; those sheets are in git at `phase3-before-sprites`.)

**Sizes against the real footprints** (the models are built on the data parts, so the outline matches by construction; heights from the data floors × 3.6 m):

| Building | Part (data) | Size (m) | Floors | Model eave / deck (m above ground) |
|---|---|---|---|---|
| Admin | 2, centre + wings | 59.8 × 44.4 | 3 | wings 10.8, centre 11.6 (0.8 m raised band); roof ridge 19.4 |
| Admin | 0, west end block | 23.0 × 22.3 | 4 | 14.4 |
| Admin | 1, west end block | 27.0 × 13.2 | 4 | 14.4 |
| Admin | 3, east end block (emblem) | 24.3 × 14.4 | 3 | 10.8 |
| NAB | 1, slab | 59.6 × 18.0 | 4 | 14.4 |
| NAB | 0 and 2, end blocks | 40.8 × 30.3, 28.4 × 21.5 | 5 | 18.0 |
| NAB | 3, annex | 12.7 × 10.7 | 4 | 14.4 |
| NAB | towers (6.4 m square) | — | 6 (block + 1) | 22.2, pavilion cap top 28.6 |

**Admin round 1**
| Item | Render | Model, round 1 | Next |
|---|---|---|---|
| Floor and roof proportions | Centre block 4 floors, wings 3, end blocks 4 | Data floors: centre part 3, east block 3, west blocks 4. The centre reads lower than in the render | **For H A:** the data says 3 floors for the centre part and the east block; the render shows 4. The data wins unless you change it |
| Roof pitch, eaves, fascia | 22°, deep white fascia | 22°, 0.8 m eaves, 0.45 m white fascia, ridge caps. From the map camera the big data footprint makes a very large roof | Lower the rear range so the front range carries the green |
| Colours | Warm white, sage roof, teal glass | Roof from the render sample on a neutral ribbed texture; walls white from the atlas | Roof a touch darker |
| Windows and bays | End blocks nearly blank, a few small high windows | End side faces carry the render's own strip (window band at the top, blank middle) | — |
| Glass | Tall teal strips, 2-storey curtain bay | Teal strips and the curtain bay cut from the render, 0.5 m proud, with a slight sheen | Curtain tile shows one painted column; crop tighter |
| Stone | Light grey stone at the base | The render's stone tiled on the plinths and beside the bay, 0.12–0.15 m proud | — |
| Balconies and corridors | Deep corridors, dark slabs, glass rails | Real-depth corridors on the front; the sides and back use the corridor strip as a flat wall | Recess the side corridors too |
| Emblem | Round green emblem high on the east block | The render's emblem as a decal on the east block's front | — |
| Entrance and canopy | Columns over an open porch | Columns and beam; glazed door on the west block from the render | — |
| Forecourt | Rounded-triangle lawn with a ring, plaza | Round lawn, ring path, flag, lamps, cars (viewer only). On the map the road data still loops across the plaza | Draw that stretch of road as paving on the map |

**NAB round 1**
| Item | Render | Model, round 1 | Next |
|---|---|---|---|
| Floor and roof proportions | One long 4-floor slab, towers at the ends | Data: 4-floor slab between 5-floor end blocks standing forward, so only about 22 m of the slab front shows | Carry the front's pieces across the end blocks' lawn-side faces |
| Roof | Flat, thin parapet, grey units | Flat decks with parapets, two grey units | — |
| Colours | White, warm tan stone, teal glass | White from the atlas (shaded end face balanced to white), stone and glass from the render | — |
| Windows and bays | Square windows in deep white frames, pairs | The render's own window bay on every plain wall (3 m bays, one per floor) | — |
| Glass | Full-height atrium, glazed strips | Atrium and strips cut from the render, 0.6 m and 0.3 m proud, white side frames | Wider atrium once the front runs across the end blocks |
| Stone | Two big tan panels | The render's stone, 0.15 m proud, both sides of the atrium | Larger panels with the wider front |
| Towers | White, one floor higher, open pavilion, green cap | One floor above their 5-floor blocks, teal strip from the render, window strips on the other faces, cap colour from the render | — |
| Emblem | On the left stone panel | The render's emblem, 3.1 m | — |
| Entrance and canopy | White canopies | Centre door canopy on two posts (side porches need more than 46 m of front) | Porches on the end blocks' fronts |
| Podium | Base strip, lawn strip, trees | None | Base strip and lawn strip |

**Checked:**
- In the browser: 4 rotations (SE → NE → NW → SW → SE, badge follows); tapping Admin and NAB selects them; search "NAB" opens its card; `?place=admin` opens Admin's card; the Hostels chip filters. The pane was hidden, so the rotation animation was stepped by hand.
- Performance: High 51 draw calls / 1.16 M triangles at the default view; Medium 81 calls / 1.49 M triangles at a closer view (budget 150 / 1.5 M: triangles are at the limit, mostly forest). Facade atlases 56 kB so far. Real frame times still need a phone (`?fps=1`).
- Known: opened with `?view=…,<rot>`, the Rotate badge shows SE until the first press (the 3D view itself is right).

---

## Phase 3M v2: real campus (16 Nov 2026)
- **H A's verdict on round 1:** "very different" from the real buildings, because it was built from the Gemini renders. The render-based round is kept at tag `phase3m-render-round1` (9259dbd).
- New spec: `reference/style/REAL_CAMPUS_MODELS.md`. From now on every score is against **real** photos and drone frames, target 8–9/10.
- The render-based facade atlases for Admin and NAB were removed (`public/data/facades.json` is empty, the WebPs deleted), so Admin and NAB are on their procedural walls until real-photo strips replace them. A test now refuses any facade sourced from a Gemini render.

### Stop point 1 study (16 Nov 2026)
- **Real-building sheets:** `reference/real/admin.md|jpg|_fit.png`, `reference/real/nab.md|jpg|_fit.png`. Footprints fit the hi-res satellite within the pin-fit error (about 5 m).
- **Real facts that change the models:**
  - Admin centre and end blocks have 4 floors, the wings 3; data part 3 has 3 (proposal in LAYOUT_CHECK).
  - The Admin centre is banded glass between white slabs, with no curtain wall.
  - The stone on both buildings is tan sandstone.
  - The NAB towers are stone-faced.
  - The NAB doors are on the SE face.
- **Road widths** (measured on H A's hi-res screenshots with their scale bars, `scripts/grid-crop.mjs`; checked on drone stills):

  | Road | Measured | Now (hardscape.json) | Before (renderer) |
  |---|---|---|---|
  | Main campus road | asphalt 9 ± 1 m at the lake and at the gate; plus about 8 m between edge lines on the loop road by the Octagonal Hall (first logged as "by Cafe Cloud": that drone still shows the Octagonal Hall) | **10.5 m** kerb to kerb, plus a 2 m pavement on the east (Admin) side and a 1 m verge on the west | 7.8 m plus kerbs |
  | Hostel hairpin (`rd-fblock`) | asphalt 7 ± 1 m | **7.5 m**, plus a 1.2 m strip | 7.8 m |
  | Campus loop road | not measured | 9 m (by eye) | 7.8 m |
  | Service roads | not measured | 6.5 m | 4.4 m |
  | Footpaths | not measured | 2.6 m | 2.2 m |

  32 tight spots, where a wider road would come within 1 m of a footprint, are narrowed locally; they are listed in `hardscape.json → tightSpots`. Buildings never move.
- **Scholar's Path:** 780 m from the main gate along the east side of the main road, then the data's zig-zag past the courts to D Block. Teal roof, 3 m wide. It is drawn on the map as a teal-roofed walkway along its full run; the posts and railings get modelled later.

## Phase 3M v2: Admin + NAB, modelled from the real buildings
Sheets: `reference/style/compare/real_<id>_v<N>.png` (real photo | model at a matched camera; the cameras are in `scripts/compare-model.mjs → REAL`).
Models: `src/render3d/landmarks/admin.ts` and `nab.ts`, rebuilt from `reference/real/<id>.md`, with the real-campus kit pieces in `kit.ts` (sandstone, mullioned glass, punched windows, the Admin corridor gallery, the real emblem colours, a `glassReal` material tinted to the photos' dark teal).

### Round 1 (16 Nov)
**Admin, 6.5/10 against the real building**
| Item | Difference from the photos |
|---|---|
| Footprint, floors, heights | Right: end blocks and centre block 4 floors, wings 3 (3.7 m floors, 0.6 m plinth); centre block the tallest hip |
| Roof | Hip roofs, deep white eaves and fascias; the green is a little light |
| Wings | Corridor galleries with sandstone piers, rails and teal canopies read as the real ones. **Wrong:** the east wing runs in front of the east block; in the photos the end blocks stand ahead of the wings |
| Centre block | Glass bands between white slabs over a columned portico: right |
| End blocks | Glass strip by the wing, sandstone ground floor, small punched windows on the sides, emblem with letters on the east block: right |
| Forecourt | A rectangle of pavers; the real one is a horseshoe drive round the oval lawn |
| Camera | The aerial needs to be closer, and the close view comes from the SW (fixed in the sheet) |

**NAB, 7/10**
| Item | Difference from the photos |
|---|---|
| Front rhythm | Tower · stone panel (glass bay inner side, emblem on the SW one) · white block (canopy, two windows, stair head) · faceted atrium under the big pyramid · mirror: right, after laying the front on the photo's rhythm (stone 4 m ahead of the white centre) instead of the data parts' steps. The data's SW annex (part 3) is clipped at the stone line |
| Heights | 3 storeys at the lawn front (about 11.7 m), towers about 18 m plus the box storey and caps: matches the straight-on still |
| Glass | Darker after the `glassReal` material; still a touch bright |
| Missing | Front plaza and lawn in the viewer; the back (NW) face is unknown (photo list) |

### Round 2 (16 Nov)
- **Admin:**
  - The wings now run only between the end blocks, which stand ahead of them as in the photos; the end-block extents are projected on the front.
  - Each end block's glass strip and entrance sit on its south face, with the small punched windows on the sides.
  - A horseshoe paver drive runs round the oval lawn.
  - The roof is a darker green-teal (#287565).
  - The aerial camera is matched closer (fov 22).
- **NAB:**
  - The front plaza and lawn are in the viewer.
  - Framing ignores ground-level geometry.

### Round 3 (16 Nov), scores against the real buildings
**Admin, 8/10.**
- **Good:**
  - massing and heights (4 / 3 / 4 / 3 / 4 floors across the front);
  - the hip roofs with deep white eaves;
  - galleries with sandstone piers and teal canopies;
  - banded-glass centre over the portico;
  - glass strips;
  - the emblem with letters;
  - sandstone ground floors;
  - the horseshoe forecourt.
- **Still off:**
  - the forecourt hedge, topiary and conifers are missing;
  - the emblem has no sunburst rays (a plain ring);
  - the centre block's glass reads as 3 equal bays, but the photo shows about 4 narrower ones;
  - no portico steps or parking cars at the real spots;
  - the rear hall and back faces are unknown.

**NAB, 8/10.**
- **Good:**
  - the whole SE front, bay by bay, matches the straight-on still: towers, stone panels with glass bays, the emblem, the white blocks with canopies and stair heads, the faceted atrium under the big pyramid;
  - heights.
- **Still off:**
  - the end blocks' stepped data outline still shows as white boxes behind the stone line from the oblique view;
  - the side and back windows are generic (no photos);
  - the stone texture is a little too busy for the tycoon finish.

**Aerial match** (`aerial_match_v2.png`, map with the free camera `?cam=` matched to DJI_0338 and Image_363):
- **Matches:** Cafe Cloud on the left, the main road and the Scholar's Path bending past Admin, NAB behind and left, Admin facing the camera.
- **Differences (for the whole-campus stage):**
  - the terraced garden and stone retaining walls between the road and Admin are missing;
  - the forest is much denser than the real scattered pines and open grass;
  - the forecourt detail on the map is simpler than in the viewer.

Other sheets:
- `real_admin_v1–3.png`, `real_nab_v1–3.png`;
- `model_<id>_v3_rot4.png` and `_plan.png`;
- `m3v2_admin_nab_rot0/rot2.png` (map, 1280×800).


## Phase 3M v2: the other landmarks, rounds 1–3 (16 Nov)
Modules:
- `src/render3d/landmarks/octagons.ts`: Cafe Cloud, Octagonal Hall, Mess;
- `hostels.ts`: D Block, and the F Block design shared by Hostels 2–4;
- `smaller.ts`: Gym, the gate and guard room, Dr. Kalam Centre.

The kit gained octagon helpers (`octagonIn`, `octRoof` with ridge caps, `octWalls`). The gate portal moved out of `props.ts` into the guard-room landmark.

Sheets: `real_<id>_v1–3.png`; map views `m3v2_landmarks_north/courts/gate.png`.

| Landmark | Score vs real | Main remaining differences |
|---|---|---|
| Cafe Cloud | 7.5 | Real fascia ring is plainer and the window band has more white piers; porch block small |
| Octagonal Hall | 7.5 (on the data's 18 m footprint) | Real hall is about 27 m across and stands on the loop road (LAYOUT_CHECK 6); walls straight on unknown |
| Hostel 1, D Block | 7 | Balconies too regular and too teal; real walls show more white; stair heads and the entrance not seen |
| Hostel 2, F Block | 7.5 | Real peach is lighter; balcony slabs rounder; stair-tower cap pavilion simpler in the model |
| Hostels 3, 4 | 6.5 (F Block design, no photos of their own) | Need photos |
| Students' Mess | 7 (from above only) | No ground photo: walls and doors by eye |
| Sports Pavilion & Gym | 8 | Fence and court furniture belong to the courts stage |
| Main gate + guard room | 7.5 | Lettering is a band; the guard room sits beside the portal rather than under it |
| Dr. Kalam Centre | 6 | One close photo only: the massing, roof and other faces are guesses |
| Amul Cafe, Commercial Complex, Kalam Building | generic | No usable photos (on H A's list) |


## Phase 3M v2: the rest of the campus, stop point 3 (16 Nov)
- **Hardscape on the map:** the flat items in hardscape.json (plazas, parking, courtyards, garden terraces, court surrounds, footpaths, the lake trail) are painted into the ground texture (src/render/world.ts). The upright items (retaining and terrace walls with railings, hedges, raised flower beds, fences, floodlights, steps, tree lines, lamp rows, the D Block and Mess covered walkways) are 3D props (src/render3d/hardscape3d.ts).
- **Staff quarters (Type 2 and Type 3):** white 3-storey blocks with light-teal hip roofs and white eaves on stone retaining plinths, from the staff-housing drone still (smaller.ts, buildQuarters). About 7.5/10 from the air.
- **Other buildings:** the west cluster, substation, service blocks, kiosks and the unnamed buildings stay on the generic builder; there are no photos of them. They read as plain white or cream blocks with green or grey roofs.
- **Forest:** the dense forest beside Admin is outside the campus boundary, and DJI_0338 shows pine forest there too, so it is unchanged. The open grass and scattered pines inside the campus are left for the SCENE_LOOK pass.
- **Checks:** aerial_match_v3.png (DJI_0338, Image_363) and m3v2_campus_default_rot0/rot2.png (the default view in 2 rotations).
- **Still owed:** H A's campus_new photos (they override every earlier source); the Octagonal Hall position and size (LAYOUT_CHECK 6); Amul Cafe, the Commercial Complex and the Kalam Building (no photos).
