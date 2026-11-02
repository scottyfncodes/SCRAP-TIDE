from envkit import *
OUT="/home/user/pilot/pkg/ui/kit"; SRC="/home/user/pilot/pkg/ui/source"
os.makedirs(OUT+"/items",exist_ok=True); os.makedirs(OUT+"/nav",exist_ok=True); os.makedirs(SRC,exist_ok=True)
def done(v,stem,scale=1):
    v.export(f"{OUT}/{stem}.svg",outlineText=True); v.export(f"{OUT}/{stem}.png",scale=scale); v.save(f"{SRC}/{stem.replace('/','_')}.vectorcraft"); v.close()
LW=6
def ic(name,fn,S=128,stem="items"):
    v=VC(); v.new(S,S,name); fn(v,S/2); done(v,f"{stem}/{name}",scale=3)
# ---- treasure items (ids match src/data/items.ts) ----
def doubloon(v,c):
    v.path(ellipse(c,c+6,46),fill=P["goldDeep"],stroke=LINE,sw=LW); v.path(ellipse(c,c,46),fill=grad([(0,"#FFF3B8"),(0.5,P["gold"]),(1,P["amber"])],angle=-60),stroke=LINE,sw=LW)
    v.path(ellipse(c,c,33),stroke=P["goldDeep"],sw=4); grinning_sun(v,c,c,15,line="#FFE89A",mono=P["goldDeep"])
def pearl(v,c):
    v.path(f"M{c-50} {c+20} Q{c} {c-10} {c+50} {c+20} Q{c} {c+60} {c-50} {c+20} Z",fill=P["hibiscus"],stroke=LINE,sw=LW)
    v.path(ellipse(c,c+4,30),fill=grad([(0,"#FFFFFF"),(0.6,"#FFF0E2"),(1,"#E3C9B4")],kind="radial"),stroke=LINE,sw=LW); v.path(ellipse(c-10,c-8,8,6),fill="#FFFFFF")
def gem(v,c):
    v.path(f"M{c-44} {c-14} L{c-22} {c-42} H{c+22} L{c+44} {c-14} L{c} {c+46} Z",fill="#2ECC71",stroke=LINE,sw=LW)
    v.path(f"M{c-44} {c-14} H{c+44} L{c} {c+46} Z",fill="#0E6B3A",op=0.45); v.path(f"M{c-22} {c-42} L{c} {c-14} L{c+22} {c-42}",stroke="#BFFFD8",sw=4); v.path(f"M{c-28} {c-24} l10 -12",stroke="#FFFFFF",sw=5)
def ring(v,c):
    v.path(ellipse(c,c+14,34,28),stroke=LINE,sw=20); v.path(ellipse(c,c+14,34,28),stroke=P["gold"],sw=10)
    v.path(rrect(c-18,c-46,36,30,8),fill=P["gold"],stroke=LINE,sw=LW); v.path(ellipse(c,c-31,9),fill=P["crimson"],stroke=LINE,sw=3)
def gold_bar(v,c):
    v.path(f"M{c-52} {c+26} L{c-34} {c-8} H{c+34} L{c+52} {c+26} Z",fill=P["gold"],stroke=LINE,sw=LW); v.path(f"M{c-34} {c-8} L{c-24} {c-26} H{c+24} L{c+34} {c-8} Z",fill="#FFE89A",stroke=LINE,sw=LW)
    v.path(f"M{c-14} {c+4} h28",stroke=P["goldDeep"],sw=5)
def sun_mask(v,c): grinning_sun(v,c,c,26)
def bell(v,c):
    v.path(f"M{c-36} {c+28} Q{c-36} {c-40} {c} {c-40} Q{c+36} {c-40} {c+36} {c+28} Q{c+46} {c+34} {c+40} {c+38} H{c-40} Q{c-46} {c+34} {c-36} {c+28} Z",fill="#C98F3C",stroke=LINE,sw=LW)
    v.path(ellipse(c,c+44,10),fill=P["timberDeep"],stroke=LINE,sw=4); v.path(f"M{c-20} {c-20} Q{c-24} {c} {c-22} {c+20}",stroke="#F0C27A",sw=6); v.path(rrect(c-8,c-54,16,16,4),fill="#C98F3C",stroke=LINE,sw=4)
def spyglass(v,c):
    d=f"M{c-50} {c+30} L{c+40} {c-34}"; v.path(d,stroke=LINE,sw=34); v.path(d,stroke=P["gold"],sw=22)
    v.path(f"M{c-50} {c+30} L{c-14} {c+4}",stroke=P["timber"],sw=20); v.path(ellipse(c+44,c-36,14),fill=P["sky"],stroke=LINE,sw=5)
def old_key(v,c):
    v.path(ellipse(c-24,c-20,22),stroke=LINE,sw=20); v.path(ellipse(c-24,c-20,22),stroke="#8A6D3B",sw=10)
    d=f"M{c-8} {c-4} L{c+44} {c+48}"; v.path(d,stroke=LINE,sw=20); v.path(d,stroke="#8A6D3B",sw=10)
    v.path(f"M{c+26} {c+30} l-14 14 M{c+38} {c+42} l-10 10",stroke=LINE,sw=8); v.path(ellipse(c-30,c-24,6),fill="#3F5B4F")
def conch(v,c):
    v.path(f"M{c-48} {c+16} C{c-48} {c-30} {c+10} {c-48} {c+40} {c-30} C{c+56} {c-16} {c+40} {c+20} {c+10} {c+34} C{c-20} {c+46} {c-48} {c+36} {c-48} {c+16} Z",fill="#F6B08A",stroke=LINE,sw=LW)
    v.path(f"M{c-32} {c+22} Q{c} {c+26} {c+24} {c-6}",stroke=P["hibiscus"],sw=10); v.path(f"M{c+36} {c-32} l10 -14 M{c+50} {c-14} l14 -6",stroke=LINE,sw=6)
def starfish(v,c): v.path(star(c,c+4,50,22),fill=P["coral"],stroke=LINE,sw=LW); v.path(ellipse(c,c+4,6),fill="#C4472A")
def sea_glass(v,c):
    v.path(f"M{c-40} {c-6} Q{c-30} {c-40} {c+6} {c-36} Q{c+44} {c-30} {c+42} {c+8} Q{c+30} {c+42} {c-6} {c+38} Q{c-44} {c+30} {c-40} {c-6} Z",fill="#7FD8C9",stroke=LINE,sw=LW,op=None)
    v.path(f"M{c-20} {c-18} Q{c-6} {c-28} {c+12} {c-22}",stroke="#FFFFFF",sw=6)
ITEMS=dict(doubloon=doubloon,pearl=pearl,sea_emerald=gem,gold_ring=ring,gold_bar=gold_bar,sun_mask=sun_mask,ship_bell=bell,spyglass=spyglass,old_key=old_key,conch=conch,starfish=starfish,sea_glass=sea_glass)
# ---- nav icons (single-color + gold accent; 44pt tap targets) ----
def nav_map(v,c):
    v.path(f"M{c-46} {c-34} L{c-16} {c-44} L{c+16} {c-34} L{c+46} {c-44} V{c+34} L{c+16} {c+44} L{c-16} {c+34} L{c-46} {c+44} Z",fill=P["parch"],stroke=LINE,sw=LW)
    v.path(f"M{c-16} {c-44} V{c+34} M{c+16} {c-34} V{c+44}",stroke=LINE,sw=3,op=0.5); v.path(f"M{c+18} {c-8} l14 14 M{c+32} {c-8} l-14 14",stroke=P["crimson"],sw=6); v.path(f"M{c-34} {c+20} q20 -30 44 -14",stroke=P["crimson"],sw=4,dash=[6,6])
def nav_ship(v,c):
    v.path(f"M{c-44} {c+14} H{c+46} Q{c+36} {c+44} {c} {c+44} Q{c-34} {c+44} {c-44} {c+14} Z",fill=P["honey"],stroke=LINE,sw=LW)
    v.path(f"M{c+2} {c+14} V{c-48}",stroke=LINE,sw=6); v.path(f"M{c+6} {c-44} Q{c+48} {c-14} {c+38} {c+6} H{c+6} Z",fill=P["cream"],stroke=LINE,sw=5); v.path(f"M{c-2} {c-36} Q{c-34} {c-10} {c-30} {c+6} H{c-2} Z",fill=P["cream"],stroke=LINE,sw=5)
def nav_chest(v,c): chest(v,c,c+44,0.36,glow=False)
def nav_catalog(v,c):
    v.path(rrect(c-40,c-46,80,92,10),fill=P["sea"],stroke=LINE,sw=LW); v.path(rrect(c-30,c-46,70,86,6),fill=P["cream"],stroke=LINE,sw=4); v.path(rrect(c-40,c-46,22,92,8),fill=P["sea"],stroke=LINE,sw=LW)
    v.path(sparkle(c+8,c-6,20),fill=P["gold"],stroke=LINE,sw=3)
def nav_gear(v,c):
    v.path(star(c,c,48,36,10,-90),fill=P["cream"],stroke=LINE,sw=LW); v.path(ellipse(c,c,14),fill=P["sea"],stroke=LINE,sw=5)
def nav_shovel(v,c):
    d=f"M{c-36} {c-40} L{c+16} {c+14}"; v.path(d,stroke=LINE,sw=16); v.path(d,stroke=P["timber"],sw=8)
    v.path(f"M{c+8} {c+6} L{c+30} {c-6} L{c+50} {c+30} Q{c+30} {c+52} {c+10} {c+44} Z",fill=P["sea"],stroke=LINE,sw=LW)
NAV=dict(map=nav_map,ship=nav_ship,cargo=nav_chest,catalog=nav_catalog,settings=nav_gear,dig=nav_shovel)
def buttons():
    for name,base,hi,txt,tc in (("btn_primary_gold",P["gold"],"#FFE89A","SET SAIL",P["tide"]),("btn_secondary_cream",P["cream"],"#FFFFFF","CATALOG",P["tide"]),("btn_danger_coral",P["coral"],"#FFB59E","SELL ALL",P["white"])):
        v=VC(); v.new(300,96,name)
        v.path(rrect(6,14,288,76,30),fill=P["swell"],name="shadow")
        v.path(rrect(6,6,288,76,30),fill=base,stroke=LINE,sw=6,name="face")
        v.path(rrect(22,14,256,22,11),fill=hi,op=0.7,name="gloss")
        t=v.text(txt,150,56,font="Nunito",size=28,color=tc,justify="center"); v.style(t,style="Black",tracking=60,justify="center")
        done(v,name,scale=3)
    v=VC(); v.new(360,240,"panel_sailcloth")
    v.path(rrect(8,14,344,218,24),fill=P["swell"],op=0.35); v.path(rrect(8,8,344,218,24),fill=P["cream"],stroke=LINE,sw=6)
    v.path(rrect(18,18,324,198,16),stroke=P["parch"],sw=3)
    for x,y,a in ((22,22,0),(338,22,90)): v.path(f"M{x} {y+24} Q{x} {y} {x+24 if a==0 else x-24} {y}",stroke=P["lagoon"],sw=6)
    done(v,"panel_sailcloth",scale=3)
    RAR=[("common","#9FB3C8"),("uncommon","#3FA55A"),("rare","#1A7FA8"),("epic","#8B5CF6"),("legendary","#F4C542")]
    for n,col in RAR:
        v=VC(); v.new(200,56,n); v.path(rrect(4,4,192,48,24),fill=col,stroke=LINE,sw=5)
        t=v.text(n.upper(),100,38,font="Nunito",size=22,color=P["tide"] if n in("legendary","common") else P["white"],justify="center"); v.style(t,style="Black",tracking=80,justify="center")
        done(v,f"badge_rarity_{n}",scale=3)
    v=VC(); v.new(220,64,"coin pill"); v.path(rrect(4,4,212,56,28),fill=P["ink"],op=0.85,stroke=P["gold"],sw=4); doubloon_small=lambda: None
    v.path(ellipse(36,32,20),fill=P["gold"],stroke=LINE,sw=4); grinning_sun(v,36,32,7,line="#FFE89A",mono=P["goldDeep"])
    t=v.text("1,240",132,44,font="Nunito",size=30,color=P["cream"],justify="center"); v.style(t,style="Black",justify="center")
    done(v,"hud_coin_pill",scale=3)
def worldmap():
    v=VC(); v.new(1170,1600,"world map")
    v.path("M20 30 Q300 0 600 24 Q900 6 1150 30 L1140 400 Q1160 800 1145 1200 L1150 1570 Q900 1600 580 1576 Q280 1600 22 1572 L30 1200 Q10 800 26 400 Z",fill=P["parch"],stroke=LINE,sw=10,name="parchment")
    v.path("M60 70 H1110 V1530 H60 Z",fill=grad([(0,"#BFE6E0"),(1,"#9FD3D9")],angle=-90),op=0.55,name="sea_tint")
    for i in range(18): v.path(f"M{80+(i*263)%960} {120+i*80} q20 -8 40 0 q20 -8 40 0",stroke=P["sea"],sw=3,op=0.45)
    isl=[("Port Saltwhistle",600,1250,150,P["crimson"]),("Turtle Cay",300,960,80,None),("Lantern Rock",900,880,62,None),("Gull Sandbar",660,560,52,None),("Mossjaw Isle",260,260,120,None)]
    v.path("M600 1180 C520 1080 380 1080 330 1010 M600 1180 C760 1060 860 980 890 930 M600 1180 C640 900 660 760 660 620 M330 950 C300 700 260 500 260 400",stroke=P["crimson"],sw=6,dash=[18,14],name="routes")
    for name,x,y,r,acc in isl:
        v.path(ellipse(x,y,r*1.35,r*0.95),fill=P["aqua"],op=0.8)
        v.path(f"M{x-r} {y} Q{x-r} {y-r*0.8} {x-r*0.2} {y-r*0.75} Q{x+r*0.6} {y-r*0.9} {x+r} {y-r*0.1} Q{x+r*0.9} {y+r*0.6} {x} {y+r*0.6} Q{x-r*0.9} {y+r*0.6} {x-r} {y} Z",fill=P["sand"],stroke=LINE,sw=6)
        v.path(ellipse(x,y-r*0.15,r*0.6,r*0.38),fill=P["palm"] if name!="Gull Sandbar" else P["sandDeep"],op=0.9)
        t=v.text(name,x,y+r*0.6+46,font="Fraunces 72pt",size=34,color=P["tide"],justify="center"); v.style(t,justify="center")
    for x in (560,600,640,680): house(v,x-12,1222,26,24,P["cream"],P["crimson"])
    v.path(f"M884 860 V800 H916 V860 Z",fill=P["cream"],stroke=LINE,sw=5); v.path(f"M880 800 L900 770 L920 800 Z",fill=P["crimson"],stroke=LINE,sw=5)
    v.path(f"M236 236 l40 40 M276 236 l-40 40",stroke=P["crimson"],sw=14,name="x_marks_the_spot")
    v.path("M60 690 Q600 650 1110 700",stroke=P["sea"],sw=8,dash=[4,16],op=0.7,name="open_swell")
    t=v.text("THE OPEN SWELL",820,676,font="Nunito",size=26,color=P["sea"]); v.style(t,style="Black",tracking=200)
    v.path(ellipse(1000,1400,90),fill=P["cream"],stroke=LINE,sw=6); v.path(star(1000,1400,100,24,4,-90),fill=P["tide"]); v.path(star(1000,1400,60,16,4,-45),fill=P["sea"]); v.text("N",1000,1280,font="Fraunces 144pt",size=40,color=P["tide"],justify="center")
    t=v.text("The Shallows",585,170,font="Fraunces 144pt",size=72,color=P["tide"],justify="center"); v.style(t,justify="center")
    done(v,"map_world_shallows",scale=1)
if __name__=="__main__":
    import sys
    j=sys.argv[1:] or ["items","nav","buttons","map"]
    if "items" in j:
        for n,fn in ITEMS.items(): ic(n,fn)
    if "nav" in j:
        for n,fn in NAV.items(): ic(n,fn,stem="nav")
    if "buttons" in j: buttons()
    if "map" in j: worldmap()
    print("ok")
