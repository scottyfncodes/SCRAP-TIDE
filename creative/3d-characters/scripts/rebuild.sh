#!/usr/bin/env bash
# Rebuild one character end to end (MeshCraft run_script -> export -> validate -> mobile pass -> public/models).
#   creative/3d-characters/scripts/rebuild.sh <asset>      e.g. captain, crew_lookout, npc_elder, raider
# MC defaults to MeshCraft's one-shot CLI entry (the same code path as its MCP tools).
set -euo pipefail
A=$1
ROOT=$(cd "$(dirname "$0")/../../.." && pwd)
R=$ROOT/creative/3d-characters
MC=${MC:-"$HOME/.gitcraft/meshcraft/venv/bin/python $HOME/.gitcraft/runtime/meshcraft/server.py --call"}
D=$R/$A; mkdir -p "$D/logs"
call() { local tool=$1 name=$2 json=$3; echo "$json" > "$D/logs/args_$name.json"; $MC "$tool" "@$D/logs/args_$name.json" 2>"$D/logs/$name.err" | grep '^{' | tail -1 > "$D/logs/$name.json"
  grep -q '"ok": true' "$D/logs/$name.json" || { echo "$A: $tool failed"; tail -5 "$D/logs/$name.err"; head -c 600 "$D/logs/$name.json"; exit 1; }; rm -f "$D/logs/$name.err"; }
call run_script run_script "{\"path\":\"$R/scripts/survivors.py\",\"args\":{\"asset\":\"$A\",\"out_dir\":\"$D\",\"palette\":\"$ROOT/creative/3d-waterworld/tidebreakers-waterworld-palette.json\"}}"
call export_asset export "{\"blend\":\"$D/source/tb_$A.blend\",\"profiles\":[\"three-web-toon\"]}"
node "$R/scripts/optimize_char_cheer.mjs" "$D/exports/tb_$A.three-web-toon.glb" "$D/exports/tb_$A.mobile.glb"
call validate_asset validate_mobile "{\"blend\":\"$D/source/tb_$A.blend\",\"exports\":[\"$D/exports/tb_$A.mobile.glb\"],\"profiles\":[\"three-web-toon\"]}"
cp "$D/exports/tb_$A.mobile.glb" "$ROOT/public/models/tb_$A.glb"
python3 -c "import json,sys; r=json.load(open('$D/logs/run_script.json'))['result']['stdout'].strip().splitlines()[-1]; v=json.load(open('$D/logs/validate_mobile.json'))['result']['checks']; print('$A', r, 'fails:', [c['check'] for c in v if c['level']=='fail'], 'warns:', [c['check'] for c in v if c['level']=='warn'])"
