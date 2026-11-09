# SCRAP TIDE world-art style guide

**Stylized, not cartoon-outlined.**

SCRAP TIDE is a handcrafted, low-poly maritime world: tactile, weathered, charming and coherent. Personality comes from
**geometry, materials, silhouettes, colour and light**, not from ink lines. This guide covers characters,
buildings, props, vessels and environment assets. The HUD and controls have their own brand rules
(`docs/brand/SCRAP-TIDE-brand.md`).

The renderer reads its numbers from **`src/world/style.ts`**. Change a value there and every asset follows. Don't
change it at a call site.

---

## 1. How the look is built (what is actually on screen)

| Layer | Where | What it does |
|---|---|---|
| Vertex colours | the GLB kits (`public/models`, MeshCraft `three-web-toon` profile) and `props.ts` | Base colour per face, with MeshCraft's per-face light/dark bake. No textures. |
| Light ramp | `LIGHT_RAMP` → `toonGradient()` in `materials.ts` | How sunlight falls across faces. Soft and lifted: flat-shaded faces still read as facets, but no face turns into a dark band. |
| Wear | `WEAR` → `weather()` in `materials.ts` | World-space grime, rust streaks, the tide line (algae below, salt crust above) and sun-bleached tops. Matte, never black. |
| Form shading | `FORM_SHADE` / `CHARACTER_FORM` → `formShade()` in `assets.ts` | Ambient occlusion baked into the vertex colours at load: contact shadow at the base, darker under overhangs, a lift on top faces, and black openings raised to a deep navy. Zero runtime cost. |
| Hero light | `hero.ts` | The player's boat, crew and captain: a sun-coloured rim on sunward edges and a soft falloff on shadow-side edges. |
| Outline | `OUTLINE` → `heroize(root, width)` | **Off.** A last resort, opt-in, thin and sea-toned (see §7). |
| Atmosphere | `atmosphere.ts`, `sky.ts`, `ocean.ts` | Warm directional sun, hemisphere ambient, distance haze (fog), water reflections, day/dusk/night/storm grades. |

### Where the old "bold line" look came from (audit, Nov 2026)

There was no screen-space outline shader. The heavy-outline read had three sources:

1. **An inverted-hull ink outline** (`hero.ts`, `#0e2233`, 2.2–3.5 cm on hulls, 1.2 cm on people) on the player's
   boat, every crew member and the captain. It traced every mast, rope, gunwale, crate and limb, which is what made
   them look like stickers. **Now off** (`OUTLINE.* = 0`).
2. **A hard 4-band light ramp** with its shadow step at 23 % of the sun. Every terminator on every building and prop
   became a dark contour band. **Now** a 6-step linear ramp starting at 31 % (`LIGHT_RAMP`).
3. **Near-black colours at edges:** the tide-line algae stain was almost black (0.09, 0.12, 0.09), so a dark line ran
   along the waterline of everything. Kit windows and trims are `TBD_Navy #06182e` / `TBW_Navy`, which render
   pure black. **Now** the algae is a dark sea-green, and form-shaded pieces lift near-black colours to
   `WORLD_PALETTE.opening` (`#34404a`).

---

## 2. Characters

- Keep the established proportions: slightly exaggerated, simple and expressive silhouettes (hat, coat, gear).
- Soft geometric forms with light faceting. Aim for 1.5–4k triangles, Mixamo-named rig, vertex colours only.
- **No outlines** on bodies, clothing, faces or accessories. Readability comes from:
  - a value step between coat, skin, hat and gear (at least one clearly light area near the face);
  - `CHARACTER_FORM` shading: boots grounded, head and shoulders a little lighter;
  - the hero rim light on the sunward side for the captain and crew.
- Faces: minimal and expressive. Brows, a nose plane, beard or scarf mass. No drawn-on line work.
- Weathering at `weather(…, 0.45)`: lived-in, not filthy. Keep faces clean enough to read.
- To shade a new character, add its GLB name to `FORM_SHADED_CHARACTERS`.

## 3. Buildings and architecture

- Improvised, salvaged, maritime. Use asymmetry, stacked volumes, patched panels and visible practical construction
  (stilts, braces, ladders, tarps, cables).
- Define form with **overlapping geometry, material contrast and ambient shading** instead of dark lines on roofs,
  walls, windows or beams.
- Openings (windows, doors, hatches) are deep shadow-navy, not black. Lit windows use an emissive material, so they go
  to the glow mesh and shine at night.
- Every building piece should look like it was assembled from things the flood left behind: containers, hull plate,
  pallets, signage, corrugated sheet.
- Budget: ≤ 3k triangles per kit node. Kit pieces are merged per settlement (one toon + one glow draw call per town),
  so keep separate materials to a dozen or fewer per node.
- Add the node to `FORM_SHADED` in `style.ts` so it gets contact shadow and under-eave occlusion.

## 4. Props and environment

Crates, barrels, ropes, nets, machinery, docks, debris, vegetation, navigation gear:

- **Silhouette first.** At phone size, a prop should be recognisable from its outline alone.
- Simplify moderately. A barrel has hoops, a crate has battens, and that is enough. Avoid micro-detail that turns into
  noise at 390 px wide.
- Surface variation and wear come from `weather()`. Don't paint grime into the vertex colours as well.
- Give objects personality through construction: a lamp welded from pipe, a bollard from a cable reel.
- Living plants are the one saturated green (`#57E05F` family). Nothing else uses that hue.

## 5. Materials and colour

Matte, tactile, lightly weathered. No gloss, no plastic, no harsh black borders, no oversaturation.

| Token (`WORLD_PALETTE`) | Hex | Use |
|---|---|---|
| dustyTeal | `#4f7f80` | painted steel, containers, hull paint |
| mutedTurquoise | `#6fa3a0` | oxidised copper, accent panels |
| warmSand | `#cdb48a` | timber, decks, sailcloth |
| fadedCream | `#e3d7bb` | canvas, signboards, bone |
| rustyOrange | `#b0603a` | rust, hazard paint gone soft |
| weatheredCoral | `#c27a62` | tarps, flags, buoys |
| desatNavy | `#2e4250` | trims, deep shadow, ironwork |
| agedBrass | `#a88a4f` | fittings, compass, lamps (unlit) |
| oxidisedMetal | `#6f7f76` | machinery, chain, pipe |
| goldAccent | `#e5c65e` | **interactive things only**: waypoint, glow pickups, the dock lamp |
| opening | `#34404a` | windows, hatches, doorways |

`weather()` already grades every surface toward a warm grey-sienna base (about 38 % desaturation), so author colours
can be slightly richer than they should look in game. The exceptions are pure primaries (`TBD_Tarp #2f6fb0`,
`TBD_Red #c8352a`, `TBD_Hazard #f2b825`), which are still loud after grading. New assets should pick from the table.

## 6. Lighting and atmosphere

- Warm directional sun, soft ambient shadows (hemisphere light plus the lifted ramp), gentle haze with distance.
- Subtle water reflections. Foreground/background separation comes from fog and value, not lines.
- Every asset must read at noon, dusk, night and in a storm. Check all four (see §9).

## 7. Outline policy

**Do not introduce a universal outline shader or a thick black edge treatment.** This applies to all new world assets.

In order of preference, separate a form from its background with:

1. **Silhouette:** a distinct shape.
2. **Material and colour contrast:** a value step of at least ~15 % luminance against what is usually behind it
   (sea, sand, sky).
3. **Light and ambient occlusion:** the rim light, `formShade`, and the ramp.
4. **Geometry and depth:** overlap, layering, fog falloff.
5. **A selective, subtle line, as a last resort.** Only via `OUTLINE` in `style.ts`, never thicker than
   `OUTLINE.maxWidth` (1.2 cm), in `OUTLINE.ink` (a deep sea tone, never black), and only on the specific object that
   fails 1–4. Record why in the commit.

Lines baked into textures or vertex colours (dark stripes painted along edges) count as outlines too.

## 8. Detail hierarchy (≈ 70 % simplicity, 30 % intentional detail)

Spend detail on: **the player's vessel and crew, the captain, interactive structures (shops, docks, salvage), landmarks
and points of interest.** Keep secondary scenery (background houses, distant towers, scattered rocks) simpler and
quieter in value, so the phone screen reads in one glance. A good test: blur the screenshot. The interactive things
should still be the clearest shapes.

## 9. Checklist for a new asset

1. Model in MeshCraft (`three-web-toon` profile: vertex colours, metres, Y-up, +Z front). Name materials by palette
   role.
2. Colours from §5. No pure black (linear luminance < 0.07 gets lifted, but author it right). No new saturated hues.
3. No outline geometry, no dark edge stripes.
4. Triangle budget (§3) and draw-call rule (merge into the kit, glow parts emissive).
5. Add the node to `FORM_SHADED` (or the character to `FORM_SHADED_CHARACTERS`) in `src/world/style.ts`.
6. Check it in game at **phone gameplay scale** (iPhone 13 portrait), at noon, dusk, night and in a storm. The
   capture poses used for this pass (harbour, boat close, on foot by the shops, dusk) are in
   `docs/art-direction/README.md`.
7. `npm test` (the style test enforces the outline policy and ramp), `npm run build`, `npm run check:visual`.
