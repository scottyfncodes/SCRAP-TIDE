"""Trolling Rods: rod holders clamped to both transom corners, rods raked outboard and aft (away from the captain
at the helm), reels and lines trailing into the wake."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_fishing_rig")
P = []
ZH = -4.85
for side in (-1, 1):
    gw, gy = gunwale(ZH)
    base = (side * (gw * 0.947 - 0.02), rail_y(ZH), ZH)
    d = Vector((side * 0.52, 0.72, -0.46)).normalized()
    p = lambda t: (base[0] + d.x * t, base[1] + d.y * t, base[2] + d.z * t)
    P.append(box("clamp", m.iron, (base[0], base[1] - 0.03, base[2]), (0.08, 0.1, 0.1)))
    P.append(rod("holder", m.steel, (base[0] - d.x * 0.08, base[1] - d.y * 0.08, base[2] - d.z * 0.08), p(0.22), 0.03, 8))
    P.append(rod("grip", m.honey, p(0.0), p(0.34), 0.022, 8))
    P.append(rod("rod", m.black, p(0.34), p(2.5), 0.014, 6))
    rp = p(0.42)
    P.append(cyl("reel", m.steel, (rp[0] - side * 0.04, rp[1] - 0.05, rp[2]), 0.05, 0.05, 10, axis="x"))
    for t in (0.9, 1.5, 2.1):
        P.append(torus("guide", m.steel, p(t), 0.022, 0.006, axis="z", seg=8, mseg=4))
    tip = p(2.5)
    lines, _ = sag("line", m.black, tip, (tip[0] + side * 0.25, 0.0, tip[2] - 1.8), 0.25, 0.004, n=5, vertices=4)
    P += lines
body(P)
finish(args["out"], "Upgrade: Trolling Rods")
