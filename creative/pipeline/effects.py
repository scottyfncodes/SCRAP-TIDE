import sys,json,math,os; sys.path.insert(0,"/home/user/pilot/tools"); from mcpc import Client
from palette import P
W="/home/user/pilot/work/fx"; c=Client("effectcraft")
def run(i,**p): return c.call("command_run",{"id":i,"params":p})
def comp(name,w,h,dur,fps=24):
    r=run("comp.new",name=name,width=w,height=h,frameRate=fps,duration=dur,open=True); return r["comp"]
def shape(name,kind,size,fill=None,stroke=None,sw=0,pos=None,**star):
    p=dict(kind=kind,name=name,size=size)
    if fill: p["fill"]=fill
    else: p["fillOpacity"]=0
    if stroke: p.update(stroke=stroke,strokeWidth=sw)
    if pos: p["position"]=pos
    run("layer.newShape",**p)
    for k,v in star.items(): c.call("set_property",{"layer":name,"path":f"contents/group/contents/star/{k}","value":v})
    return name
def kf(layer,path,keys,interp="easyEase"):
    return c.call("add_keyframe",{"layer":layer,"path":path,"keys":[{"time":t,"value":v} for t,v in keys],"interpolation":interp})
def glow(layer,**vals):
    try: return c.call("add_effect",{"layer":layer,"effect":"ec.stylize.glow","values":vals})
    except Exception as e: print("glow fail",str(e)[:200])
def twinkle(name,pos,r,col,t0,dur,rot=45):
    shape(name,"star",[r*2,r*2],fill=col,pos=pos,points=4,innerRadius=r*0.22,outerRadius=r,innerRoundness=60)
    kf(name,"transform/scale",[(t0,[0,0]),(t0+dur*0.45,[100,100]),(t0+dur,[0,0])])
    kf(name,"transform/rotation",[(t0,0),(t0+dur,rot)],"linear")
c.call("open_project",{"new":True})
FX={}
# A sparkle (loop)
comp("fx_treasure_sparkle",128,128,1.0)
for i,(x,y,r,t0,col) in enumerate(((64,64,44,0.0,"#FFF8DD"),(30,38,18,0.35,P["gold"]),(98,92,16,0.55,P["gold"]))):
    twinkle(f"tw{i}",[x,y],r,col,t0,0.45 if i else 0.9)
glow("tw0"); FX["fx_treasure_sparkle"]=24
# B discovery burst
comp("fx_discovery_burst",512,512,1.5,30)
shape("rays","star",[480,480],fill=P["gold"],pos=[256,256],points=16,innerRadius=40,outerRadius=250,innerRoundness=0)
kf("rays","transform/scale",[(0,[0,0]),(0.35,[105,105]),(1.5,[95,95])]); kf("rays","transform/rotation",[(0,0),(1.5,40)],"linear"); kf("rays","transform/opacity",[(0,0),(0.2,70),(1.1,55),(1.5,0)])
shape("ring","ellipse",[300,300],stroke=P["cream"],sw=14,pos=[256,256])
kf("ring","transform/scale",[(0.05,[10,10]),(0.6,[160,160])]); kf("ring","transform/opacity",[(0.05,100),(0.6,0)])
shape("core","ellipse",[200,200],fill="#FFF8DD",pos=[256,256])
kf("core","transform/scale",[(0,[0,0]),(0.18,[120,120]),(0.5,[60,60]),(1.5,[50,50])]); kf("core","transform/opacity",[(0,100),(1.2,90),(1.5,0)]); glow("core")
for i in range(6):
    a=i*60+15; x=256+math.cos(math.radians(a))*170; y=256+math.sin(math.radians(a))*170
    twinkle(f"pop{i}",[x,y],26 if i%2 else 18,"#FFF8DD",0.15+i*0.07,0.6)
FX["fx_discovery_burst"]=45
# C collectible glow (loop)
comp("fx_collectible_glow",256,256,1.0)
shape("halo","ellipse",[150,150],fill=P["aqua"],pos=[128,128]); c.call("set_property",{"layer":"halo","path":"contents/group/contents/fill/opacity","value":55})
kf("halo","transform/scale",[(0,[85,85]),(0.5,[105,105]),(1.0,[85,85])]); glow("halo")
shape("inner","ellipse",[70,70],fill="#FFFFFF",pos=[128,128]); kf("inner","transform/opacity",[(0,70),(0.5,100),(1.0,70)])
for i in range(2):
    nm=f"orb{i}"; shape(nm,"star",[24,24],fill=P["gold"],points=4,innerRadius=3,outerRadius=12,innerRoundness=60)
    pts=[(t/4, [128+math.cos(2*math.pi*(t/4+i*0.5))*92, 128+math.sin(2*math.pi*(t/4+i*0.5))*92]) for t in range(5)]
    kf(nm,"transform/position",pts,"linear")
FX["fx_collectible_glow"]=24
# D splash
comp("fx_water_splash",256,256,0.75)
shape("crown","ellipse",[120,40],stroke=P["foam"],sw=10,pos=[128,210])
kf("crown","transform/scale",[(0,[20,20]),(0.5,[180,180])]); kf("crown","transform/opacity",[(0,100),(0.6,0)])
for i,(dx,h,r) in enumerate(((-60,120,16),(-28,170,20),(0,190,24),(30,160,18),(62,110,14))):
    nm=f"drop{i}"; shape(nm,"ellipse",[r*2,r*2.4],fill=P["foam"] if i%2==0 else P["aqua"],stroke=P["tide"],sw=4)
    kf(nm,"transform/position",[(0,[128,210]),(0.3,[128+dx*0.8,210-h]),(0.7,[128+dx*1.3,240])],"bezier")
    kf(nm,"transform/scale",[(0,[40,40]),(0.25,[100,100]),(0.7,[30,30])])
FX["fx_water_splash"]=18
# E impact poof
comp("fx_impact_poof",384,384,0.8)
shape("flash","star",[300,300],fill=P["gold"],pos=[192,192],points=8,innerRadius=50,outerRadius=150,innerRoundness=0)
kf("flash","transform/scale",[(0,[0,0]),(0.12,[110,110]),(0.35,[0,0])]); kf("flash","transform/rotation",[(0,0),(0.35,30)],"linear"); glow("flash")
for i in range(7):
    a=i*360/7; nm=f"puff{i}"
    shape(nm,"ellipse",[90,90],fill=P["cream"],stroke=P["dusk"],sw=6,pos=[192,192])
    kf(nm,"transform/position",[(0.05,[192,192]),(0.8,[192+math.cos(math.radians(a))*130,192+math.sin(math.radians(a))*130])],"easyEaseOut" if False else "easyEase")
    kf(nm,"transform/scale",[(0.05,[30,30]),(0.35,[110,110]),(0.8,[0,0])])
twinkle("star_a",[110,90],22,P["gold"],0.15,0.5); twinkle("star_b",[290,120],16,P["coral"],0.2,0.45)
FX["fx_impact_poof"]=19
# F wake foam (loop)
comp("fx_wake_foam",256,128,1.0)
for i in range(6):
    nm=f"foam{i}"; y=64+((i*37)%40)-20; t0=i/6
    shape(nm,"ellipse",[34,22],fill=P["foam"],stroke=P["aqua"],sw=4)
    kf(nm,"transform/position",[(0,[256-((t0)*256)%256,y]),(1.0,[256-((t0)*256)%256-256,y])],"linear")
    kf(nm,"transform/scale",[(0,[100,100]),(1.0,[40,40])],"linear")
FX["fx_wake_foam"]=24
# G dust motes (loop)
comp("fx_dust_motes",512,512,2.0)
for i in range(12):
    nm=f"mote{i}"; x=40+(i*97)%440; y=80+(i*151)%380; r=4+(i%3)*3
    shape(nm,"ellipse",[r*2,r*2],fill="#FFF3C0",pos=[x,y])
    kf(nm,"transform/position",[(0,[x,y]),(2.0,[x+(10 if i%2 else -10),y-60])],"linear")
    kf(nm,"transform/opacity",[(0,0),(0.6+(i%4)*0.2,90),(2.0,0)])
glow("mote0")
FX["fx_dust_motes"]=48
c.call("save_project",{"path":W+"/tidebreakers_fx_v1.ecproj"})
for name in FX:
    os.makedirs(f"{W}/{name}",exist_ok=True)
    run("renderQueue.add",comp=name,format="png",output=f"{W}/{name}/{name}_[###].png")
r=run("renderQueue.list"); 
for i in range(len(FX)): run("renderQueue.setOutputModule",index=i+1,channels="rgba")
print(run("renderQueue.render",wait=True)["failed"])
for name in FX:
    try: print(run("file.exportLottie",comp=name,path=f"{W}/{name}.json")["bytes"])
    except Exception as e: print("lottie fail",name,str(e)[:200])
json.dump(FX,open(W+"/frames.json","w")); c.close()
