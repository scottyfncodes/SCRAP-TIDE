"""TIDEBREAKERS: Drowned World asset kit, authored for GITCRAFT MeshCraft `run_script`.

Run through MeshCraft (globals injected: bpy, kit, args, Palette):
    run_script {"path": ".../drowned_assets.py", "args": {"asset": "tower_glass", "out_dir": ".../creative/3d-drowned/tower_glass",
                 "palette": ".../tidebreakers-drowned-palette.json"}}

Conventions (MeshCraft kit): metres, Blender Z-up, an asset's front faces -Y (=> +Z in three.js).
Origin = waterline / mount point. Every face is a palette role; colours are baked into the
`Color` corner attribute (glTF COLOR_0) so the game's MeshToonMaterial({vertexColors}) shades them.
The scene stores gitcraft_brief / gitcraft_result like a template build, so MeshCraft's
render_preview, validate_asset, export_asset and engine_check treat it exactly like one.
"""
import json, math, os, random, zlib
from mathutils import Matrix, Vector

A = args  # noqa: F821  (injected by MeshCraft)
PAL = Palette.from_file(A["palette"])  # noqa: F821
ASSET = A["asset"]
OUT = A["out_dir"]

ROLES = {
    "rust": "Rust", "rust_dark": "Rust Deep", "rust_hi": "Rust Orange", "oxide": "Oxide Teal",
    "gun": "Gunmetal", "steel": "Steel", "concrete": "Concrete", "concrete_dk": "Concrete Dark",
    "glass": "Window Glass", "lit": "Window Lit", "tarp": "Tarp Blue", "tarp2": "Tarp Orange",
    "hazard": "Hazard Yellow", "red": "Signal Red", "wood": "Bleached Timber", "wood_dk": "Timber",
    "wood_deep": "Deep Timber", "cloth": "Sailcloth Cream", "kelp": "Kelp Green", "barnacle": "Barnacle",
    "foam": "Sea Foam", "navy": "Abyss Navy", "teal": "Turquoise Shelf", "slate": "Storm Slate",
}

kit.reset()  # noqa: F821
M = kit.Materials(PAL, ROLES, prefix="TBD")  # noqa: F821
M.add("lit", "Window Lit", rough=0.4, emit=3.0)
M.add("red_glow", "Signal Red", rough=0.4, emit=4.0)
M.add("lamp", "Window Lit", rough=0.3, emit=6.0)
RNG = random.Random(zlib.crc32(ASSET.encode()))


# ----------------------------------------------------------------- helpers
def tf(o, rot=(0, 0, 0), pivot=(0, 0, 0), move=(0, 0, 0)):
    """Rotate (XYZ euler, radians) mesh data about a pivot, then translate. Keeps object transform identity."""
    p = Vector(pivot)
    R = Matrix.Translation(p) @ (Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")) @ Matrix.Translation(-p)
    o.data.transform(Matrix.Translation(Vector(move)) @ R)
    o.data.update()
    return o


def B(size, loc, role, bevel=0.0, taper=0.0):
    return kit.box("p", size, loc, M[role], bevel=bevel, taper=taper)  # noqa: F821


def C(r, depth, loc, role, axis="Z", verts=10, r2=None):
    return kit.cylinder("p", r, depth, loc, axis=axis, verts=verts, mat=M[role], r2=r2)  # noqa: F821


def beam(a, b, t, role):
    """Square beam between two points."""
    a, b = Vector(a), Vector(b)
    d = b - a
    L = d.length
    o = B((t, t, L), (0, 0, 0), role)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.data.transform(Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())
    o.data.update()
    return o


def finish(parts, name, root, smooth=None):
    o = kit.join(parts, name, parent=root)  # noqa: F821
    kit.shade(o, smooth)  # noqa: F821
    return o


def lattice(x0, y0, z0, w, d, h, levels, t, role):
    """Open lattice tower (derricks, pylons, spires) with X bracing."""
    parts = []
    corners = [(x0 - w / 2, y0 - d / 2), (x0 + w / 2, y0 - d / 2), (x0 + w / 2, y0 + d / 2), (x0 - w / 2, y0 + d / 2)]
    for i in range(levels):
        za, zb = z0 + h * i / levels, z0 + h * (i + 1) / levels
        sa = 1 - 0.55 * i / levels
        sb = 1 - 0.55 * (i + 1) / levels
        ca = [(x0 + (cx - x0) * sa, y0 + (cy - y0) * sa) for cx, cy in corners]
        cb = [(x0 + (cx - x0) * sb, y0 + (cy - y0) * sb) for cx, cy in corners]
        for k in range(4):
            parts.append(beam((*ca[k], za), (*cb[k], zb), t, role))
            n = (k + 1) % 4
            parts.append(beam((*cb[k], zb), (*cb[n], zb), t * 0.7, role))
            if i % 2 == 0:
                parts.append(beam((*ca[k], za), (*cb[n], zb), t * 0.5, role))
    return parts


def floors_tower(x, y, w, d, z0, z1, floor_h, glass_role="glass", band_role="concrete", lit_p=0.0, broken=0.0):
    """Stacked floor bands: a concrete slab per floor, a recessed glass band, some lit windows."""
    parts = []
    z = z0
    i = 0
    while z < z1 - 0.01:
        h = min(floor_h, z1 - z)
        parts.append(B((w, d, h * 0.38), (x, y, z + h * 0.19), band_role))
        parts.append(B((w * 0.95, d * 0.95, h * 0.62), (x, y, z + h * 0.38 + h * 0.31), glass_role))
        # broken windows: dark voids punched into the glass band
        for _ in range(2):
            if RNG.random() < 0.55:
                sx, sy = RNG.choice(((1, 0), (-1, 0), (0, 1), (0, -1)))
                bw = RNG.uniform(1.5, 4.0)
                if sx:
                    parts.append(B((0.12, bw, h * 0.5), (x + sx * w * 0.48, y + RNG.uniform(-d * 0.3, d * 0.3), z + h * 0.68), "navy"))
                else:
                    parts.append(B((bw, 0.12, h * 0.5), (x + RNG.uniform(-w * 0.3, w * 0.3), y + sy * d * 0.48, z + h * 0.68), "navy"))
        # rust streak bleeding down from a broken frame
        if RNG.random() < 0.25:
            parts.append(B((0.5, d + 0.06, h * 1.6), (x + RNG.uniform(-w * 0.4, w * 0.4), y, z + h * 0.2), "rust"))
        # lit / dark window panels on the facade
        if lit_p and RNG.random() < lit_p * 3:
            for side in (-1, 1):
                if RNG.random() < lit_p * 4:
                    px = x + RNG.uniform(-w * 0.35, w * 0.35)
                    parts.append(B((w * 0.12, 0.08, h * 0.5), (px, y + side * d * 0.49, z + h * 0.62), "lit"))
        z += h
        i += 1
    # corner pilasters tie the floors together and break the silhouette
    for cx in (-1, 1):
        for cy in (-1, 1):
            parts.append(B((w * 0.08, d * 0.08, z1 - z0), (x + cx * w * 0.48, y + cy * d * 0.48, (z0 + z1) / 2), band_role))
    return parts


def meta(contract, expect=None):
    s = bpy.context.scene  # noqa: F821
    brief = {"asset_id": f"tb_{ASSET}", "template": "run_script:drowned_assets", "params": {"asset": ASSET},
             "palette": A["palette"], "material_prefix": "TBD", "out_dir": OUT}
    s["gitcraft_brief"] = json.dumps(brief)
    s["gitcraft_result"] = json.dumps({"contract": contract, "expect": expect or {}})
    s["gitcraft_template"] = "run_script:drowned_assets"


# ----------------------------------------------------------------- environment
def tower_glass():
    root = kit.empty("tower_glass", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    w, d = 16, 14
    p = floors_tower(0, 0, w, d, -12, 30, 3.6, lit_p=0.0)
    # set-back crown, broken on one corner
    p += floors_tower(-1.5, 0.5, w * 0.72, d * 0.78, 30, 39.6, 3.6)
    p.append(B((w * 0.3, d * 0.3, 7), (5.2, -4.0, 33.5), "concrete_dk"))  # elevator core exposed
    # exposed beams where the corner collapsed
    for k in range(5):
        p.append(beam((w / 2, -d / 2 + k * 1.2, 30), (w / 2 - RNG.uniform(1, 3), -d / 2 + k * 1.2 + RNG.uniform(-0.4, 0.4), 30 + RNG.uniform(3, 7)), 0.35, "rust"))
    # rooftop: water tank, antenna, rust stains
    p.append(C(1.6, 3.0, (-4, 2, 41.2), "wood_dk", verts=12))
    p.append(C(1.75, 0.5, (-4, 2, 42.95), "rust_dark", verts=12, r2=0.2))
    for lg in ((-5, 1), (-3, 1), (-5, 3), (-3, 3)):
        p.append(B((0.25, 0.25, 2.0), (lg[0], lg[1], 38.6), "rust"))
    p += lattice(2.5, 2.5, 39.6, 1.6, 1.6, 12, 4, 0.18, "steel")
    p.append(C(0.18, 0.5, (2.5, 2.5, 51.8), "red_glow", verts=8))
    # waterline grime & barnacles
    p.append(B((w + 0.3, d + 0.3, 1.4), (0, 0, 0.2), "kelp"))
    p.append(B((w + 0.2, d + 0.2, 0.6), (0, 0, 1.2), "barnacle"))
    finish(p, "tower_glass_body", root)
    meta({"ground": False, "nodes": {"root": "tower_glass", "body": "tower_glass_body"}, "origin": "waterline, centre of footprint"})


def tower_brick():
    root = kit.empty("tower_brick", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    w, d, top = 18, 12, 21
    p = [B((w, d, top + 12), (0, 0, (top - 12) / 2), "concrete_dk")]
    # window grid as recessed dark panels + balconies
    for fl in range(0, 7):
        z = 1.5 + fl * 3.0
        for i in range(6):
            x = -w / 2 + 1.6 + i * 2.95
            for side in (-1, 1):
                role = "lit" if RNG.random() < 0.06 else "navy"
                p.append(B((1.4, 0.25, 1.6), (x, side * d / 2, z + 0.9), role))
            if fl % 2 == 1 and i % 2 == 0:
                p.append(B((2.2, 1.0, 0.18), (x, -d / 2 - 0.5, z), "concrete"))
                p.append(B((2.2, 0.06, 0.9), (x, -d / 2 - 1.0, z + 0.5), "rust"))
    # fire escape (rust zig-zag)
    for fl in range(6):
        z = 2 + fl * 3
        p.append(B((3.0, 1.2, 0.12), (w / 2 + 0.6, -2, z), "rust"))
        p.append(beam((w / 2 + 0.2, -3.2, z), (w / 2 + 0.2, -0.8, z + 3), 0.12, "rust_hi"))
    # survivor rooftop shack with tarp, solar panel, antenna
    p.append(B((5, 4, 2.6), (-4, 1, top + 1.3), "wood_dk"))
    p.append(tf(B((6, 5, 0.12), (-4, 1, top + 2.75), "tarp"), rot=(0.12, 0, 0), pivot=(-4, 1, top + 2.75)))
    p.append(tf(B((3, 2, 0.08), (4, -2, top + 1.2), "navy"), rot=(-0.5, 0, 0), pivot=(4, -2, top + 1.2)))
    p.append(B((0.12, 0.12, 6), (6, 3, top + 3), "steel"))
    p.append(B((w + 0.4, d + 0.4, 0.5), (0, 0, top + 0.25), "concrete"))
    p.append(B((w + 0.3, d + 0.3, 1.2), (0, 0, 0.1), "kelp"))
    finish(p, "tower_brick_body", root)
    meta({"ground": False, "nodes": {"root": "tower_brick", "body": "tower_brick_body"}, "origin": "waterline"})


def tower_spire():
    root = kit.empty("tower_spire", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    p = [C(7, 22, (0, 0, -1), "concrete", verts=12), C(7.3, 1.2, (0, 0, 10.2), "concrete_dk", verts=12)]
    p += floors_tower(0, 0, 9, 9, 10.8, 30, 3.2)
    # observation pod
    p.append(C(6.5, 4, (0, 0, 33), "glass", verts=16))
    p.append(C(6.8, 0.8, (0, 0, 31), "concrete", verts=16))
    p.append(C(6.8, 0.8, (0, 0, 35.3), "concrete", verts=16))
    p.append(C(3.0, 6, (0, 0, 38.6), "concrete_dk", verts=12, r2=1.6))
    p += lattice(0, 0, 41.6, 2.6, 2.6, 24, 6, 0.22, "steel")
    p.append(C(0.3, 1, (0, 0, 66), "red_glow", verts=8))
    p.append(C(7.4, 1.6, (0, 0, 0.3), "kelp", verts=12))
    finish(p, "tower_spire_body", root)
    meta({"ground": False, "nodes": {"root": "tower_spire", "body": "tower_spire_body"}, "origin": "waterline"})


def tower_stump():
    """Collapsed tower leaning out of the shallows: a reachable salvage site."""
    root = kit.empty("tower_stump", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    p = floors_tower(0, 0, 12, 12, -10, 13, 3.4)
    for k in range(7):
        p.append(beam((RNG.uniform(-5, 5), RNG.uniform(-5, 5), 13), (RNG.uniform(-6, 6), RNG.uniform(-6, 6), 13 + RNG.uniform(1.5, 4.5)), 0.3, "rust"))
    p.append(B((12.4, 12.4, 1.2), (0, 0, 0.1), "kelp"))
    o = finish(p, "tower_stump_body", root)
    tf(o, rot=(0.0, math.radians(9), math.radians(20)), pivot=(0, 0, -10))
    meta({"ground": False, "nodes": {"root": "tower_stump", "body": "tower_stump_body"}, "origin": "waterline"})


def oil_rig():
    """Rig Helios: a derelict production platform turned trading post."""
    root = kit.empty("oil_rig", (0, 0, 0), kind="ARROWS", size=3)  # noqa: F821
    p = []
    for lx in (-11, 11):
        for ly in (-9, 9):
            p.append(C(1.5, 24, (lx, ly, 0), "rust", verts=12))
            p.append(C(1.7, 1.6, (lx, ly, 0.2), "hazard", verts=12))
            p.append(C(1.65, 1.4, (lx, ly, -0.8), "kelp", verts=12))
    for z in (-3, 5):
        for a, b in (((-11, -9), (11, -9)), ((-11, 9), (11, 9)), ((-11, -9), (-11, 9)), ((11, -9), (11, 9))):
            p.append(beam((*a, z), (*b, z), 0.45, "rust_dark"))
        p.append(beam((-11, -9, z), (11, 9, z + 6), 0.35, "rust_dark"))
    # decks
    p.append(B((30, 24, 1.2), (0, 0, 12), "gun"))
    p.append(B((30.4, 24.4, 0.3), (0, 0, 11.2), "hazard"))
    p.append(B((22, 16, 1.0), (-2, 1, 18), "gun"))
    for x in (-12, -2, 8):
        for y in (-6, 8):
            p.append(B((0.6, 0.6, 5.0), (x, y, 15), "rust"))
    # deck rail
    for s in (-1, 1):
        p.append(B((30, 0.12, 1.0), (0, s * 12, 13.1), "hazard"))
        p.append(B((0.12, 24, 1.0), (s * 15, 0, 13.1), "hazard"))
    # accommodation block (lights on: people live here now)
    p.append(B((10, 8, 6), (-8, -6, 21.5), "concrete"))
    for i in range(4):
        for fl in range(2):
            p.append(B((1.4, 0.2, 1.1), (-11.5 + i * 2.4, -10.05, 20 + fl * 2.6), "lit" if (i + fl) % 3 else "navy"))
    p.append(B((10.6, 8.6, 0.4), (-8, -6, 24.7), "rust"))
    # derrick
    p += lattice(6, 4, 18.5, 6, 6, 26, 7, 0.32, "rust_hi")
    p.append(B((1.2, 1.2, 1.2), (6, 4, 45), "rust_dark"))
    # crane with boom
    p.append(C(1.0, 5, (12, -8, 15), "hazard", verts=10))
    p.append(B((2.6, 2.4, 2.4), (12, -8, 18.6), "hazard"))
    p.append(beam((12, -8, 19.5), (24, -16, 28), 0.55, "hazard"))
    p.append(beam((24, -16, 28), (24, -16, 20), 0.08, "steel"))
    # flare stack boom, still burning
    p.append(beam((-14, 10, 13), (-26, 20, 30), 0.5, "rust"))
    p.append(C(0.7, 1.6, (-26, 20, 30.6), "rust_dark", verts=8))
    p.append(kit.ico("p", 1.3, (-26, 20, 32.2), M["lamp"], sub=1, scale=(0.8, 0.8, 1.5)))  # noqa: F821
    # helipad
    p.append(C(7, 0.5, (-8, 6, 25.2), "gun", verts=20))
    p.append(B((5.6, 0.7, 0.1), (-8, 6, 25.5), "hazard"))
    p.append(B((0.7, 5.6, 0.1), (-10.4, 6, 25.5), "hazard"))
    p.append(B((0.7, 5.6, 0.1), (-5.6, 6, 25.5), "hazard"))
    # containers & tarps of the market on the main deck
    cols = ["red", "tarp", "oxide", "tarp2"]
    for i in range(4):
        p.append(B((6, 2.44, 2.6), (2 + (i % 2) * 7, -9 + (i // 2) * 3.0, 13.9), cols[i]))
    p.append(tf(B((8, 5, 0.12), (5, 7, 16.2), "tarp2"), rot=(0.15, 0, 0), pivot=(5, 7, 16.2)))
    for x in (1.5, 8.5):
        p.append(B((0.15, 0.15, 3.6), (x, 9.3, 14.4), "wood_dk"))
    # dock ladder down to the water
    p.append(B((6, 3, 0.4), (0, -14.5, 1.0), "wood"))
    p.append(B((0.8, 0.3, 12), (0, -12.8, 6.8), "steel"))
    finish(p, "oil_rig_body", root)
    kit.empty("socket_dock", (0, -16.5, 0.6), parent=root)  # noqa: F821
    kit.empty("light_flare", (-26, 20, 32.4), parent=root)  # noqa: F821
    meta({"ground": False, "nodes": {"root": "oil_rig", "body": "oil_rig_body", "dock": "socket_dock", "flare": "light_flare"},
          "origin": "waterline, centre between legs; dock faces -Y (+Z in three.js)"})


def containers():
    root = kit.empty("containers", (0, 0, 0), kind="ARROWS", size=1)  # noqa: F821
    for i, (role, name) in enumerate((("red", "container_red"), ("tarp", "container_blue"), ("hazard", "container_yellow"), ("oxide", "container_teal"))):
        x = i * 4.0
        p = [B((12.2, 2.44, 2.6), (x, 0, 1.3), role)]
        for k in range(22):
            p.append(B((0.12, 2.54, 2.3), (x - 5.6 + k * 0.53, 0, 1.3), role if k % 2 else "rust"))
        p.append(B((12.3, 2.5, 0.12), (x, 0, 2.6), "rust_dark"))
        p.append(B((0.15, 2.5, 2.6), (x + 6.1, 0, 1.3), "rust_dark"))
        p.append(B((0.08, 0.1, 2.2), (x + 6.18, 0.4, 1.3), "steel"))
        p.append(B((0.08, 0.1, 2.2), (x + 6.18, -0.4, 1.3), "steel"))
        o = finish(p, name, root)
        o.data.transform(Matrix.Translation((-x, 0, 0)))
        o.location = (x, 0, 0)
    meta({"ground": True, "nodes": {"root": "containers", "red": "container_red", "blue": "container_blue", "yellow": "container_yellow", "teal": "container_teal"},
          "origin": "each container node: centre of its base; 12.2 m long along X"})


def tanker_wreck():
    """Bow of a half-sunk tanker rearing out of the sea: the ship graveyard landmark."""
    root = kit.empty("tanker_wreck", (0, 0, 0), kind="ARROWS", size=3)  # noqa: F821
    L, W, H = 64.0, 7.5, 14.0
    p = []
    n = 14
    for i in range(n):
        u0, u1 = i / n, (i + 1) / n
        def half(u):
            return W * (1.0 if u < 0.7 else max(0.0, math.cos((u - 0.7) / 0.3 * math.pi / 2)) ** 0.7 + 0.05)
        y0, y1 = -L / 2 + u0 * L, -L / 2 + u1 * L
        w0, w1 = half(u0), half(u1)
        sec = kit.prism("p", [(-w0, -H * 0.5), (w0, -H * 0.5), (w0 * 1.02, H * 0.5), (-w0 * 1.02, H * 0.5)], y1 - y0,  # noqa: F821
                        loc=(0, (y0 + y1) / 2, 0), axis="Y", mat=M["rust" if i % 3 else "rust_dark"])
        if abs(w1 - w0) > 0.01:
            def taper(v, y0=y0, y1=y1, w0=w0, w1=w1):
                t = (v.y - y0) / (y1 - y0)
                k = (w0 + (w1 - w0) * t) / w0
                return Vector((v.x * k, v.y, v.z))
            kit.deform(sec, taper)  # noqa: F821
        p.append(sec)
        # red boot-top paint below the old waterline
        p.append(kit.prism("p", [(-w0 * 1.03, -H * 0.5), (w0 * 1.03, -H * 0.5), (w0 * 1.03, -H * 0.15), (-w0 * 1.03, -H * 0.15)], (y1 - y0) * 0.98,  # noqa: F821
                           loc=(0, (y0 + y1) / 2, 0), axis="Y", mat=M["red"]))
    # deck pipes, catwalk, foremast
    for s in (-1, 1):
        p.append(C(0.35, L * 0.65, (s * 2.2, -L * 0.1, H * 0.5 + 0.4), "hazard", axis="Y", verts=8))
    p.append(B((1.6, L * 0.7, 0.2), (0, -L * 0.1, H * 0.5 + 1.6), "steel"))
    p.append(C(0.5, 9, (0, L * 0.38, H * 0.5 + 4.5), "rust_hi", verts=8))
    p.append(B((0.3, 0.3, 3), (0, L * 0.47, H * 0.5 + 1), "rust_hi"))
    # anchor hawse, name plate
    for s in (-1, 1):
        p.append(C(0.9, 0.6, (s * W * 0.55, L * 0.44, H * 0.2), "navy", axis="X", verts=10))
    p.append(B((0.1, 6, 1.4), (W * 0.9, L * 0.25, H * 0.32), "foam"))
    body = finish(p, "tanker_body", root)
    # rear the bow out of the water
    tf(body, rot=(math.radians(14), 0, math.radians(8)), pivot=(0, -L / 2, 0), move=(0, 8, -12))
    meta({"ground": False, "nodes": {"root": "tanker_wreck", "body": "tanker_body"}, "origin": "waterline; bow points +Y (-Z in three.js)"})


def settlement_kit():
    """Driftholm modules: pontoon platforms built on drums and salvaged hulls."""
    root = kit.empty("settlement_kit", (0, 0, 0), kind="ARROWS", size=1)  # noqa: F821

    def pontoon(x, w, d):
        q = [B((w, d, 0.35), (x, 0, 0.75), "wood")]
        for i in range(int(w / 0.5)):
            q.append(B((0.42, d, 0.06), (x - w / 2 + 0.25 + i * 0.5, 0, 0.95), "wood" if i % 3 else "wood_dk"))
        for ix in range(3):
            for iy in range(2):
                q.append(C(0.45, 1.3, (x - w / 2 + 0.8 + ix * (w - 1.6) / 2, -d / 2 + 0.9 + iy * (d - 1.8), 0.25), ["tarp", "red", "hazard", "oxide"][(ix + iy) % 4], axis="X", verts=10))
        return q

    def node(name, parts, x):
        o = finish(parts, name, root)
        o.data.transform(Matrix.Translation((-x, 0, 0)))
        o.location = (x, 0, 0)

    # shack: corrugated roof, door, window, stovepipe
    x = 0
    q = pontoon(x, 8, 7)
    q.append(B((5, 4, 2.8), (x - 0.5, 0.5, 2.4), "wood_dk"))
    q.append(tf(B((5.8, 4.8, 0.12), (x - 0.5, 0.5, 3.95), "rust_hi"), rot=(0.18, 0, 0), pivot=(x - 0.5, 0.5, 3.95)))
    q.append(B((1.0, 0.1, 1.9), (x - 1.2, -1.55, 2.0), "navy"))
    q.append(B((1.0, 0.1, 0.8), (x + 0.8, -1.55, 2.8), "lit"))
    q.append(C(0.15, 1.8, (x + 1.5, 1.8, 4.6), "gun", verts=6))
    q.append(tf(B((3, 2.4, 0.06), (x + 2.2, -2.4, 3.0), "tarp2"), rot=(0.3, 0, 0), pivot=(x + 2.2, -2.4, 3.0)))
    for px in (x + 1.0, x + 3.4):
        q.append(B((0.12, 0.12, 2.0), (px, -3.4, 2.0), "wood_deep"))
    node("mod_shack", q, x)
    # market stall: awning stripes, crates, lantern pole
    x = 10
    q = pontoon(x, 8, 7)
    for i in range(5):
        q.append(B((1.2, 4.6, 0.08), (x - 2.4 + i * 1.2, 0, 3.4), "red" if i % 2 else "cloth"))
    for px in (x - 3, x + 3):
        for py in (-2.2, 2.2):
            q.append(B((0.14, 0.14, 2.4), (px, py, 2.2), "wood_deep"))
    q.append(B((5.5, 1.2, 1.0), (x, -1.6, 1.5), "wood_dk"))
    for i in range(4):
        q.append(B((0.8, 0.8, 0.8), (x - 2 + i * 1.3, 1.6, 1.4), ["wood", "hazard", "oxide", "wood_dk"][i]))
    q.append(C(0.35, 0.6, (x + 2.6, -1.6, 2.3), "kelp", verts=8))
    q.append(C(0.3, 0.5, (x + 1.6, -1.6, 2.25), "tarp2", verts=8))
    node("mod_market", q, x)
    # turbine: lattice tower + 3-blade rotor (rotor is its own node so the game can spin it)
    x = 20
    q = pontoon(x, 6, 6)
    q += lattice(x, 0, 1.0, 1.6, 1.6, 11, 4, 0.12, "steel")
    q.append(B((0.8, 1.6, 0.8), (x, 0, 12.3), "gun"))
    node("mod_turbine", q, x)
    rot = [C(0.35, 0.6, (0, -0.95, 0), "red", axis="Y", verts=8)]
    for k in range(3):
        a = k * 2 * math.pi / 3
        bl = B((0.28, 0.08, 3.8), (0, -1.0, 2.1), "cloth")
        tf(bl, rot=(0, a, 0), pivot=(0, -1.0, 0))
        rot.append(bl)
    r = finish(rot, "mod_turbine_rotor", root)
    r.location = (x, 0, 12.3)
    # water tank + still platform with garden planters
    x = 30
    q = pontoon(x, 7, 7)
    q.append(C(1.4, 2.6, (x - 1.2, 0.8, 2.3), "oxide", verts=14))
    q.append(C(1.5, 0.3, (x - 1.2, 0.8, 3.7), "steel", verts=14, r2=0.4))
    for i in range(3):
        q.append(B((1.6, 0.8, 0.5), (x + 1.8, -2 + i * 1.3, 1.25), "wood_dk"))
        q.append(kit.ico("p", 0.55, (x + 1.8, -2 + i * 1.3, 1.75), M["kelp"], sub=1, scale=(1.3, 0.7, 0.7), seed=i, wobble=0.15))  # noqa: F821
    q.append(tf(B((2.4, 1.6, 0.06), (x - 1.0, -2.2, 1.6), "glass"), rot=(-0.6, 0, 0), pivot=(x - 1.0, -2.2, 1.6)))
    node("mod_water", q, x)
    # walkway plank bridge (2 m wide, 8 m long; scale along X in game)
    x = 40
    q = [B((8, 2, 0.2), (x, 0, 0.85), "wood")]
    for i in range(4):
        q.append(C(0.35, 1.8, (x - 3 + i * 2, 0, 0.35), "tarp" if i % 2 else "hazard", axis="Y", verts=8))
    for s in (-1, 1):
        q.append(B((8, 0.06, 0.06), (x, s * 0.95, 1.7), "wood_deep"))
        for i in range(5):
            q.append(B((0.08, 0.08, 0.9), (x - 4 + i * 2, s * 0.95, 1.3), "wood_deep"))
    node("mod_walkway", q, x)
    meta({"ground": False, "nodes": {"root": "settlement_kit", "shack": "mod_shack", "market": "mod_market", "turbine": "mod_turbine",
                                     "rotor": "mod_turbine_rotor", "water": "mod_water", "walkway": "mod_walkway"},
          "origin": "each module node: pontoon centre at the waterline"})


def boat_kit():
    """Every visible boat upgrade, each a node with its origin at the mounting point (front = -Y => +Z in game)."""
    root = kit.empty("boat_kit", (0, 0, 0), kind="ARROWS", size=0.5)  # noqa: F821
    X = [0.0]

    def node(name, parts):
        o = finish(parts, name, root)
        o.data.transform(Matrix.Translation((-X[0], 0, 0)))
        o.location = (X[0], 0, 0)
        X[0] += 4.0

    def at(dx=0.0):
        return X[0] + dx

    x = at()
    # outboard motor (tier 1): cowl, shaft, prop, tiller
    node("engine_outboard", [
        B((0.55, 0.7, 0.6), (x, 0.2, 0.55), "hazard", bevel=0.06),
        B((0.58, 0.72, 0.14), (x, 0.2, 0.86), "gun"),
        B((0.16, 0.22, 1.0), (x, 0.35, -0.2), "gun"),
        C(0.14, 0.4, (x, 0.35, -0.7), "gun", axis="Y", verts=8),
        B((0.06, 0.06, 0.5), (x, 0.6, -0.7), "steel"),
        B((0.5, 0.06, 0.06), (x, 0.6, -0.7), "steel"),
        beam((x, 0.0, 0.7), (x, -0.9, 0.95), 0.06, "gun"),
        B((0.4, 0.3, 0.3), (x, -0.05, 0.25), "steel"),
    ])
    x = at()
    # twin diesel (tier 2): engine box, exhaust stacks, twin props
    node("engine_twin", [
        B((1.5, 1.2, 0.8), (x, 0.3, 0.4), "gun", bevel=0.05),
        B((1.3, 1.0, 0.25), (x, 0.3, 0.92), "rust_hi"),
        C(0.12, 1.6, (x - 0.5, 0.75, 1.5), "steel", verts=8),
        C(0.12, 1.6, (x + 0.5, 0.75, 1.5), "steel", verts=8),
        C(0.16, 0.2, (x - 0.5, 0.75, 2.35), "rust_dark", verts=8),
        C(0.16, 0.2, (x + 0.5, 0.75, 2.35), "rust_dark", verts=8),
        C(0.22, 0.25, (x - 0.5, 1.0, -0.55), "steel", axis="Y", verts=8),
        C(0.22, 0.25, (x + 0.5, 1.0, -0.55), "steel", axis="Y", verts=8),
        B((0.15, 0.6, 0.15), (x - 0.5, 0.75, -0.4), "gun"),
        B((0.15, 0.6, 0.15), (x + 0.5, 0.75, -0.4), "gun"),
    ])
    x = at()
    # radar mast: lattice, dish, nav light
    q = lattice(x, 0, 0, 0.5, 0.5, 3.2, 3, 0.05, "steel")
    q += [B((1.6, 0.25, 0.12), (x, 0, 3.35), "foam"), C(0.15, 0.3, (x, 0, 3.15), "gun", verts=8),
          C(0.08, 0.15, (x, 0, 3.55), "red_glow", verts=6), B((0.4, 0.4, 0.4), (x, 0, 2.0), "foam")]
    node("radar_mast", q)
    x = at()
    # salvage crane / winch: turret, boom, hook block, drum
    node("salvage_crane", [
        C(0.45, 0.4, (x, 0, 0.2), "hazard", verts=10),
        B((0.7, 0.8, 0.6), (x, 0, 0.7), "hazard", bevel=0.04),
        C(0.25, 0.6, (x, 0.2, 0.7), "rust_dark", axis="X", verts=10),
        beam((x, 0, 0.9), (x, -2.6, 2.6), 0.16, "hazard"),
        beam((x, -2.6, 2.6), (x, -2.6, 1.2), 0.03, "steel"),
        B((0.22, 0.22, 0.3), (x, -2.6, 1.05), "gun"),
        kit.torus("p", 0.14, 0.035, (x, -2.6, 0.82), axis="X", mat=M["steel"], major=10, minor=4),  # noqa: F821
    ])
    x = at()
    # harpoon turret
    node("harpoon_turret", [
        C(0.4, 0.5, (x, 0, 0.25), "gun", verts=10),
        B((0.5, 0.5, 0.35), (x, 0, 0.7), "rust"),
        C(0.09, 1.8, (x, -0.7, 0.85), "steel", axis="Y", verts=8),
        C(0.03, 0.6, (x, -1.8, 0.85), "steel", axis="Y", verts=6),
        kit.prism("p", [(-0.18, 0), (0.18, 0), (0, 0.35)], 0.05, loc=(x, -2.0, 0.85), axis="Z", mat=M["red"]),  # noqa: F821
        B((0.6, 0.06, 0.4), (x, 0.25, 0.85), "rust_hi"),
        B((0.08, 0.5, 0.08), (x + 0.25, 0.3, 0.55), "gun"),
    ])
    x = at()
    # deck turbine (small wind generator on a pole) with rotor node
    node("deck_turbine", [C(0.06, 2.6, (x, 0, 1.3), "steel", verts=8), B((0.2, 0.5, 0.2), (x, 0, 2.65), "gun"),
                          kit.prism("p", [(0, 0), (0.4, 0), (0, 0.4)], 0.04, loc=(x, 0.3, 2.6), axis="X", mat=M["red"])])  # noqa: F821
    rot = [C(0.08, 0.15, (0, -0.28, 0), "red", axis="Y", verts=6)]
    for k in range(3):
        bl = B((0.08, 0.03, 0.75), (0, -0.3, 0.42), "cloth")
        tf(bl, rot=(0, k * 2 * math.pi / 3, 0), pivot=(0, -0.3, 0))
        rot.append(bl)
    r = finish(rot, "deck_turbine_rotor", root)
    r.location = (X[0] - 4.0, 0, 2.65)
    x = at()
    # solar array (tilted panels on frame)
    q = [B((1.6, 1.1, 0.06), (x, 0, 0.75), "navy"), B((1.65, 1.15, 0.03), (x, 0, 0.72), "steel")]
    for i in range(4):
        q.append(B((0.02, 1.1, 0.07), (x - 0.6 + i * 0.4, 0, 0.76), "steel"))
    q = [tf(o, rot=(0.35, 0, 0), pivot=(x, 0, 0.75)) for o in q]
    q += [B((0.06, 0.06, 0.7), (x - 0.7, 0.3, 0.35), "steel"), B((0.06, 0.06, 0.7), (x + 0.7, 0.3, 0.35), "steel"),
          B((0.06, 0.06, 0.4), (x - 0.7, -0.3, 0.2), "steel"), B((0.06, 0.06, 0.4), (x + 0.7, -0.3, 0.2), "steel")]
    node("solar_array", q)
    x = at()
    # container cabin (living quarters): cut-down shipping container, door, porthole, roof garden
    q = [B((2.2, 3.0, 1.9), (x, 0, 0.95), "oxide")]
    for k in range(10):
        q.append(B((2.26, 0.06, 1.7), (x, -1.35 + k * 0.3, 0.95), "rust" if k % 3 == 0 else "oxide"))
    q += [B((0.7, 0.06, 1.4), (x, -1.53, 0.75), "rust_dark"), C(0.22, 0.08, (x + 1.12, 0.3, 1.2), "lit", axis="X", verts=10),
          C(0.22, 0.08, (x - 1.12, 0.3, 1.2), "lit", axis="X", verts=10), B((2.3, 3.1, 0.1), (x, 0, 1.95), "rust_dark"),
          B((0.8, 0.8, 0.3), (x - 0.5, 0.7, 2.15), "wood_dk"),
          kit.ico("p", 0.35, (x - 0.5, 0.7, 2.45), M["kelp"], sub=1, scale=(1.2, 1.2, 0.8), seed=3, wobble=0.2),  # noqa: F821
          C(0.07, 0.8, (x + 0.7, 1.0, 2.4), "gun", verts=6)]
    node("cabin_container", q)
    x = at()
    # fuel drums (lashed rack of 4)
    q = [B((1.4, 0.9, 0.08), (x, 0, 0.04), "wood_dk")]
    for i, col in enumerate(("red", "hazard", "red", "tarp")):
        q.append(C(0.28, 0.85, (x - 0.48 + (i % 2) * 0.62, -0.2 + (i // 2) * 0.45, 0.5), col, verts=10))
        q.append(C(0.29, 0.05, (x - 0.48 + (i % 2) * 0.62, -0.2 + (i // 2) * 0.45, 0.62), "gun", verts=10))
    q.append(B((1.45, 0.05, 0.05), (x, -0.46, 0.7), "tarp2"))
    node("fuel_drums", q)
    x = at()
    # spotlight on post
    node("spotlight", [C(0.05, 1.2, (x, 0, 0.6), "gun", verts=6), B((0.3, 0.1, 0.2), (x, 0, 1.2), "gun"),
                       C(0.2, 0.35, (x, -0.1, 1.38), "gun", axis="Y", verts=10), C(0.17, 0.04, (x, -0.29, 1.38), "lamp", axis="Y", verts=10)])
    x = at()
    # fishing rig: two angled rods, reel, net box
    q = [B((0.6, 0.4, 0.35), (x, 0, 0.18), "wood_dk")]
    for s in (-1, 1):
        q.append(beam((x + s * 0.2, 0, 0.3), (x + s * 1.4, -0.6, 2.6), 0.035, "wood_deep"))
        q.append(C(0.07, 0.08, (x + s * 0.32, -0.05, 0.6), "steel", axis="X", verts=8))
    q.append(B((0.62, 0.42, 0.08), (x, 0, 0.38), "kelp"))
    node("fishing_rig", q)
    x = at()
    # outrigger float (ama) + crossbeam, origin at hull attachment; ama sits 2.4 m to +X
    q = [C(0.32, 4.2, (x + 2.4, 0, 0.12), "hazard", axis="Y", verts=10, r2=None),
         C(0.32, 0.6, (x + 2.4, -2.35, 0.12), "hazard", axis="Y", verts=10, r2=0.05),
         C(0.32, 0.6, (x + 2.4, 2.35, 0.12), "hazard", axis="Y", verts=10, r2=0.05),
         beam((x, -1.2, 0.55), (x + 2.4, -1.2, 0.35), 0.14, "rust"), beam((x, 1.2, 0.55), (x + 2.4, 1.2, 0.35), 0.14, "rust"),
         B((0.68, 4.2, 0.08), (x + 2.4, 0, 0.45), "red")]
    node("outrigger", q)
    x = at()
    # water still (desalinator): glass cone over a basin
    node("water_still", [C(0.5, 0.25, (x, 0, 0.12), "steel", verts=12), C(0.48, 0.6, (x, 0, 0.55), "glass", verts=12, r2=0.05),
                         C(0.05, 0.4, (x + 0.4, 0, 0.2), "oxide", axis="X", verts=6), C(0.15, 0.3, (x + 0.65, 0, 0.15), "teal", verts=8)])
    x = at()
    # string of deck lights (to drape along a rail; 3 m)
    q = [beam((x - 1.5, 0, 0.0), (x, 0, -0.25), 0.015, "gun"), beam((x, 0, -0.25), (x + 1.5, 0, 0.0), 0.015, "gun")]
    for i in range(7):
        t = i / 6
        q.append(kit.ico("p", 0.06, (x - 1.5 + 3 * t, 0, -0.25 * math.sin(t * math.pi) - 0.07), M["lamp"], sub=1))  # noqa: F821
    node("deck_lights", q)
    x = at()
    # armour plating panel (hull reinforcement), 1.4 x 0.7 riveted plate
    q = [B((0.06, 1.4, 0.7), (x, 0, 0), "gun")]
    for i in range(6):
        q.append(C(0.03, 0.04, (x + 0.04, -0.6 + i * 0.24, 0.27), "steel", axis="X", verts=6))
        q.append(C(0.03, 0.04, (x + 0.04, -0.6 + i * 0.24, -0.27), "steel", axis="X", verts=6))
    q.append(B((0.07, 0.4, 0.2), (x + 0.01, 0.3, 0.1), "rust_hi"))
    node("armor_plate", q)
    x = at()
    # navigation console: wheel, compass, chart table
    node("nav_console", [B((0.8, 0.5, 0.9), (x, 0, 0.45), "wood_dk"), tf(B((0.8, 0.5, 0.06), (x, -0.05, 0.95), "navy"), rot=(-0.4, 0, 0), pivot=(x, -0.05, 0.95)),
                         C(0.14, 0.1, (x + 0.25, -0.1, 1.0), "hazard", verts=10), C(0.1, 0.12, (x + 0.25, -0.1, 1.07), "glass", verts=10),
                         kit.torus("p", 0.32, 0.03, (x - 0.15, -0.3, 1.05), axis="Y", mat=M["wood_deep"], major=12, minor=4)])  # noqa: F821
    names = ["engine_outboard", "engine_twin", "radar_mast", "salvage_crane", "harpoon_turret", "deck_turbine", "deck_turbine_rotor",
             "solar_array", "cabin_container", "fuel_drums", "spotlight", "fishing_rig", "outrigger", "water_still", "deck_lights", "armor_plate", "nav_console"]
    meta({"ground": False, "nodes": {n: n for n in names}, "origin": "each node: its mounting point; front = +Z in three.js"})


def raider_skiff():
    """Rustfang raider: a fast, jagged scrap skiff."""
    root = kit.empty("raider_skiff", (0, 0, 0), kind="ARROWS", size=0.5)  # noqa: F821
    L = 6.0
    p = [kit.prism("p", [(-1.1, 0.0), (1.1, 0.0), (1.3, 0.9), (-1.3, 0.9)], L * 0.75, loc=(0, 0.6, -0.3), axis="Y", mat=M["rust_dark"])]  # noqa: F821
    bow = kit.prism("p", [(-1.1, 0.0), (1.1, 0.0), (1.3, 0.9), (-1.3, 0.9)], L * 0.3, loc=(0, -L * 0.42, -0.3), axis="Y", mat=M["rust"])  # noqa: F821
    kit.deform(bow, lambda v: Vector((v.x * max(0.08, (v.y + L * 0.57) / (L * 0.3)), v.y, v.z + max(0, -(v.y + L * 0.42)) * 0.25)))  # noqa: F821
    p.append(bow)
    for i in range(6):
        p.append(tf(B((0.06, 0.8, 0.5), (1.3, -1.8 + i * 0.75, 0.55), "red" if i % 2 else "gun"), rot=(0, 0.1, 0.2 * (i % 2 - 0.5)), pivot=(1.3, -1.8 + i * 0.75, 0.55)))
        p.append(tf(B((0.06, 0.8, 0.5), (-1.3, -1.8 + i * 0.75, 0.55), "gun" if i % 2 else "red"), rot=(0, -0.1, 0.2 * (i % 2 - 0.5)), pivot=(-1.3, -1.8 + i * 0.75, 0.55)))
    for k in range(5):  # jagged spikes on the bow
        p.append(C(0.08, 0.7, (0.6 - k * 0.3, -L * 0.48 + k * 0.1, 0.9), "steel", verts=4, r2=0.0))
    p += [B((0.7, 0.9, 0.7), (0, 2.4, 0.9), "gun", bevel=0.04), C(0.1, 1.0, (0.2, 2.6, 1.6), "rust_dark", verts=6),
          B((0.9, 1.0, 0.25), (0, 0.6, 0.85), "wood_deep"), C(0.04, 2.6, (0, 1.4, 2.0), "steel", verts=6),
          tf(B((0.9, 0.04, 0.6), (0.45, 1.4, 3.0), "red"), rot=(0, 0, 0.1), pivot=(0, 1.4, 3.0)),
          C(0.14, 0.2, (0, -2.0, 1.1), "red_glow", verts=8)]
    finish(p, "raider_body", root)
    meta({"ground": False, "nodes": {"root": "raider_skiff", "body": "raider_body"}, "origin": "waterline; bow -Y (+Z in three.js)"})


def debris_kit():
    root = kit.empty("debris_kit", (0, 0, 0), kind="ARROWS", size=0.5)  # noqa: F821
    X = [0.0]

    def node(name, parts):
        o = finish(parts, name, root)
        o.data.transform(Matrix.Translation((-X[0], 0, 0)))
        o.location = (X[0], 0, 0)
        X[0] += 5.0

    x = X[0]
    # floating supply cache: crate on a drum raft with a hazard flag
    q = [B((2.2, 2.2, 0.2), (x, 0, 0.35), "wood")]
    for ix in (-0.6, 0.6):
        q.append(C(0.4, 2.0, (x + ix, 0, 0.05), "tarp", axis="Y", verts=10))
    q += [B((1.1, 0.9, 0.8), (x - 0.3, 0.2, 0.85), "oxide", bevel=0.04), B((1.15, 0.95, 0.1), (x - 0.3, 0.2, 1.2), "hazard"),
          C(0.3, 0.7, (x + 0.6, -0.5, 0.8), "red", verts=10), C(0.03, 1.8, (x + 0.8, 0.8, 1.3), "steel", verts=6),
          B((0.04, 0.6, 0.35), (x + 0.8, 0.5, 2.0), "hazard")]
    node("cache_crate", q)
    x = X[0]
    # beacon buoy
    node("buoy", [C(0.6, 0.8, (x, 0, 0.1), "red", verts=12), C(0.62, 0.15, (x, 0, 0.4), "foam", verts=12),
                  C(0.3, 1.2, (x, 0, 1.0), "red", verts=8, r2=0.15), C(0.15, 0.2, (x, 0, 1.7), "lamp", verts=8)])
    x = X[0]
    # debris field patch: planks, drum, foam blocks, tyre
    q = []
    for i in range(6):
        q.append(tf(B((1.6, 0.25, 0.1), (x + RNG.uniform(-1.5, 1.5), RNG.uniform(-1.5, 1.5), 0.05), "wood" if i % 2 else "wood_dk"),
                    rot=(0, 0, RNG.uniform(0, 3)), pivot=(x, 0, 0)))
    q += [C(0.3, 0.8, (x + 1.0, 0.8, 0.0), "hazard", axis="X", verts=10), B((0.7, 0.5, 0.3), (x - 1.2, -0.8, 0.0), "foam"),
          kit.torus("p", 0.35, 0.13, (x - 0.5, 1.2, 0.0), mat=M["navy"], major=12, minor=5)]  # noqa: F821
    node("debris_patch", q)
    x = X[0]
    # oil drum (single)
    node("oil_drum", [C(0.3, 0.88, (x, 0, 0.44), "red", verts=12), C(0.31, 0.05, (x, 0, 0.3), "gun", verts=12), C(0.31, 0.05, (x, 0, 0.6), "gun", verts=12)])
    x = X[0]
    # castaway raft (rescue a survivor): tiny raft, tarp lean-to, SOS flag
    q = [B((2.4, 2.0, 0.25), (x, 0, 0.2), "wood_dk")]
    for i in range(5):
        q.append(B((0.4, 2.1, 0.1), (x - 0.9 + i * 0.45, 0, 0.36), "wood"))
    q += [tf(B((1.6, 1.4, 0.04), (x - 0.2, 0.3, 0.95), "tarp2"), rot=(0.7, 0, 0), pivot=(x - 0.2, -0.3, 0.4)),
          C(0.03, 2.2, (x + 0.9, -0.7, 1.4), "wood_deep", verts=6), B((0.04, 0.7, 0.45), (x + 0.9, -1.05, 2.25), "red")]
    node("castaway_raft", q)
    meta({"ground": False, "nodes": {"root": "debris_kit", "cache": "cache_crate", "buoy": "buoy", "patch": "debris_patch", "drum": "oil_drum", "raft": "castaway_raft"},
          "origin": "each node: waterline centre"})


BUILDERS = {f.__name__: f for f in (tower_glass, tower_brick, tower_spire, tower_stump, oil_rig, containers, tanker_wreck,
                                     settlement_kit, boat_kit, raider_skiff, debris_kit)}

# ----------------------------------------------------------------- salvage pass (grimy art-direction revamp)
def trawler_wreck():
    """A fishing trawler that went down by the stern and never finished sinking: listing, rusted through,
    nets still hanging from the A-frame. Reads as a story at a glance and from the horizon."""
    root = kit.empty("trawler_wreck", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    L, W, H = 22.0, 3.4, 4.2
    p = []
    n = 8
    for i in range(n):
        u0, u1 = i / n, (i + 1) / n
        def half(u):
            return W * (1.0 if u < 0.62 else max(0.06, math.cos((u - 0.62) / 0.38 * math.pi / 2)) ** 0.8)
        y0, y1 = -L / 2 + u0 * L, -L / 2 + u1 * L
        w0, w1 = half(u0), half(u1)
        role = "rust" if i % 3 else "rust_dark"
        if i == 5:
            role = "oxide"  # a patched plate from some other wreck
        sec = kit.prism("p", [(-w0 * 0.82, -H * 0.5), (w0 * 0.82, -H * 0.5), (w0, H * 0.5), (-w0, H * 0.5)], y1 - y0,  # noqa: F821
                        loc=(0, (y0 + y1) / 2, 0), axis="Y", mat=M[role])
        if abs(w1 - w0) > 0.01:
            def taper(v, y0=y0, y1=y1, w0=w0, w1=w1):
                t = (v.y - y0) / (y1 - y0)
                k = (w0 + (w1 - w0) * t) / w0
                return Vector((v.x * k, v.y, v.z))
            kit.deform(sec, taper)  # noqa: F821
        p.append(sec)
        # faded hull band (old company colours), above the boot-top
        p.append(kit.prism("p", [(-w0 * 1.02, H * 0.18), (w0 * 1.02, H * 0.18), (w0 * 1.02, H * 0.34), (-w0 * 1.02, H * 0.34)], (y1 - y0) * 0.97,  # noqa: F821
                           loc=(0, (y0 + y1) / 2, 0), axis="Y", mat=M["hazard" if i % 2 else "rust_hi"]))
    # bulwark rail, gaps where it tore away
    for s in (-1, 1):
        for k in range(6):
            if k in (2, 4) and s > 0:
                continue
            p.append(B((0.12, 2.6, 0.7), (s * W * 0.97, -L / 2 + 2 + k * 3.0, H * 0.5 + 0.35), "rust_dark"))
    # wheelhouse with blown-out windows and a stove pipe
    p += [B((4.2, 4.0, 2.8), (0, 2.5, H * 0.5 + 1.4), "concrete_dk", bevel=0.06), B((4.4, 4.2, 0.25), (0, 2.5, H * 0.5 + 2.95), "rust_dark"),
          B((4.25, 0.12, 0.8), (0, 4.52, H * 0.5 + 2.0), "navy"), B((0.12, 3.2, 0.8), (2.13, 2.5, H * 0.5 + 2.0), "navy"),
          C(0.18, 2.2, (1.3, 1.2, H * 0.5 + 4.0), "gun", verts=8), C(0.08, 3.5, (-1.0, 3.0, H * 0.5 + 4.6), "steel", verts=6),
          B((1.6, 0.08, 0.08), (-1.0, 3.0, H * 0.5 + 5.6), "steel")]
    # mast with a dead radar bar and a hanging lamp
    p += [C(0.16, 7.0, (0, 6.5, H * 0.5 + 3.5), "rust_hi", verts=8), B((2.4, 0.18, 0.12), (0, 6.5, H * 0.5 + 6.2), "gun"),
          C(0.12, 0.25, (0.6, 6.5, H * 0.5 + 5.8), "lamp", verts=8)]
    # stern A-frame gantry, net drum, hanging nets, outrigger booms
    for s in (-1, 1):
        p.append(beam((s * 2.6, -L / 2 + 1.0, H * 0.5), (s * 0.4, -L / 2 - 0.6, H * 0.5 + 5.5), 0.3, "hazard"))
        p.append(beam((s * 0.5, -L / 2 + 6, H * 0.5), (s * 7.5, -L / 2 + 7, H * 0.5 + 4.8), 0.18, "rust_hi"))
        for k in range(4):
            p.append(B((0.05, 0.05, 2.6 + k * 0.4), (s * (2.0 + k * 1.4), -L / 2 + 6.3 + k * 0.2, H * 0.5 + 2.2 - k * 0.2), "wood_deep"))
    p.append(B((5.4, 0.3, 0.3), (0, -L / 2 - 0.5, H * 0.5 + 5.4), "hazard"))
    p.append(C(1.0, 4.2, (0, -L / 2 + 3.0, H * 0.5 + 1.1), "kelp", axis="X", verts=12))
    p.append(tf(B((3.6, 0.06, 4.2), (0, -L / 2 - 0.4, H * 0.5 + 2.9), "kelp"), rot=(0.12, 0, 0), pivot=(0, -L / 2, H * 0.5 + 5)))
    for k in range(5):
        p.append(C(0.18, 0.2, (-1.4 + k * 0.7, -L / 2 - 0.45, H * 0.5 + 0.9 + (k % 2) * 0.3), "red", verts=8))
    # barrels and a tarp lashed on deck, a buoy hanging off the side
    for k in range(3):
        p.append(C(0.32, 0.9, (-1.2 + k * 0.7, -2.0, H * 0.5 + 0.45), "rust_hi" if k % 2 else "slate", verts=10))
    p.append(tf(B((2.2, 1.8, 0.05), (1.0, -1.5, H * 0.5 + 0.8), "tarp"), rot=(0.25, 0.1, 0), pivot=(1.0, -1.5, H * 0.5)))
    p.append(kit.torus("p", 0.45, 0.14, (W * 1.05, 5.5, H * 0.3), mat=M["red"], major=12, minor=5))  # noqa: F821
    body = finish(p, "trawler_body", root)
    # down by the stern, listing to port
    tf(body, rot=(math.radians(11), math.radians(-17), 0), pivot=(0, 0, 0), move=(0, 0, -1.6))
    meta({"ground": False, "nodes": {"root": "trawler_wreck", "body": "trawler_body"}, "origin": "waterline; bow points +Y (-Z in three.js)"})


def port_crane():
    """A harbour gantry crane that buckled when the quay went under: two legs standing, two folded into the
    sea, the boom snapped and trailing in the water. A silhouette you can steer by."""
    root = kit.empty("port_crane", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    p = []
    S, D, Hh = 7.0, 6.0, 26.0
    # two standing legs (lattice), two buckled ones
    p += lattice(-S, -D, -6, 1.6, 1.6, Hh + 6, 6, 0.32, "hazard")
    p += lattice(-S, D, -6, 1.6, 1.6, Hh + 6, 6, 0.32, "hazard")
    p.append(beam((S, -D, -6), (S + 1.5, -D, 9), 1.0, "rust"))
    p.append(beam((S + 1.5, -D, 9), (S - 2.0, -D + 1.0, Hh - 2), 1.0, "rust_hi"))
    p.append(beam((S, D, -6), (S + 3.5, D + 1.0, 4), 1.0, "rust_dark"))
    # portal frame and machinery house, tilted on the failed side
    top = [B((2 * S + 2.5, 1.4, 1.6), (0, -D, Hh), "hazard"), B((2 * S + 2.5, 1.4, 1.6), (0, D, Hh), "hazard"),
           B((1.4, 2 * D + 1.4, 1.6), (-S, 0, Hh), "rust_hi"), B((1.4, 2 * D + 1.4, 1.6), (S, 0, Hh), "rust_hi"),
           B((6.0, 7.0, 4.2), (-1.0, 0, Hh + 2.9), "concrete_dk", bevel=0.08), B((6.4, 7.4, 0.3), (-1.0, 0, Hh + 5.1), "rust_dark"),
           B((0.1, 4.0, 1.2), (2.0, 0, Hh + 3.2), "navy"), C(0.25, 3.0, (-3.0, 2.0, Hh + 6.5), "gun", verts=8),
           B((0.15, 2.2, 0.9), (-4.05, 0, Hh + 3.0), "red")]
    for o in top:
        tf(o, rot=(0, math.radians(-6), 0), pivot=(-S, 0, Hh))
    p += top
    # the boom: lattice girder out over the water, snapped, the outer half hanging into the sea
    bx0, bz = -S - 2, Hh + 0.6
    for side in (-1.1, 1.1):
        p.append(beam((bx0, side, bz), (bx0 - 18, side, bz + 1.0), 0.35, "hazard"))
        p.append(beam((bx0, side, bz - 1.6), (bx0 - 18, side, bz - 0.4), 0.35, "hazard"))
        p.append(beam((bx0 - 18, side, bz + 1.0), (bx0 - 24, side * 1.3, -3), 0.35, "rust_hi"))
    for k in range(7):
        x = bx0 - 1.5 - k * 2.5
        p.append(beam((x, -1.1, bz - 1.5 + k * 0.17), (x - 1.2, 1.1, bz + 0.9 + k * 0.14), 0.16, "rust"))
    # hoist cables hanging slack, a spreader dangling at the end
    for side in (-0.5, 0.5):
        p.append(C(0.05, 14.0, (bx0 - 9, side, bz - 8), "gun", verts=4))
    p.append(B((3.0, 1.0, 0.6), (bx0 - 9, 0, bz - 15.2), "rust_dark"))
    # lattice tie-backs over the house
    p.append(beam((-S, 0, Hh + 5.2), (-S + 2, 0, Hh + 11), 0.4, "hazard"))
    p.append(beam((-S + 2, 0, Hh + 11), (bx0 - 12, 0, bz + 1.1), 0.12, "gun"))
    p.append(beam((-S + 2, 0, Hh + 11), (S, 0, Hh + 0.8), 0.12, "gun"))
    p.append(C(0.2, 0.3, (-S + 2, 0, Hh + 11.3), "red_glow", verts=8))
    finish(p, "crane_body", root)
    meta({"ground": False, "nodes": {"root": "port_crane", "body": "crane_body"}, "origin": "waterline under the portal centre"})


def flotsam_kit():
    """Small floating dressing for the open sea: what's left of other people's lives, lashed, tangled, drifting."""
    root = kit.empty("flotsam_kit", (0, 0, 0), kind="ARROWS", size=0.5)  # noqa: F821
    X = [0.0]

    def node(name, parts):
        o = finish(parts, name, root)
        o.data.transform(Matrix.Translation((-X[0], 0, 0)))
        o.location = (X[0], 0, 0)
        X[0] += 7.0

    x = X[0]
    # barrel raft: drums lashed under a pallet, a sagging tarp shelter, a jerry can, rope
    q = []
    for ix in (-0.75, 0.0, 0.75):
        q.append(C(0.34, 2.2, (x + ix, 0, -0.05), "rust_hi" if ix else "slate", axis="Y", verts=10))
    q.append(B((2.4, 2.4, 0.14), (x, 0, 0.36), "wood_dk"))
    for k in range(4):
        q.append(B((2.5, 0.16, 0.05), (x, -0.9 + k * 0.6, 0.46), "wood"))
    q += [C(0.04, 1.6, (x - 1.0, -1.0, 1.2), "wood_deep", verts=5), C(0.04, 1.6, (x + 1.0, -1.0, 1.2), "wood_deep", verts=5),
          tf(B((2.2, 1.5, 0.04), (x, -0.3, 1.5), "tarp2"), rot=(0.45, 0, 0), pivot=(x, -1.0, 2.0)),
          B((0.4, 0.22, 0.5), (x + 0.6, 0.7, 0.72), "red", bevel=0.03), C(0.25, 0.1, (x - 0.6, 0.7, 0.53), "wood_deep", verts=10)]
    node("barrel_raft", q)
    x = X[0]
    # ghost net: a drifting knot of net, floats, a tyre and a snapped boom
    q = []
    for i in range(7):
        a = i / 7 * math.tau
        q.append(C(0.2, 0.22, (x + math.cos(a) * 1.4, math.sin(a) * 1.1, 0.05), "hazard" if i % 3 else "red", verts=8))
    q.append(tf(B((3.0, 2.4, 0.04), (x, 0, 0.0), "kelp"), rot=(0.05, 0.08, 0.4), pivot=(x, 0, 0)))
    q.append(tf(B((2.2, 1.8, 0.04), (x + 0.4, 0.3, 0.06), "barnacle"), rot=(0, -0.06, 1.2), pivot=(x, 0, 0)))
    q += [kit.torus("p", 0.42, 0.16, (x - 0.9, 0.6, 0.05), mat=M["navy"], major=12, minor=5),  # noqa: F821
          tf(B((3.4, 0.2, 0.2), (x + 0.5, -0.8, 0.08), "wood_dk"), rot=(0, 0, 0.3), pivot=(x, 0, 0))]
    node("net_tangle", q)
    x = X[0]
    # bell buoy: an old navigation buoy, cage and bell, still tolling in the swell
    q = [C(0.9, 1.0, (x, 0, 0.1), "rust", verts=12, r2=0.7), C(0.92, 0.18, (x, 0, 0.5), "rust_hi", verts=12),
         C(0.7, 0.1, (x, 0, 0.66), "rust_dark", verts=12)]
    for i in range(4):
        a = i / 4 * math.tau + 0.4
        q.append(beam((x + math.cos(a) * 0.6, math.sin(a) * 0.6, 0.66), (x + math.cos(a) * 0.2, math.sin(a) * 0.2, 2.6), 0.08, "rust_hi"))
    q += [C(0.3, 0.12, (x, 0, 2.62), "rust_dark", verts=10), C(0.24, 0.45, (x, 0, 1.75), "oxide", verts=10, r2=0.12),
          C(0.06, 0.25, (x, 0, 1.45), "gun", verts=6), C(0.11, 0.18, (x, 0, 2.8), "red_glow", verts=8)]
    node("bell_buoy", q)
    x = X[0]
    # capsized hull: a small boat floating keel-up, weed on the bottom, a rudder sticking up
    q = []
    for k in range(5):
        y0 = -2.2 + k * 0.9
        w = 1.0 * (1.0 if k < 3 else 0.75 - (k - 3) * 0.25)
        q.append(kit.prism("p", [(-w, 0.0), (w, 0.0), (w * 0.7, 0.55), (-w * 0.7, 0.55)], 0.92, loc=(x, y0, 0), axis="Y",  # noqa: F821
                           mat=M["wood_dk" if k % 2 else "tarp"]))
    q += [B((0.1, 4.4, 0.18), (x, -0.4, 0.62), "wood_deep"), B((0.08, 0.5, 0.7), (x, -2.6, 0.75), "wood_deep"),
          B((1.6, 2.2, 0.03), (x, -0.6, 0.57), "kelp")]
    node("hull_shard", q)
    meta({"ground": False, "nodes": {"root": "flotsam_kit", "raft": "barrel_raft", "net": "net_tangle", "bell": "bell_buoy", "hull": "hull_shard"},
          "origin": "each node: waterline centre"})


BUILDERS.update({f.__name__: f for f in (trawler_wreck, port_crane, flotsam_kit)})
BUILDERS[ASSET]()
for o in bpy.context.scene.objects:  # noqa: F821
    if o.type == "MESH":
        kit.bake_vertex_colors(o, M, jitter=0.06, seed=zlib.crc32(o.name.encode()) & 0xFFFF)  # noqa: F821
os.makedirs(os.path.join(OUT, "source"), exist_ok=True)
blend = os.path.join(OUT, "source", f"tb_{ASSET}.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)  # noqa: F821
tris = sum(len(p.vertices) - 2 for o in bpy.context.scene.objects if o.type == "MESH" for p in o.data.polygons)  # noqa: F821
print(json.dumps({"blend": blend, "tris": tris, "objects": len(bpy.context.scene.objects)}))  # noqa: F821
