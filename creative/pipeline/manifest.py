import os,json,glob,hashlib
from PIL import Image
R="/home/user/pilot/pkg"
RULES=[ # (prefix/contains, tools, status, note)
 ("art-direction/TIDEBREAKERS_Creative_Package","DesignCraft → PdfCraft","reference","12-page creative bible + UI + promos, combined, metadata-tagged and size-reduced in PdfCraft"),
 ("art-direction/visual-direction.md","Written direction","reference","Visual direction v1"),
 ("branding/palette","VectorCraft (swatch library export)","game-ready","Palette as ASE/CSS/GPL/JSON"),
 ("branding/app-icon","VectorCraft","game-ready (proposed)","Proposed replacement for public/icon-*.png; NOT applied to the game"),
 ("branding/source","VectorCraft","source","Editable native document"),
 ("branding/","VectorCraft","finished","Brand master"),
 ("ships/source","VectorCraft","source","Editable native document"),
 ("ships/custom/","VectorCraft","game-ready (UI preview)","Cosmetic preview using canon colours from src/data/ship.ts"),
 ("ships/","VectorCraft","finished (2D art; 3D models in-engine unchanged)","Transparent, trimmed"),
 ("characters/source","VectorCraft","source","Editable native document"),
 ("characters/","VectorCraft","finished (2D portrait/sprite art)","Transparent"),
 ("environments/source","VectorCraft planes → PhotoCraft composite","source","Layered PSD / plane documents"),
 ("environments/","VectorCraft → PhotoCraft → LightCraft","concept art","Graded with the 'Tidebreakers Golden Hour' LightCraft preset; direction for the 3D world, not in-engine assets"),
 ("ui/screens","VectorCraft kit + DesignCraft layout","illustrative mockup","iPhone 390×844 pt @3x"),
 ("ui/source","DesignCraft / VectorCraft","source","Editable native document"),
 ("ui/kit/","VectorCraft","game-ready","SVG + @3x PNG UI asset"),
 ("effects/sheets","EffectCraft render queue → sprite-sheet packing (PIL glue)","game-ready","RGBA sprite atlas + JSON metadata"),
 ("effects/lottie","EffectCraft (Lottie export)","game-ready (needs a Lottie player)","Lottie JSON"),
 ("effects/materials","VectorCraft","game-ready","Shader colour ramp"),
 ("effects/source","EffectCraft","source","Editable .ecproj"),
 ("marketing/teaser","EffectCraft titles → FilmCraft edit/export","finished (silent)","H.264 1080p30, no audio"),
 ("marketing/keyart","VectorCraft plates → PhotoCraft composite","finished","Main key art"),
 ("marketing/promo_landscape","VectorCraft plates/ships → DesignCraft layout","finished","Landscape promo"),
 ("marketing/promo_portrait","VectorCraft → PhotoCraft re-frame → DesignCraft layout","finished","Portrait promo"),
 ("marketing/source","PhotoCraft / DesignCraft / EffectCraft / FilmCraft","source","Editable sources; .fcproj/.ecproj reference media by absolute path from the pilot run"),
 ("pipeline/","Python over GITCRAFT MCP servers","source","Recipe scripts used in the pilot (absolute paths from the pilot workspace)"),
]
def rule(rel):
    for p,t,s,n in RULES:
        if rel.startswith(p) or p in rel: return t,s,n
    return "—","other",""
items=[]
for f in sorted(glob.glob(R+"/**/*",recursive=True)):
    if os.path.isdir(f): continue
    rel=f[len(R)+1:]
    if rel.startswith(("MANIFEST","README","REPORT","LICENSE")): continue
    t,s,n=rule(rel); e={"path":rel,"bytes":os.path.getsize(f),"tools":t,"status":s,"notes":n}
    if rel.endswith((".png",".jpg")):
        try: w,h=Image.open(f).size; e["dimensions"]=f"{w}x{h}"; e["alpha"]=Image.open(f).mode=="RGBA"
        except Exception: pass
    items.append(e)
json.dump({"package":"TIDEBREAKERS Creative Production Package","version":"v1","generated":"2026-11-02","files":len(items),"items":items},open(R+"/MANIFEST.json","w"),indent=1)
# markdown summary grouped by folder
from collections import defaultdict
g=defaultdict(list)
for e in items: g[e["path"].split("/")[0]].append(e)
L=["# Package manifest (v1)","","Every file in `creative/`, with the GITCRAFT tools that produced it and its production status. Machine-readable version: `MANIFEST.json`.","",
   "Status key: **game-ready**: drop-in asset in a format the game can load · **finished**: final art for that purpose · **concept art**: direction, not in-engine · **illustrative mockup**: layout concept, not implemented UI · **source**: editable original · **reference**: documentation.",""]
for k in sorted(g):
    L+= [f"## {k}/ ({len(g[k])} files)","","| File | Size | Dimensions | Tools | Status |","|---|---|---|---|---|"]
    for e in g[k]:
        L.append(f"| `{e['path']}` | {e['bytes']/1024:.0f} KB | {e.get('dimensions','')}{' α' if e.get('alpha') else ''} | {e['tools']} | {e['status']} |")
    L.append("")
open(R+"/MANIFEST.md","w").write("\n".join(L)); print(len(items))
