"""TIDEBREAKERS: the Ironwake Expedition Cat, authored for GITCRAFT MeshCraft `run_script`.

    run_script {"path": ".../creative/3d-ironwake/scripts/ironwake.py",
                "args": {"out_dir": ".../creative/3d-ironwake", "palette": ".../creative/3d-waterworld/tidebreakers-waterworld-palette.json"}}

Replaces the code-built twin hulls, bridge deck, cross-beams, wheelhouse, rails and mast that `src/ship/shipModel.ts`
drew for the third vessel. The hulls are lofted from the SAME surface function as `hullGeometry(HULLS.ironwake)` in
shipModel.ts and offset by CAT_OFFSET, so the waterline footprint the game's buoyancy, wake and collision use
(`waterline: { halfLen, halfBeam, twin }`) is unchanged: this is a visual mesh in the game's own frame, nothing else.

Frame: metres, y = 0 at the waterline, bow +Z in three.js (Blender: front -Y, Z up), scale 1. Nodes:
  ironwake_hulls       both hulls with their deck caps, bow rams, skegs, fenders, bollards and hatches
  ironwake_deck        bridge deck, cross-beams, bow trampoline, stern step, outer rails
  ironwake_wheelhouse  the wheelhouse (same footprint and roof height as the code-built one; hidden when the
                       Container Cabin is fitted, which stands in the same place)
  ironwake_mast        steel mast, origin at its foot, modelled at the tier-0 height (10.2 m); the game scales it in
                       Y to the sail tier's height
Tintable materials: TBI_Paint (hull colour) and TBI_Trim (trim colour) take the paint cosmetic in the game.
"""
import json, math, os, random, zlib
import bmesh
from mathutils import Matrix, Vector

A = args  # noqa: F821
PAL = Palette.from_file(A["palette"])  # noqa: F821
OUT = A["out_dir"]

ROLES = {
    "paint": "Steel",            # tinted to the paint cosmetic in the game (hull colour)
    "trim": "Faded Paint",       # tinted to the paint cosmetic in the game (trim colour)
    "boot": "Gunmetal",          # boot-top stripe at the waterline
    "bottom": "Rust Deep",       # anti-fouling below the waterline
    "rust": "Rust", "rust_hi": "Rust Orange", "oxide": "Oxide Teal", "gun": "Gunmetal", "steel": "Steel",
    "corr": "Corrugated", "hazard": "Hazard Yellow", "red": "Signal Red", "glass": "Window Glass",
    "wood": "Bleached Timber", "wood_dk": "Timber", "net": "Net Dark", "tyre": "Tyre", "tarp": "Tarp Blue",
    "char": "Char", "navy": "Abyss Navy", "barnacle": "Barnacle",
}
kit.reset()  # noqa: F821
M = kit.Materials(PAL, ROLES, prefix="TBI")  # noqa: F821
M.add("lamp", "Window Lit", rough=0.3, emit=6.0)
M.add("red_glow", "Signal Red", rough=0.4, emit=4.0)
RNG = random.Random(zlib.crc32(b"ironwake"))

# ---- the game's hull spec (shipModel.ts HULLS.ironwake, CAT_OFFSET) ----
L, W, D, SHEER, BOW_RISE, TRANSOM = 13.0, 1.15, 1.5, 1.3, 0.6, 0.7
CAT = 2.7
DECK_Y = SHEER - 0.05  # the code-built bridge deck's centre; its top is SHEER + 0.1


def G(x, y, z):
    """three.js (x, y up, z bow) -> Blender (x, -z, y)."""
    return (x, -z, y)


def P(u, v):
    """shipModel.ts hullGeometry().P, verbatim: u 0 stern -> 1 bow, v -1..1 around the bottom. three.js frame."""
    width = W * (TRANSOM + (1 - TRANSOM) * math.sin((u / 0.45) * math.pi * 0.5) if u < 0.45 else math.cos(((u - 0.45) / 0.55) * math.pi * 0.5) ** 0.85)
    sheer_y = SHEER + BOW_RISE * u ** 3 + 0.08 * (1 - u) ** 2
    keel = D * (1 - 0.6 * (max(0, u - 0.6) / 0.4) ** 2) * (0.85 + 0.15 * math.sin(u * math.pi))
    a = abs(v)
    x = width * math.copysign(1, v) * a ** 0.75 if v else 0.0
    y = sheer_y - keel * (1 - a ** 2.2)
    z = (u - 0.5) * L
    return x, y, z


def mesh(name, verts, faces, roles):
    """A mesh from three.js-frame verts and per-face palette roles (one material slot per role)."""
    bm = bmesh.new()
    vs = [bm.verts.new(G(*v)) for v in verts]
    slots = []
    for f, r in zip(faces, roles):
        if r not in slots:
            slots.append(r)
        try:
            face = bm.faces.new([vs[i] for i in f])
        except ValueError:
            continue
        face.material_index = slots.index(r)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name)  # noqa: F821
    bm.to_mesh(me)
    bm.free()
    o = bpy.data.objects.new(name, me)  # noqa: F821
    bpy.context.scene.collection.objects.link(o)  # noqa: F821
    for r in slots:
        me.materials.append(M[r])
    return o


def B(size, loc, role, rot=(0, 0, 0), bevel=0.0, taper=0.0):
    """Box in three.js frame: size (x, y, z), centre loc, Euler rot (x, y, z) about its centre."""
    o = kit.box("p", (size[0], size[2], size[1]), G(*loc), M[role], bevel=bevel, taper=taper)  # noqa: F821
    if any(rot):
        c = Vector(G(*loc))
        R = Matrix.Rotation(rot[1], 4, "Z") @ Matrix.Rotation(-rot[2], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")
        o.data.transform(Matrix.Translation(c) @ R @ Matrix.Translation(-c))
    return o


def Cy(r, depth, loc, role, axis="y", verts=10, r2=None):
    """Cylinder in three.js frame along axis x | y (up) | z (fore-aft)."""
    return kit.cylinder("p", r, depth, G(*loc), axis={"x": "X", "y": "Z", "z": "Y"}[axis], verts=verts, mat=M[role], r2=r2)  # noqa: F821


def beam(a, b, t, role, verts=0):
    a, b = Vector(G(*a)), Vector(G(*b))
    d = b - a
    o = kit.cylinder("p", t, d.length, (0, 0, 0), verts=verts or 6, mat=M[role]) if verts else kit.box("p", (t, t, d.length), (0, 0, 0), M[role])  # noqa: F821
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.data.transform(Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())
    return o


def join(parts, name, root):
    o = kit.join(parts, name, parent=root)  # noqa: F821
    kit.shade(o, None)  # noqa: F821
    return o


ROOT = kit.empty("tidebreakers_ironwake", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821

# ================================================================= the hulls
NU, NV = 30, 16


def hull(cx):
    """One hull at x offset cx: plated topsides (patchwork of welded plates), boot stripe, anti-fouling, transom,
    and a deck cap over the open top."""
    verts, faces, roles = [], [], []
    grid = {}
    for i in range(NU + 1):
        for j in range(NV + 1):
            x, y, z = P(i / NU, -1 + 2 * j / NV)
            grid[i, j] = len(verts)
            verts.append((x + cx, y, z))
    for i in range(NU):
        for j in range(NV):
            q = [grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]]
            ym = sum(verts[k][1] for k in q) / 4
            v0, v1 = -1 + 2 * j / NV, -1 + 2 * (j + 1) / NV
            outer = max(abs(v0), abs(v1))
            h = (math.sin(i * 12.9898 + (j // 2) * 78.233 + cx) * 43758.5453) % 1
            if outer > 0.9:
                r = "trim"          # the sheer strake / gunwale band
            elif ym < -0.12:
                r = "bottom"        # below the boot-top: rust-red anti-fouling
            elif ym < 0.12:
                r = "boot"          # boot-top stripe
            elif h < 0.08:
                r = "rust"          # welded-on patch plates
            elif h < 0.13:
                r = "oxide"
            elif h < 0.16:
                r = "corr"
            else:
                r = "paint"
            faces.append(q)
            roles.append(r)
    # transom: a flat stern board
    c = len(verts)
    tx, ty, tz = P(0, 0)
    verts.append((cx, (P(0, -1)[1] + ty) / 2, tz))
    for j in range(NV):
        faces.append([c, grid[0, j + 1], grid[0, j]])
        roles.append("gun")
    # deck cap over the hull top: a strip between the two sheer lines
    for i in range(NU):
        faces.append([grid[i, 0], grid[i, NV], grid[i + 1, NV], grid[i + 1, 0]])
        roles.append("gun" if i % 3 else "steel")
    return mesh("hull", verts, faces, roles)


def hull_details(cx, side):
    """Fittings welded to one hull (side = +1 starboard hull, -1 port hull)."""
    q = []
    bx, by, bz = P(1.0, 0)
    # bow ram: a welded steel stem bar down the raked cutwater, hazard chevrons, rivet straps
    sx, sy, sz = P(0.8, 0)
    tx, ty, tz = P(1.0, 1)
    q.append(beam((cx, sy - 0.05, sz), (cx, ty + 0.05, tz + 0.12), 0.22, "gun"))
    for k in range(4):
        t = 0.2 + k * 0.2
        px, py, pz = sy + (ty - sy) * t, sz + (tz - sz) * t, 0
        q.append(B((0.26, 0.1, 0.24), (cx, px, py + 0.05), "hazard" if k % 2 else "char", rot=(-0.9, 0, 0)))
    for u in (0.84, 0.9, 0.95):
        x, y, z = P(u, 1)
        q.append(B((x * 2 + 0.06, 0.07, 0.07), (cx, y - 0.25, z), "rust_hi"))
    # skeg along the keel aft
    q.append(B((0.12, 0.45, 4.2), (cx, P(0.3, 0)[1] - 0.15, -L * 0.2), "bottom"))
    # tyre fenders hung on the outboard topsides
    for u in (0.3, 0.5, 0.7):
        x, y, z = P(u, side)
        q.append(Cy(0.36, 0.26, (cx + x + side * 0.12, y - 0.55, z), "tyre", axis="x", verts=10))
        q.append(beam((cx + x, y, z), (cx + x + side * 0.12, y - 0.38, z), 0.03, "net"))
    # bollards and hatches on the deck cap, bow and stern
    for u in (0.12, 0.88):
        x, y, z = P(u, 1)
        top = y
        q.append(Cy(0.11, 0.32, (cx, top + 0.16, z), "gun", verts=8))
        q.append(Cy(0.16, 0.05, (cx, top + 0.34, z), "gun", verts=8))
    for u in (0.24, 0.62):
        x, y, z = P(u, 1)
        q.append(B((0.62, 0.1, 0.8), (cx, y + 0.05, z), "steel"))
        q.append(B((0.5, 0.04, 0.68), (cx, y + 0.12, z), "rust"))
        q.append(B((0.08, 0.06, 0.3), (cx, y + 0.16, z + 0.2), "gun"))  # dog handle
    # a weld seam and a hand-painted hull number on the outboard bow
    x, y, z = P(0.8, side)
    q.append(B((0.03, 0.42, 0.22), (cx + x + side * 0.02, y - 0.45, z), "trim"))
    q.append(B((0.03, 0.42, 0.22), (cx + x + side * 0.02, y - 0.45, z - 0.32), "trim"))
    # anchor hawse pipe on the starboard bow (the anchor hangs here)
    if side > 0:
        x, y, z = P(0.95, 1)
        q.append(Cy(0.09, 0.14, (cx + 0.3, y - 0.12, z - 0.2), "gun", axis="x", verts=8))
    return q


hulls = []
for cx, side in ((CAT, 1), (-CAT, -1)):
    hulls.append(hull(cx))
    hulls += hull_details(cx, side)
join(hulls, "ironwake_hulls", ROOT)

# ================================================================= the bridge deck
q = []
DZ0, DZ1 = -0.4 - L * 0.36, -0.4 + L * 0.36  # the code-built deck's span (z)
DW = CAT * 2 + 0.6
# grating over a steel frame: plates of different steels, laid across, one or two replaced by timber
q.append(B((DW, 0.2, DZ1 - DZ0), (0, DECK_Y - 0.05, (DZ0 + DZ1) / 2), "gun"))
z = DZ0 + 0.3
k = 0
while z < DZ1 - 0.3:
    w = RNG.uniform(0.9, 1.6)
    w = min(w, DZ1 - 0.3 - z + 0.3)
    r = ("steel", "corr", "steel", "gun", "wood", "steel", "oxide")[k % 7]
    q.append(B((DW - 0.3, 0.06, w - 0.05), (RNG.uniform(-0.05, 0.05), SHEER + 0.07, z + w / 2), r))
    z += w
    k += 1
# safety stripes at the deck edges and a painted walkway line
for zz in (DZ0 + 0.12, DZ1 - 0.12):
    q.append(B((DW - 0.2, 0.065, 0.16), (0, SHEER + 0.075, zz), "hazard"))
# cross-beams: I-beams under the deck (web + flanges), plus a forward beam carrying the trampoline
for zz in (-3.8, 0.0, 3.8, 5.4):
    q.append(B((CAT * 2 + 1.6, 0.3, 0.12), (0, SHEER - 0.35, zz), "rust"))
    q.append(B((CAT * 2 + 1.6, 0.06, 0.5), (0, SHEER - 0.18, zz), "rust"))
    q.append(B((CAT * 2 + 1.6, 0.06, 0.5), (0, SHEER - 0.52, zz), "rust"))
    for s in (-1, 1):  # gusset plates where the beam meets the hull
        q.append(B((0.5, 0.5, 0.06), (s * (CAT - 0.6), SHEER - 0.35, zz + 0.28), "rust_hi", rot=(0, 0, s * 0.6)))
# bow trampoline: cargo net laced between the hulls, forward of the deck
TZ0, TZ1 = DZ1, 5.5
for i in range(9):
    x = -CAT + 0.35 + i * (2 * CAT - 0.7) / 8
    q.append(B((0.04, 0.04, TZ1 - TZ0), (x, SHEER + 0.06, (TZ0 + TZ1) / 2), "net"))
for i in range(5):
    zz = TZ0 + 0.15 + i * (TZ1 - TZ0 - 0.3) / 4
    q.append(B((2 * CAT - 0.6, 0.04, 0.04), (0, SHEER + 0.06, zz), "net"))
# stern boarding step between the hulls
q.append(B((2 * CAT - 1.2, 0.08, 0.7), (0, 0.55, DZ0 - 0.25), "steel"))
for s in (-1, 1):
    q.append(beam((s * (CAT - 0.7), 0.55, DZ0 - 0.25), (s * (CAT - 0.7), SHEER - 0.05, DZ0 + 0.1), 0.06, "gun"))
# outer rails: stanchions and a pipe rail along each hull's outboard side (the same stations as the code-built rails)
for side in (-1, 1):
    pts = []
    for i in range(14):
        u = 0.06 + i * 0.066
        x, y, zz = P(u, side)
        x = (x * 0.97) + side * CAT
        pts.append((x, y, zz))
        q.append(beam((x, y, zz), (x, y + 0.6, zz), 0.035, "gun", verts=5))
    for a, b in zip(pts, pts[1:]):
        q.append(beam((a[0], a[1] + 0.58, a[2]), (b[0], b[1] + 0.58, b[2]), 0.04, "trim", verts=5))
        q.append(beam((a[0], a[1] + 0.3, a[2]), (b[0], b[1] + 0.3, b[2]), 0.018, "steel", verts=4))
join(q, "ironwake_deck", ROOT)

# ================================================================= the wheelhouse
q = []
WX, WY, WZ = 2.2, 1.2, 2.8  # the code-built cabin's box
WC = (0, DECK_Y + 0.6, -2.4)
y0 = SHEER + 0.1
# walls: welded plate, every panel a different steel
for side in (-1, 1):
    for k in range(3):
        zz = WC[2] - WZ / 2 + WZ / 6 + k * WZ / 3
        q.append(B((0.07, WY, WZ / 3 + 0.02), (side * WX / 2, y0 + WY / 2, zz), ("steel", "oxide", "paint", "corr")[(k + (side > 0)) % 4]))
for zz, r in ((WC[2] - WZ / 2, "steel"), (WC[2] + WZ / 2, "paint")):
    q.append(B((WX, WY, 0.07), (0, y0 + WY / 2, zz), r))
q.append(B((WX - 0.05, 0.1, WZ - 0.05), (0, y0 + 0.05, WC[2]), "gun"))
# windows: a wraparound band of salvaged panes forward, portholes on the sides, the door aft
for i in range(3):
    q.append(B((0.6, 0.42, 0.04), (-0.68 + i * 0.68, y0 + 0.8, WC[2] + WZ / 2 + 0.03), "glass"))
for side in (-1, 1):
    q.append(B((0.04, 0.38, 0.62), (side * (WX / 2 + 0.03), y0 + 0.82, WC[2] + 0.6), "glass"))
    q.append(Cy(0.16, 0.05, (side * (WX / 2 + 0.03), y0 + 0.8, WC[2] - 0.6), "glass", axis="x", verts=10))
    q.append(Cy(0.2, 0.04, (side * (WX / 2 + 0.05), y0 + 0.8, WC[2] - 0.6), "gun", axis="x", verts=10))
q.append(B((0.7, 1.0, 0.05), (0.45, y0 + 0.52, WC[2] - WZ / 2 - 0.03), "rust_hi"))  # the door
q.append(B((0.07, 0.07, 0.1), (0.2, y0 + 0.55, WC[2] - WZ / 2 - 0.07), "gun"))
q.append(B((0.32, 0.2, 0.04), (-0.5, y0 + 0.9, WC[2] - WZ / 2 - 0.03), "lamp"))  # a lit window aft
# roof: overhanging plate with a raised lip, the same height as the code-built roof (top at DECK_Y + 1.34)
q.append(B((2.5, 0.12, 3.1), (0, DECK_Y + 1.28, WC[2]), "trim"))
q.append(B((2.42, 0.06, 3.0), (0, DECK_Y + 1.36, WC[2]), "paint"))
# a visor over the forward windows, a horn, the wheelhouse's own nav lights
q.append(B((2.4, 0.05, 0.4), (0, y0 + 1.12, WC[2] + WZ / 2 + 0.18), "gun", rot=(0.25, 0, 0)))
q.append(Cy(0.07, 0.32, (0.9, DECK_Y + 1.5, WC[2] + 1.2), "hazard", axis="z", verts=8, r2=0.14))
q.append(B((0.12, 0.1, 0.1), (-1.2, y0 + 1.05, WC[2] + 1.1), "red_glow"))
q.append(B((0.12, 0.1, 0.1), (1.2, y0 + 1.05, WC[2] + 1.1), "lamp"))
# stovepipe/exhaust stack aft of the roof
q.append(Cy(0.11, 1.0, (-0.85, DECK_Y + 1.8, WC[2] - 1.2), "gun", verts=8))
q.append(Cy(0.14, 0.14, (-0.85, DECK_Y + 2.32, WC[2] - 1.2), "char", verts=8))
join(q, "ironwake_wheelhouse", ROOT)

# ================================================================= twin rudders (one per hull)
# Each is its own node with its origin at the stock's head, so the game can scale it up for the Ash Rudder upgrade.
for cx, nm in ((CAT, "ironwake_rudder_starboard"), (-CAT, "ironwake_rudder_port")):
    q = []
    zs = -L / 2 - 0.22
    q.append(B((0.08, 1.5, 0.62), (cx, 0.25, zs - 0.12), "gun", taper=0.15))
    q.append(B((0.1, 0.12, 0.66), (cx, -0.48, zs - 0.12), "hazard"))
    q.append(Cy(0.05, 1.5, (cx, 1.0, zs + 0.15), "steel", verts=6))  # stock
    for yy in (0.25, 0.8):  # pintle straps on the transom
        q.append(B((0.14, 0.08, 0.3), (cx, yy, zs + 0.1), "rust"))
    q.append(beam((cx, 1.72, zs + 0.15), (cx, 1.62, zs + 0.95), 0.045, "wood_dk", verts=6))  # tiller arm (linked to the helm)
    r = join(q, nm, ROOT)
    kit.set_origin(r, G(cx, 1.75, zs + 0.15))  # noqa: F821

# ================================================================= the mast
q = []
MH = 10.2  # tier-0 mast height (8.5 x 1.2)
MB = (0, SHEER - D * 0.6, 0.8)  # its foot: mastBase, mastZ
q.append(Cy(0.17, MH, (0, MB[1] + MH / 2, MB[2]), "gun", verts=10, r2=0.12))
q.append(Cy(0.26, 0.4, (0, SHEER + 0.3, MB[2]), "rust", verts=10))  # tabernacle collar on the deck
q.append(Cy(0.2, 0.12, (0, SHEER + 1.2, MB[2]), "hazard", verts=10))
for k in range(16):  # welded ladder rungs up the aft face
    yy = SHEER + 0.8 + k * 0.45
    if yy > MB[1] + MH - 1.2:
        break
    q.append(B((0.3, 0.035, 0.035), (0, yy, MB[2] - 0.17), "steel"))
# crosstrees at 70 %, a lookout ring, the masthead light
yy = MB[1] + MH * 0.7
q.append(B((1.8, 0.08, 0.1), (0, yy, MB[2]), "gun"))
q.append(kit.torus("p", 0.42, 0.03, G(0, yy + 0.5, MB[2]), axis="Z", mat=M["steel"], major=12, minor=4))  # noqa: F821
for a in range(4):
    ang = a * math.pi / 2 + math.pi / 4
    q.append(beam((math.cos(ang) * 0.42, yy, MB[2] + math.sin(ang) * 0.42), (math.cos(ang) * 0.42, yy + 0.5, MB[2] + math.sin(ang) * 0.42), 0.02, "steel", verts=4))
q.append(Cy(0.08, 0.16, (0, MB[1] + MH + 0.06, MB[2]), "lamp", verts=8))
mast = join(q, "ironwake_mast", ROOT)
kit.set_origin(mast, G(*MB))  # noqa: F821

# ---- bake, save, contract
s = bpy.context.scene  # noqa: F821
s["gitcraft_brief"] = json.dumps({"asset_id": "tb_ironwake", "template": "run_script:ironwake", "palette": A["palette"],
                                  "material_prefix": "TBI", "out_dir": OUT})
s["gitcraft_result"] = json.dumps({"contract": {"ground": False, "frame": "shipModel.ts HULLS.ironwake, CAT_OFFSET 2.7",
                                                "nodes": {"root": "tidebreakers_ironwake", "hulls": "ironwake_hulls", "deck": "ironwake_deck", "wheelhouse": "ironwake_wheelhouse", "mast": "ironwake_mast", "rudder_port": "ironwake_rudder_port", "rudder_starboard": "ironwake_rudder_starboard"},
                                                "tintable": ["TBI_Paint", "TBI_Trim"], "mast_height": MH}})
s["gitcraft_template"] = "run_script:ironwake"
for o in s.objects:
    if o.type == "MESH":
        kit.bake_vertex_colors(o, M, jitter=0.06, seed=zlib.crc32(o.name.encode()) & 0xFFFF,  # noqa: F821
                               per_role_jitter={"glass": 0.0, "lamp": 0.0, "red_glow": 0.0, "hazard": 0.03})
os.makedirs(os.path.join(OUT, "source"), exist_ok=True)
blend = os.path.join(OUT, "source", "tb_ironwake.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)  # noqa: F821
tris = sum(len(p.vertices) - 2 for o in s.objects if o.type == "MESH" for p in o.data.polygons)
print(json.dumps({"blend": blend, "tris": tris, "objects": [o.name for o in s.objects]}))
