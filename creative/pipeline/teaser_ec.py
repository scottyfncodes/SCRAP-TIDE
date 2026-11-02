import sys,json,os; sys.path.insert(0,"/home/user/pilot/tools"); from mcpc import Client
from palette import P
T="/home/user/pilot/work/teaser"; c=Client("effectcraft")
def run(i,**p): return c.call("command_run",{"id":i,"params":p})
def kf(layer,path,keys,interp="easyEase"): return c.call("add_keyframe",{"layer":layer,"path":path,"keys":[{"time":t,"value":v} for t,v in keys],"interpolation":interp})
def txt(name,text,font,style,size,fill,pos):
    run("layer.newText",text=text,name=name,font=font,style=style,size=size,fill=fill,position=pos,justify="center")
c.call("open_project",{"new":True})
imp=run("file.import",paths=["/home/user/pilot/work/brand/wordmark_v3.png","/home/user/pilot/work/keyart/sky.png","/home/user/pilot/work/keyart/sea.png"]); print(str(imp)[:300])
items={i["name"]:i["id"] for i in c.call("get_project",{})["items"]}; print(items)
# INTRO 3s
run("comp.new",name="intro",width=1920,height=1080,frameRate=30,duration=3.0,background=P["swell"],open=True)
txt("l1","Eight planks of optimism.","Fraunces 144pt","Black",96,P["cream"],[960,500])
kf("l1","transform/opacity",[(0,0),(0.6,100),(2.5,100),(3.0,0)]); kf("l1","transform/scale",[(0,[92,92]),(3.0,[100,100])],"linear")
txt("l2","One very big ocean.","Fraunces 72pt","SemiBold Italic",56,P["gold"],[960,600])
kf("l2","transform/opacity",[(0.9,0),(1.5,100),(2.5,100),(3.0,0)])
# END TITLE 4.5s
run("comp.new",name="endtitle",width=1920,height=1080,frameRate=30,duration=4.5,background=P["swell"],open=True)
run("layer.addItem",item=items["sky.png"]); sky=c.call("get_comp",{})["layers"][0]["id"]
c.call("set_property",{"layer":sky,"path":"transform/scale","value":[75,75,100]})
kf(sky,"transform/scale",[(0,[75,75]),(4.5,[82,82])],"linear")
run("layer.addItem",item=items["sea.png"]); sea=c.call("get_comp",{})["layers"][0]["id"]
kf(sea,"transform/scale",[(0,[75,75]),(4.5,[82,82])],"linear")
run("layer.newShape",kind="star",name="rays",size=[1400,1400],fill="#FFE7A0",position=[960,560])
for k,v in (("points",18),("innerRadius",80),("outerRadius",900)): c.call("set_property",{"layer":"rays","path":f"contents/group/contents/star/{k}","value":v})
kf("rays","transform/opacity",[(0,0),(0.6,35),(4.5,25)]); kf("rays","transform/rotation",[(0,0),(4.5,20)],"linear")
run("layer.addItem",item=items["wordmark_v3.png"]); wm=c.call("get_comp",{})["layers"][0]["id"]
c.call("set_property",{"layer":wm,"path":"transform/position","value":[960,470,0]})
kf(wm,"transform/scale",[(0.3,[0,0]),(0.85,[112,112]),(1.15,[100,100])],"easyEase"); kf(wm,"transform/opacity",[(0.3,0),(0.5,100)])
txt("cta","SET SAIL ON iPHONE","Nunito","Black",58,P["gold"],[960,880])
kf("cta","transform/opacity",[(1.8,0),(2.4,100)]); kf("cta","transform/position",[(1.8,[960,910,0]),(2.4,[960,880,0])])
for n,comp in (("intro","intro"),("endtitle","endtitle")):
    q=run("renderQueue.add",comp=comp,format="h264",output=f"{T}/ec_{n}.mp4")
print(run("renderQueue.render",wait=True)["failed"])
c.call("save_project",{"path":T+"/teaser_titles.ecproj"})
c.call("render_frame",{"comp":"endtitle","time":3.0,"path":T+"/endtitle_check.png","inline":False})
c.call("render_frame",{"comp":"intro","time":2.0,"path":T+"/intro_check.png","inline":False})
c.close()
