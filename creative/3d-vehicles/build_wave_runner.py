"""Wave Runner: a scrap-built jet ski in the spirit of the raiders' skis (MeshCraft run_script).

Built with the Trimaran's own builder kit (../3d-sloop/upgrades/_sloopkit.py): the sloop's GC palette-role materials,
helpers and per-face vertex-colour bake, so it reads as part of the same boat. Its own frame: metres, origin at the
middle of the hull on the waterline, bow +Z. The game docks it on the port outrigger float (socket_waverunner,
shipModel.ts) and rides it as a separate vehicle. The hull is painted in the sloop's Seafoam/cream roles, so the
equipped paint recolours it like the boat.

Nodes: waverunner_bars (handlebar, pivots for steering), waverunner_sled (the tow sled, hidden until bought).
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "3d-sloop", "upgrades"))
from _sloopkit import *

L, W = 2.6, 0.42           # length, half-beam


def hull_pt(u, v):
    """u 0 stern .. 1 bow; v -1..1 round the bottom (0 = keel). Game coords."""
    s = 2 * u - 1
    w = W * max(0.0, 1 - max(0.0, s) ** 1.8) ** 0.6 * (0.92 if s < 0 else 1)
    top = 0.38 + 0.18 * max(0, s) ** 2
    bot = -0.12 + 0.3 * max(0, s) ** 2.4
    a = abs(v)
    x = w * math.copysign(a ** 0.7, v) if v else 0.0
    y = top - (top - bot) * (1 - a ** 2)
    return (x, y, s * L / 2)


def hull(name, material, nu=16, nv=8):
    verts, faces = [], []
    for i in range(nu + 1):
        u = min(max(i / nu, 0.001), 0.999)
        for j in range(nv + 1):
            verts.append(g2b(*hull_pt(u, -1 + 2 * j / nv)))
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            faces.append((a, a + 1, a + nv + 2, a + nv + 1))
    # deck cap and transom
    deck = len(verts)
    for i in range(nu + 1):
        u = min(max(i / nu, 0.001), 0.999)
        verts.append(g2b(*hull_pt(u, -1)))
        verts.append(g2b(*hull_pt(u, 1)))
    for i in range(nu):
        a = deck + 2 * i
        faces.append((a, a + 2, a + 3, a + 1))
    faces.append(tuple(range(0, nv + 1)))
    return mesh_obj(name, verts, faces, material)


root, m = start("tb_waverunner")
P = [hull("wr_hull", m.paint),
     # cream rubbing strake along the sheer
     box("wr_strake_p", m.paint_trim, (-0.39, 0.36, -0.25), (0.04, 0.06, 1.6)),
     box("wr_strake_s", m.paint_trim, (0.39, 0.36, -0.25), (0.04, 0.06, 1.6)),
     # deck pad, saddle, cowl and a welded hazard nose plate
     box("wr_deck", m.dark, (0, 0.4, -0.55), (0.62, 0.04, 1.2)),
     box("wr_saddle", m.black, (0, 0.6, -0.35), (0.3, 0.2, 0.95), bevel=0.04),
     box("wr_saddle_patch", m.rust, (0.08, 0.71, -0.55), (0.12, 0.02, 0.22)),
     box("wr_cowl", m.steel, (0, 0.62, 0.42), (0.5, 0.26, 0.5)),
     box("wr_cowl_band", m.crimson, (0, 0.72, 0.42), (0.51, 0.06, 0.51)),
     slab("wr_nose", m.hazard, [(-0.24, 0.5, 0.95), (0.24, 0.5, 0.95), (0.18, 0.48, 1.25), (-0.18, 0.48, 1.25)], 0.02, up=(0, 1, 0)),
     box("wr_bumper", m.rope, (0, 0.3, 1.28), (0.3, 0.1, 0.06)),
     # footwells and grab rail
     box("wr_well_p", m.iron, (-0.3, 0.42, -0.4), (0.12, 0.03, 0.9)),
     box("wr_well_s", m.iron, (0.3, 0.42, -0.4), (0.12, 0.03, 0.9)),
     rod("wr_grab", m.iron, (-0.16, 0.66, -0.88), (0.16, 0.66, -0.88), 0.02, 6),
     # jet nozzle and a stovepipe exhaust
     cyl("wr_nozzle", m.iron, (0, 0.02, -1.34), 0.09, 0.18, 10, axis="z"),
     rod("wr_exhaust", m.rust, (0.22, 0.45, -0.95), (0.26, 0.82, -1.12), 0.035, 8),
     cyl("wr_exhaust_cap", m.iron, (0.26, 0.84, -1.13), 0.05, 0.05, 8),
     # a jerrycan lashed behind the seat (range), a small lantern on the cowl
     box("wr_can", m.crimson, (-0.18, 0.58, -0.98), (0.16, 0.22, 0.12), bevel=0.01),
     box("wr_lamp", m.glow, (0, 0.82, 0.62), (0.08, 0.06, 0.06))]
body(P)
# handlebars: pivot at the steering column
bars = [rod("wr_column", m.iron, (0, 0.72, 0.2), (0, 0.92, 0.1), 0.025, 6),
        rod("wr_bar", m.iron, (-0.3, 0.94, 0.08), (0.3, 0.94, 0.08), 0.02, 6),
        cyl("wr_grip_p", m.black, (-0.3, 0.94, 0.08), 0.03, 0.12, 8, axis="x"),
        cyl("wr_grip_s", m.black, (0.3, 0.94, 0.08), 0.03, 0.12, 8, axis="x")]
pivot("waverunner_bars", (0, 0.72, 0.2), bars)
# tow sled (upgrade): a plank sled with a crate, on a short towline astern
sled = [box("sled_deck", m.wood, (0, 0.12, -2.25), (0.6, 0.06, 0.8)),
        box("sled_runner_p", m.iron, (-0.26, 0.06, -2.25), (0.05, 0.06, 0.82)),
        box("sled_runner_s", m.iron, (0.26, 0.06, -2.25), (0.05, 0.06, 0.82)),
        box("sled_crate", m.honey, (0, 0.33, -2.25), (0.4, 0.36, 0.4), bevel=0.02),
        rod("sled_line", m.rope, (0, 0.1, -1.4), (0, 0.15, -1.85), 0.015, 5)]
pivot("waverunner_sled", (0, 0.1, -1.4), sled)
finish(args["out"], "Vehicle: Wave Runner", tags=("vehicle",))
