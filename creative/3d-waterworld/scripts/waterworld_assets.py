"""TIDEBREAKERS: Waterworld art-direction kit, authored for GITCRAFT MeshCraft `run_script`.

    run_script {"path": ".../waterworld_assets.py",
                "args": {"asset": "atoll_kit", "out_dir": ".../creative/3d-waterworld/atoll_kit",
                         "palette": ".../creative/3d-waterworld/tidebreakers-waterworld-palette.json"}}

Assets:
  atoll_kit    fortified scrap-atoll structures: palisade wall (+ a burnt, previously-attacked variant), the gate,
               scaffold watchtower, freshwater tank, the giant salvaged propeller, stacked container homes
  outpost_kit  the small stuff settlements are built from: drum pontoon, rain catcher, net tower, market stall,
               a sinking abandoned platform, dead tree, scrap heap, salvage barge, a scavenger's scrap boat
  flora_kit    living plants by rarity (algae, seaweed, seedling tin, moss crate, potted green, flowering jar,
               fruiting drum, sapling cage) plus the protected greenhouse, the garden plot and the last tree

Conventions (same as creative/3d-drowned): metres, Blender Z-up, front faces -Y (=> +Z in three.js), origin =
waterline / ground contact at each node's centre. Every face is a palette role baked into the `Color` corner
attribute (glTF COLOR_0) for the game's vertex-colour toon material. Living plant roles are saturated greens
the game's weathering shader deliberately leaves unbleached: green means alive, and alive means valuable.
"""
import json, math, os, random, zlib
from mathutils import Matrix, Vector

A = args  # noqa: F821
PAL = Palette.from_file(A["palette"])  # noqa: F821
ASSET = A["asset"]
OUT = A["out_dir"]

ROLES = {
    "rust": "Rust", "rust_dark": "Rust Deep", "rust_hi": "Rust Orange", "oxide": "Oxide Teal",
    "gun": "Gunmetal", "steel": "Steel", "concrete": "Concrete", "concrete_dk": "Concrete Dark",
    "glass": "Window Glass", "tarp": "Tarp Blue", "tarp2": "Tarp Orange", "hazard": "Hazard Yellow",
    "red": "Signal Red", "wood": "Bleached Timber", "wood_dk": "Timber", "wood_deep": "Deep Timber",
    "cloth": "Sailcloth Cream", "kelp": "Kelp Green", "barnacle": "Barnacle", "navy": "Abyss Navy",
    "corr": "Corrugated", "paint": "Faded Paint", "char": "Char", "bronze": "Bronze", "net": "Net Dark",
    "tyre": "Tyre", "soil": "Soil", "algae": "Algae Olive",
    "leaf": "Living Green", "leaf_dk": "Leaf Deep", "leaf_hi": "Leaf Bright", "moss": "Moss",
    "bloom": "Bloom Yellow", "bloom_w": "Bloom White", "fruit": "Fruit Red",
}

kit.reset()  # noqa: F821
M = kit.Materials(PAL, ROLES, prefix="TBW")  # noqa: F821
M.add("lamp", "Window Lit", rough=0.3, emit=6.0)
M.add("red_glow", "Signal Red", rough=0.4, emit=4.0)
RNG = random.Random(zlib.crc32(ASSET.encode()))
RUSTS = ("rust", "rust_dark", "rust_hi", "oxide", "corr", "paint", "tarp", "gun")


# ----------------------------------------------------------------- helpers
def tf(o, rot=(0, 0, 0), pivot=(0, 0, 0), move=(0, 0, 0)):
    p = Vector(pivot)
    R = Matrix.Translation(p) @ (Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")) @ Matrix.Translation(-p)
    o.data.transform(Matrix.Translation(Vector(move)) @ R)
    o.data.update()
    return o


def B(size, loc, role, bevel=0.0, taper=0.0):
    return kit.box("p", size, loc, M[role], bevel=bevel, taper=taper)  # noqa: F821


def C(r, depth, loc, role, axis="Z", verts=10, r2=None):
    return kit.cylinder("p", r, depth, loc, axis=axis, verts=verts, mat=M[role], r2=r2)  # noqa: F821


def ball(r, loc, role, scale=(1, 1, 1), seed=0, wobble=0.18):
    return kit.ico("p", r, loc, M[role], sub=1, scale=scale, seed=seed, wobble=wobble)  # noqa: F821


def beam(a, b, t, role):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = B((t, t, d.length), (0, 0, 0), role)
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.data.transform(Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())
    o.data.update()
    return o


def sheet(x, y, z, w, h, role, rx=0.0, ry=0.0, rz=0.0, t=0.07):
    """A salvaged panel (corrugated sheet, hull plate, door) with a slight hand-hung skew."""
    return tf(B((w, t, h), (x, y, z), role), rot=(rx, ry, rz), pivot=(x, y, z))


def drum(x, y, z, role, lying=False, r=0.42, h=1.1):
    return C(r, h, (x, y, z), role, axis="X" if lying else "Z", verts=7)


ROOT = [None]
X = [0.0]


def node(name, parts, step):
    """Join parts built around (X[0], 0) into one node with its origin at its own centre."""
    o = kit.join(parts, name, parent=ROOT[0])  # noqa: F821
    kit.shade(o, None)  # noqa: F821
    x = X[0]
    o.data.transform(Matrix.Translation((-x, 0, 0)))
    o.location = (x, 0, 0)
    X[0] += step
    return o


def meta(contract, expect=None):
    s = bpy.context.scene  # noqa: F821
    brief = {"asset_id": f"tb_{ASSET}", "template": "run_script:waterworld_assets", "params": {"asset": ASSET},
             "palette": A["palette"], "material_prefix": "TBW", "out_dir": OUT}
    s["gitcraft_brief"] = json.dumps(brief)
    s["gitcraft_result"] = json.dumps({"contract": contract, "expect": expect or {}})
    s["gitcraft_template"] = "run_script:waterworld_assets"


def floats(x, w, d, z=0.25, roles=("rust", "oxide", "hazard", "tarp", "rust_dark")):
    """Mismatched drums under a platform: half-sunk, every one a different colour."""
    q = []
    nx, ny = max(2, int(w / 2.6)), max(2, int(d / 2.6))
    for ix in range(nx):
        for iy in range(ny):
            px = x - w / 2 + 0.9 + ix * (w - 1.8) / (nx - 1)
            py = -d / 2 + 0.9 + iy * (d - 1.8) / (ny - 1)
            q.append(drum(px, py, z, roles[(ix * 3 + iy) % len(roles)], lying=True, r=0.45, h=1.3))
    return q


def deck(x, w, d, z=0.85):
    """Mismatched planks + odd steel plates, laid by hand: some long, some short, a few missing."""
    q = [B((w, d, 0.18), (x, 0, z - 0.1), "wood_deep")]
    n = int(w / 0.8)
    for i in range(n):
        if RNG.random() < 0.06:
            continue
        role = RNG.choice(("wood", "wood", "wood_dk", "wood", "steel", "wood_dk", "paint"))
        q.append(B((0.74, d * RNG.uniform(0.86, 1.0), 0.07), (x - w / 2 + 0.4 + i * 0.8, RNG.uniform(-0.15, 0.15), z + 0.02), role))
    for _ in range(2):
        q.append(B((RNG.uniform(1.2, 2.2), RNG.uniform(1.0, 2.0), 0.05), (x + RNG.uniform(-w / 3, w / 3), RNG.uniform(-d / 3, d / 3), z + 0.07), RNG.choice(("rust", "oxide", "corr"))))
    return q


def shack(x, y, z, w, d, h, roof_role="rust_hi"):
    """A patchwork shack: every wall panel from somewhere else, a lean-to roof, a stovepipe, a lit gap."""
    q = []
    for side in (-1, 1):
        for k in range(int(w / 1.2) + 1):
            px = x - w / 2 + 0.6 + k * 1.2
            if px > x + w / 2:
                break
            q.append(sheet(px, y + side * d / 2, z + h / 2, 1.22, h * RNG.uniform(0.92, 1.0), RNG.choice(RUSTS), rz=RNG.uniform(-0.03, 0.03)))
        for k in range(int(d / 1.2) + 1):
            py = y - d / 2 + 0.6 + k * 1.2
            if py > y + d / 2:
                break
            q.append(sheet(x + side * w / 2, py, z + h / 2, 1.22, h * RNG.uniform(0.92, 1.0), RNG.choice(RUSTS), rz=math.pi / 2))
    q.append(B((0.9, 0.12, h * 0.75), (x - w * 0.2, y - d / 2 - 0.05, z + h * 0.37), "navy"))  # doorway
    q.append(B((0.7, 0.1, 0.4), (x + w * 0.25, y - d / 2 - 0.06, z + h * 0.7), "lamp"))  # lamp-lit gap
    q.append(sheet(x, y, z + h + 0.25, w + 0.8, d + 0.8, roof_role, rx=math.pi / 2 + 0.16, t=0.08))
    q.append(C(0.12, 1.6, (x + w * 0.3, y + d * 0.25, z + h + 0.9), "gun", verts=6))
    return q


# ================================================================= atoll kit
def atoll_kit():
    ROOT[0] = kit.empty("atoll_kit", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821

    def wall(burnt=False):
        q = []
        L, H = 16.0, 6.2
        x = X[0]
        q += floats(x, L, 3.0)
        q += deck(x, L, 3.0)
        # posts: pipe, I-beam, timber, a road sign pole, alternating
        for i in range(6):
            px = x - L / 2 + 0.4 + i * (L - 0.8) / 5
            role = ("steel", "rust_dark", "wood_deep", "gun", "rust", "wood_deep")[i]
            q.append(B((0.32, 0.32, H + 1.2), (px, 0.9, 0.9 + (H + 1.2) / 2), role))
            q.append(beam((px, 0.9, H * 0.6), (px, -0.7, 0.9), 0.16, "wood_deep"))  # back brace
        # cladding: sheets hung at slightly different heights and angles, never one material twice in a row
        k = 0
        sx = x - L / 2 + 0.7
        while sx < x + L / 2 - 0.4:
            w = RNG.uniform(1.1, 2.2)
            h = RNG.uniform(H * 0.75, H)
            role = RUSTS[k % len(RUSTS)] if not burnt or RNG.random() > 0.35 else "char"
            q.append(sheet(sx + w / 2, 1.15, 0.9 + h / 2, w, h, role, rz=RNG.uniform(-0.04, 0.04), ry=RNG.uniform(-0.05, 0.05)))
            if burnt and RNG.random() < 0.3:
                q.append(sheet(sx + w / 2, 1.08, 0.9 + h * RNG.uniform(0.4, 0.8), w * 0.5, 0.9, "navy"))  # a blown-through hole
            sx += w * 0.92
            k += 1
        # crude territorial marking: a hazard band and a painted red slash
        q.append(sheet(x - 3.0, 1.22, 0.9 + H * 0.55, 4.5, 0.55, "hazard"))
        q.append(sheet(x + 2.5, 1.22, 0.9 + H * 0.45, 0.45, 2.6, "red", ry=0.6))
        # spikes along the top: rebar, sharpened timber, broken pipe
        for i in range(10):
            px = x - L / 2 + 0.6 + i * (L - 1.2) / 9
            q.append(C(0.07, RNG.uniform(0.9, 1.6), (px, 1.15, 0.9 + H + 0.6), RNG.choice(("rust_dark", "wood_deep", "steel")), verts=5, r2=0.01))
        # fire step / walkway inside
        q.append(B((L - 0.6, 1.1, 0.12), (x, -0.1, 0.9 + H * 0.62), "wood"))
        if burnt:
            for _ in range(5):  # scorch blooms and a slumped sheet
                q.append(sheet(x + RNG.uniform(-L / 2.5, L / 2.5), 1.25, 0.9 + RNG.uniform(1, H - 1), RNG.uniform(0.8, 1.6), RNG.uniform(0.6, 1.4), "char"))
            q.append(sheet(x + 5.5, 2.0, 1.4, 2.2, 3.6, "rust_dark", rx=1.0))
        return q

    node("atoll_wall", wall(False), 22)
    node("atoll_wall_burnt", wall(True), 22)

    # the gate: two towers, a hoisted double gate of hull plate, a crane arm, signal lamps
    x = X[0]
    q = []
    q += floats(x, 18, 5)
    q += deck(x, 18, 5)
    for s in (-1, 1):
        tx = x + s * 6.6
        for dx in (-1.4, 1.4):
            for dy in (-1.4, 1.4):
                q.append(B((0.3, 0.3, 13), (tx + dx, dy, 7.4), "rust_dark"))
        for zz in (4.5, 8.5, 12.5):
            q.append(B((3.4, 3.4, 0.2), (tx, 0, zz), "wood_dk"))
            q.append(beam((tx - 1.4, -1.4, zz - 3.8), (tx + 1.4, -1.4, zz), 0.12, "rust"))
        for zz in range(3):
            for side in (-1, 1):
                q.append(sheet(tx, side * 1.55, 2.2 + zz * 4.0, 3.1, 3.4, RNG.choice(RUSTS)))
        q.append(sheet(tx, 0, 14.2, 4.2, 4.2, "rust_hi", rx=math.pi / 2 + 0.12))
        q.append(C(0.22, 0.3, (tx + 1.6 * s, -1.7, 12.9), "lamp", verts=8))
    # gate leaves (closed); horizontal hull plates on a timber frame
    for s in (-1, 1):
        for zz in range(6):
            q.append(B((4.8, 0.3, 1.25), (x + s * 2.45, 0.1 + 0.05 * (zz % 2), 1.6 + zz * 1.3), RUSTS[(zz + (s > 0)) % 6]))
        q.append(beam((x + s * 0.2, -0.15, 1.2), (x + s * 4.7, -0.15, 8.6), 0.22, "wood_deep"))
    q.append(B((10.5, 0.6, 0.6), (x, 0, 13.6), "gun"))  # lintel / hoist beam
    for s in (-1, 1):
        q.append(B((0.06, 0.06, 4.8), (x + s * 2.4, 0.1, 11.2), "steel"))  # hoist chains
    q.append(beam((x + 6.6, 0, 14.3), (x - 2, -6, 17.5), 0.28, "hazard"))  # crane arm over the water
    q.append(B((0.05, 0.05, 6.0), (x - 2, -6, 14.5), "steel"))
    q.append(B((1.3, 1.3, 0.8), (x - 2, -6, 11.2), "rust"))  # a load hanging off it
    q.append(sheet(x, -0.3, 11.6, 6.0, 1.3, "paint"))  # hand-painted name board
    for i in range(5):
        q.append(sheet(x - 2.2 + i * 1.1, -0.36, 11.6, 0.6, 0.8, ("red", "navy", "navy", "red", "navy")[i]))
    node("atoll_gate", q, 24)

    # scaffold watchtower: crow's nest, tarp windbreaks, ladder, searchlight, flag
    x = X[0]
    q = []
    q += floats(x, 5, 5)
    q += deck(x, 5, 5)
    for dx in (-1.3, 1.3):
        for dy in (-1.3, 1.3):
            q.append(beam((x + dx * 1.25, dy * 1.25, 0.9), (x + dx * 0.8, dy * 0.8, 11.0), 0.2, "rust_dark"))
    for zz in (3.5, 6.5, 9.5):
        w = 2.4 + (11 - zz) * 0.09
        for k in range(4):
            a = k * math.pi / 2
            q.append(beam((x + math.cos(a) * w / 2 - math.sin(a) * w / 2, math.sin(a) * w / 2 + math.cos(a) * w / 2, zz),
                          (x + math.cos(a) * w / 2 + math.sin(a) * w / 2, math.sin(a) * w / 2 - math.cos(a) * w / 2, zz + 1.4), 0.09, "steel"))
    q.append(B((3.4, 3.4, 0.2), (x, 0, 11.0), "wood"))
    for k, role in enumerate(("tarp", "corr", "tarp2", "rust")):
        a = k * math.pi / 2
        q.append(tf(B((3.3, 0.07, 1.2), (x + math.sin(a) * 1.65, -math.cos(a) * 1.65, 11.7), role), rot=(0, 0, a), pivot=(x + math.sin(a) * 1.65, -math.cos(a) * 1.65, 11.7)))
    for dx in (-1.5, 1.5):
        for dy in (-1.5, 1.5):
            q.append(B((0.12, 0.12, 2.2), (x + dx, dy, 12.2), "wood_deep"))
    q.append(sheet(x, 0, 13.45, 4.2, 4.0, "rust_hi", rx=math.pi / 2 - 0.14))
    q.append(C(0.35, 0.55, (x + 1.2, -1.75, 12.7), "gun", axis="Y", verts=10))
    q.append(C(0.28, 0.08, (x + 1.2, -2.05, 12.7), "lamp", axis="Y", verts=10))
    for i in range(16):  # ladder
        q.append(B((0.7, 0.06, 0.06), (x - 0.2, -1.95, 1.4 + i * 0.62), "steel"))
    for s in (-1, 1):
        q.append(B((0.06, 0.06, 10.2), (x - 0.2 + s * 0.35, -1.95, 6.0), "steel"))
    q.append(C(0.05, 4.0, (x - 1.4, 1.4, 15.0), "wood_deep", verts=5))
    q.append(tf(B((1.6, 0.04, 1.0), (x - 0.6, 1.4, 16.4), "red"), rot=(0, 0, 0.1), pivot=(x - 1.4, 1.4, 16.4)))
    node("watchtower", q, 10)

    # the freshwater tank: the thing a settlement would die defending
    x = X[0]
    q = []
    q += floats(x, 9, 9)
    q += deck(x, 9, 9)
    for k in range(6):
        a = k * math.tau / 6
        q.append(beam((x + math.cos(a) * 3.6, math.sin(a) * 3.6, 0.9), (x + math.cos(a) * 2.9, math.sin(a) * 2.9, 6.0), 0.26, "rust_dark"))
        q.append(beam((x + math.cos(a) * 3.3, math.sin(a) * 3.3, 3.2), (x + math.cos(a + 1.05) * 3.3, math.sin(a + 1.05) * 3.3, 3.2), 0.12, "steel"))
    q.append(C(3.3, 0.3, (x, 0, 6.1), "gun", verts=16))
    q.append(C(3.1, 5.6, (x, 0, 9.0), "oxide", verts=16))
    for zz in (7.0, 9.0, 11.0):
        q.append(C(3.16, 0.14, (x, 0, zz), "rust_dark", verts=16))  # weld seams
    for _ in range(7):  # patched plates
        a = RNG.uniform(0, math.tau)
        zz = RNG.uniform(6.8, 11.2)
        q.append(tf(B((RNG.uniform(0.9, 1.6), 0.08, RNG.uniform(0.7, 1.3)), (x + math.cos(a) * 3.14, math.sin(a) * 3.14, zz), RNG.choice(("rust", "rust_hi", "corr", "paint"))),
                    rot=(0, 0, a + math.pi / 2), pivot=(x + math.cos(a) * 3.14, math.sin(a) * 3.14, zz)))
    q.append(C(3.3, 1.2, (x, 0, 12.4), "rust", verts=16, r2=0.6))  # conical lid
    q.append(B((3.2, 0.1, 0.7), (x, -3.12, 9.4), "bloom_w"))  # painted water mark band
    q.append(B((1.1, 0.12, 0.5), (x - 0.4, -3.18, 9.4), "tarp"))
    q.append(C(0.18, 6.0, (x + 2.6, -2.2, 3.4), "steel", verts=6))  # down pipe + tap
    q.append(C(0.22, 0.6, (x + 2.6, -2.5, 1.4), "bronze", axis="Y", verts=6))
    for i in range(4):
        q.append(drum(x + 1.2 + i * 0.95, -3.6, 1.45, ("tarp", "oxide", "tarp", "hazard")[i]))
    q.append(tf(B((5.5, 4.0, 0.06), (x - 2.5, 3.3, 3.5), "tarp"), rot=(0.25, 0, 0.1), pivot=(x - 2.5, 3.3, 3.5)))
    for i in range(18):
        q.append(B((0.6, 0.05, 0.05), (x - 0.6, -3.35, 1.3 + i * 0.6), "steel"))
    node("water_tank", q, 14)

    # the propeller: a supertanker's screw, hauled up and stood on end; a shack lives on the hub
    x = X[0]
    q = []
    q += floats(x, 12, 6)
    q += deck(x, 12, 6)
    hub = (x, 0.6, 7.2)
    q.append(C(1.5, 2.4, hub, "bronze", axis="Y", verts=14))
    q.append(C(1.0, 1.0, (x, -0.9, 7.2), "bronze", axis="Y", verts=12, r2=0.3))
    for k in range(4):
        a = k * math.pi / 2 + 0.35
        bl = kit.prism("p", [(-0.9, 0.0), (0.9, 0.0), (1.4, 3.2), (0.6, 5.6), (-0.7, 5.2), (-1.3, 2.8)], 0.35, loc=(0, 0, 0), axis="Y", mat=M["bronze"])  # noqa: F821
        bl.data.transform(Matrix.Translation(Vector(hub)) @ Matrix.Rotation(a, 4, "Y") @ Matrix.Rotation(0.3, 4, "Z"))
        q.append(bl)
    for _ in range(6):  # verdigris and rust blooms on the bronze
        a = RNG.uniform(0, math.tau)
        r = RNG.uniform(2, 5)
        q.append(ball(0.35, (x + math.cos(a) * r, 0.75, 7.2 + math.sin(a) * r), RNG.choice(("oxide", "rust")), scale=(1.4, 0.3, 1), seed=RNG.randint(0, 99)))
    q.append(B((3.2, 0.9, 3.6), (x, 0.6, 2.7), "concrete_dk"))  # the plinth it stands in
    q.append(B((3.4, 2.6, 0.2), (x, 1.2, 9.0), "wood"))  # hub platform
    q += shack(x, 1.3, 9.1, 2.6, 2.0, 2.0, "tarp2")
    for i in range(12):
        q.append(B((0.6, 0.05, 0.05), (x + 1.9, 2.0, 1.3 + i * 0.66), "steel"))
    node("propeller", q, 16)

    # stacked container homes: windows cut with a torch, ladders, an awning and a dish
    x = X[0]
    q = []
    q += floats(x, 12, 7)
    q += deck(x, 12, 7)
    cont = [(-0.4, 0, 0.9, "rust", 0.0), (0.6, 0.2, 3.5, "oxide", 0.1), (-1.0, -0.3, 6.1, "paint", -0.12)]
    for dx, dy, zz, role, rz in cont:
        c = [B((10.4, 2.5, 2.6), (x + dx, dy, zz + 1.3), role)]
        for i in range(10):
            c.append(B((0.12, 2.56, 2.3), (x + dx - 4.8 + i * 1.06, dy, zz + 1.3), "rust_dark" if role != "rust" else "rust_hi"))
        c.append(B((0.9, 0.12, 0.7), (x + dx - 2.5, dy - 1.3, zz + 1.6), "navy"))
        c.append(B((0.9, 0.12, 0.7), (x + dx + 1.5, dy - 1.3, zz + 1.6), "lamp" if zz > 3 else "navy"))
        c.append(B((0.12, 2.3, 2.3), (x + dx + 5.22, dy, zz + 1.3), "gun"))
        for cc in c:
            tf(cc, rot=(0, 0, rz), pivot=(x, 0, zz))
        q += c
    q.append(tf(B((4.5, 2.4, 0.06), (x + 0.5, -2.3, 3.3), "tarp2"), rot=(0.35, 0, 0), pivot=(x + 0.5, -1.2, 3.5)))
    for i in range(9):
        q.append(B((0.6, 0.05, 0.05), (x - 5.3, -1.0, 1.2 + i * 0.6), "steel"))
    q.append(C(0.7, 0.12, (x + 2.8, 0.4, 9.0), "corr", axis="Y", verts=12, r2=0.1))  # dead satellite dish
    q.append(C(0.06, 0.8, (x + 2.8, 0.6, 8.5), "steel", verts=5))
    q.append(C(0.12, 1.8, (x - 3.2, 0.5, 9.5), "gun", verts=6))
    q.append(B((0.05, 6.0, 0.05), (x + 1, -2.6, 6.0), "net"))  # washing line
    for i in range(4):
        q.append(B((0.5, 0.04, 0.6), (x + 1, -4.8 + i * 1.3, 5.6), ("cloth", "tarp", "paint", "red")[i]))
    node("container_home", q, 16)

    meta({"ground": False, "nodes": {"root": "atoll_kit", "wall": "atoll_wall", "wall_burnt": "atoll_wall_burnt", "gate": "atoll_gate",
                                     "tower": "watchtower", "tank": "water_tank", "propeller": "propeller", "homes": "container_home"},
          "origin": "each node: platform centre at the waterline"})


# ================================================================= outpost kit
def outpost_kit():
    ROOT[0] = kit.empty("outpost_kit", (0, 0, 0), kind="ARROWS", size=1)  # noqa: F821

    x = X[0]  # pontoon: the base of every small outpost
    q = floats(x, 10, 8) + deck(x, 10, 8)
    for px, py in ((-4.7, -3.7), (4.7, -3.7), (-4.7, 3.7), (4.7, 3.7)):
        q.append(C(0.18, 1.4, (x + px, py, 1.4), "wood_deep", verts=6))  # mooring posts
        q.append(C(0.24, 0.25, (x + px, py, 1.1), "tyre", verts=8))
    q.append(C(0.7, 0.3, (x + 3.5, 2.6, 1.05), "tyre", verts=10))  # tyre fender
    node("pontoon", q, 14)

    x = X[0]  # rain catcher: a tarp funnel over a cluster of drums
    q = floats(x, 6, 6) + deck(x, 6, 6)
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        q.append(B((0.14, 0.14, 4.4), (x + math.cos(a) * 2.4, math.sin(a) * 2.4, 3.1), "wood_deep"))
    q.append(C(2.9, 1.2, (x, 0, 4.8), "tarp", verts=8, r2=0.35))
    q.append(C(2.95, 0.12, (x, 0, 5.4), "rust_dark", verts=8))
    q.append(C(0.18, 2.4, (x, 0, 3.0), "steel", verts=6))
    for i, (dx, dy) in enumerate(((0, 0), (0.95, 0.2), (-0.9, 0.3), (0.3, -0.9), (-0.5, -0.85), (0.6, 0.95))):
        q.append(drum(x + dx, dy, 1.45, ("tarp", "oxide", "hazard", "tarp", "rust", "paint")[i]))
    node("rain_catcher", q, 10)

    x = X[0]  # net tower: tripod of salvaged poles, cross arms, nets hung to dry, floats
    q = floats(x, 5, 5) + deck(x, 5, 5)
    for k in range(3):
        a = k * math.tau / 3
        q.append(beam((x + math.cos(a) * 2.0, math.sin(a) * 2.0, 0.9), (x, 0, 9.5), 0.18, ("wood_deep", "rust_dark", "steel")[k]))
    for zz, w in ((8.6, 5.0), (6.4, 6.0)):
        q.append(B((w, 0.14, 0.14), (x, 0, zz), "wood_deep"))
        for s in (-1, 1):
            n = B((1.8, 0.04, zz - 2.0), (x + s * (w / 2 - 1.0), 0.0, (zz + 1.6) / 2 + 0.4), "net")
            q.append(tf(n, rot=(0, s * 0.05, 0), pivot=(x + s * (w / 2 - 1.0), 0, zz)))
            for i in range(3):
                q.append(ball(0.16, (x + s * (w / 2 - 1.6 + i * 0.6), -0.05, 1.8 + i * 0.3), ("hazard", "red", "tarp2")[i], seed=i))
    q.append(B((1.2, 0.04, 2.4), (x + 0.6, 0.4, 4.6), "kelp"))  # weed caught in the mesh
    node("net_tower", q, 9)

    x = X[0]  # market stall: patchwork awning, fish hanging, jugs of water, hand-painted board
    q = floats(x, 7, 6) + deck(x, 7, 6)
    for px in (-3, 3):
        for py in (-2.4, 2.4):
            q.append(B((0.14, 0.14, 3.2), (x + px, py, 2.5), "wood_deep"))
    for i in range(5):
        q.append(sheet(x - 2.4 + i * 1.2, 0, 4.2, 1.25, 5.2, ("tarp", "cloth", "tarp2", "paint", "red")[i], rx=math.pi / 2 + 0.12))
    q.append(B((5.6, 1.2, 1.0), (x, -1.6, 1.5), "wood_dk"))
    for i in range(5):
        q.append(C(0.22, 0.5, (x - 2 + i * 0.95, -1.6, 2.25), ("cloth", "tarp", "cloth", "oxide", "cloth")[i], verts=8))  # water jugs
    for i in range(5):
        q.append(ball(0.18, (x - 1.8 + i * 0.9, -2.3, 3.0), "steel", scale=(0.5, 0.25, 1.7), seed=i))  # drying fish
    q.append(B((5.6, 0.04, 0.04), (x, -2.3, 3.6), "net"))
    for i in range(3):
        q.append(B((0.8, 0.8, 0.8), (x - 1.8 + i * 1.6, 1.6, 1.4), ("wood", "rust", "wood_dk")[i]))
    q.append(sheet(x, -2.5, 3.95, 3.4, 0.6, "paint", rx=-0.15))
    node("market_stall", q, 11)

    x = X[0]  # sinking platform: abandoned, listing, half under; the story of a settlement that lost
    q = []
    p = floats(x, 9, 7, z=0.0) + deck(x, 9, 7, z=0.6) + shack(x - 1, 0.5, 0.65, 3.6, 3.0, 2.4, "corr")
    p.append(beam((x + 3.5, 2.5, 0.6), (x + 4.2, 3.0, 6.5), 0.2, "wood_deep"))
    p.append(tf(B((1.5, 0.04, 0.9), (x + 4.9, 3.0, 6.0), "cloth"), rot=(0, 0.3, 0), pivot=(x + 4.2, 3.0, 6.0)))  # rag of a flag
    for o in p:
        tf(o, rot=(0.24, -0.16, 0.1), pivot=(x, 0, 0), move=(0, 0, -1.3))
    q += p
    for _ in range(4):
        q.append(B((RNG.uniform(1.2, 2.6), 0.3, 0.08), (x + RNG.uniform(-6, 6), RNG.uniform(-6, 6), 0.05), RNG.choice(("wood", "wood_dk"))))
    q.append(drum(x - 5.5, -3.5, 0.1, "rust", lying=True))
    node("sinking_platform", q, 14)

    x = X[0]  # dead tree: a bleached trunk, broken limbs, nothing green for a generation
    q = [C(0.42, 6.0, (x, 0, 3.0), "barnacle", verts=7, r2=0.18)]
    for i, (zz, a, L) in enumerate(((3.2, 0.4, 2.4), (4.4, 2.6, 1.9), (5.2, 4.6, 1.5), (2.4, 3.8, 1.2))):
        q.append(beam((x, 0, zz), (x + math.cos(a) * L, math.sin(a) * L, zz + L * 0.7), 0.16, "barnacle"))
        q.append(beam((x + math.cos(a) * L, math.sin(a) * L, zz + L * 0.7), (x + math.cos(a + 0.5) * L * 1.3, math.sin(a + 0.5) * L * 1.3, zz + L * 1.1), 0.08, "wood"))
    for k in range(5):
        a = k * math.tau / 5
        q.append(beam((x, 0, 0.4), (x + math.cos(a) * 1.4, math.sin(a) * 1.4, -0.2), 0.18, "wood"))  # exposed roots
    node("dead_tree", q, 7)

    x = X[0]  # scrap heap: tyres, panels, drums, a fridge door, a car bonnet
    q = []
    for i in range(5):
        q.append(C(0.5, 0.28, (x + RNG.uniform(-1.5, 1.5), RNG.uniform(-1.2, 1.2), 0.15 + i * 0.22), "tyre", verts=10))
    for _ in range(6):
        q.append(sheet(x + RNG.uniform(-1.6, 1.6), RNG.uniform(-1.4, 1.4), RNG.uniform(0.4, 1.2), RNG.uniform(0.8, 1.6), RNG.uniform(0.6, 1.3),
                       RNG.choice(RUSTS), rx=RNG.uniform(0.6, 1.4), rz=RNG.uniform(0, 3)))
    q.append(drum(x + 1.2, 0.9, 0.45, "rust", lying=True))
    q.append(drum(x - 1.3, -0.6, 0.55, "tarp"))
    q.append(B((0.8, 0.12, 1.6), (x - 0.4, 1.3, 0.9), "bloom_w"))
    node("scrap_heap", q, 7)

    x = X[0]  # salvage barge: a flat hull with a derrick crane, cutting a wreck apart for parts
    q = []
    q.append(kit.prism("p", [(-3.2, -0.6), (3.2, -0.6), (3.6, 0.9), (-3.6, 0.9)], 12, loc=(x, 0, 0), axis="Y", mat=M["rust_dark"]))  # noqa: F821
    q.append(B((7.0, 11.6, 0.15), (x, 0, 0.95), "steel"))
    for _ in range(4):
        q.append(B((RNG.uniform(1, 2.2), RNG.uniform(1, 2.2), 0.06), (x + RNG.uniform(-2.5, 2.5), RNG.uniform(-5, 5), 1.05), RNG.choice(("rust", "oxide", "corr"))))
    q += lattice_mast(x - 2.0, 3.5, 1.0, 9.0)
    q.append(beam((x - 2.0, 3.5, 9.5), (x + 6.5, -2.5, 11.0), 0.25, "hazard"))
    q.append(B((0.05, 0.05, 7.0), (x + 6.5, -2.5, 7.5), "steel"))
    q.append(sheet(x + 6.5, -2.5, 3.8, 2.4, 1.6, "rust", rx=0.4))  # a hull plate coming up
    q.append(B((2.4, 2.0, 1.6), (x + 1.5, 4.5, 1.8), "gun"))  # winch house
    q.append(C(0.55, 1.6, (x + 1.5, 3.2, 1.8), "rust_hi", axis="X", verts=10))
    for i in range(6):  # stripped plates stacked on deck
        q.append(B((2.2, 1.4, 0.12), (x - 1.5, -3.5, 1.1 + i * 0.14), RNG.choice(("rust", "rust_dark", "rust_hi"))))
    q.append(C(0.14, 0.12, (x - 2.0, 3.5, 10.4), "lamp", verts=8))
    node("salvage_barge", q, 14)

    x = X[0]  # scrap boat: a scavenger's patched hull, outboard, tarp shelter, tyre fenders, cargo lashed down
    q = []
    n = 6
    for i in range(n):
        u0 = i / n
        y0 = -3.2 + u0 * 6.4
        w = 1.2 * (1.0 if u0 < 0.6 else 1.0 - (u0 - 0.6) * 1.6)
        q.append(kit.prism("p", [(-w * 0.55, -0.4), (w * 0.55, -0.4), (w, 0.55), (-w, 0.55)], 6.4 / n, loc=(x, y0 + 0.53, 0.1), axis="Y",  # noqa: F821
                           mat=M[("oxide", "rust", "oxide", "paint", "rust_hi", "oxide")[i]]))
    q.append(B((2.2, 5.0, 0.08), (x, -0.4, 0.55), "wood_dk"))
    q.append(B((0.5, 0.5, 0.9), (x, -3.5, 0.5), "gun"))  # outboard
    q.append(C(0.1, 0.9, (x, -3.6, -0.1), "steel", verts=6))
    q.append(tf(B((2.0, 2.4, 0.05), (x, -1.2, 1.8), "tarp"), rot=(0, 0.25, 0), pivot=(x, -1.2, 1.8)))
    for px in (-0.9, 0.9):
        q.append(B((0.07, 0.07, 1.4), (x + px, -1.2, 1.1), "wood_deep"))
    for s in (-1, 1):
        q.append(C(0.28, 0.2, (x + s * 1.2, 0.4, 0.4), "tyre", axis="X", verts=8))
    q.append(drum(x + 0.4, 1.4, 0.9, "rust"))
    q.append(B((0.7, 0.7, 0.5), (x - 0.4, 1.2, 0.8), "wood"))
    q.append(C(0.05, 3.2, (x, 2.0, 2.1), "wood_deep", verts=5))
    q.append(tf(B((0.04, 1.3, 2.0), (x, 1.3, 2.6), "cloth"), rot=(0, 0, 0.1), pivot=(x, 2.0, 2.6)))  # patched scrap of sail
    q.append(B((0.05, 0.5, 0.5), (x + 0.02, 1.1, 2.8), "tarp2"))
    node("scrap_boat", q, 6)

    meta({"ground": False, "nodes": {"root": "outpost_kit", "pontoon": "pontoon", "rain": "rain_catcher", "nets": "net_tower", "market": "market_stall",
                                     "sinking": "sinking_platform", "tree": "dead_tree", "heap": "scrap_heap", "barge": "salvage_barge", "boat": "scrap_boat"},
          "origin": "each node: waterline / ground centre"})


def lattice_mast(x, y, z0, h):
    q = []
    w = 1.0
    for dx in (-w / 2, w / 2):
        for dy in (-w / 2, w / 2):
            q.append(B((0.12, 0.12, h), (x + dx, y + dy, z0 + h / 2), "rust_hi"))
    for i in range(4):
        zz = z0 + i * h / 4
        q.append(beam((x - w / 2, y - w / 2, zz), (x + w / 2, y - w / 2, zz + h / 4), 0.06, "rust"))
        q.append(beam((x - w / 2, y + w / 2, zz + h / 4), (x + w / 2, y + w / 2, zz), 0.06, "rust"))
    return q


# ================================================================= flora kit
def leaves(cx, cy, cz, n, size, roles=("leaf", "leaf_dk", "leaf_hi"), spread=0.25, seed=0):
    rr = random.Random(seed)
    q = []
    for i in range(n):
        a = rr.uniform(0, math.tau)
        d = rr.uniform(0, spread)
        q.append(ball(size * rr.uniform(0.7, 1.15), (cx + math.cos(a) * d, cy + math.sin(a) * d, cz + rr.uniform(-size * 0.3, size * 0.6)),
                      roles[i % len(roles)], scale=(1.2, 1.2, 0.7), seed=seed * 10 + i, wobble=0.25))
    return q


def flora_kit():
    ROOT[0] = kit.empty("flora_kit", (0, 0, 0), kind="ARROWS", size=0.5)  # noqa: F821

    # COMMON: algae mat (floats), seaweed bundle on driftwood
    x = X[0]
    q = [ball(0.9, (x, 0, 0.02), "algae", scale=(1.3, 1.0, 0.08), seed=1, wobble=0.3)]
    for i in range(5):
        q.append(ball(0.22, (x + math.cos(i * 1.3) * 0.6, math.sin(i * 1.3) * 0.5, 0.06), "moss" if i % 2 else "kelp", scale=(1.2, 1.0, 0.25), seed=i))
    node("flora_algae", q, 3)
    x = X[0]
    q = [C(0.12, 1.6, (x, 0, 0.12), "wood", axis="X", verts=6)]
    for i in range(6):
        a = -0.6 + i * 0.25
        q.append(tf(B((0.12, 0.03, 0.9), (x - 0.5 + i * 0.2, 0.1, 0.45), "kelp" if i % 2 else "moss"), rot=(0.9 + a * 0.3, 0, a), pivot=(x - 0.5 + i * 0.2, 0, 0.12)))
    node("flora_seaweed", q, 3)

    # UNCOMMON: seedling in a tin can; moss cushion in a split crate
    x = X[0]
    q = [C(0.16, 0.26, (x, 0, 0.13), "steel", verts=10), C(0.165, 0.06, (x, 0, 0.17), "red", verts=10), C(0.15, 0.03, (x, 0, 0.25), "soil", verts=10),
         C(0.012, 0.14, (x, 0, 0.32), "leaf_dk", verts=4)]
    for s in (-1, 1):
        q.append(tf(ball(0.07, (x + s * 0.06, 0, 0.4), "leaf_hi", scale=(1.4, 0.7, 0.35), seed=s + 2), rot=(0, s * 0.4, 0), pivot=(x, 0, 0.38)))
    node("flora_seedling", q, 2)
    x = X[0]
    q = [B((0.9, 0.7, 0.08), (x, 0, 0.04), "wood_dk")]
    for s in (-1, 1):
        q.append(B((0.9, 0.06, 0.32), (x, s * 0.34, 0.2), "wood"))
        q.append(B((0.06, 0.7, 0.28), (x + s * 0.44, 0, 0.18), "wood_dk"))
    q.append(ball(0.36, (x, 0, 0.3), "moss", scale=(1.1, 0.85, 0.35), seed=5, wobble=0.3))
    q.append(ball(0.18, (x + 0.2, 0.1, 0.38), "leaf_hi", scale=(1, 1, 0.4), seed=6))
    node("flora_moss", q, 2.5)

    # RARE: healthy potted green; flowering plant under a glass cloche; fruiting tomato in a drum
    x = X[0]
    q = [C(0.32, 0.5, (x, 0, 0.25), "tarp", verts=10, r2=0.26), C(0.33, 0.05, (x, 0, 0.5), "steel", verts=10), C(0.3, 0.04, (x, 0, 0.47), "soil", verts=10),
         C(0.03, 0.4, (x, 0, 0.66), "leaf_dk", verts=5)]
    q += leaves(x, 0, 0.95, 6, 0.24, seed=7)
    node("flora_potted", q, 2.5)
    x = X[0]
    q = [C(0.42, 0.14, (x, 0, 0.07), "wood_dk", verts=10), C(0.35, 0.05, (x, 0, 0.16), "soil", verts=10), C(0.025, 0.42, (x, 0, 0.38), "leaf_dk", verts=5)]
    q += leaves(x, 0, 0.5, 4, 0.13, seed=8)
    for i in range(5):
        a = i * math.tau / 5
        q.append(ball(0.07, (x + math.cos(a) * 0.14, math.sin(a) * 0.14, 0.66 + (i % 2) * 0.05), "bloom" if i % 2 else "bloom_w", scale=(1, 1, 0.5), seed=20 + i))
    q.append(ball(0.04, (x, 0, 0.7), "rust_hi", seed=30))
    q.append(C(0.36, 0.7, (x, 0, 0.5), "glass", verts=10))  # glass cloche (the jar it lives in)
    q.append(ball(0.36, (x, 0, 0.85), "glass", scale=(1, 1, 0.6), seed=31, wobble=0.0))
    q.append(C(0.06, 0.08, (x, 0, 1.08), "steel", verts=6))
    node("flora_flowering", q, 2.5)
    x = X[0]
    q = [C(0.45, 0.85, (x, 0, 0.42), "rust", verts=12), C(0.47, 0.06, (x, 0, 0.86), "rust_dark", verts=12), C(0.43, 0.04, (x, 0, 0.83), "soil", verts=12)]
    for a in (0, 2.1, 4.2):
        q.append(beam((x + math.cos(a) * 0.3, math.sin(a) * 0.3, 0.85), (x + math.cos(a) * 0.05, math.sin(a) * 0.05, 2.0), 0.035, "wood"))
    q += leaves(x, 0, 1.25, 7, 0.22, spread=0.22, seed=9)
    q += leaves(x, 0, 1.7, 4, 0.18, spread=0.15, seed=10)
    for i in range(6):
        a = i * 1.1
        q.append(ball(0.075, (x + math.cos(a) * 0.3, math.sin(a) * 0.3, 1.15 + (i % 3) * 0.2), "fruit", seed=40 + i, wobble=0.05))
    node("flora_fruit", q, 3)

    # LEGENDARY (collectible): a sapling in a sealed planter inside a wire cage
    x = X[0]
    q = [B((0.9, 0.9, 0.6), (x, 0, 0.3), "oxide"), B((0.95, 0.95, 0.06), (x, 0, 0.62), "rust_dark"), B((0.82, 0.82, 0.04), (x, 0, 0.6), "soil"),
         C(0.05, 1.1, (x, 0, 1.15), "wood_dk", verts=6)]
    for zz, a in ((1.15, 0.6), (1.35, 2.6), (1.55, 4.4)):
        q.append(beam((x, 0, zz), (x + math.cos(a) * 0.35, math.sin(a) * 0.35, zz + 0.25), 0.03, "wood_dk"))
    q += leaves(x, 0, 1.7, 8, 0.24, spread=0.28, seed=11)
    for dx in (-0.45, 0.45):
        for dy in (-0.45, 0.45):
            q.append(B((0.03, 0.03, 1.7), (x + dx, dy, 1.45), "steel"))
    for zz in (0.95, 1.6, 2.25):
        for s in (-1, 1):
            q.append(B((0.92, 0.02, 0.02), (x, s * 0.45, zz), "steel"))
            q.append(B((0.02, 0.92, 0.02), (x + s * 0.45, 0, zz), "steel"))
    node("flora_sapling", q, 3)

    # The protected greenhouse: salvaged window panes on a pipe frame, beds of green inside, a padlocked door
    x = X[0]
    q = [B((6.4, 4.4, 0.25), (x, 0, 0.12), "concrete_dk")]
    for i in range(3):
        q.append(B((5.4, 0.9, 0.45), (x, -1.4 + i * 1.4, 0.45), "wood_dk"))
        q.append(B((5.2, 0.8, 0.06), (x, -1.4 + i * 1.4, 0.68), "soil"))
        for k in range(7):
            q += leaves(x - 2.3 + k * 0.76, -1.4 + i * 1.4, 0.9, 2, 0.2, spread=0.12, seed=100 + i * 10 + k)
            if (i + k) % 3 == 0:
                q.append(ball(0.07, (x - 2.3 + k * 0.76 + 0.12, -1.4 + i * 1.4 - 0.1, 1.0), "fruit", seed=200 + i * 10 + k, wobble=0.05))
    for px in (-3.1, -1.55, 0, 1.55, 3.1):
        for py in (-2.1, 2.1):
            q.append(B((0.08, 0.08, 2.4), (x + px, py, 1.45), "steel"))
        q.append(beam((x + px, -2.1, 2.6), (x + px, 0, 3.5), 0.08, "steel"))
        q.append(beam((x + px, 2.1, 2.6), (x + px, 0, 3.5), 0.08, "steel"))
    for side in (-1, 1):
        for k in range(4):
            px = x - 2.3 + k * 1.55
            role = "glass" if RNG.random() > 0.18 else "tarp"  # a pane replaced with tarp
            q.append(B((1.45, 0.04, 2.1), (px, side * 2.1, 1.45), role))
            q.append(tf(B((1.45, 2.3, 0.04), (px, side * 1.05, 3.05), "glass"), rot=(side * -0.41, 0, 0), pivot=(px, side * 1.05, 3.05)))
    for side in (-1, 1):
        q.append(B((0.04, 4.1, 2.1), (x + side * 3.1, 0, 1.45), "glass"))
    q.append(B((0.9, 0.06, 1.9), (x - 3.15, -0.3, 1.2), "rust_hi"))  # the door
    q.append(B((0.12, 0.1, 0.16), (x - 3.2, -0.65, 1.3), "bronze"))  # padlock
    q.append(C(0.5, 1.0, (x + 3.6, 1.4, 0.6), "tarp", verts=10))  # its own water barrel
    q.append(C(0.06, 2.6, (x + 3.6, 1.4, 2.2), "steel", verts=6))
    node("greenhouse", q, 10)

    # The garden plot: a walled bed of green, irrigation pipe, a scarecrow made of scrap
    x = X[0]
    q = []
    for s in (-1, 1):
        q.append(B((6.4, 0.3, 0.8), (x, s * 2.2, 0.4), RNG.choice(("rust", "corr", "wood_dk"))))
        q.append(B((0.3, 4.4, 0.8), (x + s * 3.2, 0, 0.4), RNG.choice(("rust", "oxide", "wood_dk"))))
    q.append(B((6.1, 4.1, 0.5), (x, 0, 0.25), "soil"))
    for i in range(4):
        for k in range(8):
            q += leaves(x - 2.6 + k * 0.74, -1.5 + i * 1.0, 0.65, 1, 0.22, spread=0.05, seed=300 + i * 10 + k)
    q.append(C(0.06, 6.2, (x, 2.0, 0.85), "steel", axis="X", verts=6))
    q.append(C(0.05, 2.0, (x + 2.8, -2.6, 1.0), "wood_deep", verts=5))
    q.append(B((1.2, 0.08, 0.08), (x + 2.8, -2.6, 1.6), "wood_deep"))
    q.append(B((0.6, 0.3, 0.7), (x + 2.8, -2.6, 1.4), "tarp2"))
    q.append(ball(0.2, (x + 2.8, -2.6, 2.0), "corr", seed=3))
    node("garden_plot", q, 9)

    # The last tree: a mature canopy in a scrap-walled raised planter; you can see it from the water
    x = X[0]
    q = []
    for k in range(8):
        a = k * math.tau / 8
        q.append(tf(B((2.4, 0.3, 1.4), (x + math.cos(a) * 2.6, math.sin(a) * 2.6, 0.7), RUSTS[k % 6]), rot=(0, 0, a + math.pi / 2),
                    pivot=(x + math.cos(a) * 2.6, math.sin(a) * 2.6, 0.7)))
    q.append(C(2.6, 1.2, (x, 0, 0.6), "soil", verts=8))
    q.append(C(0.45, 5.0, (x, 0, 3.4), "wood_deep", verts=8, r2=0.28))
    for zz, a, L in ((4.2, 0.5, 2.2), (4.8, 2.7, 2.0), (5.2, 4.6, 1.8), (3.8, 3.6, 1.6)):
        q.append(beam((x, 0, zz), (x + math.cos(a) * L, math.sin(a) * L, zz + 1.2), 0.2, "wood_deep"))
    q += leaves(x, 0, 6.4, 9, 1.35, spread=1.8, seed=12)
    q += leaves(x, 0, 7.6, 4, 1.1, spread=0.9, seed=13)
    for i in range(7):
        a = i * 0.9
        q.append(ball(0.14, (x + math.cos(a) * 1.9, math.sin(a) * 1.9, 5.8 + (i % 3) * 0.5), "bloom", seed=60 + i, wobble=0.05))  # lemons
    q.append(C(0.07, 2.0, (x + 2.9, -1.0, 2.1), "steel", verts=5))  # a lantern pole: someone keeps watch
    q.append(C(0.14, 0.3, (x + 2.9, -1.0, 3.2), "lamp", verts=8))
    node("last_tree", q, 10)

    meta({"ground": False, "nodes": {"root": "flora_kit", "algae": "flora_algae", "seaweed": "flora_seaweed", "seedling": "flora_seedling",
                                     "moss": "flora_moss", "potted": "flora_potted", "flowering": "flora_flowering", "fruit": "flora_fruit",
                                     "sapling": "flora_sapling", "greenhouse": "greenhouse", "garden": "garden_plot", "tree": "last_tree"},
          "origin": "each node: ground / waterline centre", "living_roles": ["leaf", "leaf_dk", "leaf_hi", "moss"]})


BUILDERS = {f.__name__: f for f in (atoll_kit, outpost_kit, flora_kit)}
BUILDERS[ASSET]()
for o in bpy.context.scene.objects:  # noqa: F821
    if o.type == "MESH":
        # living roles get almost no jitter so they stay one clean, saturated green; scrap gets plenty
        kit.bake_vertex_colors(o, M, jitter=0.07, seed=zlib.crc32(o.name.encode()) & 0xFFFF,  # noqa: F821
                               per_role_jitter={"leaf": 0.02, "leaf_dk": 0.02, "leaf_hi": 0.02, "moss": 0.02, "glass": 0.0, "lamp": 0.0})
os.makedirs(os.path.join(OUT, "source"), exist_ok=True)
blend = os.path.join(OUT, "source", f"tb_{ASSET}.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)  # noqa: F821
tris = sum(len(p.vertices) - 2 for o in bpy.context.scene.objects if o.type == "MESH" for p in o.data.polygons)  # noqa: F821
print(json.dumps({"blend": blend, "tris": tris, "objects": len(bpy.context.scene.objects)}))  # noqa: F821
