"""Salvaged Outboard: a two-stroke clamped to the transom, starboard of the sloop's rudder; grey cowling with a
crimson band, leg into the water, prop, tiller arm stopping short of the wheel."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_outboard")
X0, ZT = 0.55, -5.0
P = [box("clamp", m.iron, (X0, 1.2, ZT - 0.06), (0.2, 0.26, 0.12)),
     box("transom_pad", m.dark, (X0, 1.12, ZT - 0.01), (0.26, 0.16, 0.03)),
     box("cowling", m.steel, (X0, 1.62, ZT - 0.33), (0.36, 0.44, 0.5), bevel=0.04),
     box("cowl_band", m.crimson, (X0, 1.72, ZT - 0.33), (0.37, 0.07, 0.51)),
     box("cowl_cap", m.iron, (X0, 1.86, ZT - 0.33), (0.3, 0.05, 0.42)),
     box("leg", m.iron, (X0, 0.55, ZT - 0.3), (0.09, 1.65, 0.15)),
     box("anti_cav", m.iron, (X0, -0.12, ZT - 0.33), (0.28, 0.02, 0.3)),
     cyl("gearcase", m.iron, (X0, -0.36, ZT - 0.32), 0.06, 0.32, 10, axis="z"),
     rod("tiller", m.iron, (X0, 1.5, ZT - 0.1), (X0, 1.58, ZT + 0.06), 0.022, 6),
     rod("grip", m.black, (X0, 1.58, ZT + 0.06), (X0, 1.6, ZT + 0.14), 0.03, 8)]
for k in range(3):
    a = k * 2 * math.pi / 3
    ca, sa = math.cos(a), math.sin(a)
    q = lambda r, w: (X0 + ca * r - sa * w, -0.36 + sa * r + ca * w, ZT - 0.5)
    P.append(slab("prop", m.brass, [q(0.03, -0.04), q(0.16, -0.03), q(0.16, 0.03), q(0.03, 0.05)], 0.012, up=(0, 0, -1)))
body(P)
finish(args["out"], "Upgrade: Salvaged Outboard")
