"""Thin authoring layer over the VectorCraft MCP server (all geometry is built by VectorCraft)."""
import sys, math, json, os
sys.path.insert(0, "/home/user/pilot/tools"); from mcpc import Client
from palette import P, LINE

def grad(stops, kind="linear", angle=90, **kw):
    st=[]
    n=len(stops)
    for i,s in enumerate(stops):
        if isinstance(s,(list,tuple)): st.append({"offset":s[0],"color":s[1], **({"opacity":s[2]} if len(s)>2 else {})})
        else: st.append({"offset":i/(n-1),"color":s})
    g={"kind":kind,"stops":st}
    if kind=="linear" and angle is not None: g["angle"]=angle
    g.update(kw); return {"gradient":g}

class VC:
    def __init__(self, client=None):
        self.c = client or Client("vectorcraft")
        self.log=[]
    def new(self, w, h, name="art", artboards=None):
        p={"width":w,"height":h,"units":"Pixels","backgroundContents":"transparent","name":name}
        if artboards: p.update(artboards=artboards)
        r=self.c.call("command_run",{"id":"file.new","params":p}); self.w,self.h=w,h; return r
    def cmd(self, id, **params): return self.c.call("command_run",{"id":id,"params":params})
    def path(self, d, fill="none", stroke=None, sw=None, op=None, name=None, fx=None, cap="round", join="round", dash=None):
        a={"d":d,"fill":fill,"stroke":stroke or "none","cap":cap,"join":join}
        if sw is not None: a["strokeWidth"]=sw
        if op is not None: a["opacity"]=op*100 if op<=1 else op
        if name: a["name"]=name
        if dash: a["dash"]=dash
        if fx: a["effects"]=fx
        return self.c.call("draw_path",a)["id"]
    def shape(self, **kw):
        kw.setdefault("stroke","none"); return self.c.call("draw_shape",kw)["id"]
    def text(self, text, x, y, font="Fraunces 144pt", size=48, color=LINE, **kw):
        a=dict(text=text,x=x,y=y,font=font,size=size,color=color); a.update(kw)
        return self.c.call("add_text",a)["id"]
    def style(self, ids, **kw):
        return self.cmd("text.setStyle", ids=ids if isinstance(ids,list) else [ids], **kw)
    def fx(self, ids, effect, **params):
        return self.c.call("apply_effect",{"ids":ids if isinstance(ids,list) else [ids],"effect":effect,"params":params})
    def group(self, ids, name=None):
        g=self.cmd("object.group", ids=ids)["id"]
        if name: self.rename(g,name)
        return g
    def rename(self, id, name):
        try: self.cmd("object.setProps", ids=[id], name=name)
        except Exception: pass
    def transform(self, ids, **kw): return self.c.call("transform",{"ids":ids if isinstance(ids,list) else [ids],**kw})
    def layer(self, name, **kw): return self.cmd("layer.new", name=name, **kw)
    def inspect(self, **kw): return self.c.call("inspect_document",kw)
    def export(self, path, **kw):
        os.makedirs(os.path.dirname(path),exist_ok=True)
        a={"path":path}; a.update(kw); return self.c.call("export",a)
    def save(self, path):
        os.makedirs(os.path.dirname(path),exist_ok=True)
        return self.c.call("save_file",{"path":path})
    def close(self): self.c.close()

# ---- geometry helpers (produce SVG path data) ----
def f(v): return f"{v:.2f}".rstrip("0").rstrip(".")
def poly(pts, closed=True): return "M"+" L".join(f"{f(x)} {f(y)}" for x,y in pts)+(" Z" if closed else "")
def ellipse(cx,cy,rx,ry=None):
    ry=ry or rx; k=0.5523
    return (f"M{f(cx-rx)} {f(cy)} C{f(cx-rx)} {f(cy-ry*k)} {f(cx-rx*k)} {f(cy-ry)} {f(cx)} {f(cy-ry)} "
            f"C{f(cx+rx*k)} {f(cy-ry)} {f(cx+rx)} {f(cy-ry*k)} {f(cx+rx)} {f(cy)} "
            f"C{f(cx+rx)} {f(cy+ry*k)} {f(cx+rx*k)} {f(cy+ry)} {f(cx)} {f(cy+ry)} "
            f"C{f(cx-rx*k)} {f(cy+ry)} {f(cx-rx)} {f(cy+ry*k)} {f(cx-rx)} {f(cy)} Z")
def star(cx,cy,r1,r2,n=5,rot=-90):
    pts=[]
    for i in range(n*2):
        a=math.radians(rot+i*180/n); r=r1 if i%2==0 else r2
        pts.append((cx+math.cos(a)*r, cy+math.sin(a)*r))
    return poly(pts)
def sparkle(cx,cy,r,w=0.22):
    # 4-point curved twinkle
    s=r*w
    return (f"M{f(cx)} {f(cy-r)} Q{f(cx+s)} {f(cy-s)} {f(cx+r)} {f(cy)} Q{f(cx+s)} {f(cy+s)} {f(cx)} {f(cy+r)} "
            f"Q{f(cx-s)} {f(cy+s)} {f(cx-r)} {f(cy)} Q{f(cx-s)} {f(cy-s)} {f(cx)} {f(cy-r)} Z")
def rrect(x,y,w,h,r):
    return (f"M{f(x+r)} {f(y)} H{f(x+w-r)} Q{f(x+w)} {f(y)} {f(x+w)} {f(y+r)} V{f(y+h-r)} Q{f(x+w)} {f(y+h)} {f(x+w-r)} {f(y+h)} "
            f"H{f(x+r)} Q{f(x)} {f(y+h)} {f(x)} {f(y+h-r)} V{f(y+r)} Q{f(x)} {f(y)} {f(x+r)} {f(y)} Z")
def wave_band(x0,x1,y,amp,wl,bottom):
    d=f"M{f(x0)} {f(bottom)} L{f(x0)} {f(y)}"; x=x0; up=True
    while x<x1:
        nx=min(x+wl,x1); d+=f" Q{f((x+nx)/2)} {f(y-amp if up else y+amp)} {f(nx)} {f(y)}"; x=nx; up=not up
    return d+f" L{f(x1)} {f(bottom)} Z"
def rays(cx,cy,r0,r1,n,width_deg,rot=0):
    out=[]
    for i in range(n):
        a=math.radians(rot+i*360/n); w=math.radians(width_deg/2)
        out.append(poly([(cx+math.cos(a-w)*r0,cy+math.sin(a-w)*r0),(cx+math.cos(a)*r1,cy+math.sin(a)*r1),(cx+math.cos(a+w)*r0,cy+math.sin(a+w)*r0)]))
    return " ".join(out)
