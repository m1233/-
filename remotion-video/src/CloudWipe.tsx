import React from 'react';
import {Interactive, interpolate, random, useCurrentFrame, useVideoConfig} from 'remotion';

type CloudWipeProps = {
  readonly seed: string;
  readonly style?: React.CSSProperties;
};

// Soft white clouds sweep across the cut between two islands.
const CloudWipeInner: React.FC<CloudWipeProps> = ({seed, style}) => {
  const frame = useCurrentFrame();
  const {durationInFrames, width, height} = useVideoConfig();
  const k = frame / Math.max(1, durationInFrames - 1);
  const cover = Math.sin(k * Math.PI);
  const puffs = new Array(46).fill(0).map((_, i) => {
    const r = (n: number) => random(`${seed}-${i}-${n}`);
    const rad = (160 + r(1) * 260) * (width / 1920) * cover * 1.4;
    const x = r(2) * width * 1.4 - width * 0.2 + interpolate(k, [0, 1], [width * 1.1, -width * 0.3]) * (0.6 + r(3) * 0.4) - width * 0.35;
    const y = r(4) * height;
    return {x, y, rad};
  });
  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', ...style}}>
      {puffs.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x - p.rad,
            top: p.y - p.rad,
            width: p.rad * 2,
            height: p.rad * 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(255,255,255,${0.95 * cover}) 0%, rgba(255,252,246,${0.75 * cover}) 60%, rgba(255,255,255,0) 100%)`,
          }}
        />
      ))}
      <div style={{position: 'absolute', inset: 0, backgroundColor: `rgba(255,255,255,${Math.max(0, cover - 0.35) * 1.3})`}} />
    </div>
  );
};

export const CloudWipe = Interactive.create({
  Component: CloudWipeInner,
  layout: 'none',
  schema: {
    seed: {type: 'string', default: 'clouds', description: 'Cloud pattern seed', hiddenFromList: false},
  },
});
