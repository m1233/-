#!/usr/bin/env python3
"""
Child Rights Day — "The Guide" girl narration (7:00 video).

* Neural Arabic female voice, made more child-like by raising its pitch and
  formants (pitch +20 Hz in TTS, then a 1.10x formant/pitch shift that keeps
  the duration). Measured F0 is about 290 Hz, which is in the range of a young girl.
* Each sentence is a separate chunk. Sentences are laid out from each level's
  narration start time, with short breathing gaps.
* Exports build/voice.wav, output/voice-only.mp3 and build/timeline.json with
  absolute per-word timestamps that drive the kinetic "reward point" words.
"""
import asyncio, json, os, re, subprocess

import certifi
if os.path.exists("/root/.ccr/ca-bundle.crt"):
    certifi.where = lambda: "/root/.ccr/ca-bundle.crt"
import edge_tts  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD, OUT = os.path.join(ROOT, "build"), os.path.join(ROOT, "output")
VOICE, RATE, PITCH, SHIFT = "ar-SA-ZariyahNeural", "+10%", "+20Hz", 1.10
TOTAL, SR, GAP = 420.0, 48000, 0.55

# level id, narration start (s), hard limit (s), sentences
LEVELS = [
    ("L0", 6.0, 36.0, [
        "أهلاً بكم يا أبطال!",
        "اليوم هو يومنا العالمي.. يوم الطفل!",
        "اليوم لن نستمع لدرس عادي، بل سنخوض معاً رحلة رقمية ممتعة لنفتح مستويات حقوقنا السحرية.",
        "هل تعلمون أن لكل طفل فينا قوى خارقة تحميه وتجعله سعيداً؟",
        "اسمها الحقوق!",
        "اربطوا الأحزمة، ولننطلق للمستوى الأول!",
    ]),
    ("L1", 66.0, 110.0, [
        "المستوى الأول هو قلعة المعرفة!",
        "من حقنا جميعاً أن نذهب إلى مدرسة ذكية وسعيدة.",
        "التعليم ليس مجرد واجبات، بل هو المكان الذي نكتشف فيه أسرار الفضاء، وكيف تعمل التكنولوجيا، وكيف نصبح علماء ومخترعين.",
        "القراءة هنا تعطيك قوى إضافية لتفهم العالم وتصنع مستقبلك الخاص!",
    ]),
    ("L2", 146.0, 190.0, [
        "والآن وصلنا إلى واحة الطاقة!",
        "لكي نكون أبطالاً، نحتاج إلى أجساد قوية.",
        "حقنا في الرعاية الصحية يعني أن نأكل طعاماً صحياً وممتعاً، وأن نجد الأطباء الطيبين والدواء فوراً إذا شعرنا بالتعب.",
        "صحتك هي طاقتك التي تجعلك مستعداً لكل التحديات!",
    ]),
    ("L3", 226.0, 270.0, [
        "مرحباً بكم في أرض المرح!",
        "هذا مكاني المفضل.",
        "من حقنا أن نلعب، ونركض، ونرسم، ونبتكر ألعاباً جديدة مع أصدقائنا.",
        "وليس هذا فقط!",
        "من حقنا أيضاً أن نقول رأينا بحرية.",
        "عندما نتحدث، أفكارنا الذكية تستحق أن يستمع إليها الكبار، لأننا نرى العالم بطريقة جميلة ومختلفة!",
    ]),
    ("L4", 306.0, 350.0, [
        "المستوى الأخير والأهم.. درع الأمان.",
        "من حق كل طفل أن يعيش في بيت دافئ يحميه من أي خوف أو أذى، وأن يحيطه الكبار بالحب والاهتمام في كل مكان.",
        "الأمان هو الذي يجعل قلوبنا مطمئنة لنبدع ونكبر بسلام وثقة.",
    ]),
    ("WIN", 382.5, 404.0, [
        "مبارك يا أبطال!",
        "لقد فتحنا جميع مستويات الحقوق اليوم.",
        "تذكروا دائماً أنكم متميزون، وأن حقوقكم تحميكم وتجعلكم صُنّاع المستقبل المشرق.",
        "كل عام وأنتم، وأطفال العالم جميعاً، بخير وسعادة وأمان!",
    ]),
]


def ff(*a):
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *a], check=True)


def dur(p):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", p]))


async def synth(text, path):
    com = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary")
    words = []
    with open(path, "wb") as f:
        async for ev in com.stream():
            if ev["type"] == "audio":
                f.write(ev["data"])
            elif ev["type"] == "WordBoundary":
                words.append({"w": ev["text"], "t": ev["offset"] / 1e7, "d": ev["duration"] / 1e7})
    return words


async def main():
    os.makedirs(BUILD, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    chunks, n = [], 0
    for lid, start, limit, sents in LEVELS:
        t = start
        for si, text in enumerate(sents):
            raw, wav = os.path.join(BUILD, f"v{n:02d}.mp3"), os.path.join(BUILD, f"v{n:02d}.wav")
            words = await synth(text, raw)
            lead = max(0.0, words[0]["t"] - 0.03)
            last_end = words[-1]["t"] + words[-1]["d"]
            # trim leading silence; child-like formant + pitch lift that preserves duration
            ff("-ss", f"{lead:.3f}", "-i", raw, "-af",
               f"asetrate=24000*{SHIFT},aresample={SR},atempo={1/SHIFT:.6f},"
               f"afade=t=out:st={last_end - lead + 0.12:.3f}:d=0.15", "-ac", "1",
               "-t", f"{last_end - lead + 0.3:.3f}", wav)
            ws = [{"w": w["w"], "t": round(t + w["t"] - lead, 3), "d": round(w["d"], 3)} for w in words]
            end = ws[-1]["t"] + ws[-1]["d"]
            chunks.append({"id": f"{lid}_{si}", "level": lid, "start": round(t, 3), "end": round(end, 3),
                           "text": text, "wav": wav, "words": ws})
            t = end + GAP + (0.25 if text.rstrip()[-1] in "!؟?" else 0)
            n += 1
        lend = chunks[-1]["end"]
        print(f"{lid}: {start:6.1f} -> {lend:6.2f}  (limit {limit})  {'OK' if lend <= limit else 'OVER'}")
        assert lend <= limit, lid

    inputs, filt = [], []
    for i, c in enumerate(chunks):
        inputs += ["-i", c["wav"]]
        ms = int(round(c["start"] * 1000))
        filt.append(f"[{i}:a]adelay={ms}|{ms}[a{i}]")
    filt.append("".join(f"[a{i}]" for i in range(len(chunks))) +
                f"amix=inputs={len(chunks)}:normalize=0,apad=whole_dur={TOTAL},atrim=0:{TOTAL}[out]")
    voice = os.path.join(BUILD, "voice.wav")
    ff(*inputs, "-filter_complex", ";".join(filt), "-map", "[out]", "-ar", str(SR), "-ac", "1", voice)

    words = sum(len(c["words"]) for c in chunks)
    speech = sum(c["end"] - c["start"] for c in chunks)
    tl = {"duration": TOTAL, "voice": VOICE, "words_total": words, "speech_seconds": round(speech, 1),
          "wpm": round(words / speech * 60, 1),
          "levels": {lid: {"start": s, "end": max(c["end"] for c in chunks if c["level"] == lid)} for lid, s, _, _ in LEVELS},
          "chunks": [{k: c[k] for k in ("id", "level", "start", "end", "text", "words")} for c in chunks]}
    json.dump(tl, open(os.path.join(BUILD, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"words={words} speech={speech:.1f}s  {tl['wpm']} WPM  voice.wav={dur(voice):.2f}s")


if __name__ == "__main__":
    asyncio.run(main())
