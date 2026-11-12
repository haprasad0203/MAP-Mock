# Layout v2 generator (reference only)
Python 3 + shapely, numpy, Pillow, networkx. Ran on 13 Nov 2026 in a scratch environment where:
- `overture/buildings.geojson` = `reference/overture/export_2026-11-13/overture_buildings.geojson`
- `osm_dl2/out/` = `reference/osm/export_2026-11-13/`
- `dem/` = AWS Terrain Tiles z15 (x 24752–24754, y 13969–13971), https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png
- `pkg/` = `reference/IIM_Shillong_Campus_Map_Pack/`
Order: build_v2.py → places_v2.py (+ checks) → check_v2.py / topdown.py → inventory.py.
Footprint indices (FP[i]) are positions in the Overture GeoJSON; each part's `src` carries the stable Overture GERS id.
