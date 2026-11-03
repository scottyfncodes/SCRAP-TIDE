# Characters pass: from block toys to apocalyptic-pirate survivors

**Ask:** the characters still looked like block toys; make them closer to human, with an apocalyptic-pirate look.

## Before
- **Captain:** procedural capsules and spheres with a ball head and dot eyes, about 3 heads tall, animated by rotating
  whole limbs.
- **Crew (6):** MeshCraft `deckhand` template characters. Cylinders and cubes rigidly bound to bones, a big ball head,
  dot eyes and bright primary colours.
- **Townsfolk (8):** static cylinder legs, a capsule body and a ball head. No animation beyond a scale "breath".
- **Raiders:** none visible; the skiffs were empty.

## After (see `screens/`)
- **11 characters** built in GITCRAFT MeshCraft (`creative/3d-characters/README.md` has the full cast and pipeline).
  They have human proportions, sculpted heads, hands, smooth-shaded lofted bodies with blended joints, and layered
  apocalyptic-pirate wardrobes.
- **The captain** streams in after the title (the old stand-in shows until then) and plays Idle, Walk (speed-scaled), Sit
  at the helm, Dig with a shovel in hand, and Cheer. The pose logic and the game API are unchanged.
- **The crew** keep the same files and loader, so saves, recruiting and deck placement are untouched; they now ride on
  deck as recognisable people.
- **Townsfolk** are traders, elders and dockhands with idle animation. Every 9–21 s one waves or haggles (Interact).
  Shopkeepers stand at their counters.
- **Rustfang skiffs carry two raiders:** one at the bow and one at the tiller. The bow raider switches to its cutlass
  Attack clip while chasing you.

## Verification
| Check | Result |
|---|---|
| MeshCraft `validate_asset` (export and shipped file, 11 characters) | 0 failures. 8 fully clean; 3 have one footprint warning from a long held weapon |
| Khronos glTF-Validator (shipped files) | 0 errors, 0 warnings on all 11 |
| `npm test` | **237/237**, including a new check that every character is one skinned primitive with smooth normals, 4k+ triangles, its required clips and a root-level skinned mesh |
| `tests/e2e/play.cjs`, production build, mobile Chromium 390×844 | **25/25**, including a new check that the rigged captain (with Dig and Sit), 8 townsfolk and 2-raider crews replace the stand-ins. No runtime errors |
| Draw calls vs the previous release, same spots | Driftholm −5 (multi-part stand-ins replaced by single skinned meshes), Rustfang +7 (raider crews), others ±3. Triangles about +12% |

## Payload
Characters stream in **after** the title screen (the same lazy path the crew already used), so first load is unchanged.
The streamed set is 2.8 MB for 11 characters, up from 1.37 MB for the 6 old deckhands. Each file is 217–363 KB after
quantization.

## Honest limits
- No physical iPhone frame-rate measurement. Up to about 15 skinned characters can be animating near Driftholm, and
  only those in view range are updated.
- No facial animation and no finger posing: faces are sculpted but static.
- MeshCraft's own `engine_check` could not run because installing its npm dependencies was blocked in this
  environment; the in-game e2e check and the screenshots replace it.
