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
SR = 48000
T = json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "build", "timeline.json"), encoding="utf-8"))["duration"]
N = int(SR * T)
BPM = 100.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
rng = np.random.default_rng(7)
TL = json.load(open(os.path.join(BUILD, "timeline.json"), encoding="utf-8"))
SC = {k: v["start"] for k, v in TL["scenes"].items()}
SCENES = [SC[k] for k in ["S0", "S1", "S2", "S3", "S4", "D1", "D2", "D3", "WIN", "FIN"]]
FINAL, FADE = SC["FIN"], T - 2.5
ASSETS = os.path.join(ROOT, "assets")


def load_mp3(name):
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", os.path.join(ASSETS, name), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
    return np.frombuffer(raw, np.float32).copy()


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

    ends = {c["level"]: c["end"] for c in TL["chunks"]}
    # layer automation: soft under narration, livelier in the visual passages, calm coda
    box_pts = [(0, 0), (1.5, .8), (FINAL - 1, .8), (FINAL, .55), (T - 3, 1.0), (T, 0)]
    pad_pts = [(0, 0), (2, .9), (FINAL, .9), (FINAL + 1, .7), (T - 3, 1.15), (T, 0)]
    bass_pts = [(0, 0), (5, 0), (5.5, .8), (FINAL - 1, .8), (FINAL + 1, 0), (T, 0)]
    lead_pts, drum_pts = [(0, 0)], [(0, 0), (5, 0), (5.3, .45)]
    for c in TL["chunks"]:
        if c["level"] == "WIN": continue
        e = c["end"]
        lead_pts += [(c["start"] - 1, 0), (e + 1, 0), (e + 3, .55)]
        drum_pts += [(c["start"] - 1, .45), (e + 1, .45), (e + 3, .8)]
    for s0 in SCENES[1:-1]:
        lead_pts += [(s0 - .2, .6)]; drum_pts += [(s0 - .2, .9)]
    lead_pts += [(SC["WIN"] - 1, .55), (SC["WIN"], .65), (FINAL - 1, .65), (FINAL, 0), (T, 0)]
    drum_pts += [(SC["WIN"] - 1, .8), (SC["WIN"], .95), (FINAL - 1.5, .95), (FINAL, 0), (T, 0)]
    lead_pts.sort(); drum_pts.sort()
    G = {"box": automation(box_pts), "lead": automation(lead_pts), "pad": automation(pad_pts),
         "bass": automation(bass_pts), "kick": automation(drum_pts), "snare": automation(drum_pts), "hat": automation(drum_pts)}
    music = sum(L[k] * G[k] for k in G)
    vx = read_wav(os.path.join(BUILD, "voice.wav"))
    hop = SR // 100
    rms = np.sqrt(np.convolve(vx[:N] ** 2, np.ones(hop) / hop, "same"))[::hop]
    act = (rms > 0.01).astype(float); env = np.zeros_like(act); y = 0
    for i, a in enumerate(act):
        y = y + (a - y) * (0.17 if a > y else 0.022); env[i] = y
    music *= np.interp(np.arange(N) / SR, np.arange(len(env)) / 100, 1 - 0.62 * env)
    # SFX: Halai (ElevenLabs) whoosh / level-up / celebration + synthesized UI pops
    sfx = L["sfx"]
    whoosh, lvl, cele = load_mp3("sfx_whoosh.mp3"), load_mp3("sfx_levelup.mp3"), load_mp3("sfx_celebrate.mp3")
    for s0 in SCENES[1:]:
        add(sfx, s0 - .9, whoosh, .55)
    add(sfx, 2.4, sfx_pop(), .4); add(sfx, 3.6, sfx_pop(), .3); add(sfx, 5.0, sfx_click(), .6); add(sfx, 5.05, sfx_powerup(), .5)
    for lv in ["S1", "S2", "S3", "S4"]:
        add(sfx, ends[lv] + 2.0, lvl, .6)
    for s0 in SCENES[1:8]:
        add(sfx, s0 + 1.0, sfx_pop(), .3)
    add(sfx, SC["WIN"], cele, .7); add(sfx, SC["WIN"] + 1.0, lvl, .5)
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
    fade = np.ones(N, np.float32); fs = int(FADE * SR)
    fade[fs:] = np.linspace(1, 0, N - fs) ** 1.5
    music *= fade
    peak = np.abs(music).max(); music = music / peak * .5
    write_wav(os.path.join(BUILD, "music.wav"), music)
    mix = voice * 1.0 + music * .55
    write_wav(os.path.join(BUILD, "mix_raw.wav"), mix / max(1, np.abs(mix).max()))
    # loudness: -14 LUFS (TikTok), true peak -1.5 dB, with the final fade kept
    ff("-i", os.path.join(BUILD, "mix_raw.wav"), "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000",
       "-ar", "48000", "-ac", "2", "-t", str(T), os.path.join(BUILD, "mix.wav"))
    ff("-i", os.path.join(BUILD, "mix.wav"), "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, "full-mix.mp3"))
    ff("-i", os.path.join(BUILD, "music.wav"), "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "48000",
       "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, "music-and-sfx.mp3"))
    ff("-i", os.path.join(BUILD, "voice.wav"), "-af", "loudnorm=I=-16:TP=-1.5", "-ar", "48000",
       "-c:a", "libmp3lame", "-b:a", "192k", os.path.join(OUT, "voice.mp3"))
    print("music/mix written")
