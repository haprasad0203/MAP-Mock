# Overture Maps export: IIM Shillong Umsawli campus and surroundings

- **Downloaded:** 13 Nov 2026 with the official `overturemaps` tool. Release **2026-10-21.0**.
- **Box:** 91.9360, 25.6020 → 91.9660, 25.6280 (the same box as the OSM export; it covers the whole campus plus surroundings).

## Files
| File | Contents |
| --- | --- |
| `overture_buildings.geojson` | **1,146 building footprints** in the box, **243** with their centre inside the campus boundary box. Sources: Google Open Buildings (188 on campus) and Microsoft ML Buildings (55). Of the campus ones, 33 are over 200 m² and 6 over 500 m² (the big academic, auditorium and hostel blocks). No heights, floors or names. |
| `overture_places.geojson` | 2 places: "IIM Shillong" (25.62004, 91.95022: a general campus pin, not a specific building) and "NIFT Shillong Permanent Campus" (a NEIGHBOUR to the south-west; exclude) |
| `overture_road_segments.geojson` | 151 road segments (71 service, 41 residential, 17 unclassified, 15 track, 5 primary). Overlaps with OSM; use OSM as the main road source and this to cross-check. |
| `overture_check.png` | A check map: these footprints over the OSM roads, lake and courts, with the Google "IIM SHILLONG" pin and the campus box |

## How to use it
- **This is the building footprint source.** Use Overture footprints for building shapes and positions. Take names, floors, roof types and colours from BUILDING_NOTES.md and LAYOUT_INVENTORY.md.
- **Match footprints to buildings:** the north-ridge hostel blocks, the Type 2 Quarters row on the west hairpin road, the long zig-zag covered walkway near the courts, the main academic/admin building at the Google pin, the auditorium south-east of it, the octagonal hall, the mess. Check each against the drone photos and videos.
- **Exclude what isn't campus:** the dense small-house clusters to the south-west (village, NIFT) and the north-east hamlet are outside the campus. Draw them only as background (simple roofs, no labels), or drop them.
- **Caution:** these are AI-detected footprints from older imagery. New buildings (e.g. the newest hostel blocks) may be missing, and some large blocks may be merged or split. Fix them from the drone photos and confirm with Survey mode.
- **Licence and attribution:** Overture buildings are ODbL; the sources include Google Open Buildings (CC BY 4.0) and Microsoft ML Buildings (ODbL). Show "© OpenStreetMap contributors, Overture Maps Foundation, Google Open Buildings, Microsoft" with the map.
