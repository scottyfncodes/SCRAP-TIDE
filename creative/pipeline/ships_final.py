from ships_all import *
import sys
PK="/home/user/pilot/pkg/ships"; SRC="/home/user/pilot/pkg/ships/source"
def out(v,stem,svg=True,src=True):
    v.export(f"{PK}/{stem}.png",options={"useArtboards":False})
    if svg: v.export(f"{PK}/{stem}.svg",outlineText=True)
    if src: v.save(f"{SRC}/{stem}.vectorcraft")
    v.close(); print(stem)
jobs=sys.argv[1:] or ["prog","paint","sail","flag","fig"]
if "prog" in jobs:
    sizes={"dinghy":(1200,900),"sloop":(1200,900),"brig":(1500,1100),"galleon":(1700,1300)}
    names={"dinghy":"ship_01_leaky-dinghy","sloop":"ship_02_coastal-sloop","brig":"ship_03_saltwhistle-brig","galleon":"ship_04_grand-tidebreaker"}
    for n,(w,h) in sizes.items():
        v=VC(); v.new(w,h,names[n])
        {"dinghy":lambda:dinghy(v,cx=w/2,wl=h-170),"sloop":lambda:sloop(v,cx=w/2-40,wl=h-170),"brig":lambda:brig(v,cx=w/2-60,wl=h-180),"galleon":lambda:galleon(v,cx=w/2-80,wl=h-200)}[n]()
        out(v,names[n])
CAN={"paint_driftwood":("#a77b4f","#7a5534"),"paint_seafoam":("#4fb39a","#f2ead8"),"paint_crimson":("#c0392b","#f4c542"),"paint_midnight":("#22325a","#e8c46a"),"paint_gilded":("#2b1d14","#f4c542")}
if "paint" in jobs:
    for k,(a,b) in CAN.items():
        v=VC(); v.new(1200,900,k); sloop(v,cx=560,wl=730,base=a,trim=b); out(v,f"custom/hull_{k}",svg=False)
SAILS={"sail_plain":("#f1e6cc",None),"sail_stripe":("#f1e6cc",("stripe","#c0392b")),"sail_sunset":("#ffcf7a",("bands",["#ff6b4a","#ff6b4a"])),"sail_shells":("#f1e6cc",("shells","#e0607e"))}
if "sail" in jobs:
    for k,(c,p) in SAILS.items():
        v=VC(); v.new(1200,900,k); sloop(v,cx=560,wl=730,sail=c,pat=p); out(v,f"custom/{k}",svg=False)
if "flag" in jobs:
    for k,kind,c1,c2 in (("flag_harbor","pennant","#3a86ff","#ffffff"),("flag_wren","wren","#1c1c22","#efe6d2"),("flag_tidebreaker","tidebreaker",P["tide"],P["cream"])):
        v=VC(); v.new(420,300,k); s=Ship(v)
        v.path("M40 20 V290",stroke=P["timber"],sw=12); s.flag(40,40,w=300,h=180,kind=kind,c1=c1,c2=c2)
        out(v,f"custom/{k}")
if "fig" in jobs:
    for k in ("sun","turtle","gull"):
        v=VC(); v.new(400,300,k); s=Ship(v)
        v.path("M40 260 Q160 200 230 140",stroke=P["tide"],sw=34); v.path("M40 260 Q160 200 230 140",stroke=P["timber"],sw=22)
        s.figurehead(250,140,k,2.4); out(v,f"custom/figurehead_{k}")
    v=VC(); v.new(200,260,"lantern"); Ship(v).lantern(100,150,40); out(v,"custom/deco_lantern")
