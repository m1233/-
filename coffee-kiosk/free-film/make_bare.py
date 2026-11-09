#!/usr/bin/env python3
"""Builds the 'before signage' stage of the finished kiosk photo: removes the wall signs, wall logo and the upper
pylon panels by inpainting, and writes one mask per sign so they can be faded back in one by one.
usage: python3 make_bare.py <outdir>"""
import sys, cv2, numpy as np
out = sys.argv[1]
im = cv2.imread('/home/user/-/coffee-kiosk/kling/kiosk_completed_clean.jpg')
R = {'wallR': (838, 832, 1060, 1046), 'wallL': (348, 846, 602, 1052), 'logo': (1126, 878, 1238, 1124), 'pylon': (696, 170, 950, 628)}
masks = {}
for k, (x0, y0, x1, y1) in R.items():
    m = np.zeros(im.shape[:2], np.uint8); m[y0:y1, x0:x1] = 255; masks[k] = m
    soft = cv2.GaussianBlur(m, (0, 0), 6); cv2.imwrite(f'{out}/mask_{k}.png', soft)
allm = np.maximum.reduce(list(masks.values()))
bare = cv2.inpaint(im, allm, 11, cv2.INPAINT_TELEA).astype(np.float32)
rng = np.random.default_rng(1)
# pylon area is open sky: fill each row by blending the sky just left and right of it (no dark bleed from the box)
x0, y0, x1, y1 = R['pylon']; src = im.astype(np.float32)
for y in range(y0, y1):
    L = src[y, x0 - 14:x0 - 4].mean(0); Rr = src[y, x1 + 4:x1 + 14].mean(0)
    w = np.linspace(0, 1, x1 - x0)[:, None]; bare[y, x0:x1] = L * (1 - w) + Rr * w
bare[y0:y1, x0:x1] = cv2.GaussianBlur(bare[y0:y1, x0:x1], (0, 0), 4)
bare[y0:y1, x0:x1] += rng.normal(0, 1.5, bare[y0:y1, x0:x1].shape).astype(np.float32)
# re-texture the wall patches with grain sampled statistics so they read as stucco, not smear
grain = cv2.GaussianBlur(rng.normal(0, 9, im.shape[:2]).astype(np.float32), (0, 0), .9)
wall = np.maximum.reduce([masks['wallL'], masks['wallR'], masks['logo']]) > 0
bare[wall] += grain[wall][:, None]
# smooth the inpainted area a bit, then blend back with soft edges
blur = cv2.GaussianBlur(bare, (0, 0), 1.2)
a = cv2.GaussianBlur(allm, (0, 0), 3).astype(np.float32)[..., None] / 255
bare = blur * a + im.astype(np.float32) * (1 - a)
cv2.imwrite(f'{out}/bare.jpg', np.clip(bare, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 96])
cv2.imwrite(f'{out}/bare_small.jpg', cv2.resize(np.clip(bare, 0, 255).astype(np.uint8), (660, 1172)))
