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
