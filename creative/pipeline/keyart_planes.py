from ships_all import *
from envkit import cloud
O="/home/user/pilot/work/keyart"; KW,KH=2560,1440; HZ=930
# ships without water, full artboard so waterline coordinates are known
os.environ["NOWATER"]="1"
v=VC(); v.new(1700,1300,"galleon nw"); galleon(v,cx=770,wl=1100); v.export(O+"/galleon_nw.png"); v.close()
v=VC(); v.new(1200,900,"dinghy nw"); dinghy(v,cx=600,wl=730); v.export(O+"/dinghy_nw.png"); v.close()
del os.environ["NOWATER"]
# sky plate
v=VC(); v.new(KW,KH,"keyart sky")
v.path(f"M0 0 H{KW} V{KH} H0 Z",fill=grad([(0,"#3B2E73"),(0.32,"#B8558A"),(0.52,P["coral"]),(0.64,P["amber"]),(0.66,"#FFD68A"),(1,"#FFD68A")],angle=-90))
v.path(rays(1720,HZ-40,0,2400,18,5),fill="#FFE7B0",op=0.18)
v.path(ellipse(1720,HZ-40,560),fill=grad([(0,"#FFF1C4",0.9),(1,"#FFF1C4",0)],kind="radial"))
v.path(ellipse(1720,HZ-40,250),fill=grad([(0,"#FFFBE6"),(1,"#FFD36B")],kind="radial"),name="sun")
for x,y,s in ((260,300,1.6),(900,180,1.2),(2240,260,1.4),(1250,420,0.9)): cloud(v,x,y,s,col="#FFC9B0",shade="#7A3E7A")
v.export(O+"/sky.png"); v.save(O+"/sky.vectorcraft"); v.close()
# sea plate (with sun glitter + foam where ships sit)
v=VC(); v.new(KW,KH,"keyart sea")
v.path(f"M0 {HZ} H{KW} V{KH} H0 Z",fill=grad([(0,"#E58A6E"),(0.18,P["sea"]),(1,P["tide"])],angle=-90))
for i in range(22):
    y=HZ+8+i*i*1.1; w=360-i*9
    v.path(ellipse(1720+((i*37)%60-30),y,w*0.5,3+i*0.4),fill="#FFE7A0",op=0.85-i*0.03)
for i in range(30):
    y=HZ+30+i*17; x=(i*389)%KW
    v.path(f"M{x} {y} q{40+i*3} -{6+i*0.4} {80+i*6} 0",stroke="#FFD9B8" if i<8 else P["aqua"],sw=2+i*0.25,op=0.55)
# galleon wake (waterline at y=1010, x 1440..2010)  &  dinghy splash (waterline 1330)
v.path(f"M1300 1018 Q1700 1000 2140 1016 Q1720 1040 1300 1018 Z",fill=P["foam"],op=0.85)
v.path(f"M2080 1012 q30 -26 70 -8 q-20 14 -70 8 Z",fill=P["foam"])
v.path(f"M300 1336 Q640 1300 1000 1330 Q640 1372 300 1336 Z",fill=P["foam"],op=0.9)
v.export(O+"/sea.png"); v.save(O+"/sea.vectorcraft"); v.close()
print("planes ok")
