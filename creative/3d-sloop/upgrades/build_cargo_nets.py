"""Rope Cargo Nets: a bulging rope net slung over each side amidships, between the outrigger beams (z -1.45..0.62),
holding sacks, a buoy and a crate against the hull above the copper band."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_cargo_nets")
ZA, ZB = -1.45, 0.62
P = []
for side in (-1, 1):
    fill = [(-1.05, 0.83, m.cloth, (1.0, 0.85, 1.35)), (-0.42, 0.8, m.coral, None), (0.22, 0.83, m.cloth, (1.0, 0.8, 1.25))]
    for z, v, mt, sc in fill:
        n = hull_normal(z, side * v)
        c = hull_at(z, side * v) + n * 0.26
        if sc:
            P.append(sphere("sack", mt, (c.x, c.y, c.z), 0.24, 10, 6, scale=sc))
            P.append(torus("tie", m.rope, (c.x, c.y + 0.18, c.z), 0.06, 0.015, seg=8, mseg=4))
        else:
            P.append(sphere("buoy", mt, (c.x, c.y, c.z), 0.2, 12, 8))
            P.append(box("crate", m.honey, (c.x + n.x * 0.02, c.y - 0.05, c.z + 0.28 if z < 0 else c.z - 0.28), (0.26, 0.24, 0.24)))
    # the net: a pillow over the bundles, hung from the gunwale, as a rope lattice (wireframe of a grid)
    NZ, NV = 9, 6
    verts, faces = [], []
    for i in range(NZ + 1):
        s_ = i / NZ
        z = ZA + (ZB - ZA) * s_
        for j in range(NV + 1):
            t = j / NV
            v = side * (0.99 - 0.25 * t)
            bulge = 0.06 + 0.5 * math.sin(math.pi * s_) ** 0.6 * math.sin(math.pi * min(1.0, t * 1.15)) ** 0.8
            p = hull_at(z, v) + hull_normal(z, v) * bulge
            verts.append(g2b(p.x, p.y, p.z))
    for i in range(NZ):
        for j in range(NV):
            a = i * (NV + 1) + j
            faces.append((a, a + 1, a + NV + 2, a + NV + 1))
    net = mesh_obj("net", verts, faces, m.rope)
    wf = net.modifiers.new("wf", "WIREFRAME"); wf.thickness = 0.022; wf.use_replace = True
    geo.select_only([net]); bpy.ops.object.modifier_apply(modifier=wf.name)
    P.append(net)
    for z in (ZA + 0.05, (ZA + ZB) / 2, ZB - 0.05):                        # tied off to cleats on the gunwale
        top = hull_at(z, side * 1.0)                                       # (below the string lights on the rail)
        P.append(box("cleat", m.dark, (top.x * 0.985, top.y + 0.03, top.z), (0.05, 0.05, 0.16)))
        P.append(torus("tie", m.rope, (top.x * 0.99, top.y + 0.01, top.z), 0.04, 0.012, axis="z", seg=8, mseg=4))
body(P)
finish(args["out"], "Upgrade: Rope Cargo Nets")
