# Build the Campus page: a seamless pixel-art isometric map of IIM Shillong

You are Claude Code, working in the existing codebase of the Pan-IIM World Management Conference (WMC) 2026 app (live at paniim.planos.in). IIM Shillong hosts the conference at its Umsawli campus, 27–29 November 2026. About 1,000 delegates will use this page on their phones to find buildings, rooms and services and to walk to sessions. Most of them have never been to this campus.

Read `reference/PLAN_campus_map.md` first: it's the agreed feature plan. This file tells you how to build it.

## How to work
1. Read the codebase and follow its conventions: framework, routing, styling, data layer and auth. Find the existing Campus route and the session, venue and mess-menu data.
2. Do **Step 0 (photos)** and **Step 1 (art generation, only if needed)** below.
3. Write the implementation plan to `reference/IMPLEMENTATION_PLAN.md` and stop for my approval. Don't write app code before I approve.
4. Build phase by phase (see "Build phases"). After each phase:
   - run the app
   - check the Campus page in Chrome at 390 px (phone) and 1280 px wide, taking screenshots
   - fix what looks wrong
   - give me a 5-line summary
5. Ask me before any destructive change: deleting files, rewriting existing routes, database migrations.

You have Chrome connected (Claude in Chrome). It shares my logged-in browser session, including Gemini, which is open in a tab. If you hit a login page or a CAPTCHA, stop and ask me to handle it.

## Reference pack: `reference/IIM_Shillong_Campus_Map_Pack/`
- `01_satellite_screenshots/`: Google Maps satellite views with place labels. `README.md` gives each image's centre coordinates and scale.
  - Use them ONLY as a visual guide to the relative arrangement of buildings, roads, the lake and the grounds.
  - Never trace geometry or extract coordinates from them; Google's terms forbid it.
- `02_style_reference/isometric_city_map_style_reference.jpg`: the target look (dense isometric city illustration). We want this, but as crisp pixel art.
- `README.md`: place list, facts, colours and open questions. It's the source of truth for names.

## Step 0: Search online for building and hostel photos
Collect reference photos of every campus building, so the art matches the real campus. Save them under `reference/photos/<area>/`, downloading with curl or PowerShell from the terminal.

Areas:
- aerial
- academic-admin
- auditorium
- library
- kalam-centre
- hostels (F Block / New Hostel, D Block, U Tirot Sing Student Residence, other blocks)
- mess-and-shops
- sports (football ground, basketball, volleyball, gym)
- lake-and-landmarks (lake, main gate, Kalam statue)

Where to look, in this order:
1. https://www.iimshillong.ac.in/campus-tour/ and https://www.iimshillong.ac.in/about-us/. These are official photos under `/wp-content/uploads/`, including the drone shot `2024/11/DJI_0338-0000-01.jpg`, the hero image `2024/11/Image_363.jpeg`, and photos of hostels, the gym, mess, library and classrooms. If downloads from the terminal are refused, open the page in Chrome and save the images from there.
2. Other official IIM Shillong pages: news, events, the Dr Kalam Centre page, the "Nuksa The Pine Chronicle" newsletters, the I-Week brochure.
3. Google Maps photos for each campus place: IIM SHILLONG, IIM Shillong Auditorium, Dr. Kalam Centre, F Block New Hostel, D block, Football Ground, Basketball courts, IIM Shillong Students' Mess.
4. News articles on the Umsawli campus inauguration (Dec 2022) and the U Tirot Sing Student Residence (June 2023).
5. YouTube campus tours or drone videos of IIM Shillong Umsawli. Note timestamps of useful frames.

Rules for the photos:
- Prefer exteriors from a corner or from above: roof shape and colour, wall colour, floor count, entrances.
- Skip photos that are mainly of people, and never use photos of public figures.
- Write `reference/photos/SOURCES.md`, listing every saved file with its source URL, what it shows and the building it maps to.
- Photos are internal art reference only. Never ship them in the app.
- From the photos, write `reference/photos/BUILDING_NOTES.md`. For each building, give:
  - wall colour
  - roof type and colour
  - floor count
  - distinctive features (glass stairwells, stone pillars, balconies)
  - visible entrances
  Mark anything uncertain as "to confirm on campus".

## Step 1: Generate art with Gemini (only where code-generated art isn't enough)
The base campus is rendered by code: terrain, roads, paths, trees, simple buildings. Use Gemini (open in Chrome) only for things code can't make look good:
- a style tile
- pixel sprites of the 6–8 landmark buildings (main academic/admin building, Auditorium, Knowledge Centre, Dr. Kalam Centre, U Tirot Sing / F Block hostels, Students' Mess, the lake edge, the Kalam statue)
- category icons
- small props: pine tree, bench, lamp post, car, walking figures

How:
1. Start with ONE style tile, so every later image matches it. In the Gemini tab, prompt:
   > "Isometric pixel art style tile for a hill-campus map game. 2:1 isometric angle, crisp pixels, no anti-aliasing, limited palette: pine greens, cream walls, green and slate-grey roofs, blue lake water, grey asphalt roads, sandy footpaths, accent yellow #FFD23F and dark pine green #0F4D32 outlines. Show a grass tile, a road tile, a footpath tile, a water tile, a pine tree, a bench and a lamp post on a plain flat light background. Style similar to a polished pixel-art city builder."
2. For each landmark, attach 1–2 photos from `reference/photos/` plus the style tile, and prompt:
   > "Using the attached style tile, draw <building name> as a single isometric pixel-art building sprite, viewed from the south-east at a 2:1 isometric angle. Match the real building in the attached photo: <wall colour>, <roof type and colour>, <floor count> floors, <distinctive features>. Crisp pixels, no anti-aliasing, dark 1-px outline, plain flat light background, no people, no text."
3. Download each result from Gemini (it lands in my Downloads folder). Move it with the terminal to `public/campus-art/<slug>.png`, then remove the background and quantise it to the palette in code (e.g. with sharp), so sprites stay crisp and consistent.
4. Log every generated image in `reference/generated/GENERATED.md`: the prompt used, the source photos attached, and the final file path.
5. Keep each upload under 10 MB. Never upload photos of people.

If Gemini output isn't consistent enough, fall back to code-generated buildings with the colours from BUILDING_NOTES.md, and tell me.

## The concept
A full-screen, pixel-art isometric illustration of the real IIM Shillong Umsawli campus. It should be as detailed and alive as the reference city map, drawn as pixel art. It doubles as a working navigation map with a live "you are here" marker and walking directions, and it works offline after the first visit.

## Visual style
- Fixed isometric view (2:1), with rotation in 90° steps.
- A pixel-art finish: hard pixel edges, a limited palette, no blur when zoomed.
  - Recommended: render the scene at about 1/3 resolution, upscale with nearest-neighbour, and add a 1 px dark outline pass. Place the Gemini landmark sprites over the code-rendered base.
- Campus look (refine from BUILDING_NOTES.md):
  - Cream and white walls, green pitched roofs on the academic buildings.
  - Brown stone-clad pillars and glass stairwell towers on the newer hostels.
  - A large dark-grey auditorium roof.
  - Blue and green courts, a green football ground, the lake.
  - Grey roads curving over hills, dense pines.
- Palette: pine greens, cream walls, green and grey roofs, a blue lake, grey roads, sandy paths. Accents: `#0F4D32` and `#FFD23F`.
- Labels are pixel name boards floating above roofs. Use a pixel font (e.g. Pixelify Sans) for map labels and big numbers, and Inter for the rest of the UI.
- Ambient life, kept light: clouds, lake shimmer, a few tiny walking figures. Optional: the sky follows real time, windows glow after about 4:45 pm, and mist appears when it's foggy.

## Seamless requirements
- The map fills the screen edge to edge, with no header, card, border or "map box". Controls float on top.
- The world has no hard edge: forest and hills continue past the campus and fade into mist.
- Everything happens in place, with no page navigation and no spinners.
- Other pages deep-link in already focused. For example, "Directions" on a session opens Campus with the route drawn.
- Returning to Campus restores the last view.

## Screen layout (mobile first)
1. Full-bleed map.
2. A floating search bar at the top, with filter chips: All, Venues, Food, Hostels, Sports, Services, Help.
3. A vertical button stack on the right (44 px or larger): Locate me, Rotate 90°, Recentre / compass, Layers.
4. One bottom sheet that changes with what the user is doing: idle shows "On now", a selected place shows the place card, navigating shows ETA and the next step.
5. The app's existing bottom tab bar.
UI style: 4 px corners, 2 px pine-green borders, hard offset pixel shadows, no gradients.

## Places
Use the names below and confirm them against the app's existing venue data.

- Academic and admin: the main IIM Shillong academic/admin building, IIM Shillong Auditorium, Knowledge Centre (library), Dr. Kalam Centre, Kalam Building, New Academic Block (NAB, if separate in the app data).
- Residential: F Block (New Hostel), D Block, U Tirot Sing Student Residence, the other hostel blocks. Type 2 Quarters is staff housing, shown as a landmark only.
- Food and shops: Students' Mess, Commercial Complex (Mithaas, Golmei, Jim's Shop, Fruit & Vegetable Shop, Salon, TK's, AJ's Laundry), Cafe Cloud Campus, Worth The Taste (Tin Café).
- Sports: Football Ground, Basketball Courts, Volleyball Court, Gym.
- Landmarks and services: Campus Lake (with walking trail), main gate, Dr. Kalam Statue, ICICI Bank ATM, medical room, help desk, Water Supply Tank, IIM Substation, parking.
- EXCLUDE: **Lariti** is NOT on campus. Remove it from all labels, pins and search results.
- EXCLUDE neighbours that aren't campus: North East Centre for Technology, NIELIT Shillong, NEEPCO Township, [24]7.ai, Umsawli Picnic Area, New Shillong View Point, and the surrounding construction sites. Draw those areas as forest or hills.

## Features
Build every Must, Should and Could item in `reference/PLAN_campus_map.md`. Must items ship first.

## Campus geometry WITHOUT QGIS (important)
There's no QGIS model yet. Build a data layer that works now and can be swapped for QGIS later with no code changes.

1. Check OpenStreetMap via the Overpass API from the terminal (bbox 25.610,91.945,25.624,91.962) for building outlines, roads and footpaths.
   - If coverage is useful, import it and show "© OpenStreetMap contributors" on the map.
2. For anything missing, hand-author a schematic `campus-layout.json`: buildings as simple polygons (footprint, floors, roof type and colour, label), roads, footpaths, lake, grounds, trees and entrances.
   - Use a local metric grid with one latitude/longitude origin.
   - Get the arrangement from the satellite screenshots and photos, by eye. Don't trace them.
3. Add an organiser-only **Survey mode** in the Organizer console.
   - An organiser walks to an entrance, junction or landmark and taps "Save this point as …". The app stores the averaged GPS fix.
   - The layout is fitted to these control points (similarity/affine transform plus per-building nudges).
   - Surveyed entrances become route end points.
4. Keep one adapter interface, `CampusGeometrySource`, with three implementations: schematic JSON plus survey (now), an OSM import (if available), and QGIS GeoJSON in EPSG:4326 (later). Rendering, routing and search read only from the adapter.
5. Build the walking graph from the path data: nodes at junctions and entrances, edges weighted by length and slope.

## Live location and directions
- Use the browser Geolocation API (watchPosition, high accuracy). No paid map APIs and no Google Maps API.
- Smooth the readings, snap to footpaths, and show an accuracy ring.
- Compute routes on the device over the walking graph. Reroute when the user is more than about 25 m off the route.

## Offline
- After the first visit on Wi-Fi, these work in airplane mode: the map, search, place cards, the GPS marker, directions, and the last-downloaded schedule.
- Cache with a service worker. Show a "Download campus map" prompt on first open. Budget: under about 15 MB.
- ON AIR, room changes, volunteers, crowd levels and the help desk need a connection. Offline, show the last state with "Last updated X min ago".

## Performance
- Smooth panning on a 3–4-year-old mid-range Android phone.
- The map appears in under 3 seconds on 4G.
- Pause animation when idle.
- Fall back to the 2D view on weak devices.

## Out of scope
Indoor turn-by-turn navigation, AR, voice guidance, payments.

## Build phases
0. Photo research (Step 0) and, if needed, the Gemini style tile and landmark sprites (Step 1).
1. Data layer, schematic layout, place list (no Lariti), Survey mode.
2. Pixel isometric renderer: seamless world edge, detail levels, labels, place card, search, filters.
3. Live location, walking graph, directions, arrival.
4. Conference-live layer, and deep links from session pages, Home and the mess menu.
5. Offline caching, 2D/list fallback, performance pass.
6. Should and Could items if time remains.

## Definition of done
On campus, a first-time delegate can:
1. open Campus,
2. see themselves on the pixel map,
3. search a room or tap Directions on a session,
4. follow the trail to the correct entrance, and
5. see which floor the room is on.

This must also work in airplane mode after one earlier visit. The page must look like one continuous illustrated world, not a map inside a page.

Finish with a short report:
- what was built and what's stubbed
- the photos found and the art generated for each building, and the gaps
- the place names that still need organiser confirmation
- how to run Survey mode on campus
