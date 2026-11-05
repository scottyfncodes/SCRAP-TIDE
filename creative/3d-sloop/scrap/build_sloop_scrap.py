"""Scrap Trimaran dress kit: what turns the clean coastal sloop into a Waterworld x Mad Max boat (MeshCraft run_script).

Modelled in the sloop's own frame (game metres, bow +Z, y = 0 at the waterline) and always mounted on it, so the
sloop's sockets, upgrades, culls and paint tints are untouched. Everything sits clear of the upgrade bodies:
- riveted corrugated steel patches between the waterline and the armour belt (girth 0.45..0.68);
- a riveted steel plate on each side of the transom, leaving the rudder stock clear;
- a welded cow-catcher ram under the bowsprit: a striped bumper, rebar struts, a spiked tip;
- filed spikes along the forward gunwale, tyre fenders on ropes, a chain draped over the port bow.
"""
import math, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "upgrades"))
from _sloopkit import *

root, m = start("tb_sloop_scrap")
L = H["L"]
P = []


def pt(z, v, off=0.0):
    p = hull_at(z, v)
    return p + hull_normal(z, v) * off if off else p


def surf(name, material, z0, z1, v0, v1, off, nz=10, nv=2, ripple=0.014, t=0.014):
    verts, faces = [], []
    for i in range(nz + 1):
        z = z0 + (z1 - z0) * i / nz
        for j in range(nv + 1):
            v = v0 + (v1 - v0) * j / nv
            p = pt(z, v, off + ripple * math.sin(i * math.pi))
            verts.append(g2b(p.x, p.y, p.z))
    for i in range(nz):
        for j in range(nv):
            a = i * (nv + 1) + j
            f = (a, a + nv + 1, a + nv + 2, a + 1)
            faces.append(f if v0 >= 0 else f[::-1])
    o = mesh_obj(name, verts, faces, material)
    geo.solidify(o, t)
    return o


# corrugated patches welded over the strakes, with rivets
PATCHES = [(1, -4.3, -3.4, 0.46, 0.66, m.rust), (1, -1.2, 0.2, 0.48, 0.68, m.steel), (1, 1.4, 2.4, 0.5, 0.68, m.rust),
           (-1, -3.6, -2.4, 0.5, 0.68, m.steel), (-1, -0.6, 0.6, 0.45, 0.62, m.rust), (-1, 1.8, 2.7, 0.52, 0.68, m.iron)]
for side, za, zb, va, vb, mm in PATCHES:
    v0, v1 = (va, vb) if side > 0 else (-vb, -va)
    P.append(surf("patch", mm, za, zb, v0, v1, 0.05))
    for z in (za + 0.08, zb - 0.08):
        for v in (v0 + 0.03 * side, v1 - 0.03 * side):
            q = pt(z, v, 0.075)
            P.append(box("rivet", m.black, (q.x, q.y, q.z), (0.045, 0.045, 0.045)))

# transom plates, either side of the rudder stock
for side in (-1, 1):
    ring = [pt(-L / 2 + 0.01, side * (0.22 + 0.7 * j / 6)) for j in range(7)]
    lo = [Vector((p.x, max(p.y - 0.45, 0.15), p.z)) for p in ring]
    for j in range(6):
        P.append(slab("transom_plate", m.rust if side > 0 else m.iron,
                      [(ring[j].x, ring[j].y - 0.05, ring[j].z - 0.03), (ring[j + 1].x, ring[j + 1].y - 0.05, ring[j + 1].z - 0.03),
                       (lo[j + 1].x, lo[j + 1].y, lo[j + 1].z - 0.03), (lo[j].x, lo[j].y, lo[j].z - 0.03)], 0.03, up=(0, 0, -1)))
    for j in (1, 3, 5):
        q = ring[j]
        P.append(box("trivet", m.black, (q.x, q.y - 0.15, q.z - 0.07), (0.05, 0.05, 0.04)))

# cow-catcher ram under the bowsprit
BZ, BY = 3.75, 0.95
w = abs(hull_at(BZ, 0.5).x) + 0.55
P.append(rod("bumper", m.steel, (-w, BY, BZ), (w, BY, BZ), 0.09, 10))
for k in range(-6, 7):
    if k % 2: P.append(box("hazard", m.black if k % 4 == 1 else m.hazard, (k * 0.13, BY, BZ + 0.08), (0.12, 0.15, 0.04)))
TIP = (0.0, 0.8, 5.2)
for x in (-w, -w * 0.4, w * 0.4, w):
    P.append(rod("rebar", m.rust, (x, BY, BZ), TIP, 0.035, 6))
for s in (-1, 1):
    h = pt(2.9, s * 0.62)
    P.append(rod("strut", m.rust, (h.x, h.y, h.z), (s * w * 0.9, BY, BZ), 0.05, 6))
    P.append(cyl("bumper_spike", m.iron, (s * w * 0.75, BY, BZ + 0.2), 0.06, 0.36, 6, "z", r2=0.0))
stem = pt(4.2, 0.0)
P.append(rod("stem_strut", m.rust, (0, stem.y + 0.05, stem.z), TIP, 0.05, 6))
P.append(cyl("ram_tip", m.iron, (TIP[0], TIP[1], TIP[2] + 0.2), 0.08, 0.42, 6, "z", r2=0.0))

# filed spikes along the forward gunwale
for side in (-1, 1):
    for z in (2.2, 2.75, 3.3, 3.85):
        p = pt(z, side * 1.0)
        n = hull_normal(z, side * 0.95)
        tip = p + n * 0.26 + Vector((0, 0.2, 0.08))
        P.append(rod("spike", m.iron, (p.x, p.y + 0.02, p.z), (tip.x, tip.y, tip.z), 0.035, 5))

# tyre fenders on ropes
for side in (-1, 1):
    for z in (-0.4, -3.1):
        g = pt(z, side * 1.0)
        c = pt(z, side * 0.8, 0.14)
        P.append(torus("tyre", m.black, (c.x, c.y, c.z), 0.26, 0.1, "x", 16, 6))
        P.append(rod("tyre_rope", m.rope, (g.x, g.y + 0.04, g.z), (c.x, c.y + 0.26, c.z), 0.022, 4))

# chain over the port bow
a, b = pt(3.4, -1.0), pt(1.9, -1.0)
N = 11
for i in range(N + 1):
    t = i / N
    q = a.lerp(b, t) + hull_normal(a.lerp(b, t).z, -0.95) * 0.06 + Vector((0, -0.5 * 4 * t * (1 - t), 0))
    P.append(torus("chain", m.iron, (q.x, q.y, q.z), 0.07, 0.018, "x" if i % 2 else "z", 8, 4))

body(P, "tb_sloop_scrap_mesh")
finish(args["out"], "Scrap Trimaran dress kit", tags=("vessel", "sloop", "scrap"))
