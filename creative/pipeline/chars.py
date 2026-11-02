from sun import *
L_=LINE
SKIN={"a":"#F2C29B","b":"#C98B62","c":"#8D5A3B","d":"#E8B896"}
class Kit:
    def __init__(s,v,mono=None): s.v=v; s.mono=mono
    def c(s,col): return s.mono or col
    def limb(s,pts,col,w):
        if len(pts)==2: d=f"M{f(pts[0][0])} {f(pts[0][1])} L{f(pts[1][0])} {f(pts[1][1])}"
        else: d=f"M{f(pts[0][0])} {f(pts[0][1])} Q{f(pts[1][0])} {f(pts[1][1])} {f(pts[2][0])} {f(pts[2][1])}"
        s.v.path(d,stroke=L_ if not s.mono else s.mono,sw=w+10); s.v.path(d,stroke=s.c(col),sw=w)
    def blob(s,d,col,lw=8,name=None):
        s.v.path(d,fill=s.c(col),stroke=L_ if not s.mono else s.mono,sw=lw,name=name)
    def flat(s,d,col,op=None,name=None):
        if s.mono: return
        s.v.path(d,fill=col,op=op,name=name)
    def line(s,d,col=None,w=5,op=None):
        if s.mono: return
        s.v.path(d,stroke=col or L_,sw=w,op=op)
    def pebble(s,cx,top,bot,wt,wb):
        h=bot-top
        return (f"M{f(cx-wt/2)} {f(top+h*0.12)} Q{f(cx-wt/2)} {f(top)} {f(cx)} {f(top)} Q{f(cx+wt/2)} {f(top)} {f(cx+wt/2)} {f(top+h*0.12)} "
                f"C{f(cx+wb/2+6)} {f(top+h*0.55)} {f(cx+wb/2+4)} {f(bot)} {f(cx)} {f(bot)} C{f(cx-wb/2-4)} {f(bot)} {f(cx-wb/2-6)} {f(top+h*0.55)} {f(cx-wt/2)} {f(top+h*0.12)} Z")
    def face(s,cx,cy,R,expr="happy",lookx=0,patch=False,skin=SKIN["a"],monocle=False,lashes=False):
        if s.mono: return
        v=s.v; ex=R*0.36; ey=cy-R*0.02
        for sx in (-1,1): v.path(ellipse(cx+sx*R*0.56,cy+R*0.28,R*0.16,R*0.1),fill=P["hibiscus"],op=0.45)
        def eye(x,shape):
            if shape=="open":
                v.path(ellipse(x+lookx,ey,R*0.12,R*0.16),fill=L_); v.path(ellipse(x+lookx-R*0.04,ey-R*0.06,R*0.045),fill="#fff")
            elif shape=="wide":
                v.path(ellipse(x,ey,R*0.15,R*0.19),fill="#fff",stroke=L_,sw=4); v.path(ellipse(x+lookx,ey+2,R*0.08,R*0.1),fill=L_)
            elif shape=="closed": v.path(f"M{f(x-R*0.13)} {f(ey+2)} Q{f(x)} {f(ey-R*0.14)} {f(x+R*0.13)} {f(ey+2)}",stroke=L_,sw=6)
            elif shape=="squint": v.path(f"M{f(x-R*0.13)} {f(ey-4)} Q{f(x)} {f(ey+R*0.08)} {f(x+R*0.13)} {f(ey-4)}",stroke=L_,sw=6)
            elif shape=="narrow": v.path(f"M{f(x-R*0.13)} {f(ey)} Q{f(x)} {f(ey-R*0.1)} {f(x+R*0.13)} {f(ey)} Q{f(x)} {f(ey+R*0.05)} {f(x-R*0.13)} {f(ey)} Z",fill=L_)
        E={"happy":("open","open"),"determined":("open","open"),"surprised":("wide","wide"),"mischief":("open","squint"),"joy":("closed","closed"),"smug":("narrow","narrow"),"worried":("open","open")}[expr]
        eye(cx-ex,E[0]); eye(cx+ex,E[1])
        bro={"happy":(-6,-6),"determined":(8,8),"surprised":(-14,-14),"mischief":(-12,6),"joy":(-8,-8),"smug":(4,-10),"worried":(-4,-4)}[expr]
        for sx,tilt in zip((-1,1),bro):
            bx=cx+sx*ex; by=ey-R*0.28
            v.path(f"M{f(bx-R*0.14)} {f(by-(tilt*sx if expr in('determined','worried') else 0)*0.3 + (tilt if expr not in ('determined','worried') else 0)*0.0)} Q{f(bx)} {f(by-8+ (tilt if sx==1 else tilt)*0.6)} {f(bx+R*0.14)} {f(by+(sx*tilt*0.5 if expr in ('determined',) else -sx*tilt*0.5 if expr=='worried' else 0))}",stroke=L_,sw=6)
        v.path(f"M{f(cx)} {f(cy+R*0.08)} q{f(R*0.06)} {f(R*0.08)} 0 {f(R*0.12)}",stroke=SKIN["b"],sw=4)
        my=cy+R*0.36
        M={"happy":f"M{f(cx-R*0.22)} {f(my)} Q{f(cx)} {f(my+R*0.24)} {f(cx+R*0.22)} {f(my)} Z",
           "joy":f"M{f(cx-R*0.26)} {f(my-4)} Q{f(cx)} {f(my+R*0.34)} {f(cx+R*0.26)} {f(my-4)} Z",
           "determined":f"M{f(cx-R*0.18)} {f(my+4)} Q{f(cx)} {f(my+R*0.08)} {f(cx+R*0.2)} {f(my-2)}",
           "surprised":ellipse(cx,my+R*0.06,R*0.1,R*0.13),
           "mischief":f"M{f(cx-R*0.22)} {f(my+2)} Q{f(cx+R*0.02)} {f(my+R*0.2)} {f(cx+R*0.26)} {f(my-R*0.08)} Q{f(cx+R*0.02)} {f(my+R*0.08)} {f(cx-R*0.22)} {f(my+2)} Z",
           "smug":f"M{f(cx-R*0.16)} {f(my+4)} Q{f(cx+R*0.06)} {f(my+R*0.1)} {f(cx+R*0.22)} {f(my-R*0.06)}",
           "worried":f"M{f(cx-R*0.16)} {f(my+R*0.08)} Q{f(cx)} {f(my-R*0.04)} {f(cx+R*0.16)} {f(my+R*0.08)}"}[expr]
        if expr in("happy","joy","mischief","surprised"):
            v.path(M,fill=P["swell"],stroke=L_,sw=4)
            if expr in("happy","joy"): v.path(f"M{f(cx-R*0.1)} {f(my+R*0.16)} Q{f(cx)} {f(my+R*0.1)} {f(cx+R*0.1)} {f(my+R*0.16)}",stroke=P["coral"],sw=7)
        else: v.path(M,stroke=L_,sw=6)
        if monocle:
            v.path(ellipse(cx+ex,ey,R*0.22),stroke=P["gold"],sw=6); v.path(ellipse(cx+ex,ey,R*0.22),fill="#ffffff",op=0.25)
            v.path(f"M{f(cx+ex+R*0.18)} {f(ey+R*0.14)} Q{f(cx+ex+R*0.3)} {f(ey+R*0.6)} {f(cx+ex+R*0.1)} {f(ey+R*0.9)}",stroke=P["gold"],sw=3)

def captain(v,cx,g,expr="happy",pose="idle",mono=None,R=70):
    k=Kit(v,mono); hy=g-268
    shirt1,shirt2,pants=P["sea"],P["cream"],"#6B4A2E"
    # back arm
    if pose=="cheer": k.limb([(cx-48,g-176),(cx-90,g-240),(cx-96,g-300)],shirt1,22)
    elif pose=="dig": k.limb([(cx-48,g-176),(cx-30,g-120),(cx+20,g-118)],shirt1,22)
    else: k.limb([(cx-48,g-176),(cx-72,g-130),(cx-66,g-96)],shirt1,22)
    # legs + boots
    for sx in (-1,1):
        k.limb([(cx+sx*22,g-96),(cx+sx*30,g-26)],pants,26)
        k.blob(ellipse(cx+sx*34+6,g-12,26,15),P["timberDeep"],6)
    # torso with stripes
    tor=k.pebble(cx,g-198,g-80,92,122)
    k.blob(tor,shirt2,8)
    if not mono:
        for i in range(3):
            y=g-180+i*34
            ids=[v.path(tor,fill="#000"),v.path(f"M{cx-80} {y} H{cx+80} V{y+16} H{cx-80} Z",fill=shirt1)]
            r=v.c.call("pathfinder",{"ids":ids,"operation":"intersect"}); v.c.call("set_paint",{"ids":r["ids"],"fill":shirt1,"stroke":"none"})
        v.path(tor,stroke=L_,sw=8)
    k.blob(rrect(cx-64,g-100,128,18,8),"#5A3A1E",6)
    k.blob(rrect(cx-12,g-104,24,26,5),P["gold"],5)
    # satchel strap + map satchel
    k.line(f"M{cx-40} {g-196} L{cx+52} {g-96}",P["timber"],10)
    k.blob(rrect(cx+38,g-118,44,40,10),P["honey"],6); k.line(f"M{cx+38} {g-104} h44",L_,3)
    # bandana tails (behind head)
    k.blob(f"M{cx-R*0.7} {hy-R*0.45} q-50 0 -64 34 q26 2 52 -18 Z M{cx-R*0.7} {hy-R*0.45} q-44 -24 -70 -14 q20 22 60 22 Z",P["crimson"],5)
    # head
    k.blob(ellipse(cx,hy,R,R*0.95),SKIN["a"],8)
    # hair tufts
    k.blob(f"M{cx-R*0.95} {hy-R*0.1} q{-18} 30 6 50 q4 -26 20 -30 Z",P["crimson"] if False else "#B5532A",5)
    k.face(cx,hy+6,R,expr)
    # bandana + tricorn
    band=f"M{cx-R*1.0} {hy-R*0.12} Q{cx} {hy-R*0.42} {cx+R*1.0} {hy-R*0.12} Q{cx+R*0.9} {hy-R*0.9} {cx} {hy-R*0.98} Q{cx-R*0.9} {hy-R*0.9} {cx-R*1.0} {hy-R*0.12} Z"
    k.blob(band,P["crimson"],7)
    if not mono:
        for x,y in ((cx-30,hy-50),(cx+20,hy-64),(cx+44,hy-36),(cx-56,hy-26)): v.path(ellipse(x,y,5),fill=P["cream"])
    hat=(f"M{cx-R*1.45} {hy-R*0.72} Q{cx-R*0.8} {hy-R*0.55} {cx} {hy-R*0.6} Q{cx+R*0.8} {hy-R*0.55} {cx+R*1.45} {hy-R*0.72} "
         f"Q{cx+R*1.2} {hy-R*1.0} {cx+R*0.8} {hy-R*1.05} Q{cx+R*0.6} {hy-R*1.75} {cx} {hy-R*1.7} Q{cx-R*0.6} {hy-R*1.75} {cx-R*0.8} {hy-R*1.05} Q{cx-R*1.2} {hy-R*1.0} {cx-R*1.45} {hy-R*0.72} Z")
    k.blob(f"M{cx+R*0.5} {hy-R*1.25} Q{cx+R*1.4} {hy-R*2.2} {cx+R*1.9} {hy-R*1.7} Q{cx+R*1.5} {hy-R*1.55} {cx+R*1.2} {hy-R*1.2} Q{cx+R*0.9} {hy-R*1.05} {cx+R*0.5} {hy-R*1.25} Z",P["hibiscus"],6)
    k.line(f"M{cx+R*0.6} {hy-R*1.25} Q{cx+R*1.2} {hy-R*1.6} {cx+R*1.7} {hy-R*1.72}","#B23A5C",4)
    k.blob(hat,P["ink"],8)
    k.line(f"M{cx-R*0.82} {hy-R*0.9} Q{cx} {hy-R*0.82} {cx+R*0.82} {hy-R*0.9}",P["gold"],9)
    if not mono: grinning_sun(v,cx,hy-R*1.25,R*0.17,mono=P["gold"],line=P["ink"])
    # front arm / props
    if pose=="cheer":
        k.limb([(cx+48,g-176),(cx+92,g-236),(cx+100,g-300)],shirt1,22); k.blob(ellipse(cx+100,g-306,14),SKIN["a"],5); k.blob(ellipse(cx-96,g-306,14),SKIN["a"],5)
        k.blob(sparkle(cx+140,g-330,22),P["gold"],4); k.blob(sparkle(cx-140,g-300,14),P["gold"],4)
    elif pose=="dig":
        k.line(f"M{cx+10} {g-150} L{cx+110} {g-10}",P["timber"],12) if not mono else v.path(f"M{cx+10} {g-150} L{cx+110} {g-10}",stroke=mono,sw=12)
        k.blob(f"M{cx+96} {g-20} l30 -14 l24 36 q-24 18 -46 0 Z",P["sea"] if not mono else mono,5)
        k.limb([(cx+48,g-176),(cx+50,g-130),(cx+40,g-120)],shirt1,22); k.blob(ellipse(cx+40,g-118,13),SKIN["a"],5); k.blob(ellipse(cx+20,g-118,13),SKIN["a"],5)
    else:
        k.limb([(cx+48,g-176),(cx+76,g-140),(cx+72,g-100)],shirt1,22); k.blob(ellipse(cx+72,g-94,13),SKIN["a"],5); k.blob(ellipse(cx-66,g-90,13),SKIN["a"],5)

def pip(v,cx,g,expr="smug",mono=None,R=74):
    k=Kit(v,mono); hy=g-232
    for sx in (-1,1): k.limb([(cx+sx*26,g-80),(cx+sx*30,g-24)],"#4A3B66",22); k.blob(ellipse(cx+sx*34+5,g-12,24,13),P["ink"],6)
    k.limb([(cx-62,g-150),(cx-82,g-110),(cx-70,g-84)],"#7A5BA6",20)
    body=k.pebble(cx,g-176,g-62,110,170); k.blob(body,"#7A5BA6",8)
    k.blob(f"M{cx-34} {g-172} L{cx+34} {g-172} L{cx+44} {g-70} Q{cx} {g-58} {cx-44} {g-70} Z","#F4D06F",6)   # canon waistcoat yellow
    for y in (g-150,g-124,g-98): k.blob(ellipse(cx,y,5),P["goldDeep"],3)
    k.line(f"M{cx+8} {g-128} Q{cx+40} {g-112} {cx+36} {g-90}",P["gold"],4)  # watch chain
    k.blob(ellipse(cx,hy,R,R*0.9),SKIN["d"],8)
    # mutton-chop whiskers + bald dome w/ side hair
    for sx in (-1,1): k.blob(f"M{cx+sx*R*0.98} {hy-R*0.2} q{sx*14} 40 {-sx*8} 70 q{-sx*14} -30 {-sx*10} -64 Z","#E9E2D0",5)
    k.face(cx,hy+4,R,expr,monocle=True)
    k.blob(f"M{cx-R*0.55} {hy+R*0.4} Q{cx} {hy+R*0.3} {cx+R*0.55} {hy+R*0.4} Q{cx+R*0.3} {hy+R*0.55} {cx} {hy+R*0.45} Q{cx-R*0.3} {hy+R*0.55} {cx-R*0.55} {hy+R*0.4} Z","#E9E2D0",4)
    # small bowler hat
    k.blob(f"M{cx-R*0.9} {hy-R*0.66} Q{cx} {hy-R*0.5} {cx+R*0.9} {hy-R*0.66} Q{cx+R*0.6} {hy-R*0.72} {cx+R*0.55} {hy-R*0.8} Q{cx+R*0.5} {hy-R*1.45} {cx} {hy-R*1.42} Q{cx-R*0.5} {hy-R*1.45} {cx-R*0.55} {hy-R*0.8} Q{cx-R*0.6} {hy-R*0.72} {cx-R*0.9} {hy-R*0.66} Z","#3B2350",7)
    k.line(f"M{cx-R*0.56} {hy-R*0.84} Q{cx} {hy-R*0.76} {cx+R*0.56} {hy-R*0.84}",P["hibiscus"],8)
    # front arm holding loupe + coin
    k.limb([(cx+62,g-150),(cx+96,g-176),(cx+104,g-212)],"#7A5BA6",20); k.blob(ellipse(cx+106,g-218,13),SKIN["d"],5)
    k.blob(ellipse(cx+120,g-252,22),P["gold"],6); 
    if not mono: grinning_sun(v,cx+120,g-252,9,mono=P["goldDeep"],line=P["gold"])
    k.blob(ellipse(cx-70,g-82,12),SKIN["d"],5)

def marlo(v,cx,g,expr="happy",mono=None,R=76):
    k=Kit(v,mono); hy=g-330
    for sx in (-1,1): k.limb([(cx+sx*34,g-120),(cx+sx*40,g-26)],"#3E5C7A",32); k.blob(ellipse(cx+sx*44+6,g-12,30,15),P["timberDeep"],6)
    k.limb([(cx-90,g-250),(cx-120,g-180),(cx-110,g-130)],"#9EC5E8",30); k.blob(ellipse(cx-110,g-122,18),SKIN["c"],5)
    body=k.pebble(cx,g-282,g-100,190,170); k.blob(body,"#9EC5E8",9)   # canon color
    k.blob(f"M{cx-60} {g-250} H{cx+60} L{cx+70} {g-104} Q{cx} {g-92} {cx-70} {g-104} Z",P["honey"],7)  # apron
    k.blob(rrect(cx-34,g-200,68,40,8),P["timber"],5); k.line(f"M{cx-60} {g-250} L{cx-84} {g-280} M{cx+60} {g-250} L{cx+84} {g-280}",P["timber"],8)
    k.blob(ellipse(cx,hy,R,R*0.92),SKIN["c"],8)
    k.face(cx,hy-6,R,expr,skin=SKIN["c"])
    beard=f"M{cx-R*0.9} {hy-R*0.05} Q{cx-R*0.95} {hy+R*0.9} {cx-R*0.3} {hy+R*1.3} Q{cx} {hy+R*1.5} {cx+R*0.3} {hy+R*1.3} Q{cx+R*0.95} {hy+R*0.9} {cx+R*0.9} {hy-R*0.05} Q{cx+R*0.6} {hy+R*0.45} {cx+R*0.25} {hy+R*0.28} Q{cx} {hy+R*0.42} {cx-R*0.25} {hy+R*0.28} Q{cx-R*0.6} {hy+R*0.45} {cx-R*0.9} {hy-R*0.05} Z"
    k.blob(beard,"#C4652F",7)
    k.blob(f"M{cx-R*0.3} {hy+R*0.36} Q{cx} {hy+R*0.5} {cx+R*0.3} {hy+R*0.36} Q{cx} {hy+R*0.66} {cx-R*0.3} {hy+R*0.36} Z",P["swell"],4)
    # headscarf + pencil
    k.blob(f"M{cx-R} {hy-R*0.25} Q{cx} {hy-R*0.55} {cx+R} {hy-R*0.25} Q{cx+R*0.9} {hy-R*1.0} {cx} {hy-R*1.02} Q{cx-R*0.9} {hy-R*1.0} {cx-R} {hy-R*0.25} Z",P["lagoon"],7)
    k.line(f"M{cx+R*0.75} {hy-R*0.5} L{cx+R*1.25} {hy-R*0.9}",P["gold"],9)
    # mallet arm
    k.limb([(cx+90,g-250),(cx+124,g-200),(cx+130,g-160)],"#9EC5E8",30); k.blob(ellipse(cx+130,g-150,18),SKIN["c"],5)
    k.line(f"M{cx+130} {g-150} L{cx+130} {g-60}",P["timber"],12) if not mono else v.path(f"M{cx+130} {g-150} L{cx+130} {g-60}",stroke=mono,sw=12)
    k.blob(rrect(cx+96,g-74,68,38,10),P["timber"],6)

def odessa(v,cx,g,expr="smug",mono=None,R=66):
    k=Kit(v,mono); hy=g-356
    k.blob(f"M{cx-60} {g-250} Q{cx-100} {g-120} {cx-90} {g-14} H{cx+90} Q{cx+100} {g-120} {cx+60} {g-250} Z",P["dusk"],8)  # long skirt
    k.blob(f"M{cx-90} {g-14} Q{cx} {g-40} {cx+90} {g-14} Q{cx} {g+2} {cx-90} {g-14} Z",P["plum"],5)
    body=k.pebble(cx,g-300,g-200,96,110); k.blob(body,"#E8D2A8",8)
    k.blob(f"M{cx-80} {g-296} Q{cx} {g-250} {cx+80} {g-296} L{cx+96} {g-210} Q{cx} {g-170} {cx-96} {g-210} Z",P["hibiscus"],7)   # shawl
    if not mono:
        for i in range(7): v.path(f"M{cx-90+i*30} {g-205+abs(3-i)*-6} l-4 22",stroke=P["gold"],sw=4)
    k.limb([(cx-60,g-280),(cx-80,g-220),(cx-60,g-190)],"#E8D2A8",18); k.blob(ellipse(cx-56,g-186,12),SKIN["b"],5)
    k.blob(ellipse(cx,hy,R*0.85,R),SKIN["b"],8)
    # big hair wrap
    k.blob(f"M{cx-R*0.95} {hy-R*0.1} Q{cx-R*1.3} {hy-R*1.6} {cx} {hy-R*1.75} Q{cx+R*1.3} {hy-R*1.6} {cx+R*0.95} {hy-R*0.1} Q{cx+R*0.5} {hy-R*0.7} {cx} {hy-R*0.72} Q{cx-R*0.5} {hy-R*0.7} {cx-R*0.95} {hy-R*0.1} Z",P["jungle"],7)
    k.line(f"M{cx-R*0.8} {hy-R*0.9} Q{cx} {hy-R*1.3} {cx+R*0.8} {hy-R*0.9}",P["gold"],6)
    k.face(cx,hy+8,R*0.95,expr)
    for sx in (-1,1): k.blob(ellipse(cx+sx*R*0.88,hy+R*0.45,9,16),P["gold"],4)
    # raised hand with glowing curio orb
    k.limb([(cx+60,g-280),(cx+100,g-300),(cx+108,g-350)],"#E8D2A8",18); k.blob(ellipse(cx+110,g-356,12),SKIN["b"],5)
    if not mono: v.path(ellipse(cx+118,g-392,26),fill=grad([(0,"#FFFFFF"),(0.4,P["aqua"]),(1,P["lagoon"])],kind="radial"),stroke=L_,sw=6,fx=[{"effect":"stylize.outerGlow","params":{"color":P["aqua"],"blur":20,"opacity":90}}])
    else: v.path(ellipse(cx+118,g-392,26),fill=mono)

def biscuit(v,cx,g,expr="mischief",mono=None):
    k=Kit(v,mono)
    k.blob(f"M{cx-80} {g-110} H{cx+80} Q{cx+76} {g-20} {cx} {g-14} Q{cx-76} {g-20} {cx-80} {g-110} Z",P["cream"],8)  # teacup
    k.blob(f"M{cx+76} {g-96} q46 -4 40 34 q-6 26 -46 18",None or P["cream"],8) if False else (v.path(f"M{cx+76} {g-96} q46 -4 40 34 q-6 26 -46 18",stroke=L_ if not mono else mono,sw=22) , v.path(f"M{cx+76} {g-96} q46 -4 40 34 q-6 26 -46 18",stroke=k.c(P["cream"]),sw=10))
    if not mono:
        v.path(f"M{cx-70} {g-80} Q{cx} {g-66} {cx+70} {g-80}",stroke=P["hibiscus"],sw=8); 
        for x in (-40,0,40): v.path(ellipse(cx+x,g-56,7),fill=P["hibiscus"])
    k.blob(ellipse(cx,g-10,96,12),P["cream"],7)
    # crab poking out
    for sx in (-1,1):
        k.limb([(cx+sx*30,g-120),(cx+sx*44,g-168)],P["coral"],8)
        k.blob(ellipse(cx+sx*44,g-176,14),"#FFFFFF",5)
        if not mono: v.path(ellipse(cx+sx*44+(4 if expr=="mischief" else 0),g-174,7),fill=L_)
    k.blob(f"M{cx-56} {g-110} Q{cx} {g-170} {cx+56} {g-110} Z",P["coral"],7)
    k.limb([(cx-60,g-120),(cx-112,g-150)],P["coral"],14); k.blob(f"M{cx-112} {g-150} m-26 -10 q12 -30 40 -12 l-14 10 l16 6 q-20 22 -42 -4 Z",P["coral"],5)
    k.limb([(cx+60,g-120),(cx+100,g-176)],P["coral"],14); k.blob(f"M{cx+100} {g-176} m-14 -18 q20 -26 42 -2 l-16 6 l12 12 q-28 18 -38 -16 Z",P["coral"],5)
    if not mono: v.path(f"M{cx-16} {g-128} Q{cx} {g-118} {cx+16} {g-130}",stroke=L_,sw=4)
