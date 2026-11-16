# Harbor portrait pass

The eight harbor characters were platform emoji in a coloured ring. They are now drawn portraits.

## Direction: cut-plate portraits

The 3D people in the world are flat-shaded, faceted and unoutlined (`docs/art-direction/STYLE-GUIDE.md` §2). The
portraits are the same people drawn the same way, in 2D:

- **Flat planes, no ink line.** Every surface is one lit tone and one shadow tone, split by a hard facet edge.
- **One sun, upper left**, on every portrait, so eight cards read as one set.
- **Minimal faces.** Brows, a nose plane, an eye shape, a beard or moustache mass. Expression comes from the tilt of
  those few shapes.
- **Silhouette first.** Each character is recognisable from headgear and hair alone at 56 px.
- **One piece of salvage each**, saying what they do.
- **Weathered, not filthy.** No skulls, spikes, pirate dress or generic wasteland costume.
- **Palette.** Muted world tones, plus one sun-faded accent per character. Never living green. The backdrop is the
  character's own colour, sun-bleached.
- **Framing.** Drawn on a 64-unit sheet and cropped tight, so headgear breaks the ring and the face fills it.

## The cast

| | Port | Silhouette | Expression | Salvage | Accent |
|---|---|---|---|---|---|
| **Pip Farthing**, trader | Driftholm | wide bowler brim, wing moustache | wink and open grin | jar-lid monocle on a wire, a coin worn as a medal | Laundry Pink band |
| **Marlo Keelhart**, shipwright | Driftholm | flat-topped welding mask, beard to the frame | brows down, mouth down | flipped-up welding mask, road-sign shoulder plate | Buoy Red plate |
| **Old Wren**, cartographer | Driftholm | white topknot with a rod through it, long face | heavy lids, half a smile | brass chart divider through her hair, a rolled chart | Pool Blue scarf |
| **Odessa Brightly**, paint and curios | Driftholm | tall headwrap, hoops | one brow up, chin up, smirk | washer-hoop earrings, her own paint on her cheek | Buoy Red paint |
| **Old Sal**, fish trader | Rooftop Hollow | peaked hood filling the frame | one brow asking, one eye decided | survival-suit hood | Cone Orange hood |
| **Nori Kettle**, raft-wright | Rooftop Hollow | choppy mop, ears out, rope coil at the shoulder | wide eyes, brows up and in | rope coil, rag headband | Laundry Pink rag |
| **Foreman Dace**, rig trader | Rig Helios | hard-hat dome, ear defenders, square shoulders | level brows, flat mouth | hard hat, ear defenders, reflective collar | Bleach White hat |
| **Vik Ashby**, rig mechanic | Rig Helios | swept quiff, spanner over the shoulder | cocked brow, gap-toothed grin | spanner, collar-up coveralls | Pool Blue coveralls |

## Validation (measured in the built game)

- **All eight at true 56 px, 402 and 320 viewports, and greyscale:** `screens/eight_actual-56px.png` (cropped from the
  real harbor panels, enlarged 3× without smoothing). Rows: 402 px viewport, 320 px viewport, greyscale.
- **Told apart without names:** yes, in colour and in greyscale. No two share a silhouette.
- **Names and information stay dominant:** the avatar is 56 × 56 on every card at both widths: 9–11 % of the card,
  against 36–45 % for the name and line. In the blur test (`screens/cards_all-eight_squint-test.png`) the name is the
  darkest, strongest shape on all eight cards.
- **None heavier than Marlo:** mean brightness inside the ring at true size (0–255, lower is heavier): Marlo 116,
  Sal 135, Odessa 135, Dace 137, Pip 138, Wren 149, Vik 149, Nori 154.
- **Weight:** 1.2–2.0 KB per portrait, 12.7 KB for all eight uncompressed, about 5.9 KB gzipped as a module. Inline
  SVG in `src/ui/portraits.ts`: no download, no new dependency, no change to `package.json`.
- **No emoji left on the cards**, and no page errors in any of the three harbors at either width.

### What is weaker

- **Old Wren is the quietest of the eight.** Her stillness is the character, but at 56 px the chart divider reads as
  "a rod through her hair", not specifically as a divider, and the rolled chart is lost at the edge of the ring.
- **Small salvage is lost at 56 px by design:** Pip's coin, Marlo's shoulder plate, Sal's drawcords and Vik's oil
  smudge only show when enlarged. Each character is carried by silhouette and expression instead.
- **No harbor shows all eight.** Driftholm has four, Rooftop Hollow two, Rig Helios two, so the eight are shown
  together as a sheet and in place as three harbor screens.

## How it ships

`src/ui/portraits.ts` holds each portrait as inline SVG. `npcCard` in `src/ui/ui.ts` draws it inside the existing
56 px ring; the card layout is unchanged. Standalone SVGs are in `creative/characters/portraits/`, editable VectorCraft
sources in `creative/characters/source/`.

## Screens

- `screens/eight_actual-56px.png`: all eight at true size, both viewports, and greyscale
- `screens/eight_sizes.png`: all eight at 112 px, 56 px, greyscale and on dark steel
- `screens/eight_large.png`: all eight enlarged
- `screens/harbors_402.png`, `screens/harbors_320.png`: Driftholm, Rooftop Hollow and Rig Helios side by side
- `screens/harbor_driftholm_402.png`, `harbor_hollow_402.png`, `harbor_helios_402.png`: each harbor at 402×874, 3×
- `screens/cards_all-eight_squint-test.png`: every card sharp and blurred

## Trade-offs

- **Vector, not painted.** Crisp and tiny, and it matches the faceted world. It cannot carry painterly grime or
  texture; weathering has to come from shape (dents, patches, wear in the silhouette).
- **Eight hand-drawn faces.** Each one is drawn, not generated from the 3D models, which share three body types
  between them and would not tell eight people apart.
- **The old 2D cast art** (`creative/characters/char_*.svg`) is from the storybook-pirate era: bold outlines, bright
  primaries. The characters keep what made them themselves there and drop the style.
