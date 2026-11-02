import sys,json,os; sys.path.insert(0,"/home/user/pilot/tools"); from mcpc import Client
T="/home/user/pilot/work/teaser"; ENV="/home/user/pilot/pkg/environments"; M="/home/user/pilot/pkg/marketing"
TPS=254016000000
c=Client("filmcraft"); run=lambda i,**p: c.call("command_run",{"id":i,"params":p})
run("file.newProject")
shots=[(T+"/ec_intro.mp4",3.0,False),(ENV+"/env_01_turtle-cay_concept_v1.jpg",2.6,True),(ENV+"/env_02_port-saltwhistle_concept_v1.jpg",2.6,True),
       (M+"/promo_landscape_1920x1080_v1.png",3.4,True),(ENV+"/env_05_wreck-of-the-wren_concept_v1.jpg",2.4,True),(ENV+"/env_04_mossjaw-jungle_concept_v1.jpg",2.4,True),
       (ENV+"/env_03_treasure-cove_concept_v1.jpg",2.6,True),(M+"/keyart_main_2560x1440_v1.jpg",3.2,True),(T+"/ec_endtitle.mp4",4.5,False)]
r=c.call("media_import",{"paths":[s[0] for s in shots]}); items=r["items"]; print(r["errors"])
run("file.newSequence",name="TIDEBREAKERS teaser v1",width=1920,height=1080,fps=30)
t=0.0; clips=[]
for (path,dur,kb),item in zip(shots,items):
    pr=run("timeline.place",item=item,track="V1",seconds=t,duration={"seconds":dur},audio=False); cid=pr["clips"][0]; clips.append(cid)
    if kb:
        try: run("clip.scaleToFrameSize",clips=[cid]) if False else None
        except Exception: pass
    t+=dur
seq=c.call("sequence_inspect",{})
v1=seq["video"][0]["items"]
for it in v1:
    path=[s for s in shots][clips.index(it["clip"])]
    if not path[2]: continue
    # fit image to frame then slow push-in (Ken Burns) via Motion keyframes
    name=it["name"]; base=100.0
    if "2560" in name: base=75.0
    a=run("effects.addKeyframe",clip=it["clip"],effect="motion",param="scale",time=it["start"])["mediaTime"]
    b=run("effects.addKeyframe",clip=it["clip"],effect="motion",param="scale",time=it["end"]-8467200000)["mediaTime"]
    run("effects.setKeyframe",clip=it["clip"],effect="motion",param="scale",mediaTime=a,value=base)
    run("effects.setKeyframe",clip=it["clip"],effect="motion",param="scale",mediaTime=b,value=base*1.07)
for cid in clips[1:]:
    run("sequence.applyVideoTransition",clip=cid,effect="cross_dissolve",frames=15,edge="in",align="center")
c.call("render_frame",{"seconds":9.5,"max_side":960}) 
run("file.saveAs",path=T+"/tidebreakers_teaser_v1.fcproj") if True else None
r=run("file.exportMedia",path=M+"/teaser_tidebreakers_1080p_v1.mp4",format="h264",crf=20,wait=True,audio=False)
print(json.dumps(r)[:500]); c.close()
