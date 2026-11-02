from vc import *
import shutil, json
B="/home/user/pilot/pkg/branding"; W="/home/user/pilot/work/brand"
NAMES={"lagoon":"Lagoon Teal","aqua":"Shallows Aqua","sea":"Sea Blue","tide":"Deep Tide","swell":"Midnight Swell","gold":"Doubloon Gold","goldDeep":"Gold Deep",
 "amber":"Sunlit Amber","coral":"Coral Flame","crimson":"Harbor Crimson","hibiscus":"Hibiscus","cream":"Sailcloth Cream","parch":"Parchment","palm":"Palm Green",
 "jungle":"Jungle Deep","honey":"Honey Timber","timber":"Timber","timberDeep":"Deep Timber","plum":"Plum Shadow","dusk":"Dusk","sky":"Sky","skyHi":"Sky High","sand":"Beach Sand","foam":"Sea Foam"}
# palette libraries via VectorCraft swatches
v=VC(); v.new(100,100,"palette")
v.cmd("swatch.newGroup",name="TIDEBREAKERS Sunlit Shallows",colors=[])
for k,n in NAMES.items(): v.cmd("swatch.new",name=n,color=P[k],group="TIDEBREAKERS Sunlit Shallows",**{"global":True})
names=list(NAMES.values())
for fmt in ("ase","css","gpl","vcswatches"): print(v.cmd("swatch.library.save",path=f"{B}/palette/tidebreakers-palette.{fmt}",format=fmt,names=names))
v.close()
json.dump({NAMES[k]:P[k] for k in NAMES},open(f"{B}/palette/tidebreakers-palette.json","w"),indent=1)
# trimmed re-exports of the brand masters
for stem,out in (("wordmark_v3","wordmark_primary_v3"),("wordmark_v3_notag","wordmark_compact_v3"),("emblem_v2","emblem_grinning-sun_v2"),("flag_tidebreaker_v1","flag_tidebreaker-colors_v1"),
                 ("motif_tidecurl_v1","motif_tidecurl_v1"),("motif_rope_divider_v1","motif_rope-divider_v1"),("motif_compass_v1","motif_compass-rose_v1"),("motif_doubloon_v1","motif_doubloon_v1")):
    v=VC(); v.c.call("open_file",{"path":f"{W}/{stem}.vectorcraft"})
    v.export(f"{B}/{out}.png",options={"useArtboards":False},scale=2 if "motif" in out or "emblem" in out else 1.5)
    v.export(f"{B}/{out}.svg",outlineText=True)
    v.save(f"{B}/source/{out}.vectorcraft"); v.close(); print(out)
v=VC(); v.c.call("open_file",{"path":f"{W}/app_icon_v1.vectorcraft"})
for px,name in ((1024,"icon-1024"),(512,"icon-512"),(192,"icon-192"),(180,"apple-touch-icon-180")): v.export(f"{B}/app-icon/{name}.png",scale=px/1024)
v.export(f"{B}/app-icon/icon.svg"); v.save(f"{B}/source/app_icon_v1.vectorcraft"); v.close()
