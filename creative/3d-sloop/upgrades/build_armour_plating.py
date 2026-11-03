"""Riveted Armour Plating: curved iron plates bolted along both sides above the copper band (loft girth 0.74-0.97),
in a forward and an aft belt that leave amidships for the cargo nets and the outrigger beams."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_armour_plating")
BELTS = [(1.25, 3.55), (-3.9, -2.05)]
V0, V1, OFF, T = 0.74, 0.97, 0.045, 0.022
P = []
for side in (-1, 1):
    for za, zb in BELTS:
        n_pl = 4
        w = (zb - za) / n_pl
        for k in range(n_pl):
            z0, z1 = za + k * w + 0.02, za + (k + 1) * w - 0.02
            NZ, NV = 3, 3
            verts, faces = [], []
            for i in range(NZ + 1):
                z = z0 + (z1 - z0) * i / NZ
                for j in range(NV + 1):
                    v = side * (V0 + (V1 - V0) * j / NV)
                    p = hull_at(z, v) + hull_normal(z, v) * OFF
                    verts.append(g2b(p.x, p.y, p.z))
            for i in range(NZ):
                for j in range(NV):
                    a = i * (NV + 1) + j
                    faces.append((a, a + NV + 1, a + NV + 2, a + 1) if side > 0 else (a, a + 1, a + NV + 2, a + NV + 1))
            plate = mesh_obj("plate", verts, faces, m.iron if k % 2 == 0 else m.steel)
            geo.solidify(plate, T)
            P.append(plate)
            for z in (z0 + 0.08, z1 - 0.08):                                  # rivets
                for v in (V0 + 0.03, V1 - 0.03):
                    q = hull_at(z, side * v) + hull_normal(z, side * v) * (OFF + T * 0.6 + 0.012)
                    P.append(box("rivet", m.black, (q.x, q.y, q.z), (0.035, 0.035, 0.035)))
body(P)
finish(args["out"], "Upgrade: Riveted Armour Plating")
