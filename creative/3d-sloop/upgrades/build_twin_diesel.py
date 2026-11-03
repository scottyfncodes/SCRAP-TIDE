"""Twin Diesel Drive: a stern pod bolted to the transom, so the helm keeps its room: a steel bracket and plank
deck aft of the transom, two diesel housings with hazard bands, exhaust stacks at the outer corners and shafts
raked down to two props."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_twin_diesel")
ZT = -5.0
P = []
for side in (-1, 1):
    P.append(box("bracket", m.iron, (side * 0.55, 1.1, ZT - 0.48), (0.1, 0.12, 1.0)))
    P.append(rod("knee", m.iron, (side * 0.55, 1.05, ZT - 0.75), (side * 0.5, 0.55, ZT - 0.02), 0.035, 6))
    hx = side * 0.36
    P.append(box("housing", m.iron, (hx, 1.46, ZT - 0.5), (0.58, 0.5, 0.72), bevel=0.03))
    P.append(box("hazard", m.hazard, (hx, 1.66, ZT - 0.5), (0.59, 0.06, 0.73)))
    P.append(box("grille", m.black, (hx, 1.42, ZT - 0.865), (0.42, 0.28, 0.02)))
    P.append(box("filter", m.crimson, (hx, 1.75, ZT - 0.42), (0.2, 0.08, 0.26)))
    P.append(rod("stack", m.black, (side * 0.62, 1.55, ZT - 0.78), (side * 0.62, 2.25, ZT - 0.78), 0.055, 8))
    P.append(cyl("stack_cap", m.iron, (side * 0.62, 2.28, ZT - 0.78), 0.075, 0.04, 8))
    P.append(rod("shaft", m.iron, (hx, 1.2, ZT - 0.62), (hx, -0.42, ZT - 1.02), 0.04, 8))
    for k in range(3):
        a = k * 2 * math.pi / 3 + (0.5 if side > 0 else 0)
        ca, sa = math.cos(a), math.sin(a)
        q = lambda r, w: (hx + ca * r - sa * w, -0.42 + sa * r + ca * w, ZT - 1.05)
        P.append(slab("prop", m.brass, [q(0.04, -0.05), q(0.2, -0.04), q(0.2, 0.04), q(0.04, 0.06)], 0.014, up=(0, 0, -1)))
P.append(slab("pod_deck", m.honey, [(-0.7, 1.17, ZT - 0.04), (0.7, 1.17, ZT - 0.04), (0.7, 1.17, ZT - 0.92), (-0.7, 1.17, ZT - 0.92)], 0.04, up=(0, 1, 0)))
P.append(box("crossbar", m.iron, (0, 1.1, ZT - 0.9), (1.2, 0.08, 0.08)))
body(P)
finish(args["out"], "Upgrade: Twin Diesel Drive")
