# كنوز حقوق الطفل — رحلة الجزر الخمس
### World Children's Day: a 3D motion video (16:9, 1080p, 5:41)

A girl finds a treasure map on the beach. Instead of gold, it leads to five floating islands, and each island holds one children's right: protection, education, play, health and respect. The narration is in Modern Standard Arabic (Fusha) in a young girl's voice, with calm music and sound effects underneath.

## Deliverables (`output/`)
| File | Spec |
|---|---|
| `child-rights-treasure-islands-1080p.mp4` | 1920×1080, 25 fps, H.264, AAC 192 kbps, −16 LUFS |
| `voice-fusha.mp3` | Narration only |
| `music-and-sfx.mp3` | Music and sound effects only, no voice |

## Storyboard
| Scene | Visual | Shawl colour |
|---|---|---|
| Title | A 3D gift box opens and «يومُ الطفلِ العالمي» rises out of it under falling stardust | — |
| The beach | The girl walks along the shore. A sparkle shows in the sand, she kneels, and the scroll floats up and opens to read «حقوق الطفل» | Coral |
| The five islands | Five floating islands; each one glows as its right is named | Coral |
| 1. Protection | Lighthouse and a pearl shell that closes like a shield. The girl says «لا!» with a stop gesture, then a trusted adult comes | Blue |
| 2. Education | A glowing tree and a flying book that drops letters. A child gets a sum wrong, erases it, gets it right, and a light bulb appears | Yellow |
| 3. Play | A dancing star character. Two friends argue over a ball, sit down and share it, then everyone holds hands in a circle | Green |
| 4. Health | A pulsing heart dome, hand-washing, water and fruit. The girl comforts a sad friend, a doctor comes, and feelings turn into stars | Pink |
| 5. Respect | An embroidered flag. Children from different backgrounds bow to each other, and floating shapes gather into one ring | Dark purple |
| Finale | The five treasures circle the girl, confetti falls, «كلُّ عامٍ وأنتم بخير» | Dark purple |

## How it is built
- `config/script.json`: the Fusha script, split into 20 beats, with the sound-effect cue for each beat. A cue can be pinned to a spoken word, for example `"@لا"`.
- `src/narration.py`: speech from Microsoft Edge neural TTS (`ar-SA-ZariyahNeural`), with word-level timestamps. The pitch and formants are raised ×1.09 without changing the duration, so the voice sounds younger.
- `src/audio.py`: synthesises calm music (72 BPM, pad, music box and bass) that gets louder or quieter by scene. It also synthesises the sound effects (waves, footsteps, chimes, paper, heartbeat, bubbles and others) and uses three ElevenLabs SFX made earlier with Halai (whoosh, level-up, celebration). The music ducks automatically under the voice. This script also writes the lip-sync envelope.
- `src/web/*.js`: a deterministic Three.js scene. Each frame is a pure function `render(t)`. It contains the characters (girl, children, adults), the islands, props, camera paths, karaoke captions and cloud-wipe transitions.
- `src/render.js`: renders the frames in headless Chromium (WebGL), across parallel workers, and encodes them with x264.

```bash
pip install edge-tts numpy scipy && npm i
./build.sh                                  # full rebuild
node src/render.js --stills 20,80,150       # preview stills in build/stills/
```

## Limitations
- **Voice:** a neural TTS voice made younger by pitch shifting. It is not a real child recording. To use a real recording, put it in `build/vo/` and the timing rebuilds itself.
- **Halai credits:** the balance was 0, so this version did not use Halai's paid image or video models (gpt-image / Kling). All visuals are real-time 3D built in code.
- **Children's laughter:** this cannot be synthesised convincingly, so a short playful marimba motif replaces it.
