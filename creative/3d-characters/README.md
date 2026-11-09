# Scavenger cast (GITCRAFT MeshCraft)

Eleven rigged characters replace the block-toy deckhands, the capsule-and-sphere captain and the cylinder townsfolk.
They are built headless in **GITCRAFT MeshCraft** (Blender 5.2.3) from `scripts/survivors.py`, using the Waterworld
palette.

| Asset | Who | Clips | Tris | Shipped |
|---|---|---|---|---|
| `captain` | The player. Patched leather-and-sailcloth duster, bandolier, red scarf, dented steel salvage helmet with a peak, welding goggles and a sailcloth neck flap (was a tricorn until art-direction pass 2), long hair, jaw-line beard, scarred cheek | Idle, Walk, Sit, Dig, Cheer, Interact | 6,228 | `tb_captain.glb` 355 KB |
| `crew_mechanic` | Juno. Welding goggles, sleeveless top, leather apron and gloves, ponytail, wrench | Idle, Walk, Interact, Attack | 4,690 | `tb_crew_mechanic.glb` |
| `crew_fisher` | Tomas. Old, with a full white beard, a faded yellow oilskin, a sou'wester and a gaff | 〃 | 5,172 | `tb_crew_fisher.glb` |
| `crew_lookout` | Kai. Young, in a tarp poncho with a hood and scarf, carrying binoculars | 〃 | 4,578 | `tb_crew_lookout.glb` |
| `crew_navigator` | Mara. Long navy coat, headwrap, round glasses, backpack and bedroll, spyglass | 〃 | 5,422 | `tb_crew_navigator.glb` |
| `crew_salvager` | Bram. Big build, bald with a full beard, black wetsuit, goggles, steel pauldron, rope coil, grapple | 〃 | 4,900 | `tb_crew_salvager.glb` |
| `crew_defender` | Ines. Mohawk, welding goggles pushed up, a scarred cheek, a road-sign pauldron and car-hood chest plate, harpoon | 〃 | 4,848 | `tb_crew_defender.glb` |
| `npc_trader` | Driftholm trader. Headwrap, apron, yellow scarf | Idle, Interact | 4,538 | `tb_npc_trader.glb` |
| `npc_elder` | Elder with a long white beard and hair, a poncho and a lantern | Idle, Interact | 4,604 | `tb_npc_elder.glb` |
| `npc_dockhand` | Dockhand. Dreadlocks, beanie, rope coil, bare arms | Idle, Interact | 5,082 | `tb_npc_dockhand.glb` |
| `raider` | Rustfang raider. Red mohawk, face mask, goggles, scrap pauldrons, bandolier, leaf-spring machete | Idle, Attack | 5,020 | `tb_raider.glb` |

## What makes them read as people

- **Proportions:** about 7.3 heads tall, a small head on a neck, shoulders wider than the hips (or the reverse for the
  female frame), a narrow waist, a calf and a forearm on tapered limbs. Each limb has a build/girth parameter.
- **A sculpted head:** a skull taller than it is wide, a jaw narrowing to the chin, a brow ridge, eye sockets and
  cheekbones, a nose, ears, eye whites and irises, brows, and a mouth and lip line. Hair, beards, dreads and mohawks
  are their own masses.
- **Hands:** a palm, four fingers and an angled thumb, gloved where the outfit says so.
- **Continuous lofted torso and limbs with smooth shading,** and **blended joint weights**, so shoulders, elbows, hips and
  knees bend instead of hinging rigid blocks. Coat tails follow the hips and swing with the nearer thigh.
- **Layered clothing.** Coats have open fronts, lapels, collars, cuffs, a ragged hem and patches of other cloth.
  Armour is cut from road signs and car hoods. There are bandoliers with shells, pouches, scarves (one pulled up as
  a raider mask), a salvage helmet with welding goggles, a sou'wester, hoods, headwraps and a beanie.
- **Clips:** an idle with weight on one leg, breathing and a glance round, plus Sit (at the helm), Dig (two-handed,
  bent into the stroke) and Cheer. Walk, Run, Interact and Attack come from MeshCraft's own clip library on the same
  22-bone Mixamo-named skeleton, so Mixamo clips still retarget by name.

## Pipeline (per character, logs in `<asset>/logs/`)

1. `run_script` (MeshCraft): builds, skins and rigs the character, authors the clips, bakes the palette into COLOR_0,
   collapses everything to one material (one primitive, one draw call), and puts the skinned mesh at the scene root.
2. `export_asset`, profile `three-web-toon`.
3. `validate_asset` on the export: 0 failures on all 11.
4. **Mobile pass** (`scripts/optimize_char.mjs`):
   - keeps smooth normals;
   - 8-bit colour;
   - resamples redundant animation keys;
   - welds;
   - `KHR_mesh_quantization` (14-bit positions, 10-bit normals, 8-bit weights).

   This cut the captain from 826 KB to 355 KB.
5. Khronos glTF-Validator: **0 errors, 0 warnings on all 11** (`logs/khronos_mobile.json`).
6. `validate_asset` on the **optimised file that ships**: 0 failures. Captain, mechanic, lookout, navigator, salvager
   and the three townsfolk are fully clean. Fisher, defender and raider have one `origin_centered` warning because
   the long gaff, harpoon and cutlass push the footprint forward in the rest pose. That is expected.
7. **Engine check in the real game** (three@0.170 in mobile Chromium): the e2e suite asserts the rigged captain
   (with Dig and Sit), 8 townsfolk and 2 raiders per skiff replace the stand-ins. The clip poses were reviewed in a
   game-material viewer, and in-game screenshots are in `docs/characters-pass/screens`.

`gitcraft_audit.jsonl` has 63 MeshCraft calls with file hashes. The 4 failures are the raider's first attempt (a colour
overflow in the shade helper) and its knock-on steps; they were fixed and re-run. As in the Waterworld pass, MeshCraft's own
`engine_check` could not run here because installing its npm deps was blocked; the in-game check replaces it.

## Rebuild
```bash
R=creative/3d-characters
run_script     {"path": "$R/scripts/survivors.py", "args": {"asset": "captain", "out_dir": "$R/captain", "palette": "creative/3d-waterworld/tidebreakers-waterworld-palette.json"}}
export_asset   {"blend": "$R/captain/source/tb_captain.blend", "profiles": ["three-web-toon"]}
validate_asset {"blend": "...", "exports": ["$R/captain/exports/tb_captain.three-web-toon.glb"], "profiles": ["three-web-toon"]}
node $R/scripts/optimize_char.mjs $R/captain/exports/tb_captain.three-web-toon.glb $R/captain/exports/tb_captain.mobile.glb
node $R/scripts/check.cjs $R/captain/exports/tb_captain.mobile.glb
cp $R/captain/exports/tb_captain.mobile.glb public/models/tb_captain.glb   # crew → tb_crew_<role>.glb
```
To add someone, add an entry to `CAST` in `survivors.py` (body parameters plus a wardrobe function plus a held item).
