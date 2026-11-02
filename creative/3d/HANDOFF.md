# 3D handoff to engineering

**Scope.** What's ready, how it fits the current code, and how to adopt it. **Nothing here changes the game.** Every file lives under `creative/3d/`, and adopting any of it is a separate, reviewed engineering change.

## What is ready

| Asset | GLB for the game (`three-web-toon`) | Fits | Contract |
|---|---|---|---|
| Treasure chest, small / grand / sea | `chest_{small,grand,sea}/exports/tb_chest_<tier>.three-web-toon.glb` | **drop-in for `chestMesh(tier)`** (`src/game/fx.ts`) | nodes `chest_<tier>`, `chest_body`, `chest_lid`, `glow_anchor`; lid pivot = procedural pivot; opens with `lid.rotation.x = -1.9`; clips `lid_open`, `lid_close` |
| Ship lantern | `lantern/exports/tb_lantern.three-web-toon.glb` | new deck decoration (Phase 4 roadmap) | origin = hang point; `lantern_light` = PointLight anchor; clip `swing` (loop) |
| Grinning Sun figurehead | `figurehead_sun/exports/…` | new cosmetic slot (`figurehead`) | origin = bow mounting point, faces +Z |
| Flags (Tidebreaker colours, Colours of the *Wren*) | `flag_*/exports/…` | alternative to the masthead flag's vertex animation in `shipModel.ts` | skinned, bones `flag_0..3`, clip `wave` (loop) |
| Sunset sail | `sail_sunset/exports/…` | reference for the sail cosmetics | morph target `billow` (0 slack → 1 full), clips `fill`, `luff`; can be driven by the existing wind-fill value |
| Biscuit | `biscuit/exports/…` | mascot (deck companion or catalog) | 8-bone rig, clips `idle` (loop), `wave`, `snap` |

**Every GLB:**
- **Units:** Y-up, metres.
- **Colours:** baked into `COLOR_0`, so `vcMat()` renders it exactly like procedural geometry.
- **Validation:** Khronos glTF-Validator clean (0 errors, 0 warnings); MeshCraft validation passes; engine-checked in three@0.170.
- **Size:** 36–341 KB.
- **Static assets** also ship `.lod50.glb`, `.lod25.glb` and a convex `.collision.glb`. Skinned assets ship the collision hull only.

Other engines: `godot-glb`, `three-web-atlas`, `unity-fbx` and `obj-static` exports sit beside them where the brief asked for them.

## Adopting the chests (the pilot path)

1. Copy `chest_*/exports/tb_chest_*.three-web-toon.glb` to `public/models/`. This **adds** files; nothing existing is overwritten.
2. Copy `integration/chestGLB.ts` to `src/game/chestGLB.ts`.
3. In `main.ts`, during loading: `await preloadChests()`.
4. In `game.ts`, at both `chestMesh(...)` call sites: `const c = chestMeshGLB(tier) ?? chestMesh(tier);`

Behaviour is unchanged:
- **Same API:** `{ root, lid, glow }`.
- **Same hinge, opening arc, glow position and footprint.**
- **Same fallback:** if a GLB fails to load, the procedural chest is used.

**Proof:** `integration/verify/` runs the game's own `chestMesh()` beside the GLB through the same calls. Hinges are identical for all tiers, and `dropin_closed.png` and `dropin_open.png` show both. The loader typechecks under the game's strict `tsconfig`.

**Cost:** one extra request per tier at load, about 0.2 MB each, uncompressed. Draco would need a decoder and isn't used. Draw calls: the GLB chest has more parts than the procedural one, about 2.4k triangles and one primitive per palette role. If needed, the `three-web-atlas` export folds those into one material.

## Not done on purpose

- No change to `src/`, `public/`, gameplay, camera, controls or saves.
- The Brig and Grand Tidebreaker are **not** in `src/data/ship.ts`. 3D hulls are the next pilot (see `REPORT-3D.md`).
- The figurehead, lantern and Biscuit need design decisions (where they appear, how they unlock) before code.

## Regenerating or changing an asset

Each asset folder has:
- the brief it was built from (`briefs/<id>.json`);
- the editable `source/<id>.blend`;
- previews and a contact sheet;
- a full report `<id>.meshcraft.json`, which covers every check and file hash.

To change colours, edit the brief's `roles` (palette names from `creative/branding/palette/`). Then re-run MeshCraft `run_pipeline` with the brief; see GITCRAFT `meshcraft/README.md`.
