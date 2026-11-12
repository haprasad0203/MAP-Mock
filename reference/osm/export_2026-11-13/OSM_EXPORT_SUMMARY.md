# OpenStreetMap export: IIM Shillong Umsawli campus and surroundings

- **Exported:** 13 Nov 2026 from the OpenStreetMap API. Newest edit in the data: 10 Nov 2026.
- **Box:** 91.9360, 25.6020 → 91.9660, 25.6280. It covers the whole campus boundary (91.9457–91.9583 E, 25.6141–25.6249 N) plus the approach roads and the neighbourhood to the south, for a seamless world edge.
- **Licence:** ODbL. Show "© OpenStreetMap contributors" on the map.
- **Check:** this export contains every road and feature in the earlier `reference/osm/overpass.json`, plus more around the edges.

## Files
| File | Contents |
| --- | --- |
| `map.osm` | Raw OSM XML |
| `osm_roads_paths.geojson` | 119 lines: 1 primary (Bypass Connector), 11 unclassified, 22 residential, 71 service, 14 track |
| `osm_buildings.geojson` | 5 unnamed buildings (2 on campus, near 25.6194, 91.9495 and 25.6201, 91.9493) |
| `osm_areas.geojson` | Recreation ground with 2 basketball pitches + 1 volleyball pitch (around 25.6189, 91.9501); a forest area to the west |
| `osm_water.geojson` | The campus lake / pond, centred near 25.6172, 91.9513 |
| `osm_pois.geojson` | 1 point: National Institute of Fashion Technology (a NEIGHBOUR, not campus; exclude) |

## How to use it
- **Roads = the skeleton.** Campus service and residential roads, tracks, and the approach roads are mapped.
- **Anchors:** the lake and the court strip are well placed. Line everything else up against them.
- **Buildings:** almost none. Place them from the drone photos and videos, or from an open footprint source (Overture, Google Open Buildings, Microsoft footprints) if available.
- **No campus names in OSM.** Names come from BUILDING_NOTES.md, the README and LAYOUT_INVENTORY.md.
- Clip campus features to the campus boundary. Features outside it are surroundings only (draw them as roads, forest and hills, with no labels).
