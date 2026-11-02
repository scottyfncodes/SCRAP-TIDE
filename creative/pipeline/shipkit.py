from sun import *
L_=LINE
class Ship:
    def __init__(s,v): s.v=v
    def clip(s,clip_d,d,fill,name="clipped",op=None):
        v=s.v; c=v.path(clip_d,fill="#000000"); w=v.path(d,fill=fill,name=name)
        try: r=v.c.call("pathfinder",{"ids":[c,w],"operation":"intersect"})
        except RuntimeError as e:
            if "empty result" not in str(e): raise
            v.c.call("undo",{}) if False else None
            v.cmd("edit.clear",ids=[c,w]) if False else None
            for i in (c,w): v.cmd("object.setProps",ids=[i],visible=False)
            return []
        ids=r.get("ids",[]) if isinstance(r,dict) else []
        if ids:
            v.c.call("set_paint",{"ids":ids,"fill":fill,"stroke":"none"})
            if op is not None: v.cmd("object.setProps",ids=ids,opacity=op*100)
        return ids
    def hull_d(s,cx,wl,L,H,sh,K,rake,stern="round"):
        x0=cx-L/2; x1=cx+L/2
        st=(x0, wl-H-sh*0.7)
        return (f"M{f(st[0])} {f(st[1])} C{f(x0+L*0.3)} {f(wl-H+sh*0.15)} {f(x1-L*0.3)} {f(wl-H+sh*0.15)} {f(x1+rake)} {f(wl-H-sh)} "
                f"C{f(x1+rake*0.2)} {f(wl-H*0.45)} {f(x1-L*0.04)} {f(wl+K*0.7)} {f(x1-L*0.24)} {f(wl+K)} "
                f"L{f(x0+L*0.16)} {f(wl+K)} C{f(x0+L*0.03)} {f(wl+K)} {f(x0-L*0.035)} {f(wl-H*0.2)} {f(st[0])} {f(st[1])} Z")
    def deckline(s,cx,wl,L,H,sh,rake,dy=0,t0=0.0,t1=1.0):
        x0=cx-L/2; x1=cx+L/2
        return f"M{f(x0+2)} {f(wl-H-sh*0.7+dy)} C{f(x0+L*0.3)} {f(wl-H+sh*0.15+dy)} {f(x1-L*0.3)} {f(wl-H+sh*0.15+dy)} {f(x1+rake-3)} {f(wl-H-sh+dy)}"
    def hull(s,cx,wl,L,H,sh=30,K=40,rake=30,base="#4fb39a",trim="#f2ead8",shadow=None,copper=False,planks=3,ports=0,gold=False,patches=False,lw=7):
        v=s.v; hd=s.hull_d(cx,wl,L,H,sh,K,rake)
        v.path(hd,fill=base,stroke=L_,sw=lw*2,name="hull_outline")
        v.path(hd,fill=base,name="hull")
        # cool lower shadow
        s.clip(hd,f"M{cx-L} {wl-H*0.35} C{cx-L*0.3} {wl-H*0.25} {cx+L*0.3} {wl-H*0.25} {cx+L} {wl-H*0.4} V{wl+K+60} H{cx-L} Z",shadow or P["plum"],"hull_shadow",op=0.32)
        if copper: s.clip(hd,f"M{cx-L} {wl-8} C{cx} {wl+4} {cx} {wl+4} {cx+L} {wl-12} V{wl+K+60} H{cx-L} Z",grad([P["amber"],"#B5651D"],angle=-90),"copper")
        for i in range(planks):
            v.path(s.deckline(cx,wl,L*0.97,H,sh,rake,dy=H*(0.28+0.22*i)),stroke=L_,sw=lw*0.35,op=0.35,name="plank")
        # trim / rail stripe
        v.path(s.deckline(cx,wl,L,H,sh,rake,dy=H*0.14),stroke=trim,sw=H*0.13,name="trim",cap="butt")
        if gold: v.path(s.deckline(cx,wl,L,H,sh,rake,dy=H*0.14),stroke=P["gold"],sw=H*0.04,name="gold_line",cap="butt")
        for i in range(ports):
            px=cx-L*0.32+i*(L*0.64/max(1,ports-1)); py=wl-H*0.52
            v.path(rrect(px-L*0.022,py-L*0.02,L*0.044,L*0.04,6),fill=P["swell"],stroke=P["gold"] if gold else L_,sw=lw*0.6,name="port")
            v.path(ellipse(px,py,L*0.009),fill=P["amber"],name="port_glow",fx=[{"effect":"stylize.outerGlow","params":{"color":"#FFB54A","blur":8,"opacity":80}}])
        if patches:
            for (px,py,w,h) in ((cx-L*0.2,wl-H*0.55,L*0.12,H*0.3),(cx+L*0.12,wl-H*0.35,L*0.09,H*0.25)):
                v.path(rrect(px,py,w,h,4),fill=P["honey"],stroke=L_,sw=lw*0.5,name="patch")
                v.path(" ".join(f"M{f(px+4)} {f(py+4+j*h/3)} h3 M{f(px+w-7)} {f(py+4+j*h/3)} h3" for j in range(3)),stroke=L_,sw=3,name="nails")
        v.path(s.deckline(cx,wl,L,H,sh,rake),stroke=L_,sw=lw,name="rail_line")
        return hd
    def mast(s,x,base,top,w=14,color=P["timber"]):
        v=s.v; d=f"M{f(x-w/2)} {f(base)} L{f(x-w*0.35)} {f(top)} L{f(x+w*0.35)} {f(top)} L{f(x+w/2)} {f(base)} Z"
        v.path(d,fill=color,stroke=L_,sw=5,name="mast")
        v.path(f"M{f(x+w*0.12)} {f(base-6)} L{f(x+w*0.08)} {f(top+6)}",stroke=P["honey"],sw=3,op=0.8,name="mast_hi")
    def yard(s,x,y,w,t=10):
        s.v.path(rrect(x-w/2,y-t/2,w,t,t/2),fill=P["timber"],stroke=L_,sw=4,name="yard")
    def square_sail(s,x,top,w,h,belly=26,cloth=P["cream"],pattern=None,emblem=False):
        v=s.v
        d=(f"M{f(x-w/2)} {f(top)} L{f(x+w/2)} {f(top)} Q{f(x+w/2+belly)} {f(top+h*0.5)} {f(x+w/2-w*0.04)} {f(top+h)} "
           f"Q{f(x+belly*0.4)} {f(top+h+belly*0.7)} {f(x-w/2+w*0.04)} {f(top+h)} Q{f(x-w/2+belly*0.35)} {f(top+h*0.5)} {f(x-w/2)} {f(top)} Z")
        v.path(d,fill=cloth,stroke=L_,sw=10,name="sail_o"); v.path(d,fill=cloth,name="sail")
        s.clip(d," ".join(f"M{f(x-w/2+w*i/6)} {f(top-5)} h2.5 V{f(top+h+60)} h-2.5 Z" for i in range(1,6)),P["parch"],"seams")
        s.pattern(d,x-w/2,top,w,h,pattern)
        s.clip(d,f"M{f(x+w*0.12)} {f(top)} Q{f(x+w/2+belly)} {f(top+h*0.5)} {f(x+w*0.2)} {f(top+h+40)} H{f(x+w)} V{f(top)} Z",P["plum"],"sail_shade",op=0.16)
        v.path(f"M{f(x-w*0.3)} {f(top+h*0.12)} Q{f(x-w*0.22)} {f(top+h*0.5)} {f(x-w*0.3)} {f(top+h*0.88)}",stroke="#FFFFFF",sw=5,op=0.5,name="sail_hi")
        if emblem: grinning_sun(v,x+belly*0.25,top+h*0.5,min(w,h)*0.17)
        v.path(d,stroke=L_,sw=5,name="sail_line")
        return d
    def gaff_sail(s,mx,boomY,topY,boomL,gaffL,gaffRise=40,cloth=P["cream"],pattern=None,belly=22):
        v=s.v
        A=(mx-4,boomY-6); B=(mx-boomL,boomY); C=(mx-gaffL,topY-gaffRise); D=(mx-4,topY)
        d=(f"M{f(D[0])} {f(D[1])} L{f(A[0])} {f(A[1])} Q{f((A[0]+B[0])/2)} {f(boomY+belly*0.6)} {f(B[0])} {f(B[1])} "
           f"Q{f((B[0]+C[0])/2-belly)} {f((B[1]+C[1])/2)} {f(C[0])} {f(C[1])} Q{f((C[0]+D[0])/2)} {f((C[1]+D[1])/2-6)} {f(D[0])} {f(D[1])} Z")
        v.path(d,fill=cloth,stroke=L_,sw=10,name="gaff_o"); v.path(d,fill=cloth,name="gaff")
        s.clip(d," ".join(f"M{f(mx-boomL)} {f(boomY-(boomY-topY)*i/6)} L{f(mx)} {f(boomY-(boomY-topY)*i/6-8)} v3 L{f(mx-boomL)} {f(boomY-(boomY-topY)*i/6+3)} Z" for i in range(1,6)),P["parch"],"seams")
        s.pattern(d,B[0],C[1],boomL,boomY-C[1],pattern)
        s.clip(d,f"M{f(mx-boomL*0.45)} {f(topY-200)} H{f(mx)} V{f(boomY+50)} H{f(mx-boomL*0.3)} Z",P["plum"],"gaff_shade",op=0.14)
        v.path(d,stroke=L_,sw=5)
        v.path(f"M{f(mx)} {f(boomY)} L{f(B[0]-14)} {f(boomY+4)}",stroke=P["timber"],sw=11,name="boom")
        v.path(f"M{f(mx)} {f(topY)} L{f(C[0]-8)} {f(C[1]-4)}",stroke=P["timber"],sw=9,name="gaff_spar")
        return d
    def jib(s,mx,headY,tackX,tackY,cloth=P["cream"],belly=26,pattern=None):
        v=s.v
        d=(f"M{f(mx+8)} {f(headY)} Q{f((mx+tackX)/2+belly)} {f((headY+tackY)/2-belly)} {f(tackX)} {f(tackY)} "
           f"Q{f((mx+tackX)/2+10)} {f(tackY+10)} {f(mx+22)} {f(tackY-16)} Z")
        v.path(d,fill=cloth,stroke=L_,sw=10); v.path(d,fill=cloth,name="jib")
        s.pattern(d,mx,headY,tackX-mx,tackY-headY,pattern)
        v.path(d,stroke=L_,sw=5)
    def pattern(s,d,x,y,w,h,pattern):
        if not pattern: return
        kind,c2=pattern
        if kind=="stripe": s.clip(d,f"M{f(x-50)} {f(y+h*0.42)} H{f(x+w+80)} V{f(y+h*0.62)} H{f(x-50)} Z",c2,"stripe")
        elif kind=="bands":
            for i,c in enumerate(c2): s.clip(d,f"M{f(x-50)} {f(y+h*(0.18+i*0.27))} H{f(x+w+80)} V{f(y+h*(0.32+i*0.27))} H{f(x-50)} Z",c,"band")
        elif kind=="shells":
            for i in range(5):
                for j in range(3):
                    sx=x+w*(0.12+i*0.2)+(j%2)*w*0.1; sy=y+h*(0.22+j*0.28)
                    s.clip(d,f"M{f(sx)} {f(sy+14)} L{f(sx-20)} {f(sy-4)} Q{f(sx-16)} {f(sy-22)} {f(sx)} {f(sy-24)} Q{f(sx+16)} {f(sy-22)} {f(sx+20)} {f(sy-4)} Z M{f(sx-6)} {f(sy+16)} h12 v6 h-12 Z",c2,"shell")
        elif kind=="sun": pass
    def rig(s,lines,op=0.75):
        s.v.path(" ".join(f"M{f(a)} {f(b)} L{f(c)} {f(d)}" for a,b,c,d in lines),stroke=L_,sw=3,op=op,name="rigging")
    def flag(s,x,y,w=90,h=54,c1=P["tide"],c2=P["cream"],kind="tidebreaker"):
        v=s.v
        d=f"M{f(x)} {f(y)} Q{f(x+w*0.5)} {f(y-10)} {f(x+w)} {f(y+4)} L{f(x+w*0.82)} {f(y+h*0.5)} L{f(x+w)} {f(y+h)} Q{f(x+w*0.5)} {f(y+h-12)} {f(x)} {f(y+h)} Z"
        if kind=="pennant": d=f"M{f(x)} {f(y)} Q{f(x+w*0.6)} {f(y+h*0.1)} {f(x+w*1.3)} {f(y+h*0.32)} Q{f(x+w*0.6)} {f(y+h*0.5)} {f(x)} {f(y+h*0.62)} Z"
        v.path(d,fill=c1,stroke=L_,sw=5,name="flag")
        if kind=="tidebreaker": grinning_sun(v,x+w*0.4,y+h*0.48,h*0.2,line=c1,mono=c2)
        elif kind=="pennant": s.clip(d,f"M{f(x)} {f(y+h*0.22)} H{f(x+w*1.4)} V{f(y+h*0.4)} H{f(x)} Z",c2,"pstripe")
        elif kind=="wren":
            bx,by,u=x+w*0.42,y+h*0.52,h*0.011
            bird=(f"M{f(bx-30*u)} {f(by+4*u)} Q{f(bx-26*u)} {f(by-22*u)} {f(bx+2*u)} {f(by-22*u)} Q{f(bx+14*u)} {f(by-34*u)} {f(bx+26*u)} {f(by-24*u)} "
                  f"L{f(bx+40*u)} {f(by-20*u)} L{f(bx+26*u)} {f(by-14*u)} Q{f(bx+24*u)} {f(by+14*u)} {f(bx-6*u)} {f(by+16*u)} L{f(bx-14*u)} {f(by+30*u)} L{f(bx-18*u)} {f(by+14*u)} "
                  f"L{f(bx-46*u)} {f(by+10*u)} L{f(bx-60*u)} {f(by-24*u)} L{f(bx-38*u)} {f(by-2*u)} Z")
            v.path(bird,fill=c2,name="wren")
            v.path(ellipse(bx+16*u,by-20*u,3*u),fill=c1)
            # tattered fly edge: notches
            v.path(" ".join(f"M{f(x+w*0.86)} {f(y+h*t)} l{f(w*0.1)} {f(h*0.04)} l{f(-w*0.08)} {f(h*0.05)} Z" for t in (0.15,0.7)),fill=P["white"],op=0)
        v.path(f"M{f(x)} {f(y-8)} V{f(y+h+6)}",stroke=L_,sw=5)
    def lantern(s,x,y,r=12):
        v=s.v
        v.path(f"M{f(x)} {f(y-r*2.2)} V{f(y-r*1.3)}",stroke=L_,sw=3)
        v.path(rrect(x-r*0.8,y-r*1.3,r*1.6,r*2.4,r*0.5),fill=P["amber"],stroke=L_,sw=4,name="lantern",fx=[{"effect":"stylize.outerGlow","params":{"color":"#FFC35A","blur":r*1.6,"opacity":90}}])
        v.path(ellipse(x,y-r*0.1,r*0.38,r*0.6),fill="#FFF3C0",name="flame")
    def figurehead(s,x,y,kind="sun",sc=1.0):
        v=s.v
        if kind=="sun": grinning_sun(v,x,y,26*sc)
        elif kind=="turtle":
            v.path(ellipse(x,y,34*sc,24*sc),fill=P["jungle"],stroke=L_,sw=5); v.path(ellipse(x,y-4*sc,24*sc,15*sc),fill=P["lagoon"],stroke=L_,sw=3)
            v.path(ellipse(x+40*sc,y-8*sc,13*sc,11*sc),fill=P["leaf"],stroke=L_,sw=4); v.path(ellipse(x+44*sc,y-11*sc,2.5*sc),fill=L_)
        elif kind=="gull":
            v.path(f"M{f(x-30*sc)} {f(y)} Q{f(x)} {f(y-40*sc)} {f(x+30*sc)} {f(y-10*sc)} Q{f(x+10*sc)} {f(y+10*sc)} {f(x-30*sc)} {f(y)} Z",fill="#FFFFFF",stroke=L_,sw=5)
            v.path(f"M{f(x+28*sc)} {f(y-12*sc)} l{f(18*sc)} {f(4*sc)} l{f(-16*sc)} {f(6*sc)} Z",fill=P["amber"],stroke=L_,sw=3)
            v.path(f"M{f(x-10*sc)} {f(y-14*sc)} Q{f(x-30*sc)} {f(y-50*sc)} {f(x-60*sc)} {f(y-40*sc)} Q{f(x-30*sc)} {f(y-10*sc)} {f(x-10*sc)} {f(y-14*sc)} Z",fill="#E8EEF2",stroke=L_,sw=4)
            v.path(ellipse(x+18*sc,y-16*sc,3*sc),fill=L_)
    def water(s,cx,wl,L,K=46,front=True):
        if os.environ.get('NOWATER'): return
        v=s.v; x0=cx-L*0.68; x1=cx+L*0.7; d=f"M{f(x0)} {f(wl+4)}"; n=8
        for i in range(n):
            a=x0+(x1-x0)*i/n; b=x0+(x1-x0)*(i+1)/n
            d+=f" Q{f((a+b)/2)} {f(wl-12 if i%2 else wl+6)} {f(b)} {f(wl+2)}"
        d+=f" Q{f(x1-20)} {f(wl+K+20)} {f(cx+L*0.3)} {f(wl+K+26)} H{f(cx-L*0.3)} Q{f(x0+20)} {f(wl+K+20)} {f(x0)} {f(wl+4)} Z"
        v.path(d,fill=grad([(0,P["aqua"]),(0.25,P["lagoon"]),(1,P["sea"])],angle=-90),stroke=L_,sw=6,name="water")
        v.path(f"M{f(cx-L*0.5)} {f(wl+10)} Q{f(cx-L*0.35)} {f(wl+2)} {f(cx-L*0.2)} {f(wl+10)} M{f(cx+L*0.05)} {f(wl+14)} Q{f(cx+L*0.2)} {f(wl+6)} {f(cx+L*0.35)} {f(wl+14)} M{f(cx-L*0.15)} {f(wl+K)} Q{f(cx)} {f(wl+K-8)} {f(cx+L*0.15)} {f(wl+K)}",stroke=P["foam"],sw=6,name="foam")
        bx=cx+L*0.48
        v.path(f"M{f(bx-30)} {f(wl+4)} Q{f(bx-4)} {f(wl-40)} {f(bx+36)} {f(wl-26)} Q{f(bx+14)} {f(wl-14)} {f(bx+56)} {f(wl+2)} Q{f(bx+20)} {f(wl+14)} {f(bx-30)} {f(wl+4)} Z",fill=P["foam"],stroke=L_,sw=5,name="splash")
        sx=cx-L*0.55
        v.path(f"M{f(sx+40)} {f(wl+6)} Q{f(sx)} {f(wl-6)} {f(sx-60)} {f(wl+8)} Q{f(sx-10)} {f(wl+16)} {f(sx+40)} {f(wl+6)} Z",fill=P["foam"],stroke=L_,sw=4,name="wake")
