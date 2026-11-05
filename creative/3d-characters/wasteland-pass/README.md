# Wasteland pass: the cast in scavenged armour (Waterworld × Mad Max)

The rigged cast (`../README.md`) wore mostly clean clothes: T-shirts, beanies, smocks and a bright yellow oilskin.
This pass keeps every body, face, rig and clip. It adds scavenged armour to `scripts/survivors.py`, dresses all 11
characters in it, and grades their clothes toward sun-bleached, oil-stained colours.

New wardrobe pieces:
- `tyre_pauldron`: half a car tyre with tread.
- `bracer`: a tin-can or pipe forearm guard with straps and rivets.
- `kneepad`: a hubcap or road-sign knee plate.
- `spikes`: filed bolts on a pauldron.
- `harness`: crossed straps with a ring.
- `respirator`: worn over the mouth or hung at the throat.
- `goggles_eyes`: tinted glare goggles worn down over the eyes.
- `chain_loop`: a chain worn as a sash.
- `tarp_patches`: stitched-on tarp or sign squares.

| Who | What changed |
|---|---|
| Captain | Spiked steel pauldron, bracers, knee plates, a respirator at the throat (keeps the duster and tricorn) |
| Juno (mechanic) | Tyre pauldron, harness, bracer, knee plates, tarp patches |
| Tomas (fisher) | Faded olive oilskin, chain sash, rust pauldron, bracer, knee plate |
| Kai (lookout) | Faded hazard-orange tarp poncho (no longer a grey ghost on deck), mask up, glare goggles down, bracers, knee plates |
| Mara (navigator) | Faded coat with patches, harness, bracer, knee plate, respirator |
| Bram (salvager) | Spiked pauldron plus a tyre pauldron, bracers, knee plates, chain |
| Ines (defender) | Spikes, tyre pauldron, bracers, knee plates |
| Townsfolk | Goggles, harnesses, bracers, a tyre pauldron, chains, a respirator, tarp patches |
| Raider | Respirator, red glare goggles, spikes on both pauldrons, bracers, knee plates, chain |

The crew's **Cheer** clip is now built by `survivors.py` (`a_cheer`, as for the captain), not added afterwards.

Every character was rebuilt with `scripts/rebuild.sh <asset>`: MeshCraft `run_script`, `export_asset`, the mobile
pass and `validate_asset` on the shipped file. Results: 0 failures for all 11. The defender and the raider have the
expected `origin_centered` warning from the harpoon and the cutlass. Triangles: 5.3k to 7.1k.

The vitest cast checks still pass: one skinned primitive, more than 4k triangles, smooth normals, the mesh at the
root and every clip present.

Compare `cast_before.jpg` with `cast_after.jpg`. The `ingame_*` files are in-game shots.
