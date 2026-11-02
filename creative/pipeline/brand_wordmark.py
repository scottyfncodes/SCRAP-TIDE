from vc import *
import sys
OUT="/home/user/pilot/work/brand"; VER=sys.argv[1] if len(sys.argv)>1 else "v2"
TAG = "--notag" not in sys.argv
v=VC(); W,H=1600,(560 if TAG else 470); v.new(W,H,"TIDEBREAKERS wordmark")
FONT="Fraunces 144pt"; SIZE=190; X,Y=W/2,320
def word(fill, stroke=None, sw=None, dy=0, dx=0, name=""):
    t=v.text("TIDEBREAKERS", X+dx, Y+dy, font=FONT, size=SIZE, color="#ffffff", justify="center")
    v.style(t, tracking=-4, justify="center")
    v.c.call("set_paint",{"ids":[t],"fill":fill,"stroke":stroke or "none",**({"strokeWidth":sw} if sw else {})})
    v.rename(t,name); v.fx(t,"warp.arc",bend=11); return t
if TAG:
    rib=("M215 428 C400 388 560 454 800 424 C1040 394 1200 454 1385 418 "
         "C1360 492 1220 512 1040 504 C900 498 860 520 800 520 C700 520 600 498 470 506 C350 512 240 492 215 428 Z")
    v.path(rib, fill=P["tide"], stroke=P["tide"], sw=20, name="ribbon_outline")
    v.path(rib, fill=grad([(0,P["aqua"]),(0.5,P["lagoon"]),(1,P["sea"])],angle=-90), name="ribbon")
    v.path("M262 412 C440 440 600 498 800 472 C1000 446 1180 498 1340 466", stroke=P["foam"], sw=5, op=0.85, name="foamline")
    v.text("THE OCEAN IS FULL OF SECRETS", W/2, 540, font="Nunito", size=30, color=P["foam"], justify="center", name=None) if False else None
    t=v.text("THE OCEAN IS FULL OF SECRETS", W/2, 486, font="Nunito", size=29, color=P["foam"], justify="center"); v.style(t, style="Black", tracking=120, justify="center")
# back to front: soft drop shadow, stepped extrusion, navy outline, gold face, top gloss
sh=word(P["swell"],P["swell"],30,dy=22,name="shadow"); v.fx(sh,"blur.gaussian",radius=10); v.c.call("command_run",{"id":"object.setProps","params":{"ids":[sh],"opacity":35}})
for i,d in enumerate(range(16,0,-2)): word(P["swell"],P["swell"],28,dy=d,name=f"extrude{d}")
word(P["tide"],P["tide"],24,name="outline")
word(P["goldDeep"],P["goldDeep"],5,dy=3,name="bevel")       # warm under-edge
word(grad([(0,"#FFF6CF"),(0.38,P["gold"]),(1,P["amber"])],angle=-90),name="face")
for (x,y,r) in ((1425,158,30),(1478,214,14),(176,198,18)):
    v.path(sparkle(x,y,r+7),fill=P["tide"],name="spark_o"); v.path(sparkle(x,y,r),fill=P["cream"],name="spark")
stem=OUT+f"/wordmark_{VER}" + ("" if TAG else "_notag")
print(v.export(stem+".png",scale=1)); v.export(stem+".svg",outlineText=True); v.save(stem+".vectorcraft"); v.close()
