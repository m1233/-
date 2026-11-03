#!/usr/bin/env python3
"""
Place the Halai (ElevenLabs) voice take on the 420 s timeline.

1. Split the single take into its 9 paragraphs at the pauses nearest each
   paragraph's expected position (by character share).
2. Estimate per-word timestamps: synthesise the same paragraph with edge-tts
   (silently, timing only) and scale its word offsets onto the real take's span.
3. Place each paragraph at its scene cue and export build/voice.wav + build/timeline.json.
"""
import asyncio, json, os, re, subprocess
import certifi
if os.path.exists("/root/.ccr/ca-bundle.crt"):
    certifi.where = lambda: "/root/.ccr/ca-bundle.crt"
import edge_tts  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B, A = os.path.join(ROOT, "build"), os.path.join(ROOT, "assets")
SR, TOTAL = 48000, 420.0
TAKE = os.path.join(A, "voice_halai.mp3")
# paragraph id, scene, start cue (s)
CUES = [("intro", "S0", 6.0), ("edu", "S1", 63.0), ("health", "S2", 108.0), ("play", "S3", 153.0), ("safe", "S4", 198.0),
        ("morning", "D1", 243.0), ("evening", "D2", 283.0), ("home", "D3", 323.0), ("win", "WIN", 363.0)]


def ff(*a):
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *a], check=True)


def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))


def silences(path, db=-38, d=.25):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", f"silencedetect=noise={db}dB:d={d}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    v = [float(x) for x in re.findall(r"silence_(?:start|end): ([0-9.]+)", out)]
    return list(zip(v[0::2], v[1::2]))


async def template(text):
    words = []
    async for ev in edge_tts.Communicate(text, "ar-SA-ZariyahNeural", boundary="WordBoundary").stream():
        if ev["type"] == "WordBoundary":
            words.append({"w": ev["text"], "t": ev["offset"] / 1e7, "d": ev["duration"] / 1e7})
    return words


async def main():
    paras = [p.strip() for p in open(os.path.join(B, "script.txt"), encoding="utf-8").read().split("\n\n")]
    paras[0] = re.sub(r"\[.*?\]\s*", "", paras[0])
    D = dur(TAKE); sil = silences(TAKE)
    tot = sum(len(p) for p in paras); cum = 0; cuts = [0.0]
    for p in paras[:-1]:
        cum += len(p); est = D * cum / tot
        c = min(((abs((s + e) / 2 - est) - (e - s) * 4, s, e) for s, e in sil if abs((s + e) / 2 - est) < 7))
        cuts.append((c[1] + c[2]) / 2)
    cuts.append(D)
    chunks = []
    for i, (pid, scene, cue) in enumerate(CUES):
        a, b = cuts[i], cuts[i + 1]
        seg = os.path.join(B, f"p{i}.wav")
        ff("-ss", f"{a:.3f}", "-to", f"{b:.3f}", "-i", TAKE, "-ar", str(SR), "-ac", "1", seg)
        # trim to the speech span
        s2 = silences(seg, -40, .08); L = dur(seg)
        lead = s2[0][1] if s2 and s2[0][0] < .02 else 0.0
        tail = s2[-1][0] if s2 and abs(s2[-1][1] - L) < .05 else L
        tmpl = await template(paras[i])
        t0, t1 = tmpl[0]["t"], tmpl[-1]["t"] + tmpl[-1]["d"]
        k = (tail - lead) / (t1 - t0)
        words = [{"w": w["w"], "t": round(cue + (w["t"] - t0) * k, 3), "d": round(w["d"] * k, 3)} for w in tmpl]
        clip = os.path.join(B, f"c{i}.wav")
        ff("-ss", f"{lead:.3f}", "-to", f"{tail + .12:.3f}", "-i", seg, "-af", "afade=t=in:d=0.02,afade=t=out:st=%.3f:d=0.1" % (tail - lead), clip)
        chunks.append({"id": pid, "level": scene, "start": cue, "end": round(cue + tail - lead, 3), "text": paras[i], "words": words, "wav": clip})
        print(f"{pid:8s} take {a:6.2f}-{b:6.2f}  speech {tail - lead:5.2f}s  at {cue:6.1f}->{cue + tail - lead:6.1f}  words={len(words)}")
    ins, flt = [], []
    for i, c in enumerate(chunks):
        ins += ["-i", c["wav"]]; ms = int(c["start"] * 1000); flt.append(f"[{i}:a]adelay={ms}|{ms}[a{i}]")
    flt.append("".join(f"[a{i}]" for i in range(len(chunks))) + f"amix=inputs={len(chunks)}:normalize=0,apad=whole_dur={TOTAL},atrim=0:{TOTAL}[o]")
    ff(*ins, "-filter_complex", ";".join(flt), "-map", "[o]", "-ar", str(SR), "-ac", "1", os.path.join(B, "voice.wav"))
    words = sum(len(c["words"]) for c in chunks)
    tl = {"duration": TOTAL, "voice": "ElevenLabs v4 · Jessica (Halai)", "words_total": words,
          "levels": {c["level"]: {"start": c["start"], "end": c["end"]} for c in chunks},
          "chunks": [{k: c[k] for k in ("id", "level", "start", "end", "text", "words")} for c in chunks]}
    json.dump(tl, open(os.path.join(B, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("voice.wav", dur(os.path.join(B, "voice.wav")))


asyncio.run(main())
