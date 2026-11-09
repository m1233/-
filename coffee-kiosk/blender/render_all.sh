#!/bin/bash
# Resumable full render: drops half-written placeholder frames, then continues where it stopped.
cd "$(dirname "$0")/.."
find build/frames -name 'f_*.png' -size -2k -delete 2>/dev/null
blender -b build/kiosk.blend -o //frames/f_#### -a >> build/render.log 2>&1
echo "frames: $(ls build/frames/*.png | wc -l) / 720"
