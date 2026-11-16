# Implementation plan: layout v2 + tycoon 3D restyle (13 Nov 2026)

Source: `reference/MASTER_PROMPT.md` and `reference/style/RESTYLE_TYCOON.md`. Each phase stops for the organiser's OK and ends with a commit.

1. **Phase 1, data.**
   - Add the v2 optional fields to `src/geo/types.ts` (`poly`, `src`, `groundElev`, `unnamed`, `version`, `note`, `attribution`).
   - The loader accepts v2 and still merges `osm.json`. Survey transforms also move `poly`.
   - The 2D map renders v2. `unnamed` buildings have no label, no hit-test and no Survey target.
   - The credits show OSM, Overture, Google Open Buildings and Microsoft.
   - Add the `?debug=layout` top-down view.
   - Add the section 0.3 data tests (references, including sessions; entrances on the main network; pins inside the boundary within 10 m, ATM excepted).
   - Data problems are logged in `reference/layout/LAYOUT_CHECK.md` and never "fixed" by moving buildings.
2. **Phase 2, assets.**
   - Pixel sprites move to `public/campus-art/pixel/`.
   - Gemini (Chrome) produces the mood frame, 7 landmark renders and 9 seamless textures.
   - `scripts/process-asset.mjs` processes them into `public/campus-art/tycoon/`, logged in `GENERATED.md`.
   - Icons are code SVG.
3. **Phase 3, 3D engine.**
   - `src/render3d/Engine3D.ts` (Three.js + postprocessing) has the same public API as `MapEngine`.
   - World: terrain from `terrain.json` with flattened pads, extruded `poly` footprints, road ribbons, the lake shader and instanced pines.
   - Look: golden-hour light, tilt-shift, AO, bloom and the ACES grade.
   - Quality tiers, with the 2D engine as fallback.
   - All existing features keep working.
4. **Phase 4, UI skin and refinement.**
   - Soft, rounded game UI.
   - At least 3 scored passes at 390×844 and 1280×800, saved in `reference/style/compare/` and scored in `STYLE_LOG.md`.
   - 30 fps or better at the Medium tier.

Note: `scripts/build-layout.mjs` (the v1 generator) was moved to `reference/layout/build-layout.v1.mjs` so it can't overwrite v2.

---

# Phase 3M v2: model the REAL campus (16 Nov 2026, H A, final)

Spec: `reference/style/REAL_CAMPUS_MODELS.md`. **It replaces the render-based approach**: the render-as-base parts of BUILD_LANDMARKS_3D.md and REFINE_LANDMARKS.md, and LANDMARK_SPRITES.md. Round 1 (built from the Gemini renders) was "very different" from the real buildings; it is kept at tag `phase3m-render-round1` (9259dbd).
- **Base:** real photos, drone frames, satellite screenshots (study and check only, never traced), map data and our tracings. The Gemini renders are only a guide to the tycoon finish. Target 8–9/10 likeness to the real buildings, judged against real photos.
- **No Gemini pixels on walls:** the render-based Admin and NAB facade atlases were removed. Walls come from rectified real photos (with the tycoon finish), or procedurally from measured bay layouts in real colours.
- **H A's own photos and videos** arrive on 17 Nov in `reference/photos/campus_new/<building>/` and override every earlier source: the real-building sheets and hardscape.json are updated from them. Stills come from `scripts/video-stills.mjs` (headless Edge, no ffmpeg).
- **Order of work:**
  1. Study every real source → `reference/real/SOURCES_INVENTORY.md`, the real-building sheets (`reference/real/<id>.md|jpg`), `public/data/hardscape.json` (with real road widths and the full Scholar's Path) and its check image → **stop point 1**.
  2. Admin + NAB, at least 3 rounds against real photos (aerial and ground viewpoints) → **stop point 2** (real-vs-model sheets, aerial match, 4 rotations).
  3. The other landmarks: Hostel 1 (D Block), Hostel 2 (F Block), Hostel 3, Hostel 4, Students' Mess, Cafe Cloud + Amul Cafe, Octagonal Hall, Dr. Kalam Centre, Kalam Building, Commercial Complex, Sports Pavilion & Gym, main gate and guard room. At least 8/10 each.
  4. The rest of the built campus: quarters, small buildings, courts and grounds, walkways, lake and gardens, everything in hardscape.json → **stop point 3** (whole-campus aerial match, default view in 2 rotations).
  5. SCENE_LOOK.md passes. 6. Phase 3B. 7. Phase 4.
- **Later stage (not now):** phone speed, LOD, performance budgets and low-end tuning. Performance stays as it is until then.

---

# Phase 3M: code-built 3D landmarks painted with the approved renders (16 Nov 2026, H A's final decision; superseded by Phase 3M v2 above)

Spec: `reference/style/BUILD_LANDMARKS_3D.md` (supersedes LANDMARK_SPRITES.md and REFINE_LANDMARKS.md sections 1–2; REFINE_LANDMARKS sections 3–4 and SCENE_LOOK.md still apply).
- The sprite attempt (Phase 3S) is kept at tag `phase3-sprites-attempt`; the branch was reset to `phase3-before-sprites` (300542a).
- Brought back from the tag: the full-size cut-outs (`reference/generated/cutouts/`, masks only) and their script (`scripts/make-cutouts.mjs`), and SCENE_LOOK.md. Not brought back: the sprite rendering, `sprites.json`, the sprite-edit view, the 32° map camera and the rotation lock.
- Rotation is unlocked again (4 directions, 600 ms eased).
- Facade pixels come from the original PNG renders in `reference/generated/raw/tycoon/`; the cut-outs are only masks.
- Stop 1: Admin + NAB facade atlases and round-1 models, then H A's review.

## Later stage: landmarks v2
1. **H A's videos:** they go in `D:\Map Mock\reference\photos\campus_new\<building-id>\`. Extract frames (ffmpeg), rectify real walls the same way, and replace or extend the facade strips, especially the back walls.
2. **The guessed buildings:** redo the Kalam Centre, Commercial Complex and Mess walls from H A's footage.
3. **Higher-resolution facades** for the closest zoom.
4. **Optional dusk mode** with lit windows.
5. **Known mismatches to revisit then:** where a render's outline or door position doesn't match the real footprint and `entrances` (the data wins), and the light painted into the renders that the extraction evens out.

---

# Phase 3 fix-up (13 Nov 2026, after H A's review)

- **Data:** `public/data/campus-layout.json` synced from the master working tree (football on grass, generic buildings unnamed, west-cluster at priority 3). `places.json`, `osm.json`, `terrain.json` and `sessions.json` already matched.
- **Light and grade:** sun #FFD9A3 at 26° from the south-west, stronger against a cooler fill, so shadows are long and clear; an orange/teal split tone after ACES (`WarmGrade` in `post.ts`); warm mist.
- **Colours:** deeper warm grass, darker pines with wider variation, sage roofs with no gloss.
- **Phase 2 assets:** all nine textures and the SVG icons are now used (see `reference/generated/GENERATED.md`).
- **Fixes:** Mess roofs lighter slate, dimming is relative to each material; the Admin main wing has a low hip with a raised centre pavilion; the tilt-shift band is wider, and wider still on portrait screens; the credits have their own strip between the sheet and the tab bar (two lines on phones); flick speed is capped.
- **Tested through the UI:** chip click, rotate button, wheel zoom, drag with glide, pinch (two-pointer events), saved view after reload, `?demo=hooks` route on screen. High tier ran at 16.7 ms per frame in the visible preview at 1280×800.
- **Dev switch added:** `?view=cx,cy,level,rot`.
- Screenshots next to the style target: `reference/style/compare/phase3_fix_*.jpg`.

**Order changed by H A:** the 3B features (blue dot, directions, ON AIR, event pins, room changes, list view) come next, because of the 27 Nov deadline. Hardscape and street furniture (entrance patios, plazas, retaining walls, lamps, benches) move to Phase 4.

---

# Phase 3 result (13 Nov 2026)

Built as planned below, with these differences:

| Planned | Built | Why |
|---|---|---|
| `sky.ts`: sky dome, distance fog, low mist layer | A mist ring around the campus (`installMist` in `lighting.ts`); no sky dome, no valley mist | The camera looks down at 52° with a 22° lens, so the horizon is never on screen. Camera-distance fog follows the camera; the ring hides the world's edge wherever you pan |
| `groundTexture.ts` with detail from the grass, forest-floor and brick textures | `ground.ts`: one baked colour texture, no detail textures | Left for the Phase 4 polish |
| Roads textured with `tex-asphalt`, lines in a shader | Flat-coloured stacked ribbons (kerb, edge line, asphalt, dash) in `roads.ts` | Stacking keeps junctions clean without a shader |
| PCF soft shadows | Plain PCF | Three.js 0.187 has removed the soft mode |
| `render3d/quality.ts` | `src/render/quality.ts` | It must load before Three.js does |
| Benches | Not built | Too small to read at map zoom |
| Selection: outline glow | Warm glow on the building's own materials plus a yellow ring on its pad that pulses for 1.6 s | No extra render pass; works on every tier |
| Medium: tilt-shift, flat water | Tilt-shift, the same lake shader without animation | The shader costs nothing extra |

Switches: `/campus?q=high|medium|low|2d`, `?fps=1` (frame-time box), `?demo=hooks` (sample route, blue dot and ON AIR tag). The Layers panel has the same choice as "Map detail"; "Automatic" starts from the device and steps down if moving frames are slow.

Checked in the preview at 1280×800 and 375×812: search card, `?place=`, `?room=`, filter dimming, selection, rotation, the 2D fallback, Survey, `?debug=layout`. `npm test` (21 tests) and `npm run build` pass. Screenshots: `reference/style/compare/phase3_final_*.jpg`.

Not done: a frame-time measurement on a real phone (the preview pane can't give one), and the scored comparison against the style target (Phase 4).

---

# Phase 3 plan (detailed): the 3D tycoon engine (13 Nov 2026)

## Context
Phases 1 (layout v2 data) and 2 (tycoon assets) are done and committed (`18fdd87`). The Campus page still draws with the 2D pixel engine (`src/render/engine.ts`). Phase 3 of `reference/MASTER_PROMPT.md` replaces it with a Three.js engine that renders the same layout data in the stylised tycoon look of `reference/style/tycoon_style_target.png`, per `reference/style/RESTYLE_TYCOON.md` section 2.

**Scope (decided by H A, 13 Nov):** the 3D engine plus the features that work today: search, filter chips, place cards, deep links (`?place=`, `?room=`), rotate/recentre, Layers, Survey mode, and the 2D engine as fallback. The blue dot, follow mode, directions/reroute, ON AIR signs, event pins, room-change signs and the list view were never built; they are **not** in Phase 3. The engine only gets the hooks they will need (route ribbon, "you" marker, ON AIR sign), shown with a dev flag. UI re-skin, moving cars/people and the scored refinement passes stay in Phase 4.

## Approved by H A (13 Nov 2026) with these changes
- **Data first:** re-read `public/data`; keep render-side overrides only where the data still differs from LOOKS_LIKE, and list them in `LAYOUT_CHECK.md`.
- **Checkpoint:** after terrain + buildings + roofs (step 3), stop and show screenshots (whole campus, Admin + NAB, the hostels) before lighting and post-processing.
- **Surroundings:** the off-campus Overture footprints (outside the boundary, inside the terrain area) are drawn as plain low village houses: no labels, no hit-test, one merged mesh, cheap material. `scripts/build-surroundings.mjs` writes them to `public/data/surroundings.json`, so the app never loads the big GeoJSON.
- **Phone test:** the dev server runs with `--host`; H A opens the local network URL on a phone on the same Wi-Fi and reports the frame time shown on screen (`?fps=1`).

## Rules carried over
- Positions, footprints and heights come only from `public/data/campus-layout.json` v2, `osm.json` and `terrain.json`. No layout data is edited.
- Colours and forms come from `reference/generated/LOOKS_LIKE.md` (photos win over satellite). The `landmark-*.webp` renders and mood frame v2 are visual targets only.
- The layout data already carries the green Admin roof, the four slate-roofed Mess octagons and the flat-roofed Hostel 1 with a stone base (data update of 13 Nov). Render-side overrides are used only where the data still cannot say what LOOKS_LIKE says, and each one is listed in `reference/layout/LAYOUT_CHECK.md`: the lantern tier on `cafe-cloud`, `octagon-hall` and the big Mess hall; NAB towers white with the stone on panels (`stoneTowers` in the data).
- Kalam Centre, Commercial Complex and the Mess walls use the plain campus style and stay "to confirm".
- Vertical scale 1× (real), so GPS and routes line up later.

## Design

**Dependencies:** `three`, `postprocessing`, `n8ao` (AO pass for the High tier), `@types/three`. Three is loaded by dynamic import so the 2D fallback and Survey page don't pay for it.

**Shared engine interface.** New `src/render/engineApi.ts` holds `View`, `Pin`, `Layers`, `EngineOptions` (moved out of `engine.ts`) and `IMapEngine`: `view`, `pins`, `filter`, `selected`, `tier`, `setFilter`, `setSelected`, `setLayers`, `rotate`, `recentre`, `flyTo(at, level, ms, fx, fy)`, `zoomBy`, `screenToWorld`, `worldToScreen`, `hitTest`, `invalidate`, `destroy`. `MapEngine` implements it unchanged. `View` keeps `{cx, cy, level, rot}`; in 3D, `level` indexes the same `LEVELS` table (`src/render/iso.ts`) and is converted to camera distance so one level shows the same ground width as in 2D. Saved views, `fly(at, 6)` calls and `tierOf` keep working as they are.

**Coordinates.** Three x = east, y = up, z = −north. One `heightAt(x, y)` function places everything (buildings, roads, trees, props, labels, markers). `worldToScreen(x, y, z)` treats `z` as height above the ground; `screenToWorld` raycasts the terrain.

**Reused as is:** `buildWorld` / `WorldModel` (`src/render/world.ts`: ground-class mask, `campusTrees`, `partCorners`), `CampusGeometrySource` (`src/geo/source.ts`), `hash2` / `valueNoise` (`src/render/noise.ts`), `LEVELS` / `tierOf`, the textures and icons in `public/campus-art/tycoon/`.

### New files (`src/render3d/`)
| File | What it does |
|---|---|
| `Engine3D.ts` | Renderer, camera, input, render-on-demand loop, public API |
| `camera.ts` | Perspective camera, FOV 22°, pitch 52°, yaw 45° + 90° × rot. Level ↔ distance, 600 ms eased rotation, fly-to with screen-fraction offset, pan clamp. Pure maths, unit-tested |
| `terrain.ts` | Loads `terrain.json`, Gaussian smooth (2 cells), bilinear sample, then flattening: building pads to `groundElev` (footprint + 3 m, 8 m blend), courts / football / plazas / lawns to their mean, lake to 0 with a shore blend, road beds levelled across their width. Exports `heightAt`. Mesh: 4 m grid over the campus, 20 m to ±1300 m, then a noise-hill skirt that fades into fog |
| `groundTexture.ts` | Bakes the ground colour from `world.mask` (lawn, meadow, forest floor, plaza, court, earth, parking) with soft colour noise; detail from `tex-lawn-grass`, `tex-pine-forest-floor`, `tex-plaza-red-brick` |
| `buildings.ts` | Per part: extrude `poly` to floors × 3.4 m from `groundElev`, with a 3 m skirt below so nothing floats on slopes; rectangle fallback when `poly` is missing. Wall UVs by perimeter and floor so the facade textures show one window row per floor. Stone ground floor where `stoneBase`, teal glass material for `glass` parts, balcony slabs and rails on long faces, retaining-wall edge where a pad cuts the slope |
| `roofs.ts` | Hip, gable, shed (fitted to `cx, cy, w, d, angle`, 0.5 m eaves, white fascia), flat with parapet and seeded rooftop clutter (follows `poly`), octagon with optional lantern tier. Hip on a footprint that fills under 75% of its rectangle uses an inset-polygon roof instead, so no roof hangs over empty ground |
| `buildingStyles.ts` | The per-building look table from LOOKS_LIKE.md (the overrides listed above, wall and roof materials, emblem, towers) |
| `roads.ts` | Ribbon meshes draped on the terrain: road 7.8 m with kerb, edge lines and centre dash in the shader over `tex-asphalt`; service 4.4 m; footpath 2.2 m; track. Covered walkway: teal roof on posts |
| `water.ts` | Lake shader: depth colour from shore distance, fresnel sky tint, scrolling ripples, shoreline foam. Simple flat teal on Medium/Low |
| `trees.ts` | Instanced pines, 3 variants. Campus trees from `world.campusTrees`; dense forest outside the boundary from noise on wild ground. Count capped by tier (about 40k / 20k / 8k) |
| `props.ts` | Static, instanced, seeded: flag mast and flag, lamps along `road` lines, parked cars and a bus at the gate, the gate with its green roof, water tank, Kalam statue on a plinth, goalposts and floodlight, court lines, benches |
| `sky.ts` | Gradient sky dome, warm distance fog, low mist layer |
| `lighting.ts` | Sun #FFD9A3 from the south-west at 28°, PCF soft shadows with the shadow camera fitted to the visible ground (updated only when the view changes), hemisphere fill |
| `post.ts` | Composer: N8AO → tilt-shift (stronger zoomed out, off while a place is selected) → bloom → ACES + saturation + warm balance → vignette |
| `labels.ts` | HTML overlay over the canvas: rounded pill tags with category dot and tail, shown by `labelPriority` and tier, collision-avoided as in the 2D engine, clickable. Never blurred by tilt-shift |
| `markers.ts` | Selection (yellow #FFD23F outline glow + footprint pulse) and filter dimming. Hooks for later phases: `setRoute(pts)`, `setUser({at, accuracy, heading})`, `setOnAir(buildingIds)`; shown only with `?demo=hooks` |
| `quality.ts` | Tier pick: no WebGL2 → 2D engine; otherwise from device memory, cores, phone/desktop and a 30-frame probe that steps down if slow. `?q=high|medium|low|2d` and a Layers control override it; the choice is saved |

Each named building is one group (merged geometry per material) so it can be selected and dimmed alone; the 42 unnamed buildings merge into one mesh and are skipped by labels and hit-tests.

**Quality tiers**
| Tier | On |
|---|---|
| High | Shadows 2048, AO, tilt-shift, bloom, animated water and tree sway (30 fps idle loop), DPR ≤ 2 |
| Medium (phone default) | Shadows 1024, tilt-shift, flat water, render on demand only, DPR ≤ 1.5 |
| Low | No shadows or post; ACES only |
| Fallback | The existing 2D `MapEngine` |

### Changed files
- `src/ui/CampusPage.tsx`: create the engine through a small factory (3D by tier, else 2D); the canvas is keyed by engine kind because a canvas can't switch from 2D to WebGL. Layers panel: quality selector; "Illustrated landmarks" shown only in 2D. Updated canvas `aria-label`. Attribution line unchanged.
- `src/ui/BottomSheet.tsx`: place-card thumbnail from `landmark-<id>.webp` where one exists.
- `src/render/engine.ts`: import the shared types, `implements IMapEngine`. No behaviour change.
- `src/styles.css`: label pill and thumbnail styles only (the full re-skin is Phase 4).
- `package.json`: the new dependencies.
- `reference/IMPLEMENTATION_PLAN.md`, `reference/layout/LAYOUT_CHECK.md` (render overrides), `reference/generated/GENERATED.md` (which textures the engine uses).

## Order of work
1. Plan into `reference/IMPLEMENTATION_PLAN.md`; install dependencies; `engineApi.ts`.
2. Engine shell, camera and input, terrain with the baked ground texture. Check: top-down matches `layout_v2_topdown.png`.
3. Buildings, roofs and the style table. Check each landmark against its `reference/generated/compare/` sheet.
4. Roads, covered walkway, lake, trees, props, sky.
5. Lighting, post-processing, quality tiers.
6. Labels, selection, filter dimming, hit-test, hooks; swap into `CampusPage`; thumbnails.
7. Verify, update the docs, commit ("Phase 3: 3D tycoon engine"), then stop for review with screenshots.

## Verification
- `npm test`: existing 13 data tests plus new ones: `heightAt` equals `groundElev` at every building centre (±0.2 m), the lake is 0, Hostel 3 > Hostel 2 > Hostel 1; roof and footprint builders give valid geometry for all 124 parts; camera `screenToWorld(worldToScreen(p))` round-trips; level ↔ distance matches `LEVELS`.
- `npm run build` passes (type check included).
- In the preview (`preview_start` "campus") at 390×844 and 1280×800, no console errors, and each of these works: pan / pinch / wheel / inertia, rotate ×4, recentre, search → fly → place card, room search, all filter chips, tap a building, tap a pin label, `?place=mess`, `?room=AUD`, share link, saved view restored on reload, Layers toggles, `/organizer/survey`, `?debug=layout`.
- `?q=high`, `?q=medium`, `?q=low`, `?q=2d` each render; the 2D fallback behaves as before.
- Frame time and draw-call count reported per tier from the preview. A real mid-range phone test is still needed and will be flagged as not done.
- Screenshots saved to `reference/style/compare/phase3_*.png` and shown for review.

## Not in Phase 3
GPS blue dot, follow mode, walking graph and directions, ON AIR / event pins / room-change signs, list view, offline; the UI re-skin, moving cars and people, day/dusk mode, and the scored refinement passes (Phase 4).

---

# Previous plan (pixel)

# Campus map: implementation plan (standalone mock in D:\Map Mock)

## Context
The WMC 2026 app needs a Campus page: a full-screen pixel-art isometric map of IIM Shillong (Umsawli). Delegates use it to find buildings and rooms, see themselves on the map, and walk to sessions. It must work offline. The feature spec is in `Campus_Map_ClaudeCode_Kit/.../reference/PLAN_campus_map.md` and the build instructions are in `PROMPT_campus_map.md`.

`D:\Map Mock` does not contain the WMC app repo. The user chose to **build a standalone mock here**, structured so it can be dropped into the WMC app later as one route. Because the app's real session, venue and mess data isn't here, the mock uses JSON fixtures behind adapters, so the real data can be plugged in later without changing the map code.

The user has already copied the official photos into `D:\Map Mock\IIM_Shillong_Campus_References\` (aerial/drone, hostels, sports, mess, library, classrooms, guest house, gallery, classroom PDF). Gemini art is generated **only when needed**.

Confirmed by the user:
- **NAB** is the building after (behind) the Admin building: the 4-floor white block with stone towers on the Google "IIM SHILLONG" pin. The front building with the flagpole forecourt is the **Admin Block**.
- **Hostels by elevation:** the lowest hostel is **Hostel 1**, then **Hostel 2**, then **Hostel 3**, going uphill. Elevation is checked on Google Street View and in photos, and per-building `elevation` is stored in the layout.
- **Exteriors only.** No interiors, no indoor 3D and no floor plans. Arrival shows the floor as text ("Room 104 is on the 1st floor"). Classroom and interior photos are ignored.
- **Google Maps photos and Street View** (opened in Chrome) are allowed as art reference for the gate, the street approach, NAB, the hostels and everything else. They're never shipped and never traced for coordinates.

What the photos show (this goes into BUILDING_NOTES.md):
- **Admin block:** white/cream, 3–4 floors, green hipped roofs, glass curtain-wall centre bay with a flagpole forecourt, and a terraced circular garden in front.
- **Academic block (behind admin, "IIM SHILLONG" pin):** white, 4 floors, stone-clad towers, glass stairwells, green caps.
- **Round pavilion:** octagonal, two-tier green roof; probably Dr. Kalam Centre or the cafe (to confirm).
- **New hostels:** cream plaster, brown stone-clad base and pillars, full-height blue glass stairwell, balconies, 5 floors, green roofs.
- **Courts:** green playing area with a red/pink surround and blue keys.
- **To confirm:** `IMG_7184-Final.jpg` may show the old campus.

## Scope for this round
Only **Phases 0, 1 and 2** are built now. The work stops after Phase 2 with screenshots and a summary. Phases 3–6 below are kept for reference and are not started.

To save usage:
- Keep browser screenshots to a minimum (use page text where possible, plus one 390 px and one 1280 px screenshot per check).
- Generate Gemini art only if the code-rendered landmarks look weak.

## Stack
Vite + React 18 + TypeScript, with Canvas 2D (no map SDK, no Google API). The app shell is plain CSS modules with Inter, and Pixelify Sans for map labels. Zustand holds map and UI state. `vite-plugin-pwa` (Workbox) handles offline. `sharp` (dev only) processes sprites. Vitest covers the geometry, routing and transform code.

## Project layout
```
D:\Map Mock\
  reference\                      # kit reference copied here + photos/ + generated/ + IMPLEMENTATION_PLAN.md
  public\campus-art\              # processed sprites (Gemini or code-baked)
  public\data\                    # campus-layout.json, places.json, sessions.json, mess.json, live.json
  scripts\process-sprite.mjs      # bg removal + palette quantise (sharp)
  src\
    app\  (App shell, mock bottom tab bar, routes: /campus, /sessions, /home, /organizer/survey)
    geo\  (CampusGeometrySource interface, SchematicSurveySource, OsmSource, QgisGeoJsonSource,
           local metric grid <-> lat/lon, similarity/affine fit)
    data\ (PlacesSource, ScheduleSource, LiveSource adapters + fixture implementations)
    render\ (iso projection, chunk cache, terrain/forest/mist, buildings, props, labels, sprites, animation loop)
    nav\  (walking graph, A*, snapping, rerouting, step text with landmarks)
    location\ (watchPosition, smoothing, geofence, follow mode)
    ui\   (SearchBar, FilterChips, ControlStack, BottomSheet [OnNow | PlaceCard | Route], LayersPanel, ListView, Map2D)
    survey\ (Survey mode screen)
```

## Phase 0: Reference completion (no app code)
1. Copy the kit's `reference/` folder to `D:\Map Mock\reference\`. Organise the user's photos under `reference/photos/<area>/` by copying, not moving.
2. Fill the gaps from the web, exteriors only: the main gate and the street approach (Street View), NAB, Hostels 1–3, D Block, F Block, U Tirot Sing, the Auditorium, Dr. Kalam Centre, the mess and commercial complex, the lake, the Kalam statue and the courts.
   - Sources: Google Maps place photos and Street View in Chrome (saved through screenshots or zoom), iimshillong.ac.in pages, inauguration news articles and YouTube frames.
   - Download with curl, or through Chrome if curl is refused. Skip photos of people.
   - Record the relative elevation of the hostels to confirm the 1/2/3 order.
3. Write `reference/photos/SOURCES.md` and `reference/photos/BUILDING_NOTES.md` (wall colour, roof, floors, features, entrances, and "to confirm on campus" where unsure).
4. Query OSM Overpass for bbox 25.610,91.945,25.624,91.962 and record the coverage. If it's useful, use it and show the attribution.
5. Save this plan as `reference/IMPLEMENTATION_PLAN.md`.

## Phase 1: Data layer and Survey mode
- **Local metric grid:** origin 25.6176, 91.9522 (an equirectangular ENU approximation, which is accurate to under 1 m at this scale).
- **`CampusGeometrySource` interface:** `getBuildings()`, `getPaths()`, `getAreas()` (lake, grounds, courts, parking), `getTrees()`, `getEntrances()`, `getBounds()`.
  - Implementations: `SchematicSurveySource` (now), `OsmSource` (if coverage is useful), and `QgisGeoJsonSource` (stub, EPSG:4326).
  - Rendering, routing and search read only from this interface.
- **`campus-layout.json`:** hand-authored by eye from the satellite arrangement and photos, not traced.
  - About 25 buildings (polygon, floors, roof type and colour, wall colour, label, category).
  - Roads and footpaths as polylines, the lake, the football ground, the courts and the tree clusters.
- **`places.json`:** the place list from the README.
  - Reconcile it with the app names (Admin Block, NAB, Hostels 1–4, blocks A–O) using aliases.
  - Add room codes mapped to building and floor, as a fixture.
  - Exclude Lariti and every off-campus neighbour, and add a unit test that fails if any of them appears.
- **Survey mode (`/organizer/survey`, behind a mock organiser flag):**
  - Pick a target (entrance, junction or landmark) and tap "Save this point as…". The app averages GPS fixes over about 20 s, drops fixes with accuracy over 15 m, and shows the spread.
  - Points are stored in localStorage and can be exported or imported as JSON.
  - A least-squares similarity fit (Umeyama, falling back to affine with 3 or more points) plus per-building nudges produces the transform `SchematicSurveySource` applies. Surveyed entrances become route end points.

## Phase 2: Pixel isometric renderer and core UI
- **Projection:** 2:1 isometric with 4 rotations.
  - The scene is drawn to an offscreen canvas at 1/3 device resolution, upscaled with `imageSmoothingEnabled=false` at integer scale steps, then given a 1 px dark-outline pass.
- **Chunk cache:** static layers (terrain, roads, buildings, trees) are baked into 256 px chunk canvases per rotation and per level of detail. Dynamic layers (labels, pins, the user, the route, ambient life) draw on top each frame. The loop pauses when idle.
- **World with no edge:** procedural pine forest and hill shading (value noise) beyond the campus bounds, fading into dithered mist toward the view edge. Neighbouring sites are drawn as forest.
- **Buildings:**
  - Extruded prisms with hip, gable or flat roofs, window rows per floor, stone bases, glass stairwell strips and name boards, all from the layout data.
  - Depth sort by isometric depth.
  - Gemini sprites replace landmark prisms only where they look better.
- **Detail levels:** Campus (blocks plus major labels) → Area (all labels and icons) → Building (windows, entrances, props), chosen by zoom.
- **Interaction:**
  - Pointer-event pan and pinch with momentum and clamped bounds; tap hit-testing on building footprints.
  - Animated fly-to; rotation in 90° steps with a crossfade.
  - The last view is saved to sessionStorage.
- **UI:**
  - Full-bleed layout with a floating search bar and filter chips (non-matching places dim), and a right-hand control stack (Locate, Rotate, Recentre/compass, Layers; all 44 px or larger).
  - A single bottom sheet with three states (On now, Place card, Route) and the mock app tab bar.
  - Style: 4 px corners, 2 px `#0F4D32` borders, hard offset shadows, `#FFD23F` accent, no gradients.
- **Search:** fuzzy matching over places, aliases, room codes, shops, services, and session and paper titles. Selecting a result flies the map there and opens the place card. The card shows what's inside, sessions now and next, hours and menu, a call button and a share link.
- **Gemini (Step 1, only if needed):** once the code-rendered landmarks are on screen, I'll judge them. If any look weak, I'll generate the style tile first, then those landmarks, in the Gemini tab in Chrome with photos attached.
  - Each result is processed by `scripts/process-sprite.mjs` (flood-fill background removal and palette quantise) and logged in `reference/generated/GENERATED.md`.
  - If the output is inconsistent, I'll keep the code-rendered buildings and tell you.

## Phase 3: Location and directions
- **Location:** `watchPosition` with high accuracy, requested only when you tap Locate or Directions.
  - Readings are smoothed (exponential smoothing weighted by accuracy), snapped to the nearest path within 20 m, and shown as a pixel character with an accuracy ring.
  - Tap Locate once to centre on yourself, twice to follow.
  - Outside the campus geofence, the map shows "Not on campus yet" with a link to the Guide's arrival plan.
- **Walking graph:** built from path polylines, with nodes at junctions and entrances and edges weighted by length × slope factor. Step-free edges are flagged so stairs can be avoided.
- **Routing:** A* to a building entrance, room or session. The route is drawn as a glowing pixel trail with a dashed pattern, so it doesn't rely on colour alone.
  - Directions name the nearest landmark ("Past the Kalam statue, then left") and show the minutes left.
  - The route is recomputed if you're more than 25 m off it.
  - On arrival: "You're at X. Room Y is on floor Z", as text only, with no floor plan.
  - Without GPS you can pick a start point.
- A dev-only GPS simulator (`?simgps=1`: drag a fake position) for testing off campus.

## Phase 4: Conference-live layer and deep links
- **`LiveSource`:** a fixture plus a polling interface. The simulated clock (`?now=2026-11-27T10:30`) doubles as the time slider.
- **On the map:**
  - Blinking ON AIR signs on buildings with sessions running; tapping one lists the rooms.
  - Event pins for registration, help desk, first aid, shuttle, cultural evening and the gala dinner.
  - Room-change signs; routes follow the new room.
  - "Lunch now" at the mess and crowd badges.
- **Deep links:** `/campus?place=<id>`, `?room=<code>`, `?route=<placeId|room|session:<id>>`.
  - The mock Session page, Home's "Up next", the mess menu and the help desk link into these.
  - Offline, live data shows "Last updated X min ago".

## Phase 5: Offline, fallback and performance
- **Offline:** Workbox precaches the app shell, the layout and place data, sprites and fonts (budget under 15 MB). A "Download campus map" prompt appears on first open. The schedule uses stale-while-revalidate.
- **Fallback:** a 2D top-down canvas view and an accessible list view, chosen automatically on weak devices (low `deviceMemory`/`hardwareConcurrency` or a slow first frame) or by toggle.
- **Performance:** check on throttled CPU in DevTools, cap chunk memory, check contrast at 4.5:1, and add ARIA labels throughout.

## Phase 6: Should and Could items
Layers panel extras, recent and saved places, volunteers, friend sharing, the day/dusk sky, mist and rain, ambient walkers, clouds and lake shimmer, the magnifier bubble, the campus tour and explore badges. The crowd heat map and alert pins go in the organiser view.

## Files reused
None: this is a new project. Existing material used: the kit `reference/` docs, the photos in `IIM_Shillong_Campus_References/`, and the satellite and style screenshots in the kit (view only, never traced).

## Verification (after every phase)
- `npm run dev` started with `preview_start` (`.claude/launch.json`). Check `/campus` in the browser pane at 390 px and 1280 px, take screenshots, fix what looks wrong, and send you a 5-line summary.
- `npm test` (Vitest): grid and lat/lon round-trip, the similarity fit recovering a known transform, A* on a toy graph, the 25 m reroute trigger, and no excluded names in the place data.
- Phase 3: the GPS simulator walks a route end to end and reaches the arrival message.
- Phase 5: `npm run build && npm run preview`, then reload offline in DevTools; the map, search, location simulator and directions still work.
- Definition of done: a delegate can open Campus, see themselves, search a room or tap Directions on a session, follow the trail to the entrance, and see the floor, all in airplane mode after one visit.
- Ask before any destructive change. Final report: what was built and what's stubbed, photos and art per building with the gaps, names needing organiser confirmation, and how to run Survey mode.

## Open questions for organisers (carried into the place data as "to confirm")
- Is the Auditorium separate from the Admin Block?
- How do blocks A–O, D Block, F Block and U Tirot Sing fit into Hostels 1–4? (Hostels 1–3 are ordered by elevation; Hostel 4 still needs confirming.)
- Where are the gate, the statue, the medical room and the help desk?
- Which room is in which building and on which floor?
- Where are the event spots?


# Phase 3B result (17 Nov 2026)
- **Walking graph and routing** (src/route/graph.ts): built from every walkable line (roads, service lanes, footpaths, tracks, the Scholar's Path, the hardscape footpaths and lake trail), with junction snapping, T-joins and building entrances. A* to a building's main entrance, or to the nearest point for grounds and landmarks. Every main entrance is reachable from the main gate (test).
- **Directions:** a banner with the next turn, named after the nearest landmark ("Past Main Gate, then left"), the metres to it, the minutes left and the room and floor. Rerouting happens more than 25 m off the route. On arrival: "You're at X. Room Y is on floor Z", as text only. Without GPS, Pick start lets you tap your position. The route is a wide yellow trail with a dark dashed centre line, drawn on top so it shows under the Scholar's Path roof.
- **Location** (src/route/location.ts): watchPosition with high accuracy, only after Locate or Directions. Fixes are smoothed, weighted by accuracy. Locate taps cycle centre → follow → off. Off campus shows "Not on campus yet" with a link to the arrival plan.
- **Simulator** (?simgps=1, dev): Sim: place me, then tap the map; Sim: walk route; Sim: stray 50 m tests the reroute. The headless check walks gate → NAB and reaches the arrival message (scripts/shots-3b.mjs).
- **Live layer** (src/data/live.ts + public/data/live.json, a LiveSource with polling):
  - ON AIR tags on buildings with a session running;
  - event pins for registration, help desk, first aid, the shuttle point, the cultural evening and the gala dinner, plus "Lunch now" at the mess during meals. They sit at existing places, and their exact spots are to confirm.
  - Room-change signs: search, cards, the list and routes all follow the new room.
  - Offline, the Layers panel shows when the live data was last updated. ?now= previews any moment of the conference.
- **List view** (src/ui/ListView.tsx): Layers → Show as a list, or ?list=1. Every place, grouped, with ON AIR, events, a Map button and a Go (directions) button.
- **Deep links:** ?route=<placeId | room | session:<id>>, alongside the existing ?place= and ?room=.
- **Not done:** step-free routing (no stair data yet), crowd badges, the automatic switch to the list view on weak devices (Phase 5), and real-phone GPS testing on campus. The NAB route ends at the data's SW-tip entrance (LAYOUT_CHECK 4 proposes the SE face).
