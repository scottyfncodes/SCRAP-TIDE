# SCRAP TIDE: brand and art direction

**Beautiful water. Broken civilization. Built from scraps.**

Creative direction: **BEAUTIFUL RUIN**. Waterworld meets Mad Max: a breathtaking ocean, a drowned civilization, and
machinery rebuilt from whatever survived. Breathtaking from a distance; weathered, ingenious and lived-in up close.

Personality: resourceful, rugged, adventurous, slightly irreverent, unmistakably maritime.

## Palette

| Token | Hex | Role |
|---|---|---|
| Abyss Blue | `#10384A` | Deep water, HUD plates, night sky, panel headers, loading screen |
| Sea Glass | `#168D9C` | Shallows and crest glow, "ready / good" states, progress, the tide in the wordmark |
| Bleached Sand | `#D7B87B` | Journal pages, horizon haze, letter faces, rag pennants |
| Oxide Rust | `#A04D30` | Labels, warnings that aren't emergencies, sunsets, the wordmark's shadow |
| Sun Gold | `#E5C65E` | Primary actions, waypoint, compass, the wordmark's tide-stain, golden-hour sunlight |
| Living green | `#57E05F` | Plants and only plants (unchanged from the Waterworld pass) |

They are a foundation, not a cage: derived tints (bleached bone `#ECE0C2`, abyss near-black `#081C26`) round them out.
In code: `src/ui/brand.ts` (`PALETTE`) and the `:root` tokens in `src/ui/styles.css`.

## Wordmark

`creative/branding/wordmark_scrap-tide_v1.svg` (self-contained, font embedded), PNGs beside it. In the game it is
`wordmarkSVG()` in `src/ui/brand.ts`, used on the loading screen and the title screen.

Stencil lettering of a salvage crate with the tide risen over its foot: above a hand-drawn waterline the letters are
Bleached Sand, below it Sea Glass, and a Sun Gold tide-stain runs along the line, over an Oxide Rust drop shadow. The
waterline is a colour change, not a cut, so it reads as plain "SCRAP TIDE" at phone-loading-screen size.
No pirate fonts, skulls or heavy distressing.

The app icon (patchwork sail, `public/icons/`) is unchanged; it already fits the palette.

## World

World art (characters, buildings, props, vessels) follows **stylized, not cartoon-outlined**: no universal
outline; form from geometry, material, colour and light. See `docs/art-direction/STYLE-GUIDE.md` and
`src/world/style.ts`.

- **Sky**: clear abyss-blue zenith over a warm, sun-bleached horizon haze by day; Sun Gold mornings and afternoons,
  Oxide Rust sunsets, deep Abyss Blue nights (`src/world/atmosphere.ts`). Storms stay cold blue-grey.
- **Ocean**: sandy shallows, a luminous Sea Glass shelf, Abyss Blue open water, ink-blue deep; Sea Glass subsurface
  light through crests; silt, oil slicks and salt-scum foam keep it weathered up close (`src/world/ocean.ts`).
- **Boats**: the player's vessel wears the voyage. *Journey bunting* (`src/ship/bunting.ts`) runs from the masthead to
  both stern quarters: one rag pennant per two discoveries (2 on a new skiff, up to 18), festoon bulbs once she is
  refitted. Existing refit stages, upgrade models, trophies and paint still apply.

## Interface: a scavenger's navigation kit

HUD instruments are survivor-built equipment: riveted, scratched steel plates with a faded hazard-stripe bracket,
squared corners and stencilled labels; the objective is a sun-bleached painted tag with an oxide edge (not parchment);
the radar sits in a bolted bezel. Primary actions are stamped Sun Gold plates; panels are bleached-sand journal pages
under a steel header strip. Stencil for names, condensed grotesk for labels, mono for readouts.

The steering control is salvaged machinery, one per vessel (gate-valve handwheel, turbine housing, aluminium direction
dial, riveted hazard ring), each with a hazard tab at 12 o'clock and a knurled thumb cap. Never a wooden ship's wheel,
brass bosses, Jolly Roger, colonial costume or treasure-map parchment. See `docs/art-pass/`.

## Naming

SCRAP TIDE is the name on every player-facing surface (title, loading, browser title, PWA manifest, metadata, README).
Kept on purpose: the `tidebreakers.*` localStorage keys (existing saves), model node names inside the GLBs, and
the in-world *Tidebreaker* renown title and *Tidebreaker Colours* flag (lore for crews who pierce the Stormwall, not
the game's name). Older reports in `docs/` and `creative/` keep the former name as history.

## Before / after

`docs/brand/screens/`: title, loading, Driftholm departure, and the day cycle (noon, dusk, night, plus the Salt Brig),
iPhone 13 viewport in headless Chromium (SwiftShader), not a real device.
