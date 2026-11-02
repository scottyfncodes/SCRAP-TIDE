from shipkit import *
from ship_sloop import sloop
OUT="/home/user/pilot/work/ships"
def dinghy(v,cx=600,wl=720,base=P["honey"],sail=P["cream"]):
    s=Ship(v); L=360; H=78; mx=cx+10; top=wl-H-300
    s.rig([(mx,top+4,cx+L/2+6,wl-H-6),(mx,top+4,cx-L/2+10,wl-H-4)],op=0.7)
    s.mast(mx,wl-H+6,top,w=12,color=P["timber"])
    # bedsheet sail on a crooked yard, with a gull-shaped hole patch
    s.yard(mx,top+16,190,9)
    d=s.square_sail(mx,top+16,180,200,belly=22,cloth="#F3E7D2")
    v.path(f"M{mx-40} {top+90} q14 -14 26 0 q12 -14 26 0 q-14 10 -26 6 q-12 6 -26 -6 Z",fill=P["sky"],stroke=L_,sw=3,name="gull_hole")
    v.path(rrect(mx+20,top+140,40,34,4),fill=P["hibiscus"],stroke=L_,sw=3,name="sail_patch"); v.path(f"M{mx+24} {top+146} l32 22 M{mx+56} {top+146} l-32 22",stroke=L_,sw=2,op=0.6)
    s.hull(cx,wl,L,H,sh=26,K=34,rake=18,base=base,trim=P["sandDeep"],planks=2,patches=True,lw=6)
    # oar, bucket, rope coil
    v.path(f"M{cx-L/2-30} {wl+30} L{cx-60} {wl-H-60}",stroke=P["timber"],sw=10,name="oar")
    v.path(f"M{cx-L/2-46} {wl+46} q14 -30 34 -10 q-6 22 -34 10 Z",fill=P["honey"],stroke=L_,sw=4,name="oar_blade")
    v.path(f"M{cx-110} {wl-H-6} l8 -40 h40 l8 40 Z",fill=P["sea"],stroke=L_,sw=5,name="bucket")
    v.path(f"M{cx-110} {wl-H-46} q28 -24 56 0",stroke=L_,sw=3)
    s.water(cx,wl,L,K=34)
    for i,(x,y) in enumerate(((cx+40,wl-14),(cx+70,wl-30),(cx+95,wl-20))): v.path(ellipse(x,y,6+i*2),fill=P["foam"],stroke=L_,sw=2,name="leak_bubble")
def brig(v,cx=600,wl=720,base=P["crimson"],trim=P["cream"],sail=P["cream"],pat=("stripe",P["crimson"])):
    s=Ship(v); L=760; H=120; m1=cx+150; m2=cx-130; top1=wl-H-560; top2=wl-H-600
    s.rig([(m1,top1+6,cx+L/2+200,wl-H-60),(m1,top1+6,m2,top2+40),(m2,top2+6,cx-L/2+20,wl-H-30),(m1,top1+40,cx+L/2-20,wl-H-6),(m2,top2+40,cx-L/2+120,wl-H-6)])
    s.mast(m2,wl-H+10,top2,w=20); s.mast(m1,wl-H+10,top1,w=20)
    # mainmast: gaff sail ; foremast: two square sails
    s.gaff_sail(m2,wl-H-58,top2+190,boomL=300,gaffL=230,gaffRise=55,cloth=sail,pattern=pat)
    s.square_sail(m2+6,top2+40,200,130,belly=20,cloth=sail,pattern=pat)
    s.yard(m2,top2+40,220)
    s.jib(m1,top1+60,cx+L/2+190,wl-H-58,cloth=sail)
    s.yard(m1,top1+70,290); s.square_sail(m1,top1+70,270,190,belly=30,cloth=sail,pattern=pat)
    s.yard(m1,top1+280,320); s.square_sail(m1,top1+280,300,170,belly=30,cloth=sail,pattern=pat)
    v.path(f"M{cx+L/2} {wl-H-30} L{cx+L/2+210} {wl-H-66}",stroke=P["timber"],sw=14,name="bowsprit")
    s.flag(m1,top1-62,w=96,h=58,kind="tidebreaker"); s.flag(m2,top2-44,w=70,h=44,kind="pennant",c1=P["gold"],c2=P["crimson"])
    # raised stern deck
    v.path(f"M{cx-L/2-10} {wl-H-60} L{cx-L/2+170} {wl-H-60} L{cx-L/2+190} {wl-H-10} L{cx-L/2+10} {wl-H-6} Z",fill=base,stroke=L_,sw=7,name="sterncastle")
    v.path(" ".join(f"M{cx-L/2+10+i*30} {wl-H-60} v-28" for i in range(6)),stroke=P["timber"],sw=6,name="railposts")
    v.path(f"M{cx-L/2} {wl-H-88} H{cx-L/2+170}",stroke=P["timber"],sw=8,name="rail")
    s.hull(cx,wl,L,H,sh=48,K=56,rake=40,base=base,trim=trim,copper=True,planks=2,ports=4,gold=True)
    for x in (cx-L/2+30, cx+L/2-40): s.lantern(x,wl-H-100,14)
    s.figurehead(cx+L/2+52,wl-H-62,"turtle",1.0)
    s.water(cx,wl,L,K=56)
def galleon(v,cx=600,wl=740,base=P["tide"],trim=P["gold"],sail="#FFE7B8",pat=("bands",[P["coral"],P["amber"]])):
    s=Ship(v); L=900; H=150; ms=[cx+300,cx+40,cx-240]; tops=[wl-H-560,wl-H-680,wl-H-520]
    s.rig([(ms[0],tops[0]+6,cx+L/2+230,wl-H-70),(ms[0],tops[0]+6,ms[1],tops[1]+30),(ms[1],tops[1]+6,ms[2],tops[2]+30),(ms[2],tops[2]+6,cx-L/2+30,wl-H-150)]+
          [(m,t+30,m+dx,wl-H-10) for m,t in zip(ms,tops) for dx in (-120,120)],op=0.6)
    for m,t in zip(ms,tops): s.mast(m,wl-H+10,t,w=24)
    # sails
    s.yard(ms[2],tops[2]+60,170); s.square_sail(ms[2],tops[2]+60,150,140,cloth=sail,pattern=pat)
    s.gaff_sail(ms[2],wl-H-150,tops[2]+240,boomL=230,gaffL=170,gaffRise=40,cloth=sail)
    s.jib(ms[0],tops[0]+80,cx+L/2+220,wl-H-72,cloth=sail)
    for (m,t,ws) in ((ms[1],tops[1],(200,250,290)),(ms[0],tops[0],(170,210,240))):
        y=t+50
        for j,w in enumerate(ws):
            h=(110,150,165)[j]; s.yard(m,y,w+20); s.square_sail(m,y,w,h,belly=28,cloth=sail,pattern=pat,emblem=(m==ms[1] and j==2)); y+=h+22
    v.path(f"M{cx+L/2} {wl-H-36} L{cx+L/2+240} {wl-H-80}",stroke=P["timber"],sw=16,name="bowsprit")
    # pennant bunting between masts
    for a,b,ta,tb in ((ms[2],ms[1],tops[2]+30,tops[1]+30),(ms[1],ms[0],tops[1]+30,tops[0]+30)):
        n=7
        for i in range(n):
            x=a+(b-a)*(i+0.5)/n; y=ta+(tb-ta)*(i+0.5)/n+18*math.sin(math.pi*(i+0.5)/n)
            c=[P["coral"],P["gold"],P["lagoon"],P["hibiscus"]][i%4]
            v.path(f"M{x-12} {y} L{x+12} {y} L{x} {y+26} Z",fill=c,stroke=L_,sw=3,name="bunting")
        v.path(f"M{a} {ta} Q{(a+b)/2} {(ta+tb)/2+40} {b} {tb}",stroke=L_,sw=3)
    s.flag(ms[1],tops[1]-80,w=130,h=78,kind="tidebreaker"); s.flag(ms[0],tops[0]-50,w=70,h=40,kind="pennant",c1=P["coral"],c2=P["gold"]); s.flag(ms[2],tops[2]-50,w=70,h=40,kind="pennant",c1=P["lagoon"],c2=P["cream"])
    # sterncastle with windows + gold filigree
    sx=cx-L/2-20
    v.path(f"M{sx} {wl-H-170} Q{sx+120} {wl-H-190} {sx+300} {wl-H-130} L{sx+310} {wl-H-10} L{sx+20} {wl-H} Z",fill=base,stroke=L_,sw=8,name="sterncastle")
    for i in range(4): v.path(rrect(sx+40+i*62,wl-H-120,40,50,14),fill=P["amber"],stroke=P["gold"],sw=5,name="stern_window",fx=[{"effect":"stylize.innerGlow","params":{"color":"#FFF3C0","blur":10,"opacity":90}}])
    v.path(f"M{sx+10} {wl-H-150} Q{sx+130} {wl-H-170} {sx+290} {wl-H-118}",stroke=P["gold"],sw=7,name="filigree")
    v.path(" ".join(f"M{sx+30+i*44} {wl-H-160+i*3} q10 -16 20 0 q10 16 20 0" for i in range(6)),stroke=P["gold"],sw=4,name="scrollwork")
    v.path(f"M{sx-6} {wl-H-176} H{sx+300}",stroke=P["timber"],sw=8)
    s.hull(cx,wl,L,H,sh=60,K=64,rake=46,base=base,trim=trim,copper=True,planks=2,ports=6,gold=True)
    v.path(" ".join(f"M{cx-L*0.35+i*L*0.1} {wl-H*0.15} q{L*0.05} {-14} {L*0.1} 0" for i in range(7)),stroke=P["gold"],sw=4,name="hull_scroll")
    for x,y in ((sx+10,wl-H-200),(sx+300,wl-H-150),(cx+L/2-40,wl-H-90),(cx+40,wl-H-40)): s.lantern(x,y,16)
    s.figurehead(cx+L/2+60,wl-H-72,"sun",1.4)
    s.water(cx,wl,L,K=64)
if __name__=="__main__":
    import sys
    which=sys.argv[1:] or ["dinghy","sloop","brig","galleon"]
    sizes={"dinghy":(1200,900),"sloop":(1200,900),"brig":(1500,1100),"galleon":(1700,1300)}
    for n in which:
        v=VC(); w,h=sizes[n]; v.new(w,h,n)
        {"dinghy":lambda:dinghy(v,cx=w/2,wl=h-170),"sloop":lambda:sloop(v,cx=w/2-40,wl=h-170),"brig":lambda:brig(v,cx=w/2-60,wl=h-180),"galleon":lambda:galleon(v,cx=w/2-80,wl=h-200)}[n]()
        print(v.export(f"{OUT}/{n}_draft.png")); v.save(f"{OUT}/{n}_draft.vectorcraft"); v.close()
