#!/usr/bin/env python3
"""Kiosk film v2 (free): construction photo with workers -> the same kiosk appears and its signs are installed one by one
-> finished kiosk details -> interior walkthrough (3D render) -> end card (logo + name).
usage: python3 make_film_v2.py <workdir> <out.mp4>
workdir holds cap1..cap5.png, endcard.png, bare.jpg, mask_*.png (make_bare.py) and interior.mp4 (render_portrait.js)."""
import math, subprocess, sys
import numpy as np
from PIL import Image
sys.path.insert(0, __import__('os').path.dirname(__file__))
from make_film import music, ease, W, H, FPS

WD, OUTP = sys.argv[1], sys.argv[2]
K = '/home/user/-/coffee-kiosk/kling/'
c_img = Image.open(K + 'kiosk_construction.jpg').convert('RGB').resize((1350, 2400), Image.LANCZOS)
full = np.asarray(Image.open(K + 'kiosk_completed_clean.jpg').convert('RGB')).astype(np.float32)
bare = np.asarray(Image.open(f'{WD}/bare.jpg').convert('RGB')).astype(np.float32)
MASK = {k: np.asarray(Image.open(f'{WD}/mask_{k}.png').convert('L')).astype(np.float32)[..., None] / 255
        for k in ('wallR', 'wallL', 'logo', 'pylon')}
SIGN_T = [('wallR', 2.2), ('wallL', 3.6), ('logo', 5.0), ('pylon', 6.4)]  # seconds into the build shot
SC = {'c': 1350 / 900, 'k': 1.0, 'b': 1.0}

# (kind, duration, start (cx, cy, w), end (cx, cy, w)) in source-photo pixels; kind 'v' = interior video
SHOTS = [
    ('c', 5.5, (450, 800, 900), (470, 760, 780)),      # site: steel frame, workers
    ('c', 4.5, (560, 760, 470), (585, 700, 400)),      # workers on the scaffold
    ('c', 4.0, (190, 840, 420), (300, 800, 440)),      # welder at the base
    ('c', 3.5, (480, 760, 640), (450, 800, 900)),      # pull back
    ('b', 9.5, (660, 1172, 1320), (700, 1080, 1180)),  # walls finished, signs installed one by one
    ('k', 4.5, (800, 760, 620), (815, 420, 560)),      # tilt up the pylon to the round logo
    ('k', 4.0, (900, 960, 640), (980, 930, 560)),      # wall signage + logo
    ('k', 4.5, (330, 1160, 720), (420, 1170, 760)),    # Order Here board
    ('v', 26.0, None, None),                           # interior walkthrough to the drive-thru window
]
XF = [0.6, 0.6, 0.6, 2.2, 0.8, 0.6, 0.6, 1.0]
END, END_XF = 4.5, 1.0
starts = [0.0]
for i, s in enumerate(SHOTS[:-1]): starts.append(starts[-1] + s[1] - XF[i])
END_START = starts[-1] + SHOTS[-1][1] - END_XF
TOTAL = END_START + END
CAPS = [('cap1', 0.8, 4.8), ('cap2', 5.6, 12.0), ('cap3', starts[4] + 7.6, starts[5] + 1.5),
        ('cap4', starts[7] + .4, starts[7] + 3.8), ('cap5', starts[8] + .8, starts[8] + 4.2)]
cap_img = {c[0]: np.asarray(Image.open(f'{WD}/{c[0]}.png').convert('RGBA')).astype(np.float32) / 255 for c in CAPS}
endcard = np.asarray(Image.open(f'{WD}/endcard.png').convert('RGB')).astype(np.float32)

class Interior:
    def __init__(self, path):
        self.p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
        self.idx, self.cur = -1, None
    def get(self, i):
        while self.idx < i:
            buf = self.p.stdout.read(W * H * 3)
            if len(buf) < W * H * 3: break
            self.cur = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32); self.idx += 1
        return self.cur
interior = Interior(f'{WD}/interior.mp4')

def crop(src_img, box):
    cx, cy, w = box; iw, ih = src_img.size
    h = min(w * 16 / 9, ih); w = h * 9 / 16
    cx = min(max(cx, w / 2), iw - w / 2); cy = min(max(cy, h / 2), ih - h / 2)
    return np.asarray(src_img.resize((W, H), Image.BICUBIC, box=(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2))).astype(np.float32)

_full_img = Image.fromarray(full.astype(np.uint8))
def shot_frame(i, t):
    kind, dur, a, b = SHOTS[i]
    if kind == 'v': return interior.get(min(int(t * FPS), int(dur * FPS) - 1))
    e = ease(t / dur); box = [(a[j] + (b[j] - a[j]) * e) * SC[kind] for j in range(3)]
    if kind == 'c': return crop(c_img, box)
    if kind == 'k': return crop(_full_img, box)
    m = 0
    for k, ts in SIGN_T:
        r = min(max((t - ts) / 0.9, 0), 1)
        m = m + MASK[k] * ease(r)
    m = np.minimum(m, 1)
    img = bare * (1 - m) + full * m
    # gentle "walls being finished" grade: slightly desaturated at the start of the shot
    g = 1 - 0.35 * (1 - ease(t / 2.0)); lum = img.mean(2, keepdims=True); img = lum + (img - lum) * g
    return crop(Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)), box)

def frame(t):
    out = None
    for i, st in enumerate(starts):
        if st <= t < st + SHOTS[i][1]:
            f = shot_frame(i, t - st)
            out = f if out is None else out * (1 - ease((t - st) / XF[i - 1])) + f * ease((t - st) / XF[i - 1])
    if t >= END_START:
        a = ease((t - END_START) / END_XF); out = endcard if out is None else out * (1 - a) + endcard * a
    for k, a0, a1 in CAPS:
        if a0 <= t <= a1:
            al = min((t - a0) / 0.5, (a1 - t) / 0.5, 1); c = cap_img[k]; m = c[..., 3:4] * al
            out = out * (1 - m) + c[..., :3] * 255 * m
    return out

if __name__ == '__main__':
    wav = f'{WD}/music_v2.wav'; music(wav, TOTAL)
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                          '-i', '-', '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p',
                          '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUTP], stdin=subprocess.PIPE)
    for i in range(int(TOTAL * FPS)):
        p.stdin.write(np.clip(frame(i / FPS), 0, 255).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait(); print('duration', round(TOTAL, 2), 'starts', [round(s, 1) for s in starts])
