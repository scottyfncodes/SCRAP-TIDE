"""Write the Trimaran's overlap-audit specs for GITCRAFT MeshCraft's `audit_overlaps` tool.

  python3 creative/3d-sloop/upgrades/audit_spec.py      -> logs/audit_full.json, logs/audit_early.json

Each spec assembles the boat the way src/ship/shipModel.ts does (game/glTF coordinates): the sloop's features that
upgrades could hit (boom, mast, jib, lantern, cabin, base mainsail), the outrigger beams, every upgrade model on its
socket or deck spot, and a captain-sized cylinder at the helm. Moving parts sweep their range: harpoon aim every 30
degrees, crane slewed to port +-0.6 rad, turbine rotor and radar scanner at several angles. The hull, deck and rails
are left out on purpose: parts rest on, clamp to and hang from them.
Run each spec with MeshCraft:  audit_overlaps @logs/audit_full.json   (MCP tool, or `server.py --call`)
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
M = os.path.join(ROOT, "public", "models")
glb = lambda n: os.path.join(M, n + ".glb")

# layout constants mirrored from src/ship/shipModel.ts
SOCKET = {"sail": [0, 2.4503, 1.0], "storage": [0, 1.0503, -0.5], "navigation": [0, 1.0503, -1.6], "steering": [0, 1.0503, -4.8]}
CRATES_AT, COMPASS_AT = [0.5, 0, 0], [0, 0, 0.42]
ROOF_LIFT = 2.28 - 2.06                 # Container Cabin roof over the sloop's cabin roof
CAPTAIN = [-0.98, 1.1, -4.55]           # SLOOP_WHEEL_HELM on the deck
LANTERN_SHIFT = [1.25, -0.69, -0.1]
add = lambda a, b: [a[i] + b[i] for i in range(3)]
BIG = 99


def spec(variant):
    full = variant == "full"
    parts = [
        {"name": "boom", "file": glb("tb_coastal_sloop"), "materials": ["GC_Wood_9a5a2e"], "min": [-0.2, 2.0, -BIG], "max": [0.2, BIG, BIG]},
        {"name": "mast", "file": glb("tb_coastal_sloop"), "materials": ["GC_Wood_9a5a2e", "GC_Wood_5e331b"], "min": [-0.25, 1.3, 0.7], "max": [0.25, BIG, 1.3]},
        {"name": "jib", "file": glb("tb_coastal_sloop"), "materials": ["GC_Cloth_f1e6cc"], "min": [-BIG, -BIG, 1.0]},
        {"name": "lantern", "file": glb("tb_coastal_sloop"), "materials": ["GC_Plain_ff9f2e_e2"], "transform": {"location": LANTERN_SHIFT}},
        {"name": "beams_port", "file": glb("tb_sloop_outriggers"), "materials": ["GC_Wood_9a5a2e", "GC_Wood_5e331b", "GC_Cloth_c9a46b"], "min": [-BIG, 1.12, -BIG], "max": [-1.95, BIG, BIG]},
        {"name": "beams_starboard", "file": glb("tb_sloop_outriggers"), "materials": ["GC_Wood_9a5a2e", "GC_Wood_5e331b", "GC_Cloth_c9a46b"], "min": [1.95, 1.12, -BIG]},
        {"name": "crates", "file": glb("tb_upg_cargo_crates"), "transform": {"location": add(SOCKET["storage"], CRATES_AT)}},
        {"name": "compass", "file": glb("tb_upg_brass_compass"), "transform": {"location": add(SOCKET["navigation"], COMPASS_AT)}},
        {"name": "wheel", "file": glb("tb_upg_wheel_rudder"), "transform": {"location": SOCKET["steering"]}},
        {"name": "captain", "cylinder": {"radius": 0.24, "height": 1.85}, "transform": {"location": CAPTAIN}},
        {"name": "turbine", "file": glb("tb_upg_deck_turbine")},
        {"name": "fishing", "file": glb("tb_upg_fishing_rig")},
        {"name": "harpoon", "file": glb("tb_upg_harpoon_turret")},
        {"name": "crane", "file": glb("tb_upg_salvage_crane")},
        {"name": "drums", "file": glb("tb_upg_fuel_drums")},
        {"name": "nets", "file": glb("tb_upg_cargo_nets")},
        {"name": "armour", "file": glb("tb_upg_armour_plating")},
        {"name": "lights", "file": glb("tb_upg_deck_lights"), "node": "deck_lights_strings"},
    ]
    lift = {"location": [0, ROOF_LIFT, 0]} if full else None
    parts += [{"name": "solar", "file": glb("tb_upg_solar_array"), "transform": lift},
              {"name": "radar", "file": glb("tb_upg_radar_mast"), "transform": lift},
              {"name": "spotlight", "file": glb("tb_upg_deck_lights"), "node": "deck_spotlight", "transform": lift}]
    on_roof = ["solar", "radar", "spotlight"]
    if full:
        parts += [{"name": "canvas_sail", "file": glb("tb_upg_canvas_mainsail"), "transform": {"location": SOCKET["sail"]}},
                  {"name": "container", "file": glb("tb_upg_container_cabin")},
                  {"name": "twin_diesel", "file": glb("tb_upg_twin_diesel")}]
        contacts = [[r, "container"] for r in on_roof] + [["canvas_sail", "boom"], ["canvas_sail", "mast"]]
    else:
        cabin = ["GC_Plank_f2ead8", "GC_Plank_5e331b", "GC_Metal_f4c542_m9"]
        parts += [{"name": "cabin", "file": glb("tb_coastal_sloop"), "materials": cabin, "min": [-1.2, 0.95, -3.9], "max": [1.2, 2.2, -1.3]},
                  {"name": "base_mainsail", "file": glb("tb_coastal_sloop"), "materials": ["GC_Cloth_f1e6cc", "GC_Cloth_c0392b"], "max": [BIG, BIG, 1.0]},
                  {"name": "outboard", "file": glb("tb_upg_outboard")}]
        contacts = [[r, "cabin"] for r in on_roof] + [["compass", "cabin"], ["base_mainsail", "boom"], ["base_mainsail", "mast"]]
    for p in parts:
        if p.get("transform") is None: p.pop("transform", None)
    contacts += [["harpoon", "beams_starboard"], ["boom", "mast"]]   # bolted to the beam; the sloop's gooseneck
    motion = [
        {"part": "crane", "node": "salvage_crane", "axis": "y", "from": -90 - math.degrees(0.6), "to": -90 + math.degrees(0.6), "steps": 3},
        {"part": "harpoon", "node": "harpoon_mount", "axis": "y", "from": 0, "to": 330, "steps": 12},
        {"part": "turbine", "node": "deck_turbine_rotor", "axis": "z", "from": 0, "to": 60, "steps": 2},
        {"part": "radar", "node": "radar_scanner", "axis": "y", "from": 0, "to": 135, "steps": 4},
    ]
    return {"frame": "gltf", "parts": parts, "motion": motion, "contacts": contacts}


if __name__ == "__main__":
    os.makedirs(os.path.join(HERE, "logs"), exist_ok=True)
    for v in ("full", "early"):
        json.dump(spec(v), open(os.path.join(HERE, "logs", f"audit_{v}.json"), "w"), indent=1)
        print("wrote", os.path.join(HERE, "logs", f"audit_{v}.json"))
