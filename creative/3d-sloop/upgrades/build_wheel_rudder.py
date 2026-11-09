"""Salvaged Helm (the `rudder_ash` upgrade, art-direction pass 3): replaces the GITCRAFT package's wooden ship's wheel.

The classic ship's-wheel silhouette stays (a rim, spokes running through it, grip handles standing proud), so it reads
as "the helm" at a glance, but it is built from what floated: an oxidised copper pipe rim on six steel spokes, rope-
whipped grips with the top one painted hazard yellow ("amidships"), bolted to a truck steering-wheel boss on a car
steering column in a rubber gaiter, over a gearbox on a square steel post. A cable drum on the post sends the steering
cables down through the deck to the rudder. It matches the Trimaran's HUD helm (src/ui/helmWheel.ts).

Modelled at the steering socket's origin (game metres, y up, bow +Z) like the package model it replaces, inside the
same footprint (x +-0.66, hub 1.10 m up, wheel plane z 0.08..0.16), so the captain's helm spot and the overlap audit
stay valid. The root keeps the package's node name (the game and tests/models.test.ts look it up).

Materials avoid every GC_* name the game culls or tints on the sloop (cabin, tiller, sail, lantern, paint): no brass
(GC_Metal_f4c542_m9 is a cabin cull material) and no wood.
"""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from _sloopkit import *

root, m = start("upgrade_ship_s_wheel_ash_rudder")
copper = mat("#4F8A7A", "metal", 0.65, 0.5)      # verdigris pipe
copper_raw = mat("#A8653A", "metal", 0.5, 0.6)   # where hands have worn the green off
rubber = mat("#1A1D1E", "plain", 0.9)

HUB = (0.0, 1.10, 0.12)      # wheel centre (the package model's)
R, GRIP0, GRIP1 = 0.50, 0.53, 0.65
P = []

# --- the pedestal: flange plate, square post, gearbox, steering column in a gaiter
P.append(box("flange", m.iron, (0, 0.02, 0.0), (0.42, 0.04, 0.36)))
for bx, bz in ((-0.17, -0.14), (0.17, -0.14), (-0.17, 0.14), (0.17, 0.14)):
    P.append(box("flange_bolt", m.steel, (bx, 0.05, bz), (0.04, 0.03, 0.04)))
P.append(box("post", m.steel, (0, 0.40, 0.0), (0.14, 0.72, 0.14)))
P.append(box("post_band", m.hazard, (0, 0.62, 0.0), (0.15, 0.08, 0.15)))       # faded hazard band
P.append(box("post_rust", m.rust, (0.02, 0.2, 0.072), (0.06, 0.1, 0.004)))      # a rust bloom on the face
P.append(box("gearbox", m.iron, (0, 0.84, 0.0), (0.26, 0.2, 0.24), bevel=0.02))
P.append(box("gearbox_lid", m.steel, (0, 0.95, 0.0), (0.22, 0.02, 0.2)))
P.append(rod("column", m.steel, (0, 0.88, 0.04), (HUB[0], HUB[1], HUB[2] - 0.05), 0.03, 8))
P.append(cyl("gaiter", rubber, (0, 0.98, 0.075), 0.05, 0.12, 8, axis="z", r2=0.036))

# --- the cable drum on the post's aft face, cables down through deck sheaves to the rudder
P.append(cyl("cable_drum", m.iron, (0, 0.34, -0.11), 0.065, 0.12, 8, axis="x"))
for sx in (-1, 1):
    P.append(rod("cable", m.black, (sx * 0.05, 0.30, -0.15), (sx * 0.12, 0.05, -0.17), 0.007, 4))
    P.append(cyl("sheave", m.steel, (sx * 0.12, 0.04, -0.17), 0.03, 0.025, 6, axis="x"))

# --- the wheel (vertical, axle along z): truck-wheel boss, six spokes through a copper pipe rim, taped/roped grips
P.append(cyl("boss", rubber, HUB, 0.085, 0.06, 10, axis="z"))
P.append(cyl("horn_pad", m.steel, (HUB[0], HUB[1], HUB[2] + 0.034), 0.045, 0.012, 10, axis="z"))
P.append(torus("rim", copper, HUB, R, 0.03, axis="z", seg=20, mseg=5))
for a0, a1 in ((0.4, 0.75), (2.6, 2.8), (4.1, 4.45)):                           # hand-worn, back to bare copper
    pts = [(HUB[0] + math.cos(a0 + (a1 - a0) * t) * R, HUB[1] + math.sin(a0 + (a1 - a0) * t) * R, HUB[2]) for t in (0, 1)]
    P.append(rod("worn", copper_raw, pts[0], pts[1], 0.032, 6))
for k in range(6):
    a = math.pi / 2 + k * math.pi / 3                                              # k = 0 is the top spoke
    ca, sa = math.cos(a), math.sin(a)
    at = lambda r: (HUB[0] + ca * r, HUB[1] + sa * r, HUB[2])
    P.append(rod("spoke", m.steel, at(0.07), at(GRIP0), 0.016, 6))
    P.append(rod("grip", m.hazard if k == 0 else m.rope, at(GRIP0), at(GRIP1 - 0.02), 0.026, 6))
    P.append(cyl("grip_cap", m.black, at(GRIP1 - 0.005), 0.024, 0.03, 6, axis="z"))
    P.append(box("weld", m.iron, at(R), (0.05, 0.05, 0.075), rz=a))                   # welded collar where spoke meets rim

body(P, "upgrade_ship_s_wheel_ash_rudder_mesh")
finish(args["out"], "Upgrade: Salvaged Helm (pipe wheel, truck boss, cable drum)", tags=("helm", "steering"))
