#!/bin/bash
# After render-parts.sh finishes: render the 5 s credit card (frames 10214-10363)
# at the same scale and rebuild the final MP4 with it appended.
cd "$(dirname "$0")"
while pgrep -f render-parts.sh >/dev/null; do sleep 20; done
SCALE=${SCALE:-0.8}; OUTNAME=${OUTNAME:-child-rights-day-remotion-864p}
f=out/parts/p_10214.mp4
[ -f "$f" ] || npx remotion render ChildRightsDay out/parts/tmp.mp4 --frames=10214-10363 --gl=swangle --concurrency=4 --muted --crf=18 --log=error --scale=$SCALE && mv out/parts/tmp.mp4 "$f"
echo "segment 10214-10363 done"
ls out/parts/p_*.mp4 | sort | sed "s#^out/parts/#file '#; s#\$#'#" > out/parts/list.txt
ffmpeg -v error -y -f concat -safe 0 -i out/parts/list.txt -i public/voice-fusha.mp3 -i public/music-and-sfx.mp3 \
  -filter_complex "[2:a]volume=0.9,apad=pad_dur=6[m];[1:a][m]amix=inputs=2:duration=longest:normalize=0,loudnorm=I=-16:TP=-1.5[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart out/$OUTNAME.mp4
echo "FINAL DONE"
