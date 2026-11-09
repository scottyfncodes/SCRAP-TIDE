"""Overlap audit with the vehicles aboard (loop pass Phase 4): the Trimaran's full and early specs from
../3d-sloop/upgrades/audit_spec.py, plus the Wave Runner moored alongside the port float and the balloon stowed on the
starboard float (basket + rolled envelope, at the 0.8 scale the game stows it), placed exactly as
src/game/vehicles.ts stowSpots('sloop') puts them. Hidden parts are left out (the tow sled is stowed off the
runner; the envelope, burner and winch only exist in flight).

  python3 creative/3d-vehicles/audit_spec.py   -> logs/audit_full_vehicles.json, logs/audit_early_vehicles.json
Run each with MeshCraft audit_overlaps.
"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "3d-sloop", "upgrades"))
from audit_spec import spec, glb  # noqa: E402

RUNNER_AT = [-5.25, 0.15, -0.39]   # stowSpots('sloop').runner
BALLOON_AT = [4.375, 1.06, -0.75]  # stowSpots('sloop').balloon
BALLOON_SCALE = 0.8


def with_vehicles(variant):
    s = spec(variant)
    s["parts"] += [
        {"name": "runner", "file": glb("tb_waverunner"), "node": "tb_waverunner_mesh", "transform": {"location": RUNNER_AT}},
        {"name": "runner_bars", "file": glb("tb_waverunner"), "node": "waverunner_bars", "transform": {"location": RUNNER_AT}},
        {"name": "balloon_basket", "file": glb("tb_balloon"), "node": "balloon_basket", "transform": {"location": BALLOON_AT, "scale": BALLOON_SCALE}},
        {"name": "balloon_roll", "file": glb("tb_balloon"), "node": "balloon_stowed", "transform": {"location": BALLOON_AT, "scale": BALLOON_SCALE}},
    ]
    # the bars sit on the runner's own column; the roll is lashed to the basket rim
    s["contacts"] += [["runner_bars", "runner"], ["balloon_roll", "balloon_basket"]]
    return s


if __name__ == "__main__":
    os.makedirs(os.path.join(HERE, "logs"), exist_ok=True)
    for v in ("full", "early"):
        p = os.path.join(HERE, "logs", f"audit_{v}_vehicles.json")
        json.dump(with_vehicles(v), open(p, "w"), indent=1)
        print("wrote", p)
