import os,json,glob,xml.etree.ElementTree as ET,subprocess
from PIL import Image
R="/home/user/pilot/pkg"; issues=[]; stats={}
NEED_ALPHA=("ships/","characters/","ui/kit/","effects/sheets/","branding/wordmark","branding/emblem","branding/flag","branding/motif")
for f in sorted(glob.glob(R+"/**/*",recursive=True)):
    if os.path.isdir(f): continue
    rel=f[len(R)+1:]; ext=rel.rsplit(".",1)[-1].lower(); stats[ext]=stats.get(ext,0)+1
    try:
        if ext=="png":
            im=Image.open(f); im.load()
            if rel.startswith(NEED_ALPHA) and not rel.startswith("characters/expressions/captain"):
                if im.mode!="RGBA": issues.append(f"{rel}: no alpha ({im.mode})")
                else:
                    a=im.getchannel("A"); 
                    if a.getextrema()[0]!=0: issues.append(f"{rel}: alpha never fully transparent")
        elif ext=="svg": ET.parse(f)
        elif ext=="json":
            j=json.load(open(f))
            if rel.startswith("effects/lottie") and "layers" not in j: issues.append(f"{rel}: lottie without layers")
        elif ext in ("jpg",): Image.open(f).load()
    except Exception as e: issues.append(f"{rel}: {e}")
print(stats); print("issues:",len(issues)); print("\n".join(issues[:40]))
v=subprocess.run(["ffprobe","-v","error","-show_entries","stream=codec_name,width,height,r_frame_rate:format=duration","-of","compact",R+"/marketing/teaser_tidebreakers_1080p_v1.mp4"],capture_output=True,text=True).stdout; print(v)
