# Master prompt: new campus layout + tycoon 3D restyle

Paste the block below into Claude Code (started with `claude --chrome` in `D:\Map Mock`, Plan mode on).

---

You're working on the Campus map module of the Pan-IIM WMC 2026 app (IIM Shillong, Umsawli, 27–29 Nov 2026). There are two jobs, in this order:
1. Adopt the new, corrected campus layout.
2. Replace the pixel-art look with the stylised 3D tycoon look in `reference/style/tycoon_style_target.png`.

## Current status and which brief rules (updated 19 Nov 2026, H A)
- **Done:** Phase 1 (layout v2) and Phase 2 (tycoon assets: renders, textures, icons) are approved. The Phase 3 engine is built on the phase-3 branch, but its landmark buildings are being redone.
- **Now: Phase 3M v2 (real-campus modelling).** Follow `reference/style/REAL_CAMPUS_MODELS.md`: model every building, pavement, terrace and path from the **real campus**:
  - **Sources:** photos, drone shots and video stills, satellite screenshots, map data, and H A's new photos and videos in `reference/photos/campus_new/<building>/`, which take priority.
  - **Target:** 8–9/10 likeness to the real buildings, with the tycoon finish.
  - **Data:** a new `public/data/hardscape.json` for pavements, the full Scholar's Path and terraces.
  - **Roads:** main roads about 10–11 m wide.
- **Superseded, don't follow these for landmarks:** `LANDMARK_SPRITES.md` (flat pictures), `BUILD_LANDMARKS_3D.md` and `REFINE_LANDMARKS.md` (render-based models). The Gemini renders are only a guide to the *finish*, never for shapes or walls. The sprite attempt and the render-based round are kept at the tags `phase3-sprites-attempt` and `phase3m-render-round1`.
- **Still valid:** `SCENE_LOOK.md` (whole-scene look, after the buildings), `RESTYLE_TYCOON.md` sections 1–2 (look and engine), `LAYOUT_INVENTORY.md`, `LOOKS_LIKE.md` (photos win).
- **Scholar's Path** = the teal-roofed covered walkway, beside the main road on the right as you enter by the main gate, then up through the middle of campus.
- **Order from here:** 3M v2 (Admin + NAB, then all buildings and hardscape) → SCENE_LOOK passes → **Phase 3B** (below) → Phase 4.
  - **3B is partly built already:** the blue dot, directions, reroute, arrival and the list view work. What's left: event pins, live ON AIR, room-change signs, and the fixes from H A's end-to-end test (room cards, arrival room text, the off-campus blank map, search, the D Block–Mess path).
- **Not now:** phone speed, LOD, performance budgets and low-end tuning (a later stage). The Phase 4 fps target below is deferred.
- **Where the work happens:** the phase-3 worktree, branch `claude/phase-3-implementation-plan-a4d45a`, pushed to GitHub as `phase-3` (https://github.com/haprasad0203/MAP-Mock). Don't merge into master until H A approves.

**Read first, in this order:**
1. `reference/layout/LAYOUT_INVENTORY.md`: what the new layout contains, where each feature came from, and confidence levels.
2. `reference/style/RESTYLE_TYCOON.md`: the full spec. Section 0 covers the layout, sections 1–2 the look and engine, 3/3b the assets, 4 the checks.
3. `reference/style/tycoon_style_target.png`: the style target. Match its style, not its subject (ours is a green, misty pine-hill campus).
4. `reference/layout/check_01.png`, `check_02.png`, `check_03.png`, `layout_v2_topdown.png`: what the correct layout looks like over satellite.
5. `reference/photos/BUILDING_NOTES.md` and the photos in `reference/photos/` and `IIM_Shillong_Campus_References/`: what each building looks like.
6. `reference/PLAN_campus_map.md`: the features, which must all keep working.

**Already done for you (don't redo it):**
- `public/data/campus-layout.json` is now v2: Overture footprints + OSM roads/lake/courts + drone photos. Every part has a true footprint `poly`, and every building has `groundElev`.
- `public/data/places.json` has been updated to match.
- `public/data/terrain.json` is a new height grid (metres above the lake).
- The old layout is kept at `reference/layout/campus-layout.v1.json` for comparison only.
- Don't re-author the layout, and don't nudge buildings to look nicer. Change something only if it is clearly wrong against the check images or drone photos, and log every change in `reference/layout/LAYOUT_CHECK.md`.

**Work in phases. Stop after each phase, show me screenshots, and wait for my OK:**

**Phase 1: data.**
- Add the new optional fields to `src/geo/types.ts` (`poly`, `src`, `groundElev`, `unnamed`, `version`, `attribution`; see RESTYLE section 0.2).
- Make the loaders accept v2, and keep merging `osm.json`.
- Make the current 2D map render v2 without errors. `unnamed` buildings get no labels, no search and no hit-test.
- Add the `?debug=layout` top-down view and compare it with `layout_v2_topdown.png`.
- Extend `src/data/data.test.ts` with the checks in section 0.3. Run `npm test` and `npm run build`.

**Phase 2: assets.**
- Move the pixel sprites to `public/campus-art/pixel/` (the 2D fallback keeps using them).
- Regenerate the tycoon assets in the Gemini tab in Chrome, as in section 3b: mood frame, 7 landmark renders, 9 seamless textures. Process them with `scripts/process-asset.mjs` into `public/campus-art/tycoon/` and log them in `reference/generated/GENERATED.md`.
- Draw icons as code SVG.
- If Chrome blocks Gemini downloads, stop and ask me.

**Phase 3: 3D engine.**
- Build `src/render3d/Engine3D.ts` (Three.js + postprocessing) with the same public API as `MapEngine`, per section 2:
  - terrain from `terrain.json` with flattened building pads and terraces;
  - extruded `poly` footprints with roofs, facades, glass, stone and balconies;
  - road ribbons and the covered walkway;
  - the lake shader;
  - instanced pines and props;
  - golden-hour light and soft shadows;
  - tilt-shift, AO, bloom and the ACES grade;
  - quality tiers, with the 2D engine as fallback.
- Swap it into `CampusPage.tsx`.
- Everything that exists today must keep working: search, filter chips, place cards, deep links, Survey mode, and the 2D fallback.
- Add API hooks (no full features yet) for location, route and ON AIR, so Phase 3B can plug into them.

**Phase 3B: live features (added 13 Nov, before any visual polish).** These were never built in the pixel plan; build them now on the 3D engine (and the 2D fallback), from the "Must-have cut" in `reference/PLAN_campus_map.md`:
- **Blue dot + follow mode:** the phone's GPS (asked for only when Locate or Directions is tapped), an accuracy ring and heading, tap once to centre and twice to follow, snapped to paths. Off campus, show "Not on campus yet" with a link to the Guide instead of a stray dot. Apply the Survey fit.
- **Walking graph + A\* directions:** one network from the OSM roads, the layout paths, the covered walkway, the entrance connectors (`fp-*`) and the entrances. Route to any place, room or session entrance, drawn as the glowing route ribbon, with walking time and next-step text that uses landmarks.
- **Reroute** when the walker is about 25 m off the route.
- **Arrival:** "You're at <building>. Room X is on the <floor>."
- **GPS simulator** (dev only, e.g. `?sim=1`): fake a walk along a route, including going off-route, to test the blue dot, reroute and arrival on screen.
- **ON AIR:** a glowing sign above buildings with a session running now (from `sessions.json`); tap it for the live rooms.
- **Event pins:** registration, help desks, first aid, shuttle, cultural evening, gala dinner. Put them in a data file the organisers can edit, with placeholders marked "to confirm".
- **Room-change signs:** "Moved to …" on the old room, and routes go to the new room. Use a simple data file or an admin entry the organisers can update during the event.
- **List view:** all places grouped by category, with search, for weak phones and screen readers.
- Add tests for routing (every entrance reachable, routes snap to entrances) and screenshot the simulator walk.
- The conference is 27 Nov: if time gets tight, Phase 3B comes before Phase 4.

**Phase 4: UI skin and refinement.**
- Re-skin the UI to the soft, rounded game style (section 2, "UI skin").
- Then do at least 3 refinement passes against the target: screenshots at 390×844 and 1280×800, saved in `reference/style/compare/` and scored in `reference/style/STYLE_LOG.md` (section 4 checklist).
- (Deferred by H A, 19 Nov) Target 30 fps or better on a mid-range phone at the Medium tier: a later stage, not now.

**Rules:**
- No QGIS files.
- No Google Maps API, and nothing traced or copied from Google imagery (use it only to look).
- Keep the © OpenStreetMap, Overture, Google Open Buildings and Microsoft attribution visible in the map credits.
- Lariti and the other entries in `places.json → excluded` are not on campus.
- Never type passwords. Ask me to log in if a site needs it.
- Commit after each phase with a clear message.
- If my photos appear in `reference/photos/campus_new/` (Kalam Centre, Commercial Complex, Students' Mess), update `LOOKS_LIKE.md` and match them.

Order: Phase 1 → 2 → 3 (3M v2 real-campus models, then SCENE_LOOK) → 3B → 4, stopping for my approval after each. Phases 1 and 2 are done; see "Current status" at the top, `git log` and `reference/IMPLEMENTATION_PLAN.md`.
