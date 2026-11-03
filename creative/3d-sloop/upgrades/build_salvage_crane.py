"""Salvage Crane & Winch: a slewing deck crane on the port side deck amidships (between the outrigger beams, clear
of the crates). The whole crane is the node salvage_crane, its pivot at the base; its jib points along +Z and the
game turns it to port (-90 deg) and swings it while hauling."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_salvage_crane")
X0, Z0 = -1.15, 0.3
DY = deck_y(Z0)
C = [cyl("slew_ring", m.iron, (X0, DY + 0.04, Z0), 0.2, 0.08, 14),
     box("column", m.hazard, (X0, DY + 1.0, Z0), (0.16, 1.92, 0.16)),
     box("cab_plate", m.iron, (X0, DY + 0.55, Z0 + 0.1), (0.2, 0.5, 0.02)),
     cyl("winch_drum", m.iron, (X0, DY + 0.75, Z0 - 0.16), 0.08, 0.22, 12, axis="x"),
     cyl("winch_rope", m.rope, (X0, DY + 0.75, Z0 - 0.16), 0.09, 0.16, 12, axis="x"),
     box("counterweight", m.iron, (X0, DY + 1.95, Z0 - 0.32), (0.24, 0.22, 0.26)),
     rod("jib_arm", m.hazard, (X0, DY + 1.95, Z0 - 0.1), (X0, DY + 2.32, Z0 + 2.2), 0.06, 8),
     rod("stay", m.black, (X0, DY + 2.45, Z0 - 0.05), (X0, DY + 2.32, Z0 + 2.15), 0.012, 4),
     rod("stay_post", m.iron, (X0, DY + 1.9, Z0 - 0.05), (X0, DY + 2.45, Z0 - 0.05), 0.03, 6),
     rod("cable", m.black, (X0, DY + 0.82, Z0 - 0.16), (X0, DY + 2.3, Z0 + 2.18), 0.008, 4),
     rod("hook_line", m.black, (X0, DY + 2.28, Z0 + 2.2), (X0, DY + 1.25, Z0 + 2.2), 0.008, 4),
     box("hook_block", m.iron, (X0, DY + 1.2, Z0 + 2.2), (0.08, 0.12, 0.06)),
     torus("hook", m.steel, (X0, DY + 1.06, Z0 + 2.2), 0.06, 0.015, axis="x", seg=10, mseg=4)]
pivot("salvage_crane", (X0, DY, Z0), C)
finish(args["out"], "Upgrade: Salvage Crane & Winch")
