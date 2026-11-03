# Model compression (Meshopt)

The sloop, its outriggers and all 18 upgrade models ship **Meshopt-compressed**
(`EXT_meshopt_compression` + `KHR_mesh_quantization`). Positions are 14-bit, normals 10-bit, and colours stay 16-bit,
so the baked palette is unchanged. The game decodes them with three's `MeshoptDecoder` (`src/world/assets.ts`), so
there are no extra runtime files or dependencies. No textures are baked into these models: colour is in `COLOR_0`
vertex colours, so there is no texture compression to apply.

- Script: [`../compress_models.mjs`](../compress_models.mjs) (glTF-Transform 4.1.1). It keeps every node and
  material name the game looks parts up by: no material dedup, and prune only with `keepLeaves`, so the `socket_*`
  empties survive. Weld's and quantize's own cleanup would otherwise delete them.
- Before/after check: [`../compare_models.mjs`](../compare_models.mjs), with results in [`compare.jsonl`](compare.jsonl).
- MeshCraft validation and the three.js engine check, run on the compressed files: [`logs/`](logs/).

| File | Before (bytes) | After (bytes) | Saved | Nodes / materials / triangles | Max bounds change | Vertex colours | MeshCraft pass / warn / fail | Engine check |
|---|---|---|---|---|---|---|---|---|
| `tb_coastal_sloop.glb` | 312,656 | 109,388 | 65.0% | identical | 0.29 mm | identical (39,528 values) | 13 / 0 / 0 | pass |
| `tb_sloop_outriggers.glb` | 166,932 | 64,512 | 61.4% | identical | 0.11 mm | identical (20,880 values) | 15 / 0 / 0 | pass |
| `tb_upg_armour_plating.glb` | 125,156 | 37,800 | 69.8% | identical | 0.27 mm | identical (15,552 values) | 14 / 0 / 0 | pass |
| `tb_upg_brass_compass.glb` | 57,620 | 25,428 | 55.9% | identical | 0.04 mm | identical (6,282 values) | 13 / 0 / 0 | pass |
| `tb_upg_canvas_mainsail.glb` | 44,952 | 19,456 | 56.7% | identical | 0.21 mm | identical (5,292 values) | 12 / 1 / 0 | pass |
| `tb_upg_cargo_crates.glb` | 39,744 | 17,048 | 57.1% | identical | 0.05 mm | identical (4,428 values) | 13 / 0 / 0 | pass |
| `tb_upg_cargo_nets.glb` | 234,392 | 78,740 | 66.4% | identical | 0.09 mm | identical (28,800 values) | 14 / 0 / 0 | pass |
| `tb_upg_container_cabin.glb` | 68,596 | 25,352 | 63.0% | identical | 0.03 mm | identical (8,064 values) | 13 / 1 / 0 | pass |
| `tb_upg_copper_hull.glb` | 131,176 | 43,112 | 67.1% | identical | 0.21 mm | identical (17,208 values) | 13 / 0 / 0 | pass |
| `tb_upg_deck_lights.glb` | 211,832 | 65,568 | 69.0% | identical | 0.08 mm | identical (24,552 values) | 14 / 0 / 0 | pass |
| `tb_upg_deck_turbine.glb` | 21,392 | 15,352 | 28.2% | identical | 0.1 mm | identical (2,052 values) | 13 / 1 / 0 | pass |
| `tb_upg_fishing_rig.glb` | 55,860 | 21,480 | 61.5% | identical | 0.06 mm | identical (6,768 values) | 13 / 1 / 0 | pass |
| `tb_upg_fuel_drums.glb` | 57,696 | 25,608 | 55.6% | identical | 0.03 mm | identical (7,632 values) | 13 / 1 / 0 | pass |
| `tb_upg_harpoon_turret.glb` | 46,628 | 26,984 | 42.1% | identical | 0.03 mm | identical (4,842 values) | 13 / 1 / 0 | pass |
| `tb_upg_outboard.glb` | 23,204 | 15,480 | 33.3% | identical | 0.05 mm | identical (2,124 values) | 13 / 1 / 0 | pass |
| `tb_upg_radar_mast.glb` | 34,108 | 20,040 | 41.2% | identical | 0.03 mm | identical (3,456 values) | 13 / 1 / 0 | pass |
| `tb_upg_salvage_crane.glb` | 29,052 | 15,768 | 45.7% | identical | 0.05 mm | identical (3,168 values) | 13 / 1 / 0 | pass |
| `tb_upg_solar_array.glb` | 32,136 | 15,504 | 51.8% | identical | 0.05 mm | identical (3,600 values) | 13 / 1 / 0 | pass |
| `tb_upg_twin_diesel.glb` | 39,956 | 20,012 | 49.9% | identical | 0.02 mm | identical (4,392 values) | 13 / 1 / 0 | pass |
| `tb_upg_wheel_rudder.glb` | 79,320 | 29,012 | 63.4% | identical | 0.04 mm | identical (9,144 values) | 13 / 0 / 0 | pass |
| **Total (20 files)** | **1,812,408** | **691,644** | **61.8%** | | | | | |

MeshCraft's only warnings are the same by-design `origin_centered` warnings as before compression. These models are
built in the sloop's frame, so their origin is the boat's.

**Renders.** The engine-check renders before and after differ in 64 to 370 of 409,600 pixels. All of them sit on the
anti-aliased edges of thin parts (rails, mast, flag), where quantized positions move an edge by a fraction of a
pixel. The palette match is untouched: every vertex colour is identical. So every file ships compressed; none needed
to stay uncompressed. [`sloop_before_after_diff.png`](sloop_before_after_diff.png) shows before, after, and the
changed pixels (enlarged, magenta).

**After compression, the overlap audit is still clean** (GITCRAFT MeshCraft `audit_overlaps`, run on these files):
0 overlaps fully upgraded and in the early configuration. See [`../upgrades/README.md`](../upgrades/README.md).

