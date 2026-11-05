# Scrap Trimaran dress kit (`public/models/tb_sloop_scrap.glb`)

The Coastal Sloop model reads as a clean seafoam yacht. This kit welds the wasteland onto it without touching the
sloop's sockets, upgrade layout, culls or paint tints. It is a separate model in the sloop's frame, and `buildShip()`
always mounts it on the `sloop` vessel.

It adds:
- riveted corrugated-steel patches between the waterline and the armour belt;
- riveted plates either side of the rudder stock;
- a cow-catcher ram under the bowsprit: a striped bumper, rebar, two bumper spikes and a spiked tip;
- filed spikes along the forward gunwale;
- tyre fenders and a chain over the port bow.

| | |
|---|---|
| Made with | MeshCraft `run_script` → `build_sloop_scrap.py` (the sloop upgrade kit) |
| Size | 3,262 triangles; 71 KB after the meshopt pass |
| Validation | MeshCraft validation: 0 failures, 0 warnings |

In-game shots are in `previews/`.
