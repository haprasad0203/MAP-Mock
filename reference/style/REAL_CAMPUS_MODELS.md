# Phase 3M v2: model the REAL campus from real images (H A, 16 Nov, final)

**H A's verdict on round 1:** "Very different." The models were built from the Gemini renders, and the renders are not the real buildings.

**New direction:**
- **Base:** every building, path, pavement and terrace is modelled from the **real campus** (photos, drone shots, satellite screenshots, map data, our tracings). **The Gemini renders are NOT the base.** They are only a reference for the tycoon *finish* (soft light, colours, chunky bevelled game look), never for shape, layout or details.
- **Target:** **8–9/10 likeness to the real buildings** (judged against real photos and drone shots), finished in the tycoon style.
- **Scope:** then the whole map: every hostel, quarter, small building, pavement, path, terrace and garden. Then the next phases (scene look, 3B, 4).
- **Don't work on phone speed, LOD or performance budgets now.** Leave performance as it is; it's a later stage.
- **Time is short** (conference 27 Nov). Work steadily and keep the stop points short.

Supersedes:
- the render-as-base parts of BUILD_LANDMARKS_3D.md and REFINE_LANDMARKS.md;
- LANDMARK_SPRITES.md.

Still useful, reuse them:
- the facade-strip and atlas tools, the `?model=` viewer and the compare script;
- the kit helpers;
- SCENE_LOOK.md (for the overall look, later).

## 1. Read and study every real source (don't skip any)
- **Drone and aerial:**
  - `reference/photos/aerial/` (DJI_0338-0000-01.jpg, Image_363.jpeg, yt-drone-62s);
  - `reference/photos/academic-admin/`, `sports/`, `lake-and-landmarks/`, `staff-housing/` (yt-drone frames);
  - `reference/photos/SOURCES.md`: YouTube drone video timestamps. Open them in Chrome, step through the frames and capture stills of every building, path and terrace into `reference/photos/video_frames/<topic>/`. Use these for study only.
- **Ground photos:**
  - `reference/photos/hostels/` (DSC_9111, 9119, 9140, 9144, New-Hostel, IMG_7184, hostel22);
  - **all of** `IIM_Shillong_Campus_References/` (the official photos, folders 01–10);
  - `reference/generated/crops/`.
- **H A's new photos and videos:** `reference/photos/campus_new/<building>/` as they arrive.
  - They are the **highest-priority source** for the buildings they cover.
  - Extract stills from the videos (ffmpeg): corners, straight-on walls, entrances, roofs.
- **From above:**
  - `reference/IIM_Shillong_Campus_Map_Pack/01_satellite_screenshots/` (and its README);
  - `reference/photos/mess_from_above.png`;
  - `reference/layout/` (check_01–03, zoom_A–H, check_mess, check_admin_zoom, overview_roads, layout_v2_topdown).
- **Map data:**
  - `public/data/campus-layout.json`, `osm.json`, `terrain.json`;
  - `reference/osm/export_2026-11-13/`, `reference/overture/export_2026-11-13/`;
  - `reference/layout/LAYOUT_INVENTORY.md` and `LAYOUT_CHECK.md`.
- **Notes:** `reference/photos/BUILDING_NOTES.md`, `reference/generated/LOOKS_LIKE.md` (re-check every line against the photos; **photos win**).
- **Google Maps in Chrome:** look only, to understand. Don't trace or copy outlines from Google imagery. Place features by eye and by their relationship to existing data (roads, footprints).

## 2. Two outputs from the study (stop point 1, show H A)

### 2a. Real-building sheets: `reference/real/<building-id>.md` + `reference/real/<building-id>.jpg`
For each building, a photo montage of every real view, each labelled with its source. Then the measured facts:
- **Footprint and fit:** the footprint from the data, drawn over the drone or satellite view, and whether it fits (any error goes to LAYOUT_CHECK.md as a proposal for H A; don't edit campus-layout.json yourself).
- **Floors:** floors counted per wing from the photos; floor height (from photos or drone shadows, usually 3.4–3.8 m); ground-floor and plinth height; any wing at a different height.
- **Per face (N, E, S, W), from the photos:**
  - the number of window bays;
  - window size and shape;
  - frames;
  - glass bays and curtain walls;
  - stone areas;
  - balconies and corridors (open or closed, rail type);
  - stair towers and their glass;
  - entrances, porches and canopies;
  - signs and the emblem;
  - rooftop structures.
- **Roof:** the form per wing (hip, gable, flat, octagon), pitch, eaves, fascia, colour.
- **Colours:** sampled from real photos in good light, as hex values: walls, trim, stone, glass, roof, rails.
- **Surroundings:** the building's own surroundings (plazas, steps, ramps, retaining walls, planters, parking, fences).
- **Gaps:** what is still unknown, which goes on H A's photo list.

### 2b. A hardscape and landscape map: a new file, `public/data/hardscape.json`
This is new and authored by you. **Don't edit campus-layout.json.** Study the satellite screenshots, drone frames and photos, and add by eye, snapped to existing roads and footprints:
- paved plazas and forecourts;
- pavements and kerbs along roads;
- paved footpaths and walkways;
- **the scholar's path** (ask H A exactly which path this is if it isn't clear from the sources);
- steps and ramps;
- retaining and terrace walls, and the terraced slopes;
- parking bays;
- courtyards;
- covered walkways (the teal one and the brown one at D Block);
- court surrounds, the football ground fence and floodlights;
- the lake edge and trail;
- gardens and flower beds;
- hedges;
- the flag forecourt;
- the Kalam statue garden terraces;
- fences, gates and railings;
- notable tree lines.

Each item has a type, material, colour, height or width, and its source. Make a top-down check image of it over the satellite screenshots, `reference/real/hardscape_check.png`.

Stop point 1: show H A the Admin and NAB real-building sheets, plus the hardscape check image. Ask the open questions (including where the scholar's path is) and wait.

## 3. Modelling the real buildings
- **Shape:**
  - each building is a hand-authored module on its real footprint (`src/render3d/landmarks/<id>.ts`, shared kit);
  - real floors and heights;
  - each face built from its real-building sheet: bay counts, windows, glass, stone, balconies and corridors, towers, entrances, rooftop structures.

  **Real geometry for anything with depth**: recesses, corridors, balconies, glass bays, towers, canopies, parapets, eaves, steps, roofs.
- **Textures from real photos:**
  - rectify straight-on wall photos into wall strips (base, typical floor, top; bay tiles) with the existing extract tool, then **give them the tycoon finish**: even out the light, simplify the colours to clean flats, sharpen the window and frame edges, remove clutter (cables, stains, people, cars);
  - where no straight photo exists, build the facade procedurally from the measured bay layout in the real colours.

  Never use Gemini render pixels on a wall.
- **Tycoon finish:**
  - bevelled edges;
  - soft warm light and shadow;
  - clean saturated-but-real colours;
  - chunky readable details (as in `tycoon_style_target.png` and the approved renders' finish).

  The shape and details stay real.
- **Gemini:** may be used only for tileable materials (paving, stone, grass, roof tiles) if needed. No buildings.

## 4. The comparison loop, against REAL images
- **Viewer:** `?model=<id>` with the camera matched to a real drone or ground photo of that building. Reproduce the photo's viewpoint (position, direction, focal length) as closely as you can, and save the camera in `reference/real/<id>.md`.
- **Sheet:** `compare-model.mjs` makes `reference/style/compare/real_<id>_v<N>.png`: the real photo or drone crop | the model from the same viewpoint, for 2 viewpoints per landmark (one aerial, one ground).
- **Aerial match:** set the map camera to approximate the DJI_0338 and Image_363 viewpoints. Screenshot the whole modelled area and put it side by side with those photos (`reference/style/compare/aerial_match_v<N>.png`). This is the best whole-campus check.
- **STYLE_LOG.md:** differences per item (footprint fit, floors and heights, roof form and pitch, bays and windows per face, glass, stone, balconies and corridors, towers, entrances, rooftop, colours, surroundings and hardscape). Score out of 10 against the **real** building.
- **Rounds:** at least 3 per landmark. **Target at least 8/10** before moving on, aiming for 9.

## 5. Order of work
1. **Study** (section 2), then stop point 1.
2. **Admin + NAB**, up to 3 rounds, then **stop point 2** (real-vs-model sheets, aerial match, 4 rotations).
3. **The other landmarks:** Hostel 1 (D Block), Hostel 2 (F Block), Hostel 3, Hostel 4, Students' Mess, Cafe Cloud + Amul Cafe, Octagonal Hall, Dr. Kalam Centre, Kalam Building, Commercial Complex, Sports Pavilion & Gym, main gate and guard room.
4. **The rest of the built campus:**
   - **Buildings:** Type 2 and Type 3 quarters, the west cluster, the substation, service blocks, kiosks, the court-side buildings, every small unnamed building.
   - **Courts and grounds:** the courts with their markings, the football ground with its fence and floodlights.
   - **Walkways, lake and gardens:** the covered walkways, the lake edge and trail, the Kalam statue garden, the flag forecourt.
   - **Everything else in hardscape.json.**

   Then **stop point 3**: the whole-campus aerial match and screenshots, at the default view in 2 rotations.
5. **SCENE_LOOK.md passes:** the overall tycoon light, colour, trees, life and tilt-shift.
6. **Phase 3B:** blue dot, directions, ON AIR, event pins, room changes, list view.
7. **Phase 4.**

## 6. Rules
- Work only in the phase-3 worktree. Commit after each building and step, and don't merge until H A approves.
- `campus-layout.json`, `places.json` and `osm.json` aren't edited by you. Propose fixes in LAYOUT_CHECK.md. New data goes in `hardscape.json`.
- No QGIS, no Google Maps API, nothing traced from Google imagery.
- Never type passwords.
- Not now: phone speed, LOD, performance budgets, low-end tuning (later stage; note it in IMPLEMENTATION_PLAN.md).
- Record in IMPLEMENTATION_PLAN.md that this file replaces the render-based approach, and the new order of work.
