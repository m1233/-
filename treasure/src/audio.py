#!/usr/bin/env python3
"""Calm background music + sound effects + voice mix, and the lip-sync envelope.
Inputs : build/voice.wav, build/timeline.json, assets/sfx_*.mp3 (Halai/ElevenLabs SFX)
Outputs: build/mix.wav, build/music_sfx.wav, build/mouth.json"""
import json, os, subprocess, wave
import numpy as np
from scipy.signal import lfilter, butter, sosfilt

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = os.path.join(ROOT, "build")
SR = 48000
FPS = 25
TL = json.load(open(os.path.join(B, "timeline.json"), encoding="utf-8"))
DUR = TL["duration"] + 0.5
N = int(DUR * SR)
rs = np.random.RandomState(7)


def read_wav(p):
    with wave.open(p) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2: a = a.reshape(-1, 2).mean(1)
    return a


def write_wav(p, a):
    a = np.clip(a, -1, 1)
    st = a if a.ndim == 2 else np.stack([a, a], 1)
    with wave.open(p, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype(np.int16).tobytes())


def load_mp3(name):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(ROOT, "assets", name), "-f", "s16le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768


def mix_(*a):
    n = max(len(x) for x in a); o = np.zeros(n, np.float32)
    for x in a: o[:len(x)] += x
    return o


def t_(d): return np.arange(int(d * SR)) / SR
def env_adsr(n, a=0.01, r=0.3):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / max(r, 1e-4)); return e
def lp(x, f, order=2): return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)
def noise(d): return rs.randn(int(d * SR)).astype(np.float32)
def mtof(m): return 440 * 2 ** ((m - 69) / 12)


def bell(f, d=1.6, amp=1.0):
    t = t_(d)
    s = (np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 5)
         + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 9) + 0.15 * np.sin(2 * np.pi * f * 8.9 * t) * np.exp(-t * 14))
    return (s * np.minimum(1, t / 0.003) * amp).astype(np.float32)


# ------------------------------------------------------------------ SFX library
WHOOSH = load_mp3("sfx_whoosh.mp3"); LEVELUP = load_mp3("sfx_levelup.mp3"); CELEB = load_mp3("sfx_celebrate.mp3")


def sweep_noise(d, f0, f1, q=0.5):
    x = noise(d); n = len(x); out = np.zeros(n, np.float32); blk = 2048
    for i in range(0, n, blk):
        k = i / n; f = f0 * (f1 / f0) ** k
        out[i:i + blk] = bp(x[i:i + blk + 0], max(30, f * (1 - q)), min(20000, f * (1 + q)))[: len(out[i:i + blk])]
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5
    return out * e


def sfx(name, length=None):
    if name in ("whoosh", "spin_whoosh"):
        return WHOOSH * (0.8 if name == "whoosh" else 0.9)
    if name == "grand_whoosh":
        low = lp(noise(2.6), 300) * np.sin(np.pi * np.linspace(0, 1, int(2.6 * SR))) * 0.6
        out = np.zeros(int(2.6 * SR), np.float32); out[: len(WHOOSH)] += WHOOSH[: len(out)]; out += low
        return out
    if name == "ocean_transition":
        d = 2.4; t = t_(d)
        low = lp(noise(d), 500) * np.sin(np.pi * t / d) ** 2 * 0.9
        bub = np.zeros(len(t), np.float32)
        for i in range(10):
            s = int(rs.uniform(0.3, 1.8) * SR); f = rs.uniform(300, 900); dd = 0.08
            tt = t_(dd); bub[s:s + len(tt)] += np.sin(2 * np.pi * (f + 3000 * tt) * tt) * np.exp(-tt * 40) * 0.4
        return low + bub
    if name == "gift_open":
        d = 1.2; t = t_(d)
        pop = lp(noise(0.12), 900) * np.exp(-t_(0.12) * 30) * 1.2
        out = np.zeros(len(t), np.float32); out[: len(pop)] += pop
        for i, m in enumerate([72, 76, 79, 84, 88]): b = bell(mtof(m), 1.0, 0.35); s = int((0.15 + i * 0.07) * SR); out[s:s + len(b)] += b[: len(out) - s]
        return out
    if name == "chime_burst":
        return LEVELUP * 0.9
    if name in ("sparkle", "shimmer", "twinkle"):
        d = 2.0 if name != "shimmer" else 3.0; out = np.zeros(int(d * SR), np.float32)
        k = 9 if name == "sparkle" else (6 if name == "twinkle" else 16)
        for i in range(k):
            m = rs.choice([84, 86, 88, 91, 93, 96, 98]) if name != "twinkle" else 84 + i * 3
            b = bell(mtof(m), 1.0, 0.22); s = int((i * (d * 0.7 / k) + rs.uniform(0, 0.05)) * SR)
            out[s:s + len(b)] += b[: len(out) - s]
        return out
    if name == "waves":
        d = length or 10; t = t_(d)
        x = lp(noise(d), 900) * 0.7 + hp(noise(d), 3000) * 0.08
        sw = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * t / 5.5 - 1.5)) ** 2
        fade = np.minimum(1, np.minimum(t / 1.5, (d - t) / 1.5))
        return x * sw * fade * 0.5
    if name == "footsteps":
        d = length or 6; out = np.zeros(int(d * SR), np.float32)
        for i in range(int(d * 1.9)):
            s = int(i / 1.9 * SR); st = bp(noise(0.12), 400, 2500) * np.exp(-t_(0.12) * 35) * 0.5
            out[s:s + len(st)] += st[: len(out) - s]
        return out
    if name == "paper":
        d = 1.4; x = hp(noise(d), 1500); g = np.zeros_like(x)
        for i in range(26):
            s = int(rs.uniform(0, d - 0.06) * SR); g[s:s + int(0.03 * SR)] += rs.uniform(0.3, 1)
        g = lp(g, 60); return x * g * 0.6
    if name == "giggles":  # soft playful marimba motif (stands in for distant laughter)
        out = np.zeros(int(2.0 * SR), np.float32)
        for i, m in enumerate([79, 83, 86, 83, 88]):
            b = bell(mtof(m), 0.6, 0.12); s = int(i * 0.16 * SR); out[s:s + len(b)] += b[: len(out) - s]
        return out
    if name == "shield_hum":
        d = 3.0; t = t_(d)
        x = sum(np.sin(2 * np.pi * f * t) for f in (110, 165, 220, 330)) * 0.12
        x *= np.sin(np.pi * t / d) ** 2 * (1 + 0.2 * np.sin(2 * np.pi * 5 * t))
        return x + sfx("shimmer")[: len(x)] * 0.4
    if name == "stop_hit":
        d = 0.9; t = t_(d)
        th = np.sin(2 * np.pi * (90 * np.exp(-t * 6) + 50) * t) * np.exp(-t * 8) * 0.9
        tick = bell(mtof(91), d, 0.25)[: len(t)]
        return th + tick
    if name in ("warm_whisper", "magic_hum", "soothing"):
        d = 3.5; t = t_(d)
        x = lp(noise(d), 1800) * 0.12 if name == "warm_whisper" else 0
        ch = sum(np.sin(2 * np.pi * mtof(m) * t) for m in (60, 64, 67, 71)) * 0.07
        return (x + ch) * np.sin(np.pi * t / d) ** 2
    if name == "pages":
        out = np.zeros(int(1.6 * SR), np.float32)
        for i in range(4):
            fl = hp(noise(0.18), 2000) * np.sin(np.pi * np.linspace(0, 1, int(0.18 * SR))) * 0.4
            s = int(i * 0.32 * SR); out[s:s + len(fl)] += fl
        return out
    if name == "pencil":
        d = length or 5; x = bp(noise(d), 2500, 7000) * 0.25
        g = (np.sin(2 * np.pi * 7 * t_(d)) > 0.2).astype(np.float32)
        g = lp(g, 40); return x * g * np.minimum(1, np.minimum(t_(d) / 0.3, (d - t_(d)) / 0.3))
    if name == "ting":
        return mix_(bell(mtof(96), 1.8, 0.6), bell(mtof(103), 1.4, 0.25))
    if name == "breeze":
        d = length or 10; t = t_(d)
        x = bp(noise(d), 200, 1200) * (0.5 + 0.5 * np.sin(2 * np.pi * t / 4)) * 0.35
        return x * np.minimum(1, np.minimum(t / 2, (d - t) / 2))
    if name == "bounce":
        d = 0.45; t = t_(d)
        f = 520 * np.exp(-t * 4) + 180
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * 0.35
    if name == "heartbeat":
        d = length or 4; out = np.zeros(int(d * SR), np.float32)
        for i in range(int(d / 0.9)):
            for off, a in ((0, 1), (0.22, 0.7)):
                tt = t_(0.18); b = np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 22) * a * 0.8
                s = int((i * 0.9 + off) * SR); out[s:s + len(b)] += b[: len(out) - s]
        return out
    if name == "water":
        d = length or 4; t = t_(d)
        x = bp(noise(d), 800, 5000) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t + np.sin(2 * np.pi * 1.3 * t) * 3)) * 0.18
        return x * np.minimum(1, np.minimum(t / 0.4, (d - t) / 0.6))
    if name == "bubbles":
        out = np.zeros(int(2.0 * SR), np.float32)
        for i in range(8):
            tt = t_(0.07); f = rs.uniform(500, 1200)
            b = np.sin(2 * np.pi * (f + 6000 * tt) * tt) * np.exp(-tt * 45) * 0.35
            s = int(rs.uniform(0, 1.8) * SR); out[s:s + len(b)] += b
        return out
    if name == "bell":
        return mix_(bell(mtof(88), 2.5, 0.5), bell(mtof(95), 2.0, 0.3), bell(mtof(100), 1.6, 0.2))
    if name == "music_in":
        return np.zeros(10, np.float32)
    raise KeyError(name)


SFX_GAIN = {"waves": 0.55, "footsteps": 0.5, "breeze": 0.5, "pencil": 0.45, "water": 0.6, "heartbeat": 0.7, "whoosh": 0.55, "spin_whoosh": 0.55,
            "grand_whoosh": 0.55, "chime_burst": 0.5, "gift_open": 0.6, "ting": 0.5, "bell": 0.5, "stop_hit": 0.75}


# ------------------------------------------------------------------ music
def scene_bounds():
    s = {}
    for b in TL["beats"]:
        s.setdefault(b["scene"], [b["start"], b["end"]]); s[b["scene"]][1] = b["end"]
    return s


def music():
    sb = scene_bounds()
    bpm = 72; beat = 60 / bpm; bar = beat * 4
    prog = [[53, 57, 60, 64], [48, 52, 55, 59], [50, 53, 57, 60], [46, 50, 53, 57]]  # Fmaj7 Cmaj7 Dm7 Bbmaj7
    out = np.zeros((N, 2), np.float32)
    nbars = int(DUR / bar) + 2

    def level(t):  # arrangement density 0..1 by scene
        for name, lv in (("title", 0.75), ("beach", 0.35), ("islands", 0.85), ("protection", 0.7), ("education", 0.8), ("play", 0.9),
                         ("health", 0.7), ("respect", 0.5), ("finale", 1.0)):
            a, b = sb.get(name, (0, 0))
            if a <= t < b: return name, lv
        return "finale", 1.0

    for bi in range(nbars):
        t0 = bi * bar; ch = prog[bi % 4]
        if t0 > DUR: break
        sc, lv = level(t0)
        # pad
        d = bar + 0.6; t = t_(d)
        pad = np.zeros(len(t), np.float32)
        for m in ch:
            f = mtof(m + 12)
            for det in (-0.12, 0.12):
                ph = 2 * np.pi * f * (1 + det / 100) * t
                pad += (np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.1 * np.sin(3 * ph)) * 0.02
        pad *= np.minimum(1, t / 0.9) * np.minimum(1, (d - t) / 0.6)
        pad = lp(pad, 2200)
        i0 = int(t0 * SR); seg = slice(i0, min(N, i0 + len(pad)))
        L = seg.stop - seg.start
        out[seg, 0] += pad[:L] * (0.55 + 0.45 * lv); out[seg, 1] += pad[:L] * (0.55 + 0.45 * lv)
        # bass
        if lv >= 0.5:
            for k in (0, 2):
                tb = t_(beat * 2); bs = np.sin(2 * np.pi * mtof(ch[0] - 12) * tb) * env_adsr(len(tb), 0.02, 1.2) * 0.09 * lv
                j = int((t0 + k * beat) * SR); L2 = min(len(bs), N - j)
                if L2 > 0: out[j:j + L2] += bs[:L2, None]
        # music box arpeggio
        dens = 8 if lv >= 0.8 else (4 if lv >= 0.5 else 2)
        if sc == "respect": dens = 4
        pattern = [0, 2, 1, 3, 2, 1, 3, 2]
        for k in range(dens):
            m = ch[pattern[k % 8]] + 24 + (12 if (sc in ("title", "finale") and k % 4 == 3) else 0)
            b = bell(mtof(m), 1.4, 0.05 * (0.6 + 0.4 * lv))
            j = int((t0 + k * bar / dens) * SR); L2 = min(len(b), N - j)
            pan = 0.5 + 0.35 * np.sin(k * 1.3 + bi)
            if L2 > 0: out[j:j + L2, 0] += b[:L2] * (1 - pan) * 1.4; out[j:j + L2, 1] += b[:L2] * pan * 1.4
    # gentle reverb-ish smear (two feedback delays)
    for dl, g in ((0.29, 0.28), (0.43, 0.2)):
        d = int(dl * SR)
        for c in range(2):
            y = out[:, c].copy()
            for i in range(d, len(y), d): y[i:i + d] += g * y[i - d:i][: len(y[i:i + d])]
            out[:, c] = out[:, c] * 0.7 + lp(y, 3500) * 0.3
    # overall fades
    tt = np.arange(N) / SR
    out *= np.minimum(1, tt / 2.0)[:, None] * np.minimum(1, (DUR - tt) / 4.0)[:, None]
    return out


# ------------------------------------------------------------------ build
voice = read_wav(os.path.join(B, "voice.wav"))
voice = np.pad(voice, (0, max(0, N - len(voice))))[:N]

mus = music()
# ducking under the voice
venv = lp(np.abs(voice), 6, 1)
venv = venv / (venv.max() or 1)
duck = 1 - 0.55 * np.clip(venv * 6, 0, 1)
duck = lp(duck, 3, 1)
mus *= duck[:, None]

fx = np.zeros((N, 2), np.float32)
for b in TL["beats"]:
    for c in b["sfx"]:
        try:
            s = sfx(c["name"], c.get("len"))
        except KeyError:
            print("unknown sfx", c["name"]); continue
        s = s * SFX_GAIN.get(c["name"], 0.6)
        i = int(c["t"] * SR); L = min(len(s), N - i)
        if L <= 0: continue
        pan = 0.5 + 0.15 * np.sin(c["t"])
        fx[i:i + L, 0] += s[:L] * (1 - pan) * 1.6; fx[i:i + L, 1] += s[:L] * pan * 1.6

bed = mus * 0.85 + fx * 0.8
mix = bed + voice[:, None] * 1.0
peak = np.abs(mix).max()
mix = mix / peak * 0.93; bed = bed / peak * 0.93
write_wav(os.path.join(B, "mix.wav"), mix)
write_wav(os.path.join(B, "music_sfx.wav"), bed)

# lip-sync envelope per video frame (0..1)
hop = SR // FPS
nf = int(TL["duration"] * FPS) + 2
v = np.pad(voice, (0, nf * hop))
rms = np.array([np.sqrt(np.mean(v[i * hop:(i + 1) * hop] ** 2)) for i in range(nf)])
rms = rms / (np.percentile(rms[rms > 0.005], 95) if (rms > 0.005).any() else 1)
m = np.clip((rms - 0.08) * 1.4, 0, 1)
m = np.convolve(m, [0.25, 0.5, 0.25], mode="same")
json.dump([round(float(x), 3) for x in m], open(os.path.join(B, "mouth.json"), "w"))
print(f"audio: {DUR:.1f}s mix, {nf} mouth frames")
