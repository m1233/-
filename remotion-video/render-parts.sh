#!/bin/bash
# Resumable render (remotion-render skill): 600-frame segments, then concat + audio.
cd "$(dirname "$0")"
mkdir -p out/parts
TOTAL=10214; SEG=600
for ((a=0; a<TOTAL; a+=SEG)); do
  b=$((a+SEG-1)); [ $b -ge $TOTAL ] && b=$((TOTAL-1))
  f=$(printf "out/parts/p_%05d.mp4" $a)
  [ -f "$f" ] && continue
  npx remotion render ChildRightsDay "out/parts/tmp.mp4" --frames=$a-$b --gl=swangle --concurrency=4 --muted --crf=18 --log=error && mv out/parts/tmp.mp4 "$f"
  echo "segment $a-$b done"
done
ls out/parts/p_*.mp4 | sed "s#^out/parts/#file '#; s#\$#'#" > out/parts/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/parts/list.txt -i public/voice-fusha.mp3 -i public/music-and-sfx.mp3 \
  -filter_complex "[2:a]volume=0.9[m];[1:a][m]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -movflags +faststart out/child-rights-day-remotion-1080p.mp4
echo "ALL DONE"
