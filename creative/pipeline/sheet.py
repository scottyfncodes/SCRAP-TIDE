import sys
from PIL import Image
def sheet(paths,out,cell=400,cols=3,bg=(200,200,200)):
    ims=[Image.open(p).convert("RGBA") for p in paths]
    rows=(len(ims)+cols-1)//cols
    S=Image.new("RGBA",(cols*cell,rows*cell),bg+(255,))
    for i,im in enumerate(ims):
        im.thumbnail((cell-10,cell-10))
        # checker bg to show transparency
        x=(i%cols)*cell+(cell-im.width)//2; y=(i//cols)*cell+(cell-im.height)//2
        S.alpha_composite(im,(x,y))
    S.convert("RGB").save(out)
if __name__=="__main__":
    sheet(sys.argv[2:],sys.argv[1])
