# TIDEBREAKERS: Visual Direction v1

**Pillar line:** *Start with eight planks of optimism. Earn something magnificent.*

TIDEBREAKERS should look like a sunlit animated adventure. The world is warm, cheeky and crammed with things worth picking up. Each frame should feel hand-made and collectible.

## 1. Mood
- **Adventurous, warm, mischievous, cinematic.** The pirate attitude is a wink. It is never a threat.
- Our pirate symbol is the **Grinning Sun**: a gap-toothed, eye-patched sun rising out of the sea. **No skulls or crossbones** anywhere in the brand.
- Treasure is joy. Gold always reads as gold: bright, sparkling and slightly too much.

## 2. Palette: "Sunlit Shallows"
| Role | Name | Hex | Use |
|---|---|---|---|
| Sea | Lagoon Teal | `#1FB5B0` | shallow water, primary accent |
| Sea | Shallows Aqua | `#7FE3D6` | highlights on water, foam tint |
| Sea | Sea Blue | `#1A7FA8` | mid water, info UI |
| Line / depth | Deep Tide | `#0E3B66` | **all outlines**, UI text on light |
| Line / depth | Midnight Swell | `#0A2142` | extrusions, night, deepest water |
| Treasure | Doubloon Gold | `#F4C542` | currency, rewards, wordmark |
| Treasure | Gold Deep | `#C98A12` | gold shading |
| Warmth | Sunlit Amber | `#FF9F2E` | key light, sunset |
| Warmth | Coral Flame | `#FF6B4A` | danger-lite, sunsets, CTA hover |
| Accent | Harbor Crimson | `#C0392B` | canon sail stripe, alerts |
| Accent | Hibiscus | `#E0607E` | cheeks, flowers, rare items |
| Neutral | Sailcloth Cream | `#F6EAD0` | panels, sails, text on dark |
| Nature | Palm Green / Jungle | `#3FA55A` / `#1E6B4E` | foliage |
| Wood | Honey Timber / Timber / Deep Timber | `#D9954F` / `#9A5A2E` / `#5E331B` | hulls, docks |
| Shadow | Plum Shadow / Dusk | `#3B2350` / `#6A4C93` | shadows, night, atmosphere |

**Rules**
- **No muddy browns.** Wood leans honey-orange. Shadows go **cool**: plum, indigo or deep tide. Highlights go **warm**: cream and gold.
- Outlines are Deep Tide navy, never pure black.
- Keep saturation high in the focal area and lower toward the edges and the distance (atmospheric perspective).
- Rarity colors (game): common `#9FB3C8`, uncommon `#3FA55A`, rare `#1A7FA8`, epic `#8B5CF6`, legendary `#F4C542`.

## 3. Typography
| Use | Family | Notes |
|---|---|---|
| Wordmark, display, big titles | **Fraunces** (Black, 144pt optical size) | soft, warm "wonky" serif with a premium storybook tone. OFL |
| UI headings and buttons | **Nunito Black / ExtraBold** | rounded and very legible at small sizes. Already in the game. OFL |
| UI body | **Nunito Bold** (≥ 13 pt on iPhone) | |
| Flavor only | Pirata One | **retire from UI headings**: blackletter hurts legibility under 20 pt |

Display type always gets the "sticker" treatment: gold face, navy outline and a stepped navy extrusion. Never put display type on a busy image without a backing panel.

## 4. Shape language: "Pebble and Sail"
- **Pebbles** (rounded and chunky) for bases, characters' bodies, rocks, UI panels. They read as friendly and safe.
- **Sails** (confident tapering curves and triangles) for anything adventurous: sails, hats, waves, rays.
- The **Tidecurl** (a breaking wave curl) is the signature flourish. It appears in the logo ribbon, UI corners and the flag's wave stripe.
- Silhouettes come first. Every ship and character must read as a solid fill at 48 px.

## 5. Rendering style
- Flat vector with **two-tone cel shading**: base, one cool shadow and one warm rim highlight. Gradients are allowed only for sky, water, glow and gold.
- Outline weights: silhouette 3–4 px at 1x, interior detail 1.5–2 px. This matches the game's toon-shaded Three.js models.
- Texture comes from **detail**, not noise: rope twists, planks, shells, bunting. Never use grain or grunge.

## 6. Lighting
- **Default:** golden-hour key light from the upper left (Sunlit Amber), cool teal ambient fill and a gold rim on hero silhouettes.
- **Night / cove:** lantern amber against moonlit indigo, with glowing collectibles as the brightest values.
- Every scene has one obvious brightest point, and it is where the treasure or the player is.

## 7. Environment treatment
- Three depth planes: **far** (low-saturation, plum-tinted), **mid** (full color), **near** (darkened silhouette frame).
- The water carries the world's color. It runs turquoise in the shallows, sea blue in the open and plum-navy at depth. Foam is cream, never pure white.
- Each location gets one **signature color** within the shared palette:
  Turtle Cay → lagoon and sand; Port Saltwhistle → crimson and cream bunting; Treasure Cove → gold and plum; Mossjaw jungle → jungle green and hibiscus; Wreck of the *Wren* → sea blue and driftwood.

## 8. UI
- Cream "sailcloth" panels with a navy outline and rounded 20 px corners. CTAs are gold sticker buttons.
- Minimum tap target 44 pt, minimum body text 13 pt, minimum contrast 4.5:1 for text.
- Decoration (rope, tidecurl) lives only on panel edges, **never behind text**.
