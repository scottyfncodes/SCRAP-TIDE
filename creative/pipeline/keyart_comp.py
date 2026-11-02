import sys,json; sys.path.insert(0,"/home/user/pilot/tools"); from mcpc import Client
from PIL import Image
K="/home/user/pilot/work/keyart"; CH="/home/user/pilot/pkg/characters"; FX="/home/user/pilot/work/fx"
OUT="/home/user/pilot/pkg/marketing"; import os; os.makedirs(OUT+"/source",exist_ok=True)
c=Client("photocraft")
def run(i,**p): return c.call("command_run",{"id":i,"params":p})
import os as _o
CW,CHH,KK,OX,OY=[float(x) for x in _o.environ.get("KA_FRAME","2560,1440,1,0,0").split(",")]
SKIP=_o.environ.get("KA_SKIP","").split(",")
def place(path,s,anchor,target,name):
    w,h=Image.open(path).size; ax,ay=anchor(w,h); s=s*KK; target=(target[0]*KK+OX,target[1]*KK+OY)
    ctr=[target[0]+(w/2-ax)*s/100, target[1]+(h/2-ay)*s/100]
    r=c.call("doc_place",{"path":path,"scale":s,"center":ctr}); run("layer.setProps",layer=r["layer"],name=name); return r["layer"]
c.call("doc_new",{"width":int(CW),"height":int(CHH),"name":"TIDEBREAKERS key art"})
place(K+"/sky.png",100,lambda w,h:(w/2,h/2),(1280,720),"sky")
place(K+"/sea.png",100,lambda w,h:(w/2,h/2),(1280,720),"sea")
g=place(K+"/galleon_nw.png",62,lambda w,h:(770,1100),(1720,1014),"Grand Tidebreaker")
a=run("layer.newAdjustmentLayer.hueSaturation",saturation=-12,lightness=-6); run("layer.setProps",layer=a["layer"],name="distance",clipped=True)
cb=run("layer.newAdjustmentLayer.colorBalance",midtones=[18,0,-22]); run("layer.setProps",layer=cb["layer"],name="sunset bounce",clipped=True,opacity=0.7)
if "dinghy" not in SKIP:
    cap=place(CH+"/poses/captain_pose_cheer.png",85,lambda w,h:(w/2,h),(440,1300),"Captain")
    run("layer.select",layer=cap); run("layer.layerStyle.outerGlow",color="#FFD27A",opacity=55,size=22,spread=10)
    d=place(K+"/dinghy_nw.png",130,lambda w,h:(600,730),(640,1336),"Leaky Dinghy")
place(K+"/sea_front.png",100,lambda w,h:(w/2,h/2),(1280,720),"sea front (hull overlap)")
if "dinghy" not in SKIP: b=place(CH+"/char_biscuit.png",48,lambda w,h:(w/2,h),(826,1240),"Biscuit")
for i,(x,y,s) in enumerate(((1460,560,90),(2050,470,70),(980,1180,60),(300,980,55))):
    place(FX+"/fx_treasure_sparkle/fx_treasure_sparkle_011.png",s,lambda w,h:(w/2,h/2),(x,y),f"sparkle {i}")
if "wordmark" not in SKIP:
    wm=place("/home/user/pilot/work/brand/wordmark_v3.png",92,lambda w,h:(800,300),(1280,250),"Wordmark")
    run("layer.select",layer=wm); run("layer.layerStyle.dropShadow",color="#2A1F4A",opacity=45,distance=10,size=26,angle=90)
cb=run("layer.newAdjustmentLayer.colorBalance",midtones=[8,0,-10],highlights=[6,0,-8]); run("layer.setProps",layer=cb["layer"],name="grade")
vg=run("layer.newFillLayer.gradient",**{"from":"#ffffff","to":"#2A1F4A","style":"radial"}); run("layer.setProps",layer=vg["layer"],name="vignette",blend="Multiply",opacity=0.22)
nl=run("layer.new.layer",name="sun flare",mode="Screen"); run("edit.fill",contents="black")
run("filter.render.lensFlare",brightness=80,centerX=(1720*KK+OX)/CW,centerY=(890*KK+OY)/CHH,lens="prime105"); run("layer.setProps",layer=nl["layer"],opacity=0.55)
STEM=_o.environ.get("KA_OUT","keyart_main_2560x1440_v1")
if STEM.startswith("keyart_main"):
    c.call("doc_save",{"path":OUT+"/source/keyart_main_v1.psd"}); c.call("doc_save",{"path":OUT+f"/{STEM}.png"}); c.call("doc_save",{"path":OUT+f"/{STEM}.jpg","quality":92})
else:
    c.call("doc_save",{"path":OUT+f"/source/{STEM}.psd"}); c.call("doc_save",{"path":"/home/user/pilot/work/keyart/"+STEM+".png"})
print(c.call("doc_inspect",{})["history"][-5:]); c.close()
