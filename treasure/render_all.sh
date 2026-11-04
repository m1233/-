#!/bin/bash
# Resumable parallel render of all frames into build/chunks/, then concat + mux.
cd "$(dirname "$0")"
J=${JOBS:-4}
for w in $(seq 0 $((J-1))); do node src/render.js --chunks $w $J 100 >> build/chunks_w$w.log 2>&1 & done
wait
