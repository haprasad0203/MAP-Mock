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
| Mood frame v2 (**accepted as a STYLE reference only**: H A, 13 Nov 2026) | Follow-up in the same chat: one octagonal hall on the NW lake shore with its 2 ponds (remove the second by NAB → lawn + parking); long curved lake; smaller flag lawn; stronger tilt-shift | same as v1 | `reference/style/gemini_campus_mood.png` (1536×2752, full size); v1 full size in `raw/tycoon/mood-frame_v1.png` | Colour and composition target |

### Landmark renders (Prompt A adapted: the real building from LOOKS_LIKE.md; image 1 = style only)
Each was a separate Gemini chat, attaching `style/tycoon_style_target.png` plus the listed real photos. Photos of people (e.g. `au4.jpg`) and Google satellite/Maps images were **not** uploaded. Raw files are in `reference/generated/raw/tycoon/`; cut-outs (512 px WebP, alpha) in `public/campus-art/tycoon/landmark-<id>.webp`, made with `scripts/process-asset.mjs render`. Side-by-sides are in `reference/generated/compare/<id>_real_vs_render.jpg`. Use: the 3D modelling and material target, and place-card thumbnails.

| Landmark | Real photos attached | Tries | Chosen | Remaining differences vs the real building |
|---|---|---|---|---|
| Admin Block | DJI_0338, yt-drone-19s | 2 | v1 | End blocks project further forward than the real shallow U (the retry came back nearly identical) |
| NAB | crops nab_dji, nab_19s; DJI_0338 | 1 | v1 | Slightly deeper/boxier than the long, slim real block |
| Hostel 1 · D Block | DSC_9111, DSC_9119, DSC_9140 | 1 | v1 | None significant |
| Hostel 2 · F Block | New-Hostel, DSC_9144, hostel22 | 2 | v2 | v1 was a 7-storey tower with orange brick. v2: balcony recesses still a little warm |
| Hostel 3 | (same chat as F Block) | 1 | v1 | No photo of Hostel 3; style assumed the same as F Block; 5 floors visible vs 4 assumed |
| Hostel 4 | (same chat as F Block) | 1 | v1 | No ground photo; shows 5 floors vs 4 in the data; finished, not under construction |
| Cafe Cloud (+ Amul Cafe kiosk) | crops cafe_dji, cafe_19s; Image_363 | 1 | v1 | Kiosk carries a small "Amul Cafe" sign despite "no text" |
| Octagonal Hall | yt-drone-11s, yt-drone-49s | 1 | v1 | None significant |
| Main gate | yt-drone-45s (the Google Maps contributor photo was looked at only, not uploaded) | 1 | v1 | Sign band has no lettering (on purpose) |
| Kalam statue garden | yt-drone-19s, Image_363 | 2 | v1 | Gemini refused a statue of Dr. Kalam (public figure); the plinth carries a generic bronze figure and the 3D map models the statue in code. Terraces are more regular than the real ones |
| Dr. Kalam Centre | DJI_0338 (campus style only) | 1 | v1 | **No exterior photo exists**: shape assumed; shows 4 floors vs 3 assumed |
| Students' Mess | DJI_0338 (campus style only) | 1 | v1 | **No exterior photo exists**: granite columns from the interior photos |
| Commercial Complex | DJI_0338 (campus style only) | 1 | v1 | **No exterior photo exists**: shape assumed |

**Mood frame v2 is a style reference only** (H A, 13 Nov 2026). Use it for light, colour grade, tilt-shift and the chunky game look, never for positions or shapes. Known errors in it:
- NAB is drawn as a square block (it's long and narrow).
- The football ground is drawn as grass (it's bare earth).
- The tennis court, the parking lot by NAB and the orange earth cuttings don't exist.

Positions and shapes come only from `campus-layout.json` v2 and LOOKS_LIKE.md.

**Review 1 (H A, 13 Nov 2026):**
- **Approved as they are:** #1 Admin Block, #7 Cafe Cloud + Amul Cafe, #11 Octagonal Hall, #12 Main gate, #13 Kalam statue garden.
- **To redo:** #2 NAB (long and narrow), #9 Mess (four-octagon cluster), #4–6 Hostels 2–4 (cream plaster, not orange brick).
- **To confirm until H A's photos arrive in `reference/photos/campus_new/`:** #8 Kalam Centre, #9 Mess, #10 Commercial Complex.

**Review 1 fixes (13 Nov 2026):**

| Landmark | What was done | Chosen | Remaining |
|---|---|---|---|
| #2 NAB | Follow-up in the old chat returned the same deep box; the one retry was a **fresh chat** (crops nab_dji, nab_19s) asking for a slab about 70 × 14 m | `nab_v3` | Long and narrow now; towers, stone panels, atrium and emblem kept |
| #9 Students' Mess | Redone as the **four-octagon cluster** (H A). Attached: style + interior `04_mess_cafeteria/DSC_9103.jpg` (materials). `mess_from_above.png` is a satellite screenshot, so it was **described in text, not uploaded** | `mess_v2` | Walls and entrances not visible from above: **to confirm** from H A's photos |
| #4–6 Hostels 2, 3, 4 | Colour checked against `New-Hostel.jpg`: the photos agree with H A (cream plaster; brown only on the stone base, piers and doors). Two more Gemini tries (`hostel2-fblock_v3`, `_v4`, fresh chat, explicit #EFE3CC) still came out orange and 6–7 floors, so the colour was **fixed in post** with `scripts/recolor-orange.mjs` (saturated orange/brick → cream, shading kept; lower-saturation stone untouched) | `hostel2-fblock_v2-cream`, `hostel3_v1-cream`, `hostel4_v1-cream` | The stone base and soil edge are slightly greyer than real; Hostels 3 and 4 still show 5 floors vs 4 in the data |

Still **to confirm** (waiting for H A's photos in `reference/photos/campus_new/`, folder not created yet): #8 Kalam Centre, #9 Mess (walls), #10 Commercial Complex.
