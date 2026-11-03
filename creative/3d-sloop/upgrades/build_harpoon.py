"""Harpoon Turret: a swivel harpoon gun on a plank platform lashed across the starboard forward outrigger beam
(x 2.95, z 0.98). Out there its barrel (node harpoon_mount, turned to aim) sweeps clear of the rails, the jib,
the mainsail, the cargo nets and the float. On the foredeck it would cut through the jib's foot."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_harpoon_turret")
X0, Z0, Y0 = 2.95, 0.98, 1.38
P = [slab("platform", m.honey, [(X0 - 0.36, Y0, Z0 - 0.34), (X0 + 0.36, Y0, Z0 - 0.34), (X0 + 0.36, Y0, Z0 + 0.34), (X0 - 0.36, Y0, Z0 + 0.34)], 0.05, up=(0, 1, 0))]
for dz in (-0.25, 0.25):
    P.append(box("bearer", m.dark, (X0, Y0 - 0.03, Z0 + dz), (0.76, 0.06, 0.08)))
for dx in (-0.28, 0.28):
    P.append(torus("lashing", m.rope, (X0 + dx, Y0 - 0.06, Z0), 0.11, 0.022, axis="x", seg=10, mseg=4))
P.append(cyl("pedestal", m.iron, (X0, Y0 + 0.1, Z0), 0.14, 0.14, 12))
body(P)
PY = Y0 + 0.18
G = [cyl("ring", m.iron, (X0, PY + 0.02, Z0), 0.16, 0.04, 12),
     box("cheek", m.iron, (X0 - 0.1, PY + 0.17, Z0), (0.04, 0.26, 0.18)),
     box("cheek", m.iron, (X0 + 0.1, PY + 0.17, Z0), (0.04, 0.26, 0.18)),
     cyl("barrel", m.iron, (X0, PY + 0.3, Z0 + 0.2), 0.055, 0.95, 10, axis="z"),
     cyl("muzzle", m.hazard, (X0, PY + 0.3, Z0 + 0.66), 0.065, 0.06, 10, axis="z"),
     rod("harpoon", m.steel, (X0, PY + 0.3, Z0 + 0.68), (X0, PY + 0.3, Z0 + 0.8), 0.02, 6),
     cyl("spearhead", m.steel, (X0, PY + 0.3, Z0 + 0.86), 0.045, 0.12, 6, axis="z", r2=0.0),
     box("stock", m.dark, (X0, PY + 0.27, Z0 - 0.38), (0.08, 0.12, 0.22)),
     rod("handle", m.black, (X0, PY + 0.3, Z0 - 0.32), (X0 - 0.16, PY + 0.24, Z0 - 0.4), 0.018, 6),
     torus("rope_coil", m.rope, (X0 + 0.16, PY + 0.24, Z0 + 0.05), 0.07, 0.025, axis="x", seg=12, mseg=4)]
pivot("harpoon_mount", (X0, PY, Z0), G)
finish(args["out"], "Upgrade: Harpoon Turret")
