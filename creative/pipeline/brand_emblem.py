from sun import *
OUT="/home/user/pilot/work/brand"
v=VC(); S=1024; C=S/2; v.new(S,S,"TIDEBREAKERS emblem")
# rope roundel
v.path(ellipse(C,C,468),fill=P["tide"],name="ring_base")
v.path(ellipse(C,C,452),stroke=P["honey"],sw=26,name="rope")
tw=[]
for i in range(72):
    a=math.radians(i*5); a2=math.radians(i*5+3.2)
    tw.append(f"M{f(C+math.cos(a)*440)} {f(C+math.sin(a)*440)} L{f(C+math.cos(a2)*464)} {f(C+math.sin(a2)*464)}")
v.path(" ".join(tw),stroke=P["timber"],sw=5,name="rope_twist")
v.path(ellipse(C,C,432),fill=grad([(0,P["skyHi"]),(0.55,P["sky"]),(1,P["sea"])],angle=-90),stroke=P["tide"],sw=10,name="sky_disc")
# crossed oar + spyglass behind
oar=f"M{C-330} {C+300} L{C+290} {C-320}"
v.path(oar,stroke=P["tide"],sw=46,name="oar_o"); v.path(oar,stroke=P["honey"],sw=28,name="oar")
v.path(f"M{C+250} {C-360} Q{C+330} {C-380} {C+340} {C-300} L{C+250} {C-210} Q{C+190} {C-260} {C+250} {C-360} Z".replace(" Q"," Q"),fill=P["honey"],stroke=P["tide"],sw=10,name="blade")
spy=f"M{C+320} {C+300} L{C-300} {C-320}"
v.path(spy,stroke=P["tide"],sw=58,name="spy_o"); v.path(spy,stroke=P["goldDeep"],sw=40,name="spy")
v.path(f"M{C+320} {C+300} L{C+120} {C+100}",stroke=P["timber"],sw=44,name="spy_grip")
for t in (0.18,0.42,0.66):
    x=C-300+(620*t); y=C-320+(620*t)
    v.path(f"M{x-24} {y+24} L{x+24} {y-24}",stroke=P["gold"],sw=12,name="band")
def clipped(d,fill,name):
    c=v.path(ellipse(C,C,427),fill="#000000",name="clip")
    w=v.path(d,fill=fill,name=name)
    r=v.c.call("pathfinder",{"ids":[c,w],"operation":"intersect"})
    rid=(r.get("ids") or [r.get("id")])[0] if isinstance(r,dict) else None
    v.c.call("set_paint",{"ids":[rid] if rid else [],"fill":fill,"stroke":"none"}) if rid else None
    return r
grinning_sun(v,C,C-20,190)
r=clipped(wave_band(C-440,C+440,C+215,24,105,C+470),grad([P["lagoon"],P["sea"]],angle=-90),"wave_back"); print(r)
v.path(wave_band(C-380,C+380,C+215,24,105,C+222).split(" L")[0] if False else f"M{C-330} {C+238} Q{C-275} {C+214} {C-220} {C+238}",stroke=P["foam"],sw=10,name="foam1")
clipped(wave_band(C-440,C+440,C+300,20,85,C+470),grad([P["sea"],P["tide"]],angle=-90),"wave_front")
v.path(f"M{C+90} {C+322} Q{C+150} {C+300} {C+210} {C+322} M{C-120} {C+372} Q{C-70} {C+354} {C-20} {C+372}",stroke=P["foam"],sw=9,name="foam2")
v.path(ellipse(C,C,430),stroke=P["tide"],sw=12,name="disc_edge")

print(v.export(OUT+"/emblem_v2.png")); v.export(OUT+"/emblem_v2.svg"); v.save(OUT+"/emblem_v2.vectorcraft"); v.close()
