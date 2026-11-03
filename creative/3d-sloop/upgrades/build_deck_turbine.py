"""Deck Wind Turbine: a guyed steel pole on the starboard quarter behind the cabin, nacelle with a tail fin and a
three-bladed rotor (node deck_turbine_rotor turns about the fore-aft axis). The rotor disk (y 3.6-5.1) clears the
wheel, the captain and everything on deck."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_deck_turbine")
X0, Z0 = 0.95, -4.05
DY, HUB = deck_y(Z0), 4.35
P = [cyl("base", m.iron, (X0, DY + 0.02, Z0), 0.11, 0.04, 10),
     rod("pole", m.steel, (X0, DY, Z0), (X0, HUB - 0.08, Z0), 0.05, 8),
     rod("guy", m.black, (X0, DY + 1.6, Z0), (X0 + 0.3, DY, Z0 + 0.35), 0.01, 4),
     rod("guy", m.black, (X0, DY + 1.6, Z0), (X0 - 0.3, DY, Z0 - 0.15), 0.01, 4),
     cyl("nacelle", m.white, (X0, HUB, Z0 - 0.08), 0.085, 0.42, 10, axis="z"),
     rod("tail_boom", m.steel, (X0, HUB, Z0 + 0.1), (X0, HUB + 0.04, Z0 + 0.62), 0.02, 6),
     slab("tail_fin", m.crimson, [(X0, HUB - 0.06, Z0 + 0.52), (X0, HUB - 0.04, Z0 + 0.8), (X0, HUB + 0.3, Z0 + 0.82), (X0, HUB + 0.2, Z0 + 0.5)], 0.015, up=(1, 0, 0))]
body(P)
RZ = Z0 - 0.33
B = [cyl("hub", m.white, (X0, HUB, RZ), 0.07, 0.12, 10, axis="z", r2=0.03)]
for k in range(3):
    a = k * 2 * math.pi / 3 + 0.3
    ca, sa = math.cos(a), math.sin(a)
    def at(r, w):   # point along blade k at radius r, offset w across it
        return (X0 + ca * r - sa * w, HUB + sa * r + ca * w, RZ + 0.01)
    B.append(slab("blade", m.white, [at(0.07, -0.05), at(0.75, -0.02), at(0.75, 0.02), at(0.07, 0.06)], 0.015, up=(0, 0, -1)))
pivot("deck_turbine_rotor", (X0, HUB, RZ), B)
finish(args["out"], "Upgrade: Deck Wind Turbine")
