#!/usr/bin/env python3
"""
Narration builder — Industrial Chemistry motion video (60 s, 9:16).

1. Synthesises each narration chunk with a neural Arabic voice (edge-tts).
2. Auto-tunes each chunk's speaking rate to the 130 WPM target.
3. Places every chunk at its scene cue time and pads with silence so the
   master track is exactly 60.000 s.
4. Exports build/timeline.json with absolute per-word timestamps, which the
   animation engine uses to reveal on-screen text in sync with the voice.

Usage:  python3 src/narration.py
Output: output/narration.mp3  +  build/timeline.json
"""
import asyncio, json, os, subprocess, sys

import certifi
# Route TLS through the environment CA bundle when one is configured.
if os.path.exists("/root/.ccr/ca-bundle.crt"):
    certifi.where = lambda: "/root/.ccr/ca-bundle.crt"
import edge_tts  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, "build")
OUT = os.path.join(ROOT, "output")
VOICE = "ar-SA-HamedNeural"
TARGET_WPM = 130
TOTAL = 60.0
SR = 48000

# id, start time (s), latest allowed end (s), text
CHUNKS = [
    ("s1",  0.70, 9.80,
     "هل تساءلتَ يوماً كيف تُصنع الأشياء من حولك؟ "
     "أهلاً بكم في عالم الكيمياء الصناعية، سرِّ حياتنا اليومية."),
    ("s2a", 10.30, 19.90,
     "الكيمياء الصناعية ببساطة، هي تحويل المواد الخام، "
     "مثل النفط والغاز والمعادن، إلى منتجات نستخدمها كل يوم."),
    ("s2b", 20.20, 29.80,
     "داخل المصنع، تتفاعل هذه المواد في مفاعلات ضخمة، "
     "بالحرارة والضغط والمحفِّزات، لنحصل على منتجات آمنة، بكميات كبيرة، وبتكلفة أقل."),
    ("s3a", 30.30, 33.30,
     "إليك ثلاثة أمثلة من حياتنا اليومية."),
    ("s3b", 33.50, 39.00,
     "أولاً، الأدوية: تُصنع بتفاعلات دقيقة، تحمي صحتنا وتعالج الأمراض."),
    ("s3c", 39.20, 44.40,
     "ثانياً، الأسمدة: تغذّي التربة، لزراعة أفضل ومحاصيل أوفر."),
    ("s3d", 44.60, 49.90,
     "ثالثاً، البلاستيك: في عبواتنا وأجهزتنا، ومعظم منتجاتنا اليومية."),
    ("s4a", 50.30, 54.20,
     "تذكَّر دائماً، تعلُّمُ الكيمياء يفتح أبواب المستقبل."),
    ("s4b", 54.50, 59.40,
     "تابعنا للمزيد من المعلومات، ولا تنسَ الضغط على زر المتابعة!"),
]


def ff(*args):
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *args], check=True)


def duration(path):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", path])
    return float(out)


async def synth(text, rate_pct, path):
    """Synthesise one chunk; return word boundaries (offset/duration in seconds)."""
    rate = f"{'+' if rate_pct >= 0 else ''}{int(round(rate_pct))}%"
    com = edge_tts.Communicate(text, VOICE, rate=rate, boundary="WordBoundary")
    words = []
    with open(path, "wb") as f:
        async for ev in com.stream():
            if ev["type"] == "audio":
                f.write(ev["data"])
            elif ev["type"] == "WordBoundary":
                words.append({"w": ev["text"], "t": ev["offset"] / 1e7, "d": ev["duration"] / 1e7})
    return words


def speech_span(words):
    return words[-1]["t"] + words[-1]["d"] - words[0]["t"]


async def build_chunk(cid, start, limit, text, rate):
    raw = os.path.join(BUILD, f"{cid}.mp3")
    words = await synth(text, rate, raw)
    n = len(words)
    wpm = n / speech_span(words) * 60
    # Trim leading silence so the first word lands exactly on the cue time.
    lead = max(0.0, words[0]["t"] - 0.02)
    wav = os.path.join(BUILD, f"{cid}.wav")
    ff("-ss", f"{lead:.3f}", "-i", raw, "-ar", str(SR), "-ac", "1", wav)
    for w in words:
        w["t"] = round(start + w["t"] - lead, 3)
        w["d"] = round(w["d"], 3)
    end = words[-1]["t"] + words[-1]["d"]
    return {"id": cid, "start": start, "limit": limit, "end": round(end, 3), "wav": wav,
            "words": words, "rate": round(rate), "wpm": round(wpm, 1)}


async def build_all():
    """One global speaking rate (consistent voice) tuned so the overall rate is 130 WPM."""
    rate = 0.0
    for it in range(6):
        chunks = [await build_chunk(*c, rate) for c in CHUNKS]
        words = sum(len(c["words"]) for c in chunks)
        speech = sum(c["end"] - c["start"] for c in chunks)
        wpm = words / speech * 60
        over = [c["id"] for c in chunks if c["end"] > c["limit"]]
        print(f"pass {it}: rate={rate:+.0f}% overall={wpm:.1f} WPM overruns={over}")
        if abs(wpm - TARGET_WPM) <= 1.5 and not over:
            break
        rate = (1 + rate / 100) * (TARGET_WPM / wpm) * 100 - 100
        if over and abs(wpm - TARGET_WPM) <= 1.5:
            rate += 2
    for c in chunks:
        print(f"  {c['id']:4s} words={len(c['words']):2d} wpm={c['wpm']:5.1f} "
              f"{c['start']:5.2f}->{c['end']:5.2f} (limit {c['limit']:5.2f})")
    return chunks


async def main():
    os.makedirs(BUILD, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    chunks = await build_all()

    # Mix: each chunk delayed to its cue time, on a 60.000 s silent bed.
    inputs, filters = [], []
    for i, c in enumerate(chunks):
        inputs += ["-i", c["wav"]]
        ms = int(round(c["start"] * 1000))
        filters.append(f"[{i}:a]adelay={ms}|{ms}[a{i}]")
    mix = "".join(f"[a{i}]" for i in range(len(chunks)))
    filters.append(f"{mix}amix=inputs={len(chunks)}:normalize=0,"
                   f"apad=whole_dur={TOTAL},atrim=0:{TOTAL},"
                   f"loudnorm=I=-14:TP=-1.5:LRA=11,aresample={SR}[out]")
    master = os.path.join(BUILD, "narration.wav")
    ff(*inputs, "-filter_complex", ";".join(filters), "-map", "[out]",
       "-ar", str(SR), "-ac", "1", "-t", f"{TOTAL}", master)
    mp3 = os.path.join(OUT, "narration.mp3")
    ff("-i", master, "-c:a", "libmp3lame", "-b:a", "192k", "-ar", str(SR), mp3)

    total_words = sum(len(c["words"]) for c in chunks)
    speech = sum(c["end"] - c["start"] for c in chunks)
    timeline = {
        "duration": TOTAL, "voice": VOICE, "target_wpm": TARGET_WPM,
        "measured_wpm": round(total_words / speech * 60, 1), "total_words": total_words,
        "chunks": {c["id"]: {k: c[k] for k in ("start", "end", "words", "rate", "wpm")} for c in chunks},
    }
    with open(os.path.join(BUILD, "timeline.json"), "w", encoding="utf-8") as f:
        json.dump(timeline, f, ensure_ascii=False, indent=1)
    print(f"total words={total_words} speech={speech:.1f}s measured={timeline['measured_wpm']} WPM; "
          f"mp3 duration={duration(mp3):.3f}s")


if __name__ == "__main__":
    asyncio.run(main())
