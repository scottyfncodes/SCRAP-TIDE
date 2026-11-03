"""Solar Array: two panel wings on the cabin roof, either side of the boom (built on the sloop's roof, y 2.06;
the game lifts it 0.22 m onto the Container Cabin's roof). Inner edges stay 0.14 m clear of the boom."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *


root, m = start("tb_upg_solar_array")
R = CABIN["roof"]
P = []
for side in (-1, 1):
    xi, xo, za, zb = 0.22, 0.98, -3.55, -2.3
    yi, yo = R + 0.27, R + 0.14
    c = [(side * xi, yi, za), (side * xo, yo, za), (side * xo, yo, zb), (side * xi, yi, zb)]
    P.append(slab("frame", m.steel, c, 0.04, up=(0, 1, 0)))
    ins = lambda f, g: tuple(c[0][k] + (c[1][k] - c[0][k]) * f + (c[3][k] - c[0][k]) * g for k in range(3))
    yoff = lambda p: (p[0], p[1] + 0.045, p[2])
    P.append(slab("cells", m.cells, [yoff(ins(0.05, 0.03)), yoff(ins(0.95, 0.03)), yoff(ins(0.95, 0.97)), yoff(ins(0.05, 0.97))], 0.01, up=(0, 1, 0)))
    for f in (0.35, 0.65):
        a, b = yoff(ins(f, 0.03)), yoff(ins(f, 0.97))
        P.append(rod("grid", m.white, (a[0], a[1] + 0.012, a[2]), (b[0], b[1] + 0.012, b[2]), 0.008, 4))
    for g in (0.2, 0.4, 0.6, 0.8):
        a, b = yoff(ins(0.05, g)), yoff(ins(0.95, g))
        P.append(rod("grid", m.white, (a[0], a[1] + 0.012, a[2]), (b[0], b[1] + 0.012, b[2]), 0.008, 4))
    for (x, y, z) in c:                                                    # legs to the roof
        P.append(rod("leg", m.steel, (x * 0.97, R, z + (0.08 if z < -2.8 else -0.08)), (x * 0.97, y, z + (0.08 if z < -2.8 else -0.08)), 0.025, 6))
    P.append(box("junction", m.black, (side * 0.6, R + 0.05, -2.45), (0.14, 0.08, 0.1)))     # under the panel
    P.append(rod("cable", m.black, (side * 0.67, R + 0.05, -2.45), (side * 0.99, R + 0.01, -2.45), 0.012, 4))
body(P)
finish(args["out"], "Upgrade: Solar Array")
