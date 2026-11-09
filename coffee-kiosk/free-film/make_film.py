#!/usr/bin/env python3
"""Free vertical film from the two real kiosk photos: smooth camera moves (sub-pixel crops), crossfades,
Arabic captions (pre-rendered PNGs), synthesized ambient music, end card.
usage: python3 make_film.py <workdir with cap*.png, endcard.png> <out.mp4>"""
import math, subprocess, sys, wave
import numpy as np
from PIL import Image

W, H, FPS = 1080, 1920, 30
WD, OUTP = sys.argv[1], sys.argv[2]
K = '/home/user/-/coffee-kiosk/kling/'
IMG = {'c': Image.open(K + 'kiosk_construction.jpg').convert('RGB'),
       'k': Image.open(K + 'kiosk_completed_clean.jpg').convert('RGB')}
# upsample the smaller construction photo once so crops stay sharp
IMG['c'] = IMG['c'].resize((1350, 2400), Image.LANCZOS)
SC = {'c': 1350 / 900, 'k': 1.0}

def ease(x): return 0.5 - 0.5 * math.cos(math.pi * min(max(x, 0), 1))

# shots: (image, duration, (cx, cy, w) start, (cx, cy, w) end) in source-photo pixels (construction: 900x1600 coords)
SHOTS = [
    ('c', 6.0, (450, 800, 900), (470, 760, 780)),      # wide site, slow push-in
    ('c', 5.0, (560, 760, 470), (585, 700, 400)),      # workers on the scaffold
    ('c', 4.5, (190, 840, 420), (300, 800, 440)),      # welder at the base, pan right
    ('c', 4.0, (480, 760, 640), (450, 800, 900)),      # pull back before the reveal
    ('k', 6.5, (660, 1172, 1320), (700, 1060, 1150)),  # reveal: finished kiosk, push-in
    ('k', 5.0, (800, 760, 620), (815, 420, 560)),      # tilt up the pylon to the round logo
    ('k', 4.5, (900, 960, 640), (980, 930, 560)),      # wall signage + logo
    ('k', 4.5, (330, 1160, 720), (420, 1170, 760)),    # Order Here board
    ('k', 5.0, (700, 1400, 1000), (660, 1172, 1320)),  # drive-thru lane, final wide
]
XF = [0.6, 0.6, 0.6, 1.8, 0.6, 0.6, 0.6, 0.6]  # crossfade after each shot (long one = construction -> finished)
END = 5.0; END_XF = 1.0
starts = [0.0]
for i, s in enumerate(SHOTS[:-1]): starts.append(starts[-1] + s[1] - XF[i])
FILM_END = starts[-1] + SHOTS[-1][1]
END_START = FILM_END - END_XF
TOTAL = END_START + END
CAPS = [('cap1', 0.8, 5.2), ('cap2', 6.0, 13.5), ('cap3', 17.6, 22.6), ('cap4', 30.7, 34.2)]
cap_img = {c[0]: np.asarray(Image.open(f'{WD}/{c[0]}.png').convert('RGBA')).astype(np.float32) / 255 for c in CAPS}
endcard = np.asarray(Image.open(f'{WD}/endcard.png').convert('RGB')).astype(np.float32)

def shot_frame(i, t):
    img, dur, a, b = SHOTS[i]; s = SC[img]; e = ease(t / dur)
    cx, cy, w = [(a[j] + (b[j] - a[j]) * e) * s for j in range(3)]
    h = w * 16 / 9; iw, ih = IMG[img].size
    h = min(h, ih); w = h * 9 / 16
    cx = min(max(cx, w / 2), iw - w / 2); cy = min(max(cy, h / 2), ih - h / 2)
    fr = IMG[img].resize((W, H), Image.BICUBIC, box=(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2))
    return np.asarray(fr).astype(np.float32)

def frame(t):
    if t >= END_START:
        a = min((t - END_START) / END_XF, 1)
        if a >= 1: return endcard
        base = shot_frame(len(SHOTS) - 1, t - starts[-1])
        return base * (1 - a) + endcard * a
    out = None
    for i, st in enumerate(starts):
        dur = SHOTS[i][1]
        if st <= t < st + dur:
            f = shot_frame(i, t - st)
            if out is None: out = f
            else:
                a = ease((t - st) / XF[i - 1]); out = out * (1 - a) + f * a
    for k, a0, a1 in CAPS:
        if a0 <= t <= a1:
            al = min((t - a0) / 0.5, (a1 - t) / 0.5, 1)
            c = cap_img[k]; m = c[..., 3:4] * al
            out = out * (1 - m) + c[..., :3] * 255 * m
    return out

def music(path, dur, sr=44100):
    t = np.arange(int(dur * sr)) / sr; y = np.zeros_like(t)
    chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]  # Am F C G
    bar = 4.0
    f = lambda n: 440 * 2 ** ((n - 69) / 12)
    for k in range(int(dur / bar) + 1):
        ch = chords[k % 4]; t0 = k * bar
        seg = (t >= t0) & (t < t0 + bar + 1.5); tt = t[seg] - t0
        env = np.minimum(tt / 1.2, 1) * np.exp(-np.maximum(tt - bar, 0) * 2.5)
        for n in ch:
            for det in (-0.08, 0.08):
                y[seg] += 0.05 * env * np.sin(2 * np.pi * f(n + det) * tt) * (0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * tt))
        y[seg] += 0.06 * env * np.sin(2 * np.pi * f(ch[0] - 12) * tt)
        for j, n in enumerate([ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12]):  # soft bell arpeggio
            b0 = t0 + j * 1.0; sb = (t >= b0) & (t < b0 + 2.5); tb = t[sb] - b0
            y[sb] += 0.035 * np.exp(-tb * 2.2) * (np.sin(2 * np.pi * f(n) * tb) + 0.3 * np.sin(2 * np.pi * 2 * f(n) * tb))
    d = int(0.23 * sr); yr = y.copy(); yr[d:] += 0.35 * y[:-d]; d2 = int(0.37 * sr); yr[d2:] += 0.2 * y[:-d2]  # simple echo
    fade = np.minimum(np.minimum(t / 2.0, (dur - t) / 3.0), 1)
    yr = yr * fade; yr = yr / np.max(np.abs(yr)) * 0.5
    st = np.stack([yr, np.roll(yr, int(0.012 * sr))], 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((st * 32767).astype('<i2').tobytes())

if __name__ == '__main__':
    wav = f'{WD}/music.wav'; music(wav, TOTAL)
    p = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                          '-i', '-', '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
                          '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUTP], stdin=subprocess.PIPE)
    n = int(TOTAL * FPS)
    for i in range(n):
        p.stdin.write(np.clip(frame(i / FPS), 0, 255).astype(np.uint8).tobytes())
    p.stdin.close(); p.wait(); print('duration', TOTAL)
