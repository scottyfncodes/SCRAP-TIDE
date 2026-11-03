"""Container Cabin: a cut-down shipping container that replaces the sloop's cabin on the same footprint
(x +-1.0, z -3.7..-1.5). Painted steel (the game tints it with the paint cosmetic), cream corner posts and rails,
corrugated sides, cargo doors facing the helm, a cut window on the starboard side. Roof at y 2.28, clear of the boom (2.37)."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_container_cabin")
glass = mat("sky", "plain", 0.1)
X, Z0, Z1, YB, TOP = 1.0, -3.7, -1.5, 1.03, 2.28
CZ, L, HH = (Z0 + Z1) / 2, Z1 - Z0, TOP - 1.03
P = [box("shell", m.paint, (0, YB + HH / 2, CZ), (2 * X - 0.04, HH - 0.06, L - 0.04))]
for side in (-1, 1):
    for i in range(12):                                                     # corrugation
        zz = Z0 + 0.14 + (L - 0.28) * i / 11
        if side < 0 or abs(zz + 2.35) > 0.45:   # full ribs, except under the starboard window
            P.append(box("rib", m.paint, (side * (X - 0.004), YB + HH / 2, zz), (0.035, HH - 0.16, 0.07)))
        else:
            P.append(box("rib", m.paint, (side * (X - 0.004), YB + 0.3, zz), (0.035, 0.42, 0.07)))
    if side > 0:   # starboard only: the fuel drums stand along the port side
        P.append(box("win_frame", m.rust, (side * (X + 0.004), 1.68, -2.35), (0.03, 0.52, 0.8)))
        P.append(box("win_glass", glass, (side * (X + 0.016), 1.68, -2.35), (0.02, 0.4, 0.66)))
        P.append(box("win_bar", m.iron, (side * (X + 0.03), 1.68, -2.35), (0.02, 0.4, 0.035)))
    P.append(box("vent", m.iron, (side * (X + 0.012), TOP - 0.2, -3.35), (0.02, 0.12, 0.22)))
    for zz in (Z0 + 0.04, Z1 - 0.04):                                       # corner posts
        P.append(box("post", m.paint_trim, (side * (X - 0.04), YB + HH / 2, zz), (0.09, HH, 0.09)))
    for yy in (YB + 0.04, TOP - 0.04):                                      # side rails
        P.append(box("rail", m.paint_trim, (side * (X - 0.03), yy, CZ), (0.07, 0.08, L)))
for zz in (Z0 + 0.03, Z1 - 0.03):                                           # end rails
    for yy in (YB + 0.04, TOP - 0.04):
        P.append(box("end_rail", m.paint_trim, (0, yy, zz), (2 * X, 0.08, 0.07)))
for i in range(7):                                                          # forward end corrugation
    xx = -X + 0.22 + (2 * X - 0.44) * i / 6
    P.append(box("rib", m.paint, (xx, YB + HH / 2, Z1 - 0.004), (0.07, HH - 0.16, 0.035)))
for side in (-1, 1):                                                        # cargo doors aft, facing the helm
    P.append(box("door", m.paint, (side * 0.47, YB + HH / 2, Z0 - 0.012), (0.9, HH - 0.14, 0.03)))
    for xx in (0.2, 0.72):
        P.append(rod("lockbar", m.iron, (side * xx, YB + 0.1, Z0 - 0.045), (side * xx, TOP - 0.1, Z0 - 0.045), 0.018, 6))
        P.append(box("handle", m.iron, (side * (xx + 0.06), 1.5, Z0 - 0.06), (0.1, 0.03, 0.03)))
    for yy in (1.3, 1.95):
        P.append(box("hinge", m.iron, (side * 0.95, yy, Z0 - 0.04), (0.05, 0.1, 0.04)))
P.append(box("roof", m.paint, (0, TOP - 0.025, CZ), (2 * X - 0.08, 0.04, L - 0.08)))
for i in range(5):
    P.append(box("roof_rib", m.paint, (0, TOP - 0.005, Z0 + 0.3 + i * (L - 0.6) / 4), (2 * X - 0.16, 0.025, 0.06)))
for (x, y, z, h) in [(X + 0.008, 1.45, -3.05, 0.45), (-X - 0.008, 1.62, -1.85, 0.3), (X + 0.008, 1.4, -1.8, 0.35)]:
    P.append(box("rust", m.rust, (x, y, z), (0.012, h, 0.1)))               # rust runs
body(P)
finish(args["out"], "Upgrade: Container Cabin")
