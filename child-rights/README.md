# يوم الطفل: رحلة استكشاف الحقوق 🚀
### Child Rights Day — 7-minute "Magic Video Game" Motion Graphic (TikTok 9:16)

Everything in this video was built from scratch in code: the illustrations, the guide character, the animation, the camera, the narration voice, the music and the sound effects. No uploaded or stock files were used.

## Deliverables (`output/`)

| File | Specification |
|---|---|
| `child-rights-day-7min-9x16_web.mp4` (in the repo, 99 MB to fit GitHub's 100 MB limit; the full-quality 245 MB master is delivered separately) | 1080×1920 (9:16), 30 fps, H.264, **exactly 420.0 s**, AAC stereo mix (voice + music + SFX), −14 LUFS-class loudness for TikTok |
| `voice-only.mp3` | The guide girl's narration on its own |
| `music-and-sfx-only.mp3` | The cheerful song and game sound effects, without the voice |
| `full-mix-audio.mp3` | The final soundtrack exactly as it plays in the video |

## Art direction (v3: real 3D render, semi-realistic)
- The worlds and characters are now a **real 3D render** (Three.js / WebGL). It uses physically based materials (skin, fabric, glass, metal, glossy fruit), image-based lighting with tone mapping, soft shadows, and warm key light with pink and blue rim lights.
- **Characters** have realistic human proportions (adults about 7.4 heads tall, children about 5.4). Each has eyes with iris and pupil textures, blinking eyelids and lashes, lips that open with speech, hair, and clothing. They are animated: the doctor waves, the girl swings, the family holds hands.
- **The guide (القائدة)** is a 3D bust with a gaming headset. Her lips are synced to every word of the narration.
- Island elements rise in a real 3D pop-up motion, and the camera flies between the islands with vertical crane moves.
- The interface uses glass panels and the Cairo font. The teacher's name card uses the video's night palette with gold accents and a Kufi typeface.

## Concept
The video is a magic video game. «القائدة» (The Guide) is a cartoon girl with a gaming headset. She appears as a portrait in an RPG-style dialog box, and her mouth moves in sync with every word she speaks. A HUD stays on screen throughout: the level indicator, a ⭐ score that rises with every spoken word and every collected item, and four badge slots that unlock one by one.

| Time | Stage | Visuals |
|---|---|---|
| 0:00–1:00 | Start screen | A magic portal opens among the stars. The 3D title «يوم الطفل: رحلة استكشاف الحقوق 🚀» pops up. The «ابدأ الرحلة» button is pressed automatically and blue and pink 3D balloons fly up. Then a **journey map** with 4 locked levels appears; the first level unlocks and the camera dives **down** |
| 1:00–2:20 | Level 1: Castle of Knowledge | A castle made of books with telescopes and pencils flying around it and yellow sparkles. Mission: collect 4 knowledge items |
| 2:20–3:40 | Level 2: Energy Oasis | The camera moves **right**. Palm trees, flying fruit, a pulsing pink medical heart and a friendly waving doctor. Mission: charge the energy battery |
| 3:40–5:00 | Level 3: Fun Land | A cloud transition. A rainbow, a moving swing, bouncing balls and bubbles carrying speaking and idea icons |
| 5:00–6:20 | Level 4: Safety Shield | Clouds and stars gather to form a warm yellow and light-blue house, surrounded by a ring of pink hearts, with a happy family hugging |
| 6:20–6:45 | Win screen | Confetti, a smiling star, the earlier icons orbiting in 3D, and «تهانينا! أنت طفل رائع ومميز 🌟» |
| 6:45–7:00 | Closing card | No voice. The video's night background with faint stars drifting very slowly, and a glass card with gold frames and Kufi type reading «إعداد المعلمة: فاطمة خلف» to match the video's colors. The music rises gently, then a soft fade-out |

Each level runs the same game loop: a 3D pop-up arrival → a 3D title card → the guide's narration → a collection mission (4 items labelled with keywords from the narration) → «أحسنت يا بطل!» with 3 stars → the badge flies into the HUD.

### Kinetic "reward point" words
Every word appears at the moment the guide says it (word-level timestamps). It pops up, glows **yellow or light pink**, and shows a floating «+10».

## Audio
- **Voice:** a neural Arabic voice (`ar-SA-ZariyahNeural`), made more child-like by raising the pitch and formants while keeping the duration. Measured F0 is about 290 Hz. The pace is lively and natural (123 WPM). All the script text is used as written; only the parentheses were removed.
- **Music:** a song composed in code (numpy): C major, 100 BPM, I–vi–IV–V, made of a music box, a soft melody, pad, bass and light drums. It is louder in the missions and the win screen, ducks automatically under the guide's voice (about 14 dB below it), and plays alone at the end as a calm, rising coda that fades out at 7:00.
- **SFX:** button press, whooshes, pops, coins, level-up jingles and confetti, each placed on its scene cue.

## Rebuild
```bash
pip install edge-tts numpy
python3 src/narration.py   # voice + word timestamps   -> build/timeline.json
python3 src/plan.py        # scene cue sheet           -> build/plan.json
python3 src/music.py       # music, SFX, ducking, mix  -> build/mix.wav + output/*.mp3
for i in 0 1 2 3; do node src/render.js --range $((i*3150)) $(((i+1)*3150)) seg$i & done; wait
npm install            # three.js
node src/render.js --concat                        # -> output/child-rights-day-7min-9x16.mp4
node src/render.js --stills 5,70,390               # preview PNGs
```

## Limitations
- The voice is a neural TTS voice, processed to sound younger. It is not a real child's recording. A real recording can replace `build/voice.wav` and keep the same timing.
- The script's narration fills about 2 minutes of the 7. The remaining time is game sequences (map, missions, level complete) carried by music and sound effects, in line with the time windows given in the storyboard.

Fonts: Cairo and Reem Kufi (SIL OFL). All icons are custom SVG.
