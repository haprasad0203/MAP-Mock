# Gemini-generated art

All made in one Gemini chat ("Isometric Pixel Art Campus Assets") so later images follow the style tile. Text prompts only, with no photos uploaded: building descriptions came from the drone photo and the hostel photos (see `../photos/BUILDING_NOTES.md`).

Raw images: `raw/` (style tile = full download; landmarks = 645×482 captures, because Chrome blocked repeated downloads).
Processing: `node scripts/process-sprite.mjs raw/<file> public/campus-art/<slug>.png 240` (flood-fills the background to transparent, trims, box-downscales, snaps to the map palette with hard alpha). The app then re-pixelizes at each zoom and adds the 1-px outline.

| Output | Prompt (abridged) | Reference used | Used for |
|---|---|---|---|
| `generated/style-tile.png` (**legacy pixel**, not used by the 3D map) | Kit Step 1 style-tile prompt (grass/road/path/water tiles, pine, bench, lamp; palette with #FFD23F and #0F4D32) | — | Style reference only |
| `public/campus-art/admin-block.png` | "…Admin Block… white/cream walls, 4 floors, three wings in a shallow U, green hipped roofs, larger green hipped roof over the centre, teal glass curtain-wall bay, round green emblem, flagpole forecourt…" | aerial/DJI_0338, Image_363 | Admin Block (rotation 0) |
| `public/campus-art/nab.png` | "…NAB… long white block, 4 floors, flat roof with green parapet, two brown stone stair towers with green caps, central teal glass atrium, entrance canopy…" | aerial/DJI_0338 | NAB (rotation 0) |
| `public/campus-art/auditorium.png` | "…Auditorium… wide low hall, big sloping dark slate-grey roof, cream walls, tall narrow windows, glass foyer with flat canopy, red-brick plaza, circular garden…" | satellite arrangement | Auditorium (rotation 0) |
| `public/campus-art/hostel.png` | "…modern hostel… cream/peach plaster, 5 floors, brown stone base and pillars, full-height blue glass stairwell with green cap, balconies, green hipped roof, white eaves…" | hostels/New-Hostel.jpg | Hostel 4 (single block); Hostel 3 is code-drawn in the same style because it has 4 blocks |
| `public/campus-art/cafe-pavilion.png` | "…octagonal cafe pavilion… white walls, big glass windows, two-tier green octagonal roof with clerestory, porch, terrace tables…" | aerial/DJI_0338 (pavilion lower left) | Cafe Cloud Campus (rotation 0) |

Sprites are only used at rotation 0, the angle they were drawn from. The other three rotations use the code-rendered building with the same colours. They can be turned off with Layers → "Illustrated landmarks".
Not generated: category icons and props (gate, statue, tank, ATM, flag). These are tiny code-drawn pixel sprites, which read better at map scale.

## Tycoon style (Phase 2)
Legacy pixel sprites moved to `public/campus-art/pixel/` (2D fallback only). The real look of every landmark is in `reference/generated/LOOKS_LIKE.md`. Real photo and render pairs are in `reference/generated/compare/`.

| Asset | Prompt (summary) | Attached references | Output | Used for |
|---|---|---|---|---|
| Mood frame v1 | The real arrangement from LOOKS_LIKE.md: the lake in a valley; main road from the gate past Cafe Cloud, the Admin Block (green hipped roofs, flag forecourt, terraces) and NAB (stone towers, teal atrium); the octagonal hall, courts, walkway and football ground in the middle; hostels climbing north; pines and mist; golden hour; 9:16; no text. Image 1 for style only. | `style/tycoon_style_target.png`, `photos/aerial/DJI_0338-0000-01.jpg`, `layout/layout_v2_topdown.png` | `reference/style/gemini_campus_mood_preview.png` (572×1024 **preview capture**; the full-size download was blocked, see note) | Colour and composition target for the 3D map |

Gemini chat: "IIM Shillong Campus Tycoon Map" (gemini.google.com/app/bb8daa136142e137). **The full-size download was blocked by Chrome** ("Downloading full size…" never reached Downloads), so the preview was captured from the page at 1:1 (572×1024) and kept only as a mood reference.
