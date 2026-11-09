"""TIDEBREAKERS: apocalyptic-pirate survivors, authored for GITCRAFT MeshCraft `run_script`.

    run_script {"path": ".../survivors.py",
                "args": {"asset": "captain", "out_dir": ".../creative/3d-characters/captain",
                         "palette": ".../creative/3d-waterworld/tidebreakers-waterworld-palette.json"}}

Replaces the block-toy deckhands with people. What makes them read as human at phone size:
  * real proportions: ~7.3 heads tall, a small head on a neck, shoulders wider than hips (or the reverse),
    a narrow waist, tapered limbs with a calf and a forearm, hands with fingers and a thumb;
  * a sculpted head: a skull that is taller than wide, a jaw that narrows to a chin, a brow ridge,
    eye sockets, a nose, ears, a mouth line, brows, and hair/beard as their own masses;
  * continuous lofted torso and limbs, smooth-shaded, with *blended* joint weights (shoulders, elbows,
    hips and knees bend instead of hinging rigid blocks);
  * clothing as layers over the body: long patched coats with open fronts and flared skirts, sleeves,
    belts, bandoliers, scarves, armour made from road signs and car hoods, hats with goggles.

Rig: MeshCraft's 22-bone Mixamo-named skeleton (engine/procedural/builders.SKELETON) and its clip authoring
helpers, so the game's crew loader and any Mixamo clip retarget unchanged. Extra clips (Sit, Dig, Cheer)
are authored with the same helpers. Front = -Y (=> +Z in three.js). Origin = between the feet.
"""
import json, math, os, random, zlib, importlib
import bmesh
from mathutils import Matrix, Vector

A = args  # noqa: F821
PAL = Palette.from_file(A["palette"])  # noqa: F821
ASSET = A["asset"]
OUT = A["out_dir"]
bpy_ = bpy  # noqa: F821
B = importlib.import_module("engine.procedural.builders")
SK = B.SKELETON
MX = B.MIXAMO
RNG = random.Random(zlib.crc32(ASSET.encode()))

kit.reset()  # noqa: F821
M = kit.Materials(PAL, {}, prefix="TBC")  # noqa: F821


def mat(hexcol, role=None):
    role = role or "c" + hexcol.lstrip("#").lower()
    if role not in M.mats:
        M.add(role, hexcol, rough=0.8)
    return M[role]


# ------------------------------------------------------------------ geometry
def ring(n, rx, ry, z, cx=0.0, cy=0.0, a0=0.0, a1=math.tau, closed=True, squareness=0.0):
    pts = []
    count = n if closed else n + 1
    for i in range(count):
        a = a0 + (a1 - a0) * i / n
        c, s = math.cos(a), math.sin(a)
        if squareness:  # superellipse-ish: flatter sides (shoulders, coats)
            k = squareness
            c = math.copysign(abs(c) ** (1 - k), c)
            s = math.copysign(abs(s) ** (1 - k), s)
        pts.append(Vector((cx + rx * c, cy + ry * s, z)))
    return pts


def loft(name, rings, material, closed=True, cap_bottom=True, cap_top=True, smooth=True):
    """Skin a list of point rings (same length) into one surface."""
    bm = bmesh.new()
    vs = [[bm.verts.new(p) for p in r] for r in rings]
    n = len(rings[0])
    for i in range(len(vs) - 1):
        for j in range(n if closed else n - 1):
            a, b = vs[i][j], vs[i][(j + 1) % n]
            c, d = vs[i + 1][(j + 1) % n], vs[i + 1][j]
            bm.faces.new((a, b, c, d))
    if closed and cap_bottom:
        bm.faces.new(list(reversed(vs[0])))
    if closed and cap_top:
        bm.faces.new(vs[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy_.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    o = bpy_.data.objects.new(name, me)
    bpy_.context.scene.collection.objects.link(o)
    o.data.materials.append(material)
    for p in o.data.polygons:
        p.use_smooth = smooth
    return o


def tube(name, a, b, radii, material, n=9, flat=1.0, smooth=True, cap=True):
    """Tapered limb from a to b; radii sampled along it (calf/forearm bulges). flat<1 flattens across Y."""
    a, b = Vector(a), Vector(b)
    L = (b - a).length
    rings = []
    k = len(radii)
    for i, r in enumerate(radii):
        t = i / (k - 1)
        rings.append(ring(n, r, r * flat, t * L))
    o = loft(name, rings, material, cap_bottom=cap, cap_top=cap, smooth=smooth)
    q = Vector((0, 0, 1)).rotation_difference((b - a).normalized())
    o.data.transform(Matrix.Translation(a) @ q.to_matrix().to_4x4())
    return o


def box(name, size, loc, material, rot=(0, 0, 0), bevel=0.0):
    o = kit.box(name, size, loc, material, bevel=bevel)  # noqa: F821
    if any(rot):
        tf(o, rot, loc)
    return o


def cyl(name, r, depth, loc, material, axis="Z", n=10, r2=None):
    return kit.cylinder(name, r, depth, loc, axis=axis, verts=n, mat=material, r2=r2)  # noqa: F821


def blob(name, r, loc, material, scale=(1, 1, 1), sub=2, seed=0, wobble=0.0):
    return kit.ico(name, r, loc, material, sub=sub, scale=scale, seed=seed, wobble=wobble)  # noqa: F821


def tf(o, rot=(0, 0, 0), pivot=(0, 0, 0), move=(0, 0, 0)):
    p = Vector(pivot)
    R = Matrix.Translation(p) @ (Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")) @ Matrix.Translation(-p)
    o.data.transform(Matrix.Translation(Vector(move)) @ R)
    o.data.update()
    return o


def deform(o, fn):
    for v in o.data.vertices:
        v.co = fn(v.co.copy())
    o.data.update()
    return o


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ------------------------------------------------------------------ skinning
PARTS = []  # (object, bone or "AUTO_TORSO" / "SKIRT")


def part(bone, *objs):
    for o in objs:
        PARTS.append((o, bone))
    return objs


def bone_seg(name):
    h, t, par = SK[name]
    return Vector(h), Vector(t), par


CHILD = {"LeftArm": "LeftForeArm", "LeftForeArm": "LeftHand", "LeftUpLeg": "LeftLeg", "LeftLeg": "LeftFoot",
         "RightArm": "RightForeArm", "RightForeArm": "RightHand", "RightUpLeg": "RightLeg", "RightLeg": "RightFoot",
         "Spine": "Spine1", "Spine1": "Spine2", "Neck": "Head", "LeftShoulder": "LeftArm", "RightShoulder": "RightArm"}
BLEND = {"LeftArm": 0.07, "RightArm": 0.07, "LeftForeArm": 0.06, "RightForeArm": 0.06, "LeftUpLeg": 0.08, "RightUpLeg": 0.08,
         "LeftLeg": 0.07, "RightLeg": 0.07, "Spine": 0.05, "Spine1": 0.05, "Spine2": 0.06, "Hips": 0.05, "Neck": 0.03, "Head": 0.03,
         "LeftShoulder": 0.05, "RightShoulder": 0.05, "LeftHand": 0.03, "RightHand": 0.03}


def torso_bone(z):
    if z < 1.05:
        return "Hips"
    if z < 1.17:
        return "Spine"
    if z < 1.29:
        return "Spine1"
    if z < 1.42:
        return "Spine2"
    return "Neck"


def weights_for(co, bone):
    """Rigid ownership blended across the joint at each end of the bone."""
    if bone == "AUTO_TORSO":
        bone = torso_bone(co.z)
        if bone == "Spine2" and abs(co.x) > 0.16 and co.z > 1.3:  # shoulder mass rides with the clavicle
            return blend_pair("Spine2", ("Left" if co.x > 0 else "Right") + "Shoulder", smoothstep(0.16, 0.22, abs(co.x)) * 0.6)
    if bone == "SKIRT":  # coat tails / long skirts: follow the hips, swing with the nearer thigh
        side = "LeftUpLeg" if co.x > 0 else "RightUpLeg"
        k = smoothstep(0.02, 0.14, abs(co.x)) * smoothstep(0.95, 0.55, co.z) * 0.65
        return blend_pair("Hips", side, k)
    h, t, par = bone_seg(bone)
    d = t - h
    L = d.length
    s = (co - h).dot(d.normalized())
    bl = BLEND.get(bone, 0.04)
    w = {bone: 1.0}
    if par and s < bl:
        k = 0.5 * (1 - max(0.0, s) / bl)
        w = {bone: 1 - k, par: k}
    ch = CHILD.get(bone)
    if ch and s > L - bl:
        k = 0.5 * (s - (L - bl)) / bl
        w = {bone: w.get(bone, 1) - min(k, 0.5), ch: min(k, 0.5), **{b: v for b, v in w.items() if b != bone}}
    return w


def blend_pair(a, b, k):
    return {a: 1 - k, b: k}


def build_body_object():
    objs = []
    for o, bone in PARTS:
        groups = {}
        for v in o.data.vertices:
            for bn, wt in weights_for(o.matrix_world @ v.co, bone).items():
                if wt <= 0:
                    continue
                g = groups.get(bn) or o.vertex_groups.new(name=MX + bn)
                groups[bn] = g
                g.add([v.index], wt, "REPLACE")
        objs.append(o)
    body = kit.join(objs, ASSET + "_mesh")  # noqa: F821
    bm = bmesh.new()
    bm.from_mesh(body.data)
    bmesh.ops.dissolve_degenerate(bm, dist=1e-5, edges=bm.edges)
    bm.to_mesh(body.data)
    bm.free()
    return body


# ------------------------------------------------------------------ the human
SKINS = {"pale": "#E2B79A", "light": "#D19C79", "olive": "#B98458", "tan": "#9E6A45", "brown": "#7A4E33", "dark": "#563624"}


def human(p):
    """Body + head. p: frame m/f, build (girth), skin, hair, hairstyle, beard, age."""
    f = p.get("frame", "m") == "f"
    g = p.get("build", 1.0)
    skin = mat(SKINS.get(p.get("skin", "light"), p.get("skin", "#D19C79")), "skin")
    skin_dk = mat(_shade(SKINS.get(p.get("skin", "light"), "#D19C79"), 0.82), "skin_dk")
    shirt = mat(p.get("shirt", "#8E8470"))
    pants = mat(p.get("pants", "#4A463C"))
    boots = mat(p.get("boots", "#2E2620"))
    top_skin = p.get("bare_arms", False)
    # ---- torso: hips → waist → ribcage → chest → shoulders → neck base
    S = [  # z, half-width, half-depth, front offset (belly/chest), squareness
        (0.86, (0.165 if not f else 0.185) * g, 0.11 * g, 0.0, 0.25),
        (0.97, (0.16 if not f else 0.18) * g, 0.115 * g, -0.005, 0.25),
        (1.08, (0.145 if not f else 0.128) * g, 0.1 * g, -0.008 * g, 0.2),
        (1.19, (0.155 if not f else 0.14) * g, 0.105 * g, -0.01, 0.25),
        (1.29, (0.175 if not f else 0.155) * g, (0.112 if not f else 0.122) * g, -0.012 if not f else -0.02, 0.3),
        (1.37, (0.19 if not f else 0.165) * g, 0.1 * g, -0.005, 0.35),
        (1.43, 0.12 * g, 0.075, 0.0, 0.1),
        (1.47, 0.06, 0.055, 0.0, 0.0),
    ]
    rings = [ring(14, rx, ry, z, cy=cy, squareness=sq) for z, rx, ry, cy, sq in S]
    torso = loft("torso", rings, shirt)
    # colour the trousers below the belt
    for poly in torso.data.polygons:
        if poly.center.z < 1.0:
            poly.material_index = _slot(torso, pants)
    part("AUTO_TORSO", torso)
    part("Hips", cyl("belt", 0.168 * g if not f else 0.183 * g, 0.055, (0, 0, 1.0), mat(p.get("belt", "#3B2A1C")), n=14),
         box("buckle", (0.05, 0.02, 0.04), (0, -0.12 * g - 0.005, 1.0), mat("#8C7A4A")))
    # ---- neck + head
    part("Neck", tube("neck", (0, 0.005, 1.43), (0, 0.01, 1.53), [0.052, 0.048, 0.047], skin, n=9))
    head(p, skin, skin_dk)
    # ---- arms (T-pose along ±X), shoulders, hands
    for side, sx in (("Left", 1), ("Right", -1)):
        sh = Vector(SK[side + "Arm"][0])
        el = Vector(SK[side + "ForeArm"][0])
        wr = Vector(SK[side + "Hand"][0])
        upper_r = [0.062, 0.058, 0.052, 0.046, 0.043] if not f else [0.055, 0.05, 0.045, 0.04, 0.038]
        fore_r = [0.042, 0.046, 0.042, 0.035, 0.03] if not f else [0.037, 0.04, 0.036, 0.031, 0.027]
        upper_r = [r * g for r in upper_r]
        fore_r = [r * (0.5 + 0.5 * g) for r in fore_r]
        sleeve = skin if top_skin else shirt
        part(side + "Shoulder", blob("deltoid", 0.072 * g, (sx * 0.19 * g, 0, 1.385), sleeve, scale=(1.15, 1.0, 0.85)))
        part(side + "Arm", tube("upper", sh + Vector((sx * 0.01, 0, 0)), el, upper_r, sleeve, flat=0.92))
        part(side + "ForeArm", tube("fore", el, wr, fore_r, skin if p.get("rolled", True) or top_skin else sleeve, flat=0.85))
        hand(side, sx, wr, skin, skin_dk, gloves=p.get("gloves"))
        # ---- legs
        hip = Vector(SK[side + "UpLeg"][0])
        kn = Vector(SK[side + "Leg"][0])
        an = Vector(SK[side + "Foot"][0])
        hip = Vector((sx * (0.095 if not f else 0.105) * g, hip.y, 0.9))
        thigh_r = [0.088, 0.083, 0.072, 0.062, 0.055] if not f else [0.092, 0.085, 0.072, 0.06, 0.052]
        shin_r = [0.054, 0.06, 0.055, 0.045, 0.038, 0.035]
        part(side + "UpLeg", tube("thigh", hip, kn, [r * g for r in thigh_r], pants, flat=0.95))
        part(side + "Leg", tube("shin", kn, an + Vector((0, 0, 0.04)), [r * (0.6 + 0.4 * g) for r in shin_r], pants, flat=0.95))
        boot(side, sx, an, boots, high=p.get("high_boots", True))


def _shade(hexcol, k):
    h = hexcol.lstrip("#")
    r, g_, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    return "#%02X%02X%02X" % tuple(min(255, int(c * k)) for c in (r, g_, b))


def _slot(o, material):
    for i, m in enumerate(o.data.materials):
        if m == material:
            return i
    o.data.materials.append(material)
    return len(o.data.materials) - 1


def hand(side, sx, wr, skin, skin_dk, gloves=None):
    hm = mat(gloves) if gloves else skin
    x0 = wr.x
    parts = [box("palm", (0.085, 0.075, 0.03), (x0 + sx * 0.045, -0.004, wr.z - 0.004), hm, bevel=0.008)]
    for i in range(4):
        y = -0.03 + i * 0.02
        ln = (0.062, 0.07, 0.066, 0.052)[i]
        parts.append(box("finger", (ln, 0.017, 0.02), (x0 + sx * (0.088 + ln / 2), y, wr.z - 0.008 - 0.003 * i), hm, bevel=0.005))
    th = box("thumb", (0.05, 0.02, 0.022), (x0 + sx * 0.035, -0.05, wr.z - 0.01), hm, bevel=0.006)
    tf(th, (0, 0, sx * -0.6), (x0 + sx * 0.02, -0.04, wr.z))
    parts.append(th)
    part(side + "Hand", *parts)


def boot(side, sx, an, material, high=True):
    x = an.x
    top = 0.36 if high else 0.16
    shaft = tube("shaft", (x, 0.004, 0.05), (x, 0.0, top), [0.052, 0.05, 0.052, 0.056], material, n=10)
    foot = loft("foot", [ring(10, 0.048, 0.05, z, cy=cy) for z, cy in ((0.0, 0.02), (0.07, 0.0))] , material)
    toe = loft("toe", [ring(10, 0.047, 0.06, 0.0, cy=-0.09), ring(10, 0.042, 0.05, 0.065, cy=-0.07), ring(10, 0.02, 0.03, 0.08, cy=-0.05)], material)
    for o in (foot, toe):
        o.data.transform(Matrix.Translation((x, 0, 0)))
    sole = box("sole", (0.1, 0.27, 0.025), (x, -0.045, 0.012), mat("#1A1612"))
    part(side + "Leg", shaft)
    part(side + "Foot", foot, sole)
    part(side + "ToeBase", toe)
    if high:
        part(side + "Leg", cyl("cuff", 0.062, 0.04, (x, 0.0, top), material, n=10))


def head(p, skin, skin_dk):
    """A sculpted low-poly head: skull taller than wide, jaw narrowing to a chin, brow ridge, sockets, nose, ears."""
    cz = 1.63
    age = p.get("age", 0.3)
    f = p.get("frame", "m") == "f"
    h = kit.sphere("skull", 0.1, (0, 0, cz), skin, segs=16, rings=12)  # noqa: F821

    def sculpt(v):
        x, y, z = v.x, v.y, v.z - cz
        x *= 0.84
        y *= 0.98
        z *= 1.18
        # jaw: narrows below the cheekbones, chin forward
        jaw = smoothstep(-0.01, -0.1, z)
        x *= 1 - jaw * (0.34 if not f else 0.4)
        y *= 1 - jaw * 0.25
        if y < 0:
            y -= jaw * 0.012
        # back of the skull rounder and a touch fuller
        if y > 0.02 and z > -0.02:
            y *= 1.06
        # brow ridge + sockets + cheekbones on the face (front = -y)
        if y < -0.05:
            brow = math.exp(-((z - 0.028) / 0.016) ** 2) * (1 - smoothstep(0.05, 0.085, abs(x)))
            y -= brow * (0.009 if not f else 0.005)
            for ex in (-0.034, 0.034):
                sock = math.exp(-(((x - ex) / 0.018) ** 2 + ((z - 0.008) / 0.014) ** 2))
                y += sock * 0.008
            cheek = math.exp(-((abs(x) - 0.052) / 0.02) ** 2 - ((z + 0.012) / 0.02) ** 2)
            y -= cheek * 0.004
        # flatten the crown slightly
        if z > 0.07:
            z = 0.07 + (z - 0.07) * 0.85
        return Vector((x, y, z + cz))

    deform(h, sculpt)
    nose = loft("nose", [ring(4, 0.012, 0.004, cz + 0.024, cy=-0.087), ring(4, 0.014, 0.016, cz - 0.012, cy=-0.1), ring(4, 0.017, 0.014, cz - 0.028, cy=-0.098)],
                skin, smooth=False)
    tip = blob("nosetip", 0.012, (0, -0.108, cz - 0.022), skin, scale=(1.1, 0.9, 0.9), sub=1)
    ears = [blob("ear", 0.022, (s * 0.087, 0.006, cz - 0.004), skin_dk, scale=(0.4, 0.8, 1.25), sub=1) for s in (-1, 1)]
    eyes = []
    for s in (-1, 1):
        eyes.append(blob("eyewhite", 0.011, (s * 0.033, -0.083, cz + 0.008), mat("#D8D2C4"), scale=(1.3, 0.6, 0.8), sub=1))
        eyes.append(blob("iris", 0.0065, (s * 0.033, -0.09, cz + 0.008), mat(p.get("eyes", "#2A2018")), scale=(1, 0.6, 1), sub=1))
        brow = box("brow", (0.034, 0.012, 0.007 if not f else 0.005), (s * 0.034, -0.088, cz + 0.026), mat(p.get("brows", p.get("hair", "#2A2018"))), bevel=0.002)
        tf(brow, (0, s * (0.12 if age > 0.5 else 0.05), 0), (s * 0.034, -0.088, cz + 0.026))
        eyes.append(brow)
    mouth = box("mouth", (0.034, 0.008, 0.006), (0, -0.086, cz - 0.05), mat("#5A3028"), bevel=0.002)
    lip = box("lip", (0.03, 0.01, 0.006), (0, -0.084, cz - 0.057), skin_dk, bevel=0.002)
    part("Head", h, nose, tip, *ears, *eyes, mouth, lip)
    if p.get("eyepatch"):
        part("Head", box("patch", (0.03, 0.01, 0.026), (0.033 * p["eyepatch"], -0.094, cz + 0.008), mat("#141210"), bevel=0.004),
             tube("strap", (-0.09, -0.02, cz + 0.035), (0.09, -0.02, cz + 0.0), [0.004, 0.004], mat("#141210"), n=4))
    if p.get("scar"):
        part("Head", box("scar", (0.004, 0.006, 0.04), (-0.05, -0.08, cz - 0.005), mat("#8C4B3A")))
    hair(p, cz)


def hair(p, cz):
    hc = mat(p.get("hair", "#2A2018"))
    style = p.get("hairstyle", "short")
    if style in ("short", "long", "dreads", "bun", "ponytail"):
        cap = kit.sphere("hair", 0.106, (0, 0.004, cz + 0.008), hc, segs=16, rings=10)  # noqa: F821
        bm_del(cap, lambda v: v.z < cz - 0.005 or (v.y < -0.06 and v.z < cz + 0.05))
        deform(cap, lambda v: Vector((v.x * 0.9, v.y, cz + (v.z - cz) * 1.12)))
        part("Head", cap)
    if style == "long":
        part("Neck", box("hairback", (0.17, 0.05, 0.2), (0, 0.065, cz - 0.08), hc, bevel=0.02))
    if style == "ponytail":
        part("Neck", tube("tail", (0, 0.1, cz + 0.02), (0, 0.13, cz - 0.17), [0.03, 0.026, 0.02, 0.01], hc, n=6))
    if style == "bun":
        part("Head", blob("bun", 0.045, (0, 0.085, cz + 0.05), hc, sub=1))
    if style == "dreads":
        for i in range(9):
            a = math.pi * (0.15 + 0.7 * i / 8)
            x, y = math.cos(a) * 0.09, abs(math.sin(a)) * 0.07 + 0.01
            part("Neck", tube("dread", (x, y, cz + 0.02), (x * 1.25, y + 0.03, cz - 0.2 - RNG.uniform(0, 0.08)), [0.014, 0.012, 0.009], hc, n=5))
    if style == "mohawk":
        for i in range(7):
            t = i / 6
            part("Head", cyl("spike", 0.016, 0.07 - abs(t - 0.4) * 0.05, (0, -0.05 + t * 0.15, cz + 0.105 - (t - 0.35) ** 2 * 0.12), hc, n=4, r2=0.003))
        side = kit.sphere("stubble", 0.104, (0, 0.006, cz + 0.006), mat(_shade(p.get("hair", "#2A2018"), 1.6)), segs=14, rings=9)  # noqa: F821
        bm_del(side, lambda v: v.z < cz - 0.005 or v.y < -0.06)
        part("Head", side)
    if style == "bald" and p.get("age", 0) > 0.6:
        ring_h = kit.sphere("fringe", 0.104, (0, 0.01, cz), hc, segs=14, rings=9)  # noqa: F821
        bm_del(ring_h, lambda v: v.z > cz + 0.03 or v.z < cz - 0.04 or v.y < -0.03)
        part("Head", ring_h)
    beard = p.get("beard")
    if beard:
        bc = mat(p.get("beard_color", p.get("hair", "#2A2018")))
        full = beard == "full"
        # a beard that follows the jaw and leaves the mouth clear: cheeks/jaw/chin only
        bd = kit.sphere("beard", 0.094, (0, -0.006, cz - 0.03), bc, segs=14, rings=10)  # noqa: F821
        bm_del(bd, lambda v: v.z > cz - 0.012 or v.y > 0.035 or (abs(v.x) < 0.024 and v.z > cz - 0.066 and v.y < -0.05))
        deform(bd, lambda v: Vector((v.x * (0.8 if full else 0.74), v.y * (1.0 if full else 0.93), v.z - (0.035 if full else 0.0) * smoothstep(cz - 0.06, cz - 0.12, v.z))))
        part("Head", bd)
        part("Head", box("moustache", (0.046, 0.012, 0.01), (0, -0.092, cz - 0.04), bc, bevel=0.004))


def bm_del(o, pred):
    bm = bmesh.new()
    bm.from_mesh(o.data)
    mw = o.matrix_world
    dead = [v for v in bm.verts if pred(mw @ v.co)]
    bmesh.ops.delete(bm, geom=dead, context="VERTS")
    bm.to_mesh(o.data)
    bm.free()
    o.data.update()
    for poly in o.data.polygons:
        poly.use_smooth = True


# ------------------------------------------------------------------ wardrobe
def coat(p, length=0.52, col="#5A4632", collar=True, open_front=0.55, sleeves=True, patches=True, flare=0.08):
    """Long patched coat: open front, flared tails, shoulders, sleeves over the arms, patches of other cloth."""
    g = p.get("build", 1.0)
    f = p.get("frame", "m") == "f"
    cm = mat(col)
    lining = mat(_shade(col, 0.6))
    a0, a1 = -math.pi / 2 + open_front / 2, -math.pi / 2 + math.tau - open_front / 2
    upper = [
        (1.44, 0.13 * g, 0.085, 0.0),
        (1.38, 0.205 * g if not f else 0.18 * g, 0.115 * g, 0.0),
        (1.29, 0.19 * g if not f else 0.172 * g, 0.125 * g, -0.012),
        (1.19, 0.17 * g if not f else 0.155 * g, 0.118 * g, -0.01),
        (1.08, 0.162 * g if not f else 0.148 * g, 0.114 * g, -0.008),
        (0.97, 0.18 * g if not f else 0.195 * g, 0.128 * g, -0.005),
    ]
    rings = [ring(14, rx, ry, z, cy=cy, a0=a0, a1=a1, closed=False, squareness=0.3) for z, rx, ry, cy in reversed(upper)]
    body = loft("coat", rings, cm, closed=False)
    part("AUTO_TORSO", body)
    if length > 0.0:
        lower = []
        zt = 0.97
        for i in range(4):
            t = (i + 1) / 4
            z = zt - length * t
            lower.append((z, (0.185 + flare * t) * g, (0.13 + flare * 0.8 * t) * g))
        tails = [ring(14, 0.18 * g, 0.128 * g, zt, a0=a0 + 0.12, a1=a1 - 0.12, closed=False, squareness=0.3)]
        tails += [ring(14, rx, ry, z, a0=a0 + 0.12 + 0.15 * (i + 1) / 4, a1=a1 - 0.12 - 0.15 * (i + 1) / 4, closed=False, squareness=0.25) for i, (z, rx, ry) in enumerate(lower)]
        skirt = loft("coattails", tails, cm, closed=False)
        # ragged hem: tear the bottom row unevenly
        hem_z = zt - length
        deform(skirt, lambda v: Vector((v.x, v.y, v.z + (RNG.uniform(-0.03, 0.025) if abs(v.z - hem_z) < 0.005 else 0))))
        part("SKIRT", skirt)
    if collar:
        part("Spine2", loft("collar", [ring(12, 0.125 * g, 0.09, 1.43, a0=a0 + 0.3, a1=a1 - 0.3, closed=False),
                                      ring(12, 0.15 * g, 0.115, 1.52, a0=a0 + 0.2, a1=a1 - 0.2, closed=False)], lining, closed=False))
    for s in (-1, 1):  # lapels
        lap = box("lapel", (0.05, 0.012, 0.22), (s * 0.075, -0.125 * g, 1.27), lining)
        tf(lap, (0, 0, s * 0.25), (s * 0.075, -0.125 * g, 1.27))
        part("Spine2", lap)
    if sleeves:
        for side, sx in (("Left", 1), ("Right", -1)):
            sh = Vector(SK[side + "Arm"][0])
            el = Vector(SK[side + "ForeArm"][0])
            wr = Vector(SK[side + "Hand"][0])
            part(side + "Shoulder", blob("coatshoulder", 0.08 * g, (sx * 0.195 * g, 0, 1.385), cm, scale=(1.15, 1.05, 0.85)))
            part(side + "Arm", tube("sleeve", sh + Vector((sx * 0.01, 0, 0)), el, [0.07 * g, 0.066 * g, 0.06 * g, 0.056 * g], cm, flat=0.95))
            part(side + "ForeArm", tube("cuffsleeve", el, wr - Vector((sx * 0.03, 0, 0)), [0.056 * g, 0.058 * g, 0.056 * g, 0.06 * g], cm, flat=0.92))
            part(side + "ForeArm", tube("cuff", wr - Vector((sx * 0.07, 0, 0)), wr - Vector((sx * 0.025, 0, 0)), [0.064 * g, 0.066 * g], lining, flat=0.92))
    if patches:
        for i in range(3):
            pc = mat(RNG.choice(("#6E6A5A", "#3E5C66", "#7A4A2A", "#8C8270", "#A24B21")))
            z = RNG.uniform(0.62, 1.3)
            a = RNG.uniform(0.6, 2.6) * RNG.choice((-1, 1))
            rx = 0.19 * g
            loc = (math.cos(a - math.pi / 2) * rx * 1.02, math.sin(a - math.pi / 2) * 0.13 * g * 1.04 + 0.01, z)
            pt = box("patch", (0.07, 0.006, 0.06), loc, pc)
            tf(pt, (0, 0, a), loc)
            part("Hips" if z < 0.97 else "AUTO_TORSO", pt)


def bandolier(p, col="#3B2A1C", shells="#B88A3A", side=1):
    g = p.get("build", 1.0)
    bm_ = mat(col)
    sh = mat(shells) if shells else None
    pts = []
    for i in range(9):
        t = i / 8
        z = 1.4 - t * 0.38
        x = side * (0.14 - t * 0.28) * g
        pts.append((x, z))
    for front, yk in ((-1, -1), (1, 1)):
        for i in range(8):
            (x0, z0), (x1, z1) = pts[i], pts[i + 1]
            y = yk * (0.122 * g if z0 < 1.3 else 0.112 * g) + yk * 0.006
            seg = tube("strap", (x0, y, z0), (x1, y, z1), [0.018, 0.018], bm_, n=4, flat=0.4)
            part("AUTO_TORSO", seg)
            if shells and front < 0 and i % 2 == 0 and 1 <= i <= 6:
                part("AUTO_TORSO", cyl("shell", 0.009, 0.05, ((x0 + x1) / 2, y - 0.012, (z0 + z1) / 2 + 0.02), sh, n=5))


def scarf(p, col="#7E3524", mask=False):
    g = p.get("build", 1.0)
    sc = mat(col)
    part("Neck", loft("scarf", [ring(12, 0.075, 0.07, 1.44), ring(12, 0.07, 0.068, 1.5), ring(12, 0.066, 0.064, 1.53)], sc))
    tail = box("scarftail", (0.06, 0.02, 0.2), (0.05, 0.075 * g, 1.36), sc, bevel=0.01)
    tf(tail, (0.15, 0, 0.1), (0.05, 0.075, 1.45))
    part("Spine2", tail)
    if mask:  # pulled up over the nose against spray and smoke
        part("Head", loft("mask", [ring(12, 0.088, 0.096, 1.55, cy=-0.008, a0=-math.pi + 0.5, a1=-0.5 + 0.0001, closed=False),
                                  ring(12, 0.085, 0.104, 1.62, cy=-0.004, a0=-math.pi + 0.45, a1=-0.45 + 0.0001, closed=False)], sc, closed=False))


def hat_tricorn(col="#2E2620", goggles=True):
    cz = 1.63
    hm = mat(col)
    hz = cz + 0.06
    brim = kit.cylinder("brim", 0.155, 0.012, (0, 0.006, hz), verts=24, mat=hm)  # noqa: F821
    # tricorn: the brim cocked up between three points (front, back-left, back-right), the points stay low
    def cock(v):
        r = math.hypot(v.x, v.y - 0.006)
        a = math.atan2(v.x, -(v.y - 0.006))
        up = max(0.0, -math.cos(3 * a)) * smoothstep(0.085, 0.155, r)
        k = 1 - 0.18 * up  # turned-up sides pull in toward the crown
        return Vector((v.x * k, 0.006 + (v.y - 0.006) * k, v.z + 0.075 * up))
    deform(brim, cock)
    crown = loft("crown", [ring(14, 0.1, 0.108, hz - 0.005), ring(14, 0.097, 0.104, hz + 0.06), ring(14, 0.078, 0.084, hz + 0.088)], hm)
    band = cyl("band", 0.102, 0.018, (0, 0, hz + 0.012), mat("#5A3A1E"), n=14)
    parts = [brim, crown, band]
    if goggles:
        for s in (-1, 1):
            parts.append(cyl("goggle", 0.024, 0.024, (s * 0.04, -0.104, hz + 0.035), mat("#8C6A34"), axis="Y", n=10))
            parts.append(cyl("lens", 0.018, 0.004, (s * 0.04, -0.117, hz + 0.035), mat("#4E7A82"), axis="Y", n=10))
    part("Head", *parts)


def hat_souwester(col="#C9A23A"):
    cz = 1.63
    hm = mat(col)
    crown = loft("sou", [ring(14, 0.11, 0.118, cz + 0.02), ring(14, 0.104, 0.11, cz + 0.1), ring(14, 0.06, 0.066, cz + 0.135)], hm)
    brim = kit.cylinder("soubrim", 0.16, 0.012, (0, 0.025, cz + 0.02), verts=20, mat=hm)  # noqa: F821
    deform(brim, lambda v: Vector((v.x, v.y, v.z - 0.06 * smoothstep(0.0, 0.16, v.y) * smoothstep(0.09, 0.16, math.hypot(v.x, v.y)))))
    part("Head", crown, brim)


def hood(col="#3E5C66"):
    cz = 1.63
    hm = mat(col)
    hd = kit.sphere("hood", 0.125, (0, 0.012, cz + 0.005), hm, segs=16, rings=10)  # noqa: F821
    bm_del(hd, lambda v: v.y < -0.045 and v.z < cz + 0.07)
    deform(hd, lambda v: Vector((v.x * 0.95, v.y, v.z + 0.012 * smoothstep(cz, cz + 0.12, v.z))))
    part("Head", hd)
    part("Neck", loft("cowl", [ring(12, 0.11, 0.1, 1.42), ring(12, 0.1, 0.1, 1.52)], hm))


def headwrap(col="#7A4A2A"):
    cz = 1.63
    w = kit.sphere("wrap", 0.112, (0, 0.01, cz + 0.022), mat(col), segs=16, rings=10)  # noqa: F821
    bm_del(w, lambda v: v.z < cz + 0.0 or (v.y < -0.07 and v.z < cz + 0.04))
    deform(w, lambda v: Vector((v.x, v.y * 1.05, cz + (v.z - cz) * 1.3)))
    part("Head", w, box("knot", (0.05, 0.03, 0.04), (0.03, -0.09, cz + 0.11), mat(_shade(col, 0.8)), bevel=0.012))


def cap_beanie(col="#3E5C66"):
    cz = 1.63
    b = kit.sphere("beanie", 0.11, (0, 0.006, cz + 0.02), mat(col), segs=16, rings=10)  # noqa: F821
    bm_del(b, lambda v: v.z < cz + 0.02)
    part("Head", b, cyl("roll", 0.108, 0.03, (0, 0.006, cz + 0.035), mat(_shade(col, 0.8)), n=16))


def goggles_forehead(col="#3A4148"):
    cz = 1.63
    parts = [tube("gstrap", (-0.105, 0.0, cz + 0.06), (0.105, 0.0, cz + 0.06), [0.012, 0.012], mat("#1A1612"), n=4)]
    for s in (-1, 1):
        parts.append(cyl("gog", 0.027, 0.03, (s * 0.038, -0.098, cz + 0.07), mat(col), axis="Y", n=10))
        parts.append(cyl("glens", 0.02, 0.004, (s * 0.038, -0.114, cz + 0.07), mat("#2F6F6A"), axis="Y", n=10))
    part("Head", *parts)


def glasses():
    cz = 1.63
    parts = []
    for s in (-1, 1):
        parts.append(kit.torus("rim", 0.016, 0.0028, (s * 0.034, -0.094, cz + 0.008), axis="Y", mat=mat("#8C7A4A"), major=10, minor=4))  # noqa: F821
    parts.append(box("bridge", (0.02, 0.004, 0.004), (0, -0.096, cz + 0.012), mat("#8C7A4A")))
    part("Head", *parts)


def pauldron(side="Left", col="#C8352A", stripe="#E9E2CC"):
    """Shoulder armour cut from a road sign, bolted to a strap."""
    sx = 1 if side == "Left" else -1
    plate = kit.sphere("pauldron", 0.11, (sx * 0.2, 0, 1.39), mat(col), segs=12, rings=8)  # noqa: F821
    bm_del(plate, lambda v: v.z < 1.37)
    deform(plate, lambda v: Vector((v.x, v.y * 1.1, v.z)))
    part(side + "Shoulder", plate, box("signstripe", (0.14, 0.2, 0.012), (sx * 0.2, 0, 1.47), mat(stripe)))
    for y in (-0.06, 0.06):
        part(side + "Shoulder", cyl("bolt", 0.009, 0.01, (sx * 0.2, y, 1.485), mat("#7F8A94"), n=6))


def chestplate(col="#8C3A26", trim="#7F8A94"):
    part("Spine2", loft("hood_plate", [ring(12, 0.17, 0.02, 1.37, cy=-0.12, a0=-math.pi, a1=0, closed=False),
                                       ring(12, 0.15, 0.022, 1.2, cy=-0.122, a0=-math.pi, a1=0, closed=False)], mat(col), closed=False))
    part("Spine1", box("hood_trim", (0.26, 0.01, 0.02), (0, -0.135, 1.2), mat(trim)))


def apron(col="#5A4632"):
    part("Hips", box("apron", (0.26, 0.012, 0.42), (0, -0.13, 0.82), mat(col), bevel=0.005))
    for x in (-0.08, 0.04):
        part("Hips", box("pocket", (0.08, 0.01, 0.07), (x, -0.138, 0.82), mat(_shade(col, 0.8))))


def pouch_belt(col="#4E2F1A"):
    for x, y in ((0.14, -0.06), (-0.15, -0.04), (0.16, 0.06)):
        part("Hips", box("pouch", (0.06, 0.05, 0.07), (x, y, 0.95), mat(col), bevel=0.008))


def rope_coil(side=1):
    part("Spine2", kit.torus("rope", 0.13, 0.022, (side * 0.06, 0.0, 1.27), axis="Y", mat=mat("#B89A64"), major=16, minor=5))  # noqa: F821


def poncho(col="#2F6FB0", length=0.42):
    part("AUTO_TORSO", loft("poncho", [ring(16, 0.1, 0.085, 1.47), ring(16, 0.27, 0.2, 1.36, squareness=0.2),
                                        ring(16, 0.3, 0.22, 1.36 - length * 0.5), ring(16, 0.29, 0.21, 1.36 - length)], mat(col), cap_bottom=False, cap_top=False))


def backpack(col="#5A4632"):
    part("Spine2", box("pack", (0.22, 0.12, 0.26), (0, 0.17, 1.24), mat(col), bevel=0.02))
    part("Spine2", cyl("bedroll", 0.045, 0.24, (0, 0.17, 1.4), mat("#6E6A5A"), axis="X", n=8))


# ------------------------------------------------------------------ scavenged armour (Waterworld x Mad Max pass)
RUST, STEEL, RUBBER, LEATHER = "#7A3A1E", "#6E7680", "#1E1C1A", "#3B2A1C"


def spikes(side, n=3, col="#9AA3AD", z=1.47, r=0.11):
    """Bolts filed to points, along the top of a shoulder plate."""
    sx = 1 if side == "Left" else -1
    for i in range(n):
        y = (i - (n - 1) / 2) * 0.05
        part(side + "Shoulder", cyl("spike", 0.012, 0.06, (sx * (0.2 + 0.01 * (i % 2)), y, z + 0.025), mat(col), n=5, r2=0.0005))


def tyre_pauldron(side="Left"):
    """Half a car tyre strapped over the shoulder: tread ridges, a bolt through the top."""
    sx = 1 if side == "Left" else -1
    t = kit.torus("tyre", 0.085, 0.04, (sx * 0.2, 0, 1.37), axis="Y", mat=mat(RUBBER), major=14, minor=6)  # noqa: F821
    bm_del(t, lambda v: v.z < 1.36)
    part(side + "Shoulder", t)
    for k in range(-2, 3):
        a = math.pi / 2 + k * 0.42
        x, z = sx * 0.2 + math.cos(a) * 0.125, 1.37 + math.sin(a) * 0.125
        part(side + "Shoulder", box("tread", (0.014, 0.075, 0.012), (x, 0, z), mat("#2E2B28"), rot=(0, -a + math.pi / 2, 0)))


def bracer(side, col=RUST, length=0.16):
    """A forearm guard beaten out of a tin can / pipe, two straps and rivets."""
    el = Vector(SK[side + "ForeArm"][0])
    wr = Vector(SK[side + "Hand"][0])
    d = (wr - el).normalized()
    a = wr - d * (0.035 + length)
    b = wr - d * 0.035
    part(side + "ForeArm", tube("bracer", a, b, [0.066, 0.07, 0.072], mat(col), n=10, flat=0.9))
    for t in (0.2, 0.8):
        c = a.lerp(b, t)
        part(side + "ForeArm", tube("bstrap", c - d * 0.008, c + d * 0.008, [0.075, 0.075], mat(LEATHER), n=10, flat=0.9))
    part(side + "ForeArm", cyl("rivet", 0.008, 0.008, (a.lerp(b, 0.5).x, -0.068, a.z + 0.0), mat("#9AA3AD"), axis="Y", n=6))


def kneepad(side, col=STEEL):
    """A knee plate cut from a hubcap / road sign, strapped on."""
    kx = SK[side + "Leg"][0][0]
    part(side + "Leg", cyl("knee", 0.058, 0.02, (kx, -0.07, 0.52), mat(col), axis="Y", n=12),
         cyl("kneebolt", 0.012, 0.01, (kx, -0.083, 0.52), mat("#2E2B28"), axis="Y", n=6))
    part(side + "Leg", tube("kstrap", (kx, 0.0, 0.44), (kx, 0.0, 0.452), [0.075, 0.075], mat(LEATHER), n=10))


def harness(p, col=LEATHER):
    """Crossed leather straps over the chest, a ring where they meet."""
    bandolier(p, col, None, side=1)
    bandolier(p, col, None, side=-1)
    g = p.get("build", 1.0)
    part("Spine1", kit.torus("hring", 0.022, 0.006, (0, -0.128 * g, 1.21), axis="Y", mat=mat("#9AA3AD"), major=10, minor=4))  # noqa: F821


def respirator(col="#3A4148", hanging=False):
    """A scavenged gas-mask snout and twin filter cans: worn over the mouth, or hanging at the neck."""
    cz = 1.63
    z, y, bone = (cz - 0.075, -0.1, "Head") if not hanging else (1.42, -0.115, "Spine2")
    parts = [cyl("snout", 0.04, 0.05, (0, y - 0.01, z), mat(col), axis="Y", n=12),
             cyl("valve", 0.022, 0.02, (0, y - 0.04, z - 0.005), mat("#9AA3AD"), axis="Y", n=8)]
    for s_ in (-1, 1):
        f = cyl("filter", 0.026, 0.05, (s_ * 0.055, y + 0.005, z - 0.012), mat("#5B6B3A"), axis="X", n=10)
        parts.append(f)
    if not hanging:
        parts.append(tube("mstrap", (-0.1, 0.0, z + 0.01), (0.1, 0.0, z + 0.01), [0.01, 0.01], mat(RUBBER), n=4))
    part(bone, *parts)


def goggles_eyes(col="#3A4148", lens="#B8642E"):
    """Goggles worn down over the eyes (lookouts, raiders): tinted lenses against glare off the water."""
    cz = 1.63
    parts = [tube("gestrap", (-0.106, 0.0, cz + 0.005), (0.106, 0.0, cz + 0.005), [0.012, 0.012], mat(RUBBER), n=4)]
    for s_ in (-1, 1):
        parts.append(cyl("egog", 0.026, 0.03, (s_ * 0.036, -0.095, cz + 0.008), mat(col), axis="Y", n=10))
        parts.append(cyl("elens", 0.02, 0.004, (s_ * 0.036, -0.111, cz + 0.008), mat(lens), axis="Y", n=10))
    part("Head", *parts)


def chain_loop(p, col="#6E7680"):
    """A length of chain worn as a sash."""
    g = p.get("build", 1.0)
    for i in range(10):
        t = i / 9
        z = 1.4 - t * 0.42
        x = (0.13 - t * 0.27) * g
        part("AUTO_TORSO", kit.torus("link", 0.016, 0.005, (x, -0.13 * g - 0.008, z), axis="Y" if i % 2 else "X", mat=mat(col), major=8, minor=4))  # noqa: F821


def tarp_patches(p, cols=("#B8642E", "#2F6FB0", "#8C8270"), n=4):
    """Stitched-on squares of tarp, sacking and road-sign over whatever they are wearing."""
    g = p.get("build", 1.0)
    for i in range(n):
        z = RNG.uniform(0.95, 1.32)
        a = RNG.uniform(0.4, 2.7) * RNG.choice((-1, 1))
        loc = (math.cos(a - math.pi / 2) * 0.2 * g, math.sin(a - math.pi / 2) * 0.14 * g, z)
        pt = box("tarp", (0.075, 0.006, 0.065), loc, mat(cols[i % len(cols)]))
        tf(pt, (0, 0, a), loc)
        part("AUTO_TORSO", pt)


# ----------------------------------------------------------------- held items (right hand, T-pose: blade along -Y)
def held(kind):
    wr = Vector(SK["RightHand"][0])
    x = wr.x - 0.075
    z = wr.z
    hm = []
    if kind == "cutlass":  # a blade cut from a car leaf-spring, rebar guard
        hm += [tube("grip", (x, 0.05, z), (x, -0.04, z), [0.016, 0.016], mat("#3B2A1C"), n=6),
               kit.torus("guard", 0.04, 0.008, (x, -0.045, z), axis="Y", mat=mat("#6B2E14"), major=10, minor=4),  # noqa: F821
               box("blade", (0.012, 0.6, 0.045), (x, -0.35, z + 0.012), mat("#9AA3AD")),
               box("bladetip", (0.012, 0.08, 0.03), (x, -0.68, z + 0.02), mat("#9AA3AD"))]
    elif kind == "wrench":
        hm += [box("wrench", (0.024, 0.34, 0.03), (x, -0.12, z), mat("#7F8A94")), box("jaw", (0.03, 0.05, 0.08), (x, -0.3, z + 0.02), mat("#7F8A94"))]
    elif kind == "gaff":
        hm += [tube("gaffpole", (x, 0.45, z), (x, -0.9, z), [0.014, 0.014], mat("#8A5A34"), n=5),
               kit.torus("hook", 0.06, 0.008, (x, -0.92, z + 0.05), axis="X", mat=mat("#7F8A94"), major=10, minor=4)]  # noqa: F821
    elif kind == "spyglass":
        hm += [tube("spy", (x, 0.08, z), (x, -0.28, z), [0.022, 0.026, 0.03], mat("#B88A3A"), n=8)]
    elif kind == "binoculars":
        hm += [cyl("binoc", 0.026, 0.12, (x, -0.04, z + 0.02), mat("#2B2F36"), axis="Y", n=8), cyl("binoc2", 0.026, 0.12, (x, -0.04, z - 0.04), mat("#2B2F36"), axis="Y", n=8)]
    elif kind == "grapple":
        hm += [tube("ghandle", (x, 0.05, z), (x, -0.22, z), [0.016, 0.016], mat("#7F8A94"), n=5)]
        for a in range(3):
            ang = a * math.tau / 3
            hm.append(tube("prong", (x, -0.22, z), (x + math.cos(ang) * 0.07, -0.3, z + math.sin(ang) * 0.07), [0.01, 0.006], mat("#6B2E14"), n=4))
    elif kind == "harpoon":
        hm += [tube("hshaft", (x, 0.5, z), (x, -1.0, z), [0.016, 0.014], mat("#4E2F1A"), n=5),
               loft("hhead", [ring(4, 0.025, 0.006, 0.0), ring(4, 0.001, 0.001, 0.14)], mat("#9AA3AD"))]
        hm[-1].data.transform(Matrix.Translation((x, -1.0, z)) @ Matrix.Rotation(math.pi / 2, 4, "X"))
    elif kind == "shovel":
        hm += [tube("shaft", (x, 0.12, z), (x, -0.7, z), [0.014, 0.014], mat("#8A5A34"), n=5), box("spade", (0.16, 0.2, 0.012), (x, -0.8, z), mat("#7F8A94"))]
    elif kind == "lantern":
        hm += [cyl("lant", 0.04, 0.1, (x, 0, z - 0.1), mat("#3A4148"), n=8), cyl("lantglass", 0.032, 0.06, (x, 0, z - 0.1), mat("#FFC46B", "lamp"), n=8)]
    if hm:
        part("RightHand", *hm)


# ------------------------------------------------------------------ Jury-Rigged (docs/jury-rigged): 5.5 heads
# The cast is authored at ~7.3 heads on MeshCraft's 22-bone skeleton. A Jury-Rigged character is the same build put
# through a PROPORTION PASS: every bone gets a scale (x, y, z in Blender space, z up, front -y) applied to its own
# vertices and to the offsets of its children, so joints stay joined and skin weights stay valid. Legs and spine get
# shorter, heads, hands and boots bigger; the armature is rebuilt from the warped joints and every Hips translation in
# the clips is scaled by the new hip height. Nothing about the original cast changes.
#
# Profiles are about function, not cuteness: the captain is round and grounded (big boots, wide hat, a life-vest
# worn as armour); the Rustfang raider is a forward-leaning wedge (huge shoulders and fists, narrow waist).
JURY = {
    "jury_captain": dict(lean=0.0, scale={
        "Hips": (1.12, 1.12, 0.74), "LeftUpLeg": (1.14, 1.14, 0.74), "LeftLeg": (1.14, 1.14, 0.74),
        "LeftFoot": (1.32, 1.32, 1.32), "LeftToeBase": (1.32, 1.32, 1.32),
        "Spine": (1.1, 1.12, 0.84), "Spine1": (1.14, 1.16, 0.84), "Spine2": (1.14, 1.16, 0.84), "Neck": (1.1, 1.1, 0.7),
        "Head": (1.14, 1.14, 1.14), "LeftShoulder": (1.16, 1.16, 1.0), "LeftArm": (0.82, 1.18, 1.18), "LeftForeArm": (0.84, 1.18, 1.18),
        "LeftHand": (1.38, 1.38, 1.38)}),
    "jury_raider": dict(lean=0.16, scale={
        "Hips": (0.96, 1.0, 0.74), "LeftUpLeg": (1.04, 1.04, 0.74), "LeftLeg": (1.0, 1.0, 0.74),
        "LeftFoot": (1.25, 1.25, 1.25), "LeftToeBase": (1.25, 1.25, 1.25),
        "Spine": (0.92, 1.0, 0.86), "Spine1": (1.12, 1.1, 0.86), "Spine2": (1.34, 1.2, 0.86), "Neck": (1.05, 1.05, 0.65),
        "Head": (1.12, 1.12, 1.12), "LeftShoulder": (1.4, 1.3, 1.1), "LeftArm": (0.96, 1.3, 1.3), "LeftForeArm": (0.98, 1.34, 1.34),
        "LeftHand": (1.5, 1.5, 1.5)}),
}
for _prof in JURY.values():
    for _k, _v in list(_prof["scale"].items()):
        if _k.startswith("Left"):
            _prof["scale"]["Right" + _k[4:]] = _v
SKR = dict(SK)  # the skeleton the rig is built from (warped for Jury-Rigged characters)
LOC_K = 1.0  # Hips translations in the clips scale with the new hip height


def jury_warp(body, prof):
    """Proportion pass: warp the joined, skinned body and return the warped skeleton (see JURY)."""
    S = {b: Vector(prof["scale"].get(b, (1.0, 1.0, 1.0))) for b in SK}
    newh = {}

    def nh(b):
        if b in newh:
            return newh[b]
        h, t, par = SK[b]
        h = Vector(h)
        if not par:
            newh[b] = h.copy()
        else:
            ph = Vector(SK[par][0])
            newh[b] = nh(par) + (h - ph) * S[par]
        return newh[b]

    hipz = SK["Hips"][0][2]
    lean = prof.get("lean", 0.0)

    def bend(v):  # forward lean of everything above the hips, eased in up the spine (front = -y)
        if not lean:
            return v
        k = smoothstep(hipz, hipz + 0.25, v.z) * lean
        y, z = v.y - 0.0, v.z - hipz
        return Vector((v.x, y * math.cos(k) - z * math.sin(k), hipz + y * math.sin(k) + z * math.cos(k)))

    idx = {g.index: g.name[len(MX):] for g in body.vertex_groups}
    pts = []
    for v in body.data.vertices:
        acc, tot = Vector((0, 0, 0)), 0.0
        for ge in v.groups:
            b = idx.get(ge.group)
            if b not in SK or ge.weight <= 0:
                continue
            h = Vector(SK[b][0])
            acc += (nh(b) + (v.co - h) * S[b]) * ge.weight
            tot += ge.weight
        pts.append(acc / tot if tot else v.co.copy())
    pts = [bend(p) for p in pts]
    floor = min(p.z for p in pts)
    for v, p in zip(body.data.vertices, pts):
        v.co = p - Vector((0, 0, floor))
    body.data.update()
    out = {}
    for b, (h, t, par) in SK.items():
        hh = bend(nh(b)) - Vector((0, 0, floor))
        tt = bend(nh(b) + (Vector(t) - Vector(h)) * S[b]) - Vector((0, 0, floor))
        out[b] = (tuple(hh), tuple(tt), par)
    return out, (out["Hips"][0][2]) / hipz


def hat_sailbrim(col="#C8A576", patch="#5A9FBF"):
    """Captain: a wide sun hat cut and stitched from an old sail, a blue patch, goggles on the band."""
    cz = 1.63
    hz = cz + 0.055
    brim = kit.cylinder("sbrim", 0.24, 0.014, (0, 0.004, hz), verts=28, mat=mat(col))  # noqa: F821
    deform(brim, lambda v: Vector((v.x, v.y, v.z - 0.035 * smoothstep(0.12, 0.24, math.hypot(v.x, v.y)) * (0.6 + 0.4 * math.sin(math.atan2(v.y, v.x) * 2)))))
    crown = loft("scrown", [ring(16, 0.104, 0.11, hz - 0.004), ring(16, 0.1, 0.106, hz + 0.075), ring(16, 0.07, 0.074, hz + 0.105)], mat(col))
    seam = cyl("sseam", 0.106, 0.012, (0, 0, hz + 0.04), mat("#8A6F52"), n=16)
    pt = box("spatch", (0.07, 0.012, 0.055), (0.04, -0.104, hz + 0.045), mat(patch))
    tf(pt, (0.0, 0.0, 0.35), (0.04, -0.104, hz + 0.045))
    parts = [brim, crown, seam, pt]
    for s_ in (-1, 1):
        parts.append(cyl("hgog", 0.026, 0.026, (s_ * 0.042, -0.108, hz + 0.022), mat("#6E7680"), axis="Y", n=10))
        parts.append(cyl("hlens", 0.02, 0.004, (s_ * 0.042, -0.122, hz + 0.022), mat("#4E7A82"), axis="Y", n=10))
    part("Head", *parts)


def life_vest(p, col="#D9733A", strap="#EDE6D6"):
    """Captain: a cracked-foam life jacket worn as armour over the coat: two fat front blocks, a collar cushion."""
    g = p.get("build", 1.0)
    vm, sm = mat(col), mat(strap)
    for s_ in (-1, 1):
        blk = box("vest", (0.13 * g, 0.075, 0.36), (s_ * 0.085 * g, -0.15 * g, 1.24), vm, bevel=0.03)
        part("Spine1", blk)
        part("Spine1", box("vstrap", (0.135 * g, 0.08, 0.03), (s_ * 0.085 * g, -0.152 * g, 1.17), sm))
    part("Spine2", loft("vcollar", [ring(14, 0.15 * g, 0.13, 1.42), ring(14, 0.13 * g, 0.12, 1.48)], vm, cap_top=False, cap_bottom=False))
    part("Spine2", box("vback", (0.3 * g, 0.07, 0.36), (0, 0.15 * g, 1.26), vm, bevel=0.03))
    part("Spine1", box("whistle", (0.02, 0.02, 0.05), (0.09, -0.2 * g, 1.31), mat("#C2443A")))


def gauntlet_rope(side="Right"):
    """Captain: a forearm wrapped in rope against the sheet and the winch handle."""
    el = Vector(SK[side + "ForeArm"][0])
    wr = Vector(SK[side + "Hand"][0])
    d = (wr - el).normalized()
    for i in range(6):
        c = wr - d * (0.04 + i * 0.03)
        part(side + "ForeArm", tube("rwrap", c - d * 0.011, c + d * 0.011, [0.072, 0.072], mat("#B89A64"), n=10, flat=0.92))


def mug_carabiner():
    """Captain: a tin mug clipped to the belt on a climbing carabiner (somebody's kitchen, somebody's mountain)."""
    part("Hips", kit.torus("carab", 0.022, 0.005, (-0.17, -0.07, 0.94), axis="X", mat=mat("#9AA3AD"), major=10, minor=4))  # noqa: F821
    part("Hips", cyl("mug", 0.035, 0.07, (-0.18, -0.09, 0.88), mat("#6E7680"), n=10))


def sawblade_pauldron(side="Left"):
    """Raider: a circular saw blade bolted upright on the shoulder, teeth out. The Rustfang badge, worn."""
    sx = 1 if side == "Left" else -1
    c = Vector((sx * 0.24, 0.02, 1.48))
    parts = [cyl("sblade", 0.17, 0.016, tuple(c), mat("#9AA3AD"), axis="X", n=20),
             cyl("shub", 0.05, 0.03, tuple(c), mat("#2E2B28"), axis="X", n=8)]
    for i in range(14):
        a = i / 14 * math.tau
        t = box("stooth", (0.018, 0.045, 0.03), (c.x, c.y + math.cos(a) * 0.185, c.z + math.sin(a) * 0.185), mat("#9AA3AD"))
        tf(t, (a + 0.5, 0, 0), (c.x, c.y + math.cos(a) * 0.185, c.z + math.sin(a) * 0.185))
        parts.append(t)
    part(side + "Shoulder", *parts)
    part(side + "Shoulder", box("smount", (0.05, 0.16, 0.1), (sx * 0.21, 0.02, 1.4), mat("#3A4148")))


def exhaust_pack():
    """Raider: two exhaust pipes on a back plate, standing up past the head, sooted at the mouth."""
    part("Spine2", box("eplate", (0.26, 0.05, 0.3), (0, 0.15, 1.28), mat("#3A4148"), bevel=0.01))
    for s_, h in ((-1, 0.62), (1, 0.5)):
        x = s_ * 0.08
        part("Spine2", tube("epipe", (x, 0.18, 1.15), (x + s_ * 0.03, 0.24, 1.15 + h), [0.03, 0.028, 0.028], mat("#6B2E14" if s_ < 0 else "#6E7680"), n=8))
        part("Spine2", cyl("esoot", 0.034, 0.05, (x + s_ * 0.03, 0.24, 1.15 + h), mat("#1F1D1C"), n=8))


def held_glaive():
    """Raider: a saw blade on a scaffold pole (a cutlass is a pirate's; Rustfang cuts with what cuts steel)."""
    wr = Vector(SK["RightHand"][0])
    x, z = wr.x - 0.075, wr.z
    # authored at 2/3 size: the raider's hand scale (JURY, 1.5) brings it to a 1.5 m pole and a 0.24 m blade
    parts = [tube("gpole", (x, 0.33, z), (x, -0.67, z), [0.012, 0.012], mat("#6E7680"), n=6),
             cyl("gblade", 0.11, 0.009, (x, -0.75, z), mat("#9AA3AD"), axis="X", n=20),
             cyl("ghub", 0.027, 0.02, (x, -0.75, z), mat("#2E2B28"), axis="X", n=8)]
    for i in range(12):
        a = i / 12 * math.tau
        t = box("gtooth", (0.011, 0.027, 0.018), (x, -0.75 + math.cos(a) * 0.115, z + math.sin(a) * 0.115), mat("#9AA3AD"))
        tf(t, (a + 0.5, 0, 0), (x, -0.75 + math.cos(a) * 0.115, z + math.sin(a) * 0.115))
        parts.append(t)
    part("RightHand", *parts)


# ------------------------------------------------------------------ clips (MeshCraft builders helpers)
_rot, _loc, _cycle, _new, _fin = B._rot, B._loc, B._cycle, B._new_action, B._finish
DOWN = B.ARMS_DOWN


def a_sit(arm):  # seated at the helm: knees up, one hand on the tiller
    def pose(t, f):
        s = math.sin(t * 2 * math.pi)
        _loc(arm, "Hips", (0, 0.05, -0.45), f)
        for side in ("Left", "Right"):
            _rot(arm, side + "UpLeg", [("X", -82)], f)
            _rot(arm, side + "Leg", [("X", 78)], f)
        _rot(arm, "Spine1", [("X", 4 + 1.5 * s)], f)
        _rot(arm, "LeftArm", [("Y", DOWN - 10), ("X", -35)], f)
        _rot(arm, "LeftForeArm", [("Z", 50)], f)
        _rot(arm, "RightArm", [("Y", -DOWN + 15), ("X", -45)], f)
        _rot(arm, "RightForeArm", [("Z", -30)], f)
        _rot(arm, "Head", [("Z", 18 * math.sin(t * 2 * math.pi + 0.6))], f)
    return _cycle(arm, "Sit", 80, pose, step=5)


def a_dig(arm):  # two-handed shovel strokes: bend into the ground, drive, lift
    def pose(t, f):
        sw = math.sin(t * 2 * math.pi)
        dn = max(0.0, sw)
        _loc(arm, "Hips", (0, 0.02, -0.04 - 0.07 * dn), f)
        _rot(arm, "Spine", [("X", 14 + 16 * dn)], f)
        _rot(arm, "Spine1", [("X", 6 + 6 * dn)], f)
        _rot(arm, "Head", [("X", -8)], f)
        _rot(arm, "LeftUpLeg", [("X", -22 - 10 * dn)], f)
        _rot(arm, "LeftLeg", [("X", 28 + 18 * dn)], f)
        _rot(arm, "RightUpLeg", [("X", 10)], f)
        _rot(arm, "RightLeg", [("X", 14 + 12 * dn)], f)
        _rot(arm, "RightArm", [("Y", -DOWN - 6), ("X", -52 - 15 * dn)], f)
        _rot(arm, "RightForeArm", [("Z", -12)], f)
        _rot(arm, "LeftArm", [("Y", DOWN + 4), ("X", -74 - 15 * dn)], f)
        _rot(arm, "LeftForeArm", [("Z", 38)], f)
    return _cycle(arm, "Dig", 30, pose, loop=True, step=3)


def a_cheer(arm):
    def pose(t, f):
        s = math.sin(t * 4 * math.pi)
        _loc(arm, "Hips", (0, 0, 0.05 * abs(s)), f)
        _rot(arm, "LeftArm", [("Y", -40 - 10 * s)], f)
        _rot(arm, "RightArm", [("Y", 40 + 10 * s)], f)
        _rot(arm, "LeftForeArm", [("Z", 15)], f)
        _rot(arm, "RightForeArm", [("Z", -15)], f)
        _rot(arm, "Head", [("X", -10)], f)
    return _cycle(arm, "Cheer", 40, pose, step=4)


def a_idle_human(arm):  # weight on one leg, breathing, a glance round: less mannequin than the stock idle
    def pose(t, f):
        s = math.sin(t * 2 * math.pi)
        _loc(arm, "Hips", (0.015, 0, -0.012 + 0.006 * s), f)
        _rot(arm, "Hips", [("Y", 3)], f)
        _rot(arm, "Spine1", [("X", 2 * s), ("Y", -2)], f)
        _rot(arm, "Spine2", [("X", 1.5 * s)], f)
        _rot(arm, "Head", [("Z", 14 * math.sin(t * 2 * math.pi + 1)), ("X", 3)], f)
        _rot(arm, "LeftArm", [("Y", DOWN + 4), ("X", 4 * s)], f)
        _rot(arm, "RightArm", [("Y", -DOWN - 6), ("X", -3 * s)], f)
        _rot(arm, "LeftForeArm", [("Z", 14)], f)
        _rot(arm, "RightForeArm", [("Z", -18)], f)
        _rot(arm, "LeftUpLeg", [("Y", -3)], f)
        _rot(arm, "RightUpLeg", [("X", -6), ("Y", 4)], f)
        _rot(arm, "RightLeg", [("X", 10)], f)
    return _cycle(arm, "Idle", 90, pose, step=6)


CLIPS = {"Idle": a_idle_human, "Walk": B.a_walk, "Run": B.a_run, "Interact": B.a_interact, "Attack": B.a_attack, "Sit": a_sit, "Dig": a_dig, "Cheer": a_cheer}


def rig(body, clips):
    root = kit.empty(ASSET, (0, 0, 0), kind="ARROWS", size=0.3)  # noqa: F821
    arm_d = bpy_.data.armatures.new("rig")
    arm = bpy_.data.objects.new(ASSET + "_rig", arm_d)
    bpy_.context.scene.collection.objects.link(arm)
    arm.parent = root
    arm["mc_convention"] = "mixamo"
    for o in bpy_.context.scene.objects:
        o.select_set(False)
    bpy_.context.view_layer.objects.active = arm
    arm.select_set(True)
    bpy_.ops.object.mode_set(mode="EDIT")
    for name, (h, t, par) in SKR.items():
        b = arm_d.edit_bones.new(MX + name)
        b.head, b.tail, b.roll = h, t, 0
    for name, (h, t, par) in SKR.items():
        if par:
            arm_d.edit_bones[MX + name].parent = arm_d.edit_bones[MX + par]
    bpy_.ops.object.mode_set(mode="OBJECT")
    # glTF ignores a skinned mesh's parent transform (Khronos NODE_SKINNED_MESH_NON_ROOT): keep it at the root
    mod = body.modifiers.new("Armature", "ARMATURE")
    mod.object = arm
    for c in clips:
        CLIPS[c](arm)
    return root, arm


# ------------------------------------------------------------------ the cast
CAST = {
    # the player: patched leather-and-sailcloth duster and tricorn (the pirate), welded scrap on top (the wasteland):
    # a spiked steel pauldron, tin-can bracers, hubcap knee plates and a respirator hung at the throat
    "captain": dict(p=dict(frame="m", build=1.0, skin="olive", hair="#2A2018", hairstyle="long", beard="short", beard_color="#3E2E22", age=0.4, shirt="#7A7262", pants="#3E3A30",
                           boots="#2A1F17", scar=True, gloves="#3B2A1C"),
                    wear=lambda p: (coat(p, length=0.5, col="#5A4430"), bandolier(p), scarf(p, "#7E3524"), hat_tricorn("#2B231C"), pouch_belt(),
                                    pauldron("Left", "#6E7680", "#7A3A1E"), spikes("Left"), bracer("Left"), bracer("Right", "#6E7680"),
                                    kneepad("Left"), kneepad("Right", "#7A3A1E"), respirator(hanging=True)),
                    held=None, clips=["Idle", "Walk", "Sit", "Dig", "Cheer", "Interact"]),
    # crew (same files as before: tb_crew_<role>.glb)
    "crew_mechanic": dict(p=dict(frame="f", build=0.95, skin="tan", hair="#1E1612", hairstyle="ponytail", age=0.3, shirt="#4E5258", pants="#33404E", boots="#2E2620",
                                 bare_arms=True, gloves="#4A3420"),
                          wear=lambda p: (goggles_forehead("#6B2E14"), apron("#4E3A26"), pouch_belt("#3B2A1C"), harness(p), tyre_pauldron("Right"),
                                          bracer("Left", "#6E7680"), kneepad("Left"), kneepad("Right"), tarp_patches(p, ("#7A3A1E", "#C9A23A"), 2)),
                          held="wrench", clips=["Idle", "Walk", "Interact", "Attack", "Cheer"]),
    "crew_fisher": dict(p=dict(frame="m", build=1.08, skin="light", hair="#B8B2A4", hairstyle="bald", beard="full", beard_color="#C8C2B4", age=0.8,
                               shirt="#5A5648", pants="#2A3236", boots="#1F2A30", gloves="#3B2A1C"),
                        wear=lambda p: (coat(p, length=0.34, col="#8C7A34", open_front=0.4, patches=True, flare=0.05), hat_souwester("#8C7A34"),
                                        chain_loop(p), pauldron("Right", "#7A3A1E", "#6E7680"), bracer("Left", "#6E7680"), kneepad("Right")),
                        held="gaff", clips=["Idle", "Walk", "Interact", "Attack", "Cheer"]),
    # Kai: a hooded tarp poncho in faded hazard orange (readable on deck against grey water), glare goggles down, mask up
    "crew_lookout": dict(p=dict(frame="m", build=0.86, skin="brown", hair="#1E1612", hairstyle="short", age=0.15, shirt="#5A5648", pants="#3A3830", gloves="#3B2A1C"),
                         wear=lambda p: (poncho("#B8642E", 0.4), hood("#8C4A22"), scarf(p, "#5A5648", mask=True), goggles_eyes(), tarp_patches(p, ("#2F6FB0", "#8C8270", "#C9A23A"), 4),
                                         bracer("Left"), bracer("Right", "#6E7680"), kneepad("Left"), kneepad("Right")),
                         held="binoculars", clips=["Idle", "Walk", "Interact", "Attack", "Cheer"]),
    "crew_navigator": dict(p=dict(frame="f", build=0.92, skin="dark", hair="#151010", hairstyle="bun", age=0.45, shirt="#9C9278", pants="#2A2E36", gloves="#3B2A1C"),
                           wear=lambda p: (coat(p, length=0.55, col="#34404C", open_front=0.6, patches=True), headwrap("#9C4E26"), glasses(), backpack("#4E2F1A"),
                                           harness(p), bracer("Left", "#8C6A34"), kneepad("Left"), respirator(hanging=True)),
                           held="spyglass", clips=["Idle", "Walk", "Interact", "Attack", "Cheer"]),
    "crew_salvager": dict(p=dict(frame="m", build=1.18, skin="pale", hair="#5A3A22", hairstyle="bald", beard="full", age=0.5, shirt="#262A2E", pants="#262A2E",
                                 boots="#1A1612", gloves="#3A4148", rolled=False),
                          wear=lambda p: (goggles_forehead("#B8642E"), rope_coil(1), pouch_belt("#3A4148"), pauldron("Right", "#7F8A94", "#3A4148"), spikes("Right"),
                                          tyre_pauldron("Left"), bracer("Left", "#7A3A1E"), bracer("Right"), kneepad("Left"), kneepad("Right"), chain_loop(p)),
                          held="grapple", clips=["Idle", "Walk", "Interact", "Attack", "Cheer"]),
    "crew_defender": dict(p=dict(frame="f", build=1.02, skin="olive", hair="#2A1A12", hairstyle="mohawk", age=0.3, shirt="#3A3530", pants="#3A3530", eyepatch=1,
                                 gloves="#2B1D14"),
                          wear=lambda p: (pauldron("Left", "#C8352A", "#E9E2CC"), spikes("Left"), chestplate("#8C3A26"), scarf(p, "#2B1D14"), pouch_belt(),
                                          tyre_pauldron("Right"), bracer("Left", "#6E7680"), bracer("Right"), kneepad("Left", "#C8352A"), kneepad("Right")),
                          held="harpoon", clips=["Idle", "Walk", "Interact", "Attack", "Cheer"]),
    # townsfolk: scavengers too, just less armed
    "npc_trader": dict(p=dict(frame="f", build=1.1, skin="brown", hair="#151010", hairstyle="short", age=0.55, shirt="#6E5A44", pants="#4A3A2A"),
                       wear=lambda p: (headwrap("#2E7066"), apron("#5A4430"), scarf(p, "#A8862E"), goggles_forehead("#8C6A34"), harness(p),
                                       bracer("Left", "#8C6A34"), tarp_patches(p, ("#2F6FB0", "#7A3A1E"), 2)), held=None, clips=["Idle", "Interact"]),
    "npc_elder": dict(p=dict(frame="m", build=0.9, skin="light", hair="#D8D2C4", hairstyle="long", beard="full", beard_color="#E0DACC", age=0.9, shirt="#5A5648", pants="#4A463C"),
                      wear=lambda p: (poncho("#6A5640", 0.5), scarf(p, "#5A3A2A"), chain_loop(p, "#8C6A34"), respirator(hanging=True),
                                      tarp_patches(p, ("#8C8270", "#2F6FB0", "#7A3A1E"), 3)), held="lantern", clips=["Idle", "Interact"]),
    "npc_dockhand": dict(p=dict(frame="m", build=1.12, skin="tan", hair="#2A1F17", hairstyle="dreads", beard="short", age=0.35, shirt="#6A4030", pants="#33383E",
                                bare_arms=True, gloves="#3B2A1C"),
                         wear=lambda p: (cap_beanie("#33505A"), rope_coil(-1), pouch_belt(), tyre_pauldron("Left"), bracer("Right", "#7A3A1E"), bracer("Left"),
                                         kneepad("Left"), kneepad("Right"), scarf(p, "#5A5648")), held=None, clips=["Idle", "Interact"]),
    # Rustfang raiders: scrap armour, respirators, mohawks, cutlasses
    "raider": dict(p=dict(frame="m", build=1.05, skin="pale", hair="#B8352A", hairstyle="mohawk", age=0.3, shirt="#2B2620", pants="#2B2620", gloves="#1A1612", bare_arms=True),
                   wear=lambda p: (pauldron("Left", "#3A4148", "#B8352A"), spikes("Left", 4), pauldron("Right", "#6B2E14", "#3A4148"), spikes("Right", 3, "#6B2E14"),
                                   respirator("#2E2B28"), goggles_eyes("#2E2B28", "#C8352A"), bandolier(p, "#1A1612", "#9AA3AD", side=-1),
                                   bracer("Left", "#3A4148"), bracer("Right", "#6B2E14"), kneepad("Left", "#6B2E14"), kneepad("Right", "#3A4148"), chain_loop(p, "#3A4148")),
                   held="cutlass", clips=["Idle", "Attack"]),
    # ---- Jury-Rigged (docs/jury-rigged), 5.5 heads via jury_warp. Driftholm: round, layered, lashed. The captain
    # keeps their face, hair, scar and red scarf; the tricorn, bandolier and duster are gone.
    "jury_captain": dict(p=dict(frame="m", build=1.0, skin="olive", hair="#2A2018", hairstyle="long", beard="short", beard_color="#3E2E22", age=0.4,
                                shirt="#7A7262", pants="#3E3A30", boots="#2A1F17", scar=True, gloves="#3B2A1C"),
                         wear=lambda p: (coat(p, length=0.3, col="#5A4430", open_front=0.7, flare=0.06), tarp_patches(p, ("#C8A576", "#5A9FBF", "#8C8270"), 3),
                                         life_vest(p), scarf(p, "#7E3524"), hat_sailbrim(), pouch_belt(), mug_carabiner(), gauntlet_rope("Right"),
                                         bracer("Left", "#6E7680"), kneepad("Left")),
                         held=None, clips=["Idle", "Walk", "Sit", "Dig", "Cheer", "Interact"]),
    # Rustfang: welded, sharpened, forward. A wedge: saw blade and spiked road sign on the shoulders, exhausts on the back.
    "jury_raider": dict(p=dict(frame="m", build=1.05, skin="pale", hair="#B8352A", hairstyle="mohawk", age=0.3, shirt="#26323B", pants="#2B2620", gloves="#1A1612",
                               bare_arms=True),
                        wear=lambda p: (sawblade_pauldron("Left"), pauldron("Right", "#C2443A", "#EDE6D6"), spikes("Right", 4), chestplate("#4A2C22", "#9AA3AD"),
                                        exhaust_pack(), respirator("#2E2B28"), goggles_eyes("#2E2B28", "#C2443A"), bracer("Left", "#3A4148"), bracer("Right", "#6B2E14"),
                                        kneepad("Left", "#6B2E14"), kneepad("Right", "#3A4148"), chain_loop(p, "#3A4148")),
                        held="glaive", clips=["Idle", "Attack"]),
}


spec = CAST[ASSET]
P = spec["p"]
human(P)
spec["wear"](P)
if spec["held"] == "glaive":
    held_glaive()
elif spec["held"]:
    held(spec["held"])
body = build_body_object()
if ASSET in JURY:
    SKR, LOC_K = jury_warp(body, JURY[ASSET])
    _loc0 = B._loc

    def _loc_scaled(arm_, bone, off, frame):
        return _loc0(arm_, bone, tuple(c * LOC_K for c in off), frame)

    B._loc = _loc_scaled
    _loc = _loc_scaled
kit.shade(body, 55)  # noqa: F821
root, arm = rig(body, spec["clips"])
for o in bpy_.context.scene.objects:
    if o.type == "MESH":
        kit.bake_vertex_colors(o, M, jitter=0.02, seed=zlib.crc32(o.name.encode()) & 0xFFFF)  # noqa: F821
        # colours now live in COLOR_0: collapse to one material so the character exports as ONE primitive
        # (one draw call, a fraction of the glTF JSON). The skin material keeps the role/colour metadata.
        keep = M["skin"]
        o.data.materials.clear()
        o.data.materials.append(keep)
        for poly in o.data.polygons:
            poly.material_index = 0
s = bpy_.context.scene
s["gitcraft_brief"] = json.dumps({"asset_id": f"tb_{ASSET}", "template": "run_script:survivors", "params": {"asset": ASSET}, "palette": A["palette"], "out_dir": OUT})
s["gitcraft_result"] = json.dumps({"contract": {"ground": True, "clips": spec["clips"], "skeleton": "mixamo"}, "expect": {"base_z": 0.0}})
s["gitcraft_template"] = "run_script:survivors"
os.makedirs(os.path.join(OUT, "source"), exist_ok=True)
blend = os.path.join(OUT, "source", f"tb_{ASSET}.blend")
bpy_.ops.wm.save_as_mainfile(filepath=blend, compress=True)
tris = sum(len(p.vertices) - 2 for o in s.objects if o.type == "MESH" for p in o.data.polygons)
print(json.dumps({"blend": blend, "tris": tris, "clips": spec["clips"], "hip_scale": LOC_K}))
