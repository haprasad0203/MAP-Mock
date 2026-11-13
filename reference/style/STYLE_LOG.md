# Style log: Phase 3R (landmarks modelled to match their approved renders)

Spec: `reference/style/REFINE_LANDMARKS.md`. Sheets: `reference/style/compare/model_<id>_v<round>.png` (render left, model right), made by `node scripts/compare-model.mjs <id> <round>` from the `?model=<id>` viewer.

Scores are out of 10 for "does the model read as the render". A building is not left below 7.

## Setup (14 Nov 2026)
- Data: `public/data` in the worktree already matched `D:\Map Mock\public\data` (layout, places, osm, terrain, sessions); nothing to copy.
- Viewer: `/campus?model=<id>&az=<deg>&pitch=<deg>` (`src/ui/ModelViewer.tsx`). One building with its forecourt on plain cream, 14° lens, 32° down, warm sun from the camera's left, framed to fill the view.
- Hero modules: `src/render3d/landmarks/<id>.ts`, on the shared kit (`kit.ts`). The map engine uses the same modules through `addBuilding`.
- Materials: `src/render3d/materials.ts`. New hero wall: pure white plaster, one big window per bay (4.2–5.2 m) with a white frame and dark teal-grey glass, a grey-green floor band per floor.

## Admin Block (render `admin_v1.png`, the approved one per GENERATED.md)

### Round 1: 4/10
Sheet: `model_admin_v1.png`. Camera az -70.

What is in: a taller centre block with the largest hip; lower linking wings with three corridor floors and glass rails; white end blocks with stone bases, a teal strip each and the emblem on the east block; a two-storey glass bay with portico columns; hips at 22° with 0.8 m eaves and white fascia; pink plaza, round lawn with ring path and cross paths, flag mast with the tricolour, lamps, three white cars.

| Item | Render | Model, round 1 | Fix for round 2 |
|---|---|---|---|
| Proportions | Compact U: end blocks stand well forward, centre recessed; about as tall as a wing is deep | Data footprint is a 60 m front with a 31–44 m deep body and end blocks beside it, not in front; reads long, low and deep | Cannot change the footprint. Raise the read of height: taller plinth, attic band, 4 floors on the wings' front range |
| Wall vs roof height | Walls dominate; roof about a third of wall height | Centre hip is fine (5.5 m on 15.4 m). The rear range and wing hips together still make a big roofscape seen from this angle | Rear range: flat grey deck behind a parapet instead of a hip, so only the front range carries green roofs |
| Roof pitch, overhang, fascia | 22°, clear white fascia band under every eave | Pitch right; fascia too thin to read | Fascia band 0.6 m deep, white soffit |
| Colours | Warm white walls, sage roof, strong teal glass | Walls read light grey-cream in shade; roof a little too yellow-green | Lift wall albedo and fill light on walls; roof tint cooler |
| Window pattern | End blocks nearly blank: a few small windows high up | East and west blocks have full window grids on their side faces | Blank side faces with 3 small high windows |
| Glass | Tall teal strips on end blocks, 2–3 storey curtain bay at the centre | Strips present but thin; centre bay present, partly hidden behind the flag and columns | Strips 2.6 m wide and full height; bay taller (2.5 floors) |
| Stone | Stone only at the base of the end blocks and beside the centre bay | Same places; texture too dark and busy | Lighter stone tint, larger blocks |
| Balconies and corridors | Deep open corridors: dark recess, dark slab bands, glass rails | Present but flat (0.7 m deep) and the rails read as teal stripes | Real recess 2 m deep with a dark back wall and soffit shadow |
| Emblem | Round green emblem high on the east block | Present, right place, a little large and target-like | Smaller, plain green ring with pale centre |
| Entrance and canopy | Columns carry the centre block over an open porch | Columns present, porch not open | Open the ground floor of the bay behind the columns |
| Forecourt | Lawn is a rounded triangle with a ring at its centre; plaza hugs the building; green block under everything | Round lawn with cross paths, plaza, grass block: reads right but plaza is too large and empty | Shrink plaza, add the two planted beds by the wings and two pines |

### Round 2
Pending H A's look at round 1.

## New Academic Block (render `nab_v3.png`)

### Round 1: 3/10
Sheet: `model_nab_v1.png`. Camera az -77.

What is in: pure white walls with the new windows; flat light-grey roofs with parapets and two grey rooftop units, no green boxes; a teal glass atrium standing proud under a white roof slab with a door canopy; tan stone panels both sides with the emblem on the left one; teal strips beside the panels; two white towers one floor higher with a teal strip, a green skirt roof and an open pavilion under a green cap.

| Item | Render | Model, round 1 | Fix for round 2 |
|---|---|---|---|
| Proportions | One long narrow slab, about 5 : 1, towers at its two ends | The data has three bulky parts: a 60 × 18 m slab between a 41 × 30 m and a 28 × 22 m end block, plus a small annex at a different angle. The end blocks stand forward of the slab, so only about 22 m of the slab's front shows | Cannot change the footprint. Treat the lawn-side faces of the end blocks as part of the entrance front (stone panels and strips continue across them), so the long front reads as one facade |
| Wall vs roof | Flat roof, thin parapet | Same | None |
| Colours | White walls, warm tan stone, teal glass | White reads right in sun; stone much too dark and brown | Lighter, warmer stone tint |
| Window pattern | Square windows in pairs, dark, deep white frames | New window texture: right idea, glass reads green-black, bays a little small on the end blocks | Larger bay, darker neutral glass |
| Glass | Full-height atrium with a clear mullion grid; glazed strips beside the stone | Atrium present but narrow (squeezed into the 22 m gap) | Wider atrium once the front runs across the end blocks |
| Stone | Two large panels, full height, flanking the atrium | Both present but small and dark | Larger panels on the end blocks' front faces |
| Towers | Slim, at the two ends of the slab, pavilion clearly open | Present on the end blocks' outer front corners; right one is far from the entrance front; pavilions read well | Keep; move each to the corner nearest the slab's line |
| Balconies | None | None | None |
| Emblem | On the left stone panel | Present, too large for the small panel | Resize with the panel |
| Entrance and canopy | Two white porch canopies on the front | Centre door canopy only (side porches need more than 46 m of front) | Porches on the end blocks' front faces |
| Podium | Dark base strip, lawn strip with small trees, road with cars | None | Base strip, lawn strip and small trees |

### Round 2
Pending H A's look at round 1.

## Open question for H A
Both renders show a simpler plan than the data. The spec says footprints stay as in `public/data`, so the models are built on the real footprints and will never match the renders' outline. Rounds 2 and 3 can still close most of the gap in facade, roofs, colour and forecourt.
