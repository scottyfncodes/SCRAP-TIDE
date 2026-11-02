from chars import *
import sys
PK="/home/user/pilot/pkg/characters"; SRC=PK+"/source"
os.makedirs(SRC,exist_ok=True)
def save(v,stem,svg=True,trim=True,**kw):
    v.export(f"{PK}/{stem}.png",**({"options":{"useArtboards":False}} if trim else {}),**kw)
    if svg: v.export(f"{PK}/{stem}.svg")
    v.save(f"{SRC}/{stem}.vectorcraft"); v.close(); print(stem)
CAST=[("captain",captain,"happy"),("pip-farthing",pip,"smug"),("marlo-keelhart",marlo,"happy"),("odessa",odessa,"smug"),("biscuit",biscuit,"mischief")]
jobs=sys.argv[1:] or ["solo","lineup","sil","expr","poses","npc"]
if "solo" in jobs:
    for n,fn,e in CAST:
        v=VC(); v.new(700,800,n); fn(v,350,760,expr=e); save(v,f"char_{n}")
if "lineup" in jobs or "sil" in jobs:
    for mono,stem in ((None,"cast_lineup"),(P["tide"],"cast_silhouettes")):
        if (mono and "sil" not in jobs) or (not mono and "lineup" not in jobs): continue
        v=VC(); v.new(1900,760,stem)
        if not mono: v.path("M0 700 H1900",stroke=P["parch"],sw=4)
        captain(v,260,700,mono=mono); pip(v,620,700,mono=mono); marlo(v,980,700,mono=mono); odessa(v,1340,700,mono=mono); biscuit(v,1680,700,mono=mono)
        save(v,stem,trim=False)
if "expr" in jobs:
    for e in ("happy","determined","surprised","mischief","joy","worried"):
        v=VC(); v.new(500,500,"captain "+e); captain(v,250,540,expr=e)
        # head-only crop
        v.cmd("document.export",path=f"{PK}/expressions/captain_expr_{e}.png",rect=[95,110,320,300],scale=1.5)
        v.save(f"{SRC}/captain_expr_{e}.vectorcraft"); v.close(); print(e)
if "poses" in jobs:
    for p in ("idle","cheer","dig"):
        v=VC(); v.new(700,800,"captain "+p); captain(v,350,760,expr={"idle":"happy","cheer":"joy","dig":"determined"}[p],pose=p); save(v,f"poses/captain_pose_{p}")
if "npc" in jobs:
    for n,fn,e in (("pip-farthing",pip,"surprised"),("marlo-keelhart",marlo,"determined"),("odessa",odessa,"mischief"),("biscuit",biscuit,"happy")):
        v=VC(); v.new(700,800,n); fn(v,350,760,expr=e); save(v,f"expressions/{n}_expr_{e}",svg=False)
