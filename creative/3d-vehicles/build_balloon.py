"""Hot Air Balloon: patched fabric over a salvage basket (MeshCraft run_script).

Built with the Trimaran's builder kit (../3d-sloop/upgrades/_sloopkit.py): GC palette roles, helpers, the same
vertex-colour bake. Its own frame: metres, origin at the basket floor's centre, +Z forward.

Nodes:
  balloon_envelope  the inflated envelope (patchwork gores: tarp blue, canvas, rust, cream) on its rigging
  balloon_burner    the burner frame and its flame (the flame mesh is the glow role: it lights at night)
  balloon_winch     the late-game winch and cable under the basket (hidden until bought)
  balloon_stowed    the deflated envelope, rolled and lashed, for when it rides on the boat
The basket is static; the game shows either the envelope (flying) or the stowed roll (on deck).
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "3d-sloop", "upgrades"))
from _sloopkit import *

root, m = start("tb_balloon")
m.tarp = mat("#2F6FB0", "cloth", 0.9)      # the Blue Tarp Patchwork sail colours
m.patch = mat("#E8742A", "cloth", 0.9)
m.canvas = mat("parchment", "cloth", 0.9)

# basket: a cut-down oil drum and crate slats, a rope rim
B = 0.55
basket = [cyl("bk_drum", m.rust, (0, 0.38, 0), B, 0.76, 14),
          torus("bk_rim", m.rope, (0, 0.78, 0), B, 0.05, seg=16, mseg=5),
          torus("bk_band", m.iron, (0, 0.3, 0), B + 0.01, 0.025, seg=16, mseg=4)]
for k in range(6):
    a = k * math.pi / 3 + 0.2
    basket.append(box(f"bk_slat{k}", m.wood, (math.sin(a) * (B + 0.03), 0.4, math.cos(a) * (B + 0.03)), (0.12, 0.72, 0.03), ry=a))
basket += [box("bk_sandbag_p", m.canvas, (-B - 0.08, 0.55, 0.15), (0.12, 0.2, 0.14)),
           box("bk_sandbag_s", m.canvas, (B + 0.08, 0.55, -0.15), (0.12, 0.2, 0.14)),
           box("bk_hook", m.iron, (0, -0.02, 0), (0.16, 0.04, 0.16))]
body(basket, "balloon_basket")

# burner frame on four uprights
TOP = 2.1
burner = [box("bn_frame", m.iron, (0, TOP, 0), (0.7, 0.05, 0.7)),
          cyl("bn_coil", m.steel, (0, TOP + 0.12, 0), 0.16, 0.2, 10),
          cyl("bn_flame", m.glow, (0, TOP + 0.42, 0), 0.12, 0.42, 8, r2=0.02)]
for sx in (-1, 1):
    for sz in (-1, 1):
        burner.append(rod(f"bn_up{sx}{sz}", m.iron, (sx * 0.4, 0.78, sz * 0.4), (sx * 0.33, TOP, sz * 0.33), 0.02, 5))
pivot("balloon_burner", (0, TOP, 0), burner)

# envelope: 8 gores, lathe profile, alternating patch colours; mouth ring and rigging lines
gores = []
R, H0, NV = 3.4, TOP + 0.55, 10
prof = []
for i in range(NV + 1):
    t = i / NV
    y = H0 + t * 7.4
    r = 0.55 + (R - 0.55) * math.sin(min(1, t * 1.35) * math.pi / 2) if t < 0.74 else R * math.cos((t - 0.74) / 0.26 * math.pi / 2) ** 0.7 + 0.001
    prof.append((r, y))
mats = [m.tarp, m.canvas, m.patch, m.canvas, m.tarp, m.paint_trim, m.rust, m.canvas]
for gi in range(8):
    a0, a1 = gi * math.pi / 4, (gi + 1) * math.pi / 4
    verts, faces = [], []
    for (r, y) in prof:
        for a in (a0, (a0 + a1) / 2, a1):
            rr = r * (1.04 if a == (a0 + a1) / 2 else 1.0)
            verts.append(g2b(math.sin(a) * rr, y, math.cos(a) * rr))
    for i in range(NV):
        for j in range(2):
            p = i * 3 + j
            faces.append((p, p + 3, p + 4, p + 1))
    gores.append(mesh_obj(f"env_gore{gi}", verts, faces, mats[gi]))
gores.append(torus("env_mouth", m.iron, (0, H0, 0), 0.55, 0.035, seg=16, mseg=4))
for k in range(8):
    a = k * math.pi / 4
    gores.append(rod(f"env_line{k}", m.rope, (math.sin(a) * 0.55, H0, math.cos(a) * 0.55), (math.sin(a) * B * 0.9, 0.8, math.cos(a) * B * 0.9), 0.012, 4))
# stitched patches on the fabric
for k, (a, y) in enumerate([(0.4, 5.5), (2.2, 7.4), (3.9, 4.6), (5.3, 8.1)]):
    r = 3.0 if y < 8 else 2.6
    gores.append(box(f"env_patch{k}", m.patch if k % 2 else m.paint_trim, (math.sin(a) * (r + 0.32), y, math.cos(a) * (r + 0.32)), (0.8, 0.7, 0.04), ry=a))
pivot("balloon_envelope", (0, H0, 0), gores)

# winch (upgrade): a drum under the basket with a cable and a grab hook
winch = [cyl("wn_drum", m.iron, (0, -0.16, 0), 0.14, 0.4, 10, axis="x"),
         rod("wn_cable", m.steel, (0, -0.2, 0), (0, -2.2, 0), 0.015, 5),
         box("wn_hook", m.hazard, (0, -2.3, 0), (0.22, 0.18, 0.06))]
pivot("balloon_winch", (0, -0.16, 0), winch)

# stowed: the deflated envelope rolled and lashed beside the basket (on the boat)
stow = [cyl("st_roll", m.tarp, (0, 0.95, 0), 0.32, 1.1, 12, axis="x"),
        cyl("st_roll2", m.canvas, (0, 1.12, 0.1), 0.24, 1.0, 12, axis="x"),
        torus("st_lash1", m.rope, (-0.3, 0.98, 0.02), 0.33, 0.025, axis="x", seg=14, mseg=4),
        torus("st_lash2", m.rope, (0.3, 0.98, 0.02), 0.33, 0.025, axis="x", seg=14, mseg=4)]
pivot("balloon_stowed", (0, 0.95, 0), stow)
finish(args["out"], "Vehicle: Hot Air Balloon", tags=("vehicle",))
