# Harbor portrait pass (in review)

The eight harbor characters were platform emoji in a coloured ring. This pass replaces them with drawn portraits.
**Two are drawn so far**, chosen to test the system at its extremes before the other six: **Pip Farthing** and
**Marlo Keelhart**.

| | Pip Farthing, trader | Marlo Keelhart, shipwright |
|---|---|---|
| Silhouette | wide bowler brim, round head, wing moustache | flat-topped welding mask, square head, beard to the frame |
| Value | pale skin and white hair on warm sand | dark skin and rust beard on bleached blue |
| Expression | one eye squeezed shut, open grin | brows down, mouth turned down |
| Salvage | jar-lid monocle on a wire, an old-world coin as a medal | flipped-up welding mask, road-sign shoulder plate |
| Accent | Laundry Pink band, Cone Orange patch | Buoy Red plate |

## Direction: cut-plate portraits

The 3D people in the world are flat-shaded, faceted and unoutlined (`docs/art-direction/STYLE-GUIDE.md` §2). The
portraits are the same people drawn the same way, in 2D:

- **Flat planes, no ink line.** Every surface is one lit tone and one shadow tone, split by a hard facet edge.
- **One sun, upper left**, on every portrait, so eight cards read as one set.
- **Minimal faces.** Brows, a nose plane, an eye shape, a beard or moustache mass. Expression comes from the tilt of
  those few shapes.
- **Silhouette first.** Each character is recognisable from headgear and hair alone at 56 px.
- **One piece of salvage each**, saying what they do: Pip's jar-lid monocle on a wire and the old-world coin he wears
  like a medal.
- **Weathered, not filthy.** Sun-leathered skin, a dented and patched hat, a faded rag band. No skulls, no spikes.
- **Palette.** Muted world tones, plus one sun-faded plastic accent per character (Pip: Laundry Pink hat band, Cone
  Orange patch). Never living green. The backdrop is the character's own card colour, sun-bleached.
- **Framing.** Drawn on a 64-unit sheet and cropped tight, so the hat brim breaks the ring and the face fills it.

## Evaluation of the pair (measured in the built game, Driftholm harbor)

- **Told apart without names: yes.** They differ in outline, in value (one light on warm, one dark on cool) and in
  expression, and still do in greyscale (`screens/pair_sizes.png`, bottom row).
- **Personality at 56 px: yes, with one weak spot.** Pip's wink and grin and Marlo's scowl both survive at true size
  (`screens/pair_actual-56px.png`, left columns are 1:1). The weak spot: Marlo's mask window and rust drips are too
  small to read as what they are at 56 px; the mask reads as "steel headgear", which is enough, but not as "welder".
- **Native to the 3D world: yes.** Same facets, same lit/shadow split, same muted palette, no outline.
- **Subordinate to the card's information: yes.** The avatar is unchanged at 56 px: 8.7 % of the card at 402 px wide
  and 11.2 % at 320 px, against 40–45 % for the name and line. In the blur test (`screens/cards_squint-test.png`) the
  name is still the darkest, strongest shape on every card. The portraits are heavier than the emoji they replace
  (Marlo most, being a dark mass), so the remaining six should stay at or below Marlo's weight.

## How it ships

`src/ui/portraits.ts` holds each portrait as inline SVG (about 2 KB each). Nothing is downloaded, nothing blurs at
3× density, and a character without a portrait yet falls back to their old emoji. The standalone SVG and the editable
VectorCraft source are in `creative/characters/portraits/` and `creative/characters/source/`.

## Screens

- `screens/harbor_iphone17.png`: Driftholm at 402×874, 3× density
- `screens/harbor_narrow-320.png`: the same at 320×568
- `screens/pair_actual-56px.png`: both avatars cropped from the harbor at true 56 px (402 and 320 viewports), and enlarged
- `screens/pair_sizes.png`: the pair large, at 112 px, at 56 px, and in greyscale
- `screens/cards_squint-test.png`: the cards sharp and blurred, to see what the eye lands on
- `screens/cards_narrow-320.png`: two drawn cards above an unchanged emoji card on the narrow phone

## Trade-offs

- **Vector, not painted.** Crisp and tiny, and it matches the faceted world. It cannot carry painterly grime or
  texture; weathering has to come from shape (dents, patches, wear in the silhouette).
- **Eight hand-drawn faces.** Each one is drawn, not generated from the 3D models, which share three body types
  between them and would not tell eight people apart.
- **The old 2D cast art** (`creative/characters/char_*.svg`) is from the storybook-pirate era: bold outlines, bright
  primaries. Pip keeps what made him Pip there (bowler, monocle, white moustache) and drops the style.
