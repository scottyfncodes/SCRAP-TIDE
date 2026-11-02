from dc import *
from PIL import Image
import glob, os
PK="/home/user/pilot/pkg"; B=PK+"/branding"; OUT=PK+"/art-direction"
NP=12; d=DC(); d.new(1920,1080,NP,"TIDEBREAKERS Creative Bible v1")
d.swatches({k:P[k] for k in ["tide","swell","cream","parch","gold","goldDeep","lagoon","aqua","sea","coral","crimson","hibiscus","palm","jungle","honey","timber","timberDeep","plum","dusk","amber","ink","sky","sand","foam"]}|{"white":"#FFFFFF"})
def fitimg(path,x,y,w,h,sp):
    iw,ih=Image.open(path).size; s=min(w/iw,h/ih); return d.img(path,x+(w-iw*s)/2,y+(h-ih*s)/2,iw*s,spread=sp)
def page(sp,kicker,title,bg="parch"):
    d.rect(0,0,1920,1080,fill=bg,spread=sp)
    d.rect(0,0,1920,12,fill="gold",spread=sp)
    d.text(96,70,900,30,kicker.upper(),size=22,color="sea",spread=sp,tracking=200)
    d.text(96,104,1700,90,title,font="Fraunces 144pt",style="Black",size=64,color="tide",spread=sp)
    d.text(1500,1030,330,24,f"TIDEBREAKERS · Visual Direction v1 · {sp+1}",style="Bold",size=16,color="tide",align="right",spread=sp)
def para(sp,x,y,w,h,t,size=24,color="ink",style="Bold"): d.text(x,y,w,h,t,style=style,size=size,color=color,spread=sp,leading=size*1.4)
# 1 cover
sp=0; d.img(PK+"/marketing/keyart_main_2560x1440_v1.jpg",0,0,1920,spread=sp)
d.rect(1060,920,800,110,fill="swell",opacity=0.85,radius=55,spread=sp)
d.text(1060,940,800,70,"Creative Production Package v1",font="Fraunces 72pt",style="Bold",size=44,color="cream",align="center",spread=sp)
# 2 pillars
sp=1; page(sp,"01 · Direction","Start small. Earn something magnificent.")
fitimg(B+"/emblem_grinning-sun_v2.png",1290,230,520,520,sp)
for i,(h,t) in enumerate((("Adventurous & warm","A sunlit animated world. Every frame has one bright point, and it's where the treasure is."),
    ("Mischievous, never menacing","Our pirate mark is the Grinning Sun: gap-toothed, eye-patched, rising out of the sea. No skulls, no crossbones."),
    ("Handcrafted collectibility","Detail over noise: rope twists, planks, shells, bunting. Everything looks worth picking up."),
    ("Cohesive by construction","One outline colour, one palette, one shape language across ships, cast, UI and marketing."))):
    y=250+i*185; d.rect(96,y,1120,160,fill="cream",stroke="tide",weight=3,radius=24,spread=sp)
    d.text(130,y+24,1050,40,h,font="Fraunces 72pt",style="Bold",size=34,color="tide",spread=sp); para(sp,130,y+74,1050,80,t,22)
# 3 palette
sp=2; page(sp,"02 · Colour","Sunlit Shallows palette")
sw=[("lagoon","Lagoon Teal"),("aqua","Shallows Aqua"),("sea","Sea Blue"),("tide","Deep Tide · outlines"),("swell","Midnight Swell"),("gold","Doubloon Gold"),("goldDeep","Gold Deep"),("amber","Sunlit Amber"),
    ("coral","Coral Flame"),("crimson","Harbor Crimson"),("hibiscus","Hibiscus"),("cream","Sailcloth Cream"),("palm","Palm Green"),("jungle","Jungle Deep"),("honey","Honey Timber"),("timber","Timber"),("plum","Plum Shadow"),("dusk","Dusk")]
for i,(k,n) in enumerate(sw):
    x=96+(i%6)*290; y=240+(i//6)*230
    d.rect(x,y,260,130,fill=k,stroke="tide",weight=3,radius=20,spread=sp)
    d.text(x,y+142,260,28,n,size=20,color="tide",spread=sp); d.text(x,y+170,260,26,P[k].upper(),style="Bold",size=18,color="sea",spread=sp)
para(sp,96,950,1700,60,"Rules: no muddy browns · shadows go cool (plum, indigo) · highlights go warm (cream, gold) · outlines are Deep Tide, never black.",22,"tide")
# 4 typography
sp=3; page(sp,"03 · Type","Fraunces for wonder, Nunito for clarity")
d.text(96,250,1700,140,"TIDEBREAKERS",font="Fraunces 144pt",style="Black",size=130,color="tide",spread=sp)
d.text(96,400,1700,60,"Fraunces Black 144pt: wordmark, titles, discoveries",style="Bold",size=24,color="sea",spread=sp)
d.text(96,480,1700,90,"Sunburst Mask · Marlo's Shipyard",font="Fraunces 144pt",style="Black",size=64,color="tide",spread=sp)
d.text(96,600,1700,70,"SET SAIL · ADD TO CATALOG",size=52,color="tide",spread=sp,tracking=60)
d.text(96,680,1700,40,"Nunito Black: buttons, tabs, HUD numbers (min 13 pt on iPhone)",style="Bold",size=24,color="sea",spread=sp)
d.text(96,750,1300,120,"Nunito Bold body: Carved by people who loved the sun. It is, without doubt, grinning at you. Your Catalog keeps the record forever, even if you sell.",style="Bold",size=28,color="ink",spread=sp,leading=40)
para(sp,96,920,1700,60,"Retire Pirata One from UI headings: blackletter collapses below 20 pt. Both families are SIL OFL; ship them self-hosted.",22,"crimson")
# 5 shape language / silhouettes
sp=4; page(sp,"04 · Shape & render","Pebble & Sail, silhouette first")
fitimg(PK+"/characters/cast_silhouettes.png",96,220,1100,420,sp)
fitimg(B+"/motif_tidecurl_v1.png",1300,230,520,260,sp)
para(sp,1300,520,520,300,"Pebbles (round, chunky) for bodies, rocks and panels. Sails (tapering curves) for anything adventurous. The Tidecurl is our signature flourish.",24)
para(sp,96,690,1720,250,"Rendering: flat vector + two-tone cel shading (base, one cool shadow, one warm rim). Silhouette outline 3 to 4 px, interior 1.5 to 2 px, Deep Tide navy. Gradients only for sky, water, glow and gold. Lighting: golden-hour key from upper-left, teal ambient, gold rim on heroes; night uses lantern amber vs moonlit indigo.",24)
# 6 ships
sp=5; page(sp,"05 · Ships","From Leaky Dinghy to the Grand Tidebreaker")
for i,(f,n) in enumerate((("ship_01_leaky-dinghy","Leaky Dinghy"),("ship_02_coastal-sloop","Coastal Sloop"),("ship_03_saltwhistle-brig","Saltwhistle Brig"),("ship_04_grand-tidebreaker","Grand Tidebreaker"))):
    fitimg(PK+f"/ships/{f}.png",96+i*440,260,410,430,sp); d.text(96+i*440,700,410,34,n,font="Fraunces 72pt",style="Bold",size=28,color="tide",align="center",spread=sp)
cus=sorted(glob.glob(PK+"/ships/custom/hull_*.png"))+sorted(glob.glob(PK+"/ships/custom/sail_*.png"))
for i,f in enumerate(cus): fitimg(f,96+i*192,790,180,150,sp)
para(sp,96,950,1700,40,"Hull paints and sail patterns use the exact canon cosmetic colours from src/data/ship.ts.",20,"sea")
# 7 characters
sp=6; page(sp,"06 · Cast","The Captain & the Saltwhistle crew")
fitimg(PK+"/characters/cast_lineup.png",96,220,1720,560,sp)
for i,f in enumerate(sorted(glob.glob(PK+"/characters/expressions/captain_expr_*.png"))): fitimg(f,96+i*180,800,170,170,sp)
para(sp,1200,820,620,160,"Captain (player) · Pip Farthing, appraiser · Marlo Keelhart, shipwright · Odessa, curios · Biscuit, teacup hermit crab (new mascot).",20)
# 8 environments
sp=7; page(sp,"07 · World","Five places, one world")
envs=sorted(glob.glob(PK+"/environments/env_*.jpg"))
for i,f in enumerate(envs):
    x=96+(i%3)*580; y=230+(i//3)*390; fitimg(f,x,y,550,310,sp)
    d.text(x,y+316,550,30,os.path.basename(f)[7:-14].replace("-"," ").title(),size=22,color="tide",spread=sp)
para(sp,1256,620,560,300,"Concept art, not in-engine assets. Each location keeps one signature colour; far planes go cool and hazy, near planes frame the shot.",22)
# 9 UI
sp=8; page(sp,"08 · Interface","Readable first, decorated second")
for i,f in enumerate(sorted(glob.glob(PK+"/ui/screens/*.png"))): fitimg(f,96+i*292,220,270,585,sp)
para(sp,96,830,1720,150,"390×844 pt iPhone frames, @3x exports. 44 pt tap targets, text ≥ 13 pt, decoration only on panel edges. Kit: 12 treasure icons, 6 nav icons, buttons, rarity badges, coin pill, world map (SVG + PNG).",22)
# 10 effects
sp=9; page(sp,"09 · Effects & materials","Sprite sheets the engine can actually use")
for i,f in enumerate(sorted(glob.glob(PK+"/effects/sheets/*_sheet.png"))):
    x=96+(i%4)*440; y=230+(i//4)*370; d.rect(x,y,410,300,fill="swell",radius=18,spread=sp); fitimg(f,x+10,y+10,390,280,sp)
    d.text(x,y+306,410,28,os.path.basename(f)[3:-10].replace("_"," "),size=20,color="tide",spread=sp)
fitimg(PK+"/effects/materials/ocean_depth_ramp_256x16.png",1416,620,400,40,sp)
para(sp,1416,670,400,260,"Ocean depth ramp for the existing depth-aware shader. Every effect also ships as Lottie JSON and an editable .ecproj.",20)
# 11 marketing
sp=10; page(sp,"10 · Marketing","Key art, promos, teaser")
fitimg(PK+"/marketing/keyart_main_2560x1440_v1.jpg",96,220,1000,560,sp)
fitimg(PK+"/marketing/promo_portrait_1080x1920_v1.png",1130,220,320,560,sp)
fitimg(PK+"/marketing/promo_landscape_1920x1080_v1.png",1480,220,340,190,sp)
para(sp,1480,430,340,360,"Teaser: 26.7 s, 1080p30 H.264, cut in FilmCraft from EffectCraft titles + stills. Silent (no music source in toolchain).",20)
# 12 contact sheet
sp=11; page(sp,"11 · Contact sheet","Everything in the package",bg="cream")
thumbs=[B+"/wordmark_primary_v3.png",B+"/emblem_grinning-sun_v2.png",B+"/app-icon/icon-1024.png",B+"/flag_tidebreaker-colors_v1.png",B+"/motif_compass-rose_v1.png",B+"/motif_doubloon_v1.png"]+\
 [PK+f"/ships/{f}.png" for f in ("ship_01_leaky-dinghy","ship_02_coastal-sloop","ship_03_saltwhistle-brig","ship_04_grand-tidebreaker")]+\
 sorted(glob.glob(PK+"/ships/custom/flag_*.png"))+sorted(glob.glob(PK+"/ships/custom/figurehead_*.png"))+sorted(glob.glob(PK+"/characters/char_*.png"))+\
 sorted(glob.glob(PK+"/characters/poses/*.png"))+envs+sorted(glob.glob(PK+"/ui/kit/items/*.png"))+sorted(glob.glob(PK+"/ui/kit/nav/*.png"))+[PK+"/ui/kit/map_world_shallows.png"]
for i,f in enumerate(thumbs[:60]):
    x=96+(i%12)*145; y=210+(i//12)*160; fitimg(f,x,y,132,132,sp)
d.save(OUT+"/source/creative_bible_v1.designcraft")
print(d.ex("file.exportPdf",path=OUT+"/source/creative_bible_v1_raw.pdf"))
for i in (0,2,3,11): d.png(i,f"/home/user/pilot/qc/bible_p{i+1}.png",scale=0.5)
d.close()
