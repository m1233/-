#!/usr/bin/env python3
"""Synthesize the Fusha narration beat by beat, make it sound younger, and
write build/timeline.json (beat + word timings) and build/voice.wav."""
import asyncio, json, os, subprocess, sys, wave
import numpy as np
import edge_tts

_CA = "/root/.ccr/ca-bundle.crt"  # cloud-session TLS proxy; verification stays on
if os.path.exists(_CA):
    import ssl, edge_tts.communicate as _c
    _c._SSL_CTX = ssl.create_default_context(cafile=_CA)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "config", "script.json"), encoding="utf-8"))
BUILD = os.path.join(ROOT, "build"); os.makedirs(os.path.join(BUILD, "vo"), exist_ok=True)
SR = 48000


def norm(s):
    import re
    s = re.sub(r"[\u064B-\u0652\u0670\u0640]", "", s)
    s = re.sub(r"[،,.!؟?:\"«»]", "", s)
    return s.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا").replace("ة", "ه").replace("ى", "ي").replace("ؤ", "و").replace("ئ", "ي")
V = CFG["voice"]


async def synth(beat):
    mp3 = os.path.join(BUILD, "vo", beat["id"] + ".mp3")
    js = os.path.join(BUILD, "vo", beat["id"] + ".json")
    if os.path.exists(mp3) and os.path.exists(js) and "--force" not in sys.argv:
        return json.load(open(js, encoding="utf-8"))
    words = []
    for attempt in range(4):
        try:
            com = edge_tts.Communicate(beat["text"], V["name"], rate=V["rate"], pitch=V["pitch"], boundary="WordBoundary")
            with open(mp3, "wb") as f:
                async for ch in com.stream():
                    if ch["type"] == "audio":
                        f.write(ch["data"])
                    elif ch["type"] == "WordBoundary":
                        words.append({"w": ch["text"], "t": ch["offset"] / 1e7, "d": ch["duration"] / 1e7})
            if words:
                break
        except Exception as e:  # network hiccup
            print("retry", beat["id"], e); words = []; await asyncio.sleep(2 ** attempt)
    if not words:
        raise SystemExit(f"TTS failed for {beat['id']}")
    json.dump(words, open(js, "w", encoding="utf-8"), ensure_ascii=False)
    return words


def to_child_wav(beat):
    """Raise pitch + formants by child_shift while keeping the duration."""
    src = os.path.join(BUILD, "vo", beat["id"] + ".mp3")
    dst = os.path.join(BUILD, "vo", beat["id"] + ".wav")
    k = V["child_shift"]
    af = (f"aresample={SR},asetrate={int(SR*k)},aresample={SR},atempo={1/k:.6f},"
          "highpass=f=90,equalizer=f=3200:t=q:w=1.2:g=2.5,"
          "silenceremove=start_periods=1:start_threshold=-50dB")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", str(SR), "-af", af, dst], check=True)
    with wave.open(dst) as w:
        a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    # trim trailing silence
    env = np.abs(a) > 0.01
    end = (len(a) - np.argmax(env[::-1])) if env.any() else len(a)
    a = a[: min(len(a), end + int(0.08 * SR))]
    return a


async def main():
    beats = CFG["beats"]
    word_lists = [await synth(b) for b in beats]
    t = 0.0
    timeline, track = [], []
    for b, words in zip(beats, word_lists):
        a = to_child_wav(b)
        dur = len(a) / SR
        start = t
        v0 = start + b["lead"]
        lead_trim = words[0]["t"] if words else 0.0  # silenceremove dropped this lead-in
        ws = [{"w": w["w"], "t": round(v0 + max(0, w["t"] - lead_trim), 3), "d": round(w["d"], 3)} for w in words]
        end = v0 + dur + b["pad"]
        sfx = []
        for cue in b.get("sfx", []):
            name, off = cue[0], cue[1]
            length = cue[2] if len(cue) > 2 else None
            if isinstance(off, str) and off.startswith("@"):
                key = norm(off[1:])
                hit = next((w for w in ws if norm(w["w"]) == key), None) or next((w for w in ws if key in norm(w["w"])), None)
                at = hit["t"] if hit else v0
            else:
                at = start + float(off)
            sfx.append({"name": name, "t": round(at, 3), "len": length})
        timeline.append({"id": b["id"], "scene": b["scene"], "start": round(start, 3), "voice": round(v0, 3),
                         "voice_end": round(v0 + dur, 3), "end": round(end, 3), "text": b["text"], "words": ws, "sfx": sfx})
        track.append((v0, a))
        t = end
    total = t
    out = np.zeros(int((total + 0.5) * SR), dtype=np.float32)
    for v0, a in track:
        i = int(v0 * SR); out[i:i + len(a)] += a
    peak = np.max(np.abs(out)) or 1
    out = out / peak * 0.89
    with wave.open(os.path.join(BUILD, "voice.wav"), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((out * 32767).astype(np.int16).tobytes())
    json.dump({"duration": round(total, 3), "beats": timeline}, open(os.path.join(BUILD, "timeline.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    print(f"narration: {len(beats)} beats, total {total:.1f}s")
    for b in timeline:
        print(f"  {b['id']:3} {b['start']:7.2f} → {b['end']:7.2f}  ({b['end']-b['start']:.1f}s, {len(b['words'])} words)")


asyncio.run(main())
