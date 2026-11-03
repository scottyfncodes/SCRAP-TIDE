"""Shared kit for the Trimaran's upgrade models (MeshCraft run_script).

Every upgrade is built the way MeshCraft's `boat` template builds tb_coastal_sloop:
- the same procedural helpers (engine/procedural/geo.py) and hull loft (engine/procedural/builders.py);
- the same GC palette-role materials, so the game's paint/sail tint finds them by name;
- the same per-face vertex-colour bake (jitter 0.04).

Everything is modelled in the sloop's own frame (metres, y = 0 at the waterline, game +Z = bow), so an upgrade
drops onto the boat at the origin. Moving parts (crane, harpoon, turbine rotor, radar scanner) are child nodes whose
origin is their pivot, because the game turns those nodes.

Coordinates here are GAME coordinates (x starboard, y up, z bow); g2b() converts to Blender (x, -z, y).
"""
import json, math, os, sys, zlib
import bpy
from mathutils import Vector, Matrix
from engine import kit, procedural
from engine.palette import Palette
from engine.procedural import geo
from engine.procedural.geo import mat, prim, mesh_obj, join, empty, solidify
from engine.procedural.builders import HULLS, hull_point

H = HULLS["sloop"]
SEAFOAM, CREAM = "#4FB39A", "#F2EAD8"      # the sloop's paint roles (tinted in game by the equipped paint)

# --- the sloop's layout (game coordinates), measured from tb_coastal_sloop / the builder ---
MAST_Z = 1.0
BOOM_Y = 2.45                 # boom along the centreline, z 1.0 -> -3.6
CABIN = dict(x=1.0, z0=-3.7, z1=-1.5, y0=1.05, roof=2.06)
WHEEL_Z, WHEEL_Y, WHEEL_R = -4.65, 2.15, 0.6
CAPTAIN = (-0.85, -4.55)      # stands to port of the wheel
BEAMS_Z = (-1.78, 0.98)       # outrigger cross-beams


def g2b(x, y, z):
    return Vector((x, -z, y))


def u_of(z):
    return z / H["L"] + 0.5


def hull_at(z, v):
    """Hull loft point (game coords) at station z, girth v (-1 port .. 1 starboard)."""
    p = hull_point(H, min(max(u_of(z), 0.0), 0.999), v)
    return Vector((p.x, p.z, -p.y))


def deck_y(z):
    """Top of the sloop's deck planking at station z (deck = loft at v 0.97, dropped 0.16, 5 cm thick)."""
    return hull_at(z, 0.97).y - 0.16 * H["L"] / 10 + 0.025


def gunwale(z):
    """(half-beam, height) of the gunwale at station z."""
    p = hull_at(z, 1.0)
    return abs(p.x), p.y


def rail_y(z):
    """Top of the rail (posts at v 0.93, 0.36 m above the loft)."""
    return hull_at(z, 0.93).y + 0.36


# ------------------------------------------------------------------ primitives in game coordinates
def box(name, material, c, size, ry=0.0, rx=0.0, rz=0.0, bevel=0.0):
    """Box centred at game point c, size (sx, sy up, sz along the boat), turned ry about the vertical."""
    o = prim("cube", name, material, loc=g2b(*c), rot=(rx, rz, ry), scale=(size[0] / 2, size[2] / 2, size[1] / 2))
    if bevel: geo.bevel(o, bevel)
    return o


def cyl(name, material, c, r, h, vertices=10, axis="y", r2=None):
    """Cylinder centred at game point c, height h along game axis y (vertical), x or z."""
    rot = {"y": (0, 0, 0), "x": (0, math.pi / 2, 0), "z": (math.pi / 2, 0, 0)}[axis]
    if r2 is None:
        return prim("cyl", name, material, loc=g2b(*c), rot=rot, vertices=vertices, radius=r, depth=h)
    return prim("cone", name, material, loc=g2b(*c), rot=rot, vertices=vertices, radius1=r, radius2=r2, depth=h)


def rod(name, material, a, b, r, vertices=8):
    """Cylinder between two game points."""
    a, b = g2b(*a), g2b(*b)
    d = b - a
    o = prim("cyl", name, material, loc=(a + b) / 2, vertices=vertices, radius=r, depth=d.length)
    o.rotation_euler = d.to_track_quat("Z", "Y").to_euler(); geo.apply_xf(o)
    return o


def sphere(name, material, c, r, seg=10, rings=6, scale=(1, 1, 1)):
    o = prim("sphere", name, material, loc=g2b(*c), segments=seg, ring_count=rings, radius=r)
    o.scale = (scale[0], scale[2], scale[1]); geo.apply_xf(o)
    return o


def torus(name, material, c, R, r, axis="y", seg=20, mseg=6):
    rot = {"y": (0, 0, 0), "x": (0, math.pi / 2, 0), "z": (math.pi / 2, 0, 0)}[axis]
    return prim("torus", name, material, loc=g2b(*c), rot=rot, major_radius=R, minor_radius=r, major_segments=seg, minor_segments=mseg)


def sag(name, material, a, b, drop, r, n=6, vertices=5):
    """A rope/cable hanging between two game points with a catenary-ish sag."""
    pts = []
    for i in range(n + 1):
        t = i / n
        p = [a[k] + (b[k] - a[k]) * t for k in range(3)]
        p[1] -= drop * 4 * t * (1 - t)
        pts.append(p)
    return [rod(f"{name}_{i}", material, pts[i], pts[i + 1], r, vertices) for i in range(n)], pts


def slab(name, material, corners, t, up=None):
    """A thin slab through four game-space corners (p00, p10, p11, p01), `t` thick, extruded toward `up` (a game
    vector; default: the corners' normal). Panels, plates, doors, blades."""
    c = [g2b(*p) for p in corners]
    n = (c[1] - c[0]).cross(c[3] - c[0]).normalized()
    if up is not None:
        u = g2b(*up)
        if n.dot(u) < 0: n = -n
    d = n * t
    verts = c + [v + d for v in c]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    return mesh_obj(name, verts, faces, material)


def hull_normal(z, v):
    """Outward normal of the hull loft at (z, v), in game coordinates."""
    p = hull_at(z, v)
    a = hull_at(z + 0.05, v) - p
    b = hull_at(z, v + (0.02 if v < 0.98 else -0.02) * (1 if v >= 0 else -1)) - p
    n = a.cross(b).normalized()
    if (n.x < 0) != (v < 0): n = -n
    return n


# ------------------------------------------------------------------ materials (palette roles, same names as the sloop)
class M:
    pass


def materials():
    m = M()
    m.wood = mat("timber", "wood", 0.7)
    m.dark = mat("deep_timber", "wood", 0.7)
    m.honey = mat("honey", "plank", 0.75)
    m.rope = mat("rope", "cloth", 0.9)
    m.iron = mat("iron", "metal", 0.5, 0.8)
    m.steel = mat("stone", "metal", 0.45, 0.6)           # pale galvanised steel
    m.rust = mat("#A24B21", "metal", 0.8, 0.3)           # the game's rust patch colour
    m.brass = mat("gold", "metal", 0.3, 0.95)
    m.hazard = mat("gold", "plain", 0.6)
    m.black = mat("black", "plain", 0.6)
    m.white = mat("white", "plain", 0.5)
    m.crimson = mat("crimson", "plain", 0.6)
    m.glow = mat("amber", "plain", 0.3, emit=2.0)        # same role as the sloop's lantern: glows at night in game
    m.lens = mat("sky_high", "plain", 0.1, emit=1.5)
    m.cells = mat("deep", "plain", 0.25, 0.4)
    m.cloth = mat("parchment", "cloth", 0.9)
    m.coral = mat("coral", "plain", 0.6)
    # painted parts: built in the sloop's Seafoam/cream so the game's paint tint recolours them
    m.paint = mat(SEAFOAM, "steel", 0.55, 0.3)          # GC_Steel_4fb39a_m3  <- paint colour 1
    m.paint_trim = mat(CREAM, "steel", 0.55, 0.3)       # GC_Steel_f2ead8_m3  <- paint colour 2
    return m


# ------------------------------------------------------------------ build lifecycle
_state = {}


def start(asset_id):
    kit.reset()
    mats = kit.Materials(Palette({}), {}, prefix="GC")
    geo.MATERIALS = procedural._role_factory(mats)
    _state.update(asset_id=asset_id, mats=mats, root=empty(asset_id), pivots=[])
    return _state["root"], materials()


def body(parts, name=None):
    """Join static parts into one mesh under the asset root."""
    o = join([p for p in parts if p], name or f"{_state['asset_id']}_mesh")
    o.parent = _state["root"]
    return o


def pivot(name, at, parts):
    """A moving part: an empty at game point `at` (its pivot) with the joined mesh as its child."""
    e = empty(name, g2b(*at), _state["root"])
    o = join([p for p in parts if p], f"{name}_mesh")
    o.parent = e
    o.matrix_parent_inverse = e.matrix_world.inverted()
    _state["pivots"].append(name)
    return e


def finish(out, title, tags=(), nodes=()):
    """Bake vertex colours, record the brief/contract the way core.build does, save the .blend, report the fit."""
    geo.MATERIALS = None
    mats, aid = _state["mats"], _state["asset_id"]
    for o in bpy.context.scene.objects:
        if o.type == "MESH" and o.data.materials and any(m and m.get("gitcraft_role") for m in o.data.materials):
            kit.bake_vertex_colors(o, mats, jitter=0.04, seed=zlib.crc32(o.name.encode()) & 0xffff)
    contract_nodes = {n: n for n in [aid, *nodes, *_state["pivots"]]}
    brief = {"asset_id": aid, "template": "run_script", "out_dir": os.path.dirname(os.path.dirname(out)), "profiles": ["three-web-toon"],
             "title": title, "tags": ["tidebreakers", "boat_upgrade", *tags], "frame": "tb_coastal_sloop (game metres, bow +Z)"}
    s = bpy.context.scene
    s["gitcraft_brief"] = json.dumps(brief)
    s["gitcraft_result"] = json.dumps({"contract": {"root": aid, "ground": False, "nodes": contract_nodes}, "expect": {}})
    s["gitcraft_template"] = "run_script"
    os.makedirs(os.path.dirname(out), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=out, compress=True)
    mn = mx = None
    for o in s.objects:
        if o.type != "MESH": continue
        for c in o.bound_box:
            p = o.matrix_world @ Vector(c)
            mn = p.copy() if mn is None else Vector(map(min, mn, p)); mx = p.copy() if mx is None else Vector(map(max, mx, p))
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in s.objects if o.type == "MESH")
    print(json.dumps({"saved": out, "tris": tris, "game_min": [round(mn.x, 3), round(mn.z, 3), round(-mx.y, 3)],
                      "game_max": [round(mx.x, 3), round(mx.z, 3), round(-mn.y, 3)], "pivots": _state["pivots"], "roles": sorted(mats.hex)}))
