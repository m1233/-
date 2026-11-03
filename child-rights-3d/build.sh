#!/bin/bash
# Rebuild the whole video from config/timing.json (scene durations).
set -e
cd "$(dirname "$0")"
python3 src/narration.py          # place the Halai voice on the new timeline
python3 src/music.py              # music + Halai SFX re-cued to the new scene times
FR=$(node src/render.js --frames)
Q=$(( (FR + 3) / 4 ))
rm -f build/seg*.mp4
for i in 0 1 2 3; do
  A=$(( i * Q )); B=$(( (i + 1) * Q )); [ $B -gt $FR ] && B=$FR
  node src/render.js --range $A $B seg$i > build/render$i.log 2>&1 &
done
wait
node src/render.js --concat
ffmpeg -v error -y -i output/child-rights-day-3d-7min-9x16.mp4 -vf scale=720:1280 -c:v libx264 -preset medium -profile:v high -level 4.0 \
  -b:v 650k -maxrate 1200k -bufsize 2400k -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart output/child-rights-day-3d-7min-720p_light.mp4
echo "DONE: $(ffprobe -v error -show_entries format=duration -of csv=p=0 output/child-rights-day-3d-7min-9x16.mp4) s"
