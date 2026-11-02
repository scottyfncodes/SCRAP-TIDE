from dc import *
K="/home/user/pilot/pkg/ui/kit"; CH="/home/user/pilot/pkg/characters"; SH="/home/user/pilot/pkg/ships"; ENV="/home/user/pilot/pkg/environments"; BR="/home/user/pilot/work/brand"
OUT="/home/user/pilot/pkg/ui/screens"; import os; os.makedirs(OUT,exist_ok=True)
d=DC(); d.new(390,844,6,"TIDEBREAKERS UI concepts v1")
d.swatches({"tide":P["tide"],"swell":P["swell"],"cream":P["cream"],"parch":P["parch"],"gold":P["gold"],"goldDeep":P["goldDeep"],"lagoon":P["lagoon"],"aqua":P["aqua"],"sea":P["sea"],"coral":P["coral"],"crimson":P["crimson"],"palm":P["palm"],"ink":P["ink"],"white":"#FFFFFF","epic":"#8B5CF6","rare":"#1A7FA8","unc":"#3FA55A","common":"#9FB3C8","sky":P["skyHi"],"plum":P["plum"]})
def btn(sp,x,y,w,h,label,fill="gold",tc="tide",size=17):
    d.rect(x,y+4,w,h,fill="swell",radius=h/2,spread=sp)
    d.rect(x,y,w,h,fill=fill,stroke="tide",weight=2.5,radius=h/2,spread=sp)
    d.text(x,y+h/2-size*0.68,w,size*1.6,label,size=size,color=tc,align="center",spread=sp,tracking=60)
def header(sp,title,right=True):
    d.rect(0,0,390,104,fill="tide",spread=sp)
    d.rect(14,58,44,44,fill="swell",radius=22,spread=sp); d.text(14,52,44,48,"‹",size=44,color="cream",align="center",spread=sp)
    d.text(48,60,250,34,title,font="Fraunces 144pt",style="Black",size=24,color="cream",spread=sp)
    if right: d.img(K+"/hud_coin_pill.png",282,62,96,spread=sp)
def statbar(sp,y,label,val,nxt,mx=1.0):
    d.text(24,y,90,20,label,size=14,color="tide",spread=sp)
    d.rect(112,y+3,200,14,fill="parch",radius=7,spread=sp); d.rect(112,y+3,200*nxt,14,fill="aqua",radius=7,spread=sp); d.rect(112,y+3,200*val,14,fill="lagoon",radius=7,spread=sp)
    d.text(318,y,60,20,f"+{int((nxt-val)*100)}%",size=14,color="palm",spread=sp)
# 1 MAIN MENU
sp=0
d.img(ENV+"/env_01_turtle-cay_concept_v1.jpg",-720,0,1500,spread=sp)
d.rect(0,0,390,300,fill="swell",opacity=0.25,spread=sp)
d.img(BR+"/wordmark_v3.png",14,76,362,spread=sp)
d.img(CH+"/poses/captain_pose_cheer.png",246,412,120,spread=sp)
d.img(CH+"/char_biscuit.png",22,520,92,spread=sp)
d.rect(20,600,350,216,fill="cream",stroke="tide",weight=2.5,radius=26,shadow=True,spread=sp)
btn(sp,40,620,310,58,"SET SAIL",size=20)
btn(sp,40,690,150,48,"CATALOG","white",size=15); btn(sp,200,690,150,48,"SETTINGS","white",size=15)
d.text(40,752,310,22,"Captain Juniper · Day 3 · Coastal Sloop",size=14,color="tide",align="center",spread=sp)
d.text(40,776,310,20,"Continue saved voyage",size=13,color="sea",align="center",spread=sp,)
# 2 SHIP UPGRADES
sp=1; d.rect(0,0,390,844,fill="parch",spread=sp); header(sp,"Marlo's Shipyard")
d.rect(16,116,358,206,fill="sky",stroke="tide",weight=2.5,radius=22,spread=sp)
d.img(SH+"/ship_02_coastal-sloop.png",70,124,250,spread=sp)
d.text(30,126,250,24,"Coastal Sloop",font="Fraunces 144pt",style="Black",size=20,color="tide",spread=sp)
statbar(sp,336,"Speed",0.55,0.72); statbar(sp,362,"Turning",0.48,0.48); statbar(sp,388,"Cargo",0.5,0.5)
cards=[("Canvas Mainsail","40% faster. No seagull-shaped hole.","OWNED","palm","cream",K+"/nav/ship.png"),
       ("Cutter Rig + Jib","Catches the wind from more angles.","150 g","gold","tide",K+"/nav/ship.png"),
       ("Copper-Banded Hull","Scrape over the reef breakers.","130 g","gold","tide",K+"/items/ship_bell.png")]
for i,(t,ds,cta,cf,ct,icon) in enumerate(cards):
    y=422+i*104
    d.rect(16,y,358,94,fill="cream",stroke="gold" if i==1 else "tide",weight=3 if i==1 else 2,radius=18,spread=sp)
    d.rect(28,y+14,64,64,fill="aqua",radius=14,spread=sp); d.img(icon,34,y+20,52,spread=sp)
    d.text(104,y+14,170,22,t,size=16,color="tide",spread=sp)
    d.text(104,y+38,170,40,ds,style="Bold",size=13,color="ink",spread=sp,leading=16)
    btn(sp,278,y+24,84,44,cta,cf,ct,size=14)
    if i==1: d.text(104,y+72,180,18,"+ 3 Sailcloth · 2 Rope",style="ExtraBold",size=13,color="sea",spread=sp)
d.rect(16,738,358,82,fill="white",stroke="tide",weight=2,radius=18,spread=sp)
d.img(CH+"/char_marlo-keelhart.png",22,742,62,spread=sp)
d.text(92,752,270,60,"“Every plank I add, you’ll see. That’s my guarantee.”",style="Bold",size=14,color="tide",spread=sp,leading=18)
# 3 TREASURE INVENTORY
sp=2; d.rect(0,0,390,844,fill="parch",spread=sp); header(sp,"Cargo Hold")
for i,(tab,on) in enumerate((("All",1),("Treasure",0),("Artifacts",0),("Ocean",0))):
    w=[56,98,96,78][i]; x=[16,80,186,290][i]
    d.rect(x,116,w,36,fill="tide" if on else "cream",stroke="tide",weight=2,radius=18,spread=sp); d.text(x,124,w,22,tab,size=14,color="cream" if on else "tide",align="center",spread=sp)
d.text(16,162,358,20,"11 / 14 slots · worth 1,086 g",style="ExtraBold",size=14,color="sea",spread=sp)
grid=[("doubloon","common","×12"),("pearl","unc","×3"),("sea_emerald","rare","×2"),("gold_ring","unc","×1"),("sun_mask","epic","NEW"),("gold_bar","rare","×1"),("ship_bell","unc","×1"),("spyglass","rare","×1"),("old_key","unc","×2"),("conch","common","×5"),("starfish","common","×4"),("sea_glass","common","×7")]
for i,(it,rar,cnt) in enumerate(grid):
    x=16+(i%4)*91; y=192+(i//4)*96
    d.rect(x,y,84,86,fill="cream",stroke=rar if rar!="gold" else "goldDeep",weight=4 if it=="sun_mask" else 3,radius=16,spread=sp)
    d.img(K+f"/items/{it}.png",x+16,y+10,52,spread=sp)
    d.rect(x+38,y+62,42,20,fill="coral" if cnt=="NEW" else "tide",radius=10,spread=sp); d.text(x+38,y+63,42,18,cnt,size=13,color="white",align="center",spread=sp)
d.rect(16,488,358,316,fill="cream",stroke="tide",weight=2.5,radius=24,shadow=True,spread=sp)
d.rect(32,504,112,112,fill="plum",radius=20,spread=sp); d.img(K+"/items/sun_mask.png",40,512,96,spread=sp)
d.text(158,510,200,30,"Sunburst Mask",font="Fraunces 144pt",style="Black",size=22,color="tide",spread=sp)
d.img(K+"/badge_rarity_epic.png",158,546,92,spread=sp)
d.text(158,580,200,40,"Artifact · Mossjaw Isle\nValue 240 g",style="Bold",size=14,color="ink",spread=sp,leading=18)
d.text(32,630,326,60,"Carved by people who loved the sun. It is, without doubt, grinning at you.",style="Bold",size=14,color="ink",spread=sp,leading=19)
btn(sp,32,712,156,52,"SELL","coral","white",size=16); btn(sp,202,712,156,52,"DISPLAY","white",size=16)
d.text(32,774,326,20,"Your Catalog keeps the record, even if you sell.",style="Bold",size=13,color="sea",align="center",spread=sp)
# 4 SHIP CUSTOMIZATION
sp=3; d.rect(0,0,390,844,fill="parch",spread=sp); header(sp,"Customize")
d.rect(16,116,358,262,fill="sky",stroke="tide",weight=2.5,radius=22,spread=sp)
d.img(SH+"/custom/sail_sunset.png",40,128,310,spread=sp)
for i,(tab,on) in enumerate((("Hull",0),("Sails",1),("Flag",0),("Figurehead",0))):
    w=[64,70,64,116][i]; x=[16,86,162,232][i]
    d.rect(x,394,w,40,fill="tide" if on else "cream",stroke="tide",weight=2,radius=20,spread=sp); d.text(x,404,w,22,tab,size=14,color="cream" if on else "tide",align="center",spread=sp)
opts=[("sail_plain","Plain Canvas","Owned"),("sail_stripe","Red Stripe","Owned"),("sail_sunset","Sunset Bands","Equipped"),("sail_shells","Beachcomber","Locked")]
for i,(f_,n,st) in enumerate(opts):
    x=16+i*90; y=450
    d.rect(x,y,84,104,fill="cream",stroke="gold" if st=="Equipped" else "tide",weight=4 if st=="Equipped" else 2,radius=16,spread=sp)
    d.img(SH+f"/custom/{f_}.png",x+6,y+6,72,spread=sp)
    if st=="Locked": d.rect(x,y,84,104,fill="swell",opacity=0.55,radius=16,spread=sp); d.rect(x+30,y+28,24,20,fill="cream",radius=4,spread=sp); d.rect(x+34,y+18,16,16,stroke="cream",weight=3,radius=8,spread=sp)
    d.text(x,y+80,84,18,st,size=13,color="palm" if st=="Equipped" else ("white" if st=="Locked" else "tide"),align="center",spread=sp)
d.rect(16,572,358,150,fill="cream",stroke="tide",weight=2.5,radius=22,spread=sp)
d.text(32,588,240,30,"Sunset Bands",font="Fraunces 144pt",style="Black",size=22,color="tide",spread=sp)
d.img(K+"/badge_rarity_uncommon.png",262,592,96,spread=sp)
d.text(32,624,326,44,"Orange-and-coral bands that catch the evening light. Odessa approves (barely).",style="Bold",size=14,color="ink",spread=sp,leading=19)
d.text(32,672,326,40,"Beachcomber Shells unlock when you complete every Ocean catalog entry",style="ExtraBold",size=13,color="sea",spread=sp)
btn(sp,40,742,310,58,"EQUIPPED","gold",size=18)
# 5 MAP & EXPLORATION
sp=4
d.rect(0,0,390,844,fill="swell",spread=sp)
d.img(K+"/map_world_shallows.png",-36,104,462,spread=sp)
d.rect(0,0,390,112,fill="swell",opacity=0.85,spread=sp)
d.img(K+"/hud_coin_pill.png",16,56,104,spread=sp)
d.rect(130,52,196,48,fill="cream",stroke="parch",weight=2,radius=14,spread=sp)
d.text(130,55,196,18,"QUEST",font="Fraunces 72pt",style="Bold",size=13,color="crimson",align="center",spread=sp,tracking=100)
d.text(130,73,196,22,"Find Turtle Cay · 120 m",size=14,color="tide",align="center",spread=sp)
d.rect(334,52,44,44,fill="cream",stroke="tide",weight=2,radius=22,spread=sp); d.text(334,58,44,30,"×",size=24,color="tide",align="center",spread=sp)
d.rect(180,582,60,60,fill="gold",opacity=0.45,shape="ellipse",spread=sp); d.img(K+"/nav/ship.png",190,590,40,spread=sp)
d.rect(0,700,390,144,fill="swell",opacity=0.9,spread=sp)
d.rect(16,716,110,36,fill="tide",radius=18,spread=sp); d.text(16,724,110,22,"Treasure",size=13,color="cream",align="center",spread=sp)
d.rect(134,716,110,36,fill="tide",radius=18,spread=sp); d.text(134,724,110,22,"Ports",size=13,color="cream",align="center",spread=sp)
d.rect(252,716,122,36,fill="tide",radius=18,spread=sp); d.text(252,724,122,22,"Map pieces 1/2",size=13,color="cream",align="center",spread=sp)
btn(sp,40,766,310,52,"SET COURSE",size=18)
# 6 DISCOVERY NOTIFICATION
sp=5
d.img(ENV+"/env_03_treasure-cove_concept_v1.jpg",-560,0,1500,spread=sp)
d.rect(0,0,390,844,fill="swell",opacity=0.6,spread=sp)
d.rect(30,56,330,48,fill="ink",opacity=0.9,radius=24,spread=sp); d.img(K+"/items/sun_mask.png",40,62,36,spread=sp)
d.text(82,68,270,22,"New catalog entry! 12 / 23",size=14,color="gold",spread=sp)
d.rect(15,190,360,360,fill="gold",opacity=0.28,shape="polygon",spread=sp) if False else None
b=d.ex("frame.create",rect=[-60,90,450,610],shape="polygon",sides=16,starInset=60,spread=sp)["id"]; d.ex("object.fill",swatch=d.sw["gold"],ids=[b]); d.ex("object.stroke",swatch="[None]",ids=[b]); d.ex("object.opacity",opacity=0.3,ids=[b])
d.rect(32,200,326,560,fill="cream",stroke="gold",weight=5,radius=30,shadow=True,spread=sp)
d.text(32,222,326,30,"NEW DISCOVERY!",font="Fraunces 144pt",style="Black",size=28,color="crimson",align="center",spread=sp)
d.rect(115,268,160,160,fill="plum",shape="ellipse",spread=sp); d.img(K+"/items/sun_mask.png",123,276,144,spread=sp)
d.text(32,444,326,34,"Sunburst Mask",font="Fraunces 144pt",style="Black",size=28,color="tide",align="center",spread=sp)
d.img(K+"/badge_rarity_epic.png",145,486,100,spread=sp)
d.text(56,530,278,64,"Carved by people who loved the sun. Found in the ruins of Mossjaw Isle.",style="Bold",size=15,color="ink",align="center",spread=sp,leading=20)
d.text(56,604,278,22,"+240 g value  ·  Artifact 3 / 6",size=15,color="sea",align="center",spread=sp)
btn(sp,56,648,278,58,"ADD TO CATALOG",size=18)
d.text(56,718,278,22,"Display it on your ship later",style="Bold",size=13,color="sea",align="center",spread=sp)
d.save(OUT.replace("/screens","/source")+"/ui_screens_v1.designcraft")
names=["01_main-menu","02_ship-upgrades","03_treasure-inventory","04_ship-customization","05_map-exploration","06_discovery-notification"]
for i,n in enumerate(names): print(d.png(i,f"{OUT}/ui_{n}_iphone@3x.png",scale=3))
d.ex("file.exportPdf",path=OUT.replace("/screens","/source")+"/ui_screens_v1.pdf")
d.close()
