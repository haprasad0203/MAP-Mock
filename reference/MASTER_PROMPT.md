# Master prompt: new campus layout + tycoon 3D restyle

Paste the block below into Claude Code (started with `claude --chrome` in `D:\Map Mock`, Plan mode on).

---

You're working on the Campus map module of the Pan-IIM WMC 2026 app (IIM Shillong, Umsawli, 27–29 Nov 2026). There are two jobs, in this order:
1. Adopt the new, corrected campus layout.
2. Replace the pixel-art look with the stylised 3D tycoon look in `reference/style/tycoon_style_target.png`.

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
- All features must still work: search, filter chips, place cards, blue dot, follow mode, directions and reroute, ON AIR, event pins, room-change signs, deep links, Survey mode, and the 2D/list fallback.

**Phase 4: UI skin and refinement.**
- Re-skin the UI to the soft, rounded game style (section 2, "UI skin").
- Then do at least 3 refinement passes against the target: screenshots at 390×844 and 1280×800, saved in `reference/style/compare/` and scored in `reference/style/STYLE_LOG.md` (section 4 checklist).
- Target 30 fps or better on a mid-range phone at the Medium tier.

**Rules:**
- No QGIS files.
- No Google Maps API, and nothing traced or copied from Google imagery (use it only to look).
- Keep the © OpenStreetMap, Overture, Google Open Buildings and Microsoft attribution visible in the map credits.
- Lariti and the other entries in `places.json → excluded` are not on campus.
- Never type passwords. Ask me to log in if a site needs it.
- Commit after each phase with a clear message.

Start with Phase 1: add a short plan at the top of `reference/IMPLEMENTATION_PLAN.md` (keep the old pixel plan below it under "Previous plan (pixel)"), then do Phase 1.
