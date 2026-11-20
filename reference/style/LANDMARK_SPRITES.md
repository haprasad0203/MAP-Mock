# Phase 3S: use the approved Phase 2 renders as the buildings on the map (v2, 14 Nov)

**Decision (H A, 14 Nov). This replaces every earlier landmark instruction.**
- **Use the renders as they are.** The 13 landmark renders made and approved in Phase 2 ARE the buildings on the finished map: the same images, the same tycoon style.
- **No new building images.** Don't generate, repaint or "re-sprite" any building in Gemini.
- **No simplified 3D remodels.** Don't show code-built remodels of these landmarks. Stop the REFINE_LANDMARKS.md hero-modelling rounds and drop the "repaint in Gemini" step of the earlier LANDMARK_SPRITES.md. The round-1 Admin/NAB modules stay in the code only as a hidden fallback, used if a sprite fails to load.
- **Gemini is allowed only for** extra tileable textures and hardscape pieces (paving, terrace walls, hedges, path edging) if they're needed.
- **The whole map stays in the same tycoon style** as these renders.

## 1. The images to use (full-size originals)
From `reference/generated/raw/tycoon/`. These are the approved versions listed in GENERATED.md:

| Building id | File |
|---|---|
| admin | `admin_v1.png` (includes the flag forecourt) |
| nab | `nab_v3.png` |
| hostel-1 | `hostel1-dblock_v2.png` (flat roofs) |
| hostel-2 | `hostel2-fblock_v2-cream.png` |
| hostel-3 | `hostel3_v1-cream.png` |
| hostel-4 | `hostel4_v1-cream.png` |
| cafe-cloud (+ amul-cafe) | `cafe-cloud_v1.png` |
| mess | `mess_v2.png` |
| octagon-hall | `octagon-hall_v1.png` |
| main gate (landmark `main-gate` + guard-room) | `main-gate_v1.png` |
| Kalam statue garden (area `terrace-garden` + landmark `kalam-statue`) | `kalam-statue-garden_v1.png` |
| kalam-centre | `kalam-centre_v1.png` ("to confirm"; use it until H A's photos arrive) |
| commercial | `commercial-complex_v1.png` ("to confirm"; same) |

Don't use the 512 px webp thumbnails for the map; they're only for place cards.

## 2. Preparing each image: cut-out only, no repainting
`scripts/make-sprites.mjs` (sharp), driven by `public/data/sprites.json`. All edits are masks and cut-outs, never generative:
1. **Background removal:** the renders sit on a plain light background, so make it transparent.
2. **Diorama cleanup:** remove the diorama base, keeping the building and what belongs to it.
   - **Remove:** the soil or grass slab edges and cross-sections, stray road pieces that run off the tile, parked cars on those roads, and partial neighbouring buildings (for example, the D Block edge and the teal walkway in `mess_v2`, if they don't line up with the map).
   - **Keep:** the building, its own forecourt, plaza, podium, steps, porch, and the trees standing right against it.
   - **Admin:** keep the pink plaza, the round lawn and the flag.
   - **Kalam statue garden:** keep the terraces.

   Do this with a mask polygon per image, stored in `sprites.json` (in image pixels), with a 3–6 px feathered edge.
3. **Light colour match only:** exposure and white balance so the sprites sit in the scene's grade. No hue changes; the cream stays cream and the green stays green.
4. **Export** WebP with alpha to `public/campus-art/tycoon/sprites/<id>.webp` at 1× (about 1024 px wide) and 2× (full size, for close zoom).

Make a checkerboard sheet of all 13 cut-outs, `reference/style/compare/sprites_cutouts.png`, and show it to H A before placing them.

## 3. Camera: match the renders, lock rotation
- **Match the view:** measure the renders' view (a 3/4 view from the south-east, about 30–35° down; check it from their vertical edges and roof lines). Set the map's camera yaw and pitch to that view. Keep the narrow FOV.
- **Lock rotation:** hide the Rotate button in 3D (it was a "Should", not a "Must"), and record that in IMPLEMENTATION_PLAN.md. Zoom, pan, fly-to and recentre still work.
- **Sun:** set the scene sun to come from the same screen direction as the light in the renders (from the left), with the same warm golden colour, so 3D shadows agree with the sprites' baked shading.

## 4. Placing the sprites on the real map
- **Config:** for each sprite, `sprites.json` holds:
  - `anchorPx`: the image point that sits on the ground at the building's footprint centre;
  - `metresPerPx` or `widthMetres`: the scale, from the building's long side in the image vs the real footprint's long side in `campus-layout.json`;
  - an optional fine `offset` in metres.
- **Calibration view:** build `?sprite-edit=<id>`, a dev view to drag and scale a sprite over the 3D footprint outline and save the numbers to `sprites.json`. Calibrate each one so the building sits on its real spot at about its real size.
- **Footprint mismatch is accepted:** the renders' outlines won't exactly match the footprints (H A accepts this). Positions, entrances, routing, hit areas and the blue dot still use the real data in `campus-layout.json`, which stays unchanged.
- **Rendering:**
  - Each sprite is an upright quad facing the fixed camera, at the footprint's ground height (`groundElev`).
  - It is alpha-tested with depth, so trees, labels and markers sort correctly in front of and behind it.
  - Clear the procedural trees and props inside each sprite's footprint plus a few metres, so nothing pokes through.
- **Grounding:**
  - add a soft contact-shadow decal on the ground under each sprite, offset away from the sun, matching the render's baked shadow;
  - flatten the terrain under it (already done for building pads);
  - blend the 3D plaza or lawn under the sprite's own paving so the edges don't show.
- **Hide the code-built model:** don't draw the procedural model of a building that has a sprite.
- **Selection:**
  - a yellow outline glow on the sprite's alpha edge, plus the footprint pulse on the ground;
  - filter dimming darkens the sprite;
  - tapping the visible picture selects the building (hit-test the alpha as well as the footprint).
- **Labels:** stay as HTML pills above the sprite's top.
- **Zoom:** 1× at campus zoom, 2× when zoomed in. Mipmaps on. Lazy-load, and keep the total sprite download under about 6 MB.
- **All tiers:** sprites are cheap, so show them on Low too. The 2D engine (`?q=2d`) can use the 1× sprites as well, in place of the old pixel art.

## 5. Everything else in the same tycoon style
- **Small buildings:** the unnamed buildings, Type 2/3 quarters, the west cluster, the substation and the villages stay 3D, styled to sit beside the sprites:
  - soft cream or white walls, sage-green or slate roofs with a white fascia;
  - simple window bands;
  - the same light. No harsh textures.
- **Ground, roads, lake, trees:**
  - golden hour, warm deeper greens (less lime);
  - asphalt with markings, the teal lake;
  - darker, varied pines, as in `tycoon_style_target.png`.
- **Hardscape:**
  - paved aprons at entrances;
  - terrace and retaining walls;
  - brick plazas;
  - path edging;
  - hedges.

  Build them in code, using the Phase 2 textures. Gemini may be used only to make extra tileable textures for these (no buildings).
- **Props:** lamps, benches and the flag stay in code.

## 6. Deferred to a later stage (H A, 14 Nov): record these in IMPLEMENTATION_PLAN.md
For now the map uses the 13 approved renders exactly as they are. H A accepts these limits for now and will fix them later with his own videos of every building, filmed from all sides. List them in `reference/IMPLEMENTATION_PLAN.md` under **"Later stage: landmark sprites v2"**, and don't work on them until H A says so:
1. **Rotation is locked.** The renders show only one angle. Later: four-direction sprites per landmark (13 × 4), drawn over the real 3D massing at the map angle, with H A's video frames as reference and the approved renders as the style master. Then rotation is unlocked.
2. **Outlines only roughly match the real footprints** (for example, NAB is drawn as one neat slab; the real Admin is longer than its render; Hostels 3 and 4 show 5 floors instead of 4). Later: the four-direction sprites drawn from the real massing fix this.
3. **The door in a picture may not be where the route ends** (routes use the real entrances in the data). Later: fixed by the same four-direction sprites. For now, check Admin and NAB, and note any building where this looks clearly wrong.
4. **Light is painted in** (golden hour), so no dusk mode or lit windows on these buildings. Later: optional dusk variants.
5. **Softness at the closest zoom.** Later: higher-resolution versions if needed.
6. **Guessed buildings:** Kalam Centre, Commercial Complex and the Mess walls have no ground photos. Later: redo them from H A's videos.
7. **Video intake:** H A will put videos in `D:\Map Mock\reference\photos\campus_new\<building-id>\`. Later, extract frames with ffmpeg (the 3/4 corner views, entrance, roof), choose the best, and log them in LOOKS_LIKE.md.

## 7. Deliver, then stop for H A
1. **First:** the cut-out sheet (step 2), and Admin + NAB placed on the map (1280×800 close-up and 390×844). Wait for H A's OK.
2. **Then:** all 13 placed, plus whole-campus screenshots at 1280×800 and 390×844, next to `tycoon_style_target.png`.
3. **Finally:** tests and build pass, committed on phase-3, no merge until H A approves. Then Phase 3B (blue dot, directions, ON AIR, event pins, room changes, list view). The conference is 27 Nov.
