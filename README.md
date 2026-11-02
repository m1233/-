# الكيمياء الصناعية: سر حياتنا اليومية
### Industrial Chemistry — 60-second Motion Graphic (TikTok 9:16)

Everything in this video was built from scratch in code: the illustrations, icons, animation, camera moves and narration. No stock assets or uploaded files were used.

## Deliverables (`output/`)

| File | Specification |
|---|---|
| `industrial-chemistry-60s-9x16.mp4` | 1080×1920 (9:16), 30 fps, H.264 High, exactly 60.0 s, narration muxed as AAC 192 kbps |
| `narration.mp3` | Separate voice-over: Arabic male neural voice, 192 kbps, 48 kHz, 60 s, **no music** |

## Visual identity

| Element | Value |
|---|---|
| Background | Dark navy `#071634` → `#040B1E` radial gradient + animated hexagonal lattice |
| Text | Light green `#8CF5B0` (white `#EAF6FF` for secondary lines) |
| Alerts / highlights | Orange `#FF9A3C` (heat / pressure / catalysts badges, "تذكَّر دائماً", the follow button) |
| Typeface | **Cairo** variable font (SIL OFL), weights 600–900, 44–124 px |

## Storyboard & audio sync

| Time | Scene | Narration (130 WPM) | Motion |
|---|---|---|---|
| 0–10 s | Opening | «هل تساءلتَ يوماً كيف تُصنع الأشياء من حولك؟ أهلاً بكم في عالم الكيمياء الصناعية، سرِّ حياتنا اليومية.» | Animated hexagon/flask logo, orbiting electrons, floating molecules, title «الكيمياء الصناعية: سر حياتنا اليومية» |
| 10–30 s | Definition | «…هي تحويل المواد الخام… إلى منتجات نستخدمها كل يوم. داخل المصنع…» | Camera **tracks each spoken word**; oil/gas/ore icons fly into the reactor; animated factory (smoke, gear, reactor liquid); orange badges حرارة / ضغط / محفِّزات; products + ✓ chips |
| 30–50 s | Examples | «أولاً، الأدوية… ثانياً، الأسمدة… ثالثاً، البلاستيك…» | Overview of 3 cards, then a smooth right-to-left camera glide card → card: capsule + ECG, growing plant, bottle + polymer chain |
| 50–60 s | Closing | «تعلُّمُ الكيمياء يفتح أبواب المستقبل. تابعنا للمزيد من المعلومات…» | Doors of the future open with light rays, end screen, the follow button is tapped («متابعة» → «تمت المتابعة ✓») |

Every on-screen word, badge and icon is cued to the **word-level timestamps** of the narration (`build/timeline.json`), so text appears at the moment it is spoken. Karaoke captions highlight the current word, which also helps with muted autoplay.

**Speech rate:** one global rate is used so the voice stays consistent. The measured overall rate is **129.5 WPM** (100 words over 46.3 s of speech).

## Rebuild

```bash
pip install edge-tts          # neural TTS (network access required)
python3 src/narration.py      # -> output/narration.mp3 + build/timeline.json
node src/render.js            # -> output/industrial-chemistry-60s-9x16.mp4  (Playwright + ffmpeg)
node src/render.js --stills 5,20,40   # quick preview PNGs in build/stills/
```

## Architecture
- `src/narration.py` synthesises each scene chunk, tunes the rate to 130 WPM, places the chunks on a 60.000 s bed, normalises loudness to −14 LUFS (the TikTok level) and exports the timestamps.
- `src/scene.html` is a deterministic motion engine. Each frame is a pure function `render(t)`: a virtual camera with keyframes, word tracking, a motion blur that scales with camera speed, SVG illustrations and kinetic typography.
- `src/render.js` renders the frames frame-accurately in headless Chromium across parallel workers, then encodes with x264 (CRF 16).

## Limitations
- The voice is a neural TTS voice (Microsoft `ar-SA-HamedNeural`), not a human recording.
- An MP3 encoder adds about 24 ms of standard padding at the end. The MP4 master is trimmed to exactly 60.000 s.
