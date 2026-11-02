"""Shared 'Grinning Sun' emblem drawing, reused by the emblem, flag, icon and UI."""
from vc import *
def wavy_rays(cx,cy,r0,r1,n=12,rot=-90):
    ds=[]
    for i in range(n):
        a=math.radians(rot+i*360/n); L=r1 if i%2==0 else r1*0.82; w=math.radians(11 if i%2==0 else 9)
        p0=(cx+math.cos(a-w)*r0, cy+math.sin(a-w)*r0); p2=(cx+math.cos(a+w)*r0, cy+math.sin(a+w)*r0)
        tip=(cx+math.cos(a)*L, cy+math.sin(a)*L)
        # gently S-curved flame ray
        c1=(cx+math.cos(a-w*0.3)*(r0+(L-r0)*0.55)+math.cos(a+math.pi/2)*-8, cy+math.sin(a-w*0.3)*(r0+(L-r0)*0.55)+math.sin(a+math.pi/2)*-8)
        c2=(cx+math.cos(a+w*0.6)*(r0+(L-r0)*0.45), cy+math.sin(a+w*0.6)*(r0+(L-r0)*0.45))
        ds.append(f"M{f(p0[0])} {f(p0[1])} Q{f(c1[0])} {f(c1[1])} {f(tip[0])} {f(tip[1])} Q{f(c2[0])} {f(c2[1])} {f(p2[0])} {f(p2[1])} Z")
    return " ".join(ds)
def grinning_sun(v,cx,cy,R,line=LINE,lw=None,mono=None):
    """R = face radius. mono: single color (e.g. cream for flags)."""
    lw=lw or R*0.075
    g=lambda c: mono or c
    ids=[]
    rays=wavy_rays(cx,cy,R*0.92,R*1.62)
    ids.append(v.path(rays,fill=g(line),stroke=g(line),sw=lw*2,name="rays_o") if not mono else v.path(rays,fill=mono,name="rays"))
    if not mono: ids.append(v.path(rays,fill=grad([P["amber"],P["gold"]],kind="radial"),name="rays"))
    ids.append(v.path(ellipse(cx,cy,R),fill=g(line) if mono else grad([(0,"#FFF1B8"),(0.55,P["gold"]),(1,P["amber"])],kind="radial"),stroke=line if not mono else "none",sw=lw*1.6,name="face"))
    if mono:  # punch features out in the line color for a stencil/flag version
        fc=line
    else: fc=line
    # cheeks
    if not mono:
        for sx in (-1,1): ids.append(v.path(ellipse(cx+sx*R*0.52,cy+R*0.22,R*0.17,R*0.11),fill=P["hibiscus"],op=0.55,name="cheek"))
    # open eye (viewer's right) with brow raised
    ex,ey=cx+R*0.36,cy-R*0.12
    ids.append(v.path(ellipse(ex,ey,R*0.13,R*0.17),fill=fc,name="eye"))
    if not mono: ids.append(v.path(ellipse(ex-R*0.04,ey-R*0.06,R*0.045),fill="#ffffff",name="eye_hi"))
    ids.append(v.path(f"M{f(ex-R*0.2)} {f(ey-R*0.32)} Q{f(ex)} {f(ey-R*0.48)} {f(ex+R*0.2)} {f(ey-R*0.3)}",stroke=fc,sw=lw*1.1,name="brow"))
    # eyepatch strap + patch (viewer's left)
    ids.append(v.path(f"M{f(cx-R*0.98)} {f(cy-R*0.5)} Q{f(cx)} {f(cy-R*0.12)} {f(cx+R*0.98)} {f(cy-R*0.62)}",stroke=fc,sw=lw*0.9,name="strap"))
    px,py=cx-R*0.36,cy-R*0.1
    ids.append(v.path(f"M{f(px-R*0.24)} {f(py-R*0.14)} Q{f(px)} {f(py-R*0.22)} {f(px+R*0.24)} {f(py-R*0.12)} Q{f(px+R*0.22)} {f(py+R*0.2)} {f(px)} {f(py+R*0.24)} Q{f(px-R*0.24)} {f(py+R*0.2)} {f(px-R*0.24)} {f(py-R*0.14)} Z",fill=fc,name="patch"))
    # crooked grin + gold tooth
    m=(f"M{f(cx-R*0.48)} {f(cy+R*0.28)} Q{f(cx-R*0.05)} {f(cy+R*0.78)} {f(cx+R*0.52)} {f(cy+R*0.18)} "
       f"Q{f(cx+R*0.1)} {f(cy+R*0.46)} {f(cx-R*0.48)} {f(cy+R*0.28)} Z")
    ids.append(v.path(m,fill=fc,stroke=fc,sw=lw*0.6,name="grin"))
    if not mono:
        ids.append(v.path(rrect(cx+R*0.06,cy+R*0.33,R*0.15,R*0.14,R*0.03),fill=P["cream"],name="tooth"))
        ids.append(v.path(f"M{f(cx-R*0.25)} {f(cy+R*0.52)} Q{f(cx)} {f(cy+R*0.66)} {f(cx+R*0.22)} {f(cy+R*0.46)}",fill="none",stroke=P["coral"],sw=lw*1.4,name="tongue",op=0.9))
        ids.append(v.path(f"M{f(cx-R*0.62)} {f(cy-R*0.6)} Q{f(cx-R*0.3)} {f(cy-R*0.9)} {f(cx+R*0.1)} {f(cy-R*0.86)}",stroke="#FFF8DD",sw=lw*0.9,op=0.7,name="gloss"))
    return ids
