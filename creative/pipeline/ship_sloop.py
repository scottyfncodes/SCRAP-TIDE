from shipkit import *
import sys
OUT="/home/user/pilot/work/ships"
def sloop(v,cx=600,wl=720,base="#4fb39a",trim="#f2ead8",sail=P["cream"],pat=None,flagk="pennant",fig=None,copper=True,lanterns=True,fc=None):
    s=Ship(v); L=560; H=92; mx=cx+30; top=wl-H-520
    s.rig([(mx,top+6,cx+L/2+150,wl-H-40),(mx,top+6,cx-L/2-10,wl-H-20),(mx,top+40,cx-L/2+60,wl-H-6)])
    s.mast(mx,wl-H+10,top,w=18)
    s.gaff_sail(mx,wl-H-48,top+70,boomL=330,gaffL=250,gaffRise=60,cloth=sail,pattern=pat)
    s.jib(mx,top+40,cx+L/2+140,wl-H-46,cloth=sail,pattern=pat)
    v.path(f"M{cx+L/2+10} {wl-H-26} L{cx+L/2+160} {wl-H-50}",stroke=P["timber"],sw=12,name="bowsprit")
    if flagk:
        c1,c2=fc or ((P["sea"],"#FFFFFF") if flagk=="pennant" else (P["tide"],P["cream"]))
        s.flag(mx,top-58,w=80,h=50,kind=flagk,c1=c1,c2=c2)
    # crate + compass (canon upgrades)
    v.path(rrect(cx-L/2+40,wl-H-62,70,58,6),fill=P["honey"],stroke=L_,sw=5,name="crate")
    v.path(f"M{cx-L/2+40} {wl-H-33} h70 M{cx-L/2+75} {wl-H-62} v58",stroke=L_,sw=3,name="crate_lash")
    s.hull(cx,wl,L,H,sh=34,K=46,rake=36,base=base,trim=trim,copper=copper,planks=2)
    v.path(f"M{cx+L/2-30} {wl-H-18} l0 -26",stroke=L_,sw=5); v.path(ellipse(cx+L/2-30,wl-H-50,16),fill=P["gold"],stroke=L_,sw=5,name="compass")
    v.path(f"M{cx-L/2+8} {wl-H+10} L{cx-L/2-30} {wl+30}",stroke=P["timber"],sw=14,name="rudder")
    if lanterns: s.lantern(cx-L/2+8,wl-H-70,12)
    if fig: s.figurehead(cx+L/2+42,wl-H-44,fig,0.9)
    s.water(cx,wl,L)
if __name__=="__main__":
    v=VC(); v.new(1200,900,"Coastal Sloop"); sloop(v)
    print(v.export(OUT+"/sloop_test.png")); v.close()
