# Harbor portrait pass (prototype)

The eight harbor characters were platform emoji in a coloured ring. This pass replaces them with drawn portraits.
**Only Pip Farthing is drawn so far**: one prototype to approve before the other seven.

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

## How it ships

`src/ui/portraits.ts` holds each portrait as inline SVG (Pip is about 2 KB). Nothing is downloaded, nothing blurs at
3× density, and a character without a portrait yet falls back to their old emoji. The standalone SVG and the editable
VectorCraft source are in `creative/characters/portraits/` and `creative/characters/source/`.

## Screens

- `screens/harbor_iphone17.png`: Driftholm at 402×874, 3× density
- `screens/harbor_narrow-320.png`: the same at 320×568
- `screens/card_before-after.png`: the new portrait above an unchanged emoji card
- `screens/pip_sizes.png`: the portrait large, at 112 px, at 56 px, and on dark steel

## Trade-offs

- **Vector, not painted.** Crisp and tiny, and it matches the faceted world. It cannot carry painterly grime or
  texture; weathering has to come from shape (dents, patches, wear in the silhouette).
- **Eight hand-drawn faces.** Each one is drawn, not generated from the 3D models, which share three body types
  between them and would not tell eight people apart.
- **The old 2D cast art** (`creative/characters/char_*.svg`) is from the storybook-pirate era: bold outlines, bright
  primaries. Pip keeps what made him Pip there (bowler, monocle, white moustache) and drops the style.
