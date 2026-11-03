"""TIDEBREAKERS: grimy art-direction weathering pass, for GITCRAFT MeshCraft `run_script` against a source .blend.

    run_script {"path": ".../weather_pass.py", "blend": ".../<asset>/source/tb_<asset>.blend", "save": true,
                "args": {"strength": 1.0}}

Bakes decades of salt and weather into the `Color` corner attribute (glTF COLOR_0) that the game's toon material
shades, so the effect costs nothing at runtime:
  * crevice grime: per-vertex concavity (neighbour directions vs. normal, like Blender's Dirty Vertex Colors),
    blurred twice, darkens corners, seams and undersides;
  * edge wear: convex edges bleach toward bone and chip to bare rust;
  * rust bleed: rust stains run *down* from convex edges and fixings on neutral (metal) faces;
  * low-frequency mottling so big flat panels never read as plastic.
Emissive faces (lit windows, lamps, flares) are left untouched. Idempotent: a scene flag records the pass version.
"""
import json, math
import bmesh
from mathutils import Vector, noise

VERSION = 1
A = args  # noqa: F821
K = float(A.get("strength", 1.0))
scene = bpy.context.scene  # noqa: F821
if scene.get("tb_weather_pass") == VERSION:
    print(json.dumps({"skipped": "already weathered", "version": VERSION}))
else:
    RUST = Vector((0.36, 0.15, 0.06))
    BONE = Vector((0.66, 0.63, 0.55))
    changed = 0

    def emissive(mat):
        if not mat or not mat.use_nodes:
            return False
        for n in mat.node_tree.nodes:
            if n.type == "BSDF_PRINCIPLED":
                s = n.inputs.get("Emission Strength")
                c = n.inputs.get("Emission Color") or n.inputs.get("Emission")
                if s is not None and s.default_value > 0.01 and c is not None and sum(c.default_value[:3]) > 0.05:
                    return True
            if n.type == "EMISSION":
                return True
        return False

    for o in [o for o in scene.objects if o.type == "MESH"]:
        me = o.data
        attr = me.color_attributes.get("Color")
        if attr is None or attr.domain != "CORNER" or len(me.vertices) == 0:
            continue
        glow = [emissive(m) for m in me.materials] or [False]
        mw = o.matrix_world
        bm = bmesh.new()
        bm.from_mesh(me)
        bm.verts.ensure_lookup_table()
        bm.normal_update()
        # concavity per vertex
        cav = [0.0] * len(bm.verts)
        for v in bm.verts:
            if not v.link_edges:
                continue
            acc = 0.0
            for e in v.link_edges:
                d = (e.other_vert(v).co - v.co)
                if d.length > 1e-6:
                    acc += v.normal.dot(d.normalized())
            cav[v.index] = acc / len(v.link_edges)
        for _ in range(2):
            nxt = cav[:]
            for v in bm.verts:
                if v.link_edges:
                    nxt[v.index] = cav[v.index] * 0.5 + 0.5 * sum(cav[e.other_vert(v).index] for e in v.link_edges) / len(v.link_edges)
            cav = nxt
        wpos = [mw @ v.co for v in bm.verts]
        wnrm = [(mw.to_3x3() @ v.normal).normalized() for v in bm.verts]
        bm.free()
        data = attr.data
        for poly in me.polygons:
            if poly.material_index < len(glow) and glow[poly.material_index]:
                continue
            for li in poly.loop_indices:
                vi = me.loops[li].vertex_index
                c = Vector(data[li].color[:3])
                lum = c.dot(Vector((0.299, 0.587, 0.114)))
                sat = max(c) - min(c)
                p, n = wpos[vi], wnrm[vi]
                cv = cav[vi]
                mott = noise.noise(p * 0.35) * 0.5 + noise.noise(p * 1.3) * 0.25
                # crevice grime (concave) and edge wear (convex)
                grime = max(0.0, min(1.0, cv * 2.2)) + max(0.0, -n.z) * 0.25
                c = c * (1.0 - 0.5 * K * min(1.0, grime))
                wear = max(0.0, min(1.0, -cv * 2.6))
                metal = 1.0 - min(1.0, max(0.0, (sat - 0.08) / 0.25))
                chip = wear * (0.5 + 0.5 * max(0.0, noise.noise(p * 3.1)))
                c = c.lerp(RUST * (0.8 + lum), 0.55 * K * chip * metal)
                c = c.lerp(c * 0.7 + BONE * 0.3, 0.35 * K * wear * (1.0 - metal))
                # rust bleed: vertical streaks on neutral faces that aren't facing up
                streak = noise.noise(Vector((p.x * 1.9, p.y * 1.9, p.z * 0.12)))
                bleed = max(0.0, streak - 0.15) * 1.6 * metal * (1.0 - max(0.0, n.z))
                c = c.lerp(RUST * (0.7 + 0.6 * lum), min(0.5, 0.45 * K * bleed))
                c = c * (1.0 + 0.16 * K * mott)
                data[li].color = (max(0.0, min(1.0, c.x)), max(0.0, min(1.0, c.y)), max(0.0, min(1.0, c.z)), data[li].color[3])
                changed += 1
        me.update()
    scene["tb_weather_pass"] = VERSION
    print(json.dumps({"weathered_corners": changed, "version": VERSION, "strength": K}))
