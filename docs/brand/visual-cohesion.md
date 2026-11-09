# SCRAP TIDE: visual cohesion pass

*One world: a beautiful sea, and a salvaged civilization built on it.*

Before/after frames: `docs/brand/cohesion/` (same boat position, heading, camera yaw/pitch, clock and viewport;
`node scripts/cohesion-shots.mjs <dist> <out>` reproduces them). Phone = 390×844 CSS px portrait at 2×; desktop =
1280×720. Headless Chromium with SwiftShader (software GL), not a real device.

## Audit: why the water, the towns and the boat looked like three games

Rendering architecture (unchanged by this pass): Three.js r170, one forward pass, no post-processing, no tone mapping.
One directional sun (1024² PCF shadow) plus a hemisphere light, both driven by `src/world/atmosphere.ts`. Every solid
surface is a vertex-coloured `MeshToonMaterial` with a 4-band ramp and the world-space weathering shader
(`src/world/materials.ts`). The sea is its own `ShaderMaterial` (`src/world/ocean.ts`) that does not use scene lights
at all. Static settlements are merged into one mesh per town (`src/world/drowned.ts`, `environment.ts`).

| | Boat | Settlements | Ocean |
|---|---|---|---|
| **Geometry** | Dense, purpose-modelled hull, rig and fittings | Kit modules (`tb_settlement_kit`, `tb_atoll_kit`): pallet rafts, flat boxes, thin lattice and rails; no roof overhangs or vertical accents, so at 60–200 m they collapse into low rectangles and sub-pixel lines | Gerstner swell + FFT chop normal map: smooth, physically shaded |
| **Materials** | Toon + weathering, **ink outline + sun rim** (`hero.ts`) | Toon + weathering, **no outline** | Fresnel, smooth sky reflection, soft specular, subsurface: a photographic look |
| **Lighting** | Lit at up to ~1.3× albedo at noon (sun 2.8 + hemi 1.4, no tone mapping), but its dark, saturated albedo survives | The same overexposure **clips** their pale tans and greys to pastel; the sky fill flattens their shading | Ignores the scene lights; its own ambient |
| **Colour** | Saturated orange-brown | Desaturated (the weathering grade) and then washed out | Saturated cyan-teal, the most chromatic thing on screen |
| **Scale/detail** | 15 m from the camera, full detail | 60–300 m away, detail too fine to survive a phone screen | Detail everywhere, cloudy reflection blotches at mid distance |
| **Atmosphere** | Close: no haze | Haze lightens them toward the (also pale) sand hill behind: no figure/ground | Fogged separately to the same colour |

In short: three stylisation levels (outlined cartoon boat, flat unoutlined toon towns, photographic sea), an
overexposed light response that only the boat's dark paint survived, and settlement geometry whose detail lived
below the phone's pixel size.

## Style rules (shared by boat, sea and settlements)

**Palette** (brand guide `SCRAP-TIDE-brand.md`): Abyss Blue, Sea Glass, Bleached Sand, Oxide Rust, Sun Gold; living
green only on plants. Settlements use `SALVAGE` in `src/world/shanty.ts`: weathered plank (5 shades), galvanised tin,
rust, sun-faded paint in the brand colours, canvas, hemp rope. Nothing fully saturated; no single flat colour on a
wall.

**Light**: one response for every solid (`gradeUniforms`, `GRADE_FRAG` in `materials.ts`): sun-warm lit faces,
sky-cool shade, and a highlight shoulder so nothing clips to white. The sky fills the shade a little less (hemisphere
×0.84), so forms model in the sun. The sea uses the same shoulder.

**Line**: ink on every silhouette. The boat and crew keep their hero ink; the world's ink (`inkWorld` in `hero.ts`)
is the same navy, about one pixel wide at any distance, and takes the fog.

**Construction logic** (every settlement structure): a base that meets the water (piles, oil-drum raft or plinth) →
a body clad in mismatched plank, tin and painted panels → an overhanging roof (patched tin gable, lean-to or barrel
vault) → one vertical accent (stovepipe, mast with rag flag, aerial, lookout) → canvas and rope (awnings, stays,
bunting, boardwalk rails) tying pieces into a place. Everything leans a degree or two.

**Detail density**, three tiers: *silhouette* (100 m+: roofline, masts, bunting, ink), *mid* (20–100 m: cladding
patchwork, awnings, doors, lit windows, drums), *close* (<20 m: the weathering shader: grime, rust streaks, tide line,
salt). Minimum member thickness ~0.12 m; life size ×1.15 for the raft districts read across the bay.

**Sea**: keep the depth gradient (sand → Sea Glass shelf → Abyss Blue → ink deep), foam, wake, hull collar, oil
slicks and glitter; paint the sky reflection in soft-edged bands like the toon light, cut glints as crisp highlights,
and pull a little chroma so it sits in the same sun-faded world.

**Atmosphere**: the existing haze (warm sand by day, rust at sunset, abyss at night) now separates layers because
the towns have dark ink and darker, unclipped values against the pale hill and sky.

## What changed

- `src/world/shanty.ts` (new): the salvage-architecture builder: stilt houses, drum rafts, plinth houses, one or two
  storeys, three roof types, four accents, awnings, clutter, lookouts, boardwalks and bunting. Plain vertex-coloured
  geometry merged into the existing per-town batches (no new draw calls per house).
- Driftholm: the raft districts are stilt houses (4) plus a new waterfront of 6 stilt houses on a boardwalk over the
  flats, strung with bunting to each other and the pier; the hillside shanty is mostly salvage houses (containers and
  rain catchers kept as accents); the two shack shopfronts are two-storey salvage buildings with their stalls.
  Rooftop Hollow, Rig Helios and the four pontoon outposts use the same builder instead of the generic shack/market
  modules. Turbines, water tanks, walkways, walls, watchtowers, the propeller and every other kit piece are unchanged.
- `materials.ts`: shared light grade (warm light / cool shade / shoulder). `game.ts`: drives it from the atmosphere,
  trims the hemisphere fill, sets ink width from the screen.
- `hero.ts`: distance-scaled world ink on settlement batches, drowned structures, Driftholm and island dressing.
- `ocean.ts`: banded sky reflection, steadier reflection normal (no cloudy blotches), crisp glints, slightly
  desaturated depth colours, highlight shoulder. Swell, foam, wake, collar, oil and depth logic untouched.
- HUD: the radar's opaque black disc is now abyss-blue glass; on a portrait phone it sits on the horizon, so the
  skyline stays visible through it. Nothing else in the HUD moved.

## Limitations

- No real-device GPU numbers: frame times in `docs/brand/cohesion/perf.json` are SwiftShader (CPU) and only useful
  relatively. Triangles go up (outline shells double the settlement batches' vertices); draw calls rise by one per
  inked batch/structure.
- The GLB kits themselves (walls, watchtowers, containers, rigs, towers) were not remodelled; they gain ink and the new
  light response but keep their geometry.
- Island terrain and foliage are not outlined.
