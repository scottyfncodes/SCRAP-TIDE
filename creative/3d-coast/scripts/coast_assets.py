"""TIDEBREAKERS: the coast kit (island scenery, landmarks, harbour props), authored for GITCRAFT MeshCraft `run_script`.

    run_script {"path": ".../creative/3d-coast/scripts/coast_assets.py",
                "args": {"asset": "coast_kit", "out_dir": ".../creative/3d-coast/coast_kit",
                         "palette": ".../creative/3d-waterworld/tidebreakers-waterworld-palette.json"}}

Replaces the procedural props in src/world/props.ts (and the primitives in src/world/environment.ts) that dressed
every island: the dead palms, rocks, scrub, grass, driftwood; the landmarks (Skull Rock, the Lantern Rock lighthouse,
the hut, the wreck of the Wren, Canopy Rise's sun arch and pillar ring, the storm-drain spring); and Driftholm's pier
furniture (bollards, lamps, barrels, crates), its slipway frame and garden fence.

Each landmark keeps the footprint its gameplay colliders were laid out for (environment.ts), so nothing a player can
walk into or around moves. Conventions (same as creative/3d-waterworld): metres, Blender Z-up, front faces -Y
(+Z in three.js), every node's origin at its ground contact, palette roles baked into COLOR_0. Living green stays rare:
the dead vegetation and the stone use dull olive/kelp roles only.
"""
import json, math, os, random, zlib
from mathutils import Matrix, Vector

A = args  # noqa: F821
PAL = Palette.from_file(A["palette"])  # noqa: F821
ASSET = A.get("asset", "coast_kit")
OUT = A["out_dir"]

ROLES = {
    "rust": "Rust", "rust_dark": "Rust Deep", "rust_hi": "Rust Orange", "oxide": "Oxide Teal",
    "gun": "Gunmetal", "steel": "Steel", "concrete": "Concrete", "concrete_dk": "Concrete Dark", "slate": "Storm Slate",
    "glass": "Window Glass", "tarp": "Tarp Blue", "tarp2": "Tarp Orange", "hazard": "Hazard Yellow",
    "red": "Signal Red", "wood": "Bleached Timber", "wood_dk": "Timber", "wood_deep": "Deep Timber",
    "cloth": "Sailcloth Cream", "kelp": "Kelp Green", "barnacle": "Barnacle", "navy": "Abyss Navy",
    "corr": "Corrugated", "paint": "Faded Paint", "char": "Char", "bronze": "Bronze", "net": "Net Dark",
    "tyre": "Tyre", "soil": "Soil", "algae": "Algae Olive", "fog": "Fog Grey", "pool": "Deep Ocean", "amber": "Sunset Amber",
}

kit.reset()  # noqa: F821
M = kit.Materials(PAL, ROLES, prefix="TBC")  # noqa: F821
M.add("lamp", "Window Lit", rough=0.3, emit=6.0)
RNG = random.Random(zlib.crc32(ASSET.encode()))
RUSTS = ("rust", "rust_dark", "rust_hi", "oxide", "corr", "paint", "tarp", "gun")


# ----------------------------------------------------------------- helpers (as creative/3d-waterworld)
def tf(o, rot=(0, 0, 0), pivot=(0, 0, 0), move=(0, 0, 0)):
    p = Vector(pivot)
    R = Matrix.Translation(p) @ (Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")) @ Matrix.Translation(-p)
    o.data.transform(Matrix.Translation(Vector(move)) @ R)
    o.data.update()
    return o


def B(size, loc, role, bevel=0.0, taper=0.0, rot=None):
    o = kit.box("p", size, loc, M[role], bevel=bevel, taper=taper)  # noqa: F821
    return tf(o, rot=rot, pivot=loc) if rot else o


def C(r, depth, loc, role, axis="Z", verts=10, r2=None):
    return kit.cylinder("p", r, depth, loc, axis=axis, verts=verts, mat=M[role], r2=r2)  # noqa: F821


def ball(r, loc, role, scale=(1, 1, 1), seed=0, wobble=0.18, sub=1):
    return kit.ico("p", r, loc, M[role], sub=sub, scale=scale, seed=seed, wobble=wobble)  # noqa: F821


def beam(a, b, t, role, verts=0, t2=None):
    a, b = Vector(a), Vector(b)
    d = b - a
    if verts:
        o = kit.cylinder("p", t, d.length, (0, 0, 0), verts=verts, mat=M[role], r2=t2)  # noqa: F821
    else:
        o = kit.box("p", (t, t, d.length), (0, 0, 0), M[role], taper=0 if t2 is None else 1 - t2 / t)  # noqa: F821
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.data.transform(Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())
    o.data.update()
    return o


def blade(a, b, w, role, t=0.05):
    """A flat strip from a to b, w wide and lying as flat as it can (its width kept horizontal): a palm frond."""
    a, b = Vector(a), Vector(b)
    d = b - a
    z = d.normalized()
    x = z.cross(Vector((0, 0, 1)))
    x = x.normalized() if x.length > 1e-4 else Vector((1, 0, 0))
    y = z.cross(x)
    o = kit.box("p", (w, t, d.length), (0, 0, 0), M[role], taper=0.55)  # noqa: F821
    R = Matrix(((x.x, y.x, z.x, 0), (x.y, y.y, z.y, 0), (x.z, y.z, z.z, 0), (0, 0, 0, 1)))
    o.data.transform(Matrix.Translation((a + b) / 2) @ R)
    o.data.update()
    return o


def sheet(x, y, z, w, h, role, rx=0.0, ry=0.0, rz=0.0, t=0.07):
    return tf(B((w, t, h), (x, y, z), role), rot=(rx, ry, rz), pivot=(x, y, z))


def drum(x, y, z, role, lying=False, r=0.42, h=1.1):
    q = [C(r, h, (x, y, z), role, axis="X" if lying else "Z", verts=9)]
    for k in (-0.3, 0.3):  # rolling hoops
        if lying:
            q.append(C(r + 0.02, 0.05, (x + k * h, y, z), "rust_dark", axis="X", verts=9))
        else:
            q.append(C(r + 0.02, 0.05, (x, y, z + k * h), "rust_dark", verts=9))
    return q


def stone(r, loc, seed, role="concrete_dk", squash=0.75, sub=2, wobble=0.22, band=True, algae=True):
    """A weathered boulder: displaced icosphere, flat-ish base sunk into the ground, a pale salt/barnacle crust at
    the foot (the tide line) and a drape of dull algae on the shaded side."""
    rng = random.Random(seed)
    sx, sy = rng.uniform(0.85, 1.15), rng.uniform(0.8, 1.1)
    q = [ball(r, (loc[0], loc[1], loc[2] + r * squash * 0.55), role, scale=(sx, sy, squash), seed=seed, wobble=wobble, sub=sub)]
    kit.deform(q[0], lambda v: Vector((v.x, v.y, max(v.z, loc[2] - r * 0.05))))  # noqa: F821  (sit it on its base)
    if band:
        q.append(ball(r * 1.02, (loc[0], loc[1], loc[2] + r * 0.08), "barnacle", scale=(sx, sy, 0.18), seed=seed + 1, wobble=0.12))
    if algae:
        a = rng.uniform(0, math.tau)
        q.append(ball(r * 0.45, (loc[0] + math.cos(a) * r * 0.75 * sx, loc[1] + math.sin(a) * r * 0.7 * sy, loc[2] + r * 0.3), "algae",
                      scale=(1.0, 1.0, 0.35), seed=seed + 2, wobble=0.25))
    return q


ROOT = [None]
X = [0.0]


def node(name, parts, step):
    """Join parts built around (X[0], 0) into one node with its origin at its own ground centre."""
    o = kit.join(parts, name, parent=ROOT[0])  # noqa: F821
    kit.shade(o, None)  # noqa: F821
    x = X[0]
    o.data.transform(Matrix.Translation((-x, 0, 0)))
    o.location = (x, 0, 0)
    X[0] += step
    return o


# ----------------------------------------------------------------- vegetation (dead: nothing grows unguarded)
def dead_palm(seed, H=7.0, lean=0.3, snapped=False, rag=False, net=False):
    """A sun-bleached palm trunk: ringed bark collars, a flared root plate, a curving lean; either a snapped,
    splintered top or a crown of dead fronds hanging against the trunk. 7 m tall (the game scales it)."""
    rng = random.Random(seed)
    x = X[0]
    q = []
    segs = 6
    d = rng.uniform(0, math.tau)
    lx, ly = math.cos(d) * lean, math.sin(d) * lean
    top_t = 0.86 if snapped else 1.0
    pts = [Vector((x + lx * H * t * t, ly * H * t * t, H * t)) for t in (i / segs * top_t for i in range(segs + 1))]
    for i in range(segs):
        r0 = 0.36 - i / segs * 0.15
        q.append(beam(pts[i], pts[i + 1] + (pts[i + 1] - pts[i]) * 0.04, r0, ("wood", "fog", "wood", "concrete")[i % 4], verts=6, t2=r0 * 0.9))
        if i % 2:
            q.append(beam(pts[i] + (pts[i + 1] - pts[i]) * 0.82, pts[i + 1], r0 * 1.06, "wood_dk", verts=6))  # bark collar
    for k in range(4):  # root plate
        a = k * math.tau / 5 + rng.uniform(-0.2, 0.2)
        q.append(beam((x, 0, 0.5), (x + math.cos(a) * 0.75, math.sin(a) * 0.75, -0.05), 0.12, "wood_dk", verts=5, t2=0.03))
    top = pts[-1]
    if snapped:
        for k in range(5):  # splinters
            a = k * math.tau / 5
            q.append(beam(top - Vector((0, 0, 0.2)), top + Vector((math.cos(a) * 0.12, math.sin(a) * 0.12, rng.uniform(0.3, 0.8))), 0.08, "fog", verts=4, t2=0.005))
        q.append(C(0.24, 0.1, top - Vector((0, 0, 0.05)), "wood_deep", verts=7))  # dark heartwood
    else:
        # dead fronds: a skirt of broad, flat blades hanging against the trunk, and two still arching out, broken
        n = 7
        for k in range(n):
            a = k * math.tau / n + rng.uniform(-0.2, 0.2)
            out, down = rng.uniform(0.45, 0.7), rng.uniform(1.4, 2.1)
            q.append(blade(top + Vector((math.cos(a) * 0.15, math.sin(a) * 0.15, 0)), top + Vector((math.cos(a) * out, math.sin(a) * out, -down)),
                           0.42, ("paint", "wood_dk", "soil", "paint", "algae", "wood", "wood_dk")[k]))
        for k in range(2):
            a = rng.uniform(0, math.tau)
            L = rng.uniform(2.0, 2.6)
            p1 = top + Vector((math.cos(a) * L * 0.55, math.sin(a) * L * 0.55, 0.35))
            p2 = top + Vector((math.cos(a) * L, math.sin(a) * L, -0.6))
            q.append(blade(top, p1, 0.5, "paint"))
            q.append(blade(p1, p2, 0.36, "wood_dk"))
        q.append(ball(0.42, top + Vector((0, 0, 0.05)), "wood_deep", scale=(1, 1, 0.7), seed=seed, wobble=0.25, sub=0))  # the crownshaft
    if rag:  # a survivor's marker: a strip of orange tarp knotted round the trunk
        p = pts[3]
        q.append(C(0.33, 0.18, p, "tarp2", verts=8))
        q.append(sheet(p.x + 0.35, p.y, p.z - 0.4, 0.2, 0.9, "tarp2", ry=0.25, t=0.03))
    if net:  # a snagged scrap of ghost net and a float, hung by the sea
        p = pts[4]
        q.append(sheet(p.x, p.y - 0.36, p.z - 0.6, 0.9, 1.4, "net", rz=0.3, t=0.03))
        q.append(ball(0.16, (p.x + 0.2, p.y - 0.42, p.z - 1.3), "hazard", seed=3, wobble=0.05))
    return q


def scrub(seed, s=1.0, tyre=False):
    """Salt-killed brush: a knot of grey twigs, splayed and broken, a few dry olive leaves still clinging."""
    rng = random.Random(seed)
    x = X[0]
    q = []
    for k in range(9):
        a = rng.uniform(0, math.tau)
        L = rng.uniform(0.6, 1.2) * s
        p0 = Vector((x + rng.uniform(-0.1, 0.1), rng.uniform(-0.1, 0.1), 0))
        p1 = p0 + Vector((math.cos(a) * L * 0.5, math.sin(a) * L * 0.5, L * rng.uniform(0.6, 0.95)))
        q.append(beam(p0, p1, 0.05 * s, rng.choice(("fog", "wood", "wood_dk")), verts=4, t2=0.02 * s))
        b = a + rng.uniform(-0.9, 0.9)
        p2 = p1 + Vector((math.cos(b) * L * 0.35, math.sin(b) * L * 0.35, L * 0.25))
        q.append(beam(p1, p2, 0.025 * s, "fog", verts=4, t2=0.005))
        if k % 3 == 0:
            q.append(ball(0.12 * s, p2, "algae", scale=(1, 1, 0.5), seed=seed + k, wobble=0.3, sub=0))
    if tyre:  # something the tide left in it
        q.append(tf(kit.torus("p", 0.42, 0.14, (x + 0.4, 0.2, 0.08), mat=M["tyre"], major=10, minor=5), rot=(0.25, 0.1, 0), pivot=(x + 0.4, 0.2, 0.08)))  # noqa: F821
    return q


def grass_tuft(seed):
    rng = random.Random(seed)
    x = X[0]
    q = []
    for k in range(7):
        a = k * math.tau / 7 + rng.uniform(-0.3, 0.3)
        L = rng.uniform(0.35, 0.6)
        q.append(beam((x, 0, 0), (x + math.cos(a) * L * 0.45, math.sin(a) * L * 0.45, L), 0.06, rng.choice(("paint", "wood", "algae")), verts=3, t2=0.004))
    return q


def driftwood(seed):
    rng = random.Random(seed)
    x = X[0]
    q = [beam((x - 1.5, 0, 0.18), (x + 1.4, 0.15, 0.22), 0.2, "fog", verts=7, t2=0.15)]
    q.append(beam((x + 0.2, 0.05, 0.25), (x + 0.9, 0.55, 0.5), 0.07, "fog", verts=5, t2=0.03))  # a broken branch
    for k in range(5):  # root ball at one end
        a = k * math.tau / 5
        q.append(beam((x - 1.5, 0, 0.2), (x - 1.85, math.cos(a) * 0.5, 0.2 + math.sin(a) * 0.45), 0.08, "wood", verts=4, t2=0.02))
    q.append(B((0.06, 0.4, 0.03), (x + 0.6, 0.05, 0.42), "wood_deep"))  # a rusted spike still in it
    return q


def rubble(seed):
    """A chunk of the drowned world washed up: a broken concrete slab with its rebar showing, and its smaller pieces."""
    rng = random.Random(seed)
    x = X[0]
    q = [B((1.5, 1.1, 0.5), (x, 0, 0.22), "concrete", taper=0.12, rot=(0.12, -0.18, 0.4))]
    q.append(B((1.3, 0.06, 0.4), (x, -0.56, 0.24), "concrete_dk", rot=(0.12, -0.18, 0.4)))  # a sheared face
    for k in range(5):
        a = rng.uniform(-0.6, 0.6)
        q.append(beam((x - 0.5 + k * 0.25, -0.5, 0.25), (x - 0.5 + k * 0.25 + a * 0.5, -0.85, 0.5 + rng.uniform(0, 0.4)), 0.03, "rust_dark", verts=4))
    for k in range(3):
        a = rng.uniform(0, math.tau)
        q.append(ball(rng.uniform(0.18, 0.3), (x + math.cos(a) * 1.0, math.sin(a) * 0.9, 0.1), "concrete_dk", seed=seed + k, wobble=0.2, sub=0))
    q.append(B((1.1, 0.8, 0.04), (x + 0.1, 0.1, 0.0), "barnacle", rot=(0, 0, 0.4)))
    return q


# ----------------------------------------------------------------- landmarks
def skull_rock():
    """Turtle Atoll's Skull Rock: a weathered limestone outcrop the sea has carved into a grinning skull.
    Faces -Y; collider radius 3.4 in the game."""
    x = X[0]
    q = []
    head = ball(3.1, (x, 0.2, 3.0), "barnacle", scale=(1.0, 0.95, 0.9), seed=11, wobble=0.07, sub=2)
    kit.deform(head, lambda v: Vector((v.x, v.y, max(v.z, 0.6 + (v.z - 0.6) * 0.5))))  # noqa: F821
    q.append(head)
    q.append(ball(2.2, (x, -0.5, 1.3), "concrete", scale=(1.15, 1.0, 0.65), seed=12, wobble=0.08))  # jaw / cheek mass
    # brow ridge, sockets, the nasal cavity
    q.append(B((4.2, 1.0, 0.6), (x, -2.45, 3.95), "concrete", taper=0.25, rot=(0.25, 0, 0)))
    for s in (-1, 1):
        q.append(ball(0.95, (x + s * 1.15, -2.55, 3.15), "char", scale=(1, 0.7, 1.05), seed=20 + s, wobble=0.08))
        q.append(ball(0.5, (x + s * 1.15, -2.9, 3.05), "navy", scale=(1, 0.4, 1), seed=22 + s, wobble=0.05))
    q.append(kit.prism("p", [(-0.42, 0), (0.42, 0), (0, 0.85)], 0.6, (x, -2.75, 1.95), axis="Y", mat=M["char"]))  # noqa: F821
    # teeth, two missing; a dark mouth slot behind them
    q.append(B((2.9, 0.4, 0.55), (x, -2.35, 1.2), "char"))
    for i in range(-3, 4):
        if i in (-1, 2):
            continue
        q.append(B((0.36, 0.38, 0.55 - abs(i) * 0.04), (x + i * 0.42, -2.6, 1.22), "cloth", taper=0.15))
    # weathering: cracks, a salt streak from each eye, algae in the crevices, rubble at its base
    q.append(B((0.08, 0.1, 1.6), (x + 0.4, -2.7, 4.4), "concrete_dk", rot=(0, 0.3, 0)))
    for s in (-1, 1):
        q.append(B((0.22, 0.08, 1.1), (x + s * 1.15, -2.75, 2.2), "fog"))
    q.append(ball(0.8, (x + 2.4, 0.9, 1.0), "algae", scale=(1, 1, 0.4), seed=30, wobble=0.3))
    q += stone(1.6, (x + 2.8, 1.2, 0), 31, role="concrete")
    q += stone(1.0, (x - 2.9, 0.6, 0), 32, role="concrete_dk")
    q.append(ball(3.4, (x, 0, 0.1), "barnacle", scale=(1, 1, 0.12), seed=33, wobble=0.1))  # tide crust
    return q


def lighthouse():
    """Lantern Rock's lighthouse, kept burning by the people who live under it: a banded tower with its plaster
    falling off, patched in corrugated sheet and hull plate; gallery and railing, a glazed lamp room (lit), a red cap.
    16 m to the gallery; collider radius 2.9; the game's lamp glow sits at 17.5 m."""
    x = X[0]
    q = []
    H = 16.0
    for i in range(6):
        r0 = 2.6 - (i / 6) * 1.0
        r1 = 2.6 - ((i + 1) / 6) * 1.0
        q.append(C(r0, H / 6, (x, 0, (i + 0.5) * H / 6), "red" if i % 2 else "concrete", verts=14, r2=r1))
    # the plinth: rough stone and a concrete apron, sandbags by the door
    q += stone(3.0, (x, 0.3, -0.4), 41, role="concrete_dk", squash=0.35, band=True, algae=True)
    q.append(C(2.9, 0.4, (x, 0, 0.2), "concrete_dk", verts=14))
    for k in range(5):
        q.append(ball(0.32, (x - 0.9 + k * 0.45, -2.85, 0.5 + (k % 2) * 0.25), "paint", scale=(1.3, 0.8, 0.6), seed=50 + k, wobble=0.05))
    # door, windows climbing the tower, patches over the spalled bands
    q.append(B((1.1, 0.4, 2.0), (x, -2.45, 1.4), "wood_deep"))
    q.append(B((1.3, 0.3, 0.16), (x, -2.5, 2.5), "rust"))
    for i, zz in enumerate((5.5, 9.0, 12.5)):
        r = 2.6 - zz / H * 1.0
        a = (-0.5 + i * 0.6)
        q.append(tf(B((0.5, 0.25, 0.8), (x + math.sin(a) * r, -math.cos(a) * r, zz), "glass"), rot=(0, 0, a), pivot=(x + math.sin(a) * r, -math.cos(a) * r, zz)))
    for zz, a, role in ((3.4, 0.9, "corr"), (7.2, -0.7, "rust"), (10.6, 2.5, "oxide"), (13.4, 0.2, "corr")):
        r = 2.6 - zz / H * 1.0 + 0.04
        q.append(tf(B((1.4, 0.06, 1.1), (x + math.sin(a) * r, -math.cos(a) * r, zz), role), rot=(0, 0, a), pivot=(x + math.sin(a) * r, -math.cos(a) * r, zz)))
    # gallery deck, railing, lamp room, cap, finial
    q.append(C(2.2, 0.35, (x, 0, H + 0.18), "gun", verts=14))
    for k in range(14):
        a = k * math.tau / 14
        q.append(C(0.04, 0.9, (x + math.cos(a) * 2.1, math.sin(a) * 2.1, H + 0.8), "steel", verts=4))
    q.append(kit.torus("p", 2.1, 0.05, (x, 0, H + 1.25), mat=M["steel"], major=14, minor=4))  # noqa: F821
    q.append(C(1.3, 2.2, (x, 0, H + 1.45), "glass", verts=10))
    q.append(C(0.7, 1.3, (x, 0, H + 1.45), "lamp", verts=8))  # the lamp itself (glow)
    for k in range(5):  # lamp-room glazing bars
        a = k * math.tau / 5
        q.append(C(0.05, 2.2, (x + math.cos(a) * 1.31, math.sin(a) * 1.31, H + 1.45), "gun", verts=4))
    q.append(C(1.8, 1.8, (x, 0, H + 3.4), "red", verts=10, r2=0.1))
    q.append(C(0.06, 0.8, (x, 0, H + 4.5), "bronze", verts=5))
    # what keeps it running: fuel drums at the foot, a solar panel and a whip antenna bolted to the gallery
    q += drum(x + 2.4, -1.4, 0.95, "rust", r=0.35, h=0.9)
    q += drum(x + 2.9, -0.6, 0.95, "tarp", r=0.35, h=0.9)
    q.append(tf(B((1.4, 0.9, 0.06), (x - 2.2, 0.6, H + 0.6), "navy"), rot=(0.6, 0, 0.5), pivot=(x - 2.2, 0.6, H + 0.6)))
    q.append(C(0.03, 3.2, (x + 1.9, 0.7, H + 2.0), "gun", verts=4))
    return q


def hut():
    """A beachcomber's hut on short stilts: patchwork walls, a lean-to of corrugated sheet, a lamp-lit gap, a
    stovepipe, a drying net and a rain barrel. 4.2 x 3.6 m; collider radius 2.6."""
    x = X[0]
    q = []
    w, d, h, z = 4.0, 3.2, 2.4, 0.35
    for px in (-1.8, 1.8):
        for py in (-1.4, 1.4):
            q.append(B((0.18, 0.18, z + 0.1), (x + px, py, z / 2), "wood_deep"))
    q.append(B((w + 0.3, d + 0.3, 0.12), (x, 0, z), "wood_dk"))
    for side in (-1, 1):
        for k in range(4):
            px = x - w / 2 + 0.5 + k * 1.0
            q.append(sheet(px, side * d / 2, z + h / 2, 1.02, h * RNG.uniform(0.93, 1.0), RNG.choice(RUSTS + ("wood", "wood_dk")), rz=RNG.uniform(-0.03, 0.03)))
        for k in range(3):
            py = -d / 2 + 0.55 + k * 1.05
            q.append(sheet(x + side * w / 2, py, z + h / 2, 1.07, h * RNG.uniform(0.93, 1.0), RNG.choice(("wood", "wood_dk", "corr", "tarp")), rz=math.pi / 2))
    q.append(B((0.9, 0.12, 1.8), (x - 0.6, -d / 2 - 0.05, z + 0.9), "navy"))  # doorway
    q.append(sheet(x - 0.6, -d / 2 - 0.12, z + 1.0, 0.95, 1.7, "tarp2", rz=0.0, t=0.03))  # tarp door curtain, pulled half open
    q.append(B((0.6, 0.1, 0.35), (x + 1.0, -d / 2 - 0.06, z + 1.6), "lamp"))
    q.append(sheet(x, 0.1, z + h + 0.35, w + 0.9, d + 1.1, "rust_hi", rx=math.pi / 2 + 0.18, t=0.08))  # lean-to roof
    q.append(sheet(x + 0.8, 0.2, z + h + 0.48, 1.6, 1.4, "corr", rx=math.pi / 2 + 0.18, t=0.04))  # a patch on it
    for px in (-1.6, 1.6):  # porch posts for the overhang
        q.append(B((0.12, 0.12, h + 0.3), (x + px, -d / 2 - 0.75, z + h / 2 + 0.1), "wood_deep"))
    q.append(C(0.1, 1.4, (x + 1.3, 0.9, z + h + 1.0), "gun", verts=6))  # stovepipe
    q.append(C(0.16, 0.12, (x + 1.3, 0.9, z + h + 1.75), "char", verts=6))
    q += drum(x + 2.5, 0.8, 0.55, "tarp", r=0.4, h=1.0)
    q.append(sheet(x - 2.55, -0.3, z + 1.3, 0.05, 1.6, "net", rz=math.pi / 2, t=1.4))  # a net hung to dry
    return q


def wreck():
    """The Wren: a timber schooner's bones on the sand, listing; ribs broken off on one side, planking left on the
    other, keel and stem, a fallen mast with its sail rotted to rags, the stern cabin still standing.
    ~21 m along -Y (+Z in three.js), stern at -Y = +Z; colliders at the hull ends (environment.ts)."""
    x = X[0]
    q = []
    wood, dark, bleach = "wood_dk", "wood_deep", "wood"
    q.append(B((0.6, 21, 0.7), (x, 0, -0.6), dark))  # keel
    q.append(beam((x, 10.2, -0.4), (x, 11.6, 4.2), 0.45, dark))  # stem post at the bow (+Y)
    for i in range(9):
        yy = -9 + i * 2.2
        w = 4.2 - abs(yy) * 0.18
        top = RNG.uniform(0.55, 1.0)  # starboard ribs (+X) broken off at different heights
        pts = []
        for k in range(11):
            a = math.pi + k / 10 * math.pi
            pts.append(Vector((x + math.cos(a) * w, -yy, 3.2 + math.sin(a) * w * 0.85)))
        for k in range(10):
            if k > 4 and k / 10 > top:
                break
            q.append(beam(pts[k], pts[k + 1], 0.32, wood if i % 2 else dark))
    for k in range(6):  # planking left on the port side (-X)
        zz = -0.2 + k * 0.72
        ang = -0.35 + k * 0.08
        L = RNG.uniform(10, 18)
        q.append(tf(B((0.25, L, 0.66), (x - 3.7 + k * 0.1 + math.sin(k) * 0.2, RNG.uniform(-3, 3), zz + 0.4), (bleach, wood, "barnacle", wood, bleach, dark)[k]), rot=(0, ang, 0), pivot=(x - 3.7, 0, zz + 0.4)))
    # barnacles and algae on the lowest strakes, sand piled against the hull
    for k in range(5):
        q.append(ball(0.6, (x - 3.4, RNG.uniform(-8, 8), 0.1), "algae", scale=(1.6, 2.4, 0.4), seed=60 + k, wobble=0.25))
    q.append(ball(4.0, (x - 4.6, 0, -0.8), "soil", scale=(0.5, 2.6, 0.3), seed=66, wobble=0.15))
    # fallen mast and rags of sail
    q.append(beam((x + 5.6, -2 + 7.3, 0.3), (x + 3.4, -2 - 7.3, 1.6), 0.4, wood, verts=8, t2=0.3))
    q.append(beam((x + 4.6, 2.5, 0.8), (x + 7.6, 1.0, 0.25), 0.15, wood, verts=6))  # the gaff
    for k in range(3):
        q.append(sheet(x + 6.4 + k * 0.9, -3.8 + k * 1.6, 0.35 + k * 0.1, 2.0 - k * 0.4, 1.6, "cloth", rx=math.pi / 2 - 0.2, ry=0.3 * k, t=0.03))
    # stern cabin (at -Y = three.js +Z), its windows and a hanging door
    q.append(tf(B((6, 4, 3.2), (x + 0.4, -9, 2.0), wood), rot=(0.05, 0, -0.12), pivot=(x + 0.4, -9, 2.0)))
    q.append(tf(B((6.6, 4.6, 0.25), (x + 0.4, -9, 3.7), dark), rot=(0.05, 0, -0.12), pivot=(x + 0.4, -9, 2.0)))
    for px in (-1.4, 1.6):
        q.append(B((1.2, 0.2, 1.0), (x + px, -11.05, 2.6), "navy"))
    q.append(tf(B((0.9, 0.08, 1.8), (x + 0.1, -7.0, 1.4), dark), rot=(0, 0.25, 0.3), pivot=(x + 0.1, -7.0, 1.4)))
    q.append(B((2.6, 0.12, 0.5), (x + 0.4, -11.1, 3.3), "paint"))  # name board (the paint long gone)
    # salvage already taken: a rope coil, a split barrel, a lantern hook
    q.append(kit.torus("p", 0.35, 0.1, (x + 1.8, -6.0, 0.15), mat=M["net"], major=10, minor=4))  # noqa: F821
    q += drum(x - 1.5, 5.5, 0.4, "wood", lying=True, r=0.38, h=0.9)
    # the game rolls it 0.18 rad onto its side, as the code-built wreck was
    for o in q:
        tf(o, rot=(0, 0.18, 0), pivot=(x, 0, 0))
    return q


def sun_arch():
    """Canopy Rise's sun arch: a gate of old dressed stone, its voussoirs slipped a little, the bronze sun of the
    Redfinch hoard set in the keystone; vines (dull: no living green unguarded) and salt crust. Piers at x = +-3.2."""
    x = X[0]
    q = []
    for s in (-1, 1):
        for i in range(4):
            q.append(B((1.8, 1.8, 1.36), (x + s * 3.2 + RNG.uniform(-0.08, 0.08), RNG.uniform(-0.05, 0.05), 0.7 + i * 1.4), ("concrete", "concrete_dk", "slate")[(i + (s > 0)) % 3],
                       bevel=0.06, rot=(0, 0, RNG.uniform(-0.07, 0.07))))
        q.append(B((2.2, 2.2, 0.4), (x + s * 3.2, 0, 0.1), "concrete_dk"))
    n = 9
    for k in range(n):  # voussoirs
        a = math.pi - k / (n - 1) * math.pi
        cx, cz = x + math.cos(a) * 3.2, 5.6 + math.sin(a) * 3.2
        q.append(tf(B((1.15, 1.7, 1.6), (cx, 0, cz), "concrete" if k % 2 else "concrete_dk"),
                    rot=(0, -(a - math.pi / 2) + RNG.uniform(-0.04, 0.04), 0), pivot=(cx, 0, cz)))
    # the keystone sun: a bronze disc with rays, patina in its grooves
    q.append(C(1.0, 0.35, (x, -0.95, 8.4), "bronze", axis="Y", verts=14))
    q.append(C(0.6, 0.4, (x, -1.0, 8.4), "amber", axis="Y", verts=12))
    for k in range(8):
        a = k * math.tau / 8
        q.append(tf(kit.prism("p", [(-0.18, 0), (0.18, 0), (0, 0.55)], 0.2, (x, -0.95, 8.4), axis="Y", mat=M["bronze"]),  # noqa: F821
                    rot=(0, a, 0), pivot=(x, -0.95, 8.4), move=(math.sin(a) * 1.05, 0, math.cos(a) * 1.05)))
    q.append(B((0.12, 0.08, 1.4), (x + 0.2, -1.1, 8.0), "oxide"))  # patina streak
    # hanging dead vines and crust
    for k in range(7):
        px = x + RNG.uniform(-4, 4)
        top = 8.6 - abs(px - x) * 0.35
        q.append(beam((px, -0.9, top), (px + RNG.uniform(-0.2, 0.2), -1.0, top - RNG.uniform(1.0, 2.8)), 0.06, RNG.choice(("kelp", "algae", "wood_dk")), verts=4, t2=0.02))
    for k in range(6):
        q.append(ball(0.55, (x + RNG.uniform(-4, 4), RNG.uniform(-0.8, 0.8), RNG.uniform(5, 8.6)), "algae", scale=(1, 1, 0.5), seed=70 + k, wobble=0.25))
    q += stone(0.8, (x - 4.6, -0.8, 0), 75)
    q += stone(0.5, (x + 4.4, 1.0, 0), 76)
    return q


def pillar_ring():
    """Five drowned colonnade columns in a ring of radius 4.5 around a round dais (Canopy Rise): fluted shafts snapped
    at different heights, capitals on the ones still standing tall, a drum of one fallen beside its base."""
    x = X[0]
    q = []
    H = (5.8, 2.6, 6.4, 3.8, 4.6)
    for i in range(5):
        a = i / 5 * math.tau
        px, py = x + math.cos(a) * 4.5, -math.sin(a) * 4.5  # three.js (cos a, sin a) -> Blender (x, -z)
        h = H[i]
        q.append(B((2.0, 2.0, 0.5), (px, py, 0.25), "concrete_dk"))
        q.append(C(0.88, 0.4, (px, py, 0.7), "concrete", verts=12))
        q.append(C(0.78, h - 0.9, (px, py, 0.9 + (h - 0.9) / 2), "concrete" if i % 2 else "fog", verts=10, r2=0.72))
        for k in range(4):  # fluting
            b = k * math.tau / 4 + a
            q.append(B((0.12, 0.12, h - 1.1), (px + math.cos(b) * 0.76, py + math.sin(b) * 0.76, 0.95 + (h - 1.1) / 2), "concrete_dk"))
        if h > 5:
            q.append(B((2.0, 2.0, 0.5), (px, py, h + 0.25), "concrete", rot=(0, 0, a)))
            q.append(C(0.95, 0.3, (px, py, h - 0.12), "concrete_dk", verts=12))
        else:
            q.append(tf(C(0.8, 0.3, (px, py, h + 0.05), "concrete_dk", verts=10), rot=(0.25, 0.15, 0), pivot=(px, py, h)))  # snapped top
        q.append(C(0.9, 0.2, (px, py, 0.95), "barnacle", verts=12))  # old tide line
        q.append(ball(0.5, (px + 0.6, py, 1.6 + i * 0.3), "algae", scale=(0.6, 1, 1.4), seed=80 + i, wobble=0.25))
    q.append(C(2.4, 0.6, (x, 0, 0.3), "concrete_dk", verts=16, r2=2.2))
    q.append(C(1.8, 0.1, (x, 0, 0.62), "concrete", verts=16))
    q.append(C(1.0, 0.06, (x, 0, 0.7), "bronze", verts=12))  # an inlaid compass ring
    q.append(tf(C(0.72, 1.3, (x + 2.6, 2.4, 0.7), "fog", axis="X", verts=12), rot=(0, 0, 0.6), pivot=(x + 2.6, 2.4, 0.7)))  # a fallen drum
    return q


def spring():
    """The storm-drain spring: a mossy-dark rock face, a broken concrete culvert pipe pushing fresh water out 9 m up
    (the game's waterfall falls from it), a catch pool, and four drums someone set out to collect it.
    Placed 0.5 m below ground: everything here is offset to match environment.ts's code-built pipe and drums."""
    x = X[0]
    q = []
    for i in range(7):
        r = 2.5 + (i % 3) * 0.6
        q += stone(r, (x - 5 + i * 1.65, 1.2 + (i % 2) * 1.4, max(0, (i % 4) * 1.6 - 0.4)), 90 + i, role=("slate", "concrete_dk")[i % 2], squash=1.15, band=i < 3, algae=i % 2 == 0, sub=1, wobble=0.16)
    q += stone(3.2, (x, 3.2, 4.8), 99, role="slate", squash=1.0, band=False, sub=1, wobble=0.16)
    q.append(C(4.0, 0.3, (x, -3, 0.3), "pool", verts=16, r2=4.2))
    q.append(C(4.3, 0.2, (x, -3, 0.2), "barnacle", verts=16))
    # the culvert: a concrete pipe with a steel flange collar and a rust streak below it
    q.append(C(0.78, 3.2, (x, 1.2, 9.1), "concrete", axis="Y", verts=12))
    q.append(C(0.62, 3.25, (x, 1.2, 9.1), "char", axis="Y", verts=12))
    q.append(kit.torus("p", 0.8, 0.14, (x, -0.4, 9.1), axis="Y", mat=M["rust_dark"], major=12, minor=5))  # noqa: F821
    q.append(B((0.5, 0.1, 2.6), (x, -0.42, 7.4), "rust"))
    # catch drums (each a different colour, as environment.ts painted them)
    for k, role in enumerate(("tarp", "oxide", "tarp", "rust")):
        q += drum(x - 2.2 + k * 1.3, -4.6, 1.0, role, r=0.55, h=1.3)
    q.append(beam((x - 2.8, -4.0, 1.7), (x + 2.2, -4.0, 1.7), 0.06, "wood_dk"))  # a plank gutter over them
    return q


# ----------------------------------------------------------------- harbour furniture (Driftholm pier)
def bollard():
    x = X[0]
    return [C(0.24, 0.55, (x, 0, 0.28), "gun", verts=9, r2=0.2), C(0.3, 0.08, (x, 0, 0.58), "gun", verts=9),
            C(0.27, 0.06, (x, 0, 0.05), "rust_dark", verts=9),
            kit.torus("p", 0.26, 0.05, (x, 0, 0.3), mat=M["net"], major=10, minor=4)]  # noqa: F821  (a rope eye)


def pier_lamp():
    """A dock lamp knocked up from scaffold pipe, a road-lamp head and a cable; the head glows at night."""
    x = X[0]
    return [B((0.4, 0.4, 0.08), (x, 0, 0.04), "rust"), C(0.08, 3.0, (x, 0, 1.55), "gun", verts=6),
            beam((x, 0, 2.9), (x + 0.5, 0, 3.15), 0.06, "gun", verts=5),
            B((0.45, 0.5, 0.18), (x + 0.6, 0, 3.15), "steel"), B((0.36, 0.42, 0.1), (x + 0.6, 0, 3.02), "lamp"),
            beam((x + 0.05, 0.05, 2.6), (x + 0.1, 0.1, 0.5), 0.02, "tyre", verts=3),
            B((0.18, 0.08, 0.6), (x, -0.1, 1.2), "hazard")]


def barrel():
    """A tarred wooden barrel bound with rusted hoops (pier cargo)."""
    x = X[0]
    q = [C(0.5, 0.3, (x, 0, 0.15), "wood_dk", verts=9, r2=0.56), C(0.56, 0.7, (x, 0, 0.65), "wood_dk", verts=9),
         C(0.56, 0.3, (x, 0, 1.15), "wood_dk", verts=9, r2=0.5), C(0.5, 0.04, (x, 0, 1.31), "wood_deep", verts=9)]
    for zz in (0.3, 1.0):
        q.append(C(0.575, 0.06, (x, 0, zz), "rust_dark", verts=9))
    q.append(B((0.3, 0.02, 0.2), (x, -0.565, 0.65), "paint"))  # a stencilled mark
    return q


def cargo_crate():
    """A slatted cargo crate with corner battens and a stencilled hazard band (1 m; the game scales it)."""
    x = X[0]
    q = [B((0.96, 0.96, 0.96), (x, 0, 0.48), "wood_dk")]
    for s in (-1, 1):
        for k in range(3):
            q.append(B((1.0, 0.04, 0.22), (x, s * 0.49, 0.16 + k * 0.32), "wood"))
            q.append(B((0.04, 1.0, 0.22), (x + s * 0.49, 0, 0.16 + k * 0.32), "wood"))
        for t in (-1, 1):
            q.append(B((0.1, 0.1, 1.0), (x + s * 0.47, t * 0.47, 0.5), "wood_deep"))
    q.append(B((0.98, 0.98, 0.05), (x, 0, 0.98), "wood"))
    q.append(B((0.5, 0.02, 0.14), (x, -0.515, 0.62), "hazard"))
    return q


def slipway():
    """The shipwright's slipway: a hull frame going up on a keel, ribs cut from old steel and timber, on cradle
    blocks, a chain hoist on an A-frame and a pile of plate waiting to be hung. ~11 m along Y."""
    x = X[0]
    q = [B((0.4, 12, 0.4), (x, 1.2, 0.3), "wood_dk")]  # the keel
    for i in range(7):  # U-frames, open above the sheer, each on a cradle block
        yy = 6 - i * 1.6
        r = 2.6 - abs(i - 3) * 0.25
        role = "rust_dark" if i % 3 == 0 else "wood_dk"
        pts = [Vector((x + math.cos(math.pi + k / 8 * math.pi) * r, yy, 2.8 + math.sin(math.pi + k / 8 * math.pi) * r)) for k in range(9)]
        for a, b in zip(pts, pts[1:]):
            q.append(beam(a, b, 0.16, role))
        q.append(B((0.6, 0.6, 0.5), (x, yy, 0.25), "concrete_dk"))
    for k in range(3):  # the first strakes, hung
        q.append(tf(B((0.08, 7 - k, 0.35), (x - 2.0 + k * 0.1, 1.0, 0.9 + k * 0.4), ("wood", "rust", "wood")[k]), rot=(0, -0.5 + k * 0.15, 0), pivot=(x - 2.0, 1.0, 0.9)))
    for s in (-1, 1):  # A-frame hoist
        q.append(beam((x + s * 3.2, -2.5, 0), (x, -2.5, 6.5), 0.18, "gun"))
    q.append(C(0.03, 2.5, (x, -2.5, 5.2), "steel", verts=4))
    q.append(B((0.4, 0.3, 0.5), (x, -2.5, 3.8), "hazard"))
    for k in range(4):
        q.append(B((2.4, 1.2, 0.05), (x - 3.4, 3.0, 0.03 + k * 0.06), RUSTS[k], rot=(0, 0, k * 0.2)))
    return q


def pier_section(width, along_x=False):
    """4 m of Driftholm's pier, origin at the deck's centre (the deck surface is 0.11 m above it): mismatched planks
    laid across (a short one, a steel plate over a hole), two stringers, a pair of pilings (old pipe, I-beam, tarred
    timber: whatever was long enough) braced with a rusted X, and a tyre fender. Along Y (three.js z) by default;
    `along_x` builds a finger pier running along X instead."""
    x = X[0]
    q = []
    rng = random.Random(int(width * 100) + along_x)
    P_ = (lambda a, b, c: (x + b, a, c)) if along_x else (lambda a, b, c: (x + a, b, c))  # (across, along, up)
    S_ = (lambda a, b, c: (b, a, c)) if along_x else (lambda a, b, c: (a, b, c))
    for k in range(5):
        r = rng.random()
        w = width * (0.66 if r > 0.85 else 1.0)
        role = "steel" if r > 0.8 else ("wood" if k % 2 else "fog") if r > 0.35 else "wood_dk"
        q.append(tf(B(S_(w, 0.76, 0.22), P_(rng.uniform(-0.2, 0.2) if w < width else 0, -1.6 + k * 0.8, 0), role), rot=(0, 0, rng.uniform(-0.04, 0.04)), pivot=P_(0, -1.6 + k * 0.8, 0)))
    for a in (-width * 0.3, width * 0.3):
        q.append(B(S_(0.2, 4.0, 0.3), P_(a, 0, -0.26), "wood_deep"))
    piles = []
    for a, role in ((-width / 2 + 0.2, "wood_deep"), (width / 2 - 0.2, "gun")):
        q.append(C(0.3, 6.0, P_(a, -2.0, -2.5), role, verts=7, r2=0.27))
        q.append(C(0.33, 0.6, P_(a, -2.0, -4.6), "barnacle", verts=7))  # crusted at the tide line
        piles.append(P_(a, -2.0, 0))
    q.append(beam((piles[0][0], piles[0][1], -0.6), (piles[1][0], piles[1][1], -3.2), 0.1, "rust"))
    q.append(beam((piles[1][0], piles[1][1], -0.6), (piles[0][0], piles[0][1], -3.2), 0.1, "rust"))
    q.append(C(0.42, 0.3, P_(width / 2 + 0.05, -2.0, -0.3), "tyre", axis="Y" if along_x else "X", verts=10))
    return q


def fence_panel():
    """One length of the guarded garden's scrap fence: a sheet on two posts, wired on, with a spike top. 4.6 x 1.6."""
    x = X[0]
    q = [B((4.6, 0.08, 1.4), (x, 0, 0.9), "corr")]
    q.append(B((2.0, 0.09, 1.1), (x + 1.0, -0.02, 0.8), RNG.choice(("rust", "oxide", "tarp"))))
    for s in (-1, 1):
        q.append(B((0.12, 0.12, 2.0), (x + s * 2.2, 0.06, 0.8), "wood_deep"))
    for k in range(9):
        q.append(C(0.03, 0.4, (x - 2.1 + k * 0.52, 0, 1.75), "rust_dark", verts=4, r2=0.005))
    q.append(B((4.5, 0.02, 0.04), (x, -0.06, 1.45), "steel"))
    return q


def flagpole():
    """The watchtower's flagpole: 6 m of scaffold pipe with a halyard and a cleat (the flag is a live, waving cloth)."""
    x = X[0]
    return [C(0.08, 6.0, (x, 0, 3.0), "gun", verts=6), C(0.12, 0.08, (x, 0, 6.02), "bronze", verts=6),
            C(0.015, 5.6, (x + 0.11, 0, 3.1), "cloth", verts=3), B((0.06, 0.18, 0.06), (x + 0.09, 0, 1.4), "rust")]


# ----------------------------------------------------------------- the kit
def contract(root):
    s = bpy.context.scene  # noqa: F821
    names = [o.name for o in s.objects if o.parent is ROOT[0]]
    s["gitcraft_brief"] = json.dumps({"asset_id": f"tb_{ASSET}", "template": "run_script:coast_assets", "params": {"asset": ASSET},
                                      "palette": A["palette"], "material_prefix": "TBC", "out_dir": OUT})
    s["gitcraft_result"] = json.dumps({"contract": {"ground": False, "nodes": {"root": root, **{n: n for n in names}},
                                                    "origin": "each node: ground contact at its centre"}})
    s["gitcraft_template"] = "run_script:coast_assets"


def coast_kit():
    """Island scatter and harbour furniture: placed many times per island, so every node is kept light."""
    ROOT[0] = kit.empty("coast_kit", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    node("dead_palm_a", dead_palm(1, lean=0.32), 6)
    node("dead_palm_b", dead_palm(2, lean=0.16, snapped=True, rag=True), 6)
    node("dead_palm_c", dead_palm(3, lean=0.45, net=True), 6)
    node("dead_palm_d", dead_palm(4, lean=0.05), 6)
    x = X[0]
    node("rock_a", stone(1.0, (x, 0, 0), 101), 4)
    x = X[0]
    node("rock_b", stone(0.9, (x, 0, 0), 102, role="slate", squash=1.1) + stone(0.55, (x + 0.7, 0.4, 0), 103, role="concrete_dk", squash=0.9, band=False), 4)
    node("rock_c", rubble(104), 4)
    x = X[0]
    node("rock_d", stone(1.0, (x, 0, 0), 105, role="concrete", squash=0.6, algae=False) + stone(0.4, (x - 0.8, -0.5, 0), 106, role="concrete_dk", band=False), 4)
    node("scrub_a", scrub(201), 3)
    node("scrub_b", scrub(202, s=1.2, tyre=True), 3)
    node("grass_tuft", grass_tuft(301), 2)
    node("driftwood", driftwood(401), 5)
    node("bollard", bollard(), 2)
    node("pier_lamp", pier_lamp(), 2)
    node("barrel", barrel(), 2)
    node("cargo_crate", cargo_crate(), 2)
    node("pier_section", pier_section(5.2), 7)
    node("finger_section", pier_section(3.4, along_x=True), 7)
    node("fence_panel", fence_panel(), 6)
    node("flagpole", flagpole(), 2)
    contract("coast_kit")


def landmark_kit():
    """The one-off landmarks (each placed once) and the shipwright's slipway."""
    ROOT[0] = kit.empty("landmark_kit", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    node("skull_rock", skull_rock(), 12)
    node("lighthouse", lighthouse(), 10)
    node("hut", hut(), 9)
    node("wreck", wreck(), 18)
    node("sun_arch", sun_arch(), 14)
    node("pillar_ring", pillar_ring(), 14)
    node("spring", spring(), 16)
    node("slipway", slipway(), 10)
    contract("landmark_kit")


BUILDERS = {"coast_kit": coast_kit, "landmark_kit": landmark_kit}
BUILDERS[ASSET]()
for o in bpy.context.scene.objects:  # noqa: F821
    if o.type == "MESH":
        kit.bake_vertex_colors(o, M, jitter=0.07, seed=zlib.crc32(o.name.encode()) & 0xFFFF,  # noqa: F821
                               per_role_jitter={"glass": 0.0, "lamp": 0.0, "hazard": 0.03})
os.makedirs(os.path.join(OUT, "source"), exist_ok=True)
blend = os.path.join(OUT, "source", f"tb_{ASSET}.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)  # noqa: F821
per = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in bpy.context.scene.objects if o.type == "MESH"}  # noqa: F821
print(json.dumps({"blend": blend, "tris": sum(per.values()), "per_node": per}))
