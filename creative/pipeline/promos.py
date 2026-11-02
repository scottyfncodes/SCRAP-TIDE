from dc import *
from PIL import Image
KA="/home/user/pilot/work/keyart"; CH="/home/user/pilot/pkg/characters"; K="/home/user/pilot/pkg/ui/kit"; BR="/home/user/pilot/work/brand"
OUT="/home/user/pilot/pkg/marketing"
SW={"seaw":"#1D7AA3","tide":P["tide"],"swell":P["swell"],"cream":P["cream"],"gold":P["gold"],"foam":P["foam"],"ink":P["ink"],"coral":P["coral"],"honey":P["honey"],"timber":P["timber"]}
def pimg(d,path,anchor,target,s,sp=0):
    w,h=Image.open(path).size; ax,ay=anchor(w,h)
    return d.img(path,target[0]-ax*s,target[1]-ay*s,w*s,spread=sp)
# ---------- LANDSCAPE 1920x1080 ----------
d=DC(); d.new(1920,1080,1,"TIDEBREAKERS promo landscape"); d.swatches(SW)
d.img(KA+"/sky.png",0,0,1920); d.img(KA+"/sea.png",0,0,1920)
pimg(d,BR+"/wordmark_v3_notag.png",lambda w,h:(800,330),(960,215),0.62)
d.rect(400,288,1120,72,fill="swell",opacity=0.85,radius=36)
d.text(260,300,1400,60,"From eight planks of optimism to a legend of the Shallows.",font="Fraunces 72pt",style="Bold",size=40,color="cream",align="center")
WL=830
for path,cx,wl,s,x,label in ((KA+"/dinghy_nw.png",600,730,0.30,230,"LEAKY DINGHY"),(KA+"/sloop_nw.png",560,730,0.38,560,"COASTAL SLOOP"),
                             (KA+"/brig_nw.png",690,920,0.42,1000,"SALTWHISTLE BRIG"),(KA+"/galleon_nw.png",770,1100,0.47,1530,"GRAND TIDEBREAKER")):
    pimg(d,path,lambda w,h,cx=cx,wl=wl:(cx,wl),(x,WL),s)
    hw={0.30:80,0.38:150,0.42:210,0.47:280}[s]
    m=d.rect(x-hw-40,WL+2,hw*2+80,44,fill="seaw",radius=20); d.ex("object.effects",effects={"feather":14},ids=[m])
    d.rect(x-hw,WL-6,hw*2,16,fill="foam",shape="ellipse",opacity=0.9)
    lw=len(label)*13+40; d.rect(x-lw/2,WL+40,lw,40,fill="swell",opacity=0.85,radius=20)
    d.text(x-lw/2,WL+48,lw,26,label,size=18,color="gold",align="center",tracking=120)
for x in (395,780,1265): d.text(x-30,WL-130,60,60,"›",font="Fraunces 144pt",style="Black",size=64,color="gold",align="center")
for i,(icon,t) in enumerate(((K+"/nav/dig.png","Dig up 23 treasures"),(K+"/nav/ship.png","Upgrade every plank"),(K+"/nav/map.png","Explore the Shallows"))):
    x=330+i*440; d.rect(x,970,400,72,fill="cream",stroke="tide",weight=3,radius=36)
    d.img(icon,x+14,976,60); d.text(x+84,990,300,34,t,size=26,color="tide")
d.save(OUT+"/source/promo_landscape_v1.designcraft")
print(d.png(0,OUT+"/promo_landscape_1920x1080_v1.png",scale=1)); d.ex("file.exportPdf",path=OUT+"/source/promo_landscape_v1.pdf"); d.close()
# ---------- PORTRAIT 1080x1920 ----------
d=DC(); d.new(1080,1920,1,"TIDEBREAKERS promo portrait"); d.swatches(SW)
d.img(KA+"/promo_portrait_plate.png",0,0,1080)
pimg(d,BR+"/wordmark_v3.png",lambda w,h:(800,300),(540,260),0.66)
d.rect(90,1430,900,96,fill="swell",opacity=0.85,radius=48)
d.text(90,1450,900,60,"Start small. Earn something magnificent.",font="Fraunces 72pt",style="Bold",size=38,color="cream",align="center")
d.rect(-20,1740,1120,200,fill="honey",stroke="tide",weight=6)
for x in range(0,1080,120): d.rect(x,1740,4,200,fill="timber")
pimg(d,CH+"/cast_lineup.png",lambda w,h:(w/2,700),(540,1752),0.55)
d.rect(240,1810,600,84,fill="swell",radius=42); d.rect(240,1802,600,84,fill="gold",stroke="tide",weight=5,radius=42)
d.text(240,1822,600,50,"SET SAIL ON iPHONE",size=34,color="tide",align="center",tracking=80)
d.save(OUT+"/source/promo_portrait_v1.designcraft")
print(d.png(0,OUT+"/promo_portrait_1080x1920_v1.png",scale=1)); d.ex("file.exportPdf",path=OUT+"/source/promo_portrait_v1.pdf"); d.close()
