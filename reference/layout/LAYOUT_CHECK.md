# Layout v2 check log

Rule: change the layout only when it is clearly wrong against `check_01..03.png`, `zoom_*.png`, `layout_v2_topdown.png` or the drone photos. Log every change with what, why and evidence. Never move buildings to "look nicer" or to make a test pass.

## Phase 1 (13 Nov 2026)

### Layout changes
None. `campus-layout.json` v2, `places.json`, `osm.json` and `terrain.json` are unchanged.

### Code references fixed (code, not data)
- No hard-coded building ids in `src/` were stale. The deep links (`room=AUD`, `room=104`, `room=LIB-R`, `room=101`, `place=mess`, `place=help-desk`) all resolve.
- `auditorium`, `library`, `AUD` and `LIB-R` point to `admin`. `tin-cafe` is a pin with no building. The hostel ids match the H A naming.

### Data tests (`src/data/data.test.ts`), all passing
| Check | Result |
|---|---|
| buildingId / areaId / landmarkId in places, rooms and sessions exist | OK |
| Every entrance within 3 m of the network | OK (max 0.22 m) |
| Every entrance on the main network | OK. The main network is 141 of 151 lines. |
| Pins inside the boundary (10 m tolerance) | OK. Only the ATM is outside (29.7 m, expected). |
| Every part has `poly`; unnamed buildings have no places | OK |

### Observations (not changed, for the organiser)
- **`lake-trail` (layout path) is not connected to the main network.** Its ends are more than 3 m from any road and it crosses none. No entrance depends on it, but Phase 3 routing can't use the trail until a connector is surveyed.
- **Small detached OSM pieces** (expected): `osm-1050925777+…779+…782`, `osm-1051011499+osm-1051186881+osm-1051189581`, `osm-1050216167`, `osm-1050925783`, `ovt-150`.
- Low-confidence items in `LAYOUT_INVENTORY.md` stay flagged `confirm` for Survey mode.
