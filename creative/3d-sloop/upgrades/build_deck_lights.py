"""String Lights & Spotlight: bulb strings swagged along both rails from bow to stern (glowing at night), and a
spotlight on the cabin roof's forward starboard corner (node deck_spotlight, lifted onto the Container Cabin by
the game). Bulbs share the sloop lantern's emissive role."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_deck_lights")
S = []


def over_beam(side, bz):
    """A tie-off point just over an outrigger beam where it crosses the rail (the beams cross at rail height)."""
    q = hull_at(bz, side * 0.93)
    gw, gy = gunwale(bz)
    x0, y0, x1, y1 = gw - 0.25, gy + 0.1, 4.375 + 0.35 + 0.12, 1.08 + 0.09     # the beam's centreline (outrigger build)
    yb = y0 + (abs(q.x) - x0) * (y1 - y0) / (x1 - x0)
    return (q.x, max(q.y + 0.37, yb + 0.075 + 0.092 + 0.05), bz)            # radius + lashing + clearance


for side in (-1, 1):
    pts = []
    for i in range(3, 24, 3):
        u = i / 26
        z = (u - 0.5) * H["L"]
        q = hull_at(z, side * 0.93)
        pts.append((q.x, q.y + 0.37, q.z))
    pts += [over_beam(side, bz) for bz in BEAMS_Z]
    pts.sort(key=lambda p: p[2])
    for a, b in zip(pts, pts[1:]):
        short = abs(b[2] - a[2]) < 0.6
        wires, pp = sag("wire", m.black, a, b, 0.03 if short else 0.1, 0.007, n=4 if short else 6, vertices=4)
        S += wires
        if not short:
            for t in (2, 4):
                c = pp[t]
                S.append(sphere("bulb", m.glow, (c[0], c[1] - 0.04, c[2]), 0.032, 6, 4))
        S.append(sphere("bulb", m.glow, (b[0], b[1] - 0.035, b[2]), 0.032, 6, 4))
body(S, "deck_lights_strings")
R = CABIN["roof"]
X0, Z0 = 0.62, -1.78
L = [cyl("spot_base", m.iron, (X0, R + 0.02, Z0), 0.08, 0.04, 10),
     box("yoke", m.iron, (X0, R + 0.13, Z0), (0.22, 0.18, 0.04)),
     cyl("lamp", m.iron, (X0, R + 0.23, Z0 + 0.03), 0.09, 0.22, 12, axis="z"),
     cyl("lens", m.lens, (X0, R + 0.23, Z0 + 0.15), 0.075, 0.02, 12, axis="z"),
     torus("bezel", m.steel, (X0, R + 0.23, Z0 + 0.145), 0.085, 0.012, axis="z", seg=12, mseg=4)]
spot = join(L, "deck_spotlight")
spot.parent = root
finish(args["out"], "Upgrade: String Lights & Spotlight", nodes=["deck_lights_strings", "deck_spotlight"])
