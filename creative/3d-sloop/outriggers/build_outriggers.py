"""MeshCraft run_script: the Scrap Trimaran's outrigger floats and struts for the Coastal Sloop.

Built the way MeshCraft's own `boat` template builds tb_coastal_sloop: the same procedural helpers
(engine/procedural/geo.py), the same GC palette-role materials (so the game's paint tint finds the
hull/trim colours by material name), the same per-face vertex-colour bake (jitter 0.04), and the
same lofted-hull formula for the floats. Coordinates match TIDEBREAKERS src/ship/shipModel.ts:
metres, the sloop's origin, y = 0 at the waterline; Blender -Y is the game's +Z (bow).

Fits exactly where the old code-placed kit outriggers sat (tb_boat_kit 'outrigger' at
x = ±1.615, y = 0.6, z = -0.4, scale 1.15): floats 0.70 m wide x 6.1 m long centred at x = ±4.375,
z = -0.4 (game), riding from y = 0.37 to ~1.1; two cross-beams per side at z = -1.78 and 0.98.

Run with MeshCraft:  run_script {"path": ".../build_outriggers.py", "args": {"out": ".../source/<id>.blend"}}
"""
import json, math, os, zlib
from mathutils import Vector
from engine import kit, procedural
from engine.palette import Palette
from engine.procedural import geo
from engine.procedural.geo import mat, prim, mesh_obj, join, empty

ASSET = "tb_sloop_outriggers"
SEAFOAM, CREAM = "#4FB39A", "#F2EAD8"     # the sloop's own paint roles (Seafoam Green: hull, trim)

# --- target footprint (game coordinates), from the old kit part ---
FX = 4.375            # float centre, |x|
FZ = -0.4             # float centre along the boat (game z)
FL = 6.1              # float length
FW = 0.35             # float half-beam
F_BOT, F_TOP = 0.40, 1.08   # float keel / deck height at mid-length
BEAMS_Z = (-1.78, 0.98)     # cross-beam stations (game z)


def g2b(x, y, z):
    """Game (x, y up, z bow) -> Blender (x, -z, y up)."""
    return Vector((x, -z, y))


def float_point(u, v, side):
    """Lofted float, same construction as the sloop's hull loft: u 0 stern -> 1 bow, v -1..1 around the bottom."""
    s = 2 * u - 1
    w = FW * max(0.0, 1 - abs(s) ** 2.4) ** 0.55          # full-bodied, pointed ends
    top = F_TOP + 0.13 * abs(s) ** 4 + 0.05 * max(0, s) ** 2   # tips sweep up, bow a little more
    bot = F_BOT + 0.42 * abs(s) ** 2.2                    # rocker
    a = abs(v)
    x = side * FX + w * math.copysign(a ** 0.75, v) if v else side * FX
    y = top - (top - bot) * (1 - a ** 2.2)
    z = FZ + s * FL / 2
    return g2b(x, y, z)


def float_surface(side, name, material, nu=22, nv=10, v_range=(-1, 1)):
    verts, faces = [], []
    v0, v1 = v_range
    for i in range(nu + 1):
        u = min(max(i / nu, 0.001), 0.999)
        for j in range(nv + 1):
            verts.append(float_point(u, v0 + (v1 - v0) * j / nv, side))
    for i in range(nu):
        for j in range(nv):
            a = i * (nv + 1) + j
            faces.append((a, a + nv + 1, a + nv + 2, a + 1) if side > 0 else (a, a + 1, a + nv + 2, a + nv + 1))
    return mesh_obj(name, verts, faces, material)


def float_deck(side, material, nu=22):
    """Close the top: a plank cap between the two gunwales of the float."""
    verts, faces = [], []
    for i in range(nu + 1):
        u = min(max(i / nu, 0.001), 0.999)
        for v in (-1, 1):
            p = float_point(u, v, side); p.z -= 0.012; verts.append(p)
    for i in range(nu):
        a = i * 2
        faces.append((a, a + 2, a + 3, a + 1) if side > 0 else (a, a + 1, a + 3, a + 2))
    return geo.solidify(mesh_obj("float_deck", verts, faces, material), 0.04)


def rod(name, material, a, b, radius, vertices=8):
    d = b - a
    r = prim("cyl", name, material, loc=(a + b) / 2, vertices=vertices, radius=radius, depth=d.length)
    r.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); geo.apply_xf(r)
    return r


def hull_gunwale(z):
    """Where a cross-beam meets the sloop: the hull loft's gunwale at game z (HULLS.sloop)."""
    h = dict(L=10.0, W=1.9, sheer=1.2, bowRise=0.7, transom=0.65)
    u = z / h["L"] + 0.5
    w = h["W"] * (h["transom"] + (1 - h["transom"]) * math.sin((u / 0.45) * math.pi * 0.5)) if u < 0.45 else h["W"] * math.cos(((u - 0.45) / 0.55) * math.pi * 0.5) ** 0.85
    y = h["sheer"] + h["bowRise"] * u ** 3 + 0.08 * (1 - u) ** 2
    return w, y


def outrigger(side):
    parts = []
    hull = float_surface(side, "float", mat(SEAFOAM, "plank", 0.7))
    trim_a = float_surface(side, "float_trim", mat(CREAM, "wood", 0.6), nv=2, v_range=(-1, -0.82))
    trim_b = float_surface(side, "float_trim", mat(CREAM, "wood", 0.6), nv=2, v_range=(0.82, 1))
    for t in (trim_a, trim_b):   # trim sits just proud of the planking, like the sloop's
        for vtx in t.data.vertices:
            vtx.co.x += math.copysign(0.012, vtx.co.x - side * FX)
    parts += [hull, trim_a, trim_b, float_deck(side, mat("honey", "plank", 0.75))]
    wood, dark, rope = mat("timber", "wood", 0.7), mat("deep_timber", "wood", 0.7), mat("rope", "cloth", 0.9)
    for bz in BEAMS_Z:
        gw, gy = hull_gunwale(bz)
        inner = g2b(side * (gw - 0.25), gy + 0.1, bz)              # lashed over the gunwale, inside the rail
        outer = g2b(side * (FX + FW + 0.12), F_TOP + 0.09, bz)     # rests on the float deck, a little proud
        parts.append(rod("beam", wood, inner, outer, 0.075))
        # a timber chock where the beam beds on the float, and the knee down to the float's side
        parts.append(prim("cube", "chock", dark, loc=g2b(side * FX, F_TOP + 0.03, bz), scale=(FW * 0.9, 0.11, 0.05)))
        parts.append(rod("knee", dark, g2b(side * (FX - FW * 0.6), F_TOP + 0.02, bz), g2b(side * (FX - 0.75), F_TOP + 0.14, bz), 0.045, 6))
        # rope lashings: at the float and over the gunwale
        for x in (FX - 0.12, FX + 0.12, gw + 0.02, gw - 0.12):
            t = (abs(x) - abs(inner.x)) / (abs(outer.x) - abs(inner.x))
            p = inner.lerp(outer, max(0.0, min(1.0, t)))
            parts.append(rod("lashing", rope, p + Vector((-0.025, 0, 0)), p + Vector((0.025, 0, 0)), 0.092, 8))
    # a light stringer along the beams, tying them together outboard of the hull
    a = g2b(side * 2.95, 1.21, BEAMS_Z[0] - 0.15)
    b = g2b(side * 2.95, 1.21, BEAMS_Z[1] + 0.15)
    parts.append(rod("stringer", wood, a, b, 0.05, 6))
    return join(parts, "outrigger_" + ("starboard" if side > 0 else "port"))


kit.reset()
mats = kit.Materials(Palette({}), {}, prefix="GC")
geo.MATERIALS = procedural._role_factory(mats)
try:
    root = empty(ASSET)
    for side in (1, -1):
        o = outrigger(side); o.parent = root
finally:
    geo.MATERIALS = None
for o in bpy.context.scene.objects:
    if o.type == "MESH" and o.data.materials and any(m and m.get("gitcraft_role") for m in o.data.materials):
        kit.bake_vertex_colors(o, mats, jitter=0.04, seed=zlib.crc32(o.name.encode()) & 0xffff)

out = args["out"]
brief = {"asset_id": ASSET, "template": "run_script", "out_dir": os.path.dirname(os.path.dirname(out)),
         "profiles": ["three-web-toon"], "title": "TIDEBREAKERS Sloop Outriggers", "tags": ["tidebreakers", "boat_upgrade"],
         "script": os.path.basename(__file__) if "__file__" in globals() else "build_outriggers.py"}
# W x D x H in Blender axes (x, along the boat, up): the old outriggers' span, 6.1 m float, ~1.15 m tall
expect = {"size": [9.7, 6.1, 1.15]}
scene = bpy.context.scene
scene["gitcraft_brief"] = json.dumps(brief)
scene["gitcraft_result"] = json.dumps({"contract": {"root": ASSET, "ground": False,
                                                    "nodes": {"port": "outrigger_port", "starboard": "outrigger_starboard"}}, "expect": expect})
scene["gitcraft_template"] = "run_script"
os.makedirs(os.path.dirname(out), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
mn, mx = None, None
for o in scene.objects:
    if o.type != "MESH": continue
    for c in o.bound_box:
        p = o.matrix_world @ Vector(c)
        mn = p.copy() if mn is None else Vector(map(min, mn, p)); mx = p.copy() if mx is None else Vector(map(max, mx, p))
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in scene.objects if o.type == "MESH")
# report in game coordinates
print(json.dumps({"saved": out, "tris": tris, "game_min": [round(mn.x, 3), round(mn.z, 3), round(-mx.y, 3)],
                  "game_max": [round(mx.x, 3), round(mx.z, 3), round(-mn.y, 3)], "roles": mats.hex, "expect": expect}))
