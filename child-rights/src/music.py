#!/usr/bin/env python3
"""
Procedural children's game soundtrack and SFX, synthesised from scratch with numpy.

* A cheerful tune in C major at 100 BPM (I–vi–IV–V), made of a music box,
  a soft lead, pad, bass and light drums.
* Each layer has its own volume over time that follows the story
  (intro, narration, missions, win, calm finale).
* The music ducks automatically under the guide's voice (sidechain from voice.wav).
* Game SFX are placed on the cues in plan.json: start press, whooshes, title
  pops, coins, level-up jingles and confetti.
* The ending is a calm, slowly rising music-box coda, with a smooth fade-out at 420 s.

Outputs: build/music.wav, build/mix.wav, output/music-only.mp3, output/full-mix.mp3
"""
import json, os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD, OUT = os.path.join(ROOT, "build"), os.path.join(ROOT, "output")
SR, T = 48000, 420.0
N = int(SR * T)
BPM = 100.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)
PLAN = json.load(open(os.path.join(BUILD, "plan.json"), encoding="utf-8"))


def hz(m):  # midi -> Hz
    return 440.0 * 2 ** ((m - 69) / 12)


def add(buf, t0, sig, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf) or i + len(sig) <= 0:
        return
    j0 = max(0, -i)
    seg = sig[j0:len(buf) - i] if i + len(sig) > len(buf) else sig[j0:]
    buf[i + j0:i + j0 + len(seg)] += seg * gain


def tt(d):
    return np.arange(int(d * SR)) / SR


def adsr(n, a, d, s, r, total):
    t = np.arange(n) / SR
    env = np.where(t < a, t / max(a, 1e-4), np.where(t < a + d, 1 - (1 - s) * (t - a) / d, s))
    rel = total - r
    env = np.where(t > rel, env * np.clip(1 - (t - rel) / r, 0, 1), env)
    return env


# ---------------- instruments ----------------
def music_box(f, d=1.2):
    t = tt(d)
    s = np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 6) \
        + .18 * np.sin(2 * np.pi * 3.01 * f * t) * np.exp(-t * 9) + .08 * np.sin(2 * np.pi * 4.2 * f * t) * np.exp(-t * 12)
    return s * np.exp(-t * 3.2) * np.minimum(1, t / .003)


def lead(f, d):
    t = tt(d + .15)
    vib = 1 + .004 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / .25)
    ph = 2 * np.pi * f * np.cumsum(vib) / SR
    s = np.sin(ph) + np.sin(3 * ph) / 9 - np.sin(5 * ph) / 25 + .25 * np.sin(2 * ph)
    return s * adsr(len(t), .015, .12, .65, .12, d + .15)


def pad(fs, d):
    t = tt(d + .8)
    s = sum(np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 1.004 * t) + .5 * np.sin(2 * np.pi * f * .996 * t)
            + .15 * np.sin(2 * np.pi * 2 * f * t) for f in fs)
    return s / (len(fs) * 2) * adsr(len(t), .5, .3, .8, .8, d + .8)


def bass(f, d):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + .3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 2.5) * np.minimum(1, t / .005) * \
        np.clip((d - t) / .03, 0, 1)


def kick():
    t = tt(.35)
    f = 45 + 80 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 12)


def snare():
    t = tt(.25)
    n = rng.standard_normal(len(t))
    n = np.diff(np.concatenate([[0], n]))
    return .5 * n * np.exp(-t * 20) + .4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 28)


def hat():
    t = tt(.06)
    n = np.diff(np.concatenate([[0], rng.standard_normal(len(t))]))
    return n * np.exp(-t * 70)


# ---------------- SFX ----------------
def sfx_click():
    t = tt(.08)
    return np.sin(2 * np.pi * (900 + 600 * np.exp(-t * 60)) * t) * np.exp(-t * 45)


def sfx_pop():
    t = tt(.14)
    f = 350 + 900 * (t / .14)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 25)


def sfx_coin():
    a, b = tt(.07), tt(.35)
    sq = lambda f, t: np.tanh(3 * np.sin(2 * np.pi * f * t))
    return np.concatenate([sq(988, a) * .6, sq(1319, b) * np.exp(-b * 9) * .6])


def sfx_whoosh(d=1.0, up=True):
    n = rng.standard_normal(int(d * SR))
    t = np.arange(len(n)) / SR
    k = np.sin(np.pi * t / d) ** 2
    # one-pole low-pass whose cutoff sweeps (vectorised in blocks)
    out, y = np.zeros_like(n), 0.0
    blk = 256
    for i in range(0, len(n), blk):
        x = t[i] / d
        a = .02 + .25 * (x if up else 1 - x)
        for j in range(i, min(i + blk, len(n))):
            y += a * (n[j] - y); out[j] = y
    return out * k * 2.2


def sfx_levelup():
    s = np.zeros(int(1.6 * SR))
    for i, m in enumerate([72, 76, 79, 84, 88]):
        add(s, i * .09, music_box(hz(m), 1.2), .5)
    add(s, .5, music_box(hz(91), 1.1), .35)
    return s


def sfx_powerup():
    s = np.zeros(int(1.2 * SR))
    for i, m in enumerate([60, 64, 67, 72, 76, 79, 84]):
        add(s, i * .06, lead(hz(m), .1), .35)
    return s


def sfx_confetti():
    t = tt(.5)
    n = rng.standard_normal(len(t)) * np.exp(-t * 14)
    s = n * .4
    for i in range(8):
        add(s, .02 + i * .045, music_box(hz(84 + (i * 5) % 12), .4), .18)
    return s


# ---------------- arrangement ----------------
PROG_A = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]]  # C Am F G
PROG_B = [[41, 45, 48], [43, 47, 50], [40, 43, 47], [45, 48, 52]]  # F G Em Am
SCALE = [0, 2, 4, 5, 7, 9, 11]


def chord_at(bar):
    phrase = (bar // 8) % 4
    prog = PROG_B if phrase == 2 else PROG_A
    return prog[bar % 4]


def motif(seed):
    r = np.random.default_rng(seed)
    rhythms = [[0, 1, 2, 3, 4, 6], [0, 2, 3, 4, 6], [0, 1, 2, 4, 5, 6], [0, 2, 4, 5, 6, 7], [0, 3, 4, 6]]
    bars = []
    for b in range(4):
        rh = rhythms[r.integers(len(rhythms))]
        steps = list(np.cumsum(r.choice([-1, 1, 1, 2, -2, 0], size=len(rh))))
        bars.append((rh, steps))
    return bars


MOTIFS = {"A": motif(11), "B": motif(23)}


def automation(points):
    """piece-wise linear gain curve from [(t, g), ...]"""
    ts = np.array([p[0] for p in points]); gs = np.array([p[1] for p in points])
    return np.interp(np.arange(N) / SR, ts, gs).astype(np.float32)


def build():
    L = {k: np.zeros(N, np.float32) for k in ("box", "lead", "pad", "bass", "kick", "snare", "hat", "sfx")}
    nbars = int(T / BAR) + 1
    for bar in range(nbars):
        t0 = bar * BAR
        ch = chord_at(bar)
        add(L["pad"], t0, pad([hz(m + 12) for m in ch], BAR), .5)
        root = ch[0]
        for b, m in enumerate([root, root + 7, root + 12, root + 7]):
            add(L["bass"], t0 + b * BEAT, bass(hz(m - 12 if m > 50 else m), BEAT * .9), .55)
        # music-box arpeggio (8ths)
        arp = [ch[0] + 24, ch[1] + 24, ch[2] + 24, ch[1] + 24 + 12, ch[2] + 24, ch[1] + 24, ch[0] + 36, ch[2] + 24]
        for k, m in enumerate(arp):
            add(L["box"], t0 + k * BEAT / 2, music_box(hz(m), 1.0), .32)
        # lead melody: AABA motifs on chord-tone-anchored scale walk
        sec = "B" if (bar // 4) % 4 == 2 else "A"
        rh, steps = MOTIFS[sec][bar % 4]
        base_deg = {48: 0, 45: 5, 41: 3, 43: 4, 40: 2}[ch[0]] + 7
        for k, (pos, st) in enumerate(zip(rh, steps)):
            deg = base_deg + int(st)
            m = 60 + 12 * (deg // 7) + SCALE[deg % 7]
            nxt = rh[k + 1] if k + 1 < len(rh) else 8
            add(L["lead"], t0 + pos * BEAT / 2, lead(hz(m), (nxt - pos) * BEAT / 2 * .9), .3)
        # drums
        for b in range(4):
            if b in (0, 2): add(L["kick"], t0 + b * BEAT, kick(), .55)
            if b in (1, 3): add(L["snare"], t0 + b * BEAT, snare(), .22)
        for e in range(8):
            add(L["hat"], t0 + e * BEAT / 2, hat(), .10 if e % 2 else .16)

    P = PLAN
    # ---- per-layer automation (time, gain) ----
    st = P["start"]
    narr_parts, miss_parts = [], []
    box_pts = [(0, .0), (1.5, .8), (6, .8)]
    lead_pts = [(0, 0), (st["mapIn"] - 1, 0), (st["mapIn"] + 1, .55), (st["dive"] + 3, .55), (st["dive"] + 4.5, 0)]
    drum_pts = [(0, 0), (5.0, 0), (5.3, .45), (st["mapIn"], .45), (st["mapIn"] + 1, .8), (59.5, .8), (61, .4)]
    for l in P["levels"]:
        S, M, C = l["S"], l["mission"], l["complete"]
        lead_pts += [(M - 1, 0), (M + 1, .55), (C - .5, .55), (C, 0), (l["leave"], 0), (l["leave"] + 1, .5), (l["next"] + 2.5, .5), (l["next"] + 4, 0)]
        drum_pts += [(M - 1, .45), (M + 1, .8), (C, .8), (C + 1, .45), (l["leave"], .45), (l["leave"] + 1, .8), (l["next"] + 2, .8), (l["next"] + 3, .45)]
    W, F = P["win"], P["final"]
    lead_pts += [(W - 1, 0), (W, .6), (F - 1, .6), (F, 0), (T, 0)]
    drum_pts += [(W - 1, .45), (W, .9), (F - 1.5, .9), (F, 0), (T, 0)]
    box_pts += [(F - 1, .8), (F, .55), (T - 3, 1.0), (T, 0)]          # calm coda rises, then fades
    pad_pts = [(0, 0), (2, .9), (F, .9), (F + 1, .7), (T - 3, 1.15), (T, 0)]
    bass_pts = [(0, 0), (5, 0), (5.5, .8), (F - 1, .8), (F + 1, 0), (T, 0)]

    lead_pts.sort(key=lambda p: p[0]); drum_pts.sort(key=lambda p: p[0])
    G = {"box": automation(box_pts), "lead": automation(lead_pts), "pad": automation(pad_pts),
         "bass": automation(bass_pts), "kick": automation(drum_pts), "snare": automation(drum_pts), "hat": automation(drum_pts)}
    music = sum(L[k] * G[k] for k in G)

    # ---- sidechain ducking from the guide's voice ----
    vx = read_wav(os.path.join(BUILD, "voice.wav"))
    hop = SR // 100
    rms = np.sqrt(np.convolve(vx[:N] ** 2, np.ones(hop) / hop, "same"))[::hop]
    act = (rms > 0.01).astype(float)
    env = np.zeros_like(act); y = 0
    for i, a in enumerate(act):  # attack 60 ms, release 450 ms
        y = y + (a - y) * (0.17 if a > y else 0.022); env[i] = y
    duck = np.interp(np.arange(N) / SR, np.arange(len(env)) / 100, 1 - 0.62 * env)
    music *= duck

    # ---- SFX on scene cues ----
    sfx = L["sfx"]
    add(sfx, st["portal"], sfx_whoosh(2.2, True), .25)
    add(sfx, st["title"], sfx_pop(), .4)
    add(sfx, st["button"], sfx_pop(), .3)
    add(sfx, st["press"], sfx_click(), .6)
    add(sfx, st["press"] + .05, sfx_powerup(), .5)
    for k, tm in enumerate(st["mapNodes"]):
        add(sfx, tm, sfx_pop(), .3)
    add(sfx, st["unlock1"], sfx_levelup(), .45)
    add(sfx, st["dive"] + 1.5, sfx_whoosh(1.4, False), .45)
    for l in P["levels"]:
        add(sfx, l["titleIn"], sfx_pop(), .35)
        add(sfx, l["mission"], sfx_pop(), .3)
        for it in l["items"]:
            add(sfx, it, sfx_pop(), .25)
            add(sfx, it + l["collectDelay"] + .5, sfx_coin(), .3)
        add(sfx, l["complete"], sfx_levelup(), .55)
        add(sfx, l["complete"] + 1.0, sfx_confetti(), .35)
        add(sfx, l["leave"] + .5, sfx_whoosh(3.0, True), .35)
    add(sfx, W - 3.5, sfx_whoosh(3.0, True), .35)
    add(sfx, W, sfx_confetti(), .55); add(sfx, W + .2, sfx_levelup(), .5)
    add(sfx, F - .5, sfx_whoosh(2.0, False), .2)

    music = music * .5 + sfx * .55
    return music, vx


def read_wav(p):
    with wave.open(p) as w:
        assert w.getframerate() == SR
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2: x = x[::2]
    out = np.zeros(N, np.float32); out[:min(N, len(x))] = x[:N]
    return out


def write_wav(p, x):
    x = np.clip(x, -1, 1)
    with wave.open(p, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())


def ff(*a):
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *a], check=True)


if __name__ == "__main__":
    music, voice = build()
    fade = np.ones(N, np.float32); fs = int(PLAN["fadeOut"] * SR)
    fade[fs:] = np.linspace(1, 0, N - fs) ** 1.5
    music *= fade
    peak = np.abs(music).max(); music = music / peak * .5
    write_wav(os.path.join(BUILD, "music.wav"), music)
    mix = voice * 1.0 + music * .55
    write_wav(os.path.join(BUILD, "mix_raw.wav"), mix / max(1, np.abs(mix).max()))
    # loudness: -14 LUFS (TikTok), true peak -1.5 dB, with the final fade kept
    ff("-i", os.path.join(BUILD, "mix_raw.wav"), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000",
       "-ar", "48000", "-ac", "2", "-t", "420", os.path.join(BUILD, "mix.wav"))
    ff("-i", os.path.join(BUILD, "mix.wav"), "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, "full-mix-audio.mp3"))
    ff("-i", os.path.join(BUILD, "music.wav"), "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "48000",
       "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, "music-and-sfx-only.mp3"))
    ff("-i", os.path.join(BUILD, "voice.wav"), "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "48000",
       "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, "voice-only.mp3"))
    print("music/mix written")
