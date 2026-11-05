"""Patchwork Skiff: the starter boat, rebuilt as a Waterworld x Mad Max scrap boat (MeshCraft run_script).

Built in the dinghy's own frame (HULLS.dinghy: metres, y = 0 at the waterline, game +Z = bow), so it replaces the
procedural dinghy hull at scale 1 with no offset; the captain's seat, crew spots, mast step and every upgrade keep their
places. What is on it:
- a lofted hull of mismatched strakes (painted, honey, grey driftwood, rusted steel, a blue car-door panel) with
  staggered butt joints, and riveted corrugated-steel patches welded over the holes;
- a steel gunwale cap, a riveted steel transom, gunwale spikes and a hubcap at the bow;
- a welded cow-catcher ram: a striped car bumper, rebar struts and forward spikes;
- two oil drums lashed on as sponsons, tyre fenders on ropes, a hanging chain;
- pallet-slat floorboards, a plank thwart, a torn car seat for the helm, jerry cans and a rope coil.
Painted strakes use the sloop's paint roles (GC_Plank_4fb39a / GC_Wood_f2ead8) so the game's paint cosmetic tints them.
"""
import math, os, sys, json, random
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "3d-sloop", "upgrades"))
import _sloopkit
from _sloopkit import *
from engine.procedural.builders import HULLS

_sloopkit.H = H = HULLS["dinghy"]
L = H["L"]
rnd = random.Random(1077)

root, m = start("tb_patchwork_skiff")
paint = mat("#4FB39A", "plank", 0.7)           # GC_Plank_4fb39a  <- paint colour 1
trim = mat("#F2EAD8", "wood", 0.6)             # GC_Wood_f2ead8   <- paint colour 2
drift = mat("#8C8A86", "wood", 0.85)           # sun-greyed driftwood
honey = m.honey
rust = m.rust
galv = m.steel
iron = m.iron
blue = mat("#2F6FB0", "steel", 0.5, 0.3)       # a car door
orange = mat("#E8742A", "steel", 0.6, 0.3)     # oil drum
olive = mat("#5B6B3A", "steel", 0.6, 0.3)      # jerry can
tyre = mat("#1B1B1F", "rubber", 0.95)
seat = mat("#7A2A22", "cloth", 0.9)            # cracked oxblood vinyl
foam = mat("#E9D8A6", "cloth", 0.95)           # the seat's split foam
P = []


def hz(z):
    return min(max(z / L + 0.5, 0.0), 0.999)


def pt(z, v, off=0.0):
    p = hull_at(z, v)
    if off:
        p = p + hull_normal(z, v) * off
    return p


def surf(name, material, z0, z1, v0, v1, off=0.0, nz=4, nv=2, ripple=0.0, t=0.03):
    """A patch of the hull loft between stations z0..z1 and girths v0..v1, pushed `off` along the normal;
    `ripple` corrugates it along z."""
    verts, faces = [], []
    for i in range(nz + 1):
        z = z0 + (z1 - z0) * i / nz
        for j in range(nv + 1):
            v = v0 + (v1 - v0) * j / nv
            o = off + (ripple * math.sin(i * math.pi) if ripple else 0.0)
            p = pt(z, v, o)
            verts.append(g2b(p.x, p.y, p.z))
    for i in range(nz):
        for j in range(nv):
            a = i * (nv + 1) + j
            f = (a, a + nv + 1, a + nv + 2, a + 1)
            faces.append(f if v0 >= 0 else f[::-1])
    o = mesh_obj(name, verts, faces, material)
    if t: geo.solidify(o, t)
    return o


def half_width(z, y):
    """Inner half-beam of the hull at station z, height y."""
    best = 0.0
    for k in range(41):
        v = k / 40
        p = hull_at(z, v)
        if p.y <= y: best = abs(p.x)
    return best


# ---------------------------------------------------------------- hull: mismatched strakes, staggered butts
STRAKES = [0.0, 0.32, 0.55, 0.72, 0.87, 1.0]
Z0, Z1 = -L / 2, L / 2 - 0.01
CHOICES = [(paint, 0.42), (honey, 0.18), (drift, 0.18), (rust, 0.1), (blue, 0.06), (galv, 0.06)]


def pick():
    r, acc = rnd.random(), 0.0
    for mm, w in CHOICES:
        acc += w
        if r < acc: return mm
    return paint


for side in (-1, 1):
    for s in range(len(STRAKES) - 1):
        va, vb = STRAKES[s], STRAKES[s + 1]
        if s == 0 and side < 0:
            continue
        if s == 0:
            va, vb = -STRAKES[1], STRAKES[1]
        elif side < 0:
            va, vb = -vb, -va
        cuts = sorted({Z0, Z1, *[rnd.uniform(Z0 + 0.4, Z1 - 0.4) for _ in range(2 + (s % 2))]})
        for k in range(len(cuts) - 1):
            za, zb = cuts[k], cuts[k + 1]
            mm = pick() if s < 4 else (trim if k % 2 == 0 else paint)
            nz = max(2, int((zb - za) / 0.18))
            P.append(surf(f"strake_{side}_{s}_{k}", mm, za, zb - 0.012, va, vb, nz=nz, nv=2, t=0.035))

# transom: riveted steel plate over the stern
ring = [pt(-L / 2 + 0.005, -1 + 2 * j / 12) for j in range(13)]
c = sum(ring, Vector((0, 0, 0))) / len(ring)
verts = [g2b(c.x, c.y, c.z - 0.02)] + [g2b(p.x, p.y, p.z - 0.02) for p in ring]
tr = mesh_obj("transom", verts, [(0, j + 2, j + 1) for j in range(12)], rust)
geo.solidify(tr, 0.04)
P.append(tr)
for j in range(1, 12, 2):
    p = ring[j]
    q = c + (p - c) * 0.82
    P.append(box("transom_rivet", m.black, (q.x, q.y, q.z - 0.07), (0.035, 0.035, 0.03)))

# corrugated steel patches welded over the holes, with rivets
PATCHES = [(-1, -1.6, -0.9, 0.38, 0.72, rust), (1, -0.4, 0.5, 0.3, 0.6, galv), (-1, 0.6, 1.3, 0.5, 0.82, galv),
           (1, 1.0, 1.6, 0.6, 0.86, rust), (1, -1.9, -1.4, 0.55, 0.85, iron), (-1, -0.2, 0.3, 0.2, 0.45, rust)]
for side, za, zb, va, vb, mm in PATCHES:
    v0, v1 = (va, vb) if side > 0 else (-vb, -va)
    P.append(surf("patch", mm, za, zb, v0, v1, off=0.045, nz=10, nv=2, ripple=0.012, t=0.012))
    for z in (za + 0.05, zb - 0.05):
        for v in (v0 + 0.03 * side, v1 - 0.03 * side):
            q = pt(z, v, 0.07)
            P.append(box("rivet", m.black, (q.x, q.y, q.z), (0.03, 0.03, 0.03)))

# gunwale: steel angle capping along the sheer, spikes forward, hubcap on the port bow
for side in (-1, 1):
    pts = [pt(-L / 2 + 0.05 + i * (L - 0.25) / 14, side * 1.0) for i in range(15)]
    for i in range(14):
        a, b = pts[i], pts[i + 1]
        P.append(rod("gunwale", iron, (a.x, a.y + 0.02, a.z), (b.x, b.y + 0.02, b.z), 0.035, 6))
    for z in (0.9, 1.25, 1.6):
        p = pt(z, side * 1.0)
        n = hull_normal(z, side * 0.95)
        tip = p + n * 0.16 + Vector((0, 0.12, 0.05))
        P.append(rod("spike", iron, (p.x, p.y + 0.03, p.z), (tip.x, tip.y, tip.z), 0.022, 5))
p = pt(1.45, -0.62, 0.06)
P.append(cyl("hubcap", galv, (p.x - 0.01, p.y, p.z), 0.15, 0.03, 14, "x"))
P.append(cyl("hubcap_nut", m.black, (p.x - 0.03, p.y, p.z), 0.04, 0.03, 8, "x"))

# ---------------------------------------------------------------- bow ram: bumper, rebar, spikes
stem = pt(L / 2 - 0.02, 0.0)
BZ, BY = stem.z + 0.18, 0.32
P.append(rod("bumper", galv, (-0.62, BY, BZ - 0.28), (0.62, BY, BZ - 0.28), 0.06, 10))
for k in range(-5, 6):
    if k % 2: P.append(box("hazard", m.black if k % 4 == 1 else m.hazard, (k * 0.1, BY, BZ - 0.22), (0.09, 0.1, 0.03)))
TIP = (0.0, 0.22, BZ + 0.5)
for x in (-0.6, -0.25, 0.25, 0.6):
    P.append(rod("rebar", rust, (x, BY, BZ - 0.28), TIP, 0.022, 5))
for x in (-0.5, 0.5):
    h = pt(1.55, (1 if x > 0 else -1) * 0.75)
    P.append(rod("strut", rust, (h.x, h.y, h.z), (x, BY, BZ - 0.28), 0.03, 6))
P.append(rod("strut", rust, (stem.x, stem.y - 0.25, stem.z - 0.1), TIP, 0.035, 6))
P.append(cyl("ram_tip", iron, (TIP[0], TIP[1], TIP[2] + 0.12), 0.05, 0.26, 6, "z", r2=0.0))
for x in (-0.45, 0.45):
    P.append(cyl("bumper_spike", iron, (x, BY, BZ - 0.12), 0.04, 0.24, 6, "z", r2=0.0))

# ---------------------------------------------------------------- oil-drum sponsons, lashed on
for side, mm in ((-1, blue), (1, orange)):
    x, y, z = side * 1.14, 0.03, -0.6
    P.append(cyl("drum", mm, (x, y, z), 0.24, 0.86, 14, "z"))
    for dz in (-0.28, 0.0, 0.28):
        P.append(torus("drum_hoop", iron, (x, y, z + dz), 0.245, 0.018, "z", 16, 4))
    for dz in (-0.25, 0.25):                                             # cross poles to the gunwale
        g = pt(z + dz, side * 1.0)
        P.append(rod("drum_pole", iron, (x, y + 0.22, z + dz), (g.x, g.y + 0.03, g.z), 0.03, 6))
        P.append(rod("lashing", m.rope, (x + side * 0.1, y + 0.2, z + dz + 0.05), (g.x - side * 0.08, g.y + 0.04, g.z + 0.05), 0.02, 4))

# tyre fenders on ropes
for side in (-1, 1):
    for z in (1.0, -1.65):
        g = pt(z, side * 1.0)
        n = hull_normal(z, side * 0.85)
        c0 = pt(z, side * 0.82, 0.1)
        P.append(torus("tyre", tyre, (c0.x, c0.y, c0.z), 0.15, 0.065, "x", 14, 6))
        P.append(rod("tyre_rope", m.rope, (g.x, g.y + 0.04, g.z), (c0.x + n.x * 0.02, c0.y + 0.15, c0.z), 0.015, 4))

# a chain draped over the starboard bow
a = pt(1.2, 1.0)
b = pt(0.35, 1.0)
links, pts = sag("chain_path", iron, (a.x + 0.04, a.y + 0.04, a.z), (b.x + 0.04, b.y + 0.04, b.z), 0.0, 0.001, n=1)
for o in links: bpy.data.objects.remove(o)
N = 9
for i in range(N + 1):
    t = i / N
    q = a.lerp(b, t)
    hang = 0.28 * 4 * t * (1 - t)
    q = q + hull_normal(q.z, 0.95) * 0.05 + Vector((0, -hang, 0))
    P.append(torus("chain", iron, (q.x, q.y, q.z), 0.045, 0.012, "x" if i % 2 else "z", 8, 4))

# ---------------------------------------------------------------- inside: pallet floor, thwart, car seat, cans, rope
for i in range(12):
    z = -1.85 + i * 0.29
    w = max(0.2, half_width(z, 0.05) * 1.85)
    P.append(box("slat", honey if i % 3 else drift, (0, 0.04, z), (w, 0.04, 0.2), ry=rnd.uniform(-0.03, 0.03), bevel=0.008))
for x in (-0.3, 0.3):
    P.append(box("bearer", drift, (x, 0.0, -0.2), (0.08, 0.06, 3.2)))
w = half_width(0.55, 0.36) * 2 + 0.06
P.append(box("thwart", drift, (0, 0.35, 0.55), (w, 0.07, 0.32), bevel=0.01))
w = half_width(-1.3, 0.36) * 2 + 0.06
P.append(box("aft_thwart", honey, (0, 0.35, -1.3), (w, 0.07, 0.42), bevel=0.01))
P.append(box("seat_cushion", seat, (0, 0.415, -1.28), (0.56, 0.07, 0.4), bevel=0.02))
P.append(box("seat_back", seat, (0, 0.62, -1.52), (0.52, 0.34, 0.09), rx=-0.18, bevel=0.02))
P.append(box("seat_tear", foam, (0.12, 0.452, -1.22), (0.16, 0.012, 0.1)))
P.append(box("seat_tear", foam, (-0.1, 0.66, -1.47), (0.12, 0.1, 0.012), rx=-0.18))
for x in (-0.38, 0.38):
    P.append(box("jerry", olive if x < 0 else m.crimson, (x, 0.22, 1.08), (0.15, 0.32, 0.26), bevel=0.015))
    P.append(box("jerry_handle", m.black, (x, 0.41, 1.08), (0.05, 0.04, 0.16)))
P.append(torus("rope_coil", m.rope, (-0.42, 0.09, -0.55), 0.13, 0.035, "y", 14, 5))
P.append(torus("rope_coil", m.rope, (-0.42, 0.14, -0.55), 0.1, 0.03, "y", 12, 5))

body(P, "tb_patchwork_skiff_mesh")
finish(args["out"], "Patchwork Skiff (scrap starter boat)", tags=("vessel", "dinghy"))
s = bpy.context.scene
brief = json.loads(s["gitcraft_brief"])
brief.update(tags=["tidebreakers", "vessel", "dinghy"], frame="HULLS.dinghy (game metres, bow +Z, y 0 = waterline)")
s["gitcraft_brief"] = json.dumps(brief)
bpy.ops.wm.save_as_mainfile(filepath=args["out"], compress=True)
