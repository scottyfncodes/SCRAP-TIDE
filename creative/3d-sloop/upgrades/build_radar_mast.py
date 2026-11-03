"""Salvage Radar: a braced steel mast on the cabin roof's forward port corner with an open-array scanner on
top (node radar_scanner spins about its pivot). Port side and 1.4 m up keeps it clear of the mainsail, which
bellies to starboard, and of the boom."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_radar_mast")
R = CABIN["roof"]
X0, Z0, TOPY = -0.62, -1.85, 3.55
P = [cyl("base", m.iron, (X0, R + 0.02, Z0), 0.13, 0.04, 12),
     rod("mast", m.steel, (X0, R, Z0), (X0, TOPY, Z0), 0.045, 8),
     rod("brace", m.steel, (X0 - 0.3, R, Z0 + 0.2), (X0, R + 0.9, Z0), 0.02, 6),
     rod("brace", m.steel, (X0 + 0.25, R, Z0 + 0.22), (X0, R + 0.9, Z0), 0.02, 6),
     rod("brace", m.steel, (X0, R, Z0 - 0.3), (X0, R + 0.9, Z0), 0.02, 6),
     cyl("platform", m.iron, (X0, TOPY, Z0), 0.17, 0.04, 12),
     sphere("gps_dome", m.white, (X0 + 0.12, TOPY + 0.08, Z0 - 0.08), 0.065, 10, 6),
     cyl("nav_light", m.glow, (X0 - 0.11, TOPY + 0.06, Z0 + 0.07), 0.03, 0.08, 8),
     rod("cable", m.black, (X0 + 0.05, R + 0.05, Z0), (X0 + 0.05, TOPY - 0.02, Z0), 0.012, 4)]
body(P)
S = [box("pedestal", m.white, (X0, TOPY + 0.09, Z0), (0.14, 0.1, 0.14)),
     box("array", m.white, (X0, TOPY + 0.19, Z0), (1.0, 0.07, 0.11), bevel=0.01),
     box("array_face", m.black, (X0, TOPY + 0.19, Z0 + 0.058), (0.94, 0.04, 0.01))]
pivot("radar_scanner", (X0, TOPY + 0.04, Z0), S)
finish(args["out"], "Upgrade: Salvage Radar")
