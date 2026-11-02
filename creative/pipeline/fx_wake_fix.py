import sys,json,math,os; sys.path.insert(0,"/home/user/pilot/tools"); from mcpc import Client
from palette import P
W="/home/user/pilot/work/fx"; c=Client("effectcraft")
def run(i,**p): return c.call("command_run",{"id":i,"params":p})
c.call("open_project",{"path":W+"/tidebreakers_fx_v1.ecproj"})
run("comp.new",name="fx_wake_foam_v2",width=256,height=128,frameRate=24,duration=1.0,open=True)
for i in range(7):
    x0=(i*256/7); y=64+((i*41)%56)-28; r=[30,22,38,26,34,20,28][i]
    for twin in (0,1):
        nm=f"f{i}_{twin}"; sx=x0+256*twin
        run("layer.newShape",kind="ellipse",name=nm,size=[r,r*0.62],fill=P["foam"],stroke=P["aqua"],strokeWidth=4,position=[sx,y])
        c.call("add_keyframe",{"layer":nm,"path":"transform/position","keys":[{"time":0,"value":[sx,y]},{"time":1.0,"value":[sx-256,y]}],"interpolation":"linear"})
c.call("save_project",{"path":W+"/tidebreakers_fx_v1.ecproj"})
os.system(f"rm -rf {W}/fx_wake_foam; mkdir -p {W}/fx_wake_foam")
q=run("renderQueue.add",comp="fx_wake_foam_v2",format="png",output=f"{W}/fx_wake_foam/fx_wake_foam_[###].png")
run("renderQueue.setOutputModule",item=q["id"],channels="rgba")
print(run("renderQueue.render",wait=True)["failed"])
print(run("file.exportLottie",comp="fx_wake_foam_v2",path=f"{W}/fx_wake_foam.json")["bytes"]); c.close()
