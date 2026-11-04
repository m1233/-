# python3 src/sheet.py out.jpg t1 t2 ...  -> contact sheet of build/stills (2 columns)
import sys, glob, os
from PIL import Image, ImageDraw
out, ts = sys.argv[1], sys.argv[2:]
ims = []
for t in ts:
    f = f"build/stills/t{float(t):06.1f}.jpg"
    im = Image.open(f).resize((960, 540)); ImageDraw.Draw(im).text((10, 10), t + "s", fill=(255, 0, 0)); ims.append(im)
cols = 2; rows = (len(ims) + 1) // 2
S = Image.new("RGB", (960 * cols, 540 * rows), "black")
for i, im in enumerate(ims): S.paste(im, ((i % cols) * 960, (i // cols) * 540))
S.save(out, quality=85)
