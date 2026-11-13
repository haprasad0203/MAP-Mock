# Phase 3R: make the 3D buildings look like the approved renders

**Problem (H A, 14 Nov):** the 3D buildings are generic textured boxes with oversized roofs. They do not look like the approved landmark renders, and the scene still does not look like the tycoon target.

Most visible:
- **Admin Block:** huge, steep roofs crush short walls. There is no glass centre bay, no corridor balconies, no emblem and no round flag lawn.
- **NAB:** reads as a beige cluster with green boxes on the roof. There are no white towers with green-capped pavilions, no stone panels and no teal glass atrium.

The fix is not more textures. Each landmark has to be **modelled** to match its render, and checked side by side until it matches.

Work in the phase-3 worktree. Positions and footprints stay as in `public/data` (do not move or reshape them). Everything else about how a building looks is yours to model.

## 0. Before anything
1. **Sync data.** `D:\Map Mock\public\data` (the master working tree) has newer data than the worktree:
   - football surface `grass`;
   - the generic buildings are `unnamed` (no labels);
   - west-cluster has label priority 3;
   - Hostel 1 has `flat` roofs.

   Copy `campus-layout.json`, `places.json` and `osm.json` from there, then run the tests.
2. **Use the full-size approved renders**, not the 512 px webp thumbnails. They are in `reference/generated/raw/tycoon/*.png`; GENERATED.md says which version of each was approved:
   - NAB: v3;
   - Hostels 2, 3 and 4: the `-cream` versions;
   - Mess: v2;
   - Hostel 1: the flat-roof redo;
   - Admin, Cafe Cloud, Octagon Hall, gate and statue garden: approved as-is.

   Read LOOKS_LIKE.md for each building, and look at the real photos it lists.

## 1. A model viewer, so you can compare like for like
Add a dev route `?model=<buildingId>`. It shows ONE building (plus its own forecourt/podium) alone:
- on a plain cream background;
- with the camera matched to the render: 3/4 view from the south-east, about 30–35° down, narrow FOV;
- with the same warm sun from the left.

`scripts/compare-model.mjs` (Playwright) saves the screenshot and builds a side-by-side sheet: render on the left, model on the right, in `reference/style/compare/model_<id>_v<N>.png`.

## 2. The loop for each landmark
For each building below:
1. Render the model.
2. Make the side-by-side sheet.
3. Write a difference list in `reference/style/STYLE_LOG.md` covering:
   - proportions (length:depth:height);
   - wall height vs roof height;
   - roof pitch, overhang and fascia;
   - colours;
   - window pattern;
   - glass;
   - stone;
   - towers;
   - balconies and corridors;
   - signs and emblem;
   - entrance and canopy;
   - the forecourt or podium.
4. Fix the differences.
5. Repeat.

Do **at least 3 rounds** for Admin, NAB, Hostel 2, Hostel 1, Mess and Cafe Cloud, and at least 1 round for the rest. Score each round out of 10. Don't move on from a building below 7/10. Put the hero modules in `src/render3d/landmarks/<id>.ts`, built on the data footprint.

## 3. What each landmark must have (from the renders + LOOKS_LIKE.md)
- **Admin Block** (`landmark-admin`, approved):
  - **Walls:** white walls, 4 floors at 3.6 m. Walls must clearly dominate: the roof height is at most about 35% of the wall height. Roof pitch about 22°, 0.8 m eaves, a white fascia band. Thin grey-green floor bands, a light-grey plinth.
  - **Wings:** separate hipped roofs per wing: the largest over the centre block, smaller ones on the two white end blocks and the linking wings.
  - **Centre block:** open corridor floors with dark bands and glass rails, and a 2–3 storey **teal glass curtain bay** over the main door, facing the forecourt.
  - **End blocks:** white, each with a vertical **teal glass strip**. The east end block carries the round green **IIM emblem** high on its face.
  - **Linking wings:** continuous corridor balconies with grey-green rails.
  - **Forecourt:**
    - a big red/pink-paved plaza;
    - a **round lawn** with a paved ring path and a tall **flag mast with the Indian flag** in the centre;
    - lamp posts and a few parked white cars;
    - **no road loop cutting across the plaza** (check the path data there; if a service road crosses it, draw that stretch as paving).
- **NAB** (`nab_v3`):
  - **Walls and roof:** **pure white** walls, long and narrow, 4 floors. Flat light-grey roof with a parapet and a few small **grey** rooftop units. No green boxes except the two tower caps.
  - **Towers:** two tall **white** end towers, one floor higher, each topped by a small white pavilion with a **green cap roof**.
  - **Entrance face** (towards the NAB front road and lawn):
    - a full-height **teal glass curtain-wall atrium** in the middle;
    - **tan/brown stone-clad panels** on both sides of it, the left one with the round green emblem;
    - a flat white canopy over the door;
    - vertical teal strips on the end blocks;
    - plain window rows with white frames.
- **Hostel 2 · F Block** (cream version; Hostels 3 and 4 follow the same style):
  - **Walls and roof:** **cream** plaster walls, a brown **stone ground floor**, green **hipped** roofs with white fascia and modest pitch.
  - **Stair towers:** **full-height blue-teal glass stair towers** standing proud of the facade, each with a small green-roofed pavilion cap.
  - **Facade:** rows of recessed balconies with brown frames.
  - **Entrance:** a small entrance porch with a green roof.
- **Hostel 1 · D Block** (flat-roof redo):
  - **Walls and roof:** white, 4 floors, **flat roof** with a thin projecting white slab edge. Rooftop stair heads and **blue water tanks**.
  - **Facade:** many small balconies with **black railings**, tall windows with grey louvres.
  - **Base and walkway:** a stone base and retaining wall, and the **brown covered walkway** beside it on a pink-tiled terrace.
- **Students' Mess** (`mess_v2`):
  - **Halls:** four octagonal halls on paved octagonal podiums. The big one has 2 floors, the others 1. Cream walls with window bands.
  - **Roofs:** **dark slate-grey faceted** roofs with white edge trim (never black), and a small lantern on the big one.
  - **Grounds:** a terracotta forecourt inside a low stone wall, and the teal covered walkway along its south side.
- **Cafe Cloud** (approved):
  - **Building:** a white octagon with a continuous **glass band** all round and a **two-tier green octagonal roof** with a lantern. Black water tanks on the roof.
  - **Grounds:** a stone podium, and the small **Amul Cafe** kiosk with umbrellas and tables beside it.
- **Octagon Hall, main gate, Kalam statue garden:** match their approved renders:
  - **Octagon Hall:** big green two-tier octagon, pink plaza, ponds.
  - **Main gate:** green-roofed gate over the road, guard room.
  - **Kalam statue garden:** terraced curved lawns with stone walls, paths and steps, and the statue on a plinth in the centre circle.
- **Kalam Centre, Commercial Complex:** keep the plain campus style ("to confirm"). Redo them from H A's photos when `reference/photos/campus_new/` exists.

## 4. Materials that apply to every building
- **White must read white and cream must read cream:**
  - raise the wall albedo;
  - keep AO off flat wall faces;
  - no grey or beige tint from the facade texture;
  - check the colour picked off the screenshot against LOOKS_LIKE.md.
- **Windows:**
  - larger windows with white frames and dark teal-grey glass;
  - one row per floor, with floor bands;
  - fewer, bigger bays than the current fine grid.
- **Roofs:** matte sage-green tiles with visible ridges and white fascia, not glossy flat green. The roof colour should match the renders.
- **Edges:** a small bevel on wall corners and eaves, so the edges catch the light as in the renders.

## 5. Global look (then compare the whole scene with the target)
- **Golden hour:**
  - a low warm sun (#FFD9A3, 25–28°, from the south-west);
  - long soft shadows with real contrast;
  - a warm orange/teal ACES grade.
- **Colours:** less lime — deeper warm grass, darker varied pines.
- **Tilt-shift:** a wider sharp band on phones at campus zoom.
- **Sheet:** make a campus-overview vs `tycoon_style_target.png` sheet, `reference/style/compare/scene_vN.png`, and score it with the RESTYLE section 4 checklist.

## 6. Performance
- **Detail by distance:** full hero detail only when zoomed in (Area/Building levels) and on the High/Medium tiers. At campus zoom use a simplified version: same silhouette, roofs and colours, fewer small parts.
- **Budget:** keep under about 150 draw calls and 1.2 M triangles on Medium.
- **Report:** the frame time for each tier.

## 7. Deliverables (then stop for H A's review)
- **Side-by-side sheets:** the last round for each landmark, and the scene vs the target.
- **STYLE_LOG.md:** the difference lists and scores for every round.
- **Close-up screenshots:** Admin, NAB and the hostels at 1280×800, and the campus at 390×844.
- **Commit:** tests and build passing, committed on phase-3. Don't merge into master until H A approves.

**Timing:** the conference is 27 Nov. Spend at most about a day on this, then do Phase 3B (blue dot, directions, ON AIR, event pins, room changes, list view). Hardscape and street furniture beyond what the renders show (extra lamps, benches) stay in Phase 4.
