"""Thin authoring layer over DesignCraft MCP."""
import sys; sys.path.insert(0,"/home/user/pilot/tools"); from mcpc import Client
from palette import P
class DC:
    def __init__(s): s.c=Client("designcraft"); s.sw={}
    def ex(s,cmd,**p): return s.c.call("execute",{"command":cmd,"params":p})
    def new(s,w,h,pages=1,title="doc"):
        r=s.c.call("new_document",{"width":w,"height":h,"pages":pages,"intent":"mobile","title":title,"margins":0,"facingPages":False}); return r
    def swatches(s,cols):
        r=s.ex("swatch.addColorTheme",colors=list(cols.values())[:5],name="t") if False else None
        for name,hexv in cols.items():
            r=s.ex("swatch.addColorTheme",colors=[hexv],name=name)
            s.sw[name]=r["swatches"][0] if isinstance(r.get("swatches"),list) and isinstance(r["swatches"][0],str) else (r["swatches"][0].get("name") if isinstance(r.get("swatches"),list) else None)
        return s.sw
    def rect(s,x,y,w,h,fill=None,stroke=None,weight=0,radius=0,spread=0,shape="rectangle",opacity=None,shadow=False):
        r=s.ex("frame.create",rect=[x,y,x+w,y+h],shape=shape,content="graphic" if False else "unassigned",spread=spread); i=r["id"]
        s.ex("object.fill",swatch=s.sw[fill] if fill else "[None]",ids=[i])
        s.ex("object.stroke",swatch=s.sw[stroke] if stroke else "[None]",weight=weight,ids=[i]) if stroke else s.ex("object.stroke",swatch="[None]",ids=[i])
        if radius: s.ex("object.cornerOptions",shape="rounded",size=radius,ids=[i])
        if opacity is not None: s.ex("object.opacity",opacity=opacity,ids=[i])
        if shadow: s.ex("object.dropShadow",on=True,distance=3,size=8,opacity=0.35,ids=[i])
        return i
    def text(s,x,y,w,h,txt,font="Nunito",style="Black",size=16,color="tide",align="left",spread=0,tracking=0,leading=None):
        r=s.ex("frame.create",rect=[x,y,x+w,y+h],content="text",text=txt,spread=spread); i=r["id"]
        s.ex("selection.set",ids=[i],content=True) if False else None
        s.ex("text.selectStory",frame=i) if False else None
        s.c.call("execute",{"command":"selection.set","params":{"ids":[i]}})
        attrs={"fontFamily":font,"fontStyle":style,"size":size,"fill":s.sw[color],"tracking":tracking}
        if leading: attrs["leading"]={"kind":"points","value":leading}
        s.ex("type.char",attrs=attrs); s.ex("type.para",attrs={"align":align})
        return i
    def img(s,path,x,y,w,spread=0): return s.c.call("place_image",{"path":path,"x":x,"y":y,"width":w,"spread":spread})["id"]
    def png(s,page,path,scale=3): return s.c.call("export_png",{"page":page,"path":path,"scale":scale})
    def save(s,path): return s.c.call("save_document",{"path":path})
    def close(s): s.c.close()
