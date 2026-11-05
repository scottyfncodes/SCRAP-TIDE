# Patchwork Skiff (starter boat): Waterworld × Mad Max pass

`public/models/tb_patchwork_skiff.glb` replaces the old code-built dinghy hull. The old boat was eight clean planks; this
one has been welded together from whatever floated past.

| | |
|---|---|
| Made with | GITCRAFT **MeshCraft** (Blender 5.2.3, headless) `run_script` → `build_skiff.py`, using the sloop upgrade kit (`creative/3d-sloop/upgrades/_sloopkit.py`) |
| Frame | `HULLS.dinghy`: metres, Y-up, bow = +Z, y = 0 at the waterline. Used at scale 1 with no offset |
| Size | 8,394 triangles, 17 primitives. The `three-web-toon` export is 604 KB, and 196 KB after the meshopt pass (`creative/3d-sloop/compress_models.mjs`) |
| Validation | MeshCraft 13 pass / 1 warn (8.4k against the 8k prop budget; this is the player's boat) / 0 fail. three@0.170 engine check: loads, 17/17 meshes carry COLOR_0 |
| SHA-256 (shipped) | `fcf43a277bc147bb934c8e14d94e17b2dc77e6ab940a9b05d39bbe7f29a69c8f` |

## What's on it

- **Hull of mismatched strakes** with staggered butt joints: painted, honey, sun-grey driftwood, rusted steel, a blue car-door panel and galvanised sheet.
- **Corrugated steel patches** welded and riveted over the holes, and a riveted steel transom.
- **Bow ram:** a striped car bumper, rebar struts converging on an iron spike, and two bumper spikes.
- **Gunwale:** steel-angle capping, spikes along the bow, a hubcap on the port bow and a chain draped over the starboard bow.
- **Oil-drum sponsons:** one blue and one orange drum, hooped and lashed on with poles and rope.
- **Fittings:** tyre fenders on ropes.
- **Inside:** pallet-slat floor, a driftwood thwart, a **torn oxblood car seat** at the helm (the captain sits in it), jerry cans and a rope coil.

The painted strakes use the paint roles `GC_Plank_4fb39a` and `GC_Wood_f2ead8`, so the paint cosmetic recolours them as it does on the sloop.

## In the game

`buildShip()` (`src/ship/shipModel.ts`) loads it for the `dinghy` vessel and drops the procedural hull, floorboards,
thwarts and stern box. The seat, crew spots, mast step, sails, flag, anchor and every kit upgrade stay where they were.
The mast becomes rusty scaffold pipe with a band of hazard tape. If the GLB fails to load, the procedural dinghy comes back.

The same pass added these for every vessel (`src/world/hero.ts`, `src/world/ocean.ts`):
- **Ink outline** (an inverted hull along smoothed normals, in Deep Tide navy) on the player's boat, its crew and the
  captain. Skinned characters get a skinned outline bound to the same skeleton.
- **Rim light** in the sun's colour on the same meshes. It is strongest at dusk, so they separate from the sea.
- **Hull foam collar** in the ocean shader where the hull meets the water, with a bow wave that grows with speed.

`before-after/` holds in-game shots from an iPhone 13 viewport, before on the left and after on the right.
