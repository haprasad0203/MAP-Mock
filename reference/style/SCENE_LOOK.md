# Make the whole map look like the reference (H A, 14 Nov)

**Target:** `reference/style/tycoon_style_target.png` (the river-city image). H A: "the map doesn't look like the reference". Match its **look**, not its subject (ours stays a green pine-hill campus with a lake).

This sits alongside LANDMARK_SPRITES.md: the sprites fix the buildings; this file fixes everything around them. Do it right after the Admin + NAB sprites are approved.

## What makes the reference look the way it does, and what our map lacks

| # | In the reference | Our map now | Change |
|---|---|---|---|
| 1 | **A close, low, oblique camera.** Buildings are big in the frame and the scene fills a tall phone screen | Too high and far: the whole campus looks small, mostly forest and lawn | A new default "hero view": pitch about 35–40° (matching the sprite angle), closer, centred on the Admin–NAB–lake axis. The campus overview stays one zoom step out |
| 2 | **Dense: no empty ground.** Every patch has buildings, trees, paths, cars or water | Large flat lime meadows and empty slopes | Fill open ground with mixed tree groves, shrubs, flower beds, rocks, small paths and **terraced slopes** (Shillong hillsides are terraced). Keep only real lawns open (football, NAB lawn, flag lawn) and give them a mown-stripe texture |
| 3 | **Warm golden-hour light.** Low sun from the upper left, warm highlights, long soft shadows, strong light/shade contrast on every building | Flat midday light, weak shadows | A sun at about 25° elevation, colour #FFD9A3, from the same side as the sprites' light; shadow strength high and soft; a warm hemisphere fill; AO in corners |
| 4 | **A rich warm grade.** Saturated but warm; orange/teal; deep shadows, not grey | Lime greens, cold and flat | ACES, warmer white balance, greens shifted from lime to deep warm green (around #4E7A3A to #6E9440 for grass, #2F5A2E to #3E6B35 for pines), +10–15% saturation, a soft vignette |
| 5 | **Strong tilt-shift.** A narrow sharp band and heavy blur at the top and bottom, which gives the miniature effect | Weak or uneven | A stronger blur toward the edges at the hero view. A wider sharp band when zoomed in, or when a card is open. Labels never blurred |
| 6 | **Varied, shaded trees.** Clumped, mixed sizes, with dark and light sides | Uniform cone carpets | 3–4 pine variants plus round broadleaf and cherry trees; random scale and tint; clumps with gaps; trees darker at the forest edge; trees cast shadows on High/Medium |
| 7 | **Life everywhere.** Cars on the roads, parked cars, buses, boats, tiny people | Almost none | Parked cars at the Admin, NAB and hostels; a bus at the gate; a few slowly moving cars on the main road; tiny people on plazas and paths (High/Medium); lamp posts along roads |
| 8 | **Finished hardscape.** Kerbs, pavements, piers, plazas, edged paths | Roads are bare ribbons on grass | Kerbs and light pavements along `road` lines; brick plazas; paved aprons at entrances; path edging; stone retaining walls on terraces and building pads; low railings at drops |
| 9 | **Atmospheric depth.** Warm haze and distant rows fading out at the top | A mist ring only | A warm haze gradient toward the top of the screen; the villages and hills beyond fade into it |
| 10 | **Water with sparkle.** Deep teal with highlights and edge foam | Flat teal | Specular sun glints, a darker centre, a light shore edge, and a bench or jetty on the lake trail |

Gemini may be used **only** for extra tileable textures or hardscape pieces (grass with mowing stripes, terrace walls, paving, path edging, rock, shrub cards). **No buildings.**

## How to check it
1. **The hero view vs the target, side by side:** a phone portrait screenshot at 390×844 and a 1280×800 one, saved as `reference/style/compare/scene_v<N>.png` with the target on the left.
2. **Score it** in `reference/style/STYLE_LOG.md`, 0–10 for each row 1–10 of the table above, plus a total. Write down what changed in each pass.
3. **At least 3 passes.** Stop when the total is at least 80/100 or after 3 passes, then show H A.
4. **Performance:**
   - Medium on a phone must stay at about 30 fps or better (report ms/frame with `?fps=1`).
   - Use instancing for trees, cars, people and lamps.
   - On Low, drop people, moving cars and shadows first.

## Order and time
1. Admin + NAB sprites (LANDMARK_SPRITES.md), then H A's OK.
2. This file's three passes (about half a day), together with the remaining sprites.
3. Then Phase 3B (blue dot, directions, ON AIR, event pins, room changes, list view). The conference is 27 Nov.
