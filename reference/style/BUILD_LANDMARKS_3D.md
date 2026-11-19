# Phase 3M: code-built 3D landmarks painted with the approved renders (H A, 16 Nov, final)

**Decision.** The landmark buildings are **real 3D models built in code on the real footprints**. They are covered with **pieces cut from the approved Phase 2 renders**: the Gemini-painted windows, glass bays, stone panels, emblems and roof colours, flattened and wrapped onto the matching walls.
- **No flat pictures standing on the map:** the sprite approach (LANDMARK_SPRITES.md) is dropped because the pictures don't fit the real footprints.
- **No new building images from Gemini.** Gemini may be used only for tileable textures or hardscape if needed.

**What this must give H A, with nothing traded:**
- exact fit on the real footprints, facing the real direction, at real size and floors;
- rotation in all 4 directions;
- doors where the data says, so routes and arrivals match;
- real light and shadows;
- every existing feature working;
- fast on phones.

The **look** target is each building's approved render: **at least 7.5/10 likeness** on materials, details, colours and proportions. Outlines follow the real footprint, so don't judge likeness on outline.

Supersedes: LANDMARK_SPRITES.md (all of it), and REFINE_LANDMARKS.md sections 1–2 (the method). Still valid:
- REFINE_LANDMARKS.md section 3 (per-building checklists) and section 4 (materials);
- SCENE_LOOK.md (the whole-scene look, after the landmarks).

## 0. Go back to the right starting point (no work lost)
In the phase-3 worktree (`…\.claude\worktrees\phase-3-implementation-plan-3dd0bc`, branch `claude/phase-3-implementation-plan-a4d45a`):
1. Tag the current head as `phase3-sprites-attempt`, so the sprite work stays recoverable.
2. Reset the branch to the tag `phase3-before-sprites` (300542a: the Phase 3 engine plus the round-1 Admin/NAB modules).
3. Bring back from `phase3-sprites-attempt` only what helps this phase, and list it in the commit message:
   - the cut-out script and the full-size background-free cut-outs (they're good sources for facade crops);
   - the `?model=` viewer and `compare-model.mjs` if they changed after 300542a;
   - surroundings.json and its script, if they aren't already there;
   - the Later-stage note.

   Don't bring back the sprite rendering, the sprites.json placement or the rotation lock.
4. Unlock rotation (4 directions, 600 ms eased) again.
5. Delete the untracked `.gemini-up` folder.
6. Run the tests and the build, then commit: "Phase 3M: start from phase3-before-sprites".

## 1. Facade atlases from the renders (`scripts/extract-facades.mjs`)
Use the full-size approved renders in `reference/generated/raw/tycoon/`:

| Building | File |
|---|---|
| Admin | `admin_v1.png` |
| NAB | `nab_v3.png` |
| Hostel 1 | `hostel1-dblock_v2.png` |
| Hostel 2 | `hostel2-fblock_v2-cream.png` |
| Hostel 3 | `hostel3_v1-cream.png` |
| Hostel 4 | `hostel4_v1-cream.png` |
| Cafe Cloud | `cafe-cloud_v1.png` |
| Mess | `mess_v2.png` |
| Octagonal Hall | `octagon-hall_v1.png` |
| Main gate | `main-gate_v1.png` |
| Kalam statue garden | `kalam-statue-garden_v1.png` |
| Kalam Centre (to confirm) | `kalam-centre_v1.png` |
| Commercial Complex (to confirm) | `commercial-complex_v1.png` |

1. **Mark the walls** in a dev tool `?facade-edit=<id>`: show the render and let H A (or you) click 4 corners for each visible wall face. Also mark rectangles for the special pieces: glass atrium or curtain bay, stone panel, emblem, entrance and canopy, tower face, balcony band, roof sample. Save to `public/data/facades.json` (in render pixels, with each face's real width in metres where known).
2. **Rectify each wall quad** to a flat, front-on image with a homography (bilinear sampling), at about 40 px per metre.
3. **Split each wall into reusable strips,** so any real wall length and floor count can be built:
   - **Vertical:** a **base strip** (ground floor, plinth or stone), a **typical-floor strip** (repeats per floor) and a **top strip** (top floor, parapet or eave band).
   - **Horizontal:** find the repeating **window bay** and cut a seamless bay tile.
   - **Specials:** keep them as fixed pieces (atrium, stone panel, emblem, entrance).
4. **Even out the painted light:**
   - divide each crop by its blurred low-frequency brightness to remove baked shading gradients, keeping the detail;
   - set the white and cream points to the LOOKS_LIKE.md colours;
   - the scene lighting adds real shading back.
5. **Export** one WebP atlas per building at `public/campus-art/tycoon/facades/<id>.webp` (at most 2048 px; 4096 px only for Admin and NAB if needed), plus the strip and special UV map in `facades.json`.
6. **Contact sheet:** `reference/style/compare/facades_<id>.png`, showing each original face → rectified → strips, for checking.

## 2. Building the models (`src/render3d/landmarks/<id>.ts`, shared kit in `landmarks/kit.ts`)
- **Shape from the data:**
  - extrude the real `poly` for each part;
  - floors × 3.6 m (3.4 m for hostels), from `groundElev`;
  - real orientation;
  - entrance faces from `entrances`.

  Don't move or reshape footprints.
- **Walls and textures:**
  - **Front face:** the wall facing the main entrance or road gets the render's front-face strips and specials, placed where the render places them (for example, the NAB atrium at the entrance, with stone panels either side).
  - **Other sides:** they get the render's side-face strips. Back walls reuse the side strips until H A's videos arrive.
  - **Layout:** the bay count is fitted to the real wall length (a whole number of bays, with specials kept at their real size). Floors per the data.
- **Depth as real geometry, not texture:**
  - **Roofs:**
    - hip or gable at about 22° pitch, with 0.8 m eaves;
    - a 0.4–0.5 m **white fascia**;
    - ridge caps;
    - tile colour and tone sampled from the render's roof.
  - **Admin:** separate wing roofs; the centre is biggest; the roof height at most about 35% of the wall height.
  - **Glass bays and atriums:** set 0.3–0.6 m forward, with frames and mullions, and teal-tinted glass with a slight reflection.
  - **Towers and pavilions:**
    - NAB's white end towers, one floor higher, with green-capped pavilions;
    - the hostels' glass stair towers with green caps.
  - **Balconies and corridors:** slabs with rails. Admin's corridor floors are deep recesses with glass rails; Hostel 1 has black rails.
  - **Stone panels:** project 0.15 m from the wall, textured from the render crop.
  - **Canopies, porches, steps and parapets.**
  - **Rooftop clutter:** water tanks (blue on D Block, black on Cafe Cloud), AC units, stair heads.
  - **The emblem:** a decal on its real face.
- **Edges:** bevel wall corners and eaves by 0.1–0.15 m so edges catch the light.
- **Forecourts** are part of the module:
  - **Admin:** a red-pink plaza, the **round flag lawn** with ring path, the mast and flag, lamps and parked cars; no road loop across the plaza.
  - **Mess:** a terracotta forecourt with a low stone wall and octagonal podiums.
  - **Cafe Cloud:** a stone podium with the Amul kiosk and umbrellas.
  - **Hostel 1:** the pink-tiled terrace with the brown covered walkway.
  - **Octagonal Hall:** a pink plaza and the ponds.
  - **Kalam statue garden:** the terraces, steps, paths and the statue on a plinth.
- **Use the per-building checklists in REFINE_LANDMARKS.md section 3**, minus anything that conflicts with the real footprint.
- **Non-landmark buildings** (staff quarters, unnamed, the west cluster, villages): the same kit with the Phase 2 textures, cream or white walls, sage or slate roofs with white fascia, simple window bands.

## 3. The comparison loop
1. **Viewer:** `?model=<id>` shows one building with its forecourt on a plain cream background, at the **render's camera** (3/4 from the south-east, about 32° down, narrow FOV) and with warm sun from the left.
2. **Sheet:** `compare-model.mjs` makes `reference/style/compare/model_<id>_v<N>.png` (render | model). Also make one sheet at the **map camera in all 4 rotations**.
3. **Log:** in `reference/style/STYLE_LOG.md`, list the differences:
   - floor and roof proportions;
   - roof pitch, eaves and fascia;
   - colours;
   - windows and bays;
   - glass;
   - stone;
   - towers;
   - balconies and corridors;
   - emblem;
   - entrance and canopy;
   - forecourt.

   Score out of 10, fix, and repeat.
4. **Rounds:**
   - **At least 3 rounds:** Admin, NAB, Hostel 2, Hostel 1, Mess, Cafe Cloud.
   - **At least 1 round:** the rest.

   Don't go below 7.5/10 on the first six.

## 4. Performance
- **Detail by zoom:** a merged, simplified version at campus zoom (same silhouette, roofs and atlas colours), with full detail at area and building zoom.
- **Budgets on Medium:**
  - about 150 draw calls or fewer;
  - 1.5 M triangles or fewer;
  - GPU texture memory 64 MB or less;
  - extra download for all facade atlases 8 MB or less.
- **Report** ms/frame per tier with `?fps=1`.

## 5. Stop points (show H A, then wait)
1. **After step 0 and the Admin + NAB atlases plus round 1 of their models:**
   - the contact sheets;
   - the render-vs-model sheets;
   - one rotated map view each;
   - their sizes against the real footprints.
2. **After all the landmarks:** all the sheets, plus the campus at 1280×800 and 390×844 in 2 rotations.
3. **Then the SCENE_LOOK passes** (camera hero view about 35–40° pitch, rotation allowed), scored against `tycoon_style_target.png`.
4. **Then Phase 3B** (blue dot, directions, ON AIR, event pins, room changes, list view).

**Timing:** about 1.5 days for this phase. The conference is 27 Nov.

## 6. Later stage (write this into IMPLEMENTATION_PLAN.md as "Later stage: landmarks v2")
1. **H A's videos:** they go in `D:\Map Mock\reference\photos\campus_new\<building-id>\`. Extract frames (ffmpeg), rectify real walls the same way, and replace or extend the facade strips, especially the back walls.
2. **The guessed buildings:** redo the Kalam Centre, Commercial Complex and Mess walls from H A's footage.
3. **Higher-resolution facades** for the closest zoom.
4. **Optional dusk mode** with lit windows.

## Rules
- Positions, footprints, floors and entrances come only from `public/data`; don't edit those files.
- No QGIS, no Google Maps API, nothing traced from Google imagery.
- Never type passwords.
- Commit after each step on the phase-3 branch, and don't merge until H A approves.
- Work only in the phase-3 worktree, and remove your own extra worktree at the end.
