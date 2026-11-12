# Restyle spec: make the campus map look like a 3D tycoon game

**Target image:** `reference/style/tycoon_style_target.png`. Match its STYLE exactly. Don't copy its SUBJECT: it shows a desert river city (sand, palms, a river). Ours is a green, misty hill campus in Shillong (pines, a lake, cream buildings with green roofs).

**Order of work:**
1. Load and verify the v2 layout (section 0). It's done for you; don't re-author it.
2. Regenerate the assets (section 3b).
3. Build the 3D engine (section 2).
4. Re-skin the UI.
5. Refine against the target (section 4).

**What stays the same:**
- the data schema and loaders: `src/geo/*`, `places.json`, `sessions.json`, `osm.json` (the schema gains a few optional fields, see 0.2; `campus-layout.json` v2 and `terrain.json` are already provided)
- the place list
- Survey mode
- the bottom sheet and the features

**Do NOT use any QGIS files.**

**What changes:**
- the renderer: a new Three.js 3D engine replaces the 2D pixel canvas
- the UI skin: from pixel to a soft, rounded game UI

---

## 0. The layout is already remapped (v2): use it, don't rebuild it
The old `campus-layout.json` was placed by eye and was wrong. It has been **replaced with v2**, authored from Overture building footprints, OSM roads, lake and courts, Google pins (names only), the drone photos and an open elevation model. Don't re-author it. Your job is to load it, render it faithfully and check it.

### 0.1 What you're given
| File | What it is |
|---|---|
| `public/data/campus-layout.json` (v2) | 73 buildings (29 named + 44 `unnamed`), 126 parts, 29 paths, 12 areas (incl. the lake), 28 entrances, 5 landmarks, the campus boundary. The Auditorium and the Library are INSIDE the Admin Block (one building). The kiosk by Cafe Cloud is Amul Cafe. The Kalam statue stands in the terraced garden south-east of the Admin Block. Same schema as before, plus new optional fields (below). |
| `public/data/places.json` | Updated `at` coordinates. New place `amul-cafe`. Hostel names confirmed: Hostel 1 = D Block, Hostel 2 = F Block, Hostel 3 = the north-ridge blocks, Hostel 4 = the block between D and F. Google's "Mithaas" pin is the Commercial Complex. Places `auditorium` and `library` and rooms AUD and LIB-R point to `admin`. |
| `public/data/terrain.json` | Height grid, 20 m step, ±1300 m, in metres above the lake (lake = 0). From SRTM, so it's coarse: smooth it. |
| `public/data/osm.json` | REPLACED: 122 roads (the full fresh OSM export + 3 Overture-only segments) + the lake and courts. Merged by `src/geo/source.ts` as before. Each road has `src`. |
| `reference/layout/LAYOUT_INVENTORY.md` | Source and confidence for every feature, plus the on-campus survey list. Read it first. |
| `reference/layout/check_01..03.png`, `zoom_A..F_*.png`, `layout_v2_topdown.png` | The v2 layout with every road, the lake and every label drawn over the satellite screenshots (whole campus + six close-ups), and a plain top-down. This is what "correct" looks like. |
| `reference/layout/generator/` | The Python scripts that built v2 (for reference; you don't need to run them). |

### 0.2 New optional fields: add them to `src/geo/types.ts`
- `Part.poly?: [number, number][]`: the true footprint polygon in local metres. In 3D, **extrude `poly`** (with a hip/gable roof fitted to its minimum rectangle `cx, cy, w, d, angle`). The 2D engine keeps using the rectangle.
- `Part.src?: string`: provenance only.
- `Building.groundElev?: number`: ground height above the lake. Building pads sit at this height; flatten the terrain under each footprint to it.
- `Building.unnamed?: boolean`: draw these buildings plainly, never label them, keep them out of search and hit-tests (or make them inert).
- `CampusLayout.version`, `note`, `attribution`: show the attribution in the map's info/credits.
- Paths with ids `fp-*` are short entrance connectors. Make sure the router uses them.

### 0.3 Check it (don't skip)
1. Add a `?debug=layout` top-down view that draws the layout plainly with labels, entrances and path ids. Screenshot it and compare with `reference/layout/layout_v2_topdown.png`: they must match.
2. Run the data tests and extend `src/data/data.test.ts`:
   - every `buildingId`, `areaId` and `landmarkId` in places and rooms exists;
   - every entrance is within 3 m of the path network;
   - the network (OSM roads + layout paths) has one main component that reaches every entrance;
   - no place pin is outside the boundary except the ATM.
3. Only fix something if it is clearly wrong against the check images or drone photos. Log every change in `reference/layout/LAYOUT_CHECK.md` (what, why, evidence). Don't move buildings to "look nicer".
4. Items marked Low in the inventory stay flagged `confirm` for Survey mode on campus.

## 1. The look, in words
Take these from the target image:

1. **A miniature diorama feel.** The world looks like a detailed tabletop model photographed with a tilt-shift lens. A sharp horizontal band across the middle, with a smooth, strong blur toward the top and bottom edges.
2. **Warm golden-hour light.** A low sun (about 25–30° elevation) from the south-west, warm amber-white (#FFD9A3). Long, soft, slightly blue-tinted shadows. Every building has one sunlit face and one shadowed face with clear contrast.
3. **A rich, saturated, warm grade.** Greens are lush and warm (not grey). The water is deep teal-blue. Roofs and walls are slightly warmed. The overall image has a gentle orange/teal balance. Use ACES filmic tone mapping and a soft vignette.
4. **Dense, crafted detail.** Buildings have window grids, frames, balconies, rooftop units, entrances and canopies. Roads have lane markings and kerbs. Trees are clustered in groves. Small props everywhere: cars, street lamps, benches, flags, buses, tiny people.
5. **Clean, chunky forms.** Low-poly but smooth: slightly bevelled box edges, crisp silhouettes, no noisy textures. It should look like a polished mobile tycoon / city-builder game (Townscaper / SimCity BuildIt / Pocket City quality).
6. **Atmospheric depth.** Warm haze in the distance. Hills around the campus fade into a soft blue-green mist, so the world never has a hard edge.

### Adapting it to IIM Shillong
- **Ground:** rolling green hills and terraced slopes, not sand. Lawns are bright warm green; wild meadow is a slightly yellow-green; forest floor is darker.
- **Trees:** dense pine forests (Khasi pine): tall, layered dark-green cones in groves. Use a few broad-leaf and cherry trees around lawns. **No palm trees.**
- **Water:** the campus lake gets the target's water look: deep teal centre, lighter edges, a soft shoreline highlight, gentle animated ripples, and the sky reflected.
- **Buildings** (colours and forms from `reference/photos/BUILDING_NOTES.md`):
  - **Admin Block:** white/cream walls, 4 floors, three wings, green hipped roofs, a glass curtain-wall centre bay, a flag forecourt.
  - **NAB:** a long white 4-floor block with a flat roof and green parapet, brown stone stair towers with green caps, a teal glass atrium.
  - **Auditorium:** a wide cream hall with a big dark slate-grey sloping roof, a glass foyer and a red-brick plaza.
  - **Hostels (Hostel 1 · D Block, Hostel 2 · F Block, Hostel 3 on the north ridge, Hostel 4 between D and F):** cream/peach plaster, brown stone-clad base and pillars, full-height blue glass stairwells, balconies, green hipped roofs, white eaves.
  - **Octagonal pavilion:** white walls, glass, a two-tier green octagonal roof.
  - **Type 2 Quarters:** small white 3-storey blocks with teal roofs, terraced on a hairpin road.
  - **Covered walkway:** a teal-roofed zig-zag walkway.
  - **Courts:** green courts with red surrounds and blue keys. The football ground is fenced, with floodlights.
- **Roads:** dark warm-grey asphalt with thin white edge lines and a dashed centre line on main roads; lighter paved footpaths; a red-brick plaza at the auditorium.

## 2. Technical approach

### Engine
- Add `three` and `postprocessing` (pmndrs). Build `src/render3d/Engine3D.ts` with the SAME public API as `MapEngine`, so `CampusPage.tsx` only swaps the class:
  - `setFilter`, `setSelected`, `setLayers`
  - `rotate`, `recentre`, `flyTo`, `zoomBy`
  - `screenToWorld`, `worldToScreen`, `hitTest`, `destroy`
  - the `view`, `pins` and `filter` fields
- Keep the old 2D `MapEngine` as the low-end fallback.
- **Camera:** a perspective camera with a narrow FOV (about 22°), so it reads almost isometric with a slight miniature perspective.
  - About 52° pitch down and 45° yaw.
  - Rotate in 90° steps with a 600 ms eased tween.
  - Zoom by dollying, between campus overview and building close-up; pinch, wheel and inertia as now.
- Render on demand: only when the view changes or an animation is running. Cap the device pixel ratio at 2 on desktop and 1.5 on phones.

### World build (from the existing `WorldModel` / `CampusGeometrySource`)
- **Terrain:** a heightfield mesh from `public/data/terrain.json`.
  - Smooth the DEM (about 2 cells, Gaussian), keep the real hill shape: lake low, academic core +5–12 m, hostels +18–33 m, north ridge about +50 m.
  - Flatten a pad under every building to its `groundElev`, and flatten courts, the football ground, plazas and road beds, so nothing floats or sinks. Add retaining-wall edges where pads cut into the slope (the campus is terraced).
  - Beyond the DEM area, continue with gentle noise hills that fade into mist.
  - Keep the vertical scale real (1×) or at most 1.3× for drama; GPS and routes must still line up in plan view.
  - Vertex colours or a baked DataTexture from `world.mask` ground classes: lawn, meadow, forest floor, road, path, plaza, court, parking, water bed.
  - Soft colour noise so large areas never look flat.
- **Roads and paths:** ribbon meshes along `paths`, slightly above the terrain.
  - Width by kind (road about 7 m, service about 4.5 m, footpath about 2.2 m).
  - Kerbs, edge lines and centre dashes via a small procedural texture.
  - Covered walkways get a teal roof on posts.
- **Buildings:** for each `Part`:
  - extrude `poly` (the true footprint) to floors × 3.4 m with slightly bevelled edges; if `poly` is missing, use a bevelled box w × d rotated by `angle`;
  - a roof mesh per `RoofType` (hip, gable, flat with parapet, shed, octagon), with eaves overhanging 0.4–0.6 m;
  - a procedural facade CanvasTexture per wall colour: window rows per floor, frames, sills, darker glass with a slight sky tint, a stone base where `stoneBase`, stone towers where `stoneTowers`;
  - glass parts (`glass: 'stair' | 'atrium'`): a transparent blue-teal material with environment reflection;
  - `balconies`: thin slabs with railings on the long faces;
  - rooftop clutter on flat roofs (AC units, water tanks, small solar panels), placed with a seed so it's stable.
  - Merge static geometry per area to cut draw calls.
- **Trees:** instanced pines (2–3 stacked low-poly cones on a trunk, 3 size and colour variants) from the existing tree clusters and the campus trees. Dense groves outside the campus, scattered rows inside. A slight wind sway in the vertex shader (cheap).
- **Water:** the lake from `areas` (kind 'water'). A custom shader: depth colour from shore distance, fresnel sky reflection, scrolling normal ripples, a soft shoreline foam ring.
- **Props** (instanced):
  - cars parked and a few moving slowly along roads; a bus at the gate
  - street lamps along roads, benches on plazas, the flagpole with flag at the Admin forecourt
  - court lines, goalposts, floodlight masts, the water tank, the substation, the gate with its green pitched roof
  - a handful of tiny walking people on footpaths
- **Sky and atmosphere:** a gradient sky dome (warm horizon #F6D8A8 to soft blue #9EC3E6), distance fog in warm haze, and an extra low-lying mist layer over the valleys and the outer hills.

### Lighting
- A DirectionalLight (sun), warm #FFD9A3, intensity tuned for ACES, from the south-west at about 28° elevation.
- Soft shadows: PCFSoft, a 2048 map with the shadow camera fitted to the visible area.
- A HemisphereLight with sky #BFD9F2 and ground #6E5E40 for soft fill.
- Window glass and glass stairwells get a faint warm emissive at dusk.
- Optional "real time" mode moves the sun with the clock: golden hour by default, dusk after 4:45 pm with windows lit.

### Post-processing (the "look")
In order:
1. **SSAO / N8AO:** soft contact shadows where buildings meet the ground.
2. **Tilt-shift depth of field:**
   - a sharp band across the middle 35–45% of the screen, blurring smoothly to strong at the top and bottom edges;
   - stronger when zoomed out (the miniature feel), weaker when zoomed in;
   - turned OFF while navigating and when a place card is open, so labels stay readable.
3. **Bloom:** subtle, only on bright highlights and lit windows.
4. **Colour grade:** ACES filmic, +10–15% saturation, warm white balance, slight lift in the shadows toward teal.
5. **Vignette:** soft.

### Labels, pins, selection and route
- **Labels:** HTML overlay or SDF sprites. Rounded pill tags in Inter 600, white with deep-green text (#0F4D32) or green with white text, a small tail pointing to the roof, a soft drop shadow. Show and hide by `labelPriority` and zoom, and avoid collisions as the current engine does.
- **Selected building:** a warm yellow (#FFD23F) outline glow, a slight lift, and a soft pulse on its footprint.
- **"You":** a small stylised character or a blue disc with a white rim, a pulsing accuracy ring on the ground, and a heading cone.
- **Route:** a glowing yellow (#FFD23F) ribbon just above the path, with chevrons moving toward the destination and a pin at the entrance.
- **ON AIR:** a small glowing red/white sign above buildings with running sessions.

### UI skin (match the game feel)
- Replace the pixel font and the hard pixel shadows: Inter everywhere, 12–16 px rounded corners, soft layered shadows, frosted-glass panels (backdrop blur) over the map.
- Buttons: chunky, rounded and tactile (pressed state), 44 px or larger, icons in a rounded stroke style.
- Colours: deep green #0F4D32 as primary, yellow #FFD23F for highlights and the route, warm white panels.

### Quality tiers (performance)
| Tier | When | What's on |
|---|---|---|
| High | Desktop, strong phones | Shadows, AO, tilt-shift, bloom, animated water, moving cars and people |
| Medium | Mid-range phones (default) | Shadows (1024), tilt-shift, simple water; no AO, no bloom |
| Low | Weak phones | No shadows or post; baked shading only |
| Fallback | No WebGL2 / very weak | The existing 2D `MapEngine` |

Auto-pick the tier from GPU, memory and a frame-time probe, and allow switching in Layers. Target: 30 fps or better while panning on a mid-range Android phone (test with Chrome CPU throttling 4×), and the first frame within 3 seconds on 4G.

## 3. Optional: a Gemini mood frame (use the Gemini tab in Chrome)
Attach `reference/style/tycoon_style_target.png` and `reference/photos/aerial/DJI_0338-0000-01.jpg`, then prompt:

> "An isometric 3D video game world map of the IIM Shillong campus at Umsawli, Meghalaya, India, designed as a clean background asset for a campus-explorer tycoon mobile game. Match the exact art style, lighting and colour grading of the first attached image: highly stylized, vibrant, beautifully detailed modern 3D tycoon game look with a strong tilt-shift miniature effect. Use the second attached photo for the real buildings and layout. Rolling green hills covered in dense pine forest instead of desert; a small calm teal lake with a walking trail instead of a river; cream and white multi-storey academic blocks with green hipped roofs; a long white academic block with brown stone stair towers and a teal glass atrium; a wide auditorium with a dark slate-grey roof and red-brick plaza; hostel blocks with brown stone-clad pillars, blue glass stairwells and green roofs on the northern ridge; green and red sports courts, a fenced football ground with floodlights; winding dark asphalt roads with white lines; cars, street lamps and tiny people. Warm, cinematic golden-hour lighting casting soft long shadows, light mist in the valleys. Sharp focus on the campus centre, clean edges. Vertical 9:16. Pure environment art, no text, no UI elements, no words, masterpiece."

Save the result as `reference/style/gemini_campus_mood.png` and use it as a second target for colours and composition. The real map still comes from our layout data, so GPS and routes line up.

## 3b. Assets to REGENERATE in the new style (required)
Every existing generated asset is pixel art, and none of it matches the new look. Regenerate what the 3D map needs. Use ONE new Gemini chat called "IIM Shillong tycoon assets" and attach `reference/style/tycoon_style_target.png` to every request, so the style stays consistent.

**Retire, but keep, for the 2D fallback:**
- Move `public/campus-art/*.png` (admin-block, nab, auditorium, hostel, cafe-pavilion) to `public/campus-art/pixel/` and repoint the old 2D engine to it.
- Mark `reference/generated/style-tile.png` as legacy pixel.
- Don't use any of these in the 3D engine.

**Regenerate:**

| # | Asset | Used for | How |
|---|---|---|---|
| 1 | Campus mood frame | Style and colour target for the whole map | Section 3 prompt |
| 2 | Landmark reference renders: Admin Block, NAB, Auditorium, F Block / U Tirot Sing hostel, D Block hostel, octagonal pavilion, main gate | (a) Visual target for modelling and material tuning of each 3D building; (b) the new place-card thumbnails (replacing the pixel thumbnails) | Prompt A below, attaching the target plus the building's real photo from `reference/photos/` |
| 3 | Seamless textures (tileable, 1024 px): cream-plaster facade with window grid, white facade with blue glass, brown stone cladding, green roof tiles, slate-grey roof, red-brick plaza, asphalt, lawn grass, pine forest floor | Building facades, roofs, plaza, roads and terrain detail | Prompt B below |
| 4 | Category and map icons: venue, food, hostel, sports, ATM, medical, help desk, parking, gate, statue, ON AIR badge | Pins and filter chips | Draw these as code SVG in a rounded game style (crisper than AI). Gemini only for a style reference if needed. |
| 5 | Tiny-life sprites or models: cars, bus, people, flag | Props | Build in code as low-poly instanced meshes, no Gemini |

**Prompt A (landmark render):**
> "Using the exact art style, lighting and colour grading of the first attached image (a stylised 3D tycoon game world), create a single isometric 3D game asset of <building name> from the IIM Shillong campus, matching the real building in the second attached photo: <walls>, <roof>, <floors> floors, <distinctive features from BUILDING_NOTES.md>. 3/4 isometric view from the south-east, on a small base of lawn, path and two pine trees. Warm golden-hour sun from the left, soft long shadow. Plain flat white background, centred, no text, no people, sharp focus (no tilt-shift blur on this asset)."

**Prompt B (texture):**
> "Seamless tileable texture, perfectly flat front-on view, no perspective, no shadows, no lighting gradient, stylised mobile-game style matching the colours of the attached image: <texture description, e.g. 'cream plaster building facade with a regular grid of dark blue-tinted windows with white frames, 4 windows wide, 1 floor tall'>. 1:1 square."

**Processing:** write `scripts/process-asset.mjs` (sharp):
- **Renders:** remove the white background, trim, export WebP at 512 px for thumbnails.
- **Textures:** check the tile seams (offset by 50% and look), fix by cross-fading the edges if needed, resize to a power of two, export WebP.
- Save everything under `public/campus-art/tycoon/`.
- Log every asset in `reference/generated/GENERATED.md` under a new "Tycoon style" section: prompt, attached references, output file, where it's used.

**Downloads from Gemini:** last time Chrome blocked repeated downloads. If that happens again, STOP and ask me to allow "Automatic downloads" for gemini.google.com in Chrome site settings. Don't fall back to low-resolution screen captures for textures.

**Fallback:** if a regenerated asset can't be made consistent after 2 tries, build that look procedurally in code instead, and note it in the log.

## 4. How to check it's right
After each pass, screenshot the map at 390×844 and 1280×800. Save the screenshots next to the target in `reference/style/compare/` and score them in `reference/style/STYLE_LOG.md`:
- [ ] Warm golden light, with clear sunlit and shadowed faces
- [ ] Long, soft shadows on the ground
- [ ] Tilt-shift band: a sharp middle and blurred top and bottom
- [ ] Rich warm greens, a teal lake, a saturated but clean grade
- [ ] Buildings detailed (windows, roofs, stone towers, glass stairwells) and recognisable from the photos
- [ ] Dense pine groves; the world fades into mist with no hard edge
- [ ] Roads with markings; props and tiny life visible when zoomed in
- [ ] Labels crisp and readable on a phone; selection and route clear
- [ ] 30 fps or better on a mid-range phone at the Medium tier
Do at least 3 refinement passes against the target before reporting.
