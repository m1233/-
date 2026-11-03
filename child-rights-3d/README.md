# حقوق الطفل: يوم سعيد لكل طفل 🚀
### Child Rights Day — magical flying-island explorer game (7:00, 9:16, 1080p)

## Deliverables (`output/`)
| File | Spec |
|---|---|
| `child-rights-day-3d-7min-9x16_web.mp4` | In the repo. 1080×1920, 30 fps, exactly 420 s, voice + music + SFX (99 MB to fit GitHub's limit) |
| `child-rights-day-3d-7min-9x16.mp4` | Full-quality master (delivered separately, not in git) |
| `voice.mp3` · `music-and-sfx.mp3` · `full-mix.mp3` | Separate audio stems |

## Halai MCP usage (all 7 available credits)
| Asset | Model | Credits | asset_id |
|---|---|---|---|
| Full narration, one take (1,246 characters), voice "Jessica", energetic, formal MSA | ElevenLabs v4 | 4 | `66d80567-6ee7-49b4-a444-3653e6089da3` |
| Magical whoosh transition (used at all 9 scene changes) | ElevenLabs SFX | 1 | `824be721-6f67-44e6-94b2-5b588665ff7b` |
| Level-up sparkle chime (each unlocked right + victory) | ElevenLabs SFX | 1 | `714173ac-25aa-4b5a-a308-4a85aef4d22a` |
| Confetti celebration burst (victory screen) | ElevenLabs SFX | 1 | `a70de2b7-e852-4779-82f0-06c36a4122f8` |
| **Total** | | **7** | balance after: 0 |

The rest was built in code: the illustrations, characters, camera, kinetic typography and the background music (synthesised with numpy).

## Timeline (420 s)
| Time | Scene |
|---|---|
| 0–60 | Flying island among clouds; «اضغط للبدء» button auto-pressed; pink and blue balloons; a tour of the 4 locked levels |
| 60–105 | Right to education: school with magic books flying out and yellow stars |
| 105–150 | Right to health: green medical oasis, shiny fruit, waving doctor, pulsing heart |
| 150–195 | Right to play and expression: swings above the clouds, bubbles with laughing children's faces |
| 195–240 | Right to safety: warm home with a fireplace and a smiling family |
| 240–360 | Explorer's diary: morning (bedroom, then classroom), evening play in the park, back to a cosy home |
| 360–400 | Victory screen: trophy, orbiting icons, jumping children, confetti |
| 400–420 | White closing card in Kufi: «إعداد المعلمة: فاطمة خلف» (no voice, music only, soft fade) |

The script ends at 480 s, but the target was "exactly 7 minutes (420 s)", so the diary scene was compressed from 180 s to 120 s and the ending moved earlier by 60 s.

## Visual identity
- Off-white background with faint golden magic dust that glints softly.
- Pastel palette: light blue `#8EC8FF`, light pink `#FFB8DE`, light yellow `#FFE58A`.
- 3D geometric Kufi lettering (extruded, built word by word), and karaoke captions synced to the voice.

## Rebuild
```bash
python3 src/narration.py   # split the Halai voice take into 9 paragraphs + word timings
python3 src/music.py       # music + Halai SFX + ducking + mix
for i in 0 1 2 3; do node src/render.js --range $((i*3150)) $(((i+1)*3150)) seg$i & done; wait
node src/render.js --concat
```

## Limitations
- **Voice:** an ElevenLabs adult voice (Jessica, young and playful). A real 10-year-old girl's voice cannot be generated. A real recording can replace `assets/voice_halai.mp3` and the timing rebuilds automatically.
- **Pixar-level 3D characters and Kling video clips** would need more Halai credits (about 1,000 for the balanced tier). Within the available balance, the visuals are shaded vector art with 3D pop-up motion.
- **Word timings** are estimated by stretching a reference reading over each paragraph of the real take. They are not forced-aligned to the audio.
