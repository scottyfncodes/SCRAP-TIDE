"""TIDEBREAKERS: finds, wildlife and ship fittings, authored for GITCRAFT MeshCraft `run_script`.

    run_script {"path": ".../creative/3d-finds/scripts/finds_assets.py",
                "args": {"asset": "finds_kit" | "fittings_kit", "out_dir": ".../creative/3d-finds/<asset>",
                         "palette": ".../creative/3d-waterworld/tidebreakers-waterworld-palette.json"}}

finds_kit     replaces the code-built finds in src/game/fx.ts: the three treasure chests (body + hinged lid each),
              the island crate, the message in a bottle, the dig mound, the crab, the beach pickups, and the gulls
              in src/world/sky.ts (body + a wing the game flaps)
fittings_kit  replaces code-built ship parts in src/ship/shipModel.ts: the anchor, the skiff's paddle, rudder and
              scaffold-pipe mast, and the deck trophies

Contracts kept from the code they replace (so animation and gameplay are untouched):
  * chest_<tier>_lid / crate_find_lid: origin = the lid's hinge, at the same point as chestMesh()/crateFindMesh()
    (the game opens them with lid.rotation.x = -1.9 as before); sizes s = 1 / 1.5 / 1.1 for small / grand / sea;
    the GITCRAFT chest pilot (creative/3d/chest_*) set this contract, these are rebuilt in the drowned palette
  * gull_wing: origin at the shoulder, wing along +X (the game mirrors it for the right wing and flaps rotation.z)
  * skiff_mast: origin at its foot, 3.0 m tall (the game stretches it in Y to the sail tier's mast height)
  * <node>__a / <node>__b: the parts that take the item's own two colours (items.ts `colors`), recoloured in the game
Conventions: metres, Blender Z-up, front -Y (+Z in three.js), origin at ground contact, palette roles in COLOR_0.
"""
import json, math, os, random, zlib
from mathutils import Matrix, Vector

A = args  # noqa: F821
PAL = Palette.from_file(A["palette"])  # noqa: F821
ASSET = A["asset"]
OUT = A["out_dir"]

ROLES = {
    "rust": "Rust", "rust_dark": "Rust Deep", "rust_hi": "Rust Orange", "oxide": "Oxide Teal", "gun": "Gunmetal",
    "steel": "Steel", "concrete": "Concrete", "concrete_dk": "Concrete Dark", "glass": "Window Glass", "hazard": "Hazard Yellow",
    "red": "Signal Red", "wood": "Bleached Timber", "wood_dk": "Timber", "wood_deep": "Deep Timber", "cloth": "Sailcloth Cream",
    "kelp": "Kelp Green", "barnacle": "Barnacle", "navy": "Abyss Navy", "char": "Char", "bronze": "Bronze", "net": "Net Dark",
    "tyre": "Tyre", "soil": "Soil", "algae": "Algae Olive", "fog": "Fog Grey", "gold": "Bloom Yellow", "amber": "Sunset Amber",
    "coral": "Dusk Coral", "foam": "Sea Foam", "slate": "Storm Slate", "paint": "Faded Paint", "sand": "Faded Paint",
    "tint": "Sailcloth Cream",  # placeholder colour of the __a/__b parts (the game recolours them per item)
}
# Weathered value overrides (asset-modernization polish). The Waterworld palette's pale roles (Bleached Timber,
# Concrete, Barnacle, Fog Grey, Steel, Corrugated, Faded Paint, Sailcloth) are highlight colours. Used on large
# surfaces they went near-white in the game: its toon ramp's top band and the world-space weathering pass's salt
# crust (0.5-2.6 m above the sea) and sun-bleached tops lift them further, which read as a white, plastic sheen.
# These are the drowned world's own mid-tones, matched to the terrain (sand #9a8f78, rock #5d5650) and the
# code-built props the models replace (palm #a39a88/#8c8373, pier planks #a2927a/#7d6a52).
WEATHERED = {
    "wood": "#9A8466",         # aged, salt-worn timber (was Bleached Timber #C9A97A)
    "fog": "#8C8373",          # bleached driftwood grey-brown (was Fog Grey #9AA9B4, a cold blue-white)
    "concrete": "#7E786C",     # weathered concrete (was #A7A196)
    "concrete_dk": "#5D5850",  # (was #6E6A62)
    "barnacle": "#A49A86",     # salt and barnacle crust, muted (was #CFC6B0)
    "steel": "#66707A",        # weathered steel, not chrome (was #7F8A94)
    "corr": "#737670",         # corrugated sheet (was #8E918C)
    "paint": "#94876A",        # faded paint (was #B9A882)
    "cloth": "#C9BB9C",        # yellowed sailcloth and paper (was #EFE2C4)
    "plaster": "#A39A86",      # the lighthouse's pale bands (the code-built tower's #a8a08c)
    "sand": "#9A8F78",         # beach sand, as the terrain
}
ROLES.update({k: v for k, v in WEATHERED.items() if k in ROLES or k in ("plaster",)})

kit.reset()  # noqa: F821
M = kit.Materials(PAL, ROLES, prefix="TBF")  # noqa: F821
M.add("lamp", "Window Lit", rough=0.3, emit=6.0)
RNG = random.Random(zlib.crc32(ASSET.encode()))


def tf(o, rot=(0, 0, 0), pivot=(0, 0, 0), move=(0, 0, 0)):
    p = Vector(pivot)
    R = Matrix.Translation(p) @ (Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")) @ Matrix.Translation(-p)
    o.data.transform(Matrix.Translation(Vector(move)) @ R)
    o.data.update()
    return o


def B(size, loc, role, rot=None, taper=0.0):
    o = kit.box("p", size, loc, M[role], taper=taper)  # noqa: F821
    return tf(o, rot=rot, pivot=loc) if rot else o


def C(r, depth, loc, role, axis="Z", verts=10, r2=None, arc=None):
    return kit.cylinder("p", r, depth, loc, axis=axis, verts=verts, mat=M[role], r2=r2, arc=arc)  # noqa: F821


def ball(r, loc, role, scale=(1, 1, 1), seed=0, wobble=0.12, sub=1):
    return kit.ico("p", r, loc, M[role], sub=sub, scale=scale, seed=seed, wobble=wobble)  # noqa: F821


def beam(a, b, t, role, verts=6, t2=None):
    a, b = Vector(a), Vector(b)
    d = b - a
    o = kit.cylinder("p", t, d.length, (0, 0, 0), verts=verts, mat=M[role], r2=t2)  # noqa: F821
    q = Vector((0, 0, 1)).rotation_difference(d.normalized())
    o.data.transform(Matrix.Translation((a + b) / 2) @ q.to_matrix().to_4x4())
    o.data.update()
    return o


def torus(R, r, loc, role, axis="Z", major=10, minor=4):
    return kit.torus("p", R, r, loc, axis=axis, mat=M[role], major=major, minor=minor)  # noqa: F821


ROOT = [None]
X = [0.0]
NAMES = []


def node(name, parts, step=0.0, origin=None):
    """Join parts built around (X[0], 0) into a node; origin defaults to its ground centre (X[0], 0, 0)."""
    o = kit.join(parts, name, parent=ROOT[0])  # noqa: F821
    kit.shade(o, None)  # noqa: F821
    kit.set_origin(o, origin or (X[0], 0, 0))  # noqa: F821
    NAMES.append(name)
    X[0] += step
    return o


# ================================================================= chests
def chest(tier):
    """A drowned-world treasure chest in the chestMesh() frame: body 1.4 x 0.9 x 0.8 (x s), a half-round lid hinged
    at the back top edge. small: a salvaged footlocker; grand: the Redfinch hoard chest with the bronze grinning-sun
    lock; sea: a strongbox the sea kept for years, crusted with barnacles and trailing kelp."""
    s = {"small": 1.0, "grand": 1.5, "sea": 1.1}[tier]
    wood = {"small": "wood_dk", "grand": "wood_deep", "sea": "slate"}[tier]
    band = {"small": "gun", "grand": "bronze", "sea": "rust_dark"}[tier]
    x = X[0]
    q = [B((1.4 * s, 0.9 * s, 0.8 * s), (x, 0, 0.4 * s), wood)]
    for k in range(3):  # plank seams
        q.append(B((1.41 * s, 0.91 * s, 0.025 * s), (x, 0, (0.2 + k * 0.2) * s), "char" if tier != "sea" else "oxide"))
    q.append(B((1.44 * s, 0.94 * s, 0.12 * s), (x, 0, 0.06 * s), band))  # plinth band
    for sx in (-0.45, 0.45):  # straps
        q.append(B((0.12 * s, 0.94 * s, 0.82 * s), (x + sx * s, 0, 0.4 * s), band))
    for cx in (-1, 1):  # corner caps
        for cy in (-1, 1):
            q.append(B((0.14 * s, 0.14 * s, 0.14 * s), (x + cx * 0.66 * s, cy * 0.41 * s, 0.07 * s), band))
    # the hoard, seen when the lid opens: a heaped top of coins and a gleam
    q.append(B((1.3 * s, 0.8 * s, 0.05 * s), (x, 0, 0.78 * s), "gold"))
    for k in range(7):
        q.append(ball(0.12 * s, (x + RNG.uniform(-0.5, 0.5) * s, RNG.uniform(-0.28, 0.28) * s, 0.8 * s), RNG.choice(("gold", "amber", "bronze")),
                      scale=(1, 1, 0.35), seed=k, wobble=0.1, sub=0))
    # the lock plate on the front (-Y)
    if tier == "grand":
        q.append(C(0.17 * s, 0.05 * s, (x, -0.47 * s, 0.62 * s), "bronze", axis="Y", verts=12))
        for k in range(8):
            a = k * math.tau / 8
            q.append(tf(kit.prism("p", [(-0.04 * s, 0), (0.04 * s, 0), (0, 0.09 * s)], 0.04 * s, (x, -0.47 * s, 0.62 * s), axis="Y", mat=M["gold"]),  # noqa: F821
                        rot=(0, a, 0), pivot=(x, -0.47 * s, 0.62 * s), move=(math.sin(a) * 0.19 * s, 0, math.cos(a) * 0.19 * s)))
        q.append(B((0.05 * s, 0.03 * s, 0.07 * s), (x, -0.5 * s, 0.6 * s), "char"))  # keyhole
        for k in range(6):  # studs along the straps
            q.append(ball(0.03 * s, (x + (-0.45 if k % 2 else 0.45) * s, -0.47 * s, (0.2 + (k // 2) * 0.2) * s), "gold", seed=k, wobble=0, sub=0))
    else:
        q.append(B((0.22 * s, 0.06 * s, 0.26 * s), (x, -0.47 * s, 0.62 * s), "steel" if tier == "small" else "bronze"))
        q.append(B((0.14 * s, 0.08 * s, 0.14 * s), (x, -0.52 * s, 0.5 * s), "rust" if tier == "small" else "oxide"))  # padlock
        q.append(torus(0.05 * s, 0.015 * s, (x, -0.52 * s, 0.6 * s), "steel", axis="Y", major=8))
    if tier == "sea":
        for k in range(9):
            q.append(ball(RNG.uniform(0.05, 0.09) * s, (x + RNG.uniform(-0.65, 0.65) * s, RNG.choice((-0.46, 0.46)) * s, RNG.uniform(0.08, 0.5) * s), "barnacle",
                          scale=(1, 0.6, 1), seed=40 + k, wobble=0.1, sub=0))
        for k in range(3):
            q.append(B((0.06 * s, 0.02 * s, 0.5 * s), (x - 0.5 * s + k * 0.45 * s, -0.47 * s, 0.35 * s), "kelp", rot=(0, RNG.uniform(-0.3, 0.3), 0)))
    if tier == "small":
        q.append(B((0.5 * s, 0.02 * s, 0.18 * s), (x - 0.15 * s, -0.46 * s, 0.25 * s), "paint"))  # a stencilled number
    node(f"chest_{tier}_body", q)
    # lid: half-cylinder along X, hinged at the back top edge (three.js (0, 0.8s, -0.45s) -> Blender (0, +0.45s, 0.8s))
    hinge = (x, 0.45 * s, 0.8 * s)
    q = [C(0.45 * s, 1.4 * s, (x, 0, 0.8 * s), wood, axis="X", verts=12, arc=(0, math.pi))]
    for sx in (-0.45, 0.45):
        q.append(C(0.47 * s, 0.12 * s, (x + sx * s, 0, 0.8 * s), band, axis="X", verts=12, arc=(0, math.pi)))
    q.append(B((1.44 * s, 0.94 * s, 0.05 * s), (x, 0, 0.81 * s), band))
    q.append(B((0.16 * s, 0.05 * s, 0.2 * s), (x, -0.47 * s, 0.9 * s), "gold" if tier == "grand" else "steel"))  # hasp
    if tier == "sea":
        for k in range(6):
            a = RNG.uniform(0.3, 2.8)
            q.append(ball(0.07 * s, (x + RNG.uniform(-0.6, 0.6) * s, math.cos(a) * 0.45 * s, 0.8 * s + math.sin(a) * 0.45 * s), "barnacle", seed=60 + k, wobble=0.1, sub=0))
        q.append(ball(0.2 * s, (x + 0.3 * s, 0, 1.22 * s), "algae", scale=(1.4, 1.0, 0.3), seed=70, wobble=0.2))
    node(f"chest_{tier}_lid", q, step=2.6 * s, origin=hinge)


def crate_find():
    """An island crate (crateFindMesh): 1.2 x 1.0 x 0.9, a lid hinged at the back (three.js (0, 0.92, -0.52))."""
    x = X[0]
    q = [B((1.2, 1.0, 0.9), (x, 0, 0.45), "wood_dk")]
    for zz in (0.2, 0.7):
        q.append(B((1.25, 1.05, 0.12), (x, 0, zz), "wood_deep"))
    for s in (-1, 1):
        q.append(B((0.1, 1.05, 0.92), (x + s * 0.58, 0, 0.46), "wood"))
    q.append(B((0.55, 0.02, 0.18), (x, -0.52, 0.45), "hazard"))
    q.append(B((0.3, 0.02, 0.08), (x, -0.53, 0.32), "char"))
    q.append(ball(0.12, (x + 0.5, -0.5, 0.3), "barnacle", scale=(1, 0.6, 1), seed=1, wobble=0.1, sub=0))
    q.append(B((0.05, 0.02, 0.4), (x - 0.4, -0.51, 0.5), "kelp", rot=(0, 0.2, 0)))
    node("crate_find_body", q)
    q = [B((1.25, 1.05, 0.12), (x, 0, 0.92), "wood")]
    for k in range(3):
        q.append(B((0.08, 1.06, 0.13), (x - 0.4 + k * 0.4, 0, 0.92), "wood_deep"))
    q.append(B((0.12, 0.04, 0.15), (x, -0.53, 0.88), "steel"))
    node("crate_find_lid", q, step=2.0, origin=(x, 0.52, 0.92))


def bottle():
    """A message in a bottle, lying on its side (bottleMesh): sea glass (rendered see-through in the game), the rolled
    letter inside, a waxed cork, a twist of twine."""
    x = X[0]
    ang = math.pi / 2.2
    piv = (x, 0, 0.2)

    def lay(o):
        return tf(o, rot=(0, ang, 0), pivot=piv)
    q = [lay(C(0.24, 0.9, (x, 0, 0.2), "glass", verts=12, r2=0.22)), lay(C(0.12, 0.32, (x, 0, 0.81), "glass", verts=10, r2=0.09)),
         lay(C(0.105, 0.04, (x, 0, 0.98), "glass", verts=10))]
    node("msg_bottle_glass", q)
    q = [lay(C(0.13, 0.55, (x, 0, 0.2), "cloth", verts=8)), lay(torus(0.135, 0.02, (x, 0, 0.2), "red", major=8)),
         lay(C(0.08, 0.15, (x, 0, 1.0), "wood_dk", verts=8)), lay(C(0.095, 0.05, (x, 0, 1.08), "red", verts=8)),
         lay(torus(0.1, 0.015, (x, 0, 0.93), "net", major=8))]
    node("msg_bottle", q, step=2.0)


def dig_mound():
    """The spoil heap beside a dug hole: shovelled sand with clods, a half-buried stone and a bit of shell."""
    x = X[0]
    q = [ball(0.55, (x, 0, 0.0), "sand", scale=(1.0, 0.8, 0.45), seed=5, wobble=0.15)]
    for k in range(6):
        a = RNG.uniform(0, math.tau)
        q.append(ball(RNG.uniform(0.08, 0.14), (x + math.cos(a) * 0.6, math.sin(a) * 0.5, 0.05), RNG.choice(("sand", "soil", "paint")), seed=10 + k, wobble=0.2, sub=0))
    q.append(ball(0.14, (x + 0.15, 0.1, 0.22), "concrete_dk", seed=20, wobble=0.2, sub=0))
    q.append(ball(0.06, (x - 0.2, -0.25, 0.18), "barnacle", scale=(1.4, 1, 0.5), seed=21, wobble=0.1, sub=0))
    node("dig_mound", q, step=2.0)


def crab():
    """A shore crab, rust-red under the grime: a broad carapace, eyes on stalks, one big claw and one small, and its
    legs as their own node (the game scuttles them)."""
    x = X[0]
    q = [ball(0.25, (x, 0, 0.17), "coral", scale=(1.35, 1.0, 0.55), seed=1, wobble=0.06)]
    q.append(ball(0.2, (x, 0.02, 0.24), "rust_hi", scale=(1.25, 0.85, 0.35), seed=2, wobble=0.05))  # the shell's top
    for s in (-1, 1):
        q.append(beam((x + s * 0.08, -0.2, 0.25), (x + s * 0.1, -0.22, 0.38), 0.02, "coral", verts=4))
        q.append(ball(0.045, (x + s * 0.1, -0.22, 0.4), "char", seed=3, wobble=0, sub=0))
        big = 1.35 if s > 0 else 0.9
        q.append(beam((x + s * 0.28, -0.12, 0.15), (x + s * 0.38, -0.3, 0.2), 0.045, "coral", verts=5))
        q.append(ball(0.1 * big, (x + s * 0.4, -0.36, 0.2), "coral", scale=(0.8, 1.3, 0.7), seed=4, wobble=0.05))
        q.append(ball(0.05 * big, (x + s * 0.36, -0.46, 0.2), "char", scale=(0.6, 1.4, 0.6), seed=5, wobble=0.05, sub=0))
    node("crab_body", q)
    q = []
    for s in (-1, 1):
        for k in range(3):
            yy = -0.08 + k * 0.1
            q.append(beam((x + s * 0.25, yy, 0.13), (x + s * 0.42, yy + 0.02, 0.17), 0.02, "coral", verts=4))
            q.append(beam((x + s * 0.42, yy + 0.02, 0.17), (x + s * 0.5, yy + 0.03, 0.0), 0.016, "rust_hi", verts=4))
    node("crab_legs", q, step=2.0)


def gull():
    """A soot-dark scavenger gull (the sky's 18 circling birds): body, head, hooked beak, tail; its left wing as its
    own node, origin at the shoulder, so the game can flap it (and mirror it for the right). Built at 1/1.6 of the
    on-screen size: the game scales the bird by 1.6 as it did."""
    x = X[0]
    q = [ball(0.19, (x, 0, 0), "char", scale=(0.95, 2.0, 0.9), seed=1, wobble=0.04)]
    q.append(ball(0.12, (x, -0.38, 0.08), "slate", scale=(0.9, 1.1, 0.95), seed=2, wobble=0.03))  # head
    q.append(beam((x, -0.48, 0.07), (x, -0.62, 0.04), 0.035, "hazard", verts=4, t2=0.005))  # beak
    q.append(ball(0.03, (x - 0.08, -0.42, 0.12), "foam", seed=3, wobble=0, sub=0))
    q.append(ball(0.03, (x + 0.08, -0.42, 0.12), "foam", seed=3, wobble=0, sub=0))
    q.append(kit.prism("p", [(-0.14, 0), (0.14, 0), (0.06, 0.28), (-0.06, 0.28)], 0.04, (x, 0.36, 0.02), axis="Z", mat=M["slate"]))  # noqa: F821  tail
    node("gull_body", q, origin=(x, 0, 0))
    # left wing: a broad inner arm and a swept, tapering hand, slate with a pale trailing edge
    q = [kit.prism("p", [(0, -0.25), (0.75, -0.18), (0.75, 0.2), (0, 0.3)], 0.04, (x, 0, 0.02), axis="Z", mat=M["slate"]),  # noqa: F821
         kit.prism("p", [(0.73, -0.18), (1.6, 0.1), (1.5, 0.26), (0.73, 0.2)], 0.03, (x, 0, 0.05), axis="Z", mat=M["char"]),  # noqa: F821
         kit.prism("p", [(0.05, 0.27), (0.75, 0.18), (0.75, 0.24), (0.05, 0.34)], 0.045, (x, 0, 0.02), axis="Z", mat=M["fog"])]  # noqa: F821
    node("gull_wing", q, step=3.0, origin=(x, 0, 0))


def pickups():
    """Beachcombing pickups (pickupMesh), each in the item's own colours: `<node>__a` / `__b` take items.ts colors."""
    def place(name, fixed, a, b=None, step=1.2):
        if fixed:
            node(name, fixed)
        node(name + "__a", a)
        if b:
            node(name + "__b", b)
        X[0] += step
    x = X[0]
    # conch / spiral: a whorled cone of stacked rings, flared lip
    q = []
    for k in range(5):
        q.append(tf(C(0.2 - k * 0.035, 0.12, (x + k * 0.09, 0, 0.13), "tint", axis="X", verts=8, r2=0.17 - k * 0.035), rot=(k * 0.5, 0, 0), pivot=(x + k * 0.09, 0, 0.13)))
    place("pickup_conch", None, q, [ball(0.15, (x - 0.1, 0, 0.12), "tint", scale=(0.6, 1, 1), seed=1, wobble=0.1)])
    x = X[0]
    q = []
    for i in range(5):  # starfish: five tapering arms, ridged
        a = i * math.tau / 5
        q.append(beam((x, 0, 0.04), (x + math.cos(a) * 0.3, math.sin(a) * 0.3, 0.02), 0.07, "tint", verts=4, t2=0.015))
    q.append(ball(0.08, (x, 0, 0.05), "tint", scale=(1, 1, 0.5), seed=2, wobble=0.05, sub=0))
    place("pickup_starfish", None, q)
    x = X[0]
    q = [C(0.22, 0.04, (x, 0, 0.03), "tint", verts=14)]
    place("pickup_sanddollar", [kit.prism("p", [(-0.03, 0), (0.03, 0), (0, 0.12)], 0.01, (x + 0.0, 0, 0.052), axis="Z", mat=M["fog"])], q)  # noqa: F821
    x = X[0]
    place("pickup_plank", [B((0.05, 0.04, 0.06), (x + 0.4, 0.1, 0.13), "rust_dark")], [B((1.4, 0.3, 0.12), (x, 0, 0.06), "tint"), B((1.38, 0.02, 0.13), (x, 0.05, 0.06), "tint")], step=1.8)
    x = X[0]
    place("pickup_rope", None, [torus(0.22, 0.07, (x, 0, 0.07), "tint", major=12, minor=5), torus(0.12, 0.06, (x + 0.05, 0, 0.15), "tint", major=10, minor=5)],
          [beam((x + 0.2, 0, 0.07), (x + 0.45, 0.1, 0.03), 0.05, "tint", verts=5)])
    x = X[0]
    lay = lambda o: tf(o, rot=(0, math.pi / 2, 0), pivot=(x, 0, 0.12))  # noqa: E731
    place("pickup_bottle", [lay(C(0.05, 0.08, (x, 0, 0.42), "wood_dk", verts=6))],
          [lay(C(0.13, 0.36, (x, 0, 0.12), "tint", verts=9, r2=0.11)), lay(C(0.06, 0.14, (x, 0, 0.35), "tint", verts=7))])
    x = X[0]
    q = []
    for k in range(5):
        a = k * 1.3
        q.append(beam((x, 0, 0), (x + math.cos(a) * 0.12, math.sin(a) * 0.1, 0.32 + (k % 2) * 0.08), 0.05, "tint", verts=5, t2=0.025))
        q.append(ball(0.04, (x + math.cos(a) * 0.12, math.sin(a) * 0.1, 0.33 + (k % 2) * 0.08), "tint", seed=k, wobble=0, sub=0))
    place("pickup_coral", [ball(0.12, (x, 0, 0.02), "barnacle", scale=(1, 1, 0.4), seed=9, wobble=0.15, sub=0)], q)
    x = X[0]
    place("pickup_gem", None, [ball(0.16, (x, 0, 0.13), "tint", seed=11, wobble=0.15, sub=0)], [ball(0.07, (x + 0.15, 0.05, 0.05), "tint", seed=12, wobble=0.2, sub=0)])


def finds_kit():
    ROOT[0] = kit.empty("finds_kit", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    for t in ("small", "grand", "sea"):
        chest(t)
    crate_find()
    bottle()
    dig_mound()
    crab()
    gull()
    pickups()


# ================================================================= ship fittings
def fittings_kit():
    ROOT[0] = kit.empty("fittings_kit", (0, 0, 0), kind="ARROWS", size=2)  # noqa: F821
    # anchor: a stockless anchor (shank, crown, two broad flukes), its shackle and a few links of chain; hangs from
    # its ring (origin at the shank's centre, as the code-built one), 0.6 m tall
    x = X[0]
    q = [C(0.045, 0.62, (x, 0, 0), "gun", verts=6), C(0.07, 0.14, (x, 0, -0.27), "gun", verts=8)]
    for s in (-1, 1):
        q.append(beam((x, 0, -0.3), (x + s * 0.22, 0, -0.18), 0.04, "gun", verts=5))
        q.append(kit.prism("p", [(0, 0), (0.1, 0.02), (0.06, 0.16)], 0.05, (x + s * 0.2, 0, -0.2), axis="Y", mat=M["gun"]))  # noqa: F821
        q[-1].data.transform(Matrix.Translation((x + s * 0.2, 0, -0.2)) @ Matrix.Scale(s, 4, (1, 0, 0)) @ Matrix.Translation((-(x + s * 0.2), 0, 0.2)))
    q.append(torus(0.07, 0.022, (x, 0, 0.36), "rust_dark", axis="Y", major=8))
    for k in range(3):
        q.append(torus(0.045, 0.014, (x, 0, 0.47 + k * 0.08), "rust", axis="Y" if k % 2 else "X", major=6))
    node("anchor", q, step=1.5, origin=(x, 0, 0))
    # paddle: a scavenged oar, shaft taped where it split, blade cut from a road sign
    x = X[0]
    q = [C(0.035, 2.2, (x, 0, 0), "wood", axis="Y", verts=6), C(0.04, 0.18, (x, -0.55, 0), "tyre", axis="Y", verts=6),
         B((0.22, 0.55, 0.03), (x + 0.15, 1.02, 0), "hazard"), B((0.06, 0.4, 0.035), (x + 0.15, 1.02, 0), "red")]
    node("paddle", q, step=1.5, origin=(x, 0, 0))
    # the skiff's rudder and tiller (a cut-down steel sign on a pipe stock), origin at the transom head
    x = X[0]
    q = [B((0.07, 0.42, 0.75), (x, 0.16, -0.4), "rust", taper=0.15), B((0.075, 0.43, 0.12), (x, 0.16, -0.72), "hazard"),
         C(0.03, 0.9, (x, -0.05, 0.0), "steel", verts=6), beam((x, -0.05, 0.12), (x, -0.8, 0.3), 0.03, "wood_dk", verts=5),
         C(0.04, 0.12, (x, -0.8, 0.3), "tyre", axis="Y", verts=6)]
    node("skiff_rudder", q, step=1.5, origin=(x, 0, 0))
    # the skiff's mast: 3 m of rusty scaffold pipe, a hazard-taped collar, a clamp and a pulley at the top
    x = X[0]
    q = [C(0.075, 3.0, (x, 0, 1.5), "concrete_dk", verts=8, r2=0.065), C(0.09, 0.16, (x, 0, 0.5), "hazard", verts=8),
         C(0.095, 0.05, (x, 0, 0.5), "char", verts=8), C(0.085, 0.5, (x, 0, 1.3), "rust", verts=8),
         B((0.2, 0.06, 0.08), (x, 0, 2.9), "gun"), torus(0.05, 0.015, (x + 0.1, 0, 2.85), "steel", axis="Y", major=8)]
    node("skiff_mast", q, step=1.5, origin=(x, 0, 0))
    # the captain's salvaged shovel, in the frame of the code-built one (shaft along +Z = the hand bone's local Y):
    # an ash shaft taped where it split, a D-grip of bent pipe, a steel blade with a rolled step
    x = X[0]
    q = [C(0.017, 0.95, (x, 0, 0.12), "wood", verts=6), C(0.02, 0.12, (x, 0, -0.05), "tyre", verts=6),
         C(0.024, 0.1, (x, 0, -0.3), "steel", verts=6), B((0.17, 0.016, 0.22), (x, -0.02, -0.42), "steel", taper=-0.1),
         B((0.17, 0.03, 0.025), (x, -0.025, -0.31), "gun"), beam((x - 0.06, 0, 0.6), (x + 0.06, 0, 0.6), 0.014, "rust", verts=5),
         beam((x - 0.06, 0, 0.6), (x - 0.02, 0, 0.5), 0.012, "rust", verts=4), beam((x + 0.06, 0, 0.6), (x + 0.02, 0, 0.5), 0.012, "rust", verts=4)]
    node("shovel", q, step=1.0, origin=(x, 0, 0))
    # trophy plinth and trophies (trophyGeometry): `__a` / `__b` take the item's colours
    x = X[0]
    node("trophy_base", [C(0.24, 0.14, (x, 0, 0.07), "wood_deep", verts=10, r2=0.21), C(0.25, 0.03, (x, 0, 0.015), "bronze", verts=10)], step=1.0)

    def trophy(name, fixed, a, b=None):
        if fixed:
            node(name, fixed)
        node(name + "__a", a)
        if b:
            node(name + "__b", b)
        X[0] += 1.0
    x = X[0]
    trophy("trophy_idol", None, [ball(0.17, (x, 0, 0.3), "tint", scale=(1.1, 0.9, 1.3), seed=1, wobble=0.05), ball(0.1, (x, 0, 0.5), "tint", seed=2, wobble=0.05)],
           [ball(0.045, (x - 0.06, -0.15, 0.5), "tint", seed=3, wobble=0, sub=0), ball(0.045, (x + 0.06, -0.15, 0.5), "tint", seed=3, wobble=0, sub=0)])
    x = X[0]
    trophy("trophy_bell", [B((0.4, 0.04, 0.04), (x, 0, 0.6), "wood_dk"), C(0.015, 0.06, (x, 0, 0.56), "gun", verts=4)],
           [C(0.2, 0.3, (x, 0, 0.36), "tint", verts=12, r2=0.09), C(0.21, 0.03, (x, 0, 0.21), "tint", verts=12)], [ball(0.04, (x, 0, 0.23), "tint", seed=4, wobble=0, sub=0)])
    x = X[0]
    q = [C(0.2, 0.05, (x, 0, 0.4), "tint", axis="Y", verts=12)]
    for i in range(8):
        a = i * math.tau / 8
        q.append(tf(kit.prism("p", [(-0.05, 0), (0.05, 0), (0, 0.14)], 0.04, (x, 0, 0.4), axis="Y", mat=M["tint"]), rot=(0, a, 0), pivot=(x, 0, 0.4),  # noqa: F821
                    move=(math.sin(a) * 0.22, 0, math.cos(a) * 0.22)))
    trophy("trophy_mask", [ball(0.04, (x - 0.07, -0.04, 0.44), "char", seed=5, wobble=0, sub=0), ball(0.04, (x + 0.07, -0.04, 0.44), "char", seed=5, wobble=0, sub=0)], q)
    x = X[0]
    trophy("trophy_spyglass", [B((0.05, 0.05, 0.16), (x, 0, 0.22), "wood_dk")],
           [tf(C(0.06, 0.5, (x, 0, 0.32), "tint", verts=8, r2=0.045), rot=(0, 1.2, 0), pivot=(x, 0, 0.3))],
           [tf(C(0.065, 0.04, (x, 0, 0.42), "tint", verts=8), rot=(0, 1.2, 0), pivot=(x, 0, 0.3)), tf(C(0.065, 0.04, (x, 0, 0.22), "tint", verts=8), rot=(0, 1.2, 0), pivot=(x, 0, 0.3))])
    x = X[0]
    trophy("trophy_flag", [C(0.015, 0.6, (x - 0.1, 0, 0.4), "gun", verts=4)], [B((0.3, 0.01, 0.2), (x + 0.05, 0, 0.58), "tint")])
    x = X[0]
    trophy("trophy_whistle", [torus(0.03, 0.01, (x - 0.16, 0, 0.27), "steel", axis="Y", major=6)],
           [ball(0.12, (x, 0, 0.25), "tint", scale=(1.4, 1, 1), seed=6, wobble=0.03)], [tf(C(0.045, 0.12, (x + 0.2, 0, 0.27), "tint", verts=6), rot=(0, math.pi / 2, 0), pivot=(x + 0.2, 0, 0.27))])
    x = X[0]
    trophy("trophy_relic", None, [ball(0.16, (x, 0, 0.28), "tint", seed=7, wobble=0.15)])


BUILDERS = {"finds_kit": finds_kit, "fittings_kit": fittings_kit}
BUILDERS[ASSET]()
s = bpy.context.scene  # noqa: F821
s["gitcraft_brief"] = json.dumps({"asset_id": f"tb_{ASSET}", "template": "run_script:finds_assets", "params": {"asset": ASSET},
                                  "palette": A["palette"], "material_prefix": "TBF", "out_dir": OUT})
s["gitcraft_result"] = json.dumps({"contract": {"ground": False, "nodes": {"root": ASSET, **{n: n for n in NAMES}}}})
s["gitcraft_template"] = "run_script:finds_assets"
for o in s.objects:
    if o.type == "MESH":
        kit.bake_vertex_colors(o, M, jitter=0.06, seed=zlib.crc32(o.name.encode()) & 0xFFFF,  # noqa: F821
                               per_role_jitter={"glass": 0.0, "lamp": 0.0, "tint": 0.04, "gold": 0.03})
os.makedirs(os.path.join(OUT, "source"), exist_ok=True)
blend = os.path.join(OUT, "source", f"tb_{ASSET}.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend, compress=True)  # noqa: F821
per = {o.name: sum(len(p.vertices) - 2 for p in o.data.polygons) for o in s.objects if o.type == "MESH"}
print(json.dumps({"blend": blend, "tris": sum(per.values()), "per_node": per}))
