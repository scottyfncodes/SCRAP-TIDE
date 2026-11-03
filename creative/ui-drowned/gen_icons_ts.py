"""Turn the VectorCraft SVG exports into src/ui/iconsDrowned.ts (placeholder swatches -> item colours)."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
meta = json.load(open(f"{HERE}/icons.json"))
out = ["// GENERATED from creative/ui-drowned/svg (GITCRAFT VectorCraft exports) by gen_icons_ts.py. Do not edit by hand.",
       "// Placeholder swatches are replaced by each item's primary (a) and accent (b) colours.",
       "export const DROWNED_ICONS: Record<string, (a: string, b: string) => string> = {"]
for name in meta["icons"]:
    svg = open(f"{HERE}/svg/icon_{name}.svg").read()
    body = re.search(r'<g id="Layer_1"[^>]*>(.*)</g>', svg, re.S).group(1)
    body = re.sub(r"\s+", " ", body).strip().replace("`", "")
    body = body.replace("#ff00fe", "${a}").replace("#FF00FE", "${a}").replace("#00feff", "${b}").replace("#00FEFF", "${b}")
    out.append(f"  {name}: (a, b) => `{body}`,")
out.append("};")
open(f"{HERE}/../../src/ui/iconsDrowned.ts", "w").write("\n".join(out) + "\n")
print("icons:", len(meta["icons"]))
