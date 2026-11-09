#!/usr/bin/env python3
"""Synthesised soundtrack (no stock audio): soft ambient music bed + Foley cued to the picture.
   python3 src/audio.py  -> build/audio.wav (60 s, 48 kHz stereo)"""
import numpy as np, wave, os
SR, DUR = 48000, 60.0
N = int(SR * DUR); t = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N); R = np.zeros(N)

def env(a, b, att=.02, rel=.2):
    e = np.zeros(N); i0, i1 = int(a * SR), min(N, int(b * SR))
    if i1 <= i0: return e
    x = np.arange(i1 - i0) / SR; d = (i1 - i0) / SR
    e[i0:i1] = np.minimum(1, x / max(att, 1e-4)) * np.minimum(1, (d - x) / max(rel, 1e-4)); return np.clip(e, 0, 1)
def lp_fast(x, fc, n=2):
    # repeated moving-average approximation of a low-pass (fast, adequate for noise beds)
    w = max(1, int(SR / (fc * 2.2)))
    k = np.ones(w) / w
    for _ in range(n): x = np.convolve(x, k, mode='same')
    return x
def add(sig, pan=0.0, gain=1.0):
    global L, R
    L += sig * gain * np.sqrt(.5 * (1 - pan)); R += sig * gain * np.sqrt(.5 * (1 + pan))

# ---------------- music: warm lo-fi pads + soft keys, 84 BPM, Am7 - Fmaj7 - Cmaj7 - G6
bpm = 84; beat = 60 / bpm; bar = beat * 4
chords = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]]
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)
pad = np.zeros(N)
for b in range(int(DUR / bar) + 1):
    ch = chords[b % 4]; a = b * bar
    e = env(a, a + bar + .6, att=.9, rel=1.2)
    for m in ch:
        f = mtof(m)
        for det in (-.12, .12):
            pad += e * np.sin(2 * np.pi * f * (1 + det / 100) * t + rng.random() * 6) * .05
    # bass
    pad += env(a, a + bar, .05, .4) * np.sin(2 * np.pi * mtof(ch[0] - 12) * t) * .09
    # soft keys arpeggio (8ths)
    for k in range(8):
        s = a + k * beat / 2; m = ch[[0, 2, 1, 3, 2, 1, 3, 2][k]] + 12
        e2 = env(s, s + .9, .004, .85) * np.exp(-np.maximum(0, t - s) * 4) * (t >= s)
        pad += e2 * (np.sin(2 * np.pi * mtof(m) * t) + .3 * np.sin(4 * np.pi * mtof(m) * t)) * .035
music_gain = .9 * np.clip(np.minimum(t / 2.5, (DUR - t) / 3.0), 0, 1)
add(pad * music_gain, -.1); add(np.roll(pad, 600) * music_gain, .1)

# ---------------- outdoor ambience (wind + distant traffic), fades when the door closes behind us
amb = lp_fast(rng.standard_normal(N), 500) * .5 + lp_fast(rng.standard_normal(N), 120) * 1.2
amb_env = 1 - .8 * np.clip((t - 13) / 3, 0, 1)
amb_env = np.maximum(amb_env, .55 * np.clip((t - 45) / 1.2, 0, 1))      # window opens -> outside again
add(amb * amb_env * .25, -.3); add(np.roll(amb, 9000) * amb_env * .25, .3)
# interior room tone + fridge hum
hum = (np.sin(2 * np.pi * 50 * t) * .4 + np.sin(2 * np.pi * 100 * t) * .2 + lp_fast(rng.standard_normal(N), 300) * .3) * np.clip((t - 12) / 2, 0, 1) * .03
add(hum)

# ---------------- footsteps
def step(at, gain=1.0, pan=0.0):
    n = int(.12 * SR); i = int(at * SR)
    if i + n > N: return
    x = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 45)
    x = np.convolve(x, np.ones(18) / 18, 'same') + np.sin(2 * np.pi * 90 * np.arange(n) / SR) * np.exp(-np.arange(n) / SR * 30) * .8
    s = np.zeros(N); s[i:i + n] = x; add(s, pan, .22 * gain)
for k, a in enumerate(np.arange(9.9, 15.0, .52)): step(a, .9 if a < 12.4 else 1.0, (-1) ** k * .15)
for a0, a1 in ((19.7, 22.0), (25.2, 27.6), (30.8, 32.6), (43.9, 46.0), (52.2, 53.0)):
    for k, a in enumerate(np.arange(a0, a1, .55)): step(a, .7, (-1) ** k * .15)

# ---------------- door: latch click, swing whoosh, close thud
def click(at, f=2400, gain=.4, pan=0.):
    n = int(.05 * SR); i = int(at * SR); x = rng.standard_normal(n) * np.exp(-np.arange(n) / SR * 160) + np.sin(2 * np.pi * f * np.arange(n) / SR) * np.exp(-np.arange(n) / SR * 120)
    s = np.zeros(N); s[i:i + n] = x; add(s, pan, gain)
click(10.6); click(10.75, 1800, .3)
add(lp_fast(rng.standard_normal(N), 900) * env(10.8, 12.1, .3, .5) * .35)
click(16.75, 600, .6); add(np.sin(2 * np.pi * 70 * t) * np.exp(-np.maximum(0, t - 16.75) * 18) * (t >= 16.75) * .35)
# ---------------- espresso machine: steam hiss + pump hum while we look at it
add(lp_fast(rng.standard_normal(N), 6000, 1) * env(22.6, 25.8, .4, .8) * .05, -.2)
add(np.sin(2 * np.pi * 120 * t) * env(23.0, 26.0, .3, .5) * .03, -.2)
# ---------------- car approaching and idling
eng = np.zeros(N); rpm = 32 + 14 * np.clip((t - 40.2) / 6, 0, 1)
ph = np.cumsum(2 * np.pi * rpm / SR)
eng = (np.sin(ph) + .5 * np.sin(2 * ph) + .3 * np.sin(3.1 * ph)) * .5 + lp_fast(rng.standard_normal(N), 180) * .6
car_env = np.clip((t - 40.0) / 5.5, 0, 1) ** 1.6 * (1 - .45 * np.clip((t - 46.4) / 1.2, 0, 1)) * np.clip((58.5 - t) / 2, 0, 1)
add(eng * car_env * .12, .25)
# ---------------- sliding window
add(lp_fast(rng.standard_normal(N), 1400) * env(44.6, 46.0, .15, .3) * .28, .1); click(46.0, 900, .45, .1)
# ---------------- POS order chime (two-tone) + ready chime
def chime(at, notes, gain=.22):
    for k, m in enumerate(notes):
        s0 = at + k * .16; e = (t >= s0) * np.exp(-np.maximum(0, t - s0) * 3.5)
        add((np.sin(2 * np.pi * mtof(m) * t) + .25 * np.sin(2 * np.pi * mtof(m) * 2.01 * t)) * e, 0, gain)
chime(47.6, [88, 84]); chime(51.0, [84, 88, 91], .16)
# ---------------- tray slide + hand-off, end whoosh
add(lp_fast(rng.standard_normal(N), 2500) * env(51.3, 53.5, .3, .5) * .12)
add(lp_fast(rng.standard_normal(N), 3000) * env(55.4, 57.0, .8, .9) * .18)

# ---------------- master: gentle limiter, normalise to -1 dBFS
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.4) / 1.4
mix *= (10 ** (-1 / 20)) / np.max(np.abs(mix))
fade = np.clip((DUR - t) / 1.5, 0, 1)[:, None]; mix *= fade
os.makedirs('build', exist_ok=True)
with wave.open('build/audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('build/audio.wav', DUR, 's')
