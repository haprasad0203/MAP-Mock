# Campus page: feature plan

The Campus page is one full-screen pixel-art isometric map of IIM Shillong (Umsawli) that every other page in the WMC 2026 app opens into. It should look like the reference city illustration, drawn as pixel art, and it should feel seamless:
- the map is the whole screen;
- the world doesn't end at the campus wall;
- everything opens on the map itself.

Conference: 27–29 Nov 2026. About 1,000 delegates, most of them new to the campus.

Priority key:
- **Must** ships for 27 Nov.
- **Should** ships if time allows.
- **Could** is delight.

## What's on screen
- **The map**, edge to edge, with no header or frame.
- **Top:** a floating search bar plus filter chips (All, Venues, Food, Hostels, Sports, Services, Help).
- **Right edge:** Locate me, Rotate, Recentre / compass, Layers.
- **Bottom:** one sheet that changes with what the user is doing: idle → "On now", a place is selected → the place card, walking → the route.
- **The app's bottom tab bar.**

## Features

### 1. Look and world
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| Pixel-art isometric style | A fixed 2:1 isometric view like the reference, with crisp pixels that never blur when zoomed | Must |
| Real buildings | Every campus building, with real wall and roof colours, floor counts, name boards, trees, courts and the lake | Must |
| Seamless full-bleed page | The map fills the screen; controls float on it; no page frame | Must |
| A world with no edge | Forest and hills continue past the campus and fade into mist | Must |
| Everything in place | Opening places, zooming and routes all animate on the map; no page jumps, no spinners | Must |
| Brand fit | Pine greens plus the app's yellow; pixel font for labels, Inter for UI | Should |
| Day, dusk and weather | Sky follows real time; windows glow after sunset; mist or rain matches Shillong weather | Could |

### 2. Moving around
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| Drag and pinch | Pan and zoom with momentum and limits | Must |
| Three detail levels | Campus → Area → Building, each showing more detail | Must |
| Recentre | Back to the whole campus, or to you | Must |
| Rotate 90° | See buildings hidden behind others | Should |
| Magnifier bubble | Long-press a building for a close-up | Could |
| Remembers your view | Returning to Campus restores where you left off | Should |

### 3. Places and the place card
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| Name boards and icons | Pixel tags on buildings; icons for food, ATM, medical, help desk, parking, sports | Must |
| Place card | Name, what's inside, walking time from you, Directions | Must |
| What's on here | Sessions running now and next in that building | Must |
| Hours, menus, call | Mess and shop hours and today's menu; call buttons for services | Should |
| Share a place | A link that opens the map on that spot | Should |

### 4. Search, filters, layers
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| Search anything | Buildings, room codes, shops, services, session and paper titles; the map flies there | Must |
| Filter chips | Dim everything except the chosen category | Must |
| Layers panel | Labels, volunteers, crowd, accessible routes, parking | Should |
| Recent and saved places | "My hostel", "My presentation room" | Should |

### 5. Live location
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| You on the map | A pixel character with an accuracy ring, snapped to paths | Must |
| Follow mode | Tap Locate once to centre on you, twice to follow you | Must |
| Not on campus yet | A message with a link to the Guide's arrival plan instead of a stray dot | Must |
| Clear permission ask | Asked only when you tap Locate or Directions | Must |
| Scan to set location | QR codes on signboards and doors fix your position indoors | Should |

### 6. Directions
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| Route to anywhere | Walking route to any place, room or session, drawn as a glowing pixel trail | Must |
| Next step with landmarks | "Past the Kalam statue, then left", with minutes remaining | Must |
| Live reroute | Redraws if you go about 25 m off the route | Must |
| Arrival | "You're at <building>. Room X is on the <floor>", plus a simple floor plan | Must |
| Avoid stairs | Step-free routes | Should |
| Leave-now nudge | "Leave in 3 min to reach your 2:15 session" | Should |
| Pick a start point | Routes without GPS | Could |

### 7. Conference-live layer (27–29 Nov)
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| ON AIR buildings | A blinking sign where sessions are running; tap it for the rooms | Must |
| Event pins | Registration, help desks, first aid, shuttle, cultural evening, gala dinner | Must |
| Room-change signs | "Moved to …" on the old room; routes update | Must |
| Meal time | "Lunch now" at the mess | Should |
| Crowd level | Busy / OK / quiet badges from anonymous counts | Should |
| Time slider | Preview where things happen later today | Could |

### 8. People
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| Volunteers | Opt-in, on-duty volunteers shown as orange figures with a call button | Should |
| Share location with a friend | 1-hour opt-in sharing and a meet-up pin | Could |

### 9. Hand-offs from other pages
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| Deep links | Session sheet, Home's "Up next", mess menu and help desk all open the map already focused | Must |

### 10. Delight
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| Ambient life | Clouds, lake shimmer, tiny walkers | Could |
| Campus tour | A guided first-time walkthrough | Could |
| Explore badges | Collect landmarks you visit | Could |

### 11. Accessibility and fallbacks
| Feature | What the delegate gets | Priority |
| --- | --- | --- |
| 2D and list views | For weak phones and screen readers | Must |
| Accessible UI | 44 px or larger targets, 4.5:1 contrast, routes that don't rely on colour alone | Must |
| Offline | Map, search, location and directions work without internet after one visit | Should |

### 12. Organiser view
| Feature | What the organiser gets | Priority |
| --- | --- | --- |
| Survey mode | Walk the campus and save GPS points for entrances and landmarks; this replaces the need for QGIS | Must |
| Crowd heat map | Anonymous density on the same map | Should |
| Pin an alert to a place | e.g. "Room 104 moved to 106", shown on the map | Should |

## Must-have cut for 27 Nov
1. Pixel campus with the seamless edge.
2. Search, filter chips, place cards.
3. Blue-dot location (plus Survey mode to align it).
4. Directions with the arrival message.
5. ON AIR signs, event pins, room-change signs.
6. Deep links from session pages and Home.
7. 2D/list fallback.

## Requirements
- **No Google Maps API.** GPS comes from the phone's browser; routing runs on the phone.
- **Geometry without QGIS:** OpenStreetMap if it covers the campus, plus a hand-authored schematic layout, aligned on campus with Survey mode. QGIS GeoJSON can replace it later through the same adapter.
- **Art:** the base is rendered by code; Gemini generates pixel sprites for the 6–8 landmark buildings and icons where needed, matched to real photos.
- **Photos:** collected online by Claude Code (Step 0 in the prompt); the institute's drone footage would help most.
- **Offline:** a service worker caches the map and data (under about 15 MB). Live layers need internet.
- **People and time:** one developer (Claude Code), someone to walk campus in Survey mode, organisers for the event pins and room list, and a walk test with 3–4 phones (including a cheap Android and an iPhone).

## Open questions for organisers
- [ ] Is the Auditorium part of the Admin Block or a separate building?
- [ ] Which building is NAB, and which is the Admin Block?
- [ ] How do the hostel names map (Hostel 1–4, blocks A–O, U Tirot Sing, D Block, F Block)?
- [ ] Where are the main gate, the Kalam statue, the medical room and the help desk?
- [ ] Which room is in which building and on which floor?
- [ ] Where will the event spots be: registration, help desks, first aid, shuttle, cultural evening, gala dinner?
- [ ] Note: Lariti is off campus. Make sure no session links route to it on the campus map.
