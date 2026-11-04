#!/bin/bash
# Full rebuild: narration -> music/SFX/mix -> 3D frames -> final MP4.
set -e
cd "$(dirname "$0")"
python3 src/narration.py
python3 src/audio.py
FR=$(node src/render.js --frames 2>/dev/null | tail -1)
J=${JOBS:-4}; Q=$(( (FR + J - 1) / J ))
rm -f build/seg_*.mp4
for i in $(seq 0 $((J-1))); do
  node src/render.js --range $((i*Q)) $(((i+1)*Q)) $i > build/render$i.log 2>&1 &
done
wait
ls build/seg_*.mp4 | sort -V | sed "s#^build/#file '#; s#\$#'#" > build/concat.txt
mkdir -p output
ffmpeg -v error -y -f concat -safe 0 -i build/concat.txt -i build/mix.wav -map 0:v -map 1:a -c:v copy \
  -af "loudnorm=I=-16:TP=-1.5:LRA=11" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart output/child-rights-treasure-islands-1080p.mp4
ffmpeg -v error -y -i build/voice.wav -af "loudnorm=I=-16:TP=-1.5" -c:a libmp3lame -b:a 192k output/voice-fusha.mp3
ffmpeg -v error -y -i build/music_sfx.wav -c:a libmp3lame -b:a 192k output/music-and-sfx.mp3
echo "DONE $(ffprobe -v error -show_entries format=duration -of csv=p=0 output/child-rights-treasure-islands-1080p.mp4)s"
