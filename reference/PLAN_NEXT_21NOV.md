# WMC 2026 campus map: plan for the open work (21 Nov 2026)

The conference opens on **27 Nov 2026**. This plan covers everything still open after the 20–21 Nov sessions, in order. Each item lists its inputs, its steps and what "done" means.

## The rules
- **H A's rules** (memory: replica rules, asset rules):
  - **Look:** an exact tycoon-game replica of the real campus. Real geometry and colours, finished soft (clean colours, warm light, rounded edges).
  - **Every angle:** every building is right from every side. Where nothing shows a face, assume it, and list the assumption.
  - **Construction sites** are shown as sites.
  - **Removing structures:** remove only what the footage shows is not there. List the unsure ones for H A.
  - **No drawings exist.** Work from H A's footage and the older photos only.
- **Workflow:**
  - Commit after each step.
  - Merge into `main` and `phase-3`, push, and redeploy only when H A asks. They did on 21 Nov.

---

## 0. Where things stand (21 Nov, end of the session)

| | |
|---|---|
| Live site | https://wmc-campus-map.vercel.app, redeployed 21 Nov |
| Git | `main`, `phase-3` and `claude/phase3-finish` all at the same commit, pushed to GitHub (haprasad0203/MAP-Mock) |
| Local folders | `D:\Map Mock` (master) and the phase-3 worktree are both up to date |
| Footage, not in git (about 7 GB) | `D:\Map Mock\OneDrive_2026-11-20.zip`, `drive-download-…zip`, `reference\video\sharepoint\` (videos), `reference\video\drone_20nov\` (DJI), `reference\video\stills\` (stills and contact sheets `_sheet_*.jpg`) |

**Done so far:**
- the sky entrance;
- fake buildings removed and missing ones added;
- **NAB:** rebuilt from the drone footage, with its roads, forecourt and doors;
- **Admin:** re-traced as an L with the hall at the corner;
- the Admin–NAB paved walk with lamps and benches;
- woodland ground; the forecourt, statue garden and lawns as seen;
- the road and ground bugs from 21 Nov fixed;
- the study index of all footage (`reference/real/STILLS_20NOV.md`);
- the whole-frame check (`reference/real/drone_check_v3.jpg`).

**Method to reuse** (memory: drone tracing):
1. Trace on the campus grid in the rotated frame.
2. Convert each item at its own height with the relief-aware fit (`fitDrone3`).
3. Show H A a check image with our data drawn back onto the footage.

---

## Progress, 21 Nov (later the same day)
H A's order: free rotation and tilt, then Google Maps movement, then finish the build, then the bug sweep, then the full tycoon polish.

**Done:**
- **Free rotation and tilt.**
- **Google Maps-style gestures:** grab-drag, a smooth fling, pinch, twist and two-finger tilt, wheel steps, keyboard, and the north compass.
- **Cafe Cloud:** octagon, verandah, entrance, sign and steps.
- **Gym:** moved to the real hall by the tennis court.
- **Scholar's Path:** the zig-zag.
- **Courts:** blue tennis court; tennis and volleyball labels on the right courts.
- **Football ground:** pitch and track.
- **Land cover from the footage:** grass, woods and earth in the sports zone.
- **Hostel zone:** D Block 5 storeys with roof skirts and tank stands; Hostel 4 a 9-storey tower; a construction block; the Commercial Complex an octagon; teal Mess roofs; F Block and Hostel 3 in cream.
- **Kalam Centre:** grey roof and walls.

**Still open in the build:**
- **West campus:** two 6–7 storey bare-frame construction blocks on a cut terrace (seen in the June frame @0:27.8), not placed yet: needs a solved frame closer to them.
- **The portico building by the loop road** (`bldg-portico-loop`): 2 storeys under a two-tier green roof (use to confirm).
- **Octagonal Hall, gate and guard room, quarters, west cluster:** a footage check of each.
- **Hardscape details:** the Kalam Centre forecourt (beige checker pavers), the pond by the construction site, gabion walls.
- **Land cover beyond the sports zone:** solve more June frames.

## 1. Bugs (separate from the open work; fix first)

**Bug or open item?**
- **Bug:** something we built draws wrong, such as zigzag roads, grey patches, floating or poking objects, overlaps, broken interaction.
- **Open item:** something not built yet, or not yet true to the real campus.
- **Preview only:** the local preview runs the same code as the live site. So far every glitch H A has seen is a real bug that would show live too, not a preview quirk.

### Fixed
| # | Bug | Cause | Fix |
|---|---|---|---|
| B1 | Zigzag black/white roads, e.g. the SW road beside NAB (H A's screenshot, 21 Nov) | Each road strip (kerb, lines, asphalt) followed the ground at its own edges; on a cross-slope they cut through each other | One level road bed per road sample, plus kerb faces down to the ground (`roads.ts`) |
| B2 | Grey patches on the ground beside NAB | Ground painted on each part's bounding rectangle, not its true outline | True outline (`world.ts`) |
| B3 | The Admin–NAB walk drawn as a bridge over the road, with a canopy | Traced too far; canopy wrongly assumed | Stops at the kerb; open paved walk |
| B4 | NAB's green V band drawn as an X | Facet lines extended both ways | Extended back only |

### To check in a full sweep (day 1)
**The sweep:** a fixed tour of about 40 viewpoints (each building, each road junction, the lake, gate, hostels and quarters), each from 4 directions and 2 tilts, at desktop and phone sizes. Script: `scripts/tour.mjs`, to write. Every glitch gets a B-number here with its cause and fix.

**Likely bug classes to look for:**
- **Road junctions:** two roads' ribbons overlapping at different bed heights (steps or z-fighting); width jumps where the "narrow" zones (tight spots in `hardscape.json`) start and end; gaps at road ends that should join.
- **Hardscape on slopes:** lamps, benches, fences, walls and steps floating or buried. Steps facing the wrong way (the portico steps wrap the hall's corner, so check their side).
- **Building pads:** cliffs or holes where a pad meets the slope; plinths floating; buildings sinking into terraces.
- **Trees** inside buildings, on roads or paths, in the lake, or on the forecourt.
- **Roofs:** z-fighting where roofs overlap (Admin wing roofs run into the hall wall, which is intended but must not flicker); NAB pavilions poking through.
- **Water:** the lake edge and trail versus the shore; the reservoir and plant tanks.
- **Labels:** stacked or overlapping (Cafe Cloud, Tin Café and Amul Cafe together); a label hidden behind a building; text cut off on phones.
- **Interaction:**
  - taps hitting the wrong building (pavilions and NAB parts);
  - the selection ring on multi-part buildings;
  - routes: no walking through buildings; the new NAB doors and footpaths must connect;
  - deep links `?place=` and `?route=`.
- **Sky entrance:** plays once; tap to skip; reduced motion; deep links skip it; no flash of UI.
- **Phone:** frame rate, memory, the bottom sheet over the map, the 2D fallback.

**Done when:** the tour is clean at all viewpoints, the fixes are committed, and the tour images are in `reference/review/tour_<date>/`.

---

## 2. Every building exact (the main open work)

### Sources by building
The straight-down frame covers only the Admin–NAB–Cafe Cloud core. The rest comes from the oblique June drone pass, the SharePoint stills, H A's April walk videos, the brand films and the older photos. Satellite screenshots are for measuring and checking only; nothing is traced from them.

| Building | Status | Best sources | What to establish |
|---|---|---|---|
| Admin | Traced 20 Nov | nadir, films | Back faces (assumed), hall high windows, portico steps, east and west end faces |
| NAB | Traced 20 Nov | nadir, 0623 drone, NAB stills | NW back face and the annex (assumed); stair heads; entrance canopy details |
| Cafe Cloud (+ Amul, huts) | Octagon slightly off | nadir, CCC_and_Lake stills | Octagon radius and turn from the nadir; peach portico with round columns and sign; terrace; lantern |
| Hostel 1 (D Block) | Overture parts | Hostel stills (IMG_6813, 5672), 0623 drone | Wings and floors; balcony rows; stair towers; rooftop water-tank frames; the green walkways and the hairpin road; red-paver terraces with green railings |
| Hostel 2 (F Block), Hostel 3, Hostel 4 | Overture / by-eye | 0623 drone frames 39–41 s, hostel stills | Footprints against the oblique drone; floors; cream and peach colours; courtyard |
| Students' Mess | 4 octagons | 0623 drone, older photos | Octagon sizes and positions; forecourt; roofs |
| Octagonal Hall | Overture | 0623 drone, brand film | Size (about 27 m), the plaza and ponds, the lake side |
| Dr. Kalam Centre, Kalam Building, road-block | Overture | older photos, drone | Which block is which (to confirm); floors and colours |
| Commercial Complex | Overture | 0623 drone (courts area) | Shape, floors, use |
| Gym and Sports Pavilion | Overture | Sports/Football stills, 0623 drone | Pavilion stands; gym roof; court markings and colours |
| Main gate and guard room | By-eye | IIMS film @0:22, New Videos 073313 | Portal: sage gable roof on cream pillars, the name in metal letters, emblems, arched gates, guard cabins, stone name wall |
| Type 2 and Type 3 quarters | Overture | 0623 drone, New Videos 072927 / 073143 | Blocks and floors, roof colours, stairs |
| Water tank, substation, small blocks | Overture | drone, satellite (check) | Which exist; what they look like |
| Construction sites | Not modelled | 0623 drone (hostel blocks, near NAB, by the courts) | Bare frames, scaffolding, red earth, site fences and sheds |

### Steps for each building
1. **Study sheet** (`reference/real/<id>.md`): every still that shows it, by face (N, E, S, W, roof); floors; bays; colours.
2. **Footprint and position:**
   - from the nadir where it covers the building;
   - otherwise from the oblique drone frames, using a matched camera (`?cam=`) and overlays. Overture stays only where it fits the footage.
   - All measured; any change recorded in `LAYOUT_CHECK.md` and applied through a plan file, so the generator keeps it.
3. **Model by role** (like `nab.ts` and `admin.ts`): walls and bays per face, glass, stone, balconies, stairs, canopies, roofs, rooftop items, surroundings.
4. **Check:**
   - real versus map side by side from 2–3 matched viewpoints (`reference/style/compare/real_<id>_v<N>.png`);
   - scored in `STYLE_LOG.md`, at least 9/10, with any assumed faces listed.
5. **Commit** after each building.

**Order:**
1. Cafe Cloud (quick: it's in the nadir).
2. The hostels: Hostel 1, Hostel 2, then Hostels 3 and 4.
3. Mess.
4. Octagonal Hall.
5. Main gate.
6. Kalam Centre, Kalam Building.
7. Gym, pavilion and courts.
8. Commercial Complex.
9. Quarters.
10. Small blocks.
11. Construction sites.

---

## 3. Ground levels and the shape of the land
1. **Read the levels** from the oblique frames and the nadir:
   - terraces, retaining walls and cut slopes (red earth);
   - the lake banks and water level;
   - the pads of NAB and Admin, the hostel terraces, the courts, the football ground.
2. **Data:** add them to `hardscape.json` as typed items (terrace, retaining wall, cut slope, embankment), with their heights.
3. **Terrain:** let the terrain follow them (flatten and blend in `terrain.ts`). Roads keep their new level beds.
4. **Done when:** no building floats or sinks; the terraces read as in the footage; there are no cliffs at the pad edges.

## 4. Paths, walls, gardens and lighting outside the drone frame
1. **Main walkways:**
   - the Scholar's Path, its full run: translucent roof on brown posts, cream X-railings, red paver floor (New Videos 073418);
   - the hostel walkways (green roofs, green railings).
2. **Ground features:**
   - the courts with their colours and fences;
   - the football ground;
   - the lake edge and trail;
   - gardens, hedges and lamp rows (ring-head lamps on walks, solar lamps on roads).
3. **Signs and furniture:** signboards, mirrors at bends, benches, bins, as seen in the April walk.
4. **Done when:** each is checked against its stills.

## 5. Free rotation and tilt (like Google Maps)
1. **Phone:** two-finger twist rotates freely round the fingers' centre; two-finger drag tilts (about 25° to 70°).
2. **Desktop:** right-drag or Ctrl-drag rotates and tilts.
3. **Compass:** shows the true bearing; a tap resets the view. The rotate button keeps its 90° steps.
4. **Everything works at any angle:**
   - labels, tapping, the selection ring;
   - routes and the blue dot;
   - shadows (re-fit) and the sky entrance.
5. **Check:** every building from 8 directions × 3 tilts. Fix any assumed face that looks wrong.

## 6. Season: late November, cherry blossom
1. **Trees:** pink Himalayan cherry (IIMS film @0:10) along the roads, round the forecourt and lake, and by the hostels, mixed with pines and rounded trees.
2. **Ground and water:** warm green grass with a hint of gold; a clear blue-green lake.
3. **Light:** soft warm late-autumn light.
4. **Whole-map tycoon pass:** colour grade, haze, tree mix and density. Scored against the style target; currently 69, aiming for over 80.

## 7. Phase 5: offline, fallback and phone speed
1. **Offline:** a service worker caches the app, data and textures after the first visit; an offline badge; a cache-busting version.
2. **Fallback:** a 3D failure or a slow phone drops to 2D or the list view (test it).
3. **Speed:**
   - split the large chunks (`materials` is 588 kB; Engine3D);
   - merge static meshes and instance repeated props (lamps, benches, cars);
   - simpler buildings at campus zoom (LOD); tree budgets per quality tier;
   - texture sizes.
4. **Targets:**
   - at least 30 fps on a mid-range phone at Medium;
   - first view in under 4 s on 4G;
   - measured with `?fps=1`.

## 8. Final checks, deploy, handover (25–26 Nov)
1. **Final checks:**
   - the tour (§1) again;
   - real-versus-map sheets for every building;
   - phone checks (390 × 844) and desktop.
2. **Release:** merge, push and redeploy.
3. **Notes for organisers:** what is assumed, how to update `live.json` (room changes, event pins).

## 9. Real-phone GPS test on campus (needs someone on site)
1. **Walk:** the gate → Admin → NAB → Mess → hostels with the live map.
2. **Record:** blue-dot error, route guidance, the off-route reroute.
3. **Fix:** align with Survey mode where needed.

---

## Decisions needed from H A
1. **Unsure footprints** (list in `LAYOUT_CHECK.md`): forest north-west of the hostels, and block-962 (court, tank or building?).
2. **rd-nab-north:** it looks like a red-earth track from the air. Show it as a track?
3. **Reservoir north of NAB:** drinking water or a pool?
4. **Construction sites:** which ones will look finished by 27 Nov, if any.
5. **Conference doors:** which NAB and Admin doors delegates use (main and side).

## Schedule to 27 Nov
| Day | Work |
|---|---|
| Fri 21 Nov | Bug sweep and fixes (§1); Cafe Cloud; start the hostels |
| Sat 22 Nov | Hostels, Mess, Octagonal Hall, gate (§2) |
| Sun 23 Nov | Kalam, sports, Commercial Complex, quarters, small blocks, construction sites (§2); ground levels (§3) |
| Mon 24 Nov | Paths and gardens outside the frame (§4); free rotation and tilt (§5) |
| Tue 25 Nov | Season look (§6); Phase 5 (§7) |
| Wed 26 Nov | Phase 5 finish; final checks; deploy (§8); GPS test if someone is on campus (§9) |
| Thu 27 Nov | Conference: hotfixes only |

**Risks:**
- Buildings outside the nadir are slower to place exactly. Budget them first and keep the quarters to one round each if time runs short (H A wants all exact, so flag before cutting).
- Phone speed with all the detail: Phase 5 can't slip past 26 Nov.
