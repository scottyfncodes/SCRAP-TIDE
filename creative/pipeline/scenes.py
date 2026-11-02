from envkit import *
from ship_sloop import sloop
from ships_all import dinghy
# Each scene: dict plane -> draw fn
def turtle_cay(v,pl):
    hy=520
    if pl=="sky":
        sky(v,"#5FB8EE",P["skyHi"],"#FFF1CF"); sun_glow(v,360,210,70)
        cloud(v,1180,170,1.2,shade=P["dusk"]); cloud(v,600,330,0.7,shade=P["dusk"]); cloud(v,1600,300,0.8,shade=P["dusk"])
        for x,y in ((1300,380),(1360,350),(1420,400)): gull(v,x,y,0.8)
        sea(v,hy,P["sea"],P["lagoon"])
    if pl=="far":
        for (x,w,h) in ((140,380,70),(1650,460,90)): v.path(f"M{x-w/2} {hy} Q{x-w/4} {hy-h} {x} {hy-h} Q{x+w/4} {hy-h} {x+w/2} {hy} Z",fill="#5E8FA8",name="far_island")
    if pl=="mid":
        cx,by=1180,760
        v.path(ellipse(cx,by+10,640,120),fill=P["aqua"],op=0.8,name="shallows")
        v.path(f"M{cx-560} {by} Q{cx-300} {by-90} {cx} {by-96} Q{cx+330} {by-90} {cx+560} {by} Q{cx} {by+70} {cx-560} {by} Z",fill=P["sand"],stroke=LINE,sw=7,name="beach")
        shell=f"M{cx-420} {by-50} Q{cx-380} {by-330} {cx} {by-350} Q{cx+380} {by-330} {cx+420} {by-50} Q{cx} {by-20} {cx-420} {by-50} Z"
        v.path(shell,fill=P["palm"],stroke=LINE,sw=8,name="turtle_hill")
        for i,(dx,dy,rx,ry) in enumerate(((-200,-180,110,70),(40,-230,130,80),(250,-160,110,66),(-60,-110,110,50),(180,-90,90,40))):
            v.path(ellipse(cx+dx,by+dy,rx,ry),fill=P["jungle"] if i%2 else "#2F8A4E",stroke=LINE,sw=4,op=0.9,name="shell_plate")
        v.path(f"M{cx-400} {by-70} Q{cx-470} {by-110} {cx-500} {by-90} L{cx-470} {by-40} Z",fill="#7FB58A",stroke=LINE,sw=7,name="neck")
        v.path(ellipse(cx-545,by-115,85,64),fill="#8CC79A",stroke=LINE,sw=8,name="turtle_head")
        v.path(ellipse(cx-580,by-135,20,24),fill="#FFFFFF",stroke=LINE,sw=4); v.path(ellipse(cx-586,by-132,10,13),fill=LINE); v.path(ellipse(cx-590,by-138,4),fill="#FFFFFF")
        v.path(f"M{cx-615} {by-90} Q{cx-575} {by-66} {cx-530} {by-92}",stroke=LINE,sw=6,name="turtle_smile")
        v.path(ellipse(cx-520,by-102,14,8),fill=P["hibiscus"],op=0.5)
        v.path(f"M{cx-380} {by-40} Q{cx-470} {by+10} {cx-430} {by+30} Q{cx-360} {by+10} {cx-330} {by-30} Z",fill="#7FB58A",stroke=LINE,sw=6,name="flipper")
        for i in range(11):
            t=i/10; x=cx-400+800*t; y=by-50-300*math.sin(math.pi*t)**0.8
            v.path(ellipse(x,y,46,34),fill="#47B068" if i%2 else P["palm"],stroke=LINE,sw=5,name="bush")
        palm(v,cx-250,by-60,300,-60,1.0); palm(v,cx+300,by-40,260,70,0.9); palm(v,cx+80,by-310,160,10,0.8)
        dinghy_x=cx-120
        v.path(f"M{cx+120} {by-30} l10 -40 q8 -10 16 0 l10 40 Z",fill="#7FC6A4",stroke=LINE,sw=4,name="bottle")
        v.path(f"M{cx+330} {by-14} l26 -26 M{cx+330} {by-40} l26 26",stroke=P["crimson"],sw=9,name="x_mark")
    if pl=="near":
        v.path(f"M0 {H} V900 Q300 860 620 920 Q760 950 820 {H} Z",fill=P["sandDeep"],stroke=LINE,sw=8)
        for ang,ln in ((-60,420),(-30,380),(-95,360),(-10,300)): frond(v,-40,900,ang,ln,P["jungle"],droop=0.15)
        rock(v,1760,H,420,260); rock(v,1560,H+20,240,140,"#7A6898")
        v.path(star(1680,1010,34,15),fill=P["coral"],stroke=LINE,sw=4)
        v.path(f"M900 1040 q60 -14 120 0 M1100 1000 q50 -12 100 0",stroke=P["foam"],sw=6)
def port_saltwhistle(v,pl):
    hy=600
    if pl=="sky":
        sky(v,"#6BB9E8","#FFE3B0","#FFC27A"); sun_glow(v,1500,260,60)
        cloud(v,300,180,1.0,shade=P["dusk"]); cloud(v,900,120,0.8,col="#FFF6E6",shade=P["coral"])
    if pl=="far":
        v.path(f"M0 {hy} Q300 360 700 420 Q1000 300 1400 380 Q1700 420 {W} 340 V{hy} Z",fill="#7FA88C",name="hills")
        cols=[(P["crimson"],P["cream"]),(P["lagoon"],P["crimson"]),(P["gold"],P["tide"]),(P["cream"],P["sea"]),(P["hibiscus"],P["cream"])]
        for i in range(16):
            x=60+i*115+(i%3)*14; y=hy-10-((i*53)%140)
            wall,roof=cols[i%5]; house(v,x,y,80,70+(i%3)*24,"#F3E2C2" if i%2 else wall,roof if i%2 else P["crimson"])
    if pl=="mid":
        v.path(f"M0 {hy} H{W} V{H} H0 Z",fill=grad([P["sea"],P["lagoon"]],angle=-90))
        for i in range(10): v.path(f"M{(i*307)%1900} {hy+30+i*40} q40 -8 80 0",stroke=P["foam"],sw=3+i*0.4,op=0.6)
        sloop(v,cx=1300,wl=800,base=P["lagoon"],trim=P["cream"],pat=("stripe",P["crimson"]),flagk="pennant",fc=("#3a86ff","#ffffff"))
        v.path(f"M0 760 H880 L900 800 H0 Z",fill=P["honey"],stroke=LINE,sw=7,name="dock")
        v.path(" ".join(f"M{x} 762 V798" for x in range(40,880,60)),stroke=P["timber"],sw=4)
        for x in range(60,880,160): v.path(rrect(x-14,780,28,240,8),fill=P["timber"],stroke=LINE,sw=6,name="post")
        # Pip's stall
        v.path(rrect(180,560,360,200,10),fill=P["timber"],stroke=LINE,sw=7)
        aw=f"M150 560 L570 560 L540 480 H180 Z"; v.path(aw,fill=P["cream"],stroke=LINE,sw=7)
        for i in range(5): v.path(f"M{180+i*72} 480 L{150+i*84} 560 H{192+i*84} L{216+i*72} 480 Z",fill=P["crimson"],stroke=LINE,sw=3)
        v.path(f"M150 560 "+" ".join(f"q21 26 42 0" for _ in range(10)),fill=P["crimson"],stroke=LINE,sw=4)
        for i in range(6): v.path(ellipse(230+i*55,700,18,12),fill=P["gold"],stroke=LINE,sw=3)
        v.text("PIP'S APPRAISALS",360,640,font="Fraunces 72pt",size=34,color=P["gold"],justify="center")
        bunting(v,0,320,860,380,60,14); bunting(v,880,360,1900,300,50,16)
    if pl=="near":
        for x,y,s in ((60,1080,1.0),(250,1100,0.8)):
            v.path(rrect(x-80*s,y-220*s,160*s,220*s,30*s),fill=P["timber"],stroke=LINE,sw=7); v.path(f"M{x-80*s} {y-150*s} H{x+80*s} M{x-80*s} {y-70*s} H{x+80*s}",stroke=P["timberDeep"],sw=10)
        v.path(rrect(1700,900,200,180,10),fill=P["honey"],stroke=LINE,sw=7); v.path("M1700 990 H1900 M1800 900 V1080",stroke=LINE,sw=4)
        v.path(" ".join(f"M{x} {1050} q40 -12 80 0" for x in range(500,1600,220)),stroke=P["foam"],sw=6)
def treasure_cove(v,pl):
    if pl=="sky":
        sky(v,"#1B1640",P["plum"],"#2A1F4A")
        v.path(ellipse(1360,140,240,130),fill="#3A6BA8",name="opening")
        v.path(ellipse(1420,120,40),fill="#FFF6D8",fx=[{"effect":"stylize.outerGlow","params":{"color":"#CFE6FF","blur":30,"opacity":80}}])
        for i in range(10): v.path(sparkle(1200+(i*53)%320,60+(i*37)%140,4+i%3*2),fill="#FFFFFF")
    if pl=="far":
        v.path(f"M0 0 H900 Q1000 200 1150 120 Q1200 40 1250 0 H{W} V700 Q1500 560 1200 640 Q900 520 600 620 Q300 560 0 640 Z",fill="#2E2152",name="cave_back")
        for (x,y,s) in ((300,520,1),(1650,480,1.3),(1100,600,0.8)):
            v.path(f"M{x} {y} l{20*s} {-70*s} l{20*s} {70*s} Z M{x+30*s} {y} l{14*s} {-44*s} l{14*s} {44*s} Z",fill=P["aqua"],stroke=LINE,sw=3,fx=[{"effect":"stylize.outerGlow","params":{"color":P["aqua"],"blur":16,"opacity":80}}])
        v.path(f"M0 760 H{W} V{H} H0 Z",fill=grad([(0,"#1D5E84"),(1,"#102850")],angle=-90),name="pool")
        for i in range(10): v.path(f"M{(i*211)%W} {790+i*24} q50 -8 100 0",stroke=P["aqua"],sw=3,op=0.6)
    if pl=="mid":
        v.path(f"M560 800 Q600 640 960 620 Q1320 640 1360 800 Q960 860 560 800 Z",fill="#5B4A80",stroke=LINE,sw=8,name="shelf")
        v.path("M620 760 Q960 700 1300 760",stroke="#8C7AA8",sw=10)
        chest(v,960,720,1.1)
        for (x,y) in ((700,760),(1220,770),(820,790),(1120,790)):
            for j in range(4): v.path(ellipse(x+j*8,y-j*10,20,8),fill=P["gold"],stroke=P["goldDeep"],sw=3)
        grinning_sun(v,1240,690,34)
        v.path(rays(960,560,80,900,10,4,rot=-90),fill="#FFE7A0",op=0.12,name="god_rays")
    if pl=="near":
        v.path(f"M0 0 H{W} V60 Q1700 220 1560 120 Q1500 260 1400 90 Q1200 160 1100 60 Q900 200 800 70 Q600 260 500 90 Q300 180 200 80 Q100 300 0 260 Z",fill="#140F2C",name="stalactites")
        v.path(f"M0 {H} V700 Q160 640 260 760 Q340 860 420 {H} Z M{W} {H} V640 Q1760 600 1680 760 Q1600 880 1520 {H} Z",fill="#140F2C",name="frame_rocks")
        Ship(v).lantern(330,700,22); Ship(v).lantern(1620,660,22)
def mossjaw(v,pl):
    if pl=="sky":
        sky(v,"#CFF0B0","#7CC48A","#2E7A55")
        v.path(rays(1100,-100,0,1400,12,3,rot=60),fill="#FFF6C0",op=0.25,name="light_shafts")
    if pl=="far":
        for i,x in enumerate((100,360,700,1500,1760)):
            v.path(f"M{x-40} {H} L{x-20} 0 H{x+20} L{x+40} {H} Z",fill="#4E9A72" if i%2 else "#5FA97E",name="far_trunk")
        v.path(f"M1120 140 H1300 V760 H1120 Z",fill=grad([P["foam"],P["aqua"]],angle=-90),name="waterfall",op=0.9)
        v.path(" ".join(f"M{1140+i*30} 160 V740" for i in range(6)),stroke="#FFFFFF",sw=4,op=0.6)
        v.path(f"M1000 140 Q1210 60 1420 140 V200 H1000 Z",fill="#3F7F5A")
        v.path(ellipse(1210,770,200,40),fill=P["foam"],op=0.8)
    if pl=="mid":
        v.path(f"M0 820 Q500 760 960 800 Q1400 840 {W} 780 V{H} H0 Z",fill="#6E8F4A",stroke=LINE,sw=8,name="ground")
        v.path(f"M760 {H} Q860 900 960 820 Q1040 900 1160 {H} Z",fill=P["sandDeep"],stroke=LINE,sw=6,name="path")
        # sun temple gate
        gx=560
        v.path(f"M{gx-200} 830 V420 H{gx-110} V830 Z M{gx+110} 830 V420 H{gx+200} V830 Z",fill="#B7A27E",stroke=LINE,sw=8,name="pillars")
        v.path(f"M{gx-240} 440 Q{gx} 260 {gx+240} 440 V480 H{gx-240} Z",fill="#C8B48C",stroke=LINE,sw=8,name="arch")
        grinning_sun(v,gx,390,48,line=LINE,mono="#8E7C5A")
        for y in (520,620,720): v.path(f"M{gx-200} {y} H{gx-110} M{gx+110} {y+30} H{gx+200}",stroke=LINE,sw=3,op=0.5)
        for x,y in ((gx-220,500),(gx+190,560),(gx-180,700)): v.path(f"M{x} {y} q30 40 10 90 q-20 40 10 80",stroke=P["palm"],sw=10)
        for (x,y) in ((300,800),(820,790),(1500,800),(1700,760),(1350,830)): flower(v,x,y,26)
        for (x,y,a) in ((900,820,-110),(950,820,-70),(1420,800,-120),(1460,800,-60)): leaf(v,x,y,a,150,P["palm"])
    if pl=="near":
        for (x,y,a,ln) in ((-40,300,10,520),(-60,700,-20,560),(-20,1100,-50,520),(1960,280,170,520),(1980,760,200,560),(1960,1120,230,500),(700,-60,80,360),(1300,-80,100,380)):
            leaf(v,x,y,a,ln,"#1E5E43","#3FA55A")
        v.path(f"M200 0 Q260 300 180 520 M1700 0 Q1640 260 1720 420",stroke="#2E6B44",sw=12)
        flower(v,260,560,34); flower(v,1690,440,30)
def wreck(v,pl):
    hy=500
    if pl=="sky":
        sky(v,"#4FA8E0",P["skyHi"]); sun_glow(v,1580,170,55)
        cloud(v,200,160,1.0,shade=P["dusk"]); cloud(v,900,230,0.6,shade=P["dusk"])
        sea(v,hy,"#1F6E9E",P["lagoon"])
    if pl=="far":
        for i in range(5):
            y=hy+70+i*10; x=200+i*300
            v.path(f"M{x} {y} q60 -26 120 0 q60 -26 120 0",stroke=P["foam"],sw=8,name="reef_break")
    if pl=="mid":
        v.path(f"M200 780 Q700 690 1300 720 Q1700 740 1800 800 Q1000 860 200 780 Z",fill=P["sand"],stroke=LINE,sw=8,name="sandbar")
        # broken hull, tilted
        cx,wl=980,760
        d=f"M{cx-420} {wl-40} Q{cx-200} {wl-150} {cx+160} {wl-210} L{cx+250} {wl-260} L{cx+210} {wl-140} L{cx+280} {wl-90} L{cx+200} {wl-30} Q{cx} {wl+20} {cx-420} {wl-40} Z"
        v.path(d,fill="#8C6A4E",stroke=LINE,sw=8,name="wreck_hull")
        for i in range(4): v.path(f"M{cx-380} {wl-40-i*24} Q{cx-100} {wl-120-i*28} {cx+200} {wl-150-i*28}",stroke="#5E4532",sw=4)
        for (x,y) in ((cx-120,wl-110),(cx+60,wl-150)): v.path(f"M{x} {y} l30 -10 l10 30 l-30 14 Z",fill="#2A2238",stroke=LINE,sw=4)
        v.path(f"M{cx-80} {wl-130} L{cx-200} {wl-520}",stroke=LINE,sw=30); v.path(f"M{cx-80} {wl-130} L{cx-200} {wl-520}",stroke="#8C6A4E",sw=18,name="broken_mast")
        v.path(f"M{cx-212} {wl-560} l10 40 l-24 -6 Z",fill="#8C6A4E",stroke=LINE,sw=4)
        Ship(v).flag(cx-196,wl-500,w=150,h=90,kind="wren",c1="#1c1c22",c2="#efe6d2")
        for (x,y) in ((cx-160,wl-430),(cx+240,wl-270)): v.path(f"M{x-14} {y} q14 -22 28 0 Z",fill="#FFFFFF",stroke=LINE,sw=3); v.path(f"M{x+14} {y-4} l10 2 l-10 4 Z",fill=P["amber"])
        for (x,y,r) in ((cx+120,wl-60,22),(cx-300,wl+10,16),(1500,770,18)): v.path(sparkle(x,y,r),fill="#FFFBE0",fx=[{"effect":"stylize.outerGlow","params":{"color":"#FFE27A","blur":10,"opacity":90}}])
        v.path(ellipse(1520,790,30,10),fill=P["timber"],stroke=LINE,sw=4)
    if pl=="near":
        v.path(f"M0 900 Q500 860 960 900 Q1400 940 {W} 880 V{H} H0 Z",fill=grad([(0,P["lagoon"],0.85),(1,P["sea"],0.95)],angle=-90),name="shallows_front")
        for i in range(6): v.path(f"M{100+i*300} {960+(i%2)*40} q50 -14 100 0",stroke=P["foam"],sw=6)
        v.path(f"M80 990 L460 940 L470 970 L90 1020 Z",fill="#B08A64",stroke=LINE,sw=6,name="plank")
        v.path(f"M1500 1000 L1820 1030 L1810 1056 L1494 1028 Z",fill="#B08A64",stroke=LINE,sw=6)
SCENES={"01_turtle-cay":turtle_cay,"02_port-saltwhistle":port_saltwhistle,"03_treasure-cove":treasure_cove,"04_mossjaw-jungle":mossjaw,"05_wreck-of-the-wren":wreck}
if __name__=="__main__":
    import sys
    OUT="/home/user/pilot/work/env"
    for name in (sys.argv[1:] or SCENES):
        fn=SCENES[name]
        for pl in ("sky","far","mid","near"):
            v=VC(); v.new(W,H,f"{name} {pl}"); fn(v,pl)
            v.export(f"{OUT}/{name}/{pl}.png"); v.save(f"{OUT}/{name}/{pl}.vectorcraft"); v.close()
        print(name)
