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
