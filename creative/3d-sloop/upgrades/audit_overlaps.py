"""Overlap audit (MeshCraft run_script): assemble the fully upgraded Trimaran the way the game does and test every
pair of parts for intersecting triangles (BVH), with the moving parts (harpoon, crane, turbine rotor, radar scanner)
swept through their range.

Parts: every upgrade model, the sloop's wheel/boom/mast/jib/lantern, the outrigger beams and a captain-sized
proxy at the helm. The sloop's hull, deck and rails are left out on purpose: parts rest on the deck and clamp or
hang on the rails by design.

args: {"models": ..., "upgrades": ..., "layout": {...game constants}, "variant": "full" | "early"}
  full : every upgrade (Twin Diesel, Container Cabin, Canvas Mainsail)
  early: the other states of those slots (Salvaged Outboard, the sloop's own cabin, its base mainsail)
"""
import json, math, os
import bpy, bmesh
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

A = args
MD, UD, LAY = A["models"], A["upgrades"], A["layout"]
bpy.ops.wm.read_factory_settings(use_empty=True)


def g2b(x, y, z): return Vector((x, -z, y))


def load(path, offset=(0, 0, 0)):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        if o.parent is None: o.location += g2b(*offset)
    bpy.context.view_layer.update()
    return new


def tris_of(objs, keep=None):
    """World-space triangles of meshes in objs; keep(material_name, centre_game) filters faces."""
    verts, polys = [], []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        if o.type != "MESH": continue
        me = o.evaluated_get(dg).to_mesh()
        mw = o.matrix_world
        for p in me.polygons:
            name = o.material_slots[p.material_index].material.name if o.material_slots and o.material_slots[p.material_index].material else ""
            pts = [mw @ me.vertices[i].co for i in p.vertices]
            c = sum(pts, Vector()) / len(pts)
            cg = (c.x, c.z, -c.y)
            if keep and not keep(name, cg): continue
            base = len(verts); verts += pts; polys.append(tuple(range(base, base + len(pts))))
        o.evaluated_get(dg).to_mesh_clear()
    return verts, polys


def bvh(objs, keep=None):
    v, p = tris_of(objs, keep)
    return BVHTree.FromPolygons(v, p) if p else None


def model(name, offset=(0, 0, 0)):
    return load(os.path.join(MD, name + ".glb"), offset)


def upg(folder, aid):
    return load(os.path.join(UD, folder, "exports", aid + ".three-web-toon.glb"))


# ---- assemble (everything fitted: twin diesel, not the outboard; Container Cabin, so roof items sit 0.22 higher)
VAR = A.get("variant", "full")
sloop = model("tb_coastal_sloop")
outr = model("tb_sloop_outriggers")
S = LAY["sockets"]
parts = {}
if VAR == "full": parts["canvas_sail"] = model("tb_upg_canvas_mainsail", S["socket_sail"])
parts.update({
    "crates": model("tb_upg_cargo_crates", S["socket_storage"]),
    "compass": model("tb_upg_brass_compass", [S["socket_navigation"][0], S["socket_navigation"][1], S["socket_navigation"][2] + LAY["compass_fwd"]]),
    "wheel": model("tb_upg_wheel_rudder", S["socket_steering"]),
})
NEW = {"container": ("container_cabin", "tb_upg_container_cabin"), "solar": ("solar_array", "tb_upg_solar_array"),
       "radar": ("radar_mast", "tb_upg_radar_mast"), "turbine": ("deck_turbine", "tb_upg_deck_turbine"),
       "fishing": ("fishing_rig", "tb_upg_fishing_rig"), "twin_diesel": ("twin_diesel", "tb_upg_twin_diesel"),
       "harpoon": ("harpoon", "tb_upg_harpoon_turret"), "crane": ("salvage_crane", "tb_upg_salvage_crane"),
       "drums": ("fuel_drums", "tb_upg_fuel_drums"), "nets": ("cargo_nets", "tb_upg_cargo_nets"),
       "armour": ("armour_plating", "tb_upg_armour_plating"), "lights": ("deck_lights", "tb_upg_deck_lights")}
if VAR == "early":
    del NEW["container"]; del NEW["twin_diesel"]; NEW["outboard"] = ("outboard", "tb_upg_outboard")
for k, (f, aid) in NEW.items():
    parts[k] = upg(f, aid)
lift = LAY["container_roof"] - LAY["cabin_roof"] if VAR == "full" else 0.0
for k in ("solar", "radar"):
    for o in parts[k]:
        if o.parent is None: o.location.z += lift
spot = next(o for o in parts["lights"] if o.name.startswith("deck_spotlight"))
spot.location.z += lift
crane_pivot = next(o for o in parts["crane"] if o.name == "salvage_crane")
harpoon_pivot = next(o for o in parts["harpoon"] if o.name == "harpoon_mount")
rotor = next(o for o in parts["turbine"] if o.name == "deck_turbine_rotor")
scanner = next(o for o in parts["radar"] if o.name == "radar_scanner")
bpy.context.view_layer.update()

# captain proxy: a 0.24 m radius, 1.85 m column standing at the helm
dy = LAY["captain"][1]
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.24, depth=1.85, location=g2b(LAY["captain"][0], dy + 0.925, LAY["captain"][2]))
captain = [bpy.context.active_object]

# sloop features (the rest of the sloop is the platform the parts sit on)
LW = LAY["lantern_shift"]
def is_spar(m, c): return m == "GC_Wood_9a5a2e" and abs(c[0]) < 0.2 and c[1] > 2.0
def is_mast(m, c): return m in ("GC_Wood_9a5a2e", "GC_Wood_5e331b") and abs(c[0]) < 0.25 and abs(c[2] - 1.0) < 0.3 and c[1] > 1.3
def is_jib(m, c): return m == "GC_Cloth_f1e6cc" and c[2] >= 1.0
def is_lantern(m, c): return m.startswith("GC_Plain_ff9f2e")
def is_beam(m, c): return abs(c[0]) > 1.95 and c[1] > 1.12 and m in ("GC_Wood_9a5a2e", "GC_Wood_5e331b", "GC_Cloth_c9a46b")

for o in sloop:     # the game moves the lantern to the starboard rail when the wheel is fitted
    pass
fixed = {"boom+mast": (sloop, lambda m, c: is_spar(m, c) or is_mast(m, c)), "jib": (sloop, is_jib), "outrigger_beams": (outr, is_beam)}
if VAR == "early":
    CAB = ("GC_Plank_f2ead8", "GC_Plank_5e331b", "GC_Metal_f4c542_m9")
    fixed["cabin"] = (sloop, lambda m, c: m in CAB and abs(c[0]) < 1.2 and 0.95 < c[1] < 2.2 and -3.9 < c[2] < -1.3)
    fixed["base_mainsail"] = (sloop, lambda m, c: (m == "GC_Cloth_f1e6cc" and c[2] < 1.0) or m == "GC_Cloth_c0392b")

# expected contacts: things that are bolted/lashed onto each other on purpose
CONTACT = {frozenset(p) for p in [("harpoon", "outrigger_beams"), ("solar", "container"), ("radar", "container"),
                                  ("lights", "container"), ("canvas_sail", "boom+mast"), ("solar", "cabin"), ("radar", "cabin"),
                                  ("lights", "cabin"), ("base_mainsail", "boom+mast"), ("compass", "cabin")]}


def lantern_bvh():
    v, p = tris_of(sloop, is_lantern)
    d = g2b(*LW)
    return BVHTree.FromPolygons([x + d for x in v], p)


def sweep_poses():
    for crane in (-0.6, 0.0, 0.6):
        for aim in range(0, 360, 30):
            for rot in (0, 60):
                for scan in (0, 45, 90, 135):
                    yield crane, aim, rot, scan


trees_static = {k: bvh(v) for k, v in parts.items() if k not in ("crane", "harpoon", "turbine", "radar")}
trees_static["captain"] = bvh(captain)
trees_static["lantern"] = lantern_bvh()
for k, (objs, f) in fixed.items():
    trees_static[k] = bvh(objs, f)

hits = {}
moving = ("crane", "harpoon", "turbine", "radar")
poses = 0
for crane, aim, rot, scan in sweep_poses():
    crane_pivot.rotation_euler.z = math.radians(-90) + crane
    harpoon_pivot.rotation_euler.z = math.radians(aim)
    rotor.rotation_euler.y = math.radians(rot)
    scanner.rotation_euler.z = math.radians(scan)
    bpy.context.view_layer.update()
    trees = dict(trees_static)
    for k in moving: trees[k] = bvh(parts[k])
    keys = sorted(trees)
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            if a not in moving and b not in moving and poses: continue    # static pairs only need testing once
            if frozenset((a, b)) in CONTACT or trees[a] is None or trees[b] is None: continue
            n = len(trees[a].overlap(trees[b]))
            if n:
                key = f"{a} x {b}"
                h = hits.setdefault(key, {"tris": 0, "poses": []})
                h["tris"] = max(h["tris"], n)
                if len(h["poses"]) < 4: h["poses"].append({"crane": crane, "aim": aim, "rotor": rot, "scan": scan})
    poses += 1

# clearance report for the captain: nearest distance from his column to anything
print(json.dumps({"variant": VAR, "poses_tested": poses, "pairs_tested": len(trees) * (len(trees) - 1) // 2, "overlaps": hits}))
