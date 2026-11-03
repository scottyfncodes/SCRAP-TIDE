#!/usr/bin/env bash
# Run one or more upgrade builds through MeshCraft (one-shot --call mode, inside GITCRAFT's sandbox):
#   build (run_script) -> export three-web-toon -> validate (+Khronos) -> previews -> three.js engine check.
# Usage: run_meshcraft.sh [--build-only] <name>...   (name = build_<name>.py; default: all)
set -uo pipefail
D="$(cd "$(dirname "$0")" && pwd)"
M="env GITCRAFT_ROOT=$(cd "$D/../../.." && pwd) bash $HOME/.gitcraft/runtime/scripts/mcp.sh meshcraft --call"
only=0; [[ "${1:-}" == --build-only ]] && { only=1; shift; }
names=("$@"); ((${#names[@]})) || names=($(ls "$D"/build_*.py | sed -E 's#.*/build_(.*)\.py#\1#'))
call() {  # tool name args-json-file log-file
  $M "$1" @"$2" 2>/dev/null | tail -1 > "$3"
  python3 -I -c 'import json,sys; d=json.load(open(sys.argv[1])); sys.exit(0 if d.get("ok") else 1)' "$3"
}
for n in "${names[@]}"; do
  aid=$(grep -o 'start("[a-z_]*")' "$D/build_$n.py" | sed -E 's/start\("(.*)"\)/\1/')
  A="$D/$n"; mkdir -p "$A/logs"
  B="$A/source/$aid.blend"; G="$A/exports/$aid.three-web-toon.glb"
  printf '{"path":"%s","args":{"out":"%s"}}' "$D/build_$n.py" "$B" > "$A/logs/args_build.json"
  call run_script "$A/logs/args_build.json" "$A/logs/build.json" || { echo "$n: BUILD FAILED"; python3 -I -c 'import json,sys;d=json.load(open(sys.argv[1]));print(d.get("error"),d.get("trace","")[-1500:])' "$A/logs/build.json"; continue; }
  python3 -I -c 'import json,sys;d=json.load(open(sys.argv[1]));print(sys.argv[2]+":", d["result"]["stdout"].strip().splitlines()[-1][:400])' "$A/logs/build.json" "$n"
  rm -f "$A/source/$aid.blend1"
  ((only)) && continue
  printf '{"blend":"%s","profiles":["three-web-toon"],"out_dir":"%s/exports"}' "$B" "$A" > "$A/logs/args_export.json"
  call export_asset "$A/logs/args_export.json" "$A/logs/export.json" || { echo "$n: EXPORT FAILED"; continue; }
  printf '{"blend":"%s","exports":["%s"],"profiles":["three-web-toon"]}' "$B" "$G" > "$A/logs/args_validate.json"
  call validate_asset "$A/logs/args_validate.json" "$A/logs/validate.json" || echo "$n: VALIDATE CALL FAILED"
  printf '{"blend":"%s","out_dir":"%s/previews","size":512,"views":["three_quarter","front","side","top"]}' "$B" "$A" > "$A/logs/args_preview.json"
  call render_preview "$A/logs/args_preview.json" "$A/logs/preview.json" || echo "$n: PREVIEW FAILED"
  contract=$(python3 -I -c 'import json,sys; b=json.load(open(sys.argv[1])); print(json.dumps({"root":sys.argv[2],"ground":False}))' "$A/logs/build.json" "$aid")
  printf '{"glb":"%s","out":"%s/previews/%s_engine_check.png","material":"game-toon","contract":%s}' "$G" "$A" "$aid" "$contract" > "$A/logs/args_engine.json"
  call engine_check "$A/logs/args_engine.json" "$A/logs/engine_check.json" || echo "$n: ENGINE CHECK CALL FAILED"
  python3 -I - "$A/logs" "$n" <<'PY'
import json, sys
L, n = sys.argv[1], sys.argv[2]
v = json.load(open(f"{L}/validate.json")).get("result", {})
e = json.load(open(f"{L}/engine_check.json")).get("result", {})
bad = [f'{c["level"]}:{c["check"]}:{c.get("detail") or c.get("message")}' for c in v.get("checks", []) if c.get("level") in ("warn", "fail")]
ebad = [c for c in e.get("checks", []) if c.get("level") != "pass"]
print(f'{n}: validate {v.get("summary")} {bad} | engine ok={e.get("ok")} tris={e.get("triangles")} vc={e.get("meshesWithVertexColor")}/{e.get("meshes")} console={e.get("console")} {ebad}')
PY
done
