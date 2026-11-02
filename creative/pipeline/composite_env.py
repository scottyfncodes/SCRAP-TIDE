import sys,json; sys.path.insert(0,"/home/user/pilot/tools"); from mcpc import Client
ENV="/home/user/pilot/work/env"
GRADE={ # colorBalance midtones [c-r, m-g, y-b], haze hue/sat for far plane, flare
 "01_turtle-cay":dict(mid=[6,0,-8],far=dict(saturation=-30,lightness=18),flare=(0.19,0.19)),
 "02_port-saltwhistle":dict(mid=[12,-2,-14],far=dict(saturation=-25,lightness=14),flare=(0.78,0.24)),
 "03_treasure-cove":dict(mid=[4,-4,10],far=dict(saturation=-10,lightness=-6),flare=None),
 "04_mossjaw-jungle":dict(mid=[4,4,-10],far=dict(saturation=-35,lightness=22),flare=None),
 "05_wreck-of-the-wren":dict(mid=[6,0,-6],far=dict(saturation=-25,lightness=12),flare=(0.82,0.16)),
}
def run(c,id,**p): return c.call("command_run",{"id":id,"params":p})
def comp(name):
    g=GRADE[name]; c=Client("photocraft")
    c.call("doc_new",{"width":1920,"height":1080,"name":name})
    ids={}
    for pl in ("sky","far","mid","near"):
        r=c.call("doc_place",{"path":f"{ENV}/{name}/{pl}.png"}); ids[pl]=r["layer"]
        run(c,"layer.setProps",layer=r["layer"],name=pl)
    # far: soft focus + atmospheric haze (clipped hue/sat)
    run(c,"layer.select",layer=ids["far"]); run(c,"filter.blur.gaussianBlur",radius=2.2)
    h=run(c,"layer.newAdjustmentLayer.hueSaturation",**g["far"]); hid=h.get("layer")
    run(c,"layer.setProps",layer=hid,name="far haze",clipped=True)
    # near: darker, slightly defocused framing plane
    run(c,"layer.select",layer=ids["near"]); run(c,"filter.blur.gaussianBlur",radius=1.2)
    cu=run(c,"layer.newAdjustmentLayer.curves",points=[[0,0],[128,104],[255,236]]); run(c,"layer.setProps",layer=cu.get("layer"),name="near shade",clipped=True)
    # global grade + vignette
    cb=run(c,"layer.newAdjustmentLayer.colorBalance",midtones=g["mid"],highlights=[4,0,-6]); run(c,"layer.setProps",layer=cb.get("layer"),name="scene grade")
    vg=run(c,"layer.newFillLayer.gradient",**{"from":"#ffffff","to":"#2A1F4A","style":"radial"}); run(c,"layer.setProps",layer=vg["layer"],name="vignette",blend="Multiply",opacity=0.16)
    if g["flare"]:
        nl=run(c,"layer.new.layer",name="sun flare",mode="Screen"); run(c,"edit.fill",contents="black")
        run(c,"filter.render.lensFlare",brightness=95,centerX=g["flare"][0],centerY=g["flare"][1],lens="prime105")
        run(c,"layer.setProps",layer=nl.get("layer"),opacity=0.7)
    out=f"{ENV}/{name}/{name}_composite"
    c.call("doc_save",{"path":out+".psd"}); c.call("doc_save",{"path":out+".png"})
    hist=c.call("doc_inspect",{})["history"]; c.close(); return hist
for n in (sys.argv[1:] or GRADE):
    try: print(n, comp(n)[-6:])
    except Exception as e: print(n,"FAIL",str(e)[:500])
