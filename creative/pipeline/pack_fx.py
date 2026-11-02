import json,glob,math,os
from PIL import Image
W="/home/user/pilot/work/fx"; O="/home/user/pilot/pkg/effects"
FX=json.load(open(W+"/frames.json"))
META={"fx_treasure_sparkle":(24,True,"Loop on treasure/dig spots, item icons"),"fx_discovery_burst":(30,False,"Play once behind the New Discovery card"),
 "fx_collectible_glow":(24,True,"Loop under glowing collectibles in the world"),"fx_water_splash":(24,False,"Play once on anchor drop, item tossed, bow slam"),
 "fx_impact_poof":(24,False,"Play once for hits, chest bursts, cannon impacts (stylised, no gore)"),"fx_wake_foam":(24,True,"Scrolling foam sprite at the stern; spawn along wake"),
 "fx_dust_motes":(24,True,"Screen-space atmosphere overlay in jungle/cove (additive)")}
index={}
for name in FX:
    fr=sorted(glob.glob(f"{W}/{name}/*.png")); ims=[Image.open(f).convert("RGBA") for f in fr]
    w,h=ims[0].size; n=len(ims); cols=math.ceil(math.sqrt(n)); rows=math.ceil(n/cols)
    S=Image.new("RGBA",(cols*w,rows*h),(0,0,0,0))
    for i,im in enumerate(ims): S.paste(im,((i%cols)*w,(i//cols)*h))
    S.save(f"{O}/sheets/{name}_sheet.png",optimize=True)
    fps,loop,use=META[name]
    meta={"image":f"{name}_sheet.png","frameWidth":w,"frameHeight":h,"frames":n,"columns":cols,"rows":rows,"fps":fps,"loop":loop,"premultiplied":False,"blend":"normal" if name not in("fx_dust_motes",) else "additive","use":use}
    json.dump(meta,open(f"{O}/sheets/{name}_sheet.json","w"),indent=1); index[name]=meta
    os.system(f"cp {W}/{name}.json {O}/lottie/{name}.lottie.json")
    print(name,n,(cols*w,rows*h))
json.dump(index,open(f"{O}/sheets/index.json","w"),indent=1)
