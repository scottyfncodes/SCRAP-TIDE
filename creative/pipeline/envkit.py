from shipkit import *
W,H=1920,1080
def cloud(v,x,y,s=1.0,col="#FFFFFF",shade=None,op=None):
    d=" ".join(ellipse(x+dx*s,y+dy*s,r*s) for dx,dy,r in ((0,0,60),(60,-22,70),(130,0,56),(70,22,60),(-50,14,40),(180,16,40)))
    v.path(d,fill=col,op=op,name="cloud")
    if shade: v.path(f"M{x-90*s} {y+30*s} Q{x+70*s} {y+70*s} {x+222*s} {y+30*s} Q{x+70*s} {y+90*s} {x-90*s} {y+30*s} Z",fill=shade,op=0.35)
def frond(v,x,y,ang,ln,col,droop=0.35,w=0.22):
    a=math.radians(ang); tx=x+math.cos(a)*ln; ty=y+math.sin(a)*ln+ln*droop
    nx,ny=-math.sin(a),math.cos(a)
    mx=(x+tx)/2; my=(y+ty)/2-ln*droop*0.5
    d=(f"M{f(x)} {f(y)} Q{f(mx-nx*ln*w)} {f(my-ny*ln*w)} {f(tx)} {f(ty)} Q{f(mx+nx*ln*w*0.6)} {f(my+ny*ln*w*0.6)} {f(x)} {f(y)} Z")
    v.path(d,fill=col,stroke=LINE,sw=5,name="frond")
    v.path(f"M{f(x)} {f(y)} Q{f(mx)} {f(my)} {f(tx)} {f(ty)}",stroke=LINE,sw=2.5,op=0.5)
def palm(v,x,y,h,lean=40,s=1.0,col=P["palm"],col2=P["jungle"]):
    tx=x+lean; ty=y-h
    d=f"M{f(x-14*s)} {f(y)} Q{f(x+lean*0.2)} {f(y-h*0.5)} {f(tx-7*s)} {f(ty)} L{f(tx+7*s)} {f(ty)} Q{f(x+lean*0.2+22*s)} {f(y-h*0.5)} {f(x+14*s)} {f(y)} Z"
    v.path(d,fill=P["honey"],stroke=LINE,sw=6,name="trunk")
    v.path(" ".join(f"M{f(x+lean*t*t-10*s+ (lean*0.0))} {f(y-h*t)} q{f(10*s)} {f(6*s)} {f(20*s)} 0" for t in (0.15,0.3,0.45,0.6,0.75,0.88)),stroke=P["timber"],sw=4)
    for ang,ln,c in ((200,150,col2),(-20,150,col2),(230,130,col),(-50,130,col),(170,160,col),(10,165,col),(260,110,col),(-80,105,col2)):
        frond(v,tx,ty,ang,ln*s,c)
    for dx in (-10,8): v.path(ellipse(tx+dx*s,ty+12*s,12*s),fill=P["timber"],stroke=LINE,sw=4)
def rock(v,x,y,w,h,col="#8C7AA8",hi="#B7A8CF"):
    d=f"M{f(x-w/2)} {f(y)} Q{f(x-w/2)} {f(y-h*0.7)} {f(x-w*0.15)} {f(y-h)} Q{f(x+w*0.3)} {f(y-h*1.05)} {f(x+w/2)} {f(y-h*0.4)} Q{f(x+w*0.55)} {f(y)} {f(x+w*0.4)} {f(y)} Z"
    v.path(d,fill=col,stroke=LINE,sw=6,name="rock")
    v.path(f"M{f(x-w*0.3)} {f(y-h*0.6)} Q{f(x-w*0.15)} {f(y-h*0.9)} {f(x+w*0.1)} {f(y-h*0.92)}",stroke=hi,sw=8)
def sea(v,hy,top=P["sea"],bot=P["lagoon"]):
    v.path(f"M0 {hy} H{W} V{H} H0 Z",fill=grad([(0,top),(1,bot)],angle=-90),name="sea")
    for i in range(14):
        y=hy+18+i*i*2.6; x=(i*373)%W
        v.path(f"M{x} {y} q{30+i*4} {-6-i*0.5} {60+i*8} 0",stroke=P["foam"],sw=2+i*0.35,op=0.6)
def sky(v,c1,c2,c3=None):
    st=[(0,c1),(1,c2)] if not c3 else [(0,c1),(0.6,c2),(1,c3)]
    v.path(f"M0 0 H{W} V{H} H0 Z",fill=grad(st,angle=-90),name="sky")
def sun_glow(v,x,y,r,col="#FFF3C0"):
    v.path(ellipse(x,y,r*2.6),fill=grad([(0,col,0.55),(1,col,0)],kind="radial"),name="sunhalo")
    v.path(ellipse(x,y,r),fill="#FFF8DD",name="sun",fx=[{"effect":"stylize.outerGlow","params":{"color":"#FFE7A0","blur":40,"opacity":90}}])
def house(v,x,y,w,h,wall,roof):
    v.path(f"M{x} {y} V{y-h} H{x+w} V{y} Z",fill=wall,stroke=LINE,sw=5)
    v.path(f"M{x-12} {y-h+2} L{x+w/2} {y-h-w*0.55} L{x+w+12} {y-h+2} Z",fill=roof,stroke=LINE,sw=5)
    v.path(rrect(x+w*0.3,y-h*0.7,w*0.4,h*0.32,6),fill=P["amber"],stroke=LINE,sw=3)
def bunting(v,x0,y0,x1,y1,sag=60,n=12,cols=(P["crimson"],P["cream"],P["gold"],P["lagoon"])):
    v.path(f"M{x0} {y0} Q{(x0+x1)/2} {(y0+y1)/2+sag*2} {x1} {y1}",stroke=LINE,sw=3)
    for i in range(n):
        t=(i+0.5)/n; x=x0+(x1-x0)*t; y=(1-t)**2*y0+2*(1-t)*t*((y0+y1)/2+sag*2)+t*t*y1
        v.path(f"M{x-14} {y} L{x+14} {y} L{x} {y+32} Z",fill=cols[i%len(cols)],stroke=LINE,sw=3)
def chest(v,x,y,s=1.0,glow=True):
    if glow: v.path(ellipse(x,y-70*s,260*s,200*s),fill=grad([(0,"#FFE7A0",0.75),(1,"#FFE7A0",0)],kind="radial"),name="chest_glow")
    v.path(f"M{x-110*s} {y-90*s} L{x-120*s} {y-190*s} Q{x} {y-250*s} {x+120*s} {y-190*s} L{x+110*s} {y-90*s} Z",fill=P["timber"],stroke=LINE,sw=7,name="lid")
    v.path(f"M{x-100*s} {y-100*s} Q{x} {y-150*s} {x+100*s} {y-100*s} L{x+90*s} {y-80*s} H{x-90*s} Z",fill=P["gold"],name="gold_pile")
    for i in range(9): v.path(ellipse(x-80*s+i*20*s,y-104*s-abs(4-i)*-4*s+ (i%2)*6*s,14*s,10*s),fill=P["gold"],stroke=P["goldDeep"],sw=3)
    v.path(rrect(x-120*s,y-100*s,240*s,100*s,12*s),fill=P["timber"],stroke=LINE,sw=7,name="chest")
    v.path(f"M{x-120*s} {y-60*s} H{x+120*s} M{x-70*s} {y-100*s} V{y} M{x+70*s} {y-100*s} V{y}",stroke=P["gold"],sw=10*s)
    v.path(rrect(x-16*s,y-74*s,32*s,34*s,6*s),fill=P["gold"],stroke=LINE,sw=4)
    for (dx,dy,r) in ((-150,-200,26),(160,-230,34),(40,-300,20),(-60,-280,16)): v.path(sparkle(x+dx*s,y+dy*s,r*s),fill="#FFFBE0",fx=[{"effect":"stylize.outerGlow","params":{"color":"#FFE27A","blur":12,"opacity":90}}])
def leaf(v,x,y,ang,ln,col,col2=None):
    a=math.radians(ang); tx=x+math.cos(a)*ln; ty=y+math.sin(a)*ln; nx,ny=-math.sin(a),math.cos(a); w=ln*0.42
    d=(f"M{f(x)} {f(y)} C{f(x+math.cos(a)*ln*0.3+nx*w)} {f(y+math.sin(a)*ln*0.3+ny*w)} {f(tx+nx*w*0.6)} {f(ty+ny*w*0.6)} {f(tx)} {f(ty)} "
       f"C{f(tx-nx*w*0.6)} {f(ty-ny*w*0.6)} {f(x+math.cos(a)*ln*0.3-nx*w)} {f(y+math.sin(a)*ln*0.3-ny*w)} {f(x)} {f(y)} Z")
    v.path(d,fill=col,stroke=LINE,sw=6,name="leaf")
    v.path(f"M{f(x)} {f(y)} L{f(tx)} {f(ty)}",stroke=col2 or P["leaf"],sw=4)
    for t in (0.3,0.5,0.7):
        px=x+math.cos(a)*ln*t; py=y+math.sin(a)*ln*t
        v.path(f"M{f(px)} {f(py)} l{f(nx*w*0.5+math.cos(a)*20)} {f(ny*w*0.5+math.sin(a)*20)} M{f(px)} {f(py)} l{f(-nx*w*0.5+math.cos(a)*20)} {f(-ny*w*0.5+math.sin(a)*20)}",stroke=col2 or P["leaf"],sw=3,op=0.7)
def flower(v,x,y,r=22,col=P["hibiscus"]):
    for i in range(5):
        a=math.radians(i*72-90); v.path(ellipse(x+math.cos(a)*r*0.6,y+math.sin(a)*r*0.6,r*0.55),fill=col,stroke=LINE,sw=3)
    v.path(ellipse(x,y,r*0.25),fill=P["gold"])
def gull(v,x,y,s=1.0):
    v.path(f"M{x-30*s} {y} Q{x-15*s} {y-16*s} {x} {y} Q{x+15*s} {y-16*s} {x+30*s} {y}",stroke=LINE,sw=4*s)
