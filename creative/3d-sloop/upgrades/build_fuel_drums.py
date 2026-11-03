"""Fuel Drum Rack: four drums standing in a timber rack on the port side deck alongside the cabin, lashed with rope.
Kept aft of the outrigger beam (z -1.78), inside the rail and the string lights, and clear of the cabin wall."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_fuel_drums")
X0, R, HT = -1.23, 0.165, 0.64
ZS = [-3.52, -3.1, -2.68, -2.26]
cols = [m.crimson, m.iron, m.rust, m.hazard]
DY = min(deck_y(z) for z in ZS)
P = []
for zz in (ZS[0] - 0.24, ZS[-1] + 0.24):
    P.append(box("chock_end", m.dark, (X0, DY + 0.06, zz), (0.36, 0.12, 0.06)))
for dx in (-0.11, 0.11):
    P.append(box("rack_rail", m.wood, (X0 + dx, DY + 0.03, (ZS[0] + ZS[-1]) / 2), (0.06, 0.06, ZS[-1] - ZS[0] + 0.54)))
for z, c in zip(ZS, cols):
    yc = DY + 0.06 + HT / 2
    P.append(cyl("drum", c, (X0, yc, z), R, HT, 14))
    for yy in (yc - HT * 0.3, yc + HT * 0.3):
        P.append(cyl("hoop", m.iron, (X0, yy, z), R + 0.008, 0.03, 14))
    P.append(cyl("bung", m.iron, (X0 + 0.07, yc + HT / 2 + 0.01, z), 0.03, 0.025, 8))
for yy in (DY + 0.06 + HT * 0.35, DY + 0.06 + HT * 0.7):
    for side in (-1, 1):
        P.append(rod("lash", m.rope, (X0 + side * (R + 0.01), yy, ZS[0] - 0.2), (X0 + side * (R + 0.01), yy, ZS[-1] + 0.2), 0.015, 5))
body(P)
finish(args["out"], "Upgrade: Fuel Drum Rack")
