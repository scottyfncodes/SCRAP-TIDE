# GITCRAFT asset modernization

> **Polish round:** choppy turning (a camera-ordering bug in the existing steering) and a white, glossy sheen on the new models (pale palette roles lifted by the weathering pass) are both fixed. Root causes, affected materials and before/after are in [`polish.md`](polish.md).

This pass replaces the last code-built 3D visuals in TIDEBREAKERS with purpose-built GITCRAFT MeshCraft models. It covers the Ironwake Expedition Cat, every island scatter prop and landmark, Driftholm's pier, the finds and wildlife, and the remaining ship fittings. It is a visual change only. The physics, buoyancy, colliders, camera, wake, water, lighting, progression and saves are untouched.

- **Branch:** `gitcraft-asset-modernization`
- **Machine-readable history:** `creative/asset-history/tidebreakers-asset-history.jsonl` (one record per replacement)
- **Screens:** `docs/asset-modernization/screens/` (before = `main`, after = this branch, same camera)

## 1. Audit: legacy asset inventory

Every visible 3D object in `src/` was inventoried (2D UI canvas art excluded). By the start of this pass most of the world was already GITCRAFT: the drowned structures, raft towns, Waterworld kits, Patchwork Skiff, Scrap Trimaran and its upgrades, raider skiffs, and the rigged cast. What was still built from primitives:

### Primary visuals with no GLB (replaced in this pass)

| Legacy asset | Was | Used by | Gameplay-critical | Replacement |
|---|---|---|---|---|
| Ironwake twin hulls, bridge deck, cross-beams | `shipModel.ts` `hullGeometry()` ×2 + boxes | Third vessel | **yes** (the hull the player sails) | `tb_ironwake` `ironwake_hulls`, `ironwake_deck` |
| Ironwake wheelhouse | boxes | Third vessel | no | `ironwake_wheelhouse` |
| Ironwake rails, stanchions, helm wheel | cylinders, torus | Third vessel | no | in `ironwake_deck` (the helm is the boat kit's `nav_console`, as before) |
| Ironwake mast | cylinder | Sails hang from it | no | `ironwake_mast` (stretched per sail tier) |
| Ironwake rudder + tiller | box, cylinder (floating between the hulls) | Ash Rudder upgrade visual | no | `ironwake_rudder_port` / `_starboard` |
| Dead palms (`deadPalm`) | cylinders + frond strips | Every island (70 % of trees), *twin palms* and *big palm* landmarks | colliders | `tb_coast_kit` `dead_palm_a..d` |
| Rocks (`rock`) | noise icosahedron | Every island, *boulder* landmark | colliders | `rock_a..d` (`rock_c` is drowned concrete rubble with rebar) |
| Scrub, grass, driftwood | cylinders, cones | Every island | no | `scrub_a/b`, `grass_tuft`, `driftwood` |
| Skull Rock | sphere + boxes | Turtle Atoll, treasure map *The Turtle's Belly* | **yes** (map landmark, collider r 3.4) | `tb_landmark_kit` `skull_rock` |
| Lighthouse | banded cylinders | Lantern Rock | collider | `lighthouse` (lamp lit at night) |
| Hut | box + cone | Lantern Rock | collider | `hut` |
| Wreck of the *Wren* | torus ribs + boxes | Gull Shoal, dig site | **yes** (dig spots, 4 colliders) | `wreck` |
| Sun arch, pillar ring, storm-drain spring | boxes, torus, cylinders | Canopy Rise, *Redfinch's Sun Hoard* map | **yes** (map landmarks, colliders) | `sun_arch`, `pillar_ring`, `spring` |
| Driftholm pier (planks, pilings, fenders, main + finger piers) | ~200 boxes and cylinders | Harbor docking | **yes** (`boatRects` and `pierTip` are docking) | `pier_section`, `finger_section` |
| Pier bollards, lamps, barrels, crates | cylinders, boxes | Harbor | no | `bollard`, `pier_lamp`, `barrel`, `cargo_crate` |
| Slipway frame, garden fence, flagpole | torus, boxes, cylinder | Harbor | fence colliders | `slipway`, `fence_panel`, `flagpole` |
| Treasure chests (small, grand, sea) | boxes + half-cylinders | Treasure digs | **yes** (lid opens, glow) | `tb_finds_kit` `chest_<tier>_body` / `_lid` |
| Island crate | boxes | Finds | **yes** (lid opens) | `crate_find_body` / `_lid` |
| Message in a bottle | cylinders | Finds | **yes** (interaction) | `msg_bottle` + see-through `msg_bottle_glass` |
| Dig-hole mound | hemisphere | Digging | no | `dig_mound` |
| Crab | spheres, cylinders | Empty digs | no (scuttles 3 s) | `crab_body` + animated `crab_legs` |
| Beach pickups (conch, starfish, sand dollar, plank, rope, bottle, coral, other) | cones, spheres, boxes | Beachcombing | **yes** (collected by proximity) | `pickup_*` (+ `__a`/`__b` parts that take the item's colours) |
| Gulls (18) | capsule + 2 triangles | Sky | no (flap) | `gull_body` + `gull_wing` (flapped, mirrored) |
| Anchor | cylinder + torus | All vessels | **yes** (anchoring animation) | `tb_fittings_kit` `anchor` |
| Skiff paddle, rudder, mast | cylinders, box | Patchwork Skiff | no | `paddle`, `skiff_rudder`, `skiff_mast` |
| Deck trophies | cylinders, spheres, cones | Trophy slots | no | `trophy_base` + `trophy_*` (item colours kept) |
| Captain's shovel | cylinder + box | Digging (on the rigged hand) | no | `shovel` |

### Fallback-only procedural geometry (kept; see §5)

The legacy builders below are now drawn only if a GLB fails to load (`model()/kitGeo() ?? procedural`):

- **Before this pass:** `drowned.ts` structure and raft-module boxes, the beacon-buoy fallback, the raider-boat box, the castaway-raft box, the plant-find icosahedron, the captain stand-in until `tb_captain` streams in, `P.person` townsfolk until the rigged NPCs stream in, and the sloop's code-built hull and upgrade parts.
- **Added by this pass:** every builder in the table above, plus the code-built Ironwake while its lazily loaded file is in flight.

### Procedural by design (not assets)

These stay procedural:

- **World systems:** terrain heightfield (`heightAt` is the single source of truth for walking and collision), ocean, sea floor, sky dome, clouds, storm decks, the Stormwall ring.
- **Effects:** rain, lightning, particles, FlipFX billboards, wake, hero outlines (built from each mesh).
- **Animated or canvas-textured surfaces:** the waterfall sheet and mist, plant halos and light shafts, dig-hole decals, pickup sparkles, shop signs (canvas text), the waving flags, and sails that carry cosmetic textures and billow every frame.

### Wildlife

Gulls and crabs are the only animals the game renders. Fish are a catch item and *turtle* is an island name, so there was nothing else to rebuild.

## 2. GITCRAFT as the source

GITCRAFT's 3D conventions, read from `~/.gitcraft/repo/meshcraft` and the project's earlier passes, are:

- metres, Blender Z-up, front −Y (which becomes +Z in three.js);
- palette roles baked into `COLOR_0` for the game's vertex-colour toon material;
- the `three-web-toon` export profile, with LODs and a collision export;
- validation by `validate_asset` (with the Khronos validator) and `engine_check` in three@0.170 with the game's toon material.

I reused existing GITCRAFT assets where they fit:

- the boat kit's helm console;
- the flora kit, for living trophies and plant finds;
- the chest contract (nodes, hinge, opening arc) from the `creative/3d` chest pilot.

The pilot's chests themselves are bright cartoon art and clash with the drowned palette, so they were rebuilt rather than dropped in. MeshCraft's stock templates (`prop`, `crab`, `island`, `lighthouse`) are from the same pre-drowned toy style, so every model here is a purpose-built MeshCraft `run_script`. They use the project's Waterworld palette (`creative/3d-waterworld/tidebreakers-waterworld-palette.json`), with its pale roles taken down to the world's weathered mid-tones (the `WEATHERED` table in each script; see `polish.md`), and its living-green rule: plants and vines on unguarded ground use dull olive and kelp roles.

| Model | Script | Nodes | Triangles | Shipped |
|---|---|---|---|---|
| `tb_ironwake.glb` | `creative/3d-ironwake/scripts/ironwake.py` | 7 | 5,912 | 186 KB (Meshopt) |
| `tb_coast_kit.glb` | `creative/3d-coast/scripts/coast_assets.py` (`coast_kit`) | 20 | 4,452 | 222 KB |
| `tb_landmark_kit.glb` | same script (`landmark_kit`) | 8 | 8,676 | 355 KB |
| `tb_finds_kit.glb` | `creative/3d-finds/scripts/finds_assets.py` (`finds_kit`) | 30 | 4,176 | 220 KB |
| `tb_fittings_kit.glb` | same script (`fittings_kit`) | 22 | 1,420 | 80 KB |

Each asset folder holds:

- `source/*.blend`: editable;
- `exports/`: `three-web-toon` plus LOD50, LOD25, collision, and the shipped `.mobile.glb`;
- `previews/`: Cycles renders;
- `engine/`: three.js renders;
- `logs/`: raw MeshCraft results for `run_script`, `render_preview`, `export_asset`, `validate_asset`, `engine_check`, and the Khronos run.

### Rebuild

```bash
run_script     {"path": ".../creative/3d-coast/scripts/coast_assets.py", "args": {"asset": "coast_kit", "out_dir": ".../creative/3d-coast/coast_kit", "palette": ".../creative/3d-waterworld/tidebreakers-waterworld-palette.json"}}
render_preview {"blend": ".../coast_kit/source/tb_coast_kit.blend", "out_dir": ".../coast_kit/previews", "size": 640}
export_asset   {"blend": "...", "profiles": ["three-web-toon"]}
node creative/3d-waterworld/scripts/optimize.mjs <export>.glb <asset>.mobile.glb    # kits (unquantized, see below)
node creative/3d-sloop/compress_models.mjs <export>.glb <asset>.mobile.glb          # the Ironwake (Meshopt)
validate_asset {"blend": "...", "exports": ["<asset>.mobile.glb"], "profiles": ["three-web-toon"]}
engine_check   {"glb": "<asset>.mobile.glb", "material": "game-toon"}
```

## 3. Integration (architecture)

There is one loader and one cache, `src/world/assets.ts`, the same as every earlier GITCRAFT model. No second asset system was added. Two helpers are new:

- **`bakeModel(root, solid, glow, {skip, only})`:** bakes a tinted, many-material `sceneModel()` clone into the ship's batched mesh. The Ironwake has 51 primitives in the file but costs the same two draw calls as the code-built cat.
- **`tintedPart(file, base, a, b)`:** builds a kit piece in an item's own two colours (`items.ts` `colors`), so a pickup or trophy still shows what it is.

How each group of assets is wired in:

- **Ironwake** (`shipModel.ts`):
  - Its hulls are lofted from the same `P(u, v)` as `hullGeometry(HULLS.ironwake)` and offset by `CAT_OFFSET`. The waterline footprint the buoyancy, wake and collision use (`waterline: { halfLen, halfBeam, twin }`) is unchanged; only the visual mesh changed.
  - `TBI_Paint` and `TBI_Trim` take the paint cosmetic.
  - The wheelhouse is skipped when the Container Cabin stands in its place.
  - The mast stretches to the sail tier's height; the rudders grow and take an ash tint with the Ash Rudder.
  - It loads lazily, like the Trimaran's upgrades (`VESSEL_MODEL_FILES`): only a save that sails the Ironwake downloads it.
- **Islands** (`environment.ts`):
  - Kit pieces go through `coast()` and `landmark()`, which call `kitGeo()`. They join each island's single merged mesh, so draw calls are unchanged.
  - Every collider, `boatRect` and `pierTip` is where it was.
  - The code-built fallback draws its shape from its own seeded RNG, so an island's layout is the same whichever path draws it.
- **Finds** (`fx.ts`): `chestMesh()` and `crateFindMesh()` keep their `{ root, lid, glow }` API, hinge position and opening arc. Pickups keep their child order (mesh, then sparkle), which the game's spin and pulse loop relies on.
- **Gulls** (`sky.ts`): same flight path and flap; the wing node's origin is the shoulder.

### A GITCRAFT pitfall found and guarded

Meshopt export quantizes positions (`KHR_mesh_quantization`) and puts the dequantization scale on the mesh's own node. `part()` flattens a node into that node's own space, so it would remove the scale, and the pier rendered as giant drums.

- **Fix:** kits used through `part()` and `kitGeo()` ship unquantized (the `optimize.mjs` path, like the earlier kits). Whole-scene models (`sceneModel()`, `bakeModel()`) can be Meshopt-compressed.
- **Guard:** a unit test fails if any of the four kits ships quantized.

## 4. Validation

| Check | Result |
|---|---|
| MeshCraft `validate_asset` on the shipped files | 0 failures on all 5. Warnings: triangle budget on `landmark_kit` (8,676 vs an 8,000 advisory, for 8 one-off landmarks), and footprint-centre on multi-node kits (expected, as on the earlier kits) |
| Khronos glTF-Validator | 0 errors, 0 warnings on all 5 |
| MeshCraft `engine_check` (three@0.170, game toon material) | ok on all 5 |
| `npm test` (unit, includes every node the code asks for, the Ironwake's tint materials and the no-quantization guard) | 298/298 pass |
| `npm run build` | pass |
| e2e gameplay, `tests/e2e/play.cjs` (mobile Chromium, built game; new check: the four kits load) | 31/31 pass |
| Wake visual check, `npm run check:visual` (now also asserts the Ironwake model loads) | PASS: 0–0.7 % of wake puffs over the hull (limit 8 %) for the skiff, trimaran and Ironwake, from behind and from the side |
| Rendered before/after (`screens/`) | islands, landmarks, harbor day and night, the finds stage, the skiff's fittings, and the Ironwake at noon, dusk, night, side, top and under sail with every upgrade fitted |

## 5. Remaining legacy, and why

| Remains | Why |
|---|---|
| Code-built fallbacks for everything above | Load-failure resilience, as for every earlier model: if a GLB 404s on a bad connection, the game still has an island, a pier and a boat. They are never drawn alongside the GLB. |
| Sails on the skiff and Ironwake, and the sloop's canvas-sail fallback | They carry the sail cosmetic's canvas texture (stripes, patches, emblems) and are re-shaped every frame to billow with the wind. A static mesh would lose both. GITCRAFT's `sail_sunset` has a billow morph target but no cosmetic textures, so this needs a design decision first. |
| Masthead flag, watchtower flag | Vertex-animated cloth with canvas cosmetic textures. |
| Anchor rope | A cylinder stretched to the live anchor depth each frame. |
| Horizon skyline (`sky.ts`) | About 2k triangles of distant silhouettes in one fog-coloured mesh. GLB towers would cost far more for something seen only through fog. It is the next candidate if the horizon ever comes closer. |
| Shop signs, waterfall sheet, plant halos and shafts, dig decals, sparkles | Effects and text, not models. |
| Captain and townsfolk stand-ins | Shown only for the seconds before the rigged cast streams in (unchanged). |

Dead code removed: `palm`, `bush` and `bigLeaves` in `props.ts` were never called.

## 6. Performance

Measured with `renderer.info` in mobile Chromium (iPhone 13 profile, fixed cameras), on `main` and on this branch:

| View | Draw calls (main → branch) | Triangles drawn | GPU geometries |
|---|---|---|---|
| Driftholm harbor | 78 → **78** | 361k → 375k (+3.8 %) | 120 → 101 |
| Turtle Atoll | 45 → **45** | 360k → 364k (+1.2 %) | 128 → 108 |
| Canopy Rise | 29 → **29** | 278k → 285k (+2.6 %) | 137 → 117 |
| Open sea | 68 → **65** | 459k → 461k (+0.4 %) | 167 → 138 |

- **Draw calls:** unchanged or lower. Kit pieces merge into each island's single mesh, the Ironwake is baked into the ship's batch, and finds are 1–2 meshes each, as before.
- **Triangles:** +0.4 to +3.8 % on screen. A dead palm went from about 250 to about 380 triangles. The landmarks are one-offs.
- **The budget cut:** the first coast export measured 16.6k triangles in one file. It was split into the scatter and landmark kits, and cut to 6-segment palm trunks, 9-sided barrels and no bevels.
- **JS heap:** 86 → 103 MB after load, from keeping the parsed kit files for `part()`. This is well inside iPhone Safari's budget; if it ever matters, free each kit's glTF once the islands are built.
- **In-play perf** (`scripts/perf-sail.mjs`, the Ironwake in a storm): software GL runs at about 2 fps both ways, so frame times there are noise (p50 633 ms on `main`, 450 ms on the branch). A real device is needed for frame-rate numbers.
- **Download:**
  - +0.9 MB at boot: the coast, landmark, finds and fittings kits.
  - +0.19 MB lazily, only for Ironwake saves.
- **Shadows:** these are the same casters as before.
