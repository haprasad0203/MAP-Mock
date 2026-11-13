# What each landmark really looks like (for the tycoon renders and the 3D models)

Rule: shapes, roofs, colours, materials, floors and arrangement come from the real campus. `reference/style/tycoon_style_target.png` gives only the art style (light, grade, tilt-shift, chunky game look).

**Sources:**
- **Drone photos:** `reference/photos/aerial/DJI_0338-0000-01.jpg` (DJI) and `Image_363.jpeg` (I363), golden hour from the south-east, 2024 uploads.
- **YouTube drone frames:** `yt-drone-*` (9QBtbam1G5Q). Each name gives the second it was taken at.
- **Official photos:** in `reference/photos/` and `IIM_Shillong_Campus_References/`.
- **Satellite screenshots:** `reference/IIM_Shillong_Campus_Map_Pack/01_satellite_screenshots/`. These are older: the football ground and the north hostels are still under construction.
- **Check images:** `reference/layout/check_*.png` and `zoom_*.png`.

**Confirmed by H A (13 Nov 2026):**
- The Admin Block roof is green and hipped on every wing.
- Hostel 4 is finished.
- The Students' Mess is the cluster of four octagonal halls west of D Block.

**Where photos and other sources disagree, the photos win:**
- **Admin Block roof.** The satellite (`03_south…`, `check_admin_zoom.png`) shows one large dark slate-grey roof. Every drone photo (DJI, I363, yt-drone-19s) shows **green hipped roofs** on all wings, so the satellite predates the green roofing. `campus-layout.json` has `roofColor #4B525A` (grey) for `admin`. That's wrong against the photos, so the render uses green. The data is left as it is and the mismatch is logged in `reference/layout/LAYOUT_CHECK.md`.
- **Auditorium.** BUILDING_NOTES and RESTYLE describe a separate cream hall with a slate roof and a red-brick plaza. It's inside the Admin Block (confirmed by H A), so there's no separate building to render.
- **Hostel roofs.** The satellite shows grey-blue metal roofs on Hostels 1–4. The ground photos (New-Hostel, hostel22, DSC_9144) show green hipped roofs with white eaves, so the renders use green.

## Admin Block (with the Auditorium and the Library inside)
- **Walls:** white plaster with thin grey-green horizontal floor bands.
- **Roof:** green hipped roofs on every wing, the largest over the central block, with white fascias.
- **Floors:** 4.
- **Layout:** three wings facing south over the forecourt.
  - **West wing:** a white end block with a vertical teal-glass strip.
  - **Centre block:** open corridor floors with dark-grey bands, glass railings and a glass curtain-wall bay over the main door.
  - **Low linking wings:** 3 floors, with continuous balcony corridors.
  - **East wing:** a white end block with a large round green IIM emblem high on the gable and a vertical teal-glass strip.
- **Glass and stone:** teal-tinted curtain glass in the centre bay and the wing strips; a light-grey stone plinth.
- **Balconies:** continuous corridor balconies with grey-green rails on the linking wings.
- **Entrance:** centre bay, at ground level, facing the flag forecourt (south).
- **Surroundings:**
  - **Flag forecourt:** a circular lawn with a paved ring path and a tall flag mast with the Indian flag in the middle, inside a large red/pink-paved plaza with lamp posts and parked white cars.
  - **Kalam statue garden:** the terraced lawns spread south-east of the forecourt.
  - **Main road:** curves past on the west, with a white bus at the kerb.
- **Photos:** DJI, I363, `academic-admin/yt-drone-19s…`, `08_about_us_gallery/au4.jpg` (front with emblem), `check_admin_zoom.png`.

## New Academic Block (NAB)
- **Walls:** white plaster.
- **Plan:** **long and narrow** (about 4–5 times as long as it is deep), not a deep box (H A).
- **Roof:** flat, with a parapet. Small green-capped stair and lift heads and grey rooftop units.
- **Floors:** 4, with towers one floor higher.
- **Towers:** two tall square **white** stair towers at the ends, each topped with a small rooftop pavilion with a **green cap roof**.
- **Stone:** **large tan/brown stone-clad wall panels** on both sides of the central atrium. The left one carries the round green IIM emblem.
- **Correction (drone crops `crops/nab_*.png`):** the towers are white, not stone. The stone is on the big panels.
- **Glass and stone:** a full-height **teal glass curtain-wall atrium** at the centre and on the end blocks, plus vertical teal glass strips.
- **Balconies:** none; plain window rows with white frames.
- **Entrance:** under the glass atrium, with a flat canopy.
- **Surroundings:** the NAB front road runs along the east side past the NAB lawn; the main road and lake are to the west; a small paved parking strip with cars; the Admin Block below to the south.
- **Photos:** DJI and I363 (centre top), `yt-drone-19s` (behind Admin), `zoom_G_nab_closeup.png`, `zoom_B_nab_kalam_lake.png`.

## Hostel 1 · D Block
- **Walls:** white plaster, an older and simpler style.
- **Roof:** green hipped (in photos; grey-blue on the old satellite).
- **Floors:** 4.
- **Balconies:** many small projecting balconies with **dark metal railings** on the long faces; a **green-railed** walkway and bridge at the entrance level.
- **Glass and stone:** grey stone retaining walls at the base; little glass.
- **Entrance:** from the hostel road junction at the south, over a red/pink-tiled terrace.
- **Surroundings:** several parallel blocks on terraces; the Students' Mess and the Commercial Complex beside it; the football ground just east; the covered walkway runs down from here to the courts.
- **Photos:** `hostels/DSC_9111.jpg` (white block with balconies and green railings; most likely D Block, to confirm), `hostels/DSC_9119.jpg`, `hostels/DSC_9140.jpg`, `zoom_D_hostels_north.png`, `zoom_C…`.

## Hostel 2 · F Block ("New Hostel"), and Hostel 3
- **Walls:** **cream/peach plaster** with a **brown stone-clad base** (ground floor) and brown stone pillars.
- **Roof:** **low green hipped roofs with wide white eaves**; the stairwell towers have their own small green cap roofs, one floor higher.
- **Floors:** 5.
- **Glass and stone:** **full-height blue-teal glass stairwell towers**; glass curtain walls in the common block; brick/stone piers in the courtyard.
- **Balconies:** recessed balconies with dark brown wooden doors and steel railings on the long faces.
- **Entrance:** a gabled white porch on stone piers, with glass doors, steps and a steel ramp.
- **Surroundings:**
  - **F Block:** a timber covered walkway with a green roof in front.
  - **Hostel 2 (F Block):** blocks around a turning circle on the hostel road.
  - **Hostel 3:** the highest blocks on the north ridge (about +50 m). Same new-hostel style as F Block, to confirm.
  - **Both:** pine trees and cut earth slopes.
- **Photos:** `hostels/New-Hostel.jpg`, `hostels/new-hostel-entrance_DSC_9144.jpg`, `hostels/new-hostel-courtyard_hostel22.jpg`, `zoom_D…`, satellite `02_north…` (labelled "F BLOCK NEW HOSTEL").
- **Colour check (13 Nov 2026), the photos agree with H A:** on `New-Hostel.jpg` the walls are pale cream/peach plaster over most of the façade. Brown appears only in the stone ground floor, the stone piers and the small wooden doors inside the balcony recesses, and the recess walls are cream too. The first renders for Hostels 2–4 were dominated by orange-brick balcony bays, which is wrong; redone cream-dominant.

## Hostel 4
- **Status: finished.** The satellite and `zoom_D` show a complete roofed block with a turning circle, and no photo shows scaffolding there. (The unfinished pink frame building on the hill in DJI/I363 is east of NAB, not Hostel 4.)
- **Walls:** assumed to be the new-hostel style (cream plaster and stone base), to confirm.
- **Roof:** a single wide hipped roof, blue-grey on the satellite; rendered green to match the other new hostels, to confirm.
- **Floors:** 4.
- **Footprint:** one large rectangular block, between D Block and F Block on the hostel road.
- **Photos:** none at ground level; satellite only (`zoom_D_hostels_north.png`).
- **Renders:** must be **cream/peach plaster dominant**, never orange or brick (see the hostel colour check under Hostel 2).

## Cafe Cloud Campus (octagonal pavilion)
- **Walls:** white, mostly **large glass windows** all round.
- **Roof:** **two-tier green octagonal roof**: a wide lower ring and a raised clerestory lantern with its own green octagonal cap; white fascias.
- **Floors:** 1.
- **Entrance:** facing the road (east).
- **Surroundings:** a paved terrace and a stone retaining wall on the west side of the main road, opposite the Admin Block; the small **Amul Cafe** kiosk beside it; pines behind.
- **Photos:** DJI and I363 (left), `yt-drone-19s` (left), `check_admin_zoom.png`.

## Dr. Kalam Centre
- **Status: to confirm.** This will be redone from H A's own photos in `reference/photos/campus_new/` when they arrive.
- **No exterior photo.**
- **Satellite:** a mid-sized block beside the road junction north-east of the lake, with a lawn (`kalam-lawn`) around it; the roof reads grey.
- **Render:** the campus style: white walls, green hipped roof, 3 floors, with a small entrance porch. Everything to confirm on campus.
- **Photos:** satellite `03_south…` and `02_north…` (label pin), `zoom_B_nab_kalam_lake.png`.

## Students' Mess (confirmed by H A: the four-octagon cluster)
- **Plan:** a cluster of **four octagonal halls** just west of Hostel 1 (D Block):
  - **one big hall** (about 25 m across, 2 floors);
  - **three smaller halls** (about 16–23 m, 1 floor) grouped round it.

  Each stands on its own light-grey **octagonal paved podium/terrace**, and the podiums are joined by paved courtyards and a big terracotta/brown-paved forecourt inside a retaining wall.
- **Roofs:** **dark grey octagonal roofs** (pyramidal, faceted into eight). The big hall has a **two-tier roof**: a raised inner octagon over the outer ring.
- **Walls:** not visible from above. Rendered as cream/white plaster with tall windows, to confirm with a ground photo.
- **Inside:** grey granite-clad round columns and red/black tables (`04_mess_cafeteria/*`).
- **Surroundings:** the teal-roofed covered walkway passes along the south edge; D Block's long blocks are just east; scrub slope to the west.
- **The old "west-blocks" building** was part of this cluster and has been removed from the data.
- **Reference:** `reference/photos/mess_from_above.png` (a satellite screenshot: looked at only, not uploaded to Gemini). **To confirm** walls and entrances with H A's photos in `reference/photos/campus_new/`.

## Commercial Complex (Mithaas and other shops)
- **Status: to confirm.** This will be redone from H A's own photos in `reference/photos/campus_new/` when they arrive.
- **No exterior photo.**
- **Satellite:** an irregular low block just below D Block, above the gym, by the road.
- **Render:** a single-storey row of shopfronts with awnings, cream walls and a flat roof. To confirm.
- **Photos:** `zoom_C_courts_mess_commercial.png`.

## Octagonal Hall
- **Walls:** white plaster above a **brown stone base band**, with small windows.
- **Roof:** a large **green octagonal roof** with ribbed panels and a small raised octagonal lantern on top.
- **Floors:** 1 (tall).
- **Entrance:** steps up to a door on the plaza side (east, towards the road).
- **Surroundings:**
  - A big **pink/brick-paved plaza** with scooters beside the main road.
  - **Two small octagonal ponds** behind it.
  - The zig-zag **teal-roofed covered walkway** passing above.
  - The flat green-roofed service block across the road.
- **Photos:** `sports/yt-drone-11s…`, `sports/yt-drone-49s…`.

## Main gate
- **Structure:** a two-level gatehouse portal spanning the road. A long **green pitched roof** with a raised smaller green roof on top; a white concrete frame; grey square columns.
- **Sign:** a grey band with "INDIAN INSTITUTE OF MANAGEMENT SHILLONG" in white raised letters and the round emblem at both ends.
- **Gates:** a sliding steel gate under the portal and small guard cabins on each side.
- **Name wall:** stone, with the Hindi and English name, on the right.
- **Surroundings:** a long low **green-roofed building** beside it (guard and security); a dual-carriageway approach with white lines; a pine forest slope behind.
- **Photos:** `lake-and-landmarks/main-gate_gmaps-contributor.jpg` (front), `lake-and-landmarks/yt-drone-45s_main-gate.jpg` (aerial).

## Kalam statue garden
- **Terraces:** a **terraced garden** south-east of the Admin forecourt, with curved terraces held by low grey stone retaining walls and lawn on each terrace.
- **Paths:** **winding pale paved paths** with lamp posts and small clipped shrubs, linked down to the gate.
- **Statue:** the Dr. Kalam statue stands in the middle (confirmed by H A; not visible in the photos, so it's rendered as a small bronze figure on a pale plinth).
- **Photos:** `academic-admin/yt-drone-19s…` (foreground), DJI and I363 (right), `check_admin_zoom.png`.

## Shared campus context (for the mood frame)
- **Terrain:** a lake in a valley.
  - The main road runs from the south gate north past Cafe Cloud and the Admin Block, along the NAB and the lake's east side, to the Kalam junction.
  - The courts strip, the football ground and the Octagonal Hall sit in the middle.
  - The hostels climb the slope to the north: D Block and the Mess about +18 m, F Block about +33 m, Hostel 3 about +50 m.
  - Type 2 and Type 3 quarters sit on a west hairpin.
- **Forest:** dense **Khasi pine** forest all round, with patches of cut orange earth slopes.
- **Courts:** tennis is blue, basketball green with a red surround; next to them a sand pit and a teal-roofed pavilion.
- **Football ground:** bare earth, fenced, with a floodlight mast.
- **Roads:** fresh dark asphalt with white edge lines and a dashed centre line, plus pink paver footways.
