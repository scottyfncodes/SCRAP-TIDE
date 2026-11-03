# Coastal Sloop (GITCRAFT TIDEBREAKERS 3D package)

`public/models/tb_coastal_sloop.glb` is the GITCRAFT **TIDEBREAKERS Coastal Sloop** v1, `three-web-toon` export profile
(COLOR_0 vertex colours, 4,392 triangles, 12 primitives, 313 KB). Only this one file is copied into the game.

| | |
|---|---|
| Source | [scottyfncodes/GITCRAFT](https://github.com/scottyfncodes/GITCRAFT) `acceptance/tidebreakers-3d/library/assets/tidebreakers_coastal_sloop/v1/exports/tidebreakers_coastal_sloop.three-web-toon.glb` |
| GITCRAFT commit | `4ba1554f66c82aa6af71be9f523fcb28da7a2cf4` |
| SHA-256 | `f4bdd1d6fa8b577f6de1ef64d8d6604ca4cfecbf82670aeb802011e5e45da3a8` |
| Made with | ForgeCraft → MeshCraft `boat` template (Blender), hull lofted from `HULLS.sloop` in `src/ship/shipModel.ts` |
| Frame | metres, Y-up, bow = +Z, y = 0 at the waterline; used at scale 1 with no offset |
| Validation | MeshCraft 27 pass / 0 fail, Khronos glTF-Validator, three.js r170 `GLTFLoader` engine check |

## In the game

`buildShip()` uses it for the `sloop` vessel (the Scrap Trimaran). It replaces the procedural hull, deck, cabin, rails,
helm, mast, rudder and sails; the outrigger floats, anchor, crew, trophies and every upgrade still come from the game.
If the GLB fails to load, the procedural sloop is built instead. Movement, physics, collision radius and camera use the
same `length`/`beam` as before.

Socket empties are kept for the upgrade models that will attach later:
`socket_hull`, `socket_sail`, `socket_storage`, `socket_navigation`, `socket_steering`, `socket_flag`.
An equipped flag cosmetic flies from `socket_flag` in place of the model's own pennant.

## Outrigger floats and cross-beams (`outriggers/`)

`public/models/tb_sloop_outriggers.glb` replaces the Trimaran's code-placed kit floats. It was modelled with GITCRAFT
**MeshCraft** (Blender 5.2.3, headless, sandboxed) by `outriggers/build_outriggers.py`, a `run_script` that uses the
sloop's own builder kit (`engine/procedural/geo.py`):
- the floats are lofted like the sloop's hull, with the same GC palette-role materials (seafoam planking
  `GC_Plank_4fb39a`, cream trim `GC_Wood_f2ead8`, honey deck, timber beams, rope lashings);
- they get the same per-face vertex-colour bake.

| | |
|---|---|
| Fit | floats 0.70 × 6.1 m centred at x = ±4.375, z = -0.4, y 0.40 to 1.08 (the old kit part's span); two cross-beams per side at z = -1.78 and 0.98, lashed over the gunwale |
| Size | 2,320 triangles, 167 KB (`three-web-toon`; LOD50/LOD25 and collision exports in `outriggers/exports/`) |
| Validation | MeshCraft 15 pass / 0 warn / 0 fail; dimensions 9.70 × 6.09 × 1.14 m against the 9.7 × 6.1 × 1.15 m target; Khronos glTF-Validator 0 errors / 0 warnings |
| Engine check | three@0.170 GLTFLoader + the game's toon material: loads, 12/12 meshes with COLOR_0, nodes `outrigger_port` / `outrigger_starboard` found (`outriggers/previews/tb_sloop_outriggers_engine_check.png`) |
| SHA-256 | `e60b24b319579889428ddbb92cee2066f5a3cd9df00461bcf823c23eb12cdaf2` |

The exact MeshCraft calls and their results are in `outriggers/logs/`. If the file fails to load, the kit floats come back.

## Cosmetics on the model

The sloop and outriggers were built in Seafoam Green paint with Red Stripe sails. `tintModel()` recolours the
materials that carry those colours from the equipped cosmetics, keeping each vertex's baked light/dark variation:

| Material | Takes |
|---|---|
| `GC_Plank_4fb39a` (hull, floats) | paint colour 1 |
| `GC_Wood_f2ead8` (gunwale trim, float trim) | paint colour 2 |
| `GC_Cloth_f1e6cc` (sail cloth) | sail colour 1 |
| `GC_Cloth_c0392b` (mainsail band) | sail colour 2 |

So Seafoam Green + Red Stripe shows the model exactly as built. The default Bare Driftwood paint and Plain Canvas sail
give a driftwood hull and an all-canvas sail.
